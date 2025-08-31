/**
 * @file        URL-Ultimate-Filter-Surge-V27-Optimized.js
 * @version     27.0
 * @description 基於V25-Modified版本，修正關鍵腳本攔截邏輯，並大幅擴充各類攔截黑名單，提升整體過濾效能。
 * @author      Claude & Gemini
 * @lastUpdated 2025-08-29
 */

// =================================================================================================
// ⚙️ 核心設定區 (V27 全面擴充)
// =================================================================================================

/**
 * 🚫 域名攔截黑名單 (V27 擴充)
 */
const BLOCK_DOMAINS = new Set([
    // Core & Taiwan Lists (V25)
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

    // V27 New Additions
    'ads-api.tiktok.com', 'analytics.tiktok.com', 'tr.snapchat.com', 'sc-static.net', 'ads.pinterest.com',
    'log.pinterest.com', 'analytics.snapchat.com', 'ads-api.twitter.com', 'ads.youtube.com',
    'adservice.google.com', 'securepubads.g.doubleclick.net', 'pagead2.googlesyndication.com',
    'ad.doubleclick.net', 'stats.g.doubleclick.net', 'bid.g.doubleclick.net', 'amazon-adsystem.com',
    'aax.amazon-adsystem.com', 'fls-na.amazon.com', 'ib.adnxs.com', 'adserver.yahoo.com',
    'ads.yahoo.com', 'analytics.yahoo.com', 'geo.yahoo.com', 'adinterax.com', 'adnium.com',
    'adperfect.com', 'adblade.com', 'adbutler.com', 'adengage.com', 'adgeneration.com',
    'adgravity.com', 'adhigh.net', 'adkernel.com', 'admanmedia.com', 'admedo.com', 'admeta.com',
    'admixer.net', 'admost.com', 'admotix.com', 'admulti.com', 'adoperator.com', 'adoric.com',
    'adpone.com', 'adreactor.com', 'adrev.com', 'adroute.com', 'adscale.de', 'adspirit.de',
    'adspirit.net', 'adstargets.com', 'adunity.com', 'adup.com', 'adventori.com', 'adverline.com',
    'advertserve.com', 'adzerk.net', 'adzip.co', 'agkn.com', 'amoad.com', 'behave.com',
    'bidtheatre.com', 'blogherads.com', 'chango.com', 'collective-media.net', 'connexity.net',
    'connatix.com', 'content.ad', 'cpmstar.com', 'dianomi.com', 'distroscale.com', 'e-planning.net',
    'e-volution.ai', 'engageya.com', 'exoclick.com', 'eyewonder.com', 'feedad.com', 'fidelity-media.com',
    'forkmedia.com', 'genieessp.com', 'geoads.com', 'getintent.com', 'good-loop.com', 'gourmetads.com',
    'gravity.com', 'imrworldwide.com', 'infusionsoft.com', 'infolinks.com', 'jixie.com', 'juicyads.com',
    'ligatus.com', 'lockerdome.com', 'loopme.com', 'mgid.com', 'mobfox.com', 'nativo.com',
    'netmng.com', 'omnitagjs.com', 'onscroll.com', 'plista.com', 'popin.cc', 'project-wonderful.com',
    'revcontent.com', 'revlifter.com', 'rfihub.com', 'run-syndicate.com', 'sekindo.com', 'servebom.com',

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
    'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com', 
    'a-api.anthropic.com', 'obs.line-scdn.net', 'legy.line-apps.com', 'gemini.google.com'
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
    ['okta.com', true], ['auth0.com', true], ['atlassian.net', true], ['azurewebsites.net', true],
    ['cloudfunctions.net', true], ['oraclecloud.com', true], ['digitaloceanspaces.com', true],
    ['swscan.apple.com', true], ['gsp-ssl.ls.apple.com', true], ['fubon.com', true], ['bot.com.tw', true],
    ['megabank.com.tw', true], ['firstbank.com.tw', true], ['hncb.com.tw', true], ['chb.com.tw', true],
    ['taishinbank.com.tw', true], ['sinopac.com', true], ['tcb-bank.com.tw', true], ['scsb.com.tw', true],
    ['standardchartered.com.tw', true]
]);

