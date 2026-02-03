/**
 * Traffic Auditor (Telemetry Hunter) V3.1 [Fix]
 * * 更新日誌：
 * V3.1: 修正流量計算邏輯，優先讀取 Header，並支援二進制 Body 統計。
 */

// --- 1. 參數解析 (Argument Parsing) ---
let args = {
    mode: "monitor",    // 預設模式
    threshold: "0",    // 預設閾值 (KB)
    wifi_pause: "false" // 預設 WiFi 下暫停
};

if (typeof $argument !== 'undefined') {
    let params = $argument.split('&');
    for (let param of params) {
        let [key, value] = param.split('=');
        if (key && value) args[key.trim()] = value.trim();
    }
}

const MODE = args.mode;
const THRESHOLD_BYTES = parseInt(args.threshold) * 1024;
const WIFI_PAUSE = args.wifi_pause === "true";

// --- 2. 環境檢查 (Environment Check) ---
if (WIFI_PAUSE && $network.wifi && $network.wifi.ssid) {
    $done({});
} else {
    runAuditor();
}

function runAuditor() {
    const url = $request.url;
    const method = $request.method;

    // --- 3. 白名單過濾 (Whitelist) ---
    if (method !== "POST" || 
        url.includes("icloud.com") || 
        url.includes("dropbox.com") || 
        url.includes("googleapis.com/drive") || 
        url.includes("photos.google.com") || 
        url.includes("youtube") ||
        url.includes("googlevideo") ||
        url.includes("netflix") ||
        url.includes("speedtest")) {
        $done({});
        return;
    }

    // --- 4. 流量大小判斷 (邏輯修正) ---
    let size = 0;
    let source = "Unknown"; // 用於除錯日誌

    // 策略 A: 優先讀取 Header (最準確且省資源)
    const lenHeader = $request.headers['Content-Length'] || $request.headers['content-length'];
    if (lenHeader) {
        size = parseInt(lenHeader);
        source = "Header";
    } 
    // 策略 B: 若 Header 缺失，則讀取 Body (支援二進制)
    else if ($request.body) {
        if (typeof $request.body === 'string') {
            size = $request.body.length;
            source = "Body(String)";
        } else if ($request.body instanceof Uint8Array) {
            // 對於 binary-body-mode=true，這是關鍵
            size = $request.body.byteLength;
            source = "Body(Binary)";
        }
    }

    // --- 5. 執行動作 ---
    if (size > THRESHOLD_BYTES) {
        const sizeKB = (size / 1024).toFixed(1);
        const shortUrl = url.length > 60 ? url.substring(0, 60) + "..." : url;
        const logMsg = `Size: ${sizeKB} KB (${source}) | URL: ${shortUrl}`;

        if (MODE === "reject") {
            // [攔截模式]
            $notification.post(
                "🛡️ Traffic Auditor 攔截",
                `已阻斷異常上傳 (${sizeKB} KB)`,
                `URL: ${shortUrl}`
            );
            console.log(`[Traffic Auditor] ⛔ REJECTED: ${logMsg}`);
            
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
            $done({});
        }
    } else {
        // [除錯用] 如果您想看那些未超標的流量，可取消下方註解
        // console.log(`[Traffic Auditor] ✅ PASS (${(size/1024).toFixed(1)} KB): ${url}`);
        $done({});
    }
}
