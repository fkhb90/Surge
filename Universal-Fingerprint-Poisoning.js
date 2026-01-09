/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.27-Shopee-Hardened
 * @author    Jerry's AI Assistant
 * @updated   2026-01-09
 * ----------------------------------------------------------------------------
 * [V10.27 蝦皮強化版]:
 * 1) [WHITELIST] 將蝦皮 (Shopee) 全系網域從軟性名單升級至硬性白名單。
 * - 包含: shopee.tw, shopeemobile.com (App API), spx.tw (物流), cdn 節點。
 * - 目的: 解決直播、結帳、賣家後台可能因 Canvas 噪聲導致的驗證失敗。
 * 2) [CORE] 維持 V10.26 的回歸驗證邏輯 (Shopping Mode 優先, iPhone 原生混淆)。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Mode Check (The Kill Switch)
  // ============================================================================
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          console.log("[FP-Shield] 🛍️ 購物模式已啟用 (Shopping Mode) - 腳本暫停。");
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 1) Global Config & Seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V1014", // 保持 Key 不變
    INJECT_MARKER: "__FP_SHIELD_V1027__",
    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001, 
    OFFLINE_AUDIO_NOISE: 0.00001
  };

  const SEED_MANAGER = (function () {
    const now = Date.now();
    let idSeed = 12345;
    try {
      const stored = localStorage.getItem(CONST.KEY_PERSISTENCE);
      if (stored) {
        const [val, expiry] = stored.split("|");
        if (now < parseInt(expiry, 10)) idSeed = parseInt(val, 10);
        else {
          idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
          localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + 2592000000}`);
        }
      } else {
        idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
        localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + 2592000000}`);
      }
    } catch (e) {}

    const dayBlock = Math.floor(now / 86400000); 
    const dailySeed = (idSeed ^ dayBlock) >>> 0;
    
    return { id: idSeed, daily: dailySeed };
  })();

  // ============================================================================
  // 2) Whitelist System (Updated V10.27)
  // ============================================================================
  const HARD_EXCLUSION_KEYWORDS = [
    // --- 1. Identity & Infra ---
    "accounts.google.com", "appleid.apple.com", "login.live.com", "icloud.com",
    "oauth", "sso", "okta.com", "auth0.com", "microsoft.com", "windowsupdate",
    "gov.tw", "edu.tw", 
    
    // --- 2. Bot Protection ---
    "recaptcha", "hcaptcha", "turnstile", "arkoselabs", "oaistatic.com",

    // --- 3. Banking & Finance (Taiwan) ---
    "ctbcbank", "cathaybk", "esunbank", "fubon", "taishin", 
    "landbank", "megabank", "firstbank", "citibank", "hsbc", 
    "hncb", "changhwabank", "sinopac", "bot.com.tw", "post.gov.tw", 
    "standardchartered", "richart", "dawho",

    // --- 4. Payment Gateways ---
    "paypal", "stripe", "ecpay", "line.me", "jkos", "jko.com",
    "twmp.com.tw", "taiwanpay", "braintreegateway", "adyen",

    // --- 5. AI Services ---
    "openai.com", "chatgpt.com", "anthropic.com", "claude.ai",
    "gemini.google.com", "bard.google.com", "perplexity.ai", 
    "bing.com", "copilot.microsoft.com", "monica.im", "felo.ai",

    // --- 6. Delivery & Service ---
    "foodpanda", "fd-api", "deliveryhero", "uber.com", "ubereats",

    // --- 7. Shopee Ecosystem (V10.27 Added) ---
    // Core Domains
    "shopee", "xiapi", 
    // Infrastructure & API
    "shopeemobile.com", "shopeeusercontent.com", 
    // Logistics & Payment
    "spx.tw", "airpay" 
  ];

  const WhitelistManager = (() => {
    const trustedWildcards = [
        // E-Commerce (Shopee moved to Hard List, others remain)
        "momo", "pchome", "books.com.tw", "coupang", "amazon", "pxmart", "etmall", "rakuten", "shopback",
        // Streaming
        "netflix", "spotify", "disney", "youtube", "twitch", "hulu", "iqiyi", "kktix", "tixcraft",
        // Tools & Social
        "github.com", "gitlab.com", "notion.so", "figma.com", "canva.com", "dropbox.com",
        "adobe.com", "cloudflare", "fastly", "jsdelivr", "googleapis.com", "gstatic.com",
        "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "discord.com", "threads.net"
    ];
    const suffixes = [".bank", ".pay", ".secure", ".gov", ".edu", ".org", ".mail"];

    return {
      isTrusted: (url) => {
        const u = (url || "").toLowerCase();
        if (trustedWildcards.some(kw => u.includes(kw))) return true;
        try {
            const hostname = u.split('//')[1].split('/')[0].split('?')[0];
            if (suffixes.some(s => hostname.endsWith(s))) return true;
        } catch(e) {}
        return false;
      }
    };
  })();

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  
  // Unified Exclusion Check
  const isExcluded = HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k)) || WhitelistManager.isTrusted(lowerUrl);

  // ============================================================================
  // Phase A: Request Headers Modification
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    // iPhone Optimized: No Header Modification
    $done({}); 
    return;
  }

  // ============================================================================
  // Phase B: HTML Injection (Core Poisoning)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body || isExcluded) { $done({}); return; }
    
    const headers = $response.headers || {};
    const cType = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    if (!cType.includes("html")) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    const allowInline = !csp || csp.includes("'unsafe-inline'");
    
    const REGEX = {
       HEAD: /<head[^>]*>/i,
       NONCE: /nonce=["']?([^"'\s>]+)["']?/i
    };
    
    let nonce = "";
    const m = body.match(REGEX.NONCE);
    if (m) nonce = m[1];
    
    if (!allowInline && !nonce) { $done({}); return; }

    const INJECT_CONFIG = {
      seed: SEED_MANAGER.id,
      daily: SEED_MANAGER.daily,
      consts: CONST
    };

    // Omni Module (iPhone Optimized)
    const OMNI_MODULE_SOURCE = `
    (function(scope) {
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      const C = CFG.consts;
      
      const detU32 = (seed, salt) => {
        let s = (seed ^ salt) >>> 0; s ^= (s << 13); s ^= (s >>> 17); s ^= (s << 5); return (s >>> 0);
      };
      const getNoise = (val, seed, scale) => {
        const u = detU32(seed, val);
        return (((u % 2001) - 1000) / 1000) * scale;
      };
      
      const protect = (native, custom) => {
        try {
          const p = new Proxy(custom, {
            apply: (t, th, a) => { try{ return Reflect.apply(t, th, a); }catch(e){ return Reflect.apply(native, th, a); } },
            construct: (t, a, n) => { try{ return Reflect.construct(t, a, n); }catch(e){ return Reflect.construct(native, a, n); } },
            get: (t, k) => Reflect.get(t, k)
          });
          const nativeStr = "function " + (native.name || "") + "() { [native code] }";
          Object.defineProperty(p, "toString", { value: () => nativeStr });
          return p;
        } catch(e) { return custom; }
      };
      const hook = (obj, prop, factory) => { if(obj && obj[prop]) obj[prop] = protect(obj[prop], factory(obj[prop])); };

      // 1. WebRTC
      const installWebRTC = () => {
        const rtcNames = ["RTCPeerConnection", "webkitRTCPeerConnection", "mozRTCPeerConnection"];
        rtcNames.forEach(name => {
           if (!scope[name]) return;
           const NativeRTC = scope[name];
           const SafeRTC = function(config, ...args) {
              const safeConfig = config ? Object.assign({}, config) : {};
              safeConfig.iceTransportPolicy = "relay"; 
              safeConfig.iceCandidatePoolSize = 0;
              if (!(this instanceof SafeRTC)) return new NativeRTC(safeConfig, ...args);
              return new NativeRTC(safeConfig, ...args);
           };
           SafeRTC.prototype = NativeRTC.prototype;
           try {
             Object.getOwnPropertyNames(NativeRTC).forEach(prop => {
               if (prop !== "prototype" && prop !== "name" && prop !== "length") {
                 try { SafeRTC[prop] = NativeRTC[prop]; } catch(e) {}
               }
             });
           } catch(e) {}
           scope[name] = protect(NativeRTC, SafeRTC);
        });
      };

      // 2. Canvas & WebGL
      const installGraphics = () => {
        const noise2D = (data, w, h) => {
           for(let i=0; i<data.length; i+=4) {
              if(i % 400 === 0) {
                 const n = detU32(CFG.seed, i) % 2 === 0 ? 1 : -1;
                 data[i] = Math.min(255, Math.max(0, data[i] + n));
              }
           }
        };
        const hookContext = (proto) => {
           hook(proto, "getImageData", (orig) => function() {
              const r = orig.apply(this, arguments);
              if (r.width > 16 && r.height > 16) noise2D(r.data, r.width, r.height);
              return r;
           });
        };
        if (scope.CanvasRenderingContext2D) hookContext(scope.CanvasRenderingContext2D.prototype);
        if (scope.OffscreenCanvasRenderingContext2D) hookContext(scope.OffscreenCanvasRenderingContext2D.prototype);
      };

      // 3. Audio
      const installAudio = () => {
         if (scope.OfflineAudioContext) {
            hook(scope.OfflineAudioContext.prototype, "startRendering", (orig) => function() {
               return orig.apply(this, arguments).then(buf => {
                  if (buf) {
                     const d = buf.getChannelData(0);
                     for (let i=0; i<d.length; i+=100) d[i] += getNoise(i, CFG.seed, C.OFFLINE_AUDIO_NOISE);
                  }
                  return buf;
               });
            });
         }
      };

      installWebRTC(); installGraphics(); installAudio();
    })(typeof self !== "undefined" ? self : window);
    `;

    const injectionScript = `
${nonce ? `<script nonce="${nonce}">` : `<script>`}
(function() {
  const OMNI = ${JSON.stringify(OMNI_MODULE_SOURCE)};
  const setupWorkers = () => {
    if (typeof window === "undefined") return;
    const hookWorker = (Type) => {
      if (!window[Type]) return;
      const Orig = window[Type];
      window[Type] = function(url, opts) {
        let finalUrl = url;
        if (typeof url === 'string') {
           try {
             const content = OMNI + "; importScripts('" + url + "');";
             const blob = new Blob([content], { type: "application/javascript" });
             finalUrl = URL.createObjectURL(blob);
           } catch(e) {}
        }
        return new Orig(finalUrl, opts);
      };
      window[Type].prototype = Orig.prototype;
    };
    hookWorker("Worker"); hookWorker("SharedWorker");
  };
  
  eval(OMNI);
  setupWorkers();
  try { document.documentElement.setAttribute("${CONST.INJECT_MARKER}", "1"); } catch(e){}
})();
</script>
`;
    $done({ body: body.replace(REGEX.HEAD, (m) => m + injectionScript) });
  }
})();


