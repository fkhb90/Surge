// Traffic Ratio Auditor
// 邏輯：當上傳大於 10KB 且 下載小於 100 Bytes 時，發出警報。

const reqSize = $request.body ? $request.body.length : 0;
const resSize = $response.body ? $response.body.length : 0;

// 設定閾值：上傳 > 10KB 且 回應 < 100B (典型日誌特徵)
if (reqSize > 10240 && resSize < 100) {
    let url = $request.url;
    // 排除已知白名單
    if (!url.includes("icloud.com") && !url.includes("whatsapp")) {
        $notification.post(
            "⚠️ 發現可疑遙測上傳",
            `Upload: ${(reqSize/1024).toFixed(2)} KB | Down: ${resSize} B`,
            `URL: ${url}`
        );
    }
}
$done({});
