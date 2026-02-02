/**
 * @file    sendgrid_guard.js (UI Fixed Version)
 * @title   SendGrid Interstitial Guard
 * @desc    [Update] 修復「取消」按鈕在 iOS Safari 無法關閉分頁的問題，改為跳轉空白頁。
 */

// 防崩潰主邏輯
try {
    const url = $request.url;
    const headers = $request.headers ? { ...$request.headers } : {};
    delete headers[':method'];
    delete headers[':path'];
    delete headers[':authority'];
    delete headers[':scheme'];

    const requestOptions = {
        url: url,
        method: "GET",
        headers: headers,
        "auto-redirect": false,
        "redirection": false 
    };

    $httpClient.get(requestOptions, (error, response, data) => {
        if (error) {
            $done({
                response: {
                    status: 200, // 保持 200 讓錯誤訊息能顯示
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: `<h1>連線錯誤</h1><p>Surge 無法連接 SendGrid。</p><p>錯誤: ${error}</p><a href="${url}">嘗試直接訪問</a>`
                }
            });
            return;
        }

        const targetUrl = (response.headers && (response.headers['Location'] || response.headers['location'])) || "";

        if (targetUrl) {
            const html = generateHtml(url, targetUrl);
            $done({
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: html
                }
            });
        } else {
            $done({
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: `<meta name="viewport" content="width=device-width, initial-scale=1"><h2>未偵測到跳轉</h2><p>狀態碼: ${response.status}</p><br><a href="${url}">直接訪問</a>`
                }
            });
        }
    });

} catch (err) {
    $done({});
}

function generateHtml(originalUrl, targetUrl) {
    const isPdf = targetUrl.toLowerCase().includes('.pdf');
    const color = isPdf ? "#d9534f" : "#f0ad4e";
    const icon = isPdf ? "⚠️ PDF 文件" : "🔗 一般連結";
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Surge 安全攔截</title>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; background-color: #f2f2f7; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: white; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 32px 24px; width: 100%; max-width: 380px; text-align: center; }
        h2 { margin: 0 0 16px; font-size: 22px; color: #1c1c1e; }
        p { color: #3a3a3c; font-size: 15px; margin: 0 0 24px; line-height: 1.5; }
        .url-container { background: #f5f5f7; padding: 16px; border-radius: 12px; text-align: left; margin-bottom: 24px; border-left: 6px solid ${color}; }
        .url-label { font-size: 11px; text-transform: uppercase; color: #8e8e93; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
        .url-text { font-family: SFMono-Regular, Consolas, monospace; font-size: 13px; color: #1c1c1e; word-break: break-all; max-height: 80px; overflow-y: auto; }
        .btn { display: block; padding: 16px; border-radius: 14px; text-decoration: none; font-weight: 600; font-size: 17px; margin-bottom: 12px; transition: transform 0.1s; }
        .btn:active { transform: scale(0.98); }
        .btn-primary { background-color: #007aff; color: white; box-shadow: 0 4px 12px rgba(0,122,255,0.2); }
        .btn-secondary { background-color: #e5e5ea; color: #1c1c1e; }
        .footer { font-size: 12px; color: #aeaeb2; margin-top: 12px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🛡️ 攔截追蹤連結</h2>
        <p>Surge 已暫停此 SendGrid 請求。<br>目標為 <strong>${icon}</strong>，請確認安全。</p>
        
        <div class="url-container">
            <span class="url-label">真實目標 (TARGET):</span>
            <div class="url-text">${targetUrl}</div>
        </div>

        <a href="${targetUrl}" class="btn btn-primary">繼續前往 (Proceed)</a>
        <!-- 修改點：點擊取消後跳轉到 about:blank 以達到「清空/離開」的效果 -->
        <a href="about:blank" class="btn btn-secondary">取消 (Cancel)</a>
        
        <div class="footer">點擊「取消」將導向空白頁</div>
    </div>
</body>
</html>`;
}
