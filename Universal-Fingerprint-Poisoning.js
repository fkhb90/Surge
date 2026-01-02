/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.30-Tunneling (Critical Fix)
 * @description [通訊隧道版] 徹底解決 LINE 斷線與購物模式切換失效問題。
 * ----------------------------------------------------------------------------
 * 1. [Fix] 模式偵測：遍歷所有策略組決策，不再依賴固定名稱，精準捕捉 Shopping 狀態。
 * 2. [Whitelist] LINE 核彈級放行：在腳本最頂層加入強制退出，確保不干擾通訊。
 * 3. [Sync] 身份校準：防護模式 (macOS Chrome 124) / 購物模式 (iPhone iOS 17.5)。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 1. 最高優先權：通訊軟體物理放行 (防止斷線)
  // ============================================================================
  const rawUrl = (typeof $request !== 'undefined') ? $request.url : "";
  const BYPASS_DOMAINS = ["line-apps.com", "line.me", "line-scdn.net", "apple.com", "icloud.com"];
  if (BYPASS_DOMAINS.some(d => rawUrl.includes(d))) {
    $done({});
    return;
  }

  // ============================================================================
  // 2. 模式偵測核心 (全域掃描器)
  // ============================================================================
  let mode = "protection";
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  try {
    if (typeof $surge !== 'undefined' && $surge.selectGroupDetails) {
      const decisions = $surge.selectGroupDetails().decisions;
      // 遍歷所有策略組，尋找關鍵字
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
  // Phase A: HTTP Request (網路層攔截)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // 強力清洗
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      headers['User-Agent'] = UA_IPHONE;
    } else {
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (瀏覽器層注入)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    
    if (!body || body.includes("__FP_SHIELD_V430__")) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    const injection = `
    <!-- __FP_SHIELD_V430__ -->
    <div id="fp-v4-badge" style="position:fixed!important;bottom:15px!important;left:15px!important;z-index:2147483647!important;background:${badgeColor}!important;color:#fff!important;padding:7px 14px!important;border-radius:10px!important;font-family:-apple-system,sans-serif!important;font-size:12px!important;font-weight:bold!important;pointer-events:none!important;box-shadow:0 6px 15px rgba(0,0,0,0.4)!important;transition:opacity 0.8s!important;opacity:1!important;">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const b = document.getElementById('fp-v4-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 800); } }, 4000);
      
      if (${IS_SHOPPING}) return;

      const sd = (o, p, d) => { try { Object.defineProperty(o, p, d); } catch(e) {} };
      sd(navigator, 'platform', { get: () => 'MacIntel' });
      sd(navigator, 'hardwareConcurrency', { get: () => 12 });
      sd(navigator, 'deviceMemory', { get: () => 16 });

      const orig = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function() {
        const res = orig.apply(this, arguments);
        if (res.width > 20) { res.data[0] = res.data[0] ^ 1; }
        return res;
      };
    })();
    </script>
    `;

    if (/<head[^>]*>/i.test(body)) body = body.replace(/<head[^>]*>/i, m => m + injection);
    else body = injection + body;

    Object.keys(headers).forEach(k => { if (k.toLowerCase().includes('content-security-policy')) delete headers[k]; });
    $done({ body, headers });
  }
})();

