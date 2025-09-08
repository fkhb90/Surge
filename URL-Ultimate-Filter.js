/**
 * @file        URL-Ultimate-Filter-Surge-V36.0-Final.js
 * @version     36.0 (Performance & Engine Refactor)
 * @description V36 為一次徹底的效能重構。核心演算法從 Trie 遷移至原生 RegExp 引擎，引入全域快取與輕量級 URL 解析，大幅提升執行效率與降低延遲。
 * @author      Claude & Gemini & Acterus
 * @lastUpdated 2025-09-08
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION                                             #
// #                      (使用者可在此區域安全地新增、修改或移除規則)                                 #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
    /**
     * 🚫 域名攔截黑名單
     */
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

    /**
     * ✅ API 功能性域名白名單 (完全比對)
     */
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

    /**
     * ✅ API 功能性域名白名單 (萬用字元)
     */
    API_WHITELIST_WILDCARDS: new Map([
        ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true],
        ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true],
        ['update.microsoft.com', true], ['amazonaws.com', true], ['cloudfront.net', true], ['fastly.net', true],
        ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['unpkg.com', true],
        ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true], ['twimg.com', true],
        ['inoreader.com', true], ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true], ['itofoo.com', true],
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

    /**
     * 🚨 關鍵追蹤腳本攔截清單
     */
    CRITICAL_TRACKING_SCRIPTS: new Set([
        'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js',
        'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js',
        'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js',
        'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js',
        'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js',
        'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js', 'wcslog.js', 'ads-beacon.js', 'essb-core.min.js',
        'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js', 'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js',
        'autotrack.js', 'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js', 'dax.js',
        'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js',
        'ad-sdk.js', 'ad-manager.js', 'ad-player.js', 'ad-lib.js', 'ad-core.js'
    ]),

    /**
     * 🚨 關鍵追蹤路徑模式
     */
    CRITICAL_TRACKING_PATTERNS: new Set([
        '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads', 'google.com/pagead',
        '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', '/ads/ga-audiences', 'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/',
        '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/', '/api/v1/track', '/intake', '/api/batch', 'scorecardresearch.com/beacon.js',
        'analytics.twitter.com', 'ads.linkedin.com/li/track', 'px.ads.linkedin.com', 'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid',
        'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events',
        '/plugins/easy-social-share-buttons/', 'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
        '/abtesting/', '/feature-flag/', '/user-profile/', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc', '/v1/pixel', 'ads.tiktok.com/i1n/pixel/events.js',
        'ads-api.tiktok.com/api/v2/pixel', 'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js', '/ad/v1/event',
        'ads.pinterest.com/v3/conversions/events', 'ad.360yield.com', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/',
    ]),

    /**
     * 🚫 路徑關鍵字黑名單
     */
    PATH_BLOCK_KEYWORDS: new Set([
        '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/',
        '/interstitial/', '/preroll/', '/midroll/', '/postroll/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'amp-ad',
        'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'rtb', 'dsp', 'ssp', 'ad_logic', 'ad-choices',
        'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'ad-metrics',
        'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'ad-break', 'ad_event', 'ad-inventory', 'ad-specs',
        'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network', 'ad-platform', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-code',
        'ad-script', 'ad-telemetry', '/adserve/', '/adserving/', '/adframe/', '/adrequest/', '/adretrieve/', '/getads/', '/getad/', '/fetch_ads/', '/track/',
        '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/',
        '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/beacon/', '/pixel/', '/collect?',
        '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'web-vitals',
        'performance-tracking', 'real-user-monitoring', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint',
        'fingerprinting', 'third-party-cookie', 'user-cohort', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'user-behavior',
        'session-replay', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate',
        'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'utag.js', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification',
        'privacy-policy', 'cookie-consent'
    ]),

    /**
     * ✅ 路徑關鍵字白名單
     */
    PATH_ALLOW_PATTERNS: new Set([
        'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'framework.js', 'framework.mjs',
        'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs', 'api', 'service', 'endpoint', 'webhook', 'callback',
        'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat',
        'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import',
        'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents',
        'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js',
        'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap',
        'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart',
        'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt',
        '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config',
        'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---'
    ]),

    /**
     * 💧 直接拋棄請求 (DROP) 的關鍵字
     */
    DROP_KEYWORDS: new Set([
        'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector', 'telemetry', 'crash', 'error-report',
        'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag',
        'client-event', 'server-event', 'heartbeat', 'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action', 'stacktrace', 'csp-report',
        'profiler', 'trace.json', 'usage.log'
    ]),

    /**
     * 🗑️ 全域追蹤參數黑名單
     */
    GLOBAL_TRACKING_PARAMS: new Set([
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format',
        'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', '_ga', '_gid', '_gat', '__gads',
        '__gac', 'msclkid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh',
        'x-threads-app-object-id', 'mibextid', 'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok', 'zanpid', 'affid',
        'affiliate_id', 'partner_id', 'sub_id', 'transaction_id', 'customid', 'click_id', 'clickid', 'offer_id', 'promo_code', 'coupon_code', 'deal_id',
        'rb_clickid', 's_kwcid', 'ef_id', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm',
        'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from',
        'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id',
        'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking',
        'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map',
        'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c',
        '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search',
        'from_promo', 'camid', 'cupid', 'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', 'union_id', 'biz', 'mid', 'idx', 'ad_id', 'adgroup_id', 'campaign_id',
        'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel', 'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms',
        'loc_interest_ms', 'creative', 'adset', 'ad', 'pixel_id', 'event_id', 'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position'
    ]),
    
    /**
     * 追蹤參數前綴集合
     */
    TRACKING_PREFIXES: new Set(['utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_', 'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_', 'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_', 'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_']),

    /**
     * ✅ 必要參數白名單
     */
    PARAMS_TO_KEEP_WHITELIST: new Set(['t', 'v', 'targetid']),

    /**
     * 🚫 基於正規表示式的路徑黑名單
     */
    PATH_BLOCK_REGEX_LITERALS: [
        /^\/[a-z0-9]{12,}\.js$/i, // 攔截根目錄下由12位以上隨機英數字組成的.js檔
        /[^\/]*sentry[^\/]*\.js/i  // 強化 Sentry 攔截規則
    ],
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 CORE ENGINE (DO NOT MODIFY)                                     #
// #                      (腳本核心引擎，非專業人士請勿修改此區域)                                   #
// #                                                                                               #
// #################################################################################################

