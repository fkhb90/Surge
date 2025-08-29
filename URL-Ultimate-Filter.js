/**
 * @file        URL-Ultimate-Filter-Surge-V26-Optimized.js
 * @version     26.0 (Optimized)
 * @description 基於V25修改版，擴充攔截名單、修正錯誤並優化代碼結構，同時保留核心架構。
 * @author      Claude & Gemini & GPT-4
 * @lastUpdated 2025-08-29
 */

// =================================================================================================
// ⚙️ 核心設定區 (基於V25擴充，API白名單已移除)
// =================================================================================================

/**
 * 🚫 域名攔截黑名單 (V26 擴充)
 */
const BLOCK_DOMAINS = new Set([
    // Core & Taiwan Lists...
    'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
    'googlesyndication.com', 'admob.com', 'adsense.com', 'scorecardresearch.com', 'chartbeat.com',
    'graph.facebook.com', 'connect.facebook.net', 'analytics.twitter.com', 'static.ads-twitter.com',
    'ads.linkedin.com', 'criteo.com', 'taboola.com', 'outbrain.com', 'pubmatic.com', 'rubiconproject.com',
    'openx.net', 'adsrvr.org', 'adform.net', 'semasio.net', 'yieldlab.net', 'app-measurement.com',
    'branch.io', 'appsflyer.com', 'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com',
    'optimizely.com', 'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms',
    'track.hubspot.com', 'api.pendo.io', 'adcolony.com', 'adroll.com', 'adsnative.com', 'bidswitch.net',
    'casalemedia.com', 'conversantmedia.com', 'media.net', 'soom.la', 'spotxchange.com', 'teads.tv',
    'tremorhub.com', 'yieldmo.com', 'zemanta.com', 'flashtalking.com', 'indexexchange.com', 'magnite.com',
    'gumgum.com', 'inmobi.com', 'mopub.com', 'sharethrough.com', 'smartadserver.com', 'applovin.com',
    'ironsrc.com', 'unityads.unity3d.com', 'vungle.com', 'yandex.ru', 'adriver.ru', 'criteo.net', 'adnx.com',
    'rlcdn.com', 'fullstory.com', 'inspectlet.com', 'mouseflow.com', 'crazyegg.com', 'clicktale.net',
    'kissmetrics.com', 'keen.io', 'segment.com', 'segment.io', 'mparticle.com', 'snowplowanalytics.com',
    'newrelic.com', 'nr-data.net', 'datadoghq.com', 'logrocket.com', 'sumo.com', 'sumome.com', 'disqus.com',
    'disquscdn.com', 'addthis.com', 'sharethis.com', 'po.st', 'cbox.ws', 'intensedebate.com', 'onesignal.com',
    'pushengage.com', 'sail-track.com', 'piwik.pro', 'matomo.cloud', 'clicky.com', 'statcounter.com',
    'quantserve.com', 'comscore.com', 'revjet.com', 'popads.net', 'propellerads.com', 'adcash.com',
    'zeropark.com', 'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com',
    'rakutenadvertising.com', 'appnexus.com', 'contextweb.com', 'openx.com', 'spotx.tv', 'onetrust.com',
    'cookielaw.org', 'trustarc.com', 'sourcepoint.com', 'liveintent.com', 'narrative.io', 'neustar.biz',
    'tapad.com', 'thetradedesk.com', 'bluekai.com', 'clickforce.com.tw', 'tagtoo.co', 'urad.com.tw',
    'cacafly.com', 'is-tracking.com', 'vpon.com', 'ad-specs.guoshipartners.com', 'sitetag.us', 'imedia.com.tw',
    'ad.ettoday.net', 'ad.pixnet.net', 'ad.pchome.com.tw', 'ad.momo.com.tw', 'ad.xuite.net', 'ad.cna.com.tw',
    'ad.cw.com.tw', 'ad.hi-on.org', 'adm.chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com',
    'tenmax.io', 'aotter.net', 'funp.com', 'ad.ruten.com.tw', 'ad.books.com.tw', 'ad.etmall.com.tw',
    'ad.shopping.friday.tw', 'ad-hub.net', 'adgeek.net', 'ad.shopee.tw',

    // V25 China Expansion (Retained)
    'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn',
    'hm.baidu.com', 'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com',
    'pingjs.qq.com', 'wspeed.qq.com', 'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com',
    'tanx.com', 'alimama.com', 'log.mmstat.com',
    'getui.com', 'jpush.cn', 'jiguang.cn',
    'gridsum.com', 'admaster.com.cn', 'miaozhen.com',

    // V26 New Additions
    'ads.youtube.com', 'ad.doubleclick.net', 'static.doubleclick.net', 'tpc.googlesyndication.com',
    'adservice.google.com', 'pagead2.googlesyndication.com', 'ad-delivery.net', 'cdn.adspirit.de',
    'track.adform.net', 'ads.pubmatic.com', 'adserver.adtech.de', 'msads.net', 'ads.msn.com',
    'ads.yahoo.com', 'analytics.yahoo.com', 'ads.tiktok.com', 'analytics.tiktok.com', 'business.tiktok.com',
    'log.tiktokv.com', 'pangle.io', 'ads.pinterest.com', 'analytics.pinterest.com', 'trk.pinterest.com',
    'widgets.outbrain.com', 'traffic.outbrain.com', 'images.taboola.com', 'trc.taboola.com',
    'id.crwdcntrl.net', 'd.la3-c.com', 'd.la4-c.com', 'acdn.adnxs.com', 'secure.adnxs.com',
    'send.microad.jp', 'ebdr.send.microad.jp', 'creative.ak.fbcdn.net', 'pixel.rubiconproject.com',
    'fastlane.rubiconproject.com', 'eus.rubiconproject.com', 'live.rezync.com', 'cdn.krxd.net',
    'beacon.krxd.net', 'adperm.com', 'adgrx.com', 'adhigh.net', 'adlooxtracking.com', 'adpushup.com',
    'adsunflower.com', 'adsvdi.com', 'adsystem.com', 'adtarget.com.tr', 'adunity.com', 'adverline.com',
    'advertserve.com', 'adworldmedia.com', 'amoad.com', 'analysis.chiasenhac.vn', 'z.moatads.com'
]);

