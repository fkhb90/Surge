/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.5 (Visual Debug Mode)
 * @description 新增視覺化浮標，直接在頁面上顯示注入狀態，徹底排除「是否生效」的疑慮。
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
    // 1. 視覺化驗證：在頁面左下角顯示綠色護盾 (3秒後自動消失)
    const debugBadge = document.createElement('div');
    debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:rgba(0,128,0,0.8); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.2);";
    debugBadge.textContent = "🛡️ FP-Shield Active";
    document.documentElement.appendChild(debugBadge);
    setTimeout(() => debugBadge.remove(), 3000);

    console.log("%c[FP-Defender] V41.40 Injection Success", "color: #00ff00; background: #000; padding: 4px;");

    try {
        // --- Canvas Fingerprinting (Smart RGB Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const noise = () => Math.floor(Math.random() * 5) - 2;

        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            if (w < 50 && h < 50) return imageData; 
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (i % 800 === 0) {
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

if (!contentType || !contentType.toLowerCase().includes('text/html')) {
    $done({});
} else {
    // 移除 CSP
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'Content-Security-Policy-Report-Only', 'content-security-policy-report-only'];
    for (const key of cspKeys) if (headers[key]) delete headers[key];

    let body = $response.body;
    const headRegex = /<head>/i;
    
    // 強制注入：如果找不到 <head>，嘗試注入到 <body> 或 <html>
    if (body) {
        if (headRegex.test(body)) {
            body = body.replace(headRegex, (match) => match + injection);
        } else if (body.toLowerCase().includes("<html")) {
            body = body.replace(/<html[^>]*>/i, (match) => match + injection);
        } else {
             // 最後手段：直接加在最前面
            body = injection + body;
        }
        $done({ body: body, headers: headers });
    } else {
        $done({});
    }
}
