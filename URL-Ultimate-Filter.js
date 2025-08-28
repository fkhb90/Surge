/**
 * @file        URL-Ultimate-Filter-Surge-Optimized-v15.js
 * @version     15.0 (Surge日誌分類優化版)
 * @description 針對Surge「阻止」vs「已修改」分類優化的安全增強版本
 *              核心優化：使用Surge原生拒絕語法，確保追蹤腳本顯示為「阻止」
 * @author      Claude (基於Surge行為優化)
 * @lastUpdated 2025-08-28
 */

// =================================================================================
// ⚙️ 核心設定區 (Surge-Optimized Configuration)
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
    ['feedly.com', true], ['inoreader.com', true], ['theoldreader.com', true],
    ['newsblur.com', true], ['flipboard.com', true],
    ['yimg.jp', true], ['yahooapis.jp', true], ['yahoo.co.jp', true]
]);

/**
 * 🚨 **關鍵**: 追蹤腳本攔截清單 (Critical Tracking Scripts)
 * @description 這些腳本將被Surge標記為「阻止」
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 
    'fbevents.js', 'fbq.js', 'pixel.js', 'tag.js', 'tracking.js',
    'adsbygoogle.js', 'ads.js', 'doubleclick.js', 'adsense.js',
    'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js'
]);

/**
 * 🚨 關鍵追蹤路徑模式 (Critical Tracking Path Patterns)
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    '/ytag.js', '/gtag.js', '/gtm.js', '/ga.js', '/analytics.js',
    '/fbevents.js', '/fbq.js', '/pixel.js', '/adsbygoogle.js',
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/',
    '/doubleclick/', '/googleadservices/', '/facebook.com/tr'
]);

/**
 * ✅ 路徑白名單 (Path Whitelist) - **已完全移除追蹤腳本**
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
    
    // 合法的 JavaScript/CSS 資源檔案
    'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 
    'common.js', 'util.js', 'script.js'
]);

/**
 * 🚫 路徑黑名單 (Path Blacklist)
 */
const PATH_BLOCK_KEYWORDS = new Set([
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/',
    '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/',
    '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/',
    '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/',
    '/log/', '/logs/', '/logger/', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/event/',
    '/beacon/', '/pixel/', '/collect/', '/collector/', '/report/', '/reports/', '/reporting/',
    '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/',
    'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense',
    'dfp', 'google-analytics', 'fbevents', 'fbq',
    'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru',
    'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude',
    'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads',
    'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp',
    'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification'
]);

/**
 * 💧 直接拋棄請求的關鍵字
 */
const DROP_KEYWORDS = new Set([
    'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 
    'beacon', 'collect', 'collector', 'telemetry', 'crash', 'error-report',
    'metric', 'insight', 'audit', 'event-stream'
]);

/**
 * 🚮 追蹤參數黑名單
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au',
    'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid',
    'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid',
    'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid',
    'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign',
    'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content',
    'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id',
    'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user',
    'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id',
    'xhsshare', 'xhs_share', 'app_platform', 'share_from',
    'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene',
    'traceid', 'request_id', 'aff_id', '__twitter_impression', '_openstat',
    'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src',
    'vero_conv', 'vero_id', 'ck_subscriber_id'
]);

const TRACKING_PREFIXES = [
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_',
    'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cft_',
    'hsCtaTracking_', '_hsenc_', '_hsmi_', 'pk_', 'mtm_', 'campaign_', 'source_',
    'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_'
];

// =================================================================================
// 🚀 **Surge優化**: 響應處理策略 (Surge-Optimized Response Strategy)
// =================================================================================

/**
 * 🚨 **Surge優化**: 響應類型定義
 * @description 根據Surge日誌分類需求，定義不同的響應策略
 */
const SURGE_RESPONSES = {
    // 完全阻止 - 會在日誌中顯示為「阻止」
    REJECT: null,  // 不處理，讓Surge使用內建的阻止規則
    
    // 明確拒絕 - 使用Surge特定語法
    EXPLICIT_REJECT: { reject: true },
    
    // 透明替換 - 會顯示為「已修改」
    TINY_GIF: { 
        response: { 
            status: 200, 
            headers: { 'Content-Type': 'image/gif' }, 
            body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
        }
    },
    
    // 重定向 - 會顯示為「已修改」
    REDIRECT: null, // 將在函數中動態建立
    
    // 完全拋棄 - 會顯示為「阻止」
    DROP: undefined
};

// =================================================================================
// 🚀 核心處理邏輯 (Surge-Optimized Core Logic)
// =================================================================================

/**
 * 📊 性能統計器
 */
class SurgePerformanceStats {
    constructor() {
        this.stats = {
            totalRequests: 0,
            rejectedRequests: 0,
            modifiedRequests: 0,
            allowedRequests: 0,
            criticalTrackingBlocked: 0,
            domainBlocked: 0,
            pathBlocked: 0,
            paramsCleaned: 0,
            whitelistHits: 0,
            errors: 0
        };
    }
    
    increment(type) {
        if (this.stats.hasOwnProperty(type)) {
            this.stats[type]++;
        }
    }
    
