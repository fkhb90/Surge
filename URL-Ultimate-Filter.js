/**
 * @file        URL-Ultimate-Filter-Surge-V40.83.js
 * @version     40.83 (完全重構修正版)
 * @description 徹底解決黑白名單失效問題，重新設計過濾邏輯
 * @author      Claude & Community Optimization
 * @lastUpdated 2025-09-24
 */

// ================================================================================================
//                           🔧 STEP 1: CONFIGURATION VALIDATION
// ================================================================================================

// 確保所有配置項都能正確初始化
function createValidatedSet(items) {
  try {
    return new Set(Array.isArray(items) ? items : []);
  } catch (error) {
    console.error('[CONFIG] Set creation failed:', error);
    return new Set();
  }
}

function createValidatedRegexArray(patterns) {
  const validPatterns = [];
  if (!Array.isArray(patterns)) return validPatterns;

  for (const pattern of patterns) {
    try {
      if (pattern instanceof RegExp) {
        validPatterns.push(pattern);
      } else if (typeof pattern === 'string') {
        validPatterns.push(new RegExp(pattern, 'i'));
      }
    } catch (error) {
      console.error('[CONFIG] Regex creation failed:', error);
    }
  }
  return validPatterns;
}

// ================================================================================================
//                           ⚙️ STEP 2: CONFIGURATION SETUP
// ================================================================================================

const CONFIG = {
  // 效能設定
  PERFORMANCE: {
    DEBUG_MODE: false,
    CACHE_SIZE: 2048,
    REGEX_TIMEOUT: 100,
    MAX_URL_LENGTH: 4096
  },

  // 🔄 啟發式直跳域名 (完全不攔截)
  REDIRECTOR_HOSTS: createValidatedSet([
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
  ]),

  // ✅ 硬白名單 - 精確域名 (絕對不攔截)
  HARD_WHITELIST_EXACT: createValidatedSet([
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
  ]),

  // ✅ 硬白名單 - 萬用字元匹配
  HARD_WHITELIST_WILDCARDS: createValidatedSet([
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
  ]),

  // 🚫 黑名單 - 精確域名匹配 (必定攔截)
  BLOCK_DOMAINS: createValidatedSet([
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
  ]),

  // 🚫 黑名單 - 正規表達式匹配
  BLOCK_DOMAINS_REGEX: createValidatedRegexArray([
    '^ad[s]?\\d*\\.',
    '^track(ing)?\\.',
    '^metric[s]?\\.',
    '^telemetry\\.',
    '^analytics?\\.',
    '^stat[s]?\\.',
    '^log[s]?\\.',
    '^pixel\\.',
    '^beacon\\.',
    '^collect\\.'
  ]),

  // 🚫 關鍵追蹤腳本名稱
  TRACKING_SCRIPTS: createValidatedSet([
    'gtag.js', 'gtm.js', 'analytics.js', 'ga.js', 'adsbygoogle.js',
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',
    'amplitude.js', 'mixpanel.js', 'segment.js', 'heap.js',
    'hotjar.js', 'fullstory.js', 'clarity.js', 'posthog.js',
    'tracker.js', 'tracking.js', 'beacon.js', 'collect.js',
    'event.js', 'conversion.js', 'attribution.js'
  ]),

  // 🚫 可疑路徑關鍵字
  SUSPICIOUS_PATHS: [
    '/collect', '/track', '/event', '/pixel', '/beacon',
    '/analytics', '/metrics', '/telemetry', '/log',
    '/impression', '/click', '/conversion', '/attribution'
  ]
};

// ================================================================================================
//                           🔍 STEP 3: URL PARSING & VALIDATION
// ================================================================================================

