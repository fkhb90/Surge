/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   5.04-Universal-Adaptive-Performance
 * @description [全域效能版] 將購物車效能優化邏輯標準化，適用於所有高負載頁面。
 * ----------------------------------------------------------------------------
 * 1. [Optimization] 全域重度頁面偵測 (Heavy Page Detection):
 * - 自動識別 cart/checkout/pay/video/live 等關鍵路徑。
 * - 命中時自動降級為 Lite Mode (停止 Canvas/WebGL/Screen 偽裝)，僅保留 UA。
 * 2. [Strategy] 適用範圍擴大: 所有硬白名單與購物模式網站皆繼承此優化。
 * 3. [Config] 維持對 Foodpanda 的 API/JSON 嚴格保護與 MITM 分流策略。
 * ----------------------------------------------------------------------------
 * @note 必須配合 Surge/Quantumult X 配置使用。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全域配置
  // ============================================================================
  const CONST = {
    MAX_SIZE: 5000000,
    // [V5.04] 更新 Seed
    KEY_SEED: "FP_SHIELD_SEED_V504", 
    KEY_EXPIRY: "FP_SHIELD_EXP_V504",
    INJECT_MARKER: "__FP_SHIELD_V504__",
    
    // Core Logic Configs
    BASE_ROTATION_MS: 24 * 60 * 60 * 1000,
    JITTER_RANGE_MS: 4 * 60 * 60 * 1000,
    CANVAS_MIN_SIZE: 16,
    CANVAS_MAX_NOISE_AREA: 500 * 500,
    MAX_POOL_SIZE: 5,
    MAX_POOL_DIM: 1024 * 1024,
    WEBGL_PARAM_CACHE_SIZE: 40,
    CACHE_CLEANUP_INTERVAL: 30000,
    TOBLOB_RELEASE_FALLBACK_MS: 3000,
    
    // User Agents (2026 Standards)
    UA_MAC: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    UA_IPHONE: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.2 Mobile/15E148 Safari/604.1"
  };

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    CONTENT_TYPE_JSON: /(application|text)\/(json|xml|javascript)/i,
    // [V5.04] 擴充重度頁面關鍵字庫
    HEAVY_PAGES: /cart|checkout|buy|trade|billing|payment|video|live|stream|player/i,
    HEAD_TAG: /<head[^>]*>/i, 
    HTML_TAG: /<html[^>]*>/i,
    META_CSP_STRICT: /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi
  };

  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) {}

  // ============================================================================
  // 1. [Hard Exclusion] 硬排除 - 絕對不碰的領域
  // ============================================================================
  const HARD_EXCLUSION_KEYWORDS = [
    "line.me", "line-apps", "line-scdn", "legy", 
    "naver.com", "naver.jp", 
    "facebook.com/api", "messenger.com", "whatsapp.com", "instagram.com",
    "googleapis.com", "gstatic.com", "googleusercontent.com", 
    "apple.com", "icloud.com", "mzstatic.com", "itunes.apple.com",
    "oaistatic.com", "oaiusercontent.com", "anthropic.com",
    "challenges.cloudflare.com", "recaptcha.net", "google.com/recaptcha", "hcaptcha.com", "arkoselabs.com",
    "sentry.io",
    "perimeterx.net", "datadome.co", "siftscience.com"
  ];
  
  if (HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k))) {
    $done({});
    return;
  }

  // ============================================================================
  // 2. [Soft Whitelist] 軟白名單 (Grey Shield - Bypass)
  // ============================================================================
  const WhitelistManager = (() => {
    const trustedDomains = new Set([
      // Foodpanda Ecosystem
      "foodpanda.com", "foodpanda.com.tw", "fd-api.com", "tw.fd-api.com", 
      "deliveryhero.io", "deliveryhero.net", "foodora.com",

      // 生活服務
      "uber.com", "ubereats.com", 
      "booking.com", "agoda.com", "airbnb.com", "expedia.com",
      "stripe.com",
      "momoshop.com.tw", 

      // AI & Productivity
      "gemini.google.com", "bard.google.com", "chatgpt.com", "claude.ai", "perplexity.ai",
      "docs.google.com", "drive.google.com", "mail.google.com", "meet.google.com", "calendar.google.com",
      "microsoft.com", "office.com", "live.com", "teams.microsoft.com", "sharepoint.com", "onenote.com",
      
      // Streaming
      "netflix.com", "spotify.com", "disneyplus.com", "twitch.tv", "youtube.com", "iqiyi.com", "kkbox.com",
      
      // Banks
      "ctbcbank.com", "cathaybk.com.tw", "esunbank.com.tw", "fubon.com", "taishinbank.com.tw", 
      "megabank.com.tw", "bot.com.tw", "firstbank.com.tw", "hncb.com.tw", "sinopac.com", "post.gov.tw",
      "paypal.com", "visa.com", "mastercard.com", "amex.com", 
      "jkos.com", "ecpay.com.tw", "newebpay.com"
    ]);
    const trustedSuffixes = [".gov.tw", ".edu.tw", ".org.tw", ".mil", ".bank"];
    
    return {
      check: (h) => {
        if (!h) return false;
        if (trustedDomains.has(h)) return true;
        for (const d of trustedDomains) { if (h.endsWith('.' + d)) return true; }
        for (const s of trustedSuffixes) { if (h.endsWith(s)) return true; }
        if (lowerUrl.includes("3dsecure") || lowerUrl.includes("acs")) return true;
        return false;
      }
    };
  })();

  const isSoftWhitelisted = WhitelistManager.check(hostname);

  // ============================================================================
  // 3. [Mode Detection] 模式偵測
  // ============================================================================
  let mode = "protection";
  
  // Auto-Shopping Logic
  const AUTO_SHOPPING_DOMAINS = [
      "shopee.", "shope.ee", "xiapi", 
      "amazon.", "ebay.", "rakuten.", 
      "pchome.com.tw"
  ];

  if (AUTO_SHOPPING_DOMAINS.some(d => hostname.includes(d))) {
      mode = "shopping";
  } else {
      try {
        if (typeof $surge !== 'undefined' && $surge.selectGroupDetails) {
          const decisions = $surge.selectGroupDetails().decisions;
          for (let key in decisions) {
            if (/[Ss]hopping|購物|🛍️|Bypass/.test(decisions[key])) {
              mode = "shopping";
              break;
            }
          }
        }
      } catch (e) {}
      if (typeof $argument === "string" && $argument.includes("mode=shopping")) mode = "shopping";
  }

  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: Network Layer (Header Spoofing)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // Foodpanda Pure Pass-through
    if (lowerUrl.includes("foodpanda") || lowerUrl.includes("fd-api") || lowerUrl.includes("deliveryhero")) {
        $done({ headers });
        return;
    }

    if (isSoftWhitelisted) {
        $done({ headers });
        return;
    }

    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      headers['User-Agent'] = CONST.UA_IPHONE;
      headers['sec-ch-ua'] = '"Not(A:Brand";v="99", "Chromium";v="143", "Google Chrome";v="143"'; 
      headers['sec-ch-ua-mobile'] = "?1"; 
      headers['sec-ch-ua-platform'] = '"iOS"'; 
    } else {
      headers['User-Agent'] = CONST.UA_MAC;
      headers['sec-ch-ua'] = '"Not(A:Brand";v="99", "Google Chrome";v="143", "Chromium";v="143"';
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: Browser Environment (Injection)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    const cType = (headers['Content-Type'] || headers['content-type'] || "").toLowerCase();

    // API Safety Guard
    if (REGEX.CONTENT_TYPE_JSON.test(cType)) { $done({}); return; }
    if (!body || !cType.includes("html")) { $done({}); return; }
    if ([204, 206, 301, 302, 304].includes($response.status)) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    // Badge Logic
    let badgeColor = "#28CD41"; 
    let badgeText = "FP: Shield Active";
    
    // [V5.04] Universal Heavy Page Detection
    const IS_HEAVY_PAGE = REGEX.HEAVY_PAGES.test(lowerUrl);

    if (IS_SHOPPING) {
        badgeColor = IS_HEAVY_PAGE ? "#5856D6" : "#AF52DE"; 
        badgeText = IS_HEAVY_PAGE ? "FP: Shopping Lite" : "FP: Shopping Mode"; 
    } else if (isSoftWhitelisted) {
        badgeColor = "#636366"; badgeText = "FP: Bypass (Safe)"; 
    }

    const injectionScript = `
    <!-- ${CONST.INJECT_MARKER} -->
    <div id="fp-badge" style="
        position: fixed !important; bottom: 15px !important; left: 15px !important;
        z-index: 2147483647 !important; background: ${badgeColor} !important;
        color: #ffffff !important; padding: 7px 14px !important; border-radius: 10px !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-size: 12px !important; font-weight: 700 !important; pointer-events: none !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; transition: opacity 0.8s ease-out !important;
        opacity: 1 !important; display: block !important;
    ">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const MARKER = '${CONST.INJECT_MARKER}';
      try { if (window[MARKER]) return; Object.defineProperty(window, MARKER, { value: true, configurable: true, writable: true }); } catch(e) {}

      // UI Control
      const b = document.getElementById('fp-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 1000); } }, 4000);

      const IS_SHOPPING = ${IS_SHOPPING};
      const IS_WHITELISTED = ${isSoftWhitelisted};
      // [V5.04] Pass Heavy Page flag
      const IS_HEAVY_PAGE = ${IS_HEAVY_PAGE};

      const safeDefine = (obj, prop, descriptor) => {
          if (!obj) return false;
          try { const d = Object.getOwnPropertyDescriptor(obj, prop); if (d && !d.configurable) return false; Object.defineProperty(obj, prop, descriptor); return true; } catch(e) { return false; }
      };

      if (IS_WHITELISTED) {
          try { if (navigator && 'webdriver' in navigator) delete navigator.webdriver; } catch(e) {}
          return; 
      }

      // =========================================================================
      // [V5.04] Adaptive Performance Logic (Shopping & Heavy Pages)
      // =========================================================================
      if (IS_SHOPPING) {
          try {
              // 1. Basic Cleanup
              if (navigator && 'webdriver' in navigator) delete navigator.webdriver;
              if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array) delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;

              // 2. Identity Spoofing (Always active to match UA)
              Object.defineProperty(navigator, 'platform', { get: () => 'iPhone', configurable: true });
              Object.defineProperty(navigator, 'vendor', { get: () => 'Apple Computer, Inc.', configurable: true });
              Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5, configurable: true });
              
              // 3. Hardware Emulation (DISABLED on Heavy Pages for Performance)
              if (!IS_HEAVY_PAGE) {
                  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 6, configurable: true });
                  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

                  const screenProps = { width: 430, height: 932, availWidth: 430, availHeight: 932, colorDepth: 32, pixelDepth: 32 };
                  for (let prop in screenProps) { Object.defineProperty(window.screen, prop, { get: () => screenProps[prop], configurable: true }); }

                  const spoofWebGL = (ctx) => {
                      if (!ctx) return;
                      const getParameter = ctx.getParameter;
                      ctx.getParameter = function(param) {
                          if (param === 37445) return 'Apple Inc.'; 
                          if (param === 37446) return 'Apple GPU'; 
                          return getParameter.apply(this, arguments);
                      };
                  };
                  
                  const cvs = document.createElement('canvas');
                  spoofWebGL(cvs.getContext('webgl')); spoofWebGL(cvs.getContext('experimental-webgl')); spoofWebGL(cvs.getContext('webgl2'));
                  
                  const oldGetContext = HTMLCanvasElement.prototype.getContext;
                  HTMLCanvasElement.prototype.getContext = function(type, opts) {
                      const ctx = oldGetContext.call(this, type, opts);
                      if (type && type.includes('webgl')) spoofWebGL(ctx);
                      return ctx;
                  };
              }

              if (!('ontouchstart' in window)) { Object.defineProperty(window, 'ontouchstart', { value: null, writable: true }); }
          } catch(e) {}
          return; 
      }

      const CONFIG = {
        rectNoiseRate: 0.0001, canvasNoiseStep: 2, audioNoiseLevel: 1e-6,
        canvasMinSize: ${CONST.CANVAS_MIN_SIZE}, canvasMaxNoiseArea: ${CONST.CANVAS_MAX_NOISE_AREA},
        maxPoolSize: ${CONST.MAX_POOL_SIZE}, maxPoolDim: ${CONST.MAX_POOL_DIM},
        webglCacheSize: ${CONST.WEBGL_PARAM_CACHE_SIZE}, cleanupInterval: ${CONST.CACHE_CLEANUP_INTERVAL},
        toBlobReleaseFallbackMs: ${CONST.TOBLOB_RELEASE_FALLBACK_MS}
      };
      
      const Seed = (function() {
        const safeGet = (k) => { try { return localStorage.getItem(k); } catch(e) { return null; } };
        const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e) {} };
        try {
            const KEY = '${CONST.KEY_SEED}'; const KEY_EXP = '${CONST.KEY_EXPIRY}';
            let val = safeGet(KEY); const expiry = parseInt(safeGet(KEY_EXP) || '0', 10); const now = Date.now();
            if (!val || now > expiry) {
                let extra = ((Date.now() ^ (Math.random()*100000)) >>> 0);
                val = extra.toString();
                const jitterOffset = Math.floor((Math.random() * 2 - 1) * ${CONST.JITTER_RANGE_MS});
                const nextExpiry = now + ${CONST.BASE_ROTATION_MS} + jitterOffset;
                safeSet(KEY, val); safeSet(KEY_EXP, nextExpiry.toString());
            }
            return (parseInt(val, 10) >>> 0) || 1;
        } catch(e) { return 1; }
      })();

      const RNG = {
        s: ((Seed * 9301 + 49297) | 0) >>> 0,
        next: function() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return (this.s / 4294967296); },
        pick: function(arr) { return arr[Math.floor(this.next() * arr.length)]; },
        pickWeighted: function(items) {
          let total = 0; for(let i=0; i<items.length; i++) total += items[i].w;
          let r = this.next() * total;
          for(let i=0; i<items.length; i++) { r -= items[i].w; if (r <= 0) return items[i].v; }
          return items[0].v;
        }
      };
      if (RNG.s === 0) RNG.s = 1;

      const Persona = (function() {
        const MAC_TIERS = {
            MID: { cpuPool: [8, 10], ramPool: [16, 24], gpuPool: [{v: 'Apple', r: 'Apple M3 Pro', w: 60}, {v: 'Apple', r: 'Apple M3 Max', w: 40}] },
            HIGH: { cpuPool: [12, 16], ramPool: [32, 64], gpuPool: [{v: 'Apple', r: 'Apple M3 Ultra', w: 60}, {v: 'Apple', r: 'Apple M4 Max', w: 40}] }
        };
        const r = RNG.next(); let tier = (r > 0.6) ? MAC_TIERS.HIGH : MAC_TIERS.MID;
        const cpu = RNG.pick(tier.cpuPool); const ram = RNG.pick(tier.ramPool);
        const gpu = RNG.pickWeighted(tier.gpuPool); gpu.topo = 'unified'; gpu.tex = 16384;
        const plugins = [{ name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }, { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }, { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }];
        return { 
            ua: { ver: "143", platform: "MacIntel" },
            ch: { brands: [{brand:"Chromium",version:"143"},{brand:"Google Chrome",version:"143"},{brand:"Not(A:Brand",version:"99"}], platform: "macOS", mobile: false, arch: "x86", bitness: "64", model: "", platVer: "15.7.0" },
            hw: { cpu, ram }, gpu: gpu, plugins: plugins
        };
      })();

      const ProxyGuard = {
        proxyMap: new WeakMap(), nativeStrings: new WeakMap(), toStringMap: new WeakMap(),
        _makeFakeToString: function(t, ns) {
          if (this.toStringMap.has(t)) return this.toStringMap.get(t);
          const fakeToString = function toString() { return ns; };
          try { Object.defineProperty(fakeToString, 'toString', { value: function toString() { return "function toString() { [native code] }"; }, configurable: true }); } catch(e) {}
          this.toStringMap.set(t, fakeToString);
          return fakeToString;
        },
        protect: function(native, custom) {
          try {
            if (typeof custom !== 'function' || typeof native !== 'function') return custom;
            if (this.proxyMap.has(custom)) return this.proxyMap.get(custom);
            const ns = Function.prototype.toString.call(native);
            this.nativeStrings.set(custom, ns);
            const proxy = new Proxy(custom, {
              apply: (t, th, a) => { try { return Reflect.apply(t, th, a); } catch(e) { return Reflect.apply(native, th, a); } },
              construct: (t, a, nt) => { try { return Reflect.construct(t, a, nt); } catch(e) { return Reflect.construct(native, a, nt); } },
              get: (t, k, r) => {
                if (typeof k === 'symbol') return Reflect.get(t, k, r);
                if (k === 'toString') return this._makeFakeToString(t, ns);
                if (k === 'name' || k === 'length') return native[k];
                return Reflect.get(t, k, r);
              },
              getOwnPropertyDescriptor: (t, k) => { const d = Reflect.getOwnPropertyDescriptor(native, k); return (d && !d.configurable) ? d : (Reflect.getOwnPropertyDescriptor(t, k) || d); },
              ownKeys: (t) => Array.from(new Set([].concat(Reflect.ownKeys(native), Reflect.ownKeys(t)))),
              has: (t, k) => (k in native || k in t),
              getPrototypeOf: () => Object.getPrototypeOf(native)
            });
            this.proxyMap.set(custom, proxy);
            return proxy;
          } catch(e) { return custom; }
        },
        override: function(o, p, f) {
          if(!o) return;
          const desc = Object.getOwnPropertyDescriptor(o, p);
          if (desc && desc.configurable === false) { if (!desc.writable) return; }
          const orig = (desc && desc.value) || o[p];
          if (typeof orig !== 'function') return;
          const safe = f(orig);
          const prot = this.protect(orig, safe);
          const newDesc = { value: prot, configurable: desc?desc.configurable:true, writable: desc?desc.writable:true, enumerable: desc?desc.enumerable:true };
          safeDefine(o, p, newDesc);
        }
      };

      const CanvasPool = (function() {
        const pool = [];
        const shrink = (item) => { try { item.c.width = 1; item.c.height = 1; } catch(e) {} };
        return {
          get: function(w, h) {
            if (!w || !h || (w*h) > CONFIG.maxPoolDim) {
              const c = document.createElement('canvas'); if (w && h && (w*h) <= CONFIG.maxPoolDim) { c.width = w; c.height = h; }
              return { canvas: c, ctx: c.getContext('2d', {willReadFrequently:true}), release: function(){ try{c.width=1;c.height=1;}catch(e){} } };
            }
            let best = null;
            for (let i = 0; i < pool.length; i++) if (!pool[i].u && pool[i].c.width >= w && pool[i].c.height >= h) { if (!best || pool[i].t < best.t) best = pool[i]; }
            if (!best) {
              if (pool.length < CONFIG.maxPoolSize) { const c = document.createElement('canvas'); c.width = w; c.height = h; return { canvas: c, ctx: c.getContext('2d', {willReadFrequently:true}), release: function(){ try{c.width=1;c.height=1;}catch(e){} } }; }
            }
            best.u = true; best.t = Date.now(); best.c.width = w; best.c.height = h;
            return { canvas: best.c, ctx: best.x, release: function() { best.u = false; best.t = Date.now(); } };
          },
          cleanup: function() { for(let i=0; i<pool.length; i++) if(!pool[i].u) shrink(pool[i]); },
          clearAll: function() { for(let i=0; i<pool.length; i++) shrink(pool[i]); pool.length=0; }
        };
      })();

      const Noise = {
        spatial01: function(x, y, salt) {
          let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 1442695041 + (RNG.s | 0);
          h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
          return h / 4294967296;
        },
        rand: function(i) { let x = ((RNG.s + (i|0)) | 0) >>> 0; x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296; },
        pixel: function(d, w, h) {
          const area = w * h; if (area > CONFIG.canvasMaxNoiseArea) return; if (!d || d.length < 4) return;
          const step = CONFIG.canvasNoiseStep; const rowSaltBase = (RNG.s ^ 0x9E3779B9) >>> 0;
          for (let y = 0; y < h; y += step) {
            const rowSalt = (rowSaltBase + (y * 2654435761)) >>> 0; const rowOffset = y * w;
            for (let x = 0; x < w; x += step) {
              const i = (rowOffset + x) * 4; if (i + 2 >= d.length) continue;
              const n = Noise.spatial01(x, y, rowSalt);
              if (n < 0.05) { const delta = (((n * 1000) | 0) & 1) ? 1 : -1; d[i] = Math.max(0, Math.min(255, d[i] + delta)); d[i+1] = Math.max(0, Math.min(255, d[i+1] - delta)); d[i+2] = Math.max(0, Math.min(255, d[i+2] + delta)); }
            }
          }
        },
        audio: function(d) { const lvl = CONFIG.audioNoiseLevel; if (lvl < 1e-8) return; for(let i=0; i<d.length; i+=100) d[i] += (Noise.rand(i) * lvl - lvl/2); }
      };

      const Modules = {
        hardware: function(win) {
          const N = win.navigator;
          const spoofProp = (target, prop, getterVal) => { const desc = { get: () => getterVal, configurable: true }; if (!safeDefine(target, prop, desc)) { try { if (win.Navigator && win.Navigator.prototype) { safeDefine(win.Navigator.prototype, prop, desc); } } catch(e) {} } };
          spoofProp(N, 'hardwareConcurrency', Persona.hw.cpu); spoofProp(N, 'deviceMemory', Persona.hw.ram); spoofProp(N, 'platform', Persona.ua.platform);
          try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}
          try {
             const pList = Persona.plugins; const targetObj = {};
             pList.forEach((p, i) => { Object.defineProperty(targetObj, i, { value: p, enumerable: true, writable: false, configurable: true }); });
             pList.forEach((p) => { Object.defineProperty(targetObj, p.name, { value: p, enumerable: false, writable: false, configurable: true }); });
             Object.defineProperty(targetObj, 'length', { value: pList.length, enumerable: false, writable: false, configurable: false });
             Object.defineProperties(targetObj, { item: { value: i => pList[i] || null, enumerable: false, writable: false, configurable: true }, namedItem: { value: n => pList.find(p=>p.name===n) || null, enumerable: false, writable: false, configurable: true }, refresh: { value: () => {}, enumerable: false, writable: false, configurable: true } });
             if (win.PluginArray) Object.setPrototypeOf(targetObj, win.PluginArray.prototype);
             const fakePlugins = new Proxy(targetObj, { get(t, p, r) { if (typeof p === 'symbol') return Reflect.get(t, p, r); if (p === 'length') return t.length; return Reflect.get(t, p, r); } });
             safeDefine(N, 'plugins', { get: () => fakePlugins, configurable: true });
          } catch(e) {}
        },
        clientHints: function(win) {
          try {
            const highEntropyData = { architecture: Persona.ch.arch, bitness: Persona.ch.bitness, platformVersion: Persona.ch.platVer, uaFullVersion: Persona.ua.ver + '.0.0.0', model: Persona.ch.model, wow64: false };
            const fake = { brands: Persona.ch.brands, mobile: Persona.ch.mobile, platform: Persona.ch.platform, getHighEntropyValues: (hints) => { const result = { brands: Persona.ch.brands, mobile: Persona.ch.mobile, platform: Persona.ch.platform }; if (hints && Array.isArray(hints)) { hints.forEach(h => { if (highEntropyData.hasOwnProperty(h)) result[h] = highEntropyData[h]; }); } return Promise.resolve(result); }, toJSON: function() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; } };
            safeDefine(win.navigator, 'userAgentData', { get: () => fake, configurable: true });
          } catch(e) {}
        },
        webgl: function(win) {
          try {
            const p = Persona.gpu; const debugObj = { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
            [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(ctx => {
              if (!ctx || !ctx.prototype) return;
              ProxyGuard.override(ctx.prototype, 'getParameter', (orig) => function(param) { if (param === 37445) return p.v; if (param === 37446) return p.r; return orig.apply(this, arguments); });
              ProxyGuard.override(ctx.prototype, 'getExtension', (orig) => function(n) { if (n === 'WEBGL_debug_renderer_info') return debugObj; return orig.apply(this, arguments); });
            });
          } catch(e) {}
        },
        audio: function(win) { if (CONFIG.audioNoiseLevel < 1e-8) return; try { if(win.AnalyserNode) ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig)=>function(a){ const r=orig.apply(this,arguments); Noise.audio(a); return r; }); if(win.OfflineAudioContext) ProxyGuard.override(win.OfflineAudioContext.prototype, 'startRendering', (orig)=>function(){ return orig.apply(this,arguments).then(b=>{ if(b) Noise.audio(b.getChannelData(0)); return b; }); }); } catch(e){} },
        rects: function(win) {
           try {
             const Element = win.Element; if (!Element) return;
             const wrap = r => {
               if (!r) return r;
               const n = (w, h) => { const s = (Math.floor(w)*374761393) ^ (Math.floor(h)*668265263); const x = Math.sin(s) * 10000; return (x - Math.floor(x)) * CONFIG.rectNoiseRate; };
               const f = 1 + n(r.width, r.height); const nw = r.width * f; const nh = r.height * f;
               const desc = { x: { value: r.x, enumerable: true }, y: { value: r.y, enumerable: true }, width: { value: nw, enumerable: true }, height: { value: nh, enumerable: true }, top: { value: r.top, enumerable: true }, left: { value: r.left, enumerable: true }, right: { value: r.left + nw, enumerable: true }, bottom: { value: r.top + nh, enumerable: true }, toJSON: { value: function(){return this;}, enumerable: false } };
               if (win.DOMRectReadOnly) { const obj = Object.create(win.DOMRectReadOnly.prototype); Object.defineProperties(obj, desc); return obj; }
               return r; 
             };
             ProxyGuard.override(Element.prototype, 'getBoundingClientRect', (orig) => function() { return wrap(orig.apply(this, arguments)); });
             ProxyGuard.override(Element.prototype, 'getClientRects', (orig) => function() { const rects = orig.apply(this, arguments); const res = { length: rects.length }; if (win.DOMRectList) Object.setPrototypeOf(res, win.DOMRectList.prototype); res.item = function(i) { return this[i] || null; }; for(let i=0; i<rects.length; i++) res[i] = wrap(rects[i]); return res; });
           } catch(e) {}
        },
        canvas: function(win) {
           try {
             const noise = (d) => { const step = CONFIG.canvasNoiseStep; if (!step) return; for (let i=0; i<d.length; i+=step*4) { if (RNG.next() < 0.01) d[i] = d[i] ^ 1; } };
             if (win.OffscreenCanvas) { ProxyGuard.override(win.OffscreenCanvas.prototype, 'convertToBlob', (orig) => function() { try { const area = this.width * this.height; if (area > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments); const ctx = this.getContext('2d'); if (ctx) { const d = ctx.getImageData(0,0,this.width,this.height); noise(d.data); ctx.putImageData(d,0,0); } } catch(e){} return orig.apply(this, arguments); }); }
             [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(ctx => { if(!ctx || !ctx.prototype) return; ProxyGuard.override(ctx.prototype, 'getImageData', (orig) => function(x,y,w,h) { const r = orig.apply(this, arguments); const area = w * h; if (w < CONFIG.canvasMinSize || area > CONFIG.canvasMaxNoiseArea) return r; noise(r.data); return r; }); });
             if (win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() { const w=this.width, h=this.height; if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments); if ((w*h) > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments); let p=null; try { p = CanvasPool.get(w, h); p.ctx.clearRect(0,0,w,h); p.ctx.drawImage(this,0,0); const d = p.ctx.getImageData(0,0,w,h); noise(d.data); p.ctx.putImageData(d,0,0); return p.canvas.toDataURL.apply(p.canvas, arguments); } catch(e) { return orig.apply(this, arguments); } finally { if(p) p.release(); } });
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', (orig) => function(cb, t, q) { const w=this.width, h=this.height; if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments); if ((w*h) > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments); let p=null, released=false; const safeRel = () => { if(!released) { released=true; if(p) p.release(); } }; try { p = CanvasPool.get(w, h); p.ctx.clearRect(0,0,w,h); p.ctx.drawImage(this,0,0); const d = p.ctx.getImageData(0,0,w,h); noise(d.data); p.ctx.putImageData(d,0,0); p.canvas.toBlob((b) => { try{if(cb)cb(b);}finally{safeRel();} }, t, q); setTimeout(safeRel, CONFIG.toBlobReleaseFallbackMs); } catch(e) { safeRel(); return orig.apply(this, arguments); } });
             }
           } catch(e) {}
        }
      };

      const inject = function(win) {
        if (!win) return;
        Modules.hardware(win); Modules.clientHints(win); Modules.webgl(win); Modules.audio(win); Modules.rects(win); Modules.canvas(win);
      };

      const init = function() {
        inject(window);
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { try { if (n.tagName === 'IFRAME' && n.contentWindow) n.addEventListener('load', () => inject(n.contentWindow)); } catch(e){}\n        }))).observe(document, {childList:true, subtree:true});
      };

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    })();
    </script>
    `;

    if (REGEX.HEAD_TAG.test(body)) body = body.replace(REGEX.HEAD_TAG, m => m + injectionScript);
    else if (REGEX.HTML_TAG.test(body)) body = body.replace(REGEX.HTML_TAG, m => m + injectionScript);
    else body = injectionScript + body;

    Object.keys(headers).forEach(k => { const lowerKey = k.toLowerCase(); if (lowerKey.includes('content-security-policy') || lowerKey.includes('webkit-csp')) delete headers[k]; });
    body = body.replace(REGEX.META_CSP_STRICT, "<!-- CSP REMOVED -->");

    $done({ body, headers });
  }
})();

