/**
 * @file        URL-Ultimate-Filter-Optimized-Fixed.js
 * @version     14.0 (Security Enhanced & ytag.js Fixed)
 * @description 修正 ytag.js 攔截邏輯缺陷的安全增強版本
 *              核心修正：移除追蹤腳本白名單衝突、優化攔截優先級、增強安全防護
 * @author      Claude (基於安全分析優化)
 * @lastUpdated 2025-08-28
 */

// =================================================================================
// ⚙️ 核心設定區 (Enhanced & Security Fixed Configuration)
// =================================================================================

/**
 * 🚫 域名攔截黑名單 (Domain Blocklist) - 優化為 Set 提升查找效能
 */
const BLOCK_DOMAINS = new Set([
    'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
    'googlesyndication.com', 'admob.com', 'adsense.com', 'scorecardresearch.com', 'chartbeat.com',
    'graph.facebook.com', 'connect.facebook.net', 'analytics.twitter.com', 'static.ads-twitter.com',
    'ads.linkedin.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'pubmatic.com',
    'rubiconproject.com', 'openx.net', 'adsrvr.org', 'adform.net', 'semasio.net',
    'yieldlab.net', 'app-measurement.com', 'branch.io', 'appsflyer.com', 'adjust.com',
    'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com',
    'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms',
    'track.hubspot.com', 'api.pendo.io'
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
]);

const API_WHITELIST_WILDCARDS = new Map([
    ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true],
    ['paypal.com', true], ['stripe.com', true], ['apple.com', true], ['icloud.com', true],
    ['windowsupdate.com', true], ['amazonaws.com', true], ['aliyuncs.com', true],
    ['cloud.tencent.com', true], ['cloudfront.net', true],
    // RSS/新聞聚合服務
    ['feedly.com', true], ['inoreader.com', true], ['theoldreader.com', true],
    ['newsblur.com', true], ['flipboard.com', true],
    // 日本主要網站服務
    ['yimg.jp', true], ['yahooapis.jp', true], ['yahoo.co.jp', true]
]);

/**
 * 🚨 **安全修正**: 關鍵追蹤腳本攔截清單 (Critical Tracking Scripts Blocklist)
 * @description 無條件攔截的追蹤腳本，優先級高於所有白名單
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 
    'fbevents.js', 'fbq.js', 'pixel.js', 'tag.js', 'tracking.js',
    'adsbygoogle.js', 'ads.js', 'doubleclick.js', 'adsense.js',
    'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js'
]);

/**
 * 🚨 **安全修正**: 關鍵追蹤路徑模式 (Critical Tracking Path Patterns)
 * @description 包含這些模式的路徑將被無條件攔截
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    '/ytag.js', '/gtag.js', '/gtm.js', '/ga.js', '/analytics.js',
    '/fbevents.js', '/fbq.js', '/pixel.js', '/adsbygoogle.js',
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/',
    '/doubleclick/', '/googleadservices/', '/facebook.com/tr'
]);

/**
 * ✅ 增強版路徑白名單 (Enhanced Path Whitelist) - **已移除追蹤腳本**
 * @description 修正版本：移除所有可能的追蹤腳本，避免安全漏洞
 */
const PATH_ALLOW_PATTERNS = new Set([
    // 合法的 JavaScript 模組和資源
    'chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
    'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js',
    'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board',
    'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
    'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
    'amp-anim', 'amp-animation', 'amp-iframe',
    
    // 業務關鍵字（已確認非追蹤相關）
    'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login',
    'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference',
    'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search',
    'filter', 'sort', 'category', 'media', 'image', 'video', 'audio',
    'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync',
    
    // RSS/內容聚合相關
    'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe',
    'collections', 'boards', 'streams', 'contents', 'preferences', 'folders',
    'entries', 'items', 'posts', 'articles', 'sources', 'categories',
    
    // 合法的 JavaScript/CSS 資源檔案（排除追蹤相關）
    'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 
    'common.js', 'util.js', 'script.js'
    
    // **安全修正**: 已移除 ytag.js, gtag.js, tag.js 等可能的追蹤腳本
]);

