/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.4 (CSP Bypass & Robust Injection)
 * @description 針對 Canvas, WebGL, Audio 等指紋進行混淆。V41.39 新增移除 CSP (Content-Security-Policy) 標頭的功能，防止瀏覽器阻擋注入的腳本執行。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288
 * Timeout: 10
 * @author    Claude & Gemini
 */

const injection = `
<script>
(function() {
    // 啟用控制台日誌以驗證注入是否成功
    console.log("%c[FP-Defender] V41.39 Active - Fingerprint Spoofing Started", "color: #00ff00; font-weight: bold; background: #000; padding: 4px;");

    try {
        // --- 1. Canvas Fingerprinting (Smart RGB Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        
        // 隨機噪音生成器 (-2 ~ 2)
        const noise = () => Math.floor(Math.random() * 5) - 2;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            // 呼叫原始方法獲取數據
            const imageData = originalGetImageData.apply(this, arguments);
            
            // 忽略過小的畫布 (例如 UI 圖示)，避免破壞網頁外觀
            if (w < 50 && h < 50) return imageData; 
            
            // 注入隨機噪音
            let modified = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                // 稀疏採樣干擾 (每 200 像素干擾一點)
                if (i % 800 === 0) {
                    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise()));     // R
                    imageData.data[i+1] = Math.min(255, Math.max(0, imageData.data[i+1] + noise())); // G
                    imageData.data[i+2] = Math.min(255, Math.max(0, imageData.data[i+2] + noise())); // B
                    modified = true;
                }
            }
            if (modified) console.debug("[FP-Defender] Canvas data poisoned");
            return imageData;
        };

        // 針對 toDataURL 進行微小擾動 (繪製隱形像素)
        HTMLCanvasElement.prototype.toDataURL = function() {
            if (!this._defended) {
                this._defended = true;
                const ctx = this.getContext('2d');
                if (ctx) {
                    const oldStyle = ctx.fillStyle;
                    // 畫一個極度透明的點，足以改變 Hash 但人眼不可見
                    ctx.fillStyle = 'rgba(255,255,255,0.02)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = oldStyle;
                    console.debug("[FP-Defender] Canvas URL poisoned");
                }
            }
            return originalToDataURL.apply(this, arguments);
        };

        // --- 2. WebGL Fingerprinting (Parameter Spoofing) ---
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // 37445: UNMASKED_VENDOR_WEBGL
            // 37446: UNMASKED_RENDERER_WEBGL
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return getParameter.apply(this, arguments);
        };

        // --- 3. AudioContext Fingerprinting (Buffer Noise) ---
        if (window.AudioBuffer && window.AudioBuffer.prototype) {
            const getChannelData = window.AudioBuffer.prototype.getChannelData;
            window.AudioBuffer.prototype.getChannelData = function() {
                const results = getChannelData.apply(this, arguments);
                // 對前 100 個樣本注入微量噪音
                for (let i = 0; i < 100 && i < results.length; i += 10) {
                    results[i] += (Math.random() * 0.00001); 
                }
                return results;
            };
        }

        // --- 4. Hardware Concurrency (Fixed Value) ---
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });

        // --- 5. Device Memory (Fixed Value) ---
        if (navigator.deviceMemory) {
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        }

    } catch (e) {
        console.error("[FP-Defender] Injection Error:", e);
    }
})();
</script>
`;

// 獲取回應標頭
let headers = $response.headers;
let contentType = headers['Content-Type'] || headers['content-type'];

// 1. 檢查是否為 HTML
if (!contentType || !contentType.toLowerCase().includes('text/html')) {
    $done({});
} else {
    // 2. 移除 CSP 限制 (關鍵步驟：這允許我們的 inline script 執行)
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) {
        if (headers[key]) {
            delete headers[key];
            // console.log(`[FP-Defender] Removed CSP header: ${key}`); // Debug use
        }
    }

    // 3. 注入腳本
    let body = $response.body;
    const headRegex = /<head>/i;
    
    if (body && headRegex.test(body)) {
        // 將腳本插入 <head> 之後
        body = body.replace(headRegex, (match) => match + injection);
        // 回傳修改後的 Body 與 Headers (移除了 CSP)
        $done({ body: body, headers: headers });
    } else {
        $done({}); // 若找不到 <head> 則不修改 Body，但可能已修改 Headers
    }
}
