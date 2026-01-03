/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.60-Heavy-Duty (Full Logic Restoration & Modern Architecture)
 * @description [重裝上陣版] 融合 V2.81 的完整防護邏輯與 V4.50 的先進通訊架構。
 * ----------------------------------------------------------------------------
 * 1. [Restoration] 恢復 ProxyGuard 完整封裝、Persona 硬體分級、CanvasPool 資源池。
 * 2. [Exclusion] 採用 V4.50 的正則排除機制，確保 LINE 通訊 100% 穩定。
 * 3. [Identity] 防護模式: macOS Chrome 124 (High-Tier) / 購物模式: iPhone iOS 17.5。
 * ----------------------------------------------------------------------------
 * @note 必須配合 Surge Module 配置中的正則表達式 pattern 使用。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. Surge 腳本配置 (與 V2.81 保持一致的參數結構)
  // ============================================================================
  const CONST = {
    MAX_SIZE: 5000000,
    KEY_SEED: "FP_SHIELD_MAC_V460", 
    KEY_EXPIRY: "FP_SHIELD_EXP_V460",
    INJECT_MARKER: "__FP_SHIELD_V460__",
    
    BASE_ROTATION_MS: 24 * 60 * 60 * 1000,
    JITTER_RANGE_MS: 4 * 60 * 60 * 1000,
    INTERFERENCE_LEVEL: 1,
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

  // ============================================================================
  // 1. 最高權限：防誤殺邏輯 (LINE 專用防線 - 繼承 V4.50)
  // ============================================================================
  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  const LINE_IDENTIFIERS = ["line.me", "line-apps", "line-scdn", "line-static", "legy"];
  if (LINE_IDENTIFIERS.some(id => currentUrl.toLowerCase().includes(id))) {
    $done({});
    return;
  }

  // ============================================================================
  // 2. 全域配置與模式偵測
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection";

  // 掃描 Surge 所有策略組決策狀態
  try {
    if (typeof $surge !== 'undefined' && $surge.selectGroupDetails) {
      const decisions = $surge.selectGroupDetails().decisions;
      for (let key in decisions) {
        const val = decisions[key];
        if (/[Ss]hopping|購物|🛍️|Bypass/.test(val)) {
          mode = "shopping";
          break;
        }
      }
    }
  } catch (e) {}

  if (typeof $argument === "string" && $argument.includes("mode=shopping")) mode = "shopping";
  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (網路層 - 強制洗牌)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // 清除既有標頭
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      headers['User-Agent'] = UA_IPHONE;
    } else {
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"';
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (瀏覽器層 - 完整注入)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    const cType = (headers['Content-Type'] || headers['content-type'] || "").toLowerCase();

    // 基礎過濾
    if ([204, 206, 301, 302, 304].includes($response.status)) { $done({}); return; }
    if (!body || (cType && !cType.includes("html"))) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    // ------------------------------------------------------------------------
    // [Core Injection] 瀏覽器內部執行的完整代碼 (恢復 V2.81 邏輯)
    // ------------------------------------------------------------------------
    const injection = `
    <!-- ${CONST.INJECT_MARKER} -->
    <div id="fp-v4-badge" style="position:fixed!important;bottom:15px!important;left:15px!important;z-index:2147483647!important;background:${badgeColor}!important;color:#fff!important;padding:7px 14px!important;border-radius:10px!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important;font-size:12px!important;font-weight:bold!important;pointer-events:none!important;box-shadow:0 6px 15px rgba(0,0,0,0.4)!important;transition:opacity 1s!important;opacity:1!important;">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const MARKER = '${CONST.INJECT_MARKER}';
      try { if (window[MARKER]) return; Object.defineProperty(window, MARKER, { value: true, configurable: true, writable: true }); } catch(e) {}

      const b = document.getElementById('fp-v4-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 1000); } }, 4500);
      
      // [購物模式檢查] 若開啟，立即終止所有 JS 混淆
      if (${IS_SHOPPING}) return;

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

      // ---------------- Seed & RNG (V2.81 邏輯) ----------------
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

      // ---------------- Persona (V2.81 完整邏輯：硬體分級) ----------------
      const Persona = (function() {
        // Mac Hardware Tiers
        const HW_TIERS = {
            ENTRY: { 
                cpu: 8, 
                ram: 8,
                gpuPool: [{v: 'Apple', r: 'Apple M1', w: 100}]
            },
            MID: { 
                cpuPool: [8, 10],
                ramPool: [16, 24],
                gpuPool: [{v: 'Apple', r: 'Apple M2', w: 60}, {v: 'Apple', r: 'Apple M2 Pro', w: 40}]
            },
            HIGH: { 
                cpuPool: [12, 16],
                ramPool: [32, 64, 96],
                gpuPool: [{v: 'Apple', r: 'Apple M3 Max', w: 60}, {v: 'Apple', r: 'Apple M3 Ultra', w: 40}]
            }
        };

        const r = RNG.next();
        let tier = HW_TIERS.MID;
        if (r < 0.3) tier = HW_TIERS.ENTRY;
        else if (r > 0.8) tier = HW_TIERS.HIGH;

        const cpu = tier.cpu || RNG.pick(tier.cpuPool);
        const ram = tier.ram || RNG.pick(tier.ramPool);
        const gpu = RNG.pickWeighted(tier.gpuPool);
        gpu.topo = 'unified'; 
        gpu.tex = 16384; 

        return { 
            platform: 'MacIntel',
            hw: { cpu, ram },
            gpu: gpu,
            userAgent: "${UA_MAC}"
        };
      })();

      // ---------------- ProxyGuard (V2.81 完整版：深度封裝) ----------------
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
          safeDefine(o, p, newDesc);
        }
      };

      // ---------------- CanvasPool (V2.81 完整版) ----------------
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

      // ---------------- Noise (V2.81 完整版) ----------------
      const Noise = {
        spatial01: function(x, y, salt) {
          let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 1442695041 + (RNG.s | 0);
          h = (h ^ (h >>> 13)) >>> 0; h = (h * 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
          return h / 4294967296;
        },
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
           for(let i=0; i<d.length; i+=100) d[i] += ((RNG.next() * 2 - 1) * lvl); 
        }
      };

      // ---------------- Modules (注入執行) ----------------
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
          spoofProp(N, 'platform', Persona.platform); 
          spoofProp(N, 'userAgent', Persona.userAgent);
          spoofProp(N, 'appVersion', Persona.userAgent.replace('Mozilla/', ''));

          try { if ('webdriver' in N) delete N.webdriver; } catch(e) {}
        },

        webgl: function(win) {
          try {
            const p = Persona.gpu;
            [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(ctx => {
              if (!ctx || !ctx.prototype) return;
              ProxyGuard.override(ctx.prototype, 'getParameter', (orig) => function(param) {
                 if (param === 37445) return p.v;
                 if (param === 37446) return p.r;
                 return orig.apply(this, arguments);
              });
            });
          } catch(e) {}
        },

        canvas: function(win) {
           try {
             if (win.HTMLCanvasElement) {
                ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', (orig) => function() {
                   const w=this.width, h=this.height;
                   if (w < CONFIG.canvasMinSize) return orig.apply(this, arguments);
                   if ((w*h) > CONFIG.canvasMaxNoiseArea) return orig.apply(this, arguments);

                   let p=null;
                   try {
                      p = CanvasPool.get(w, h);
                      p.ctx.clearRect(0,0,w,h); p.ctx.drawImage(this,0,0);
                      const d = p.ctx.getImageData(0,0,w,h); Noise.pixel(d.data, w, h); p.ctx.putImageData(d,0,0);
                      return p.canvas.toDataURL.apply(p.canvas, arguments);
                   } catch(e) { return orig.apply(this, arguments); }
                   finally { if(p) p.release(); }
                });
             }
             if (win.CanvasRenderingContext2D) {
                ProxyGuard.override(win.CanvasRenderingContext2D.prototype, 'getImageData', (orig) => function(x,y,w,h) {
                   const r = orig.apply(this, arguments);
                   if (w < CONFIG.canvasMinSize) return r;
                   Noise.pixel(r.data, w, h);
                   return r;
                });
             }
           } catch(e) {}
        },
        
        audio: function(win) {
          try {
            if(win.AnalyserNode) ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', (orig)=>function(a){ 
                const r=orig.apply(this,arguments); 
                Noise.audio(a); 
                return r; 
            });
          } catch(e){}
        }
      };

      const inject = function(win) {
        if (!win) return;
        Modules.hardware(win);
        Modules.webgl(win);
        Modules.canvas(win);
        Modules.audio(win);
        
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
  
    })();
    </script>
    `;

    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    Object.keys(headers).forEach(k => {
      if (k.toLowerCase().includes('content-security-policy')) delete headers[k];
    });
    
    $done({ body, headers });
  }
})();


