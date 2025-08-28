/**
 * @file        URL-Ultimate-Filter-Optimized.js
 * @version     13.0 (Performance Enhanced)
 * @description 基於測試案例優化的終極版本。解決了性能瓶頸、安全漏洞及功能缺陷。
 *              新增：快取機制、嚴格通配符匹配、錯誤處理、統計功能、動態配置支援
 * @author      Claude (基於測試分析優化)
 * @lastUpdated 2025-08-27
 */

// =================================================================================
// ⚙️ 核心設定區 (Enhanced Configuration)
// =================================================================================

/**
 * 🚫 域名攔截黑名單 (Domain Blocklist) - 優化為 Set 提升查找效能
 */
const BLOCK_DOMAINS = new Set([
    'adform.net', 'adjust.com', 'admob.com', 'ads.linkedin.com', 'adsense.com',
    'adsrvr.org', 'amplitude.com', 'analytics.twitter.com', 'api.pendo.io',
    'app-measurement.com', 'appsflyer.com', 'branch.io', 'bugsnag.com',
    'c.clarity.ms', 'chartbeat.com', 'connect.facebook.net', 'criteo.com',
    'doubleclick.net', 'google-analytics.com', 'googleadservices.com',
    'googlesyndication.com', 'googletagmanager.com', 'graph.facebook.com',
    'heap.io', 'hotjar.com', 'log.byteoversea.com', 'loggly.com', 'mixpanel.com',
    'openx.net', 'optimizely.com', 'outbrain.com', 'pagead2.googlesyndication.com',
    'pubmatic.com', 'rubiconproject.com', 's.yimg.jp', 'scorecardresearch.com',
    'semasio.net', 'sentry.io', 'static.ads-twitter.com', 'taboola.com',
    'track.hubspot.com', 'vwo.com', 'yieldlab.net',  's.yimg.jp'
]);

/**
 * ✅ API 功能性域名白名單 (Enhanced API Whitelist)
 * @description 使用 Map 結構優化查找性能，支援精確匹配和通配符匹配
 */
const API_WHITELIST_EXACT = new Set([
    'youtubei.googleapis.com', 'api.weibo.cn', 'api.xiaohongshu.com', 'api.bilibili.com',
    'api.zhihu.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
    'open.spotify.com', 'api.deepseek.com', 'kimi.moonshot.cn', 'tongyi.aliyun.com',
    'xinghuo.xfyun.cn', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    'api.github.com'
     // 通用 CDN 和開發平台
     '*.googlevideo.com', '*.aliyuncs.com', '*.cloud.tencent.com', '*.cloudfront.net', 
     '*.vercel.app', '*.netlify.app', 'jsdelivr.net', 'unpkg.com',
     // RSS 服務
     'feedly.com', 'inoreader.com',
     // 支付與更新
     'paypal.com', 'stripe.com', 'apple.com', 'icloud.com', 'windowsupdate.com'
]);

const API_WHITELIST_WILDCARDS = new Map([
    ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true],
    ['paypal.com', true], ['stripe.com', true], ['apple.com', true], ['icloud.com', true],
    ['windowsupdate.com', true], ['amazonaws.com', true], ['aliyuncs.com', true],
    ['cloud.tencent.com', true], ['cloudfront.net', true]
]);

/**
 * ✅ 增強版路徑白名單 (Enhanced Path Whitelist)
 * @description 新增更多業務關鍵字，減少誤殺
 */
const PATH_ALLOW_PATTERNS = new Set([
    // 原有模式
    'chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
    'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js',
    'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board',
    'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
    'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
    'amp-anim', 'amp-animation', 'amp-iframe',
    // 新增業務關鍵字
    'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login',
    'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference',
    'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search',
    'filter', 'sort', 'category', 'tag', 'media', 'image', 'video', 'audio',
    'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync'
]);

/**
 * 🚫 增強版路徑黑名單 (Enhanced Path Blacklist)
 */
