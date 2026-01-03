/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.86-Visual-Patch (Green Shield + Gemini Support)
 * @description [視覺優化版] 調整 Badge 顏色邏輯，並支援 Google Gemini。
 * ----------------------------------------------------------------------------
 * 1. [Visual] 狀態指示: 綠色(Active) / 灰色(Bypass) / 紫色(Shopping)。
 * 2. [Whitelist] 新增 gemini.google.com 至軟白名單，確保 AI 對話流暢。
 * 3. [Core] V2.81: 完整保留重裝指紋混淆邏輯，僅在非白名單網站啟動。
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
    // 更新 Seed 以強制刷新緩存規則
    KEY_SEED: "FP_SHIELD_SEED_V486", 
    KEY_EXPIRY: "FP_SHIELD_EXP_V486",
    INJECT_MARKER: "__FP_SHIELD_V486__",
    
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
    
    // User Agents
    UA_MAC: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    UA_IPHONE: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
  };

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    HEAD_TAG: /<head[^>]*>/i, 
    HTML_TAG: /<html[^>]*>/i,
    META_CSP_STRICT: /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi
  };

  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) {}

  // ============================================================================
  // 1. [Hard Exclusion] 硬排除 - 絕對不碰的領域 (無 Badge 顯示)
  // ============================================================================
  // 這些服務一旦修改 Header 或注入 JS，極易崩潰。硬排除會直接 $done({})，不顯示任何盾牌。
  const HARD_EXCLUSION_KEYWORDS = [
    // 1. 通訊與社交 App
    "line.me", "line-apps", "line-scdn", "legy", 
    "naver.com", "naver.jp", 
    "facebook.com/api", "messenger.com", "whatsapp.com", "instagram.com",
    
    // 2. 系統服務 (Apple/Google 底層 API)
    "googleapis.com", "gstatic.com", "googleusercontent.com", 
    "apple.com", "icloud.com", "mzstatic.com", "itunes.apple.com",
    
    // 3. 敏感 AI 服務 (API 端點)
    "oaistatic.com", "oaiusercontent.com", // ChatGPT Assets
    "anthropic.com", // Claude API
    
    // 4. 驗證碼服務 (CAPTCHA)
    "challenges.cloudflare.com", "recaptcha.net", "google.com/recaptcha", "hcaptcha.com", "arkoselabs.com"
  ];
  
  if (HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k))) {
    $done({});
    return;
  }

  // ============================================================================
  // 2. [Soft Whitelist] 軟白名單 - 顯示灰色 Badge (Bypass)
  // ============================================================================
  const WhitelistManager = (() => {
    const trustedDomains = new Set([
      // AI 服務 (新增 Gemini)
      "gemini.google.com", "bard.google.com", "chatgpt.com", "claude.ai", "perplexity.ai",
      
      // Google 交互式服務
      "docs.google.com", "drive.google.com", "mail.google.com", "meet.google.com", "calendar.google.com",
      
      // Microsoft 生產力工具
      "microsoft.com", "office.com", "live.com", "teams.microsoft.com", "sharepoint.com", "onenote.com",
      
      // 串流媒體
      "netflix.com", "spotify.com", "disneyplus.com", "twitch.tv", "youtube.com", "iqiyi.com", "kkbox.com",
      
      // 台灣主流網銀 (Taiwan Banks)
      "ctbcbank.com", "cathaybk.com.tw", "esunbank.com.tw", "fubon.com", "taishinbank.com.tw", 
      "megabank.com.tw", "bot.com.tw", "firstbank.com.tw", "hncb.com.tw", "sinopac.com", "post.gov.tw",
      
      // 支付與驗證網關
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
  // 3. 模式偵測 (Shopping vs Protection)
  // ============================================================================
  let mode = "protection";
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
  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (網路層 - Header 偽裝)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      headers['User-Agent'] = CONST.UA_IPHONE;
    } else {
      headers['User-Agent'] = CONST.UA_MAC;
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"';
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (瀏覽器層 - 核心注入)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    const cType = (headers['Content-Type'] || headers['content-type'] || "").toLowerCase();

    // 基礎過濾
    if ([204, 206, 301, 302, 304].includes($response.status)) { $done({}); return; }
    if (!body || (cType && !cType.includes("html"))) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    // Badge Logic (Updated V4.86)
    // 預設: 綠色 (Green) - Protection Active
    let badgeColor = "#28CD41"; 
    let badgeText = "FP: Shield Active";
    
    if (IS_SHOPPING) {
        // 購物模式: 紫色 (Purple)
        badgeColor = "#AF52DE"; badgeText = "FP: Shopping Mode"; 
    } else if (isSoftWhitelisted) {
        // 白名單: 灰色 (Grey) - Bypass
        badgeColor = "#636366"; badgeText = "FP: Bypass (Safe)"; 
    }

    // ------------------------------------------------------------------------
    // [Core Injection] V2.81 完整邏輯
    // ------------------------------------------------------------------------
    const injectionScript = `
    <!-- ${CONST.INJECT_MARKER} -->
    <div id="fp-badge" style="
        position: fixed !important;
        bottom: 15px !important;
        left: 15px !important;
        z-index: 2147483647 !important;
        background: ${badgeColor} !important;
        color: #ffffff !important;
        padding: 7px 14px !important;
        border-radius: 10px !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        pointer-events: none !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
        transition: opacity 0.8s ease-out !important;
        opacity: 1 !important;
        display: block !important;
    ">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const MARKER = '${CONST.INJECT_MARKER}';
      try { if (window[MARKER]) return; Object.defineProperty(window, MARKER, { value: true, configurable: true, writable: true }); } catch(e) {}

      // UI Control
      const b = document.getElementById('fp-badge');
      // 延長顯示時間至 4000ms 確保使用者能看見
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 1000); } }, 4000);

      // [Decision Gate]
      // 若為購物模式或白名單網站，執行基礎清理後退出，確保不干擾功能
      const IS_SHOPPING = ${IS_SHOPPING};
      const IS_WHITELISTED = ${isSoftWhitelisted};

      if (IS_SHOPPING || IS_WHITELISTED) {
          try { if (navigator && 'webdriver' in navigator) delete navigator.webdriver; } catch(e) {}
          return; // 白名單模式下，僅顯示 Badge 並移除 webdriver 標記，不執行後續混淆
      }

      // --- 以下為完整混淆邏輯 (僅在綠色盾牌模式下執行) ---

      const CONFIG = {
        rectNoiseRate: 0.0001,
        canvasNoiseStep: 2,
        audioNoiseLevel: 1e-6,
        canvasMinSize: ${CONST.CANVAS_MIN_SIZE},
        canvasMaxNoiseArea: ${CONST.CANVAS_MAX_NOISE_AREA},
        maxPoolSize: ${CONST.MAX_POOL_SIZE},
        maxPoolDim: ${CONST.MAX_POOL_DIM},
        webglCacheSize: ${CONST.WEBGL_PARAM_CACHE_SIZE},
        cleanupInterval: ${CONST.CACHE_CLEANUP_INTERVAL},
        toBlobReleaseFallbackMs: ${CONST.TOBLOB_RELEASE_FALLBACK_MS}
      };

      // ---------------- Helper: SafeDefine ----------------
      const safeDefine = (obj, prop, descriptor) => {
          if (!obj) return false;
          try {
              const d = Object.getOwnPropertyDescriptor(obj, prop);
              if (d && !d.configurable) return false;
              Object.defineProperty(obj, prop, descriptor);
              return true;
          } catch(e) { return false; }
      };

      // ---------------- Seed & RNG ----------------
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
        next: function() {
          let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
          this.s = x >>> 0; return (this.s / 4294967296);
        },
        pick: function(arr) { return arr[Math.floor(this.next() * arr.length)]; },
        pickWeighted: function(items) {
          let total = 0; for(let i=0; i<items.length; i++) total += items[i].w;
          let r = this.next() * total;
          for(let i=0; i<items.length; i++) { r -= items[i].w; if (r <= 0) return items[i].v; }
          return items[0].v;
        }
      };
      if (RNG.s === 0) RNG.s = 1;

      // ---------------- Persona (Force macOS High-Tier) ----------------
      const Persona = (function() {
        const MAC_TIERS = {
            MID: { 
                cpuPool: [8, 10], ramPool: [16, 24],
                gpuPool: [{v: 'Apple', r: 'Apple M2', w: 60}, {v: 'Apple', r: 'Apple M2 Pro', w: 40}]
            },
            HIGH: { 
                cpuPool: [12, 16], ramPool: [32, 64],
                gpuPool: [{v: 'Apple', r: 'Apple M3 Max', w: 60}, {v: 'Apple', r: 'Apple M3 Ultra', w: 40}]
            }
        };

        const r = RNG.next();
        let tier = (r > 0.6) ? MAC_TIERS.HIGH : MAC_TIERS.MID;

        const cpu = RNG.pick(tier.cpuPool);
        const ram = RNG.pick(tier.ramPool);
        const gpu = RNG.pickWeighted(tier.gpuPool);
        gpu.topo = 'unified'; gpu.tex = 16384;

        const plugins = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ];

        return { 
            ua: { ver: "124", platform: "MacIntel" },
            ch: { brands: [{brand:"Chromium",version:"124"},{brand:"Google Chrome",version:"124"},{brand:"Not-A.Brand",version:"8"}], platform: "macOS", mobile: false, arch: "x86", bitness: "64", model: "", platVer: "14.4.1" },
            hw: { cpu, ram },
            gpu: gpu,
            plugins: plugins
        };
      })();

      // ---------------- ProxyGuard ----------------
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
              getOwnPropertyDescriptor: (t, k) => {
                 const nativeDesc = Reflect.getOwnPropertyDescriptor(native, k);
                 if (nativeDesc && nativeDesc.configurable === false) return nativeDesc;
                 const d = Reflect.getOwnPropertyDescriptor(native, k);
                 return (d && !d.configurable) ? d : (Reflect.getOwnPropertyDescriptor(t, k) || d);
              },
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

      // ---------------- CanvasPool ----------------
      const CanvasPool = (function() {
        const pool = [];
        const shrink = (item) => { try { item.c.width = 1; item.c.height = 1; } catch(e) {} };
        return {
          get: function(w, h) {
            if (!w || !h || (w*h) > CONFIG.maxPoolDim) {
              const c = document.createElement('canvas');
              if (w && h && (w*h) <= CONFIG.maxPoolDim) { c.width = w; c.height = h; }
              return { canvas: c, ctx: c.getContext('2d', {willReadFrequently:true}), release: function(){ try{c.width=1;c.height=1;}catch(e){} } };
            }
            let best = null;
            for (let i = 0; i < pool.length; i++) if (!pool[i].u && pool[i].c.width >= w && pool[i].c.height >= h) { if (!best || pool[i].t < best.t) best = pool[i]; }
            if (!best) {
              if (pool.length < CONFIG.maxPoolSize) { 
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                return { canvas: c, ctx: c.getContext('2d', {willReadFrequently:true}), release: function(){ try{c.width=1;c.height=1;}catch(e){} } };
              }
            }
            best.u = true; best.t = Date.now(); best.c.width = w; best.c.height = h;
            return { canvas: best.c, ctx: best.x, release: function() { best.u = false; best.t = Date.now(); } };
          },
          cleanup: function() { for(let i=0; i<pool.length; i++) if(!pool[i].u) shrink(pool[i]); },
          clearAll: function() { for(let i=0; i<pool.length; i++) shrink(pool[i]); pool.length=0; }
        };
      })();

      // ---------------- Noise Helpers ----------------
      const Noise = {
        spatial01: function(x, y, salt) {
          let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 1442695041 + (RNG.s | 0);
          h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
          return h / 4294967296;
        },
        rand: function(i) { let x = ((RNG.s + (i|0)) | 0) >>> 0; x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296; },
        pixel: function(d, w, h) {
          const area = w * h;
          if (area > CONFIG.canvasMaxNoiseArea) return; 
          if (!d || d.length < 4) return;
          const step = CONFIG.canvasNoiseStep;
          const rowSaltBase = (RNG.s ^ 0x9E3779B9) >>> 0;
          for (let y = 0; y < h; y += step) {
            const rowSalt = (rowSaltBase + (y * 2654435761)) >>> 0;
            const rowOffset = y * w;
            for (let x = 0; x < w; x += step) {
              const i = (rowOffset + x) * 4;
              if (i + 2 >= d.length) continue;
              const n = Noise.spatial01(x, y, rowSalt);
              if (n < 0.05) {
                const delta = (((n * 1000) | 0) & 1) ? 1 : -1;
                d[i] = Math.max(0, Math.min(255, d[i] + delta));
                d[i+1] = Math.max(0, Math.min(255, d[i+1] - delta));
                d[i+2] = Math.max(0, Math.min(255, d[i+2] + delta));
              }
            }
          }
        },
        audio: function(d) {
           const lvl = CONFIG.audioNoiseLevel;
           if (lvl < 1e-8) return;
           for(let i=0; i<d.length; i+=100) d[i] += (Noise.rand(i) * lvl - lvl/2);
        }
      };

      // ---------------- Modules ----------------
      const Modules = {
        hardware: function(win) {
          const N = win.navigator;
          const spoofProp = (target, prop, getterVal) => {
              const desc = { get: () => getterVal, configurable: true };
              if (!safeDefine(target, prop, desc)) {
                  try { if (win.Navigator && win.Navigator.prototype) { safeDefine(win.Navigator.prototype, prop, desc); } } catch(e) {}
              }
          };
          spoofProp(N, 'hardwareConcurrency', Persona.hw.cpu);
          spoofProp(N, 'deviceMemory', Persona.hw.ram);
          spoofProp(N, 'platform', Persona.ua.platform);
          try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}

          // Plugins
          try {
             const pList = Persona.plugins;
             const targetObj = {};
             pList.forEach((p, i) => { Object.defineProperty(targetObj, i, { value: p, enumerable: true, writable: false, configurable: true }); });
             pList.forEach((p) => { Object.defineProperty(targetObj, p.name, { value: p, enumerable: false, writable: false, configurable: true }); });
             Object.defineProperty(targetObj, 'length', { value: pList.length, enumerable: false, writable: false, configurable: false });
             Object.defineProperties(targetObj, {
                 item: { value: i => pList[i] || null, enumerable: false, writable: false, configurable: true },
                 namedItem: { value: n => pList.find(p=>p.name===n) || null, enumerable: false, writable: false, configurable: true },
                 refresh: { value: () => {}, enumerable: false, writable: false, configurable: true }
             });
             if (win.PluginArray) Object.setPrototypeOf(targetObj, win.PluginArray.prototype);
             const fakePlugins = new Proxy(targetObj, {
                 get(t, p, r) { if (typeof p === 'symbol') return Reflect.get(t, p, r); if (p === 'length') return t.length; return Reflect.get(t, p, r); }
             });
             safeDefine(N, 'plugins', { get: () => fakePlugins, configurable: true });
          } catch(e) {}
        },

        clientHints: function(win) {
          try {
            const highEntropyData = {
                 architecture: Persona.ch.arch, bitness: Persona.ch.bitness, platformVersion: Persona.ch.platVer, 
                 uaFullVersion: Persona.ua.ver + '.0.0.0', model: Persona.ch.model, wow64: false
            };
            const fake = {
              brands: Persona.ch.brands, mobile: Persona.ch.mobile, platform: Persona.ch.platform,
              getHighEntropyValues: (hints) => {
                 const result = { brands: Persona.ch.brands, mobile: Persona.ch.mobile, platform: Persona.ch.platform };
                 if (hints && Array.isArray(hints)) { hints.forEach(h => { if (highEntropyData.hasOwnProperty(h)) result[h] = highEntropyData[h]; }); }
                 return Promise.resolve(result);
              },
              toJSON: function() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; }
            };
            safeDefine(win.navigator, 'userAgentData', { get: () => fake, configurable: true });
          } catch(e) {}
        },

        webgl: function(win) {
          try {
            const p = Persona.gpu;
            const debugObj = { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
            [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(ctx => {
              if (!ctx || !ctx.prototype) return;
              ProxyGuard.override(ctx.prototype, 'getParameter', (orig) => function(param) {
                 if (param === 37445) return p.v;
                 if (param === 37446) return p.r;
                 return orig.apply(this, arguments);
              });
              ProxyGuard.override(ctx.prototype, 'getExtension', (orig) => function(n) {
                 if (n === 'WEBGL_debug_renderer_info') return debugObj;
                 return orig.apply(this, arguments);
              });
            });
          } catch(e) {}
        },

        audio: function(win) {
          if (CONFIG.audioNoiseLevel < 1e-8) return;
          try {
            if(win.AnalyserNode) ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig)=>function(a){ 
                const r=orig.apply(this,arguments); Noise.audio(a); return r; 
            });
            if(win.OfflineAudioContext) ProxyGuard.override(win.OfflineAudioContext.prototype, 'startRendering', (orig)=>function(){ 
                return orig.apply(this,arguments).then(b=>{ if(b) Noise.audio(b.getChannelData(0)); return b; }); 
            });
          } catch(e){}
        },
        
        rects: function(win) {
           try {
             const Element = win.Element;
             if (!Element) return;
             const wrap = r => {
               if (!r) return r;
               const n = (w, h) => {
                  const s = (Math.floor(w)*374761393) ^ (Math.floor(h)*668265263);
                  const x = Math.sin(s) * 10000;
                  return (x - Math.floor(x)) * CONFIG.rectNoiseRate;
               };
               const f = 1 + n(r.width, r.height);
               const nw = r.width * f; const nh = r.height * f;
               const desc = {
                   x: { value: r.x, enumerable: true }, y: { value: r.y, enumerable: true },
                   width: { value: nw, enumerable: true }, height: { value: nh, enumerable: true },
                   top: { value: r.top, enumerable: true }, left: { value: r.left, enumerable: true },
                   right: { value: r.left + nw, enumerable: true }, bottom: { value: r.top + nh, enumerable: true },
                   toJSON: { value: function(){return this;}, enumerable: false }
               };
               if (win.DOMRectReadOnly) { const obj = Object.create(win.DOMRectReadOnly.prototype); Object.defineProperties(obj, desc); return obj; }
               return r; 
             };
             
             ProxyGuard.override(Element.prototype, 'getBoundingClientRect', (orig) => function() { return wrap(orig.apply(this, arguments)); });
             ProxyGuard.override(Element.prototype, 'getClientRects', (orig) => function() {
                const rects = orig.apply(this, arguments);
                const res = { length: rects.length };
                if (win.DOMRectList) Object.setPrototypeOf(res, win.DOMRectList.prototype);
                res.item = function(i) { return this[i] || null; };
                for(let i=0; i<rects.length; i++) res[i] = wrap(rects[i]);
                return res;
             });
           } catch(e) {}
        },

        canvas: function(win) {
           try {
             const noise = (d) => {
                const step = CONFIG.canvasNoiseStep;
                if (!step) return;
                for (let i=0; i<d.length; i+=step*4) { if (RNG.next() < 0.01) d[i] = d[i] ^ 1; }
             };
             
             if (win.OffscreenCanvas) {
                 ProxyGuard.override(win.OffscreenCanvas.prototype, 'convertToBlob', (orig) => function() {
                     try {
                         const area = this.width * this.height;
                         if (area > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments);
                         const ctx = this.getContext('2d');
                         if (ctx) {
                             const d = ctx.getImageData(0,0,this.width,this.height);
                             noise(d.data);
                             ctx.putImageData(d,0,0);
                         }
                     } catch(e){}
                     return orig.apply(this, arguments);
                 });
             }

             [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(ctx => {
                if(!ctx || !ctx.prototype) return;
                ProxyGuard.override(ctx.prototype, 'getImageData', (orig) => function(x,y,w,h) {
                   const r = orig.apply(this, arguments);
                   const area = w * h;
                   if (w < CONFIG.canvasMinSize || area > CONFIG.canvasMaxNoiseArea) return r;
                   noise(r.data);
                   return r;
                });
             });

             if (win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() {
                   const w=this.width, h=this.height;
                   if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments);
                   if ((w*h) > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments);

                   let p=null;
                   try {
                      p = CanvasPool.get(w, h);
                      p.ctx.clearRect(0,0,w,h); p.ctx.drawImage(this,0,0);
                      const d = p.ctx.getImageData(0,0,w,h); noise(d.data); p.ctx.putImageData(d,0,0);
                      return p.canvas.toDataURL.apply(p.canvas, arguments);
                   } catch(e) { return orig.apply(this, arguments); }
                   finally { if(p) p.release(); }
                });
                
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', (orig) => function(cb, t, q) {
                   const w=this.width, h=this.height;
                   if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments);
                   if ((w*h) > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments);

                   let p=null, released=false;
                   const safeRel = () => { if(!released) { released=true; if(p) p.release(); } };
                   try {
                      p = CanvasPool.get(w, h);
                      p.ctx.clearRect(0,0,w,h); p.ctx.drawImage(this,0,0);
                      const d = p.ctx.getImageData(0,0,w,h); noise(d.data); p.ctx.putImageData(d,0,0);
                      p.canvas.toBlob((b) => { try{if(cb)cb(b);}finally{safeRel();} }, t, q);
                      setTimeout(safeRel, CONFIG.toBlobReleaseFallbackMs);
                   } catch(e) { safeRel(); return orig.apply(this, arguments); }
                });
             }
           } catch(e) {}
        }
      };

      const inject = function(win) {
        if (!win) return;
        Modules.hardware(win);
        Modules.clientHints(win);
        Modules.webgl(win);
        Modules.audio(win);
        Modules.rects(win);
        Modules.canvas(win);
      };

      const init = function() {
        inject(window);
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
           try { if (n.tagName === 'IFRAME' && n.contentWindow) n.addEventListener('load', () => inject(n.contentWindow)); } catch(e){}
        }))).observe(document, {childList:true, subtree:true});
      };

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
  
    })();
    </script>
    `;

    // 注入順序優化
    if (REGEX.HEAD_TAG.test(body)) {
      body = body.replace(REGEX.HEAD_TAG, m => m + injectionScript);
    } else if (REGEX.HTML_TAG.test(body)) {
      body = body.replace(REGEX.HTML_TAG, m => m + injectionScript);
    } else {
      body = injectionScript + body;
    }

    // Remove CSP
    Object.keys(headers).forEach(k => {
      const lowerKey = k.toLowerCase();
      if (lowerKey.includes('content-security-policy') || lowerKey.includes('webkit-csp')) {
          delete headers[k];
      }
    });
    body = body.replace(REGEX.META_CSP_STRICT, "<!-- CSP REMOVED -->");

    $done({ body, headers });
  }
})();


