/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.02 (Stable Rollback)
 * @description [v2.02] 回退至穩定版本：包含 Meta CSP 移除、SPA 路由監聽、白名單灰色盾牌；移除 Raw Data 強制封裝邏輯以確保 API 相容性。
 * @note      [INFO] 此版本在純文字頁面 (如 NextDNS ping) 不會顯示盾牌，此為正常安全避讓。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    // ============================================================================
    // 0. 全局設定與正則
    // ============================================================================
    const CONST = {
        MAX_SIZE: 3000000,
        KEY_SEED: 'FP_SHIELD_SEED_V2'
    };

    const REGEX = {
        URL_PROTO: /^https?:\/\/([^/:]+)/i,
        CONTENT_TYPE: /text\/html/i,
        HEAD_TAG: /<head>/i,
        HTML_TAG: /<html[^>]*>/i,
        // 針對 HTML 內嵌 CSP 的移除正則
        META_CSP: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, 
        APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i
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
    if (parseInt(normalizedHeaders['content-length'] || '0') > CONST.MAX_SIZE) { $done({}); return; }

    const cType = normalizedHeaders['content-type'] || '';
    // 嚴格檢查 Content-Type，非 HTML 直接放行 (Raw Data 不顯示盾牌)
    if (cType && !REGEX.CONTENT_TYPE.test(cType)) { $done({}); return; }

    // ============================================================================
    // 2. 白名單邏輯 (視覺化狀態)
    // ============================================================================
    let isWhitelisted = false;
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const currentUA = (uaRaw || '').toLowerCase();

    if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

    const match = $req.url.match(REGEX.URL_PROTO);
    const hostname = match ? match[1].toLowerCase() : '';

    const WHITELIST_EXACT = new Set([
        "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
        "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
        "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com",
        "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
        "cdn.ghostery.com"
    ]);

    const WHITELIST_SUFFIX = [
        "gov.tw", "org.tw", "edu.tw", "bank", "pay.taipei", "bot.com.tw", "cathaybk.com.tw", "ctbcbank.com", 
        "esunbank.com.tw", "fubon.com", "richart.tw", "taishinbank.com.tw", "apple.com", "microsoft.com", 
        "aws.amazon.com", "shopee.tw", "shopee.com", "jkos.com", "ecpay.com.tw"
    ];

    if (hostname) {
        if (WHITELIST_EXACT.has(hostname)) isWhitelisted = true;
        else {
            for (let i = 0; i < WHITELIST_SUFFIX.length; i++) {
                if (hostname.endsWith(WHITELIST_SUFFIX[i])) { isWhitelisted = true; break; }
            }
        }
    }

    // ============================================================================
    // 3. 注入邏輯
    // ============================================================================
    let body = $res.body;
    if (!body) { $done({}); return; }

    // 再次檢查 Body 結構，確保不破壞 JSON API
    const startChars = body.substring(0, 20).trim();
    if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) { $done({}); return; }

    // 移除 Header CSP
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    // 移除 Body Meta CSP
    const headChunk = body.substring(0, 3000);
    if (REGEX.META_CSP.test(headChunk)) {
        const newHead = headChunk.replace(REGEX.META_CSP, '<!-- CSP STRIPPED -->');
        body = newHead + body.substring(3000);
    }

    // 構建注入腳本
    const injection = `
<script>
(function() {
    "use strict";
    const CONFIG = {
        ver: '2.02',
        isWhitelisted: ${isWhitelisted},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // --- UI Module ---
    const UI = {
        showBadge: () => {
            const id = 'fp-shield-badge';
            if (document.getElementById(id)) return;

            const b = document.createElement('div');
            b.id = id;
            // 綠色: 啟用防護 | 灰色: 白名單略過
            const color = CONFIG.isWhitelisted ? 'rgba(100,100,100,0.8)' : 'rgba(0,100,0,0.9)';
            const text = CONFIG.isWhitelisted ? '🛡️ FP Bypass' : '🛡️ FP Active';
            
            b.style.cssText = \`position:fixed; bottom:10px; left:10px; z-index:2147483647; background:\${color}; color:white; padding:6px 12px; border-radius:6px; font-size:12px; font-family:-apple-system, sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); pointer-events:none; opacity:0; transition: opacity 0.5s; display:flex; align-items:center;\`;
            b.innerText = text;
            
            (document.body || document.documentElement).appendChild(b);
            
            requestAnimationFrame(() => b.style.opacity = '1');
            const timeout = CONFIG.isWhitelisted ? 2000 : 4000;
            setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }, timeout);
        }
    };

    // SPA 路由監聽
    const hookHistory = () => {
        const wrap = (type) => {
            const orig = history[type];
            return function() {
                const rv = orig.apply(this, arguments);
                UI.showBadge(); 
                return rv;
            };
        };
        history.pushState = wrap('pushState');
        history.replaceState = wrap('replaceState');
        window.addEventListener('popstate', () => UI.showBadge());
    };

    // 白名單模式：僅顯示灰色盾牌後退出
    if (CONFIG.isWhitelisted) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { UI.showBadge(); hookHistory(); });
        else { UI.showBadge(); hookHistory(); }
        return;
    }

    // --- 核心防護 (僅在非白名單執行) ---
    const Seed = (() => {
        const KEY = 'FP_SHIELD_SEED_V2';
        let store; try { store = sessionStorage; } catch(e){ store = {}; }
        let val = store.getItem ? store.getItem(KEY) : store[KEY];
        if(!val) { val = (Math.floor(Math.random()*1e9)+Date.now()).toString(); try{ store.setItem(KEY,val); }catch(e){} }
        return parseInt(val, 10);
    })();

    const Noise = (() => {
        const seed = Seed;
        const densityMod = CONFIG.isIOS ? 3.0 : 1.0;
        const rand = (i) => { const x = Math.sin(i + seed) * 10000; return x - Math.floor(x); };
        return {
            pixel: (data, w, h) => {
                const len = data.length;
                if(len < 4) return;
                const offset = Math.floor(rand(100) * 500);
                const density = Math.floor((Math.floor(rand(200) * 150) + 50) * densityMod);
                for(let i=0; i<len; i+=4) {
                    const pIdx = i>>2;
                    if((pIdx + offset) % density === 0) data[i] = Math.max(0, Math.min(255, data[i] + (rand(pIdx)>0.5?1:-1)));
                }
            },
            audio: (data) => { for(let i=0; i<data.length; i+=100) data[i] += (rand(i) * 1e-5); },
            font: (w) => w + (rand(w) * 0.04 - 0.02)
        };
    })();

    const CanvasPool = (() => {
        let _c = null, _ctx = null;
        return { get: (w,h) => {
            if(!_c) { _c = document.createElement('canvas'); _ctx = _c.getContext('2d', {willReadFrequently:true}); }
            if(_c.width<w)_c.width=w; if(_c.height<h)_c.height=h;
            return {canvas:_c, ctx:_ctx};
        }};
    })();

    const ProxyGuard = {
        protect: (native, custom) => {
            const HOOK_MARK = Symbol.for('FP_HOOKED');
            if(native[HOOK_MARK]) return native;
            const nativeStr = Function.prototype.toString.call(native);
            const p = new Proxy(custom, {
                apply: (t,th,a) => Reflect.apply(t,th,a),
                get: (t,k) => { if(k==='toString') return ()=>nativeStr; if(k===HOOK_MARK) return true; return Reflect.get(t,k); }
            });
            return p;
        },
        override: (o,p,f) => {
            if(!o||!o[p]) return;
            const orig = o[p];
            const safe = f(orig);
            const prot = ProxyGuard.protect(orig, safe);
            prot.prototype = orig.prototype;
            try { Object.defineProperty(o,p,{value:prot,writable:true}); } catch(e){ try{o[p]=prot;}catch(e2){} }
        }
    };

    const Modules = {
        canvas: (win) => {
            const contexts = [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D];
            contexts.forEach(ctx => {
                if(ctx && ctx.prototype) {
                    ProxyGuard.override(ctx.prototype, 'getImageData', (orig) => function(x,y,w,h) {
                        const res = orig.apply(this, arguments);
                        if(w<16||h<16) return res;
                        Noise.pixel(res.data, w, h);
                        return res;
                    });
                    ProxyGuard.override(ctx.prototype, 'measureText', (orig) => function() {
                        const m = orig.apply(this, arguments);
                        try { const w = m.width; Object.defineProperty(m,'width',{get:()=>Noise.font(w)}); } catch(e){}
                        return m;
                    });
                }
            });
            if(win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() {
                    const w=this.width, h=this.height;
                    if(w<16||h<16) return orig.apply(this, arguments);
                    try {
                        const {canvas, ctx} = CanvasPool.get(w,h);
                        ctx.clearRect(0,0,w,h); ctx.drawImage(this,0,0);
                        const id = ctx.getImageData(0,0,w,h); Noise.pixel(id.data,w,h); ctx.putImageData(id,0,0);
                        return canvas.toDataURL.apply(canvas, arguments);
                    } catch(e) { return orig.apply(this, arguments); }
                });
            }
        },
        audio: (win) => {
            const AC = win.AudioContext || win.webkitAudioContext;
            const AB = win.AudioBuffer;
            if(AC && AC.prototype) ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig)=>function(a){
                const r=orig.apply(this,arguments); for(let i=0;i<a.length;i+=10)a[i]+=((Math.random()*0.1)-0.05); return r;
            });
            if(AB && AB.prototype) ProxyGuard.override(AB.prototype, 'getChannelData', (orig)=>function(){
                const d=orig.apply(this,arguments); Noise.audio(d); return d;
            });
        },
        hardware: (win) => {
            if(win.navigator && 'getBattery' in win.navigator) win.navigator.getBattery = () => Promise.resolve({charging:true,level:1,addEventListener:()=>{}});
            if(win.document && 'browsingTopics' in win.document) win.document.browsingTopics = () => Promise.resolve([]);
        }
    };

    const inject = (win) => {
        try {
            if(win._FP_V2_DONE) return;
            Object.defineProperty(win,'_FP_V2_DONE',{value:true,enumerable:false});
            Modules.canvas(win);
            const lazy = () => { Modules.audio(win); Modules.hardware(win); };
            if(win.requestIdleCallback) win.requestIdleCallback(lazy); else setTimeout(lazy,0);
        } catch(e){}
    };

    const init = () => {
        inject(window); UI.showBadge(); hookHistory();
        new MutationObserver((ms)=>{
            for(const m of ms) for(const n of m.addedNodes) if(n.tagName==='IFRAME') {
                try{ if(n.contentWindow)inject(n.contentWindow); n.addEventListener('load',()=>{try{inject(n.contentWindow)}catch(e){}}); }catch(e){}
            }
        }).observe(document.documentElement, {childList:true, subtree:true});
    };

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.__FP_METRICS__ = { injections: { canvas: 0, audio: 0, font: 0, screen: 0, webgl: 0 } };
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


