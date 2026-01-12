/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.39-MegaTime-Patch
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.39 考勤系統擴充版]:
 * 1) [HR] 新增 "megatime.com.tw" (梅迦科技/Mangor) 至白名單。
 * - 解決雲端人資系統線上打卡時，因指紋防護導致的地圖定位失敗或裝置驗證錯誤。
 * 2) [BASELINE] 繼承 V10.38 的遠端桌面 (RDP) 與開發者環境優化架構。
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
  // 2) Hardened Whitelist (MegaTime Added)
  // ============================================================================
  const EXCLUDES = [
    // 1. Local Development
    "localhost", "127.0.0.1", "0.0.0.0", "::1",

    // 2. Remote Desktop & VDI
    "remotedesktop.google.com", 
    "anydesk.com", 
    "teamviewer.com", 
    "realvnc.com", 
    "guacamole", 
    "amazonworkspaces.com", 

    // 3. Identity & Cloud Infra
    "accounts.google", "appleid.apple", "icloud.com", 
    "login.live.com", "microsoft.com", "sso", "oauth", 
    "okta.com", "okta-emea.com", "auth0.com",
    "cloudflareaccess.com", 
    "github.com", "gitlab.com",
    "atlassian.net", "jira.com", "trello.com",
    "recaptcha", "turnstile", "hcaptcha", "arkoselabs",

    // 4. Video Conference (WebRTC P2P)
    "zoom.us", "zoom.com", 
    "meet.google", "hangouts.google", "teams.live", "teams.microsoft",
    "webex.com",

    // 5. Taiwan Banking & Gov
    "ctbc", "cathay", "esun", "fubon", "taishin", "megabank", 
    "landbank", "firstbank", "sinopac", "post.gov", "gov.tw",
    "nhi.gov.tw", "ris.gov.tw", "fido.gov.tw",
    
    // 6. Payment Gateways
    "paypal", "stripe", "ecpay", "line.me", "jkos", "opay",
    
    // 7. Enterprise, HR & Productivity
    "104.com.tw", 
    "megatime.com.tw", // [V10.39 ADDED] 梅迦科技/Mangor HR
    "larksuite", "lark.com", "dingtalk", 
    "workday", "mayhr", "apollo", 
    "slack", "discord", "telegram",
    "notion.so", "notion.site", "figma.com",

    // 8. VPN & Security Services
    "nordaccount", "nordvpn", "surfshark", "expressvpn", 
    "proton", "mullvad", "ivpn",
    
    // 9. E-Commerce & Content
    "feedly", 
    "shopee", "momo", "pchome", "books.com", "coupang", 
    "uber", "foodpanda", "netflix", "spotify", "youtube",
    
    // 10. AI Services
    "openai", "chatgpt", "claude", "gemini", "bing", "perplexity"
  ];

  const url = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  
  // Fast Check: O(1) 複雜度
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


