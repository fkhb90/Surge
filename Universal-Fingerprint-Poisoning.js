/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.22-Communication-Focus (Line & Switch Fix)
 * @description [通訊與切換優化版] 修正購物模式切換失效，並將 LINE 核心網域納入硬白名單。
 * ----------------------------------------------------------------------------
 * 1. [Whitelist] LINE 強制排除：加入 legy.line-apps.com 及其家族網域。
 * 2. [Fix] 模式切換：強化策略組偵測邏輯，解決「點選購物模式卻未生效」的問題。
 * 3. [Sync] 購物模式 = 真實 iPhone 身份；防護模式 = 強力 macOS 身份。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 身份定義 (Golden Master Identities)
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
      if (groupData && groupData.decisions) {
        // 嘗試從 FP-Mode 或含有「指紋/模式」字眼的策略組獲取選中項
        let selection = groupData.decisions['FP-Mode'];
        if (!selection) {
            const fuzzyKey = Object.keys(groupData.decisions).find(k => k.includes('FP-Mode') || k.includes('指紋'));
            if (fuzzyKey) selection = groupData.decisions[fuzzyKey];
        }
        
        // 強力識別：包含 🛍️、Shopping 或 購物 關鍵字即視為 Shopping Mode
        if (selection && /[Ss]hopping|購物|Safe|Bypass|🛍️/.test(selection)) {
          mode = "shopping";
        }
      }
    }
  } catch (e) {}

  // Argument 參數優先覆蓋
  if (typeof $argument === "string") {
    if ($argument.indexOf("mode=shopping") !== -1) mode = "shopping";
    if ($argument.indexOf("mode=protection") !== -1) mode = "protection";
  }

  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (請求攔截 - 網路層)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    
    // [V4.22] LINE 全系列硬白名單 - 發現即撤退，保證通訊不中斷
    const currentUrl = $request.url.toLowerCase();
    const hardExclusions = [
        "line.me", "line-apps.com", "line-scdn.net", "line-static.net", 
        "line-pay", "legy.line-apps.com", "apple.com", "icloud.com"
    ];
    
    if (hardExclusions.some(k => currentUrl.includes(k))) {
        $done({});
        return;
    }

    const headers = $request.headers;
    // 清理所有 User-Agent 變體
    Object.keys(headers).forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      // 購物模式：寫入標準 iPhone 17.5 UA，恢復純淨
      headers['User-Agent'] = UA_IPHONE;
    } else {
      // 防護模式：寫入 macOS Chrome 124 UA
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"';
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (回應注入 - 瀏覽器層)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    
    if (!body) { $done({}); return; }
    
    // 硬白名單 (網域檢查) - Response 階段
    const list = [
        "line.me", "line-apps.com", "line-scdn.net", "line-static.net", "line-pay", 
        "legy.line-apps.com", "apple.com", "icloud.com", "mzstatic.com", "paypal.com"
    ];
    if (list.some(k => $request.url.toLowerCase().includes(k))) { $done({}); return; }

    const marker = "__FP_SHIELD_V422__";
    if (body.indexOf(marker) !== -1) { $done({}); return; }

    // UI 徽章顏色連動
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
      
      // 關鍵：購物模式下終止所有 JS 指紋混淆
      if (${IS_SHOPPING}) return;

      const safeDefine = (o, p, d) => { try { Object.defineProperty(o, p, d); } catch(e) {} };
      
      // macOS 擬態
      safeDefine(navigator, 'platform', { get: () => 'MacIntel' });
      safeDefine(navigator, 'hardwareConcurrency', { get: () => 10 });
      safeDefine(navigator, 'deviceMemory', { get: () => 12 });

      // Canvas 輕量混淆
      const orig = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const res = orig.apply(this, arguments);
        if (w > 25 && h > 25) { res.data[0] = res.data[0] ^ 1; }
        return res;
      };
    })();
    </script>
    `;

    // 注入 HTML
    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    // 移除 CSP
    Object.keys(headers).forEach(k => {
      if (k.toLowerCase().includes('content-security-policy')) delete headers[k];
    });

    $done({ body, headers });
  }
})();

