/**
 * @file        URL-Ultimate-Filter-Surge-V38.3+.js
 * @version     38.3+ (Soft/Hard Whitelist, Safer Domain Memo, Safer DROP, Redirect Guard, URL Immutability)
 * @description 在 V38.3 基礎上：新增軟/硬白名單語義、域名封鎖記憶降敏、DROP 規則語義收斂、重導防環、以及避免對快取的 URL 物件就地修改。 [Diff-friendly]
 * @author      Claude & Gemini & Acterus (+ Final Polish) + Optimized Patch
 * @lastUpdated 2025-09-08
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION (V38.3+)                                   #
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
   * ✅ API 功能性域名白名單
   * - HARD：完全放行（不做任何攔截/清參數），僅用於登入/支付等高敏感流程。
   * - SOFT：僅豁免「域名層級短路封鎖」；仍進行關鍵腳本/路徑判斷與參數清理，強化一致性。
   */
  API_WHITELIST_HARD_EXACT: new Set([
    // 可按需增列（預設留空以避免過度放行）
    // 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
  ]),

  // 原 EXTACT 轉為 SOFT，避免過度豁免（修正：api.zende.sk -> api.zendesk.com）
  API_WHITELIST_SOFT_EXACT: new Set([
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
    'api.notion.com', 'api.figma.com', 'api.trello.com', 'api.asana.com', 'api.dropboxapi.com', 'clorasio.atlassian.net',
    // --- 第三方認證 & SSO ---
    'okta.com', 'auth0.com', 'sso.godaddy.com',
    // --- 台灣地區服務 & 銀行 ---
    'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
    'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
    'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
    'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
    'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com', 'cmapi.tw.coupang.com',
    // --- 其他常用 API ---
    'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', 'hooks.slack.com', 'api.pagerduty.com',
    'api.zendesk.com', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
    'duckduckgo.com', 'external-content.duckduckgo.com'
  ]),

  /**
   * ✅ API 功能性域名白名單 (萬用字元) — 預設視為 SOFT 白名單
   */
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
    ['digitaloceanspaces.com', true],
    ['okta.com', true], ['auth0.com', true], ['atlassian.net', true],
    ['shopee.tw', true],
    ['fubon.com', true], ['bot.com.tw', true], ['megabank.com.tw', true], ['firstbank.com.tw', true],
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
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js',
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js',
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
   */
  CRITICAL_TRACKING_PATTERNS: new Set([
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/',
    'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', '/ads/ga-audiences',
    'facebook.com/tr', 'facebook.com/tr/',
    '/collect?', '/track/', '/beacon/', '/pixel/', '/telemetry/', '/api/log/', '/api/track/', '/api/collect/',
    '/api/v1/track', '/intake', '/api/batch',
    'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'px.ads.linkedin.com',
    'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track',
    'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', 'api-iam.intercom.io/messenger/web/events',
    'api.hubspot.com/events',
    '/plugins/easy-social-share-buttons/',
    'hm.baidu.com/hm.js', 'cnzz.com/stat.php', 'wgo.mmstat.com', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
    '/abtesting/', '/feature-flag/', '/user-profile/', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc',
    '/v1/pixel', 'ads.tiktok.com/i1n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel',
    'analytics.snapchat.com/v1/batch', 'tr.snapchat.com', 'sc-static.net/scevent.min.js', '/ad/v1/event',
    'ads.pinterest.com/v3/conversions/events', 'ad.360yield.com', '/ad-call', '/adx/', '/adsales/',
    '/adserver/', '/adsync/', '/adtech/',
  ]),

  /**
   * 🚫 路徑關鍵字黑名單
   */
  PATH_BLOCK_KEYWORDS: new Set([
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
    '/track/', '/trace/', '/tracker/', '/tracking/', '/analytics/', '/analytic/', '/metric/', '/metrics/',
    '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/log/',
    '/logs/', 'logger', '/logging/', '/logrecord/', '/putlog/', '/audit/', '/beacon/', '/pixel/', '/collect?',
    '/collector/', '/report/', '/reports/', '/reporting/',
    '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'web-vitals',
    'performance-tracking', 'real-user-monitoring',
    'user-analytics', 'behavioral-targeting', 'data-collection', 'data-sync', 'fingerprint',
    'fingerprinting', 'third-party-cookie', 'user-cohort', 'attribution', 'retargeting', 'audience',
    'cohort', 'user-segment', 'user-behavior', 'session-replay',
    'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano',
    'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'utag.js',
    'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'privacy-policy', 'cookie-consent'
  ]),

  /**
   * ✅ 路徑關鍵字白名單（收斂版）
   */
  PATH_ALLOW_PATTERNS: new Set([
    'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
    'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs',
    'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css',
    'badge.svg', 'modal.js', 'card.js', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt',
    'page-data.js', 'legacy.js', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---',
    '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/',
    'theme.js', 'config.js', 'web.config'
  ]),

  /**
   * 💧 直接拋棄請求 (DROP) 的語義（收斂）
   * - 移除過度泛用字詞（如 log/logs/logging）從字串集合，改用邊界正則以降低誤殺（/blog, /catalog 等）
   */
  DROP_KEYWORDS: new Set([
    'amp-loader', 'amp-analytics', 'beacon', 'collect?', 'collector',
    'telemetry', 'crash', 'error-report', 'insight', 'event-stream', 'ingest',
    'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag', 'client-event',
    'server-event', 'heartbeat', 'web-vitals', 'performance-entry',
    'csp-report', 'profiler'
    // 其餘具體型態改以正則（見 DROP_REGEX）
  ]),

  /**
   * 🧩 DROP 正則（詞界/分隔符限定）
   */
  DROP_REGEX: [
    /(?:^|[\\/._?-])log(?:s|ging)?(?:[\\/._?-]|$)/i,
    /(?:^|[?&])(?:csp-report|trace\\.json|diagnostic\\.log|usage\\.log)(?:=|$)/i,
    /(?:^|[\\/])(?:beacon|collect|collector)(?:[\\/?.]|$)/i,
    /(?:^|[\\/._-])heartbeat(?:[\\/?.]|$)/i,
    /(?:^|[\\/._-])event-stream(?:[\\/?.]|$)/i,
    /(?:^|[\\/._-])intake(?:[\\/?.]|$)/i,
    /(?:^|[\\/._-])ingest(?:[\\/?.]|$)/i,
    /(?:^|[\\/._-])rum(?:[\\/?.]|$)/i
  ],

  /**
   * 🗑️ 全域追蹤參數黑名單
   */
  GLOBAL_TRACKING_PARAMS: new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au',
    '_ga', '_gid', '_gat', '__gads', '__gac',
    'msclkid', 'msad', 'mscampaignid', 'msadgroupid',
    'fbclid', 'fbadid', 'fbcampaignid', 'fbadsetid', 'fbplacementid', 'igshid', 'igsh',
    'x-threads-app-object-id', 'mibextid',
    'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok',
    'zanpid', 'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id', 'customid',
    'click_id', 'clickid', 'offer_id', 'promo_code', 'coupon_code', 'deal_id', 'rb_clickid', 's_kwcid', 'ef_id',
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
    'ad_id', 'adgroup_id', 'campaign_id', 'creative_id', 'keyword', 'matchtype', 'device', 'devicemodel',
    'adposition', 'network', 'placement', 'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms',
    'creative', 'adset', 'ad', 'pixel_id', 'event_id',
    'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position'
  ]),

  /**
   * 追蹤參數前綴集合
   */
  TRACKING_PREFIXES: new Set([
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_', 'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_', 'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_', 'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_'
  ]),

  /**
   * ✅ 必要參數白名單
   */
  PARAMS_TO_KEEP_WHITELIST: new Set(['t', 'v', 'targetid']),

  /**
   * 🚫 基於正規表示式的路徑黑名單
   */
  PATH_BLOCK_REGEX: [
    /^\/[a-z0-9]{12,}\.js$/i,           // 根目錄長雜湊 js
    /[^\/]*sentry[^\/]*\.js/i           // 檔名含 sentry 且以 .js 結尾
  ],

  /**
   * 🧠 域名封鎖記憶策略
   * threshold：同一 hostname 在滑動窗口內命中風險決策達閾值才短路封鎖
   * windowMs：滑動窗口毫秒數
   */
  DOMAIN_BLOCK_MEMO: { threshold: 3, windowMs: 10 * 60 * 1000 } // 3 次 / 10 分鐘
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 OPTIMIZED CORE ENGINE (V38.3+)                                  #
// #                                                                                               #
// #################################################################################################

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, PARAM_CLEAN: 3 });

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);