function parseURL(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }

  // 長度檢查
  if (urlString.length > CONFIG.PERFORMANCE.MAX_URL_LENGTH) {
    console.warn(`[URLFilter] URL too long: ${urlString.length} chars`);
    return null;
  }

  try {
    // 方法1: 標準 URL 解析
    const urlObj = new URL(urlString);
    return {
      hostname: urlObj.hostname.toLowerCase(),
      pathname: urlObj.pathname.toLowerCase(),
      isValid: true
    };
  } catch (error1) {
    try {
      // 方法2: 正規表達式解析 (fallback)
      const match = urlString.match(/^(?:https?:\/\/)?([^\/\?]+)(\/[^\?]*)?/);
      if (match && match[1]) {
        return {
          hostname: match[1].toLowerCase(),
          pathname: (match[2] || '/').toLowerCase(),
          isValid: true
        };
      }
    } catch (error2) {
      console.error('[URLFilter] URL parsing failed:', error2);
    }
    return null;
  }
}

// ================================================================================================
//                           🎯 STEP 4: MAIN FILTERING LOGIC
// ================================================================================================

class SimpleCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移到最後 (LRU)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key, value) {
    // 清理舊項目
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

class URLFilterEngine {
  constructor() {
    this.cache = new SimpleCache(CONFIG.PERFORMANCE.CACHE_SIZE);
    this.stats = {
      total: 0,
      blocked: 0,
      allowed: 0
    };

    if (CONFIG.PERFORMANCE.DEBUG_MODE) {
      console.log('[URLFilter] Engine initialized with configurations:', {
        redirectors: CONFIG.REDIRECTOR_HOSTS.size,
        hardWhitelistExact: CONFIG.HARD_WHITELIST_EXACT.size,
        hardWhitelistWildcards: CONFIG.HARD_WHITELIST_WILDCARDS.size,
        blockDomains: CONFIG.BLOCK_DOMAINS.size,
        blockRegexes: CONFIG.BLOCK_DOMAINS_REGEX.length
      });
    }
  }

  // 🎯 主要過濾方法
  filter(urlString) {
    this.stats.total++;

    // 檢查快取
    const cached = this.cache.get(urlString);
    if (cached !== undefined) {
      if (CONFIG.PERFORMANCE.DEBUG_MODE) {
        console.log(`[URLFilter] Cache hit: ${urlString} -> ${cached}`);
      }
      return cached;
    }

    // 解析 URL
    const urlData = parseURL(urlString);
    if (!urlData || !urlData.isValid) {
      if (CONFIG.PERFORMANCE.DEBUG_MODE) {
        console.log(`[URLFilter] Invalid URL: ${urlString}`);
      }
      return this.makeDecision('ALLOW', urlString);
    }

    const { hostname, pathname } = urlData;

    try {
      // === 第一級：啟發式直跳域名檢查 ===
      if (this.checkRedirectorHosts(hostname)) {
        return this.makeDecision('ALLOW', urlString, 'REDIRECTOR');
      }

      // === 第二級：硬白名單檢查 ===
      if (this.checkHardWhitelist(hostname)) {
        return this.makeDecision('ALLOW', urlString, 'HARD_WHITELIST');
      }

      // === 第三級：黑名單檢查 ===
      if (this.checkBlockDomains(hostname)) {
        return this.makeDecision('REJECT', urlString, 'BLOCK_DOMAIN');
      }

      // === 第四級：正規表達式黑名單檢查 ===
      if (this.checkBlockRegex(hostname)) {
        return this.makeDecision('REJECT', urlString, 'BLOCK_REGEX');
      }

      // === 第五級：追蹤路徑檢查 ===
      if (this.checkSuspiciousPaths(pathname)) {
        return this.makeDecision('REJECT', urlString, 'SUSPICIOUS_PATH');
      }

      // === 第六級：追蹤腳本檢查 ===
      if (this.checkTrackingScripts(pathname)) {
        return this.makeDecision('REJECT', urlString, 'TRACKING_SCRIPT');
      }

      // === 預設：允許 ===
      return this.makeDecision('ALLOW', urlString, 'DEFAULT');

    } catch (error) {
      console.error('[URLFilter] Filter error:', error);
      return this.makeDecision('ALLOW', urlString, 'ERROR');
    }
  }

  // 檢查啟發式直跳域名
  checkRedirectorHosts(hostname) {
    return CONFIG.REDIRECTOR_HOSTS.has(hostname);
  }

