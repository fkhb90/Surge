/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.13 (Hostname Match Fix)
 * @description [v1.13] 重構快速避讓機制。捨棄不穩定的正則匹配，改用更高效且精準的主機名後綴比對 (Hostname Suffix Match)，解決前版失效問題。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

// 0. 快速避讓機制 (Fail-fast): 針對已知的不相容 App API 直接退出
// 使用 IIFE 避免變數污染，並執行避讓檢查
(function() {
    const url = $request.url;
    
    // 定義排除域名清單 (純淨域名格式，無需正則轉義)
    const excludedDomains = [
        // --- 通訊軟體 (Communication) ---
        "line-apps.com", "line.me", "naver.jp",
        "whatsapp.net", "whatsapp.com",
        "telegram.org",
        "messenger.com",
        
        // --- 系統與雲端服務 (System & Cloud) ---
        "googleapis.com", "gstatic.com", "google.com",
        "push.apple.com", "icloud.com", "itunes.com", "mzstatic.com",
        "microsoft.com", "windowsupdate.com",
        
        // --- 社群平台 (Social Media - API Traffic) ---
        "facebook.com", "fbcdn.net", "instagram.com", "cdninstagram.com",
        "twitter.com", "twimg.com",
        
        // --- 串流媒體 (Streaming - DRM) ---
        "netflix.com", "nflxvideo.net", "nflximg.net",
        "spotify.com", "spotifycdn.com",
        "disney.com", "bamgrid.com",
        "youtube.com", "googlevideo.com",
        
        // --- 金融與支付 (Finance & Payment - Pinning) ---
        "paypal.com", "paypalobjects.com",
        
        // --- 遊戲平台 (Gaming) ---
        "nintendo.net", "playstation.net", "xboxlive.com"
    ];

    // 輔助函數：從 URL 提取主機名 (Hostname)
    function getHostname(url) {
        // 匹配協議頭後的部分，直到遇到路徑分隔符 / 或端口冒號 :
        const match = url.match(/^https?:\/\/([^/:]+)/i);
        return match ? match[1].toLowerCase() : null;
    }

    // 執行檢查
    const hostname = getHostname(url);
    
    if (hostname) {
        for (const domain of excludedDomains) {
            // 檢查邏輯：主機名完全相等 OR 主機名以 .domain 結尾 (代表子網域)
            // 例如: hostname="api.line.me" 與 domain="line.me" -> 匹配
            // 例如: hostname="line.me" 與 domain="line.me" -> 匹配
            // 例如: hostname="offline.me" 與 domain="line.me" -> 不匹配
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                console.log(`[FP-Defender] Skipped excluded domain: ${hostname} (Matched: ${domain})`);
                $done({}); // 直接返回，不修改任何內容
                return;
            }
        }
    }

    // 若未被排除，執行注入邏輯
    executeInjection();
})();

function executeInjection() {
    const injection = `
<script>
(function() {
    // 顯示浮標 (3秒後消失,避免擋住視線)
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
    debugBadge.textContent = "🛡️ FP-Shield v1.13 Active";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);

    console.log("%c[FP-Defender] v1.13 Protection Active", "color: #00ff00; background: #000; padding: 4px;");

    try {
        // --- Canvas Fingerprinting (Smart Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const noise = () => Math.floor(Math.random() * 5) - 2;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            // 忽略過小的 Canvas 操作 (通常是 UI 渲染而非指紋採集)
            if (w < 50 && h < 50) return imageData; 
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                // 降低噪聲頻率，每 200 像素修改一次，平衡隱私與視覺影響
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
                    // 在 Canvas 上繪製極微小的不可見噪聲點
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = oldStyle;
                }
            }
            return originalToDataURL.apply(this, arguments);
        };

        // --- WebGL Fingerprinting ---
        // 偽造顯卡供應商資訊
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // UNMASKED_VENDOR_WEBGL = 37445
            if (parameter === 37445) return 'Intel Inc.'; 
            // UNMASKED_RENDERER_WEBGL = 37446
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return getParameter.apply(this, arguments);
        };

        // --- AudioContext Fingerprinting ---
        if (window.AudioBuffer && window.AudioBuffer.prototype) {
            const getChannelData = window.AudioBuffer.prototype.getChannelData;
            window.AudioBuffer.prototype.getChannelData = function() {
                const results = getChannelData.apply(this, arguments);
                // 對音頻緩衝區數據添加微量隨機偏移
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

    // 確保只處理 HTML 內容
    if (!contentType || !contentType.toLowerCase().includes('text/html')) {
        $done({});
        return;
    }

    // 移除 CSP (Content Security Policy) 以允許注入的腳本執行
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 
                     'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) {
        if (headers[key]) delete headers[key];
    }

    let body = $response.body;
    const headRegex = /<head>/i;
    
    // 將防護腳本注入到 <head> 標籤後
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
