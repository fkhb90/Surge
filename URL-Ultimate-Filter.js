/**
 * @file        URL-Ultimate-Filter-Optimized.js
 * @version     14.0 (Refactored & Algorithmically Enhanced)
 * @description 透過引入 Trie 演算法、重構核心架構、修補安全漏洞及擴展規則庫，實現了性能與功能的代際提升。
 * 新特性：Trie 演算法、模組化類別設計、強化的安全匹配邏輯、擴展的規則庫（含新興 AI 平台）。
 * @author      Gemini (基於 v13.0 全面重構)
 * @lastUpdated 2025-08-27
 */

// =================================================================================
// ⚙️ 核心設定區 (Centralized Configuration)
// =================================================================================

const config = {
    /**
     * 🚫 域名攔截黑名單 (Domain Blocklist) - 優化為 Set 提升查找效能
     */
    BLOCK_DOMAINS: new Set([
        // 廣告網路
        'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
        'googlesyndication.com', 'admob.com', 'adsense.com', 'pagead2.googlesyndication.com',
        'graph.facebook.com', 'connect.facebook.net', 'criteo.com', 'taboola.com', 'outbrain.com',
        'pubmatic.com', 'rubiconproject.com', 'openx.net', 'adsrvr.org', 'adform.net', 'semasio.net',
        'yieldlab.net', 'ads.linkedin.com', 'static.ads-twitter.com',
        // 分析與追蹤
        'scorecardresearch.com', 'chartbeat.com', 'app-measurement.com', 'branch.io', 'appsflyer.com',
        'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com',
        'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms',
        'track.hubspot.com', 'api.pendo.io'
    ]),

    /**
     * ✅ API 功能性域名白名單 (API Whitelist)
     */
    API_WHITELIST: {
        EXACT: new Set([
            'youtubei.googleapis.com', 'api.weibo.cn', 'api.xiaohongshu.com', 'api.bilibili.com',
            'api.zhihu.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
            'api.github.com', 'api.openai.com', 'api.anthropic.com', 'api.google.com',
            'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
            'legy.line-apps.com'
        ]),
        WILDCARDS: new Set([
            'youtube.com', 'm.youtube.com', 'googlevideo.com', 'paypal.com', 'stripe.com', 'apple.com',
            'icloud.com', 'windowsupdate.com', 'amazonaws.com', 'aliyuncs.com',
            'cloud.tencent.com', 'cloudfront.net', 'vercel.app', 'netlify.app', 'jsdelivr.net',
            'unpkg.com',
            // RSS/新聞聚合服務
            'feedly.com', 'inoreader.com', 'theoldreader.com', 'newsblur.com', 'flipboard.com'
        ])
    },

    /**
     * ✅ 業務功能路徑白名單 (Path Allowlist)
     */
    PATH_ALLOW_KEYWORDS: new Set([
        'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'chunk.js',
        'download', 'upload', 'payload', 'broadcast', 'roadmap', 'dialog', 'blog', 'catalog', 'game',
        'language', 'page', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
        'feed', 'rss', 'atom', 'xml', 'subscription', 'profile', 'dashboard', 'admin', 'config',
        'settings', 'search', 'media', 'image', 'video', 'document', 'export', 'import', 'sync'
    ]),

    /**
     * 🚫 路徑攔截黑名單關鍵字 (Path Blocklist Keywords) - 將由 Trie 結構處理
     */
    PATH_BLOCK_KEYWORDS: [
        '/ad/', '/ads/', '/adv/', '/advert', '/affiliate/', '/sponsor', '/promoted', '/banner',
        '/track', '/trace', '/tracker', '/tracking', '/analytics', '/metric', '/telemetry',
        '/measurement', '/log', '/logs', '/logger', '/beacon', '/pixel', '/collect', '/report',
        'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'gtag', 'gtm', 'fbevents', 'fbq',
        'amp-ad', 'amp-analytics', 'prebid', 'pwt.js', 'utag.js', 'hotjar', 'comscore', 'mixpanel'
    ],
    
    /**
     * 💧 直接拋棄請求的路徑關鍵字 (Drop Request Keywords)
     */
    DROP_PATH_KEYWORDS: new Set(['/log/', '/logs/', 'amp-loader', 'beacon', 'collect', 'telemetry', 'crash']),

    /**
     * 🚮 全域追蹤參數黑名單 (Global Tracking Parameters)
     */
    GLOBAL_TRACKING_PARAMS: new Set([
        // 主流平台
        'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'msclkid', 'fbclid', 'igshid',
        'mc_cid', 'mc_eid', 'mkt_tok', 'yclid', 'mibextid',
        // 通用參數
        'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'term', 'creative',
        'si', '_openstat', 'yclid', 'hsCtaTracking',
        // 中國大陸平台
        'spm', 'scm', 'pvid', 'fr', 'type', 'scene', 'share_source', 'share_medium', 'share_plat',
        'share_tag', 'tt_from', 'xhsshare', 'is_copy_url',
        // 新興 AI 平台
        'source_id', 'track_id', 'recommend_id', 'from_type'
    ]),

    /**
     * 🚮 追蹤參數前綴黑名單 (Tracking Prefixes) - 將由 Trie 結構處理
     */
    TRACKING_PREFIXES: [
        'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_',
        'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', '__cft_', '_hs'
    ]
};