/**
 * LRU (最近最少使用) 快取類別。
 * [V36.0 優化] 此快取現在作為全域快取，儲存對整個 URL 的最終處理決策。
 */
class LRUCache {
    constructor(maxSize = 500) { this.maxSize = maxSize; this.cache = new Map(); }
    get(key) { if (!this.cache.has(key)) return null; const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; }
    set(key, value) { if (this.cache.has(key)) this.cache.delete(key); else if (this.cache.size >= this.maxSize) { this.cache.delete(this.cache.keys().next().value); } this.cache.set(key, value); }
}

/**
 * Trie (字典樹) 類別，用於高效的前綴匹配。
 * [V36.0 優化] 僅保留最高效的前綴匹配場景 (查詢參數)，取代了原有的子字串搜尋功能。
 */
class Trie {
    constructor() { this.root = {}; }
    insert(word) { let node = this.root; for (const char of word) { node = node[char] = node[char] || {}; } node.isEndOfWord = true; }
    startsWith(prefix) { let node = this.root; const lowerPrefix = prefix.toLowerCase(); for (const char of lowerPrefix) { if (!node[char]) return false; node = node[char]; } return true; }
}

// --- 初始化核心組件與常數 ---
const globalCache = new LRUCache();
const paramPrefixTrie = new Trie();

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', 'png', 'jpg', 'jpeg', 'webp', '.ico']);
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};
const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } }});

// --- [V36.0 新增] 效能優化：預編譯 Regex ---
let PRECOMPILED_REGEX = {};

/**
 * [V36.0 新增] 將關鍵字集合轉換為單一、高效的正規表示式。
 * @param {Set<string>} keywords - 關鍵字集合。
 * @param {string} flags - Regex 旗標。
 * @returns {RegExp} - 編譯後的正規表示式。
 */
