/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.60-Stability-Master
 * @author    Jerry's AI Assistant
 * @updated   2026-01-12
 * ----------------------------------------------------------------------------
 * [V10.60 穩定性大師版]:
 * 1) [FINAL SOLUTION] 確認國泰證券/三竹系統必須透過 "Skip Proxy" (跳過代理) 解決。
 * - 請使用者務必在 Loon/Surge 設定中排除 "175.99.0.0/16" 與 "*.cathaysec.com.tw"。
 * 2) [FULL POWER] 恢復 Canvas/Audio/WebRTC 的全功率防護。
 * - 既然問題 App 已被物理隔離，腳本將不再自我閹割，確保最佳隱私保護力。
 * 3) [MAINTAIN] 保留 Feedly, TradingView, Zoom 等已驗證的白名單。
 */

(function () {
  "use strict";

  // [V10.60 Safety] Global Try-Catch
  try {
      // ============================================================================
      // 1) Pre-Check & Kill Switch
      // ============================================================================
      if (typeof $persistentStore !== "undefined") {
          const currentMode = $persistentStore.read("FP_MODE");
          if (currentMode === "shopping") {
              if (typeof $done !== "undefined") $done({});
              return;
          }
      }

      const u = (typeof $request !== "undefined" && $request.url) ? $request.url.toLowerCase() : "";
      const ua = (typeof $request !== "undefined" && $request.headers && ($request.headers["User-Agent"] || $request.headers["user-agent"])) 
                 ? ($request.headers["User-Agent"] || $request.headers["user-agent"]).toLowerCase() 
                 : "";

      // ============================================================================
      // 2) Zero-Touch Whitelist (Immediate Exit)
      // ============================================================================
      
      // A. Direct IP & Protocol Conflict (Cathay/Mitake)
      // 雖然 Skip Proxy 應該會處理掉，但如果漏網，這裡做最後攔截
      if (
          u.includes("175.99.") || u.includes("210.61.") || 
          (u.includes(":443") && u.startsWith("http:")) ||
          u.includes("cathay") || u.includes("sinopac") || u.includes("mitake")
      ) {
          if (typeof $done !== "undefined") $done({});
          return;
      }

      // B. General App & Web Whitelist
      const EXCLUDES = [
        // App Immunity (UA)
        "treegenie", "tradingview", "feedly", "megatime", "104app", 
        "line", "facebook", "instagram", "shopee", "uber", "foodpanda",
        "teamviewer", "anydesk", "zoom", "meet", "teams", "webex",
        "cfnetwork", "darwin", "flipper", "okhttp", "applewebkit",

        // Domains (URL)
        "tradingview.com", "tdcc.com.tw", "cnyes", "wantgoo", 
        "accounts.google", "appleid", "icloud", "login", "oauth", "sso",
        "okta", "auth0", "cloudflareaccess", "github", "gitlab", "atlassian",
        "recaptcha", "turnstile", "hcaptcha",
        "ctbc", "esun", "fubon", "taishin", "landbank", "post.gov", 
        "hitrust", "twca", "verisign",
        "localhost", "127.0.0.1", "::1"
      ];

      if (EXCLUDES.some(k => u.includes(k) || ua.includes(k))) {
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
      // 4) HTML Injection (Core Logic Restored)
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

        // Optimization: Chunk Scan
        const chunk = body.substring(0, 2048);
        if (chunk.includes(CONST.MARKER)) { $done({}); return; }

        let csp = "";
        Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
        const m = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i);
        const nonce = m ? m[1] : "";
        
        if ((csp && !csp.includes("'unsafe-inline'")) && !nonce) { $done({}); return; }

        // Seed Generation
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

        // [V10.60] Full Protection Module Restored
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

          // 1. WebRTC Relay
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

          // 2. Canvas Noise
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

          // 3. Audio Noise
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
      } else {
        $done({});
      }
  } catch (e) {
      if (typeof $done !== "undefined") $done({});
  }
})();
