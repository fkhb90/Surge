/**
 * @file        URL-Ultimate-Filter-Surge-V32.2-Final.js
 * @version     32.2 (Validated Final)
 * @description V30 Trie 樹架構的最終優化版本。此版本新增了「組態完整性驗證」機制，
 * 旨在達到極致的性能、穩定性與長期可維護性的最終形態。
 * @author      Claude & Gemini & Acterus
 * @lastUpdated 2025-09-03
 */

// #################################################################################################
// #                                                                                               #
// #                                   ⚙️ SCRIPT CONFIGURATION                                    #
// #                       (使用者可在此區域安全地新增、修改或移除規則)                         #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
    /**
     * 🚫 域名攔截黑名單
     * 說明：直接攔截來自這些域名的所有請求。
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
        'clicky.com', 'statcounter.com', 'quantserve.com', 'comscore.com',
        // --- 主流廣告聯播網 & 平台 ---
        'adcolony.com', 'adroll.com', 'adsnative.com', 'bidswitch.net', 'casalemedia.com', 'conversantmedia.com',
        'media.net', 'soom.la', 'spotxchange.com', 'teads.tv', 'tremorhub.com', 'yieldmo.com', 'zemanta.com',
        'flashtalking.com', 'indexexchange.com', 'magnite.com', 'gumgum.com', 'inmobi.com', 'mopub.com',
        'sharethrough.com', 'smartadserver.com', 'applovin.com', 'ironsrc.com', 'unityads.unity3d.com', 'vungle.com',
        'appnexus.com', 'contextweb.com', 'spotx.tv', 'liveintent.com', 'narrative.io', 'neustar.biz', 'tapad.com',
        'thetradedesk.com', 'bluekai.com', 'amazon-adsystem.com', 'aax.amazon-adsystem.com', 'fls-na.amazon.com',
        'ib.adnxs.com', 'adserver.yahoo.com', 'ads.yahoo.com', 'analytics.yahoo.com', 'geo.yahoo.com',
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
        'onetrust.com', 'cookielaw.org', 'trustarc.com', 'sourcepoint.com',
        // --- 台灣地區 ---
        'clickforce.com.tw', 'tagtoo.co', 'urad.com.tw', 'cacafly.com', 'is-tracking.com', 'vpon.com',
        'ad-specs.guoshipartners.com', 'sitetag.us', 'imedia.com.tw', 'ad.ettoday.net', 'ad.pixnet.net',
        'ad.pchome.com.tw', 'ad.momo.com.tw', 'ad.xuite.net', 'ad.cna.com.tw', 'ad.cw.com.tw',
        'ad.hi-on.org', 'adm.chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com',
        'tenmax.io', 'aotter.net', 'funp.com', 'ad.ruten.com.tw', 'ad.books.com.tw', 'ad.etmall.com.tw',
        'ad.shopping.friday.tw', 'ad-hub.net', 'adgeek.net', 'ad.shopee.tw',
        // --- 中國大陸地區 ---
        'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn', 'hm.baidu.com',
        'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com', 'pingjs.qq.com', 'wspeed.qq.com',
        'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com', 'tanx.com', 'alimama.com', 'log.mmstat.com',
        'getui.com', 'jpush.cn', 'jiguang.cn', 'gridsum.com', 'admaster.com.cn', 'miaozhen.com',
        // --- 其他 ---
        'wcs.naver.net', 'adnx.com', 'rlcdn.com', 'revjet.com',
        'ads-api.tiktok.com', 'analytics.tiktok.com', 'tr.snapchat.com', 'sc-static.net', 'ads.pinterest.com',
        'log.pinterest.com', 'analytics.snapchat.com', 'ads-api.twitter.com', 'ads.youtube.com',
    ]),

    /**
     * ✅ API 功能性域名白名單 (完全比對)
     * 說明：白名單中的域名將被完全豁免，腳本不會對其進行任何處理。
     */
    API_WHITELIST_EXACT: new Set([
        // --- 主流服務 API & 登入 ---
        'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
        'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
        'api.github.com', 'api.openai.com', 'api.anthropic.com', 'a-api.anthropic.com', 'api.cohere.ai',
        'gemini.google.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
        // --- 開發 & 部署平台 ---
        'api.vercel.com', 'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
        'database.windows.net', 'auth.docker.io', 'login.docker.com', 'api.cloudflare.com', 'api.fastly.com',
        // --- 支付 & 金流 ---
        'api.stripe.com', 'api.paypal.com', 'api.adyen.com', 'api.braintreegateway.com',
        // --- 生產力 & 協作工具 ---
        'api.notion.com', 'api.figma.com', 'api.trello.com', 'api.asana.com', 'api.dropboxapi.com',
        // --- 第三方認證 & SSO ---
        'okta.com', 'auth0.com', 'sso.godaddy.com',
        // --- 其他常用 API ---
        'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', 'hooks.slack.com', 'api.pagerduty.com',
        'api.zende.sk', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
        // --- 台灣地區服務 & 銀行 ---
        'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
        'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
        'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
        'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
        'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com', 'cmapi.tw.coupang.com',
        // --- 其他 ---
        'duckduckgo.com', 'external-content.duckduckgo.com'
    ]),

    /**
     * ✅ API 功能性域名白名單 (萬用字元)
     * 說明：結尾為這些域名的主機將被豁免 (例如 a.youtube.com, b.youtube.com)。
     */
    API_WHITELIST_WILDCARDS: new Map([
        // --- 核心服務 & CDN ---
        ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true],
        ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true],
        ['update.microsoft.com', true], ['amazonaws.com', true], ['cloudfront.net', true], ['fastly.net', true],
        ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['unpkg.com', true],
        ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true], ['twimg.com', true],
        // --- 閱讀器 & 新聞 ---
        ['inoreader.com', true], ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true],
        ['itofoo.com', true],
        // --- 開發 & 部署平台 ---
        ['github.io', true], ['gitlab.io', true], ['windows.net', true], ['pages.dev', true], ['vercel.app', true],
        ['netlify.app', true], ['azurewebsites.net', true], ['cloudfunctions.net', true], ['oraclecloud.com', true],
        ['digitaloceanspaces.com', true], ['gravatar.com', true], ['githubusercontent', true],
        // --- 認證 ---
        ['okta.com', true], ['auth0.com', true], ['atlassian.net', true],
        // --- 台灣地區銀行 ---
        ['fubon.com', true], ['bot.com.tw', true], ['megabank.com.tw', true], ['firstbank.com.tw', true],
        ['hncb.com.tw', true], ['chb.com.tw', true], ['taishinbank.com.tw', true], ['sinopac.com', true],
        ['tcb-bank.com.tw', true], ['scsb.com.tw', true], ['standardchartered.com.tw', true],
        // --- 網頁存檔服務 ---
        ['web.archive.org', true], ['web-static.archive.org', true], ['archive.is', true], ['archive.today', true],
        ['archive.ph', true], ['archive.li', true], ['archive.vn', true], ['webcache.googleusercontent.com', true],
        ['cc.bingj.com', true], ['perma.cc', true], ['www.webarchive.org.uk', true], ['timetravel.mementoweb.org', true]
    ]),

    /**
     * 🚨 關鍵追蹤腳本攔截清單
     * 說明：直接根據檔名攔截已知的追蹤腳本。
     */
    CRITICAL_TRACKING_SCRIPTS: new Set([
        // --- Google ---
        'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js',
        // --- Facebook ---
        'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',
        // --- 通用 & 其他 ---
        'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js',
        'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js',
        'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js',
        'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js',
        'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js',
        'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js',
        'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js', 'wcslog.js', 'ads-beacon.js',
        'essb-core.min.js', 'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js',
        'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js', 'capture.js',
        'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js',
        'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js',
        'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js',
        'ad-player.js', 'ad-lib.js', 'ad-core.js'
    ]),

    /**
     * 🚨 關鍵追蹤路徑模式
     * 說明：攔截 URL 路徑中包含這些特徵模式的請求。
     */
    CRITICAL_TRACKING_PATTERNS: new Set([
        // --- Google ---
        '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/',
        'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', '/ads/ga-audiences',
        // --- Facebook ---
        'facebook.com/tr', 'facebook.com/tr/',
        // --- 通用 API 端點 ---
        '/collect?', '/track/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/',
        '/api/v1/track', '/intake', '/api/batch',
        // --- 主流服務端點 ---
        'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'px.ads.linkedin.com',
        'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track',
        'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', 'api-iam.intercom.io/messenger/web/events',
        'api.hubspot.com/events',
        // --- 社群分享外掛 ---
        '/plugins/easy-social-share-buttons/',
        // --- 中國大陸地區 ---
        'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
        // --- 其他 ---
        '/abtesting/', '/feature-flag/', '/user-profile/', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',
        '/v1/pixel', 'ads.tiktok.com/i1n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
        'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js', '/ad/v1/event',
        'ads.pinterest.com/v3/conversions/events', 'ad.360yield.com', '/ad-call', '/adx/', '/adsales/',
        '/adserver/', '/adsync/', '/adtech/',
    ]),

    /**
     * 🚫 路徑關鍵字黑名單
     * 說明：攔截路徑中包含這些通用廣告或追蹤關鍵字的請求。
     */
    PATH_BLOCK_KEYWORDS: new Set([
        // --- 廣告通用詞 ---
        '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/',
        '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/',
        'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'amp-ad', 'amp-analytics',
        'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'rtb', 'dsp', 'ssp',
        'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system',
        'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'ad-metrics', 'ad-events', 'ad-impression',
        'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'ad-break', 'ad_event', 'ad-inventory',
        'ad-specs', 'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network', 'ad-platform',
        'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-code', 'ad-script', 'ad-telemetry', '/adserve/',
        '/adserving/', '/adframe/', '/adrequest/', '/adretrieve/', '/getads/', '/getad/', '/fetch_ads/',
        // --- 追蹤 & 分析通用詞 ---
        '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/',
        '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/',
        '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/beacon/', '/pixel/', '/collect?',
        '/collector/', '/report/', '/reports/', '/reporting/',
        // --- 錯誤 & 效能監控 ---
        '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'web-vitals',
        'performance-tracking', 'real-user-monitoring',
        // --- 使用者行為 & 定向 ---
        'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint',
        'fingerprinting', 'third-party-cookie', 'user-cohort', 'attribution', 'retargeting', 'audience',
        'cohort', 'user-segment', 'user-behavior', 'session-replay',
        // --- 第三方服務名稱 ---
        'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano',
        'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'utag.js',
        // --- 其他 ---
        'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'privacy-policy', 'cookie-consent'
    ]),

    /**
     * ✅ 路徑關鍵字白名單
     * 說明：即使路徑符合黑名單，但若同時包含此處的豁免關鍵字，則不會被攔截。
     */
    PATH_ALLOW_PATTERNS: new Set([
        // --- 框架 & 套件常用檔 ---
        'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
        'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs',
        // --- 網站基礎設施 ---
        'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile',
        'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment',
        'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document',
        'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription',
        'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries',
        'items', 'posts', 'articles', 'sources', 'categories',
        // --- 其他通用詞 ---
        'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css',
        'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient',
        'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js',
        'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe',
        'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/',
        'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config',
        'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---'
    ]),

    /**
     * 💧 直接拋棄請求 (DROP) 的關鍵字
     * 說明：符合攔截條件的請求中，若路徑再包含此處的關鍵字，將直接拋棄 (DROP) 而非拒絕 (REJECT)。
     */
    DROP_KEYWORDS: new Set([
        'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector',
        'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest',
        'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event',
        'server-event', 'heartbeat', 'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action',
        'stacktrace', 'csp-report', 'profiler', 'trace.json', 'usage.log'
    ]),

    /**
     * 🗑️ 全域追蹤參數黑名單
     */
    GLOBAL_TRACKING_PARAMS: new Set([
        // --- UTM 家族 ---
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
        'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
        // --- Google ---
        'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au',
        // --- Microsoft / Bing ---
        'msclkid', 'msad', 'mscampaignid', 'msadgroupid',
        // --- Facebook / Meta ---
        'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh',
        'x-threads-app-object-id', 'mibextid',
        // --- 其他主流平台 ---
        'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok',
        // --- 聯盟行銷 & 點擊 ID ---
        'zanpid', 'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id', 'customid',
        'click_id', 'clickid', 'offer_id', 'promo_code', 'coupon_code', 'deal_id', 'rb_clickid', 's_kwcid', 'ef_id',
        // --- 通用 & 其他 ---
        'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content',
        'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source',
        'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token',
        'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id',
        'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'traceid', 'request_id',
        '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad',
        'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map',
        'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'epik', 'piwik_campaign',
        'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id',
        'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search',
        'from_promo', 'camid', 'cupid', 'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', 'union_id', 'biz', 'mid', 'idx',
        // --- 廣告參數 ---
        'ad_id', 'adgroup_id', 'campaign_id', 'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel',
        'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms',
        'creative', 'adset', 'ad', 'pixel_id', 'event_id',
        // --- 搜尋 & 其他 ---
        'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position',
        // --- Google Analytics (Legacy) ---
        '_ga', '_gid', '_gat', '__gads', '__gac'
    ]),
    
    /**
     * 追蹤參數前綴集合
     */
    TRACKING_PREFIXES: new Set(['utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_', 'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_', 'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_', 'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_']),

    /**
     * ✅ 必要參數白名單
     * 說明：確保這些功能性參數不會被錯誤地清除。
     */
    PARAMS_TO_KEEP_WHITELIST: new Set([
        't',        // 保護 '?t=...' 時間戳 (快取破壞者)，防止網頁內容更新失敗
        'v',        // 保護 '?v=...' 版本號 (快取破壞者)，確保資源正確載入
        'targetid'  // 保護 Atlassian 服務 (如 Jira) 所需的目標 ID
    ]),

    /**
     * 🚫 基於正規表示式的路徑黑名單
     * 說明：用於攔截無法用簡單關鍵字描述的複雜路徑模式。
     */
    PATH_BLOCK_REGEX: [
        /^\/[a-z0-9]{12,}\.js$/i // 攔截根目錄下由12位以上隨機英數字組成的.js檔 (不分大小寫)
    ],
};

