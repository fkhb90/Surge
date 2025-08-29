/**

@file URL-Ultimate-Filter-Surge-V27.1b.js
@version 27.1b
@description 基於 27.1，修正 ytag.js 相關匹配（尾斜線 / 版本化），未增刪任何名單條目。
@lastUpdated 2025-08-29 */
/* ================================ ⚙️ 設定區 ================================ */

const DEBUG = false; // 除錯時可設為 true 可輸出攔截原因 (建議除錯時使用，正式使用請關閉以節省效能)

/* 🚫 域名攔截黑名單 (與前版一致，未增刪) */
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

/* ✅ API 白名單 (未變) /
const API_WHITELIST_EXACT = new Set([
'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
'api.github.com', 'api.openai.com', 'api.anthropic.com', 'api.cohere.ai', 'api.vercel.com',
'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
'database.windows.net', 'api.stripe.com', 'api.paypal.com', 'api.adyen.com',
'api.braintreegateway.com', 'auth.docker.io', 'login.docker.com', 'api.notion.com',
'api.figma.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
'okta.com', 'auth0.com', 'api.trello.com', 'api.asana.com', 'api.intercom.io', 'api.sendgrid.com',
'api.mailgun.com', '.atlassian.net', 'hooks.slack.com', 'api.pagerduty.com', 'sso.godaddy.com',
'api.cloudflare.com', 'api.fastly.com', 'api.zende.sk', 'api.hubapi.com', 'api.dropboxapi.com',
'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com'
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

/* 🚨 關鍵追蹤腳本 & 路徑 (未改動成員) */
const CRITICAL_TRACKING_SCRIPTS = new Set([
'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js', 'fbevents.js', 'fbq.js',
'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js', 'doubleclick.js', 'adsense.js', 'adloader.js',
'hotjar.js', 'mixpanel.js', 'amplitude.js', 'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js',
'heap.js', 'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js',
'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js',
'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js',
'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js',
'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js',
'tiktok-pixel.js', 'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js',
'capture.js', 'user-id.js', 'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js',
'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js',
'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js',
'ad-player.js', 'ad-lib.js', 'ad-core.js'
]);

const CRITICAL_TRACKING_PATTERNS = new Set([
'/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/', 'google.com/ads',
'google.com/pagead', '/pagead/gen_204', 'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/', '/v1/event',
'/v1/events', '/events/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/',
'/api/v1/track', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track',
'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track',
'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', '/v2/event', '/v2/events', '/intake', '/batch',
'/abtesting/', '/feature-flag/', '/user-profile/', 'api-iam.intercom.io/messenger/web/events',
'api.hubspot.com/events', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',
'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
'/v1/pixel', 'ads.tiktok.com/i18n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js',
'/api/v2/event', '/i/adsct', '/stats.g.doubleclick.net/j/collect', '/ad/v1/event',
'px.ads.linkedin.com', 'ads.pinterest.com/v3/conversions/events', '/ads/ga-audiences',
'ad.360yield.com', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/'
]);

/* ✅ 路徑白名單 / 黑名單 / 丟棄關鍵字 / 參數 (未改) */
const PATH_ALLOW_PATTERNS = new Set(['chunk.js', 'chunk.mjs', 'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css', 'badge.svg', 'modal.js', 'card.js', 'download', 'upload', 'payload', 'broadcast', 'roadmap', 'gradient', 'shadow', 'board', 'dialog', 'blog', 'catalog', 'game', 'language', 'page', 'page-data.js', 'legacy.js', 'article', 'assets', 'cart', 'chart', 'start', 'parts', 'partner', 'amp-anim', 'amp-animation', 'amp-iframe', 'api', 'service', 'endpoint', 'webhook', 'callback', 'oauth', 'auth', 'login', 'register', 'profile', 'dashboard', 'admin', 'config', 'settings', 'preference', 'notification', 'message', 'chat', 'comment', 'review', 'rating', 'search', 'filter', 'sort', 'category', 'media', 'image', 'video', 'audio', 'document', 'pdf', 'export', 'import', 'backup', 'restore', 'sync', 'feed', 'rss', 'atom', 'xml', 'opml', 'subscription', 'subscribe', 'collections', 'boards', 'streams', 'contents', 'preferences', 'folders', 'entries', 'items', 'posts', 'articles', 'sources', 'categories', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js', 'util.js', 'script.js', 'index.js', 'index.mjs', 'main.mjs', 'app.mjs', 'vendor.mjs', 'runtime.mjs', 'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt', '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/', 'theme.js', 'config.js', 'web.config', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---']);

