/*
 * Surge 設定檔重載面板（超時優化版）
 * - 兩層超時：硬性看門狗（hardTimeoutMs）＋ 單次操作超時（opTimeoutMs）
 * - 成功 / 失敗通知與面板即時回饋
 * - 顯示上次重載時間（持久化）
 * - 參數可經由 argument 覆寫
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

  // 硬性看門狗：確保在硬時限內結束
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
      // 執行設定檔重載，套用單次操作超時
      await httpAPIWithTimeout("POST", "/v1/profiles/reload", {}, cfg.opTimeoutMs)

      const now = Date.now()
      $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "success" }), STORE_KEY)
      const content = `${cfg.successText} • ${formatTime(now)}`
      $notification.post(cfg.title, "", content)

      return doneOnce({
        title: cfg.title,
        content,
        icon: cfg.successIcon,
        "icon-color": cfg.successColor,
        style: "good"
      })
    } else {
      // 待命顯示＋上次結果
      const state = readState(STORE_KEY)
      const lines = [cfg.standbyText]
      if (cfg.showLastTime && state?.lastReload) {
        const status = state.lastResult === "success" ? "成功" : "失敗"
        lines.push(`上次：${formatDateTime(state.lastReload)}（${status}）`)
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
  function formatTime(ts) {
    const d = new Date(ts)
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  }
  function formatDateTime(ts) {
    const d = new Date(ts)
    const D = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const T = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    return `${D} ${T}`
  }
})()
