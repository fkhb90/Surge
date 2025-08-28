/**
 * @file        URL-Ultimate-Filter-Surge-V25-Modified.js
 * @version     25.0 (Modified)
 * @description 基於V18版本，整合V25的黑名單擴充，並根據使用者要求移除了中國大陸地區的API白名單。
 * @author      Claude & Gemini
 * @lastUpdated 2025-08-28
 */

// =================================================================================================
// ⚙️ 核心設定區 (基於V25擴充，API白名單已移除)
// =================================================================================================

/**
 * 🚫 域名攔截黑名單 (V25 擴充)
 */
const BLOCK_DOMAINS = new Set([
    // Core & Taiwan Lists...
    'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com', 'googlesyndication.com', 'admob.com', 'adsense.com', 'scorecardresearch.com', 'chartbeat.com', 'graph.facebook.com', 'connect.facebook.net', 'analytics.twitter.com', 'static.ads-twitter.com', 'ads.linkedin.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'pubmatic.com', 'rubiconproject.com', 'openx.net', 'adsrvr.org', 'adform.net', 'semasio.net', 'yieldlab.net', 'app-measurement.com', 'branch.io', 'appsflyer.com', 'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com', 'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms', 'track.hubspot.com', 'api.pendo.io', 'adcolony.com', 'adroll.com', 'adsnative.com', 'bidswitch.net', 'casalemedia.com', 'conversantmedia.com', 'media.net', 'soom.la', 'spotxchange.com', 'teads.tv', 'tremorhub.com', 'yieldmo.com', 'zemanta.com', 'flashtalking.com', 'indexexchange.com', 'magnite.com', 'gumgum.com', 'inmobi.com', 'mopub.com', 'sharethrough.com', 'smartadserver.com', 'applovin.com', 'ironsrc.com', 'unityads.unity3d.com', 'vungle.com', 'yandex.ru', 'adriver.ru', 'criteo.net', 'adnx.com', 'rlcdn.com', 'fullstory.com', 'inspectlet.com', 'mouseflow.com', 'crazyegg.com', 'clicktale.net', 'kissmetrics.com', 'keen.io', 'segment.com', 'segment.io', 'mparticle.com', 'snowplowanalytics.com', 'newrelic.com', 'nr-data.net', 'datadoghq.com', 'logrocket.com', 'sumo.com', 'sumome.com', 'disqus.com', 'disquscdn.com', 'addthis.com', 'sharethis.com', 'po.st', 'cbox.ws', 'intensedebate.com', 'onesignal.com', 'pushengage.com', 'sail-track.com', 'piwik.pro', 'matomo.cloud', 'clicky.com', 'statcounter.com', 'quantserve.com', 'comscore.com', 'revjet.com', 'popads.net', 'propellerads.com', 'adcash.com', 'zeropark.com', 'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com', 'appnexus.com', 'contextweb.com', 'openx.com', 'spotx.tv', 'onetrust.com', 'cookielaw.org', 'trustarc.com', 'sourcepoint.com', 'liveintent.com', 'narrative.io', 'neustar.biz', 'tapad.com', 'thetradedesk.com', 'bluekai.com', 'clickforce.com.tw', 'tagtoo.co', 'urad.com.tw', 'cacafly.com', 'is-tracking.com', 'vpon.com', 'ad-specs.guoshipartners.com', 'sitetag.us', 'imedia.com.tw', 'ad.ettoday.net', 'ad.pixnet.net', 'ad.pchome.com.tw', 'ad.momo.com.tw', 'ad.xuite.net', 'ad.cna.com.tw', 'ad.cw.com.tw', 'ad.hi-on.org', 'adm.chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com', 'tenmax.io', 'aotter.net', 'funp.com', 'ad.ruten.com.tw', 'ad.books.com.tw', 'ad.etmall.com.tw', 'ad.shopping.friday.tw', 'ad-hub.net', 'adgeek.net', 'ad.shopee.tw',

    // V25 China Expansion (Retained)
    'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn',
    'hm.baidu.com', 'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com',
    'pingjs.qq.com', 'wspeed.qq.com', 'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com',
    'tanx.com', 'alimama.com', 'log.mmstat.com',
    'getui.com', 'jpush.cn', 'jiguang.cn',
    'gridsum.com', 'admaster.com.cn', 'miaozhen.com'
]);