/**
 * 🚫 增強版路徑黑名單 (Enhanced Path Blacklist)
 * @description 更精確的關鍵字匹配，減少誤殺
 */
const PATH_BLOCK_KEYWORDS = new Set([
    // 廣告相關 - 使用更精確的匹配
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/',
    '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/',
    
    // 追蹤相關 - 避免與業務功能衝突
    '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/',
    '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/',
    
    // 日誌相關 - 更精確匹配
    '/log/', '/logs/', '/logger/', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/event/',
    '/beacon/', '/pixel/', '/collect/', '/collector/', '/report/', '/reports/', '/reporting/',
    
    // 錯誤追蹤
    '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/',
    
    // 特定平台追蹤腳本
    'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense',
    'dfp', 'google-analytics', 'fbevents', 'fbq',
    'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru',
    'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude',
    
    // AMP 廣告
    'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads',
    
    // 程序化廣告
    'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp',
    
    // 其他追蹤和隱私相關
    'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification'
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
            criticalTrackingBlocked: 0,
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
 * 🔧 增強版錯誤處理器
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.criticalErrors = 0;
    }
    
    logError(error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            context: context,
            stack: error.stack || null,
            severity: context.critical ? 'CRITICAL' : 'WARNING'
        };
        
        if (context.critical) {
            this.criticalErrors++;
        }
        
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
    
    getCriticalErrorCount() {
        return this.criticalErrors;
    }
    
    clearErrors() {
        this.errors = [];
        this.criticalErrors = 0;
    }
}

// =================================================================================
// 🏗️ 初始化全域組件 (Initialize Global Components)
// =================================================================================

const performanceStats = new PerformanceStats();
const cache = new IntelligentCache();
const errorHandler = new ErrorHandler();

// =================================================================================
// 🚀 核心處理邏輯 (Enhanced & Security Fixed Core Logic)
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
 * 🚨 **新增**: 關鍵追蹤腳本檢查 (Critical Tracking Script Check)
 * @description 無條件攔截關鍵追蹤腳本，優先級最高
 */
function isCriticalTrackingScript(pathAndQuery) {
    const cacheKey = `critical:${pathAndQuery}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
    
    // 檢查文件名是否為關鍵追蹤腳本
    for (const script of CRITICAL_TRACKING_SCRIPTS) {
        if (pathAndQuery.includes(script)) {
            cache.set(cacheKey, true);
            return true;
        }
    }
    
    // 檢查路徑模式
    for (const pattern of CRITICAL_TRACKING_PATTERNS) {
        if (pathAndQuery.includes(pattern)) {
            cache.set(cacheKey, true);
            return true;
        }
    }
    
    cache.set(cacheKey, false);
    return false;
}

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
 * 🛤️ 路徑攔截檢查 - **安全修正版本**
 */
function isPathBlocked(pathAndQuery) {
    const cacheKey = `path:${pathAndQuery}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) return cached;
    
    // 🚨 **重要**: 先檢查黑名單，再檢查白名單（防止追蹤腳本繞過）
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
            // 檢查是否有白名單保護（但排除追蹤相關）
            let isProtected = false;
            for (const allowPattern of PATH_ALLOW_PATTERNS) {
                if (pathAndQuery.includes(allowPattern)) {
                    isProtected = true;
                    break;
                }
            }
            
            if (!isProtected) {
                cache.set(cacheKey, true);
                return true; // 黑名單匹配且未被白名單保護
            }
        }
    }
    
    cache.set(cacheKey, false);
    return false;
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
 * 🎯 **安全修正版**: 主要處理函數 (Security Enhanced Main Processor)
 * @description 修正優先級邏輯，確保追蹤腳本無法繞過攔截
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
            errorHandler.logError(e, { 
                url: request.url, 
                step: 'URL parsing',
                critical: false
            });
            return null;
        }
        
        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();
        
        // === Step 0: **新增** 關鍵追蹤腳本攔截（最高優先級） ===
        if (isCriticalTrackingScript(pathAndQuery)) {
            performanceStats.increment('criticalTrackingBlocked');
            
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
        
        // === Step 1: API 域名白名單檢查（但不保護追蹤腳本） ===
        if (isApiWhitelisted(hostname)) {
            // **安全修正**: 即使是白名單域名，也要檢查是否包含追蹤腳本
            // 這修正了原始代碼中 api.github.com/ytag.js 會被放行的漏洞
            performanceStats.increment('whitelistHits');
            return null; // 白名單域名放行（追蹤腳本已在 Step 0 攔截）
        }
        
        // === Step 2: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('blockedDomains');
            return REJECT_RESPONSE;
        }
        
        // === Step 3: 路徑攔截檢查 ===
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
        
        // === Step 4: 追蹤參數清理 ===
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
            url: request.url || 'unknown',
            hostname: hostname || 'unknown',
            step: 'main processing',
            critical: true
        });
        return null; // 發生錯誤時放行請求，避免破壞正常功能
    } finally {
        // 記錄處理時間
        const endTime = performance.now ? performance.now() : Date.now();
        performanceStats.addProcessingTime(endTime - startTime);
    }
}

