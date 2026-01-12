/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.51-API-Heuristics-Patch
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.51 API 啟發式豁免版]:
 * 1) [STRATEGY] 引入「API 啟發式 (Heuristics)」檢測。
 * - 針對金融業常用的 Legacy 網頁架構 (ASPX, JSP, DJHTM) 進行寬容放行。
 * - 解決國泰/永豐等券商 App 個股頁面因網址特徵不明顯而被誤注入的問題。
 * 2) [FIX] 放寬 User-Agent 檢測邏輯。
 * - 針對 iOS App 內嵌 WebView (通常顯示為 Mobile Safari) 增加防禦性豁免。
 * 3) [BASELINE] 繼承 V10.50 的金融零接觸架構。
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
  
  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const currentUA = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // A. App User-Agent Whitelist
  const UA_EXCLUDES = [
    "cathay", "cathaysec", "treegenie", 
    "mitake", "iwow", "systex",         
    "sinopac", "sinotrade",             
    "tradingview", "feedly", "megatime", "104app",
    "fubon", "esun", "ctbc", "landbank", 
    "teamviewer", "anydesk", "splashtop", 
    "cfnetwork", "darwin", "okhttp",      
    "applewebkit", // 內核保護
    "mobile/15e148" // 特殊版本號豁免 (常見於 iOS 內嵌瀏覽器)
  ];

  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // B. URL Keyword Whitelist (Broad & Legacy)
  const URL_EXCLUDES = [
    // [V10.51 NEW] Legacy Financial Web Extensions & Patterns
    ".djhtm", ".aspx", ".jsp", ".php", ".ashx", // 常見金融後端
    "webapi", "mobileapi", "app_service", "ws_service", // API 路徑
    "gw.cathay", "sap.cathay", // 國泰特有網關
    
    // Financial Keywords
    "quote", "chart", "tick", "finance", "stock", "trading", "market", 
    "kline", "technical", "analysis", "price", "realtime", "overview", "detail",
    
    // Core Vendors
    "sysjust", "justaca", "xq", "iwow", "systex", "mitake",
    "cmoney", "moneydj", "cnyes", "yahoo", "yimg", "bloomberg", "investing", "tdcc", "wantgoo",

    // Security & Infra
    "hitrust", "twca", "verisign", "symcd", "digicert", "globalsign",
    "cloudfront", "akamai", "azureedge", "googleapis", "gstatic", "hinet",

    // Remote & SaaS
    "localhost", "127.0.0.1", "::1", "remotedesktop", "guacamole", "amazonworkspaces",
    "accounts", "login", "sso", "oauth", "okta", "auth0", "cloudflareaccess",
    "github", "gitlab", "atlassian", "jira", "trello", 
    "zoom", "meet.google", "teams", "webex",

    // Specific Domains
    "cathay", "cathaysec", "sinopac", "sinotrade", "post.gov", "gov.tw",
    "104.com", "megatime", "lark", "dingtalk", "workday",
    "nord", "surfshark", "expressvpn", "proton",
    "shopee", "momo", "feedly"
  ];

  if (URL_EXCLUDES.some(k => currentUrl.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // [V10.51 NEW] API Heuristics (最後一道防線)
  // 如果 URL 看起來像是資料接口而非網頁，強制跳過
  if (currentUrl.includes("/api/") || currentUrl.includes("/service/") || currentUrl.includes("/data/")) {
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
    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    // Strict HTML Check
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

    const chunk = body.substring(0, 3000);
    if (chunk.includes(CONST.MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    const m = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i);
    const nonce = m ? m[1] : "";
    
    if ((csp && !csp.includes("'unsafe-inline'")) && !nonce) { $done({}); return; }

    const INJECT_CFG = { 
        s: (function () {
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
        })(), 
        step: CONST.NOISE_STEP 
    };

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
