/**
 * @file        URL-Ultimate-Filter-Surge-V38.2.js
 * @version     38.2 (Engine Hardening Fixes & Allow-Scope Tightening)
 * @description 在 V38.1 基礎上修復快取/統計/副檔名等缺陷、收斂 allow 規則並強化萬用白名單匹配，避免漏攔與誤豁免。
 * @author      Claude & Gemini & Acterus (+ Hardening)
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
   * ✅ API 功能性域名白名單 (完全比對)
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
    'api.zende.sk', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
    'duckduckgo.com', 'external-content.duckduckgo.com'
  ]),

  /**
   * ✅ API 功能性域名白名單 (萬用字元)
   * 說明：結尾為這些域名的主機將被豁免 (例如 a.youtube.com)。
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
    ['digitaloceanspaces.com', true],
    // --- 認證 ---
    ['okta.com', true], ['auth0.com', true], ['atlassian.net', true],
    // --- [修正] 蝦皮相容性 ---
    ['shopee.tw', true],
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
   * ✅ 路徑關鍵字白名單（收斂版）
   * 說明：僅針對前端框架產物與明確靜態資產豁免，避免泛用詞造成誤豁免。
   */
  PATH_ALLOW_PATTERNS: new Set([
    // --- 框架 & 套件常用檔 ---
    'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
    'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs',
    // --- 靜態資產與固定檔名 ---
    'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css',
    'badge.svg', 'modal.js', 'card.js', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt',
    'page-data.js', 'legacy.js', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---',
    // --- 典型靜態路徑前綴 ---
    '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/',
    // --- 常見主題或設定檔（檔名級）---
    'theme.js', 'config.js', 'web.config'
  ]),

  /**
   * 💧 直接拋棄請求 (DROP) 的關鍵字
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
    '_ga', '_gid', '_gat', '__gads', '__gac',
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
  PARAMS_TO_KEEP_WHITELIST: new Set([
    't', 'v', 'targetid'
  ]),

  /**
   * 🚫 基於正規表示式的路徑黑名單
   */
  PATH_BLOCK_REGEX: [
    /^\/[a-z0-9]{12,}\.js$/i,            // 根目錄長雜湊 js
    /[^\/]*sentry[^\/]*\.js/i            // 檔名含 sentry 且以 .js 結尾
  ],
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 OPTIMIZED CORE ENGINE (V38.2)                                  #
// #                                                                                               #
// #################################################################################################

// 時間量測穩健回退
const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

// 決策枚舉（以整數取代字串）
const DECISION = Object.freeze({
  ALLOW: 1,
  BLOCK: 2,
  PARAM_CLEAN: 3
});

// 小型工具：安全回應常量
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
// 如需更嚴謹對非 GET 時行為，可改為 308
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });

// 影像副檔名快速判斷（修正：全部使用含點格式）
const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);

// 高效能 Trie
class OptimizedTrie {
  constructor() {
    this.root = Object.create(null);
    this._nodePool = [];
  }
  _getNode() {
    return this._nodePool.pop() || Object.create(null);
  }
  _returnNode(node) {
    for (const k in node) delete node[k];
    if (this._nodePool.length < 100) this._nodePool.push(node);
  }
  insert(word) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      if (!node[c]) node[c] = this._getNode();
      node = node[c];
    }
    node.isEndOfWord = true;
  }
  startsWith(prefix) {
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const c = prefix[i];
      if (!node[c]) return false;
      node = node[c];
      if (node.isEndOfWord) return true;
    }
    return false;
  }
  // 滑動視窗式子字串掃描
  contains(text) {
    const N = text.length;
    for (let i = 0; i < N; i++) {
      let node = this.root;
      for (let j = i; j < N; j++) {
        const c = text[j];
        if (!node[c]) break;
        node = node[c];
        if (node.isEndOfWord) return true;
      }
    }
    return false;
  }
}

