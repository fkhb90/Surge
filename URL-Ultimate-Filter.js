/**
 * @file        URL-Ultimate-Filter-Surge-V19.js
 * @version     19.0
 * @description 基於V18版本進行代碼優化與清單擴充。優化域名匹配邏輯，重構代碼以提高效率和可讀性，並擴充了追蹤腳本與路徑的攔截清單。
 * @author      Claude & Gemini
 * @lastUpdated 2025-08-28
 */

// =================================================================================
// ⚙️ 核心設定區
// =================================================================================

/**
 * 🚫 域名攔截黑名單
 * (與v18保持一致)
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
 * ✅ API 功能性域名白名單
 * (與v18保持一致)
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
    ['newsblur.com', true], ['flipboard.com', true], ['itofoo.com', true]
]);

/**
 * 🚨 關鍵追蹤腳本攔截清單 (V19 擴充)
 * 新增了常見的分析、廣告和用戶行為追蹤腳本
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    // Google
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js',
    // Facebook
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',
    // General Tracking & Ads
    'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js',
    // Analytics & User Behavior
    'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js',
    // Other Ad Platforms
    'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js'
]);

/**
 * 🚨 關鍵追蹤路徑模式 (V19 擴充)
 * 新增了更多API端點和路徑模式
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    // Google
    '/ytag.js', '/gtag.js', '/gtm.js', '/ga.js', '/analytics.js', '/adsbygoogle.js',
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/',
    '/googleadservices/', 'google.com/ads', 'google.com/pagead',
    // Facebook
    '/fbevents.js', '/fbq.js', '/pixel.js', '/tr', '/tr/',
    // General API endpoints
    '/collect', '/track', '/v1/event', '/v1/events', '/events', '/beacon',
    // Other Platforms
    'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track'
]);

/**
 * ✅ 路徑白名單
 * (與v18保持一致)
 */
const PATH_ALLOW_PATTERNS = new Set([
    'chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
    'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js',
    'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board',
    'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
    'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
    'amp-anim', 'amp-animation', 'amp-iframe',
    'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login',
    'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference',
    'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search',
    'filter', 'sort', 'category', 'media', 'image', 'video', 'audio',
    'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync',
    'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe',
    'collections', 'boards', 'streams', 'contents', 'preferences', 'folders',
    'entries', 'items', 'posts', 'articles', 'sources', 'categories',
    'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js',
    'common.js', 'util.js', 'script.js'
]);

/**
 * 🚫 路徑黑名單
 * (與v18保持一致)
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

/**
 * V19 優化: 使用單一正則表達式處理所有追蹤前綴，提高效率
 */
const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mke_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|video_utm_|vero_|__cft_|hsCtaTracking_|_hsenc_|_hsmi_|pk_|mtm_|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_)/;


// =================================================================================
// 🚀 響應定義
// =================================================================================

const TINY_GIF_RESPONSE = {
    response: {
        status: 200,
        headers: { 'Content-Type': 'image/gif' },
        body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    }
};

const REDIRECT_RESPONSE = (cleanUrl) => ({
    response: {
        status: 302,
        headers: { 'Location': cleanUrl }
    }
});

// 預設阻擋響應（403 Forbidden），經V14/V18驗證有效
const REJECT_RESPONSE = { response: { status: 403 } };

// 拋棄請求響應（空響應），讓客戶端超時
const DROP_RESPONSE = { response: {} };


// =================================================================================
// 🚀 核心處理邏輯 (V19 優化)
// =================================================================================

/**
 * 📊 性能統計器 (與v18保持一致)
 */
class PerformanceStats {
    constructor() {
        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            criticalTrackingBlocked: 0,
            domainBlocked: 0,
            pathBlocked: 0,
            paramsCleaned: 0,
            whitelistHits: 0,
            errors: 0
        };
    }
    increment(type) { if (this.stats.hasOwnProperty(type)) this.stats[type]++; }
    getBlockRate() {
        const total = this.stats.totalRequests;
        return total > 0 ? ((this.stats.blockedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
}
const performanceStats = new PerformanceStats();

/**
 * 🚨 關鍵追蹤腳本檢查
 */
function isCriticalTracking(pathAndQuery) {
    for (const script of CRITICAL_TRACKING_SCRIPTS) {
        if (pathAndQuery.includes(script)) return true;
    }
    for (const pattern of CRITICAL_TRACKING_PATTERNS) {
        if (pathAndQuery.includes(pattern)) return true;
    }
    return false;
}

/**
 * 🔍 域名白名單檢查
 */
function isApiWhitelisted(hostname) {
    if (API_WHITELIST_EXACT.has(hostname)) return true;
    for (const [domain, _] of API_WHITELIST_WILDCARDS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) return true;
    }
    return false;
}

/**
 * 🚫 V19 優化: 域名黑名單檢查
 * 重寫匹配邏輯，使其更精確。
 * 例如 `sub.domain.com` 會被 `domain.com` 匹配，但 `other-domain.com` 不會。
 */
function isDomainBlocked(hostname) {
    const parts = hostname.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
        const subdomain = parts.slice(i).join('.');
        if (BLOCK_DOMAINS.has(subdomain)) {
            return true;
        }
    }
    return false;
}