/**
 * ✅ API 功能性域名白名單 (V25 China Expansion REMOVED as requested)
 */
const API_WHITELIST_EXACT = new Set([
    // Core & Taiwan Lists...
    'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net', 'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'api.github.com', 'api.openai.com', 'api.anthropic.com', 'api.cohere.ai', 'api.vercel.com', 'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com', 'database.windows.net', 'api.stripe.com', 'api.paypal.com', 'api.adyen.com', 'api.braintreegateway.com', 'auth.docker.io', 'login.docker.com', 'api.notion.com', 'api.figma.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv', 'okta.com', 'auth0.com', 'api.trello.com', 'api.asana.com', 'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', '*.atlassian.net', 'hooks.slack.com', 'api.pagerduty.com', 'sso.godaddy.com', 'api.cloudflare.com', 'api.fastly.com', 'api.zende.sk', 'api.hubapi.com', 'api.dropboxapi.com', 'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw', 'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw', 'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com', 'richart.tw', 'api.irentcar.com.tw', 'api.591.com.tw', 'api.104.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw', 'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw'
]);

const API_WHITELIST_WILDCARDS = new Map([
    // Core & Taiwan Lists...
    ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true], ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true], ['amazonaws.com', true], ['cloudfront.net', true], ['feedly.com', true], ['inoreader.com', true], ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true], ['itofoo.com', true], ['fastly.net', true], ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['unpkg.com', true], ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true], ['cdninstagram.com', true], ['twimg.com', true], ['github.io', true], ['gitlab.io', true], ['pages.dev', true], ['vercel.app', true], ['netlify.app', true], ['firebaseapp.com', true], ['s3.amazonaws.com', true], ['okta.com', true], ['auth0.com', true], ['atlassian.net', true], ['azurewebsites.net', true], ['cloudfunctions.net', true], ['firebaseio.com', true], ['windows.net', true], ['oraclecloud.com', true], ['digitaloceanspaces.com', true], ['update.microsoft.com', 'true'], ['swscan.apple.com', 'true'], ['gsp-ssl.ls.apple.com', 'true'], ['hinet.net', true], ['cht.com.tw', true], ['gov.tw', true], ['edu.tw', true], ['fubon.com', true], ['bot.com.tw', true], ['megabank.com.tw', true], ['firstbank.com.tw', true], ['hncb.com.tw', true], ['chb.com.tw', true], ['taishinbank.com.tw', true], ['sinopac.com', true], ['tcb-bank.com.tw', true], ['scsb.com.tw', true], ['standardchartered.com.tw', true]
]);


/**
 * 🚨 關鍵追蹤腳本攔截清單 (V25 擴充)
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    // Core Lists...
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js',

    // V25 China Expansion (Retained)
    'hm.js', // Baidu Tongji
    'u.js', 'um.js', // Umeng
    'aplus.js', 'aplus_wap.js', // Alibaba
    'gdt.js' // Tencent GDT
]);

/**
 * 🚨 關鍵追蹤路徑模式 (V25 擴充)
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    // Core Lists...
    '/ytag.js', '/gtag.js', '/gtm.js', '/ga.js', '/analytics.js', '/adsbygoogle.js', '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/fbevents.js', '/fbq.js', 'facebook.com/tr', 'facebook.com/tr/', '/collect', '/track', '/v1/event', '/v1/events', '/events', '/beacon', '/pixel', '/telemetry', '/api/log', '/api/track', '/api/collect', '/api/v1/track', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', '/v2/event', '/v2/events', '/intake', '/batch', '/abtesting/', '/feature-flag/', '/user-profile/', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',

    // V25 China Expansion (Retained)
    '/hm.js', 'hm.baidu.com/hm.js',
    'cnzz.com/stat.php', 'wgo.mmstat.com',
    '/log/aplus', '/v.gif',
    'gdt.qq.com/gdt_mview.fcg'
]);

/**
 * ✅ 路徑白名單 (無變更)
 */
