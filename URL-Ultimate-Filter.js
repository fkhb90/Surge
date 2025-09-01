/**
 * @file        URL-Ultimate-Filter-Surge-V31-Final.js
 * @version     31.0 (Final Version)
 * @description V30 Trie 樹架構的最終呈現版本。完整展示所有規則清單，並在末尾附有詳細的 V29-V30 更新日誌。
 * 此版本融合了 Trie 樹的高效查找、LRU 快取和清晰的程式碼結構，是兼具極致性能與可維護性的最終形態。
 * @author      Claude & Gemini
 * @lastUpdated 2025-09-01
 */

// =================================================================================================
// ⚙️ 核心設定區 (完整清單內容)
// =================================================================================================

/**
 * 🚫 域名攔截黑名單
 */
const BLOCK_DOMAINS = new Set([
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
    'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn',
    'hm.baidu.com', 'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com',
    'pingjs.qq.com', 'wspeed.qq.com', 'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com',
    'tanx.com', 'alimama.com', 'log.mmstat.com',
    'getui.com', 'jpush.cn', 'jiguang.cn',
    'gridsum.com', 'admaster.com.cn', 'miaozhen.com',
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
 * ✅ API 功能性域名白名單
 */
const API_WHITELIST_EXACT = new Set([
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
    'a-api.anthropic.com', 'obs.line-scdn.net', 'legy.line-apps.com', 'gemini.google.com',
    'cmapi.tw.coupang.com'
]);

const API_WHITELIST_WILDCARDS = new Map([
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
 * 🚨 關鍵追蹤腳本攔截清單
 */
const CRITICAL_TRACKING_SCRIPTS = new Set([
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js',
    'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js',
    'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js',
    'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js',
    'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js',
    'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js',
    'ad-player.js', 'ad-lib.js', 'ad-core.js'
]);

/**
 * 🚨 關鍵追蹤路徑模式
 */
const CRITICAL_TRACKING_PATTERNS = new Set([
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads', 'google.com/pagead', '/pagead/gen_204', 'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/', '/api/v1/track', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', '/intake', '/batch', '/abtesting/', '/feature-flag/', '/user-profile/', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',
    'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com',
    '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
    '/v1/pixel', 'ads.tiktok.com/i18n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
    'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js',
    '/i/adsct', '/stats.g.doubleclick.net/j/collect', '/ad/v1/event',
    'px.ads.linkedin.com', 'ads.pinterest.com/v3/conversions/events', '/ads/ga-audiences',
    'ad.360yield.com', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/'
]);

/**
 * ✅ 路徑白名單
 */
const PATH_ALLOW_PATTERNS = new Set(['chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'util.js', 'script.js', 'index.js', 'index.mjs', 'main.mjs', 'app.mjs', 'vendor.mjs', 'runtime.mjs', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']);

/**
 * 🚫 路徑黑名單
 */
const PATH_BLOCK_KEYWORDS = new Set([
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/', '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort', 'web-vitals', 'performance-tracking', 'real-user-monitoring', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'user-behavior', 'session-replay', 'privacy-policy', 'cookie-consent',
    'ad-break', 'ad_event', 'ad-inventory', 'ad-specs', 'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network', 'ad-platform', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-code', 'ad-script', 'ad-telemetry',
    '/adserve/', '/adserving/', '/adframe/', '/adrequest/', '/adretrieve/', '/getads/', '/getad/', '/fetch_ads/'
]);

/**
 * 💧 直接拋棄請求的關鍵字
 */
const DROP_KEYWORDS = new Set([
    'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector', 'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat',
    'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action', 'stacktrace', 'csp-report',
    'profiler', 'trace.json', 'usage.log'
]);

/**
 * 🗑️ 追蹤參數黑名單
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', 'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'mc_cid', 'mc_eid', 'mkt_tok', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium', 'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'clickid', 'traceid', 'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id', 'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad', 'from_search', 'from_promo', 'camid', 'cupid',
    'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci',
    'union_id', 'biz', 'mid', 'idx',
    'ad_id', 'adgroup_id', 'campaign_id', 'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel',
    'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms',
    'creative', 'target', 'adset', 'ad', 'pixel_id', 'event_id', 'rb_clickid', 's_kwcid', 'ef_id',
    'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position', '_ga', '_gid', '_gat',
    '__gads', '__gac', 'zanpid', 'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id',
    'customid', 'click_id', 'offer_id', 'promo_code', 'coupon_code', 'deal_id'
]);

/**
 * 追蹤參數前綴集合 (用於建構 Trie 樹)
 */
const TRACKING_PREFIXES = new Set(['utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_', 'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_', 'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_', 'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_']);


// =================================================================================================
// 🚀 V30 核心性能組件 (Trie 樹 + LRU 快取)
// =================================================================================================

class Trie {
    constructor() { this.root = {}; }
    insert(word) { let node = this.root; for (const char of word) { node = node[char] = node[char] || {}; } node.isEndOfWord = true; }
    startsWith(prefix) { let node = this.root; for (const char of prefix) { if (!node[char]) return false; node = node[char]; if (node.isEndOfWord) return true; } return false; }
    contains(text) { for (let i = 0; i < text.length; i++) { let node = this.root; for (let j = i; j < text.length; j++) { const char = text[j]; if (!node[char]) break; node = node[char]; if (node.isEndOfWord) return true; } } return false; }
}

class LRUCache {
    constructor(maxSize = 500) { this.maxSize = maxSize; this.cache = new Map(); }
    get(key) { if (!this.cache.has(key)) return null; const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; }
    set(key, value) { if (this.cache.has(key)) this.cache.delete(key); else if (this.cache.size >= this.maxSize) { this.cache.delete(this.cache.keys().next().value); } this.cache.set(key, value); }
}

const cache = new LRUCache();
const prefixTrie = new Trie(); TRACKING_PREFIXES.forEach(p => prefixTrie.insert(p));
const criticalPatternTrie = new Trie(); CRITICAL_TRACKING_PATTERNS.forEach(p => criticalPatternTrie.insert(p));
const pathBlockTrie = new Trie(); PATH_BLOCK_KEYWORDS.forEach(p => pathBlockTrie.insert(p));
const allowTrie = new Trie(); PATH_ALLOW_PATTERNS.forEach(p => allowTrie.insert(p));
const dropTrie = new Trie(); DROP_KEYWORDS.forEach(p => dropTrie.insert(p));

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', 'jpg', 'jpeg', 'webp', '.ico']);
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" }};
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } }});
const REJECT_RESPONSE = { response: { status: 403 } };
const DROP_RESPONSE = { response: {} };

