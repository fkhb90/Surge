/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.29-Hotfix-Feedly
 * @author    Jerry's AI Assistant
 * @updated   2026-01-10
 * ----------------------------------------------------------------------------
 * [V10.29 緊急修復版]:
 * 1) [FIX] 針對 Feedly 無法開啟 (Stuck on Loading) 問題進行修復。
 * - 新增 "feedly" 至白名單，防止 Worker 注入導致應用程式死鎖。
 * 2) [MAINTENANCE] 預防性加入部分高敏感 SPA 服務 (Discord, Telegram Web)。
 * 3) [CORE] 維持 V10.28 的全字串匹配邏輯與效能優化核心。
 */

(function () {
  "use strict";

  // --- Layer 0: The Kill Switch (Shopping Mode) ---
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // --- Layer 1: Config & Seed ---
  const CONST = {
    KEY: "FP_SHIELD_ID_V1014", 
    MARKER: "__FP_SHIELD_INJECTED__",
    NOISE_STEP: 4 
  };

  const SEED = (function () {
    const now = Date.now();
    let s = 12345;
    try {
      const stored = localStorage.getItem(CONST.KEY);
      if (stored) {
        const [val, exp] = stored.split("|");
        if (now < parseInt(exp, 10)) s = parseInt(val, 10);
        else {
          s = (now ^ (Math.random() * 1e8)) >>> 0;
          localStorage.setItem(CONST.KEY, `${s}|${now + 2592000000}`);
        }
      } else {
        s = (now ^ (Math.random() * 1e8)) >>> 0;
        localStorage.setItem(CONST.KEY, `${s}|${now + 2592000000}`);
      }
    } catch (e) {}
    return s;
  })();

  // --- Layer 2: Hardened Whitelist (Includes Feedly Hotfix) ---
  const EXCLUDES = [
    // 1. Identity & Cloud Infra
    "accounts.google", "appleid.apple", "icloud.com", 
    "login.live.com", "microsoft.com", "sso", "oauth", 
    "recaptcha", "turnstile", "hcaptcha", "arkoselabs",
    
    // 2. Taiwan Banking & Gov
    "ctbc", "cathay", "esun", "fubon", "taishin", "megabank", 
    "landbank", "firstbank", "sinopac", "post.gov", "gov.tw",
    
    // 3. Payment Gateways
    "paypal", "stripe", "ecpay", "line.me", "jkos", "opay",
    
    // 4. Content & Social Apps (Complex SPA)
    "feedly", // [HOTFIX V10.29]
    "discord", "telegram", "slack", // [PREVENTIVE]
    "shopee", "momo", "pchome", "books.com", "coupang", 
    "uber", "foodpanda", "netflix", "spotify", "youtube",
    
    // 5. AI Services
    "openai", "chatgpt", "claude", "gemini", "bing", "perplexity"
  ];

  const url = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  
  // O(1) Fast Check
  if (EXCLUDES.some(k => url.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // --- Layer 3: Request Phase Skip ---
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    $done({});
    return;
  }

  // --- Layer 4: HTML Injection ---
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body) { $done({}); return; }

    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    if (!ct.includes("text/html")) { $done({}); return; }

    const chunk = body.substring(0, 3000);
    if (chunk.includes(CONST.MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    
    const m = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i);
    const nonce = m ? m[1] : "";
    
    if ((csp && !csp.includes("'unsafe-inline'")) && !nonce) { $done({}); return; }

    const INJECT_CFG = { s: SEED, step: CONST.NOISE_STEP };

    const MODULE = `
    (function(w) {
      const C = ${JSON.stringify(INJECT_CFG)};
      const imul = Math.imul || function(a, b) { return (a * b) | 0; };
      const hash = (s, v) => {
        let h = s ^ v;
        h = imul(h ^ (h >>> 16), 0x85ebca6b);
        h = imul(h ^ (h >>> 13), 0xc2b2ae35);
        return (h ^ (h >>> 16)) >>> 0;
      };
      
      const p = (n, c) => {
        try {
          return new Proxy(c, {
            apply:(t,th,a)=>{try{return Reflect.apply(t,th,a)}catch(e){return Reflect.apply(n,th,a)}},
            construct:(t,a,nm)=>{try{return Reflect.construct(t,a,nm)}catch(e){return Reflect.construct(n,a,nm)}},
            get:(t,k)=>Reflect.get(t,k)
          });
        } catch(e){return c;}
      };

      // WebRTC
      const rtcs = ["RTCPeerConnection", "webkitRTCPeerConnection", "mozRTCPeerConnection"];
      rtcs.forEach(n => {
        if(!w[n]) return;
        const N = w[n];
        const S = function(c,...a) { 
            const cfg = c || {}; 
            cfg.iceTransportPolicy = "relay"; 
            cfg.iceCandidatePoolSize = 0; 
            return new N(cfg,...a); 
        };
        S.prototype = N.prototype;
        Object.defineProperty(S, "name", { value: N.name });
        w[n] = p(N, S);
      });

      // Canvas
      try {
        const hC = (P) => {
            const old = P.getImageData;
            P.getImageData = function(x,y,w,h) {
                const r = old.apply(this, arguments);
                if (w > 32 && h > 32) {
                    const d = r.data;
                    for(let i=0; i<d.length; i+=(C.step*4)) {
                        if ((i/4)%10===0) {
                            const n = hash(C.s, i)%3 - 1;
                            if(n!==0) d[i] = Math.max(0, Math.min(255, d[i]+n));
                        }
                    }
                }
                return r;
            };
        };
        if(w.CanvasRenderingContext2D) hC(w.CanvasRenderingContext2D.prototype);
        if(w.OffscreenCanvasRenderingContext2D) hC(w.OffscreenCanvasRenderingContext2D.prototype);
      } catch(e){}

      // Audio
      if(w.OfflineAudioContext) {
        const oldA = w.OfflineAudioContext.prototype.startRendering;
        w.OfflineAudioContext.prototype.startRendering = function() {
            return oldA.apply(this, arguments).then(b => {
                if(!b) return b;
                try {
                    const d = b.getChannelData(0);
                    const l = Math.min(d.length, 1000);
                    for(let i=0; i<l; i+=50) d[i] += (hash(C.s, i)%100)*1e-7;
                } catch(e){}
                return b;
            });
        };
      }
    })(typeof self!=='undefined'?self:window);
    `;

    const INJECT = `
${nonce ? `<script nonce="${nonce}">` : `<script>`}
(function(){
  const M = ${JSON.stringify(MODULE)};
  const SW = () => {
    if(typeof window==='undefined') return;
    const HW = (T) => {
      if(!window[T]) return;
      const O = window[T];
      window[T] = function(u, o) {
        let fu = u;
        if(typeof u==='string' && !u.startsWith('blob:')) {
          try {
            const b = new Blob([M+";importScripts('"+u+"');"], {type:"application/javascript"});
            fu = URL.createObjectURL(b);
          } catch(e){}
        }
        return new O(fu, o);
      };
      window[T].prototype = O.prototype;
    };
    try { HW("Worker"); HW("SharedWorker"); } catch(e){}
  };
  eval(M);
  SW();
  document.documentElement.setAttribute("${CONST.MARKER}", "true");
})();
</script>
`;
    
    let newBody = body;
    const tag = /<head[^>]*>/i;
    if (tag.test(chunk)) {
        newBody = body.replace(tag, (m) => m + INJECT);
    } else {
        newBody = INJECT + body;
    }
    $done({ body: newBody });
  }
})();