// O(1) LRU 快取
class HighPerformanceLRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = { key: null, value: null, prev: null, next: null };
    this.tail = { key: null, value: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this._hitCount = 0;
    this._missCount = 0;
  }
  _addToHead(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }
  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  _moveToHead(node) {
    this._removeNode(node);
    this._addToHead(node);
  }
  _popTail() {
    const last = this.tail.prev;
    this._removeNode(last);
    return last;
  }
  get(key) {
    const node = this.cache.get(key);
    if (node) {
      this._hitCount++;
      this._moveToHead(node);
      return node.value;
    }
    this._missCount++;
    return null;
  }
  set(key, value) {
    const node = this.cache.get(key);
    if (node) {
      node.value = value;
      this._moveToHead(node);
    } else {
      const newNode = { key, value, prev: null, next: null };
      if (this.cache.size >= this.maxSize) {
        const tail = this._popTail();
        this.cache.delete(tail.key);
      }
      this.cache.set(key, newNode);
      this._addToHead(newNode);
    }
  }
  getHitRate() {
    const total = this._hitCount + this._missCount;
    return total > 0 ? (this._hitCount / total * 100).toFixed(2) : '0.00';
  }
}

// 智慧型快取
class SmartCacheManager {
  constructor() {
    this.primaryCache = new HighPerformanceLRUCache(800);
    this.frequencyCache = new HighPerformanceLRUCache(200);
    this.accessCount = new Map();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 300000;
  }
  get(key) {
    let result = this.frequencyCache.get(key);
    if (result !== null) return result;
    result = this.primaryCache.get(key);
    if (result !== null) {
      this._incrementAccess(key);
      return result;
    }
    return null;
  }
  set(key, value) {
    const count = this.accessCount.get(key) || 0;
    if (count > 3) {
      this.frequencyCache.set(key, value);
    } else {
      this.primaryCache.set(key, value);
    }
    this._cleanup();
  }
  _incrementAccess(key) {
    const count = (this.accessCount.get(key) || 0) + 1;
    this.accessCount.set(key, count);
    if (count > 3) {
      const value = this.primaryCache.get(key);
      if (value !== null) {
        this.frequencyCache.set(key, value);
      }
    }
  }
  _cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      for (const [k, cnt] of this.accessCount.entries()) {
        if (cnt < 2) this.accessCount.delete(k);
      }
      this.lastCleanup = now;
    }
  }
  getStats() {
    return {
      primaryHitRate: this.primaryCache.getHitRate(),
      frequencyHitRate: this.frequencyCache.getHitRate(),
      totalEntries: this.primaryCache.cache.size + this.frequencyCache.cache.size,
      accessEntries: this.accessCount.size
    };
  }
}

// 多層快取管理
class MultiLevelCacheManager {
  constructor() {
    this.l1DomainCache = new HighPerformanceLRUCache(256);
    this.l2SmartCache = new SmartCacheManager();
    this.lastCleanup = Date.now();
    this.cleanupInterval = 300000;
  }
  getDomainDecision(hostname) { return this.l1DomainCache.get(hostname); }
  setDomainDecision(hostname, decisionEnum) { this.l1DomainCache.set(hostname, decisionEnum); }
  getUrlDecision(key) { return this.l2SmartCache.get(key); }
  setUrlDecision(key, decision) { this.l2SmartCache.set(key, decision); }
  _cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.l2SmartCache._cleanup();
      this.lastCleanup = now;
    }
  }
  getStats() {
    return {
      l1DomainCacheHitRate: this.l1DomainCache.getHitRate(),
      l1DomainCacheSize: this.l1DomainCache.cache.size,
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
  drop: new OptimizedTrie(),
};

function initializeOptimizedTries() {
  const tasks = [
    () => CONFIG.TRACKING_PREFIXES.forEach(p => OPTIMIZED_TRIES.prefix.insert(String(p).toLowerCase())),
    () => CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => OPTIMIZED_TRIES.criticalPattern.insert(String(p).toLowerCase())),
    () => CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => OPTIMIZED_TRIES.pathBlock.insert(String(p).toLowerCase())),
    () => CONFIG.PATH_ALLOW_PATTERNS.forEach(p => OPTIMIZED_TRIES.allow.insert(String(p).toLowerCase())),
    () => CONFIG.DROP_KEYWORDS.forEach(p => OPTIMIZED_TRIES.drop.insert(String(p).toLowerCase()))
  ];
  tasks.forEach(fn => fn());
}