const PATH_BLOCK_KEYWORDS = new Set([
'/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/', '/popup/', '/interstitial/', '/preroll/', '/midroll/', '/postroll/', '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/', '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/event/', '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/', '/reports/', '/reporting/', '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense', 'dfp', 'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'prebid', 'apstag', 'pwt.js', 'utag.js', 'rtb', 'dsp', 'ssp', 'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'ad_logic', 'ad-choices', 'ad-manager', 'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader', 'ad-placement', 'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort', 'web-vitals', 'performance-tracking', 'real-user-monitoring', 'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-engagement', 'ad-conversion', 'user-behavior', 'session-replay', 'privacy-policy', 'cookie-consent',
'ad-break', 'ad_event', 'ad-inventory', 'ad-specs', 'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network', 'ad-platform', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', 'ad-code', 'ad-script', 'ad-telemetry',
'/adserve/', '/adserving/', '/adframe/', '/adrequest/', '/adretrieve/', '/getads/', '/getad/', '/fetch_ads/'
]);

const DROP_KEYWORDS = new Set([
'log', 'logs', 'logger', 'logging', 'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector',
'telemetry', 'crash', 'error-report', 'metric', 'insight', 'audit', 'event-stream', 'ingest', 'live-log',
'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event', 'server-event', 'heartbeat',
'web-vitals', 'performance-entry', 'diagnostic.log', 'user-action', 'stacktrace', 'csp-report',
'profiler', 'trace.json', 'usage.log'
]);

const GLOBAL_TRACKING_PARAMS = new Set([
'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_source_platform',
'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source',
'gad', 'gcl_au', 'msclkid', 'yclid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid',
'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid', 'mc_cid', 'mc_eid',
'mkt_tok', 'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium',
'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag', 'from_source',
'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign', 'share_token', 'share_app_id',
'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id', 'wechat_id', 'is_copy_url', 'is_from_webapp',
'pvid', 'fr', 'type', 'scene', 'clickid', 'traceid', 'request_id', '__twitter_impression', '_openstat',
'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id',
'ck_subscriber_id', 'action_object_map', 'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk',
'trk_params', 'ttclid', 'twclid', 'li_fat_id', 'epik', 'piwik_campaign', 'piwik_kwd', 'matomo_campaign',
'matomo_kwd', '_ga', '_gid', '_gat', '__gads', '__gac', 'zanpid', 'affid', 'affiliate_id', 'partner_id',
'sub_id', 'transaction_id', 'customid', 'click_id', 'offer_id', 'promo_code', 'coupon_code', 'deal_id'
]);

const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mke_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|video_utm_|vero_|cf|hs|pk|mtm|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_|ref_|from_|share_|aff_|alg_|li_|tt_|tw_|epik_|bta|bta|oly|cam|cup_|gdr_|gds_|et_|hmsr_|zanpid_|ga|gid|gat|s_)/;

/* ================================ 🧪 輔助工具 ================================ */

