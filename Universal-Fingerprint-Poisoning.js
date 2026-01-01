/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.08 (Visual Monitor Mode)
 * @description [v2.08] Raw Data 模式僅保留「橘色盾牌」視覺回饋，移除所有指紋混淆邏輯（保持數據純淨）。
 * @note      [WARN] 顯示盾牌仍需封裝 HTML，若遇 API 報錯請將 rawMonitorMode 改為 false。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    const CONFIG = {
        ver: '2.08',
        debug: false,
        // [控制開關] true: 封裝 Raw Data 並顯示盾牌 (無雜訊) | false: 完全忽略 (安全模式)
        rawMonitorMode: true, 
        isWhitelisted: false,
        isRawMode: false,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    const LOG = CONFIG.debug ? (msg) => console.log(`[FP-Shield] ${msg}`) : () => {};
    const CONST = { MAX_SIZE: 3000000, KEY_SEED: 'FP_SHIELD_SEED_V2' };
    
    // Regex Definitions
    const R = {
        PROTO: /^https?:\/\/([^/:]+)/i,
        HTML: /text\/html/i,
        // 擴展支援顯示盾牌的類型
        RAW: /text\/plain|application\/json|text\/xml|application\/xml/i,
        BIN: /gzip|br|deflate|compress/i,
        APPS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
        CSP: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi
    };

    const $res = $response;
    const $req = $request;

    // --- Phase 1: Pre-flight ---
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }

    const headers = $res.headers;
    const getH = (k) => headers[k] || headers[k.toLowerCase()];
    
    // Gzip Guard
    const cEnc = getH('content-encoding');
    if (cEnc && R.BIN.test(cEnc)) { LOG(`Skip Encoded`); $done({}); return; }

    const cLen = parseInt(getH('content-length') || '0');
    if (cLen > CONST.MAX_SIZE) { LOG('Skip Large'); $done({}); return; }
    if (getH('upgrade') === 'websocket') { $done({}); return; }

    // Content-Type Logic
    const cType = getH('content-type') || '';
    let doWrap = false;

    if (cType) {
        if (R.HTML.test(cType)) {
            // HTML -> Proceed
        } else if (CONFIG.rawMonitorMode && R.RAW.test(cType)) {
            // Raw Data -> Wrap for Visual Monitor
            doWrap = true;
            CONFIG.isRawMode = true;
        } else {
            LOG(`Skip Type: ${cType}`); $done({}); return;
        }
    }

    // UA Check
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase();
    if (!ua || R.APPS.test(ua)) { $done({}); return; }

    // Whitelist Logic
    const match = $req.url.match(R.PROTO);
    const host = match ? match[1].toLowerCase() : '';
    const WL_EXACT = new Set([
        "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
        "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
        "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com",
        "google.com", "youtube.com", "facebook.com", "instagram.com", "netflix.com", "spotify.com",
        "cdn.ghostery.com"
    ]);
    const WL_SUFFIX = [
        "gov.tw", "org.tw", "edu.tw", "bank", "pay.taipei", "bot.com.tw", "cathaybk.com.tw", "ctbcbank.com", 
        "esunbank.com.tw", "fubon.com", "richart.tw", "taishinbank.com.tw", "apple.com", "microsoft.com", 
        "aws.amazon.com", "shopee.tw", "shopee.com", "jkos.com", "ecpay.com.tw"
    ];

    if (host) {
        if (WL_EXACT.has(host)) CONFIG.isWhitelisted = true;
        else {
            for (let i = 0; i < WL_SUFFIX.length; i++) {
                if (host.endsWith(WL_SUFFIX[i])) { CONFIG.isWhitelisted = true; break; }
            }
        }
    }

    // --- Phase 2: Body Construction ---
    let body = $res.body;
    if (!body) { $done({}); return; }

    const injectionScript = `
<script>
(function() {
    "use strict";
    const C = {
        v: '2.08',
        wl: ${CONFIG.isWhitelisted},
        raw: ${CONFIG.isRawMode},
        ios: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };
    
    // UI Module
    const UI = {
        badge: () => {
            const id = 'fp-s-b'; if(document.getElementById(id))return;
            const b = document.createElement('div'); b.id = id;
            let bg = 'rgba(0,100,0,0.9)'; let txt = '🛡️ FP Active';
            
            if(C.wl) { bg='rgba(100,100,100,0.8)'; txt='🛡️ FP Bypass'; }
            else if(C.raw) { 
                // [Visual Update] Orange indicates Monitor Mode (No Injection)
                bg='rgba(204,85,0,0.95)'; txt='🛡️ Raw Monitor'; 
            } 
            
            b.style.cssText = \`position:fixed;bottom:10px;left:10px;z-index:2147483647;background:\${bg};color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;font-family:system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.5s;display:flex;pointer-events:none;\`;
            b.innerText = txt;
            (document.body||document.documentElement).appendChild(b);
            
            requestAnimationFrame(()=>b.style.opacity='1');
            const t = C.wl ? 2000 : (C.raw ? 5000 : 4000);
            setTimeout(()=>{b.style.opacity='0';setTimeout(()=>b.remove(),500)}, t);
        }
    };

    const Hist = () => {
        const w = (k) => { const o=history[k]; return function(){ const r=o.apply(this,arguments); UI.badge(); return r; }};
        history.pushState=w('pushState'); history.replaceState=w('replaceState');
        window.addEventListener('popstate', ()=>UI.badge());
    };

    // [Mode Check]
    // 1. Whitelist: Show Badge -> Exit
    // 2. Raw Mode: Show Badge -> Exit (REVERTED FORCED INJECTION)
    if(C.wl || C.raw) {
        const run = ()=>{UI.badge(); if(!C.raw) Hist();};
        if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run); else run();
        return; // Stop here, do not load noise modules
    }

    // --- Core Protection (Only for Standard HTML) ---
    const Seed = (() => {
        const K='FP_S_SEED'; let s; try{s=sessionStorage}catch(e){s={}}
        let v=s.getItem?s.getItem(K):s[K];
        if(!v){v=(Math.floor(Math.random()*1e9)+Date.now()).toString();try{s.setItem(K,v)}catch(e){}}
        return parseInt(v,10);
    })();

    const Noise = (() => {
        const s=Seed; const m=C.ios?3.0:1.0;
        const r=(i)=>(Math.sin(i+s)*1e4)-Math.floor(Math.sin(i+s)*1e4);
        return {
            p: (d)=>{
                const l=d.length; if(l<4)return;
                const off=Math.floor(r(100)*500); const den=Math.floor((Math.floor(r(200)*150)+50)*m);
                for(let i=0;i<l;i+=4) { const p=i>>2; if((p+off)%den===0) d[i]=Math.max(0,Math.min(255,d[i]+(r(p)>0.5?1:-1))); }
            },
            a: (d)=>{ for(let i=0;i<d.length;i+=100)d[i]+=(r(i)*1e-5); },
            f: (w)=>w+(r(w)*0.04-0.02)
        };
    })();

    const CP = (() => {
        let c,x; return {g:(w,h)=>{
            if(!c){c=document.createElement('canvas');x=c.getContext('2d',{willReadFrequently:true});}
            if(c.width<w)c.width=w;if(c.height<h)c.height=h; return {c,x};
        }};
    })();

    const PG = {
        p: (n,f) => {
            const S=Symbol.for('FP_H'); if(n[S])return n;
            const ns=Function.prototype.toString.call(n);
            const p=new Proxy(f,{apply:(t,th,a)=>Reflect.apply(t,th,a),get:(t,k)=>{if(k==='toString')return ()=>ns;if(k===S)return true;return Reflect.get(t,k);}});
            return p;
        },
        o: (o,k,f) => {
            if(!o||!o[k])return; const orig=o[k]; const wrap=f(orig); const prot=PG.p(orig,wrap); prot.prototype=orig.prototype;
            try{Object.defineProperty(o,k,{value:prot,writable:true});}catch(e){try{o[k]=prot}catch(z){}}
        }
    };

    const Mods = {
        cvs: (w) => {
            [w.CanvasRenderingContext2D, w.OffscreenCanvasRenderingContext2D].forEach(c=>{
                if(c&&c.prototype){
                    PG.o(c.prototype,'getImageData',(o)=>function(x,y,w,h){const r=o.apply(this,arguments);if(w<16||h<16)return r;Noise.p(r.data);return r;});
                    PG.o(c.prototype,'measureText',(o)=>function(){const m=o.apply(this,arguments);try{const w=m.width;Object.defineProperty(m,'width',{get:()=>Noise.f(w)});}catch(e){}return m;});
                }
            });
            if(w.HTMLCanvasElement) PG.o(w.HTMLCanvasElement.prototype,'toDataURL',(o)=>function(){
                const wh=this.width,ht=this.height; if(wh<16||ht<16)return o.apply(this,arguments);
                try{const{c,x}=CP.g(wh,ht);x.clearRect(0,0,wh,ht);x.drawImage(this,0,0);const d=x.getImageData(0,0,wh,ht);Noise.p(d.data);x.putImageData(d,0,0);return c.toDataURL.apply(c,arguments);}catch(e){return o.apply(this,arguments);}
            });
        },
        aud: (w) => {
            const AC=w.AudioContext||w.webkitAudioContext; const AB=w.AudioBuffer;
            if(AC&&AC.prototype)PG.o(w.AnalyserNode.prototype,'getFloatFrequencyData',(o)=>function(a){const r=o.apply(this,arguments);for(let i=0;i<a.length;i+=10)a[i]+=((Math.random()*0.1)-0.05);return r;});
            if(AB&&AB.prototype)PG.o(AB.prototype,'getChannelData',(o)=>function(){const d=o.apply(this,arguments);Noise.a(d);return d;});
        },
        hw: (w) => {
            if(w.navigator&&'getBattery'in w.navigator)w.navigator.getBattery=()=>Promise.resolve({charging:true,level:1,addEventListener:()=>{}});
            if(w.document&&'browsingTopics'in w.document)w.document.browsingTopics=()=>Promise.resolve([]);
        }
    };

    const run = (w) => {
        try {
            if(w._FP_DONE)return; Object.defineProperty(w,'_FP_DONE',{value:true,enumerable:false});
            Mods.cvs(w); const l=()=>{Mods.aud(w);Mods.hw(w);};
            if(w.requestIdleCallback)w.requestIdleCallback(l);else setTimeout(l,0);
        } catch(e){}
    };
    
    const boot = () => {
        run(window); UI.badge(); Hist();
        new MutationObserver((ms)=>{for(const m of ms)for(const n of m.addedNodes)if(n.tagName==='IFRAME')try{if(n.contentWindow)run(n.contentWindow);n.addEventListener('load',()=>{try{run(n.contentWindow)}catch(e){}});}catch(e){}})
        .observe(document.documentElement,{childList:true,subtree:true});
    };
    
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
</script>
`;

    if (doWrap) {
        // Raw Data Monitor Mode: Wrap HTML but NO Noise Injection in script above
        const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        body = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff;color:#000;"><pre style="word-wrap:break-word;white-space:pre-wrap;">${esc(body)}</pre>${injectionScript}</body></html>`;
        
        headers['Content-Type'] = 'text/html; charset=utf-8';
        if (headers['content-type']) headers['content-type'] = 'text/html; charset=utf-8';
        delete headers['Content-Length'];
        delete headers['content-length'];
    } else {
        // Standard Mode: Full Protection
        const headChunk = body.substring(0, 3000);
        if (R.CSP.test(headChunk)) {
            body = headChunk.replace(R.CSP, '<!-- CSP STRIPPED -->') + body.substring(3000);
        }
        
        if (R.PROTO.test(body)) { /* skip logic for very raw non-html */ }
        
        // Simple Injection
        const hasHead = body.indexOf('</head>');
        const hasBody = body.indexOf('</body>');
        if(hasHead > -1) body = body.substring(0, hasHead) + injectionScript + body.substring(hasHead);
        else if(hasBody > -1) body = body.substring(0, hasBody) + injectionScript + body.substring(hasBody);
        else body += injectionScript;
    }
    
    $done({ body, headers });
})();