// #################################################################################################
// #                                                                                               #
// #                                🚀 CORE ENGINE (DO NOT MODIFY)                                 #
// #                           (腳本核心引擎，非專業人士請勿修改此區域)                        #
// #                                                                                               #
// #################################################################################################

/**
 * Trie (字典樹) 類別，用於高效的前綴與關鍵字匹配。
 */
class Trie {
    constructor() { this.root = {}; }
    insert(word) { let node = this.root; for (const char of word) { node = node[char] = node[char] || {}; } node.isEndOfWord = true; }
    startsWith(prefix) { let node = this.root; for (const char of prefix) { if (!node[char]) return false; node = node[char]; if (node.isEndOfWord) return true; } return false; }
    contains(text) { for (let i = 0; i < text.length; i++) { let node = this.root; for (let j = i; j < text.length; j++) { const char = text[j]; if (!node[char]) break; node = node[char]; if (node.isEndOfWord) return true; } } return false; }
}

/**
 * LRU (最近最少使用) 快取類別，用於快取計算結果，提升重複請求的處理速度。
 */
class LRUCache {
    constructor(maxSize = 500) { this.maxSize = maxSize; this.cache = new Map(); }
    get(key) { if (!this.cache.has(key)) return null; const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; }
    set(key, value) { if (this.cache.has(key)) this.cache.delete(key); else if (this.cache.size >= this.maxSize) { this.cache.delete(this.cache.keys().next().value); } this.cache.set(key, value); }
}

