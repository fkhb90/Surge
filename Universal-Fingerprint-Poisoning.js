/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.11 (Enhanced Edition)
 * @description [v2.11] 基於 v2.10；修復時區GMT格式化錯誤；新增完整Date方法覆蓋；新增Performance/MediaDevices防護；優化錯誤處理與代理保護
 * @author    Claude & Gemini (Enhanced by Claude Sonnet 4.5)
 */

(function() {
    "use strict";

    // ============================================================================
    // 0. 全局設定
    // ============================================================================
    const CONST = {
        MAX_SIZE: 5000000,
        KEY_SEED: 'FP_SHIELD_SEED_V2',
        MAX_POOL_SIZE: 3,
        MAX_POOL_DIM: 1024 * 1024,
        MAX_ERROR_LOGS: 50,
        CSP_CHECK_LENGTH: 3000,
        FAKE_CORES: 4,
        RECT_NOISE_RATE: 0.0001
    };

    const REGEX = {
        URL_PROTO: /^https?:\/\/([^\/:]+)/i,
        CONTENT_TYPE: /text\/html/i,
        HEAD_TAG: /<head>/i,
        HTML_TAG: /<html[^>]*>/i,
        META_CSP: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
        APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
        JSON_START: /^\s*[\{\[]/
    };

    const $res = $response;
    const $req = $request;

    // ============================================================================
    // 1. 基礎過濾
    // ============================================================================
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }
    
    const headers = $res.headers;
    const normalizedHeaders = Object.keys(headers).reduce((acc, key) => {
        acc[key.toLowerCase()] = headers[key];
        return acc;
    }, {});

    if (normalizedHeaders['upgrade'] === 'websocket') { $done({}); return; }
    
    const contentLength = parseInt(normalizedHeaders['content-length'] || '0');
    if (contentLength > CONST.MAX_SIZE) { $done({}); return; }

    const cType = normalizedHeaders['content-type'] || '';
    if (cType && !REGEX.CONTENT_TYPE.test(cType)) { $done({}); return; }

    // ============================================================================
    // 2. 白名單管理
    // ============================================================================
    const WhitelistManager = (() => {
        const DEFAULT_WHITELIST = {
            version: '3.4',
            exact: [
                "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
                "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
                "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com",
                "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
                "cdn.ghostery.com", "browserleaks.com"
            ],
            patterns: [
                { suffix: "gov.tw", priority: 1 }, { suffix: "org.tw", priority: 1 }, { suffix: "edu.tw", priority: 1 },
                { suffix: "apple.com", priority: 1 }, { suffix: "microsoft.com", priority: 1 }, { suffix: "aws.amazon.com", priority: 1 },
                { suffix: "bank", priority: 2 }, { suffix: "pay.taipei", priority: 2 }, { suffix: "bot.com.tw", priority: 2 },
                { suffix: "cathaybk.com.tw", priority: 2 }, { suffix: "ctbcbank.com", priority: 2 }, { suffix: "esunbank.com.tw", priority: 2 },
                { suffix: "fubon.com", priority: 2 }, { suffix: "richart.tw", priority: 2 }, { suffix: "taishinbank.com.tw", priority: 2 },
                { suffix: "jkos.com", priority: 2 }, { suffix: "ecpay.com.tw", priority: 2 },
                { suffix: "shopee.tw", priority: 3 }, { suffix: "shopee.com", priority: 3 }
            ]
        };

        const exactSet = new Set(DEFAULT_WHITELIST.exact);
        const patternsSorted = DEFAULT_WHITELIST.patterns.sort((a, b) => a.priority - b.priority);
        
        return {
            check: (hostname) => {
                if (!hostname) return false;
                if (exactSet.has(hostname)) return true;
                for (let i = 0; i < patternsSorted.length; i++) {
                    if (hostname.endsWith(patternsSorted[i].suffix)) return true;
                }
                return false;
            }
        };
    })();

    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const currentUA = (uaRaw || '').toLowerCase();
    if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

    const match = $req.url.match(REGEX.URL_PROTO);
    const hostname = match ? match[1].toLowerCase() : '';
    const isWhitelisted = WhitelistManager.check(hostname);

    // ============================================================================
    // 3. Body 處理
    // ============================================================================
    let body = $res.body;
    if (!body) { $done({}); return; }

    const startChars = body.substring(0, 50).trim();
    if (REGEX.JSON_START.test(startChars)) { $done({}); return; }

    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    const headChunk = body.substring(0, CONST.CSP_CHECK_LENGTH);
    if (REGEX.META_CSP.test(headChunk)) {
        const newHead = headChunk.replace(REGEX.META_CSP, '<!-- CSP STRIPPED -->');
        body = newHead + body.substring(CONST.CSP_CHECK_LENGTH);
    }

    // ============================================================================
    // 4. 注入腳本 (v2.11 Enhanced)
    // ============================================================================
    const injection = `
<script>
(function() {
    "use strict";
    
    const CONFIG = {
        ver: '2.11',
        isWhitelisted: ${isWhitelisted},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        maxErrorLogs: 50,
        fakeCores: ${CONST.FAKE_CORES},
        rectNoiseRate: ${CONST.RECT_NOISE_RATE},
        maxPoolDim: ${CONST.MAX_POOL_DIM}
    };

    const ErrorHandler = {
        logs: [],
        capture: function(ctx, err) {
            if (this.logs.length >= CONFIG.maxErrorLogs) this.logs.shift();
            this.logs.push({ t: Date.now(), c: ctx, m: err?.message || String(err), s: err?.stack || '' });
        },
        getLogs: function() { return this.logs; },
        getStats: function() {
            const stats = {};
            for (let i = 0; i < this.logs.length; i++) { const c = this.logs[i].c; stats[c] = (stats[c] || 0) + 1; }
            return stats;
        }
    };

    const UI = {
        showBadge: function() {
            const id = 'fp-shield-badge';
            if (document.getElementById(id)) return;
            const b = document.createElement('div');
            b.id = id;
            const color = CONFIG.isWhitelisted ? 'rgba(100,100,100,0.8)' : 'rgba(0,100,0,0.9)';
            const text = CONFIG.isWhitelisted ? '🛡️ FP Bypass' : '🛡️ FP Active';
            b.style.cssText = \`position:fixed;bottom:10px;left:10px;z-index:2147483647;background:\${color};color:white;padding:6px 12px;border-radius:6px;font-size:12px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;opacity:0;transition:opacity 0.5s;display:flex;align-items:center;\`;
            b.innerText = text;
            (document.body || document.documentElement).appendChild(b);
            requestAnimationFrame(function() { b.style.opacity = '1'; });
            const timeout = CONFIG.isWhitelisted ? 2000 : 4000;
            setTimeout(function() { b.style.opacity = '0'; setTimeout(function() { b.remove(); }, 500); }, timeout);
        }
    };

    const hookHistory = function() {
        const wrap = function(t) { const o = history[t]; return function() { const r = o.apply(this, arguments); UI.showBadge(); return r; }; };
        history.pushState = wrap('pushState'); history.replaceState = wrap('replaceState');
        window.addEventListener('popstate', function() { UI.showBadge(); });
    };

    if (CONFIG.isWhitelisted) {
        const run = function() { UI.showBadge(); hookHistory(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
        return;
    }

    // --- Seed System ---
    const Seed = (function() {
        const KEY = 'FP_SHIELD_SEED_V2';
        let store;
        try { store = sessionStorage; } catch(e) { 
            if (!window.__FP_STORAGE__) window.__FP_STORAGE__ = {};
            store = { getItem: function(k) { return window.__FP_STORAGE__[k]; }, setItem: function(k, v) { window.__FP_STORAGE__[k] = v; } };
        }
        let val = store.getItem(KEY);
        if (!val) {
            const entropy = [
                Math.random() * 1e9,
                Date.now(),
                performance.now() * 1000,
                (navigator.hardwareConcurrency || 4) * 1000,
                screen.width * screen.height,
                (navigator.plugins ? navigator.plugins.length : 0) * 100,
                (history ? history.length : 0) * 100
            ].reduce(function(a, b) { return a ^ Math.floor(b); }, 0);
            val = ((entropy >>> 0) + Math.floor(Math.random() * 1e6)).toString();
            try { store.setItem(KEY, val); } catch(e) {}
        }
        return parseInt(val, 10);
    })();

    // --- Noise & GPU ---
    const Noise = (function() {
        const seed = Seed;
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0;
        const rand = function(i) { const x = Math.sin(i + seed) * 10000; return x - Math.floor(x); };
        
        const gpuPool = [
            { v: 'Intel Inc.', r: 'Intel Iris OpenGL Engine' },
            { v: 'NVIDIA Corporation', r: 'NVIDIA GeForce GTX 1650/PCIe/SSE2' },
            { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)' },
            { v: 'Apple', r: 'Apple M1' },
            { v: 'Apple', r: 'Apple M2' },
            { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)' }
        ];
        const selectedGpu = gpuPool[Math.floor(Math.abs(rand(42)) * gpuPool.length) % gpuPool.length];

        return {
            pixel: function(d, w, h) {
                const len = d.length; if (len < 4) return;
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                for (let i = 0; i < len; i += 4) {
                    const pIdx = i >> 2;
                    if ((pIdx + offset) % density === 0) {
                        const val = d[i] + (rand(pIdx) > 0.5 ? 1 : -1);
                        d[i] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    }
                }
            },
            audio: function(d) { for (let i = 0; i < d.length; i += 100) d[i] += (rand(i) * 1e-5); },
            font: function(w) { return w + (rand(w) * 0.04 - 0.02); },
            rect: function(v) { return v === 0 ? 0 : v * (1 + (rand(v * 100) * CONFIG.rectNoiseRate - CONFIG.rectNoiseRate / 2)); },
            int: function(base, variance) { return base + Math.floor(rand(base) * variance * 2 - variance); },
            getGPU: function() { return selectedGpu; },
            getTimezone: function() {
                const zones = [
                    { zone: 'America/New_York', offset: 300, name: 'Eastern Standard Time', abbr: 'EST' },
                    { zone: 'Europe/London', offset: 0, name: 'Greenwich Mean Time', abbr: 'GMT' },
                    { zone: 'Asia/Tokyo', offset: -540, name: 'Japan Standard Time', abbr: 'JST' },
                    { zone: 'Asia/Shanghai', offset: -480, name: 'China Standard Time', abbr: 'CST' },
                    { zone: 'America/Los_Angeles', offset: 480, name: 'Pacific Standard Time', abbr: 'PST' }
                ];
                return zones[Math.floor(Math.abs(rand(99))) % zones.length];
            }
        };
    })();

    const CanvasPool = (function() {
        const pool = []; const MAX = 3;
        return {
            get: function(w, h) {
                if (w * h > CONFIG.maxPoolDim) {
                    const c = document.createElement('canvas'); const x = c.getContext('2d', { willReadFrequently: true });
                    return { canvas: c, ctx: x, release: function() {} };
                }
                let item = null;
                for (let i = 0; i < pool.length; i++) if (pool[i].c.width >= w && pool[i].c.height >= h && !pool[i].u) { item = pool[i]; break; }
                if (!item) {
                    if (pool.length < MAX) {
                        const c = document.createElement('canvas'); const x = c.getContext('2d', { willReadFrequently: true });
                        item = { c: c, x: x, u: false }; pool.push(item);
                    } else item = pool[0];
                }
                item.u = true; item.c.width = w; item.c.height = h;
                return { canvas: item.c, ctx: item.x, release: function() { item.u = false; } };
            }
        };
    })();

    const ProxyGuard = {
        protect: function(native, custom) {
            const H = Symbol.for('FP_HOOKED'); if (native[H]) return native;
            const ns = Function.prototype.toString.call(native);
            return new Proxy(custom, {
                apply: function(t, th, a) { return t.apply(th, a); },
                get: function(t, k) { 
                    if (k === 'toString') return function() { return ns; }; 
                    if (k === H) return true; 
                    if (k === 'name') return native.name;
                    if (k === 'length') return native.length;
                    return t[k]; 
                },
                getPrototypeOf: function() { return Object.getPrototypeOf(native); }
            });
        },
        override: function(o, p, f) {
            if (!o || !o[p]) return;
            try {
                const orig = o[p]; const safe = f(orig); const prot = ProxyGuard.protect(orig, safe); 
                if (orig.prototype) prot.prototype = orig.prototype;
                try { Object.defineProperty(o, p, { value: prot, writable: true, configurable: true }); } 
                catch(e) { try { o[p] = prot; } catch(e2) {} }
            } catch(e) { ErrorHandler.capture('PG:' + p, e); }
        }
    };

    const Modules = {
        canvas: function(win) {
            try {
                [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(function(ctx) {
                    if (ctx && ctx.prototype) {
                        ProxyGuard.override(ctx.prototype, 'getImageData', function(orig) {
                            return function(x, y, w, h) { const r = orig.apply(this, arguments); if (w < 16 || h < 16) return r; Noise.pixel(r.data, w, h); return r; };
                        });
                        ProxyGuard.override(ctx.prototype, 'measureText', function(orig) {
                            return function() { const m = orig.apply(this, arguments); try { const w = m.width; Object.defineProperty(m, 'width', { get: function() { return Noise.font(w); } }); } catch(e) {} return m; };
                        });
                    }
                });
                if (win.HTMLCanvasElement) {
                    ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', function(orig) {
                        return function() {
                            const w = this.width, h = this.height; if (w < 16 || h < 16) return orig.apply(this, arguments);
                            try {
                                const p = CanvasPool.get(w, h); p.ctx.clearRect(0, 0, w, h); p.ctx.drawImage(this, 0, 0);
                                const d = p.ctx.getImageData(0, 0, w, h); Noise.pixel(d.data, w, h); p.ctx.putImageData(d, 0, 0);
                                const r = p.canvas.toDataURL.apply(p.canvas, arguments); p.release(); return r;
                            } catch(e) { return orig.apply(this, arguments); }
                        };
                    });
                    ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', function(orig) {
                        return function(callback) {
                            const w = this.width, h = this.height; 
                            if (w < 16 || h < 16) return orig.apply(this, arguments);
                            try {
                                const p = CanvasPool.get(w, h); p.ctx.clearRect(0, 0, w, h); p.ctx.drawImage(this, 0, 0);
                                const d = p.ctx.getImageData(0, 0, w, h); Noise.pixel(d.data, w, h); p.ctx.putImageData(d, 0, 0);
                                p.canvas.toBlob.call(p.canvas, callback); p.release();
                            } catch(e) { return orig.apply(this, arguments); }
                        };
                    });
                }
            } catch(e) { ErrorHandler.capture('Mod.canvas', e); }
        },
        audio: function(win) {
            try {
                const AC = win.AudioContext || win.webkitAudioContext; const AB = win.AudioBuffer;
                if (AC && AC.prototype && win.AnalyserNode) {
                    ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', function(orig) {
                        return function(a) { const r = orig.apply(this, arguments); for (let i = 0; i < a.length; i++) a[i] += ((Math.random() * 0.1) - 0.05); return r; };
                    });
                    ProxyGuard.override(win.AnalyserNode.prototype, 'getByteFrequencyData', function(orig) {
                        return function(a) { const r = orig.apply(this, arguments); for (let i = 0; i < a.length; i++) a[i] = Math.max(0, Math.min(255, a[i] + Math.floor((Math.random() * 3) - 1))); return r; };
                    });
                    ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatTimeDomainData', function(orig) {
                        return function(a) { const r = orig.apply(this, arguments); for (let i = 0; i < a.length; i++) a[i] += ((Math.random() * 0.001) - 0.0005); return r; };
                    });
                }
                if (AB && AB.prototype) {
                    ProxyGuard.override(AB.prototype, 'getChannelData', function(orig) {
                        return function() { const d = orig.apply(this, arguments); Noise.audio(d); return d; };
                    });
                }
            } catch(e) { ErrorHandler.capture('Mod.audio', e); }
        },
        hardware: function(win) {
            try {
                if (win.navigator) {
                    if ('getBattery' in win.navigator) win.navigator.getBattery = function() { return Promise.resolve({ charging: true, level: 1, chargingTime: 0, dischargingTime: Infinity, addEventListener: function() {} }); };
                    try { Object.defineProperty(win.navigator, 'hardwareConcurrency', { get: function() { return CONFIG.fakeCores; }, configurable: true }); } catch(e) {}
                    try { Object.defineProperty(win.navigator, 'deviceMemory', { get: function() { return 8; }, configurable: true }); } catch(e) {}
                }
                if (win.document && 'browsingTopics' in win.document) win.document.browsingTopics = function() { return Promise.resolve([]); };
            } catch(e) { ErrorHandler.capture('Mod.hw', e); }
        },
        webrtc: function(win) {
            try {
                if (!win.RTCPeerConnection) return;
                const OrigPeer = win.RTCPeerConnection;
                win.RTCPeerConnection = function(config, constraints) {
                    const newConfig = config || {};
                    if (newConfig.iceServers) newConfig.iceServers = [];
                    return new OrigPeer(newConfig, constraints);
                };
                win.RTCPeerConnection.prototype = OrigPeer.prototype;
                Object.keys(OrigPeer).forEach(function(key) { win.RTCPeerConnection[key] = OrigPeer[key]; });
            } catch(e) { ErrorHandler.capture('Mod.webrtc', e); }
        },
        rects: function(win) {
            try {
                const ElementProto = win.Element.prototype;
                const wrapRect = function(rect) {
                    if (!rect) return rect;
                    return {
                        top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, x: rect.x, y: rect.y,
                        width: Noise.rect(rect.width), height: Noise.rect(rect.height), toJSON: function() { return this; }
                    };
                };
                ProxyGuard.override(ElementProto, 'getBoundingClientRect', function(orig) { return function() { return wrapRect(orig.apply(this, arguments)); }; });
                ProxyGuard.override(ElementProto, 'getClientRects', function(orig) {
                    return function() { const rects = orig.apply(this, arguments); const spoofed = []; for (let i = 0; i < rects.length; i++) spoofed.push(wrapRect(rects[i])); return spoofed; };
                });
            } catch(e) { ErrorHandler.capture('Mod.rects', e); }
        },
        screen: function(win) {
            try {
                if (!win.screen) return;
                const oW = win.screen.width; const oH = win.screen.height; const oAW = win.screen.availWidth; const oAH = win.screen.availHeight;
                Object.defineProperties(win.screen, {
                    width: { get: function() { return Noise.int(oW, 2); }, configurable: true },
                    height: { get: function() { return Noise.int(oH, 2); }, configurable: true },
                    availWidth: { get: function() { return Noise.int(oAW, 2); }, configurable: true },
                    availHeight: { get: function() { return Noise.int(oAH, 2); }, configurable: true }
                });
            } catch(e) { ErrorHandler.capture('Mod.screen', e); }
        },
        webgl: function(win) {
            try {
                const gpu = Noise.getGPU();
                [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(function(ctx) {
                    if (ctx && ctx.prototype) {
                        ProxyGuard.override(ctx.prototype, 'getParameter', function(orig) {
                            return function(param) {
                                if (param === 37445) return gpu.v;
                                if (param === 37446) return gpu.r;
                                return orig.apply(this, arguments);
                            };
                        });
                    }
                });
            } catch(e) { ErrorHandler.capture('Mod.webgl', e); }
        },
        permissions: function(win) {
            try {
                if (!win.navigator.permissions) return;
                ProxyGuard.override(win.navigator.permissions, 'query', function(orig) {
                    return function(descriptor) {
                        return orig.apply(this, arguments).then(function(status) {
                            if (descriptor.name === 'geolocation' || descriptor.name === 'notifications') {
                                return { state: 'prompt', addEventListener: function() {} };
                            }
                            return status;
                        });
                    };
                });
            } catch(e) { ErrorHandler.capture('Mod.permissions', e); }
        },
        
        // [Enhanced] Timezone Hardening with Complete Date Coverage
        timezone: function(win) {
            try {
                const fake = Noise.getTimezone();
                
                // Helper: Format GMT offset string (e.g., GMT+0800 or GMT-0500)
                const formatGMTOffset = function(offsetMinutes) {
                    const sign = offsetMinutes <= 0 ? '+' : '-';
                    const absOffset = Math.abs(offsetMinutes);
                    const hours = Math.floor(absOffset / 60);
                    const minutes = absOffset % 60;
                    return 'GMT' + sign + String(hours).padStart(2, '0') + String(minutes).padStart(2, '0');
                };
                
                // Helper: Replace timezone info in date strings
                const replaceTimezoneInfo = function(str) {
                    // Replace timezone name in parentheses
                    str = str.replace(/\\([^\\)]+\\)$/, '(' + fake.name + ')');
                    // Replace GMT offset
                    str = str.replace(/GMT[\\+\\-]\\d{4}/, formatGMTOffset(fake.offset));
                    return str;
                };
                
                // 1. Intl.DateTimeFormat Spoofing
                if (win.Intl && win.Intl.DateTimeFormat) {
                    const OrigDTF = win.Intl.DateTimeFormat;
                    win.Intl.DateTimeFormat = function() {
                        const dtf = new OrigDTF(...arguments);
                        const origResolved = dtf.resolvedOptions;
                        dtf.resolvedOptions = function() {
                            const opts = origResolved.call(this);
                            opts.timeZone = fake.zone;
                            return opts;
                        };
                        return dtf;
                    };
                    win.Intl.DateTimeFormat.prototype = OrigDTF.prototype;
                    win.Intl.DateTimeFormat.supportedLocalesOf = OrigDTF.supportedLocalesOf;
                }
                
                // 2. Date.prototype Methods Spoofing
                if (win.Date && win.Date.prototype) {
                    // getTimezoneOffset
                    ProxyGuard.override(win.Date.prototype, 'getTimezoneOffset', function() {
                        return function() { return fake.offset; };
                    });
                    
                    // toString
                    ProxyGuard.override(win.Date.prototype, 'toString', function(orig) {
                        return function() { return replaceTimezoneInfo(orig.apply(this, arguments)); };
                    });
                    
                    // toTimeString
                    ProxyGuard.override(win.Date.prototype, 'toTimeString', function(orig) {
                        return function() { return replaceTimezoneInfo(orig.apply(this, arguments)); };
                    });
                    
                    // toDateString (no timezone info, but override for consistency)
                    ProxyGuard.override(win.Date.prototype, 'toDateString', function(orig) {
                        return function() { return orig.apply(this, arguments); };
                    });
                    
                    // toLocaleString
                    ProxyGuard.override(win.Date.prototype, 'toLocaleString', function(orig) {
                        return function(locales, options) {
                            const opts = options || {};
                            opts.timeZone = fake.zone;
                            return orig.call(this, locales, opts);
                        };
                    });
                    
                    // toLocaleDateString
                    ProxyGuard.override(win.Date.prototype, 'toLocaleDateString', function(orig) {
                        return function(locales, options) {
                            const opts = options || {};
                            opts.timeZone = fake.zone;
                            return orig.call(this, locales, opts);
                        };
                    });
                    
                    // toLocaleTimeString
                    ProxyGuard.override(win.Date.prototype, 'toLocaleTimeString', function(orig) {
                        return function(locales, options) {
                            const opts = options || {};
                            opts.timeZone = fake.zone;
                            return orig.call(this, locales, opts);
                        };
                    });
                }
            } catch(e) { ErrorHandler.capture('Mod.timezone', e); }
        },
        
        // [New] Performance API Protection
        performance: function(win) {
            try {
                if (!win.performance) return;
                
                // Add noise to performance.now()
                const origNow = win.performance.now;
                if (origNow) {
                    const noiseOffset = Math.random() * 0.5;
                    ProxyGuard.override(win.performance, 'now', function() {
                        return function() { return origNow.call(win.performance) + noiseOffset; };
                    });
                }
                
                // Spoof memory info if available
                if (win.performance.memory) {
                    const origMemory = win.performance.memory;
                    Object.defineProperty(win.performance, 'memory', {
                        get: function() {
                            return {
                                jsHeapSizeLimit: Noise.int(origMemory.jsHeapSizeLimit || 2172649472, 10000000),
                                totalJSHeapSize: Noise.int(origMemory.totalJSHeapSize || 50000000, 1000000),
                                usedJSHeapSize: Noise.int(origMemory.usedJSHeapSize || 30000000, 1000000)
                            };
                        },
                        configurable: true
                    });
                }
            } catch(e) { ErrorHandler.capture('Mod.performance', e); }
        },
        
        // [New] MediaDevices Protection
        mediaDevices: function(win) {
            try {
                if (!win.navigator.mediaDevices) return;
                
                // Spoof enumerateDevices
                ProxyGuard.override(win.navigator.mediaDevices, 'enumerateDevices', function(orig) {
                    return function() {
                        return orig.apply(this, arguments).then(function(devices) {
                            return devices.map(function(device) {
                                return {
                                    deviceId: device.deviceId ? 'spoofed_' + Math.random().toString(36).substr(2, 9) : '',
                                    groupId: device.groupId ? 'spoofed_' + Math.random().toString(36).substr(2, 9) : '',
                                    kind: device.kind,
                                    label: device.label
                                };
                            });
                        });
                    };
                });
            } catch(e) { ErrorHandler.capture('Mod.mediaDevices', e); }
        }
    };

    const inject = function(win) {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });
            
            // Core modules (immediate)
            Modules.canvas(win); 
            Modules.rects(win); 
            Modules.webrtc(win); 
            Modules.screen(win); 
            Modules.webgl(win); 
            Modules.timezone(win);
            
            // Secondary modules (deferred)
            const lazy = function() { 
                Modules.audio(win); 
                Modules.hardware(win); 
                Modules.permissions(win); 
                Modules.performance(win);
                Modules.mediaDevices(win);
            };
            
            if (win.requestIdleCallback) {
                win.requestIdleCallback(lazy, { timeout: 1000 });
            } else if (win.requestAnimationFrame) {
                win.requestAnimationFrame(function() { setTimeout(lazy, 0); });
            } else {
                setTimeout(lazy, 0);
            }
        } catch(e) { ErrorHandler.capture('inject', e); }
    };

    const init = function() {
        inject(window); UI.showBadge(); hookHistory();
        new MutationObserver(function(ms) {
            for (let i = 0; i < ms.length; i++) {
                const m = ms[i]; for (let j = 0; j < m.addedNodes.length; j++) {
                    const n = m.addedNodes[j];
                    if (n.tagName === 'IFRAME') {
                        try {
                            if (n.contentWindow) inject(n.contentWindow);
                            n.addEventListener('load', function() { try { inject(n.contentWindow); } catch(e) {} });
                        } catch(e) {}
                    }
                }
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    
    window.__FP_METRICS__ = {
        version: CONFIG.ver,
        injections: { canvas: 0, audio: 0, font: 0, hardware: 0, webrtc: 0, rects: 0, screen: 0, webgl: 0, permissions: 0, timezone: 0, performance: 0, mediaDevices: 0 },
        getErrors: function() { return ErrorHandler.getLogs(); },
        getErrorStats: function() { return ErrorHandler.getStats(); },
        getSeed: function() { return Seed; },
        getTimezone: function() { return Noise.getTimezone(); },
        getGPU: function() { return Noise.getGPU(); }
    };
})();
</script>
`;

    if (REGEX.HEAD_TAG.test(body)) {
        body = body.replace(REGEX.HEAD_TAG, function(match) { return match + injection; });
    } else if (REGEX.HTML_TAG.test(body)) {
        body = body.replace(REGEX.HTML_TAG, function(match) { return match + injection; });
    }
    
    $done({ body: body, headers: headers });
})();
