/**
 * @file        URL-Ultimate-Filter-Surge-V37.1-Final.js
 * @version     37.1 (Critical Fix & Logic Refactor)
 * @description V37.1 為一個緊急修復更新。此版本重構了核心處理邏輯，修正了 V37.0 中因優先級錯亂導致的白名單失效問題，確保過濾規則的正確性。
 * @author      Claude & Gemini & Acterus
 * @lastUpdated 2025-09-08
 */

// #################################################################################################
// #                                                                                               #
// #                           ⚙️ SCRIPT CONFIGURATION & ENGINE FLAGS                              #
// #                                                                                               #
// #################################################################################################

const DEBUG_MODE = false;

const CORE_CONFIG = {
    BLOCK_DOMAINS: new Set([
        // --- Google / DoubleClick ---
        'doubleclick.net', 'ad.doubleclick.net', 'bid.g.doubleclick.net', 'stats.g.doubleclick.net', 'securepubads.g.doubleclick.net',
        'google-analytics.com', 'googletagmanager.com', 'googleadservices.com', 'googlesyndication.com',
        'admob.com', 'adsense.com', 'app-measurement.com', 'adservice.google.com', 'pagead2.googlesyndication.com',
        // --- Facebook / Meta ---
        'graph.facebook.com', 'connect.facebook.net',
        // --- 主流分析 & 追蹤服務 ---
        'scorecardresearch.com', 'chartbeat.com', 'analytics.twitter.com', 'static.ads-twitter.com', 'ads.linkedin.com',
        'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'pubmatic.com', 'rubiconproject.com',
        'openx.net', 'openx.com', 'adsrvr.org', 'adform.net', 'semasio.net', 'yieldlab.net', 'branch.io',
        'appsflyer.com', 'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com',
        'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms', 'track.hubspot.com', 'api.pendo.io',
        'fullstory.com', 'inspectlet.com', 'mouseflow.com', 'crazyegg.com', 'clicktale.net', 'kissmetrics.com',
        'keen.io', 'segment.com', 'segment.io', 'mparticle.com', 'snowplowanalytics.com', 'newrelic.com',
        'nr-data.net', 'datadoghq.com', 'logrocket.com', 'sumo.com', 'sumome.com', 'piwik.pro', 'matomo.cloud',
        'clicky.com', 'statcounter.com', 'quantserve.com', 'comscore.com', 'tealium.com', 'collector.newrelic.com',
        'analytics.line.me',
        // --- 廣告驗證 & 可見度追蹤 ---
        'doubleverify.com', 'moatads.com', 'moat.com', 'iasds.com', 'serving-sys.com',
        // --- 客戶數據平台 (CDP) & 身分識別 ---
        'agkn.com', 'tags.tiqcdn.com',
        // --- 主流廣告聯播網 & 平台 ---
        'adcolony.com', 'adroll.com', 'adsnative.com', 'bidswitch.net', 'casalemedia.com', 'conversantmedia.com',
        'media.net', 'soom.la', 'spotxchange.com', 'teads.tv', 'tremorhub.com', 'yieldmo.com', 'zemanta.com',
        'flashtalking.com', 'indexexchange.com', 'magnite.com', 'gumgum.com', 'inmobi.com', 'mopub.com',
        'sharethrough.com', 'smartadserver.com', 'applovin.com', 'ironsrc.com', 'unityads.unity3d.com', 'vungle.com',
        'appnexus.com', 'contextweb.com', 'spotx.tv', 'liveintent.com', 'narrative.io', 'neustar.biz', 'tapad.com',
        'thetradedesk.com', 'bluekai.com', 'amazon-adsystem.com', 'aax.amazon-adsystem.com', 'fls-na.amazon.com',
        'ib.adnxs.com', 'adserver.yahoo.com', 'ads.yahoo.com', 'analytics.yahoo.com', 'geo.yahoo.com',
        // --- 更多主流廣告技術平台 ---
        'adswizz.com', 'sitescout.com', 'ad.yieldmanager.com', 'creativecdn.com', 'cr-serving.com', 'yieldify.com', 'go-mpulse.net',
        // --- 彈出式 & 其他廣告 ---
        'popads.net', 'propellerads.com', 'adcash.com', 'zeropark.com',
        // --- 聯盟行銷 ---
        'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com',
        // --- 俄羅斯 ---
        'yandex.ru', 'adriver.ru',
        // --- 內容管理 & 推播 ---
        'disqus.com', 'disquscdn.com', 'addthis.com', 'sharethis.com', 'po.st', 'cbox.ws', 'intensedebate.com',
        'onesignal.com', 'pushengage.com', 'sail-track.com',
        // --- 隱私權 & Cookie 同意管理 ---
        'onetrust.com', 'cookielaw.org', 'trustarc.com', 'sourcepoint.com', 'usercentrics.eu',
        // --- 台灣地區 ---
        'clickforce.com.tw', 'tagtoo.co', 'urad.com.tw', 'cacafly.com', 'is-tracking.com', 'vpon.com',
        'ad-specs.guoshipartners.com', 'sitetag.us', 'imedia.com.tw', 'ad.ettoday.net', 'ad.pixnet.net',
        'ad.pchome.com.tw', 'ad.momo.com.tw', 'ad.xuite.net', 'ad.cna.com.tw', 'ad.cw.com.tw',
        'ad.hi-on.org', 'adm.chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com',
        'tenmax.io', 'aotter.net', 'funp.com', 'ad.ruten.com.tw', 'ad.books.com.tw', 'ad.etmall.com.tw',
        'ad.shopping.friday.tw', 'ad-hub.net', 'adgeek.net', 'ad.shopee.tw', 'rq.vpon.com',
        // --- 中國大陸地區 ---
        'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn', 'hm.baidu.com',
        'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com', 'pingjs.qq.com', 'wspeed.qq.com',
        'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com', 'tanx.com', 'alimama.com', 'log.mmstat.com',
        'getui.com', 'jpush.cn', 'jiguang.cn', 'gridsum.com', 'admaster.com.cn', 'miaozhen.com',
        'su.baidu.com', 'mobads.baidu.com', 'mta.qq.com', 'log.tmall.com', 'ad.kuaishou.com', 
        'pangolin-sdk-toutiao.com', 'zhugeio.com', 'growingio.com', 'youmi.net', 'adview.cn', 'igexin.com',
        // --- 其他 ---
        'wcs.naver.net', 'adnx.com', 'rlcdn.com', 'revjet.com',
        'ads-api.tiktok.com', 'analytics.tiktok.com', 'tr.snapchat.com', 'sc-static.net', 'ads.pinterest.com',
        'log.pinterest.com', 'analytics.snapchat.com', 'ads-api.twitter.com', 'ads.youtube.com', 'cint.com',
    ]),
    API_WHITELIST_EXACT: new Set([
        'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
        'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
        'api.github.com', 'api.openai.com', 'api.anthropic.com', 'a-api.anthropic.com', 'api.cohere.ai',
        'gemini.google.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
        'api.vercel.com', 'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
        'database.windows.net', 'auth.docker.io', 'login.docker.com', 'api.cloudflare.com', 'api.fastly.com',
        'api.stripe.com', 'api.paypal.com', 'api.adyen.com', 'api.braintreegateway.com',
        'api.notion.com', 'api.figma.com', 'api.trello.com', 'api.asana.com', 'api.dropboxapi.com', 'clorasio.atlassian.net',
        'okta.com', 'auth0.com', 'sso.godaddy.com',
        'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
        'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
        'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
        'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
        'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com', 'cmapi.tw.coupang.com',
        'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', 'hooks.slack.com', 'api.pagerduty.com',
        'api.zende.sk', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
        'duckduckgo.com', 'external-content.duckduckgo.com'
    ]),
    API_WHITELIST_WILDCARDS: new Map([
        ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true],
        ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true],
        ['update.microsoft.com', true], ['amazonaws.com', true], ['cloudfront.net', true], ['fastly.net', true],
        ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['unpkg.com', true],
        ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true], ['twimg.com', true],
        ['inoreader.com', true], ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true],
        ['itofoo.com', true],
        ['github.io', true], ['gitlab.io', true], ['windows.net', true], ['pages.dev', true], ['vercel.app', true],
        ['netlify.app', true], ['azurewebsites.net', true], ['cloudfunctions.net', true], ['oraclecloud.com', true],
        ['digitaloceanspaces.com', true], ['okta.com', true], ['auth0.com', true], ['atlassian.net', true],
        ['shopee.tw', true], ['fubon.com', true], ['bot.com.tw', true], ['megabank.com.tw', true], ['firstbank.com.tw', true],
        ['hncb.com.tw', true], ['chb.com.tw', true], ['taishinbank.com.tw', true], ['sinopac.com', true],
        ['tcb-bank.com.tw', true], ['scsb.com.tw', true], ['standardchartered.com.tw', true],
        ['web.archive.org', true], ['web-static.archive.org', true], ['archive.is', true], ['archive.today', true],
        ['archive.ph', true], ['archive.li', true], ['archive.vn', true], ['webcache.googleusercontent.com', true],
        ['cc.bingj.com', true], ['perma.cc', true], ['www.webarchive.org.uk', true], ['timetravel.mementoweb.org', true]
    ]),
    CRITICAL_TRACKING_SCRIPTS: new Set(['ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js', 'wcslog.js', 'ads-beacon.js', 'essb-core.min.js', 'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js', 'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js', 'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js', 'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js', 'ad-player.js', 'ad-lib.js', 'ad-core.js']),
    PATH_ALLOW_PATTERNS: new Set(['chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']),
    DROP_KEYWORDS: new Set(['log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector', 'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat', 'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action', 'stacktrace', 'csp-report', 'profiler', 'trace.json', 'usage.log']),
    GLOBAL_TRACKING_PARAMS: new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', '_ga', '_gid', '_gat', '__gads', '__gac', 'msclkid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok', 'zanpid', 'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id', 'customid', 'click_id', 'clickid', 'offer_id', 'promo_code', 'coupon_code', 'deal_id', 'rb_clickid', 's_kwcid', 'ef_id', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search', 'from_promo', 'camid', 'cupid', 'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', 'union_id', 'biz', 'mid', 'idx', 'ad_id', 'adgroup_id', 'campaign_id', 'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel', 'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms', 'creative', 'adset', 'ad', 'pixel_id', 'event_id', 'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position']),
    TRACKING_PREFIXES: new Set(['utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_', 'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_', 'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_', 'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_']),
    PARAMS_TO_KEEP_WHITELIST: new Set(['t', 'v', 'targetid']),
    PATH_BLOCK_REGEX_LITERALS: [
        /^\/[a-z0-9]{12,}\.js$/i,
        /[^\/]*sentry[^\/]*\.js/i
    ],
};

