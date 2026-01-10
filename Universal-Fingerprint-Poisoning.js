/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.27-Performance-Tuned
 * @author    Jerry's AI Assistant
 * @updated   2026-01-10
 * ----------------------------------------------------------------------------
 * [V10.27 效能優化版]:
 * 1) [PERFORMANCE] HTML 解析邏輯重構：
 * - 限制 CSP Nonce 與 Head 的掃描範圍僅限前 3000 字元。
 * - 解決 V10.26 掃描大型 HTML Body 導致的「白屏卡頓」問題。
 * 2) [OPTIMIZATION] Worker 注入輕量化：
 * - 增加 Try-Catch 容錯，防止 Blob 創建失敗導致頁面崩潰。
 * 3) [RETAINED] 繼承 V10.26 的核心防護 (Canvas/Audio/WebRTC/Shopping Mode)。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0) Mode Check (The Kill Switch)
  // ============================================================================
  if (typeof $persistentStore !== "undefined") {
      const currentMode = $persistentStore.read("FP_MODE");
      if (currentMode === "shopping") {
          // console.log("[FP-Shield] 🛍️ 購物模式 (Shopping Mode) - 腳本暫停");
          if (typeof $done !== "undefined") $done({});
          return;
      }
  }

  // ============================================================================
  // 1) Config & Seed
  // ============================================================================
  const CONST = {
    KEY_PERSISTENCE: "FP_SHIELD_ID_V1014", 
    INJECT_MARKER: "__FP_SHIELD_INJECTED__",
    // 降低噪聲採樣頻率以提升效能
    CANVAS_NOISE_STEP: 4, 
    AUDIO_NOISE_LEVEL: 0.00001
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
          localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + 2592000000}`);
        }
      } else {
        idSeed = (now ^ (Math.random() * 100000000)) >>> 0;
        localStorage.setItem(CONST.KEY_PERSISTENCE, `${idSeed}|${now + 2592000000}`);
      }
    } catch (e) {}
    const dailySeed = (idSeed ^ Math.floor(now / 86400000)) >>> 0;
    return { id: idSeed, daily: dailySeed };
  })();

  // ============================================================================
  // 2) Whitelist (Fast Check)
  // ============================================================================
  // 將高頻訪問的服務移至陣列前端以加速匹配
  const HARD_EXCLUSION_KEYWORDS = [
    "accounts.google.com", "appleid.apple.com", "login", "sso", "oauth",
    "ctbc", "cathay", "esun", "fubon", "taishin", "post.gov.tw",
    "shopee", "momo", "pchome", "uber", "foodpanda",
    "recaptcha", "turnstile", "openai", "chatgpt"
  ];

  const currentUrl = (typeof $request !== "undefined") ? ($request.url || "").toLowerCase() : "";
  // 簡單快速檢查，若命中直接跳出，節省正則運算資源
  if (HARD_EXCLUSION_KEYWORDS.some(k => currentUrl.includes(k))) {
      if (typeof $done !== "undefined") $done({});
      return;
  }

  // ============================================================================
  // Phase A: Request (Skip)
  // ============================================================================
  if (typeof $request !== "undefined" && typeof $response === "undefined") {
    $done({});
    return;
  }

  // ============================================================================
  // Phase B: HTML Injection (Performance Optimized)
  // ============================================================================
  if (typeof $response !== "undefined") {
    const body = $response.body;
    if (!body) { $done({}); return; }

    const headers = $response.headers || {};
    const cType = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
    
    // 嚴格檢查 Content-Type，避免處理 JSON/XML/Images
    if (!cType.includes("text/html")) { $done({}); return; }

    // [PERFORMANCE TIP] 
    // 不再掃描整個 Body，只掃描前 3000 個字元來尋找 Head 和 Nonce。
    // 這能大幅減少大型網頁的處理延遲。
    const scanChunk = body.substring(0, 3000); 
    
    if (scanChunk.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    let csp = "";
    Object.keys(headers).forEach(k => { if(k.toLowerCase() === "content-security-policy") csp = headers[k]; });
    const allowInline = !csp || csp.includes("'unsafe-inline'");
    
    // 優化後的正則，只在 chunk 中查找
    const REGEX_NONCE = /nonce=["']?([^"'\s>]+)["']?/i;
    const m = scanChunk.match(REGEX_NONCE);
    const nonce = m ? m[1] : "";

    if (!allowInline && !nonce) { $done({}); return; }

    const INJECT_CONFIG = {
      seed: SEED_MANAGER.id,
      consts: CONST
    };

    const OMNI_MODULE_SOURCE = `
    (function(scope) {
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      
      // 輕量化雜湊函數 (MurmurHash3 簡化版)
      const imul = Math.imul || function(a, b) { return (a * b) | 0; };
      const hash = (seed, val) => {
        let h = seed ^ val;
        h = imul(h ^ (h >>> 16), 0x85ebca6b);
        h = imul(h ^ (h >>> 13), 0xc2b2ae35);
        return (h ^ (h >>> 16)) >>> 0;
      };
      
      const protect = (native, custom) => {
        try {
            // 使用 Proxy 時增加錯誤捕捉，避免破壞性錯誤
            return new Proxy(custom, {
                apply: (t, th, a) => { try{ return Reflect.apply(t, th, a); }catch(e){ return Reflect.apply(native, th, a); } },
                construct: (t, a, n) => { try{ return Reflect.construct(t, a, n); }catch(e){ return Reflect.construct(native, a, n); } },
                get: (t, k) => Reflect.get(t, k)
            });
        } catch(e) { return custom; }
      };

      // 1. WebRTC (Relay Only)
      const installWebRTC = () => {
        const rtcNames = ["RTCPeerConnection", "webkitRTCPeerConnection", "mozRTCPeerConnection"];
        rtcNames.forEach(name => {
           if (!scope[name]) return;
           const Native = scope[name];
           const Safe = function(config, ...args) {
              const c = config || {};
              c.iceTransportPolicy = "relay"; 
              c.iceCandidatePoolSize = 0;
              return new Native(c, ...args);
           };
           Safe.prototype = Native.prototype;
           Object.defineProperty(Safe, "name", { value: Native.name }); // 偽裝 Name
           scope[name] = protect(Native, Safe);
        });
      };

      // 2. Canvas (Optimized Noise)
      const installGraphics = () => {
        const hookCtx = (proto) => {
           const old = proto.getImageData;
           if(!old) return;
           proto.getImageData = function(x,y,w,h) {
              const r = old.apply(this, arguments);
              // [PERFORMANCE] 只有當畫布夠大時才注入噪聲，且跳步處理
              if (w > 32 && h > 32) {
                  const d = r.data;
                  const step = CFG.consts.CANVAS_NOISE_STEP || 4; 
                  for(let i=0; i<d.length; i+=(step*4)) {
                     // 簡單的 +/- 1 噪聲
                     if ((i/4) % 10 === 0) {
                        const n = hash(CFG.seed, i) % 3 - 1; 
                        if (n !== 0) d[i] = Math.max(0, Math.min(255, d[i] + n));
                     }
                  }
              }
              return r;
           };
        };
        try {
            if (scope.CanvasRenderingContext2D) hookCtx(scope.CanvasRenderingContext2D.prototype);
            if (scope.OffscreenCanvasRenderingContext2D) hookCtx(scope.OffscreenCanvasRenderingContext2D.prototype);
        } catch(e){}
      };

      // 3. Audio (Optimized)
      const installAudio = () => {
         if (!scope.OfflineAudioContext) return;
         const old = scope.OfflineAudioContext.prototype.startRendering;
         scope.OfflineAudioContext.prototype.startRendering = function() {
            return old.apply(this, arguments).then(buf => {
               if (!buf) return buf;
               try {
                   const d = buf.getChannelData(0);
                   // 僅修改前 1000 個採樣點，減少 CPU 負擔
                   const len = Math.min(d.length, 1000); 
                   for (let i=0; i<len; i+=50) {
                      d[i] += (hash(CFG.seed, i) % 100) * 0.0000001;
                   }
               } catch(e){}
               return buf;
            });
         };
      };

      try { installWebRTC(); installGraphics(); installAudio(); } catch(e) {}
    })(typeof self !== "undefined" ? self : window);
    `;

    const injectionScript = `
