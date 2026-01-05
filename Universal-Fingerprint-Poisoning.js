/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   5.38-Precision-Reliability
 * @description [精確可靠版] 收束 Nonce 來源至 Script 標籤，WebRTC 採威脅模型過濾 (擋私網/IPv6，放公網V4)。
 * ----------------------------------------------------------------------------
 * 1. [Fix] Nonce: 嚴格僅從 <script> 標籤提取 nonce，避免誤用 style/link nonce 導致 CSP 阻擋。
 * 2. [Fix] WebRTC: 阻擋 Private IPv4 與所有 IPv6 Host Candidate，但放行 Public IPv4 (VPN介面) 與 mDNS。
 * 3. [Strategy] CSP: 維持 Read-Only 策略 (不修改 Header)，優先確保流量特徵的隱匿性。
 * 4. [Core] iOS Native: 維持 iOS 設備的 Pass-through 策略。
 * ----------------------------------------------------------------------------
 * @note 建議在 Surge/Loon/Quantumult X 中啟用「腳本重寫」功能。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全域配置 & 種子生成
  // ============================================================================
  const CONST = {
    KEY_SEED: "FP_SHIELD_SEED_V538", 
    KEY_EXPIRY: "FP_SHIELD_EXP_V538",
    INJECT_MARKER: "__FP_SHIELD_V538__",
    
    // Noise Config
    CANVAS_NOISE_STEP: 2,
    AUDIO_NOISE_LEVEL: 0.00001,
    TEXT_METRICS_NOISE: 0.0001
  };

  // Pre-calculate Seed and Versioning
  const SEED_DATA = (function() {
      try {
          const now = Date.now();
          let val = localStorage.getItem(CONST.KEY_SEED);
          const exp = parseInt(localStorage.getItem(CONST.KEY_EXPIRY) || '0', 10);
          
          if (!val || now > exp) {
              val = ((now ^ (Math.random() * 10000000)) >>> 0).toString();
              const nextExp = now + (24 * 60 * 60 * 1000); 
              localStorage.setItem(CONST.KEY_SEED, val);
              localStorage.setItem(CONST.KEY_EXPIRY, nextExp.toString());
          }
          const s = parseInt(val, 10) || 12345;
          
          const rand = (idx) => { 
              let x = (s + idx) * 15485863; 
              return ((x * x * x) % 2038074743) / 2038074743; 
          };

          const major = "143";
          const build = Math.floor(rand(1) * 5000) + 1000;
          const patch = Math.floor(rand(2) * 200) + 1;
          const fullVersion = `${major}.0.${build}.${patch}`;

          return { val: s, fullVersion, major, rand };
      } catch(e) { return { val: 12345, fullVersion: "143.0.0.0", major: "143", rand: () => 0.5 }; }
  })();

  const PERSONA_CONFIG = (function() {
      return {
          MAC: {
              TYPE: "SPOOF",
              UA: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${SEED_DATA.fullVersion} Safari/537.36`,
              FULL_VERSION: SEED_DATA.fullVersion,
              MAJOR_VERSION: SEED_DATA.major,
              PLATFORM: "MacIntel",
              VENDOR: "Google Inc. (AMD)",
              RENDERER: "AMD Radeon Pro 5500M",
              CONCURRENCY: 8,
              MEMORY: 8,
              SCREEN_FEATURES: { depth: 30, pixelRatio: 2 },
              WEBGL_CAPS: {
                  3379: 16384, 34047: 32, 34930: 32, 35660: 80, 34024: 16384, 
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
    // [V5.38] Strict Script Nonce (Reverted from ANY_NONCE)
    SCRIPT_NONCE_STRICT: /<script[^>]*\snonce=["']?([^"'\s>]+)["']?/i,
    // [V5.38] WebRTC Filters
    RTC_PRIVATE_IPV4: /(^| )192\.168\.|(^| )10\.|(^| )172\.(1[6-9]|2[0-9]|3[0-1])\./,
    RTC_IPV6: /:/
  };

  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  const lowerUrl = currentUrl.toLowerCase();
  let hostname = "";
  try { hostname = new URL(currentUrl).hostname.toLowerCase(); } catch (e) {}

  const ENV = (() => {
      let sys = "iOS";
      try { if (typeof $environment !== 'undefined') sys = $environment['system'] || sys; } catch(e) {}
      if (/mac/i.test(sys)) return "MAC";
      return "IOS";
  })();
  
  const CURRENT_PERSONA = PERSONA_CONFIG[ENV];

  // Tier 0: Hard Exclusion
  const HARD_EXCLUSION_KEYWORDS = [
    "foodpanda", "fd-api", "deliveryhero", "shopee.tw/verify", 
    "accounts.google.com", "appleid", "login.live.com", 
    "paypal.com", "stripe.com", "recaptcha.net", "hcaptcha.com"
  ];
  if (HARD_EXCLUSION_KEYWORDS.some(k => lowerUrl.includes(k))) { $done({}); return; }

  // Tier 0.5: Whitelist
  const WhitelistManager = (() => {
    const trusted = new Set(["uber.com","booking.com","openai.com","netflix.com","spotify.com","ctbcbank.com","cathaybk.com.tw","esunbank.com.tw"]);
    const suffixes = [".gov.tw", ".edu.tw", ".bank"];
    return {
      check: (h) => {
        if (!h) return false;
        if (trusted.has(h)) return true;
        for (const d of trusted) if (h.endsWith('.' + d)) return true;
        for (const s of suffixes) if (h.endsWith(s)) return true;
        return lowerUrl.includes("3dsecure") || lowerUrl.includes("acs");
      }
    };
  })();
  
  const isSoftWhitelisted = WhitelistManager.check(hostname);
  const IS_SHOPPING = (hostname.includes("shopee") || hostname.includes("amazon") || hostname.includes("momo"));

  // ============================================================================
  // Phase A: Network Layer (Headers)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    if (!isSoftWhitelisted && !IS_SHOPPING && CURRENT_PERSONA.TYPE === "SPOOF") {
       Object.keys(headers).forEach(k => {
         const l = k.toLowerCase();
         if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
       });
       headers['User-Agent'] = CURRENT_PERSONA.UA;
       headers['sec-ch-ua'] = `"Not(A:Brand";v="99", "Google Chrome";v="${CURRENT_PERSONA.MAJOR_VERSION}", "Chromium";v="${CURRENT_PERSONA.MAJOR_VERSION}"`;
       headers['sec-ch-ua-mobile'] = "?0";
       headers['sec-ch-ua-platform'] = '"macOS"';
    }

    // [V5.38] CSP Read-Only: Zero Trust. We accept failure on strict sites to maintain stealth.
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

    if (!body || !cType.includes("html") || IS_SHOPPING || isSoftWhitelisted) { $done({}); return; }
    if (body.includes(CONST.INJECT_MARKER)) { $done({}); return; }

    // 1. Script-Targeted Nonce Discovery
    // Only search for nonces inside <script> tags to avoid CSS/Style nonce mismatch
    let stolenNonce = "";
    const searchChunk = body.substring(0, 100000); 
    const nonceMatch = searchChunk.match(REGEX.SCRIPT_NONCE_STRICT);
    if (nonceMatch) stolenNonce = nonceMatch[1];

    const INJECT_CONFIG = {
        env: ENV,
        persona: CURRENT_PERSONA,
        noise: {
            canvas: CONST.CANVAS_NOISE_STEP,
            audio: CONST.AUDIO_NOISE_LEVEL,
            text: CONST.TEXT_METRICS_NOISE
        },
        seed: SEED_DATA.val,
        randSeed: SEED_DATA.val
    };

    const scriptTag = stolenNonce ? `<script nonce="${stolenNonce}">` : `<script>`;
    
    const injectionScript = `
    <!-- ${CONST.INJECT_MARKER} -->
    ${scriptTag}
    (function() {
      "use strict";
      const CFG = ${JSON.stringify(INJECT_CONFIG)};
      const P = CFG.persona;
      const SPOOFING = (P.TYPE === "SPOOF");
      
      const RNG = (function(seed) {
          let s = seed;
          return {
             next: function() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; },
             bool: function() { return this.next() > 0.5; },
             noise: function(val, range) { return val + (this.next() * range * 2 - range); },
             pick: function(arr) { return arr[Math.floor(this.next() * arr.length)]; }
          };
      })(CFG.seed);

      const ProxyGuard = (function() {
          const toStringMap = new WeakMap();
          const nativeToString = Function.prototype.toString;
          const safeToString = function() {
              if (toStringMap.has(this)) return toStringMap.get(this);
              return nativeToString.apply(this, arguments);
          };
          toStringMap.set(safeToString, "function toString() { [native code] }");
          try { Function.prototype.toString = safeToString; } catch(e) {}

          return {
             protect: function(native, custom) {
                 const p = new Proxy(custom, {
                     apply: (t, th, a) => { try{return Reflect.apply(t,th,a)}catch(e){return Reflect.apply(native,th,a)} },
                     construct: (t, a, n) => { try{return Reflect.construct(t,a,n)}catch(e){return Reflect.construct(native,a,n)} },
                     get: (t, k) => Reflect.get(t, k)
                 });
                 const name = native.name || "";
                 toStringMap.set(p, "function " + name + "() { [native code] }");
                 toStringMap.set(custom, "function " + name + "() { [native code] }");
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
                 Object.defineProperties(N, {
                     'platform': {get: () => P.PLATFORM},
                     'maxTouchPoints': {get: () => 0},
                     'hardwareConcurrency': {get: () => P.CONCURRENCY},
                     'deviceMemory': {get: () => P.MEMORY},
                     'userAgent': {get: () => P.UA},
                     'appVersion': {get: () => P.UA.replace("Mozilla/", "")} 
                 });

                 if (win.screen && P.SCREEN_FEATURES) {
                     const SF = P.SCREEN_FEATURES;
                     Object.defineProperties(win.screen, {
                         'colorDepth': {get: () => SF.depth},
                         'pixelDepth': {get: () => SF.depth}
                     });
                     if ('devicePixelRatio' in win) {
                         Object.defineProperty(win, 'devicePixelRatio', {get: () => SF.pixelRatio});
                     }
                 }

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
                            const spoofed = {
                                architecture: "x86",
                                bitness: "64",
                                brands: this.brands,
                                mobile: false,
                                model: "",
                                platform: "macOS",
                                platformVersion: "10.15.7",
                                uaFullVersion: P.FULL_VERSION,
                                fullVersionList: [
                                    {brand: "Not(A:Brand", version: "99.0.0.0"}, 
                                    {brand: "Google Chrome", version: P.FULL_VERSION}, 
                                    {brand: "Chromium", version: P.FULL_VERSION}
                                ]
                            };
                            const res = {};
                            if (Array.isArray(hints)) {
                                hints.forEach(h => { if (spoofed[h] !== undefined) res[h] = spoofed[h]; });
                            }
                            res.brands = this.brands; res.mobile = this.mobile; res.platform = this.platform;
                            return Promise.resolve(res);
                         }
                     };
                     Object.defineProperty(N, 'userAgentData', {get: () => uaData});
                 }
             }
             if ('webdriver' in N) delete N.webdriver;
         },

         // [V5.38] Threat-Model WebRTC Filtering
         webrtc: function(win) {
             if (!win.RTCPeerConnection) return;
             const OrigRTC = win.RTCPeerConnection;
             
             win.RTCPeerConnection = function(config) {
                 const pc = new OrigRTC(config);
                 const origAddEL = pc.addEventListener;
                 
                 const isSafeCandidate = (c) => {
                     if (!c || typeof c !== 'string') return true;
                     
                     // 1. Allow mDNS (Standard & Safe)
                     if (/\.local/i.test(c)) return true;
                     
                     // 2. Block Private IPv4 (Highest Risk)
                     if (/(^| )192\.168\.|(^| )10\.|(^| )172\.(1[6-9]|2[0-9]|3[0-1])\./.test(c)) return false;
                     
                     // 3. Block IPv6 Host Candidates (High Risk of MAC Leak / Bypass VPN)
                     // If it's a host candidate containing a colon, it's IPv6.
                     if (/typ host/i.test(c) && /:/.test(c)) return false;
                     
                     // 4. Allow Public IPv4 Host (Usually VPN Interface)
                     // This restores P2P connectivity for users behind VPNs.
                     
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
                                 label = counts[d.kind] === 0 ? baseLabel : `${baseLabel} (${counts[d.kind] + 1})`;
                                 counts[d.kind]++;
                             }
                         }
                         return { deviceId: d.deviceId, kind: d.kind, label: label, groupId: d.groupId };
                     });
                 });
             });
         },

         canvas: function(win) {
             const applyNoise = (data, w, h) => {
                 for(let i=0; i<data.length; i+=4) {
                     if (i%CFG.noise.canvas === 0) {
                        const n = RNG.bool() ? 1 : -1;
                        data[i] = Math.max(0, Math.min(255, data[i]+n));
                     }
                 }
             };
             try {
                [win.CanvasRenderingContext2D, win.OffscreenCanvasRenderingContext2D].forEach(ctx => {
                    if(!ctx) return;
                    ProxyGuard.hook(ctx.prototype, 'getImageData', (orig) => function(x,y,w,h) {
                        try {
                           const r = orig.apply(this, arguments);
                           if (w>10 && h>10 && w*h < 640000) applyNoise(r.data, w, h);
                           return r;
                        } catch(e) { return orig.apply(this, arguments); }
                    });
                    ProxyGuard.hook(ctx.prototype, 'measureText', (orig) => function(text) {
                        const m = orig.apply(this, arguments);
                        if (m && 'width' in m) {
                            const oldWidth = m.width;
                            const noise = RNG.noise(0, CFG.noise.text);
                            Object.defineProperty(m, 'width', { get: () => oldWidth + noise });
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
                     
                     const getParam = glClass.prototype.getParameter;
                     ProxyGuard.hook(glClass.prototype, 'getParameter', (orig) => function(p) {
                         if (p === 37445) return P.VENDOR;
                         if (p === 37446) return P.RENDERER;
                         if (SPOOFING && P.WEBGL_CAPS && (p in P.WEBGL_CAPS)) {
                             return P.WEBGL_CAPS[p];
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
             } catch(e){}
         }
      };

      const inject = function(win) {
          if(!win) return;
          Modules.hardware(win);
          Modules.webrtc(win);
          Modules.media(win);
          Modules.canvas(win);
          Modules.webgl(win);
          Modules.audio(win);
      };

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