/**
 * ✅ API 功能性域名白名單 (V25 China Expansion REMOVED as requested)
 */
const API_WHITELIST_EXACT = new Set([
    // Core & Taiwan Lists...
    'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
    'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    'api.github.com', 'api.openai.com', 'api.anthropic.com', 'api.cohere.ai', 'api.vercel.com',
    'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
    'database.windows.net', 'api.stripe.com', 'api.paypal.com', 'api.adyen.com',
    'api.braintreegateway.com', 'auth.docker.io', 'login.docker.com', 'api.notion.com',
    'api.figma.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
    'okta.com', 'auth0.com', 'api.trello.com', 'api.asana.com', 'api.intercom.io', 'api.sendgrid.com',
    'api.mailgun.com', '*.atlassian.net', 'hooks.slack.com', 'api.pagerduty.com', 'sso.godaddy.com',
    'api.cloudflare.com', 'api.fastly.com', 'api.zende.sk', 'api.hubapi.com', 'api.dropboxapi.com',
    'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
    'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
    'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
    'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
    'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw'
]);

const API_WHITELIST_WILDCARDS = new Map([
    // Core & Taiwan Lists...
    ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true],
    ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true],
    ['amazonaws.com', true], ['cloudfront.net', true], ['inoreader.com', true],
    ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true], ['itofoo.com', true],
    ['fastly.net', true], ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true],
    ['unpkg.com', true], ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true],
    ['twimg.com', true], ['github.io', true], ['gitlab.io', true], ['windows.net', true],
    ['pages.dev', true], ['vercel.app', true], ['netlify.app', true], ['update.microsoft.com', true],
    ['okta.com', true], ['auth0.com', true], ['atlassian.net', true],     ['azurewebsites.net', true],
    ['cloudfunctions.net', true], ['oraclecloud.com', true], ['digitaloceanspaces.com', true],
    ['swscan.apple.com', true], ['gsp-ssl.ls.apple.com', true], ['fubon.com', true], ['bot.com.tw', true],
    ['megabank.com.tw', true], ['firstbank.com.tw', true], ['hncb.com.tw', true], ['chb.com.tw', true],
    ['taishinbank.com.tw', true], ['sinopac.com', true], ['tcb-bank.com.tw', true], ['scsb.com.tw', true],
    ['standardchartered.com.tw', true]
]);


