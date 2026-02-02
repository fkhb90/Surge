/**
 * @file    sendgrid_guard.js (Safe Mode)
 * @title   SendGrid Interstitial Guard
 * @desc    攔截 SendGrid 追蹤連結，加入防崩潰機制與參數相容性修正。
 */

// 使用 try-catch 包裹主邏輯，防止腳本崩潰導致連線中斷
try {
    const url = $request.url;
    // console.log(`[Guard] Processing: ${url}`);

    // 處理 Headers：有些環境下 $request.headers 是 undefined
    const headers = $request.headers ? { ...$request.headers } : {};
    
    // 移除可能導致 HTTP/2 錯誤的偽標頭 (Pseudo-headers)
    delete headers[':method'];
    delete headers[':path'];
    delete headers[':authority'];
    delete headers[':scheme'];

    const requestOptions = {
        url: url,
        method: "GET",
        headers: headers,
        // 同時使用兩種參數名稱以確保相容性
        "auto-redirect": false,
        "redirection": false 
    };

    $httpClient.get(requestOptions, (error, response, data) => {
        // 錯誤處理：如果網路請求失敗
        if (error) {
            console.log(`[Guard] Network Error: ${error}`);
            // 回傳一個簡單的錯誤頁面，而不是讓連線死掉
            $done({
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: `<h1>解析錯誤</h1><p>Surge 無法連接 SendGrid。</p><p>錯誤: ${error}</p><a href="${url}">嘗試直接訪問</a>`
                }
            });
            return;
        }

        // 嘗試取得 Location (相容大小寫)
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
            // 如果沒有跳轉目標，顯示提示並允許直接訪問
            $done({
                response: {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    body: `
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>body{font-family:sans-serif;padding:20px;text-align:center;}</style>
                    <h2>無跳轉目標</h2>
                    <p>伺服器回應代碼: ${response.status}</p>
                    <p>這可能不是跳轉連結。</p>
                    <br>
                    <a href="${url}" style="background:#007aff;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;">直接訪問原始網址</a>
                    `
                }
            });
        }
    });

} catch (err) {
    console.log(`[Guard] Script Crash: ${err}`);
    // 萬一腳本本身炸了，回傳原始請求，確保網頁還能開
    $done({});
}

function generateHtml(originalUrl, targetUrl) {
    const isPdf = targetUrl.toLowerCase().includes('.pdf');
    const color = isPdf ? "#d9534f" : "#f0ad4e";
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Surge 安全攔截</title><style>body{font-family:-apple-system,sans-serif;background-color:#f2f2f7;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px}.card{background:white;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:24px;width:100%;max-width:400px;text-align:center}.url-box{background:#eee;padding:10px;border-radius:8px;word-break:break-all;font-family:monospace;margin:15px 0;text-align:left;border-left:5px solid ${color}}.btn{display:block;padding:12px;margin-top:10px;border-radius:10px;text-decoration:none;font-weight:bold}.btn-primary{background:#007aff;color:white}.btn-secondary{background:#e5e5ea;color:black}</style></head><body><div class="card"><h2>🚧 攔截 SendGrid 追蹤</h2><p>即將前往以下網址：</p><div class="url-box">${targetUrl}</div><a href="${targetUrl}" class="btn btn-primary">繼續前往</a><a href="javascript:window.close()" class="btn btn-secondary">取消</a></div></body></html>`;
}
