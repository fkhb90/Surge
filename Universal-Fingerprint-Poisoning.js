/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.26-Regression-Verified
 * @author    Jerry's AI Assistant
 * @updated   2026-01-09
 * ----------------------------------------------------------------------------
 * [V10.26 回歸驗證版]:
 * 1) [PASSED] 購物模式 (Shopping Mode) 邏輯驗證通過：
 * - 確認在 Script 最前端 (Layer 0) 立即攔截並放行，保障 100% 原生環境。
 * 2) [PASSED] 向下相容性 (Backward Compatibility)：
 * - 繼承 V10.14 的種子算法，確保指紋 ID 在升級過程中保持穩定。
 * 3) [STRATEGY] iPhone 最佳化策略 (Crowd Blending)：
 * - 僅毒化 Canvas/Audio/WebRTC，保留原生 UA 與視窗參數，完美支援 RWD 與觸控。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Mode Check (Critical Logic: The Kill Switch)
  // ============================================================================
  // [邏輯驗證]: 這是腳本的第一道閘門。
  // 若 FP_MODE 為 shopping，直接 return $done({})，確保後續任何注入代碼都不會執行。
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          console.log("[FP-Shield] 🛍️ 購物模式已啟用 (Shopping Mode) - 腳本已暫停，環境純淨。");
          if (typeof $done !== "undefined") $done({});
          return; // [EXIT POINT] 確保完全退出
      }
  }

  // ============================================================================
  // 1) Global Config & Seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V1014", // [COMPATIBILITY] 保持 Key 不變
    INJECT_MARKER: "__FP_SHIELD_V1026__",
    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001, 
    OFFLINE_AUDIO_NOISE: 0.00001
  };

  // 生成每日固定的隨機種子
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
  // 2) Whitelist System (Hybrid Database from V10.24)
  // ============================================================================
  const HARD_EXCLUSION_KEYWORDS = [
    // Identity & Infra
    "accounts.google.com", "appleid.apple.com", "login.live.com", "icloud.com",
    "oauth", "sso", "okta.com", "auth0.com", "microsoft.com", "windowsupdate",
    "gov.tw", "edu.tw", 
    // Bot Protection
    "recaptcha", "hcaptcha", "turnstile", "arkoselabs", "oaistatic.com",
    // Banking (Taiwan)
    "ctbcbank", "cathaybk", "esunbank", "fubon", "taishin", 
    "landbank", "megabank", "firstbank", "citibank", "hsbc", 
    "hncb", "changhwabank", "sinopac", "bot.com.tw", "post.gov.tw", 
    "standardchartered", "richart", "dawho",
    // Payment
    "paypal", "stripe", "ecpay", "line.me", "jkos", "jko.com",
    "twmp.com.tw", "taiwanpay", "braintreegateway", "adyen",
    // AI Services
    "openai.com", "chatgpt.com", "anthropic.com", "claude.ai",
    "gemini.google.com", "bard.google.com", "perplexity.ai", 
    "bing.com", "copilot.microsoft.com", "monica.im", "felo.ai",
    // Delivery
    "foodpanda", "fd-api", "deliveryhero", "uber.com", "ubereats"
  ];

  const WhitelistManager = (() => {
    const trustedWildcards = [
        "shopee", "momo", "pchome", "books.com.tw", "coupang", "amazon", "pxmart", "etmall", "rakuten", "shopback",
        "netflix", "spotify", "disney", "youtube", "twitch", "hulu", "iqiyi", "kktix", "tixcraft",
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
  
  // [邏輯驗證]: 白名單檢查
  // 若命中，後續注入將被跳過 (Skip Poisoning)，但仍保持腳本運作 (Monitor Mode)
  const isExcluded = HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k)) || WhitelistManager.isTrusted(lowerUrl);

  // ============================================================================
  // Phase A: Request Headers Modification
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    // [邏輯驗證]: iPhone Optimized 策略
    // 直接放行，不修改 UA。確保 RWD 排版與觸控事件正常。
    $done({}); 
    return;
  }

  // ============================================================================
  // Phase B: HTML Injection (Core Poisoning)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    // [邏輯驗證]: 排除檢查
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

    // [邏輯驗證]: 輕量化注入模組 (針對 iPhone 優化)
    // 僅保留 WebRTC, Graphics, Audio。移除了 Navigator 與 Screen 偽裝，避免精神分裂。
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

      // 1. WebRTC (Privacy)
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

      // 2. Canvas & WebGL (Anti-Fingerprinting)
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

      // 3. AudioContext (Anti-Fingerprinting)
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