// =================================================================================
// 🚀 核心處理邏輯 (V30 Trie 重構)
// =================================================================================

class PerformanceStats {
    constructor() { this.stats = { totalRequests: 0, blockedRequests: 0, criticalTrackingBlocked: 0, domainBlocked: 0, pathBlocked: 0, paramsCleaned: 0, whitelistHits: 0, errors: 0 }; }
    increment(type) { if (this.stats.hasOwnProperty(type)) this.stats[type]++; }
}
const performanceStats = new PerformanceStats();

function isCriticalTrackingScript(path) {
    const cacheKey = `critical:${path}`; const cachedResult = cache.get(cacheKey); if (cachedResult !== null) return cachedResult;
    const scriptName = path.substring(path.lastIndexOf('/') + 1); const result = CRITICAL_TRACKING_SCRIPTS.has(scriptName) || criticalPatternTrie.contains(path);
    cache.set(cacheKey, result); return result;
}

function isApiWhitelisted(hostname) {
    const cacheKey = `wl:${hostname}`; const cachedResult = cache.get(cacheKey); if (cachedResult !== null) return cachedResult;
    let result = false; if (API_WHITELIST_EXACT.has(hostname)) { result = true; } else { for (const [domain] of API_WHITELIST_WILDCARDS) { if (hostname === domain || hostname.endsWith('.' + domain)) { result = true; break; } } }
    cache.set(cacheKey, result); return result;
}

function isDomainBlocked(hostname) {
    const cacheKey = `bl:${hostname}`; const cachedResult = cache.get(cacheKey); if (cachedResult !== null) return cachedResult;
    let result = false; let currentDomain = hostname;
    while (currentDomain) { if (BLOCK_DOMAINS.has(currentDomain)) { result = true; break; } const dotIndex = currentDomain.indexOf('.'); if (dotIndex === -1) break; currentDomain = currentDomain.substring(dotIndex + 1); }
    cache.set(cacheKey, result); return result;
}

function isPathBlocked(path) {
    const cacheKey = `path:${path}`; const cachedResult = cache.get(cacheKey); if (cachedResult !== null) return cachedResult;
    let result = false; if (pathBlockTrie.contains(path)) { if (!allowTrie.contains(path)) { result = true; } }
    cache.set(cacheKey, result); return result;
}

function cleanTrackingParams(url) {
    let paramsChanged = false; for (const key of [...url.searchParams.keys()]) { const lowerKey = key.toLowerCase(); if (GLOBAL_TRACKING_PARAMS.has(lowerKey) || prefixTrie.startsWith(lowerKey)) { url.searchParams.delete(key); paramsChanged = true; } }
    return paramsChanged;
}

