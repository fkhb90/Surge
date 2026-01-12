/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.47-Financial-Chart-Patch
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.47 股市圖表修復版]:
 * 1) [FIX] 針對個股資訊頁面無法開啟的問題，新增底層資訊廠商 URL 白名單。
 * - 加入 "mitake" (三竹), "systex" (精誠), "cmoney" (全曜), "moneydj" (理財網)。
 * - 解決 App 內嵌第三方 K 線圖時，因 UA 變更導致的防護失效與 Canvas 崩潰。
 * 2) [STRATEGY] 擴大財經資訊網覆蓋範圍 (Yahoo, Bloomberg, Investing)。
 * 3) [BASELINE] 繼承 V10.46 的 App 整機豁免與 CFNetwork 防護。
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
  
  // A. URL 白名單 (針對瀏覽器與 API，新增圖表廠商)
  const URL_EXCLUDES = [
    // [V10.47 NEW] Financial Data Providers (Chart/Quote)
    "mitake",       // 三竹資訊 (台灣券商市佔第一)
    "systex",       // 精誠資訊
    "cmoney",       // 籌碼K線/全曜財經
    "moneydj",      // XQ/理財網
    "yahoo",        // Yahoo 股市
    "bloomberg",    // 彭博
    "investing.com",// 英威斯丁
    "cnyes",        // 鉅亨網
    "wantgoo",      // 玩股網
    "goodinfo",     // 台灣股市資訊網
    "pchome.com.tw",// PChome 股市

    // Feedly Cloud
    "feedly", "cloud.feedly.com", "s3.feedly.com", "sandbox.feedly.com",

    // Local & Remote
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "remotedesktop.google.com", "anydesk.com", "teamviewer.com", "realvnc.com", "guacamole", "amazonworkspaces.com", 

    // Identity
    "accounts.google", "appleid.apple", "icloud.com", "login.live.com", "microsoft.com", 
    "sso", "oauth", "okta.com", "okta-emea.com", "auth0.com", "cloudflareaccess.com", 
    "github.com", "gitlab.com", "atlassian.net", "jira.com", "trello.com",
    "recaptcha", "turnstile", "hcaptcha", "arkoselabs",

    // Conference
    "zoom.us", "zoom.com", "meet.google", "hangouts.google", "teams.live", "teams.microsoft", "webex.com",

    // Financial & Trading (Brokers)
    "tradingview.com", "tdcc.com.tw", 
    "ctbc", "cathay", "cathaysec.com.tw", "esun", "fubon", "taishin", "megabank", 
    "landbank", "firstbank", "sinopac", "sinotrade.com.tw", "post.gov", "gov.tw",
    "nhi.gov.tw", "ris.gov.tw", "fido.gov.tw",
    "paypal", "stripe", "ecpay", "line.me", "jkos", "opay",
    
    // Enterprise & HR
    "104.com.tw", "megatime.com.tw", "larksuite", "lark.com", "dingtalk", 
    "workday", "mayhr", "apollo", "slack", "discord", "telegram",
    "notion.so", "notion.site", "figma.com",

    // VPN & Security
    "nordaccount", "nordvpn", "surfshark", "expressvpn", "proton", "mullvad", "ivpn",
    
    // Content
    "shopee", "momo", "books.com", "coupang", 
    "uber", "foodpanda", "netflix", "spotify", "youtube",
    "openai", "chatgpt", "claude", "gemini", "bing", "perplexity"
  ];

  // B. User-Agent 白名單 (針對 App 整機豁免)
  const UA_EXCLUDES = [
    "feedly",
    "treegenie",    
    "mitake",       
    "cathay",       
    "sinopac",      
    "sinotrade",    
    "tradingview",  
    "line",         
    "facebook",     
    "instagram",    
    "shopee",       
    "uber",         
    "ctbc",         
    "esun",
    "fubon",        
    "megatime",     
    "teamviewer",   
    "anydesk",
    "cfnetwork",    
    "darwin",       
    "flipper",      
    "okhttp"        
  ];

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const currentUA = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // 1. UA Check
  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }
  // 2. URL Check
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
