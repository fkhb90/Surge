/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   4.20-State-Sync (Mode Switching Fix)
 * @description [狀態同步加強版] 解決購物模式切換失敗問題，增強策略組識別精準度。
 * ----------------------------------------------------------------------------
 * 1. [Fix] 模式識別：改用不分大小寫的正則比對，確保 🛍️ Shopping 等名稱能正確識別。
 * 2. [Header] 深度覆寫：優化 Request 階段標頭刪除順序，防止殘留。
 * 3. [UI] 狀態校準：確保 Shopping Mode 下 JS 注入完全靜默，僅顯示徽章提醒。
 * ----------------------------------------------------------------------------
 */

(function () {
  "use strict";

  // ============================================================================
  // 0. 身份定義與 GM (Golden Master) 參數
  // ============================================================================
  const UA_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  let mode = "protection"; // 預設：防護模式

  // ============================================================================
  // 1. 強化版模式偵測引擎
  // ============================================================================
  try {
    if (typeof $surge !== 'undefined' && typeof $surge.selectGroupDetails === 'function') {
      const groupData = $surge.selectGroupDetails();
      if (groupData && groupData.decisions && groupData.decisions['FP-Mode']) {
        const selection = groupData.decisions['FP-Mode'];
        // 使用不分大小寫的正則比對，並涵蓋中文與 Emoji 常用詞
        if (/[Ss]hopping|購物|Safe|Bypass/.test(selection)) {
          mode = "shopping";
        }
      }
    }
  } catch (e) {
    // 發生錯誤時保持預設模式，避免腳本中斷導致網頁白屏
  }

  // Argument 覆蓋優先級最高
  if (typeof $argument === "string") {
    if ($argument.indexOf("mode=shopping") !== -1) mode = "shopping";
    if ($argument.indexOf("mode=protection") !== -1) mode = "protection";
  }

  const IS_SHOPPING = (mode === "shopping");

  // ============================================================================
  // Phase A: HTTP Request (請求攔截 - 確保 Header 同步)
  // ============================================================================
  if (typeof $request !== 'undefined' && typeof $response === 'undefined') {
    const headers = $request.headers;
    
    // 強力清除：移除所有可能干擾的 User-Agent 與 Client Hints 標頭
    const keys = Object.keys(headers);
    keys.forEach(k => {
      const l = k.toLowerCase();
      if (l === 'user-agent' || l.startsWith('sec-ch-ua')) delete headers[k];
    });

    if (IS_SHOPPING) {
      // 購物模式：寫入原生 iPhone UA，不填寫 Client Hints 讓瀏覽器呈現最自然狀態
      headers['User-Agent'] = UA_IPHONE;
    } else {
      // 防護模式：寫入 macOS UA 並補齊電腦版 Client Hints
      headers['User-Agent'] = UA_MAC;
      headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="124", "Google Chrome";v="124"';
      headers['sec-ch-ua-mobile'] = "?0";
      headers['sec-ch-ua-platform'] = '"macOS"';
    }

    $done({ headers });
    return;
  }

  // ============================================================================
  // Phase B: HTTP Response (回應注入 - 確保 UI 與指紋同步)
  // ============================================================================
  if (typeof $response !== 'undefined') {
    let body = $response.body;
    const headers = $response.headers || {};
    
    // 檢查 Body 是否存在且為 HTML (放寬判定條件以增強穩定性)
    if (!body) { $done({}); return; }
    
    const marker = "__FP_SHIELD_V420__";
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
      
      // 關鍵：若識別為購物模式，停止所有 JS 層面的指紋干擾
      if (${IS_SHOPPING}) return;

      const safeDefine = (o, p, d) => { try { Object.defineProperty(o, p, d); } catch(e) {} };
      
      // macOS 擬態注入
      safeDefine(navigator, 'platform', { get: () => 'MacIntel' });
      safeDefine(navigator, 'hardwareConcurrency', { get: () => 10 });
      safeDefine(navigator, 'deviceMemory', { get: () => 12 });

      // Canvas 輕量混淆：僅對大面積畫布進行極微小的像素偏移，確保功能正常
      const orig = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
        const res = orig.apply(this, arguments);
        if (w > 20 && h > 20) { res.data[0] = res.data[0] ^ 1; }
        return res;
      };
    })();
    </script>
    `;

    // 優先注入順序：<head> -> <html> -> 直接置頂
    if (/<head[^>]*>/i.test(body)) {
      body = body.replace(/<head[^>]*>/i, m => m + injection);
    } else if (/<html[^>]*>/i.test(body)) {
      body = body.replace(/<html[^>]*>/i, m => m + injection);
    } else {
      body = injection + body;
    }

    // 移除 CSP 標頭以確保注入腳本能正常執行
    Object.keys(headers).forEach(k => {
      if (k.toLowerCase().includes('content-security-policy')) delete headers[k];
    });

    $done({ body, headers });
  }
})();

