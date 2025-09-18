/*
 * =================================================================================
 * Surge 設定檔重載面板（優化版）
 * =================================================================================
 * 功能：
 * - 面板按鈕觸發設定檔重載（POST /v1/profiles/reload）
 * - 成功 / 失敗通知與動態面板回饋
 * - 顯示上次重載時間（持久化存儲）
 * - 支援自訂圖示 / 顏色 / 文字（透過 argument）
 *
 * 建議搭配的 [Panel]（示例）：
 * [Panel]
 * 設定檔重載 = title=設定檔重載, content=點擊以重新載入設定檔, style=info, script-name=Profile-Reload, update-interval=-1
 *
 * 建議的 [Script]（示例）：
 * [Script]
 * Profile-Reload = type=generic, script-path=Profile-Reload.js, timeout=10, argument=title=設定檔重載&standbyText=點擊以重新載入設定檔
 * =================================================================================
 */

;(async () => {
  // 預設參數（可被 argument 覆蓋）
  const defaults = {
    title: "設定檔重載",
    standbyText: "點擊以重新載入設定檔",
    successText: "設定檔已成功重載",
    failureText: "設定檔重載失敗，請檢查錯誤日誌",
    // 圖示與顏色（SF Symbols + HEX）
    standbyIcon: "arrow.clockwise.circle",
    standbyColor: "#8E8E93", // 灰
    successIcon: "arrow.clockwise.circle.fill",
    successColor: "#0A84FF", // 藍
    failureIcon: "xmark.octagon.fill",
    failureColor: "#FF3B30", // 紅
    showLastTime: true
  }

  // 解析 $argument
  const args = parseArgument($argument)
  const cfg = { ...defaults, ...args }

  const STORE_KEY = "PROFILE_RELOAD_STATE"

  try {
    if ($trigger === "button") {
      // 觸發重載
      await httpAPI("POST", "/v1/profiles/reload")
      // 記錄時間
      const now = Date.now()
      $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "success" }), STORE_KEY)

      const content = `${cfg.successText} • ${formatTime(now)}`
      $notification.post(cfg.title, "", content)

      return $done({
        title: cfg.title,
        content,
        icon: cfg.successIcon,
        "icon-color": cfg.successColor,
        style: "good"
      })
    } else {
      // 非按鈕觸發：顯示待命狀態 + 上次重載資訊
      const state = readState(STORE_KEY)
      const lines = [cfg.standbyText]
      if (cfg.showLastTime && state?.lastReload) {
        const status = state.lastResult === "success" ? "成功" : "失敗"
        lines.push(`上次：${formatDateTime(state.lastReload)}（${status}）`)
      }
      return $done({
        title: cfg.title,
        content: lines.join("\n"),
        icon: cfg.standbyIcon,
        "icon-color": cfg.standbyColor,
        style: "info"
      })
    }
  } catch (e) {
    // 失敗處理
    const now = Date.now()
    $persistentStore.write(JSON.stringify({ lastReload: now, lastResult: "failure", error: String(e) }), STORE_KEY)

    const content = `${cfg.failureText}\n錯誤詳情：${e instanceof Error ? e.message : String(e)}`
    $notification.post(cfg.title, "", content)

    return $done({
      title: cfg.title,
      content,
      icon: cfg.failureIcon,
      "icon-color": cfg.failureColor,
      style: "error"
    })
  }
})()

// ---- 工具函式 ----

function parseArgument(arg) {
  if (!arg) return {}
  const obj = Object.fromEntries(
    String(arg)
      .split("&")
      .map(kv => {
        const [k, v = ""] = kv.split("=")
        return [k, decodeURIComponent(v)]
      })
  )
  // 字串轉布林
  if (typeof obj.showLastTime === "string") obj.showLastTime = obj.showLastTime !== "false"
  return obj
}

function readState(key) {
  try {
    const raw = $persistentStore.read(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function httpAPI(method, path, body = {}) {
  return new Promise((resolve, reject) => {
    // 兼容不同回呼簽名：result 或 (result, error)
    $httpAPI(method, path, body, (result, error) => {
      if (error) return reject(error)
      if (result && result.error) return reject(result.error)
      resolve(result)
    })
  })
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n
}

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
