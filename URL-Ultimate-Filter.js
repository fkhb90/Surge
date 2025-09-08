/**
 * @file        URL-Ultimate-Filter-Surge-V37.0-Final.js
 * @version     37.0 (Algorithm Acceleration & Multi-Layer Cache)
 * @description V37 導入多層快取與演算法加速。新增域名決策快取以加速主機級別的過濾，並將 Trie 結構與萬用字元匹配完全遷移至原生 RegExp 引擎，實現了更低的延遲與記憶體佔用。
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
    API_WHITELIST_WILDCARDS: new Set([
        'youtube.com', 'm.youtube.com', 'googlevideo.com', 'paypal.com',
        'stripe.com', 'apple.com', 'icloud.com', 'windowsupdate.com',
        'update.microsoft.com', 'amazonaws.com', 'cloudfront.net', 'fastly.net',
        'akamaihd.net', 'cloudflare.com', 'jsdelivr.net', 'unpkg.com',
        'cdnjs.cloudflare.com', 'gstatic.com', 'fbcdn.net', 'twimg.com',
        'inoreader.com', 'theoldreader.com', 'newsblur.com', 'flipboard.com', 'itofoo.com',
        'github.io', 'gitlab.io', 'windows.net', 'pages.dev', 'vercel.app',
        'netlify.app', 'azurewebsites.net', 'cloudfunctions.net', 'oraclecloud.com',
        'digitaloceanspaces.com', 'okta.com', 'auth0.com', 'atlassian.net',
        'shopee.tw', 'fubon.com', 'bot.com.tw', 'megabank.com.tw', 'firstbank.com.tw',
        'hncb.com.tw', 'chb.com.tw', 'taishinbank.com.tw', 'sinopac.com',
        'tcb-bank.com.tw', 'scsb.com.tw', 'standardchartered.com.tw',
        'web.archive.org', 'web-static.archive.org', 'archive.is', 'archive.today',
        'archive.ph', 'archive.li', 'archive.vn', 'webcache.googleusercontent.com',
        'cc.bingj.com', 'perma.cc', 'www.webarchive.org.uk', 'timetravel.mementoweb.org'
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
        'fingerprinting', 'third-party-cookie', 'user-cohort', 'attribution', 'retargeting', 'audience', 'cohort', 'user-behavior',
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
 */
class LRUCache {
    constructor(maxSize = 500) { this.maxSize = maxSize; this.cache = new Map(); }
    get(key) { if (!this.cache.has(key)) return null; const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; }
    set(key, value) { if (this.cache.has(key)) this.cache.delete(key); else if (this.cache.size >= this.maxSize) { this.cache.delete(this.cache.keys().next().value); } this.cache.set(key, value); }
}

// --- 初始化核心組件與常數 ---
const globalUrlCache = new LRUCache(500);
const domainDecisionCache = new LRUCache(100); // [V37.0 新增] 域名決策快取

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', 'png', 'jpg', 'jpeg', 'webp', '.ico']);
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};
const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } }});

const DOMAIN_DECISION = { BLOCKED: 1, API_WHITELISTED: 2, PASSTHROUGH: 3 };

// --- [V37.0 優化] 預編譯 Regex 儲存庫 ---
let PRECOMPILED_REGEX = {};

/**
 * 將關鍵字集合轉換為單一、高效的正規表示式。
 * @param {Set<string>} keywords - 關鍵字集合。
 * @param {string} flags - Regex 旗標。
 * @returns {RegExp} - 編譯後的正規表示式。
 */