// --- 初始化核心組件 ---
const cache = new LRUCache();
const TRIES = {
    prefix: new Trie(),
    criticalPattern: new Trie(),
    pathBlock: new Trie(),
    allow: new Trie(),
    drop: new Trie(),
};

/**
 * 集中初始化所有 Trie 樹，提升穩定性。
 */
function initializeTries() {
    CONFIG.TRACKING_PREFIXES.forEach(p => TRIES.prefix.insert(p.toLowerCase()));
    CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => TRIES.criticalPattern.insert(p.toLowerCase()));
    CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => TRIES.pathBlock.insert(p.toLowerCase()));
    CONFIG.PATH_ALLOW_PATTERNS.forEach(p => TRIES.allow.insert(p.toLowerCase()));
    CONFIG.DROP_KEYWORDS.forEach(p => TRIES.drop.insert(p.toLowerCase()));
}

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', 'jpg', 'jpeg', 'webp', '.ico']);
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } }});
const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };

/**
 * 效能統計類別。
 */
class PerformanceStats {
    constructor() { this.stats = { totalRequests: 0, blockedRequests: 0, criticalTrackingBlocked: 0, domainBlocked: 0, pathBlocked: 0, regexPathBlocked: 0, paramsCleaned: 0, whitelistHits: 0, errors: 0 }; }
    increment(type) { if (this.stats.hasOwnProperty(type)) this.stats[type]++; }
}
const performanceStats = new PerformanceStats();


