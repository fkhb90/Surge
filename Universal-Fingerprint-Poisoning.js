/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   5.52-Deterministic-Stability
 * ----------------------------------------------------------------------------
 * 相對 v5.51 的扣分點修正：
 * 1) WebGL caps：改為「每個 context + 每個 parameter」一次性快取，回傳穩定值（不再每次抖動）。
 * 2) Canvas：改為決定性噪聲（基於 session seed + w/h + index），同條件重取樣結果一致。
 * 3) toString：toString 本體改為具名 function toString()，並讓 Function.prototype.toString.toString()
 *    也回原生樣式字串；descriptor 盡量對齊原生。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Global config & seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V552",
    INJECT_MARKER: "__FP_SHIELD_V552__",

    PERSONA_TTL_MS: 30 * 24 * 60 * 60 * 1000,

    WINDOW_MIN_MS: 20 * 60 * 1000,
    WINDOW_VAR_MS: 30 * 60 * 1000,

    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001,
    TEXT_METRICS_NOISE: 0.0001,
    RECT_NOISE_LEVEL: 0.000001
  };

  const SEED_MANAGER = (function () {
    const now = Date.now();

    let idSeed = 12345;
    try {
      const storedId = localStorage.getItem(CONST.KEY_PERSISTENCE);
      if (storedId) {
        const [val, expiry] = storedId.split("|");
        if (now < parseInt(expiry, 10)) {
          idSeed = parseInt(val, 10);
        } else {
          idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
          localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + CONST.PERSONA_TTL_MS}`);
        }
      } else {
        idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
        localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + CONST.PERSONA_TTL_MS}`);
      }
    } catch (e) {}

    const dayBlock = Math.floor(now / (24 * 60 * 60 * 1000));
    const dailySeed = (idSeed ^ dayBlock) >>> 0;

    const dailyWindowSize =
      CONST.WINDOW_MIN_MS + ((dailySeed % 30000) * (CONST.WINDOW_VAR_MS / 30000));

    const timeBlock = Math.floor(now / dailyWindowSize);
    const sessionSeed = (idSeed ^ timeBlock) >>> 0;

    const makeRand = (s) => (idx) => {
      let x = (s + idx) * 15485863;
      return ((x * x * x) % 2038074743) / 2038074743;
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
  // Helpers
  // ============================================================================
  const Domain = (() => {
    const normalizeHost = (h) => (h || "").toLowerCase().replace(/^\.+/, "").replace(/\.+$/, "");
    const isDomainMatch = (host, domain) => {
      const hh = normalizeHost(host);
      const dd = normalizeHost(domain);
      if (!hh || !dd) return false;
      return hh === dd || hh.endsWith("." + dd);
    };
    return { normalizeHost, isDomainMatch };
  })();

  const UAHelper = (() => {
    const sanitizeParts = (ver) => {
      const parts = String(ver || "10.15.7")
        .split(".")
        .map((x) => (x || "").replace(/\D/g, ""))
        .filter(Boolean);
      while (parts.length < 3) parts.push("0");
      return parts.slice(0, 3);
    };
    const formatMacOsToken = (ver) => {
      const [a, b, c] = sanitizeParts(ver);
      return `${a}_${b}_${c}`;
    };
    return { formatMacOsToken };
  })();

  // Small deterministic PRNG (xorshift32)
  const PRNG = (() => {
    const xorshift32 = (seed) => {
      let s = (seed >>> 0) || 1;
      return () => {
        s ^= (s << 13) >>> 0;
        s ^= (s >>> 17) >>> 0;
        s ^= (s << 5) >>> 0;
        return (s >>> 0);
      };
    };
    const float01 = (u32) => (u32 >>> 0) / 4294967296;
    return { xorshift32, float01 };
  })();

  // ============================================================================
  // Persona config
  // ============================================================================
  const PERSONA_CONFIG = (function () {
    const MAC_POOL = [
      {
        name: "Intel_i9_Pro16",
        ARCH: "intel",
        osVer: "13.6.7",
        gpuVendor: "Google Inc. (AMD)",
        gpuRenderer: "AMD Radeon Pro 5500M",
        concurrency: 8,
        memory: 32,
        screen: { depth: 30, pixelRatio: 2 }
      },
      {
        name: "M2_Air",
        ARCH: "arm",
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
        osVer: "14.7.1",
        gpuVendor: "Google Inc. (Apple)",
        gpuRenderer: "Apple GPU",
        concurrency: 8,
        memory: 24,
        screen: { depth: 30, pixelRatio: 2 }
      }
    ];

    const pIndex = Math.floor(SEED_MANAGER.randId(1) * MAC_POOL.length);
    const selectedMac = MAC_POOL[pIndex];

    const majorBase = 138;
    const majorOffset = Math.floor(SEED_MANAGER.randId(2) * 5);
    const major = (majorBase + majorOffset).toString();
    const build = Math.floor(SEED_MANAGER.randId(3) * 5000) + 1000;
    const patch = Math.floor(SEED_MANAGER.randId(4) * 200) + 1;
    const fullVersion = `${major}.0.${build}.${patch}`;

    // 仍維持「Intel token」以貼近真實世界 Chrome/mac UA 形態，OS token 與 platformVersion 對齊
    const macOsToken = UAHelper.formatMacOsToken(selectedMac.osVer);
    const uaModel = `Macintosh; Intel Mac OS X ${macOsToken}`;

    return {
      MAC: {
        TYPE: "SPOOF",
        ARCH: selectedMac.ARCH,
        UA: `Mozilla/5.0 (${uaModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullVersion} Safari/537.36`,
        FULL_VERSION: fullVersion,
        MAJOR_VERSION: major,
        OS_VERSION: selectedMac.osVer,
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
    HEAD_TAG: /<head[^>]*>/i,
    HTML_TAG: /<html[^>]*>/i,
    SCRIPT_NONCE_STRICT: /<script[^>]*\snonce=["']?([^"'\s>]+)["']?/i
  };

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) {}

  const ENV = (() => {
    let sys = "iOS";
    try { if (typeof $environment !== "undefined") sys = $environment["system"] || sys; } catch (e) {}
    if (/mac/i.test(sys)) return "MAC";
    return "IOS";
  })();

  const CURRENT_PERSONA = PERSONA_CONFIG[ENV];

  // ============================================================================
  // Exclusion & whitelist
  // ============================================================================
  const HARD_EXCLUSION_KEYWORDS = [
    "accounts.google.com", "appleid", "login.live.com", "oauth", "sso",
    "recaptcha", "hcaptcha", "turnstile", "bot-detection",
    "okta.com", "auth0.com", "duosecurity.com",

    "ctbcbank.com", "cathaybk.com.tw", "esunbank.com.tw", "fubon.com", "taishinbank.com.tw",
    "landbank.com.tw", "megabank.com.tw", "firstbank.com.tw", "hncb.com.tw", "changhwabank.com.tw",
    "sinopac.com", "bot.com.tw", "post.gov.tw", "citibank", "hsbc", "standardchartered",
    "twmp.com.tw", "taiwanpay", "richart", "dawho",

    "paypal.com", "stripe.com", "ecpay.com.tw", "jkos.com", "line.me", "jko.com",
    "braintreegateway.com", "adyen.com",

    "chatgpt.com", "claude.ai", "openai.com", "perplexity.ai", "gemini.google.com",
    "bard.google.com", "anthropic.com", "bing.com/chat", "monica.im", "felo.ai",

    "foodpanda", "fd-api", "deliveryhero", "uber.com", "ubereats",

    "gov.tw", "edu.tw", "microsoft.com", "windowsupdate", "icloud.com"
  ];

  if (HARD_EXCLUSION_KEYWORDS.some((k) => lowerUrl.includes(k))) { $done({}); return; }

  const WhitelistManager = (() => {
    const trustedDomains = [
      "shopee.tw", "shopee.com", "momo.com.tw", "pchome.com.tw", "books.com.tw",
      "coupang.com", "amazon.com", "amazon.co.jp", "taobao.com", "tmall.com", "jd.com",
      "pxmart.com.tw", "etmall.com.tw", "rakuten.com", "rakuten.co.jp", "shopback.com.tw", "shopback.com",
      "netflix.com", "spotify.com", "disneyplus.com", "youtube.com", "twitch.tv", "hulu.com", "iqiyi.com",
      "kktix.com", "tixcraft.com",
      "github.com", "gitlab.com", "notion.so", "figma.com", "canva.com", "dropbox.com", "adobe.com",
      "cloudflare.com", "fastly.com", "jsdelivr.net", "googleapis.com", "gstatic.com",
      "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "discord.com", "threads.net"
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

  const IS_SHOPPING = (() => {
    const h = Domain.normalizeHost(hostname);
    return Domain.isDomainMatch(h, "shopee.tw") ||
      Domain.isDomainMatch(h, "shopee.com") ||
      Domain.isDomainMatch(h, "amazon.com") ||
      Domain.isDomainMatch(h, "amazon.co.jp") ||
      Domain.isDomainMatch(h, "momo.com.tw");
  })();

  // ============================================================================
  // Phase A: request headers
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    const headers = $request.headers || {};
    if (!isSoftWhitelisted && !IS_SHOPPING && CURRENT_PERSONA && CURRENT_PERSONA.TYPE === "SPOOF") {
      Object.keys(headers).forEach((k) => {
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
  // Phase B: HTML injection
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
    Object.keys(headers).forEach((k) => { if (k.toLowerCase() === "content-security-policy") cspHeader = headers[k]; });
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
        rect: CONST.RECT_NOISE_LEVEL
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

  // Session RNG (not used for values that must be stable across repeated reads)
  const RNG = (function(seed) {
    let s = (seed >>> 0) || 1;
    return {
      nextU32: function() {
        s ^= (s << 13) >>> 0;
        s ^= (s >>> 17) >>> 0;
        s ^= (s << 5) >>> 0;
        return (s >>> 0);
      },
      next01: function() { return (this.nextU32() >>> 0) / 4294967296; },
      bool: function() { return this.next01() > 0.5; },
      noise: function(val, range) { return val + (this.next01() * range * 2 - range); }
    };
  })(CFG.seed);

  // Daily micro jitter factor (stable within a day)
  const JITTER = (function(dSeed) {
    let s = (dSeed >>> 0) || 1;
    const next01 = () => {
      s ^= (s << 13) >>> 0;
      s ^= (s >>> 17) >>> 0;
      s ^= (s << 5) >>> 0;
      return (s >>> 0) / 4294967296;
    };
    return { factor: 1 + (next01() * 0.05) };
  })(CFG.dailySeed);

  // Deterministic per-call PRNG (stable for same (seed,w,h,tag))
  const detU32 = (baseSeed, a, b, c) => {
    let s = (baseSeed ^ ((a|0) * 2654435761) ^ ((b|0) * 2246822519) ^ ((c|0) * 3266489917)) >>> 0;
    s ^= (s << 13) >>> 0; s ^= (s >>> 17) >>> 0; s ^= (s << 5) >>> 0;
    return (s >>> 0);
  };

  // ============================================================================
  // ProxyGuard (toString hardened)
  // ============================================================================
  const ProxyGuard = (function() {
    const toStringMap = new WeakMap();
    const nativeToString = Function.prototype.toString;

    // Use a named function toString() for closer native shape
    function toString() {
      if (toStringMap.has(this)) return toStringMap.get(this);
      return nativeToString.apply(this, arguments);
    }

    // Make Function.prototype.toString.toString() look native as well
    toStringMap.set(toString, "function toString() { [native code] }");

    try {
      const desc = Object.getOwnPropertyDescriptor(Function.prototype, "toString");
      const newDesc = {
        value: toString,
        writable: desc ? !!desc.writable : true,
        enumerable: desc ? !!desc.enumerable : false,
        configurable: desc ? !!desc.configurable : true
      };
      Object.defineProperty(Function.prototype, "toString", newDesc);
    } catch(e) {}

    return {
      protect: function(native, custom) {
        const p = new Proxy(custom, {
          apply: (t, th, a) => { try { return Reflect.apply(t, th, a); } catch(e) { return Reflect.apply(native, th, a); } },
          construct: (t, a, n) => { try { return Reflect.construct(t, a, n); } catch(e) { return Reflect.construct(native, a, n); } },
          get: (t, k) => Reflect.get(t, k)
        });
        const name = (native && native.name) ? native.name : "";
        const sig = "function " + name + "() { [native code] }";
        toStringMap.set(p, sig);
        toStringMap.set(custom, sig);
        return p;
      },
      hook: function(proto, prop, handler) {
        if (!proto || typeof proto[prop] !== "function") return;
        proto[prop] = this.protect(proto[prop], handler(proto[prop]));
      }
    };
  })();

  // ============================================================================
  // Modules
  // ============================================================================
  const Modules = {
    hardware: function(win) {
      const N = win.navigator;
      if (SPOOFING) {
        try {
          Object.defineProperties(N, {
            platform: { get: () => P.PLATFORM },
            maxTouchPoints: { get: () => 0 },
            hardwareConcurrency: { get: () => P.CONCURRENCY },
            deviceMemory: { get: () => P.MEMORY },
            userAgent: { get: () => P.UA },
            appVersion: { get: () => P.UA.replace("Mozilla/", "") }
          });
        } catch(e) {}

        if (win.screen && P.SCREEN_FEATURES) {
          const SF = P.SCREEN_FEATURES;
          try {
            Object.defineProperties(win.screen, {
              colorDepth: { get: () => SF.depth },
              pixelDepth: { get: () => SF.depth }
            });
          } catch(e) {}
          if ("devicePixelRatio" in win) {
            try { Object.defineProperty(win, "devicePixelRatio", { get: () => SF.pixelRatio }); } catch(e) {}
          }
        }

        if (N.userAgentData) {
          const uaData = {
            brands: [
              { brand: "Not(A:Brand", version: "99" },
              { brand: "Google Chrome", version: P.MAJOR_VERSION },
              { brand: "Chromium", version: P.MAJOR_VERSION }
            ],
            mobile: false,
            platform: "macOS",
            getHighEntropyValues: function(hints) {
              const res = {};
              res.brands = this.brands; res.mobile = this.mobile; res.platform = this.platform;
              if (Array.isArray(hints)) {
                if (hints.includes("architecture")) res.architecture = (P.ARCH === "arm") ? "arm" : "x86";
                if (hints.includes("bitness")) res.bitness = "64";
                if (hints.includes("model")) res.model = "";
                if (hints.includes("platformVersion")) res.platformVersion = P.OS_VERSION;
                if (hints.includes("uaFullVersion")) res.uaFullVersion = P.FULL_VERSION;
              }
              return Promise.resolve(res);
            }
          };
          try { Object.defineProperty(N, "userAgentData", { get: () => uaData }); } catch(e) {}
        }
      }
      try { if ("webdriver" in N) delete N.webdriver; } catch(e) {}
    },

    webrtc: function(win) {
      if (!win.RTCPeerConnection) return;
      const OrigRTC = win.RTCPeerConnection;

      win.RTCPeerConnection = function(config) {
        const pc = new OrigRTC(config);
        const origAddEL = pc.addEventListener;

        const isSafeCandidate = (c) => {
          if (!c || typeof c !== "string") return true;
          if (c.indexOf(".local") !== -1) return true;
          if (/(^| )192\\.168\\.|(^| )10\\.|(^| )172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(c)) return false;
          return true;
        };

        pc.addEventListener = function(type, listener, options) {
          if (type !== "icecandidate") return origAddEL.call(this, type, listener, options);
          const wrappedListener = (e) => {
            if (e.candidate && e.candidate.candidate && !isSafeCandidate(e.candidate.candidate)) return;
            return listener(e);
          };
          return origAddEL.call(this, type, wrappedListener, options);
        };

        Object.defineProperty(pc, "onicecandidate", {
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
      ProxyGuard.hook(win.navigator.mediaDevices, "enumerateDevices", (orig) => function() {
        return orig.apply(this, arguments).then((devices) => {
          const hasPermission = devices.some((d) => d.label !== "");
          const counts = {};
          return devices.map((d) => {
            let label = d.label;
            if (hasPermission) {
              if (!counts[d.kind]) counts[d.kind] = 0;
              let baseLabel = "";
              if (d.kind === "audioinput") baseLabel = "MacBook Pro Microphone";
              else if (d.kind === "audiooutput") baseLabel = "MacBook Pro Speakers";
              else if (d.kind === "videoinput") baseLabel = "FaceTime HD Camera";
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
          const base = detU32(CFG.seed, dimSum, 31, 7);
          const noise = ((base % 2001) - 1000) / 1000 * (CFG.noise.rect + (dimSum % 10) * 0.0000001);
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
          if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
            Object.defineProperty(list, Symbol.toStringTag, { value: "DOMRectList", configurable: true });
          }
          return list;
        };

        ProxyGuard.hook(Element.prototype, "getBoundingClientRect", (orig) => function() { return addNoise(orig.apply(this, arguments)); });
        ProxyGuard.hook(Element.prototype, "getClientRects", (orig) => function() { return makeDOMRectList(orig.apply(this, arguments)); });
      } catch(e) {}
    },

    // ★Canvas: deterministic noise (stable for same seed + (w,h) + index)
    canvas: function(win) {
      const applyNoiseDet = (data, w, h) => {
        const step = Math.max(1, Math.floor(CFG.noise.canvas * JITTER.factor));
        const baseSeed = (CFG.seed ^ ((w|0) * 1315423911) ^ ((h|0) * 2654435761)) >>> 0;

        for (let i = 0; i < data.length; i += 4) {
          if ((i % step) !== 0) continue;

          // deterministic sign from hash(seed, i)
          const u = detU32(baseSeed, i, 17, 29);
          const sign = (u & 1) ? 1 : -1;
          const delta = sign; // +/- 1
          data[i] = Math.max(0, Math.min(255, data[i] + delta));
        }
      };

      try {
        const ctxList = [];
        if (win.CanvasRenderingContext2D) ctxList.push(win.CanvasRenderingContext2D);
        if (win.OffscreenCanvas && win.OffscreenCanvasRenderingContext2D) ctxList.push(win.OffscreenCanvasRenderingContext2D);

        ctxList.forEach((ctx) => {
          if (!ctx || !ctx.prototype) return;

          ProxyGuard.hook(ctx.prototype, "getImageData", (orig) => function(x, y, w, h) {
            try {
              const r = orig.apply(this, arguments);
              if (w > 10 && h > 10 && (w * h) < 640000) applyNoiseDet(r.data, w, h);
              return r;
            } catch(e) {
              return orig.apply(this, arguments);
            }
          });

          // measureText: stable per (text length, seed)
          ProxyGuard.hook(ctx.prototype, "measureText", (orig) => function(text) {
            const m = orig.apply(this, arguments);
            if (m && "width" in m) {
              const oldWidth = m.width;
              const len = (text == null) ? 0 : String(text).length;
              const u = detU32(CFG.seed, len, 101, 11);
              const noise = ((u % 2001) - 1000) / 1000 * CFG.noise.text; // stable
              try { Object.defineProperty(m, "width", { get: () => oldWidth + noise }); } catch(e) {}
            }
            return m;
          });
        });
      } catch(e) {}

      try {
        if (win.HTMLCanvasElement) {
          ProxyGuard.hook(win.HTMLCanvasElement.prototype, "toDataURL", (orig) => function() {
            const w = this.width, h = this.height;
            if (w > 16 && w < 400 && h > 16 && h < 400) {
              try {
                const t = document.createElement("canvas");
                t.width = w; t.height = h;
                const ctx = t.getContext("2d");
                ctx.drawImage(this, 0, 0);
                const id = ctx.getImageData(0, 0, w, h);
                applyNoiseDet(id.data, w, h);
                ctx.putImageData(id, 0, 0);
                return orig.apply(t, arguments);
              } catch(e) {
                return orig.apply(this, arguments);
              }
            }
            return orig.apply(this, arguments);
          });
        }
      } catch(e) {}
    },

    // ★WebGL: deterministic caps cache per-context + debug-extension gated unmasked values
    webgl: function(win) {
      try {
        const glClasses = [win.WebGLRenderingContext, win.WebGL2RenderingContext];
        const DEBUG_EXT_NAME = "WEBGL_debug_renderer_info";

        glClasses.forEach((glClass) => {
          if (!glClass || !glClass.prototype) return;

          const extMap = new WeakMap();        // ctx -> ext
          const capsCache = new WeakMap();     // ctx -> Map(param -> val)

          const getCacheMap = (ctx) => {
            let m = capsCache.get(ctx);
            if (!m) { m = new Map(); capsCache.set(ctx, m); }
            return m;
          };

          ProxyGuard.hook(glClass.prototype, "getExtension", (orig) => function(name) {
            try {
              const extName = String(name || "");
              const ext = orig.apply(this, arguments);
              if (extName === DEBUG_EXT_NAME && ext) extMap.set(this, ext);
              return ext;
            } catch(e) {
              return orig.apply(this, arguments);
            }
          });

          ProxyGuard.hook(glClass.prototype, "getParameter", (orig) => function(p) {
            try {
              const ext = extMap.get(this);

              // Gate unmasked vendor/renderer: only after ext obtained, and support ext.UNMASKED_* path
              if (p === 37445 || p === 37446) {
                if (!ext) return orig.apply(this, arguments);
                return (p === 37445) ? P.VENDOR : P.RENDERER;
              }
              if (ext && (p === ext.UNMASKED_VENDOR_WEBGL || p === ext.UNMASKED_RENDERER_WEBGL)) {
                return (p === ext.UNMASKED_VENDOR_WEBGL) ? P.VENDOR : P.RENDERER;
              }

              // Caps: cache once per (ctx, p) to keep stable across repeated reads
              if (SPOOFING && P.WEBGL_CAPS && (p in P.WEBGL_CAPS)) {
                const cache = getCacheMap(this);
                if (cache.has(p)) return cache.get(p);

                let val = P.WEBGL_CAPS[p];

                // deterministic ±1% for large numbers, stable by (seed,p)
                if (typeof val === "number" && val > 1000) {
                  const u = detU32(CFG.seed, p | 0, 211, 19);
                  const ratio = (((u % 2001) - 1000) / 1000) * 0.01; // -1%..+1%
                  val = Math.floor(val * (1 + ratio));
                }

                cache.set(p, val);
                return val;
              }

              return orig.apply(this, arguments);
            } catch(e) {
              return orig.apply(this, arguments);
            }
          });
        });
      } catch(e) {}
    },

    audio: function(win) {
      try {
        if (win.AnalyserNode) {
          // For audio arrays, slight noise, but deterministic per index for stability
          ProxyGuard.hook(win.AnalyserNode.prototype, "getFloatFrequencyData", (orig) => function(arr) {
            const r = orig.apply(this, arguments);
            const base = (CFG.seed ^ 0xA5A5A5A5) >>> 0;
            for (let i = 0; i < arr.length; i += 10) {
              const u = detU32(base, i, 73, 9);
              const n = (((u % 2001) - 1000) / 1000) * CFG.noise.audio;
              arr[i] += n;
            }
            return r;
          });
        }

        if (SPOOFING && win.AudioContext && win.AudioContext.prototype) {
          if ("outputLatency" in win.AudioContext.prototype) {
            try {
              Object.defineProperty(win.AudioContext.prototype, "outputLatency", {
                get: () => {
                  const u = detU32(CFG.seed, 1, 401, 17);
                  const n = (((u % 2001) - 1000) / 1000) * 0.0001;
                  return P.AUDIO_LATENCY.output + n;
                },
                configurable: true
              });
            } catch(e) {}
          }
          if ("baseLatency" in win.AudioContext.prototype) {
            try {
              Object.defineProperty(win.AudioContext.prototype, "baseLatency", {
                get: () => {
                  const u = detU32(CFG.seed, 2, 401, 17);
                  const n = (((u % 2001) - 1000) / 1000) * 0.0001;
                  return P.AUDIO_LATENCY.base + n;
                },
                configurable: true
              });
            } catch(e) {}
          }
        }
      } catch(e) {}
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

  try { document.documentElement && document.documentElement.setAttribute(__MARK, "1"); } catch(e) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => inject(window));
  else inject(window);

})();
</script>
`;

    if (REGEX.HEAD_TAG.test(body)) {
      body = body.replace(REGEX.HEAD_TAG, (m) => m + injectionScript);
    } else if (REGEX.HTML_TAG.test(body)) {
      body = body.replace(REGEX.HTML_TAG, (m) => m + injectionScript);
    } else {
      body = injectionScript + body;
    }

    $done({ body, headers });
  }
})();
