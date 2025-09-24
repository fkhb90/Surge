/**
 * @file        URL-Ultimate-Filter-Surge-V40.84.js  
 * @version     40.84 (語法修正版)
 * @description 修正所有語法錯誤，確保黑白名單正常運作
 * @author      Claude
 * @lastUpdated 2025-09-24
 */

// ================================================================================================
//                                     核心配置
// ================================================================================================

// 啟發式直跳域名 (完全不攔截)
const REDIRECTOR_HOSTS = [
  '1ink.cc', '1link.club', 'adfoc.us', 'adsafelink.com', 'adshnk.com',
  'adz7short.space', 'aylink.co', 'bc.vc', 'bcvc.ink', 'birdurls.com',
  'bitcosite.com', 'blogbux.net', 'boost.ink', 'ceesty.com', 'clik.pw',
  'clk.sh', 'clkmein.com', 'cllkme.com', 'corneey.com', 'cpmlink.net',
  'cutpaid.com', 'destyy.com', 'dlink3.com', 'earnlink.io', 'exe-links.com',
  'exeo.app', 'fc-lc.com', 'festyy.com', 'fir3.net', 'gestyy.com',
  'gplinks.co', 'hotshorturl.com', 'icutlink.com', 'linegee.net', 'link1s.com',
  'linkmoni.com', 'linkpoi.me', 'linkshrink.net', 'linksly.co', 'lnk2.cc',
  'megalink.pro', 'met.bz', 'miniurl.pw', 'mitly.us', 'noweconomy.live',
  'oke.io', 'oko.sh', 'oni.vn', 'ouo.io', 'ouo.press', 'pahe.plus',
  'payskip.org', 'pingit.im', 'realsht.mobi', 'rlu.ru', 'sh.st',
  'short.am', 'shortlinkto.biz', 'shortmoz.link', 'shrinkcash.com',
  'shrt10.com', 'smilinglinks.com', 'spacetica.com', 'spaste.com',
  'srt.am', 'stfly.me', 'stfly.xyz', 'thinfi.com', 'tmearn.net',
  'tnshort.net', 'turkdown.com', 'tutwuri.id', 'uplinkto.hair',
  'urlcash.com', 'urlcash.org', 'vinaurl.net', 'vzturl.com',
  'xpshort.com', 'zegtrends.com'
];

// 硬白名單 - 精確匹配 (絕對不攔截)
const HARD_WHITELIST_EXACT = [
  // AI 服務
  'chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai',
  'bard.google.com', 'chat.openai.com', 'api.openai.com',

  // 開發工具
  'raw.githubusercontent.com', 'api.github.com', 'userscripts.adtidy.org',
  'github.com', 'stackoverflow.com', 'developer.mozilla.org',

  // 核心驗證服務
  'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
  'secure.gravatar.com', 'auth0.com', 'oauth.com',

  // 支付服務
  'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw',
  'api.stripe.com', 'api.paypal.com', 'checkout.paypal.com',

  // 社交平台 API
  'api.discord.com', 'api.twitch.tv', 'graph.instagram.com',
  'api.twitter.com', 'api.linkedin.com', 'api.reddit.com',

  // 台灣本地服務
  'api.map.ecpay.com.tw', 'payment.ecpay.com.tw', 'kktix.com',
  'tixcraft.com', 'gov.tw', 'edu.tw', 'org.tw', 'com.tw', 'net.tw'
];

// 硬白名單 - 萬用字元匹配
const HARD_WHITELIST_WILDCARDS = [
  // 台灣銀行
  'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'firstbank.com.tw',
  'fubon.com', 'megabank.com.tw', 'richart.tw', 'sinopac.com', 'taishinbank.com.tw',

  // 政府網站
  'gov.tw', 'org.tw', 'edu.tw',

  // 核心網路服務
  'googleapis.com', 'gstatic.com', 'icloud.com', 'windowsupdate.com',
  'microsoft.com', 'apple.com', 'amazon.com',

  // 內容傳遞
  'googlevideo.com', 'ytimg.com', 'youtube.com', 'youtu.be'
];

