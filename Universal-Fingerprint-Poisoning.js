/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.46-Universal-Exclusion
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.46 廣域排除修復版]:
 * 1) [STRATEGY] 擴大 App 豁免範圍 (Broad App Immunity)。
 * - 針對國泰證券等頑固 App，放寬 UA 檢測邏輯，寧可錯放也不誤殺。
 * 2) [FIX] 新增 "CFNetwork" (iOS 底層網路庫) 檢測。
 * - 許多金融 App 的背景 API 請求 UA 僅標示為 CFNetwork，此前版本可能漏接。
 * 3) [BASELINE] 繼承 V10.45 的所有生產力與資安防護架構。
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
  
  // A. URL 白名單 (針對瀏覽器與 API)
  const URL_EXCLUDES = [
    // [V10.45 Safety] Explicit Feedly Cloud Infrastructure
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

    // Financial & Trading
    "tradingview.com", "tdcc.com.tw", "cnyes.com", "wantgoo.com", 
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
    "shopee", "momo", "pchome", "books.com", "coupang", 
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
    // [V10.46 NEW] Broad System Patterns
    "cfnetwork",    // iOS 網路層 (許多 App API 僅顯示此 UA)
    "darwin",       // iOS 系統內核請求
    "flipper",      // React Native Debugger
    "okhttp"        // Android App 常見網路庫
  ];

  // 獲取請求資訊
  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  const currentUA = (typeof $request !== "undefined") ? ($request.headers["User-Agent"] || $request.headers["user-agent"] || "").toLowerCase() : "";

  // 執行雙重檢查
  // 1. UA Check (優先豁免 App 底層請求)
  if (UA_EXCLUDES.some(k => currentUA.includes(k))) {
      // console.log(`[FP-Shield] App Immunity Triggered: ${currentUA}`);
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
  // Phase 4: HTML Injection (Performance Optimized)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body) { $done({}); return; }

    const headers = $response.headers || {};
    const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    // Strict HTML Check - 這是最後一道防線
    // 許多 App API 回傳的是 JSON 或 XML，腳本必須嚴格避開
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
