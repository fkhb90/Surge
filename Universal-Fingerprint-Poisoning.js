/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.15 (Null UA Fix & Strict Mode)
 * @description [v1.15] 修正空 User-Agent 導致的判斷漏洞 (關鍵修復)；實施嚴格的內容檢測策略，僅允許標準 HTML 注入，徹底杜絕 LINE/VoIP 通訊中斷。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

// 0. 極速避讓機制 (Hyper-Fast Fail-over)
(function() {
    // --- 第一層防護：User-Agent 深度檢測 ---
    const uaHeader = $request.headers['User-Agent'] || $request.headers['user-agent'];
    
    // [關鍵修正 v1.15] 
    // 1. 如果 UA 不存在 (undefined/null/空字串)，視為 App 背景流量 -> 放行
    // 2. 如果 UA 存在但不包含 "Mozilla"，視為 App API -> 放行
    // 3. 排除 "Line/" 開頭的 UA，因為 LINE 內嵌瀏覽器有時會標示 Mozilla 但我們不應干擾
    if (!uaHeader || !uaHeader.includes('Mozilla') || uaHeader.includes(' Line/')) {
        // console.log(`[FP-Defender] Skipped Non-Browser/App Request`);
        $done({});
        return;
    }

    // --- 第二層防護：域名白名單 (擴充版) ---
    const url = $request.url;
    
    // 針對 LINE 與即時通訊的完整排除清單
    const excludedDomains = [
        // LINE & Naver Complex
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net", "nhncorp.jp",
        "line-cdn.net", "linetv.tw", "pstatic.net",
        
        // Messaging & VoIP
        "whatsapp.net", "whatsapp.com", "telegram.org", "messenger.com", "skype.com",
        
        // System & Cloud
        "googleapis.com", "gstatic.com", "google.com", "googleusercontent.com",
        "apple.com", "icloud.com", "itunes.com", "mzstatic.com", "push.apple.com",
        "microsoft.com", "windowsupdate.com", "live.com", "office.net", "azure.com",
        
        // Social Media API
        "facebook.com", "fbcdn.net", "instagram.com", "cdninstagram.com",
        "twitter.com", "twimg.com", "tiktokv.com",
        
        // Streaming & DRM
        "netflix.com", "nflxvideo.net", "nflximg.net",
        "spotify.com", "spotifycdn.com", "disney.com", "bamgrid.com",
        "youtube.com", "googlevideo.com",
        
        // Finance & Gaming
        "paypal.com", "paypalobjects.com", "stripe.com",
        "nintendo.net", "playstation.net", "xboxlive.com", "steamstatic.com"
    ];

    // 優化的主機名提取
    const match = url.match(/^https?:\/\/([^/:]+)/i);
    const hostname = match ? match[1].toLowerCase() : '';
    
    if (hostname) {
        for (const domain of excludedDomains) {
            // 後綴匹配：hostname 等於 domain 或以 .domain 結尾
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                $done({}); 
                return;
            }
        }
    }

    // 若通過篩選，進入注入階段
    executeInjection();
})();

function executeInjection() {
    let headers = $response.headers;
    // 處理 Header Key 大小寫不一致的問題
    let contentType = headers['Content-Type'] || headers['content-type'] || '';

    // --- 第三層防護：嚴格內容類型檢查 (Strict Content-Type) ---
    // [v1.15] 僅允許明確標示為 text/html 的回應
    if (!contentType.toLowerCase().includes('text/html')) {
        $done({});
        return;
    }

    let body = $response.body;
    if (!body) {
        $done({});
        return;
    }

    // --- 第四層防護：內容嗅探 (Content Sniffing) ---
    // [v1.15] 防止 API 誤標 Content-Type。如果 Body 看起來像 JSON，強制退出。
    // 檢查前 20 個字元是否包含 JSON 特徵 '{' 或 '['
    const trimmedBody = body.substring(0, 20).trim();
    if (trimmedBody.startsWith('{') || trimmedBody.startsWith('[')) {
        console.log(`[FP-Defender] Skipped Fake-HTML JSON response`);
        $done({});
        return;
    }

    // 移除 CSP
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 
                     'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) {
        if (headers[key]) delete headers[key];
    }

    // 注入代碼
    const injection = `
<script>
(function() {
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    debugBadge.textContent = "🛡️ FP-Shield v1.15";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);
    console.log("%c[FP-Defender] v1.15 Active", "color: #00ff00; background: #000; padding: 4px;");

    try {
        // 1. Canvas Fingerprinting
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

        // 2. WebGL
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return getParameter.apply(this, arguments);
        };

        // 3. AudioContext
        if (window.AudioBuffer && window.AudioBuffer.prototype) {
            const getChannelData = window.AudioBuffer.prototype.getChannelData;
            window.AudioBuffer.prototype.getChannelData = function() {
                const results = getChannelData.apply(this, arguments);
                for (let i = 0; i < 100 && i < results.length; i += 10) {
                    results[i] += (Math.random() * 0.00001); 
                }
                return results;
            };
        }
    } catch (e) { console.error("[FP-Defender] Error:", e); }
})();
</script>
`;

    // 注入位置選擇
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
}
