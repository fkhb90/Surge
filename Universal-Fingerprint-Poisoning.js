/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   2.21g-opt7 (Stability + Anti-Tamper Refinement)
 * @description 基於 v2.21g-opt6；重點優化：
 * 1) [Inject] 防重複注入：偵測既有標記避免 SPA/二次 rewrite 重複插入
 * 2) [Headers] CSP 移除更穩健：以「實際 header key」迭代刪除，避免大小寫漏網
 * 3) [WebGL] 參數快取回傳一致：TypedArray / Array 統一回傳新實例，避免引用檢測與副作用
 * 4) [Proxy] 陷阱補強：補上 ownKeys/has 等，降低 Proxy 可被偵測面
 * 5) [Intl/Date] options 不汙染：clone options，避免呼叫端重用物件造成可觀測差異
 *
 * @note Surge/Quantumult X 類 rewrite（依原腳本使用 $request/$response/$done）。
 * @source    v2.21g-opt6：:contentReference[oaicite:0]{index=0}（版本/常數區） :contentReference[oaicite:1]{index=1}（Proxy trap） :contentReference[oaicite:2]{index=2}（WebGL getParameter）
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全局設定
  // ============================================================================
  const CONST = {
    MAX_SIZE: 5000000,
    KEY_SEED: "FP_SHIELD_SEED_V2",
    MAX_POOL_SIZE: 3,
    MAX_POOL_DIM: 1024 * 1024,
    MAX_ERROR_LOGS: 50,
    CSP_CHECK_LENGTH: 3000,
    FAKE_CORES: 4,
    FAKE_MEMORY: 8,
    RECT_NOISE_RATE: 0.0001,
    CANVAS_MIN_SIZE: 16,
    NOISE_DENSITY_IOS: 3.0,
    NOISE_DENSITY_DEFAULT: 1.0,
    IDLE_TIMEOUT: 1000,
    WORKER_INJECT_DELAY: 50,
    IFRAME_BATCH_SIZE: 5,
    CACHE_CLEANUP_INTERVAL: 60000,
    ERROR_THROTTLE_MS: 1000,
    BADGE_FADE_WHITELIST: 2000,
    BADGE_FADE_NORMAL: 4000,
    FONT_CACHE_SIZE: 100,
    WEBGL_PARAM_CACHE_SIZE: 40,
    TOBLOB_RELEASE_FALLBACK_MS: 3000,
    WORKER_REVOKE_DELAY_MS: 4000,
    CANVAS_MAX_PIXELS_NOISE: 1920 * 1080,
    CANVAS_NOISE_BASE_STEP: 1,
    CANVAS_NOISE_BIG_STEP: 2,
    CANVAS_NOISE_HUGE_STEP: 4,
    WEBGL_TA_CACHE_SIZE: 16,
    INJECT_MARKER: "__FP_SHIELD_V221G__"
  };

  const REGEX = {
    CONTENT_TYPE_HTML: /text\/html/i,
    CONTENT_TYPE_JSONLIKE: /(application\/json|application\/(ld\+json|problem\+json)|text\/json|application\/javascript|text\/javascript)/i,
    HEAD_TAG: /<head[^>]*>/i,
    HTML_TAG: /<html[^>]*>/i,
    META_CSP: /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
    APP_BROWSERS: /line\/|fb_iab|micromessenger|worksmobile|naver|github|shopee|seamoney/i,
    JSON_START: /^\s*[\{\[]/,
  };

  const $res = $response;
  const $req = $request;

  // ============================================================================
  // 1. 基礎過濾
  // ============================================================================
  if (
    $res.status === 206 ||
    $res.status === 204 ||
    $res.status === 304 ||
    $res.status === 301 ||
    $res.status === 302
  ) {
    $done({});
    return;
  }

  const headers = $res.headers || {};
  const normalizedHeaders = Object.keys(headers).reduce((acc, key) => {
    acc[String(key).toLowerCase()] = headers[key];
    return acc;
  }, {});

  const upgrade = normalizedHeaders["upgrade"];
  const connection = normalizedHeaders["connection"];
  if (upgrade === "websocket" || (connection && String(connection).toLowerCase().includes("upgrade"))) {
    $done({});
    return;
  }

  const contentLength = parseInt(normalizedHeaders["content-length"] || "0", 10);
  if (contentLength > CONST.MAX_SIZE) {
    $done({});
    return;
  }

  const cType = normalizedHeaders["content-type"] || "";
  // 只處理 HTML；並排除 JSON/JS（有些站會誤回 text/html，但 body 其實是 JSON）
  if (cType) {
    if (REGEX.CONTENT_TYPE_JSONLIKE.test(cType)) { $done({}); return; }
    if (!REGEX.CONTENT_TYPE_HTML.test(cType)) { $done({}); return; }
  }

  // ============================================================================
  // 2. 白名單管理
  // ============================================================================
  const WhitelistManager = (() => {
    const DEFAULT_WHITELIST = {
      version: "3.9",
      exact: [
        "chatgpt.com", "claude.ai", "gemini.google.com", "perplexity.ai", "www.perplexity.ai",
        "accounts.google.com", "appleid.apple.com", "login.microsoftonline.com", "github.com",
        "api.line.me", "api.discord.com", "nowsecure.nl", "webglreport.com", "google.com",
        "youtube.com", "facebook.com", "instagram.com", "netflix.com",
        "spotify.com", "cdn.ghostery.com", "browserleaks.com",
        "amiunique.org", "coveryourtracks.eff.org",
      ],
      patterns: [
        { suffix: "gov.tw", priority: 1 }, { suffix: "org.tw", priority: 1 }, { suffix: "edu.tw", priority: 1 },
        { suffix: "apple.com", priority: 1 }, { suffix: "microsoft.com", priority: 1 }, { suffix: "aws.amazon.com", priority: 1 },
        { suffix: "bank", priority: 2 }, { suffix: "pay.taipei", priority: 2 }, { suffix: "bot.com.tw", priority: 2 },
        { suffix: "cathaybk.com.tw", priority: 2 }, { suffix: "ctbcbank.com", priority: 2 }, { suffix: "esunbank.com.tw", priority: 2 },
        { suffix: "fubon.com", priority: 2 }, { suffix: "richart.tw", priority: 2 }, { suffix: "taishinbank.com.tw", priority: 2 },
        { suffix: "jkos.com", priority: 2 }, { suffix: "ecpay.com.tw", priority: 2 }, { suffix: "shopee.tw", priority: 3 },
        { suffix: "shopee.com", priority: 3 },
      ],
    };

    const exactSet = new Set(DEFAULT_WHITELIST.exact);
    const patternsSorted = DEFAULT_WHITELIST.patterns.slice().sort((a, b) => a.priority - b.priority);
    const cache = new Map();
    const MAX_CACHE_SIZE = 200;
    const normalizeHost = (h) => String(h || "").toLowerCase().trim();

    return {
      check: (hostname) => {
        const host = normalizeHost(hostname);
        if (!host) return false;

        if (cache.has(host)) {
          const entry = cache.get(host);
          cache.delete(host);
          cache.set(host, entry);
          return entry;
        }

        let result = false;
        if (exactSet.has(host)) {
          result = true;
        } else {
          for (let i = 0; i < patternsSorted.length; i++) {
            const sfx = patternsSorted[i].suffix;
            if (host.endsWith(sfx)) {
              if (sfx.includes(".")) { result = true; break; }
              const idx = host.length - sfx.length - 1;
              if (idx >= 0 && host[idx] === ".") { result = true; break; }
            }
          }
        }

        if (cache.size >= MAX_CACHE_SIZE) cache.delete(cache.keys().next().value);
        cache.set(host, result);
        return result;
      },
    };
  })();

  const uaRaw = $req.headers["User-Agent"] || $req.headers["user-agent"];
  const currentUA = (uaRaw || "").toLowerCase();
  if (!currentUA || REGEX.APP_BROWSERS.test(currentUA)) { $done({}); return; }

  let hostname = "";
  try { hostname = new URL($req.url).hostname.toLowerCase(); } catch (e) { $done({}); return; }

  const isWhitelisted = WhitelistManager.check(hostname);

  let body = $res.body;
  if (!body) { $done({}); return; }

  // 額外保護：部分站點 content-type 會是 text/html 但實際 body 是 JSON
  const startChars = body.substring(0, 80).trim();
  if (REGEX.JSON_START.test(startChars)) { $done({}); return; }

  // 防重複注入：避免同頁多次 rewrite 或 SPA 回傳已注入版本
  if (body.includes(CONST.INJECT_MARKER) || body.includes("window.__FP_METRICS__")) {
    $done({ body, headers });
    return;
  }

  // ============================================================================
  // 3. CSP 移除（更穩健：以實際 key 迭代刪除）
  // ============================================================================
  const cspHeaderNamesLower = new Set([
    "content-security-policy",
    "content-security-policy-report-only",
    "x-content-security-policy",
    "x-webkit-csp"
  ]);

  for (const k of Object.keys(headers)) {
    const lk = String(k).toLowerCase();
    if (cspHeaderNamesLower.has(lk)) delete headers[k];
  }

  const headChunk = body.substring(0, CONST.CSP_CHECK_LENGTH);
  if (REGEX.META_CSP.test(headChunk)) {
    const newHead = headChunk.replace(REGEX.META_CSP, "");
    body = newHead + body.substring(CONST.CSP_CHECK_LENGTH);
  }

  // ============================================================================
  // 4. 注入腳本 (2.21g-opt7)
  // ============================================================================
  const injection = `
<script>
(function() {
  "use strict";

  // Marker for anti double-inject
  try { Object.defineProperty(window, '${CONST.INJECT_MARKER}', { value: 1, configurable: false }); } catch(e) {}

  const CONFIG = {
    ver: '2.21g-opt7',
    isWhitelisted: ${isWhitelisted},
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    maxErrorLogs: ${CONST.MAX_ERROR_LOGS},
    fakeCores: ${CONST.FAKE_CORES},
    fakeMemory: ${CONST.FAKE_MEMORY},
    rectNoiseRate: ${CONST.RECT_NOISE_RATE},
    maxPoolDim: ${CONST.MAX_POOL_DIM},
    canvasMinSize: ${CONST.CANVAS_MIN_SIZE},
    errorThrottleMs: ${CONST.ERROR_THROTTLE_MS},
    fontCacheSize: ${CONST.FONT_CACHE_SIZE},
    webglCacheSize: ${CONST.WEBGL_PARAM_CACHE_SIZE},
    toBlobReleaseFallbackMs: ${CONST.TOBLOB_RELEASE_FALLBACK_MS},
    workerRevokeDelayMs: ${CONST.WORKER_REVOKE_DELAY_MS},
    canvasMaxPixelsNoise: ${CONST.CANVAS_MAX_PIXELS_NOISE},
    canvasNoiseBaseStep: ${CONST.CANVAS_NOISE_BASE_STEP},
    canvasNoiseBigStep: ${CONST.CANVAS_NOISE_BIG_STEP},
    canvasNoiseHugeStep: ${CONST.CANVAS_NOISE_HUGE_STEP},
    webglTaCacheSize: ${CONST.WEBGL_TA_CACHE_SIZE}
  };

  const SAFE_FONTS = new Map([
    ['arial', true], ['helvetica', true], ['times new roman', true], ['times', true],
    ['courier new', true], ['courier', true], ['verdana', true], ['georgia', true],
    ['palatino', true], ['garamond', true], ['bookman', true], ['comic sans ms', true],
    ['trebuchet ms', true], ['arial black', true], ['impact', true], ['roboto', true],
    ['open sans', true], ['lato', true], ['montserrat', true], ['noto sans', true],
    ['source sans pro', true], ['pingfang tc', true], ['microsoft jhenghei', true],
    ['segoe ui', true], ['san francisco', true], ['system-ui', true], ['-apple-system', true],
    ['sans-serif', true], ['serif', true], ['monospace', true]
  ]);

  // ---------------- ErrorHandler ----------------
  const ErrorHandler = {
    logs: [], throttle: new Map(), lastCleanup: Date.now(),
    capture: function(ctx, err) {
      try {
        const now = Date.now();
        const msg = (err && err.message) ? String(err.message) : String(err);
        const key = ctx + msg.substring(0, 50);

        if (now - this.lastCleanup > 10000) {
          const cutoff = now - 5000;
          const toDelete = [];
          for (const [k, v] of this.throttle.entries()) { if (v < cutoff) toDelete.push(k); }
          for (let i = 0; i < toDelete.length; i++) this.throttle.delete(toDelete[i]);
          this.lastCleanup = now;
        }

        const last = this.throttle.get(key);
        if (last && now - last < CONFIG.errorThrottleMs) return;
        this.throttle.set(key, now);

        if (this.logs.length >= CONFIG.maxErrorLogs) this.logs.shift();
        this.logs.push({ t: now, c: ctx, m: msg.substring(0, 120) });
      } catch(e) {}
    },
    getLogs: function() { return this.logs; },
    getStats: function() {
      const stats = {};
      for (let i = 0; i < this.logs.length; i++) {
        const c = this.logs[i].c;
        stats[c] = (stats[c] || 0) + 1;
      }
      return stats;
    },
    clear: function() { this.logs.length = 0; this.throttle.clear(); }
  };

  // ---------------- UI Badge ----------------
  const UI = {
    badgeShown: false, badgeElement: null,
    showBadge: function() {
      try {
        if (this.badgeShown) return;
        this.badgeShown = true;

        const id = 'fp-shield-badge';
        if (document.getElementById(id)) return;

        const b = document.createElement('div');
        b.id = id;

        const color = CONFIG.isWhitelisted ? 'rgba(100,100,100,0.85)' : 'rgba(0,120,0,0.9)';
        const text = CONFIG.isWhitelisted ? 'FP Bypass' : 'FP Active';

        b.style.cssText =
          'position:fixed;bottom:10px;left:10px;z-index:2147483647;' +
          'background:' + color + ';color:white;padding:8px 14px;border-radius:8px;' +
          'font-size:12px;font-family:system-ui,-apple-system,sans-serif;' +
          'box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;opacity:0;' +
          'transition:opacity 0.4s ease-in-out;display:flex;align-items:center;font-weight:500;';

        b.textContent = text;
        (document.body || document.documentElement).appendChild(b);
        this.badgeElement = b;

        requestAnimationFrame(() => requestAnimationFrame(() => { b.style.opacity = '1'; }));

        const timeout = CONFIG.isWhitelisted ? ${CONST.BADGE_FADE_WHITELIST} : ${CONST.BADGE_FADE_NORMAL};
        setTimeout(() => {
          b.style.opacity = '0';
          setTimeout(() => { try { if (b && b.parentNode) b.remove(); } catch(e) {} this.badgeElement = null; }, 400);
        }, timeout);
      } catch(e) {}
    },
    cleanup: function() { try { if (this.badgeElement && this.badgeElement.parentNode) this.badgeElement.remove(); } catch(e) {} this.badgeElement = null; }
  };

  const hookHistory = function() {
    try {
      if (!window.history) return;
      const wrap = function(t) {
        const o = history[t];
        if (typeof o !== 'function') return;
        return function() { const r = o.apply(this, arguments); UI.showBadge(); return r; };
      };
      if (history.pushState) history.pushState = wrap('pushState') || history.pushState;
      if (history.replaceState) history.replaceState = wrap('replaceState') || history.replaceState;
      window.addEventListener('popstate', () => UI.showBadge(), { passive: true });
    } catch(e) {}
  };

  if (CONFIG.isWhitelisted) {
    const run = function() { UI.showBadge(); hookHistory(); };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', run, { once: true }); } else { run(); }
    return;
  }

  // ---------------- Seed ----------------
  const Seed = (function() {
    const KEY = '${CONST.KEY_SEED}';
    let store;
    try { store = sessionStorage; store.setItem('__test__', '1'); store.removeItem('__test__'); }
    catch(e) {
      if (!window.__FP_STORAGE__) window.__FP_STORAGE__ = {};
      store = { getItem: k => window.__FP_STORAGE__[k], setItem: (k, v) => { window.__FP_STORAGE__[k] = v; } };
    }
    let val = store.getItem(KEY);
    if (!val) {
      const entropy = [
        Math.random() * 1e9, Date.now(), performance.now() * 1000,
        (navigator.hardwareConcurrency || 4) * 1000, screen.width * screen.height,
        (navigator.plugins ? navigator.plugins.length : 0) * 100,
        window.innerWidth * window.innerHeight, document.referrer.length * 10
      ].reduce((a, b) => (a ^ Math.floor(b)) >>> 0, 0);
      val = ((entropy >>> 0) + Math.floor(Math.random() * 1e6)).toString();
      try { store.setItem(KEY, val); } catch(e) {}
    }
    return (parseInt(val, 10) >>> 0) || 1;
  })();

  // ---------------- Noise ----------------
  const Noise = (function() {
    const seed = Seed;
    const densityMod = CONFIG.isIOS ? ${CONST.NOISE_DENSITY_IOS} : ${CONST.NOISE_DENSITY_DEFAULT};
    let s0 = ((seed * 9301 + 49297) | 0) >>> 0;
    if (s0 === 0) s0 = 1;

    const rand = function(i) {
      let x = ((s0 + (i|0)) | 0) >>> 0;
      if (x === 0) x = 1;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };

    const spatial01 = function(x, y, salt) {
      let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (salt | 0) * 1442695041 + (seed | 0);
      h = (h ^ (h >>> 13)) >>> 0;
      h = (h * 1274126177) >>> 0;
      h = (h ^ (h >>> 16)) >>> 0;
      return h / 4294967296;
    };

    const getSmartGPUPool = function() {
      const ua = navigator.userAgent || '';
      const platform = navigator.platform || '';
      const isWin = /Win/i.test(platform);
      const isMac = /Mac/i.test(platform);
      const isLinux = /Linux/i.test(platform);
      const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);

      const pools = {
        winChrome: [
          { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)', p: { mt: 16384, alw: [1, 1] } },
          { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)', p: { mt: 32768, alw: [1, 1] } },
          { v: 'Google Inc. (AMD)',    r: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',                 p: { mt: 16384, alw: [1, 1] } }
        ],
        winOther: [
          { v: 'NVIDIA Corporation', r: 'NVIDIA GeForce GTX 1650/PCIe/SSE2', p: { mt: 16384, alw: [1, 10] } },
          { v: 'AMD',                r: 'AMD Radeon RX 580',                  p: { mt: 16384, alw: [1, 8] } }
        ],
        mac: [
          { v: 'Apple', r: 'Apple M1',  p: { mt: 16384, alw: [1, 1] } },
          { v: 'Apple', r: 'Apple M2',  p: { mt: 16384, alw: [1, 1] } },
          { v: 'Apple', r: 'Apple M3',  p: { mt: 16384, alw: [1, 1] } },
          { v: 'Apple', r: 'Apple GPU', p: { mt: 16384, alw: [1, 1] } }
        ],
        linux: [
          { v: 'Intel Open Source Technology Center', r: 'Mesa DRI Intel(R) HD Graphics 620 (Kaby Lake GT2)', p: { mt: 8192,  alw: [1, 1] } },
          { v: 'X.Org',                               r: 'AMD Radeon RX 580 Series (polaris10, LLVM 15.0.0, DRM 3.49, 6.1.0)', p: { mt: 16384, alw: [1, 1] } },
          { v: 'Nouveau',                             r: 'NV167',                                             p: { mt: 8192,  alw: [1, 1] } }
        ]
      };

      if (isWin) return isChrome ? pools.winChrome : pools.winOther;
      if (isMac) return pools.mac;
      if (isLinux) return pools.linux;
      return pools.winChrome;
    };

    const gpuPool = getSmartGPUPool();
    const selectedGpu = gpuPool[Math.floor(rand(42) * gpuPool.length) % gpuPool.length];

    const timezones = [
      { zone: 'America/New_York',      offset: 300,  name: 'Eastern Standard Time',        abbr: 'EST', dst: 'EDT',  locale: 'en-US' },
      { zone: 'Europe/London',        offset: 0,    name: 'Greenwich Mean Time',         abbr: 'GMT', dst: 'BST',  locale: 'en-GB' },
      { zone: 'Asia/Tokyo',           offset: -540, name: 'Japan Standard Time',         abbr: 'JST', dst: null,   locale: 'ja-JP' },
      { zone: 'Asia/Shanghai',        offset: -480, name: 'China Standard Time',         abbr: 'CST', dst: null,   locale: 'zh-CN' },
      { zone: 'America/Los_Angeles',  offset: 480,  name: 'Pacific Standard Time',       abbr: 'PST', dst: 'PDT',  locale: 'en-US' },
      { zone: 'Europe/Paris',         offset: -60,  name: 'Central European Time',       abbr: 'CET', dst: 'CEST', locale: 'fr-FR' },
      { zone: 'Australia/Sydney',     offset: -660, name: 'Australian Eastern Time',     abbr: 'AET', dst: 'AEDT', locale: 'en-AU' }
    ];
    const selectedTz = timezones[Math.floor(rand(99) * timezones.length) % timezones.length];

    return {
      pixel: function(d, w, h) {
        const len = d.length;
        if (len < 4) return;
        if (!w || !h || w < CONFIG.canvasMinSize || h < CONFIG.canvasMinSize) return;

        const area = w * h;
        let step = CONFIG.canvasNoiseBaseStep;
        if (area > CONFIG.canvasMaxPixelsNoise * 4) step = CONFIG.canvasNoiseHugeStep;
        else if (area > CONFIG.canvasMaxPixelsNoise) step = CONFIG.canvasNoiseBigStep;

        const baseScale = 0.05;
        const scale = baseScale * densityMod * (0.85 + rand(777) * 0.3);
        const rowSaltBase = (seed ^ 0x9E3779B9) >>> 0;

        for (let y = 0; y < h; y += step) {
          const rowSalt = (rowSaltBase + (y * 2654435761)) >>> 0;
          const rowOffset = y * w;
          for (let x = 0; x < w; x += step) {
            const p = rowOffset + x;
            const i = p * 4;
            if (i + 2 >= len) continue;
            const n = spatial01(x, y, rowSalt);
            if (n < scale) {
              const delta = ((n * 1000) | 0) & 1 ? 1 : -1;
              d[i]   = Math.max(0, Math.min(255, d[i] + delta));
              d[i+1] = Math.max(0, Math.min(255, d[i+1] - delta));
              d[i+2] = Math.max(0, Math.min(255, d[i+2] + delta));
            }
          }
        }
      },

      audio: function(d) {
        const salt = (seed ^ 0xA53A9B1D) >>> 0;
        for (let i = 0; i < d.length; i += 50) {
          const v = d[i];
          const sat = v + (v * v * v * 0.0001);
          const r = rand((i ^ salt) | 0);
          const noise = (r * 2e-5 - 1e-5);
          d[i] = sat + noise;
        }
      },

      font: function(w) { return w + (rand(Math.floor(w * 100)) * 0.04 - 0.02); },

      // opt6 延續：忽略 sub-pixel 變化以降低抖動；opt7 保持
      rect: function(v) {
        if (v === 0) return 0;
        return v * (1 + (rand(Math.floor(v)) * CONFIG.rectNoiseRate - CONFIG.rectNoiseRate / 2));
      },

      int: function(base, variance) { return base + Math.floor(rand(base) * variance * 2 - variance); },
      getGPU: function() { return selectedGpu; },
      getTimezone: function() { return selectedTz; },
      rand: rand
    };
  })();

  // ---------------- CanvasPool ----------------
  const CanvasPool = (function() {
    const pool = [];
    const MAX = ${CONST.MAX_POOL_SIZE};
    let lastCleanup = Date.now();

    return {
      get: function(w, h) {
        const now = Date.now();
        if (now - lastCleanup > ${CONST.CACHE_CLEANUP_INTERVAL}) {
          for (let i = pool.length - 1; i >= 0; i--) {
            if (!pool[i].u) { try { pool[i].c.width = 1; pool[i].c.height = 1; } catch(e) {} }
          }
          lastCleanup = now;
        }

        if (w * h > CONFIG.maxPoolDim) {
          const c = document.createElement('canvas');
          const x = c.getContext('2d', { willReadFrequently: true });
          return { canvas: c, ctx: x, release: function() { try { c.width = 1; c.height = 1; } catch(e) {} } };
        }

        let item = null;
        for (let i = 0; i < pool.length; i++) {
          if (pool[i].c.width >= w && pool[i].c.height >= h && !pool[i].u) { item = pool[i]; break; }
        }
        if (!item) {
          if (pool.length < MAX) {
            const c = document.createElement('canvas');
            const x = c.getContext('2d', { willReadFrequently: true });
            item = { c: c, x: x, u: false };
            pool.push(item);
          } else {
            item = pool[0];
          }
        }

        item.u = true;
        item.c.width = w; item.c.height = h;
        return { canvas: item.c, ctx: item.x, release: function() { item.u = false; } };
      },

      cleanup: function() {
        pool.forEach(item => { try { item.c.width = 1; item.c.height = 1; } catch(e) {} });
        pool.length = 0;
      }
    };
  })();

  // ---------------- ProxyGuard ----------------
  const ProxyGuard = {
    proxyMap: new WeakMap(),
    nativeStrings: new WeakMap(),
    toStringMap: new WeakMap(),

    _makeFakeToString: function(t, ns) {
      if (this.toStringMap.has(t)) return this.toStringMap.get(t);
      const self = this;
      const fakeToString = function toString() { return self.nativeStrings.get(t) || ns; };
      try {
        Object.defineProperty(fakeToString, 'toString', {
          value: function toString() { return "function toString() { [native code] }"; },
          configurable: true
        });
      } catch(e) {}
      this.toStringMap.set(t, fakeToString);
      return fakeToString;
    },

    protect: function(native, custom) {
      try {
        if (typeof custom !== 'function' || typeof native !== 'function') return custom;
        if (this.proxyMap.has(custom)) return this.proxyMap.get(custom);

        const ns = Function.prototype.toString.call(native);
        this.nativeStrings.set(custom, ns);
        const self = this;

        const proxy = new Proxy(custom, {
          apply: function(t, th, a) {
            try { return Reflect.apply(t, th, a); }
            catch(e) {
              ErrorHandler.capture('Proxy:apply:' + (native && native.name ? native.name : 'unk'), e);
              return Reflect.apply(native, th, a);
            }
          },
          construct: function(t, a, nt) {
            try { return Reflect.construct(t, a, nt); }
            catch(e) {
              ErrorHandler.capture('Proxy:construct:' + (native && native.name ? native.name : 'unk'), e);
              return Reflect.construct(native, a, nt);
            }
          },
          get: function(t, k, r) {
            try {
              if (k === 'toString') return self._makeFakeToString(t, ns);
              if (k === 'name') return native.name;
              if (k === 'length') return native.length;
              if (k === 'prototype') return native.prototype;
              if (k === Symbol.toStringTag) return native[Symbol.toStringTag];
              if (k === Symbol.hasInstance) return native[Symbol.hasInstance];
              return Reflect.get(t, k, r);
            } catch(e) {
              ErrorHandler.capture('Proxy:get:' + String(k), e);
              return Reflect.get(t, k, r);
            }
          },
          getOwnPropertyDescriptor: function(t, k) {
            try {
              const descN = Reflect.getOwnPropertyDescriptor(native, k);
              if (descN && descN.configurable === false) return descN;
              return Reflect.getOwnPropertyDescriptor(t, k) || descN;
            } catch(e) {
              return Reflect.getOwnPropertyDescriptor(t, k);
            }
          },
          // opt7: 補強 ownKeys/has，降低 Proxy 可觀測面
          ownKeys: function(t) {
            try {
              const nk = Reflect.ownKeys(native);
              const tk = Reflect.ownKeys(t);
              const set = new Set(nk);
              for (let i = 0; i < tk.length; i++) set.add(tk[i]);
              return Array.from(set);
            } catch(e) {
              return Reflect.ownKeys(t);
            }
          },
          has: function(t, k) {
            try { if (k in native) return true; } catch(e) {}
            try { return k in t; } catch(e) { return false; }
          },
          getPrototypeOf: function() { return Object.getPrototypeOf(native); }
        });

        this.proxyMap.set(custom, proxy);
        return proxy;
      } catch(e) {
        ErrorHandler.capture('Proxy:protect', e);
        return custom;
      }
    },

    override: function(o, p, f) {
      if (!o) return false;

      const desc = Object.getOwnPropertyDescriptor(o, p);
      if (!desc && typeof o[p] === 'undefined') return false;

      const orig = (desc && 'value' in desc) ? desc.value : o[p];
      if (typeof orig !== 'function') return false;

      try {
        const safe = f(orig);
        const prot = ProxyGuard.protect(orig, safe);

        try { if (orig.prototype && prot.prototype !== orig.prototype) prot.prototype = orig.prototype; } catch(e) {}

        if (desc && desc.configurable === false) {
          try { o[p] = prot; return true; } catch(e) { return false; }
        }

        try {
          Object.defineProperty(o, p, {
            value: prot,
            writable: desc ? !!desc.writable : true,
            configurable: desc ? !!desc.configurable : true,
            enumerable: desc ? !!desc.enumerable : true
          });
          return true;
        } catch(e) {
          try { o[p] = prot; return true; }
          catch(e2) { ErrorHandler.capture('PG:set:' + p, e2); return false; }
        }
      } catch(e) {
        ErrorHandler.capture('PG:override:' + p, e);
        return false;
      }
    }
  };

  // ---------------- Worker Shield ----------------
  const WORKER_SHIELD = (function() {
    return "(" + function() {
      try {
        const C = { cores: ${CONST.FAKE_CORES}, memory: ${CONST.FAKE_MEMORY} };
        const N = self.navigator || {};
        try { if ('hardwareConcurrency' in N) Object.defineProperty(N, 'hardwareConcurrency', { get: function() { return C.cores; }, configurable: true }); } catch(e) {}
        try { if ('deviceMemory' in N) Object.defineProperty(N, 'deviceMemory', { get: function() { return C.memory; }, configurable: true }); } catch(e) {}
        try { if ('webdriver' in N) Object.defineProperty(N, 'webdriver', { get: function() { return false; }, configurable: true }); } catch(e) {}

        // 保持小幅漂移，但避免每次 now() 生成新隨機（降低異常波動）
        try {
          if (self.Date && self.Date.now) {
            const origNow = self.Date.now;
            const offset = (Math.random() * 2) + 0.1;
            self.Date.now = function() { return origNow() + offset; };
          }
        } catch(e) {}

        try {
          if (self.performance && self.performance.now) {
            const origPerfNow = self.performance.now.bind(self.performance);
            const perfOffset = Math.random() * 0.5;
            self.performance.now = function() { return origPerfNow() + perfOffset; };
          }
        } catch(e) {}
      } catch(e) {}
    } + ")();";
  })();

  // ============================================================================
  // Modules
  // ============================================================================
  const Modules = {
    canvas: function(win) {
      try {
        [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(function(ctx) {
          if (ctx && ctx.prototype) {
            ProxyGuard.override(ctx.prototype, 'getImageData', function(orig) {
              return function(x, y, w, h) {
                const r = orig.apply(this, arguments);
                if (w < CONFIG.canvasMinSize || h < CONFIG.canvasMinSize) return r;
                try { Noise.pixel(r.data, w, h); } catch(e) { ErrorHandler.capture('Canvas:pixel', e); }
                return r;
              };
            });

            ProxyGuard.override(ctx.prototype, 'measureText', function(orig) {
              return function() {
                const m = orig.apply(this, arguments);
                try {
                  const w = m.width;
                  Object.defineProperty(m, 'width', { get: function() { return Noise.font(w); }, configurable: true });
                } catch(e) { ErrorHandler.capture('Canvas:measure', e); }
                return m;
              };
            });
          }
        });

        if (win.HTMLCanvasElement) {
          const hookDataURL = function(orig) {
            return function() {
              const w = this.width, h = this.height;
              if (w < CONFIG.canvasMinSize || h < CONFIG.canvasMinSize) return orig.apply(this, arguments);

              let p = null;
              try {
                p = CanvasPool.get(w, h);
                p.ctx.clearRect(0, 0, w, h);
                p.ctx.drawImage(this, 0, 0);

                const d = p.ctx.getImageData(0, 0, w, h);
                Noise.pixel(d.data, w, h);
                p.ctx.putImageData(d, 0, 0);

                return p.canvas.toDataURL.apply(p.canvas, arguments);
              } catch(e) {
                ErrorHandler.capture('Canvas:toDataURL', e);
                return orig.apply(this, arguments);
              } finally {
                try { if (p) p.release(); } catch(e) {}
              }
            };
          };

          ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toDataURL', hookDataURL);

          const hookToBlob = function(orig) {
            return function(callback) {
              const w = this.width, h = this.height;
              if (w < CONFIG.canvasMinSize || h < CONFIG.canvasMinSize) return orig.apply(this, arguments);

              let p = null;
              let released = false;
              const safeRelease = function() {
                if (released) return;
                released = true;
                try { if (p) p.release(); } catch(e) {}
              };

              try {
                p = CanvasPool.get(w, h);
                p.ctx.clearRect(0, 0, w, h);
                p.ctx.drawImage(this, 0, 0);

                const d = p.ctx.getImageData(0, 0, w, h);
                Noise.pixel(d.data, w, h);
                p.ctx.putImageData(d, 0, 0);

                const args = Array.prototype.slice.call(arguments);
                const cb = args[0];
                const type = args[1];
                const quality = args[2];

                const wrappedCb = function(blob) {
                  try { if (typeof cb === 'function') cb(blob); }
                  catch(e) { ErrorHandler.capture('Canvas:toBlob:cb', e); }
                  finally { safeRelease(); }
                };

                setTimeout(safeRelease, CONFIG.toBlobReleaseFallbackMs);
                p.canvas.toBlob(wrappedCb, type, quality);
              } catch(e) {
                ErrorHandler.capture('Canvas:toBlob', e);
                try { return orig.apply(this, arguments); }
                finally { safeRelease(); }
              }
            };
          };

          ProxyGuard.override(win.HTMLCanvasElement.prototype, 'toBlob', hookToBlob);
        }
      } catch(e) { ErrorHandler.capture('Mod.canvas', e); }
    },

    audio: function(win) {
      try {
        const AC = win.AudioContext || win.webkitAudioContext;
        const AB = win.AudioBuffer;
        if (AC && AC.prototype && win.AnalyserNode) {
          ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatFrequencyData', function(orig) {
            return function(a) {
              const r = orig.apply(this, arguments);
              try { for (let i = 0; i < a.length; i++) a[i] += (Noise.rand(i) * 0.1 - 0.05); } catch(e) { ErrorHandler.capture('Audio:floatFreq', e); }
              return r;
            };
          });

          ProxyGuard.override(win.AnalyserNode.prototype, 'getByteFrequencyData', function(orig) {
            return function(a) {
              const r = orig.apply(this, arguments);
              try { for (let i = 0; i < a.length; i++) a[i] = Math.max(0, Math.min(255, a[i] + Math.floor(Noise.rand(i) * 3 - 1.5))); } catch(e) { ErrorHandler.capture('Audio:byteFreq', e); }
              return r;
            };
          });

          ProxyGuard.override(win.AnalyserNode.prototype, 'getFloatTimeDomainData', function(orig) {
            return function(a) {
              const r = orig.apply(this, arguments);
              try { for (let i = 0; i < a.length; i++) a[i] += (Noise.rand(i) * 0.001 - 0.0005); } catch(e) { ErrorHandler.capture('Audio:floatTD', e); }
              return r;
            };
          });
        }

        if (AB && AB.prototype) {
          ProxyGuard.override(AB.prototype, 'getChannelData', function(orig) {
            return function() {
              const d = orig.apply(this, arguments);
              try { Noise.audio(d); } catch(e) { ErrorHandler.capture('Audio:channel', e); }
              return d;
            };
          });
        }
      } catch(e) { ErrorHandler.capture('Mod.audio', e); }
    },

    hardware: function(win) {
      try {
        const N = win.navigator;
        const Proto = win.Navigator ? win.Navigator.prototype : null;

        const defineOnProtoOrInstance = function(prop, desc) {
          const targets = [];
          if (Proto) targets.push(Proto);
          targets.push(N);

          for (let i = 0; i < targets.length; i++) {
            const t = targets[i];
            try {
              const od = Object.getOwnPropertyDescriptor(t, prop);
              if (od && od.configurable === false) continue;
              Object.defineProperty(t, prop, desc);
              return true;
            } catch(e) {}
          }
          return false;
        };

        try { if ('webdriver' in N) defineOnProtoOrInstance('webdriver', { get: function() { return false; }, configurable: true }); } catch(e) {}
        try { if (!('pdfViewerEnabled' in N)) Object.defineProperty(N, 'pdfViewerEnabled', { get: function() { return true; }, configurable: true, enumerable: true }); } catch(e) {}

        if ('getBattery' in N) {
          try {
            N.getBattery = function() {
              return Promise.resolve({
                charging: true, level: 1, chargingTime: 0, dischargingTime: Infinity,
                addEventListener: function() {}, removeEventListener: function() {}, onlevelchange: null, onchargingchange: null
              });
            };
          } catch(e) { ErrorHandler.capture('HW:battery', e); }
        }

        try { defineOnProtoOrInstance('hardwareConcurrency', { get: function() { return CONFIG.fakeCores; }, configurable: true }); } catch(e) {}
        try { defineOnProtoOrInstance('deviceMemory', { get: function() { return CONFIG.fakeMemory; }, configurable: true }); } catch(e) {}

        if (N.connection) {
          try {
            const conn = N.connection;
            Object.defineProperty(conn, 'rtt', { get: function() { return 100; }, configurable: true });
            Object.defineProperty(conn, 'downlink', { get: function() { return 10; }, configurable: true });
            Object.defineProperty(conn, 'effectiveType', { get: function() { return '4g'; }, configurable: true });
            Object.defineProperty(conn, 'saveData', { get: function() { return false; }, configurable: true });
          } catch(e) { ErrorHandler.capture('HW:conn', e); }
        }

        if (N.plugins) {
          try {
            let _pluginArray = null;
            const makePluginArray = function() {
              const plugins = [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
              ];
              const arr = {
                length: plugins.length,
                item: function(i) { return plugins[i] || null; },
                namedItem: function(name) { for (let i = 0; i < plugins.length; i++) if (plugins[i].name === name) return plugins[i]; return null; },
                refresh: function() {}
              };
              try { Object.defineProperty(arr, Symbol.iterator, { value: function* () { for (let i = 0; i < plugins.length; i++) yield plugins[i]; }, configurable: true }); } catch(e) {}
              return arr;
            };
            defineOnProtoOrInstance('plugins', { get: function() { if (!_pluginArray) _pluginArray = makePluginArray(); return _pluginArray; }, configurable: true });
          } catch(e) { ErrorHandler.capture('HW:plugins', e); }
        }

        if (win.document && 'browsingTopics' in win.document) {
          try { win.document.browsingTopics = function() { return Promise.resolve([]); }; }
          catch(e) { ErrorHandler.capture('HW:topics', e); }
        }
      } catch(e) { ErrorHandler.capture('Mod.hardware', e); }
    },

    fonts: function(win) {
      try {
        if (win.document && win.document.fonts) {
          const fontCache = new Map();
          ProxyGuard.override(win.document.fonts, 'check', function(orig) {
            return function(font) {
              if (fontCache.has(font)) return fontCache.get(font);

              let result;
              if (typeof font === 'string') {
                const cleanFont = font.replace(/['"]/g, '').toLowerCase().trim();
                let isSafe = false;
                for (let [safeName] of SAFE_FONTS) { if (cleanFont.includes(safeName)) { isSafe = true; break; } }
                result = isSafe ? true : Noise.rand(cleanFont.length) > 0.3;
              } else {
                result = Noise.rand(Date.now()) > 0.3;
              }

              if (fontCache.size >= CONFIG.fontCacheSize) fontCache.delete(fontCache.keys().next().value);
              fontCache.set(font, result);
              return result;
            };
          });
        }
      } catch(e) { ErrorHandler.capture('Mod.fonts', e); }
    },

    webrtc: function(win) {
      try {
        if (!win.RTCPeerConnection) return;
        const OrigPeer = win.RTCPeerConnection;

        win.RTCPeerConnection = function(config, constraints) {
          const newConfig = config || {};
          if (newConfig.iceServers) newConfig.iceServers = [];
          return new OrigPeer(newConfig, constraints);
        };

        win.RTCPeerConnection.prototype = OrigPeer.prototype;
        Object.keys(OrigPeer).forEach(function(key) { win.RTCPeerConnection[key] = OrigPeer[key]; });
      } catch(e) { ErrorHandler.capture('Mod.webrtc', e); }
    },

    rects: function(win) {
      try {
        const ElementProto = win.Element && win.Element.prototype;
        if (!ElementProto) return;

        const wrapRect = function(rect) {
          if (!rect) return rect;
          return {
            top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
            x: rect.x, y: rect.y,
            width: Noise.rect(rect.width), height: Noise.rect(rect.height),
            toJSON: function() { return this; }
          };
        };

        ProxyGuard.override(ElementProto, 'getBoundingClientRect', function(orig) {
          return function() {
            try { return wrapRect(orig.apply(this, arguments)); }
            catch(e) { ErrorHandler.capture('Rect:getBCR', e); return orig.apply(this, arguments); }
          };
        });

        ProxyGuard.override(ElementProto, 'getClientRects', function(orig) {
          return function() {
            try {
              const rects = orig.apply(this, arguments);
              const spoofed = [];
              for (let i = 0; i < rects.length; i++) spoofed.push(wrapRect(rects[i]));
              return spoofed;
            } catch(e) { ErrorHandler.capture('Rect:getClientRects', e); return orig.apply(this, arguments); }
          };
        });
      } catch(e) { ErrorHandler.capture('Mod.rects', e); }
    },

    screen: function(win) {
      try {
        if (!win.screen) return;
        const oW = win.screen.width, oH = win.screen.height;
        const oAW = win.screen.availWidth, oAH = win.screen.availHeight;

        Object.defineProperties(win.screen, {
          width: { get: function() { return Noise.int(oW, 2); }, configurable: true },
          height: { get: function() { return Noise.int(oH, 2); }, configurable: true },
          availWidth: { get: function() { return Noise.int(oAW, 2); }, configurable: true },
          availHeight: { get: function() { return Noise.int(oAH, 2); }, configurable: true },
          colorDepth: { get: function() { return 24; }, configurable: true },
          pixelDepth: { get: function() { return 24; }, configurable: true }
        });
      } catch(e) { ErrorHandler.capture('Mod.screen', e); }
    },

    webgl: function(win) {
      try {
        const gpu = Noise.getGPU();
        const paramCache = new Map();
        const taCache = new Map();

        const isTypedArray = function(v) {
          return v && typeof v === 'object' && (
            v instanceof Float32Array ||
            v instanceof Int32Array ||
            v instanceof Uint32Array ||
            v instanceof Uint16Array ||
            v instanceof Int16Array ||
            v instanceof Uint8Array ||
            v instanceof Int8Array ||
            v instanceof Uint8ClampedArray
          );
        };

        const cloneReturn = function(v) {
          // 針對可變型結果，統一回傳新實例，避免：
          // 1) identity 檢測（a === b）
          // 2) 呼叫端改寫內容污染快取
          try {
            if (isTypedArray(v)) return new v.constructor(v);
            if (Array.isArray(v)) return v.slice();
            return v;
          } catch(e) { return v; }
        };

        const getTA = function(key, arr) {
          if (!taCache.has(key)) {
            taCache.set(key, new Float32Array(arr));
            if (taCache.size >= CONFIG.webglTaCacheSize) taCache.delete(taCache.keys().next().value);
          }
          return new Float32Array(taCache.get(key));
        };

        [win.WebGLRenderingContext, win.WebGL2RenderingContext].forEach(function(ctx) {
          if (ctx && ctx.prototype) {
            ProxyGuard.override(ctx.prototype, 'getParameter', function(orig) {
              return function(param) {
                if (param === 37445) return gpu.v;
                if (param === 37446) return gpu.r;
                if (param === 3379 && gpu.p && gpu.p.mt) return gpu.p.mt;
                if (param === 33902 && gpu.p && gpu.p.alw) return getTA('alw', gpu.p.alw);

                if (paramCache.has(param)) return cloneReturn(paramCache.get(param));

                const result = orig.apply(this, arguments);
                if (paramCache.size >= CONFIG.webglCacheSize) paramCache.delete(paramCache.keys().next().value);
                paramCache.set(param, result);

                return cloneReturn(result);
              };
            });
          }
        });
      } catch(e) { ErrorHandler.capture('Mod.webgl', e); }
    },

    permissions: function(win) {
      try {
        if (!win.navigator || !win.navigator.permissions) return;

        ProxyGuard.override(win.navigator.permissions, 'query', function(orig) {
          return function(descriptor) {
            return orig.apply(this, arguments).then(function(status) {
              try {
                if (descriptor && (descriptor.name === 'geolocation' || descriptor.name === 'notifications')) {
                  return { state: 'prompt', addEventListener: function() {}, removeEventListener: function() {} };
                }
              } catch(e) {}
              return status;
            }).catch(function(e) {
              ErrorHandler.capture('Perm:query', e);
              return { state: 'prompt', addEventListener: function() {}, removeEventListener: function() {} };
            });
          };
        });
      } catch(e) { ErrorHandler.capture('Mod.permissions', e); }
    },

    timezoneAndLocale: function(win) {
      try {
        const fake = Noise.getTimezone();
        const fakeLocale = fake && fake.locale ? fake.locale : null;

        try {
          if (fakeLocale && win.navigator) {
            Object.defineProperty(win.navigator, 'language', { get: function() { return fakeLocale; }, configurable: true });
            Object.defineProperty(win.navigator, 'languages', { get: function() { return [fakeLocale, 'en-US']; }, configurable: true });
          }
        } catch(e) { ErrorHandler.capture('TZ:navigatorLocale', e); }

        const formatGMTOffset = function(offsetMinutes) {
          const sign = offsetMinutes <= 0 ? '+' : '-';
          const absOffset = Math.abs(offsetMinutes);
          const hours = Math.floor(absOffset / 60);
          const minutes = absOffset % 60;
          return 'GMT' + sign + String(hours).padStart(2, '0') + String(minutes).padStart(2, '0');
        };

        const replaceTimezoneInfo = function(str) {
          try {
            str = String(str || '');
            str = str.replace(/\\([^)]+\\)$/, '(' + fake.name + ')');
            str = str.replace(/GMT[\\+\\-]\\d{4}/, formatGMTOffset(fake.offset));
            return str;
          } catch(e) { return str; }
        };

        // Intl.DateTimeFormat：避免汙染 options（呼叫端可能重用同一個 options 物件）
        if (win.Intl && win.Intl.DateTimeFormat) {
          const OrigDTF = win.Intl.DateTimeFormat;

          const WrappedDTF = function(locales, options) {
            try {
              const loc = (typeof locales === 'undefined' || locales === null) ? (fakeLocale || locales) : locales;
              const opt = options ? Object.assign({}, options) : {};
              try { opt.timeZone = fake.zone; } catch(e) {}
              return new OrigDTF(loc, opt);
            } catch(e) {
              ErrorHandler.capture('Intl:DTF', e);
              return new OrigDTF(locales, options);
            }
          };

          // 讓 toString 也像 native
          win.Intl.DateTimeFormat = ProxyGuard.protect(OrigDTF, WrappedDTF);
          win.Intl.DateTimeFormat.prototype = OrigDTF.prototype;
          win.Intl.DateTimeFormat.supportedLocalesOf = OrigDTF.supportedLocalesOf;

          try {
            ProxyGuard.override(OrigDTF.prototype, 'resolvedOptions', function(orig) {
              return function() {
                const opts = orig.apply(this, arguments);
                try { opts.timeZone = fake.zone; } catch(e) {}
                return opts;
              };
            });
          } catch(e) { ErrorHandler.capture('Intl:resolvedOptions', e); }
        }

        if (win.Date && win.Date.prototype) {
          ProxyGuard.override(win.Date.prototype, 'getTimezoneOffset', function() {
            return function() { return fake.offset; };
          });

          ProxyGuard.override(win.Date.prototype, 'toString', function(orig) {
            return function() {
              try { return replaceTimezoneInfo(orig.apply(this, arguments)); }
              catch(e) { return orig.apply(this, arguments); }
            };
          });

          ProxyGuard.override(win.Date.prototype, 'toTimeString', function(orig) {
            return function() {
              try { return replaceTimezoneInfo(orig.apply(this, arguments)); }
              catch(e) { return orig.apply(this, arguments); }
            };
          });

          const patchLocale = function(name) {
            ProxyGuard.override(win.Date.prototype, name, function(orig) {
              return function(locales, options) {
                const loc = (typeof locales === 'undefined' || locales === null) ? (fakeLocale || locales) : locales;
                const opt = options ? Object.assign({}, options) : {};
                try { opt.timeZone = fake.zone; } catch(e) {}
                return orig.call(this, loc, opt);
              };
            });
          };

          patchLocale('toLocaleString');
          patchLocale('toLocaleDateString');
          patchLocale('toLocaleTimeString');
        }
      } catch(e) { ErrorHandler.capture('Mod.timezoneAndLocale', e); }
    },

    storage: function(win) {
      try {
        if (win.navigator && win.navigator.storage && win.navigator.storage.estimate) {
          ProxyGuard.override(win.navigator.storage, 'estimate', function() {
            return function() { return Promise.resolve({ quota: 299999999999, usage: 100000000, usageDetails: {} }); };
          });
        }

        if (win.indexedDB && win.indexedDB.open) {
          ProxyGuard.override(win.indexedDB, 'open', function(orig) {
            return function(name, version) {
              try {
                const delay = Noise.rand((name ? name.length : 1) * 131) * 5;
                const req = orig.apply(win.indexedDB, arguments);
                try {
                  const os = req.onsuccess; const oe = req.onerror;
                  if (typeof os === 'function') req.onsuccess = function(ev){ setTimeout(() => os.call(this, ev), delay); };
                  if (typeof oe === 'function') req.onerror = function(ev){ setTimeout(() => oe.call(this, ev), delay); };
                } catch(e) {}
                return req;
              } catch(e) { ErrorHandler.capture('IDB:open', e); return orig.apply(win.indexedDB, arguments); }
            };
          });
        }
      } catch(e) { ErrorHandler.capture('Mod.storage', e); }
    },

    media: function(win) {
      try {
        if (win.HTMLMediaElement) {
          ProxyGuard.override(win.HTMLMediaElement.prototype, 'canPlayType', function(orig) {
            return function(type) {
              try { if (type && (String(type).includes('hvc1') || String(type).includes('hevc'))) return ''; }
              catch(e) { ErrorHandler.capture('Media:canPlayType', e); }
              return orig.apply(this, arguments);
            };
          });
        }
      } catch(e) { ErrorHandler.capture('Mod.media', e); }
    },

    speech: function(win) {
      try {
        if (win.speechSynthesis) {
          ProxyGuard.override(win.speechSynthesis, 'getVoices', function(orig) {
            return function() {
              const voices = orig.apply(this, arguments);
              return voices.slice(0, Math.max(3, Math.floor(voices.length * 0.7)));
            };
          });
        }
      } catch(e) { ErrorHandler.capture('Mod.speech', e); }
    },

    workers: function(win) {
      try {
        if (!win.Worker) return;
        const OrigWorker = win.Worker;

        const makeWrapperURL = function(scriptURL, options) {
          const isModule = options && options.type === 'module';
          const u = String(scriptURL);
          const jsURL = JSON.stringify(u);

          let wrapper = '';
          wrapper += WORKER_SHIELD + '\\n';
          if (isModule) wrapper += 'import(' + jsURL + ').catch(function(){});\\n';
          else wrapper += 'try{importScripts(' + jsURL + ');}catch(e){}\\n';

          const blob = new Blob([wrapper], { type: 'application/javascript' });
          return URL.createObjectURL(blob);
        };

        win.Worker = function(scriptURL, options) {
          let wrapperURL = null;
          try {
            wrapperURL = makeWrapperURL(scriptURL, options || {});
            const w = new OrigWorker(wrapperURL, options);
            try {
              const u = wrapperURL;
              setTimeout(function() { try { URL.revokeObjectURL(u); } catch(e) {} }, CONFIG.workerRevokeDelayMs);
            } catch(e) {}
            return w;
          } catch(e) {
            ErrorHandler.capture('Worker:wrap', e);
            try { if (wrapperURL) URL.revokeObjectURL(wrapperURL); } catch(e2) {}
            return new OrigWorker(scriptURL, options);
          }
        };

        win.Worker.prototype = OrigWorker.prototype;
      } catch(e) { ErrorHandler.capture('Mod.workers', e); }
    },

    performance: function(win) {
      try {
        if (!win.performance || !win.performance.now) return;
        const origNow = win.performance.now.bind(win.performance);
        const offset = Noise.rand(9999) * 0.5;
        ProxyGuard.override(win.performance, 'now', function() {
          return function() { return origNow() + offset; };
        });
      } catch(e) { ErrorHandler.capture('Mod.performance', e); }
    },

    mediaDevices: function(win) {
      try {
        if (!win.navigator || !win.navigator.mediaDevices) return;
        ProxyGuard.override(win.navigator.mediaDevices, 'enumerateDevices', function(orig) {
          return function() {
            return orig.apply(this, arguments).then(function(devices) {
              return devices.map(function(device) {
                return { deviceId: device.deviceId, kind: device.kind, label: '', groupId: device.groupId };
              });
            }).catch(function(e) { ErrorHandler.capture('MediaDevices:enum', e); return []; });
          };
        });
      } catch(e) { ErrorHandler.capture('Mod.mediaDevices', e); }
    },

    clientHints: function(win) {
      try {
        if (!win.navigator) return;
        if (!win.navigator.userAgentData) return;

        const brands = [
          { brand: 'Chromium', version: '120' },
          { brand: 'Google Chrome', version: '120' },
          { brand: 'Not=A?Brand', version: '24' }
        ];

        const fake = {
          brands: brands, mobile: false, platform: 'Windows',
          getHighEntropyValues: function(hints) {
            const req = Array.isArray(hints) ? hints : [];
            const out = {};
            for (let i = 0; i < req.length; i++) {
              const k = req[i];
              if (k === 'architecture') out.architecture = 'x86';
              else if (k === 'bitness') out.bitness = '64';
              else if (k === 'model') out.model = '';
              else if (k === 'platformVersion') out.platformVersion = '15.0.0';
              else if (k === 'uaFullVersion') out.uaFullVersion = '120.0.0.0';
              else if (k === 'fullVersionList') out.fullVersionList = brands.map(b => ({ brand: b.brand, version: b.version }));
              else if (k === 'wow64') out.wow64 = false;
            }
            return Promise.resolve(out);
          },
          toJSON: function() { return { brands: brands, mobile: false, platform: 'Windows' }; }
        };

        Object.defineProperty(win.navigator, 'userAgentData', { get: function() { return fake; }, configurable: true });
      } catch(e) { ErrorHandler.capture('Mod.clientHints', e); }
    }
  };

  const inject = function(win) {
    try {
      if (!win || win._FP_V2_DONE) return;
      Object.defineProperty(win, '_FP_V2_DONE', { value: true, enumerable: false, configurable: false });

      Modules.canvas(win);
      Modules.rects(win);
      Modules.webrtc(win);
      Modules.screen(win);
      Modules.webgl(win);
      Modules.timezoneAndLocale(win);
      Modules.clientHints(win);
      Modules.workers(win);
      Modules.fonts(win);
      Modules.media(win);
      Modules.speech(win);

      const lazy = function() {
        try {
          Modules.audio(win);
          Modules.hardware(win);
          Modules.permissions(win);
          Modules.performance(win);
          Modules.mediaDevices(win);
          Modules.storage(win);
        } catch(e) { ErrorHandler.capture('inject:lazy', e); }
      };

      if (win.requestIdleCallback) win.requestIdleCallback(lazy, { timeout: ${CONST.IDLE_TIMEOUT} });
      else if (win.requestAnimationFrame) win.requestAnimationFrame(() => setTimeout(lazy, 0));
      else setTimeout(lazy, 0);
    } catch(e) { ErrorHandler.capture('inject', e); }
  };

  const init = function() {
    inject(window);
    UI.showBadge();
    hookHistory();

    let iframeQueue = [];
    let processTimeout = null;

    const processIframes = function() {
      const batch = iframeQueue.splice(0, ${CONST.IFRAME_BATCH_SIZE});
      for (let i = 0; i < batch.length; i++) {
        const iframe = batch[i];
        try { if (iframe && iframe.contentWindow && iframe.contentWindow.document) inject(iframe.contentWindow); }
        catch(e) { ErrorHandler.capture('iframe:process', e); }
      }
      if (iframeQueue.length > 0) processTimeout = setTimeout(processIframes, ${CONST.WORKER_INJECT_DELAY});
      else processTimeout = null;
    };

    try {
      new MutationObserver(function(mutations) {
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          for (let j = 0; j < m.addedNodes.length; j++) {
            const n = m.addedNodes[j];
            if (n && n.tagName === 'IFRAME') {
              iframeQueue.push(n);
              n.addEventListener('load', function() {
                try { if (n.contentWindow && n.contentWindow.document) inject(n.contentWindow); }
                catch(e) { ErrorHandler.capture('iframe:load', e); }
              }, { once: true, passive: true });
            }
          }
        }
        if (iframeQueue.length > 0 && !processTimeout) processTimeout = setTimeout(processIframes, ${CONST.WORKER_INJECT_DELAY});
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch(e) { ErrorHandler.capture('MO:init', e); }

    window.addEventListener('beforeunload', function() {
      CanvasPool.cleanup();
      ErrorHandler.clear();
      UI.cleanup();
    }, { once: true, passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.__FP_METRICS__ = {
    version: CONFIG.ver,
    getErrors: function() { return ErrorHandler.getLogs(); },
    getErrorStats: function() { return ErrorHandler.getStats(); },
    getSeed: function() { return Seed; },
    getTimezone: function() { return Noise.getTimezone(); },
    getGPU: function() { return Noise.getGPU(); },
    getConfig: function() { return CONFIG; },
    cleanup: function() { CanvasPool.cleanup(); ErrorHandler.clear(); UI.cleanup(); }
  };
})();
</script>
`;

  if (REGEX.HEAD_TAG.test(body)) {
    body = body.replace(REGEX.HEAD_TAG, (m) => m + injection);
  } else if (REGEX.HTML_TAG.test(body)) {
    body = body.replace(REGEX.HTML_TAG, (m) => m + injection);
  } else {
    body = injection + body;
  }

  $done({ body: body, headers: headers });
})();