function buildRegexFromKeywords(keywords, flags = 'i') {
    if (!keywords || keywords.size === 0) return /(?!)/; // 返回永不匹配的 Regex
    const pattern = Array.from(keywords, k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    return new RegExp(pattern, flags);
}

/**
 * [V37.0 重構] 集中初始化所有規則，並預編譯所有 Regex。
 */
function initializeRules() {
    // 脫逸萬用字元域名中的 `.`
    const escapedWildcardDomains = Array.from(CONFIG.API_WHITELIST_WILDCARDS, domain => domain.replace(/\./g, '\\.'));

    PRECOMPILED_REGEX = {
        CRITICAL_PATTERNS: buildRegexFromKeywords(CONFIG.CRITICAL_TRACKING_PATTERNS),
        PATH_BLOCK: buildRegexFromKeywords(CONFIG.PATH_BLOCK_KEYWORDS),
        PATH_ALLOW: buildRegexFromKeywords(CONFIG.PATH_ALLOW_PATTERNS),
        DROP_KEYWORDS: buildRegexFromKeywords(CONFIG.DROP_KEYWORDS),
        PATH_BLOCK_LITERALS: CONFIG.PATH_BLOCK_REGEX_LITERALS,
        // [V37.0 新增] 將參數前綴 Trie 遷移至 RegExp
        PARAM_PREFIXES: new RegExp(`^(${Array.from(CONFIG.TRACKING_PREFIXES).join('|')})`, 'i'),
        // [V37.0 新增] 將萬用字元白名單遷移至 RegExp
        API_WHITELIST_WILDCARDS: new RegExp(`(^|\\.)${escapedWildcardDomains.join('|')}$`, 'i'),
    };
}

// #################################################################################################
// #                                                                                               #
// #                             🚦 MAIN PROCESSING LOGIC                                          #
// #                                                                                               #
// #################################################################################################

/**
 * 輕量級 URL 解析器，避免為每個請求都建立完整的 URL 物件。
 * @param {string} urlString - 原始 URL 字串。
 * @returns {{hostname: string, pathname: string, search: string}|null}
 */
function lightParseUrl(urlString) {
    try {
        const pathStartIndex = urlString.indexOf('/', 8);
        if (pathStartIndex === -1) {
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
 * [V37.0 優化] 檢查主機名稱是否在 API 白名單中 (完全使用 RegExp)。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean}
 */
function isApiWhitelisted(hostname) {
    return CONFIG.API_WHITELIST_EXACT.has(hostname) || PRECOMPILED_REGEX.API_WHITELIST_WILDCARDS.test(hostname);
}

/**
 * 檢查主機名稱是否在域名黑名單中。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean}
 */
function isDomainBlocked(hostname) {
    const parts = hostname.split('.');
    for (let i = 0; i < parts.length; ++i) {
        if (CONFIG.BLOCK_DOMAINS.has(parts.slice(i).join('.'))) {
            return true;
        }
    }
    return false;
}

/**
 * [V37.0 優化] 清理 URL 中的追蹤參數 (使用 RegExp)。
 * @param {URL} urlObject - 完整的 URL 物件。
 * @returns {string|null} - 若有修改則返回新 URL 字串，否則返回 null。
 */
function getCleanedUrl(urlObject) {
    let paramsChanged = false;
    for (const key of [...urlObject.searchParams.keys()]) {
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(key.toLowerCase())) {
            continue;
        }
        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(key) || PRECOMPILED_REGEX.PARAM_PREFIXES.test(key)) {
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
 * [V37.0 重構] 處理單一請求的主函式，整合多層快取。
 * @param {object} request - Surge 的 $request 物件。
 * @returns {object|null}
 */
function processRequest(request) {
    try {
        if (!request || !request.url) return null;

        // --- 1. 全域 URL 快取檢查 (最高優先級) ---
        const cachedUrlDecision = globalUrlCache.get(request.url);
        if (cachedUrlDecision !== null) return cachedUrlDecision;

        // --- 2. 輕量級 URL 解析 ---
        const parsedUrl = lightParseUrl(request.url);
        if (!parsedUrl) return null;
        const { hostname, pathname, search } = parsedUrl;

        let finalDecision = null;

        // --- 3. 域名決策快取檢查 (第二優先級) ---
        let domainDecision = domainDecisionCache.get(hostname);
        if (!domainDecision) {
            if (isDomainBlocked(hostname)) {
                domainDecision = DOMAIN_DECISION.BLOCKED;
            } else if (isApiWhitelisted(hostname)) {
                domainDecision = DOMAIN_DECISION.API_WHITELISTED;
            } else {
                domainDecision = DOMAIN_DECISION.PASSTHROUGH;
            }
            domainDecisionCache.set(hostname, domainDecision);
        }

        // --- 4. 根據域名決策執行過濾邏輯 ---
        if (domainDecision === DOMAIN_DECISION.BLOCKED) {
            finalDecision = getBlockResponse(pathname.toLowerCase() + search.toLowerCase());
        } else if (domainDecision === DOMAIN_DECISION.PASSTHROUGH) {
            const lowerPathname = pathname.toLowerCase();
            const lowerFullPath = lowerPathname + search.toLowerCase();
            const scriptName = pathname.substring(pathname.lastIndexOf('/') + 1).toLowerCase();

            if (CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName) || PRECOMPILED_REGEX.CRITICAL_PATTERNS.test(lowerFullPath)) {
                finalDecision = getBlockResponse(lowerFullPath);
            } else if (PRECOMPILED_REGEX.PATH_BLOCK.test(lowerFullPath)) {
                if (!PRECOMPILED_REGEX.PATH_ALLOW.test(lowerFullPath)) {
                    finalDecision = getBlockResponse(lowerFullPath);
                }
            } else {
                for (const regex of PRECOMPILED_REGEX.PATH_BLOCK_LITERALS) {
                    if (regex.test(lowerPathname)) {
                        finalDecision = getBlockResponse(lowerFullPath);
                        break;
                    }
                }
            }
        }
        // 若 domainDecision 是 API_WHITELISTED 或未被攔截的 PASSTHROUGH，則 finalDecision 保持為 null

        // --- 5. 參數清理 (僅在未被攔截時執行) ---
        if (finalDecision === null) {
            const fullUrlObject = new URL(request.url); // 僅在此處實例化完整 URL 物件
            const cleanedUrl = getCleanedUrl(fullUrlObject);
            if (cleanedUrl) {
                finalDecision = REDIRECT_RESPONSE(cleanedUrl);
            }
        }

        // --- 6. 寫入全域 URL 快取並返回 ---
        globalUrlCache.set(request.url, finalDecision);
        return finalDecision;

    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v37] 處理錯誤: ${error.message}`, error);
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
                $done({ version: '37.0', status: 'ready', message: 'URL Filter v37.0 - Algorithm Acceleration & Multi-Layer Cache' });
            }
            return;
        }

        const result = processRequest($request);
        if (typeof $done !== 'undefined') { $done(result || {}); }

    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v37] 致命錯誤: ${error.message}`, error);
        }
        if (typeof $done !== 'undefined') { $done({}); }
    }
})();