/**
 * 🚨 關鍵追蹤腳本攔截清單 (V26 擴充)
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    // Core Lists...
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js',

    // V25 China Expansion (Retained)
    'hm.js', // Baidu Tongji
    'u.js', 'um.js', // Umeng
    'aplus.js', 'aplus_wap.js', // Alibaba
    'gdt.js', // Tencent GDT

    // V26 New Additions
    'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'analytics.js', 'ec.js', 'autotrack.js',
    'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js',
    'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js',
    'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js' // snapchat
]);

/**
 * 🚨 關鍵追蹤路徑模式 (V26 擴充)
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    // Core Lists... (已修正部分規則以提高精準度)
    '/ytag.js', '/gtag.js', '/gtm.js', '/ga.js', '/analytics.js', '/adsbygoogle.js', '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/fbevents.js', '/fbq.js', 'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/', '/v1/event', '/v1/events', '/events/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/', '/api/v1/track', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', '/v2/event', '/v2/events', '/intake', '/batch', '/abtesting/', '/feature-flag/', '/user-profile/', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',

    // V25 China Expansion (Retained)
    '/hm.js', 'hm.baidu.com/hm.js',
    'cnzz.com/stat.php', 'wgo.mmstat.com',
    '/log/aplus', '/v.gif',
    'gdt.qq.com/gdt_mview.fcg',

    // V26 New Additions
    '/v1/pixel', 'ads.tiktok.com/i18n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
    'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js',
    '/api/v2/event', '/i/adsct', '/stats.g.doubleclick.net/j/collect', '/ad/v1/event',
    'px.ads.linkedin.com', 'ads.pinterest.com/v3/conversions/events'
]);

/**
 * ✅ 路徑白名單 (無變更)
 */
const PATH_ALLOW_PATTERNS = new Set(['chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'util.js', 'script.js', 'index.js', 'index.mjs', 'main.mjs', 'app.mjs', 'vendor.mjs', 'runtime.mjs', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']);

/**
 * 🚫 路徑黑名單 (V26 擴充)
 */
const PATH_BLOCK_KEYWORDS = new Set(['/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/', '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/event/', '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort', 'web-vitals', 'performance-tracking', 'real-user-monitoring', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'user-behavior', 'session-replay', 'privacy-policy', 'cookie-consent',
    // V26 New Additions
    'ad-break', 'ad_event', 'ad-inventory', 'ad-specs', 'ad-verification', 'ad-viewability',
    '
ad-exchange', 'ad-network', 'ad-platform', 'ad-request', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-logic', 'ad-code', 'ad-script', 'ad-tag', 'ad-tech', 'ad-wrapper', 'ad-pixel', 'ad-tracking', 'ad-telemetry', 'ad-metrics'
]);

/**

💧 直接拋棄請求的關鍵字 (V26 擴充) */ const DROP_KEYWORDS = new Set(['log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector', 'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat', 'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action']);
/**

🗑️ 追蹤參數黑名單 (V26 擴充)
*/
const GLOBAL_TRACKING_PARAMS = new Set([
// Core & Taiwan Lists...
'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', 'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'clickid', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search', 'from_promo', 'camid', 'cupid',

// V25 China Expansion (Retained)
'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', // Baidu Tongji
'union_id', 'biz', 'mid', 'idx', // WeChat

// V26 New Additions
'pk_campaign', 'pk_kwd', 'pk_source', 'pk_medium', 'pk_content', 'mtm_campaign', 'mtm_kwd', 'mtm_source',
'mtm_medium', 'mtm_content', 'mtm_cid', 'mtm_group', 'mtm_placement', 's_kwcid', 'ef_id', 'zanpid'
]);

/**

V26 優化: 擴充並修正正則表達式以涵蓋更多追蹤前綴 */ const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mke_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|video_utm_|vero_|cf|hs|pk|mtm|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_|ref_|from_|share_|aff_|alg_|li_|tt_|tw_|epik_|bta|bta|oly|cam|cup_|gdr_|gds_|et_|hmsr_|yclid_|ef_id_|s_kwcid_)/;
// =================================================================================
// 🚀 V26核心: 響應定義與輔助函數 (優化結構)
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
const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };

