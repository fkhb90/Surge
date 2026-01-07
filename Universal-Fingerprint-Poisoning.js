/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.14-Crowd-Blender
 * @author    Jerry's AI Assistant
 * ----------------------------------------------------------------------------
 * V10.14 大眾混淆版 (Crowd Blender):
 * 1) [EXPANSION] 硬體池擴充至 10 組，引入 "Common Man" (Air/14") 與 "External Display" 策略。
 * 2) [CONTROL] 繼承 V10.13 的面板開關邏輯 (Shopping Mode)。
 * 3) [CORE] 繼承 V10.12 的核心防護 (WebRTC Relay, Notch Logic, Omni-Module)。
 * * 使用說明:
 * - 配合 Surge 面板切換 "FP_MODE" 為 "shopping" 可暫停腳本。
 * - 預設為保護模式 (當 FP_MODE 不存在或為其他值時)。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Mode Check (The Switch Logic)
  // ============================================================================
  // 若此腳本運行在 Surge 環境，讀取持久化存儲
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      // 如果是購物模式 (shopping)，則直接退出，不做任何處理
      if (currentMode === "shopping") {
          console.log("[FP-Shield] 購物模式已啟用 (Shopping Mode Active)。腳本暫停中...");
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 1) Global Config & Seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V1014", // 更新 Key 以重新洗牌用戶的隨機特徵
    INJECT_MARKER: "__FP_SHIELD_V1014__",
    // Noise Levels
    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001, 
    OFFLINE_AUDIO_NOISE: 0.00001,
    // Timezone & Locale (可視需求調整)
    TARGET_TIMEZONE: "America/New_York",
    TARGET_LOCALE: "en-US",
    TZ_STD: 300,
    TZ_DST: 240
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
  // 2) Hardware Persona (Expanded to 10 Profiles)
  // ============================================================================
  const PERSONA = (function() {
    const POOL = [
      // --- High-End Workstations (高階工作站) ---
      { name: "M1_Ultra_Studio", width: 5120, height: 2880, depth: 30, ratio: 2, render: "Apple M1 Ultra", cores: 20, mem: 64, hasNotch: false },
      { name: "M3_Max_16",       width: 3456, height: 2234, depth: 30, ratio: 2, render: "Apple M3 Max",   cores: 16, mem: 48, hasNotch: true },

      // --- The "Common Man" (國民機型 - 銷量最大) ---
      // M1 Air: 市場存量最大，無瀏海，最安全的偽裝
      { name: "M1_Air_13",       width: 2560, height: 1600, depth: 30, ratio: 2, render: "Apple M1",       cores: 8,  mem: 8,  hasNotch: false },
      // M2 Air: 主流新款 Air
      { name: "M2_Air_13",       width: 2560, height: 1664, depth: 30, ratio: 2, render: "Apple M2",       cores: 8,  mem: 16, hasNotch: true },
      // M3 Air 15: 逐漸普及的大螢幕 Air
      { name: "M3_Air_15",       width: 2880, height: 1864, depth: 30, ratio: 2, render: "Apple M3",       cores: 8,  mem: 16, hasNotch: true },

      // --- The "Pro" Standard (主流開發機型) ---
      // 14吋 Pro: 開發者最愛
      { name: "M1_Pro_14",       width: 3024, height: 1964, depth: 30, ratio: 2, render: "Apple M1 Pro",   cores: 10, mem: 16, hasNotch: true },
      { name: "M2_Pro_14",       width: 3024, height: 1964, depth: 30, ratio: 2, render: "Apple M2 Pro",   cores: 12, mem: 32, hasNotch: true },
      
      // --- Desktop / iMac ---
      { name: "M3_iMac_24",      width: 4480, height: 2520, depth: 30, ratio: 2, render: "Apple M3",       cores: 8,  mem: 24, hasNotch: false },

      // --- External Display Simulation (外接螢幕偽裝) ---
      // 模擬 Mac 接上外接螢幕 (Clamshell Mode)，這是極佳的隱匿手段
      // 4K Monitor: ratio=2 (Retina), hasNotch=false
      { name: "M2_Pro_Ext_4K",   width: 3840, height: 2160, depth: 24, ratio: 2, render: "Apple M2 Pro",   cores: 12, mem: 32, hasNotch: false },
      // 2K Monitor: ratio=1 (Non-Retina), hasNotch=false
      { name: "M1_Max_Ext_2K",   width: 2560, height: 1440, depth: 24, ratio: 1, render: "Apple M1 Max",   cores: 10, mem: 32, hasNotch: false }
    ];
    
    const idx = SEED_MANAGER.id % POOL.length;
    const p = POOL[idx];
    
    // User-Agent Freezing 策略: 始終保持 10_15_7 與 Intel，以符合 Chrome 的真實行為
    const ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;

    return {
      UA: ua,
      PLATFORM: "MacIntel", // 即使是 M1/M3，此值在瀏覽器中仍為 MacIntel
      VENDOR: "Google Inc. (Apple)",
      RENDERER: p.render,
      CONCURRENCY: p.cores,
      MEMORY: p.mem,
      SCREEN: { width: p.width, height: p.height, depth: p.depth, ratio: p.ratio, hasNotch: p.hasNotch }
    };
  })();

  // ============================================================================
  // 3) Software Whitelist (Hard Exclusions)
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
  
  // 硬性排除列表：確保關鍵服務不崩潰
  const HARD_EXCLUSION_KEYWORDS = [
    "accounts.google.com", "appleid.apple.com", "login.live.com", "oauth", "sso", "okta.com", "auth0.com",
    "recaptcha", "hcaptcha", "turnstile",
    "ctbcbank", "cathaybk", "esunbank", "fubon", "taishin", "landbank", "megabank", "firstbank",
    "citibank", "hsbc", "paypal", "stripe", "ecpay", "line.me", "jkos"
  ];
  
  const isHardExcluded = HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k));

  // ============================================================================
  // Phase A: Request Headers Modification
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    if (isHardExcluded) { $done({}); return; }

    const headers = $request.headers || {};
    // 移除原始 UA 與 Client Hints
    Object.keys(headers).forEach(k => {
        const l = k.toLowerCase();
        if (l === "user-agent" || l.startsWith("sec-ch-ua")) delete headers[k];
    });
    
    // 注入偽裝 Header (符合 Chrome 標準行為)
    headers["User-Agent"] = PERSONA.UA;
    headers["sec-ch-ua"] = `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`;
    headers["sec-ch-ua-mobile"] = "?0"; // ?0 代表 Desktop
    headers["sec-ch-ua-platform"] = '"macOS"'; // 這是現代瀏覽器識別 OS 的主要方式
    
    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTML Injection (The Omni Module)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body || isHardExcluded) { $done({}); return; }
    
    const headers = $response.headers || {};
    const cType = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    if (!cType.includes("html")) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    // CSP 檢查
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
    
    // 如果 CSP 嚴格禁止且無 Nonce，則放棄注入以防白屏
    if (!allowInline && !nonce) { $done({}); return; }

    const INJECT_CONFIG = {
      seed: SEED_MANAGER.id,
      daily: SEED_MANAGER.daily,
      persona: PERSONA,
      consts: CONST
    };

    // --- 瀏覽器端執行的注入代碼 ---
    const OMNI_MODULE_SOURCE = `
    (function(scope) {
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      const P = CFG.persona;
      const C = CFG.consts;
      
      // Deterministic Random Generator
      const detU32 = (seed, salt) => {
        let s = (seed ^ salt) >>> 0; s ^= (s << 13); s ^= (s >>> 17); s ^= (s << 5); return (s >>> 0);
      };
      const getNoise = (val, seed, scale) => {
        const u = detU32(seed, val);
        return (((u % 2001) - 1000) / 1000) * scale;
      };
      
      // Proxy Protection Helper
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

      // 1. WebRTC Leak Protection
      const installWebRTC = () => {
        const rtcNames = ["RTCPeerConnection", "webkitRTCPeerConnection", "mozRTCPeerConnection"];
        rtcNames.forEach(name => {
           if (!scope[name]) return;
           const NativeRTC = scope[name];
           const SafeRTC = function(config, ...args) {
              const safeConfig = config ? Object.assign({}, config) : {};
              safeConfig.iceTransportPolicy = "relay"; // 強制 Relay，隱藏真實 IP
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

      // 2. Screen Geometry & Notch Simulation
      const installScreen = () => {
        if (!scope.screen) return;
        try {
          const S = P.SCREEN;
          const uDock = detU32(CFG.seed, 777); 
          const menuBarH = S.hasNotch ? 38 : 24; // 瀏海機型 Menu Bar 較高
          const dockH = 50 + (uDock % 30); 
          const availH = S.height - menuBarH - dockH; 
          
          Object.defineProperties(scope.screen, {
            width: { get: () => S.width }, height: { get: () => S.height },
            availWidth: { get: () => S.width }, availHeight: { get: () => availH },
            availLeft: { get: () => 0 }, availTop: { get: () => menuBarH },
            colorDepth: { get: () => S.depth }, pixelDepth: { get: () => S.depth }
          });
          if (scope.window && scope.window === scope) {
             try {
                if (scope.outerHeight > S.height) Object.defineProperty(scope, 'outerHeight', { get: () => S.height });
                if (scope.outerWidth > S.width) Object.defineProperty(scope, 'outerWidth', { get: () => S.width });
             } catch(e) {}
          }
        } catch(e) {}
      };

      // 3. Media Devices (Hardware Enumeration)
      const installMedia = () => {
        if (!scope.navigator || !scope.navigator.mediaDevices || !scope.navigator.mediaDevices.enumerateDevices) return;
        hook(scope.navigator.mediaDevices, "enumerateDevices", (orig) => function() {
          return new Promise((resolve) => {
             const mkId = (salt) => detU32(CFG.seed, salt).toString(16).padStart(64, '0').substring(0, 44);
             const grpId = mkId(999);
             // 模擬標準 Mac 設備列表
             const devices = [
               { deviceId: mkId(1), kind: "audioinput",  label: "MacBook Pro Microphone", groupId: grpId },
               { deviceId: mkId(2), kind: "videoinput",  label: "FaceTime HD Camera",     groupId: grpId },
               { deviceId: mkId(3), kind: "audiooutput", label: "MacBook Pro Speakers",   groupId: grpId }
             ];
             resolve(devices.map(d => ({
                 deviceId: d.deviceId, kind: d.kind, label: d.label, groupId: d.groupId,
                 toJSON: function() { return { deviceId: this.deviceId, kind: this.kind, label: this.label, groupId: this.groupId }; }
             })));
          });
        });
      };

      // 4. Navigator Properties
      const installNav = () => {
        const N = scope.navigator;
        if(!N) return;
        try {
          Object.defineProperties(N, {
            platform: { get: () => P.PLATFORM }, // Always MacIntel
            hardwareConcurrency: { get: () => P.CONCURRENCY },
            deviceMemory: { get: () => P.MEMORY },
            userAgent: { get: () => P.UA },
            appVersion: { get: () => P.UA.replace("Mozilla/", "") },
            maxTouchPoints: { get: () => 0 },
            // 隱藏插件列表
            plugins: { get: () => { const a=[]; a.item=()=>null; a.namedItem=()=>null; a.refresh=()=>{}; return a; } },
            mimeTypes: { get: () => { const a=[]; a.item=()=>null; a.namedItem=()=>null; return a; } }
          });
          if ("getGamepads" in N) N.getGamepads = protect(N.getGamepads, () => []);
        } catch(e) {}
      };

      // 5. Timezone & Locale
      const installTime = () => {
        try {
          const getOffset = (d) => {
             try {
               const y = d.getFullYear();
               // 簡單的美東 DST 計算邏輯
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

      // 6. Canvas & WebGL Fingerprint Noise
      const installGraphics = () => {
        const noise2D = (data, w, h) => {
           for(let i=0; i<data.length; i+=4) {
              // 每 400 像素注入一次微量噪聲
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
              // 37445: UNMASKED_VENDOR_WEBGL, 37446: UNMASKED_RENDERER_WEBGL
              if (p === 37445) return "Google Inc. (Apple)";
              if (p === 37446) return P.RENDERER;
              return orig.apply(this, arguments);
           });
        };
        if (scope.WebGLRenderingContext) hookGL(scope.WebGLRenderingContext.prototype);
        if (scope.WebGL2RenderingContext) hookGL(scope.WebGL2RenderingContext.prototype);
      };

      // 7. AudioContext Fingerprint Noise
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

      installWebRTC(); installNav(); installScreen(); installTime(); installMedia(); installGraphics(); installAudio();
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
             // 嘗試為 Worker 注入保護代碼
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