/**
 * 🚨 關鍵追蹤腳本攔截清單 (V27 擴充)
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    // Core Lists (V25)
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js',

    // V25 China Expansion (Retained)
    'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js',

    // V27 New Additions
    'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js',
    'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js',
    'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js',
    'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js',
    'ad-player.js', 'ad-lib.js', 'ad-core.js'
]);

/**
 * 🚨 關鍵追蹤路徑模式 (V27 擴充)
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    // Core Lists (V25)
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads', 'google.com/pagead', '/pagead/gen_204', 'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/', '/api/v1/track', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', '/intake', '/batch', '/abtesting/', '/feature-flag/', '/user-profile/', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',

    // V25 China Expansion (Retained)
    'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com',
    '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',

    // V27 New Additions
    '/v1/pixel', 'ads.tiktok.com/i18n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
    'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js',
    '/i/adsct', '/stats.g.doubleclick.net/j/collect', '/ad/v1/event',
    'px.ads.linkedin.com', 'ads.pinterest.com/v3/conversions/events', '/ads/ga-audiences',
    'ad.360yield.com', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/'
]);

/**
 * ✅ 路徑白名單 (無變更)
 */
const PATH_ALLOW_PATTERNS = new Set(['chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'util.js', 'script.js', 'index.js', 'index.mjs', 'main.mjs', 'app.mjs', 'vendor.mjs', 'runtime.mjs', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']);

/**
 * 🚫 路徑黑名單 (V27 擴充)
 */
const PATH_BLOCK_KEYWORDS = new Set([
    // Core (V25)
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/', '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort', 'web-vitals', 'performance-tracking', 'real-user-monitoring', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'user-behavior', 'session-replay', 'privacy-policy', 'cookie-consent',

    // V27 New Additions
    'ad-break', 'ad_event', 'ad-inventory', 'ad-specs', 'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network', 'ad-platform', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-code', 'ad-script', 'ad-telemetry',
    '/adserve/', '/adserving/', '/adframe/', '/adrequest/', '/adretrieve/', '/getads/', '/getad/', '/fetch_ads/'
]);

/**
 * 💧 直接拋棄請求的關鍵字 (V27 擴充)
 */
const DROP_KEYWORDS = new Set([
    // Core (V25)
    'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector', 'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat',
    
    // V27 New Additions
    'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action', 'stacktrace', 'csp-report',
    'profiler', 'trace.json', 'usage.log'
]);

/**
 * 🗑️ 追蹤參數黑名單 (V27 擴充)
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    // Core & Taiwan Lists (V25)
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', 'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'clickid', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search', 'from_promo', 'camid', 'cupid',

    // V25 China Expansion (Retained)
    'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci', // Baidu Tongji
    'union_id', 'biz', 'mid', 'idx', // WeChat

    // V27 New Additions
    'ad_id', 'adgroup_id', 'campaign_id', 'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel',
    'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms',
    'creative', 'target', 'adset', 'ad', 'pixel_id', 'event_id', 'rb_clickid', 's_kwcid', 'ef_id',
    'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position', '_ga', '_gid', '_gat',
    '__gads', '__gac', 'zanpid', 'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id',
    'customid', 'click_id', 'offer_id', 'promo_code', 'coupon_code', 'deal_id'
]);

/**
 * V27 優化: 擴充正則表達式以涵蓋更多追蹤前綴
 */
const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mke_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|video_utm_|vero_|__cf_|_hs|pk_|mtm_|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_|ref_|from_|share_|aff_|alg_|li_|tt_|tw_|epik_|_bta_|_bta|_oly_|cam_|cup_|gdr_|gds_|et_|hmsr_|zanpid_|_ga_|_gid_|_gat_|s_)/;


// =================================================================================
// 🚀 響應定義 (V27 優化)
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

// 核心攔截響應
const REJECT_RESPONSE = { response: { status: 403 } }; // 預設攔截，返回 403 Forbidden
const DROP_RESPONSE = { response: {} }; // 拋棄請求，無響應