// =================================================================================================
// ## 更新日誌 (V37.0)
// =================================================================================================
//
// ### 📅 更新日期: 2025-09-08
//
// ### ✨ V36.0 -> V37.0 變更 (演算法加速 & 多層快取):
//
// V37.0 是在 V36.0 高效能引擎基礎上的進一步架構演進，旨在透過更智慧的快取策略與極致的演算法優化，
// 將腳本的反應速度與資源效率提升至全新水平。
//
// 1.  **【快取策略升級】引入智慧型多層快取 (Multi-Layer Caching)**:
//     - **背景**: V36 的全域快取對重複的完整 URL 非常有效，但對於來自同一個域名下的不同 URL（例如：`example.com/page1` 和 `example.com/page2`），
//       每次仍需重新執行域名黑白名單的判斷。
//     - **優化**: 新增了一個輕量級的 `domainDecisionCache` (域名決策快取)。此快取專門儲存對 **主機名稱 (Hostname)** 的最終裁決結果
//       （例如：直接攔截、API 白名單放行、需進一步路徑分析）。
//     - **效益**: 當一個域名被分析過一次後，後續所有來自該域名的請求都能瞬間從域名快取中讀取裁決，**直接跳過 `isDomainBlocked` 和 `isApiWhitelisted` 的檢查**，
//       顯著縮短了高密度請求下的處理延遲，尤其在瀏覽包含大量資源的複雜網頁時效果更為顯著。
//
// 2.  **【演算法全面升級】遷移最後的自訂結構至原生引擎**:
//     - **背景**: V36 中仍保留了 `Trie` 結構用於匹配追蹤參數的前綴，以及使用迴圈來檢查萬用字元域名。
//     - **優化**:
//         - **參數匹配**: 將用於判斷 `utm_` 等追蹤參數前綴的 `Trie` 結構，預編譯成單一的 `RegExp` 物件 (`PARAM_PREFIXES`)。
//         - **白名單匹配**: 將 API 白名單中的萬用字元域名列表，同樣預編譯成單一、高效的 `RegExp` 物件 (`API_WHITELIST_WILDCARDS`)。
//     - **效益**: 此舉徹底移除了腳本中所有自訂的、基於純 JavaScript 的匹配演算法，將相關邏輯 **100% 遷移至底層 C++ 實現的原生正規表示式引擎**。
//       這不僅帶來了極致的匹配速度，也進一步降低了腳本的記憶體佔用，使整體架構更為簡潔與現代化。
//
// 3.  **【架構簡化】移除 `Trie` 類別**:
//     - 隨著參數前綴匹配邏輯的升級，`Trie` 類別已無用武之地，因此被完全移除。這使得核心引擎的程式碼更為精簡，減少了潛在的維護成本。
//
// ### 🏆 總結:
//
// V37.0 的核心是一次「由點到面」的效能革命。透過引入多層快取機制，優化從單一 URL 的快取擴展到了整個域名的決策快取，
// 實現了更宏觀的效能增益。同時，將所有匹配邏輯統一到原生引擎，完成了腳本的最後一塊效能拼圖。
// 這次更新確保了腳本在應對未來更複雜、更多變的網路追蹤技術時，依然能以巔峰狀態運行，提供最流暢、最無感的過濾保護。
