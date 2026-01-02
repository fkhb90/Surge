/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.21-Communication-Safe (Line Whitelist)
 * @description [通訊軟體特化版] 將 Line 完整納入硬白名單，確保通訊穩定與支付安全。
 * ----------------------------------------------------------------------------
 * 1. [Whitelist] Line 排除：新增 line.me, line-apps.com, line-scdn.net 至硬排除名單。
 * 2. [Core] 狀態同步：保持 V4.20 的策略組連動與不分大小寫正則比對。
 * 3. [UA] 強制覆寫：防護模式下鎖定 macOS Chrome 124，購物模式下鎖定 iPhone iOS 17.5。
 * ----------------------------------------------------------------------------
 * @note Jerry，建議切換模式後仍需刷新頁面以更新 User-Agent。
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 身份定義與 GM (Golden Master) 參數
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection";

  // ============================================================================
  // 1. 模式偵測引擎 (與 Surge 策略組連動)
  // ============================================================================
  try {
    if (typeof $surge !== 'undefined' && typeof $surge.selectGroupDetails === 'function') {
      const groupData = $surge.selectGroupDetails();
      if (groupData && groupData.decisions && groupData.decisions['FP-Mode']) {
        const selection = groupData.decisions['FP-Mode'];
        if (/[Ss]hopping|購物|Safe|Bypass/.test(selection)) {
          mode = "shopping";
        }
      }
    }
  } catch (e) {}

  if (typeof $argument === "string") {
    if ($argument.indexOf("mode=shopping") !== -1) mode = "shopping";
    if ($argument.indexOf("mode=protection") !== -1) mode = "protection";
  }

  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (請求攔截 - Header 處理)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    
    // [V4.21 新增] 快速網域檢查，減少對通訊軟體的干擾
    const currentUrl = $request.url.toLowerCase();
    const lineKeywords = ["line.me", "line-apps.com", "line-scdn.net", "line-static.net", "line-pay"];
    if (lineKeywords.some(k => currentUrl.includes(k))) {
        $done({});
        return;
    }

    const headers = $request.headers;
    const keys = Object.keys(headers);
    keys.forEach(k => {
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
  // Phase B: HTTP Response (回應注入 - UI 與指紋)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    
    if (!body) { $done({}); return; }
    
    // [V4.21 新增] 硬白名單檢查 (網域層級)
    const HardExclusions = (() => {
      const list = [
        "apple.com", "icloud.com", "mzstatic.com", "crashlytics.com", "firebaseio.com", 
        "line.me", "line-apps.com", "line-scdn.net", "line-static.net", "line-pay",
        "paypal.com", "stripe.com", "ecpay.com.tw", "esunbank.com.tw", "ctbcbank.com", 
        "captive.apple.com"
      ];
      return { check: (url) => { const u = url.toLowerCase(); return list.some(k => u.includes(k)); } };
    })();

    if (HardExclusions.check($request.url)) { $done({}); return; }

    const marker = "__FP_SHIELD_V421__";
    if (body.indexOf(marker) !== -1) { $done({}); return; }

    const badgeColor = IS_SHOPPING ? "#AF52DE" : "#007AFF";
    const badgeText = IS_SHOPPING ? "FP: Shopping" : "FP: macOS";

    const injection = `
    <!-- ${marker} -->
    <div id="fp-v4-badge" style="position:fixed!important;bottom:15px!important;left:15px!important;z-index:2147483647!important;background:${badgeColor}!important;color:#fff!important;padding:7px 14px!important;border-radius:10px!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important;font-size:12px!important;font-weight:bold!important;pointer-events:none!important;box-shadow:0 6px 15px rgba(0,0,0,0.4)!important;transition:opacity 0.8s!important;opacity:1!important;">${badgeText}</div>
    <script>
    (function() {
      "use strict";
      const b = document.getElementById('fp-v4-badge');
      setTimeout(() => { if(b) { b.style.opacity='0'; setTimeout(()=>b.remove(), 800); } }, 4500);
      if (${IS_SHOPPING}) return;
      const safeDefine = (o, p, d) => { try { Object.defineProperty(o, p, d); } catch(e) {} };
      safeDefine(navigator, 'platform', { get: () => 'MacIntel' });
      safeDefine(navigator, 'hardwareConcurrency', { get: () => 10 });
      safeDefine(navigator, 'deviceMemory', { get: () => 12 });
      const orig = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const res = orig.apply(this, arguments);
        if (w > 20 && h > 20) { res.data[0] = res.data[0] ^ 1; }
        return res;
      };
    })();
    </script>
    `;

    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/ head[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    Object.keys(headers).forEach(k => {
      if (k.toLowerCase().includes('content-security-policy')) delete headers[k];
    });

    $done({ body, headers });
  }
})();

