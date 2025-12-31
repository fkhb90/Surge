/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.20 (CreepJS Stealth Mode)
 * @description [v1.20] 同步 Tampermonkey 版邏輯。引入「原生函數偽裝」與「穩定噪聲算法」，修復 CreepJS Lies 檢測；保留 GitHub/Shopee/LINE 白名單。
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

    // 檢查 WebSocket 升級請求
    if (normalizedHeaders['upgrade'] === 'websocket') {
        $done({});
        return;
    }

    // 檢查內容長度：避免處理過大檔案
    const contentLength = parseInt(normalizedHeaders['content-length'] || '0');
    if (contentLength > 2000000) { // 2MB 閾值
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 1. 原子級標頭防護 (Atomic Header Guard)
    // ----------------------------------------------------------------
    const contentType = normalizedHeaders['content-type'] || '';
    
    // [嚴格判定] 僅允許純 HTML 內容
    if (contentType && !contentType.includes('text/html')) {
        $done({});
        return;
    }

    // ----------------------------------------------------------------
    // 2. User-Agent 深度檢測 (歸一化處理)
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
    // 3. 網域白名單 (Domain Allowlist) - v1.20 繼承 v1.19
    // ----------------------------------------------------------------
    const url = $request.url;
    const match = url.match(/^https?:\/\/([^/:]+)/i);
    const hostname = match ? match[1].toLowerCase() : '';
    
    const excludedDomains = [
        // E-Commerce (Shopee)
        "shopee.tw", "shopee.com", "shopeemobile.com", "susercontent.com", 
        "shopee.ph", "shopee.my", "shopee.sg", "shopee.th", "shopee.co.id", "shopee.vn",
        
        // LINE Ecosystem
        "line-apps.com", "line.me", "naver.jp", "line-scdn.net", "nhncorp.jp", "line-cdn.net",
        "obs.line-scdn.net", "profile.line-scdn.net", "lcs.naver.com", "worksmobile.com",
        "line-apps-beta.com", "linetv.tw",
        
        // Messaging & VoIP
        "whatsapp.net", "whatsapp.com", "telegram.org", "messenger.com", "skype.com",
        
        // System & Cloud
        "googleapis.com", "gstatic.com", "google.com", "apple.com", "icloud.com", 
        "microsoft.com", "windowsupdate.com", "azure.com", "crashlytics.com",
        
        // Developer Tools (GitHub)
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
    // 4. 安全注入邏輯 (Stealth Injection) - v1.20 核心升級
    // ----------------------------------------------------------------
    let body = $response.body;
    if (!body) {
        $done({});
        return;
    }

    const startChars = body.substring(0, 20).trim();
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) {
        $done({});
        return;
    }

    // 注入代碼：包含原生偽裝與穩定噪聲
    const injection = `
<script>
(function() {
    // --- 核心配置 ---
    const CONFIG = {
        noiseIntensity: 2, 
        spoofNative: true
    };

    // 1. 穩定隨機數生成器 (Seeded Random)
    const SESSION_SEED = Math.floor(Math.random() * 10000);
    const pseudoRandom = (input) => {
        const x = Math.sin(input + SESSION_SEED) * 10000;
        return x - Math.floor(x);
    };
    const getStableNoise = (index) => Math.floor(pseudoRandom(index) * 5) - 2;

    // 2. 原生代碼偽裝 (Native Code Spoofing)
    const originalToString = Function.prototype.toString;
    const hookedFunctions = new WeakMap();

    if (CONFIG.spoofNative) {
        const toStringProxy = new Proxy(originalToString, {
            apply: function(target, thisArg, args) {
                if (thisArg && hookedFunctions.has(thisArg)) {
                    return target.call(hookedFunctions.get(thisArg), ...args);
                }
                return target.call(thisArg, ...args);
            }
        });
        Function.prototype.toString = toStringProxy;
        hookedFunctions.set(toStringProxy, originalToString);
    }

    function hookFunc(proto, funcName, wrapper) {
        if (!proto) return;
        const original = proto[funcName];
        if (!original) return;

        wrapper.prototype = original.prototype;
        if (CONFIG.spoofNative) {
            hookedFunctions.set(wrapper, original);
        }

        try {
            Object.defineProperty(proto, funcName, {
                value: wrapper,
                configurable: true,
                enumerable: true,
                writable: true
            });
        } catch(e) {
            proto[funcName] = wrapper;
        }
    }

    // 顯示隱形浮標 (僅 console 輸出，減少視覺干擾)
    console.log("%c[FP-Defender] v1.20 (Stealth) Active", "color: #00ff00; background: #000; padding: 4px;");

    try {
        // --- 3. Canvas Fingerprinting (Stable Noise) ---
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        hookFunc(CanvasRenderingContext2D.prototype, 'getImageData', function(x, y, w, h) {
            const imageData = originalGetImageData.apply(this, arguments);
            if (w < 50 && h < 50) return imageData; 
            
            const { data } = imageData;
            for (let i = 0; i < data.length; i += 4) {
                if (i % 200 === 0) { 
                    const n = getStableNoise(i);
                    data[i] = Math.min(255, Math.max(0, data[i] + n));
                    data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
                    data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
                }
            }
            return imageData;
        });

        // v1.20: 不再 Hook toDataURL 以避免視覺差異被檢測為 Lies
        // 我們依賴 getImageData 的數據噪聲進行防護

        // --- 4. WebGL Fingerprinting ---
        hookFunc(WebGLRenderingContext.prototype, 'getParameter', function(parameter) {
            if (parameter === 37445) return 'Intel Inc.'; 
            if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
            return WebGLRenderingContext.prototype.getParameter.apply(this, arguments);
        });

        if (typeof WebGL2RenderingContext !== 'undefined') {
            hookFunc(WebGL2RenderingContext.prototype, 'getParameter', function(parameter) {
                if (parameter === 37445) return 'Intel Inc.'; 
                if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
                return WebGL2RenderingContext.prototype.getParameter.apply(this, arguments);
            });
        }

        // --- 5. AudioContext Fingerprinting ---
        if (window.AudioBuffer && window.AudioBuffer.prototype) {
            const originalGetChannelData = window.AudioBuffer.prototype.getChannelData;
            hookFunc(window.AudioBuffer.prototype, 'getChannelData', function(channel) {
                const results = originalGetChannelData.apply(this, arguments);
                for (let i = 0; i < 100 && i < results.length; i += 10) {
                    results[i] += (pseudoRandom(i) * 0.00001); 
                }
                return results;
            });
        }
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