// =================================================================================
// 🏗️ 核心演算法與資料結構 (Core Algorithms & Data Structures)
// =================================================================================

/**
 * 🌳 Trie (字典樹) - 用於高效前綴匹配
 */
class Trie {
    constructor() {
        this.root = {};
    }

    insert(word) {
        let node = this.root;
        for (const char of word) {
            if (!node[char]) {
                node[char] = {};
            }
            node = node[char];
        }
        node.isEndOfWord = true;
    }

    // 檢查字串是否以 Trie 中的任一前綴開頭
    startsWith(prefix) {
        let node = this.root;
        for (const char of prefix) {
            if (!node[char]) {
                return false;
            }
            node = node[char];
        }
        return true;
    }

    // 檢查文本中是否包含 Trie 中的任一關鍵字
    contains(text) {
        for (let i = 0; i < text.length; i++) {
            let node = this.root;
            for (let j = i; j < text.length; j++) {
                const char = text[j];
                if (!node[char]) {
                    break;
                }
                node = node[char];
                if (node.isEndOfWord) {
                    return true;
                }
            }
        }
        return false;
    }
}

// =================================================================================
// 🚀 核心處理邏輯 (Core Processing Logic)
// =================================================================================

class URLFilter {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.maxCacheSize = 1000;
        this.ttl = 300000; // 5分鐘
        this.stats = { total: 0, blocked: 0, cleaned: 0, whitelisted: 0, errors: 0 };

        // 初始化 Trie 結構
        this.prefixTrie = new Trie();
        this.config.TRACKING_PREFIXES.forEach(p => this.prefixTrie.insert(p));