// 高效能 Trie
class OptimizedTrie {
  constructor() { this.root = Object.create(null); this._nodePool = []; }
  _getNode() { return this._nodePool.pop() || Object.create(null); }
  _returnNode(node) { for (const k in node) delete node[k]; if (this._nodePool.length < 100) this._nodePool.push(node); }
  insert(word) { let n = this.root; for (let i = 0; i < word.length; i++) { const c = word[i]; if (!n[c]) n[c] = this._getNode(); n = n[c]; } n.isEndOfWord = true; }
  startsWith(prefix) { let n = this.root; for (let i = 0; i < prefix.length; i++) { const c = prefix[i]; if (!n[c]) return false; n = n[c]; if (n.isEndOfWord) return true; } return false; }
  contains(text) { const N = text.length; for (let i = 0; i < N; i++) { let n = this.root; for (let j = i; j < N; j++) { const c = text[j]; if (!n[c]) break; n = n[c]; if (n.isEndOfWord) return true; } } return false; }
}

// O(1) LRU 快取
class HighPerformanceLRUCache {
  constructor(maxSize = 1000) { this.maxSize = maxSize; this.cache = new Map(); this.head = { k: null, v: null, p: null, n: null }; this.tail = { k: null, v: null, p: null, n: null }; this.head.n = this.tail; this.tail.p = this.head; this._h = 0; this._m = 0; }
  _add(node) { node.p = this.head; node.n = this.head.n; this.head.n.p = node; this.head.n = node; }
  _remove(node) { node.p.n = node.n; node.n.p = node.p; }
  _moveToHead(node) { this._remove(node); this._add(node); }
  _popTail() { const last = this.tail.p; this._remove(last); return last; }
  get(key) { const n = this.cache.get(key); if (n) { this._h++; this._moveToHead(n); return n.v; } this._m++; return null; }
  set(key, value) { let n = this.cache.get(key); if (n) { n.v = value; this._moveToHead(n); } else { n = { k: key, v: value, p: null, n: null }; if (this.cache.size >= this.maxSize) { const tail = this._popTail(); this.cache.delete(tail.k); } this.cache.set(key, n); this._add(n); } }
  getHitRate() { const total = this._h + this._m; return total > 0 ? (this._h / total * 100).toFixed(2) : '0.00'; }
}

