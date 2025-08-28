/**
 * @file        URL-Ultimate-Filter-Surge-Fixed-v16.js
 * @version     16.0 (Surge阻擋修正版)
 * @description 修正ytag.js等追蹤腳本無法正確顯示為「阻止」的問題
 *              核心修正：使用正確的Surge響應語法實現真正的請求阻擋
 * @author      Claude (基於Surge語法規範修正)
 * @lastUpdated 2025-08-28
 */

// =================================================================================
// ⚙️ 核心設定區 (Surge-Fixed Configuration)
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
 * ✅ 路徑白名單 (Path Whitelist)
 */
const PATH_ALLOW_PATTERNS = new Set([
    // 合法的 JavaScript 模組和資源
    'chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
    'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js',
    'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board',
    'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
    'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
    'amp-anim', 'amp-animation', 'amp-iframe',
    
    // 業務關鍵字
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
// 🚀 **修正版**: 響應處理策略 (Fixed Response Strategy)
// =================================================================================

/**
 * 🚨 **修正版**: Surge響應類型定義
 * @description 使用正確的Surge語法實現不同的響應效果
 */
const SURGE_RESPONSES = {
    // ✅ 阻止請求 - 返回空響應體（會顯示為「阻止」）
    BLOCK: { 
        response: { 
            status: 200, 
            headers: { 
                'Content-Type': 'text/plain',
                'Content-Length': '0',
                'X-Blocked-By': 'URL-Filter-v16'
            }, 
            body: "" 
        } 
    },
    
    // ✅ 404錯誤 - 另一種阻止方式
    NOT_FOUND: {
        response: {
            status: 404,
            headers: {
                'Content-Type': 'text/plain',
                'X-Blocked-By': 'URL-Filter-v16'
            },
            body: "404 Not Found - Blocked by URL Filter"
        }
    },
    
    // ✅ 透明GIF - 用於圖片廣告（會顯示為「已修改」）
    TINY_GIF: { 
        response: { 
            status: 200, 
            headers: { 
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Modified-By': 'URL-Filter-v16'
            }, 
            body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
        }
    },
    
    // ✅ 重定向 - 用於參數清理（會顯示為「已修改」）
    REDIRECT: (cleanUrl) => ({ 
        response: { 
            status: 302, 
            headers: { 
                'Location': cleanUrl,
                'X-Modified-By': 'URL-Filter-v16'
            },
            body: ""
        } 
    }),
    
    // ✅ 放行請求
    ALLOW: null
};

// =================================================================================
// 🚀 核心處理邏輯 (Fixed Core Logic)
// =================================================================================

/**
 * 📊 性能統計器
 */
class PerformanceStats {
    constructor() {
        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
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
        return total > 0 ? ((this.stats.blockedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
    
    getModifyRate() {
        const total = this.stats.totalRequests;
        return total > 0 ? ((this.stats.modifiedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
}

const performanceStats = new PerformanceStats();

/**
 * 🚨 關鍵追蹤腳本檢查
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
 * 🎯 **修正版**: 主要處理函數
 * @description 使用正確的Surge響應語法
 */
function processRequest(request) {
    try {
        performanceStats.increment('totalRequests');
        
        // 驗證請求有效性
        if (!request || !request.url) {
            return SURGE_RESPONSES.ALLOW;
        }
        
        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            performanceStats.increment('errors');
            return SURGE_RESPONSES.ALLOW;
        }
        
        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();
        
        // === Step 0: 關鍵追蹤腳本攔截（使用空響應阻止） ===
        if (isCriticalTrackingScript(pathAndQuery)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('blockedRequests');
            
            // 記錄日誌（如果需要調試）
            if (typeof console !== 'undefined' && console.log) {
                console.log(`[URL-Filter] Blocking critical tracking script: ${url.href}`);
            }
            
            // ✅ 返回空響應，確保Surge顯示為「阻止」
            return SURGE_RESPONSES.BLOCK;
        }
        
        // === Step 1: API 域名白名單檢查 ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            performanceStats.increment('allowedRequests');
            return SURGE_RESPONSES.ALLOW;
        }
        
        // === Step 2: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('blockedRequests');
            
            // ✅ 使用空響應阻止
            return SURGE_RESPONSES.BLOCK;
        }
        
        // === Step 3: 路徑攔截檢查 ===
        if (isPathBlocked(pathAndQuery)) {
            performanceStats.increment('pathBlocked');
            
            // 檢查是否為圖片資源
            const imageExtensions = ['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
            const isImage = imageExtensions.some(ext => pathAndQuery.endsWith(ext));
            
            if (isImage) {
                performanceStats.increment('modifiedRequests');
                return SURGE_RESPONSES.TINY_GIF; // 圖片替換
            } else {
                performanceStats.increment('blockedRequests');
                return SURGE_RESPONSES.BLOCK; // 其他資源阻止
            }
        }
        
        // === Step 4: 追蹤參數清理 ===
        if (cleanTrackingParams(url)) {
            performanceStats.increment('paramsCleaned');
            performanceStats.increment('modifiedRequests');
            
            const cleanedUrl = url.toString();
            return SURGE_RESPONSES.REDIRECT(cleanedUrl);
        }
        
        // === Step 5: 放行請求 ===
        performanceStats.increment('allowedRequests');
        return SURGE_RESPONSES.ALLOW;
        
    } catch (error) {
        performanceStats.increment('errors');
        
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter] Error processing request:', error);
        }
        
        return SURGE_RESPONSES.ALLOW;
    }
}

// =================================================================================
// 🎬 **修正版**: 主執行邏輯
// =================================================================================

(function() {
    try {
        // 檢查執行環境
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({
                    version: '16.0',
                    status: 'ready',
                    message: 'URL Filter v16.0 - 已修正ytag.js阻擋問題',
                    fixedIssues: [
                        '✅ ytag.js等追蹤腳本現在正確顯示為「阻止」',
                        '✅ 使用正確的Surge響應語法',
                        '✅ 改進錯誤處理機制'
                    ]
                });
            }
            return;
        }
        
        // 處理請求
        const result = processRequest($request);
        
        // 使用正確的 $done 調用
        if (typeof $done !== 'undefined') {
            if (result === null) {
                // 放行請求
                $done({});
            } else {
                // 返回自定義響應（阻止或修改）
                $done(result);
            }
        }
        
    } catch (error) {
        performanceStats.increment('errors');
        
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter] Fatal error:', error);
        }
        
        // 確保即使發生錯誤也能正常結束
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// 🔧 調試和測試功能
// =================================================================================

/**
 * 🧪 測試函數
 */
function testSurgeFilter() {
    const testCases = [
        // 關鍵追蹤腳本測試
        { url: 'https://www.googletagmanager.com/ytag.js', expected: 'BLOCK' },
        { url: 'https://api.github.com/ytag.js', expected: 'BLOCK' },
        { url: 'https://cdn.example.com/scripts/ytag.js?v=1.0', expected: 'BLOCK' },
        { url: 'https://analytics.example.com/gtag.js', expected: 'BLOCK' },
        
        // 域名阻止測試
        { url: 'https://doubleclick.net/ads/script.js', expected: 'BLOCK' },
        { url: 'https://google-analytics.com/collect', expected: 'BLOCK' },
        
        // 圖片替換測試
        { url: 'https://example.com/ads/banner.gif', expected: 'TINY_GIF' },
        { url: 'https://tracker.com/pixel.png', expected: 'TINY_GIF' },
        
        // 參數清理測試
        { url: 'https://example.com/page?utm_source=google', expected: 'REDIRECT' },
        { url: 'https://shop.com/product?fbclid=test', expected: 'REDIRECT' },
        
        // 正常放行測試
        { url: 'https://api.github.com/repos/user/repo', expected: 'ALLOW' },
        { url: 'https://cdn.jsdelivr.net/npm/library@1.0.0/dist/lib.js', expected: 'ALLOW' }
    ];
    
    console.log('=== Surge Filter v16 測試 ===\n');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(testCase => {
        const mockRequest = { url: testCase.url };
        const result = processRequest(mockRequest);
        
        let resultType = 'ALLOW';
        if (result === SURGE_RESPONSES.BLOCK) {
            resultType = 'BLOCK';
        } else if (result === SURGE_RESPONSES.TINY_GIF) {
            resultType = 'TINY_GIF';
        } else if (result && result.response && result.response.status === 302) {
            resultType = 'REDIRECT';
        }
        
        const success = resultType === testCase.expected;
        if (success) {
            passed++;
            console.log(`✅ ${testCase.url}`);
        } else {
            failed++;
            console.log(`❌ ${testCase.url}`);
            console.log(`   預期: ${testCase.expected}, 實際: ${resultType}`);
        }
    });
    
    console.log(`\n測試結果: ${passed} 通過, ${failed} 失敗`);
    console.log(`通過率: ${((passed / testCases.length) * 100).toFixed(2)}%`);
    
    return { passed, failed, total: testCases.length };
}

/**
 * 📊 獲取統計資訊
 */
function getFilterStats() {
    return {
        version: '16.0',
        lastUpdated: '2025-08-28',
        stats: performanceStats.stats,
        rates: {
            blockRate: performanceStats.getBlockRate(),
            modifyRate: performanceStats.getModifyRate()
        },
        config: {
            criticalTrackingScripts: CRITICAL_TRACKING_SCRIPTS.size,
            domainBlocklist: BLOCK_DOMAINS.size,
            apiWhitelist: API_WHITELIST_EXACT.size + API_WHITELIST_WILDCARDS.size,
            trackingParams: GLOBAL_TRACKING_PARAMS.size
        }
    };
}

// 暴露調試API（如果在瀏覽器環境）
if (typeof window !== 'undefined') {
    window.SurgeFilterDebug = {
        test: testSurgeFilter,
        stats: getFilterStats,
        testUrl: (url) => {
            const result = processRequest({ url });
            return {
                url: url,
                result: result,
                willBlock: result === SURGE_RESPONSES.BLOCK || result === SURGE_RESPONSES.NOT_FOUND
            };
        }
    };
}

// =================================================================================
// 📋 更新日誌 (v16.0 Changelog)
// =================================================================================

/**
 * 🔄 v16.0 更新內容 (2025-08-28):
 * 
 * **主要修正**：
 * 1. ✅ 修正 ytag.js 等追蹤腳本無法正確顯示為「阻止」的問題
 * 2. ✅ 使用正確的 Surge 響應語法（空響應體）
 * 3. ✅ 移除無效的 { reject: true } 語法
 * 4. ✅ 改進錯誤處理和日誌記錄
 * 
 * **技術細節**：
 * - 關鍵追蹤腳本：返回 status 200 + 空 body → Surge顯示「阻止」
 * - 圖片廣告：返回透明 GIF → Surge顯示「已修改」
 * - 參數清理：返回 302 重定向 → Surge顯示「已修改」
 * - 正常請求：返回 null → Surge顯示「允許」
 * 
 * **驗證方法**：
 * 1. 安裝腳本到 Surge
 * 2. 