// V26 優化: 圖片類型集合
const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);

// V26 優化: 將重複的判斷邏輯抽像為輔助函數
const isImageRequest = (path) => IMAGE_EXTENSIONS.has(path.substring(path.lastIndexOf('.')));
const shouldDropRequest = (path) => {
for (const keyword of DROP_KEYWORDS) {
if (path.includes(keyword)) return true;
}
return false;
};

/**

V26 優化: 統一的攔截響應生成器
@param {string} pathAndQuery - 請求路徑與查詢
@returns {object} - Surge響應對象 */ function getBlockResponse(pathAndQuery) { if (shouldDropRequest(pathAndQuery)) { return DROP_RESPONSE; } if (isImageRequest(pathAndQuery)) { return TINY_GIF_RESPONSE; } return REJECT_RESPONSE; }
// =================================================================================
// 🚀 核心處理邏輯 (基於V14，V26優化)
// =================================================================================

class PerformanceStats {
constructor() {
this.stats = { totalRequests: 0, blockedRequests: 0, criticalTrackingBlocked: 0, domainBlocked: 0, pathBlocked: 0, paramsCleaned: 0, whitelistHits: 0, errors: 0 };
}
increment(type) { if (this.stats.hasOwnProperty(type)) this.stats[type]++; }
getBlockRate() { const total = this.stats.totalRequests; return total > 0 ? ((this.stats.blockedRequests / total) * 100).toFixed(2) + '%' : '0%'; }
}
const performanceStats = new PerformanceStats();

function isCriticalTrackingScript(pathAndQuery) {
const fileName = pathAndQuery.substring(pathAndQuery.lastIndexOf('/') + 1);
if (CRITICAL_TRACKING_SCRIPTS.has(fileName.split('?')[0])) return true;
for (const pattern of CRITICAL_TRACKING_PATTERNS) {
if (pathAndQuery.includes(pattern)) return true;
}
return false;
}

function isApiWhitelisted(hostname) {
if (API_WHITELIST_EXACT.has(hostname)) return true;
for (const [domain, _] of API_WHITELIST_WILDCARDS) {
if (hostname === domain || hostname.endsWith('.' + domain)) return true;
}
return false;
}