function getBlockResponse(path) {
    if (dropTrie.contains(path)) { return DROP_RESPONSE; }
    const ext = path.substring(path.lastIndexOf('.')); if (IMAGE_EXTENSIONS.has(ext)) { return TINY_GIF_RESPONSE; }
    return REJECT_RESPONSE;
}

function processRequest(request) {
    try {
        performanceStats.increment('totalRequests'); if (!request || !request.url) return null;
        let url; try { url = new URL(request.url); } catch (e) { performanceStats.increment('errors'); return null; }
        const hostname = url.hostname.toLowerCase(); const path = (url.pathname + url.search).toLowerCase();
        if (isApiWhitelisted(hostname)) { performanceStats.increment('whitelistHits'); return null; }
        if (isCriticalTrackingScript(path)) { performanceStats.increment('criticalTrackingBlocked'); performanceStats.increment('blockedRequests'); return getBlockResponse(path); }
        if (isDomainBlocked(hostname)) { performanceStats.increment('domainBlocked'); performanceStats.increment('blockedRequests'); return getBlockResponse(path); }
        if (isPathBlocked(path)) { performanceStats.increment('pathBlocked'); performanceStats.increment('blockedRequests'); return getBlockResponse(path); }
        if (cleanTrackingParams(url)) { performanceStats.increment('paramsCleaned'); return REDIRECT_RESPONSE(url.toString()); }
        return null;
    } catch (error) {
        performanceStats.increment('errors'); if (typeof console !== 'undefined' && console.error) { console.error(`[URL-Filter-v31] 處理錯誤: ${error.message}`, error); }
        return null;
    }
}

// =================================================================================
// 🎬 主執行邏輯
// =================================================================================

(function() {
    try {
        if (typeof $request === 'undefined') {
            if (typeof $done !== 'undefined') {
                $done({ version: '31.0', status: 'ready', message: 'URL Filter v31.0 - Trie Final' });
            }
            return;
        }
        const result = processRequest($request);
        if (typeof $done !== 'undefined') { $done(result || {}); }
    } catch (error) {
        performanceStats.increment('errors'); if (typeof console !== 'undefined' && console.error) { console.error(`[URL-Filter-v31] 致命錯誤: ${error.message}`, error); }
        if (typeof $done !== 'undefined') { $done({}); }
    }
})();

// =================================================================================================
// ## 更新日誌 (V31.0)
// =================================================================================================
//
// ### 📅 更新日期: 2025-09-01
//
// ### ✨ V30 -> V31 變更:
//
// 1.  **最終版本確認**:
//     - 本版本為 V30 Trie 樹架構的最終呈現形式，恢復了所有規則清單的完整顯示，以便於使用者查閱和修改。
//     - 核心邏輯與 V30 版完全一致，繼承了其全部性能優化。
//
// ### ✨ V29 -> V30 核心優化回顧 (架構性升級):
//
// 1.  **全面導入 Trie 樹 (字典樹) 演算法**:
//     - **重構內容**: 將先前版本中用於匹配路徑、參數前綴等多個 `Set` 集合的匹配邏輯（`includes` 迴圈或 `RegExp`），全部重構為 Trie 樹結構。
//     - **核心優勢**:
//         - **恆定高效查詢 (O(k))**: 查詢效率僅與被檢測字串的長度 (k) 相關，與規則庫的總數量 (n) 完全脫鉤。
//         - **卓越的可擴展性**: 可輕鬆擴展至數萬條規則，而查詢性能幾乎無衰減，徹底解決了未來規則庫膨脹可能導致的性能瓶頸。
//         - **對行動裝置更友善**: 在快取未命中的情況下，Trie 的 CPU 消耗遠低於複雜的正則匹配，實現了極致的節能效果。
//
// 2.  **保留並適配 LRU 快取**:
//     - 繼續保留 LRU 快取機制，用於快取 Trie 樹的最終判斷結果（`true` 或 `false`）。Trie 負責高效的「首次計算」，LRU 快取負責高效的「結果複用」，二者結合，相得益彰。
//
// 3.  **優化初始化過程**:
//     - 腳本在首次加載時，會一次性將所有相關的規則 `Set` 載入到各自的 Trie 樹實例中，為後續的高效查詢做好準備。
//
// ### 🏆 總結:
//
// V31 (基於 V30) 是此腳本演進的頂點。它不僅解決了功能有無的問題，更從根本的演算法層面解決了「效率」與「未來適應性」的問題，是在手機 Surge 環境下，兼具正確性、極致性能與可持續發展的最終解決方案。
//
