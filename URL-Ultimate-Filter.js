/**
 * @file        URL-Ultimate-Filter.js
 * @version     12.0 (Final Fusion)
 * @description 終極融合版。整合了「域名攔截」、「路徑攔截 (含白名單防誤殺)」與「追蹤參數移除」三大功能。
 *              此為單一腳本終極解決方案，可取代所有相關腳本及大部分 URL-REGEX 規則。
 * @author      Gemini (融合 v11.0 與 Path-Blocker v3.2)
 * @lastUpdated 2025-08-27
 */

// =================================================================================
// ⚙️ 核心設定區 (Configuration)
// =================================================================================

/**
 * 🚫 域名攔截黑名單 (Domain Blocklist)
 * @description 命中此列表中的域名，請求將被立即阻擋，效能最高。
 */
const BLOCK_DOMAINS = new Set([
    'doubleclick', 'google-analytics', 'googletagmanager', 'googleadservices',
    'googlesyndication', 'admob', 'adsense', 'scorecardresearch', 'chartbeat',
    'graph.facebook.com', 'connect.facebook.net', 'facebook.com/tr',
    'analytics.twitter.com', 'static.ads-twitter.com', 'ads.linkedin.com',
    'criteo', 'taboola', 'outbrain', 'pubmatic', 'rubiconproject', 'openx',
    'adsrvr.org', 'adform.net', 'semasio.net', 'yieldlab.net', 'app-measurement.com',
    'branch.io', 'appsflyer.com', 'adjust.com', 'sentry.io', 'bugsnag.com',
    'hotjar.com', 'vwo.com', 'optimizely.com', 'mixpanel.com', 'amplitude.com',
    'heap.io', 'loggly.com', 'c.clarity.ms', 'track.hubspot.com', 'api.pendo.io'
]);

/**
 * ✅ API 功能性域名白名單 (API Whitelist)
 * @description 白名單內的域名將被完全豁免，不進行任何攔截或清理。
 */
const API_HOSTNAME_WHITELIST = new Set([
    '*.youtube.com', '*.m.youtube.com', 'youtubei.googleapis.com', '*.googlevideo.com',
    'api.weibo.cn', 'api.xiaohongshu.com', 'api.bilibili.com', 'api.zhihu.com',
    'i.instagram.com', 'graph.instagram.com', 'graph.threads.net', 'open.spotify.com',
    'api.deepseek.com', 'kimi.moonshot.cn', 'tongyi.aliyun.com', 'xinghuo.xfyun.cn',
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    '*.paypal.com', '*.stripe.com', 'github.com/login',
    '*.apple.com', '*.icloud.com', '*.windowsupdate.com', 'api.github.com',
    '*.amazonaws.com', '*.aliyuncs.com', '*.cloud.tencent.com', '*.cloudfront.net'
]);

/**
 * ✅ URL 路徑白名單 (Path Whitelist) - [來自 Path-Blocker.js]
 * @description 如果 URL 路徑包含以下任一關鍵字，將【不會】被路徑黑名單攔截，有效防止誤殺。
 */
const PATH_ALLOW_PATTERNS = new Set([
    'chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
    'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js',
    'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board',
    'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
    'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner',
    'amp-anim', 'amp-animation', 'amp-iframe'
]);

/**
 * 🚫 URL 路徑黑名單 (Path Blacklist) - [融合 v11 & v3.2]
 * @description 如果 URL 路徑包含以下任一關鍵字，且【未命中路徑白名單】，請求將被攔截。
 */
const PATH_BLOCK_KEYWORDS = new Set([
    'ad', 'ads', 'adv', 'advert', 'affiliate', 'track', 'trace', 'tracker', 'tracking',
    'analytics', 'analytic', 'log', 'logs', 'logger', 'logrecord', 'putlog',
    'beacon', 'pixel', 'collect', 'report', 'reports', 'sentry', 'bugsnag', 'crash',
    'ga', 'gpt', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense',
    'dfp', 'gtag', 'gtm', 'google-analytics', 'facebook', 'fbevents', 'fbq',
    'addthis', 'sharethis', 'addToHomeScreen', 'taboola', 'criteo', 'osano', 'onead',
    'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude',
    'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads',
    'prebid', 'apstag', 'pwt.js', 'utag.js', 'marketing', 'cookiepolicy', 'consent',
    'social', 'plusone', 'related-posts', 'optimize', 'sso', 'firebase'
]);

