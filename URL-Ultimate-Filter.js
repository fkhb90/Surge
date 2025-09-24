/**
 * @file        URL-Ultimate-Filter-Surge-V40.81.js
 * @version     40.81 (修正版)
 * @description 基於 V40.80 進行全面修正，解決編碼問題並優化黑白名單
 * @author      Claude & Community Optimization
 * @lastUpdated 2025-09-24
 */

// ================================================================================================
//                              ⚙️ ENHANCED SCRIPT CONFIGURATION
//                      (使用者在此區域安全地新增、修改或移除規則)
// ================================================================================================

const CONFIG = {
  /**
   * ✅ [V40.81] 效能調校參數
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
   * ✅ [V40.81] 快取配置
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
   * ✳️ 啟發式直跳域名列表
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
   * ✳️ 硬白名單 - 精確匹配
   */
  HARD_WHITELIST_EXACT: new Set([
    // AI & Search Services
    'chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai',
    
    // Developer Tools
    'raw.githubusercontent.com', 'api.github.com', 'userscripts.adtidy.org',
    
    // Essential Services
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    
    // Payment APIs
    'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw',
    
    // Social Platform Core APIs
    'api.discord.com', 'api.twitch.tv', 'graph.instagram.com',
    
    // Taiwan Services
    'api.map.ecpay.com.tw', 'payment.ecpay.com.tw', 'kktix.com', 'tixcraft.com',
  ]),

  /**
   * ✳️ 硬白名單 - 萬用字元
   */
  HARD_WHITELIST_WILDCARDS: new Set([
    // Banking & Finance
    'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'firstbank.com.tw',
    'fubon.com', 'megabank.com.tw', 'richart.tw', 'sinopac.com', 'taishinbank.com.tw',
    
    // Government
    'gov.tw', 'org.tw',
    
    // Core Services
    'googleapis.com', 'icloud.com', 'windowsupdate.com',
    
    // Content Delivery
    'googlevideo.com', 'ytimg.com',
  ]),

  /**
   * ✅ 軟白名單 - 精確匹配
   */
  SOFT_WHITELIST_EXACT: new Set([
    'api.anthropic.com', 'api.openai.com', 'api.cohere.ai',
    'api.dropboxapi.com', 'api.notion.com', 'api.figma.com',
    'duckduckgo.com', 'secure.gravatar.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    // E-commerce
    'shopee.tw', 'momoshop.com.tw', 'pchome.com.tw', 'books.com.tw',
    
    // CDN Networks
    'akamaihd.net', 'amazonaws.com', 'cloudflare.com', 'cloudfront.net',
    'fastly.net', 'fbcdn.net', 'gstatic.com', 'jsdelivr.net',
    
    // Development Platforms
    'github.io', 'gitlab.io', 'netlify.app', 'vercel.app', 'pages.dev',
    
    // Content Platforms
    'youtube.com', 'spotify.com', 'netflix.com',
  ]),

  /**
   * 🚫 域名攔截黑名單
   */
  BLOCK_DOMAINS: new Set([
    // Google Analytics & Ads
    'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com',
    'googleadservices.com', 'doubleclick.net', 'adsense.com', 'admob.com',
    
    // Facebook/Meta Tracking
    'connect.facebook.net', 'business.facebook.com', 'graph.facebook.com',
    
    // Amazon Tracking
    'amazon-adsystem.com',
    
    // Microsoft Tracking
    'c.clarity.ms', 'bat.bing.com',
    
    // Adobe Analytics
    'omtrdc.net', 'demdex.net',
    
    // Major Analytics Platforms
    'amplitude.com', 'mixpanel.com', 'segment.io', 'segment.com',
    'hotjar.com', 'fullstory.com', 'heap.io', 'posthog.com',
    
    // Ad Networks
    'adsrvr.org', 'criteo.com', 'criteo.net', 'outbrain.com',
    'taboola.com', 'mgid.com', 'revcontent.com',
    
    // Mobile Analytics
    'appsflyer.com', 'adjust.com', 'branch.io', 'kochava.com',
    
    // China Analytics
    'umeng.com', 'umeng.cn', 'cnzz.com', 'baidu.com',
    
    // TikTok Analytics
    'analytics.tiktok.com', 'ads.tiktok.com', 'events.tiktok.com',
    
    // LinkedIn Analytics
    'ads.linkedin.com', 'analytics.linkedin.com',
    
    // Twitter/X Analytics
    'analytics.twitter.com', 'ads-twitter.com',
    
    // Other Tracking Services
    'scorecardresearch.com', 'quantserve.com', 'chartbeat.com',
    'newrelic.com', 'nr-data.net', 'bugsnag.com', 'sentry.io',
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
  ],

  /**
   * 🚨 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    // Google
    'gtag.js', 'gtm.js', 'analytics.js', 'ga.js', 'adsbygoogle.js',
    
    // Facebook
    'fbevents.js', 'fbq.js', 'pixel.js',
    
    // Analytics Libraries
    'amplitude.js', 'mixpanel.js', 'segment.js', 'heap.js',
    'hotjar.js', 'fullstory.js', 'clarity.js', 'posthog.js',
    
    // Ad Tech
    'prebid.js', 'pubmatic.js', 'criteo.js', 'outbrain.js',
    'taboola.js', 'mgid.js', 'revcontent.js',
    
    // Generic Tracking
    'tracker.js', 'tracking.js', 'beacon.js', 'collect.js',
    'event.js', 'conversion.js', 'pixel.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATHS: new Set([
    '/collect', '/track', '/event', '/pixel', '/beacon',
    '/analytics', '/metrics', '/telemetry', '/log',
    '/impression', '/click', '/conversion',
    '/g/collect', '/j/collect', '/mp/collect',
    '/tr', '/pagead', '/ads',
  ]),

  /**
   * 🚫 可疑路徑關鍵字
   */
  SUSPICIOUS_PATH_KEYWORDS: [
    'track', 'collect', 'pixel', 'beacon', 'event', 'analytics',
    'metric', 'telemetry', 'impression', 'click', 'view', 'conversion',
    'attribution', 'fingerprint', 'utm', 'campaign', 'affiliate',
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
    
    // Multi-layer cache system
    this.caches = {
      domain: new EnhancedCache(CONFIG.CACHE_CONFIG.L1_DOMAIN_SIZE),
      url: new EnhancedCache(CONFIG.CACHE_CONFIG.L2_URL_DECISION_SIZE),
      regex: new EnhancedCache(CONFIG.CACHE_CONFIG.L3_REGEX_RESULT_SIZE),
    };
    
    // Bloom filter for fast negative checks
    this.bloomFilter = CONFIG.PERFORMANCE_CONFIG.ENABLE_BLOOM_FILTER ? 
      new BloomFilter(20000, 4) : null;
    
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
    
    // Pre-populate bloom filter with block domains
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
      // Check URL cache first
      const cached = this.caches.url.get(url);
      if (cached !== undefined) {
        this.updateStats(startTime, cached);
        return cached;
      }
      
      // Parse URL
      const urlObj = this.parseURL(url);
      if (!urlObj) {
        return this.makeDecision('ALLOW', url, startTime);
      }
      
      const { hostname, pathname } = urlObj;
      
      // Check redirector hosts
      if (CONFIG.REDIRECTOR_HOSTS.has(hostname)) {
        return this.makeDecision('ALLOW', url, startTime);
      }
      
      // Check hard whitelist (exact)
      if (CONFIG.HARD_WHITELIST_EXACT.has(hostname)) {
        return this.makeDecision('ALLOW', url, startTime);
      }
      
      // Check hard whitelist (wildcards)
      for (const domain of CONFIG.HARD_WHITELIST_WILDCARDS) {
        if (hostname.endsWith('.' + domain) || hostname === domain) {
          return this.makeDecision('ALLOW', url, startTime);
        }
      }
      
      // Fast bloom filter check
      if (this.bloomFilter && !this.bloomFilter.test(hostname)) {
        // Definitely not in block list, continue to soft checks
        return this.checkSoftRules(hostname, pathname, url, startTime);
      }
      
      // Check block list (exact)
      if (CONFIG.BLOCK_DOMAINS.has(hostname)) {
        return this.makeDecision('REJECT', url, startTime);
      }
      
      // Check block list (regex)
      for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
        const cacheKey = `${hostname}_${regex.source}`;
        let matches = this.caches.regex.get(cacheKey);
        
        if (matches === undefined) {
          matches = regex.test(hostname);
          this.caches.regex.set(cacheKey, matches);
        }
        
        if (matches) {
          return this.makeDecision('REJECT', url, startTime);
        }
      }
      
      // Check critical paths
      if (this.checkCriticalPaths(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }
      
      // Check tracking scripts
      if (this.checkTrackingScripts(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }
      
      // Check suspicious keywords in path
      if (this.checkSuspiciousKeywords(pathname)) {
        return this.makeDecision('REJECT', url, startTime);
      }
      
      // Continue with soft checks
      return this.checkSoftRules(hostname, pathname, url, startTime);
      
    } catch (error) {
      console.error('[URLFilter] Error:', error);
      return this.makeDecision('ALLOW', url, startTime);
    }
  }

  checkSoftRules(hostname, pathname, url, startTime) {
    // Check soft whitelist (exact)
    if (CONFIG.SOFT_WHITELIST_EXACT.has(hostname)) {
      return this.makeDecision('ALLOW', url, startTime);
    }
    
    // Check soft whitelist (wildcards)
    for (const domain of CONFIG.SOFT_WHITELIST_WILDCARDS) {
      if (hostname.endsWith('.' + domain) || hostname === domain) {
        return this.makeDecision('ALLOW', url, startTime);
      }
    }
    
    // Default allow
    return this.makeDecision('ALLOW', url, startTime);
  }

  checkCriticalPaths(pathname) {
    const pathLower = pathname.toLowerCase();
    for (const criticalPath of CONFIG.CRITICAL_TRACKING_PATHS) {
      if (pathLower.includes(criticalPath)) {
        return true;
      }
    }
    return false;
  }

  checkTrackingScripts(pathname) {
    const pathLower = pathname.toLowerCase();
    for (const script of CONFIG.CRITICAL_TRACKING_SCRIPTS) {
      if (pathLower.includes(script)) {
        return true;
      }
    }
    return false;
  }

  checkSuspiciousKeywords(pathname) {
    const pathLower = pathname.toLowerCase();
    let suspiciousCount = 0;
    
    for (const keyword of CONFIG.SUSPICIOUS_PATH_KEYWORDS) {
      if (pathLower.includes(keyword)) {
        suspiciousCount++;
        if (suspiciousCount >= 2) {
          return true;
        }
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
      // Fallback parsing
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

  makeDecision(decision, url, startTime) {
    // Update stats
    if (decision === 'REJECT') {
      this.stats.blocks++;
    } else {
      this.stats.allows++;
    }
    
    // Cache decision
    this.caches.url.set(url, decision);
    
    // Update timing stats
    this.updateStats(startTime, decision);
    
    return decision;
  }

  updateStats(startTime, decision) {
    const elapsed = performance.now() - startTime;
    this.stats.avgTime = (this.stats.avgTime * (this.stats.requests - 1) + elapsed) / this.stats.requests;
    
    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log(`[URLFilter] ${decision} in ${elapsed.toFixed(2)}ms`);
    }
  }

  getStats() {
    return {
      version: '40.81',
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

  clearCaches() {
    Object.values(this.caches).forEach(cache => cache.clear());
  }
}

// ================================================================================================
//                              📊 SURGE INTEGRATION
// ================================================================================================

// Global filter instance
const filterEngine = new URLFilterEngine();

/**
 * Surge main entry point
 */
async function main() {
  const url = $request.url;
  
  if (!url) {
    $done({});
    return;
  }
  
  try {
    const decision = await filterEngine.filter(url);
    
    if (decision === 'REJECT') {
      if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
        console.log(`[URLFilter] BLOCKED: ${url}`);
      }
      // Return empty response to block the request
      $done({ response: { status: 200, body: '' } });
    } else {
      // Allow the request to proceed
      $done({});
    }
    
  } catch (error) {
    console.error('[URLFilter] Fatal error:', error);
    // On error, allow the request
    $done({});
  }
}

// Execute main function
main();
