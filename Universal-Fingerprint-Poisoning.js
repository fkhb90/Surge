/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.06 (Forced Raw Injection)
 * @description [v2.06] 解除 Raw Data 的防護限制，強制對純文字/JSON 頁面執行指紋混淆；UI 更新為 "Raw Active"。
 * @note      [SECURITY] 此模式會對封裝後的 Raw Data 注入 JS，若需下載原始數據請暫時關閉腳本。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    const CONFIG = {
        ver: '2.06',
        debug: false,
        isWhitelisted: false,
        isRawData: false, 
        showBadge: true,
        spoofNative: true,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        telemetry: true
    };

    // Zero-Overhead Logging
    const LOG = CONFIG.debug ? (msg) => console.log(`[FP-Shield] ${msg}`) : () => {};

    const CONST = { MAX_SIZE: 3000000, KEY_SEED: 'FP_SHIELD_SEED_V2' };
    const REGEX = {
        URL_PROTO: /^https?:\/\/([^/:]+)/i,
        CONTENT_TYPE_HTML: /text\/html/i,
        CONTENT_TYPE_TEXT: /text\/plain|application\/json|text\/xml/i,
        BINARY_ENCODING: /gzip|br|deflate|compress/i,
        APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
        META_CSP: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi
    };

    const $res = $response;
    const $req = $request;

    // --- Phase 1: Pre-flight Filter ---
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }

    const headers = $res.headers;
    const getHeader = (key) => headers[key] || headers[key.toLowerCase()];
    
    // Gzip/Binary Guard
    const cEncoding = getHeader('content-encoding');
    if (cEncoding && REGEX.BINARY_ENCODING.test(cEncoding)) { LOG(`Skip Encoded: ${cEncoding}`); $done({}); return; }

    const cLength = parseInt(getHeader('content-length') || '0');
    if (cLength > CONST.MAX_SIZE) { LOG('Skip Large File'); $done({}); return; }
    if (getHeader('upgrade') === 'websocket') { $done({}); return; }

    // Content-Type Analysis
    const cType = getHeader('content-type') || '';
    
    let shouldWrap = false;
    if (cType) {
        if (REGEX.CONTENT_TYPE_HTML.test(cType)) {
            // Standard HTML
        } else if (REGEX.CONTENT_TYPE_TEXT.test(cType)) {
            // Enable Wrapper for Raw Data
            shouldWrap = true;
            CONFIG.isRawData = true;
        } else {
            LOG(`Skip Type: ${cType}`); $done({}); return;
        }
    }

    // User-Agent Check
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const currentUA = (uaRaw || '').toLowerCase();
    if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

    // Whitelist Logic
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
        if (WHITELIST_EXACT.has(hostname)) CONFIG.isWhitelisted = true;
        else {
            for (let i = 0; i < WHITELIST_SUFFIX.length; i++) {
                if (hostname.endsWith(WHITELIST_SUFFIX[i])) { CONFIG.isWhitelisted = true; break; }
            }
        }
    }

    // --- Phase 2: Body Handling ---
    let body = $res.body;
    if (!body) { $done({}); return; }

    if (shouldWrap) {
        // Wrapper Logic
        const escapedBody = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        body = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:8px;font-family:monospace;word-wrap:break-word;white-space:pre-wrap;background-color:#fff;color:#000;"><pre>${escapedBody}</pre></body></html>`;
        
        headers['Content-Type'] = 'text/html; charset=utf-8';
        if (headers['content-type']) headers['content-type'] = 'text/html; charset=utf-8';
        delete headers['Content-Length'];
        delete headers['content-length'];
    } else {
        const startChars = body.substring(0, 20).trim();
        if (startChars.startsWith('{') || startChars.startsWith('[') || !startChars.includes('<')) { 
            if (!shouldWrap) { LOG('Skip Non-HTML Structure'); $done({}); return; }
        }
    }

    // --- Phase 3: Injection ---
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    if (!CONFIG.isRawData) {
        const headChunk = body.substring(0, 3000);
        if (REGEX.META_CSP.test(headChunk)) {
            body = headChunk.replace(REGEX.META_CSP, '<!-- CSP STRIPPED -->') + body.substring(3000);
        }
    }

    const injection = `
<script>
(function() {
    "use strict";
    const CONFIG = {
        ver: '2.06',
        isWhitelisted: ${CONFIG.isWhitelisted},
        isRawData: ${CONFIG.isRawData},
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // --- UI Module ---
    const UI = {
        showBadge: () => {
            const id = 'fp-shield-badge';
            if (document.getElementById(id)) return;
            const b = document.createElement('div');
            b.id = id;
            
            let color = 'rgba(0,100,0,0.9)'; // Default Green
            let text = '🛡️ FP Active';

            if (CONFIG.isWhitelisted) {
                color = 'rgba(100,100,100,0.8)'; // Grey
                text = '🛡️ FP Bypass';
            } else if (CONFIG.isRawData) {
                // [Modified] Change color to Deep Orange/Red to signify Active Protection on Raw Data
                color = 'rgba(204, 85, 0, 0.95)'; 
                text = '🛡️ Raw Active'; 
            }
            
            b.style.cssText = \`position:fixed; bottom:10px; left:10px; z-index:2147483647; background:\${color}; color:white; padding:6px 12px; border-radius:6px; font-size:12px; font-family:-apple-system, sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.3); pointer-events:none; opacity:0; transition: opacity 0.5s; display:flex; align-items:center;\`;
            b.innerText = text;
            
            (document.body || document.documentElement).appendChild(b);
            
            const timeout = CONFIG.isWhitelisted ? 2000 : 4000;
            requestAnimationFrame(() => b.style.opacity = '1');
            setTimeout(() => { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }, timeout);
        }
    };

    const hookHistory = () => {
        const wrap = (t) => { const o=history[t]; return function(){ const r=o.apply(this,arguments); UI.showBadge(); return r; }; };
        history.pushState = wrap('pushState'); history.replaceState = wrap('replaceState');
        window.addEventListener('popstate', () => UI.showBadge());
    };

    // [Modified] Only return early if Whitelisted. Raw Data now PROCEEDS to protection.
    if (CONFIG.isWhitelisted) {
        const run = () => { UI.showBadge(); hookHistory(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
        else run();
        return; 
    }

    // --- Core Protection (Runs for HTML & Raw Data) ---
    const Seed = (() => {
        const KEY = 'FP_SHIELD_SEED_V2';
        let s; try{s=sessionStorage}catch(e){s={}}
        let v = s.getItem?s.getItem(KEY):s[KEY];
        if(!v){v=(Math.floor(Math.random()*1e9)+Date.now()).toString();try{s.setItem(KEY,v)}catch(e){}}
        return parseInt(v,10);
    })();

    const Noise = (() => {
        const s = Seed;
        const dMod = CONFIG.isIOS ? 3.0 : 1.0;
        const rand = (i) => { const x=Math.sin(i+s)*10000; return x-Math.floor(x); };
        return {
            pixel: (d,w,h) => {
                const len=d.length; if(len<4)return;
                const off=Math.floor(rand(100)*500);
                const den=Math.floor((Math.floor(rand(200)*150)+50)*dMod);
                for(let i=0;i<len;i+=4) { const p=i>>2; if((p+off)%den===0) d[i]=Math.max(0,Math.min(255,d[i]+(rand(p)>0.5?1:-1))); }
            },
            audio: (d) => { for(let i=0;i<d.length;i+=100)d[i]+=(rand(i)*1e-5); },
            font: (w) => w+(rand(w)*0.04-0.02)
        };
    })();

    const CanvasPool = (() => {
        let _c=null,_x=null;
        return { get:(w,h)=>{
            if(!_c){_c=document.createElement('canvas');_x=_c.getContext('2d',{willReadFrequently:true});}
            if(_c.width<w)_c.width=w;if(_c.height<h)_c.height=h;
            return {canvas:_c,ctx:_x};
        }};
    })();

    const ProxyGuard = {
        protect: (n,c) => {
            const H=Symbol.for('FP_HOOKED'); if(n[H])return n;
            const ns=Function.prototype.toString.call(n);
            const p=new Proxy(c,{apply:(t,th,a)=>Reflect.apply(t,th,a),get:(t,k)=>{if(k==='toString')return ()=>ns;if(k===H)return true;return Reflect.get(t,k);}});
            return p;
        },
        override: (o,p,f) => {
            if(!o||!o[p])return; const orig=o[p]; const safe=f(orig); const prot=ProxyGuard.protect(orig,safe); prot.prototype=orig.prototype;
            try{Object.defineProperty(o,p,{value:prot,writable:true});}catch(e){try{o[p]=prot;}catch(e2){}}
        }
    };

    const Modules = {
        canvas: (win) => {
            [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(ctx=>{
                if(ctx&&ctx.prototype){
                    ProxyGuard.override(ctx.prototype,'getImageData',(o)=>function(x,y,w,h){const r=o.apply(this,arguments);if(w<16||h<16)return r;Noise.pixel(r.data,w,h);return r;});
                    ProxyGuard.override(ctx.prototype,'measureText',(o)=>function(){const m=o.apply(this,arguments);try{const w=m.width;Object.defineProperty(m,'width',{get:()=>Noise.font(w)});}catch(e){}return m;});
                }
            });
            if(win.HTMLCanvasElement) ProxyGuard.override(win.HTMLCanvasElement.prototype,'toDataURL',(o)=>function(){
                const w=this.width,h=this.height; if(w<16||h<16)return o.apply(this,arguments);
                try{const{canvas,ctx}=CanvasPool.get(w,h);ctx.clearRect(0,0,w,h);ctx.drawImage(this,0,0);const d=ctx.getImageData(0,0,w,h);Noise.pixel(d.data,w,h);ctx.putImageData(d,0,0);return canvas.toDataURL.apply(canvas,arguments);}catch(e){return o.apply(this,arguments);}
            });
        },
        audio: (win) => {
            const AC=win.AudioContext||win.webkitAudioContext; const AB=win.AudioBuffer;
            if(AC&&AC.prototype)ProxyGuard.override(win.AnalyserNode.prototype,'getFloatFrequencyData',(o)=>function(a){const r=o.apply(this,arguments);for(let i=0;i<a.length;i+=10)a[i]+=((Math.random()*0.1)-0.05);return r;});
            if(AB&&AB.prototype)ProxyGuard.override(AB.prototype,'getChannelData',(o)=>function(){const d=o.apply(this,arguments);Noise.audio(d);return d;});
        },
        hardware: (win) => {
            if(win.navigator&&'getBattery'in win.navigator)win.navigator.getBattery=()=>Promise.resolve({charging:true,level:1,addEventListener:()=>{}});
            if(win.document&&'browsingTopics'in win.document)win.document.browsingTopics=()=>Promise.resolve([]);
        }
    };

    const inject = (win) => {
        try {
            if(win._FP_V2_DONE)return; Object.defineProperty(win,'_FP_V2_DONE',{value:true,enumerable:false});
            Modules.canvas(win);
            const lazy=()=>{Modules.audio(win);Modules.hardware(win);};
            if(win.requestIdleCallback)win.requestIdleCallback(lazy);else setTimeout(lazy,0);
        } catch(e){}
    };

    const init = () => {
        inject(window); UI.showBadge(); hookHistory();
        new MutationObserver((ms)=>{for(const m of ms)for(const n of m.addedNodes)if(n.tagName==='IFRAME')try{if(n.contentWindow)inject(n.contentWindow);n.addEventListener('load',()=>{try{inject(n.contentWindow)}catch(e){}});}catch(e){}})
        .observe(document.documentElement,{childList:true,subtree:true});
    };

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
    window.__FP_METRICS__ = { injections: { canvas: 0, audio: 0, font: 0, screen: 0, webgl: 0 } };
})();
</script>
`;

    if (CONFIG.isRawData) {
        // [Modified] Ensure injection runs at the end of the constructed body
        body = body.replace('</body>', injection + '</body>');
    } else {
        if (REGEX.HEAD_TAG.test(body)) body = body.replace(REGEX.HEAD_TAG, match => match + injection);
        else if (REGEX.HTML_TAG.test(body)) body = body.replace(REGEX.HTML_TAG, match => match + injection);
    }
    
    $done({ body, headers });
})();

