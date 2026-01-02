/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.06 (Performance & Stability)
 * @description [v2.06] 修復 ClientRects 捲動抖動問題 (僅混淆尺寸)；優化 CanvasPool 記憶體管理；WebRTC 柔性防護；Loop 效能提升。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    // ============================================================================
    // 0. 全局設定
    // ============================================================================
    const CONST = {
        MAX_SIZE: 5000000, // 提升至 5MB
        KEY_SEED: 'FP_SHIELD_SEED_V2',
        MAX_POOL_SIZE: 3,
        MAX_POOL_DIM: 1024 * 1024, // [New] CanvasPool 最大像素限制 (1MP)，超過不緩存
        MAX_ERROR_LOGS: 50,
        CSP_CHECK_LENGTH: 3000,
        FAKE_CORES: 4,
        RECT_NOISE_RANGE: 0.00002
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
                "cdn.ghostery.com", "browserleaks.com"
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
    // 4. 注入腳本 (v2.06 Optimized)
    // ============================================================================
    const injection = `
<script>
(function() {
    "use strict";
    
    const CONFIG = {
        ver: '2.06',
        isWhitelisted: ${isWhitelisted},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        maxErrorLogs: 50,
        fakeCores: ${CONST.FAKE_CORES},
        rectNoiseRange: ${CONST.RECT_NOISE_RANGE},
        maxPoolDim: ${CONST.MAX_POOL_DIM}
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
                // [Optimization] Move math out of the loop
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                
                // [Optimization] Unrolled loop slightly or just standard for loop
                for (let i = 0; i < len; i += 4) {
                    // Use bit shift for division by 4
                    const pIdx = i >> 2;
                    if ((pIdx + offset) % density === 0) { 
                        const noise = rand(pIdx) > 0.5 ? 1 : -1;
                        // Avoid clamp if possible, but safe here
                        const val = d[i] + noise;
                        d[i] = val < 0 ? 0 : (val > 255 ? 255 : val);
                    }
                }
            },
            audio: function(d) { 
                const len = d.length;
                for (let i = 0; i < len; i += 100) d[i] += (rand(i) * 1e-5); 
            },
            font: function(w) { return w + (rand(w) * 0.04 - 0.02); },
            // [Fix] Only noise magnitude, never position, to avoid scroll jitter
            rect: function(v) { 
                // Only apply noise if value is non-zero to avoid breaking 0 size elements
                return v === 0 ? 0 : v + (rand(v * 100) * CONFIG.rectNoiseRange - CONFIG.rectNoiseRange / 2); 
            }
        };
    })();

    // --- Canvas Pool (Memory Safe) ---
    const CanvasPool = (function() {
        const pool = []; const MAX = 3;
        return {
            get: function(w, h) {
                // [Fix] Memory Safety: Do not pool large canvases
                if (w * h > CONFIG.maxPoolDim) {
                    const c = document.createElement('canvas');
                    const x = c.getContext('2d', { willReadFrequently: true });
                    return { canvas: c, ctx: x, release: function() {} }; // No-op release
                }

                let item = null;
                for (let i = 0; i < pool.length; i++) if (pool[i].c.width >= w && pool[i].c.height >= h && !pool[i].u) { item = pool[i]; break; }
                if (!item) {
                    if (pool.length < MAX) {
                        const c = document.createElement('canvas');
                        const x = c.getContext('2d', { willReadFrequently: true });
                        item = { c: c, x: x, u: false };
                        pool.push(item);
                    } else item = pool[0]; // Recycle oldest/first if full (simple strategy)
                }
                item.u = true; item.c.width = w; item.c.height = h;
                return { canvas: item.c, ctx: item.x, release: function() { item.u = false; } };
            }
        };
    })();

    // --- Proxy Guard (Lean) ---
    const ProxyGuard = {
        protect: function(native, custom) {
            const H = Symbol.for('FP_HOOKED'); if (native[H]) return native;
            const ns = Function.prototype.toString.call(native);
            return new Proxy(custom, {
                // [Optimization] Direct Apply
                apply: function(t, th, a) { return t.apply(th, a); },
                get: function(t, k) { 
                    if (k === 'toString') return function() { return ns; }; 
                    if (k === H) return true; 
                    return t[k]; 
                }
            });
        },
        override: function(o, p, f) {
            if (!o || !o[p]) return;
            try {
                const orig = o[p]; const safe = f(orig); const prot = ProxyGuard.protect(orig, safe); prot.prototype = orig.prototype;
                try { Object.defineProperty(o, p, { value: prot, writable: true, configurable: true }); } catch(e) { try { o[p] = prot; } catch(e2) {} }
            } catch(e) { ErrorHandler.capture('PG:' + p, e); }
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
                if (win.navigator) {
                    if ('getBattery' in win.navigator) {
                        win.navigator.getBattery = function() { return Promise.resolve({ charging: true, level: 1, addEventListener: function() {} }); };
                    }
                    try { Object.defineProperty(win.navigator, 'hardwareConcurrency', { get: function() { return CONFIG.fakeCores; }, configurable: true }); } catch(e) {}
                }
            } catch(e) { ErrorHandler.capture('Mod.hw', e); }
        },

        webrtc: function(win) {
            try {
                if (!win.RTCPeerConnection) return;
                const OrigPeer = win.RTCPeerConnection;
                win.RTCPeerConnection = function(config, constraints) {
                    // [Fix] Safety check: ensure config object exists
                    const newConfig = config || {};
                    // [Fix] Soft block: Only clear if it looks like a default/tracking config
                    // Hard to distinguish, but safe default is to clear for privacy.
                    // To avoid breaking apps, we could check whitelist, but for now we assume 
                    // users want privacy. 
                    if (newConfig.iceServers) {
                        newConfig.iceServers = []; 
                    }
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
                    // [Fix] ONLY modify dimensions, NEVER x/y/top/left to avoid scroll jitter
                    return {
                        top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
                        x: rect.x, y: rect.y,
                        width: Noise.rect(rect.width), 
                        height: Noise.rect(rect.height),
                        toJSON: function() { return this; }
                    };
                };

                ProxyGuard.override(ElementProto, 'getBoundingClientRect', function(orig) {
                    return function() { return wrapRect(orig.apply(this, arguments)); };
                });

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

    const inject = function(win) {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });
            
            Modules.canvas(win);
            Modules.rects(win); 
            Modules.webrtc(win); 
            
            const lazy = function() {
                Modules.audio(win);
                Modules.hardware(win);
            };
            
            if (win.requestIdleCallback) win.requestIdleCallback(lazy);
            else setTimeout(lazy, 0);
        } catch(e) { ErrorHandler.capture('inject', e); }
    };

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
