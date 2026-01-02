/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.04 (Full Stack Stealth)
 * @description [v2.04] 基於 v2.03c 架構；新增 WebRTC IP 防護、硬體核心數偽裝、Client Rects 排版干擾；移除 desynchronized 特徵。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    // ============================================================================
    // 0. 全局設定
    // ============================================================================
    const CONST = {
        MAX_SIZE: 3000000,
        KEY_SEED: 'FP_SHIELD_SEED_V2',
        MAX_POOL_SIZE: 3,
        MAX_ERROR_LOGS: 50,
        CSP_CHECK_LENGTH: 3000
    };

    const REGEX = {
        URL_PROTO: /^https?:\/\/([^/:]+)/i,
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
    // 標頭正規化
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
            exact: [
                "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
                "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
                "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com",
                "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
                "cdn.ghostery.com", "browserleaks.com" // 用於測試，可自行移除
            ],
            patterns: [
                { suffix: "gov.tw" }, { suffix: "org.tw" }, { suffix: "edu.tw" }, { suffix: "bank" },
                { suffix: "pay.taipei" }, { suffix: "bot.com.tw" }, { suffix: "cathaybk.com.tw" },
                { suffix: "ctbcbank.com" }, { suffix: "esunbank.com.tw" }, { suffix: "fubon.com" },
                { suffix: "richart.tw" }, { suffix: "taishinbank.com.tw" }, { suffix: "apple.com" },
                { suffix: "microsoft.com" }, { suffix: "aws.amazon.com" }, { suffix: "shopee.tw" },
                { suffix: "shopee.com" }, { suffix: "jkos.com" }, { suffix: "ecpay.com.tw" }
            ]
        };
        const exactSet = new Set(DEFAULT_WHITELIST.exact);
        return {
            check: (hostname) => {
                if (!hostname) return false;
                if (exactSet.has(hostname)) return true;
                for (let i = 0; i < DEFAULT_WHITELIST.patterns.length; i++) {
                    if (hostname.endsWith(DEFAULT_WHITELIST.patterns[i].suffix)) return true;
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
    // 4. 注入腳本 (v2.04 增強版)
    // ============================================================================
    const injection = `
<script>
(function() {
    "use strict";
    
    const CONFIG = {
        ver: '2.04',
        isWhitelisted: ${isWhitelisted},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        maxErrorLogs: 50
    };

    // --- Error Handler ---
    const ErrorHandler = {
        logs: [],
        capture: function(ctx, err) {
            if (this.logs.length >= CONFIG.maxErrorLogs) this.logs.shift();
            this.logs.push({ t: Date.now(), c: ctx, m: err?.message || String(err) });
        },
        getLogs: function() { return this.logs; }
    };

    // --- UI Module ---
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
        history.pushState = wrap('pushState');
        history.replaceState = wrap('replaceState');
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
            // Include hardwareConcurrency in entropy source (reading real value once for seed is fine)
            const entropy = [Math.random()*1e9, Date.now(), performance.now()*1000, (navigator.hardwareConcurrency||4)*1000].reduce(function(a,b){return a^Math.floor(b);},0);
            val = ((entropy >>> 0) + Math.floor(Math.random() * 1e6)).toString();
            try { store.setItem(KEY, val); } catch(e) {}
        }
        return parseInt(val, 10);
    })();

    // --- Noise Engine ---
    const Noise = (function() {
        const seed = Seed;
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0;
        const rand = function(i) { const x = Math.sin(i + seed) * 10000; return x - Math.floor(x); };
        return {
            pixel: function(d, w, h) {
                const len = d.length; if (len < 4) return;
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                for (let i = 0; i < len; i += 4) {
                    const pIdx = i >> 2;
                    if ((pIdx + offset) % density === 0) { d[i] = Math.max(0, Math.min(255, d[i] + (rand(pIdx) > 0.5 ? 1 : -1))); }
                }
            },
            audio: function(d) { for (let i = 0; i < d.length; i += 100) d[i] += (rand(i) * 1e-5); },
            font: function(w) { return w + (rand(w) * 0.04 - 0.02); },
            rect: function(v) { return v + (rand(v * 100) * 0.00002 - 0.00001); } // Micro-noise for rects
        };
    })();

    // --- Canvas Pool (Optimized: No desynchronized) ---
    const CanvasPool = (function() {
        const pool = []; const MAX = 3;
        return {
            get: function(w, h) {
                let item = null;
                for (let i = 0; i < pool.length; i++) if (pool[i].canvas.width >= w && pool[i].canvas.height >= h && !pool[i].inUse) { item = pool[i]; break; }
                if (!item) {
                    if (pool.length < MAX) {
                        const c = document.createElement('canvas');
                        // [Optimization] Removed 'desynchronized: true' to avoid fingerprinting
                        const x = c.getContext('2d', { willReadFrequently: true });
                        item = { canvas: c, ctx: x, inUse: false };
                        pool.push(item);
                    } else item = pool[0];
                }
                item.inUse = true; item.canvas.width = w; item.canvas.height = h;
                return { canvas: item.canvas, ctx: item.ctx, release: function() { item.inUse = false; } };
            }
        };
    })();

    // --- Proxy Guard ---
    const ProxyGuard = {
        protect: function(native, custom) {
            const H = Symbol.for('FP_HOOKED'); if (native[H]) return native;
            const ns = Function.prototype.toString.call(native);
            const p = new Proxy(custom, {
                apply: function(t, th, a) { return Reflect.apply(t, th, a); },
                get: function(t, k) { if (k === 'toString') return function() { return ns; }; if (k === H) return true; return Reflect.get(t, k); }
            });
            return p;
        },
        override: function(o, p, f) {
            if (!o || !o[p]) return;
            try {
                const orig = o[p]; const safe = f(orig); const prot = ProxyGuard.protect(orig, safe); prot.prototype = orig.prototype;
                try { Object.defineProperty(o, p, { value: prot, writable: true, configurable: true }); } catch(e) { try { o[p] = prot; } catch(e2) {} }
            } catch(e) { ErrorHandler.capture('PG.override:' + p, e); }
        }
    };

    // --- Modules ---
    const Modules = {
        canvas: function(win) {
            try {
                [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(function(ctx) {
                    if (ctx && ctx.prototype) {
                        ProxyGuard.override(ctx.prototype, 'getImageData', function(orig) {
                            return function(x, y, w, h) {
                                const r = orig.apply(this, arguments); if (w < 16 || h < 16) return r; Noise.pixel(r.data, w, h); return r;
                            };
                        });
                        ProxyGuard.override(ctx.prototype, 'measureText', function(orig) {
                            return function() {
                                const m = orig.apply(this, arguments);
                                try { const w = m.width; Object.defineProperty(m, 'width', { get: function() { return Noise.font(w); } }); } catch(e) {} return m;
                            };
                        });
                    }
                });
                if (win.HTMLCanvasElement) {
                    ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', function(orig) {
                        return function() {
                            const w = this.width, h = this.height; if (w < 16 || h < 16) return orig.apply(this, arguments);
                            try {
                                const p = CanvasPool.get(w, h);
                                p.ctx.clearRect(0, 0, w, h); p.ctx.drawImage(this, 0, 0);
                                const d = p.ctx.getImageData(0, 0, w, h); Noise.pixel(d.data, w, h); p.ctx.putImageData(d, 0, 0);
                                const r = p.canvas.toDataURL.apply(p.canvas, arguments); p.release(); return r;
                            } catch(e) { ErrorHandler.capture('toDataURL', e); return orig.apply(this, arguments); }
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
                // 1. Battery Blocking
                if (win.navigator && 'getBattery' in win.navigator) {
                    win.navigator.getBattery = function() { return Promise.resolve({ charging: true, level: 1, addEventListener: function() {} }); };
                }
                // 2. Topics API
                if (win.document && 'browsingTopics' in win.document) {
                    win.document.browsingTopics = function() { return Promise.resolve([]); };
                }
                // 3. [New] Hardware Concurrency Spoofing
                if (win.navigator) {
                    try {
                        // Spoof to generic 4 cores
                        Object.defineProperty(win.navigator, 'hardwareConcurrency', { get: function() { return 4; }, configurable: true });
                    } catch(e) {}
                }
            } catch(e) { ErrorHandler.capture('Mod.hw', e); }
        },

        // [New] WebRTC Leak Protection
        webrtc: function(win) {
            try {
                if (!win.RTCPeerConnection) return;
                const OrigPeer = win.RTCPeerConnection;
                win.RTCPeerConnection = function(config, constraints) {
                    if (config && config.iceServers) {
                        // Clear STUN/TURN servers to prevent public IP leak
                        config.iceServers = []; 
                    }
                    return new OrigPeer(config, constraints);
                };
                win.RTCPeerConnection.prototype = OrigPeer.prototype;
                // Copy static properties
                Object.keys(OrigPeer).forEach(function(key) { win.RTCPeerConnection[key] = OrigPeer[key]; });
            } catch(e) { ErrorHandler.capture('Mod.webrtc', e); }
        },

        // [New] Client Rects Protection (Layout Fingerprinting)
        rects: function(win) {
            try {
                const ElementProto = win.Element.prototype;
                const wrapRect = function(rect) {
                    if (!rect) return rect;
                    // Clone read-only DOMRect to modify it
                    return {
                        top: Noise.rect(rect.top), bottom: Noise.rect(rect.bottom),
                        left: Noise.rect(rect.left), right: Noise.rect(rect.right),
                        width: Noise.rect(rect.width), height: Noise.rect(rect.height),
                        x: Noise.rect(rect.x), y: Noise.rect(rect.y),
                        toJSON: function() { return this; }
                    };
                };

                // Hook getBoundingClientRect
                ProxyGuard.override(ElementProto, 'getBoundingClientRect', function(orig) {
                    return function() { return wrapRect(orig.apply(this, arguments)); };
                });

                // Hook getClientRects
                ProxyGuard.override(ElementProto, 'getClientRects', function(orig) {
                    return function() {
                        const rects = orig.apply(this, arguments);
                        const spoofed = [];
                        for (let i = 0; i < rects.length; i++) spoofed.push(wrapRect(rects[i]));
                        return spoofed;
                    };
                });
            } catch(e) { ErrorHandler.capture('Mod.rects', e); }
        }
    };

    // --- Injector ---
    const inject = function(win) {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });
            
            Modules.canvas(win);
            Modules.rects(win); // Layout protection needs to be early
            Modules.webrtc(win); // Network protection
            
            const lazy = function() {
                Modules.audio(win);
                Modules.hardware(win);
            };
            
            if (win.requestIdleCallback) win.requestIdleCallback(lazy);
            else setTimeout(lazy, 0);
        } catch(e) { ErrorHandler.capture('inject', e); }
    };

    // --- Init ---
    const init = function() {
        inject(window);
        UI.showBadge();
        hookHistory();
        
        new MutationObserver(function(ms) {
            for (let i = 0; i < ms.length; i++) {
                const m = ms[i];
                for (let j = 0; j < m.addedNodes.length; j++) {
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
        injections: { canvas: 0, audio: 0, font: 0, hardware: 0 },
        getErrors: function() { return ErrorHandler.getLogs(); }
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
