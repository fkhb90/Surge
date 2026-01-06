/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   5.48-Consistency-Hardened
 * @description [V5.48 一致性強化版]
 * ----------------------------------------------------------------------------
 * 修正重點（對應 v5.47 扣分原因）：
 * 1) Persona 一致性：新增 ARCH（arm/intel），Intel Persona 改用 Ventura 13.x，
 *    避免「Apple GPU + x86 + 新版 platformVersion」的高關聯異常。
 * 2) UA-CH architecture：依 Persona ARCH 回傳 arm/x86，降低 Rosetta 強特徵誤傷。
 * 3) Soft whitelist：由 hostname.includes 改為 eTLD+1/子域 endsWith 比對，避免誤放行。
 * 4) OffscreenCanvas：改為存在性檢查後再 hook，提升舊 WebView 相容性。
 * 5) 其他：Shopping 判斷也改為 domain match，降低混淆風險。
 *
 * @note 建議在 Surge/Loon/Quantumult X 中啟用「腳本重寫」功能。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全域配置 & 雙重種子管理
  // ============================================================================
  const CONST = {
    // Keys for Storage (Updated to V548 to force refresh)
    KEY_PERSISTENCE: "FP_SHIELD_ID_V548",
    INJECT_MARKER: "__FP_SHIELD_V548__",

    // Configs
    PERSONA_TTL_MS: 30 * 24 * 60 * 60 * 1000, // 30 Days Identity

    // Dynamic Window Config (Daily Rotated)
    WINDOW_MIN_MS: 20 * 60 * 1000, // 20 Minutes
    WINDOW_VAR_MS: 30 * 60 * 1000, // +0~30 Minutes variance

    // Noise Intensity
    CANVAS_NOISE_STEP: 2,         // Base step, modified by Jitter
    AUDIO_NOISE_LEVEL: 0.00001,
    TEXT_METRICS_NOISE: 0.0001,
    RECT_NOISE_LEVEL: 0.000001,
    DRIFT_INTENSITY: 0.000002
  };

  // Seed Manager: Handles Identity vs Session separation
  const SEED_MANAGER = (function () {
    const now = Date.now();

    // 1. Long-Term Identity Seed (Hardware Specs)
    let idSeed = 12345;
    try {
      const storedId = localStorage.getItem(CONST.KEY_PERSISTENCE);
      if (storedId) {
        const [val, expiry] = storedId.split("|");
        if (now < parseInt(expiry, 10)) {
          idSeed = parseInt(val, 10);
        } else {
          // Rotate Identity (Monthly)
          idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
          localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + CONST.PERSONA_TTL_MS}`);
        }
      } else {
        // New Identity
        idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
        localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + CONST.PERSONA_TTL_MS}`);
      }
    } catch (e) { }

    // 2. Daily Rhythm Rotation (UTC day block)
    const dayBlock = Math.floor(now / (24 * 60 * 60 * 1000));
    const dailySeed = (idSeed ^ dayBlock) >>> 0;

    // Calculate today's unique window duration (20 ~ 50 mins)
    const dailyWindowSize = CONST.WINDOW_MIN_MS + ((dailySeed % 30000) * (CONST.WINDOW_VAR_MS / 30000));

    // Determine current Time Block based on today's rhythm
    const timeBlock = Math.floor(now / dailyWindowSize);

    // 3. Session Seed (Noise Drift)
    const sessionSeed = (idSeed ^ timeBlock) >>> 0;

    // Deterministic Random Helper
    const makeRand = (s) => {
      return (idx) => {
        let x = (s + idx) * 15485863;
        return ((x * x * x) % 2038074743) / 2038074743;
      };
    };

    return {
      id: idSeed,
      daily: dailySeed,
      session: sessionSeed,
      randId: makeRand(idSeed),
      randSession: makeRand(sessionSeed)
    };
  })();

  // ============================================================================
  // Helpers: Domain match (修正 Soft whitelist includes 風險)
  // ============================================================================
  const Domain = (() => {
    const normalizeHost = (h) => (h || "").toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
    const isDomainMatch = (host, domain) => {
      const h = normalizeHost(host);
      const d = normalizeHost(domain);
      if (!h || !d) return false;
      return (h === d) || h.endsWith("." + d);
    };
    return { normalizeHost, isDomainMatch };
  })();

  // ============================================================================
  // Persistent Persona Configuration (Modernized V5.48)
  // ============================================================================
  const PERSONA_CONFIG = (function () {
    // Pool: Intel (Ventura 13.x) + Apple Silicon (Sonoma/Sequoia 14/15)
    const MAC_POOL = [
      // Intel (High-end retained for variety, align to Ventura)
      {
        name: "Intel_i9_Pro16",
        ARCH: "intel",
        uaModel: "Macintosh; Intel Mac OS X 10_15_7",
        osVer: "13.6.7", // Ventura line for plausibility
        gpuVendor: "Google Inc. (AMD)",
        gpuRenderer: "AMD Radeon Pro 5500M",
        concurrency: 8,
        memory: 32,
        screen: { depth: 30, pixelRatio: 2 }
      },

      // Apple Silicon (Modern Mainstream)
      {
        name: "M2_Air",
        ARCH: "arm",
        uaModel: "Macintosh; Intel Mac OS X 10_15_7", // Chrome 常見凍結 UA
        osVer: "14.7.1",
        gpuVendor: "Google Inc. (Apple)",
        gpuRenderer: "Apple GPU",
        concurrency: 8,
        memory: 16,
        screen: { depth: 30, pixelRatio: 2 }
      },
      {
        name: "M2_Pro14",
        ARCH: "arm",
        uaModel: "Macintosh; Intel Mac OS X 10_15_7",
        osVer: "15.2.0",
        gpuVendor: "Google Inc. (Apple)",
        gpuRenderer: "Apple M2 Pro",
        concurrency: 10,
        memory: 16,
        screen: { depth: 30, pixelRatio: 2 }
      },
      {
        name: "M3_Pro16",
        ARCH: "arm",
        uaModel: "Macintosh; Intel Mac OS X 10_15_7",
        osVer: "15.2.0",
        gpuVendor: "Google Inc. (Apple)",
        gpuRenderer: "Apple M3 Max",
        concurrency: 12,
        memory: 36,
        screen: { depth: 30, pixelRatio: 2 }
      },
      {
        name: "M3_iMac",
        ARCH: "arm",
        uaModel: "Macintosh; Intel Mac OS X 10_15_7",
        osVer: "14.7.1",
        gpuVendor: "Google Inc. (Apple)",
        gpuRenderer: "Apple GPU",
        concurrency: 8,
        memory: 24,
        screen: { depth: 30, pixelRatio: 2 }
      }
    ];

    // Select Persona based on Long-Term ID Seed
    const pIndex = Math.floor(SEED_MANAGER.randId(1) * MAC_POOL.length);
    const selectedMac = MAC_POOL[pIndex];

    // Dynamic Versioning - Calibrated for Early 2026 (v138 - v142)
    const majorBase = 138;
    const majorOffset = Math.floor(SEED_MANAGER.randId(2) * 5);
    const major = (majorBase + majorOffset).toString();

    const build = Math.floor(SEED_MANAGER.randId(3) * 5000) + 1000;
    const patch = Math.floor(SEED_MANAGER.randId(4) * 200) + 1;
    const fullVersion = `${major}.0.${build}.${patch}`;

    return {
      MAC: {
        TYPE: "SPOOF",
        ARCH: selectedMac.ARCH,
        UA: `Mozilla/5.0 (${selectedMac.uaModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullVersion} Safari/537.36`,
        FULL_VERSION: fullVersion,
        MAJOR_VERSION: major,
        OS_VERSION: selectedMac.osVer, // Used for UA Data (platformVersion)
        PLATFORM: "MacIntel",
        VENDOR: selectedMac.gpuVendor,
        RENDERER: selectedMac.gpuRenderer,
        CONCURRENCY: selectedMac.concurrency,
        MEMORY: selectedMac.memory,
        SCREEN_FEATURES: selectedMac.screen,
        AUDIO_LATENCY: { base: 0.0029, output: 0.0058 },
        WEBGL_CAPS: {
          3379: 16384, 34047: 16, 34930: 16, 35660: 80, 34024: 16384,
          34921: 16, 36347: 4096, 36349: 1024, 34076: 16384, 37443: 6408
        }
      },
      IOS: {
        TYPE: "NATIVE",
        UA: null,
        PLATFORM: "iPhone",
        VENDOR: "Apple Inc.",
        RENDERER: "Apple GPU"
      }
    };
  })();

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    HEAD_TAG: /<head[^>]*>/i,
    HTML_TAG: /<html[^>]*>/i,
    SCRIPT_NONCE_STRICT: /<script[^>]*\snonce=["']?([^"'\s>]+)["']?/i,
    RTC_PRIVATE_IPV4: /(^| )192\.168\.|(^| )10\.|(^| )172\.(1[6-9]|2[0-9]|3[0-1])\./
  };

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) { }

  const ENV = (() => {
    let sys = "iOS";
    try { if (typeof $environment !== "undefined") sys = $environment["system"] || sys; } catch (e) { }
    if (/mac/i.test(sys)) return "MAC";
    return "IOS";
  })();

  const CURRENT_PERSONA = PERSONA_CONFIG[ENV];

  // ============================================================================
  // EXCLUSION & WHITELIST LOGIC
  // ============================================================================

  // Tier 0: Hard Exclusion (金融、驗證、AI、核心服務) - 禁止任何注入
  const HARD_EXCLUSION_KEYWORDS = [
    // Identity & Security
    "accounts.google.com", "appleid", "login.live.com", "oauth", "sso",
    "recaptcha", "hcaptcha", "turnstile", "bot-detection",
    "okta.com", "auth0.com", "duosecurity.com",

    // Banks (Taiwan Major)
    "ctbcbank.com", "cathaybk.com.tw", "esunbank.com.tw", "fubon.com", "taishinbank.com.tw",
    "landbank.com.tw", "megabank.com.tw", "firstbank.com.tw", "hncb.com.tw", "changhwabank.com.tw",
    "sinopac.com", "bot.com.tw", "post.gov.tw", "citibank", "hsbc", "standardchartered",
    "twmp.com.tw", "taiwanpay", "richart", "dawho",

    // Payment Gateways
    "paypal.com", "stripe.com", "ecpay.com.tw", "jkos.com", "line.me", "jko.com",
    "braintreegateway.com", "adyen.com",

    // AI Services
    "chatgpt.com", "claude.ai", "openai.com", "perplexity.ai", "gemini.google.com",
    "bard.google.com", "anthropic.com", "bing.com/chat", "monica.im", "felo.ai",

    // Delivery & Service
    "foodpanda", "fd-api", "deliveryhero", "uber.com", "ubereats",

    // Critical Infrastructure
    "gov.tw", "edu.tw", "microsoft.com", "windowsupdate", "icloud.com"
  ];

  if (HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k))) { $done({}); return; }

  // Tier 0.5: Soft Whitelist (修正：domain match，不用 includes)
  const WhitelistManager = (() => {
    const trustedDomains = [
      // Shopping / Marketplace
      "shopee.tw", "shopee.com",
      "momo.com.tw",
      "pchome.com.tw",
      "books.com.tw",
      "coupang.com",
      "amazon.com", "amazon.co.jp",
      "taobao.com", "tmall.com", "jd.com",
      "pxmart.com.tw",
      "etmall.com.tw",
      "rakuten.com", "rakuten.co.jp",
      "shopback.com.tw", "shopback.com",

      // Entertainment
      "netflix.com",
      "spotify.com",
      "disneyplus.com",
      "youtube.com",
      "twitch.tv",
      "hulu.com",
      "iqiyi.com",
      "kktix.com",
      "tixcraft.com",

      // Dev / Work
      "github.com",
      "gitlab.com",
      "notion.so",
      "figma.com",
      "canva.com",
      "dropbox.com",
      "adobe.com",

      // Infra / CDN common
      "cloudflare.com",
      "fastly.com",
      "jsdelivr.net",
      "googleapis.com",
      "gstatic.com",

      // Social
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "x.com",
      "linkedin.com",
      "discord.com",
      "threads.net"
    ];

    const suffixes = [".bank", ".pay", ".secure", ".gov", ".edu", ".mil"];

    return {
      check: (h) => {
        const host = Domain.normalizeHost(h);
        if (!host) return false;
        for (const s of suffixes) if (host.endsWith(s)) return true;
        for (const d of trustedDomains) if (Domain.isDomainMatch(host, d)) return true;
        return lowerUrl.includes("3dsecure") || lowerUrl.includes("acs");
      }
    };
  })();

  const isSoftWhitelisted = WhitelistManager.check(hostname);

  // Shopping 判斷（修正：domain match）
  const IS_SHOPPING = (() => {
    const h = Domain.normalizeHost(hostname);
    return Domain.isDomainMatch(h, "shopee.tw") ||
      Domain.isDomainMatch(h, "shopee.com") ||
      Domain.isDomainMatch(h, "amazon.com") ||
      Domain.isDomainMatch(h, "amazon.co.jp") ||
      Domain.isDomainMatch(h, "momo.com.tw");
  })();

  // ============================================================================
  // Phase A: Network Layer (Headers)
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    const headers = $request.headers || {};
    if (!isSoftWhitelisted && !IS_SHOPPING && CURRENT_PERSONA && CURRENT_PERSONA.TYPE === "SPOOF") {
      Object.keys(headers).forEach(k => {
        const l = k.toLowerCase();
        if (l === "user-agent" || l.startsWith("sec-ch-ua")) delete headers[k];
      });

      headers["User-Agent"] = CURRENT_PERSONA.UA;
      headers["sec-ch-ua"] = `"Not(A:Brand";v="99", "Google Chrome";v="${CURRENT_PERSONA.MAJOR_VERSION}", "Chromium";v="${CURRENT_PERSONA.MAJOR_VERSION}"`;
      headers["sec-ch-ua-mobile"] = "?0";
      headers["sec-ch-ua-platform"] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: Browser Environment (Injection)
  // ============================================================================
  if (typeof $response !== "undefined") {
    let body = $response.body;
    const headers = $response.headers || {};
    const cType = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();

    if (!body || !cType.includes("html") || IS_SHOPPING || isSoftWhitelisted) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    let stolenNonce = "";
    const searchChunk = body.substring(0, 100000);
    const scriptMatch = searchChunk.match(REGEX.SCRIPT_NONCE_STRICT);
    if (scriptMatch) stolenNonce = scriptMatch[1];

    let cspHeader = "";
    Object.keys(headers).forEach(k => { if (k.toLowerCase() === "content-security-policy") cspHeader = headers[k]; });
    const isUnsafeInlineAllowed = cspHeader.includes("'unsafe-inline'");
    const hasCSP = cspHeader.length > 0;

    let shouldInject = false;
    if (stolenNonce) shouldInject = true;
    else if (!hasCSP || isUnsafeInlineAllowed) shouldInject = true;

    if (!shouldInject) { $done({}); return; }

    const INJECT_CONFIG = {
      env: ENV,
      persona: CURRENT_PERSONA,
      noise: {
        canvas: CONST.CANVAS_NOISE_STEP,
        audio: CONST.AUDIO_NOISE_LEVEL,
        text: CONST.TEXT_METRICS_NOISE,
        rect: CONST.RECT_NOISE_LEVEL,
        drift: CONST.DRIFT_INTENSITY
      },
      seed: SEED_MANAGER.session,
      dailySeed: SEED_MANAGER.daily
    };

    const scriptTag = stolenNonce ? `<script nonce="${stolenNonce}">` : `<script>`;

    const injectionScript = `
    ${scriptTag}
    (function() {
      "use strict";
      const __MARK = "${CONST.INJECT_MARKER}";
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      const P = CFG.persona || {};
      const SPOOFING = (P.TYPE === "SPOOF");

      const RNG = (function(seed) {
          let s = seed >>> 0;
          return {
             next: function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; },
             bool: function() { return this.next() > 0.5; },
             noise: function(val, range) { return val + (this.next() * range * 2 - range); },
             pick: function(arr) { return arr[Math.floor(this.next() * arr.length)]; }
          };
      })(CFG.seed);

      // Micro-Jitter for Canvas (changes daily)
      const JITTER = (function(dSeed) {
         let s = (dSeed >>> 0);
         const n = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
         return { factor: 1 + (n() * 0.05) }; // 0% ~ 5% variation daily
      })(CFG.dailySeed);

      // ProxyGuard: keep toString stealth (降低暴露面：盡量模擬原生描述)
      const ProxyGuard = (function() {
          const toStringMap = new WeakMap();
          const nativeToString = Function.prototype.toString;

          const safeToString = function() {
              if (toStringMap.has(this)) return toStringMap.get(this);
              return nativeToString.apply(this, arguments);
          };

          try {
              // 以 defineProperty 降低顯眼度（仍需覆寫以處理 Function.prototype.toString.call(proxyFn)）
              Object.defineProperty(Function.prototype, "toString", {
                value: safeToString,
                writable: true,
                enumerable: false,
                configurable: true
              });
          } catch(e) {}

          toStringMap.set(safeToString, "function toString() { [native code] }");

          return {
             protect: function(native, custom) {
                 const p = new Proxy(custom, {
                     apply: (t, th, a) => { try{return Reflect.apply(t,th,a)}catch(e){return Reflect.apply(native,th,a)} },
                     construct: (t, a, n) => { try{return Reflect.construct(t,a,n)}catch(e){return Reflect.construct(native,a,n)} },
                     get: (t, k) => Reflect.get(t, k)
                 });
                 const name = native && native.name ? native.name : "";
                 const sig = "function " + name + "() { [native code] }";
                 toStringMap.set(p, sig);
                 toStringMap.set(custom, sig);
                 return p;
             },
             hook: function(proto, prop, handler) {
                 if (!proto || typeof proto[prop] !== 'function') return;
                 proto[prop] = this.protect(proto[prop], handler(proto[prop]));
             }
          };
      })();

      const Modules = {
         hardware: function(win) {
             const N = win.navigator;
             if (SPOOFING) {
                 try {
                   Object.defineProperties(N, {
                       'platform': {get: () => P.PLATFORM},
                       'maxTouchPoints': {get: () => 0},
                       'hardwareConcurrency': {get: () => P.CONCURRENCY},
                       'deviceMemory': {get: () => P.MEMORY},
                       'userAgent': {get: () => P.UA},
                       'appVersion': {get: () => P.UA.replace("Mozilla/", "")}
                   });
                 } catch(e) {}

                 if (win.screen && P.SCREEN_FEATURES) {
                     const SF = P.SCREEN_FEATURES;
                     try {
                       Object.defineProperties(win.screen, {
                           'colorDepth': {get: () => SF.depth},
                           'pixelDepth': {get: () => SF.depth}
                       });
                     } catch(e) {}
                     if ('devicePixelRatio' in win) {
                         try { Object.defineProperty(win, 'devicePixelRatio', {get: () => SF.pixelRatio}); } catch(e) {}
                     }
                 }

                 // UA-CH 修正：architecture 依 Persona ARCH 回傳
                 if (N.userAgentData) {
                     const uaData = {
                         brands: [
                            {brand: "Not(A:Brand", version: "99"},
                            {brand: "Google Chrome", version: P.MAJOR_VERSION},
                            {brand: "Chromium", version: P.MAJOR_VERSION}
                        ],
                         mobile: false,
                         platform: "macOS",
                         getHighEntropyValues: function(hints) {
                            const res = {};
                            res.brands = this.brands; res.mobile = this.mobile; res.platform = this.platform;
                            if (Array.isArray(hints)) {
                                if (hints.includes('architecture')) res.architecture = (P.ARCH === "arm") ? "arm" : "x86";
                                if (hints.includes('bitness')) res.bitness = "64";
                                if (hints.includes('model')) res.model = "";
                                if (hints.includes('platformVersion')) res.platformVersion = P.OS_VERSION;
                                if (hints.includes('uaFullVersion')) res.uaFullVersion = P.FULL_VERSION;
                            }
                            return Promise.resolve(res);
                         }
                     };
                     try { Object.defineProperty(N, 'userAgentData', {get: () => uaData}); } catch(e) {}
                 }
             }

             try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}
         },

         webrtc: function(win) {
             if (!win.RTCPeerConnection) return;
             const OrigRTC = win.RTCPeerConnection;
             win.RTCPeerConnection = function(config) {
                 const pc = new OrigRTC(config);
                 const origAddEL = pc.addEventListener;
                 const isSafeCandidate = (c) => {
                     if (!c || typeof c !== 'string') return true;
                     if (c.indexOf(".local") !== -1) return true;
                     if (/(^| )192\\.168\\.|(^| )10\\.|(^| )172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(c)) return false;
                     return true;
                 };
                 pc.addEventListener = function(type, listener, options) {
                     if (type !== 'icecandidate') return origAddEL.call(this, type, listener, options);
                     const wrappedListener = (e) => {
                         if (e.candidate && e.candidate.candidate && !isSafeCandidate(e.candidate.candidate)) return;
                         return listener(e);
                     };
                     return origAddEL.call(this, type, wrappedListener, options);
                 };
                 Object.defineProperty(pc, 'onicecandidate', {
                     set: function(fn) {
                         if (!fn) return;
                         this._onicecandidate = (e) => {
                             if (e.candidate && e.candidate.candidate && !isSafeCandidate(e.candidate.candidate)) return;
                             fn(e);
                         };
                     },
                     get: function() { return this._onicecandidate; }
                 });
                 return pc;
             };
             win.RTCPeerConnection.prototype = OrigRTC.prototype;
         },

         media: function(win) {
             if (!SPOOFING || !win.navigator.mediaDevices || !win.navigator.mediaDevices.enumerateDevices) return;
             ProxyGuard.hook(win.navigator.mediaDevices, 'enumerateDevices', (orig) => function() {
                 return orig.apply(this, arguments).then(devices => {
                     const hasPermission = devices.some(d => d.label !== "");
                     const counts = {};
                     return devices.map(d => {
                         let label = d.label;
                         if (hasPermission) {
                             if (!counts[d.kind]) counts[d.kind] = 0;
                             let baseLabel = "";
                             if (d.kind === 'audioinput') baseLabel = "MacBook Pro Microphone";
                             else if (d.kind === 'audiooutput') baseLabel = "MacBook Pro Speakers";
                             else if (d.kind === 'videoinput') baseLabel = "FaceTime HD Camera";
                             if (baseLabel) {
                                 label = counts[d.kind] === 0 ? baseLabel : baseLabel + " (" + (counts[d.kind] + 1) + ")";
                                 counts[d.kind]++;
                             }
                         }
                         return { deviceId: d.deviceId, kind: d.kind, label: label, groupId: d.groupId };
                     });
                 });
             });
         },

         rects: function(win) {
             if (!SPOOFING) return;
             try {
                 const Element = win.Element;
                 if (!Element) return;
                 const addNoise = (rect) => {
                     if (!rect) return rect;
                     const dimSum = Math.floor((rect.width + rect.height) * 100);
                     const noise = RNG.noise(0, CFG.noise.rect + (dimSum % 10) * 0.0000001);
                     return {
                         x: rect.x, y: rect.y,
                         top: rect.top + noise, bottom: rect.bottom + noise,
                         left: rect.left + noise, right: rect.right + noise,
                         width: rect.width + noise, height: rect.height + noise,
                         toJSON: () => this
                     };
                 };
                 const makeDOMRectList = (rects) => {
                     let proto = null;
                     try { proto = win.DOMRectList.prototype; } catch(e) {}
                     const list = proto ? Object.create(proto) : {};
                     list.length = rects.length;
                     for (let i = 0; i < rects.length; i++) list[i] = addNoise(rects[i]);
                     if (win.Symbol && win.Symbol.iterator && Array.prototype[win.Symbol.iterator]) {
                         list[win.Symbol.iterator] = Array.prototype[win.Symbol.iterator];
                     }
                     list.item = (i) => list[i] || null;
                     if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
                         Object.defineProperty(list, Symbol.toStringTag, { value: 'DOMRectList', configurable: true });
                     }
                     return list;
                 };
                 ProxyGuard.hook(Element.prototype, 'getBoundingClientRect', (orig) => function() { return addNoise(orig.apply(this, arguments)); });
                 ProxyGuard.hook(Element.prototype, 'getClientRects', (orig) => function() { return makeDOMRectList(orig.apply(this, arguments)); });
             } catch(e) {}
         },

         canvas: function(win) {
             const applyNoise = (data, w, h) => {
                 // JITTER.factor：每日微漂移密度
                 const step = Math.max(1, Math.floor(CFG.noise.canvas * JITTER.factor));
                 for (let i = 0; i < data.length; i += 4) {
                     if (i % step === 0) {
                         const n = RNG.bool() ? 1 : -1;
                         data[i] = Math.max(0, Math.min(255, data[i] + n));
                     }
                 }
             };

             try {
                const ctxList = [];
                if (win.CanvasRenderingContext2D) ctxList.push(win.CanvasRenderingContext2D);
                // 修正：OffscreenCanvas 存在性檢查後再 hook
                if (win.OffscreenCanvas && win.OffscreenCanvasRenderingContext2D) ctxList.push(win.OffscreenCanvasRenderingContext2D);

                ctxList.forEach(ctx => {
                    if (!ctx || !ctx.prototype) return;

                    ProxyGuard.hook(ctx.prototype, 'getImageData', (orig) => function(x,y,w,h) {
                        try {
                           const r = orig.apply(this, arguments);
                           if (w > 10 && h > 10 && (w * h) < 640000) applyNoise(r.data, w, h);
                           return r;
                        } catch(e) { return orig.apply(this, arguments); }
                    });

                    ProxyGuard.hook(ctx.prototype, 'measureText', (orig) => function(text) {
                        const m = orig.apply(this, arguments);
                        if (m && 'width' in m) {
                            const oldWidth = m.width;
                            const noise = RNG.noise(0, CFG.noise.text);
                            try { Object.defineProperty(m, 'width', { get: () => oldWidth + noise }); } catch(e) {}
                        }
                        return m;
                    });
                });
             } catch(e) {}

             try {
                if (win.HTMLCanvasElement) {
                    ProxyGuard.hook(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() {
                         const w = this.width, h = this.height;
                         if (w > 16 && w < 400 && h > 16 && h < 400) {
                             try {
                                 const t = document.createElement('canvas');
                                 t.width = w; t.height = h;
                                 const ctx = t.getContext('2d');
                                 ctx.drawImage(this, 0, 0);
                                 const id = ctx.getImageData(0,0,w,h);
                                 applyNoise(id.data, w, h);
                                 ctx.putImageData(id, 0, 0);
                                 return orig.apply(t, arguments);
                             } catch(e) { return orig.apply(this, arguments); }
                         }
                         return orig.apply(this, arguments);
                    });
                }
             } catch(e) {}
         },

         webgl: function(win) {
             try {
                 const glClasses = [win.WebGLRenderingContext, win.WebGL2RenderingContext];
                 glClasses.forEach(glClass => {
                     if (!glClass || !glClass.prototype) return;
                     ProxyGuard.hook(glClass.prototype, 'getParameter', (orig) => function(p) {
                         if (p === 37445) return P.VENDOR;   // UNMASKED_VENDOR_WEBGL
                         if (p === 37446) return P.RENDERER; // UNMASKED_RENDERER_WEBGL
                         if (SPOOFING && P.WEBGL_CAPS && (p in P.WEBGL_CAPS)) {
                             let val = P.WEBGL_CAPS[p];
                             if (typeof val === 'number' && val > 1000) {
                                 val = Math.floor(RNG.noise(val, val * 0.01));
                             }
                             return val;
                         }
                         return orig.apply(this, arguments);
                     });
                 });
             } catch(e){}
         },

         audio: function(win) {
            try {
                 if (win.AnalyserNode) {
                     ProxyGuard.hook(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig)=>function(arr){
                         const r = orig.apply(this, arguments);
                         for(let i=0; i<arr.length; i+=10) arr[i] += RNG.noise(0, CFG.noise.audio);
                         return r;
                     });
                 }
                 if (SPOOFING && win.AudioContext && win.AudioContext.prototype) {
                     if ('outputLatency' in win.AudioContext.prototype) {
                         try {
                             Object.defineProperty(win.AudioContext.prototype, 'outputLatency', {
                                 get: () => RNG.noise(P.AUDIO_LATENCY.output, 0.0001),
                                 configurable: true
                             });
                         } catch(e) {}
                     }
                     if ('baseLatency' in win.AudioContext.prototype) {
                         try {
                             Object.defineProperty(win.AudioContext.prototype, 'baseLatency', {
                                 get: () => RNG.noise(P.AUDIO_LATENCY.base, 0.0001),
                                 configurable: true
                             });
                         } catch(e) {}
                     }
                 }
             } catch(e){}
         }
      };

      const inject = function(win) {
          if (!win) return;
          Modules.hardware(win);
          Modules.webrtc(win);
          Modules.media(win);
          Modules.rects(win);
          Modules.canvas(win);
          Modules.webgl(win);
          Modules.audio(win);
      };

      // 注入標記（避免重複注入）
      try { document.documentElement && document.documentElement.setAttribute(__MARK, "1"); } catch(e){}

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>inject(window));
      else inject(window);

    })();
    </script>
    `;

    if (REGEX.HEAD_TAG.test(body)) {
      body = body.replace(REGEX.HEAD_TAG, m => m + injectionScript);
    } else if (REGEX.HTML_TAG.test(body)) {
      body = body.replace(REGEX.HTML_TAG, m => m + injectionScript);
    } else {
      body = injectionScript + body;
    }

    $done({ body, headers });
  }
})();