// 統計
class OptimizedPerformanceStats {
  constructor() {
    this.counters = new Uint32Array(16);
    this.labels = [
      'totalRequests', 'blockedRequests', 'criticalTrackingBlocked', 'domainBlocked',
      'pathBlocked', 'regexPathBlocked', 'paramsCleaned', 'whitelistHits',
      'errors', 'l1CacheHits', 'l2CacheHits', 'cacheMisses'
    ];
    this.startTime = __now__();
  }
  increment(type) {
    const idx = this.labels.indexOf(type);
    if (idx !== -1 && idx < this.counters.length) this.counters[idx]++;
  }
  getStats() {
    const runtime = ((__now__() - this.startTime) / 1000).toFixed(2);
    const stats = { runtime: `${runtime}s` };
    this.labels.forEach((label, idx) => {
      if (idx < this.counters.length) stats[label] = this.counters[idx];
    });
    return stats;
  }
  // 修正：以 totalRequests 與 blockedRequests 計算
  getBlockingRate() {
    const total = this.counters;   // totalRequests
    const blocked = this.counters[1]; // blockedRequests
    return total > 0 ? ((blocked / total) * 100).toFixed(2) : '0.00';
  }
}
const optimizedStats = new OptimizedPerformanceStats();

// 判定：關鍵追蹤腳本
function isOptimizedCriticalTrackingScript(lowerFullPath) {
  const cacheKey = `crit:${lowerFullPath}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) {
    optimizedStats.increment('l2CacheHits');
    return cached;
  }
  optimizedStats.increment('cacheMisses');

  const qIdx = lowerFullPath.indexOf('?');
  const pathOnly = qIdx !== -1 ? lowerFullPath.slice(0, qIdx) : lowerFullPath;
  const lastSlash = pathOnly.lastIndexOf('/');
  const scriptName = lastSlash !== -1 ? pathOnly.slice(lastSlash + 1) : pathOnly;

  let isBlocked = false;
  if (scriptName && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName)) {
    isBlocked = true;
  } else {
    isBlocked = OPTIMIZED_TRIES.criticalPattern.contains(lowerFullPath);
  }
  multiLevelCache.setUrlDecision(cacheKey, isBlocked);
  return isBlocked;
}

// 判定：API 白名單（強化：逐層 suffix 比對）
function isOptimizedApiWhitelisted(hostname) {
  if (CONFIG.API_WHITELIST_EXACT.has(hostname)) return true;
  let h = hostname;
  while (true) {
    const dot = h.indexOf('.');
    if (dot === -1) break;
    h = h.slice(dot + 1);
    if (CONFIG.API_WHITELIST_WILDCARDS.has(h)) return true;
  }
  // 再檢查一次完整主機（少數清單可能列全名）
  return CONFIG.API_WHITELIST_WILDCARDS.has(hostname);
}

// 判定：域名黑名單（逐層右縮）
function isOptimizedDomainBlocked(hostname) {
  let current = hostname;
  while (current) {
    if (CONFIG.BLOCK_DOMAINS.has(current)) return true;
    const idx = current.indexOf('.');
    if (idx === -1) break;
    current = current.slice(idx + 1);
  }
  return false;
}

// 判定：關鍵字路徑
function isOptimizedPathBlocked(lowerFullPath) {
  const cacheKey = `path:${lowerFullPath}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) {
    optimizedStats.increment('l2CacheHits');
    return cached;
  }
  optimizedStats.increment('cacheMisses');

  let result = false;
  if (OPTIMIZED_TRIES.pathBlock.contains(lowerFullPath)) {
    if (!OPTIMIZED_TRIES.allow.contains(lowerFullPath)) {
      result = true;
    }
  }
  multiLevelCache.setUrlDecision(cacheKey, result);
  return result;
}

// 判定：Regex 路徑
function isOptimizedPathBlockedByRegex(lowerPathnameOnly) {
  const cacheKey = `regex:${lowerPathnameOnly}`;
  const cached = multiLevelCache.getUrlDecision(cacheKey);
  if (cached !== null) {
    optimizedStats.increment('l2CacheHits');
    return cached;
  }
  optimizedStats.increment('cacheMisses');

  for (let i = 0; i < CONFIG.PATH_BLOCK_REGEX.length; i++) {
    if (CONFIG.PATH_BLOCK_REGEX[i].test(lowerPathnameOnly)) {
      multiLevelCache.setUrlDecision(cacheKey, true);
      return true;
    }
  }
  multiLevelCache.setUrlDecision(cacheKey, false);
  return false;
}

