/**
 * Traffic Auditor (Lite Version)
 * V4.0 - Header-Only Mode
 * 解決 requires-body 導致 HTTP/2 腳本不執行的問題
 */

// 1. 解析參數
let args = {};
if (typeof $argument !== 'undefined') {
    $argument.split('&').forEach(item => {
        let [key, value] = item.split('=');
        if (key && value) args[key.trim()] = value.trim();
    });
}

const MODE = args.mode || "monitor";
const THRESHOLD = parseInt(args.threshold || 50); // KB
const THRESHOLD_BYTES = THRESHOLD * 1024;

// 2. 執行核心邏輯
runLiteAuditor();

function runLiteAuditor() {
    const url = $request.url;
    const method = $request.method;
    
    // 取得 Content-Length (相容大小寫)
    // 這是 HTTP 協議中宣告上傳大小的標準欄位
    const lenStr = $request.headers['Content-Length'] || 
                   $request.headers['content-length'] || 
                   $request.headers['X-Upload-Content-Length'] || // 部分雲端服務使用
                   "0";
                   
    const size = parseInt(lenStr);
    const sizeKB = (size / 1024).toFixed(2);

    // 強制輸出日誌，證明腳本有活著 (請在 Dashboard 查看)
    console.log(`[Traffic Lite] URL: ${url} | Method: ${method} | Size: ${sizeKB} KB`);

    // 3. 判斷與攔截
    if (size > THRESHOLD_BYTES) {
        
        let logText = `偵測到大流量上傳: ${sizeKB} KB (Header) -> ${url}`;
        
        if (MODE === "reject") {
            $notification.post("🛡️ 上傳攔截", `已阻擋 ${sizeKB} KB 上傳`, url);
            console.log(`[Traffic Lite] ⛔ REJECTED: ${logText}`);
            
            $done({
                response: {
                    status: 403,
                    body: "Traffic Limit Exceeded (Header Check)"
                }
            });
        } else {
            $notification.post("🚨 上傳警告", `發現 ${sizeKB} KB 上傳`, url);
            console.log(`[Traffic Lite] ⚠️ MONITOR: ${logText}`);
            $done({});
        }
    } else {
        $done({});
    }
}
