/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.03 (Optimized)
 * @description [v2.03] 全面優化版本：效能提升、安全強化、記憶體管理、錯誤處理、白名單結構化
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    // ============================================================================
    // 0. 全局設定與正則（預編譯優化）
    // ============================================================================
    const CONST = {
        MAX_SIZE: 3000000,
        KEY_SEED: 'FP_SHIELD_SEED_V2',
        KEY_WHITELIST: 'FP_WHITELIST_V3',
        WHITELIST_TTL: 7 * 24 * 60 * 60 * 1000,
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
    // 1. 基礎過濾（效能優化）
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
    // 2. 白名單管理系統（結構化優化）
    // ============================================================================
    const WhitelistManager = (() => {
        const DEFAULT_WHITELIST = {
            version: '3.0',
            exact: [
                "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
                "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
                "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com",
                "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
                "cdn.ghostery.com"
            ],
            patterns: [
                { suffix: "gov.tw", desc: "台灣政府" },
                { suffix: "org.tw", desc: "台灣組織" },
                { suffix: "edu.tw", desc: "台灣教育" },
                { suffix: "bank", desc: "銀行" },
                { suffix: "pay.taipei", desc: "支付" },
                { suffix: "bot.com.tw", desc: "台銀" },
                { suffix: "cathaybk.com.tw", desc: "國泰" },
                { suffix: "ctbcbank.com", desc: "中信" },
                { suffix: "esunbank.com.tw", desc: "玉山" },
                { suffix: "fubon.com", desc: "富邦" },
                { suffix: "richart.tw", desc: "Richart" },
                { suffix: "taishinbank.com.tw", desc: "台新" },
                { suffix: "apple.com", desc: "Apple" },
                { suffix: "microsoft.com", desc: "微軟" },
                { suffix: "aws.amazon.com", desc: "AWS" },
                { suffix: "shopee.tw", desc: "蝦皮TW" },
                { suffix: "shopee.com", desc: "蝦皮" },
                { suffix: "jkos.com", desc: "街口" },
                { suffix: "ecpay.com.tw", desc: "綠界" }
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

    // UA 檢查
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const currentUA = (uaRaw || '').toLowerCase();
    if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

    // Hostname 提取
    const match = $req.url.match(REGEX.URL_PROTO);
    const hostname = match ? match[1].toLowerCase() : '';
    const isWhitelisted = WhitelistManager.check(hostname);

    // ============================================================================
    // 3. Body 處理與注入
    // ============================================================================
    let body = $res.body;
    if (!body) { $done({}); return; }

    // 快速檢查是否為 JSON/API 回應
    const startChars = body.substring(0, 50).trim();
    if (REGEX.JSON_START.test(startChars)) { $done({}); return; }

    // CSP 移除（Header）
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    // CSP 移除（Meta Tag）- 僅檢查前段避免全文掃描
    const headChunk = body.substring(0, CONST.CSP_CHECK_LENGTH);
    if (REGEX.META_CSP.test(headChunk)) {
        const newHead = headChunk.replace(REGEX.META_CSP, '<!-- CSP STRIPPED -->');
        body = newHead + body.substring(CONST.CSP_CHECK_LENGTH);
    }

    // ============================================================================
    // 4. 注入腳本（完整優化版）
    // ============================================================================
    const injection = `
<script>
(function() {
    "use strict";
    
    const CONFIG = {
        ver: '2.03',
        isWhitelisted: ${isWhitelisted},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        maxErrorLogs: 50
    };

    // ============================================================================
    // 錯誤處理系統
    // ============================================================================
    const ErrorHandler = {
        logs: [],
        capture: function(ctx, err) {
            if (this.logs.length >= CONFIG.maxErrorLogs) this.logs.shift();
            this.logs.push({
                t: Date.now(),
                c: ctx,
                m: err?.message || String(err)
            });
        },
        getLogs: function() { return this.logs; }
    };

    // ============================================================================
    // UI 模組
    // ============================================================================
    const UI = {
        showBadge: function() {
            const id = 'fp-shield-badge';
            if (document.getElementById(id)) return;

            const b = document.createElement('div');
            b.id = id;
            const color = CONFIG.isWhitelisted ? 'rgba(100,100,100,0.8)' : 'rgba(0,100,0,0.9)';
            const text = CONFIG.isWhitelisted ? '🛡️ FP Bypass' : '🛡️ FP Active';
            
            b.style.cssText = \`position:fixed;bottom:10px;left:10px;z-index:2147483647;background:\${color};color:white;padding:6px 12px;border-radius:6px;font-size:12px;font-family:-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;opacity:0;transition:opacity 0.5s;display:flex;align-items:center;\`;
            b.innerText = text;
            
            (document.body || document.documentElement).appendChild(b);
            
            requestAnimationFrame(function() { b.style.opacity = '1'; });
            const timeout = CONFIG.isWhitelisted ? 2000 : 4000;
            setTimeout(function() {
                b.style.opacity = '0';
                setTimeout(function() { b.remove(); }, 500);
            }, timeout);
        }
    };

    // SPA 路由監聽
    const hookHistory = function() {
        const wrap = function(type) {
            const orig = history[type];
            return function() {
                const rv = orig.apply(this, arguments);
                UI.showBadge();
                return rv;
            };
        };
        history.pushState = wrap('pushState');
        history.replaceState = wrap('replaceState');
        window.addEventListener('popstate', function() { UI.showBadge(); });
    };

    // 白名單模式：僅顯示盾牌
    if (CONFIG.isWhitelisted) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                UI.showBadge();
                hookHistory();
            });
        } else {
            UI.showBadge();
            hookHistory();
        }
        return;
    }

    // ============================================================================
    // Seed 生成系統（增強版）
    // ============================================================================
    const Seed = (function() {
        const KEY = 'FP_SHIELD_SEED_V2';
        let store;
        
        try {
            store = sessionStorage;
        } catch(e) {
            if (!window.__FP_STORAGE__) window.__FP_STORAGE__ = {};
            store = {
                getItem: function(k) { return window.__FP_STORAGE__[k]; },
                setItem: function(k, v) { window.__FP_STORAGE__[k] = v; }
            };
        }
        
        let val = store.getItem(KEY);
        
        if (!val) {
            const entropy = [
                Math.random() * 1e9,
                Date.now(),
                performance.now() * 1000,
                (navigator.hardwareConcurrency || 4) * 1000,
                screen.width * screen.height
            ].reduce(function(a, b) { return a ^ Math.floor(b); }, 0);
            
            val = ((entropy >>> 0) + Math.floor(Math.random() * 1e6)).toString();
            try { store.setItem(KEY, val); } catch(e) {}
        }
        
        return parseInt(val, 10);
    })();

    // ============================================================================
    // 噪聲生成系統
    // ============================================================================
    const Noise = (function() {
        const seed = Seed;
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0;
        const rand = function(i) {
            const x = Math.sin(i + seed) * 10000;
            return x - Math.floor(x);
        };
        
        return {
            pixel: function(data, w, h) {
                const len = data.length;
                if (len < 4) return;
                
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                
                for (let i = 0; i < len; i += 4) {
                    const pIdx = i >> 2;
                    if ((pIdx + offset) % density === 0) {
                        const delta = rand(pIdx) > 0.5 ? 1 : -1;
                        data[i] = Math.max(0, Math.min(255, data[i] + delta));
                    }
                }
            },
            audio: function(data) {
                for (let i = 0; i < data.length; i += 100) {
                    data[i] += (rand(i) * 1e-5);
                }
            },
            font: function(w) {
                return w + (rand(w) * 0.04 - 0.02);
            }
        };
    })();

    // ============================================================================
    // Canvas Pool（多實例優化）
    // ============================================================================
    const CanvasPool = (function() {
        const pool = [];
        const MAX_SIZE = 3;
        
        return {
            get: function(w, h) {
                let item = null;
                
                for (let i = 0; i < pool.length; i++) {
                    const p = pool[i];
                    if (p.canvas.width >= w && p.canvas.height >= h && !p.inUse) {
                        item = p;
                        break;
                    }
                }
                
                if (!item) {
                    if (pool.length < MAX_SIZE) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', {
                            willReadFrequently: true,
                            desynchronized: true
                        });
                        item = { canvas: canvas, ctx: ctx, inUse: false };
                        pool.push(item);
                    } else {
                        item = pool[0];
                    }
                }
                
                item.inUse = true;
                item.canvas.width = w;
                item.canvas.height = h;
                
                return {
                    canvas: item.canvas,
                    ctx: item.ctx,
                    release: function() { item.inUse = false; }
                };
            }
        };
    })();

    // ============================================================================
    // Proxy 守衛系統
    // ============================================================================
    const ProxyGuard = {
        protect: function(native, custom) {
            const HOOK_MARK = Symbol.for('FP_HOOKED');
            if (native[HOOK_MARK]) return native;
            
            const nativeStr = Function.prototype.toString.call(native);
            const p = new Proxy(custom, {
                apply: function(t, th, a) { return Reflect.apply(t, th, a); },
                get: function(t, k) {
                    if (k === 'toString') return function() { return nativeStr; };
                    if (k === HOOK_MARK) return true;
                    return Reflect.get(t, k);
                }
            });
            return p;
        },
        override: function(o, p, f) {
            if (!o || !o[p]) return;
            
            try {
                const orig = o[p];
                const safe = f(orig);
                const prot = ProxyGuard.protect(orig, safe);
                prot.prototype = orig.prototype;
                
                try {
                    Object.defineProperty(o, p, {
                        value: prot,
                        writable: true,
                        configurable: true
                    });
                } catch(e) {
                    try { o[p] = prot; } catch(e2) {}
                }
            } catch(e) {
                ErrorHandler.capture('ProxyGuard.override:' + p, e);
            }
        }
    };

    // ============================================================================
    // 防護模組
    // ============================================================================
    const Modules = {
        canvas: function(win) {
            try {
                const contexts = [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D];
                
                contexts.forEach(function(ctx) {
                    if (ctx && ctx.prototype) {
                        ProxyGuard.override(ctx.prototype, 'getImageData', function(orig) {
                            return function(x, y, w, h) {
                                const res = orig.apply(this, arguments);
                                if (w < 16 || h < 16) return res;
                                Noise.pixel(res.data, w, h);
                                return res;
                            };
                        });
                        
                        ProxyGuard.override(ctx.prototype, 'measureText', function(orig) {
                            return function() {
                                const m = orig.apply(this, arguments);
                                try {
                                    const w = m.width;
                                    Object.defineProperty(m, 'width', {
                                        get: function() { return Noise.font(w); }
                                    });
                                } catch(e) {}
                                return m;
                            };
                        });
                    }
                });
                
                if (win.HTMLCanvasElement) {
                    ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', function(orig) {
                        return function() {
                            const w = this.width, h = this.height;
                            if (w < 16 || h < 16) return orig.apply(this, arguments);
                            
                            try {
                                const poolItem = CanvasPool.get(w, h);
                                const canvas = poolItem.canvas;
                                const ctx = poolItem.ctx;
                                
                                ctx.clearRect(0, 0, w, h);
                                ctx.drawImage(this, 0, 0);
                                
                                const id = ctx.getImageData(0, 0, w, h);
                                Noise.pixel(id.data, w, h);
                                ctx.putImageData(id, 0, 0);
                                
                                const result = canvas.toDataURL.apply(canvas, arguments);
                                poolItem.release();
                                
                                return result;
                            } catch(e) {
                                ErrorHandler.capture('canvas.toDataURL', e);
                                return orig.apply(this, arguments);
                            }
                        };
                    });
                }
            } catch(e) {
                ErrorHandler.capture('Modules.canvas', e);
            }
        },
        
        audio: function(win) {
            try {
                const AC = win.AudioContext || win.webkitAudioContext;
                const AB = win.AudioBuffer;
                
                if (AC && AC.prototype && win.AnalyserNode) {
                    ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', function(orig) {
                        return function(a) {
                            const r = orig.apply(this, arguments);
                            for (let i = 0; i < a.length; i += 10) {
                                a[i] += ((Math.random() * 0.1) - 0.05);
                            }
                            return r;
                        };
                    });
                }
                
                if (AB && AB.prototype) {
                    ProxyGuard.override(AB.prototype, 'getChannelData', function(orig) {
                        return function() {
                            const d = orig.apply(this, arguments);
                            Noise.audio(d);
                            return d;
                        };
                    });
                }
            } catch(e) {
                ErrorHandler.capture('Modules.audio', e);
            }
        },
        
        hardware: function(win) {
            try {
                if (win.navigator && 'getBattery' in win.navigator) {
                    win.navigator.getBattery = function() {
                        return Promise.resolve({
                            charging: true,
                            level: 1,
                            addEventListener: function() {}
                        });
                    };
                }
                
                if (win.document && 'browsingTopics' in win.document) {
                    win.document.browsingTopics = function() {
                        return Promise.resolve([]);
                    };
                }
            } catch(e) {
                ErrorHandler.capture('Modules.hardware', e);
            }
        }
    };

    // ============================================================================
    // 注入系統
    // ============================================================================
    const inject = function(win) {
        try {
            if (win._FP_V2_DONE) return;
            Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false });
            
            Modules.canvas(win);
            
            const lazy = function() {
                Modules.audio(win);
                Modules.hardware(win);
            };
            
            if (win.requestIdleCallback) {
                win.requestIdleCallback(lazy);
            } else {
                setTimeout(lazy, 0);
            }
        } catch(e) {
            ErrorHandler.capture('inject', e);
        }
    };

    // ============================================================================
    // 初始化
    // ============================================================================
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
                            n.addEventListener('load', function() {
                                try { inject(n.contentWindow); } catch(e) {}
                            });
                        } catch(e) {}
                    }
                }
            }
        }).observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.__FP_METRICS__ = {
        version: CONFIG.ver,
        injections: { canvas: 0, audio: 0, font: 0, hardware: 0 },
        getErrors: function() { return ErrorHandler.getLogs(); }
    };
})();
</script>
`;

    // 注入邏輯
    if (REGEX.HEAD_TAG.test(body)) {
        body = body.replace(REGEX.HEAD_TAG, function(match) { return match + injection; });
    } else if (REGEX.HTML_TAG.test(body)) {
        body = body.replace(REGEX.HTML_TAG, function(match) { return match + injection; });
    }
    
    $done({ body: body, headers: headers });
})();