/**
 * 🛤️ 路徑攔截檢查
 */
function isPathBlocked(pathAndQuery) {
    let isBlocked = false;
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
            isBlocked = true;
            break;
        }
    }
    if (!isBlocked) return false;

    for (const allowPattern of PATH_ALLOW_PATTERNS) {
        if (pathAndQuery.includes(allowPattern)) {
            return false; // 被白名單豁免
        }
    }
    return true; // 確認攔截
}

/**
 * 🧹 參數清理功能 (V19 優化)
 * 使用正則表達式來簡化前綴匹配
 */
function cleanTrackingParams(url) {
    let paramsChanged = false;
    const paramKeys = Array.from(url.searchParams.keys());

    for (const key of paramKeys) {
        const lowerKey = key.toLowerCase();
        if (GLOBAL_TRACKING_PARAMS.has(lowerKey) || TRACKING_PREFIX_REGEX.test(lowerKey)) {
            url.searchParams.delete(key);
            paramsChanged = true;
        }
    }
    return paramsChanged;
}

/**
 * V19 新增: 輔助函數，用於決定阻擋時的具體響應類型
 */
function getBlockingResponse(pathAndQuery) {
    // 優先拋棄包含特定關鍵字的請求
    for (const dropKeyword of DROP_KEYWORDS) {
        if (pathAndQuery.includes(dropKeyword)) {
            return DROP_RESPONSE;
        }
    }
    // 替換圖片類廣告為透明GIF
    const imageExtensions = ['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp'];
    if (imageExtensions.some(ext => pathAndQuery.endsWith(ext))) {
        return TINY_GIF_RESPONSE;
    }
    // 預設使用 REJECT (403)
    return REJECT_RESPONSE;
}


/**
 * 🎯 主要處理函數 (V19 優化)
 */
function processRequest(request) {
    try {
        performanceStats.increment('totalRequests');
        if (!request || !request.url) return null;

        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            performanceStats.increment('errors');
            return null;
        }

        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();

        // === Step 0: 關鍵追蹤攔截 (最高優先級) ===
        if (isCriticalTracking(pathAndQuery)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockingResponse(pathAndQuery);
        }

        // === Step 1: API 域名白名單檢查 ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            return null; // 放行
        }

        // === Step 2: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockingResponse(pathAndQuery);
        }

        // === Step 3: 路徑攔截檢查 ===
        if (isPathBlocked(pathAndQuery)) {
            performanceStats.increment('pathBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockingResponse(pathAndQuery);
        }

        // === Step 4: 追蹤參數清理 ===
        if (cleanTrackingParams(url)) {
            performanceStats.increment('paramsCleaned');
            return REDIRECT_RESPONSE(url.toString());
        }

        return null; // 無需處理，放行

    } catch (error) {
        performanceStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter-v19] 處理錯誤:', error);
        }
        return null; // 發生錯誤時放行請求
    }
}

// =================================================================================
// 🎬 主執行邏輯
// =================================================================================

(function() {
    try {
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({
                    version: '19.0',
                    status: 'ready',
                    message: 'URL Filter v19.0 - 優化版'
                });
            }
            return;
        }
        const result = processRequest($request);
        $done(result || {});

    } catch (error) {
        performanceStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter-v19] 致命錯誤:', error);
        }
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// 📋 更新日誌
// =================================================================================

/**
 * 🔄 v19.0 更新內容 (2025-08-28):
 *
 * **核心優化**:
 * - **效率提升**: 重寫了 `isDomainBlocked` 函數，採用更精確的子域名分段匹配，取代了低效且可能誤判的 `includes()` 檢查。
 * - **代碼重構**: 將重複的響應決策邏輯（判斷返回 GIF、DROP 或 REJECT）抽像成 `getBlockingResponse` 輔助函數，簡化了主流程。
 * - **正則優化**: 將 `TRACKING_PREFIXES` 數組轉換為單一的 `TRACKING_PREFIX_REGEX` 正則表達式，加速了參數清理的匹配速度。
 * - **清單擴充**: 搜尋並增加了更多「關鍵追蹤腳本」和「關鍵追蹤路徑」到攔截清單中，增強了過濾能力。
 * - **代碼簡潔**: 移除了 v18 中定義但未使用的響應變量，使代碼更乾淨。
 *
 * **邏輯一致性**:
 * - 保持了與 v14/v18 相同的成功攔截策略（403 拒絕、GIF 替換、302 重定向）。
 */