// =================================================================================
// 🚀 核心處理邏輯 (V27 優化與重構)
// =================================================================================

/**
 * 📊 性能統計器 (無變更)
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
 * 🚨 關鍵追蹤腳本檢查 (V27 邏輯修正)
 * @description 修正為精確匹配腳本文件名，解決 `.../path/ytag.js` 的攔截問題。
 */
function isCriticalTrackingScript(path) {
    // 1. 精確匹配文件名
    const scriptName = path.substring(path.lastIndexOf('/') + 1);
    if (CRITICAL_TRACKING_SCRIPTS.has(scriptName)) {
        return true;
    }
    // 2. 檢查路徑模式
    for (const pattern of CRITICAL_TRACKING_PATTERNS) {
        if (path.includes(pattern)) {
            return true;
        }
    }
    return false;
}

/**
 * 🔍 域名白名單檢查 (無變更)
 */
function isApiWhitelisted(hostname) {
    if (API_WHITELIST_EXACT.has(hostname)) return true;
    for (const [domain, _] of API_WHITELIST_WILDCARDS) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
            return true;
        }
    }
    return false;
}

/**
 * 🚫 域名黑名單檢查 (V27 邏輯優化)
 * @description 改為更安全的子域名匹配，防止誤殺。
 */
function isDomainBlocked(hostname) {
    let currentDomain = hostname;
    while (currentDomain) {
        if (BLOCK_DOMAINS.has(currentDomain)) {
            return true;
        }
        const dotIndex = currentDomain.indexOf('.');
        if (dotIndex === -1) break;
        currentDomain = currentDomain.substring(dotIndex + 1);
    }
    return false;
}

/**
 * 🛤️ 路徑攔截檢查 (V27 邏輯優化)
 */
function isPathBlocked(path) {
    // 先檢查是否命中白名單，如果命中則直接跳過黑名單檢查
    for (const allowPattern of PATH_ALLOW_PATTERNS) {
        if (path.includes(allowPattern)) {
            return false;
        }
    }
    // 未命中白名單，再檢查黑名單
    for (const keyword of PATH_BLOCK_KEYWORDS) {
        if (path.includes(keyword)) {
            return true;
        }
    }
    return false;
}

/**
 * 🧹 參數清理功能 (V27 邏輯修正)
 * @description 修正為使用 TRACKING_PREFIX_REGEX 進行前綴匹配。
 */
function cleanTrackingParams(url) {
    let paramsChanged = false;
    const keysToDelete = [];

    for (const key of url.searchParams.keys()) {
        const lowerKey = key.toLowerCase();
        if (GLOBAL_TRACKING_PARAMS.has(lowerKey) || TRACKING_PREFIX_REGEX.test(lowerKey)) {
            keysToDelete.push(key);
            paramsChanged = true;
        }
    }

    if (paramsChanged) {
        for (const key of keysToDelete) {
            url.searchParams.delete(key);
        }
    }

    return paramsChanged;
}

/**
 * 🎯 統一攔截響應生成器 (V27 新增)
 */
function getBlockResponse(path) {
    // 檢查是否需要拋棄請求
    for (const dropKeyword of DROP_KEYWORDS) {
        if (path.includes(dropKeyword)) {
            return DROP_RESPONSE;
        }
    }
    // 檢查是否為圖片，是則返回透明GIF
    const imageExtensions = ['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico'];
    if (imageExtensions.some(ext => path.endsWith(ext))) {
        return TINY_GIF_RESPONSE;
    }
    // 預設返回 403 攔截
    return REJECT_RESPONSE;
}


