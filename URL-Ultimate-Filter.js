/**
 * @file        URL-Ultimate-Filter-Surge-V40.82.js
 * @version     40.82 (黑白名單修正版)
 * @description 修正 V40.81 黑白名單失效問題，完善過濾邏輯
 * @author      Claude & Community Optimization
 * @lastUpdated 2025-09-24
 */

// ================================================================================================
//                              ⚙️ ENHANCED SCRIPT CONFIGURATION
//                      (使用者在此區域安全地新增、修改或移除規則)
// ================================================================================================

const CONFIG = {
  /**
   * ✅ [V40.82] 效能調校參數
   */
  PERFORMANCE_CONFIG: {
    DEBUG_MODE: false,
    ENABLE_MEMORY_OPTIMIZATION: true,
    ENABLE_BLOOM_FILTER: true,
    ENABLE_OBJECT_POOLING: true,
    ENABLE_SMART_PREHEATING: true,
    AC_SCAN_MAX_LENGTH: 512,
    CACHE_PREHEATING_DELAY: 100,
    MEMORY_CLEANUP_INTERVAL: 300000,
    MAX_URL_LENGTH: 2048,
  },

  /**
   * ✅ [V40.82] 快取配置
   */
  CACHE_CONFIG: {
    L1_DOMAIN_SIZE: 1024,
    L2_URL_DECISION_SIZE: 16384,
    L3_REGEX_RESULT_SIZE: 4096,
    L4_STRING_INTERN_SIZE: 2048,
    DEFAULT_TTL: 600000,
    DOMAIN_BLOCK_TTL: 1800000,
    DOMAIN_ALLOW_TTL: 600000,
    NEGATIVE_CACHE_TTL: 60000,
  },

  /**
   * 🔄 啟發式直跳域名列表
   */
  REDIRECTOR_HOSTS: new Set([
    '1ink.cc', '1link.club', 'adfoc.us', 'adsafelink.com', 'adshnk.com', 
    'adz7short.space', 'aylink.co', 'bc.vc', 'bcvc.ink', 'birdurls.com', 
    'bitcosite.com', 'blogbux.net', 'boost.ink', 'ceesty.com', 'clik.pw', 
    'clk.sh', 'clkmein.com', 'cllkme.com', 'corneey.com', 'cpmlink.net', 
    'cpmlink.pro', 'cutpaid.com', 'destyy.com', 'dlink3.com', 'dz4link.com', 
    'earnlink.io', 'exe-links.com', 'exeo.app', 'fc-lc.com', 'fc-lc.xyz', 
    'fcd.su', 'festyy.com', 'fir3.net', 'forex-trnd.com', 'gestyy.com', 
    'get-click2.blogspot.com', 'getthot.com', 'gitlink.pro', 'gplinks.co', 
    'hotshorturl.com', 'icutlink.com', 'kimochi.info', 'kingofshrink.com', 
    'linegee.net', 'link1s.com', 'linkmoni.com', 'linkpoi.me', 'linkshrink.net', 
    'linksly.co', 'lnk2.cc', 'loaninsurehub.com', 'lolinez.com', 'mangalist.org', 
    'megalink.pro', 'met.bz', 'miniurl.pw', 'mitly.us', 'noweconomy.live', 
    'oke.io', 'oko.sh', 'oni.vn', 'onlinefreecourse.net', 'ouo.io', 'ouo.press', 
    'pahe.plus', 'payskip.org', 'pingit.im', 'realsht.mobi', 'rlu.ru', 'sh.st', 
    'short.am', 'shortlinkto.biz', 'shortmoz.link', 'shrinkcash.com', 'shrt10.com', 
    'similarsites.com', 'smilinglinks.com', 'spacetica.com', 'spaste.com', 'srt.am', 
    'stfly.me', 'stfly.xyz', 'supercheats.com', 'swzz.xyz', 'techgeek.digital', 
    'techstudify.com', 'techtrendmakers.com', 'thinfi.com', 'thotpacks.xyz', 
    'tmearn.net', 'tnshort.net', 'tribuntekno.com', 'turkdown.com', 'tutwuri.id', 
    'uplinkto.hair', 'urlbluemedia.shop', 'urlcash.com', 'urlcash.org', 
    'vinaurl.net', 'vzturl.com', 'xpshort.com', 'zegtrends.com'
  ]),

  /**
   * ✅ 硬白名單 - 精確匹配 (最高優先級，絕對不攔截)
   */
  HARD_WHITELIST_EXACT: new Set([
    // 🤖 AI & 搜尋服務
    'chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai',
    'bard.google.com', 'chat.openai.com', 'api.openai.com',

    // 🛠 開發者工具
    'raw.githubusercontent.com', 'api.github.com', 'userscripts.adtidy.org',
    'github.com', 'stackoverflow.com', 'developer.mozilla.org',

    // 🔐 核心服務認證
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    'secure.gravatar.com', 'auth0.com', 'oauth.com',

    // 💳 金流 API
    'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw',
    'api.stripe.com', 'api.paypal.com', 'checkout.paypal.com',

    // 🎮 社群平台核心 API
    'api.discord.com', 'api.twitch.tv', 'graph.instagram.com',
    'api.twitter.com', 'api.linkedin.com', 'api.reddit.com',

    // 🇹🇼 台灣服務
    'api.map.ecpay.com.tw', 'payment.ecpay.com.tw', 'kktix.com', 'tixcraft.com',
    'gov.tw', 'edu.tw', 'org.tw', 'com.tw', 'net.tw',
  ]),

  /**
   * ✅ 硬白名單 - 萬用字元匹配
   */
  HARD_WHITELIST_WILDCARDS: new Set([
    // 🏦 銀行金融
    'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'firstbank.com.tw',
    'fubon.com', 'megabank.com.tw', 'richart.tw', 'sinopac.com', 'taishinbank.com.tw',

    // 🏛 政府機關
    'gov.tw', 'org.tw', 'edu.tw',

    // ⚙️ 核心服務
    'googleapis.com', 'gstatic.com', 'icloud.com', 'windowsupdate.com',
    'microsoft.com', 'apple.com', 'amazon.com',

    // 📺 內容傳遞
    'googlevideo.com', 'ytimg.com', 'youtube.com', 'youtu.be',
  ]),

  /**
   * ✨ 軟白名單 - 精確匹配 (較低優先級)
   */
  SOFT_WHITELIST_EXACT: new Set([
    // 🤖 AI 服務擴展
    'api.anthropic.com', 'api.cohere.ai', 'api.huggingface.co',

    // 🛠 開發工具擴展
    'api.dropboxapi.com', 'api.notion.com', 'api.figma.com',
    'api.slack.com', 'api.trello.com', 'api.asana.com',

    // 🔍 搜尋引擎
    'duckduckgo.com', 'bing.com', 'search.yahoo.com',
  ]),

  /**
   * ✨ 軟白名單 - 萬用字元
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    // 🛒 電商平台
    'shopee.tw', 'momoshop.com.tw', 'pchome.com.tw', 'books.com.tw',
    'ruten.com.tw', 'etmall.com.tw', 'friday.tw',

    // 🌐 CDN 網路
    'akamaihd.net', 'amazonaws.com', 'cloudflare.com', 'cloudfront.net',
    'fastly.net', 'fbcdn.net', 'jsdelivr.net', 'unpkg.com',

    // 👨‍💻 開發平台
    'github.io', 'gitlab.io', 'netlify.app', 'vercel.app', 'pages.dev',
    'herokuapp.com', 'firebase.com', 'firebaseapp.com',

    // 🎬 內容平台
    'spotify.com', 'netflix.com', 'hulu.com', 'disney.com',
  ]),

  /**
   * 🚫 域名攔截黑名單 (精確匹配)
   */
  BLOCK_DOMAINS: new Set([
    // 🎯 Google 追蹤與廣告
    'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
    'googleadservices.com', 'doubleclick.net', 'adsense.com', 'admob.com',
    'googletagservices.com', 'ggpht.com', 'googleusercontent.com',

    // 📘 Facebook/Meta 追蹤
    'connect.facebook.net', 'business.facebook.com', 'analytics.facebook.com',
    'pixel.facebook.com', 'facebook.com', 'instagram.com',

    // 🛒 Amazon 追蹤
    'amazon-adsystem.com', 'media-amazon.com', 'assoc-amazon.com',

    // 🪟 Microsoft 追蹤
    'c.clarity.ms', 'bat.bing.com', 'live.com', 'hotmail.com',

    // 🎨 Adobe 分析
    'omtrdc.net', 'demdex.net', 'adobe.com', 'omniture.com',

    // 📊 主要分析平台
    'amplitude.com', 'mixpanel.com', 'segment.io', 'segment.com',
    'hotjar.com', 'fullstory.com', 'heap.io', 'posthog.com',
    'google-analytics.com', 'googleanalytics.com',

    // 📺 廣告網路
    'adsrvr.org', 'criteo.com', 'criteo.net', 'outbrain.com',
    'taboola.com', 'mgid.com', 'revcontent.com', 'adsystem.com',

    // 📱 行動分析
    'appsflyer.com', 'adjust.com', 'branch.io', 'kochava.com',
    'flurry.com', 'localytics.com',

    // 🇨🇳 中國分析
    'umeng.com', 'umeng.cn', 'cnzz.com', 'baidu.com',
    'tencent.com', 'qq.com', 'sina.com.cn',

    // 🎵 TikTok 分析
    'analytics.tiktok.com', 'ads.tiktok.com', 'events.tiktok.com',

    // 💼 LinkedIn 分析
    'ads.linkedin.com', 'analytics.linkedin.com', 'bizographics.com',

    // 🐦 Twitter/X 分析
    'analytics.twitter.com', 'ads-twitter.com', 'twitter.com',

    // 🔍 其他追蹤服務
    'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
    'newrelic.com', 'nr-data.net', 'bugsnag.com', 'sentry.io',
    'optimizely.com', 'vwo.com', 'kissmetrics.com',
  ]),

  /**
   * 🚫 Regex 域名攔截黑名單
   */
  BLOCK_DOMAINS_REGEX: [
    /^ad[s]?\d*\./i,
    /^track(ing)?\./i,
    /^metric[s]?\./i,
    /^telemetry\./i,
    /^analytics?\./i,
    /^stat[s]?\./i,
    /^log[s]?\./i,
    /^pixel\./i,
    /^beacon\./i,
    /^collect\./i,
    /^events?\./i,
  ],

  /**
   * 🚨 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    // Google
    'gtag.js', 'gtm.js', 'analytics.js', 'ga.js', 'adsbygoogle.js',
    'googletagmanager.js', 'googletagservices.js',

    // Facebook
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',

    // 分析程式庫
    'amplitude.js', 'mixpanel.js', 'segment.js', 'heap.js',
    'hotjar.js', 'fullstory.js', 'clarity.js', 'posthog.js',
    'optimizely.js', 'vwo.js', 'kissmetrics.js',

    // 廣告技術
    'prebid.js', 'pubmatic.js', 'criteo.js', 'outbrain.js',
    'taboola.js', 'mgid.js', 'revcontent.js',

    // 通用追蹤
    'tracker.js', 'tracking.js', 'beacon.js', 'collect.js',
    'event.js', 'conversion.js', 'attribution.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATHS: new Set([
    '/collect', '/track', '/event', '/pixel', '/beacon',
    '/analytics', '/metrics', '/telemetry', '/log',
    '/impression', '/click', '/conversion', '/attribution',
    '/g/collect', '/j/collect', '/mp/collect',
    '/tr', '/pagead', '/ads', '/adnxs',
  ]),

  /**
   * 🚫 可疑路徑關鍵字
   */
  SUSPICIOUS_PATH_KEYWORDS: [
    'track', 'collect', 'pixel', 'beacon', 'event', 'analytics',
    'metric', 'telemetry', 'impression', 'click', 'view', 'conversion',
    'attribution', 'fingerprint', 'utm', 'campaign', 'affiliate',
    'retargeting', 'remarketing', 'audience', 'segment',
  ],
};