const IMAGE_EXT_REGEX = /.(gif|svg|png|jpe?g|webp|ico)(?|#|$)/i;

const domainBlockCache = new Map();
const domainWhitelistCache = new Map();
const pathAllowCache = new Map();
const pathBlockCache = new Map();

function debugLog(...args) { if (DEBUG && typeof console !== 'undefined') console.log('[URL-Filter][DEBUG]', ...args); }

function isApiWhitelisted(host) {
if (domainWhitelistCache.has(host)) return domainWhitelistCache.get(host);
if (API_WHITELIST_EXACT.has(host)) {
domainWhitelistCache.set(host, true);
return true;
}
for (const [d] of API_WHITELIST_WILDCARDS) {
if (host === d || host.endsWith('.' + d)) {
domainWhitelistCache.set(host, true);
return true;
}
}
domainWhitelistCache.set(host, false);
return false;
}

function isDomainBlocked(host) {
if (domainBlockCache.has(host)) return domainBlockCache.get(host);
const parts = host.split('.');
for (let i = 0; i < parts.length; i++) {
const sub = parts.slice(i).join('.');
if (BLOCK_DOMAINS.has(sub)) {
domainBlockCache.set(host, true);
return true;
}
}
domainBlockCache.set(host, false);
return false;
}

/* === 修正版：關鍵追蹤腳本判斷 === */
function isCriticalTrackingScriptPath(inputPath) {
if (!inputPath || typeof inputPath !== 'string') return false;
// 保留原樣再處理
let p = inputPath;
// 移除末尾多個斜線（保留根 "/"）
while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

// 分離 query/hash
let cutIndex = p.length;
const qIdx = p.indexOf('?');
const hIdx = p.indexOf('#');
if (qIdx !== -1 && qIdx < cutIndex) cutIndex = qIdx;
if (hIdx !== -1 && hIdx < cutIndex) cutIndex = hIdx;
const pathNoQuery = p.substring(0, cutIndex);

const lastSeg = pathNoQuery.substring(pathNoQuery.lastIndexOf('/') + 1); // 純檔名（已無 query/hash）
if (!lastSeg) return false;

// 1. 精確命中
if (CRITICAL_TRACKING_SCRIPTS.has(lastSeg)) return true;

// 2. 專門針對 ytag.js 的「版本/變體」寬鬆（若不需要可刪除此區塊）
//   規則：以 ytag.js 開頭，接著第一字元為 . - _ 或數字 (常見版本化/壓縮/切片語法)
if (lastSeg.startsWith('ytag.js') && (lastSeg === 'ytag.js' || /^[.\-_0-9]/.test(lastSeg.slice('ytag.js'.length)))) {
    return true;
}

// 3. 路徑模式
for (const pattern of CRITICAL_TRACKING_PATTERNS) {
    if (p.includes(pattern)) return true;
}
return false;
}

function isPathAllowed(pathLower) {
if (pathAllowCache.has(pathLower)) return pathAllowCache.get(pathLower);
for (const a of PATH_ALLOW_PATTERNS) {
if (pathLower.includes(a)) {
pathAllowCache.set(pathLower, true);
return true;
}
}
pathAllowCache.set(pathLower, false);
return false;
}

function isPathBlocked(pathLower) {
if (pathBlockCache.has(pathLower)) return pathBlockCache.get(pathLower);
if (isPathAllowed(pathLower)) {
pathBlockCache.set(pathLower, false);
return false;
}
for (const k of PATH_BLOCK_KEYWORDS) {
if (pathLower.includes(k)) {
pathBlockCache.set(pathLower, true);
return true;
}
}
pathBlockCache.set(pathLower, false);
return false;
}

function cleanTrackingParams(urlObj) {
let changed = false;
const keys = Array.from(urlObj.searchParams.keys());
for (const k of keys) {
const lk = k.toLowerCase();
if (GLOBAL_TRACKING_PARAMS.has(lk) || TRACKING_PREFIX_REGEX.test(lk)) {
urlObj.searchParams.delete(k);
changed = true;
}
}
return changed;
}

const RESPONSES = {
tinyGif: {
response: {
status: 200,
headers: { 'Content-Type': 'image/gif' },
body: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
}
},
reject: { response: { status: 403 } },
drop: { response: {} },
redirect: (u) => ({ response: { status: 302, headers: { Location: u } } })
};

function shouldDrop(pathLower) {
for (const k of DROP_KEYWORDS) {
if (pathLower.includes(k)) return true;
}
return false;
}

function buildBlockResponse(pathLower) {
if (shouldDrop(pathLower)) return RESPONSES.drop;
if (IMAGE_EXT_REGEX.test(pathLower)) return RESPONSES.tinyGif;
return RESPONSES.reject;
}

/* ================================ 📊 統計 ================================ */
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
inc(k) { if (this.stats.hasOwnProperty(k)) this.stats[k]++; }
blockRate() {
const t = this.stats.totalRequests;
return t ? ((this.stats.blockedRequests / t) * 100).toFixed(2) + '%' : '0%';
}
}
const performanceStats = new PerformanceStats();