const PATH_ALLOW_PATTERNS = new Set(['chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'util.js', 'script.js', 'index.js', 'index.mjs', 'main.mjs', 'app.mjs', 'vendor.mjs', 'runtime.mjs', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']);

/**
 * 🚫 路徑黑名單 (無變更)
 */
const PATH_BLOCK_KEYWORDS = new Set(['/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/', '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/event/', '/beacon/', '/pixel/', '/collect/', '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort', 'web-vitals', 'performance-tracking', 'real-user-monitoring', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'user-behavior', 'session-replay', 'privacy-policy', 'cookie-consent']);

/**
 * 💧 直接拋棄請求的關鍵字 (無變更)
 */
const DROP_KEYWORDS = new Set(['log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect', 'collector', 'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat']);

/**
 * 🗑️ 追蹤參數黑名單 (V25 擴充)
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    // Core & Taiwan Lists...
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', 'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'clickid', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search', 'from_promo', 'camid', 'cupid',

    // V25 China Expansion (Retained)
    'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', // Baidu Tongji
    'union_id', 'biz', 'mid', 'idx' // WeChat
]);

/**
 * V25 優化: 擴充正則表達式以涵蓋更多中國大陸追蹤前綴
 */
const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mke_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|video_utm_|vero_|__cf_|_hs|pk_|mtm_|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_|ref_|from_|share_|aff_|alg_|li_|tt_|tw_|epik_|_bta_|_bta|_oly_|cam_|cup_|gdr_|gds_|et_|[hmsr_])/;


// =================================================================================
// 🚀 **V18核心**: 響應定義（修正顯示問題）
// =================================================================================

/**
 * 🎯 響應類型定義
 * 
 * 根據測試和觀察，Surge的顯示邏輯：
 * - 空響應體 {} → 顯示「已修改」
 * - 特定狀態碼 → 可能顯示「阻止」
 * - 無響應（DROP）→ 可能顯示「阻止」
 */

// 透明GIF響應（圖片替換）
const TINY_GIF_RESPONSE = { 
    response: { 
        status: 200, 
        headers: { 'Content-Type': 'image/gif' }, 
        body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
    }
};

// 重定向響應（參數清理）
const REDIRECT_RESPONSE = (cleanUrl) => ({ 
    response: { 
        status: 302, 
        headers: { 'Location': cleanUrl } 
    } 
});

// **V18核心修正**: 使用不同的阻擋策略
// 策略1: 使用特殊狀態碼（可能顯示為阻止）
const BLOCK_RESPONSE_V1 = { response: { status: 444 } }; // Nginx的"無響應"狀態碼

// 策略2: 使用0狀態碼（網路錯誤）
const BLOCK_RESPONSE_V2 = { response: { status: 0 } };

// 策略3: 完全空響應（類似V14的DROP）
const BLOCK_RESPONSE_V3 = { response: {} };

// 策略4: 使用204 No Content
const BLOCK_RESPONSE_V4 = { response: { status: 204 } };

// 預設使用策略（基於V14的成功經驗）
const REJECT_RESPONSE = { response: { status: 403 } }; // V14使用的403
const DROP_RESPONSE = { response: {} }; // V14使用的空響應

// =================================================================================
// 🚀 核心處理邏輯（基於V14）
// =================================================================================

