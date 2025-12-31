/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.14 (Line Fix & UA Guard)
 * @description [v1.14] 引入 User-Agent 識別機制，自動避讓所有非瀏覽器 (App API) 流量；補全 LINE 相關 CDN 網域，徹底解決通訊中斷問題。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

// 0. 核心避讓機制 (Core Fail-fast Logic)
(function() {
    // --- 第一層防護：User-Agent 檢測 (針對 App API 的特效藥) ---
    // 大多數 App 的 API 請求不包含 "Mozilla"，而只有瀏覽器網頁請求會包含。
    // 這能自動過濾掉 99% 的通訊軟體流量 (Line, WhatsApp, Telegram)。
    const ua = $request.headers['User-Agent'] || $request.headers['user-agent'] || '';
    if (ua && !ua.includes('Mozilla')) {
        console.log(`[FP-Defender] Skipped Non-Browser Request: ${ua.substring(0, 30)}...`);
        $done({});
        return;
    }

    // --- 第二層防護：域名白名單 (Domain Allowlist) ---
    const url = $request.url;
    
    // 擴充後的排除清單 (包含 Line CDN, Microsoft, Apple 等)
    const excludedDomains = [
        // --- 通訊軟體 (Communication) ---
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net", "nhncorp.jp",
        "whatsapp.net", "whatsapp.com",
        "telegram.org",
        "messenger.com",
        
        // --- 系統與雲端服務 (System & Cloud) ---
        "googleapis.com", "gstatic.com", "google.com", "googleusercontent.com",
        "push.apple.com", "icloud.com", "itunes.com", "mzstatic.com", "apple.com",
        "microsoft.com", "windowsupdate.com", "live.com", "office.net",
        
        // --- 社群平台 (Social Media - API Traffic) ---
        "facebook.com", "fbcdn.net", "instagram.com", "cdninstagram.com",
        "twitter.com", "twimg.com", "tiktokv.com",
        
        // --- 串流媒體 (Streaming - DRM) ---
        "netflix.com", "nflxvideo.net", "nflximg.net",
        "spotify.com", "spotifycdn.com",
        "disney.com", "bamgrid.com",
        "youtube.com", "googlevideo.com",
        
        // --- 金融與支付 (Finance & Payment) ---
        "paypal.com", "paypalobjects.com",
        "stripe.com",
        
        // --- 遊戲平台 (Gaming) ---
        "nintendo.net", "playstation.net", "xboxlive.com", "steamstatic.com"
    ];

    // 輔助函數：從 URL 提取主機名 (Hostname)
    function getHostname(url) {
        const match = url.match(/^https?:\/\/([^/:]+)/i);
        return match ? match[1].toLowerCase() : null;
    }

    const hostname = getHostname(url);
    
    if (hostname) {
        for (const domain of excludedDomains) {
            // 檢查：主機名完全相等 OR 主機名以 .domain 結尾
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                // 使用 console.log 僅在開發時開啟，平時可註解以減少日誌
                // console.log(`[FP-Defender] Skipped Whitelisted Domain: ${hostname}`);
                $done({}); 
                return;
            }
        }
    }

    // 若通過兩層篩選，執行注入
    executeInjection();
})();

function executeInjection() {
    // 注入代碼：包含 Canvas, WebGL, AudioContext 指紋混淆
    const injection = `
<script>
(function() {
    // 浮標提示 (僅顯示 3 秒)
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    debugBadge.textContent = "🛡️ FP-Shield v1.14";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);

    console.log("%c[FP-Defender] v1.14 Protection Active", "color: #00ff00; background: #000; padding: 4px;");

    try {
        // --- 1. Canvas Fingerprinting (Smart Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        
        // 使用偽隨機噪聲，避免固定模式
        const noise = () => Math.floor(Math.random() * 5) - 2;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            // 忽略小尺寸 Canvas 操作 (通常是 UI 元素)
            if (w < 50 && h < 50) return imageData; 
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                // 降低噪聲密度 (每 200 像素修改一個)，平衡隱私與顯示效果
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
                    // 繪製極微小的透明點，改變最終 Hash
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = oldStyle;
                }
            }
            return originalToDataURL.apply(this, arguments);
        };

        // --- 2. WebGL Fingerprinting ---
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // 偽裝為常見的 Intel 集顯，混淆硬體特徵
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return getParameter.apply(this, arguments);
        };

        // --- 3. AudioContext Fingerprinting ---
        if (window.AudioBuffer && window.AudioBuffer.prototype) {
            const getChannelData = window.AudioBuffer.prototype.getChannelData;
            window.AudioBuffer.prototype.getChannelData = function() {
                const results = getChannelData.apply(this, arguments);
                // 對音頻數據添加微量抖動
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

    let headers = $response.headers;
    let contentType = headers['Content-Type'] || headers['content-type'];

    // --- 第三層防護：內容類型檢測 (Content-Type Check) ---
    // 確保只注入 HTML 內容，嚴禁修改 JSON, XML 或二進制數據
    if (!contentType || !contentType.toLowerCase().includes('text/html')) {
        $done({});
        return;
    }

    // 移除 CSP 以允許腳本執行
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 
                     'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) {
        if (headers[key]) delete headers[key];
    }

    let body = $response.body;
    // 注入位置選擇：優先 <head>，其次 <html>
    const headRegex = /<head>/i;
    
    if (body) {
        if (headRegex.test(body)) {
            body = body.replace(headRegex, (match) => match + injection);
            $done({ body: body, headers: headers });
        } else if (body.toLowerCase().includes("<html")) {
            body = body.replace(/<html[^>]*>/i, (match) => match + injection);
            $done({ body: body, headers: headers });
        } else {
            $done({});
        }
    } else {
        $done({});
    }
}
