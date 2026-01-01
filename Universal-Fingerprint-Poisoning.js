/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.00 (Enterprise Defense & Observability)
 * @description [v2.00] 里程碑更新：記憶體池優化、字型/音訊/螢幕/電池深度防禦、可觀測性儀表板與 Proxy 安全強化。
 * @note      [CRITICAL] 請務必配合 Surge 設定檔中的正則排除規則使用，以確保 0 延遲體驗。
 * @author    Claude & Gemini
 */

(function() {
    // ============================================================================
    // 0. 全局靜態常數與預編譯正則 (Pre-compiled Regex & Constants)
    // ============================================================================
    const CONST = {
        MAX_SIZE: 3000000, // 3MB
        TIMEOUT_BADGE: 3000,
        KEY_SEED: 'FP_SHIELD_SEED_V2'
    };

    const REGEX = {
        URL_PROTO: /^https?:\/\/([^/:]+)/i,
        CONTENT_TYPE: /text\/html/i,
        HEAD_TAG: /<head>/i,
        HTML_TAG: /<html[^>]*>/i,
        IOS_UA: /iPad|iPhone|iPod/,
        KNOWN_BOTS: /bot|crawler|spider|googlebot|bingbot/i,
        APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i
    };

    // ============================================================================
    // 1. 請求前置快篩 (Pre-flight Checks)
    // ============================================================================
    const $res = $response;
    const $req = $request;

    // 狀態碼與協議快篩
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }

    const headers = $res.headers;
    // 標頭正規化 (一次性處理)
    const normalizedHeaders = Object.keys(headers).reduce((acc, key) => {
        acc[key.toLowerCase()] = headers[key];
        return acc;
    }, {});

    if (normalizedHeaders['upgrade'] === 'websocket') { $done({}); return; }
    
    const len = parseInt(normalizedHeaders['content-length'] || '0');
    if (len > CONST.MAX_SIZE) { $done({}); return; }

    const cType = normalizedHeaders['content-type'] || '';
    if (cType && !REGEX.CONTENT_TYPE.test(cType)) { $done({}); return; }

    // ============================================================================
    // 2. 智慧白名單系統 (Smart Whitelist - O(1))
    // ============================================================================
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const currentUA = (uaRaw || '').toLowerCase();

    // 2.1 Bot & App 避讓
    if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

    // 2.2 網域過濾
    const match = $req.url.match(REGEX.URL_PROTO);
    const hostname = match ? match[1].toLowerCase() : '';

    // Set 結構 (O(1) 查找)
    const WHITELIST_EXACT = new Set([
        "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
        "pplx-next-static-public.perplexity.ai", "private-us-east-1.monica.im", "api.felo.ai",
        "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
        "api.line.me", "api.discord.com", "api.twitch.tv", "nowsecure.nl", "webglreport.com",
        "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
        "cdn.ghostery.com", "raw.githubusercontent.com", "code.createjs.com"
    ]);

    const WHITELIST_SUFFIX = [
        "gov.tw", "org.tw", "edu.tw", "bank", "pay.taipei", "bot.com.tw", "cathaybk.com.tw", "ctbcbank.com", 
        "esunbank.com.tw", "fubon.com", "richart.tw", "taishinbank.com.tw", "apple.com", "microsoft.com", 
        "aws.amazon.com", "shopee.tw", "shopee.com", "jkos.com", "ecpay.com.tw"
    ];

    if (hostname) {
        if (WHITELIST_EXACT.has(hostname)) { $done({}); return; }
        for (let i = 0, l = WHITELIST_SUFFIX.length; i < l; i++) {
            if (hostname.endsWith(WHITELIST_SUFFIX[i])) { $done({}); return; }
        }
    }

    // ============================================================================
    // 3. 安全注入核心 (Injection Core)
    // ============================================================================
    let body = $res.body;
    if (!body) { $done({}); return; }

    const startChars = body.substring(0, 20).trim();
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) {
        $done({}); return;
    }

    // CSP 移除與增強
    const cspKeys = [
        'Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 
        'x-content-security-policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'
    ];
    cspKeys.forEach(k => delete headers[k]);

    const injection = `
<script>
(function() {
    "use strict"; // 啟用嚴格模式

    // --- Module: Configuration & Observability ---
    const CONFIG = {
        ver: '2.00',
        debug: false,
        spoofNative: true,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        telemetry: true // 開啟內部計量
    };

    // 可觀測性儀表板 (開發者模式可調用 window.__FP_METRICS__)
    const Metrics = {
        injections: { canvas: 0, audio: 0, font: 0, screen: 0, webgl: 0 },
        errors: [],
        perf: { initTime: performance.now(), hookTime: 0 },
        logHook: (type) => { if(CONFIG.telemetry) Metrics.injections[type]++; },
        logError: (e) => { if(CONFIG.telemetry && Metrics.errors.length < 50) Metrics.errors.push(e.message); }
    };
    window.__FP_METRICS__ = Metrics; // 暴露給開發者

    // --- Module: Memory Pool (Performance) ---
    // 重用 Canvas 實例以減少 GC 壓力
    const CanvasPool = (() => {
        let _shadowCanvas = null;
        let _shadowCtx = null;
        return {
            get: (w, h) => {
                if (!_shadowCanvas) {
                    _shadowCanvas = document.createElement('canvas');
                    _shadowCtx = _shadowCanvas.getContext('2d', { willReadFrequently: true });
                }
                // 僅當尺寸變大時調整，避免頻繁 resize
                if (_shadowCanvas.width < w) _shadowCanvas.width = w;
                if (_shadowCanvas.height < h) _shadowCanvas.height = h;
                return { canvas: _shadowCanvas, ctx: _shadowCtx };
            }
        };
    })();

    // --- Module: Secure Seed ---
    const Seed = (() => {
        const KEY = 'FP_SHIELD_SEED_V2';
        let store;
        try { store = sessionStorage; } catch(e) { store = {}; } // Fallback to memory
        
        let val = store.getItem ? store.getItem(KEY) : store[KEY];
        if (!val) {
            val = (Math.floor(Math.random() * 1e9) + Date.now()).toString();
            try { store.setItem ? store.setItem(KEY, val) : (store[KEY] = val); } catch(e) {}
        }
        return parseInt(val, 10);
    })();

    // --- Module: Advanced Noise Engine ---
    const Noise = (() => {
        const seed = Seed;
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0; // iOS 極致優化
        
        // Fast Pseudo Random
        const rand = (i) => {
            const x = Math.sin(i + seed) * 10000;
            return x - Math.floor(x);
        };

        return {
            // 時序攻擊防護：隨機微延遲 (僅用於 Async 操作)
            jitter: () => {
                // 為避免主線程卡頓，此版本僅返回計算出的隨機值供邏輯使用，不執行 busy-wait
                return rand(performance.now()) * 0.5; 
            },
            pixel: (data, w, h) => {
                const len = data.length;
                if (len < 4) return;
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                
                // 批次處理：減少迴圈判斷
                for (let i = 0; i < len; i += 4) {
                    const pIdx = i >> 2; // Bit shift division
                    if ((pIdx + offset) % density === 0) {
                        data[i] = Math.max(0, Math.min(255, data[i] + (rand(pIdx) > 0.5 ? 1 : -1)));
                        // 僅修改 R 通道以最小化視覺差異，但破壞 Hash
                    }
                }
            },
            audio: (data) => {
                // 時域雜訊
                for (let i = 0; i < data.length; i += 100) {
                    data[i] += (rand(i) * 1e-5); 
                }
            },
            font: (width) => {
                // 字型度量混淆：微調寬度 (0.01px 級別)
                return width + (rand(width) * 0.04 - 0.02);
            }
        };
    })();

    // --- Module: Proxy Guard (Security) ---
    // 深度偽裝，防止 toString 洩漏與 Proxy 檢測
    const ProxyGuard = {
        protect: (nativeFunc, customFunc) => {
            if (!CONFIG.spoofNative) return customFunc;
            
            // 使用 Symbol 標記已注入，避免重複 Hook
            const HOOK_MARK = Symbol.for('FP_HOOKED');
            if (nativeFunc[HOOK_MARK]) return nativeFunc;

            const nativeStr = Function.prototype.toString.call(nativeFunc);
            
            const p = new Proxy(customFunc, {
                apply: (target, thisArg, args) => {
                    Metrics.logHook('func_call');
                    return Reflect.apply(target, thisArg, args);
                },
                get: (target, prop) => {
                    if (prop === 'toString') return () => nativeStr;
                    // 隱藏 Symbol 標記
                    if (prop === HOOK_MARK) return true;
                    return Reflect.get(target, prop);
                }
            });
            
            // 嘗試隱藏 Proxy 特徵
            try {
                Object.defineProperty(p, 'name', { value: nativeFunc.name });
                Object.defineProperty(p, 'length', { value: nativeFunc.length });
            } catch(e) {}
            
            return p;
        },
        override: (obj, prop, factory) => {
            if (!obj || !obj[prop]) return;
            const original = obj[prop];
            const safeFunc = factory(original);
            const protectedFunc = ProxyGuard.protect(original, safeFunc);
            
            // 原型鏈保持
            protectedFunc.prototype = original.prototype;
            
            try {
                // 使用 defineProperty 處理 non-writable 但 configurable 的屬性
                Object.defineProperty(obj, prop, {
                    value: protectedFunc,
                    writable: true, enumerable: true, configurable: true
                });
            } catch(e) {
                Metrics.logError(e);
                try { obj[prop] = protectedFunc; } catch(e2) {}
            }
        }
    };

    // --- Module: Feature Injectors (Lazy Loaded) ---
    const Modules = {
        // 1. Canvas & OffscreenCanvas
        canvas: (win) => {
            const handleGetImageData = (original) => function(x, y, w, h) {
                const res = original.apply(this, arguments);
                if (w < 16 || h < 16) return res; // 忽略小圖示
                Metrics.logHook('canvas');
                Noise.pixel(res.data, w, h);
                return res;
            };

            const handleToDataURL = (original) => function() {
                const w = this.width, h = this.height;
                if (w < 16 || h < 16) return original.apply(this, arguments);
                
                try {
                    const { canvas, ctx } = CanvasPool.get(w, h);
                    ctx.clearRect(0, 0, w, h);
                    ctx.drawImage(this, 0, 0);
                    const iData = ctx.getImageData(0, 0, w, h);
                    Noise.pixel(iData.data, w, h);
                    ctx.putImageData(iData, 0, 0);
                    return canvas.toDataURL.apply(canvas, arguments);
                } catch(e) { return original.apply(this, arguments); }
            };

            // 針對多種 Context 原型進行 Hook
            const contexts = [
                win.CanvasRenderingContext2D, 
                win.OffscreenCanvasRenderingContext2D
            ];
            
            contexts.forEach(ctx => {
                if (ctx && ctx.prototype) {
                    ProxyGuard.override(ctx.prototype, 'getImageData', handleGetImageData);
                    // [New] Font Fingerprinting Defense
                    ProxyGuard.override(ctx.prototype, 'measureText', (orig) => function(text) {
                        const metrics = orig.apply(this, arguments);
                        Metrics.logHook('font');
                        // 攔截 width 屬性讀取
                        let _width = metrics.width;
                        try {
                            Object.defineProperty(metrics, 'width', {
                                get: () => Noise.font(_width)
                            });
                        } catch(e) { return metrics; } // Fallback
                        return metrics;
                    });
                }
            });

            if (win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', handleToDataURL);
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', (orig) => function() {
                     // toBlob 邏輯類似 toDataURL，此處省略以節省字節，但概念相同
                     return orig.apply(this, arguments);
                });
            }
        },

        // 2. Audio (Advanced)
        audio: (win) => {
            const AC = win.AudioContext || win.webkitAudioContext;
            const AB = win.AudioBuffer;
            
            if (AC && AC.prototype) {
                // 針對 AnalyserNode 的頻域數據進行擾動
                ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig) => function(array) {
                    const res = orig.apply(this, arguments);
                    Metrics.logHook('audio');
                    for(let i=0; i<array.length; i+=10) array[i] += (Noise.jitter() * 0.1);
                    return res;
                });
            }

            if (AB && AB.prototype) {
                ProxyGuard.override(AB.prototype, 'getChannelData', (orig) => function(ch) {
                    const data = orig.apply(this, arguments);
                    Metrics.logHook('audio');
                    Noise.audio(data);
                    return data;
                });
            }
        },

        // 3. WebGL
        webgl: (win) => {
            const types = [win.WebGLRenderingContext, win.WebGL2RenderingContext];
            types.forEach(type => {
                if(!type) return;
                ProxyGuard.override(type.prototype, 'readPixels', (orig) => function(x,y,w,h,f,t,pixels) {
                    const res = orig.apply(this, arguments);
                    if (pixels && w > 16 && h > 16) {
                        Metrics.logHook('webgl');
                        Noise.pixel(pixels, w, h);
                    }
                    return res;
                });
                
                // Parameter Spoofing (iOS Skip)
                if (!CONFIG.isIOS) {
                    ProxyGuard.override(type.prototype, 'getParameter', (orig) => function(p) {
                        // UNMASKED_VENDOR_WEBGL = 37445
                        // UNMASKED_RENDERER_WEBGL = 37446
                        if (p === 37445) return 'Intel Inc.';
                        if (p === 37446) return 'Intel Iris OpenGL Engine';
                        return orig.apply(this, arguments);
                    });
                }
            });
        },

        // 4. Screen & Battery (New in v2.00)
        hardware: (win) => {
            // [New] Screen Fingerprinting
            if (win.screen && !CONFIG.isIOS) { // iOS screen properties are immutable
                try {
                    const s = win.screen;
                    // 隨機微調 colorDepth 以破壞指紋
                    const fakeDepth = Seed % 2 === 0 ? 24 : 32;
                    Object.defineProperty(s, 'colorDepth', { get: () => fakeDepth });
                    Object.defineProperty(s, 'pixelDepth', { get: () => fakeDepth });
                    Metrics.logHook('screen');
                } catch(e) {}
            }

            // [New] Battery API Blocking (Privacy)
            if (win.navigator && 'getBattery' in win.navigator) {
                try {
                    win.navigator.getBattery = () => Promise.resolve({
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 1,
                        onchargingchange: null,
                        onlevelchange: null,
                        addEventListener: () => {}
                    });
                } catch(e) {}
            }
            
            // [New] Topics API Block
            if (win.document && 'browsingTopics' in win.document) {
                win.document.browsingTopics = () => Promise.resolve([]);
            }
        }
    };

    // --- Main Injector Logic ---
    const inject = (win) => {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });

            // 惰性載入模組 (Lazy Initialization)
            // 使用 requestIdleCallback 在瀏覽器空閒時執行非關鍵防護，
            // 但 Canvas 等核心防護需立即執行以防 Race Condition
            
            Modules.canvas(win); // Critical
            Modules.webgl(win);  // Critical
            
            // Non-critical modules
            const lazyLoad = () => {
                Modules.audio(win);
                Modules.hardware(win);
            };

            if (win.requestIdleCallback) win.requestIdleCallback(lazyLoad);
            else setTimeout(lazyLoad, 0);

        } catch(e) { Metrics.logError(e); }
    };

    // --- Iframe & Document Observer ---
    const init = () => {
        inject(window);

        // 使用 MutationObserver 監控動態 Iframe
        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (n.tagName === 'IFRAME') {
                        // 跨域 Iframe 偵測：嘗試訪問 contentWindow，若報錯則代表跨域，忽略之
                        try {
                            if (n.contentWindow) inject(n.contentWindow);
                            n.addEventListener('load', () => {
                                try { inject(n.contentWindow); } catch(e){}
                            });
                        } catch(e) {} // CORS Blocked
                    }
                }
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    };

    // --- Boot ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // --- UI: Debug Badge (Optional) ---
    setTimeout(() => {
        if (!CONFIG.debug) return;
        const b = document.createElement('div');
        b.style.cssText = "position:fixed;bottom:5px;left:5px;z-index:999999;background:#000;color:#0f0;padding:2px 5px;font-size:10px;pointer-events:none;opacity:0.7;";
        b.innerText = "FPv2";
        document.body.appendChild(b);
    }, 1000);

    Metrics.perf.hookTime = performance.now() - Metrics.perf.initTime;
})();
</script>
`;

    // 注入 HTML
    if (REGEX.HEAD_TAG.test(body)) {
        body = body.replace(REGEX.HEAD_TAG, match => match + injection);
    } else if (REGEX.HTML_TAG.test(body)) {
        body = body.replace(REGEX.HTML_TAG, match => match + injection);
    }
    
    $done({ body, headers });
})();

