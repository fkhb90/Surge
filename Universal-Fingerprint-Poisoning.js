/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.49-Financial-Nuclear-Option
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.49 金融核選項修復版]:
 * 1) [STRATEGY] 啟用「廣域金融關鍵字 (Broad Financial Keywords)」豁免。
 * - 只要 URL 包含 "chart", "quote", "stock", "finance", "trading" 等字眼，一律放行。
 * - 這能覆蓋所有未知的第三方看盤套件與 API。
 * 2) [FIX] 新增 "sysjust" (嘉實/XQ), "yimg" (Yahoo CDN) 等遺漏的供應商。
 * 3) [SAFETY] 針對金融類請求，自動降級防護策略，優先確保交易功能運作。
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

  // ============================================================================
  // 2) Dual-Lock Whitelist System
  // ============================================================================
  
  // A. URL 白名單 (含廣域關鍵字)
  const URL_EXCLUDES = [
    // [V10.49 NEW] Broad Financial Keywords (The Nuclear Option)
    // 只要網址裡有這些字，我們就假設它是金融相關功能，直接放行
    "chart", "quote", "stock", "finance", "trading", "market", "kline", "technical", "analysis",
    "mobile-web", // 常見的 App 內嵌網頁路徑
    
    // [V10.49 NEW] Missing Vendors
    "sysjust", "justaca", // 嘉實資訊 (XQ)
    "yimg", "yahoo",      // Yahoo 股市資源
    "hinet",              // 中華電信 CDN (金融業常用)

    // Security Infra
    "hitrust", "twca", "verisign", "symcd", "digicert", "globalsign", "entrust",
    "cloudfront", "akamai", "azureedge", "googleapis", "gstatic",

    // Financial Providers
    "mitake", "systex", "cmoney", "moneydj", "bloomberg", "investing", "cnyes", "wantgoo", "goodinfo", "pchome", "tdcc",

    // Remote/Dev
    "localhost", "127.0.0.1", "::1", "remotedesktop", "anydesk", "teamviewer", "realvnc", "guacamole", "amazonworkspaces",

    // Identity
    "accounts", "appleid", "icloud", "login", "microsoft", "sso", "oauth", "okta", "auth0", "cloudflareaccess", 
    "github", "gitlab", "atlassian", "jira", "trello", "recaptcha", "turnstile", "hcaptcha", "arkoselabs",

    // Conference
    "zoom", "meet.google", "teams", "webex",

    // Brokers & Banks (Taiwan)
    "ctbc", "cathay", "esun", "fubon", "taishin", "megabank", "landbank", "firstbank", "sinopac", "sinotrade", "post.gov", "gov.tw", "nhi.gov",

    // Payment
    "paypal", "stripe", "ecpay", "line.me", "jkos", "opay",
    
    // HR & Enterprise
    "104.com", "megatime", "lark", "dingtalk", "workday", "mayhr", "apollo", "slack", "discord", "telegram", "notion", "figma",

    // VPN
    "nord", "surfshark", "expressvpn", "proton", "mullvad", "ivpn",
    
    // Content
    "feedly", "shopee", "momo", "books.com", "coupang", "uber", "foodpanda", "netflix", "spotify", "youtube", "openai", "chatgpt", "claude", "gemini", "bing", "perplexity"
  ];

  // B. User-Agent 白名單
  const UA_EXCLUDES = [
    "feedly", "treegenie", "mitake", "cathay", "sinopac", "sinotrade", "tradingview",  
    "line", "facebook", "instagram", "shopee", "uber", "ctbc", "esun", "fubon", "megatime",     
    "teamviewer", "anydesk", "cfnetwork", "darwin", "flipper", "okhttp", "applewebkit"
  ];

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const currentUA = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // Check 1: UA
  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }
  // Check 2: URL
  if (URL_EXCLUDES.some(k => currentUrl.includes(k))) {
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
  // Phase 4: HTML Injection
  // ============================================================================
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