// 智慧型快取
class SmartCacheManager {
  constructor() { this.primaryCache = new HighPerformanceLRUCache(800); this.frequencyCache = new HighPerformanceLRUCache(200); this.accessCount = new Map(); this.lastCleanup = Date.now(); this.cleanupInterval = 300000; }
  get(key) { let r = this.frequencyCache.get(key); if (r !== null) return r; r = this.primaryCache.get(key); if (r !== null) { this._incrementAccess(key); return r; } return null; }
  set(key, value) { const cnt = this.accessCount.get(key) || 0; if (cnt > 3) { this.frequencyCache.set(key, value); } else { this.primaryCache.set(key, value); } this._cleanup(); }
  _incrementAccess(key) { const cnt = (this.accessCount.get(key) || 0) + 1; this.accessCount.set(key, cnt); if (cnt > 3) { const v = this.primaryCache.get(key); if (v !== null) this.frequencyCache.set(key, v); } }
  _cleanup() { const now = Date.now(); if (now - this.lastCleanup > this.cleanupInterval) { for (const [k, c] of this.accessCount.entries()) { if (c < 2) this.accessCount.delete(k); } this.lastCleanup = now; } }
  getStats() { return { primaryHitRate: this.primaryCache.getHitRate(), frequencyHitRate: this.frequencyCache.getHitRate(), totalEntries: this.primaryCache.cache.size + this.frequencyCache.cache.size, accessEntries: this.accessCount.size }; }
}