  // 檢查硬白名單
  checkHardWhitelist(hostname) {
    // 精確匹配
    if (CONFIG.HARD_WHITELIST_EXACT.has(hostname)) {
      return true;
    }

    // 萬用字元匹配
    for (const domain of CONFIG.HARD_WHITELIST_WILDCARDS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    return false;
  }

  // 檢查黑名單域名
  checkBlockDomains(hostname) {
    return CONFIG.BLOCK_DOMAINS.has(hostname);
  }

  // 檢查正規表達式黑名單
  checkBlockRegex(hostname) {
    for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
      try {
        if (regex.test(hostname)) {
          return true;
        }
      } catch (error) {
        console.error('[URLFilter] Regex test error:', error);
      }
    }
    return false;
  }

  // 檢查可疑路徑
  checkSuspiciousPaths(pathname) {
    for (const suspiciousPath of CONFIG.SUSPICIOUS_PATHS) {
      if (pathname.includes(suspiciousPath.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // 檢查追蹤腳本
  checkTrackingScripts(pathname) {
    for (const script of CONFIG.TRACKING_SCRIPTS) {
      if (pathname.includes(script.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // 製作決策
  makeDecision(decision, urlString, reason = '') {
    // 更新統計
    if (decision === 'REJECT') {
      this.stats.blocked++;
    } else {
      this.stats.allowed++;
    }

    // 快取決策
    this.cache.set(urlString, decision);

    // 除錯日誌
    if (CONFIG.PERFORMANCE.DEBUG_MODE) {
      console.log(`[URLFilter] ${decision} (${reason}): ${urlString}`);
    }

    return decision;
  }

  // 取得統計
  getStats() {
    return {
      version: '40.83',
      total: this.stats.total,
      blocked: this.stats.blocked,
      allowed: this.stats.allowed,
      blockRate: this.stats.total > 0 ? 
        ((this.stats.blocked / this.stats.total) * 100).toFixed(2) + '%' : '0%',
      cacheSize: this.cache.cache.size
    };
  }

  // 清理快取
  clearCache() {
    this.cache.clear();
    console.log('[URLFilter] Cache cleared');
  }
}

// ================================================================================================
//                           🚀 STEP 5: SURGE INTEGRATION
// ================================================================================================

// 建立全域過濾器實例
let filterEngine;

try {
  filterEngine = new URLFilterEngine();
  console.log('[URLFilter] Version 40.83 initialized successfully');
} catch (error) {
  console.error('[URLFilter] Initialization failed:', error);
  filterEngine = null;
}

// Surge 主要入口點
async function main() {
  // 檢查是否有有效的 request 物件
  if (typeof $request === 'undefined' || !$request || !$request.url) {
    console.error('[URLFilter] No valid request object found');
    $done({});
    return;
  }

  const url = $request.url;

  // 檢查過濾器是否初始化成功
  if (!filterEngine) {
    console.error('[URLFilter] Filter engine not initialized, allowing all requests');
    $done({});
    return;
  }

  try {
    // 執行過濾
    const decision = filterEngine.filter(url);

    if (decision === 'REJECT') {
      // 攔截請求 - 返回空回應
      $done({
        response: {
          status: 204,
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': '0'
          },
          body: ''
        }
      });
    } else {
      // 允許請求繼續
      $done({});
    }

  } catch (error) {
    console.error('[URLFilter] Main execution error:', error);
    // 發生錯誤時預設允許
    $done({});
  }
}

// 檢查執行環境並啟動
if (typeof $done === 'function') {
  // Surge 環境
  main();
} else {
  // 測試環境
  console.log('[URLFilter] Running in test mode');

  // 測試範例
  const testUrls = [
    'https://www.google.com',
    'https://google-analytics.com/collect',
    'https://chatgpt.com/api',
    'https://doubleclick.net/ads'
  ];

  if (filterEngine) {
    for (const testUrl of testUrls) {
      const result = filterEngine.filter(testUrl);
      console.log(`Test: ${testUrl} -> ${result}`);
    }
    console.log('Stats:', filterEngine.getStats());
  }
}
