/**
 * Surge URL Filter - Diagnostic Version V40.85
 * 極簡版本用於測試黑白名單是否正常運作
 */

// 測試用黑白名單
const TEST_WHITELIST = [
  'chatgpt.com',
  'claude.ai', 
  'github.com',
  'stackoverflow.com'
];

const TEST_BLACKLIST = [
  'google-analytics.com',
  'doubleclick.net',
  'facebook.net',
  'ads.yahoo.com'
];

// 轉換為 Set
const whitelistSet = new Set(TEST_WHITELIST);
const blacklistSet = new Set(TEST_BLACKLIST);

// 簡單的 URL 解析
function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    const match = url.match(/^(?:https?:\/\/)?([^\/\?#]+)/);
    return match ? match[1].toLowerCase() : '';
  }
}

// 主過濾函數
function filterURL(url) {
  const hostname = getHostname(url);

  console.log(`[Diagnostic] Processing: ${hostname}`);

  // 檢查白名單
  if (whitelistSet.has(hostname)) {
    console.log(`[Diagnostic] ALLOW - Whitelist match: ${hostname}`);
    return 'ALLOW';
  }

  // 檢查黑名單
  if (blacklistSet.has(hostname)) {
    console.log(`[Diagnostic] REJECT - Blacklist match: ${hostname}`);
    return 'REJECT';
  }

  // 預設允許
  console.log(`[Diagnostic] ALLOW - Default: ${hostname}`);
  return 'ALLOW';
}

// Surge 主函數
function main() {
  console.log('[Diagnostic] Starting V40.85 diagnostic test');
  console.log(`[Diagnostic] Whitelist: ${TEST_WHITELIST.length} items`);
  console.log(`[Diagnostic] Blacklist: ${TEST_BLACKLIST.length} items`);

  if (!$request || !$request.url) {
    console.log('[Diagnostic] No request object found');
    $done({});
    return;
  }

  const url = $request.url;
  console.log(`[Diagnostic] Request URL: ${url}`);

  const decision = filterURL(url);

  if (decision === 'REJECT') {
    console.log('[Diagnostic] BLOCKING request');
    $done({
      response: {
        status: 204,
        headers: {'Content-Type': 'text/plain'},
        body: ''
      }
    });
  } else {
    console.log('[Diagnostic] ALLOWING request');
    $done({});
  }
}

// 執行
if (typeof $done === 'function') {
  main();
} else {
  // 測試模式
  const testUrls = [
    'https://chatgpt.com/api',
    'https://google-analytics.com/collect',
    'https://www.google.com',
    'https://doubleclick.net/ads'
  ];

  console.log('=== Diagnostic Test Mode ===');
  testUrls.forEach(testUrl => {
    const result = filterURL(testUrl);
    console.log(`${testUrl} -> ${result}`);
  });
}
