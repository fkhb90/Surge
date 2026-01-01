/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.12 (Shadow DOM & Watchdog)
 * @description [v2.12] 針對頑固 SPA (如 ifanr) 採用 Shadow DOM 隔離 UI 樣式；新增看門狗計時器強制重生；檔案限制提升至 5MB。
 * @note      [FIX] 解決大型網站腳本未執行、UI 被網站 CSS 覆蓋或清除的問題。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    const CONFIG = {
        ver: '2.12',
        debug: false,
        isWhitelisted: false,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // [Config] 提升至 5MB 以應對大型科技媒體網站
    const CONST = { MAX_SIZE: 5000000, KEY_SEED: 'FP_SHIELD_SEED_V2' };
    
    const R = {
        PROTO: /^https?:\/\/([^/:]+)/i,
        HTML: /text\/html/i,
        CSP: /<meta[\s\S]*?http-equiv=["']Content-Security-Policy["'][\s\S]*?>/gi,
        APPS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
        TAGS: /<\/head>|<\/body>|<html[^>]*>|<!DOCTYPE html>/i // 擴展注入點
    };

    const $res = $response;
    const $req = $request;

    // --- Phase 1: Pre-flight ---
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }

    const headers = $res.headers;
    const getH = (k) => headers[k] || headers[k.toLowerCase()];
    
    if (parseInt(getH('content-length') || '0') > CONST.MAX_SIZE) { $done({}); return; }
    
    const cType = getH('content-type') || '';
    // 嚴格模式：僅處理 HTML，Raw Data 自動避讓
    if (cType && !R.HTML.test(cType)) { $done({}); return; }

    // UA & Whitelist
    const uaRaw = $req.headers['User-Agent'] || $req.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase();
    if (!ua || R.APPS.test(ua)) { $done({}); return; }

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

    // --- Phase 2: Injection Prep ---
    let body = $res.body;
    if (!body) { $done({}); return; }

    // CSP Removal
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    const headChunk = body.substring(0, 5000);
    if (R.CSP.test(headChunk)) {
        const newHead = headChunk.replace(R.CSP, '<!-- CSP REMOVED -->');
        body = newHead + body.substring(5000);
    }

    const injection = `
<script>
(function() {
    "use strict";
    const C = {
        v: '2.12',
        wl: ${CONFIG.isWhitelisted},
        ios: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // --- UI Module (Shadow DOM & Watchdog) ---
    const UI = {
        hostId: 'fp-shield-host',
        mount: () => {
            if (document.getElementById(UI.hostId)) return;

            // 1. 創建宿主元素
            const host = document.createElement('div');
            host.id = UI.hostId;
            host.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:2147483647; width:0; height:0;";
            
            // 2. 使用 Shadow DOM 隔離樣式 (防止被網站 CSS 影響)
            const shadow = host.attachShadow({mode: 'open'});
            
            const b = document.createElement('div');
            const color = C.wl ? 'rgba(100,100,100,0.8)' : 'rgba(0,100,0,0.9)';
            const text = C.wl ? '🛡️ FP Bypass' : '🛡️ FP Active';
            
            // 在 Shadow DOM 內部定義樣式
            b.style.cssText = \`
                background: \${color}; 
                color: white; 
                padding: 6px 12px; 
                border-radius: 6px; 
                font-size: 12px; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.5s;
                display: flex;
                align-items: center;
            \`;
            b.innerText = text;
            
            shadow.appendChild(b);
            (document.documentElement || document.body).appendChild(host);

            // Animation
            requestAnimationFrame(() => b.style.opacity = '1');
            const timeout = C.wl ? 2000 : 4000;
            setTimeout(() => { b.style.opacity = '0'; setTimeout(() => host.remove(), 500); }, timeout);
        },
        // 看門狗：主動檢查機制
        watchdog: () => {
            // 每 1.5 秒檢查一次 UI 是否存在 (針對頑固 SPA)
            // 僅在前 15 秒內執行，避免長期耗電
            let checks = 0;
            const interval = setInterval(() => {
                checks++;
                if (!document.getElementById(UI.hostId) && checks < 10) {
                    UI.mount();
                } else if (checks >= 10) {
                    clearInterval(interval);
                }
            }, 1500);
        }
    };

    const hookHistory = () => {
        const wrap = (t) => { const o=history[t]; return function(){ const r=o.apply(this,arguments); UI.mount(); return r; }; };
        history.pushState = wrap('pushState');
        history.replaceState = wrap('replaceState');
        window.addEventListener('popstate', () => UI.mount());
    };

    if (C.wl) {
        const run = () => { UI.mount(); hookHistory(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
        return;
    }

    // --- Core Protection ---
    const Seed = (() => {
        const K='FP_SHIELD_SEED_V2'; let s; try{s=sessionStorage}catch(e){s={}}
        let v=s.getItem?s.getItem(K):s[K];
        if(!v){v=(Math.floor(Math.random()*1e9)+Date.now()).toString();try{s.setItem(K,v)}catch(e){}}
        return parseInt(v,10);
    })();

    const Noise = (() => {
        const s=Seed; const m=C.ios?3.0:1.0;
        const r=(i)=>(Math.sin(i+s)*1e4)-Math.floor(Math.sin(i+s)*1e4);
        return {
            p: (d,w,h) => {
                const l=d.length; if(l<4)return;
                const off=Math.floor(r(100)*500); const den=Math.floor((Math.floor(r(200)*150)+50)*m);
                for(let i=0;i<l;i+=4) { const p=i>>2; if((p+off)%den===0) d[i]=Math.max(0,Math.min(255,d[i]+(r(p)>0.5?1:-1))); }
            },
            a: (d) => { for(let i=0;i<d.length;i+=100)d[i]+=(r(i)*1e-5); },
            f: (w) => w+(r(w)*0.04-0.02)
        };
    })();

    const CanvasPool = (() => {
        let _c,_x; return { get:(w,h)=>{
            if(!_c){_c=document.createElement('canvas');_x=_c.getContext('2d',{willReadFrequently:true});}
            if(_c.width<w)_c.width=w;if(_c.height<h)_c.height=h; return {c:_c,x:_x};
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
        cvs: (win) => {
            [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(c=>{
                if(c&&c.prototype){
                    ProxyGuard.override(c.prototype,'getImageData',(o)=>function(x,y,w,h){const r=o.apply(this,arguments);if(w<16||h<16)return r;Noise.p(r.data,w,h);return r;});
                    ProxyGuard.override(c.prototype,'measureText',(o)=>function(){const m=o.apply(this,arguments);try{const w=m.width;Object.defineProperty(m,'width',{get:()=>Noise.f(w)});}catch(e){}return m;});
                }
            });
            if(win.HTMLCanvasElement) ProxyGuard.override(win.HTMLCanvasElement.prototype,'toDataURL',(o)=>function(){
                const w=this.width,h=this.height; if(w<16||h<16)return o.apply(this,arguments);
                try{const{c,x}=CanvasPool.get(w,h);x.clearRect(0,0,w,h);x.drawImage(this,0,0);const d=x.getImageData(0,0,w,h);Noise.p(d.data,w,h);x.putImageData(d,0,0);return c.toDataURL.apply(c,arguments);}catch(e){return o.apply(this,arguments);}
            });
        },
        aud: (win) => {
            const AC=win.AudioContext||win.webkitAudioContext; const AB=win.AudioBuffer;
            if(AC&&AC.prototype)ProxyGuard.override(win.AnalyserNode.prototype,'getFloatFrequencyData',(o)=>function(a){const r=o.apply(this,arguments);for(let i=0;i<a.length;i+=10)a[i]+=((Math.random()*0.1)-0.05);return r;});
            if(AB&&AB.prototype)ProxyGuard.override(AB.prototype,'getChannelData',(o)=>function(){const d=o.apply(this,arguments);Noise.a(d);return d;});
        },
        hw: (win) => {
            if(win.navigator&&'getBattery'in win.navigator)win.navigator.getBattery=()=>Promise.resolve({charging:true,level:1,addEventListener:()=>{}});
            if(win.document&&'browsingTopics'in win.document)win.document.browsingTopics=()=>Promise.resolve([]);
        }
    };

    const inject = (win) => {
        try {
            if(win._FP_V2_DONE)return; Object.defineProperty(win,'_FP_V2_DONE',{value:true,enumerable:false});
            Modules.cvs(win); const l=()=>{Modules.aud(win);Modules.hw(win);};
            if(win.requestIdleCallback)win.requestIdleCallback(l);else setTimeout(l,0);
        } catch(e){}
    };

    const init = () => {
        inject(window); UI.mount(); UI.watchdog(); hookHistory();
        new MutationObserver((ms)=>{
            for(const m of ms) {
                for(const n of m.addedNodes) if(n.tagName==='IFRAME') try{if(n.contentWindow)inject(n.contentWindow);n.addEventListener('load',()=>{try{inject(n.contentWindow)}catch(e){}});}catch(e){}
                // MutationObserver 備份檢查：若 Host 被移除則立即重建
                if(m.type==='childList' && !document.getElementById(UI.hostId)) UI.mount();
            }
        }).observe(document.documentElement,{childList:true,subtree:true});
    };

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>
`;

    // 暴力注入邏輯：若找不到標準標籤，直接加在最後
    if (R.TAGS.test(body)) {
        if (body.includes('</head>')) body = body.replace('</head>', injection + '</head>');
        else if (body.includes('</body>')) body = body.replace('</body>', injection + '</body>');
        else body = injection + body; // 前置注入
    } else {
        body += injection; // 後置追加
    }
    
    $done({ body, headers });
})();