const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};

const RULE_SETS = {
    ADVERTISING_GENERIC: { keywords: new Set(['/ad/', '/ads/', '/adv/', '/advert/', 'doubleclick', 'pagead', 'google_ad', 'adsbygoogle', 'adsense', 'ad-specs']), action: REJECT_RESPONSE },
    TRACKING_GENERIC: { keywords: new Set(['/track/', '/tracker/', '/tracking/', '/beacon/', '/pixel/', '/collect?', '/telemetry/', '/v1/pixel', 'hm.baidu.com']), action: DROP_RESPONSE },
    BEHAVIOR_MONITORING: { keywords: new Set(['hotjar', 'fullstory', 'clarity.ms', 'mouseflow', 'crazyegg', 'inspectlet', 'logrocket', 'vwo.js', 'session-replay']), action: REJECT_RESPONSE },
    ERROR_MONITORING: { keywords: new Set(['/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/']), action: REJECT_RESPONSE },
    PRIVACY_CONSENT: { keywords: new Set(['onetrust', 'cookielaw', 'trustarc', 'sourcepoint', 'usercentrics', 'cookie-consent', 'gdpr']), action: REJECT_RESPONSE },
    SOCIAL_PLUGINS: { keywords: new Set(['fbevents', 'fbq', 'connect.facebook.net', 'addthis', 'sharethis', 'disqus', 'intensedebate']), action: REJECT_RESPONSE },
    CN_ANALYTICS: { keywords: new Set(['umeng', 'cnzz', 'talkingdata', 'miaozhen', 'growingio', 'zhugeio']), action: DROP_RESPONSE },
    AD_PROVIDERS_SPECIAL: { keywords: new Set(['criteo', 'taboola', 'outbrain', 'pubmatic', 'rubiconproject', 'openx', 'adroll', 'appnexus']), action: REJECT_RESPONSE }
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 CORE ENGINE (DO NOT MODIFY)                                     #
// #                                                                                               #
// #################################################################################################

const globalCache = new LRUCache(500);
const compiledRegexCache = new Map();
const paramPrefixTrie = new Trie();
let PRECOMPILED_REGEX = {};

class LRUCache { constructor(maxSize = 500) { this.maxSize = maxSize; this.cache = new Map(); } get(key) { if (!this.cache.has(key)) return null; const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; } set(key, value) { if (this.cache.has(key)) this.cache.delete(key); else if (this.cache.size >= this.maxSize) { this.cache.delete(this.cache.keys().next().value); } this.cache.set(key, value); } }
class Trie { constructor() { this.root = {}; } insert(word) { let node = this.root; for (const char of word) { node = node[char] = node[char] || {}; } node.isEndOfWord = true; } startsWith(prefix) { let node = this.root; const lowerPrefix = prefix.toLowerCase(); for (const char of lowerPrefix) { if (!node[char]) return false; node = node[char]; } return true; } }

const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } }});
const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', 'png', 'jpg', 'jpeg', 'webp', '.ico']);
function buildRegexFromKeywords(keywords, flags = 'i') { if (!keywords || keywords.size === 0) return /(?!)/; const pattern = Array.from(keywords, k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'); return new RegExp(pattern, flags); }

function getCompiledRegex(category) { if (compiledRegexCache.has(category)) return compiledRegexCache.get(category); const keywords = RULE_SETS[category]?.keywords; if (!keywords) return /(?!)/; const newRegex = buildRegexFromKeywords(keywords); compiledRegexCache.set(category, newRegex); return newRegex; }

function initializeRules() {
    CORE_CONFIG.TRACKING_PREFIXES.forEach(p => paramPrefixTrie.insert(p));
    PRECOMPILED_REGEX = {
        ALLOW: buildRegexFromKeywords(CORE_CONFIG.PATH_ALLOW_PATTERNS),
        DROP: buildRegexFromKeywords(CORE_CONFIG.DROP_KEYWORDS)
    };
}

function lightParseUrl(urlString) { try { const pathStartIndex = urlString.indexOf('/', 8); if (pathStartIndex === -1) { const host = urlString.substring(urlString.indexOf('//') + 2); return { hostname: host.toLowerCase(), pathname: '/', search: '' }; } const host = urlString.substring(urlString.indexOf('//') + 2, pathStartIndex); const pathAndQuery = urlString.substring(pathStartIndex); const queryStartIndex = pathAndQuery.indexOf('?'); if (queryStartIndex === -1) { return { hostname: host.toLowerCase(), pathname: pathAndQuery, search: '' }; } const path = pathAndQuery.substring(0, queryStartIndex); const query = pathAndQuery.substring(queryStartIndex); return { hostname: host.toLowerCase(), pathname: path, search: query }; } catch (e) { return null; } }
function isApiWhitelisted(hostname) { if (CORE_CONFIG.API_WHITELIST_EXACT.has(hostname)) return true; for (const [domain] of CORE_CONFIG.API_WHITELIST_WILDCARDS) { if (hostname === domain || hostname.endsWith('.' + domain)) return true; } return false; }
function isDomainBlocked(hostname) { const parts = hostname.split('.'); for (let i = 0; i < parts.length; ++i) { const subdomain = parts.slice(i).join('.'); if (CORE_CONFIG.BLOCK_DOMAINS.has(subdomain)) return true; } return false; }
function getCleanedUrl(urlObject) { let paramsChanged = false; for (const key of [...urlObject.searchParams.keys()]) { if (CORE_CONFIG.PARAMS_TO_KEEP_WHITELIST.has(key.toLowerCase())) continue; if (CORE_CONFIG.GLOBAL_TRACKING_PARAMS.has(key) || paramPrefixTrie.startsWith(key)) { urlObject.searchParams.delete(key); paramsChanged = true; } } return paramsChanged ? urlObject.toString() : null; }

/**
 * [V37.1 新增] 統一的攔截回應生成器
 */
function getBlockResponse(lowerFullPath) {
    if (PRECOMPILED_REGEX.DROP.test(lowerFullPath)) {
        return DROP_RESPONSE;
    }
    const pathOnly = lowerFullPath.split('?')[0];
    const ext = pathOnly.substring(pathOnly.lastIndexOf('.'));
    if (IMAGE_EXTENSIONS.has(ext)) {
        return TINY_GIF_RESPONSE;
    }
    return REJECT_RESPONSE;
}

/**
 * [V37.1 重構] 處理單一請求的主函式
 */
function processRequest(request) {
    try {
        if (!request || !request.url) return null;

        const cachedDecision = globalCache.get(request.url);
        if (cachedDecision) return cachedDecision;

        const parsedUrl = lightParseUrl(request.url);
        if (!parsedUrl) return null;

        const { hostname, pathname, search } = parsedUrl;
        
        // --- 1. API 白名單 (最高優先級：立即放行) ---
        if (isApiWhitelisted(hostname)) {
            globalCache.set(request.url, null);
            return null;
        }

        const lowerPathname = pathname.toLowerCase();
        const lowerFullPath = lowerPathname + search.toLowerCase();

        // --- 2. 域名黑名單 ---
        if (isDomainBlocked(hostname)) {
            const decision = getBlockResponse(lowerFullPath);
            globalCache.set(request.url, decision);
            return decision;
        }

        // --- 3. 關鍵腳本檔名 & 特殊 Regex 規則 ---
        const scriptName = pathname.substring(pathname.lastIndexOf('/') + 1).toLowerCase();
        if (CORE_CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName)) {
            if (!PRECOMPILED_REGEX.ALLOW.test(lowerFullPath)) {
                const decision = getBlockResponse(lowerFullPath);
                globalCache.set(request.url, decision);
                return decision;
            }
        }
        for (const regex of CORE_CONFIG.PATH_BLOCK_REGEX_LITERALS) {
            if (regex.test(lowerPathname)) {
                if (!PRECOMPILED_REGEX.ALLOW.test(lowerFullPath)) {
                    const decision = getBlockResponse(lowerFullPath);
                    globalCache.set(request.url, decision);
                    return decision;
                }
            }
        }
        
        // --- 4. 分類化規則引擎 ---
        for (const category of Object.keys(RULE_SETS)) {
            const regex = getCompiledRegex(category);
            if (regex.test(lowerFullPath)) {
                if (!PRECOMPILED_REGEX.ALLOW.test(lowerFullPath)) {
                    const decision = RULE_SETS[category].action;
                    if (DEBUG_MODE) console.log(`[URL-Filter-V37.1] Blocked by Category "${category}": ${request.url}`);
                    globalCache.set(request.url, decision);
                    return decision;
                }
            }
        }
        
        // --- 5. 參數清理 (僅在未被攔截時執行) ---
        if (search) {
            const fullUrlObject = new URL(request.url);
            const cleanedUrl = getCleanedUrl(fullUrlObject);
            if (cleanedUrl) {
                const decision = REDIRECT_RESPONSE(cleanedUrl);
                globalCache.set(request.url, decision);
                return decision;
            }
        }
        
        // --- 6. 全部通過，最終放行 ---
        globalCache.set(request.url, null);
        return null;

    } catch (error) {
        if (typeof console !== 'undefined' && console.error) console.error(`[URL-Filter-v37.1] 處理錯誤: ${error.message} @ ${request.url}`, error);
        return null;
    }
}

// #################################################################################################
// #                                                                                               #
// #                                     🎬 EXECUTION                                             #
// #                                                                                               #
// #################################################################################################

(function() {
    try {
        initializeRules();
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') $done({ version: '37.1', status: 'ready', message: 'URL Filter v37.1 - Critical Fix & Logic Refactor' });
            return;
        }
        const result = processRequest($request);
        if (typeof $done !== 'undefined') $done(result || {});
    } catch (error) {
        if (typeof console !== 'undefined' && console.error) console.error(`[URL-Filter-v37.1] 致命錯誤: ${error.message}`, error);
        if (typeof $done !== 'undefined') $done({});
    }
})();
// =================================================================================================
// ## 更新日誌 (V37.1)
// =================================================================================================
//
// ### 📅 更新日期: 2025-09-08
//
// ### ✨ V37.0 -> V37.1 變更 (緊急修正與邏輯重構):
//
// **這是一個至關重要的穩定性更新，強烈建議所有 V37.0 使用者升級。**
//
// 1.  **【核心錯誤修正】修復 API 白名單失效的邏輯缺陷**:
//     - **問題**: 在 V37.0 版本中，`isApiWhitelisted` 函式命中後，腳本沒有立即終止並放行請求，而是會繼續執行後續的攔截規則，導致白名單功能在大部分情況下失效。例如，`shopee.tw` 在白名單中，但 `ad.shopee.tw/analytics/` 仍可能被路徑規則錯誤攔截。
//     - **解決方案**: **徹底重構了 `processRequest` 函式的執行流程**。現在，API 白名單檢查是整個腳本的**最高優先級**。一旦請求的域名命中白名單，腳本將**立即返回 `null` 以放行請求**，不再執行任何後續的黑名單或路徑檢查。
//
// 2.  **【邏輯流程優化】重建正確的攔截優先級**:
//     - **問題**: V37.0 的攔截判斷流程較為扁平，缺乏嚴格的優先級順序。
//     - **解決方案**: 新的邏輯嚴格遵循以下金字塔模型，確保行為的一致性與可預測性：
//         1.  **API 白名單** (絕對優先放行)
//         2.  **域名黑名單** (次高優先級攔截)
//         3.  **關鍵腳本與特殊 Regex** (路徑攔截)
//         4.  **分類化規則引擎** (路徑攔截)
//         5.  **追蹤參數清理** (最後的處理)
//
// 3.  **【功能恢復】統一攔截回應生成器**:
//     - **問題**: V37.0 中，部分攔截規則（如域名黑名單）的回應被硬編碼為 `REJECT`，失去了動態判斷 `DROP` 或 `TINY_GIF` 的能力。
//     - **解決方案**: 重新引入了 `getBlockResponse` 輔助函式，所有非分類化規則的攔截決策都將通過此函式，以生成最恰當的回應（`REJECT`, `DROP`, 或 `TINY_GIF`）。
//
// ### 🏆 總結:
//
// V37.1 透過對核心處理邏輯的嚴謹重構，徹底修正了 V37.0 版本中存在的嚴重缺陷，恢復了黑白名單應有的功能與優先級。現在，腳本的過濾行為不僅高效，而且穩定、可靠，嚴格遵循設計預期。
