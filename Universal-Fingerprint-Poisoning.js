/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.50-Regex-Exclusion (The Invisible Shield)
 * @description [正則排除版] 專為「阻擋 LINE 廣告且不影響連線」設計。
 * ----------------------------------------------------------------------------
 * 1. [Exclusion] 此版本必須配合 Surge 模組中的正則表達式使用，以達成 LINE 零接觸。
 * 2. [Mode] 精準掃描所有策略組，偵測「Shopping/購物/🛍️」關鍵字。
 * 3. [Identity] 確保 Protection = macOS Chrome 124；Shopping = 原生 iPhone 17.5。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 安全閘口：再次確認 LINE 網域排除 (避免配置失誤)
  // ============================================================================
  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  if (currentUrl.includes("line.me") || currentUrl.includes("line-apps") || currentUrl.includes("line-scdn")) {
    $done({});
    return;
  }

  // ============================================================================
  // 1. 全域模式偵測與身份定義
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection";

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
  // Phase A: HTTP Request (標頭覆寫)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // 清除 User-Agent 相關標頭，防止 Win10 殘留
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      // 購物模式：強制恢復 iPhone 身份
      headers['User-Agent'] = UA_IPHONE;
    } else {
      // 防護模式：偽裝為 macOS
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (指紋注入)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    const cType = (headers['Content-Type'] || headers['content-type'] || "").toLowerCase();

    // 只對 HTML 注入
    if (!body || (cType && !cType.includes("html"))) { $done({}); return; }
    if (body.includes("__FP_SHIELD_V450__")) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    const injection = `
    <!-- __FP_SHIELD_V450__ -->
    <div id="fp-v4-badge" style="position:fixed!important;bottom:15px!important;left:15px!important;z-index:2147483647!important;background:${badgeColor}!important;color:#fff!important;padding:7px 14px!important;border-radius:10px!important;font-family:-apple-system,sans-serif!important;font-size:12px!important;font-weight:bold!important;pointer-events:none!important;box-shadow:0 6px 15px rgba(0,0,0,0.4)!important;transition:opacity 1s!important;opacity:1!important;">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const b = document.getElementById('fp-v4-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 1000); } }, 4000);
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

    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    Object.keys(headers).forEach(k => { if (k.toLowerCase().includes('content-security-policy')) delete headers[k]; });
    
    $done({ body, headers });
  }
})();

