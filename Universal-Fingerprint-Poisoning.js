/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.14 (Prefix Brute-Force)
 * @description [v2.14] 終極手段：採用「前綴暴力注入」策略，將腳本強制置於回應最頂端，無視 HTML 結構與截斷問題。
 * @note      [CRITICAL] 若此版本仍無效，請務必檢查 Surge 的 MITM Host 列表是否包含目標網域。
 * @author    Claude & Gemini
 */

(function() {
    "use strict";

    const CONFIG = {
        ver: '2.14',
        debug: false, // 若需診斷請開啟
        isWhitelisted: false,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // [Config] 嘗試推至系統極限
    const CONST = { MAX_SIZE: 10485760, KEY_SEED: 'FP_SHIELD_SEED_V2' }; // 10MB
    
    const R = {
        PROTO: /^https?:\/\/([^/:]+)/i,
        HTML: /text\/html/i,
        APPS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
        CSP: /<meta[\s\S]*?http-equiv=["']Content-Security-Policy["'][\s\S]*?>/gi
    };

    const $res = $response;
    const $req = $request;

    // --- Phase 1: Minimal Pre-flight ---
    // 僅保留絕對必要的跳過條件，其餘全部嘗試注入
    if ($res.status === 206 || $res.status === 204) { $done({}); return; }

    const headers = $res.headers;
    const getH = (k) => headers[k] || headers[k.toLowerCase()];
    
    // 如果內容長度超過 10MB，系統記憶體會爆，必須跳過
    if (parseInt(getH('content-length') || '0') > CONST.MAX_SIZE) { $done({}); return; }
    
    // 嚴格檢查：必須是 HTML，避免破壞圖片或二進位檔
    const cType = getH('content-type') || '';
    if (cType && !R.HTML.test(cType)) { $done({}); return; }

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

    // --- Phase 2: Injection ---
    let body = $res.body;
    if (!body) { $done({}); return; }

    // CSP Removal
    const cspKeys = ['Content-Security-Policy', 'content-security-policy', 'X-Content-Security-Policy', 'X-WebKit-CSP', 'Content-Security-Policy-Report-Only'];
    cspKeys.forEach(k => delete headers[k]);

    // 嘗試移除 Meta CSP (僅掃描前 10KB)
    const headChunk = body.substring(0, 10240);
    if (R.CSP.test(headChunk)) {
        const newHead = headChunk.replace(R.CSP, '<!-- CSP REMOVED -->');
        body = newHead + body.substring(10240);
    }

    const injection = `
<script>
(function() {
    "use strict";
    const C = {
        v: '2.14',
        wl: ${CONFIG.isWhitelisted},
        ios: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    };

    // --- UI Module (Resilient Shadow DOM) ---
    const UI = {
        hostId: 'fp-root-' + Math.random().toString(36).substr(2, 5), // 隨機 ID 避免被特定 CSS 鎖定
        mount: () => {
            // 防止重複掛載
            if (document.querySelector('[id^="fp-root-"]')) return;

            const host = document.createElement('div');
            host.id = UI.hostId;
            // 使用最高權重的樣式重置
            host.style.cssText = "all: initial; position: fixed; bottom: 10px; left: 10px; z-index: 2147483647; width: 0; height: 0; contain: strict; display: block !important; visibility: visible !important;";
            
            let root;
            try { root = host.attachShadow({mode: 'closed'}); } catch(e) { root = host; } 
            
            const b = document.createElement('div');
            const color = C.wl ? 'rgba(100,100,100,0.8)' : 'rgba(0,100,0,0.9)';
            const text = C.wl ? '🛡️ FP Bypass' : '🛡️ FP Active';
            
            b.style.cssText = \`
                background: \${color}; 
                color: white; 
                padding: 6px 12px; 
                border-radius: 6px; 
                font-size: 12px; 
                font-family: system-ui, -apple-system, sans-serif; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.5s;
                display: flex;
                align-items: center;
                user-select: none;
                -webkit-user-select: none;
                margin: 0;
            \`;
            b.innerText = text;
            
            root.appendChild(b);
            
            // 嘗試掛載到 HTML 根節點，若失敗則掛載到 Body，再失敗則掛載到 Head (極限)
            const parent = document.documentElement || document.body || document.head;
            if(parent) parent.appendChild(host);

            requestAnimationFrame(() => b.style.opacity = '1');
            const timeout = C.wl ? 2000 : 4000;
            setTimeout(() => { b.style.opacity = '0'; setTimeout(() => host.remove(), 500); }, timeout);
        },
        watchdog: () => {
            // 極限看門狗：頁面載入後持續檢查 10 秒
            let c = 0;
            const t = setInterval(() => {
                c++;
                const el = document.querySelector('[id^="fp-root-"]');
                if (!el && (document.body || document.documentElement)) UI.mount();
                if (c > 20) clearInterval(t); // 10秒後停止 (500ms * 20)
            }, 500);
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
                if(m.type==='childList' && !document.querySelector('[id^="fp-root-"]')) UI.mount();
            }
        }).observe(document.documentElement,{childList:true,subtree:true});
    };

    // 暴力執行：不等 DOMContentLoaded，直接跑
    init();
})();
</script>
`;

    // [Nuclear Option] Prefix Brute-Force Injection
    // 直接將腳本串接到 Body 最前面，不管原本內容是什麼
    // 瀏覽器會先執行腳本，再渲染原本的 DOCTYPE 和 HTML
    body = injection + body;
    
    $done({ body, headers });
})();