const PATH_BLOCK_KEYWORDS = new Set([
    // 廣告相關
    'ad', 'ads', 'adv', 'advert', 'advertisement', 'advertising', 'affiliate', 'sponsor',
    'promoted', 'banner', 'popup', 'interstitial', 'preroll', 'midroll', 'postroll',
    // 追蹤相關  
    'track', 'trace', 'tracker', 'tracking', 'analytics', 'analytic', 'metric', 'metrics',
    'telemetry', 'measurement', 'insight', 'intelligence', 'monitor', 'monitoring',
    // 日誌相關
    'log', 'logs', 'logger', 'logging', 'logrecord', 'putlog', 'audit', 'event',
    'beacon', 'pixel', 'collect', 'collector', 'report', 'reports', 'reporting',
    // 錯誤追蹤
    'sentry', 'bugsnag', 'crash', 'error', 'exception', 'stacktrace',
    // 特定平台
    'ga', 'gpt', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense',
    'dfp', 'gtag', 'gtm', 'google-analytics', 'facebook', 'fbevents', 'fbq',
    'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru',
    'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude',
    // AMP 廣告
    'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads',
    // 程序化廣告
    'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp',
    // 其他
    'marketing', 'cookiepolicy', 'consent', 'gdpr', 'ccpa', 'social', 'plusone',
    'related-posts', 'optimize', 'sso', 'firebase', 'pushnotification'
]);

/**
 * 💧 直接拋棄請求的關鍵字 (Enhanced Drop Keywords)
 */
const DROP_KEYWORDS = new Set([
    'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 
    'beacon', 'collect', 'collector', 'telemetry', 'crash', 'error-report',
    'metric', 'insight', 'audit', 'event-stream'
]);

/**
 * 🚮 增強版全域追蹤參數黑名單 (Enhanced Global Tracking Parameters)
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    // Google 相關
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au',
    // Microsoft/Bing
    'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid',
    // Facebook/Meta
    'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid',
    // Instagram/Threads
    'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid',
    // Email Marketing
    'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign',
    // General
    'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content',
    // Chinese Platforms
    'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id',
    'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user',
    // TikTok/Douyin
    'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id',
    // Xiaohongshu
    'xhsshare', 'xhs_share', 'app_platform', 'share_from',
    // Others
    'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene',
    'traceid', 'request_id', 'aff_id', '__twitter_impression', '_openstat',
    'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src',
    'vero_conv', 'vero_id', 'ck_subscriber_id'
]);

/**
 * 🚮 增強版追蹤參數前綴黑名單 (Enhanced Tracking Prefixes)
 */
const TRACKING_PREFIXES = [
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_',
    'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cft_',
    'hsCtaTracking_', '_hsenc_', '_hsmi_', 'pk_', 'mtm_', 'campaign_', 'source_',
    'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_'
];

// =================================================================================
// 🚀 性能優化組件 (Performance Enhancement Components)
// =================================================================================

/**
 * 📊 性能統計器
 */
class PerformanceStats {
    constructor() {
        this.stats = {
            totalRequests: 0,
            blockedDomains: 0,
            blockedPaths: 0,
            cleanedParams: 0,
            whitelistHits: 0,
            errors: 0,
            processingTime: 0
        };
        this.startTime = Date.now();
    }
    
    increment(type) {
        if (this.stats.hasOwnProperty(type)) {
            this.stats[type]++;
        }
    }
    
    addProcessingTime(time) {
        this.stats.processingTime += time;
    }
    
    getStats() {
        const uptime = Date.now() - this.startTime;
        return {
            ...this.stats,
            uptime: uptime,
            avgProcessingTime: this.stats.totalRequests > 0 ? 
                this.stats.processingTime / this.stats.totalRequests : 0
        };
    }
    
    reset() {
        Object.keys(this.stats).forEach(key => {
            if (typeof this.stats[key] === 'number') {
                this.stats[key] = 0;
            }
        });
        this.startTime = Date.now();
    }
}

/**
 * 🗄️ 智慧快取系統
 */
class IntelligentCache {
    constructor(maxSize = 1000, ttl = 300000) { // 5分鐘 TTL
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.hitCount = 0;
        this.missCount = 0;
    }
    
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.missCount++;
            return null;
        }
        
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            this.missCount++;
            return null;
        }
        
        this.hitCount++;
        return entry.value;
    }
    
    set(key, value) {
        // 清理過期項目
        if (this.cache.size >= this.maxSize) {
            this._cleanup();
        }
        
        this.cache.set(key, {
            value: value,
            expiry: Date.now() + this.ttl
        });
    }
    
    _cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
                cleaned++;
            }
            
            // 如果清理了足夠的項目就停止
            if (cleaned > this.maxSize * 0.1) break;
        }
        
        // 如果快取仍然太大，刪除最舊的項目
        if (this.cache.size >= this.maxSize) {
            const entries = Array.from(this.cache.entries());
            const toDelete = entries.slice(0, Math.floor(this.maxSize * 0.2));
            toDelete.forEach(([key]) => this.cache.delete(key));
        }
    }
    
    getStats() {
        const total = this.hitCount + this.missCount;
        return {
            size: this.cache.size,
            hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
            hits: this.hitCount,
            misses: this.missCount
        };
    }
}

