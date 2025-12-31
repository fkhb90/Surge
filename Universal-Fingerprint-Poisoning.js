/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.18 (GitHub Whitelist Added)
 * @description [v1.18] 新增 GitHub 開發者生態系白名單，解決代碼瀏覽與 Raw 內容讀取問題；保留 v1.17 的串流防護機制。
 * @note      [CRITICAL] 請務必配合 Surge 設定檔中的正則排除規則使用，以確保 0 延遲體驗。
 * @author    Claude & Gemini
 */

(function() {
    // ----------------------------------------------------------------
    // 0. 串流與協議級避讓 (Stream & Protocol Guard)
    // ----------------------------------------------------------------
    // 檢查 HTTP 狀態碼：206 代表 Partial Content (影片/音訊串流)，絕對不能讀取 Body
    if ($response.status === 206) {
        $done({});
        return;
    }

    const headers = $response.headers;
    const normalizedHeaders = {};
    for (const key in headers) {
        normalizedHeaders[key.toLowerCase()] = headers[key];
    }

    // 檢查 WebSocket 升級請求 (常見於即時通訊)
    if (normalizedHeaders['upgrade'] === 'websocket') {
        $done({});
        return;
    }

    // 檢查內容長度：如果 Body 超過 1MB 但 max-size 未攔截，主動放棄 (避免記憶體溢出)
    const contentLength = parseInt(normalizedHeaders['content-length'] || '0');
    if (contentLength > 2000000) { // 2MB 閾值
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 1. 原子級標頭防護 (Atomic Header Guard)
    // ----------------------------------------------------------------
    const contentType = normalizedHeaders['content-type'] || '';
    
    // [嚴格判定] 僅允許純 HTML 內容。
    // 排除 application/json, text/xml, image/*, application/octet-stream 等
    if (contentType && !contentType.includes('text/html')) {
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 2. User-Agent 深度檢測 (歸一化處理)
    // ----------------------------------------------------------------
    const uaRaw = $request.headers['User-Agent'] || $request.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase();
    
    // 條件 A: 沒有 UA (App 背景連線) -> 放行
    // 條件 B: 不包含 mozilla (非瀏覽器標準請求) -> 放行
    // 條件 C: 包含特定 App 關鍵字 -> 放行
    if (!ua || !ua.includes('mozilla') || 
        ua.includes('line/') || ua.includes('fb_iab') || ua.includes('micromessenger') || 
        ua.includes('worksmobile') || ua.includes('naver') || 
        ua.includes('github') || ua.includes('git/')) { // 新增 git 相關 UA 排除
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 3. 網域白名單 (Domain Allowlist) - v1.18 更新
    // ----------------------------------------------------------------
    const url = $request.url;
    const match = url.match(/^https?:\/\/([^/:]+)/i);
    const hostname = match ? match[1].toLowerCase() : '';
    
    const excludedDomains = [
        // LINE Ecosystem
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net", "nhncorp.jp", "line-cdn.net",
        "obs.line-scdn.net", "profile.line-scdn.net", "lcs.naver.com", "worksmobile.com",
        "line-apps-beta.com", "linetv.tw",
        
        // Messaging & VoIP
        "whatsapp.net", "whatsapp.com", "telegram.org", "messenger.com", "skype.com",
        
        // System & Cloud
        "googleapis.com", "gstatic.com", "google.com", "apple.com", "icloud.com", 
        "microsoft.com", "windowsupdate.com", "azure.com", "crashlytics.com",
        
        // Developer Tools (GitHub) - [v1.18 New]
        "github.com", "githubusercontent.com", "githubassets.com", "git.io", "github.io",
        
        // Streaming
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

    // [雙重保險] 檢查 Body 開頭，防止伺服器標示錯誤
    const startChars = body.substring(0, 20).trim();
    // 如果開頭是 { (JSON) 或 [ (Array) 或不包含 < (HTML tag)，則退出
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) {
        $done({});
        return;
    }

    const injection = `
<script>
(function() {
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    debugBadge.textContent = "🛡️ FP-Shield v1.18";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);
    console.log("%c[FP-Defender] v1.18 Active", "color: #00ff00; background: #000; padding: 4px;");

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