// 多層快取管理 + Redirect Guard + Domain Risk Memo
class MultiLevelCacheManager {
  constructor() {
    this.l1DomainCache = new HighPerformanceLRUCache(256);
    this.l2SmartCache = new SmartCacheManager();
    this.urlObjectCache = new HighPerformanceLRUCache(64);
    this.redirectGuard = new HighPerformanceLRUCache(512);       // 防止重導環
    this.domainRiskMemo = new HighPerformanceLRUCache(1024);     // hostname -> {ts:number[], score:number}
  }
  getDomainDecision(h) { return this.l1DomainCache.get(h); }
  setDomainDecision(h, d) { this.l1DomainCache.set(h, d); }
  getUrlDecision(k) { return this.l2SmartCache.get(k); }
  setUrlDecision(k, d) { this.l2SmartCache.set(k, d); }
  getUrlObject(rawUrl) { return this.urlObjectCache.get(rawUrl); }
  setUrlObject(rawUrl, urlObj) { this.urlObjectCache.set(rawUrl, urlObj); }
  hasRedirected(rawUrl) { return this.redirectGuard.get(rawUrl) !== null; }
  markRedirected(rawUrl) { this.redirectGuard.set(rawUrl, 1); }
  getRisk(host) { return this.domainRiskMemo.get(host) || { ts: [], score: 0 }; }
  setRisk(host, data) { this.domainRiskMemo.set(host, data); }
  getStats() {
    return {
      l1DomainCacheHitRate: this.l1DomainCache.getHitRate(),
      l1DomainCacheSize: this.l1DomainCache.cache.size,
      urlObjectCacheHitRate: this.urlObjectCache.getHitRate(),
      l2SmartCacheStats: this.l2SmartCache.getStats()
    };
  }
}

// 初始化
const multiLevelCache = new MultiLevelCacheManager();
const OPTIMIZED_TRIES = {
  prefix: new OptimizedTrie(),
  criticalPattern: new OptimizedTrie(),
  pathBlock: new OptimizedTrie(),
  allow: new OptimizedTrie(),
  drop: new OptimizedTrie()
};

function initializeOptimizedTries() {
  const tasks = [
    () => CONFIG.TRACKING_PREFIXES.forEach(p => OPTIMIZED_TRIES.prefix.insert(String(p).toLowerCase())),
    () => CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => OPTIMIZED_TRIES.criticalPattern.insert(String(p).toLowerCase())),
    () => CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => OPTIMIZED_TRIES.pathBlock.insert(String(p).toLowerCase())),
    () => CONFIG.PATH_ALLOW_PATTERNS.forEach(p => OPTIMIZED_TRIES.allow.insert(String(p).toLowerCase())),
    // DROP_KEYWORDS 維持 Trie；泛用詞已移出，精度靠 DROP_REGEX
    () => CONFIG.DROP_KEYWORDS.forEach(p => OPTIMIZED_TRIES.drop.insert(String(p).toLowerCase()))
  ];
  tasks.forEach(fn => fn());
}

// 統計
class OptimizedPerformanceStats {
  constructor() {
    this.counters = new Uint32Array(20);
    this.labels = [
      'totalRequests', 'blockedRequests', 'criticalTrackingBlocked', 'domainBlocked', 'pathBlocked', 'regexPathBlocked',
      'paramsCleaned', 'whitelistHits', 'errors', 'l1CacheHits', 'l2CacheHits', 'urlCacheHits', 'cacheMisses',
      'softWhitelist', 'hardWhitelist', 'redirectGuardHits'
    ];
    this.startTime = __now__();
  }
  increment(type) { const idx = this.labels.indexOf(type); if (idx !== -1) this.counters[idx]++; }
  getStats() {
    const runtime = ((__now__() - this.startTime) / 1000).toFixed(2);
    const stats = { runtime: `${runtime}s` };
    this.labels.forEach((l, i) => { stats[l] = this.counters[i]; });
    return stats;
  }
  getBlockingRate() { const total = this.counters; const blocked = this.counters[1]; return total > 0 ? ((blocked / total) * 100).toFixed(2) : '0.00'; }
}
const optimizedStats = new OptimizedPerformanceStats();

// ------------------------------------ 工具函式 ------------------------------------

function getWhitelistStatus(host) {
  if (CONFIG.API_WHITELIST_HARD_EXACT.has(host)) return 2; // HARD
  if (CONFIG.API_WHITELIST_SOFT_EXACT.has(host)) return 1; // SOFT
  // wildcards 視為 SOFT
  let current = host;
  while (true) {
    const d = current.indexOf('.');
    if (d === -1) break;
    current = current.slice(d + 1);
    if (CONFIG.API_WHITELIST_WILDCARDS.has(current)) return 1;
  }
  if (CONFIG.API_WHITELIST_WILDCARDS.has(host)) return 1;
  return 0;
}