function buildRegexFromKeywords(keywords, flags = 'i') {
    if (!keywords || keywords.size === 0) {
        // 返回一個永遠不匹配的 Regex，以避免錯誤
        return /(?!)/;
    }
    // 脫逸特殊字元並用 `|` 連接
    const pattern = Array.from(keywords, k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return new RegExp(pattern, flags);
}

/**
 * [V36.0 優化] 集中初始化所有規則，並預編譯 Regex。
 */
function initializeRules() {
    CONFIG.TRACKING_PREFIXES.forEach(p => paramPrefixTrie.insert(p));
    
    PRECOMPILED_REGEX = {
        CRITICAL_PATTERNS: buildRegexFromKeywords(CONFIG.CRITICAL_TRACKING_PATTERNS),
        PATH_BLOCK: buildRegexFromKeywords(CONFIG.PATH_BLOCK_KEYWORDS),
        PATH_ALLOW: buildRegexFromKeywords(CONFIG.PATH_ALLOW_PATTERNS),
        DROP_KEYWORDS: buildRegexFromKeywords(CONFIG.DROP_KEYWORDS),
        PATH_BLOCK_LITERALS: CONFIG.PATH_BLOCK_REGEX_LITERALS
    };
}

// #################################################################################################
// #                                                                                               #
// #                             🚦 MAIN PROCESSING LOGIC                                          #
// #                                                                                               #
// #################################################################################################

/**
 * [V36.0 優化] 輕量級 URL 解析器，避免為每個請求都建立完整的 URL 物件。
 * @param {string} urlString - 原始 URL 字串。
 * @returns {{hostname: string, pathname: string, search: string}|null}
 */
function lightParseUrl(urlString) {
    try {
        // 尋找協議之後的第一個 `/`
        const pathStartIndex = urlString.indexOf('/', 8);
        if (pathStartIndex === -1) {
            // URL 類似 "https://example.com"
            const host = urlString.substring(urlString.indexOf('//') + 2);
            return { hostname: host.toLowerCase(), pathname: '/', search: '' };
        }
        
        const host = urlString.substring(urlString.indexOf('//') + 2, pathStartIndex);
        const pathAndQuery = urlString.substring(pathStartIndex);
        
        const queryStartIndex = pathAndQuery.indexOf('?');
        if (queryStartIndex === -1) {
            return { hostname: host.toLowerCase(), pathname: pathAndQuery, search: '' };
        }
        
        const path = pathAndQuery.substring(0, queryStartIndex);
        const query = pathAndQuery.substring(queryStartIndex);
        return { hostname: host.toLowerCase(), pathname: path, search: query };
    } catch (e) {
        return null;
    }
}

/**
 * 檢查主機名稱是否在 API 白名單中。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean}
 */
function isApiWhitelisted(hostname) {
    if (CONFIG.API_WHITELIST_EXACT.has(hostname)) return true;
    for (const [domain] of CONFIG.API_WHITELIST_WILDCARDS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
            return true;
        }
    }
    return false;
}

/**
 * [V36.0 優化] 檢查主機名稱是否在域名黑名單中 (演算法改進)。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean}
 */
function isDomainBlocked(hostname) {
    const parts = hostname.split('.');
    for (let i = 0; i < parts.length; ++i) {
        const subdomain = parts.slice(i).join('.');
        if (CONFIG.BLOCK_DOMAINS.has(subdomain)) {
            return true;
        }
    }
    return false;
}

/**
 * 清理 URL 中的追蹤參數。
 * @param {URL} urlObject - 完整的 URL 物件。
 * @returns {string|null} - 若有修改則返回新 URL 字串，否則返回 null。
 */
function getCleanedUrl(urlObject) {
    let paramsChanged = false;
    for (const key of [...urlObject.searchParams.keys()]) {
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(key.toLowerCase())) {
            continue;
        }
        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(key) || paramPrefixTrie.startsWith(key)) {
            urlObject.searchParams.delete(key);
            paramsChanged = true;
        }
    }
    return paramsChanged ? urlObject.toString() : null;
}

/**
 * 根據請求路徑，決定適當的攔截回應。
 * @param {string} lowerFullPath - 小寫的完整路徑。
 * @returns {object} - Surge 回應物件。
 */
function getBlockResponse(lowerFullPath) {
    if (PRECOMPILED_REGEX.DROP_KEYWORDS.test(lowerFullPath)) {
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
 * [V36.0 重構] 處理單一請求的主函式。
 * @param {object} request - Surge 的 $request 物件。
 * @returns {object|null}
 */
function processRequest(request) {
    try {
        if (!request || !request.url) return null;

        // --- 1. 全域快取檢查 (最優先) ---
        const cachedDecision = globalCache.get(request.url);
        if (cachedDecision) {
            return cachedDecision;
        }

        // --- 2. 輕量級 URL 解析 ---
        const parsedUrl = lightParseUrl(request.url);
        if (!parsedUrl) return null;

        const { hostname, pathname, search } = parsedUrl;
        const lowerPathname = pathname.toLowerCase();
        const lowerFullPath = lowerPathname + search.toLowerCase();

        let decision = null;

        // --- 3. 過濾邏輯 (依效率排序) ---
        if (isDomainBlocked(hostname)) {
            decision = getBlockResponse(lowerFullPath);
        } else if (isApiWhitelisted(hostname)) {
            decision = null; // Pass
        } else {
            const scriptName = pathname.substring(pathname.lastIndexOf('/') + 1).toLowerCase();
            if (CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName) || PRECOMPILED_REGEX.CRITICAL_PATTERNS.test(lowerFullPath)) {
                decision = getBlockResponse(lowerFullPath);
            } else if (PRECOMPILED_REGEX.PATH_BLOCK.test(lowerFullPath)) {
                if (!PRECOMPILED_REGEX.PATH_ALLOW.test(lowerFullPath)) {
                    decision = getBlockResponse(lowerFullPath);
                }
            } else {
                for (const regex of PRECOMPILED_REGEX.PATH_BLOCK_LITERALS) {
                    if (regex.test(lowerPathname)) {
                        decision = getBlockResponse(lowerFullPath);
                        break;
                    }
                }
            }
        }
        
        // --- 4. 參數清理 (僅在未被攔截時執行) ---
        if (decision === null) {
            // 此處為效能權衡點：僅在需要時才建立完整的 URL 物件
            const fullUrlObject = new URL(request.url);
            const cleanedUrl = getCleanedUrl(fullUrlObject);
            if (cleanedUrl) {
                decision = REDIRECT_RESPONSE(cleanedUrl);
            }
        }
        
        // --- 5. 寫入全域快取並返回 ---
        globalCache.set(request.url, decision);
        return decision;

    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v36] 處理錯誤: ${error.message}`, error);
        }
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
        initializeRules(); // 執行初始化
        
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ version: '36.0', status: 'ready', message: 'URL Filter v36.0 - Performance & Engine Refactor' });
            }
            return;
        }
        
        const result = processRequest($request);
        if (typeof $done !== 'undefined') { $done(result || {}); }
        
    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v36] 致命錯誤: ${error.message}`, error);
        }
        if (typeof $done !== 'undefined') { $done({}); }
    }
})();