// #################################################################################################
// #                                                                                               #
// #                                🚦 MAIN PROCESSING LOGIC                                      #
// #                                                                                               #
// #################################################################################################

/**
 * [新增] 執行組態完整性驗證。
 * @returns {boolean} - 組態是否有效。
 */
function validateConfig() {
    let isValid = true;
    for (const item of CONFIG.API_WHITELIST_EXACT) {
        if (item.includes('*')) {
            console.error(`[組態錯誤] API_WHITELIST_EXACT 中發現萬用字元: "${item}"。此列表僅支援完全比對。`);
            isValid = false;
        }
    }
    return isValid;
}

/**
 * 檢查請求是否為關鍵追蹤腳本。
 * @param {string} lowerFullPath - 已轉換為小寫的完整 URL 路徑 (含查詢參數)。
 * @returns {boolean} - 是否為關鍵追蹤腳本。
 */
function isCriticalTrackingScript(lowerFullPath) {
    const cacheKey = `critical:${lowerFullPath}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== null) return cachedResult;

    const pathOnly = lowerFullPath.split('?')[0];
    const scriptName = pathOnly.substring(pathOnly.lastIndexOf('/') + 1);

    let isBlocked = false;
    if (scriptName) {
        isBlocked = CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName);
    }
    if (!isBlocked) {
        isBlocked = TRIES.criticalPattern.contains(lowerFullPath);
    }

    cache.set(cacheKey, isBlocked);
    return isBlocked;
}

/**
 * 檢查主機名稱是否在 API 白名單中。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean} - 是否在白名單內。
 */
function isApiWhitelisted(hostname) {
    const cacheKey = `wl:${hostname}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== null) return cachedResult;
    
    let result = false;
    if (CONFIG.API_WHITELIST_EXACT.has(hostname)) {
        result = true;
    } else {
        for (const [domain] of CONFIG.API_WHITELIST_WILDCARDS) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
                result = true;
                break;
            }
        }
    }
    cache.set(cacheKey, result);
    return result;
}