function isOptimizedDomainBlocked(h) {
  let c = h;
  while (c) {
    if (CONFIG.BLOCK_DOMAINS.has(c)) return true;
    const i = c.indexOf('.');
    if (i === -1) break;
    c = c.slice(i + 1);
  }
  return false;
}

function isOptimizedCriticalTrackingScript(path) {
  const k = `crit:${path}`;
  const c = multiLevelCache.getUrlDecision(k);
  if (c !== null) { optimizedStats.increment('l2CacheHits'); return c; }
  optimizedStats.increment('cacheMisses');
  const q = path.indexOf('?');
  const p = q !== -1 ? path.slice(0, q) : path;
  const s = p.lastIndexOf('/');
  const n = s !== -1 ? p.slice(s + 1) : p;
  let b = false;
  if (n && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(n)) { b = true; }
  else { b = OPTIMIZED_TRIES.criticalPattern.contains(path); }
  multiLevelCache.setUrlDecision(k, b);
  return b;
}

function isOptimizedPathBlocked(path) {
  const k = `path:${path}`;
  const c = multiLevelCache.getUrlDecision(k);
  if (c !== null) { optimizedStats.increment('l2CacheHits'); return c; }
  optimizedStats.increment('cacheMisses');
  let r = false;
  if (OPTIMIZED_TRIES.pathBlock.contains(path)) {
    if (!OPTIMIZED_TRIES.allow.contains(path)) { r = true; }
  }
  multiLevelCache.setUrlDecision(k, r);
  return r;
}

function isOptimizedPathBlockedByRegex(path) {
  const k = `regex:${path}`;
  const c = multiLevelCache.getUrlDecision(k);
  if (c !== null) { optimizedStats.increment('l2CacheHits'); return c; }
  optimizedStats.increment('cacheMisses');
  for (let i = 0; i < CONFIG.PATH_BLOCK_REGEX.length; i++) {
    if (CONFIG.PATH_BLOCK_REGEX[i].test(path)) {
      multiLevelCache.setUrlDecision(k, true);
      return true;
    }
  }
  multiLevelCache.setUrlDecision(k, false);
  return false;
}

function isDropPath(pathLower) {
  // 先走正則（有邊界限定）
  for (let i = 0; i < CONFIG.DROP_REGEX.length; i++) {
    if (CONFIG.DROP_REGEX[i].test(pathLower)) return true;
  }
  // 再走收斂後字典（不含過度泛用詞）
  return OPTIMIZED_TRIES.drop.contains(pathLower);
}

function optimizedCleanTrackingParamsImmutable(urlObj) {
  // 對 URL 進行不可變清理：clone 後處理，避免污染 urlObjectCache
  const cloned = new URL(urlObj.toString());
  let toDelete = null;
  for (const key of cloned.searchParams.keys()) {
    const lowerKey = key.toLowerCase();
    if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;
    if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || OPTIMIZED_TRIES.prefix.startsWith(lowerKey)) {
      if (!toDelete) toDelete = [];
      toDelete.push(key);
    }
  }
  if (toDelete) {
    toDelete.forEach(k => cloned.searchParams.delete(k));
    return cloned; // cleaned
  }
  return null; // no change
}

function getOptimizedBlockResponse(path) {
  const lower = path.toLowerCase();
  if (isDropPath(lower)) return DROP_RESPONSE;
  const dot = path.lastIndexOf('.');
  if (dot !== -1) {
    const ext = path.slice(dot).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
  }
  return REJECT_RESPONSE;
}

// 風險命中記錄（滑動窗口）與域名短路封鎖
function markHostRiskMaybeBlock(hostname) {
  const now = Date.now();
  const memo = multiLevelCache.getRisk(hostname);
  // 清理窗口外
  const windowMs = CONFIG.DOMAIN_BLOCK_MEMO.windowMs;
  const threshold = CONFIG.DOMAIN_BLOCK_MEMO.threshold;
  const kept = memo.ts.filter(ts => (now - ts) <= windowMs);
  kept.push(now);
  memo.ts = kept;
  memo.score = kept.length;
  multiLevelCache.setRisk(hostname, memo);
  if (memo.score >= threshold) {
    multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
    return true;
  }
  return false;
}

// #################################################################################################
// #                                                                                               #
// #                                   主要處理流程 (V38.3+)                                        #
// #                                                                                               #
// #################################################################################################