// ================================================================================================
//                           🚀 PERFORMANCE OPTIMIZATION ENGINE
// ================================================================================================

/**
 * Enhanced Cache System with LRU eviction
 */
class EnhancedCache {
  constructor(maxSize = 1000, ttl = 600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = ttl;
    this.stats = { hits: 0, misses: 0 };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Evict if needed
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%'
    };
  }
}

/**
 * Bloom Filter for fast negative lookups
 */
class BloomFilter {
  constructor(size = 10000, hashCount = 4) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  _hash(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % this.size;
  }

  add(item) {
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this._hash(item, i);
      const byte = Math.floor(pos / 8);
      const bit = pos % 8;
      this.bits[byte] |= (1 << bit);
    }
  }

  test(item) {
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this._hash(item, i);
      const byte = Math.floor(pos / 8);
      const bit = pos % 8;
      if (!(this.bits[byte] & (1 << bit))) {
        return false;
      }
    }
    return true;
  }
}

// ================================================================================================
//                              🎯 MAIN FILTER ENGINE
// ================================================================================================

class URLFilterEngine {
  constructor() {
    this.initialized = false;

    // Multi-layer cache system
    this.caches = {
      domain: new EnhancedCache(CONFIG.CACHE_CONFIG.L1_DOMAIN_SIZE),
      url: new EnhancedCache(CONFIG.CACHE_CONFIG.L2_URL_DECISION_SIZE),
      regex: new EnhancedCache(CONFIG.CACHE_CONFIG.L3_REGEX_RESULT_SIZE),
    };

    // Bloom filter for fast negative checks
    this.bloomFilter = CONFIG.PERFORMANCE_CONFIG.ENABLE_BLOOM_FILTER ? 
      new BloomFilter(30000, 5) : null;

    // Statistics
    this.stats = {
      requests: 0,
      blocks: 0,
      allows: 0,
      avgTime: 0,
    };

    this.initialize();
  }

