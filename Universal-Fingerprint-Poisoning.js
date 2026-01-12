/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.52-Direct-IP-Patch
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.52 直連 IP 修復版]:
 * 1) [CRITICAL] 新增 "Direct IP (直連 IP)" 豁免機制。
 * - 針對國泰/三竹等券商繞過 DNS 直接使用 IP (如 175.99.xx.xx) 連線的情況進行放行。
 * - 解決因 URL 無域名特徵導致的白名單失效與報價協議崩潰。
 * 2) [FIX] 明確加入 "175.99." (中華電信/三竹網段) 與 "210.61." (常見金融網段)。
 * 3) [BASELINE] 繼承 V10.51 的 API 啟發式與 App 零接觸架構。
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

  // A. Direct IP Whitelist (Financial Subnets) [V10.52 NEW]
  // 檢查 URL 是否包含已知的金融服務 IP 網段
  const IP_EXCLUDES = [
    "175.99.", // 三竹資訊/國泰報價伺服器 (User Reported: 175.99.79.152)
    "210.61.", // 精誠/三竹 常見網段
    "203.66.", // 中華電信金融專線
    "211.23.", // 另一個常見金融區段
    "203.69."  // 企業簡訊與 API 網關
  ];

  if (IP_EXCLUDES.some(ip => currentUrl.includes(ip))) {
      // console.log(`[FP-Shield] Direct IP Whitelisted: ${currentUrl}`);
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // B. App User-Agent Whitelist
  const UA_EXCLUDES = [
    "cathay", "cathaysec", "treegenie", 
    "mitake", "iwow", "systex",         
    "sinopac", "sinotrade",             
    "tradingview", "feedly", "megatime", "104app",
    "fubon", "esun", "ctbc", "landbank", 
    "teamviewer", "anydesk", "splashtop", 
    "cfnetwork", "darwin", "okhttp",      
    "applewebkit", 
    "mobile/15e148"
  ];

  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // C. URL Keyword Whitelist (Broad & Legacy)
  const URL_EXCLUDES = [
    // [V10.52 Refined] Specific Paths for Direct IP fallback
    "/z/zc/", "/djhtm", "/api/", // MoneyDJ/XQ patterns
    
    // Legacy
    ".djhtm", ".aspx", ".jsp", ".php", ".ashx",
    "webapi", "mobileapi", "app_service", "ws_service",
    "gw.cathay", "sap.cathay", 
    
    // Financial Keywords
    "quote", "chart", "tick", "finance", "stock", "trading", "market", 
    "kline", "technical", "analysis", "price", "realtime", "overview", "detail",
    
    // Vendors
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

  // API Heuristics
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
