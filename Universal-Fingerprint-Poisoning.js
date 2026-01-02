/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   3.11-Balanced (Logic Fix)
 * @description [邏輯平衡版] 修復防護模式失效問題。
 * ----------------------------------------------------------------------------
 * 1. [Fix] 移除模組層級的強制刪除，改由 JS 內部處理 Header 衝突。
 * 2. [Core] 確保 Protection Mode 下的 macOS Header 不會被誤刪。
 * 3. [Shopping] 確保 Shopping Mode 下維持 iPhone Header。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全域配置
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  let IS_SHOPPING_MODE = false;

  // 策略組連動
  try {
    if (typeof $surge !== 'undefined' && $surge.selectGroupDetails) {
      const decisions = $surge.selectGroupDetails().decisions;
      if (decisions && decisions['FP-Mode']) {
        const selection = decisions['FP-Mode'];
        if (selection.includes('Shopping') || selection.includes('購物')) {
          IS_SHOPPING_MODE = true;
        }
      }
    }
  } catch (e) {}

  if (!IS_SHOPPING_MODE && typeof $argument === "string" && $argument.includes("mode=shopping")) {
      IS_SHOPPING_MODE = true;
  }

  // ============================================================================
  // Phase A: HTTP Request Header Rewrite (網路層)
  // ============================================================================
  if (typeof $response === 'undefined' && typeof $request !== 'undefined') {
      const headers = $request.headers;
      
      // [關鍵邏輯 V3.11] 
      // 不依賴 Module 的 header-del，而是在這裡手動清洗
      // 遍歷所有 Header，刪除任何既有的 User-Agent (包含 Win10 幽靈)
      const keysToDelete = [];
      Object.keys(headers).forEach(key => {
          const lower = key.toLowerCase();
          if (lower === 'user-agent' || lower === 'sec-ch-ua' || lower === 'sec-ch-ua-mobile' || lower === 'sec-ch-ua-platform') {
              keysToDelete.push(key);
          }
      });
      keysToDelete.forEach(k => delete headers[k]);

      // 重新寫入我們需要的 Header
      if (IS_SHOPPING_MODE) {
          // 購物模式：iPhone
          headers['User-Agent'] = UA_IPHONE;
      } else {
          // 防護模式：macOS
          headers['User-Agent'] = UA_MAC;
          headers['sec-ch-ua-mobile'] = "?0";
          headers['sec-ch-ua-platform'] = '"macOS"';
      }

      $done({ headers });
      return; 
  }

  // ============================================================================
  // Phase B: HTTP Response Body Injection (瀏覽器層)
  // ============================================================================
  
  const CONST = {
    MAX_SIZE: 5000000,
    KEY_SEED: "FP_SHIELD_MAC_V311", 
    KEY_EXPIRY: "FP_SHIELD_EXP_V311",
    INJECT_MARKER: "__FP_SHIELD_V311__",
    BASE_ROTATION_MS: 24 * 60 * 60 * 1000,
    JITTER_RANGE_MS: 4 * 60 * 60 * 1000,
    CANVAS_MIN_SIZE: 16,
    CANVAS_MAX_NOISE_AREA: 500 * 500,
    MAX_POOL_SIZE: 5,
    MAX_POOL_DIM: 1024 * 1024,
    WEBGL_PARAM_CACHE_SIZE: 40,
    CACHE_CLEANUP_INTERVAL: 30000,
    TOBLOB_RELEASE_FALLBACK_MS: 3000
  };

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    CONTENT_TYPE_JSONLIKE: /(application\/json|application\/(ld\+json|problem\+json)|text\/json|application\/javascript|text\/javascript)/i,
    HEAD_TAG: /<head[^>]*>/i, 
    HTML_TAG: /<html[^>]*>/i,
    JSON_START: /^\s*[\{\[]/,
    META_CSP_STRICT: /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi
  };

  const $res = $response;
  const headers = $res.headers || {};
  const normalizedHeaders = Object.keys(headers).reduce((acc, key) => { acc[String(key).toLowerCase()] = headers[key]; return acc; }, {});

  const HardExclusions = (() => {
    const list = ["apple.com", "icloud.com", "mzstatic.com", "itunes.apple.com", "cdn-apple.com", "crashlytics.com", "firebaseio.com", "paypal.com", "stripe.com", "braintreegateway.com", "visa.com", "mastercard.com", "ecpay.com.tw", "jkopay.com", "esunbank.com.tw", "ctbcbank.com", "cathaybk.com.tw", "taishinbank.com.tw", "captive.apple.com"];
    return { check: (url) => { const u = url.toLowerCase(); return list.some(k => u.includes(k)); } };
  })();

  if (HardExclusions.check($request.url)) { $done({}); return; }

  if ([204, 206, 301, 302, 304].includes($res.status)) { $done({}); return; }
  if (normalizedHeaders["upgrade"] === "websocket" || (normalizedHeaders["connection"] && String(normalizedHeaders["connection"]).toLowerCase().includes("upgrade"))) { $done({}); return; }
  if (parseInt(normalizedHeaders["content-length"] || "0", 10) > CONST.MAX_SIZE) { $done({}); return; }
  const cType = normalizedHeaders["content-type"] || "";
  if (cType && (REGEX.CONTENT_TYPE_JSONLIKE.test(cType) || !REGEX.CONTENT_TYPE_HTML.test(cType))) { $done({}); return; }

  const SoftWhitelist = (() => {
    const domains = new Set(["google.com", "youtube.com", "facebook.com", "netflix.com", "spotify.com", "gov.tw", "edu.tw"]);
    return { check: (h) => { const host = String(h||"").toLowerCase().trim(); if(domains.has(host))return true; for(const d of domains){if(host.endsWith('.'+d))return true;} return false; } };
  })();

  let hostname = "";
  try { hostname = new URL($request.url).hostname.toLowerCase(); } catch (e) { $done({}); return; }
  
  const isSoftWhitelisted = IS_SHOPPING_MODE || SoftWhitelist.check(hostname);
  
  let body = $res.body;
  if (!body || REGEX.JSON_START.test(body.substring(0, 80).trim())) { $done({}); return; }
  if (body.includes(CONST.INJECT_MARKER)) { $done({ body, headers }); return; }

  Object.keys(headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('content-security-policy') || lowerKey.includes('webkit-csp')) delete headers[key];
  });

  body = body.replace(REGEX.META_CSP_STRICT, "<!-- CSP REMOVED -->");
  body = body.replace(/integrity=["'][^"']*["']/gi, "");

  const badgeColor = IS_SHOPPING_MODE ? "#AF52DE" : "#007AFF"; 
  const badgeText = IS_SHOPPING_MODE ? "FP: Shopping" : "FP: macOS";

  const staticBadgeHTML = `<div id="fp-nuclear-badge" style="position: fixed !important; bottom: 15px !important; left: 10px !important; top: auto !important; z-index: 2147483647 !important; background-color: ${badgeColor} !important; color: #FFFFFF !important; padding: 6px 10px !important; border-radius: 6px !important; font-family: -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 11px !important; font-weight: 700 !important; box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important; pointer-events: none !important; opacity: 1 !important; transition: opacity 0.5s, background-color 0.3s !important;">${badgeText}</div>`;

  const injectionScript = `
<script>
(function() {
  "use strict";
  const MARKER = '${CONST.INJECT_MARKER}';
  try { if (window[MARKER]) { try { window[MARKER].cleanup(); } catch(e){} } Object.defineProperty(window, MARKER, { value: { cleanup: () => {} }, configurable: true, writable: true }); } catch(e) {}

  const b = document.getElementById('fp-nuclear-badge');
  try {
      const CONFIG = {
        isWhitelisted: ${isSoftWhitelisted},
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

      if(b) {
          if(CONFIG.isWhitelisted) {
             const isShop = ${IS_SHOPPING_MODE};
             if (isShop) {
                 b.style.backgroundColor = '#AF52DE'; b.textContent = 'FP: Shopping';
             } else {
                 b.style.backgroundColor = '#666666'; b.textContent = 'FP Bypass';
             }
          } else { 
              b.style.backgroundColor = '#007AFF'; b.textContent = 'FP: macOS'; 
          }
          setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 1000); } }, 4000);
      }

      if (CONFIG.isWhitelisted) return;

      const safeDefine = (obj, prop, descriptor) => {
          if (!obj) return false;
          try {
              const d = Object.getOwnPropertyDescriptor(obj, prop);
              if (d && !d.configurable) return false;
              Object.defineProperty(obj, prop, descriptor);
              return true;
          } catch(e) { return false; }
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

      const Persona = (function() {
        const headerUA = "${UA_MAC}"; 
        const MAC_HW = {
            SILICON: { cpuPool: [8, 10, 12], ramPool: [8, 16, 24, 32], gpuPool: [{v: 'Apple', r: 'Apple M1', w: 40}, {v: 'Apple', r: 'Apple M2', w: 30}, {v: 'Apple', r: 'Apple M3', w: 20}, {v: 'Apple', r: 'Apple GPU', w: 10}] },
            INTEL: { cpuPool: [4, 6, 8, 12], ramPool: [8, 16, 32, 64], gpuPool: [{v: 'Intel Inc.', r: 'Intel(R) Iris(TM) Plus Graphics 640', w: 40}, {v: 'ATI Technologies Inc.', r: 'AMD Radeon Pro 5300M', w: 30}, {v: 'ATI Technologies Inc.', r: 'AMD Radeon Pro 5500M', w: 30}] }
        };
        const r = RNG.next();
        let tier = (r > 0.3) ? MAC_HW.SILICON : MAC_HW.INTEL;
        const cpu = RNG.pick(tier.cpuPool);
        const ram = RNG.pick(tier.ramPool);
        let gpu = RNG.pickWeighted(tier.gpuPool);
        gpu.topo = 'unified'; gpu.tex = 16384; 
        let chromeVer = "120";

        return { 
            ua: { raw: headerUA, ver: chromeVer, platform: 'MacIntel' },
            ch: { brands: [{brand:"Chromium",version:chromeVer}], platform: 'macOS', mobile: false, arch: (tier===MAC_HW.SILICON?'arm':'x86') },
            hw: { cpu, ram },
            gpu: gpu,
            plugins: [
                { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
            ]
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
          if (!step || step <= 0) return; 
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
        },
        font: function(w) { return w + (Noise.rand(Math.floor(w * 100)) * 0.04 - 0.02); }
      };

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
          spoofProp(N, 'userAgent', Persona.ua.raw);
          spoofProp(N, 'appVersion', Persona.ua.raw.replace('Mozilla/', ''));

          try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}

          if ('getBattery' in N) {
              try {
                  let cached = null;
                  const makeBattery = () => {
                     const ET = win.EventTarget || Object;
                     function Battery() {
                       this.charging = true; 
                       this.level = 0.9 + (RNG.next() * 0.1);
                       this.chargingTime = 0; this.dischargingTime = Infinity;
                       this.onlevelchange = null; this.onchargingchange = null;
                     }
                     Battery.prototype = Object.create(ET.prototype);
                     const handlers = new Map();
                     Battery.prototype.addEventListener = function(t, f) { const s = handlers.get(t)||new Set(); s.add(f); handlers.set(t, s); };
                     Battery.prototype.removeEventListener = function(t, f) { const s = handlers.get(t); if(s) s.delete(f); };
                     Battery.prototype.dispatchEvent = function(ev) {
                       const e = ev && typeof ev === 'object' ? ev : { type: String(ev) };
                       const s = handlers.get(e.type);
                       if (s) s.forEach(fn => { try { fn.call(this, e); } catch(_) {} });
                       const onHandler = this['on' + e.type];
                       if (typeof onHandler === 'function') { try { onHandler.call(this, e); } catch(_) {} }
                       return true;
                     };
                     const bat = new Battery();
                     bat._drain = function() { if (this.level > 0.1) { this.level -= 0.0001; this.dispatchEvent(new Event('levelchange')); } };
                     return bat;
                  };
                  safeDefine(N, 'getBattery', { value: function() { if(!cached) cached = makeBattery(); return Promise.resolve(cached); } });
                  win._FP_BATTERY_DRAIN = () => { if(cached && cached._drain) cached._drain(); };
              } catch(e) {}
          }
          
          if (!CONFIG.isIOS && !Persona.ch.mobile) {
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
          }
        },

        clientHints: function(win) {
          try {
            if (!win.navigator.userAgentData) return;
            const highEntropyData = {
                 architecture: Persona.ch.arch, bitness: Persona.ch.bitness, platformVersion: Persona.ch.platVer, 
                 uaFullVersion: Persona.ua.ver + '.0.0.0', model: Persona.ch.model, wow64: false
            };
            const fake = {
              brands: Persona.ch.brands, mobile: false, platform: Persona.ch.platform,
              getHighEntropyValues: (hints) => {
                 const result = { brands: Persona.ch.brands, mobile: false, platform: Persona.ch.platform };
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
            const getPrecision = (st, pt) => {
               const highP = { rangeMin: 127, rangeMax: 127, precision: 23 };
               const intP  = { rangeMin: 31,  rangeMax: 30,  precision: 0  };
               if (pt >= 36339) {
                   const hash = (Seed ^ st ^ pt ^ 0x12345678) >>> 0;
                   if ((hash % 100) < 10) return { rangeMin: 30, rangeMax: 30, precision: 0 };
                   return intP;
               }
               if (p.topo === 'tiered') { if (st === 35633 && pt === 36336) return { rangeMin: 127, rangeMax: 127, precision: 23 }; }
               return highP; 
            };
            [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(ctx => {
              if (!ctx || !ctx.prototype) return;
              ProxyGuard.override(ctx.prototype, 'getParameter', (orig) => function(param) {
                 if (param === 37445) return p.v;
                 if (param === 37446) return p.r;
                 if (param === 3379) return p.tex;
                 return orig.apply(this, arguments);
              });
              ProxyGuard.override(ctx.prototype, 'getShaderPrecisionFormat', (orig) => function(st, pt) {
                 const res = orig.apply(this, arguments);
                 if (res) {
                    try {
                       const fake = getPrecision(st, pt);
                       const spoof = { rangeMin: fake.rangeMin, rangeMax: fake.rangeMax, precision: fake.precision };
                       if (win.WebGLShaderPrecisionFormat) spoof.__proto__ = win.WebGLShaderPrecisionFormat.prototype;
                       else Object.defineProperty(spoof, Symbol.toStringTag, { value: 'WebGLShaderPrecisionFormat' });
                       return spoof;
                    } catch(e) { return res; }
                 }
                 return res;
              });
              ProxyGuard.override(ctx.prototype, 'getSupportedExtensions', (orig) => function() {
                 const exts = orig.apply(this, arguments);
                 if (!exts) return exts;
                 const out = Array.isArray(exts) ? exts.slice() : exts;
                 if (Array.isArray(out) && !out.includes('WEBGL_debug_renderer_info')) out.push('WEBGL_debug_renderer_info');
                 return out;
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
                const r=orig.apply(this,arguments); 
                Noise.audio(a); 
                return r; 
            });
            if(win.OfflineAudioContext) ProxyGuard.override(win.OfflineAudioContext.prototype, 'startRendering', (orig)=>function(){ 
                return orig.apply(this,arguments).then(b=>{ 
                    if(b) Noise.audio(b.getChannelData(0));
                    return b;
                }); 
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
               const obj = Object.create(Object.prototype); Object.defineProperties(obj, desc); return obj;
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
        
        let timer = setInterval(() => { if (win._FP_BATTERY_DRAIN) win._FP_BATTERY_DRAIN(); }, CONFIG.cleanupInterval);
        if (win[MARKER]) win[MARKER].cleanup = () => { if (timer) clearInterval(timer); };

        win.addEventListener('pagehide', (e) => {
            if(timer) clearInterval(timer);
        });
        win.addEventListener('pageshow', (e) => {
            if (e.persisted) timer = setInterval(() => { if (win._FP_BATTERY_DRAIN) win._FP_BATTERY_DRAIN(); }, CONFIG.cleanupInterval);
        });
      };

      const init = function() {
        inject(window);
        new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
           try { if (n.tagName === 'IFRAME' && n.contentWindow) n.addEventListener('load', () => inject(n.contentWindow)); } catch(e){}
        }))).observe(document, {childList:true, subtree:true});
      };

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
  
  } catch(e) { panic(e); }
})();
</script>