  initialize() {
    if (this.initialized) return;

    try {
      // Pre-populate bloom filter with block domains
      if (this.bloomFilter) {
        for (const domain of CONFIG.BLOCK_DOMAINS) {
          this.bloomFilter.add(domain);
        }
        console.log(`[URLFilter] Bloom filter initialized with ${CONFIG.BLOCK_DOMAINS.size} domains`);
      }

      this.initialized = true;
      console.log('[URLFilter] Engine initialized successfully');
    } catch (error) {
      console.error('[URLFilter] Initialization error:', error);
    }
  }

  /**
   * 🎯 主要過濾方法 - 修正版
   */
  async filter(url) {
    const startTime = performance.now();
    this.stats.requests++;

    try {
      // 檢查 URL 快取
      const cached = this.caches.url.get(url);
      if (cached !== undefined) {
        this.updateStats(startTime, cached);
        return cached;
      }

      // 解析 URL
      const urlObj = this.parseURL(url);
      if (!urlObj) {
        return this.makeDecision('ALLOW', url, startTime);
      }

      const { hostname, pathname } = urlObj;

      // 🔄 步驟 1: 檢查啟發式直跳域名 (優先允許)
      if (this.checkRedirectorHosts(hostname)) {
        return this.makeDecision('ALLOW', url, startTime);
      }

      // ✅ 步驟 2: 檢查硬白名單 (最高優先級)
      if (this.checkHardWhitelist(hostname)) {
        return this.makeDecision('ALLOW', url, startTime);
      }

      // 🚫 步驟 3: 檢查黑名單 (精確匹配)
      if (this.checkBlockDomains(hostname)) {
        return this.makeDecision('REJECT', url, startTime);
      }

      // 🚫 步驟 4: 檢查黑名單 (正規表達式)
      if (await this.checkBlockDomainsRegex(hostname)) {
        return this.makeDecision('REJECT', url, startTime);
      }

      // 🚫 步驟 5: 檢查關鍵追蹤路徑
      if (this.checkCriticalPaths(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }

      // 🚫 步驟 6: 檢查追蹤腳本
      if (this.checkTrackingScripts(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }

      // 🚫 步驟 7: 檢查可疑關鍵字
      if (this.checkSuspiciousKeywords(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }

      // ✨ 步驟 8: 檢查軟白名單
      if (this.checkSoftWhitelist(hostname)) {
        return this.makeDecision('ALLOW', url, startTime);
      }

      // 預設允許
      return this.makeDecision('ALLOW', url, startTime);

    } catch (error) {
      console.error('[URLFilter] Filter error:', error);
      return this.makeDecision('ALLOW', url, startTime);
    }
  }

  /**
   * 🔄 檢查啟發式直跳域名
   */
  checkRedirectorHosts(hostname) {
    return CONFIG.REDIRECTOR_HOSTS.has(hostname);
  }

  /**
   * ✅ 檢查硬白名單
   */
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

  /**
   * 🚫 檢查黑名單域名
   */
  checkBlockDomains(hostname) {
    // 快速 Bloom Filter 檢查
    if (this.bloomFilter && !this.bloomFilter.test(hostname)) {
      return false; // 確定不在黑名單中
    }

    // 精確匹配
    return CONFIG.BLOCK_DOMAINS.has(hostname);
  }

  /**
   * 🚫 檢查黑名單正規表達式
   */
  async checkBlockDomainsRegex(hostname) {
    for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
      const cacheKey = `regex_${hostname}_${regex.source}`;
      let matches = this.caches.regex.get(cacheKey);

      if (matches === undefined) {
        matches = regex.test(hostname);
        this.caches.regex.set(cacheKey, matches);
      }

      if (matches) {
        return true;
      }
    }
    return false;
  }

  /**
   * 🚫 檢查關鍵追蹤路徑
   */
  checkCriticalPaths(pathname) {
    const pathLower = pathname.toLowerCase();
    for (const criticalPath of CONFIG.CRITICAL_TRACKING_PATHS) {
      if (pathLower.includes(criticalPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 🚫 檢查追蹤腳本
   */
  checkTrackingScripts(pathname) {
    const pathLower = pathname.toLowerCase();
    for (const script of CONFIG.CRITICAL_TRACKING_SCRIPTS) {
      if (pathLower.includes(script)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 🚫 檢查可疑關鍵字
   */
  checkSuspiciousKeywords(pathname) {
    const pathLower = pathname.toLowerCase();
    let suspiciousCount = 0;

    for (const keyword of CONFIG.SUSPICIOUS_PATH_KEYWORDS) {
      if (pathLower.includes(keyword)) {
        suspiciousCount++;
        // 發現 2 個或以上可疑關鍵字就攔截
        if (suspiciousCount >= 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * ✨ 檢查軟白名單
   */
  checkSoftWhitelist(hostname) {
    // 精確匹配
    if (CONFIG.SOFT_WHITELIST_EXACT.has(hostname)) {
      return true;
    }

    // 萬用字元匹配
    for (const domain of CONFIG.SOFT_WHITELIST_WILDCARDS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 🔍 解析 URL
   */
  parseURL(url) {
    try {
      // 首先嘗試標準 URL 解析
      const urlObj = new URL(url);
      return {
        hostname: urlObj.hostname.toLowerCase(),
        pathname: urlObj.pathname.toLowerCase(),
        search: urlObj.search,
      };
    } catch {
      // 後備解析方法
      try {
        const match = url.match(/^(?:https?:\/\/)?([^\/\?]+)(\/[^\?]*)?/i);
        if (match) {
          return {
            hostname: match[1].toLowerCase(),
            pathname: (match[2] || '/').toLowerCase(),
            search: '',
          };
        }
      } catch (error) {
        console.error('[URLFilter] URL parsing failed:', error);
      }
      return null;
    }
  }

  /**
   * ✅ 做出決策並更新統計
   */
  makeDecision(decision, url, startTime) {
    // 更新統計
    if (decision === 'REJECT') {
      this.stats.blocks++;
    } else {
      this.stats.allows++;
    }

    // 快取決策
    this.caches.url.set(url, decision, 
      decision === 'REJECT' ? 
        CONFIG.CACHE_CONFIG.DOMAIN_BLOCK_TTL : 
        CONFIG.CACHE_CONFIG.DOMAIN_ALLOW_TTL
    );

    // 更新時間統計
    this.updateStats(startTime, decision);

    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log(`[URLFilter] ${decision}: ${url}`);
    }

    return decision;
  }

  /**
   * 📊 更新統計資訊
   */
  updateStats(startTime, decision) {
    const elapsed = performance.now() - startTime;
    this.stats.avgTime = (this.stats.avgTime * (this.stats.requests - 1) + elapsed) / this.stats.requests;
  }

  /**
   * 📈 取得統計資訊
   */
  getStats() {
    return {
      version: '40.82',
      requests: this.stats.requests,
      blocks: this.stats.blocks,
      allows: this.stats.allows,
      blockRate: this.stats.requests > 0 ? 
        (this.stats.blocks / this.stats.requests * 100).toFixed(2) + '%' : '0%',
      avgTime: this.stats.avgTime.toFixed(2) + 'ms',
      caches: {
        domain: this.caches.domain.getStats(),
        url: this.caches.url.getStats(),
        regex: this.caches.regex.getStats(),
      },
      bloomFilter: this.bloomFilter ? 'Enabled' : 'Disabled'
    };
  }

  /**
   * 🧹 清理快取
   */
  clearCaches() {
    Object.values(this.caches).forEach(cache => cache.clear());
    console.log('[URLFilter] All caches cleared');
  }
}

// ================================================================================================
//                              📊 SURGE INTEGRATION
// ================================================================================================

// 全域過濾器實例
const filterEngine = new URLFilterEngine();

/**
 * 🎯 Surge 主要入口點
 */
async function main() {
  const url = $request.url;

  if (!url) {
    $done({});
    return;
  }

  // 檢查 URL 長度
  if (url.length > CONFIG.PERFORMANCE_CONFIG.MAX_URL_LENGTH) {
    console.warn(`[URLFilter] URL too long (${url.length}), allowing by default`);
    $done({});
    return;
  }

  try {
    const decision = await filterEngine.filter(url);

    if (decision === 'REJECT') {
      // 攔截請求
      $done({ 
        response: { 
          status: 200, 
          headers: { 'Content-Type': 'text/plain' },
          body: '' 
        } 
      });
    } else {
      // 允許請求繼續
      $done({});
    }

  } catch (error) {
    console.error('[URLFilter] Main execution error:', error);
    // 錯誤時預設允許
    $done({});
  }
}

// 🚀 執行主函數
main();

// 📊 定期清理記憶體 (可選)
if (CONFIG.PERFORMANCE_CONFIG.ENABLE_MEMORY_OPTIMIZATION) {
  setInterval(() => {
    if (filterEngine.stats.requests > 10000) {
      filterEngine.clearCaches();
      console.log('[URLFilter] Periodic cache cleanup performed');
    }
  }, CONFIG.PERFORMANCE_CONFIG.MEMORY_CLEANUP_INTERVAL);
}