/**

V26 優化: 改用更精準的 endsWith 判斷，避免誤殺 */ function isDomainBlocked(hostname) { if (BLOCK_DOMAINS.has(hostname)) return true; // 精確匹配 for (const blockDomain of BLOCK_DOMAINS) { if (hostname.endsWith('.' + blockDomain)) return true; // 子域名匹配 } return false; }
function isPathBlocked(pathAndQuery) {
for (const keyword of PATH_BLOCK_KEYWORDS) {
if (pathAndQuery.includes(keyword)) {
let isProtected = false;
for (const allowPattern of PATH_ALLOW_PATTERNS) {
if (pathAndQuery.includes(allowPattern)) {
isProtected = true;
break;
}
}
if (!isProtected) return true;
}
}
return false;
}

/**

V26 優化: 修正正則表達式未生效的BUG
*/
function cleanTrackingParams(url) {
let paramsChanged = false;
const keysToDelete = [];

for (const key of url.searchParams.keys()) {
const lowerKey = key.toLowerCase();
// 使用正則表達式和黑名單集合進行判斷
if (GLOBAL_TRACKING_PARAMS.has(lowerKey) || TRACKING_PREFIX_REGEX.test(lowerKey)) {
keysToDelete.push(key);
}
}

if (keysToDelete.length > 0) {
paramsChanged = true;
for (const key of keysToDelete) {
url.searchParams.delete(key);
}
}

return paramsChanged;
}

/**

🎯 主要處理函數 (V26 優化)
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

 // === Step 0: 關鍵追蹤腳本攔截 (最高優先級) ===
 if (isCriticalTrackingScript(pathAndQuery)) {
     performanceStats.increment('criticalTrackingBlocked');
     performanceStats.increment('blockedRequests');
     return getBlockResponse(pathAndQuery);
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
     return getBlockResponse(pathAndQuery);
 }

 // === Step 3: 路徑攔截檢查 ===
 if (isPathBlocked(pathAndQuery)) {
     performanceStats.increment('pathBlocked');
     performanceStats.increment('blockedRequests');
     return getBlockResponse(pathAndQuery);
 }

 // === Step 4: 追蹤參數清理 ===
 const originalUrl = request.url;
 if (cleanTrackingParams(url)) {
     const cleanedUrl = url.toString();
     // 避免無限重定向循環
     if (cleanedUrl !== originalUrl) {
         performanceStats.increment('paramsCleaned');
         return REDIRECT_RESPONSE(cleanedUrl);
     }
 }

 return null; // 無需處理，放行
} catch (error) {
performanceStats.increment('errors');
if (typeof console !== 'undefined' && console.error) {
console.error('[URL-Filter-v26] 處理錯誤:', error);
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
$done({ version: '26.0', status: 'ready', message: 'URL Filter v26.0 - Optimized', note: '擴充名單並優化代碼結構' });
}
return;
}
const result = processRequest($request);
if (typeof $done !== 'undefined') {
$done(result || {});
}
} catch (error) {
performanceStats.increment('errors');
if (typeof console !== 'undefined' && console.error) {
console.error('[URL-Filter-v26] 致命錯誤:', error);
}
if (typeof $done !== 'undefined') {
$done({});
}
}
})();

// =================================================================================
// 🔧 調試與統計
// =================================================================================

function getFilterStats() {
return {
version: '26.0',
lastUpdated: '2025-08-29',
stats: performanceStats.stats,
blockRate: performanceStats.getBlockRate(),
config: {
domainBlocklist: BLOCK_DOMAINS.size,
apiWhitelistExact: API_WHITELIST_EXACT.size,
apiWhitelistWildcard: API_WHITELIST_WILDCARDS.size,
criticalTrackingScripts: CRITICAL_TRACKING_SCRIPTS.size,
criticalTrackingPatterns: CRITICAL_TRACKING_PATTERNS.size,
pathBlockKeywords: PATH_BLOCK_KEYWORDS.size,
trackingParams: GLOBAL_TRACKING_PARAMS.size,
dropKeywords: DROP_KEYWORDS.size
}
};
}

// =================================================================================
// 📜 更新日誌
// =================================================================================
/*

V26.0 (2025-08-29)
擴充名單:
BLOCK_DOMAINS: 新增超過 50 個廣告與追蹤域名 (如 ads.tiktok.com, z.moatads.com 等)。
CRITICAL_TRACKING_SCRIPTS: 新增 TikTok, Snapchat, New Relic 等追蹤腳本。
CRITICAL_TRACKING_PATTERNS: 新增對應的追蹤路徑模式。
PATH_BLOCK_KEYWORDS: 擴充更多廣告相關的路徑關鍵字 (如 ad-break, ad-inventory)。
DROP_KEYWORDS: 增加更多日誌與遙測相關關鍵字。
GLOBAL_TRACKING_PARAMS: 新增 pk_*, mtm_*, s_kwcid 等追蹤參數。
TRACKING_PREFIX_REGEX: 同步擴充正則表達式。
代碼優化:
BUG修復: 修正 cleanTrackingParams 函數中 TRACKING_PREFIX_REGEX 未被使用的問題。
邏輯優化: isDomainBlocked 函數從 includes 改為更精準的 endsWith 判斷，避免誤殺合法域名。
結構重構: 將圖片判斷、DROP請求判斷等重複邏輯抽像為 isImageRequest, shouldDropRequest, getBlockResponse 等輔助函數，簡化 processRequest 主流程。
效率提升: 將 IMAGE_EXTENSIONS 從陣列改為 Set 以提升查找效率。
可維護性:
新增此「更新日誌」區塊，方便追蹤版本迭代。
更新統計函數 getFilterStats 以反映更詳細的配置數量。
V25.0 (Modified) (2025-08-28)
基於V18版本，整合V25的黑名單擴充。
根據使用者要求，移除了中國大陸地區的API功能性域名白名單。
保留了V25擴充的中國大陸地區追蹤域名與腳本攔截規則。
核心攔截邏輯沿用V14/V18的403 REJECT策略。 */