// =================================================================================================
// ## 更新日誌 (V36.0)
// =================================================================================================
//
// ### 📅 更新日期: 2025-09-08
//
// ### ✨ V35.0 -> V36.0 變更 (核心效能重構):
//
// 這是一次以提升執行效率為核心目標的重大更新，對腳本的底層演算法與執行邏輯進行了全面重構。
//
// 1.  **【演算法升級】遷移至原生正規表示式 (RegExp) 引擎**:
//     - **背景**: 原先用於路徑與關鍵字匹配的 JavaScript 版 Trie (字典樹) 演算法，在高密度匹配場景下存在效能瓶頸。
//     - **優化**: 將所有關鍵字匹配集合 (`CRITICAL_TRACKING_PATTERNS`, `PATH_BLOCK_KEYWORDS` 等) 在腳本初始化時，
//       **預編譯 (Pre-compiled)** 成單一、高效的 `RegExp` 物件。
//     - **效益**: 利用瀏覽器或 Surge 底層以 C++ 實現的高效正規表示式引擎進行匹配，其速度遠超純 JavaScript 實現的演算法，
//       大幅降低了路徑檢查的 CPU 運算時間。
//
// 2.  **【快取策略升級】引入全域請求快取 (Global Request Cache)**:
//     - **背景**: 原快取策略分散於各個檢查函式中，且僅快取部分結果，無法避免對同一 URL 的完整邏輯鏈重複執行。
//     - **優化**: 將 `LRUCache` 提升至全域級別，直接快取 **整個 URL 的最終處理決策** (例如：通過、攔截、重定向)。
//     - **效益**: 當同一個資源被重複請求時 (例如網頁中的 CSS/JS 檔案)，腳本能以 O(1) 的時間複雜度直接從快取中返回結果，
//       跳過所有解析與匹配邏輯，顯著降低延遲。
//
// 3.  **【資源管理優化】實施輕量級 URL 解析**:
//     - **背景**: `new URL()` 是一個相對耗費資源的操作，為每一個網路請求都完整實例化一個 URL 物件會造成不必要的開銷。
//     - **優化**: 開發了一個輕量級的 URL 解析函式 (`lightParseUrl`)，僅用高效率的字串操作提取出必要的 `hostname` 和 `path` 進行初步過濾。
//       只有在請求通過所有攔截規則，且需要進行參數清理時，才會建立完整的 `URL` 物件。
//     - **效益**: 大幅減少了不必要的物件創建，降低了記憶體佔用和 GC (垃圾回收) 壓力，提升了腳本的整體反應速度。
//
// 4.  **【演算法微調】改進域名檢查邏輯**:
//     - 對 `isDomainBlocked` 函式中的迴圈邏輯進行了微調，採用 `split` 與 `slice` 代替了連續的 `indexOf` 與 `substring`，
//       使程式碼更具可讀性且在某些 JS 引擎下執行效率略有提升。
//
// ### 🏆 總結:
//
// V36.0 透過演算法替換、智慧快取、延遲運算等多維度的深度優化，將腳本的效能推向了新的高度。
// 這次重構不僅僅是速度的提升，更是架構上的演進，確保了腳本在應對日益複雜的網路環境時，
// 依然能保持輕量、高效與穩定，為使用者提供無感的極速過濾體驗。