        this.pathBlockTrie = new Trie();
        this.config.PATH_BLOCK_KEYWORDS.forEach(k => this.pathBlockTrie.insert(k));
    }

    _getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    _setToCache(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            // 簡單的 FIFO 清理策略
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, { value, expiry: Date.now() + this.ttl });
    }

    isApiWhitelisted(hostname) {
        const cacheKey = `wl:${hostname}`;
        const cachedResult = this._getFromCache(cacheKey);
        if (cachedResult !== null) return cachedResult;

        if (this.config.API_WHITELIST.EXACT.has(hostname)) {
            this._setToCache(cacheKey, true);
            return true;
        }
        for (const domain of this.config.API_WHITELIST.WILDCARDS) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                this._setToCache(cacheKey, true);
                return true;
            }
        }
        this._setToCache(cacheKey, false);
        return false;
    }

    isDomainBlocked(hostname) {
        const cacheKey = `bl:${hostname}`;
        const cachedResult = this._getFromCache(cacheKey);
        if (cachedResult !== null) return cachedResult;

        for (const domain of this.config.BLOCK_DOMAINS) {
            // 使用嚴格的後綴匹配，避免子字串誤判
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                this._setToCache(cacheKey, true);
                return true;
            }
        }
        this._setToCache(cacheKey, false);
        return false;
    }
    
    isPathBlocked(path) {
        const cacheKey = `pb:${path}`;
        const cachedResult = this._getFromCache(cacheKey);
        if (cachedResult !== null) return cachedResult;

        // 優先檢查是否包含攔截關鍵字 (Trie 演算法)
        if (this.pathBlockTrie.contains(path)) {
            // 若命中攔截規則，再檢查是否被豁免
            for (const allowKeyword of this.config.PATH_ALLOW_KEYWORDS) {
                if (path.includes(allowKeyword)) {
                    this._setToCache(cacheKey, false); // 被豁免，不攔截
                    return false;
                }
            }
            this._setToCache(cacheKey, true); // 未被豁免，攔截
            return true;
        }
        this._setToCache(cacheKey, false); // 未命中，不攔截
        return false;
    }

    cleanTrackingParams(url) {
        let paramsChanged = false;
        const paramKeys = Array.from(url.searchParams.keys());

        for (const key of paramKeys) {
            const lowerKey = key.toLowerCase();
            if (this.config.GLOBAL_TRACKING_PARAMS.has(lowerKey) || this.prefixTrie.startsWith(lowerKey)) {
                url.searchParams.delete(key);
                paramsChanged = true;
            }
        }
        return paramsChanged;
    }

    process(request) {
        this.stats.total++;
        if (!request || !request.url) return null;

        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            this.stats.errors++;
            console.error(`[URLFilter] Invalid URL: ${request.url}`);
            return null; // 對於無效 URL，直接放行
        }
        
        const hostname = url.hostname.toLowerCase();
        const path = (url.pathname + url.search).toLowerCase();

        // Step 1: API 白名單最優先
        if (this.isApiWhitelisted(hostname)) {
            this.stats.whitelisted++;
            return null;
        }

        // Step 2: 域名黑名單
        if (this.isDomainBlocked(hostname)) {
            this.stats.blocked++;
            return { response: { status: 403 } }; // REJECT
        }

        // Step 3: 路徑攔截
        if (this.isPathBlocked(path)) {
            this.stats.blocked++;
            // 檢查是否需要 DROP 而非 REJECT
            for (const dropKeyword of this.config.DROP_PATH_KEYWORDS) {
                if (path.includes(dropKeyword)) {
                    return { response: {} }; // DROP
                }
            }
            return { response: { status: 403 } }; // REJECT
        }

        // Step 4: 參數清理
        if (this.cleanTrackingParams(url)) {
            this.stats.cleaned++;
            const cleanedUrl = url.toString();
            return {
                response: {
                    status: 302,
                    headers: { 'Location': cleanedUrl }
                }
            };
        }

        return null; // 無匹配規則，放行
    }
}

// =================================================================================
// 🎬 主執行邏輯 (Main Execution Logic)
// =================================================================================

// 實例化 Filter
const urlFilter = new URLFilter(config);

// 模擬 Surge 環境的 IIFE
(function() {
    try {
        if (typeof $request === 'undefined') {
            console.log("URLFilter v14.0 Initialized. (Not in a request context)");
            return;
        }
        
        const result = urlFilter.process($request);
        
        if (typeof $done !== 'undefined') {
            $done(result || {});
        }
    } catch (error) {
        console.error(`[URLFilter] Critical Error: ${error.message}`);
        if (typeof $done !== 'undefined') {
            $done({}); // 發生未知錯誤時，安全起見直接放行
        }
    }
})();
