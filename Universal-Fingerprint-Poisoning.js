/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.32-Hotfix-104
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.32 104人力銀行修復版]:
 * 1) [FIX] 將 "104.com.tw" 加入白名單，解決企業版 (pro) 線上打卡功能異常問題。
 * - 此關鍵字同時覆蓋 accounts/pro/pda 等子網域，確保求職與考勤功能正常。
 * 2) [BASELINE] 繼承 V10.31 的穩定架構 (Feedly Fix + MurmurHash3)。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Mode Check (The Kill Switch)
  // ============================================================================
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 1) Config & Seed
  // ============================================================================
  const CONST = {
    KEY: "FP_SHIELD_ID_V1014", // 保持 ID 連貫性
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

  // ============================================================================
  // 2) Hardened Whitelist (Includes 104 Fix)
  // ============================================================================
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
    
    // 4. E-Commerce & Services (High Sensitivity)
    "feedly", // V10.31 Fix
    "104.com.tw", // [V10.32 ADDED] 104 人力銀行/企業大師打卡修復
    "shopee", "momo", "pchome", "books.com", "coupang", 
    "uber", "foodpanda", "netflix", "spotify", "youtube",
    
    // 5. AI Services
    "openai", "chatgpt", "claude", "gemini", "bing", "perplexity"
  ];

  const url = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  
  // Fast Check: 只要 URL 包含關鍵字，立即放行 (O(1) 複雜度)
  if (EXCLUDES.some(k => url.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // Phase 3: Request Phase Skip
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    $done({});
    return;
  }

  // ============================================================================
  // Phase 4: HTML Injection (Performance Optimized)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body) { $done({}); return; }

    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    // Strict HTML Check
    if (!ct.includes("text/html")) { $done({}); return; }

    // [Optimization] Only scan the first 3KB for markers & nonce
    const chunk = body.substring(0, 3000);
    if (chunk.includes(CONST.MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    
    const m = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i);
    const nonce = m ? m[1] : "";
    
    // Fail-safe: Skip if CSP blocks inline scripts and no nonce is found
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

      // 1. WebRTC (Relay Mode)
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

      // 2. Canvas (Optimized Noise)
      try {
        const hC = (P) => {
            const old = P.getImageData;
            P.getImageData = function(x,y,w,h) {
                const r = old.apply(this, arguments);
                if (w > 32 && h > 32) {
                    const d = r.data;
                    for(let i=0; i<d.length; i+=(C.step*4)) {
                        // Apply noise to 1 in every 10 sampled pixels
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

      // 3. Audio (Optimized Noise)
      if(w.OfflineAudioContext) {
        const oldA = w.OfflineAudioContext.prototype.startRendering;
        w.OfflineAudioContext.prototype.startRendering = function() {
            return oldA.apply(this, arguments).then(b => {
                if(!b) return b;
                try {
                    const d = b.getChannelData(0);
                    // Only modify first 1000 samples for performance
                    const l = Math.min(d.length, 1000);
                    for(let i=0; i<l; i+=50) d[i] += (hash(C.s, i)%100)*1e-7;
                } catch(e){}
                return b;
            });
        };
      }
    })(typeof self!=='undefined'?self:window);
    `;

    // Worker Blob Injection (With Try-Catch Safety)
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
    // Inject at the beginning of HEAD for maximum priority
    if (tag.test(chunk)) {
        newBody = body.replace(tag, (m) => m + INJECT);
    } else {
        newBody = INJECT + body;
    }
    $done({ body: newBody });
  }
})();