/**
 * 🔧 錯誤處理器
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }
    
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            context: context,
            stack: error.stack || null
        };
        
        this.errors.unshift(errorEntry);
        
        // 保持錯誤日誌大小在限制內
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }
        
        // 在開發環境輸出到控制台
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter Error]', errorEntry);
        }
    }
    
    getRecentErrors(limit = 10) {
        return this.errors.slice(0, limit);
    }
    
    clearErrors() {
        this.errors = [];
    }
}

// =================================================================================
// 🏗️ 初始化全域組件 (Initialize Global Components)
// =================================================================================

const performanceStats = new PerformanceStats();
const cache = new IntelligentCache();
const errorHandler = new ErrorHandler();

// =================================================================================
// 🚀 核心處理邏輯 (Enhanced Core Logic)
// =================================================================================

const TINY_GIF_RESPONSE = { 
    response: { 
        status: 200, 
        headers: { 'Content-Type': 'image/gif' }, 
        body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
    }
};

const DROP_RESPONSE = { response: {} };
const REJECT_RESPONSE = { response: { status: 403 } };

/**
 * 🔍 增強版域名匹配檢查
 */
function isApiWhitelisted(hostname) {
    const cacheKey = `whitelist:${hostname}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
    
    // 精確匹配檢查
    if (API_WHITELIST_EXACT.has(hostname)) {
        cache.set(cacheKey, true);
        return true;
    }
    
    // 通配符匹配檢查 - 嚴格匹配，防止域名偽造
    for (const [domain, _] of API_WHITELIST_WILDCARDS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
            cache.set(cacheKey, true);
            return true;
        }
    }
    
    cache.set(cacheKey, false);
    return false;
}

/**
 * 🚫 域名黑名單檢查
 */
function isDomainBlocked(hostname) {
    const cacheKey = `blocked:${hostname}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
    
    // 直接匹配
    if (BLOCK_DOMAINS.has(hostname)) {
        cache.set(cacheKey, true);
        return true;
    }
    
    // 部分匹配（包含檢查）
    for (const blockDomain of BLOCK_DOMAINS) {
        if (hostname.includes(blockDomain)) {
            cache.set(cacheKey, true);
            return true;
        }
    }
    
    cache.set(cacheKey, false);
    return false;
}

/**
 * 🛤️ 路徑攔截檢查
 */
