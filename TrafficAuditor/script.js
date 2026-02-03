/**
 * Traffic Auditor - Diagnostic Mode (強制診斷版)
 * 用途：顯示 Surge 讀取到的底層數據，不進行攔截。
 */

// 1. 取得基本資訊
const url = $request.url;
const method = $request.method;
const headers = $request.headers;

// 2. 診斷 Content-Length 標頭
// 注意：HTTP/2 或 Chunked 傳輸可能沒有此標頭
const lenHeader = headers['Content-Length'] || headers['content-length'] || "MISSING";

// 3. 診斷 Body 狀態
let bodyStatus = "Null";
let bodySize = 0;
let bodyType = typeof $request.body;

if ($request.body) {
    if (bodyType === 'string') {
        bodyStatus = "String";
        bodySize = $request.body.length;
    } else if ($request.body instanceof Uint8Array) {
        bodyStatus = "Uint8Array (Binary)";
        bodySize = $request.body.byteLength;
    } else {
        bodyStatus = "Unknown Object";
        // 嘗試一種通用的長度讀取方式
        bodySize = $request.body.byteLength || $request.body.length || 0;
    }
}

// 4. 強制輸出診斷日誌 (請在 Surge Dashboard > Recent Requests > Notes 查看)
console.log(`\n========== [Traffic Diagnostic] ==========`);
console.log(`URL: ${url}`);
console.log(`Method: ${method}`);
console.log(`Header[Content-Length]: ${lenHeader}`);
console.log(`Body Type: ${bodyType}`);
console.log(`Body Status: ${bodyStatus}`);
console.log(`Calculated Size: ${bodySize} bytes`);
console.log(`==========================================\n`);

// 5. 結束 (放行)
$done({});
