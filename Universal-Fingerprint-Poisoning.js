/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.36 (Clean UI & Session Default)
 * @description [v1.36] UI 回歸極簡版，自動淡出；同步 Tampermonkey 核心 (Iframe/Offscreen/Session)。
 * @note      [CRITICAL] 請務必配合 Surge 設定檔中的正則排除規則使用，以確保 0 延遲體驗。
 * @author    Claude & Gemini
 */

(function() {
    // ----------------------------------------------------------------
    // 0. 串流與協議級避讓 (Stream & Protocol Guard)
    // ----------------------------------------------------------------
    if ($response.status === 206) { $done({}); return; }

    const headers = $response.headers;
    const normalizedHeaders = {};
    for (const key in headers) {
        normalizedHeaders[key.toLowerCase()] = headers[key];
    }

    if (normalizedHeaders['upgrade'] === 'websocket') { $done({}); return; }

    const contentLength = parseInt(normalizedHeaders['content-length'] || '0');
    if (contentLength > 2000000) { $done({}); return; }

    // ----------------------------------------------------------------
    // 1. 原子級標頭防護 (Atomic Header Guard)
    // ----------------------------------------------------------------
    const contentType = normalizedHeaders['content-type'] || '';
    if (contentType && !contentType.includes('text/html')) {
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 2. User-Agent 深度檢測 (邏輯避讓)
    // ----------------------------------------------------------------
    const uaRaw = $request.headers['User-Agent'] || $request.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase();
    
    // 排除 App API 與非瀏覽器流量
    if (!ua || !ua.includes('mozilla') || 
        ua.includes('line/') || ua.includes('fb_iab') || ua.includes('micromessenger') || 
        ua.includes('worksmobile') || ua.includes('naver') || 
        ua.includes('github') || ua.includes('git/') ||
        ua.includes('shopee') || ua.includes('seamoney')) {
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 3. 網域白名單 (Domain Allowlist) - 邏輯避讓
    // ----------------------------------------------------------------
    const url = $request.url;
    const match = url.match(/^https?:\/\/([^/:]+)/i);
    const hostname = match ? match[1].toLowerCase() : '';
    
    const excludedDomains = [
        "shopee.tw", "shopee.com", "shopeemobile.com", "susercontent.com", "shopee.ph",
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net",
        "whatsapp.net", "whatsapp.com", "telegram.org",
        "googleapis.com", "gstatic.com", "google.com", "apple.com", "icloud.com", 
        "microsoft.com", "windowsupdate.com",
        "github.com", "githubusercontent.com", "githubassets.com", "git.io", 
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
    // 4. 安全注入邏輯 (Universal Injection)
    // ----------------------------------------------------------------
    let body = $response.body;
    if (!body) { $done({}); return; }

    const startChars = body.substring(0, 20).trim();
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) {
        $done({});
        return;
    }

    const injection = `
<script>
(function() {
    const CONFIG = { spoofNative: true, debug: false, storageType: 'session' }; // Default to Session
    const STORAGE_KEY = 'FP_SHIELD_SEED';

    // 1. Session Persistence Seed
    let storageImpl;
    try {
        storageImpl = (CONFIG.storageType === 'local') ? localStorage : sessionStorage;
    } catch(e) { storageImpl = sessionStorage; }

    let rawSeed = '';
    try { rawSeed = storageImpl.getItem(STORAGE_KEY); } catch (e) {}
    if (!rawSeed) {
        rawSeed = (Math.floor(Math.random() * 1000000) + Date.now()).toString();
        try { storageImpl.setItem(STORAGE_KEY, rawSeed); } catch (e) {}
    }
    const SESSION_SEED = parseInt(rawSeed, 10);
    
    const pseudoRandom = (input) => {
        const x = Math.sin(input + SESSION_SEED) * 10000;
        return x - Math.floor(x);
    };
    
    const getStableNoise = (index, channelOffset) => {
        const val = pseudoRandom(index + channelOffset * 1000); 
        return Math.floor(val * 9) - 4; 
    };

    const GRID_OFFSET = Math.floor(pseudoRandom(999) * 500);
    const DENSITY = Math.floor(pseudoRandom(888) * 170) + 30;

    const applyNoiseToBuffer = (data, width, height) => {
        const len = data.length;
        const anchor1 = 0;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        const anchor2 = (centerY * width + centerX) * 4;
        const noiseVal = (SESSION_SEED % 11) + 1;

        if (len > 3) {
            data[anchor1] = (data[anchor1] + noiseVal) % 255; 
            data[anchor1 + 1] = (data[anchor1 + 1] + noiseVal) % 255; 
            data[anchor1 + 2] = (data[anchor1 + 2] + noiseVal) % 255;
            data[anchor1 + 3] = 254; 
        }
        if (anchor2 < len - 3) {
            data[anchor2] = (data[anchor2] + noiseVal) % 255;
            data[anchor2 + 3] = 254;
        }
        for (let i = 0; i < len; i += 4) {
            if (i === anchor1 || i === anchor2) continue;
            const pixelIndex = i / 4;
            if ((pixelIndex + GRID_OFFSET) % DENSITY === 0) { 
                data[i] = Math.min(255, Math.max(0, data[i] + getStableNoise(pixelIndex, 1)));
                data[i+1] = Math.min(255, Math.max(0, data[i+1] + getStableNoise(pixelIndex, 2)));
                data[i+2] = Math.min(255, Math.max(0, data[i+2] + getStableNoise(pixelIndex, 3)));
            }
        }
    };

    const GPU_POOL = [
        { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
        { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2' },
        { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 580 OpenGL Engine' },
        { vendor: 'Apple', renderer: 'Apple M1' }
    ];
    const SELECTED_GPU = GPU_POOL[Math.floor(pseudoRandom(42) * GPU_POOL.length)];

    const hookFunc = (proto, funcName, wrapper, winContext = window) => {
        if (!proto) return;
        const original = proto[funcName];
        if (!original) return;
        wrapper.prototype = original.prototype;
        if (CONFIG.spoofNative) {
            const originalToString = winContext.Function.prototype.toString;
            const toStringProxy = new Proxy(originalToString, {
                apply: (target, thisArg, args) => {
                    if (thisArg === wrapper) return originalToString.call(original);
                    return target.call(thisArg, ...args);
                }
            });
            wrapper.toString = toStringProxy;
        }
        try { Object.defineProperty(proto, funcName, { value: wrapper, configurable: true, enumerable: true, writable: true }); } 
        catch(e) { proto[funcName] = wrapper; }
    };

    const injectFingerprintProtection = (win) => {
        if (win._fp_shield_injected) return;
        win._fp_shield_injected = true;
        try {
            const CanvasProto = win.CanvasRenderingContext2D.prototype;
            const HtmlCanvasProto = win.HTMLCanvasElement.prototype;
            const WebGLProto = win.WebGLRenderingContext.prototype;
            const WebGL2Proto = win.WebGL2RenderingContext ? win.WebGL2RenderingContext.prototype : null;
            const AudioProto = win.AudioBuffer ? win.AudioBuffer.prototype : null;
            const originalGetImageData = CanvasProto.getImageData;
            const originalToDataURL = HtmlCanvasProto.toDataURL;
            const originalToBlob = HtmlCanvasProto.toBlob;

            hookFunc(CanvasProto, 'getImageData', function(x, y, w, h) {
                const imageData = originalGetImageData.apply(this, arguments);
                if (w < 50 && h < 50) return imageData; 
                applyNoiseToBuffer(imageData.data, w, h);
                return imageData;
            }, win);

            hookFunc(HtmlCanvasProto, 'toDataURL', function() {
                const w = this.width;
                const h = this.height;
                if (w < 50 && h < 50) return originalToDataURL.apply(this, arguments);
                try {
                    const shadowCanvas = win.document.createElement('canvas');
                    shadowCanvas.width = w;
                    shadowCanvas.height = h;
                    const shadowCtx = shadowCanvas.getContext('2d');
                    shadowCtx.drawImage(this, 0, 0);
                    const shadowImageData = originalGetImageData.call(shadowCtx, 0, 0, w, h);
                    applyNoiseToBuffer(shadowImageData.data, w, h);
                    shadowCtx.putImageData(shadowImageData, 0, 0);
                    return originalToDataURL.apply(shadowCanvas, arguments);
                } catch (e) { return originalToDataURL.apply(this, arguments); }
            }, win);

            hookFunc(HtmlCanvasProto, 'toBlob', function(callback, type, quality) {
                const w = this.width;
                const h = this.height;
                if (w < 50 && h < 50) return originalToBlob.apply(this, arguments);
                try {
                    const shadowCanvas = win.document.createElement('canvas');
                    shadowCanvas.width = w;
                    shadowCanvas.height = h;
                    const shadowCtx = shadowCanvas.getContext('2d');
                    shadowCtx.drawImage(this, 0, 0);
                    const shadowImageData = originalGetImageData.call(shadowCtx, 0, 0, w, h);
                    applyNoiseToBuffer(shadowImageData.data, w, h);
                    shadowCtx.putImageData(shadowImageData, 0, 0);
                    return originalToBlob.call(shadowCanvas, callback, type, quality);
                } catch (e) { return originalToBlob.apply(this, arguments); }
            }, win);

            const hookWebGL = (proto) => {
                hookFunc(proto, 'getParameter', function(parameter) {
                    if (parameter === 37445) return SELECTED_GPU.vendor; 
                    if (parameter === 37446) return SELECTED_GPU.renderer; 
                    return proto.getParameter.apply(this, arguments);
                }, win);
                const originalReadPixels = proto.readPixels;
                hookFunc(proto, 'readPixels', function(x, y, width, height, format, type, pixels) {
                    const result = originalReadPixels.apply(this, arguments);
                    if (pixels && pixels instanceof Uint8Array && width > 50 && height > 50) {
                        applyNoiseToBuffer(pixels, width, height);
                    }
                    return result;
                }, win);
            };
            if (WebGLProto) hookWebGL(WebGLProto);
            if (WebGL2Proto) hookWebGL(WebGL2Proto);

            if (AudioProto) {
                const originalGetChannelData = AudioProto.getChannelData;
                hookFunc(AudioProto, 'getChannelData', function(channel) {
                    const results = originalGetChannelData.apply(this, arguments);
                    for (let i = 0; i < results.length; i += 100) results[i] += (pseudoRandom(i) * 0.00001); 
                    return results;
                }, win);
            }
        } catch(e) {}
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes) {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IFRAME') {
                        try {
                            if (node.contentWindow) injectFingerprintProtection(node.contentWindow);
                            node.addEventListener('load', () => {
                                if (node.contentWindow) injectFingerprintProtection(node.contentWindow);
                            });
                        } catch (e) {}
                    }
                });
            }
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const iframeDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (iframeDescriptor && iframeDescriptor.get) {
        const originalGetter = iframeDescriptor.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
            get: function() {
                const win = originalGetter.call(this);
                if (win) injectFingerprintProtection(win);
                return win;
            },
            enumerable: iframeDescriptor.enumerable,
            configurable: iframeDescriptor.configurable
        });
    }

    injectFingerprintProtection(window);

    // --- Floating Badge (Simple UI) ---
    setTimeout(() => {
        const debugBadge = document.createElement('div');
        debugBadge.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:2147483647; background:rgba(0,100,0,0.9); color:white; padding:5px 10px; border-radius:4px; font-size:12px; font-family:sans-serif; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); transition: opacity 0.5s;";
        debugBadge.textContent = "🛡️ FP-Shield v1.36 Active";
        document.documentElement.appendChild(debugBadge);
        
        // Auto fade out
        setTimeout(() => { 
            debugBadge.style.opacity = '0'; 
            setTimeout(() => debugBadge.remove(), 500); 
        }, 3000);
    }, 500);

    console.log("%c[FP-Defender] v1.36 Active", "color: #00ff00; background: #000; padding: 4px;");
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
