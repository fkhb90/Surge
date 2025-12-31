/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.3 (Stability & Performance Fix)
 * @description 針對 Canvas, WebGL, AudioContext, Hardware, Memory 進行 API 層級的指紋混淆。採用「讀取時毒化」策略，避免視覺與聽覺破壞。
 * @note      [Surge Configuration]
 * Type: http-response
 * Pattern: ^https?://
 * Requires-Body: true
 * Max-Size: 524288 (建議設定 512KB，防止緩衝大檔案導致卡頓)
 * Timeout: 10
 * @author    Claude & Gemini
 */

const injection = `
<script>
(function() {
    const DEBUG = false;
    function log(msg) { if(DEBUG) console.log("[FP-Defender] " + msg); }

    try {
        // --- 1. Canvas Fingerprinting (Smart Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        
        // 隨機噪音生成器 (-1, 0, 1)
        const noise = () => Math.floor(Math.random() * 3) - 1;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            // 忽略小圖示，避免 UI 損壞
            if (w < 50 && h < 50) return imageData; 
            
            for (let i = 0; i < imageData.data.length; i += 4) {
                // 稀疏採樣干擾 (每 100 像素干擾一點)，降低 CPU 消耗與視覺影響
                if (i % 400 === 0) {
                    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise()));     // R
                    imageData.data[i+1] = Math.min(255, Math.max(0, imageData.data[i+1] + noise())); // G
                    imageData.data[i+2] = Math.min(255, Math.max(0, imageData.data[i+2] + noise())); // B
                }
            }
            log("Canvas data poisoned");
            return imageData;
        };

        // 針對 toDataURL 進行微小擾動
        HTMLCanvasElement.prototype.toDataURL = function() {
            if (!this._defended) {
                this._defended = true;
                const ctx = this.getContext('2d');
                if (ctx) {
                    // 繪製一個幾乎透明的像素，足以改變 Hash 但人眼不可見
                    const oldStyle = ctx.fillStyle;
                    ctx.fillStyle = 'rgba(255,255,255,0.01)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = oldStyle;
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
                // 僅對前 100 個樣本注入極微量噪音，破壞指紋雜湊
                for (let i = 0; i < 100 && i < results.length; i += 10) {
                    results[i] += (Math.random() * 0.00001); 
                }
                log("Audio buffer poisoned");
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
        console.error("[FP-Defender] Error:", e);
    }
})();
</script>
`;

// 安全檢查：確認回應存在且為 HTML 類型
const headers = $response.headers;
const contentType = headers['Content-Type'] || headers['content-type'];

// 若非 HTML 內容 (如 JSON, 圖片, 純文字) 則直接跳過，節省資源並防止誤傷
if (!contentType || !contentType.toLowerCase().includes('text/html')) {
    $done({});
} else {
    let body = $response.body;
    const headRegex = /<head>/i; // 不區分大小寫
    
    if (body && headRegex.test(body)) {
        // 確保注入在 <head> 最前端，搶在指紋腳本執行前生效
        body = body.replace(headRegex, (match) => match + injection);
        $done({ body });
    } else {
        $done({});
    }
}