/**
 * 📊 性能統計器
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
    
    increment(type) {
        if (this.stats.hasOwnProperty(type)) {
            this.stats[type]++;
        }
    }
    
    getBlockRate() {
        const total = this.stats.totalRequests;
        return total > 0 ? ((this.stats.blockedRequests / total) * 100).toFixed(2) + '%' : '0%';
    }
}

const performanceStats = new PerformanceStats();

/**
 * 🚨 關鍵追蹤腳本檢查（來自V14）
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
 * 🛤️ 路徑攔截檢查（基於V14邏輯）
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
 * 🎯 主要處理函數（基於V14的成功邏輯）
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
            performanceStats.increment('errors');
            return null;
        }
        
        const hostname = url.hostname.toLowerCase();
        const pathAndQuery = (url.pathname + url.search).toLowerCase();
        
        // === Step 0: 關鍵追蹤腳本攔截（最高優先級）===
        if (isCriticalTrackingScript(pathAndQuery)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('blockedRequests');
            
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
            
            // **V18核心**: 對ytag.js等關鍵腳本使用REJECT（403）
            return REJECT_RESPONSE;
        }
        
        // === Step 1: API 域名白名單檢查 ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            return null; // 白名單域名放行
        }
        
        // === Step 2: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('blockedRequests');
            return REJECT_RESPONSE;
        }
        
        // === Step 3: 路徑攔截檢查 ===
        if (isPathBlocked(pathAndQuery)) {
            performanceStats.increment('pathBlocked');
            performanceStats.increment('blockedRequests');
            
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
            performanceStats.increment('paramsCleaned');
            const cleanedUrl = url.toString();
            return REDIRECT_RESPONSE(cleanedUrl);
        }
        
        return null; // 無需處理，放行
        
    } catch (error) {
        performanceStats.increment('errors');
        
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter-v18] 處理錯誤:', error);
        }
        
        return null; // 發生錯誤時放行請求
    }
}

// =================================================================================
// 🎬 主執行邏輯
// =================================================================================

(function() {
    try {
        // 檢查執行環境
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ 
                    version: '18.0',
                    status: 'ready',
                    message: 'URL Filter v18.0 - 基於V14邏輯優化',
                    note: '使用V14的成功阻擋邏輯，保持403響應'
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
        performanceStats.increment('errors');
        
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter-v18] 致命錯誤:', error);
        }
        
        // 確保即使發生錯誤也能正常結束
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// 🔧 調試功能
// =================================================================================

/**
 * 🧪 測試函數
 */
function testSurgeFilter() {
    const testCases = [
        // 關鍵追蹤腳本測試
        { url: 'https://www.googletagmanager.com/ytag.js', expected: 'REJECT' },
        { url: 'https://api.github.com/ytag.js', expected: 'REJECT' },
        { url: 'https://cdn.example.com/scripts/ytag.js?v=1.0', expected: 'REJECT' },
        { url: 'https://analytics.example.com/gtag.js', expected: 'REJECT' },
        
        // 域名阻擋測試
        { url: 'https://doubleclick.net/ads/script.js', expected: 'REJECT' },
        { url: 'https://google-analytics.com/collect', expected: 'REJECT' },
        
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
    
    console.log('=== Surge Filter v18 測試 ===\n');
    
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(testCase => {
        const mockRequest = { url: testCase.url };
        const result = processRequest(mockRequest);
        
        let resultType = 'ALLOW';
        if (result) {
            if (result.response && result.response.status === 403) {
                resultType = 'REJECT';
            } else if (result.response && result.response.status === 302) {
                resultType = 'REDIRECT';
            } else if (result.response && result.response.body) {
                resultType = 'TINY_GIF';
            } else if (result.response && !result.response.status) {
                resultType = 'DROP';
            }
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
        version: '18.0',
        lastUpdated: '2025-08-28',
        stats: performanceStats.stats,
        blockRate: performanceStats.getBlockRate(),
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
                willBlock: result !== null,
                responseType: result ? (
                    result.response.status === 403 ? 'REJECT' :
                    result.response.status === 302 ? 'REDIRECT' :
                    result.response.body ? 'TINY_GIF' : 'DROP'
                ) : 'ALLOW'
            };
        }
    };
}