// 黑名單 - 精確域名匹配 (必定攔截)
const BLOCK_DOMAINS = [
  // Google 追蹤與廣告
  'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
  'googleadservices.com', 'doubleclick.net', 'adsense.com', 'admob.com',
  'googletagservices.com',

  // Facebook/Meta 追蹤
  'connect.facebook.net', 'business.facebook.com', 'analytics.facebook.com',
  'pixel.facebook.com',

  // Amazon 追蹤
  'amazon-adsystem.com', 'media-amazon.com', 'assoc-amazon.com',

  // Microsoft 追蹤
  'c.clarity.ms', 'bat.bing.com',

  // Adobe 分析
  'omtrdc.net', 'demdex.net', 'omniture.com',

  // 主要分析平台
  'amplitude.com', 'mixpanel.com', 'segment.io', 'segment.com',
  'hotjar.com', 'fullstory.com', 'heap.io', 'posthog.com',

  // 廣告網路
  'adsrvr.org', 'criteo.com', 'criteo.net', 'outbrain.com',
  'taboola.com', 'mgid.com', 'revcontent.com', 'adsystem.com',

  // 行動分析
  'appsflyer.com', 'adjust.com', 'branch.io', 'kochava.com',
  'flurry.com', 'localytics.com',

  // 中國服務
  'umeng.com', 'umeng.cn', 'cnzz.com',

  // TikTok 分析
  'analytics.tiktok.com', 'ads.tiktok.com', 'events.tiktok.com',

  // LinkedIn 分析
  'ads.linkedin.com', 'analytics.linkedin.com', 'bizographics.com',

  // Twitter/X 分析
  'analytics.twitter.com', 'ads-twitter.com',

  // 其他追蹤
  'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
  'newrelic.com', 'nr-data.net', 'bugsnag.com', 'sentry.io',
  'optimizely.com', 'vwo.com', 'kissmetrics.com'
];

// 黑名單 - 正規表達式匹配
const BLOCK_DOMAINS_REGEX = [
  /^ad[s]?\d*\./i,
  /^track(ing)?\./i,
  /^metric[s]?\./i,
  /^telemetry\./i,
  /^analytics?\./i,
  /^stat[s]?\./i,
  /^log[s]?\./i,
  /^pixel\./i,
  /^beacon\./i,
  /^collect\./i
];

// 追蹤腳本名稱
const TRACKING_SCRIPTS = [
  'gtag.js', 'gtm.js', 'analytics.js', 'ga.js', 'adsbygoogle.js',
  'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',
  'amplitude.js', 'mixpanel.js', 'segment.js', 'heap.js',
  'hotjar.js', 'fullstory.js', 'clarity.js', 'posthog.js',
  'tracker.js', 'tracking.js', 'beacon.js', 'collect.js',
  'event.js', 'conversion.js', 'attribution.js'
];

// 可疑路徑關鍵字
const SUSPICIOUS_PATHS = [
  '/collect', '/track', '/event', '/pixel', '/beacon',
  '/analytics', '/metrics', '/telemetry', '/log',
  '/impression', '/click', '/conversion', '/attribution'
];

// ================================================================================================
//                                     過濾邏輯
// ================================================================================================

// 轉換陣列為 Set 以提升查詢效能
const redirectorSet = new Set(REDIRECTOR_HOSTS);
const hardWhitelistExactSet = new Set(HARD_WHITELIST_EXACT);  
const hardWhitelistWildcardsSet = new Set(HARD_WHITELIST_WILDCARDS);
const blockDomainsSet = new Set(BLOCK_DOMAINS);
const trackingScriptsSet = new Set(TRACKING_SCRIPTS);

// 簡單快取
const cache = new Map();
let stats = { total: 0, blocked: 0, allowed: 0 };

// URL 解析函數
function parseURL(urlString) {
  try {
    const url = new URL(urlString);
    return {
      hostname: url.hostname.toLowerCase(),
      pathname: url.pathname.toLowerCase()
    };
  } catch (e) {
    // fallback 解析
    const match = urlString.match(/^(?:https?:\/\/)?([^\/\?]+)(\/[^\?]*)?/);
    if (match) {
      return {
        hostname: (match[1] || '').toLowerCase(),
        pathname: (match[2] || '/').toLowerCase()
      };
    }
    return null;
  }
}

