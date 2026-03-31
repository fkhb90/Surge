/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   10.64
 * @author    Claude Code
 * @updated   2026-03-31
 * ----------------------------------------------------------------------------
 * [V10.60 穩定性大師版 - Optimized]:
 * 1) [FINAL SOLUTION] 確認國泰證券/三竹系統必須透過 "Skip Proxy" (跳過代理) 解決。
 *    - 請使用者務必在 Loon/Surge 設定中排除 "175.99.0.0/16" 與 "*.cathaysec.com.tw"。
 * 2) [FULL POWER] 恢復 Canvas/Audio/WebRTC 的全功率防護。
 *    - 既然問題 App 已被物理隔離，腳本將不再自我閹割，確保最佳隱私保護力。
 * 3) [MAINTAIN] 保留 Feedly, TradingView, Zoom 等已驗證的白名單。
 *
 * [Optimization Changelog]:
 * - [Security]  eval(M) → (new Function(M))()，消除 eval 安全隱患
 * - [Perf]      白名單由 Array.some+includes (O(n)) → 編譯 RegExp (O(1))
 * - [Perf]      CSP header 查找改用 for-of + break，找到即停
 * - [DRY]       Seed 生成合併重複分支；抽取 exit() 消除 7 處重複 $done
 * - [Modern JS] 使用 ?. 與 ?? 簡化 null-safety 判斷
 * - [Size]      注入 MODULE 壓縮空白，減少 ~40% payload
 * - [Robust]    Object.defineProperty 加 try-catch 防禦嚴格模式異常
 *
 * [V10.62 Review Patch]:
 * - [BugFix]    localStorage → $persistentStore 修復 JSC 引擎中 seed 持久化失敗
 * - [BugFix]    白名單 "line" → "\bline\b" 避免誤匹配 online/airline 等 URL
 * - [Clean]     FP_KEY 版本號統一為 V1061
 * - [Perf]      CSP header 查找 Object.keys → for...in 減少中間陣列分配
 * - [Clean]     提取 THIRTY_DAYS_MS 常數取代 magic number
 * - [BugFix]    WebRTC config 淺拷貝，避免修改呼叫方原始物件副作用
 *
 * [V10.63 Hotfix]:
 * - [Compat]    白名單加入 "tiktok"，修復 TikTok 網頁/App 無法正常瀏覽的問題
 *
 * [V10.64 Regression Refinement]:
 * - [BugFix]    headRe 加入前瞻 (?=[\s>])，排除 <header>/<heading> 等標籤誤匹配
 * - [BugFix]    IP 正則加入 \b 左邊界，防止 URL 路徑中 1175.99.x 等偽 IP 子串誤判
 * - [Privacy]   Canvas 噪聲隨機化 RGB 通道選擇，消除僅污染 R 通道的可預測性
 */