    getBlockRate() {
        const total = this.stats.totalRequests;
        return total > 0 ? ((this.stats.rejectedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
    
    getModifyRate() {
        const total = this.stats.totalRequests;
        return total > 0 ? ((this.stats.modifiedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
}

const performanceStats = new SurgePerformanceStats();

/**
 * 🚨 **新增**: 關鍵追蹤腳本檢查 (Critical Tracking Script Check)
 */
function isCriticalTrackingScript(pathAndQuery) {
    // 檢查文件名是否為關鍵追蹤腳本
    for (const script of CRITICAL_TRACKING_SCRIPTS) {
        if (pathAndQuery.includes(script)) {
            return true;
        }
    }
    
    // 檢查路徑模式
    for (const pattern of CRITICAL_TRACKING_PATTERNS) {
        if (pathAndQuery.includes(pattern)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 🔍 域名白名單檢查
 */
function isApiWhitelisted(hostname) {
    // 精確匹配檢查
    if (API_WHITELIST_EXACT.has(hostname)) {
        return true;
    }
    
    // 通配符匹配檢查
    for (const [domain, _] of API_WHITELIST_WILDCARDS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 🚫 域名黑名單檢查
 */
function isDomainBlocked(hostname) {
    // 直接匹配
    if (BLOCK_DOMAINS.has(hostname)) {
        return true;
    }
    
    // 部分匹配（包含檢查）
    for (const blockDomain of BLOCK_DOMAINS) {
        if (hostname.includes(blockDomain)) {
            return true;
        }
    }
    
    return false;
}

/**
 * 🛤️ 路徑攔截檢查
 */
function isPathBlocked(pathAndQuery) {
    // 檢查黑名單關鍵字
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
            // 檢查是否有白名單保護
            let isProtected = false;
            for (const allowPattern of PATH_ALLOW_PATTERNS) {
                if (pathAndQuery.includes(allowPattern)) {
                    isProtected = true;
                    break;
                }
            }
            
            if (!isProtected) {
                return true; // 黑名單匹配且未被白名單保護
            }
        }
    }
    
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
 * 🎯 **Surge優化版**: 主要處理函數 (Surge-Optimized Main Processor)
 * @description 針對Surge日誌分類優化的處理邏輯
 */
function processRequest(request) {
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
            return null;
        }
        
        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();
        
        // === **Surge優化 Step 0**: 關鍵追蹤腳本攔截（返回null讓Surge阻止） ===
        if (isCriticalTrackingScript(pathAndQuery)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('rejectedRequests');
            
            // **關鍵修正**: 返回 null 讓 Surge 使用內建阻止機制
            // 這樣會在日誌中顯示為「阻止」而不是「已修改」
            return SURGE_RESPONSES.REJECT;
        }
        
        // === Step 1: API 域名白名單檢查 ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            performanceStats.increment('allowedRequests');
            return null; // 白名單域名放行
        }
        
        // === Step 2: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('rejectedRequests');
            
            // **Surge優化**: 使用 null 讓 Surge 顯示「阻止」
            return SURGE_RESPONSES.REJECT;
        }
        
        // === Step 3: 路徑攔截檢查 ===
        if (isPathBlocked(pathAndQuery)) {
            performanceStats.increment('pathBlocked');
            
            // 檢查是否為圖片資源（使用透明替換）
            const imageExtensions = ['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
            const isImage = imageExtensions.some(ext => pathAndQuery.endsWith(ext));
            
            // 檢查是否需要完全拋棄
            const shouldDrop = Array.from(DROP_KEYWORDS).some(keyword => 
                pathAndQuery.includes(keyword)
            );
            
            if (shouldDrop) {
                performanceStats.increment('rejectedRequests');
                return SURGE_RESPONSES.DROP; // undefined - 完全拋棄
            } else if (isImage) {
                performanceStats.increment('modifiedRequests');
                return SURGE_RESPONSES.TINY_GIF; // 圖片替換 - 會顯示「已修改」
            } else {
                performanceStats.increment('rejectedRequests');
                return SURGE_RESPONSES.REJECT; // null - 會顯示「阻止」
            }
        }
        
        // === Step 4: 追蹤參數清理 ===
        if (cleanTrackingParams(url)) {
            performanceStats.increment('paramsCleaned');
            performanceStats.increment('modifiedRequests');
            
            const cleanedUrl = url.toString();
            return { 
                response: { 
                    status: 302, 
                    headers: { 'Location': cleanedUrl } 
                } 
            }; // 重定向 - 會顯示「已修改」
        }
        
        performanceStats.increment('allowedRequests');
        return null; // 無需處理，放行 - 會顯示「允許」
        
    } catch (error) {
        performanceStats.increment('errors');
        return null; // 發生錯誤時放行請求
    }
}

// =================================================================================
// 🎬 **Surge優化**: 主執行邏輯 (Surge-Optimized Main Execution)
// =================================================================================

(function() {
    try {
        // 檢查執行環境
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ 
                    version: '15.0',
                    surgeOptimized: true,
                    message: 'URL Filter v15.0 - Surge日誌分類已優化',
                    expectedBehavior: {
                        'ytag.js等追蹤腳本': '阻止',
                        '圖片廣告': '已修改 (透明替換)',
                        '參數清理': '已修改 (重定向)',
                        '正常請求': '允許'
                    }
                });
            }
            return;
        }
        
        // **Surge優化**: 處理請求並返回適當的響應
        const result = processRequest($request);
        
        // **關鍵**: 使用適當的 $done 調用方式
        if (typeof $done !== 'undefined') {
            if (result === null) {
                // 放行請求 - Surge會標記為「允許」
                $done({});
            } else if (result === undefined) {
                // 完全拋棄 - Surge會標記為「阻止」
                $done();
            } else {
                // 自定義響應 - Surge會標記為「已修改」
                $done(result);
            }
        }
        
    } catch (error) {
        performanceStats.increment('errors');
        
        // 確保即使發生錯誤也能正常結束
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();
