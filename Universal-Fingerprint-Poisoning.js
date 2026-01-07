/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.11-The-Phantom
 * ----------------------------------------------------------------------------
 * V10.11 像素級精準版 (High-Fidelity Signal Refinement):
 * 1) [GEOMETRY] 瀏海屏感知 (Notch-Aware Screen Geometry):
 * 針對 Apple Silicon MacBook (M2/M3) 修正 availTop 與 availHeight 計算。
 * - Desktop (Mac Studio/iMac): Menu Bar = 24px
 * - Laptop (Notch Models): Menu Bar = 38px (模擬瀏海高度)
 * 解決 "螢幕可用區域存在非標準實作差異" 的邏輯矛盾。
 * 2) [MEDIA] 強化設備枚舉 (Hardened EnumerateDevices):
 * 優化 MediaDeviceInfo 模擬，確保 deviceId/groupId 跨 context 一致性，
 * 並修復原型鏈特徵，降低高敏感訊號的異常評分。
 * 3) [CORE] 繼承 V10.10 完整防禦 (白名單機制、音訊噪聲、WebGL 注入)。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Global Config & Seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V1011",
    INJECT_MARKER: "__FP_SHIELD_V1011__",
    
    // Noise Levels
    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001, 
    OFFLINE_AUDIO_NOISE: 0.00001,
    
    // Timezone: New York
    TARGET_TIMEZONE: "America/New_York",
    TARGET_LOCALE: "en-US",
    TZ_STD: 300,
    TZ_DST: 240
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
          localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + 2592000000}`); // 30 days
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
  // 1) Hardware Whitelist (Expanded Persona Pool with Notch Logic)
  // ============================================================================
  const PERSONA = (function() {
    // hasNotch: 決定 Menu Bar 高度 (24px vs 38px)
    // ratio: 設備像素比
    const POOL = [
      // Desktop: No Notch, Standard Menu Bar (24px)
      { name: "M1_Ultra_Studio", width: 5120, height: 2880, depth: 30, ratio: 2, render: "Apple M1 Ultra", cores: 20, mem: 64, hasNotch: false },
      { name: "M3_iMac_24",      width: 4480, height: 2520, depth: 30, ratio: 2, render: "Apple M3",       cores: 8,  mem: 24, hasNotch: false },
      
      // Laptop: Notch Models, Taller Menu Bar (~38px)
      { name: "M2_Air_13",       width: 2560, height: 1664, depth: 30, ratio: 2, render: "Apple GPU",      cores: 8,  mem: 16, hasNotch: true },
      { name: "M2_Pro_16",       width: 3456, height: 2234, depth: 30, ratio: 2, render: "Apple M2 Pro",   cores: 12, mem: 32, hasNotch: true },
      { name: "M3_Max_16",       width: 3456, height: 2234, depth: 30, ratio: 2, render: "Apple M3 Max",   cores: 16, mem: 48, hasNotch: true }
    ];
    
    const idx = SEED_MANAGER.id % POOL.length;
    const p = POOL[idx];
    
    // MacOS Version Spoofing (Robust 14.x base)
    const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;

    return {
      UA: ua,
      PLATFORM: "MacIntel",
      VENDOR: "Google Inc. (Apple)",
      RENDERER: p.render,
      CONCURRENCY: p.cores,
      MEMORY: p.mem,
      SCREEN: { 
        width: p.width, 
        height: p.height, 
        depth: p.depth, 
        ratio: p.ratio,
        hasNotch: p.hasNotch
      }
    };
  })();

  // ============================================================================
  // 2) Software Whitelist (Exclusion Logic)
  // ============================================================================
  const HELPERS = {
    normalizeHost: (h) => (h || "").toLowerCase().replace(/^\.+/, "").replace(/\.+$/, ""),
    isDomainMatch: (host, domain) => {
      const hh = HELPERS.normalizeHost(host);
      const dd = HELPERS.normalizeHost(domain);
      return hh === dd || hh.endsWith("." + dd);
    }
  };

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) {}

  // A. Hard Exclusion (Do NOT touch)
  const HARD_EXCLUSION_KEYWORDS = [
    // Identity Providers
    "accounts.google.com", "appleid.apple.com", "login.live.com", "oauth", "sso", "okta.com", "auth0.com", "duosecurity.com",
    // Bot Challenges
    "recaptcha", "hcaptcha", "turnstile", "bot-detection", "challenge",
    // Banks (Taiwan)
    "ctbcbank", "cathaybk", "esunbank", "fubon", "taishin", "landbank", "megabank", "firstbank", "hncb", "sinopac", "bot.com.tw", "post.gov.tw",
    // Banks (Intl)
    "citibank", "hsbc", "standardchartered", "jpmorgan", "paypal", "stripe", "wise.com",
    // Payment Gateways
    "ecpay", "newebpay", "line.me", "jkos", "braintree", "adyen", "3dsecure", "acs",
    // AI Services
    "chatgpt.com", "openai.com", "claude.ai", "gemini.google.com",
    // System
    "windowsupdate", "icloud.com", "gov.tw"
  ];

  // B. Soft Whitelist
  const TRUSTED_DOMAINS = [
    "netflix.com", "spotify.com", "disneyplus.com", "youtube.com", "twitch.tv",
    "shopee.tw", "momo.com.tw", "pchome.com.tw", "amazon.com",
    "github.com", "gitlab.com", "figma.com", "canva.com",
    "facebook.com", "instagram.com", "twitter.com", "linkedin.com", "discord.com"
  ];

  const isHardExcluded = HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k));
  const isWhitelisted = TRUSTED_DOMAINS.some(d => HELPERS.isDomainMatch(hostname, d));

  // ============================================================================
  // Phase A: Request Headers (Traffic Layer)
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    if (isHardExcluded || isWhitelisted) { $done({}); return; }

    const headers = $request.headers || {};
    Object.keys(headers).forEach(k => {
        const l = k.toLowerCase();
        if (l === "user-agent" || l.startsWith("sec-ch-ua")) delete headers[k];
    });
    
    headers["User-Agent"] = PERSONA.UA;
    headers["sec-ch-ua"] = `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`;
    headers["sec-ch-ua-mobile"] = "?0";
    headers["sec-ch-ua-platform"] = '"macOS"';
    
    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTML Injection (DOM Layer)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body || isHardExcluded || isWhitelisted) { $done({}); return; }
    
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
      persona: PERSONA,
      consts: CONST
    };

    // ========================================================================
    // 3) The OMNI-MODULE (V10.11 Core)
    // ========================================================================
    const OMNI_MODULE_SOURCE = `
    (function(scope) {
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      const P = CFG.persona;
      const C = CFG.consts;
      
      // --- Utils ---
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

      // --- Geometry (Notch-Aware) ---
      const installScreen = () => {
        if (!scope.screen) return;
        try {
          const S = P.SCREEN;
          const uDock = detU32(CFG.seed, 777); 
          
          // Logic: 38px if Notch, 24px if Standard
          const menuBarH = S.hasNotch ? 38 : 24;
          const dockH = 50 + (uDock % 30); 
          const availH = S.height - menuBarH - dockH; 
          
          Object.defineProperties(scope.screen, {
            width: { get: () => S.width }, 
            height: { get: () => S.height },
            availWidth: { get: () => S.width },
            availHeight: { get: () => availH },
            availLeft: { get: () => 0 }, 
            availTop: { get: () => menuBarH },
            colorDepth: { get: () => S.depth }, 
            pixelDepth: { get: () => S.depth }
          });
          
          if (scope.window && scope.window === scope) {
             try {
                if (scope.outerHeight > S.height) Object.defineProperty(scope, 'outerHeight', { get: () => S.height });
                if (scope.outerWidth > S.width) Object.defineProperty(scope, 'outerWidth', { get: () => S.width });
             } catch(e) {}
          }
        } catch(e) {}
      };

      // --- Media (High-Fidelity) ---
      const installMedia = () => {
        if (!scope.navigator || !scope.navigator.mediaDevices || !scope.navigator.mediaDevices.enumerateDevices) return;
        hook(scope.navigator.mediaDevices, "enumerateDevices", (orig) => function() {
          return new Promise((resolve) => {
             const mkId = (salt) => detU32(CFG.seed, salt).toString(16).padStart(64, '0').substring(0, 44);
             const grpId = mkId(999);
             const devices = [
               { deviceId: mkId(1), kind: "audioinput",  label: "MacBook Pro Microphone", groupId: grpId },
               { deviceId: mkId(2), kind: "videoinput",  label: "FaceTime HD Camera",     groupId: grpId },
               { deviceId: mkId(3), kind: "audiooutput", label: "MacBook Pro Speakers",   groupId: grpId }
             ];
             resolve(devices.map(d => ({
                 deviceId: d.deviceId, 
                 kind: d.kind, 
                 label: d.label, 
                 groupId: d.groupId,
                 toJSON: function() { return { deviceId: this.deviceId, kind: this.kind, label: this.label, groupId: this.groupId }; }
             })));
          });
        });
      };

      // --- Nav ---
      const installNav = () => {
        const N = scope.navigator;
        if(!N) return;
        try {
          Object.defineProperties(N, {
            platform: { get: () => P.PLATFORM },
            hardwareConcurrency: { get: () => P.CONCURRENCY },
            deviceMemory: { get: () => P.MEMORY },
            userAgent: { get: () => P.UA },
            appVersion: { get: () => P.UA.replace("Mozilla/", "") },
            maxTouchPoints: { get: () => 0 },
            plugins: { get: () => { const a=[]; a.item=()=>null; a.namedItem=()=>null; a.refresh=()=>{}; return a; } },
            mimeTypes: { get: () => { const a=[]; a.item=()=>null; a.namedItem=()=>null; return a; } }
          });
          if ("getGamepads" in N) N.getGamepads = protect(N.getGamepads, () => []);
        } catch(e) {}
      };

      // --- Time ---
      const installTime = () => {
        try {
          const getOffset = (d) => {
             try {
               const y = d.getFullYear();
               const mar1 = new Date(y, 2, 1);
               const mar2ndSun = 1 + (14 - mar1.getDay()) % 7 + 7;
               const dstStart = new Date(y, 2, mar2ndSun, 2, 0, 0);
               const nov1 = new Date(y, 10, 1);
               const nov1stSun = 1 + (7 - nov1.getDay()) % 7;
               const dstEnd = new Date(y, 10, nov1stSun, 2, 0, 0);
               if (d >= dstStart && d < dstEnd) return C.TZ_DST;
               return C.TZ_STD;
             } catch(e) { return C.TZ_STD; }
          };
          const DTF = scope.Intl.DateTimeFormat;
          hook(DTF.prototype, "resolvedOptions", (orig) => function() {
            const o = orig.apply(this, arguments); o.timeZone = C.TARGET_TIMEZONE; o.locale = C.TARGET_LOCALE; return o;
          });
          if(scope.Date && scope.Date.prototype) {
             scope.Date.prototype.getTimezoneOffset = function() { return getOffset(this); };
          }
        } catch(e) {}
      };

      // --- Graphics ---
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

        const hookGL = (proto) => {
           hook(proto, "getParameter", (orig) => function(p) {
              if (p === 37445) return "Google Inc. (Apple)";
              if (p === 37446) return P.RENDERER;
              return orig.apply(this, arguments);
           });
        };
        if (scope.WebGLRenderingContext) hookGL(scope.WebGLRenderingContext.prototype);
        if (scope.WebGL2RenderingContext) hookGL(scope.WebGL2RenderingContext.prototype);
      };

      // --- Audio ---
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

      installNav(); installScreen(); installTime(); installMedia(); installGraphics(); installAudio();
    })(typeof self !== "undefined" ? self : window);
    `;

    // 4) Worker Injection & Main Exec
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