${nonce ? `<script nonce="${nonce}">` : `<script>`}
(function() {
  const OMNI = ${JSON.stringify(OMNI_MODULE_SOURCE)};
  
  // Worker 注入：增加 try-catch 包裹
  const setupWorkers = () => {
    if (typeof window === "undefined") return;
    const hookWorker = (Type) => {
      if (!window[Type]) return;
      const Orig = window[Type];
      window[Type] = function(url, opts) {
        let finalUrl = url;
        // 僅當 url 是字串且非 blob 時才嘗試注入
        if (typeof url === 'string' && !url.startsWith('blob:')) {
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
    try { hookWorker("Worker"); hookWorker("SharedWorker"); } catch(e){}
  };
  
  // 直接執行
  eval(OMNI);
  setupWorkers();
  document.documentElement.setAttribute("${CONST.INJECT_MARKER}", "true");
})();
</script>
`;
    // 使用 replace 只替換第一個找到的 <head> 或 <body>，進一步減少運算
    let newBody = body;
    const headRegex = /<head[^>]*>/i;
    if (headRegex.test(scanChunk)) {
        newBody = body.replace(headRegex, (m) => m + injectionScript);
    } else {
        // Fallback: 如果沒有 head，插在 body 之前
        newBody = injectionScript + body;
    }

    $done({ body: newBody });
  }
})();

