/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.01 (Visual Feedback Restored)
 * @description [v2.01] 修復 UI 徽章顯示邏輯，預設開啟啟動通知；繼承 v2.00 所有深度防禦核心 (Audio/Font/Screen/Battery)。
 * @note      [CRITICAL] 白名單網站 (如 Google/YouTube/銀行) 不會顯示盾牌，此為正常現象 (0 延遲策略)。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

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
    "use strict";

    // --- Module: Configuration & Observability ---
    const CONFIG = {
        ver: '2.01',
        debug: false,
        showBadge: true, // [Fix] 強制顯示啟動徽章
        spoofNative: true,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        telemetry: true
    };

    const Metrics = {
        injections: { canvas: 0, audio: 0, font: 0, screen: 0, webgl: 0 },
        errors: [],
        perf: { initTime: performance.now(), hookTime: 0 },
        logHook: (type) => { if(CONFIG.telemetry) Metrics.injections[type]++; },
        logError: (e) => { if(CONFIG.telemetry && Metrics.errors.length < 50) Metrics.errors.push(e.message); }
    };
    window.__FP_METRICS__ = Metrics;

    // --- Module: Memory Pool ---
    const CanvasPool = (() => {
        let _shadowCanvas = null;
        let _shadowCtx = null;
        return {
            get: (w, h) => {
                if (!_shadowCanvas) {
                    _shadowCanvas = document.createElement('canvas');
                    _shadowCtx = _shadowCanvas.getContext('2d', { willReadFrequently: true });
                }
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
        try { store = sessionStorage; } catch(e) { store = {}; }
        
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
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0;
        
        const rand = (i) => {
            const x = Math.sin(i + seed) * 10000;
            return x - Math.floor(x);
        };

        return {
            jitter: () => rand(performance.now()) * 0.5,
            pixel: (data, w, h) => {
                const len = data.length;
                if (len < 4) return;
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                
                for (let i = 0; i < len; i += 4) {
                    const pIdx = i >> 2;
                    if ((pIdx + offset) % density === 0) {
                        data[i] = Math.max(0, Math.min(255, data[i] + (rand(pIdx) > 0.5 ? 1 : -1)));
                    }
                }
            },
            audio: (data) => {
                for (let i = 0; i < data.length; i += 100) data[i] += (rand(i) * 1e-5); 
            },
            font: (width) => width + (rand(width) * 0.04 - 0.02)
        };
    })();

    // --- Module: Proxy Guard ---
    const ProxyGuard = {
        protect: (nativeFunc, customFunc) => {
            if (!CONFIG.spoofNative) return customFunc;
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
                    if (prop === HOOK_MARK) return true;
                    return Reflect.get(target, prop);
                }
            });
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
            protectedFunc.prototype = original.prototype;
            try {
                Object.defineProperty(obj, prop, {
                    value: protectedFunc,
                    writable: true, enumerable: true, configurable: true
                });
            } catch(e) { try { obj[prop] = protectedFunc; } catch(e2) {} }
        }
    };

    // --- Module: Feature Injectors ---
    const Modules = {
        canvas: (win) => {
            const handleGetImageData = (original) => function(x, y, w, h) {
                const res = original.apply(this, arguments);
                if (w < 16 || h < 16) return res;
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

            const contexts = [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D];
            contexts.forEach(ctx => {
                if (ctx && ctx.prototype) {
                    ProxyGuard.override(ctx.prototype, 'getImageData', handleGetImageData);
                    ProxyGuard.override(ctx.prototype, 'measureText', (orig) => function(text) {
                        const metrics = orig.apply(this, arguments);
                        Metrics.logHook('font');
                        let _width = metrics.width;
                        try {
                            Object.defineProperty(metrics, 'width', { get: () => Noise.font(_width) });
                        } catch(e) { return metrics; }
                        return metrics;
                    });
                }
            });

            if (win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', handleToDataURL);
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', (orig) => function() { return orig.apply(this, arguments); });
            }
        },

        audio: (win) => {
            const AC = win.AudioContext || win.webkitAudioContext;
            const AB = win.AudioBuffer;
            if (AC && AC.prototype) {
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

        webgl: (win) => {
            const types = [win.WebGLRenderingContext, win.WebGL2RenderingContext];
            types.forEach(type => {
                if(!type) return;
                ProxyGuard.override(type.prototype, 'readPixels', (orig) => function(x,y,w,h,f,t,pixels) {
                    const res = orig.apply(this, arguments);
                    if (pixels && w > 16 && h > 16) { Metrics.logHook('webgl'); Noise.pixel(pixels, w, h); }
                    return res;
                });
                
                if (!CONFIG.isIOS) {
                    ProxyGuard.override(type.prototype, 'getParameter', (orig) => function(p) {
                        if (p === 37445) return 'Intel Inc.';
                        if (p === 37446) return 'Intel Iris OpenGL Engine';
                        return orig.apply(this, arguments);
                    });
                }
            });
        },

        hardware: (win) => {
            if (win.screen && !CONFIG.isIOS) {
                try {
                    const s = win.screen;
                    const fakeDepth = Seed % 2 === 0 ? 24 : 32;
                    Object.defineProperty(s, 'colorDepth', { get: () => fakeDepth });
                    Object.defineProperty(s, 'pixelDepth', { get: () => fakeDepth });
                    Metrics.logHook('screen');
                } catch(e) {}
            }

            if (win.navigator && 'getBattery' in win.navigator) {
                try {
                    win.navigator.getBattery = () => Promise.resolve({
                        charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1,
                        onchargingchange: null, onlevelchange: null, addEventListener: () => {}
                    });
                } catch(e) {}
            }
            
            if (win.document && 'browsingTopics' in win.document) {
                win.document.browsingTopics = () => Promise.resolve([]);
            }
        }
    };

    // --- Main Injector ---
    const inject = (win) => {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });
            
            Modules.canvas(win);
            Modules.webgl(win);
            
            const lazyLoad = () => {
                Modules.audio(win);
                Modules.hardware(win);
            };
            if (win.requestIdleCallback) win.requestIdleCallback(lazyLoad);
            else setTimeout(lazyLoad, 0);

        } catch(e) {}
    };

    const init = () => {
        inject(window);
        const obs = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const n of m.addedNodes) {
                    if (n.tagName === 'IFRAME') {
                        try {
                            if (n.contentWindow) inject(n.contentWindow);
                            n.addEventListener('load', () => { try { inject(n.contentWindow); } catch(e){} });
                        } catch(e) {}
                    }
                }
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // --- UI: Startup Badge (Restored in v2.01) ---
    if (CONFIG.showBadge) {
        setTimeout(() => {
            const b = document.createElement('div');
            // 使用綠色背景以符合「綠色盾牌」印象
            b.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:2147483647; background:rgba(0,100,0,0.9); color:white; padding:6px 12px; border-radius:6px; font-size:12px; font-family:-apple-system, BlinkMacSystemFont, sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); pointer-events:none; opacity:0; transition: opacity 0.5s ease-in-out; display:flex; align-items:center; gap:5px;";
            b.innerHTML = "<span>🛡️</span> <span>FP v2.01 Active</span>";
            document.documentElement.appendChild(b);

            // Animation
            requestAnimationFrame(() => b.style.opacity = '1');
            setTimeout(() => { 
                b.style.opacity = '0'; 
                setTimeout(() => b.remove(), 500); 
            }, 3000);
        }, 500);
    }

    Metrics.perf.hookTime = performance.now() - Metrics.perf.initTime;
})();
</script>
`;

    if (REGEX.HEAD_TAG.test(body)) {
        body = body.replace(REGEX.HEAD_TAG, match => match + injection);
    } else if (REGEX.HTML_TAG.test(body)) {
        body = body.replace(REGEX.HTML_TAG, match => match + injection);
    }
    
    $done({ body, headers });
})();