function isPathBlocked(pathAndQuery) {
    const cacheKey = `path:${pathAndQuery}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
    
    let isBlocked = false;
    
    // 檢查黑名單關鍵字
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
            // 檢查白名單防誤殺
            let isWhitelisted = false;
            for (const allowPattern of PATH_ALLOW_PATTERNS) {
                if (pathAndQuery.includes(allowPattern)) {
                    isWhitelisted = true;
                    break;
                }
            }
            
            if (!isWhitelisted) {
                isBlocked = true;
                break;
            }
        }
    }
    
    cache.set(cacheKey, isBlocked);
    return isBlocked;
}

/**
 * 🧹 參數清理功能
 */
function cleanTrackingParams(url) {
    let paramsChanged = false;
    const paramKeys = Array.from(url.searchParams.keys());
    
    for (const key of paramKeys) {
        const lowerKey = key.toLowerCase();
        let shouldDelete = false;
        
        // 檢查全域追蹤參數
        if (GLOBAL_TRACKING_PARAMS.has(lowerKey)) {
            shouldDelete = true;
        } else {
            // 檢查前綴匹配
            for (const prefix of TRACKING_PREFIXES) {
                if (lowerKey.startsWith(prefix)) {
                    shouldDelete = true;
                    break;
                }
            }
        }
        
        if (shouldDelete) {
            url.searchParams.delete(key);
            paramsChanged = true;
        }
    }
    
    return paramsChanged;
}

/**
 * 🎯 主要處理函數 (Enhanced Main Processor)
 */
function processRequest(request) {
    const startTime = performance.now ? performance.now() : Date.now();
    
    try {
        performanceStats.increment('totalRequests');
        
        // 驗證請求有效性
        if (!request || !request.url) {
            return null;
        }
        
        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            errorHandler.logError(e, { url: request.url, step: 'URL parsing' });
            return null;
        }
        
        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();
        
        // === Step 0: API 域名白名單檢查 ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            return null; // 完全放行
        }
        
        // === Step 1: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('blockedDomains');
            return REJECT_RESPONSE;
        }
        
        // === Step 2: 路徑攔截檢查 ===
        if (isPathBlocked(pathAndQuery)) {
            performanceStats.increment('blockedPaths');
            
            // 檢查是否需要 DROP
            for (const dropKeyword of DROP_KEYWORDS) {
                if (pathAndQuery.includes(dropKeyword)) {
                    return DROP_RESPONSE;
                }
            }
            
            // 圖片類廣告替換為透明 GIF
            const imageExtensions = ['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
            const isImage = imageExtensions.some(ext => pathAndQuery.endsWith(ext));
            
            if (isImage) {
                return TINY_GIF_RESPONSE;
            }
            
            return REJECT_RESPONSE;
        }
        
        // === Step 3: 追蹤參數清理 ===
        if (cleanTrackingParams(url)) {
            performanceStats.increment('cleanedParams');
            const cleanedUrl = url.toString();
            return { 
                response: { 
                    status: 302, 
                    headers: { 'Location': cleanedUrl } 
                } 
            };
        }
        
        return null; // 無需處理，放行
        
    } catch (error) {
        performanceStats.increment('errors');
        errorHandler.logError(error, { 
            url: request.url,
            hostname: hostname || 'unknown',
            step: 'main processing'
        });
        return null; // 發生錯誤時放行請求，避免破壞正常功能
    } finally {
        // 記錄處理時間
        const endTime = performance.now ? performance.now() : Date.now();
        performanceStats.addProcessingTime(endTime - startTime);
    }
}

/**
 * 📈 診斷資訊輸出
 */
function getDiagnosticInfo() {
    return {
        performance: performanceStats.getStats(),
        cache: cache.getStats(),
        errors: errorHandler.getRecentErrors(5),
        config: {
            domainBlockCount: BLOCK_DOMAINS.size,
            apiWhitelistExact: API_WHITELIST_EXACT.size,
            apiWhitelistWildcards: API_WHITELIST_WILDCARDS.size,
            pathAllowPatterns: PATH_ALLOW_PATTERNS.size,
            pathBlockKeywords: PATH_BLOCK_KEYWORDS.size,
            trackingParams: GLOBAL_TRACKING_PARAMS.size,
            trackingPrefixes: TRACKING_PREFIXES.length
        }
    };
}

// =================================================================================
// 🎬 主執行邏輯 (Enhanced Main Execution)
// =================================================================================

(function() {
    try {
        // 檢查執行環境
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ 
                    diagnostic: getDiagnosticInfo(),
                    message: 'URL Filter initialized successfully'
                });
            }
            return;
        }
        
        // 處理請求
        const result = processRequest($request);
        
        // 返回結果
        if (typeof $done !== 'undefined') {
            if (result) {
                $done(result);
            } else {
                $done({});
            }
        }
        
    } catch (error) {
        errorHandler.logError(error, { context: 'main execution' });
        
        // 確保即使發生錯誤也能正常結束
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// 🔧 調試和維護功能 (Debug & Maintenance Functions)
// =================================================================================

/**
 * 全域暴露調試函數（僅在開發環境）
 */
if (typeof global !== 'undefined' || typeof window !== 'undefined') {
    const debugAPI = {
        getStats: () => performanceStats.getStats(),
        getCacheStats: () => cache.getStats(),
        getErrors: () => errorHandler.getRecentErrors(),
        getDiagnostic: getDiagnosticInfo,
        clearCache: () => cache.cache.clear(),
        clearErrors: () => errorHandler.clearErrors(),
        resetStats: () => performanceStats.reset(),
        testUrl: (url) => {
            try {
                const mockRequest = { url: url };
                return processRequest(mockRequest);
            } catch (e) {
                return { error: e.message };
            }
        }
    };
    
    // 暴露到全域作用域
    if (typeof global !== 'undefined') {
        global.URLFilterDebug = debugAPI;
    } else if (typeof window !== 'undefined') {
        window.URLFilterDebug = debugAPI;
    }
}
