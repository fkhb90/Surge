/**
 * @file        URL-Ultimate-Filter-Surge-V40.83.js
 * @version     40.83 (穩定性修正版)
 * @description 基於 V40.82 進行全面修正，修復由社群回報的潛在語法與邏輯問題。強化變數命名一致性，並增加註解以釐清過濾順序。
 * @author      Claude & Community Optimization
 * @lastUpdated 2025-09-24
 */

// ================================================================================================
//                              ⚙️ ENHANCED SCRIPT CONFIGURATION
//                      (使用者在此區域安全地新增、修改或移除規則)
// ================================================================================================

const CONFIG = {
  /**
   * ✅ [V40.83] 效能調校參數
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
   * ✅ [V40.83] 快取配置
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
   * ✳️ 啟發式直跳域名列表 (按字母排序)
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
   * ✳️ 硬白名單 - 精確匹配 (按字母排序)
   * 最高優先級，確保核心服務絕不被攔截。
   */
  HARD_WHITELIST_EXACT: new Set([
    'accounts.google.com', 'api.adyen.com', 'api.braintreegateway.com', 'api.discord.com',
    'api.ecpay.com.tw', 'api.github.com', 'api.map.ecpay.com.tw', 'api.twitch.tv',
    'appleid.apple.com', 'chatgpt.com', 'claude.ai', 'gemini.google.com',
    'graph.instagram.com', 'kktix.com', 'login.microsoftonline.com', 'payment.ecpay.com.tw',
    'perplexity.ai', 'raw.githubusercontent.com', 'tixcraft.com', 'userscripts.adtidy.org',
  ]),

  /**
   * ✳️ 硬白名單 - 萬用字元 (按字母排序)
   * 確保整個主域下的服務正常運作，如銀行、政府網站。
   */
  HARD_WHITELIST_WILDCARDS: new Set([
    'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'firstbank.com.tw',
    'fubon.com', 'googleapis.com', 'googlevideo.com', 'gov.tw', 'icloud.com',
    'megabank.com.tw', 'org.tw', 'richart.tw', 'sinopac.com', 'taishinbank.com.tw',
    'windowsupdate.com', 'ytimg.com',
  ]),

  /**
   * ✅ 軟白名單 - 精確匹配 (按字母排序)
   * 用於放行常用但非絕對核心的服務，可能被黑名單中的寬鬆規則覆蓋。
   */
  SOFT_WHITELIST_EXACT: new Set([
    'api.anthropic.com', 'api.cohere.ai', 'api.dropboxapi.com', 'api.figma.com',
    'api.notion.com', 'api.openai.com', 'duckduckgo.com', 'secure.gravatar.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元 (按字母排序)
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    'akamaihd.net', 'amazonaws.com', 'books.com.tw', 'cloudflare.com',
    'cloudfront.net', 'fastly.net', 'fbcdn.net', 'github.io', 'gitlab.io',
    'gstatic.com', 'jsdelivr.net', 'momoshop.com.tw', 'netlify.app',
    'netflix.com', 'pages.dev', 'pchome.com.tw', 'shopee.tw', 'spotify.com',
    'vercel.app', 'youtube.com',
  ]),

  /**
   * 🚫 域名攔截黑名單 (按字母排序)
   */
  BLOCK_DOMAINS: new Set([
    'adjust.com', 'admob.com', 'ads.linkedin.com', 'ads.tiktok.com',
    'ads.twitter.com', 'adsense.com', 'adsrvr.org', 'amazon-adsystem.com',
    'amplitude.com', 'analytics.linkedin.com', 'analytics.tiktok.com', 'analytics.twitter.com',
    'appsflyer.com', 'baidu.com', 'bat.bing.com', 'branch.io', 'bugsnag.com',
    'business.facebook.com', 'c.clarity.ms', 'chartbeat.com', 'cnzz.com',
    'connect.facebook.net', 'criteo.com', 'criteo.net', 'demdex.net',
    'doubleclick.net', 'events.tiktok.com', 'fullstory.com', 'google-analytics.com',
    'googleadservices.com', 'googlesyndication.com', 'googletagmanager.com',
    'graph.facebook.com', 'heap.io', 'hotjar.com', 'kochava.com', 'mgid.com',
    'mixpanel.com', 'newrelic.com', 'nr-data.net', 'omtrdc.net', 'outbrain.com',
    'posthog.com', 'quantserve.com', 'revcontent.com', 'scorecardresearch.com',
    'segment.com', 'segment.io', 'sentry.io', 'taboola.com', 'umeng.cn', 'umeng.com',
  ]),

  /**
   * 🚫 Regex 域名攔截黑名單
   */
  BLOCK_DOMAINS_REGEX: [
    /^ad[s]?\d*\./i,         // 匹配 ads.domain.com, ad1.domain.com
    /^track(ing)?\./i,       // 匹配 track.domain.com, tracking.domain.com
    /^metric[s]?\./i,        // 匹配 metric.domain.com, metrics.domain.com
    /^telemetry\./i,         // 匹配 telemetry.domain.com
    /^analytics?\./i,        // 匹配 analytics.domain.com, analytic.domain.com
    /^stat[s]?\./i,          // 匹配 stats.domain.com, stat.domain.com
    /^log[s]?\./i,           // 匹配 log.domain.com, logs.domain.com
    /^pixel\./i,             // 匹配 pixel.domain.com
    /^beacon\./i,            // 匹配 beacon.domain.com
  ],

  /**
   * 🚨 關鍵追蹤腳本攔截清單 (按字母排序)
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    'adsbygoogle.js', 'amplitude.js', 'analytics.js', 'beacon.js', 'clarity.js',
    'collect.js', 'conversion.js', 'criteo.js', 'event.js', 'fbevents.js', 'fbq.js',
    'fullstory.js', 'ga.js', 'gtag.js', 'gtm.js', 'heap.js', 'hotjar.js', 'mgid.js',
    'mixpanel.js', 'outbrain.js', 'pixel.js', 'posthog.js', 'prebid.js', 'pubmatic.js',
    'revcontent.js', 'segment.js', 'taboola.js', 'tracker.js', 'tracking.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式 (按字母排序)
   */
  CRITICAL_TRACKING_PATHS: new Set([
    '/ads', '/analytics', '/beacon', '/click', '/collect', '/conversion',
    '/event', '/g/collect', '/impression', '/j/collect', '/log', '/metrics',
    '/mp/collect', '/pagead', '/pixel', '/telemetry', '/tr', '/track',
  ]),

  /**
   * 🚫 可疑路徑關鍵字 (按字母排序)
   */
  SUSPICIOUS_PATH_KEYWORDS: [
    'affiliate', 'analytics', 'attribution', 'beacon', 'campaign', 'click',
    'collect', 'conversion', 'event', 'fingerprint', 'impression', 'metric',
    'pixel', 'telemetry', 'track', 'utm', 'view',
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
    
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
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
  constructor(size = 10000, hashCount = 3) {
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
    
    this.caches = {
      domain: new EnhancedCache(CONFIG.CACHE_CONFIG.L1_DOMAIN_SIZE),
      url: new EnhancedCache(CONFIG.CACHE_CONFIG.L2_URL_DECISION_SIZE),
      regex: new EnhancedCache(CONFIG.CACHE_CONFIG.L3_REGEX_RESULT_SIZE),
    };
    
    this.bloomFilter = CONFIG.PERFORMANCE_CONFIG.ENABLE_BLOOM_FILTER ? 
      new BloomFilter(20000, 4) : null;
    
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
    
    // [V40.83] 確認 Bloom Filter 已被正確初始化並填入黑名單數據
    // 注意：僅填入精確匹配的域名黑名單以獲得最佳效能
    if (this.bloomFilter) {
      for (const domain of CONFIG.BLOCK_DOMAINS) {
        this.bloomFilter.add(domain);
      }
    }
    
    this.initialized = true;
  }

  /**
   * Main filtering method
   */
  async filter(url) {
    const startTime = performance.now();
    this.stats.requests++;
    
    try {
      // --------------------------------------------------------------------------------
      // Step 0: 檢查 URL 快取
      // 最優先的效能優化，若此 URL 已有裁決，直接返回結果。
      // --------------------------------------------------------------------------------
      const cached = this.caches.url.get(url);
      if (cached !== undefined) {
        this.updateStats(startTime, cached);
        return cached;
      }
      
      const urlObj = this.parseURL(url);
      if (!urlObj) {
        return this.makeDecision('ALLOW', url, startTime, 'InvalidURL');
      }
      
      const { hostname, pathname } = urlObj;
      
      // --------------------------------------------------------------------------------
      // Step 1: 硬白名單檢查 (最高優先級)
      // 用於放行絕對信任的域名，例如銀行、政府、核心系統服務。
      // 硬白名單應覆蓋所有黑名單規則。
      // --------------------------------------------------------------------------------
      if (CONFIG.HARD_WHITELIST_EXACT.has(hostname)) {
        return this.makeDecision('ALLOW', url, startTime, 'HardWhitelistExact');
      }
      for (const domain of CONFIG.HARD_WHITELIST_WILDCARDS) {
        if (hostname.endsWith('.' + domain) || hostname === domain) {
          return this.makeDecision('ALLOW', url, startTime, 'HardWhitelistWildcard');
        }
      }
      
      // --------------------------------------------------------------------------------
      // Step 2: 黑名單檢查 (攔截已知追蹤與廣告域名)
      // 執行一系列檢查來攔截請求。
      // --------------------------------------------------------------------------------
      
      // Step 2.1: Bloom Filter - 快速判斷域名是否"可能"在黑名單中
      if (this.bloomFilter && !this.bloomFilter.test(hostname)) {
        // 若 Bloom Filter 判斷為否，則 100% 不在精確黑名單中，可跳過檢查。
      } else {
        // 若 Bloom Filter 判斷為是 (可能存在)，則需進行精確檢查。
        if (CONFIG.BLOCK_DOMAINS.has(hostname)) {
          return this.makeDecision('REJECT', url, startTime, 'BlockDomainExact');
        }
      }
      
      // Step 2.2: Regex 黑名單
      for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
        const cacheKey = `${hostname}_${regex.source}`;
        let matches = this.caches.regex.get(cacheKey);
        
        if (matches === undefined) {
          matches = regex.test(hostname);
          this.caches.regex.set(cacheKey, matches);
        }
        
        if (matches) {
          return this.makeDecision('REJECT', url, startTime, 'BlockDomainRegex');
        }
      }

      // --------------------------------------------------------------------------------
      // Step 3: 啟發式規則檢查 (基於路徑與腳本名稱)
      // 即使域名不在黑名單，但若路徑符合追蹤模式，也應攔截。
      // --------------------------------------------------------------------------------
      if (this.checkCriticalPaths(pathname)) {
        return this.makeDecision('REJECT', url, startTime, 'CriticalPath');
      }
      if (this.checkTrackingScripts(pathname)) {
        return this.makeDecision('REJECT', url, startTime, 'TrackingScript');
      }
      if (this.checkSuspiciousKeywords(pathname)) {
        return this.makeDecision('REJECT', url, startTime, 'SuspiciousKeywords');
      }
      
      // --------------------------------------------------------------------------------
      // Step 4: 軟白名單檢查 (較低優先級)
      // 用於放行常用服務 (如 CDN)，但若其 URL 符合黑名單的追蹤路徑規則，仍會被攔截。
      // 這就是「軟」的意義所在：它僅在請求未觸發任何黑名單規則時生效。
      // --------------------------------------------------------------------------------
      if (CONFIG.SOFT_WHITELIST_EXACT.has(hostname)) {
        return this.makeDecision('ALLOW', url, startTime, 'SoftWhitelistExact');
      }
      for (const domain of CONFIG.SOFT_WHITELIST_WILDCARDS) {
        if (hostname.endsWith('.' + domain) || hostname === domain) {
          return this.makeDecision('ALLOW', url, startTime, 'SoftWhitelistWildcard');
        }
      }

      // Step 5: 處理短連結域名 (若前面規則都未匹配)
      if (CONFIG.REDIRECTOR_HOSTS.has(hostname)) {
        return this.makeDecision('ALLOW', url, startTime, 'RedirectorHost');
      }
      
      // --------------------------------------------------------------------------------
      // Step 6: 預設行為
      // 若 URL 未匹配任何白名單或黑名單規則，則預設放行。
      // --------------------------------------------------------------------------------
      return this.makeDecision('ALLOW', url, startTime, 'DefaultAllow');
      
    } catch (error) {
      console.error('[URLFilter] Error:', error);
      return this.makeDecision('ALLOW', url, startTime, 'ErrorFallback');
    }
  }

  checkCriticalPaths(pathname) {
    for (const criticalPath of CONFIG.CRITICAL_TRACKING_PATHS) {
      if (pathname.endsWith(criticalPath) || pathname.includes(criticalPath + '?') || pathname.includes(criticalPath + '&')) {
        return true;
      }
    }
    return false;
  }

  checkTrackingScripts(pathname) {
    const scriptName = pathname.substring(pathname.lastIndexOf('/') + 1);
    return CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName);
  }

  checkSuspiciousKeywords(pathname) {
    let suspiciousCount = 0;
    for (const keyword of CONFIG.SUSPICIOUS_PATH_KEYWORDS) {
      if (pathname.includes(keyword)) {
        suspiciousCount++;
        if (suspiciousCount >= 2) return true;
      }
    }
    return false;
  }

  parseURL(url) {
    try {
      const urlObj = new URL(url);
      return {
        hostname: urlObj.hostname.toLowerCase(),
        pathname: urlObj.pathname.toLowerCase(),
        search: urlObj.search,
      };
    } catch {
      const match = url.match(/^(?:https?:\/\/)?([^\/]+)(\/[^?]*)?/i);
      if (match) {
        return {
          hostname: match[1].toLowerCase(),
          pathname: (match[2] || '/').toLowerCase(),
          search: '',
        };
      }
      return null;
    }
  }

  makeDecision(decision, url, startTime, reason = 'Unknown') {
    if (decision === 'REJECT') this.stats.blocks++;
    else this.stats.allows++;
    
    const ttl = decision === 'REJECT' ? CONFIG.CACHE_CONFIG.DOMAIN_BLOCK_TTL : CONFIG.CACHE_CONFIG.DOMAIN_ALLOW_TTL;
    this.caches.url.set(url, decision, ttl);
    
    this.updateStats(startTime, decision, reason);
    return decision;
  }

  updateStats(startTime, decision, reason) {
    const elapsed = performance.now() - startTime;
    this.stats.avgTime = (this.stats.avgTime * (this.stats.requests - 1) + elapsed) / this.stats.requests;
    
    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log(`[URLFilter] ${decision} [${reason}] in ${elapsed.toFixed(2)}ms: ${$request.url}`);
    }
  }

  getStats() {
    return {
      version: '40.83',
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
      }
    };
  }
}

// ================================================================================================
//                              📊 SURGE INTEGRATION
// ================================================================================================

const filterEngine = new URLFilterEngine();

async function main() {
  if (!$request || !$request.url) {
    $done({});
    return;
  }
  
  try {
    const decision = await filterEngine.filter($request.url);
    if (decision === 'REJECT') {
      $done({ response: { status: 200, body: '' } });
    } else {
      $done({});
    }
  } catch (error) {
    console.error('[URLFilter] Fatal error in main():', error);
    $done({});
  }
}

main();
