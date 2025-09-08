/**
 * @file        URL-Ultimate-Filter-Surge-V38.7-complete-classified.js
 * @version     38.7-complete-classified (完整黑白名单分类及全功能核心代码)
 * @description 按网站功能分类黑白名单，包含Trie与LRU缓存机制以及/v.*/event正则拦截
 * @author      Claude & Gemini & Acterus (+ Final Polish)
 * @lastUpdated 2025-09-08
 */

// ───────────── 配置 ─────────────

const CONFIG = {
  // --- 黑名单广告域 ---
  BLOCK_DOMAINS_ADS: new Set([
    'doubleclick.net', 'ad.doubleclick.net', 'googlesyndication.com', 'adsense.com', 'admob.com',
    'pubmatic.com', 'rubiconproject.com', 'openx.net', 'indexexchange.com', 'adform.net',
    'yieldlab.net', 'magnite.com', 'smartadserver.com', 'appnexus.com', 'adserver.yahoo.com',
    'popads.net', 'propellerads.com', 'adcash.com', 'zeropark.com', 'adroll.com'
  ]),

  // --- 黑名单数据分析 ---
  BLOCK_DOMAINS_ANALYTICS: new Set([
    'google-analytics.com', 'googletagmanager.com', 'app-measurement.com', 'graph.facebook.com',
    'mixpanel.com', 'amplitude.com', 'heap.io', 'hotjar.com', 'fullstory.com', 'segment.com',
    'mparticle.com', 'newrelic.com', 'datadoghq.com', 'logrocket.com', 'piwik.pro', 'matomo.cloud'
  ]),

  // --- 黑名单行为监控 ---
  BLOCK_DOMAINS_BEHAVIOR_MONITOR: new Set([
    'sentry.io', 'bugsnag.com', 'loggly.com', 'inspectlet.com', 'crazyegg.com', 'mouseflow.com'
  ]),

  // --- 黑名单社交分享 ---
  BLOCK_DOMAINS_SOCIAL_SHARE: new Set([
    'disqus.com', 'addthis.com', 'sharethis.com', 'po.st'
  ]),

  // --- 合并黑名单供调用 ---
  BLOCK_DOMAINS: null,

  // 硬白名单，完全放行
  API_WHITELIST_HARD_EXACT: new Set([]),

  // 软白名单，允许通过但可做参数清理
  API_WHITELIST_SOFT_EXACT: new Set([
    'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'accounts.google.com',
    'api.github.com', 'api.openai.com', 'api.telegram.org', 'api.discord.com', 'api.twitch.tv',
    'api.netlify.com', 'api.stripe.com', 'api.paypal.com',  'api.zendesk.com',  'duckduckgo.com'
  ]),

  // 万用字元白名单必须用Map支持子域匹配
  API_WHITELIST_WILDCARDS: new Map([
    ['youtube.com', true], ['m.youtube.com', true], ['paypal.com', true], ['stripe.com', true],
    ['apple.com', true], ['icloud.com', true], ['googlevideo.com', true], ['amazonaws.com', true],
    ['cloudfront.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['cdnjs.cloudflare.com', true]
  ]),

  // 关键追踪脚本名单
  CRITICAL_TRACKING_SCRIPTS: new Set([
    'gtag.js', 'analytics.js', 'adsbygoogle.js', 'fbevents.js', 'hotjar.js', 'mixpanel.js', 'segment.js',
    'clarity.js', 'matomo.js', 'beacon.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js'
  ]),

  // 关键追踪路径模式
  CRITICAL_TRACKING_PATTERNS: new Set([
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/collect',
    '/track', '/beacon', '/pixel', '/telemetry', '/api/log', '/api/track', '/api/collect', '/api/v1/track',
    '/intake', '/api/batch', 'facebook.com/tr', 'scorecardresearch.com/beacon.js', '/ad/v1/event'
  ]),

  // 路径关键字黑名单
  PATH_BLOCK_KEYWORDS: new Set([
    '/ad/', '/ads/', '/advert/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'amp-ad',
    'prebid', 'apstag', 'rtb', 'dsp', 'ssp', 'ad-wrapper', 'ad-loader', 'ad-placement', 'ad-events',
    '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/telemetry/', '/measurement/', '/log/'
  ]),

  // 路径允许白名单(静态资源、框架文件等)
  PATH_ALLOW_PATTERNS: new Set([
    'chunk.js', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
    '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'favicon.ico', 'manifest.json'
  ]),

  // 拋弃请求关键词
  DROP_KEYWORDS: new Set([
    'amp-analytics', 'csp-report', 'crash', 'error-report', 'heartbeat', 'web-vitals', 'profiler'
  ]),

  DROP_REGEX: [
    /(?:^|[\\/._?-])log(?:s|ging)?(?:[\\/._?-]|$)/i,
    /(?:^|[\\/])(?:beacon|collect|collector)(?:[\\/?.]|$)/i,
  ],

  GLOBAL_TRACKING_PARAMS: new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'
  ]),

  TRACKING_PREFIXES: new Set([
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mkt_', 'hsa_'
  ]),

  PARAMS_TO_KEEP_WHITELIST: new Set(['t', 'v', 'id']),

  // 路径正则规则，包括v.*/event动态事件拦截
  PATH_BLOCK_REGEX: [
    /^\/[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,
    /\/v.*\/event/i
  ]
};