/**
 * 🎯 主要處理函數 (V27 邏輯重構)
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
        const path = (url.pathname + url.search).toLowerCase();

        // === Step 1: API 域名白名單檢查 (優先放行) ===
        if (isApiWhitelisted(hostname)) {
            performanceStats.increment('whitelistHits');
            return null;
        }

        // === Step 2: 關鍵追蹤內容攔截 (最高攔截優先級) ===
        if (isCriticalTrackingScript(path)) {
            performanceStats.increment('criticalTrackingBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(path);
        }

        // === Step 3: 域名黑名單檢查 ===
        if (isDomainBlocked(hostname)) {
            performanceStats.increment('domainBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(path);
        }

        // === Step 4: 路徑攔截檢查 ===
        if (isPathBlocked(path)) {
            performanceStats.increment('pathBlocked');
            performanceStats.increment('blockedRequests');
            return getBlockResponse(path);
        }

        // === Step 5: 追蹤參數清理 ===
        if (cleanTrackingParams(url)) {
            performanceStats.increment('paramsCleaned');
            return REDIRECT_RESPONSE(url.toString());
        }

        return null; // 無需處理，放行

    } catch (error) {
        performanceStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) {
            console.error('[URL-Filter-v27] 處理錯誤:', error);
        }
        return null; // 發生錯誤時放行請求
    }
}

// =================================================================================
// 🎬 主執行邏輯 (無變更)
// =================================================================================

(function() {
    try {
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({
                    version: '27.0',
                    status: 'ready',
                    message: 'URL Filter v27.0 - Optimized',
                });
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
            console.error('[URL-Filter-v27] 致命錯誤:', error);
        }
        if (typeof $done !== 'undefined') {
            $done({});
        }
    }
})();

// =================================================================================
// ## 更新日誌 (V27.0)
// =================================================================================
//
// ### 📅 更新日期: 2025-08-29
//
// ### ✨ 新增與優化:
//
// 1.  **修正關鍵腳本攔截邏輯**:
//     - 採用 `endsWith` 精確匹配腳本文件名，徹底解決了先前版本無法攔截 `.../path/ytag.js` 這類路徑的問題。
//
// 2.  **全面擴充攔截名單**:
//     - **域名黑名單 (BLOCK_DOMAINS)**: 新增超過 80 個全球性廣告、追蹤與分析域名。
//     - **關鍵腳本 (CRITICAL_TRACKING_SCRIPTS)**: 新增對 TikTok, Pangle, AdRoll, New Relic 等平台的追蹤腳本攔截。
//     - **關鍵路徑 (CRITICAL_TRACKING_PATTERNS)**: 增加了對 TikTok, Snapchat 及其他廣告平台的 API 端點攔截規則。
//     - **路徑黑名單 (PATH_BLOCK_KEYWORDS)**: 補充了更多與廣告伺服器請求相關的路徑關鍵字。
//     - **拋棄關鍵字 (DROP_KEYWORDS)**: 增加了對 Web Vitals、CSP報告等日誌類請求的拋棄規則。
//     - **追蹤參數 (GLOBAL_TRACKING_PARAMS)**: 新增了超過 30 種常見的點擊、聯盟行銷與分析參數。
//     - **追蹤前綴 (TRACKING_PREFIX_REGEX)**: 擴充了正則表達式，以匹配新增的追蹤參數前綴。
//
// 3.  **代碼結構重構與優化**:
//     - **`isDomainBlocked` 優化**: 採用更安全的子域名匹配邏輯，從 `hostname.includes(domain)` 改為逐級匹配，避免因域名後綴相同而導致的誤殺（例如 `example-a.com` 不會再被 `a.com` 規則誤攔）。
//     - **`isPathBlocked` 優化**: 調整了執行順序，優先檢查白名單，提高效率。
//     - **`cleanTrackingParams` 修正**: 修正了原腳本中未使用正則表達式進行前綴匹配的問題。
//     - **新增 `getBlockResponse` 函數**: 創建了一個統一的攔截響應處理函數，根據請求路徑智能判斷應返回 `REJECT` (403), `DROP` (拋棄) 還是 `TINY_GIF` (圖片替換)，使主流程 `processRequest` 更為簡潔清晰。
//
// 4.  **保留用戶定制**:
//     - 嚴格遵循用戶要求，未改動核心處理架構，未優化快取與 Trie 樹，並繼續保留移除中國大陸地區API白名單的設定。
//