// 檢查是否為萬用字元匹配
function isWildcardMatch(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

// 主要過濾函數
function filterURL(urlString) {
  stats.total++;

  // 檢查快取
  if (cache.has(urlString)) {
    const result = cache.get(urlString);
    if (result === 'REJECT') stats.blocked++;
    else stats.allowed++;
    return result;
  }

  // 解析 URL
  const parsed = parseURL(urlString);
  if (!parsed) {
    cache.set(urlString, 'ALLOW');
    stats.allowed++;
    return 'ALLOW';
  }

  const { hostname, pathname } = parsed;

  // 1. 檢查啟發式直跳域名 (優先允許)
  if (redirectorSet.has(hostname)) {
    cache.set(urlString, 'ALLOW');
    stats.allowed++;
    return 'ALLOW';
  }

  // 2. 檢查硬白名單精確匹配
  if (hardWhitelistExactSet.has(hostname)) {
    cache.set(urlString, 'ALLOW');
    stats.allowed++;
    return 'ALLOW';
  }

  // 3. 檢查硬白名單萬用字元
  for (const domain of hardWhitelistWildcardsSet) {
    if (isWildcardMatch(hostname, domain)) {
      cache.set(urlString, 'ALLOW');
      stats.allowed++;
      return 'ALLOW';
    }
  }

  // 4. 檢查黑名單精確匹配
  if (blockDomainsSet.has(hostname)) {
    cache.set(urlString, 'REJECT');
    stats.blocked++;
    return 'REJECT';
  }

  // 5. 檢查黑名單正規表達式
  for (const regex of BLOCK_DOMAINS_REGEX) {
    try {
      if (regex.test(hostname)) {
        cache.set(urlString, 'REJECT');
        stats.blocked++;
        return 'REJECT';
      }
    } catch (e) {
      // 忽略正規表達式錯誤
    }
  }

  // 6. 檢查可疑路徑
  for (const suspiciousPath of SUSPICIOUS_PATHS) {
    if (pathname.includes(suspiciousPath)) {
      cache.set(urlString, 'REJECT');
      stats.blocked++;
      return 'REJECT';
    }
  }

  // 7. 檢查追蹤腳本
  for (const script of trackingScriptsSet) {
    if (pathname.includes(script)) {
      cache.set(urlString, 'REJECT');
      stats.blocked++;
      return 'REJECT';
    }
  }

  // 預設允許
  cache.set(urlString, 'ALLOW');
  stats.allowed++;
  return 'ALLOW';
}

// ================================================================================================
//                                   Surge 整合
// ================================================================================================

// Surge 主函數
function main() {
  if (!$request || !$request.url) {
    console.log('[URLFilter] No valid request');
    $done({});
    return;
  }

  const url = $request.url;

  try {
    const decision = filterURL(url);

    if (decision === 'REJECT') {
      // 攔截請求
      $done({
        response: {
          status: 204,
          headers: { 'Content-Type': 'text/plain' },
          body: ''
        }
      });
    } else {
      // 允許請求
      $done({});
    }
  } catch (error) {
    console.error('[URLFilter] Error:', error);
    $done({});
  }
}

// 初始化日誌
console.log('[URLFilter] V40.84 initialized');
console.log(`[URLFilter] Configurations loaded - Redirectors: ${REDIRECTOR_HOSTS.length}, Hard whitelist: ${HARD_WHITELIST_EXACT.length}, Block domains: ${BLOCK_DOMAINS.length}`);

// 執行主函數
if (typeof $done === 'function') {
  main();
} else {
  // 測試模式
  console.log('[URLFilter] Test mode');
  const testUrls = [
    'https://www.google.com',
    'https://google-analytics.com/collect', 
    'https://chatgpt.com/api',
    'https://doubleclick.net/ads'
  ];

  testUrls.forEach(testUrl => {
    const result = filterURL(testUrl);
    console.log(`${testUrl} -> ${result}`);
  });

  console.log(`Stats: ${stats.total} total, ${stats.blocked} blocked, ${stats.allowed} allowed`);
}
