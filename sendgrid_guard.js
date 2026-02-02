/**
 * @file    sendgrid_guard.js
 * @title   SendGrid Interstitial Guard
 * @desc    攔截 SendGrid 追蹤連結，預先解析目標網址並顯示警告頁面供用戶確認。
 * @author  Jerry's Assistant
 */

const url = $request.url;

// 發送預檢請求 (HEAD 或 GET)，並禁止自動重定向
// 這樣我們才能拿到 302 Location 而不是跟隨跳轉
const requestOptions = {
    url: url,
    method: "GET", // SendGrid 連結通常是 GET
    headers: $request.headers,
    auto-redirect: false // 關鍵：禁止自動跟隨跳轉
};

$httpClient.get(requestOptions, (error, response, data) => {
    if (error) {
        $done({
            response: {
                status: 500,
                body: `<h1>解析失敗</h1><p>無法連接至 SendGrid 伺服器。</p><p>錯誤訊息: ${error}</p>`
            }
        });
        return;
    }

    // 取得重定向目標 (Location Header)
    // 注意：Header 名稱可能會有大小寫差異
    const targetUrl = response.headers['Location'] || response.headers['location'];

    if (targetUrl) {
        // 成功取得目標，生成警告頁面
        const html = generateHtml(url, targetUrl);
        $done({
            response: {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                },
                body: html
            }
        });
    } else {
        // 如果沒有 Location，代表這可能不是一個跳轉連結，或者是最終頁面
        // 這種情況下，我們選擇放行原始請求（或顯示錯誤）
        // 由於在 http-request 階段無法直接 "放行並繼續"，我們顯示提示
        $done({
            response: {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: `<h1>非跳轉連結</h1><p>此 SendGrid 連結沒有回傳重定向目標。</p><p><a href="${url}">點擊此處嘗試直接訪問</a></p>`
            }
        });
    }
});

function generateHtml(originalUrl, targetUrl) {
    // 簡單的安全檢查：如果目標包含 .pdf，顯示特定圖示
    const isPdf = targetUrl.toLowerCase().includes('.pdf');
    const warningColor = isPdf ? "#d9534f" : "#f0ad4e"; // 紅色警戒 PDF，黃色警戒一般連結
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🛡️ Surge 安全攔截</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f7; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px; max-width: 500px; width: 100%; text-align: center; }
            .icon { font-size: 48px; margin-bottom: 20px; }
            h2 { margin: 0 0 10px 0; color: #1c1c1e; }
            p { color: #3a3a3c; font-size: 15px; line-height: 1.5; margin-bottom: 20px; }
            .url-box { background: #e5e5ea; padding: 12px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 13px; color: #000; margin-bottom: 20px; text-align: left; max-height: 100px; overflow-y: auto; }
            .btn-group { display: flex; flex-direction: column; gap: 10px; }
            .btn { display: block; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; transition: opacity 0.2s; }
            .btn:active { opacity: 0.7; }
            .btn-primary { background-color: #007aff; color: white; }
            .btn-secondary { background-color: #e5e5ea; color: #1c1c1e; }
            .label { font-size: 12px; text-transform: uppercase; color: #8e8e93; margin-bottom: 5px; text-align: left; display: block; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">🚧</div>
            <h2>追蹤連結攔截</h2>
            <p>您點擊了一個 <strong>SendGrid</strong> 追蹤連結。Surge 已暫停請求，請確認最終目標是否安全。</p>
            
            <span class="label">最終目標 (Target):</span>
            <div class="url-box" style="border-left: 4px solid ${warningColor};">
                ${targetUrl}
            </div>

            <div class="btn-group">
                <a href="${targetUrl}" class="btn btn-primary">前往目標網站 (繞過追蹤)</a>
                <a href="javascript:window.close()" class="btn btn-secondary">取消並關閉</a>
            </div>
            
            <p style="font-size: 12px; color: #aeaeb2; margin-top: 20px;">
                注意：此預覽操作已觸發 SendGrid 的伺服器紀錄，發件人已知悉此連結被訪問，但您的瀏覽器尚未加載目標惡意內容。
            </p>
        </div>
    </body>
    </html>
    `;
}