function processOptimizedRequest(request) {
  try {
    optimizedStats.increment('totalRequests');
    if (!request?.url || typeof request.url !== 'string' || request.url.length < 10) return null;

    const rawUrl = request.url;
    let url = multiLevelCache.getUrlObject(rawUrl);
    if (url) {
      optimizedStats.increment('urlCacheHits');
    } else {
      try {
        url = new URL(rawUrl);
        multiLevelCache.setUrlObject(rawUrl, url);
      } catch (e) {
        optimizedStats.increment('errors');
        if (typeof console !== 'undefined' && console.error) console.error(`[URL-Filter-v38.3+] URL 解析失敗: "${rawUrl}", 錯誤: ${e.message}`);
        return null;
      }
    }

    const hostname = url.hostname.toLowerCase();

    // 1) 白名單語義
    const wl = getWhitelistStatus(hostname); // 0/1/2 => NONE/SOFT/HARD
    if (wl === 2) { // HARD：完全放行
      optimizedStats.increment('hardWhitelist');
      optimizedStats.increment('whitelistHits');
      return null;
    }
    const isSoftWhitelist = wl === 1;
    if (isSoftWhitelist) {
      optimizedStats.increment('softWhitelist');
      optimizedStats.increment('whitelistHits');
    }

    // 2) L1 短路封鎖（SOFT 不套用短路）
    if (!isSoftWhitelist) {
      const l1Decision = multiLevelCache.getDomainDecision(hostname);
      if (l1Decision === DECISION.BLOCK) {
        optimizedStats.increment('l1CacheHits');
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getOptimizedBlockResponse(url.pathname + url.search);
      }
    }

    // 3) 靜態黑名單（即使 SOFT，仍建議尊重此決策）
    if (isOptimizedDomainBlocked(hostname)) {
      multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      optimizedStats.increment('domainBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(url.pathname + url.search);
    }

    const originalFullPath = url.pathname + url.search;
    const lowerPathnameOnly = url.pathname.toLowerCase();
    const lowerFullPath = originalFullPath.toLowerCase();

    // 4) 關鍵追蹤腳本
    if (isOptimizedCriticalTrackingScript(lowerFullPath)) {
      // SOFT 白名單不記憶域名封鎖，僅當達到風險閾值才短路
      if (!isSoftWhitelist) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      } else {
        markHostRiskMaybeBlock(hostname);
      }
      optimizedStats.increment('criticalTrackingBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // 5) 路徑關鍵字
    if (isOptimizedPathBlocked(lowerFullPath)) {
      if (!isSoftWhitelist) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      } else {
        markHostRiskMaybeBlock(hostname);
      }
      optimizedStats.increment('pathBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // 6) 正則封鎖
    if (isOptimizedPathBlockedByRegex(lowerPathnameOnly)) {
      if (!isSoftWhitelist) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      } else {
        markHostRiskMaybeBlock(hostname);
      }
      optimizedStats.increment('regexPathBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // 7) 參數清理（不可變處理 + 重導防環）
    const cleaned = optimizedCleanTrackingParamsImmutable(url);
    if (cleaned && cleaned.search !== url.search) {
      // 重導防環：相同 rawUrl 在短期內僅重導一次
      if (multiLevelCache.hasRedirected(rawUrl)) {
        optimizedStats.increment('redirectGuardHits');
        return null;
      }
      multiLevelCache.markRedirected(rawUrl);
      optimizedStats.increment('paramsCleaned');
      return REDIRECT_RESPONSE(cleaned.toString());
    }

    // 8) 放行
    return null;

  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v38.3+] 處理請求 "${request?.url}" 時發生錯誤: ${error?.message}`, error?.stack);
    }
    return null;
  }
}

// 執行入口
(function () {
  try {
    initializeOptimizedTries();
    if (typeof $request === 'undefined') {
      if (typeof $done !== 'undefined') {
        const stats = optimizedStats.getStats();
        const cacheStats = multiLevelCache.getStats();
        $done({ version: '38.3+', status: 'ready', message: 'URL Filter v38.3+ - Soft/Hard WL, Safer Memo/DROP/Redirect, Immutable URL', stats, cache: cacheStats });
      }
      return;
    }
    const result = processOptimizedRequest($request);
    if (typeof $done !== 'undefined') $done(result || {});
  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v38.3+] 致命錯誤: ${error?.message}`, error?.stack);
    }
    if (typeof $done !== 'undefined') $done({});
  }
})();