/**
 * 檢查主機名稱是否在域名黑名單中 (支援子域名)。
 * @param {string} hostname - 已轉換為小寫的主機名稱。
 * @returns {boolean} - 是否被攔截。
 */
function isDomainBlocked(hostname) {
    const cacheKey = `bl:${hostname}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== null) return cachedResult;

    let result = false;
    let currentDomain = hostname;
    while (currentDomain) {
        if (CONFIG.BLOCK_DOMAINS.has(currentDomain)) {
            result = true;
            break;
        }
        const dotIndex = currentDomain.indexOf('.');
        if (dotIndex === -1) break;
        currentDomain = currentDomain.substring(dotIndex + 1);
    }
    cache.set(cacheKey, result);
    return result;
}

/**
 * 檢查路徑是否包含黑名單關鍵字。
 * @param {string} lowerFullPath - 已轉換為小寫的完整 URL 路徑。
 * @returns {boolean} - 是否被攔截。
 */
function isPathBlocked(lowerFullPath) {
    const cacheKey = `path:${lowerFullPath}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== null) return cachedResult;
    
    let result = false;
    if (TRIES.pathBlock.contains(lowerFullPath)) {
        if (!TRIES.allow.contains(lowerFullPath)) {
            result = true;
        }
    }
    cache.set(cacheKey, result);
    return result;
}

/**
 * 檢查路徑是否符合 Regex 黑名單規則。
 * @param {string} lowerPathnameOnly - 已轉換為小寫且不含查詢參數的路徑。
 * @returns {boolean} - 是否被攔截。
 */
