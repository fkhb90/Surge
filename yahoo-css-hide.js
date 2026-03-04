/**
 * @name Yahoo Web Ad Hider (CSS Injection)
 * @version 2.0
 * @description 強制隱藏 Yahoo 新聞/股市網頁版留下的灰底廣告框（全面優化版）
 */

let body = $response.body;

// 定義要注入的強力 CSS
// 移除無效的 :contains() 選擇器，改用標準 CSS 屬性選擇器與 :has()
const hideCSS = `
<style id="yahoo-ad-hider">
  /* ===== 1. Gemini 廣告平台容器 ===== */
  .gemini-ad-node,
  .gemini-ad,
  div[class*="GeminiAd"],
  div[class*="gemini-ad"],
  div[class*="gemini_ad"],

  /* ===== 2. data 屬性標記的廣告 ===== */
  div[data-ylk*="sec:ad"],
  div[data-ylk*="ad_beacon"],
  div[data-ylk*="pkgt:ad"],
  div[data-ad],
  div[data-ad-type],
  div[data-darla],
  div[data-type="ad"],
  div[data-type="nativeAd"],
  [data-test-locator*="ad"],
  [data-testid*="ad-"],

  /* ===== 3. ID 命名模式 ===== */
  div[id*="ad-lrec"],
  div[id*="ad-mrec"],
  div[id*="ad-billboard"],
  div[id*="darla_ad"],
  div[id^="ad-"],
  div[id^="ads-"],
  div[id*="-ad-"],
  div[id*="_ad_"],
  #YDC-UH-ad,
  #slot_mba,
  #slot_mpu,

  /* ===== 4. Class 命名模式 ===== */
  div[class*="ad-container"],
  div[class*="ad-wrapper"],
  div[class*="ad-slot"],
  div[class*="ad_container"],
  div[class*="AdSlot"],
  div[class*="adBox"],
  div[class*="caas-da"],
  div[class*="native-ad"],
  div[class*="NativeAd"],
  div[class*="stream-ad"],
  div[class*="StreamAd"],
  .caas-da,
  .ad-slot,
  .advertisement,

  /* ===== 5. iframe 廣告 ===== */
  iframe[title*="Advertisement"],
  iframe[title*="advertisement"],
  iframe[title*="廣告"],
  iframe[src*="darla"],
  iframe[src*="gemini"],
  iframe[src*="ad.doubleclick"],
  iframe[src*="adserver"],
  iframe[id*="ad_iframe"],

  /* ===== 6. 灰底佔位框（空容器特徵）===== */
  div[class*="M(0)"][class*="P(0)"]:empty,
  div[style*="background-color: rgb(245, 245, 245)"]:empty,
  div[style*="background:#f5f5f5"]:empty,
  div[style*="min-height"][class*="ad"],

  /* ===== 7. 「廣告」文字標記（ARIA 與語意屬性）===== */
  div[aria-label="廣告"],
  div[aria-label="Advertisement"],
  div[aria-label="Sponsored"],
  span[class*="ad-label"],
  .ad-disclaimer,

  /* ===== 8. :has() 選擇器（現代瀏覽器支援）===== */
  div:has(> [data-type="ad"]),
  div:has(> iframe[title*="Advertisement"]),
  div:has(> .gemini-ad-node),
  li:has(> div[data-ylk*="sec:ad"]),
  li:has(> div[class*="caas-da"]) {
    display: none !important;
    height: 0 !important;
    max-height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    opacity: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    visibility: hidden !important;
    position: absolute !important;
    z-index: -9999 !important;
  }
</style>
`;

// 將 CSS 插入到 HTML 的 <head> 結尾前；若無 </head>，則插入 <body> 後
if (body) {
    if (body.includes('</head>')) {
        body = body.replace('</head>', hideCSS + '</head>');
    } else if (body.includes('<body')) {
        body = body.replace(/(<body[^>]*>)/, '$1' + hideCSS);
    }
}

$done({ body });
