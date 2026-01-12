/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.50-Financial-Zero-Touch
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.50 金融零接觸最終版]:
 * 1) [CORE] 實施「Zero-Touch (零接觸)」策略。
 * - 針對金融類請求，在腳本最頂層立即放行，完全不讀取 response.body。
 * - 解決即時報價串流 (Streaming/SSE) 因腳本緩衝而被截斷導致的圖表空白。
 * 2) [FIX] 新增 "cathaysec" (國泰證券 App UA), "iwow" (精誠資訊 API)。
 * 3) [BASELINE] 繼承 V10.49 的所有防護架構，但大幅提升金融 App 相容性。
 */

(function () {
  "use strict";

  // ============================================================================
  // 1) Pre-Check: Kill Switch & Shopping Mode
  // ============================================================================
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 2) Zero-Touch Whitelist (Immediate Exit)
  // ============================================================================
  // 這些檢查必須在任何耗時操作前執行，以保護即時串流
  
  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const currentUA = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // A. App User-Agent Whitelist (App Immunity)
  const UA_EXCLUDES = [
    "cathay", "cathaysec", "treegenie", // 國泰體系
    "mitake", "iwow", "systex",         // 底層看盤引擎 (三竹/精誠)
    "sinopac", "sinotrade",             // 永豐
    "tradingview", "feedly", "megatime", "104app",
    "fubon", "esun", "ctbc", "landbank", // 其他銀行
    "teamviewer", "anydesk", "splashtop", // 遠端
    "cfnetwork", "darwin", "okhttp",      // 系統底層
    "applewebkit" // 寬容模式：保護內嵌 WebView
  ];

  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      // console.log(`[FP-Shield] UA Whitelisted (Zero-Touch): ${currentUA}`);
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // B. URL Keyword Whitelist (Broad Financial Protection)
  const URL_EXCLUDES = [
    // Financial Streaming & API Keywords (The Nuclear Option)
    "quote", "chart", "tick", "finance", "stock", "trading", "market", 
    "kline", "technical", "analysis", "price", "realtime",
    
    // Core Financial Vendors
    "sysjust", "justaca", "xq",         // 嘉實/XQ
    "iwow", "systex",                   // 精誠
    "mitake",                           // 三竹
    "cmoney", "moneydj", "cnyes",       // 財經網
    "yahoo", "yimg", "bloomberg", "investing", "tdcc", "wantgoo",

    // Security & Infrastructure
    "hitrust", "twca", "verisign", "symcd", "digicert", "globalsign",
    "cloudfront", "akamai", "azureedge", "googleapis", "gstatic", "hinet",

    // Remote & Dev
    "localhost", "127.0.0.1", "::1", "remotedesktop", "guacamole", "amazonworkspaces",

    // Identity & SaaS
    "accounts", "login", "sso", "oauth", "okta", "auth0", "cloudflareaccess",
    "github", "gitlab", "atlassian", "jira", "trello", "recaptcha", "turnstile",

    // Conference
    "zoom", "meet.google", "teams", "webex",

    // Specific Domains (Banking/HR/VPN)
    "cathay", "cathaysec", "sinopac", "sinotrade", "post.gov", "gov.tw",
    "104.com", "megatime", "lark", "dingtalk", "workday",
    "nord", "surfshark", "expressvpn", "proton"
  ];

  if (URL_EXCLUDES.some(k => currentUrl.includes(k))) {
      // console.log(`[FP-Shield] URL Whitelisted (Zero-Touch): ${currentUrl}`);
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // 3) Request Phase Skip
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    $done({});
    return;
  }

  // ============================================================================
  // 4) HTML Injection (Core Logic)
  // ============================================================================
  if (typeof $response !== "undefined") {
    // [SAFETY] Check content type first to avoid reading body of binary/stream
    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    if (!ct.includes("text/html")) { 
        $done({}); 
        return; 
    }

    const body = $response.body;
    if (!body) { $done({}); return; }

    const CONST = {
        KEY: "FP_SHIELD_ID_V1014", 
        MARKER: "__FP_SHIELD_INJECTED__",
        NOISE_STEP: 4 
    };

    // Optimization: Chunk Scan
    const chunk = body.substring(0, 3000);
    if (chunk.includes(CONST.MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    const m = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i);
    const nonce = m ? m[1] : "";
    
    if ((csp && !csp.includes("'unsafe-inline'")) && !nonce) { $done({}); return; }

    // Seed Generation (On Demand)
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
