/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.46-Titan-Aegis (Safety First & Performance Heuristics)
 * @description 最終安全定版：針對安全性與高效能運算的企業級修正。
 * ----------------------------------------------------------------------------
 * 1. [Security] CSP Safe Mode: REMOVE_CSP 預設改為 false，不再主動降低站點安全性，優先保障使用者瀏覽安全。
 * 2. [Perf] Canvas Heuristics: 引入 500x500 (250k px) 面積閾值。大尺寸畫布(如圖片編輯/QR生成)自動略過雜訊，避免 Worker 卡死與資料損毀。
 * 3. [Stability] Offscreen Guard: convertToBlob 增加 Context 檢查與錯誤隔離，防止 WebGL/BitmapRenderer 衝突導致的崩潰。
 * 4. [Core] Inheritance: 繼承 v2.45 的 Persona 引擎、BFCache 支援與 DOMRect 唯讀模擬。
 * ----------------------------------------------------------------------------
 * @note Surge/Quantumult X 類 rewrite。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全局設定
  // ============================================================================
  const CONST = {
    MAX_SIZE: 5000000,
    KEY_SEED: "FP_SHIELD_SEED_V246_TITAN",
    INTERFERENCE_LEVEL: 1, // 0:Min, 1:Bal, 2:Agg
    
    // [Security Fix] Default to False. Safety first.
    REMOVE_CSP: false,      
    
    // [Perf Fix] Only noise small/medium canvases (Fingerprint vectors).
    // Skip large canvases (Images, Maps, Editors) to prevent lag/corruption.
    CANVAS_MAX_NOISE_AREA: 500 * 500, 
    
    // System Configs
    MAX_POOL_SIZE: 5,
    MAX_POOL_DIM: 1024 * 1024,
    MAX_ERROR_LOGS: 50,
    CSP_CHECK_LENGTH: 3000,
    
    CANVAS_MIN_SIZE: 16,
    WEBGL_PARAM_CACHE_SIZE: 40,
    
    IDLE_TIMEOUT: 1000,
    CACHE_CLEANUP_INTERVAL: 30000,
    ERROR_THROTTLE_MS: 1000,
    BADGE_FADE_WHITELIST: 2000,
    BADGE_FADE_NORMAL: 4000,
    TOBLOB_RELEASE_FALLBACK_MS: 3000,
    WORKER_REVOKE_DELAY_MS: 4000,
    CANVAS_MAX_PIXELS_NOISE: 1920 * 1080, // Absolute clamp for extreme cases
    WEBGL_TA_CACHE_SIZE: 16,
    INJECT_MARKER: "__FP_SHIELD_V246__"
  };

  const GET_NOISE_CONFIG = (level) => {
    const map = [
      { rect: 0.00001, canvasStep: 4, audio: 1e-7 },
      { rect: 0.0001,  canvasStep: 2, audio: 1e-6 },
      { rect: 0.001,   canvasStep: 1, audio: 1e-5 }
    ];
    return map[level] || map[1];
  };
  const NOISE_CFG = GET_NOISE_CONFIG(CONST.INTERFERENCE_LEVEL);

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    CONTENT_TYPE_JSONLIKE: /(application\/json|application\/(ld\+json|problem\+json)|text\/json|application\/javascript|text\/javascript)/i,
    HEAD_TAG: /<head[^>]*>/i,
    HTML_TAG: /<html[^>]*>/i,
    META_CSP_BLOCKING: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
    JSON_START: /^\s*[\{\[]/,
  };

  const $res = $response;
  const $req = $request;

  // 1. 基礎過濾
  if ([204, 206, 301, 302, 304].includes($res.status)) { $done({}); return; }
  const headers = $res.headers || {};
  const normalizedHeaders = Object.keys(headers).reduce((acc, key) => { acc[String(key).toLowerCase()] = headers[key]; return acc; }, {});
  if (normalizedHeaders["upgrade"] === "websocket" || (normalizedHeaders["connection"] && String(normalizedHeaders["connection"]).toLowerCase().includes("upgrade"))) { $done({}); return; }
  if (parseInt(normalizedHeaders["content-length"] || "0", 10) > CONST.MAX_SIZE) { $done({}); return; }
  const cType = normalizedHeaders["content-type"] || "";
  if (cType && (REGEX.CONTENT_TYPE_JSONLIKE.test(cType) || !REGEX.CONTENT_TYPE_HTML.test(cType))) { $done({}); return; }

  // 2. 白名單 (Vault Strategy)
  const WhitelistManager = (() => {
    const trustedDomains = new Set([
      "google.com", "www.google.com", "accounts.google.com", "docs.google.com",
      "youtube.com", "www.youtube.com",
      "microsoft.com", "login.microsoftonline.com", "live.com",
      "apple.com", "icloud.com", "appleid.apple.com",
      "amazon.com", "aws.amazon.com",
      "github.com", "gitlab.com",
      "stackoverflow.com",
      "openai.com", "chatgpt.com", "claude.ai",
      "line.me", "whatsapp.com", "discord.com",
      "webglreport.com", "browserleaks.com"
    ]);
    
    const trustedSuffixes = [
      ".gov.tw", ".edu.tw", ".org.tw", 
      ".gov", ".edu", ".mil", ".bank"
    ];

    const normalize = h => String(h || "").toLowerCase().trim();
    
    return {
      check: (hostname) => {
        const h = normalize(hostname);
        if (!h) return false;
        if (trustedDomains.has(h)) return true;
        for (const d of trustedDomains) { if (h.endsWith('.' + d)) return true; }
        for (const s of trustedSuffixes) { if (h.endsWith(s)) return true; }
        return false;
      }
    };
  })();

  const uaRaw = $req.headers["User-Agent"] || $req.headers["user-agent"];
  const currentUA = (uaRaw || "").toLowerCase();
  if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }
  
  let hostname = "";
  try { hostname = new URL($req.url).hostname.toLowerCase(); } catch (e) { $done({}); return; }
  
  const isWhitelisted = WhitelistManager.check(hostname);
  let body = $res.body;
  if (!body || REGEX.JSON_START.test(body.substring(0, 80).trim())) { $done({}); return; }
  if (body.includes(CONST.INJECT_MARKER)) { $done({ body, headers }); return; }

  // 3. CSP 移除 (Safe Mode)
  // 只有在明確開啟 REMOVE_CSP 且非白名單時才執行 (預設關閉)
  if (!isWhitelisted && CONST.REMOVE_CSP) {
      const blockingCspKeys = ["content-security-policy", "x-content-security-policy", "x-webkit-csp"];
      Object.keys(headers).forEach(k => { if (blockingCspKeys.includes(k.toLowerCase())) delete headers[k]; });
      
      const headChunk = body.substring(0, CONST.CSP_CHECK_LENGTH);
      if (REGEX.META_CSP_BLOCKING.test(headChunk)) {
        REGEX.META_CSP_BLOCKING.lastIndex = 0;
        body = headChunk.replace(REGEX.META_CSP_BLOCKING, "") + body.substring(CONST.CSP_CHECK_LENGTH);
      }
  }

  // ============================================================================
  // 4. 注入腳本 (v2.46-Titan-Aegis)
  // ============================================================================
  const injection = `
<script>
(function() {
  "use strict";
  const MARKER = '${CONST.INJECT_MARKER}';
  try { 
    if (window[MARKER]) { try { window[MARKER].cleanup(); } catch(e){} }
    Object.defineProperty(window, MARKER, { value: { cleanup: () => {} }, configurable: true, writable: true }); 
  } catch(e) {}

  const CONFIG = {
    ver: '2.46-Titan-Aegis',
    isWhitelisted: ${isWhitelisted},
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    maxErrorLogs: ${CONST.MAX_ERROR_LOGS},
    rectNoiseRate: ${NOISE_CFG.rect},
    canvasNoiseStep: ${NOISE_CFG.canvasStep},
    audioNoiseLevel: ${NOISE_CFG.audio},
    
    // Heuristics
    canvasMinSize: ${CONST.CANVAS_MIN_SIZE},
    canvasMaxNoiseArea: ${CONST.CANVAS_MAX_NOISE_AREA}, // [Perf Fix]
    
    errorThrottleMs: ${CONST.ERROR_THROTTLE_MS},
    webglCacheSize: ${CONST.WEBGL_PARAM_CACHE_SIZE},
    cleanupInterval: ${CONST.CACHE_CLEANUP_INTERVAL},
    maxPoolSize: ${CONST.MAX_POOL_SIZE},
    maxPoolDim: ${CONST.MAX_POOL_DIM},
    toBlobReleaseFallbackMs: ${CONST.TOBLOB_RELEASE_FALLBACK_MS}
  };

  const UI = {
    showBadge: function() {
      try {
        if (document.getElementById('fp-shield-badge')) return;
        const b = document.createElement('div');
        b.id = 'fp-shield-badge';
        const color = CONFIG.isWhitelisted ? 'rgba(100,100,100,0.85)' : 'rgba(0,120,0,0.9)';
        const text = CONFIG.isWhitelisted ? 'FP Bypass' : 'FP Active';
        b.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:2147483647;background:'+color+';color:#fff;padding:6px;border-radius:4px;font-size:10px;pointer-events:none;opacity:0;transition:opacity 0.5s;';
        b.textContent = text;
        (document.body||document.documentElement).appendChild(b);
        requestAnimationFrame(()=>b.style.opacity='1');
        setTimeout(()=> { b.style.opacity='0'; setTimeout(()=>b.remove(),500); }, 3000);
      } catch(e){}
    },
    cleanup: function() { const b=document.getElementById('fp-shield-badge'); if(b) b.remove(); }
  };

  if (CONFIG.isWhitelisted) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UI.showBadge);
      else UI.showBadge();
      return; 
  }

  // ---------------- Seed & RNG ----------------
  const Seed = (function() {
    const KEY = '${CONST.KEY_SEED}';
    let val;
    try { val = sessionStorage.getItem(KEY); } catch(e) {}
    if (!val) {
      let extra = 0;
      if (window.crypto && window.crypto.getRandomValues) {
         const u32 = new Uint32Array(1);
         window.crypto.getRandomValues(u32);
         extra = u32[0];
      } else {
         const p = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
         const s = (window.screen ? (screen.width * screen.height) : 0);
         const h = (window.history ? history.length : 0);
         extra = ((Date.now() ^ (p * 1000) ^ s ^ (h * 100)) >>> 0);
      }
      val = extra.toString();
      try { sessionStorage.setItem(KEY, val); } catch(e) {}
    }
    return (parseInt(val, 10) >>> 0) || 1;
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

  // ---------------- Unified Persona ----------------
  const Persona = (function() {
    const rawUA = navigator.userAgent || '';
    const isWin = /Win/i.test(rawUA);
    const isMac = /Mac/i.test(rawUA);
    const isLinux = /Linux/i.test(rawUA);
    const isAndroid = /Android/i.test(rawUA);
    const isMobile = /Mobile/i.test(rawUA);

    const isIntelMac = isMac && !/ARM/i.test(rawUA) && ((Seed % 100) < 20); 

    let chromeVer = "120";
    const match = rawUA.match(/Chrome\/(\d+)/);
    if (match && match[1]) chromeVer = match[1];

    let profile = 'office';
    if (isAndroid || isMobile) profile = 'mobile';
    else if (isWin) profile = ((Seed % 100) > 50) ? 'gamer' : 'office';
    else if (isIntelMac) profile = 'legacy';
    else if (isMac) profile = 'office';

    let cpu, ram, gpuKey, arch, bitness, platformVersion, model;
    
    if (profile === 'gamer') {
        cpu = RNG.pick([12, 16, 24]); ram = RNG.pick([16, 32, 64]);
        gpuKey = RNG.pickWeighted([{v:"nvidia_desktop", w:70}, {v:"amd_desktop", w:30}]);
        arch = "x86"; bitness = "64";
    } else if (profile === 'office') {
        cpu = RNG.pick([4, 8]); ram = RNG.pick([8, 16]);
        if (isWin) gpuKey = "intel_desktop";
        else if (isMac) gpuKey = "apple_m";
        else gpuKey = "intel_linux";
        arch = (isMac) ? "arm" : "x86"; bitness = "64";
    } else if (profile === 'legacy') {
        cpu = RNG.pick([4, 8]); ram = RNG.pick([8, 16]);
        gpuKey = "intel_desktop";
        arch = "x86"; bitness = "64";
    } else {
        cpu = 8; ram = RNG.pick([6, 8, 12]);
        gpuKey = "adreno_mobile";
        arch = "arm"; bitness = "64";
    }

    let platform = "Win32";
    let chPlatform = "Windows";
    platformVersion = "15.0.0";
    model = "";

    if (isMac) {
        platform = "MacIntel";
        chPlatform = "macOS";
        platformVersion = "14.0.0";
        model = "Macintosh";
    } else if (isAndroid) {
        platform = "Linux armv8l";
        chPlatform = "Android";
        platformVersion = "13.0.0";
        model = RNG.pick(["SM-S918B", "Pixel 8", "2304FPN6DC", "SM-A546B"]); 
    } else if (isLinux) {
        platform = "Linux x86_64";
        chPlatform = "Linux";
        platformVersion = "6.5.0";
    }

    const brands = [
      { brand: "Not_A Brand", version: "8" },
      { brand: "Chromium", version: chromeVer },
      { brand: "Google Chrome", version: chromeVer }
    ];

    const GPU_PROFILES = {
      "nvidia_desktop": { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', topo: 'unified', tex: 16384 },
      "amd_desktop": { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', topo: 'unified', tex: 16384 },
      "intel_desktop": { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)', topo: 'unified', tex: 8192 },
      "apple_m": { v: 'Apple', r: 'Apple M1', topo: 'unified', tex: 16384 },
      "intel_linux": { v: 'Intel Open Source Technology Center', r: 'Mesa DRI Intel(R) HD Graphics 620 (Kaby Lake GT2)', topo: 'unified', tex: 16384 },
      "adreno_mobile": { v: 'Qualcomm', r: 'Adreno (TM) 740', topo: 'tiered', tex: 8192 }
    };
    const gpuProfile = GPU_PROFILES[gpuKey] || GPU_PROFILES["intel_desktop"];

    let plugins = [];
    if (!CONFIG.isIOS && !isMobile) { 
        plugins = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ];
    }

    return { 
      ua: { raw: rawUA, ver: chromeVer, platform: platform }, 
      ch: { brands, platform: chPlatform, mobile: (profile==='mobile'), arch, bitness, platformVersion, model }, 
      hw: { cpu, ram }, 
      gpu: gpuProfile, 
      locale: 'en-US', 
      plugins: plugins 
    };
  })();

  const ErrorHandler = { logs: [], clear: function(){this.logs=[];} };

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
      try { Object.defineProperty(o, p, newDesc); } catch(e){}
    }
  };

  // ---------------- Helpers ----------------
  const Noise = {
    spatial01: function(x, y, salt) {
      let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 1442695041 + (RNG.s | 0);
      h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
      return h / 4294967296;
    },
    rand: function(i) { let x = ((RNG.s + (i|0)) | 0) >>> 0; x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/4294967296; },
    pixel: function(d, w, h) {
      // [Perf Fix] Skip noise if canvas is too large (likely not a fingerprint)
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
            best = { c, x: c.getContext('2d', {willReadFrequently:true}), u: false, t: Date.now() };
            pool.push(best);
          } else {
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

  // ---------------- Modules ----------------
  const Modules = {
    hardware: function(win) {
      try {
        const N = win.navigator;
        try { Object.defineProperty(N, 'hardwareConcurrency', { get: () => Persona.hw.cpu, configurable: true }); } catch(e) {}
        try { Object.defineProperty(N, 'deviceMemory', { get: () => Persona.hw.ram, configurable: true }); } catch(e) {}
        try { Object.defineProperty(N, 'platform', { get: () => Persona.ua.platform, configurable: true }); } catch(e) {}
        try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}

        if ('getBattery' in N) {
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
          N.getBattery = function() { if(!cached) cached = makeBattery(); return Promise.resolve(cached); };
          win._FP_BATTERY_DRAIN = () => { if(cached && cached._drain) cached._drain(); };
        }
        
        if (!CONFIG.isIOS && !Persona.ch.mobile) {
           const pList = Persona.plugins;
           const targetObj = {};
           
           pList.forEach((p, i) => {
               Object.defineProperty(targetObj, i, { value: p, enumerable: true, writable: false, configurable: true });
           });
           
           pList.forEach((p) => {
               Object.defineProperty(targetObj, p.name, { value: p, enumerable: false, writable: false, configurable: true });
           });

           Object.defineProperty(targetObj, 'length', { value: pList.length, enumerable: false, writable: false, configurable: false });

           Object.defineProperties(targetObj, {
             item: { value: i => pList[i] || null, enumerable: false, writable: false, configurable: true },
             namedItem: { value: n => pList.find(p=>p.name===n) || null, enumerable: false, writable: false, configurable: true },
             refresh: { value: () => {}, enumerable: false, writable: false, configurable: true }
           });
           
           if (typeof Symbol !== 'undefined' && Symbol.iterator) {
               Object.defineProperty(targetObj, Symbol.iterator, { 
                   value: function* () { for(let p of pList) yield p; }, 
                   enumerable: false, writable: false, configurable: true 
               });
           }

           if (win.PluginArray) Object.setPrototypeOf(targetObj, win.PluginArray.prototype);

           const fakePlugins = new Proxy(targetObj, {
               get(t, p, r) {
                   if (typeof p === 'symbol') return Reflect.get(t, p, r);
                   if (p === 'length') return t.length; 
                   return Reflect.get(t, p, r);
               },
               getOwnPropertyDescriptor(t, p) {
                   if (typeof p === 'symbol') return Reflect.getOwnPropertyDescriptor(t, p);
                   return Reflect.getOwnPropertyDescriptor(t, p);
               }
           });
           try { Object.defineProperty(N, 'plugins', { get: () => fakePlugins, configurable: true }); } catch(e) {}
        }
      } catch(e) {}
    },

    clientHints: function(win) {
      try {
        if (!win.navigator.userAgentData) return;
        const fake = {
          brands: Persona.ch.brands, mobile: Persona.ch.mobile, platform: Persona.ch.platform,
          getHighEntropyValues: (h) => Promise.resolve({
             architecture: Persona.ch.arch, bitness: Persona.ch.bitness, 
             platformVersion: Persona.ch.platformVersion, uaFullVersion: Persona.ua.ver + '.0.0.0',
             model: Persona.ch.model, wow64: false
          }),
          toJSON: function() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; }
        };
        Object.defineProperty(win.navigator, 'userAgentData', { get: () => fake, configurable: true });
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
           if (p.topo === 'tiered') {
               if (st === 35633 && pt === 36336) return { rangeMin: 127, rangeMax: 127, precision: 23 };
           }
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

    timezone: function(win) {},

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
           const nw = r.width * f;
           const nh = r.height * f;
           const desc = {
               x: { value: r.x, enumerable: true },
               y: { value: r.y, enumerable: true },
               width: { value: nw, enumerable: true },
               height: { value: nh, enumerable: true },
               top: { value: r.top, enumerable: true },
               left: { value: r.left, enumerable: true },
               right: { value: r.left + nw, enumerable: true },
               bottom: { value: r.top + nh, enumerable: true },
               toJSON: { value: function(){return this;}, enumerable: false }
           };
           if (win.DOMRectReadOnly) {
               const obj = Object.create(win.DOMRectReadOnly.prototype);
               Object.defineProperties(obj, desc); 
               return obj;
           }
           const obj = Object.create(Object.prototype);
           Object.defineProperties(obj, desc);
           return obj;
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
            for (let i=0; i<d.length; i+=step*4) {
               if (RNG.next() < 0.01) d[i] = d[i] ^ 1; 
            }
         };
         
         // [Stability Fix] Offscreen Patch with Context Check
         if (win.OffscreenCanvas) {
             ProxyGuard.override(win.OffscreenCanvas.prototype, 'convertToBlob', (orig) => function() {
                 try {
                     // Check if noise should be applied (size limit)
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
               if (w < CONFIG.canvasMinSize) return r;
               noise(r.data);
               return r;
            });
         });

         if (win.HTMLCanvasElement) {
            ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() {
               const w=this.width, h=this.height;
               if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments);
               // Heuristic check
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

  // ---------------- Injection ----------------
  const inject = function(win) {
    if (!win) return;
    Modules.hardware(win);
    Modules.clientHints(win);
    Modules.webgl(win);
    Modules.timezone(win);
    Modules.audio(win);
    Modules.rects(win);
    Modules.canvas(win);
    
    let timer = setInterval(() => { if (win._FP_BATTERY_DRAIN) win._FP_BATTERY_DRAIN(); }, CONFIG.cleanupInterval);
    if (win[MARKER]) win[MARKER].cleanup = () => { if (timer) clearInterval(timer); };

    win.addEventListener('pagehide', (e) => {
        if(timer) clearInterval(timer);
        if (!e.persisted) UI.cleanup();
    });
    win.addEventListener('pageshow', (e) => {
        if (e.persisted) timer = setInterval(() => { if (win._FP_BATTERY_DRAIN) win._FP_BATTERY_DRAIN(); }, CONFIG.cleanupInterval);
    });
  };

  const init = function() {
    inject(window);
    UI.showBadge();
    const hookHistory = function() {
       if(!window.history) return;
       const wrap = function(name) {
         const orig = history[name];
         if (typeof orig !== 'function') return;
         return function() {
           const res = orig.apply(this, arguments);
           UI.showBadge();
           return res;
         };
       };
       if(history.pushState) history.pushState = wrap('pushState');
       if(history.replaceState) history.replaceState = wrap('replaceState');
       window.addEventListener('popstate', () => UI.showBadge());
    };
    hookHistory();
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
       try { if (n.tagName === 'IFRAME' && n.contentWindow) n.addEventListener('load', () => inject(n.contentWindow)); } catch(e){}
    }))).observe(document, {childList:true, subtree:true});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
</script>
`;

  if (REGEX.HEAD_TAG.test(body)) body = body.replace(REGEX.HEAD_TAG, (m) => m + injection);
  else if (REGEX.HTML_TAG.test(body)) body = body.replace(REGEX.HTML_TAG, (m) => m + injection);
  else body = injection + body;

  $done({ body: body, headers: headers });
})();