// 合并黑名单
(function combineBlacklists(){
  CONFIG.BLOCK_DOMAINS = new Set();
  for(const s of [CONFIG.BLOCK_DOMAINS_ADS, CONFIG.BLOCK_DOMAINS_ANALYTICS, CONFIG.BLOCK_DOMAINS_BEHAVIOR_MONITOR, CONFIG.BLOCK_DOMAINS_SOCIAL_SHARE]){
    for(const domain of s) CONFIG.BLOCK_DOMAINS.add(domain);
  }
})();
  
// ────────────── 核心代码 ──────────────

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2 });

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE = { response: { status: 403 } };
const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);

class OptimizedTrie {
  constructor() { this.root = {}; }
  insert(key) {
    let node = this.root;
    for (const c of key) {
      if (!node[c]) node[c] = {};
      node = node[c];
    }
    node.isEndOfWord = true;
  }
  contains(text) {
    for (let i = 0; i < text.length; i++) {
      let node = this.root;
      for (let j = i; j < text.length; j++) {
        const c = text[j];
        if (!node[c]) break;
        node = node[c];
        if (node.isEndOfWord) return true;
      }
    }
    return false;
  }
  startsWith(prefix) {
    let node = this.root;
    for (const c of prefix) {
      if (!node[c]) return false;
      node = node[c];
    }
    return true;
  }
}

class HighPerformanceLRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = { k: null, v: null, p: null, n: null };
    this.tail = { k: null, v: null, p: null, n: null };
    this.head.n = this.tail;
    this.tail.p = this.head;
  }
  _add(node) {
    node.p = this.head;
    node.n = this.head.n;
    this.head.n.p = node;
    this.head.n = node;
  }
  _remove(node) {
    node.p.n = node.n;
    node.n.p = node.p;
  }
  get(key) {
    const node = this.cache.get(key);
    if (!node) return null;
    this._remove(node);
    this._add(node);
    return node.v;
  }
  set(key, value) {
    let node = this.cache.get(key);
    if (node) {
      node.v = value;
      this._remove(node);
      this._add(node);
    } else {
      node = { k: key, v: value, p: null, n: null };
      if (this.cache.size >= this.maxSize) {
        const last = this.tail.p;
        this._remove(last);
        this.cache.delete(last.k);
      }
      this.cache.set(key, node);
      this._add(node);
    }
  }
}

class MultiLevelCacheManager {
  constructor() {
    this.l1DomainCache = new HighPerformanceLRUCache(256);
    this.l2UrlDecisionCache = new HighPerformanceLRUCache(1024);
    this.urlObjectCache = new HighPerformanceLRUCache(64);
  }
  getDomainDecision(host) { return this.l1DomainCache.get(host); }
  setDomainDecision(host, decision) { this.l1DomainCache.set(host, decision); }
  getUrlDecision(key) { return this.l2UrlDecisionCache.get(key); }
  setUrlDecision(key, decision) { this.l2UrlDecisionCache.set(key, decision); }
  getUrlObject(rawUrl) { return this.urlObjectCache.get(rawUrl); }
  setUrlObject(rawUrl, urlObj) { this.urlObjectCache.set(rawUrl, urlObj); }
}

const multiLevelCache = new MultiLevelCacheManager();

const OPTIMIZED_TRIES = {
  prefix: new OptimizedTrie(),
  criticalPattern: new OptimizedTrie(),
  pathBlock: new OptimizedTrie(),
  allow: new OptimizedTrie(),
  drop: new OptimizedTrie()
};

function initializeOptimizedTries() {
  for (const prefix of CONFIG.TRACKING_PREFIXES) OPTIMIZED_TRIES.prefix.insert(prefix);
  for (const pattern of CONFIG.CRITICAL_TRACKING_PATTERNS) OPTIMIZED_TRIES.criticalPattern.insert(pattern);
  for (const keyword of CONFIG.PATH_BLOCK_KEYWORDS) OPTIMIZED_TRIES.pathBlock.insert(keyword);
  for (const allow of CONFIG.PATH_ALLOW_PATTERNS) OPTIMIZED_TRIES.allow.insert(allow);
  for (const drop of CONFIG.DROP_KEYWORDS) OPTIMIZED_TRIES.drop.insert(drop);
}