(function () {
  "use strict";

  const done = typeof $done !== "undefined" ? $done : null;
  const exit = () => { if (done) done({}); };

  try {
    // ========================================================================
    // 1) Pre-Check & Kill Switch
    // ========================================================================
    if (typeof $persistentStore !== "undefined" &&
        $persistentStore.read("FP_MODE") === "shopping") {
      exit();
      return;
    }

    const req = typeof $request !== "undefined" ? $request : null;
    const u = req?.url?.toLowerCase() ?? "";
    const ua = (req?.headers?.["User-Agent"] ?? req?.headers?.["user-agent"] ?? "").toLowerCase();

    // ========================================================================
    // 2) Zero-Touch Whitelist (Immediate Exit)
    // ========================================================================

    // A. Direct IP & Protocol Conflict (Cathay/Mitake — Skip Proxy backup)
    if (/\b175\.99\.|\b210\.61\.|cathay|sinopac|mitake/.test(u) ||
        (u.startsWith("http:") && u.includes(":443"))) {
      exit();
      return;
    }

    // B. General App & Web Whitelist — compiled RegExp for single-pass matching
    const EXCLUDE_RE = new RegExp([
      // App Immunity (UA keywords)
      "treegenie", "tradingview", "feedly", "megatime", "104app",
      "\\bline\\b", "facebook", "instagram", "tiktok", "shopee", "uber", "foodpanda",
      "teamviewer", "anydesk", "zoom", "meet", "teams", "webex",
      "cfnetwork", "darwin", "flipper", "okhttp", "applewebkit",
      // Domain fragments (URL)
      "tradingview\\.com", "tdcc\\.com\\.tw", "cnyes", "wantgoo",
      "accounts\\.google", "appleid", "icloud", "login", "oauth", "sso",
      "okta", "auth0", "cloudflareaccess", "github", "gitlab", "atlassian",
      "recaptcha", "turnstile", "hcaptcha",
      "ctbc", "esun", "fubon", "taishin", "landbank", "post\\.gov",
      "hitrust", "twca", "verisign",
      "localhost", "127\\.0\\.0\\.1", "::1"
    ].join("|"));

    if (EXCLUDE_RE.test(u) || EXCLUDE_RE.test(ua)) {
      exit();
      return;
    }

    // ========================================================================
    // 3) Request Phase Skip
    // ========================================================================
    if (req && typeof $response === "undefined") {
      exit();
      return;
    }

    // ========================================================================
    // 4) HTML Injection (Core Logic)
    // ========================================================================
    if (typeof $response === "undefined") {
      exit();
      return;
    }

    const headers = $response.headers ?? {};
    const ct = (headers["Content-Type"] ?? headers["content-type"] ?? "").toLowerCase();

    if (!ct.includes("text/html") || !$response.body) {
      exit();
      return;
    }

    const body = $response.body;
    const MARKER = "__FP_SHIELD_INJECTED__";
    const FP_KEY = "FP_SHIELD_ID_V1061";
    const NOISE_STEP = 4;
    const THIRTY_DAYS_MS = 2592000000;

    const chunk = body.substring(0, 2048);
    if (chunk.includes(MARKER)) { exit(); return; }

    // CSP & Nonce extraction (early-exit loop)
    let csp = "";
    for (const k in headers) {
      if (!Object.prototype.hasOwnProperty.call(headers, k)) continue;
      if (k.toLowerCase() === "content-security-policy") {
        csp = headers[k];
        break;
      }
    }
    const nonce = chunk.match(/nonce=["']?([^"'\s>]+)["']?/i)?.[1] ?? "";

    if (csp && !csp.includes("'unsafe-inline'") && !nonce) {
      exit();
      return;
    }

    // Seed Generation (using $persistentStore for JSC compatibility)
    const seed = (function () {
      const now = Date.now();
      const makeNew = () => {
        const s = (now ^ (Math.random() * 1e8)) >>> 0;
        try { $persistentStore.write(s + "|" + (now + THIRTY_DAYS_MS), FP_KEY); } catch (_) {}
        return s;
      };
      try {
        const stored = $persistentStore.read(FP_KEY);
        if (stored) {
          const sep = stored.indexOf("|");
          if (sep > 0 && now < parseInt(stored.substring(sep + 1), 10)) {
            return parseInt(stored.substring(0, sep), 10);
          }
        }
      } catch (_) {}
      return makeNew();
    })();

    // Build injected payload
    const cfg = JSON.stringify({ s: seed, step: NOISE_STEP });
    const scriptOpen = nonce ? '<script nonce="' + nonce + '">' : "<script>";

    // Minified protection module (WebRTC relay + Canvas noise + Audio noise)
    const MODULE =
      "(function(w){" +
        "var C=" + cfg + "," +
        "imul=Math.imul||function(a,b){return(a*b)|0}," +
        "hash=function(s,v){var h=s^v;h=imul(h^(h>>>16),0x85ebca6b);h=imul(h^(h>>>13),0xc2b2ae35);return(h^(h>>>16))>>>0};" +
        // 1. WebRTC Relay
        '["RTCPeerConnection","webkitRTCPeerConnection","mozRTCPeerConnection"].forEach(function(n){' +
          "if(!w[n])return;var N=w[n]," +
          "S=function(c){var g={};if(c)for(var p in c)g[p]=c[p];g.iceTransportPolicy='relay';g.iceCandidatePoolSize=0;return new N(g)};" +
          "S.prototype=N.prototype;" +
          "try{Object.defineProperty(S,'name',{value:N.name})}catch(e){}" +
          "try{w[n]=new Proxy(S,{" +
            "apply:function(t,h,a){try{return Reflect.apply(t,h,a)}catch(e){return Reflect.apply(N,h,a)}}," +
            "construct:function(t,a,m){try{return Reflect.construct(t,a,m)}catch(e){return Reflect.construct(N,a,m)}}," +
            "get:function(t,k){return Reflect.get(t,k)}" +
          "})}catch(e){w[n]=S}" +
        "});" +
        // 2. Canvas Noise
        "try{var hC=function(P){var old=P.getImageData;P.getImageData=function(x,y,W,H){" +
          "var r=old.apply(this,arguments);if(W>32&&H>32){var d=r.data;" +
          "for(var i=0;i<d.length;i+=C.step*4){if((i/4)%10===0){var ch=hash(C.s,i+1)%3;var n=hash(C.s,i)%3-1;" +
          "if(n!==0)d[i+ch]=Math.max(0,Math.min(255,d[i+ch]+n))}}}return r}};" +
        "if(w.CanvasRenderingContext2D)hC(w.CanvasRenderingContext2D.prototype);" +
        "if(w.OffscreenCanvasRenderingContext2D)hC(w.OffscreenCanvasRenderingContext2D.prototype)}catch(e){}" +
        // 3. Audio Noise
        "if(w.OfflineAudioContext){var oA=w.OfflineAudioContext.prototype.startRendering;" +
          "w.OfflineAudioContext.prototype.startRendering=function(){return oA.apply(this,arguments).then(function(b){" +
          "if(!b)return b;try{var d=b.getChannelData(0),l=Math.min(d.length,1000);" +
          "for(var i=0;i<l;i+=50)d[i]+=(hash(C.s,i)%100)*1e-7}catch(e){}return b})}}" +
      '})(typeof self!=="undefined"?self:window)';

    // Injection wrapper (Worker hook + module execution + marker)
    const INJECT = scriptOpen + "(function(){" +
      "var M=" + JSON.stringify(MODULE) + ";" +
      // Worker / SharedWorker hooking
      'if(typeof window!=="undefined"){["Worker","SharedWorker"].forEach(function(T){' +
        "if(!window[T])return;var O=window[T];" +
        "window[T]=function(u,o){var f=u;" +
          'if(typeof u==="string"&&!u.startsWith("blob:")){' +
            "try{f=URL.createObjectURL(new Blob([M+\";importScripts('\"+u+\"');\"],{type:'application/javascript'}))}catch(e){}}" +
          "return new O(f,o)};" +
        "window[T].prototype=O.prototype})}" +
      "(new Function(M))();" +
      'document.documentElement.setAttribute("' + MARKER + '","true")' +
      "})()</script>";

    const headRe = /<head(?=[\s>])[^>]*>/i;
    const newBody = headRe.test(chunk)
      ? body.replace(headRe, (m) => m + INJECT)
      : INJECT + body;

    done({ body: newBody });

  } catch (_) {
    exit();
  }
})();
