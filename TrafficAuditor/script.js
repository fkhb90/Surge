/**
 * Traffic Auditor (Telemetry Hunter) V3.0
 * * 功能：
 * 1. 監控 HTTP POST 上傳流量。
 * 2. 支援 Surge UI 參數切換「監控/攔截」模式。
 * 3. [省電] WiFi 環境下自動休眠，僅在行動數據運作。
 * * 安裝位置：請將此檔案存於 Surge 的 Scripts 資料夾。
 */

// --- 1. 參數解析 (Argument Parsing) ---
let args = {
    mode: "monitor",    // 預設模式
    threshold: "0",    // 預設閾值 (KB)
    wifi_pause: "false"  // 預設 WiFi 下暫停
};

// 解析 Surge 傳遞的參數字串 (格式: mode=reject&threshold=100...)
if (typeof $argument !== 'undefined') {
    let params = $argument.split('&');
    for (let param of params) {
        let [key, value] = param.split('=');
        if (key && value) args[key.trim()] = value.trim();
    }
}

const MODE = args.mode; // 'monitor' 或 'reject'
const THRESHOLD_BYTES = parseInt(args.threshold) * 1024;
const WIFI_PAUSE = args.wifi_pause === "true";

// --- 2. 環境檢查 (Environment Check) ---

// [省電機制] 若啟用 WiFi 暫停，且當前為 WiFi 連線，則直接退出
// $network.v4.primaryInterface 為 'en0' 通常代表 WiFi
if (WIFI_PAUSE && $network.wifi && $network.wifi.ssid) {
    // console.log("[Traffic Auditor] WiFi 環境 - 腳本休眠中");
    $done({});
    // 注意：在 Surge 腳本中，$done() 後程式碼仍可能執行，應使用 return 確保終止
    // 但在全域範疇無法直接 return，依賴 $done 即可
} else {
    runAuditor();
}

function runAuditor() {
    const url = $request.url;
    const method = $request.method;

    // --- 3. 白名單過濾 (Whitelist) ---
    // 排除非 POST 以及常見的大流量服務，避免誤殺與效能損耗
    if (method !== "POST" || 
        url.includes("icloud.com") || 
        url.includes("dropbox.com") || 
        url.includes("googleapis.com/drive") || // Google Drive
        url.includes("photos.google.com") ||    // Google Photos
        url.includes("youtube") ||
        url.includes("googlevideo") ||
        url.includes("netflix") ||
        url.includes("speedtest")) {
        $done({});
        return;
    }

    // --- 4. 流量大小判斷 ---
    let size = 0;
    
    // 優先讀取 Body 大小 (需 requires-body=true)
    if ($request.body) {
        size = $request.body.length;
    } 
    // 若無 Body (可能被截斷或未開啟)，嘗試讀取 Header
    else {
        const len = $request.headers['Content-Length'] || $request.headers['content-length'];
        if (len) size = parseInt(len);
    }

    // --- 5. 執行動作 ---
    if (size > THRESHOLD_BYTES) {
        const sizeKB = (size / 1024).toFixed(1);
        const shortUrl = url.length > 60 ? url.substring(0, 60) + "..." : url;
        const logMsg = `Size: ${sizeKB} KB | URL: ${shortUrl}`;

        if (MODE === "reject") {
            // [攔截模式]
            $notification.post(
                "🛡️ Traffic Auditor 攔截",
                `已阻斷異常上傳 (${sizeKB} KB)`,
                `URL: ${shortUrl}`
            );
            console.log(`[Traffic Auditor] ⛔ REJECTED: ${logMsg}`);
            
            // 回傳 403 Forbidden 直接中斷請求
            $done({
                response: {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain' },
                    body: "[Traffic Auditor] Blocked: Upload size exceeded threshold."
                }
            });
        } else {
            // [監控模式]
            $notification.post(
                "🚨 Traffic Auditor 發現",
                `發現大流量上傳 (${sizeKB} KB)`,
                `URL: ${shortUrl}`
            );
            console.log(`[Traffic Auditor] ⚠️ MONITOR: ${logMsg}`);
            $done({}); // 放行
        }
    } else {
        $done({}); // 未達閾值，放行
    }
}