/**
 * 🔍 **新增**: URL 安全驗證器
 * @description 檢查 URL 是否包含潛在的安全威脅
 */
function validateUrlSecurity(url) {
    try {
        // 檢查協議安全性
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(url.protocol)) {
            return false;
        }
        
        // 檢查域名格式
        if (!url.hostname || url.hostname.length === 0) {
            return false;
        }
        
        // 防止域名欺騙攻擊
        const suspiciousPatterns = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
        if (suspiciousPatterns.some(pattern => url.hostname.includes(pattern))) {
            return false;
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 📈 診斷資訊輸出 (Enhanced Diagnostic Information)
 */
function getDiagnosticInfo() {
    return {
        version: '14.0',
        lastUpdated: '2025-08-28',
        securityFixes: [
            'ytag.js 攔截邏輯修正',
            '追蹤腳本優先級調整',
            '白名單繞過漏洞修復',
            '增強URL安全驗證'
        ],
        performance: performanceStats.getStats(),
        cache: cache.getStats(),
        errors: errorHandler.getRecentErrors(5),
        criticalErrors: errorHandler.getCriticalErrorCount(),
        config: {
            domainBlockCount: BLOCK_DOMAINS.size,
            apiWhitelistExact: API_WHITELIST_EXACT.size,
            apiWhitelistWildcards: API_WHITELIST_WILDCARDS.size,
            criticalTrackingScripts: CRITICAL_TRACKING_SCRIPTS.size,
            criticalTrackingPatterns: CRITICAL_TRACKING_PATTERNS.size,
            pathAllowPatterns: PATH_ALLOW_PATTERNS.size,
            pathBlockKeywords: PATH_BLOCK_KEYWORDS.size,
            trackingParams: GLOBAL_TRACKING_PARAMS.size,
            trackingPrefixes: TRACKING_PREFIXES.length
        }
    };
}

/**
 * 🧪 **新增**: 測試輔助函數
 * @description 提供便捷的測試接口，方便驗證修正效果
 */
function testUrlHandling(testUrl, expectedResult = null) {
    try {
        const mockRequest = { url: testUrl };
        const result = processRequest(mockRequest);
        
        const testResult = {
            url: testUrl,
            result: result,
            blocked: result !== null,
            resultType: result ? (
                result.response && result.response.status === 403 ? 'REJECT' :
                result.response && result.response.status === 302 ? 'REDIRECT' :
                result.response && result.response.body ? 'TINY_GIF' : 'DROP'
            ) : 'ALLOW',
            expected: expectedResult,
            passed: expectedResult ? (
                (expectedResult === 'ALLOW' && result === null) ||
                (expectedResult === 'REJECT' && result && result.response && result.response.status === 403) ||
                (expectedResult === 'REDIRECT' && result && result.response && result.response.status === 302) ||
                (expectedResult === 'TINY_GIF' && result && result.response && result.response.body) ||
                (expectedResult === 'DROP' && result && !result.response.status)
            ) : null
        };
        
        return testResult;
    } catch (error) {
        errorHandler.logError(error, { 
            testUrl: testUrl, 
            step: 'test execution',
            critical: false
        });
        return {
            url: testUrl,
            error: error.message,
            passed: false
        };
    }
}

/**
 * 🔄 **新增**: 批量測試函數
 * @description 執行預定義的測試用例集合
 */
function runTestSuite() {
    const testCases = [
        // ytag.js 關鍵測試
        { url: 'https://www.googletagmanager.com/ytag.js', expected: 'REJECT' },
        { url: 'https://analytics.example.com/ytag.js', expected: 'REJECT' },
        { url: 'https://cdn.example.com/scripts/ytag.js?v=1.0', expected: 'REJECT' },
        { url: 'https://api.github.com/ytag.js', expected: 'REJECT' }, // 修正後應攔截
        { url: 'https://mysite.com/mytags.js', expected: 'ALLOW' },
        
        // 大小寫測試
        { url: 'https://example.com/YTAG.JS', expected: 'REJECT' },
        { url: 'https://example.com/Ytag.js', expected: 'REJECT' },
        
        // 其他追蹤腳本測試
        { url: 'https://www.google-analytics.com/analytics.js', expected: 'REJECT' },
        { url: 'https://connect.facebook.net/fbevents.js', expected: 'REJECT' },
        
        // 正常業務功能測試
        { url: 'https://api.example.com/data', expected: 'ALLOW' },
        { url: 'https://cdn.example.com/app.js', expected: 'ALLOW' }
    ];
    
    const results = testCases.map(testCase => 
        testUrlHandling(testCase.url, testCase.expected)
    );
    
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    return {
        summary: {
            total: totalCount,
            passed: passedCount,
            failed: totalCount - passedCount,
            passRate: ((passedCount / totalCount) * 100).toFixed(2) + '%'
        },
        details: results
    };
}

// =================================================================================
// 🎬 主執行邏輯 (Enhanced Main Execution with Security Fixes)
// =================================================================================

(function() {
    try {
        // 檢查執行環境
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ 
                    diagnostic: getDiagnosticInfo(),
                    message: 'URL Filter v14.0 initialized successfully - Security fixes applied'
                });
            }
            return;
        }
        
        // **安全增強**: 驗證請求安全性
        let url;
        try {
            url = new URL($request.url);
            if (!validateUrlSecurity(url)) {
                if (typeof $done !== 'undefined') {
                    $done(REJECT_RESPONSE);
                }
                return;
            }
        } catch (securityError) {
            errorHandler.logError(securityError, { 
                url: $request.url, 
                step: 'security validation',
                critical: true
            });
            if (typeof $done !== 'undefined') {
                $done(REJECT_RESPONSE);
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
        errorHandler.logError(error, { 
            context: 'main execution',
            critical: true
        });
        
        // 確保即使發生錯誤也能正常結束
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// 🔧 調試和維護功能 (Enhanced Debug & Maintenance Functions)
// =================================================================================

/**
 * 全域暴露調試函數（僅在開發環境）
 */
if (typeof global !== 'undefined' || typeof window !== 'undefined') {
    const debugAPI = {
        // 基礎統計
        getStats: () => performanceStats.getStats(),
        getCacheStats: () => cache.getStats(),
        getErrors: () => errorHandler.getRecentErrors(),
        getDiagnostic: getDiagnosticInfo,
        
        // 維護功能
        clearCache: () => {
            cache.cache.clear();
            return 'Cache cleared successfully';
        },
        clearErrors: () => {
            errorHandler.clearErrors();
            return 'Error log cleared successfully';
        },
        resetStats: () => {
            performanceStats.reset();
            return 'Statistics reset successfully';
        },
        
        // **新增**: 測試功能
        testUrl: (url, expectedResult = null) => testUrlHandling(url, expectedResult),
        runTests: runTestSuite,
        
        // **新增**: 檢查特定功能
        checkCriticalScript: (path) => isCriticalTrackingScript(path.toLowerCase()),
        checkWhitelist: (hostname) => isApiWhitelisted(hostname.toLowerCase()),
        checkDomainBlock: (hostname) => isDomainBlocked(hostname.toLowerCase()),
        checkPathBlock: (path) => isPathBlocked(path.toLowerCase()),
        
        // **新增**: 配置檢查
        validateConfig: () => {
            const issues = [];
            
            // 檢查追蹤腳本是否在白名單中（安全漏洞）
            for (const script of CRITICAL_TRACKING_SCRIPTS) {
                if (PATH_ALLOW_PATTERNS.has(script)) {
                    issues.push(`SECURITY WARNING: ${script} found in whitelist`);
                }
            }
            
            // 檢查配置合理性
            if (BLOCK_DOMAINS.size === 0) {
                issues.push('WARNING: No domains in blocklist');
            }
            
            if (CRITICAL_TRACKING_SCRIPTS.size === 0) {
                issues.push('WARNING: No critical tracking scripts defined');
            }
            
            return {
                valid: issues.length === 0,
                issues: issues,
                configHealth: issues.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
            };
        },
        
        // **新增**: 性能基準測試
        benchmarkPerformance: (iterations = 1000) => {
            const testUrls = [
                'https://www.googletagmanager.com/ytag.js',
                'https://api.github.com/repos',
                'https://example.com/app.js?utm_source=test',
                'https://cdn.example.com/assets/styles.css'
            ];
            
            const startTime = Date.now();
            
            for (let i = 0; i < iterations; i++) {
                const testUrl = testUrls[i % testUrls.length];
                testUrlHandling(testUrl);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            return {
                iterations: iterations,
                totalTime: totalTime + 'ms',
                avgTime: (totalTime / iterations).toFixed(3) + 'ms',
                requestsPerSecond: Math.round((iterations / totalTime) * 1000)
            };
        }
    };
    
    // 暴露到全域作用域
    if (typeof global !== 'undefined') {
        global.URLFilterDebug = debugAPI;
    } else if (typeof window !== 'undefined') {
        window.URLFilterDebug = debugAPI;
    }
}

// =================================================================================
// 📝 使用說明和安全提醒 (Usage Instructions & Security Notes)
// =================================================================================

/**
 * 🚨 **重要安全修正說明**：
 * 
 * v14.0 主要修正了以下安全漏洞：
 * 1. 移除 PATH_ALLOW_PATTERNS 中的追蹤腳本（ytag.js, gtag.js 等）
 * 2. 新增 CRITICAL_TRACKING_SCRIPTS 高優先級攔截清單
 * 3. 修正白名單域名中追蹤腳本繞過的邏輯漏洞
 * 4. 增強 URL 安全驗證機制
 * 
 * 🧪 **測試驗證**：
 * 在瀏覽器控制台執行以下命令驗證修正效果：
 * 
 * // 基礎測試
 * URLFilterDebug.testUrl('https://www.googletagmanager.com/ytag.js', 'REJECT');
 * URLFilterDebug.testUrl('https://api.github.com/ytag.js', 'REJECT');
 * 
 * // 運行完整測試套件
 * URLFilterDebug.runTests();
 * 
 * // 驗證配置安全性
 * URLFilterDebug.validateConfig();
 * 
 * // 性能基準測試
 * URLFilterDebug.benchmarkPerformance(1000);
 * 
 * 📊 **監控建議**：
 * - 定期執行 getDiagnosticInfo() 檢查運行狀態
 * - 監控 criticalTrackingBlocked 統計，確認攔截效果
 * - 檢查錯誤日誌，及時發現異常情況
 * - 使用快取統計優化性能配置
 */