function getWhitelistStatus(host) {
  if (CONFIG.API_WHITELIST_HARD_EXACT.has(host)) return 2;
  if (CONFIG.API_WHITELIST_SOFT_EXACT.has(host)) return 1;
  let current = host;
  while (true) {
    if (CONFIG.API_WHITELIST_WILDCARDS.has(current)) return 1;
    const idx = current.indexOf('.');
    if (idx === -1) break;
    current = current.slice(idx + 1);
  }
  return 0;
}

function isOptimizedDomainBlocked(host) {
  let checkHost = host;
  while (checkHost) {
    if (CONFIG.BLOCK_DOMAINS.has(checkHost)) return true;
    const idx = checkHost.indexOf('.');
    if (idx === -1) break;
    checkHost = checkHost.slice(idx + 1);
  }
  return false;
}

function isOptimizedCriticalTrackingScript(path) {
  const cacheKey = `crit:${path}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) return cached;
  const lastSlash = path.lastIndexOf('/');
  const scriptName = lastSlash !== -1 ? path.slice(lastSlash + 1).split('?')[0] : path.split('?')[0];
  const result = CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName) || OPTIMIZED_TRIES.criticalPattern.contains(path);
  multiLevelCache.setUrlDecision(cacheKey, result);
  return result;
}

function isOptimizedPathBlocked(path) {
  const cacheKey = `path:${path}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) return cached;
  const result = OPTIMIZED_TRIES.pathBlock.contains(path) && !OPTIMIZED_TRIES.allow.contains(path);
  multiLevelCache.setUrlDecision(cacheKey, result);
  return result;
}

function isOptimizedPathBlockedByRegex(path) {
  const cacheKey = `regex:${path}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) return cached;
  for (const regex of CONFIG.PATH_BLOCK_REGEX) {
    if (regex.test(path)) {
      multiLevelCache.setUrlDecision(cacheKey, true);
      return true;
    }
  }
  multiLevelCache.setUrlDecision(cacheKey, false);
  return false;
}

function isDropPath(pathLower) {
  for (const regex of CONFIG.DROP_REGEX) {
    if (regex.test(pathLower)) return true;
  }
  return OPTIMIZED_TRIES.drop.contains(pathLower);
}

function getOptimizedBlockResponse(path) {
  if (isDropPath(path.toLowerCase())) return REJECT_RESPONSE;
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex !== -1 && IMAGE_EXTENSIONS.has(path.slice(dotIndex))) return TINY_GIF_RESPONSE;
  return REJECT_RESPONSE;
}

function optimizedCleanTrackingParamsImmutable(urlObj) {
  const clone = new URL(urlObj.href);
  let keysToDelete = null;
  for (const key of clone.searchParams.keys()) {
    const lowerKey = key.toLowerCase();
    if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;
    if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || OPTIMIZED_TRIES.prefix.startsWith(lowerKey)) {
      if (!keysToDelete) keysToDelete = [];
      keysToDelete.push(key);
    }
  }
  if (keysToDelete) {
    for (const k of keysToDelete) clone.searchParams.delete(k);
    return clone;
  }
  return null;
}

function processOptimizedRequest(request) {
  try {
    if (!request?.url || request.url.length < 10) return null;
    const rawUrl = request.url;
    let url = multiLevelCache.getUrlObject(rawUrl);
    if (!url) {
      try {
        url = new URL(rawUrl);
        multiLevelCache.setUrlObject(rawUrl, url);
      } catch (e) {
        return null;
      }
    }
    const hostname = url.hostname.toLowerCase();

    const whitelistStatus = getWhitelistStatus(hostname);
    if (whitelistStatus === 2) return null; // 硬白名单直接放行
    const isSoftWhitelist = whitelistStatus === 1;
    
    if (!isSoftWhitelist && multiLevelCache.getDomainDecision(hostname) === DECISION.BLOCK) {
      return getOptimizedBlockResponse(url.pathname + url.search);
    }

    if (isOptimizedDomainBlocked(hostname)) {
      if (!isSoftWhitelist) multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      return getOptimizedBlockResponse(url.pathname + url.search);
    }

    const fullPath = url.pathname + url.search;
    if (isOptimizedCriticalTrackingScript(fullPath) || isOptimizedPathBlocked(fullPath) || isOptimizedPathBlockedByRegex(url.pathname)) {
      if (!isSoftWhitelist) multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      return getOptimizedBlockResponse(fullPath);
    }

    const cleanedUrl = optimizedCleanTrackingParamsImmutable(url);
    if (cleanedUrl && cleanedUrl.href !== url.href) {
      // 重定向至清理追踪参数后的URL
      return { response: { status: 302, headers: { Location: cleanedUrl.href } } };
    }

    return null;
  } catch {
    return null;
  }
}

// 初始化 Trie 等数据结构
(function init() {
  initializeOptimizedTries();
  if (typeof $request === 'undefined') {
    if (typeof $done !== 'undefined') {
      $done({ version: '38.7-complete-classified' });
    }
    return;
  }
  const result = processOptimizedRequest($request);
  if (typeof $done !== 'undefined') {
    $done(result || {});
  }
})();