/**
 * 💧 需要直接拋棄 (DROP) 請求的特定路徑關鍵字
 */
const DROP_KEYWORDS = new Set([
    'log', 'logs', 'logger', 'amp-loader', 'amp-analytics', 'beacon', 'collect'
]);

/**
 * 🚮 全域追蹤參數黑名單 (Global Tracking Parameters)
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'msclkid', 'yclid',
    'fbclid', 'igshid', 'mc_cid', 'mc_eid', 'mkt_tok', 'x-threads-app-object-id',
    'from', 'source', 'ref', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat',
    'share_id', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from',
    'is_copy_url', 'is_from_webapp', 'xhsshare', 'pvid', 'fr', 'type', 'scene',
    'traceid', 'request_id', 'aff_id', 'mibextid', '__twitter_impression', '_openstat'
]);

/**
 * 🚮 追蹤參數前綴黑名單 (Tracking Prefixes)
 */
const TRACKING_PREFIXES = [
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_',
    'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm', 'vero_', '__cft__'
];


// =================================================================================
// 🚀 核心處理邏輯 (Core Logic) - 請勿修改下方代碼
// =================================================================================

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};
const DROP_RESPONSE = { response: {} };
const REJECT_RESPONSE = { response: { status: 403 } };

function processRequest(request) {
    let u;
    try {
        u = new URL(request.url);
    } catch (e) {
        return null; // Invalid URL
    }
    const hostname = u.hostname.toLowerCase();
    const pathAndQuery = (u.pathname + u.search).toLowerCase();

    // --- Step 0: API Domain Whitelist Check ---
    const isApiWhitelisted = Array.from(API_HOSTNAME_WHITELIST).some(pattern => {
        if (pattern.startsWith('*.')) return hostname.endsWith(pattern.substring(1)) || hostname === pattern.substring(2);
        return hostname === pattern;
    });
    if (isApiWhitelisted) return null;

    // --- Step 1: Domain Block Check ---
    for (const blockDomain of BLOCK_DOMAINS) {
        if (hostname.includes(blockDomain)) return REJECT_RESPONSE;
    }

    // --- Step 2: Path Block Check (with Whitelist) ---
    let isPathBlocked = false;
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (pathAndQuery.includes(keyword)) {
            let isPathWhitelisted = false;
            for (const allowPattern of PATH_ALLOW_PATTERNS) {
                if (pathAndQuery.includes(allowPattern)) {
                    isPathWhitelisted = true;
                    break;
                }
            }
            if (!isPathWhitelisted) {
                isPathBlocked = true;
                break;
            }
        }
    }

    if (isPathBlocked) {
        for (const dropKeyword of DROP_KEYWORDS) {
            if (pathAndQuery.includes(dropKeyword)) return DROP_RESPONSE;
        }
        if (pathAndQuery.endsWith('.gif') || pathAndQuery.endsWith('.svg') || pathAndQuery.endsWith('.png') || pathAndQuery.endsWith('.jpg')) {
            return TINY_GIF_RESPONSE;
        }
        return REJECT_RESPONSE;
    }

    // --- Step 3: Parameter Cleaning ---
    let paramsChanged = false;
    const paramKeys = Array.from(u.searchParams.keys());
    for (const key of paramKeys) {
        const lowerKey = key.toLowerCase();
        let shouldDelete = GLOBAL_TRACKING_PARAMS.has(lowerKey);
        if (!shouldDelete) {
            for (const prefix of TRACKING_PREFIXES) {
                if (lowerKey.startsWith(prefix)) {
                    shouldDelete = true;
                    break;
                }
            }
        }
        if (shouldDelete) {
            u.searchParams.delete(key);
            paramsChanged = true;
        }
    }

    if (paramsChanged) {
        const cleanedUrl = u.toString();
        return { response: { status: 302, headers: { 'Location': cleanedUrl } } };
    }

    return null; // No changes needed
}

// --- Main Execution Logic ---
(function() {
    if (typeof $request === 'undefined' || !$request.url) {
        if (typeof $done !== 'undefined') $done({});
        return;
    }
    const result = processRequest($request);
    if (result) {
        $done(result);
    } else {
        $done({});
    }
})();
