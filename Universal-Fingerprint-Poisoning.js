/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.40-AdBlock-Compatible (Silent Bypass)
 * @description [廣告阻擋相容版] 確保 LINE 開啟 MitM 阻擋廣告時，本腳本完全不干擾通訊。
 * ----------------------------------------------------------------------------
 * 1. [Critical] LINE 絕對路徑：偵測到 line-apps/line.me 立即 $done({})。
 * 2. [Compatibility] 允許 LINE 廣告阻擋規則在同一個 MitM 環境下運作。
 * 3. [Logic] 完美同步 Shopping 與 Protection 模式切換。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 1. 核心隔離區：針對 LINE 實施零接觸策略 (Zero-Touch Policy)
  // ============================================================================
  const currentUrl = (typeof $request !== 'undefined') ? ($request.url || "") : "";
  const LINE_IDENTIFIERS = ["line.me", "line-apps", "line-scdn", "line-static"];
  
  // 即使開啟了 MitM，只要匹配到 LINE 相關網域，腳本立刻退出，不執行任何修改
  if (LINE_IDENTIFIERS.some(id => currentUrl.toLowerCase().includes(id))) {
    $done({});
    return;
  }

  // ============================================================================
  // 2. 身份定義與全域模式偵測
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection";

  try {
    if (typeof $surge !== 'undefined' && $surge.selectGroupDetails) {
      const decisions = $surge.selectGroupDetails().decisions;
      for (let key in decisions) {
        const val = decisions[key];
        // 捕捉包含 Shopping, 購物, 🛍️ 的選項
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
    
    // 清洗既有標頭，消除 Win10 殘留風險
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      // 購物模式：強制還原真實 iPhone 身份
      headers['User-Agent'] = UA_IPHONE;
    } else {
      // 防護模式：強力偽裝為 macOS
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"';
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
    const cType = (headers['Content-Type'] || headers['content-type'] || "").toLowerCase();

    // 僅處理 HTML 內容，避免損壞圖片或通訊數據
    if (!body || (cType && !cType.includes("html"))) { $done({}); return; }
    if (body.includes("__FP_SHIELD_V440__")) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    const injection = `
    <!-- __FP_SHIELD_V440__ -->
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
        if (res.width > 20) { res.data[res.data.length/2] = res.data[res.data.length/2] ^ 1; }
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

    // 移除 CSP 標頭以確保指紋徽章正常顯示
    Object.keys(headers).forEach(k => { if (k.toLowerCase().includes('content-security-policy')) delete headers[k]; });
    
    $done({ body, headers });
  }
})();

