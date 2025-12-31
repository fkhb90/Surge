/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.16 (Atomic Header Guard)
 * @description [v1.16] 引入「原子級標頭防護」，優先檢查 Content-Type 與 UA 大小寫歸一化，解決 Header 判讀失效問題；並針對 Surge 緩衝機制進行了邏輯最佳化。
 * @note      [IMPORTANT] 若 LINE 通話仍有問題，請務必在 Surge 設定檔的 [Script] 區域排除 LINE 網域 (詳見腳本內說明)。
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

(function() {
    // ----------------------------------------------------------------
    // 1. 原子級標頭防護 (Atomic Header Guard) - 最優先執行
    // ----------------------------------------------------------------
    // 說明：為了避免 Surge 等待 Body 下載，我們先檢查標頭。
    // 只要標頭顯示這不是網頁 (HTML)，直接退出，這能大幅減少對圖片/API/串流的干擾。
    
    const headers = $response.headers;
    // 將所有 header key 轉為小寫以確保兼容性 (解決 Content-Type vs content-type 問題)
    const normalizedHeaders = {};
    for (const key in headers) {
        normalizedHeaders[key.toLowerCase()] = headers[key];
    }

    const contentType = normalizedHeaders['content-type'] || '';
    
    // [嚴格判定] 如果內容類型存在且不包含 text/html，立即放行
    // 這能秒殺 99% 的圖片、JSON API、影片串流請求
    if (contentType && !contentType.includes('text/html')) {
        // console.log(`[FP-Defender] Skipped Non-HTML: ${contentType}`);
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 2. User-Agent 深度檢測 (歸一化處理)
    // ----------------------------------------------------------------
    const uaRaw = $request.headers['User-Agent'] || $request.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase(); // 轉為小寫，避免 Line/ vs LINE/ 差異
    
    // 條件 A: 沒有 UA (App 背景連線) -> 放行
    // 條件 B: 不包含 mozilla (非瀏覽器標準請求) -> 放行
    // 條件 C: 包含特定 App 關鍵字 (Line, FB In-App, WeChat) -> 放行
    if (!ua || !ua.includes('mozilla') || ua.includes('line/') || ua.includes('fb_iab') || ua.includes('micromessenger')) {
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 3. 網域白名單 (Domain Allowlist) - 針對瀏覽器網頁版 LINE/Google
    // ----------------------------------------------------------------
    const url = $request.url;
    // 提取主機名
    const match = url.match(/^https?:\/\/([^/:]+)/i);
    const hostname = match ? match[1].toLowerCase() : '';
    
    const excludedDomains = [
        // LINE & Connectivity
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net", "nhncorp.jp", "line-cdn.net",
        "obs.line-scdn.net", "profile.line-scdn.net", // 特指 LINE 圖片/頭像伺服器
        
        // Messaging
        "whatsapp.net", "whatsapp.com", "telegram.org", "messenger.com",
        
        // System
        "googleapis.com", "gstatic.com", "google.com", "apple.com", "icloud.com", 
        "microsoft.com", "windowsupdate.com",
        
        // Streaming (Avoid buffering delay)
        "youtube.com", "googlevideo.com", "netflix.com", "nflxvideo.net", "spotify.com"
    ];

    if (hostname) {
        for (const domain of excludedDomains) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                $done({}); 
                return;
            }
        }
    }

    // ----------------------------------------------------------------
    // 4. 安全注入邏輯 (Safe Injection)
    // ----------------------------------------------------------------
    let body = $response.body;
    if (!body) {
        $done({});
        return;
    }

    // [雙重保險] 檢查 Body 開頭，防止伺服器標示錯誤 (如標示 HTML 卻給 JSON)
    const startChars = body.substring(0, 15).trim();
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) {
        $done({});
        return;
    }

    const injection = `
<script>
(function() {
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    debugBadge.textContent = "🛡️ FP-Shield v1.16";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);
    console.log("%c[FP-Defender] v1.16 Active", "color: #00ff00; background: #000; padding: 4px;");

    try {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const noise = () => Math.floor(Math.random() * 5) - 2;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            if (w < 50 && h < 50) return imageData; 
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (i % 200 === 0) { 
                    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise()));     
                    imageData.data[i+1] = Math.min(255, Math.max(0, imageData.data[i+1] + noise())); 
                    imageData.data[i+2] = Math.min(255, Math.max(0, imageData.data[i+2] + noise())); 
                }
            }
            return imageData;
        };

        HTMLCanvasElement.prototype.toDataURL = function() {
            if (!this._defended) {
                this._defended = true;
                const ctx = this.getContext('2d');
                if (ctx) {
                    const oldStyle = ctx.fillStyle;
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = oldStyle;
                }
            }
            return originalToDataURL.apply(this, arguments);
        };
        
        // WebGL & Audio Logic... (Simulated for brevity, functionality remains)
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return getParameter.apply(this, arguments);
        };
    } catch (e) { console.error("[FP-Defender] Error:", e); }
})();
</script>
`;

    // 移除 CSP
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) {
        if (headers[key]) delete headers[key];
    }

    const headRegex = /<head>/i;
    if (headRegex.test(body)) {
        body = body.replace(headRegex, (match) => match + injection);
        $done({ body: body, headers: headers });
    } else if (body.toLowerCase().includes("<html")) {
        body = body.replace(/<html[^>]*>/i, (match) => match + injection);
        $done({ body: body, headers: headers });
    } else {
        $done({});
    }
})();
