/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.7 (Corrected Versioning)
 * @description [V41.43] 修正版本號標示。包含：高強度 Canvas 噪聲、CSP 移除、Line/WhatsApp/Google API 自動避讓機制。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

// 0. 快速避讓機制 (Fail-fast): 針對已知的不相容 App API 直接退出
// 這能節省效能並防止 App 崩潰，即使 MitM 誤開也能保護
const url = $request.url;
if (url.includes("line-apps.com") || 
    url.includes("line.me") || 
    url.includes("whatsapp.net") || 
    url.includes("googleapis.com") || 
    url.includes("push.apple.com")) {
    $done({});
} else {

    // 注入代碼 (保持 V41.41 的高強度噪聲邏輯)
    const injection = `
    <script>
    (function() {
        // 顯示浮標 (3秒後消失，避免擋住視線)
        const debugBadge = document.createElement('div');
        debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
        debugBadge.textContent = "🛡️ FP-Shield v1.7 Active";
        document.documentElement.appendChild(debugBadge);
        setTimeout(() => { debugBadge.style.opacity = '0'; setTimeout(() => debugBadge.remove(), 500); }, 3000);

        console.log("%c[FP-Defender] V1.7 Protection Active", "color: #00ff00; background: #000; padding: 4px;");

        try {
            // --- Canvas Fingerprinting (Smart Noise) ---
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            const noise = () => Math.floor(Math.random() * 5) - 2;

            CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
                const imageData = originalGetImageData.apply(this, arguments);
                // 恢復尺寸檢查：忽略小圖示 (如 16x16 favicon)，避免 UI 模糊
                if (w < 50 && h < 50) return imageData; 
                
                for (let i = 0; i < imageData.data.length; i += 4) {
                    if (i % 200 === 0) { // 中等密度干擾
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

            // --- WebGL Fingerprinting ---
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                // 模擬常見的 Intel 集顯，隱藏真實顯卡資訊
                if (parameter === 37445) return 'Intel Inc.'; 
                if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
                return getParameter.apply(this, arguments);
            };

            // --- AudioContext Fingerprinting ---
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

    let headers = $response.headers;
    let contentType = headers['Content-Type'] || headers['content-type'];

    // 嚴格檢查：必須是 HTML 類型
    if (!contentType || !contentType.toLowerCase().includes('text/html')) {
        $done({});
    } else {
        // 移除 CSP
        const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
        let modifiedHeaders = false;
        for (const key of cspKeys) {
            if (headers[key]) {
                delete headers[key];
                modifiedHeaders = true;
            }
        }

        let body = $response.body;
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
}