/* ================================ 🎯 主邏輯 ================================ */
function processRequest(req) {
performanceStats.inc('totalRequests');
if (!req || !req.url) return null;
let urlObj;
try {
    urlObj = new URL(req.url);
} catch (e) {
    performanceStats.inc('errors');
    return null;
}

const hostname = urlObj.hostname.toLowerCase();
const pathnameLower = urlObj.pathname.toLowerCase();
const pathWithQueryLower = (urlObj.pathname + urlObj.search).toLowerCase();

// Step 1: API 白名單
if (isApiWhitelisted(hostname)) {
    performanceStats.inc('whitelistHits');
    debugLog('WHITELIST', hostname);
    return null;
}

// Step 2: 關鍵追蹤腳本 / 路徑
if (isCriticalTrackingScriptPath(pathnameLower) || isCriticalTrackingScriptPath(pathWithQueryLower)) {
    performanceStats.inc('criticalTrackingBlocked');
    performanceStats.inc('blockedRequests');
    debugLog('BLOCK critical script', pathnameLower);
    return buildBlockResponse(pathWithQueryLower);
}

// Step 3: 域名黑名單
if (isDomainBlocked(hostname)) {
    performanceStats.inc('domainBlocked');
    performanceStats.inc('blockedRequests');
    debugLog('BLOCK domain', hostname);
    return buildBlockResponse(pathWithQueryLower);
}

// Step 4: 路徑黑名單
if (isPathBlocked(pathWithQueryLower)) {
    performanceStats.inc('pathBlocked');
    performanceStats.inc('blockedRequests');
    debugLog('BLOCK path', pathWithQueryLower);
    return buildBlockResponse(pathWithQueryLower);
}

// Step 5: 參數清理
if (cleanTrackingParams(urlObj)) {
    performanceStats.inc('paramsCleaned');
    debugLog('CLEAN params -> redirect', urlObj.toString());
    return RESPONSES.redirect(urlObj.toString());
}

return null;
}

/* ================================ 🚀 執行入口 ================================ */
(function main() {
try {
if (typeof $request === 'undefined') {
if (typeof $done === 'function') {
$done({
version: '27.1b',
status: 'ready',
message: 'URL Filter v27.1b - Critical Script Patch Applied'
});
}
return;
}
const result = processRequest($request);
if (typeof $done === 'function') $done(result || {});
} catch (err) {
performanceStats.inc('errors');
if (typeof console !== 'undefined') console.error('[URL-Filter-v27.1b] Fatal:', err);
if (typeof $done === 'function') $done({});
}
})();

/* ======================== 📌 更新日誌 (V27.1b) ================================
本版相較 27.1 僅修改 isCriticalTrackingScriptPath：

修正可能因末尾斜線 /ytag.js/ 導致最後 segment 為空而 miss。
寬鬆匹配 ytag.js 的版本化檔名（ytag.js?v= / ytag.js.1 / ytag.js-2024…），避免 CDN 變體漏攔。
其餘檔名仍採精確匹配，不擴大範圍；未新增名單條目。
其餘流程與名單全部保持不變。 如需取消寬鬆版本，只保留末尾斜線修正，可刪除： if (lastSeg.startsWith('ytag.js') && (lastSeg === 'ytag.js' || /^[.-_0-9]/.test(...))) { return true; } 
============================================================================== */
