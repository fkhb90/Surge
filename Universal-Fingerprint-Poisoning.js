/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.54-Cathay-Pattern-Hardening
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.54 國泰網址特徵加固版]:
 * 1) [STRATEGY] 實施「國泰體系暴力排除 (Cathay Pattern Hardening)」。
 * - 不依賴通用關鍵字，直接窮舉國泰證券/銀行/樹精靈的所有已知網域變體。
 * - 確保 cathaysec, cathay-sec, cathaybk 等特徵在腳本啟動瞬間即觸發放行。
 * 2) [FIX] 針對 "175.99." 等直連 IP 維持最高優先級豁免。
 * 3) [BASELINE] 繼承 V10.53 的安全模式架構。
 */

(function () {
  "use strict";

  // ============================================================================
  // 1) Extreme Pre-Check (Cathay Patterns Priority)
  // ============================================================================
  
  const u = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const ua = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // [V10.54 NEW] Cathay Specific Patterns (The "Hardcoded" List)
  if (
      // Domain Patterns
      u.includes("cathaysec") || 
      u.includes("cathay-sec") || 
      u.includes("cathaybk") || 
      u.includes("cathayholdings") || 
      u.includes("cathaylife") ||
      u.includes("kokobank") ||
      u.includes("treegenie") ||
      // Broad Match (Risk Accepted for Stability)
      u.includes("cathay") ||
      
      // Known IPs (Mitake/Cathay Quote Servers)
      u.includes("175.99.") || 
      u.includes("210.61.") || 
      u.includes("203.66.") ||
      
      // App Specific UAs
      ua.includes("treegenie") || 
      ua.includes("cathay") || 
      ua.includes("mitake")
  ) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // 2) Financial & Infrastructure Broad Check
  // ============================================================================
  if (
      // Broker Domains & Keywords
      u.includes("sinopac") || u.includes("sinotrade") || u.includes("mitake") ||
      u.includes("djhtm") || u.includes("quote") || u.includes("chart") ||
      u.includes("api/v") || u.includes("mobileapi") // Common API paths
  ) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // 3) Mode Check
  // ============================================================================
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 4) General Whitelist
  // ============================================================================
  const EXCLUDES = [
    "tradingview", "feedly", "megatime", "104.com",
    "shopee", "momo", "pchome", "books.com", "coupang", 
    "uber", "foodpanda", "netflix", "spotify", "youtube",
    "line", "facebook", "instagram", "telegram", "discord", "slack",
    "zoom", "meet.google", "teams", "webex",
    "localhost", "127.0.0.1", "::1",
    "accounts", "login", "sso", "oauth", "okta", "auth0",
    "appleid", "icloud", "microsoft", "google",
    "cfnetwork", "darwin"
  ];

  if (EXCLUDES.some(k => u.includes(k) || ua.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // 5) Request Phase Skip
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    $done({});
    return;
  }

  // ============================================================================
  // 6) HTML Injection
  // ============================================================================
  if (typeof $response !== "undefined") {
    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    if (!ct.includes("text/html")) { $done({}); return; }

    const body = $response.body;
    if (!body) { $done({}); return; }

    const CONST = {
        KEY: "FP_SHIELD_ID_V1014", 
        MARKER: "__FP_SHIELD_INJECTED__",
        NOISE_STEP: 4 
    };

    const chunk = body.substring(0, 3000);
    if (chunk.includes(CONST.MARKER)) { $done({}); return; }

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
