/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.10-Precision (Logic Recovery)
 * @description [邏輯精準版] 修復策略組讀取失敗導致的失效問題，並強制復原盾牌 UI。
 * ----------------------------------------------------------------------------
 * 1. [Fix] 策略組讀取失敗時，預設進入 Protection 模式，確保防護不中斷。
 * 2. [UI] 強化注入路徑：若無法注入 <head>，則強制插入 <html> 最前方。
 * 3. [UA] 同步更新至 iOS 17.5 與 macOS Chrome 124 特徵。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 全域配置與身份定義
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection"; // 預設模式

  // 深度偵測 Surge 策略組狀態
  try {
    if (typeof $surge !== 'undefined' && typeof $surge.selectGroupDetails === 'function') {
      const groupData = $surge.selectGroupDetails();
      if (groupData && groupData.decisions && groupData.decisions['FP-Mode']) {
        const selection = groupData.decisions['FP-Mode'];
        if (selection.includes('Shopping') || selection.includes('購物')) {
          mode = "shopping";
        }
      }
    }
  } catch (e) {
    // 保持預設 protection
  }

  // Argument 覆蓋優先
  if (typeof $argument === "string") {
    if ($argument.includes("mode=shopping")) mode = "shopping";
    if ($argument.includes("mode=protection")) mode = "protection";
  }

  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (網路層攔截)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // 清除既有 UA 相關標頭
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
  // Phase B: HTTP Response (瀏覽器層注入)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    if (!body) { $done({}); return; }

    const marker = "__FP_SHIELD_V410__";
    if (body.includes(marker)) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    const injection = `
    <!-- ${marker} -->
    <div id="fp-v4-badge" style="position:fixed!important;bottom:12px!important;left:12px!important;z-index:2147483647!important;background:${badgeColor}!important;color:#fff!important;padding:6px 12px!important;border-radius:8px!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important;font-size:11px!important;font-weight:bold!important;pointer-events:none!important;box-shadow:0 4px 12px rgba(0,0,0,0.3)!important;transition:opacity 0.6s!important;opacity:1!important;">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const b = document.getElementById('fp-v4-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 600); } }, 4000);
      
      if (${IS_SHOPPING}) return; // 購物模式停止 JS 干擾

      const safeDefine = (o, p, d) => { try { Object.defineProperty(o, p, d); } catch(e) {} };
      safeDefine(navigator, 'platform', { get: () => 'MacIntel' });
      safeDefine(navigator, 'hardwareConcurrency', { get: () => 12 });
      safeDefine(navigator, 'deviceMemory', { get: () => 16 });

      // Canvas 噪點注入 (使用更隱蔽的像素偏移)
      const orig = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const res = orig.apply(this, arguments);
        if (w > 10 && h > 10) { res.data[0] = res.data[0] ^ 1; }
        return res;
      };
    })();
    </script>
    `;

    // 強制注入邏輯：不論有沒有 head，都塞進去
    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, m => m + injection);
    } else if (/<html[^>]*>/i.test(body)) {
      body = body.replace(/<html[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    $done({ body });
  }
})();