// 清理追蹤參數
function optimizedCleanTrackingParams(url) {
  const toDelete = [];
  for (const key of url.searchParams.keys()) {
    const lowerKey = key.toLowerCase();
    if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;
    if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || OPTIMIZED_TRIES.prefix.startsWith(lowerKey)) {
      toDelete.push(key);
    }
  }
  if (toDelete.length > 0) {
    toDelete.forEach(k => url.searchParams.delete(k));
    return true;
  }
  return false;
}

// 產生攔截回應
function getOptimizedBlockResponse(originalFullPath) {
  const lowerFullPath = originalFullPath.toLowerCase();
  if (OPTIMIZED_TRIES.drop.contains(lowerFullPath)) return DROP_RESPONSE;
  const lastDot = originalFullPath.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = originalFullPath.slice(lastDot).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
  }
  return REJECT_RESPONSE;
}

// 主要處理流程
function processOptimizedRequest(request) {
  try {
    optimizedStats.increment('totalRequests');

    // 基礎校驗
    if (!request || !request.url || typeof request.url !== 'string' || request.url.length < 10) {
      return null;
    }

    let url;
    try {
      url = new URL(request.url);
    } catch (e) {
      optimizedStats.increment('errors');
      if (typeof console !== 'undefined' && console.error) {
        console.error(`[URL-Filter-v38.2] URL 解析失敗: "${request.url}", 錯誤: ${e.message}`);
      }
      return null;
    }

    const hostname = url.hostname.toLowerCase();

    // L1 快取：只對 BLOCK 短路，不對 ALLOW 短路（避免永久放行）
    const l1Decision = multiLevelCache.getDomainDecision(hostname);
    if (l1Decision !== null) {
      optimizedStats.increment('l1CacheHits');
      if (l1Decision === DECISION.BLOCK) {
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getOptimizedBlockResponse(url.pathname + url.search);
      }
      // 其他決策（如 PARAM_CLEAN）不短路，繼續往下檢查
    }

    // 域名級判斷
    if (isOptimizedDomainBlocked(hostname)) {
      multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      optimizedStats.increment('domainBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(url.pathname + url.search);
    }

    // API 白名單（完全豁免）
    if (isOptimizedApiWhitelisted(hostname)) {
      optimizedStats.increment('whitelistHits');
      return null;
    }

    // URL 級
    const originalFullPath = url.pathname + url.search;
    const lowerPathnameOnly = url.pathname.toLowerCase();
    const lowerFullPath = originalFullPath.toLowerCase();

    // 關鍵追蹤腳本
    if (isOptimizedCriticalTrackingScript(lowerFullPath)) {
      // 仍採用網域 BLOCK 快取以提速；若需降低過封，可改為僅 URL 級快取或加 TTL
      multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      optimizedStats.increment('criticalTrackingBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // 關鍵字路徑
    if (isOptimizedPathBlocked(lowerFullPath)) {
      multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      optimizedStats.increment('pathBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // Regex 路徑
    if (isOptimizedPathBlockedByRegex(lowerPathnameOnly)) {
      multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
      optimizedStats.increment('regexPathBlocked');
      optimizedStats.increment('blockedRequests');
      return getOptimizedBlockResponse(originalFullPath);
    }

    // 參數清洗
    const initialSearch = url.search;
    if (optimizedCleanTrackingParams(url)) {
      if (url.search !== initialSearch) {
        // 不對 ALLOW 進行網域層快取，僅回覆導向
        optimizedStats.increment('paramsCleaned');
        return REDIRECT_RESPONSE(url.toString());
      }
    }

    // 不再在流程結尾寫入 ALLOW（避免永久放行整域）
    return null;

  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v38.2] 處理請求 "${request && request.url}" 時發生錯誤: ${error && error.message}`, error && error.stack);
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
        $done({
          version: '38.2',
          status: 'ready',
          message: 'URL Filter v38.2 - Engine Hardening Fixes & Allow-Scope Tightening',
          stats,
          cache: cacheStats
        });
      }
      return;
    }

    const result = processOptimizedRequest($request);
    if (typeof $done !== 'undefined') {
      $done(result || {});
    }

  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v38.2] 致命錯誤: ${error && error.message}`, error && error.stack);
    }
    if (typeof $done !== 'undefined') {
      $done({});
    }
  }
})();
