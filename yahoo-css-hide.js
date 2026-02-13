/**
 * @name Yahoo Web Ad Hider (CSS Injection)
 * @description 強制隱藏 Yahoo 新聞/股市網頁版留下的灰底廣告框
 */

let body = $response.body;

// 定義要注入的強力 CSS
// 針對 "廣告" 字樣、灰色佔位框、以及常見的廣告容器 Class
const hideCSS = `
<style>
  /* 隱藏帶有 "廣告" 標籤的容器 (最強力選擇器) */
  div:has(> div:contains("廣告")),
  div:has(> span:contains("廣告")),
  
  /* 常見廣告容器特徵 */
  .gemini-ad-node,
  div[class*="GeminiAd"],
  div[data-ylk*="sec:ad"],
  div[id*="ad-"],
  
  /* 針對您截圖中的灰底區塊 (通常是空的 iframe 或 div) */
  iframe[title*="Advertisement"],
  div[class*="M(0)"][class*="P(0)"]:empty {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
</style>
`;

// 將 CSS 插入到 HTML 的 <head> 結尾前
if (body) {
    body = body.replace('</head>', hideCSS + '</head>');
}

$done({ body });
