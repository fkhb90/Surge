/*
 * Surge 設定檔重載面板（顯示優化＋超時保護）
 * - 成功訊息與「上次重載」分兩行顯示
 * - 上次重載時間格式：YYYY/MM/DD HH:mm:ss
 * - 兩層超時：硬性看門狗（hardTimeoutMs）＋ 單次操作超時（opTimeoutMs）
 * - 成功 / 失敗通知與面板回饋；持久化上次重載時間與結果
 */

;(async () => {
  const defaults = {
    title: "設定檔重載",
    standbyText: "點擊以重新載入設定檔",
    successText: "設定檔已成功重載",
    failureText: "設定檔重載失敗，請檢查錯誤日誌",
    standbyIcon: "arrow.clockwise.circle",
    standbyColor: "#8E8E93",
    successIcon: "arrow.clockwise.circle.fill",
    successColor: "#0A84FF",
    failureIcon: "xmark.octagon.fill",
    failureColor: "#FF3B30",
    showLastTime: true,
    // 超時（毫秒）：請確保 hardTimeoutMs < [Script] timeout（秒）×1000
    hardTimeoutMs: 6000,
    opTimeoutMs: 2500,
    notifyOnTimeout: true
  }

  const args = parseArgument($argument)
  normalizeTimeoutArgs(args)
  const cfg = { ...defaults, ...args }

  const STORE_KEY = "PROFILE_RELOAD_STATE"
  let finished = false
  let watchdogTimer = null

  const doneOnce = (panel) => {
    if (finished) return
    finished = true
    if (watchdogTimer) clearTimeout(watchdogTimer)
    $done(panel)
  }

  // 硬性看門狗：超過時限主動結束（避免系統層超時體感不一致）
  watchdogTimer = setTimeout(() => {
    const now = Date.now()
    const content = `${cfg.failureText}\n錯誤詳情：執行逾時（>${cfg.hardTimeoutMs}ms）`
    $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "failure", error: "timeout" }), STORE_KEY)
    if (cfg.notifyOnTimeout) $notification.post(cfg.title, "", content)
    doneOnce({
      title: cfg.title,
      content,
      icon: cfg.failureIcon,
      "icon-color": cfg.failureColor,
      style: "error"
    })
  }, cfg.hardTimeoutMs)

  try {
    if ($trigger === "button") {
      // 1) 觸發重載（單次操作超時）
      await httpAPIWithTimeout("POST", "/v1/profiles/reload", {}, cfg.opTimeoutMs)

      // 2) 記錄時間並以兩行格式回饋成功
      const now = Date.now()
      $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "success" }), STORE_KEY)
      const content = `${cfg.successText}\n上次重載：${formatDateTimeSlash(now)}`
      $notification.post(cfg.title, "", content)

      return doneOnce({
        title: cfg.title,
        content,
        icon: cfg.successIcon,
        "icon-color": cfg.successColor,
        style: "good"
      })
    } else {
      // 待命：顯示提示＋上一筆時間（含成功/失敗）
      const state = readState(STORE_KEY)
      const lines = [cfg.standbyText]
      if (cfg.showLastTime && state?.lastReload) {
        const status = state.lastResult === "success" ? "成功" : "失敗"
        lines.push(`上次重載：${formatDateTimeSlash(state.lastReload)}（${status}）`)
      }
      return doneOnce({
        title: cfg.title,
        content: lines.join("\n"),
        icon: cfg.standbyIcon,
        "icon-color": cfg.standbyColor,
        style: "info"
      })
    }
  } catch (e) {
    // 失敗路徑：保持兩行以上資訊的易讀性
    const now = Date.now()
    $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "failure", error: String(e) }), STORE_KEY)
    const content = `${cfg.failureText}\n錯誤詳情：${e instanceof Error ? e.message : String(e)}`
    $notification.post(cfg.title, "", content)

    return doneOnce({
      title: cfg.title,
      content,
      icon: cfg.failureIcon,
      "icon-color": cfg.failureColor,
      style: "error"
    })
  }

  // ---- 工具函式 ----

  function parseArgument(arg) {
    if (!arg) return {}
    const obj = Object.fromEntries(
      String(arg).split("&").map(kv => {
        const [k, v = ""] = kv.split("=")
        return [k, decodeURIComponent(v)]
      })
    )
    if (typeof obj.showLastTime === "string") obj.showLastTime = obj.showLastTime !== "false"
    return obj
  }

  function normalizeTimeoutArgs(obj) {
    const toInt = (v) => {
      const n = parseInt(v, 10)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }
    if (obj.hardTimeoutMs) obj.hardTimeoutMs = toInt(obj.hardTimeoutMs)
    if (obj.opTimeoutMs) obj.opTimeoutMs = toInt(obj.opTimeoutMs)
    if (!obj.hardTimeoutMs) delete obj.hardTimeoutMs
    if (!obj.opTimeoutMs) delete obj.opTimeoutMs
  }

  function readState(key) {
    try {
      const raw = $persistentStore.read(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function httpAPIWithTimeout(method, path, body, ms) {
    return Promise.race([
      new Promise((resolve, reject) => {
        $httpAPI(method, path, body, (result, error) => {
          if (error) return reject(error)
          if (result && result.error) return reject(result.error)
          resolve(result)
        })
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`HTTP API 逾時（${ms}ms）`)), ms))
    ])
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n }

  // 以「YYYY/MM/DD HH:mm:ss」格式輸出
  function formatDateTimeSlash(ts) {
    const d = new Date(ts)
    const D = `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
    const T = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    return `${D} ${T}`
  }
})()