function isPathBlockedByRegex(lowerPathnameOnly) {
    const cacheKey = `regex:${lowerPathnameOnly}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult !== null) return cachedResult;
    
    for (const regex of CONFIG.PATH_BLOCK_REGEX) {
        if (regex.test(lowerPathnameOnly)) {
            cache.set(cacheKey, true);
            return true;
        }
    }
    cache.set(cacheKey, false);
    return false;
}

/**
 * 清理 URL 中的追蹤參數，同時尊重白名單。
 * @param {URL} url - URL 物件。
 * @returns {boolean} - 參數是否被修改。
 */
function cleanTrackingParams(url) {
    let paramsChanged = false;
    for (const key of [...url.searchParams.keys()]) {
        const lowerKey = key.toLowerCase();
        
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) {
            continue;
        }

        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || TRIES.prefix.startsWith(lowerKey)) {
            url.searchParams.delete(key);
            paramsChanged = true;
        }
    }
    return paramsChanged;
}

/**
 * 根據請求路徑，決定適當的攔截回應。
 * @param {string} originalFullPath - 原始的完整 URL 路徑 (含查詢參數，區分大小寫)。
 * @returns {object} - Surge 回應物件。
 */
function getBlockResponse(originalFullPath) {
    const lowerFullPath = originalFullPath.toLowerCase();
    if (TRIES.drop.contains(lowerFullPath)) {
        return DROP_RESPONSE;
    }
    const pathOnly = originalFullPath.split('?')[0];
    const ext = pathOnly.substring(pathOnly.lastIndexOf('.'));
    if (IMAGE_EXTENSIONS.has(ext.toLowerCase())) {
        return TINY_GIF_RESPONSE;
    }
    return REJECT_RESPONSE;
}

/**
 * 處理單一請求的主函式。
 * @param {object} request - Surge 的 $request 物件。
 * @returns {object|null} - 若需攔截或修改，則回傳 Surge 回應物件；否則回傳 null。
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
        const originalFullPath = url.pathname + url.search;
        const lowerPathnameOnly = url.pathname.toLowerCase();
        const lowerFullPath = originalFullPath.toLowerCase();

        // --- 過濾邏輯 (依攔截效率與精準度排序) ---
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            return null;
        }

        if (isCriticalTrackingScript(lowerFullPath)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }

        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }

        if (isPathBlocked(lowerFullPath)) {
            performanceStats.increment('pathBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }

        if (isPathBlockedByRegex(lowerPathnameOnly)) {
            performanceStats.increment('regexPathBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }

        if (cleanTrackingParams(url)) {
            performanceStats.increment('paramsCleaned');
            return REDIRECT_RESPONSE(url.toString());
        }

        return null; // 請求安全，不做任何處理
    } catch (error) {
        performanceStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v32] 處理錯誤: ${error.message}`, error);
        }
        return null;
    }
}


// #################################################################################################
// #                                                                                               #
// #                                       🎬 EXECUTION                                          #
// #                                                                                               #
// #################################################################################################

(function() {
    try {
        initializeTries(); // 執行 Trie 樹初始化
        validateConfig(); // 執行組態完整性驗證
        
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ version: '32.2', status: 'ready', message: 'URL Filter v32.2 - Validated Final' });
            }
            return;
        }
        const result = processRequest($request);
        if (typeof $done !== 'undefined') { $done(result || {}); }
    } catch (error) {
        performanceStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[URL-Filter-v32] 致命錯誤: ${error.message}`, error);
        }
        if (typeof $done !== 'undefined') { $done({}); }
    }
})();

// =================================================================================================
// ## 更新日誌 (V32.2)
// =================================================================================================
//
// ### 📅 更新日期: 2025-09-03
//
// ### ✨ V32.1 -> V32.2 變更 (品質強化):
//
// 1.  **【新增】組態完整性驗證**:
//     - 新增 `validateConfig` 函式，用於在腳本啟動時，自動掃描 `API_WHITELIST_EXACT` 等設定，
//       確保其中不包含萬用字元等不符合規範的內容，從源頭預防因組態錯誤導致的潛在問題。
//
// ### ✨ V32.0 -> V32.1 變更回顧 (Hotfix):
//
// 1.  **【核心錯誤修正】規則載入失敗**:
//     - 修正了 V32.0 中因 `CONFIG` 物件遺漏 `TRACKING_PREFIXES` 列表，而導致腳本初始化失敗、
//       所有黑名單規則不生效的嚴重錯誤。
// 2.  **【架構強化】重構初始化機制**:
//     - 新增了 `initializeTries` 函式，將所有 Trie 樹的初始化過程集中管理，使程式碼結構更穩健。
//
// ### 🏆 總結:
//
// V32.2 (基於 V30) 是此腳本演進的頂點。它不僅解決了功能有無的問題，更從根本的演算法、程式碼結構
// 與自動化驗證層面，解決了「效率」、「未來適應性」與「長期可維護性」的問題，是在手機 Surge 環境下，
// 兼具正確性、極致性能與可持續發展的最終解決方案。
