/**
 * @file        URL-Ultimate-Filter-Surge-V39.0.js
 * @version     39.0 (Granular Whitelisting & Precision Refactoring)
 * @description 基於 V38.3 的回饋進行全面重構。引入「硬白名單」與「軟白名單」分層控制，大幅降低域名封鎖的破壞面，
 * 並對多項黑名單規則進行精準化處理，顯著減少對正常網站的影響，同時強化了重導與快取邏_輯的穩健性。
 * @author      Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-09-09
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION                                             #
// #                      (使用者可在此區域安全地新增、修改或移除規則)                                 #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
  /**
   * ✳️ 硬白名單 (Hard Whitelist)
   * 說明：完全豁免所有檢查，適用於支付、登入等絕對不能出錯的核心服務。
   */
  HARD_WHITELIST_DOMAINS: new Set([
    // --- 支付 & 金流 (絕對優先) ---
    'api.stripe.com', 'api.paypal.com', 'api.adyen.com', 'api.braintreegateway.com', 'payment.ecpay.com.tw',
    // --- 銀行服務 ---
    'netbank.bot.com.tw', 'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw',
    'mma.sinopac.com', 'richart.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw', 'ebank.taipeifubon.com.tw',
    'nbe.standardchartered.com.tw',
    // --- 核心登入 & 認證 ---
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'okta.com', 'auth0.com', 'sso.godaddy.com'
  ]),

  /**
   * ✅ 軟白名單 (Soft Whitelist / API 功能性域名)
   * 說明：豁免「域名」與「路徑」層級的封鎖，但仍會執行「參數清理」與「關鍵腳本攔截」。
   * 適用於功能性 API、CDN 或可能被誤判的服務。
   */
  SOFT_WHITELIST_EXACT: new Set([
    // --- 主流服務 API ---
    'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
    'open.spotify.com', 'api.github.com', 'api.openai.com', 'api.anthropic.com', 'a-api.anthropic.com', 'api.cohere.ai',
    'gemini.google.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
    // --- 開發 & 部署平台 ---
    'api.vercel.com', 'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
    'database.windows.net', 'auth.docker.io', 'login.docker.com', 'api.cloudflare.com', 'api.fastly.com',
    // --- 生產力 & 協作工具 ---
    'api.notion.com', 'api.figma.com', 'api.trello.com', 'api.asana.com', 'api.dropboxapi.com', 'clorasio.atlassian.net',
    // --- 台灣地區服務 ---
    'api.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
    'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com',
    'api.irentcar.com.tw', 'usiot.roborock.com', 'cmapi.tw.coupang.com',
    // --- 其他常用 API ---
    'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', 'hooks.slack.com', 'api.pagerduty.com',
    'api.zendesk.com', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
    'duckduckgo.com', 'external-content.duckduckgo.com'
  ]),

  SOFT_WHITELIST_WILDCARDS: new Map([
    // --- 核心服務 & CDN ---
    ['youtube.com', true], ['m.youtube.com', true], ['googlevideo.com', true], ['paypal.com', true],
    ['stripe.com', true], ['apple.com', true], ['icloud.com', true], ['windowsupdate.com', true],
    ['update.microsoft.com', true], ['amazonaws.com', true], ['cloudfront.net', true], ['fastly.net', true],
    ['akamaihd.net', true], ['cloudflare.com', true], ['jsdelivr.net', true], ['unpkg.com', true],
    ['cdnjs.cloudflare.com', true], ['gstatic.com', true], ['fbcdn.net', true], ['twimg.com', true],
    // --- 閱讀器 & 新聞 ---
    ['inoreader.com', true], ['theoldreader.com', true], ['newsblur.com', true], ['flipboard.com', true], ['itofoo.com', true],
    // --- 開發 & 部署平台 ---
    ['github.io', true], ['gitlab.io', true], ['windows.net', true], ['pages.dev', true], ['vercel.app', true],
    ['netlify.app', true], ['azurewebsites.net', true], ['cloudfunctions.net', true], ['oraclecloud.com', true],
    ['digitaloceanspaces.com', true],
    // --- 認證 ---
    ['atlassian.net', true],
    // --- 網站相容性 ---
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
   * 🚫 域名攔截黑名單 (精簡化)
   * 說明：僅列出根域名，子域名會自動匹配。
   */
  BLOCK_DOMAINS: new Set([
    // --- Google / DoubleClick ---
    'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com', 'googlesyndication.com',
    'admob.com', 'adsense.com', 'app-measurement.com', 'adservice.google.com',
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
    'clicky.com', 'statcounter.com', 'quantserve.com', 'comscore.com', 'tealium.com',
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
    'thetradedesk.com', 'bluekai.com', 'amazon-adsystem.com', 'adserver.yahoo.com', 'ads.yahoo.com', 'analytics.yahoo.com',
    'geo.yahoo.com',
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
    'guoshipartners.com', 'sitetag.us', 'imedia.com.tw', 'ettoday.net', 'pixnet.net',
    'pchome.com.tw', 'momo.com.tw', 'xuite.net', 'cna.com.tw', 'cw.com.tw',
    'hi-on.org', 'chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com',
    'tenmax.io', 'aotter.net', 'funp.com', 'ruten.com.tw', 'books.com.tw', 'etmall.com.tw',
    'friday.tw', 'ad-hub.net', 'adgeek.net', 'shopee.tw',
    // --- 中國大陸地區 ---
    'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn', 'baidu.com',
    'qq.com', 'tencent.com', 'tanx.com', 'alimama.com', 'mmstat.com',
    'getui.com', 'jpush.cn', 'jiguang.cn', 'gridsum.com', 'admaster.com.cn', 'miaozhen.com',
    'kuaishou.com', 'pangolin-sdk-toutiao.com', 'zhugeio.com', 'growingio.com', 'youmi.net', 'adview.cn', 'igexin.com',
    // --- 其他 ---
    'wcs.naver.net', 'adnx.com', 'rlcdn.com', 'revjet.com',
    'tiktok.com', 'snapchat.com', 'sc-static.net', 'pinterest.com',
    'twitter.com', 'youtube.com', 'cint.com',
  ]),

  /**
   * 🚨 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js',
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js',
    'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js',
    'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js',
    'inspectlet.js', 'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js',
    'outbrain.js', 'taboola.js', 'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js',
    'collect.js', 'activity.js', 'conversion.js', 'action.js', 'abtasty.js', 'cmp.js',
    'sp.js', 'adobedtm.js', 'visitorapi.js', 'intercom.js', 'link-click-tracker.js',
    'user-timing.js', 'cf.js', 'tagtoo.js', 'wcslog.js', 'ads-beacon.js', 'essb-core.min.js',
    'hm.js', 'u.js', 'um.js', 'aplus.js', 'aplus_wap.js', 'gdt.js', 'tiktok-pixel.js',
    'tiktok-analytics.js', 'pangle.js', 'ec.js', 'autotrack.js', 'capture.js', 'user-id.js',
    'adroll.js', 'adroll_pro.js', 'quant.js', 'quantcast.js', 'comscore.js', 'dax.js',
    'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js', 'perf.js',
    'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js', 'ad-manager.js',
    'ad-player.js', 'ad-lib.js', 'ad-core.js'
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATTERNS: new Set([
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/',
    'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', '/ads/ga-audiences',
    'facebook.com/tr', 'facebook.com/tr/', '/collect?', '/track/', '/beacon/', '/pixel/', '/telemetry/',
    '/api/log/', '/api/track/', '/api/collect/', '/api/v1/track', '/intake', '/api/batch',
    'scorecardresearch.com/beacon.js', 'analytics.twitter.com', 'ads.linkedin.com/li/track', 'px.ads.linkedin.com',
    'amazon-adsystem.com/e/ec', 'ads.yahoo.com/pixel', 'ads.bing.com/msclkid', 'segment.io/v1/track',
    'heap.io/api/track', 'api.mixpanel.com/track', 'api.amplitude.com', 'api-iam.intercom.io/messenger/web/events',
    'api.hubspot.com/events', '/plugins/easy-social-share-buttons/', 'hm.baidu.com/hm.js', 'cnzz.com/stat.php',
    'wgo.mmstat.com', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg', '/abtesting/', '/feature-flag/',
    '/user-profile/', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m', '/track/pc', '/v1/pixel',
    'ads.tiktok.com/i1n/pixel/events.js', 'ads-api.tiktok.com/api/v2/pixel', 'analytics.snapchat.com/v1/batch',
    'tr.snapchat.com', 'sc-static.net/scevent.min.js', 'ads.pinterest.com/v3/conversions/events',
    'ad.360yield.com', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/',
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
    '/telemetry/', '/measurement/', '/insight/', '/intelligence/', '/monitor/', '/monitoring/', '/audit/',
    '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/', '/reports/', '/reporting/',
    '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', '/stacktrace/', 'web-vitals',
    'performance-tracking', 'real-user-monitoring', 'user-analytics', 'behavioral-targeting',
    'data-collection', 'data-sync', 'fingerprint', 'fingerprinting', 'third-party-cookie', 'user-cohort',
    'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'user-behavior', 'session-replay',
    'google-analytics', 'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano',
    'onead', 'sailthru', 'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'utag.js',
    'cookiepolicy', 'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'privacy-policy', 'cookie-consent'
  ]),
    
  /**
   * ✅ [新增] 路徑前綴白名單
   * 說明：用於豁免正則表達式封鎖，避免誤殺 SPA/CDN 的合法資源。
   */
  PATH_ALLOW_PREFIXES: new Set([
      '/.well-known/'
  ]),

  /**
   * ✅ 路徑關鍵字白名單
   */
  PATH_ALLOW_PATTERNS: new Set([
    'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
    'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js', 'index.mjs',
    'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css',
    'badge.svg', 'modal.js', 'card.js', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt',
    'page-data.js', 'legacy.js', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---',
    '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/',
    'theme.js', 'config.js', 'web.config',
    // --- [收斂] 避免 /blog, /catalog, /dialog 等被誤殺 ---
    'blog', 'catalog', 'dialog', 'login'
  ]),

  /**
   * 💧 直接拋棄請求 (DROP) 的關鍵字 (收斂版)
   * 說明：改為更精準的匹配，需包含分隔符或位於詞界，避免誤殺。
   */
  DROP_KEYWORDS: new Set([
    // --- 日誌 & 遙測 ---
    '/log/', '/logs/', '/logging/', '.log', '?log=', '-log.', 'log-event', 'amp-analytics', 'beacon',
    'collect?', 'collector', 'telemetry', 'ingest', 'live-log', 'realtime-log', 'data-pipeline',
    'rum', 'intake', 'batch', 'client-event', 'server-event', 'heartbeat', 'web-vitals',
    // --- 錯誤 & 診斷 ---
    'crash-report', 'error-report', 'stacktrace', 'csp-report', 'profiler', 'trace.json',
    'diagnostic.log', '/diag/', '?diag='
  ]),

  /**
   * 🗑️ 全域追蹤參數黑名單
   */
  GLOBAL_TRACKING_PARAMS: new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic', 'gclid', 'dclid',
    'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'gad', 'gcl_au', '_ga', '_gid', '_gat', '__gads', '__gac',
    'msclkid', 'msad', 'mscampaignid', 'msadgroupid', 'fbclid', 'fbadid', 'fbcampaignid',
    'fbadsetid', 'fbplacementid', 'igshid', 'igsh', 'x-threads-app-object-id', 'mibextid',
    'yclid', 'twclid', 'ttclid', 'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok', 'zanpid',
    'affid', 'affiliate_id', 'partner_id', 'sub_id', 'transaction_id', 'customid', 'click_id',
    'clickid', 'offer_id', 'promo_code', 'coupon_code', 'deal_id', 'rb_clickid', 's_kwcid', 'ef_id',
    'email_source', 'email_campaign', 'from', 'source', 'ref', 'referrer', 'campaign', 'medium',
    'content', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat', 'share_id', 'share_tag',
    'from_source', 'from_channel', 'from_uid', 'from_user', 'tt_from', 'tt_medium', 'tt_campaign',
    'share_token', 'share_app_id', 'xhsshare', 'xhs_share', 'app_platform', 'share_from', 'weibo_id',
    'wechat_id', 'is_copy_url', 'is_from_webapp', 'pvid', 'fr', 'type', 'scene', 'traceid',
    'request_id', '__twitter_impression', '_openstat', 'hsCtaTracking', 'hsa_acc', 'hsa_cam', 'hsa_grp',
    'hsa_ad', 'hsa_src', 'vero_conv', 'vero_id', 'ck_subscriber_id', 'action_object_map',
    'action_type_map', 'action_ref_map', 'feature', 'src', 'si', 'trk', 'trk_params', 'epik',
    'piwik_campaign', 'piwik_kwd', 'matomo_campaign', 'matomo_kwd', '_bta_c', '_bta_tid', 'oly_anon_id',
    'oly_enc_id', 'redirect_log_mongo_id', 'redirect_mongo_id', 'sb_referer_host', 'ecid', 'from_ad',
    'from_search', 'from_promo', 'camid', 'cupid', 'hmsr', 'hmpl', 'hmcu', 'hmkw', 'hmci',
    'union_id', 'biz', 'mid', 'idx', 'ad_id', 'adgroup_id', 'campaign_id', 'creative_id',
    'keyword', 'matchtype', 'device', 'devicemodel', 'adposition', 'network', 'placement',
    'targetid', 'feeditemid', 'loc_physical_ms', 'loc_interest_ms', 'creative', 'adset', 'ad',
    'pixel_id', 'event_id', 'algolia_query', 'algolia_query_id', 'algolia_object_id', 'algolia_position'
  ]),

  /**
   * 追蹤參數前綴集合
   */
  TRACKING_PREFIXES: new Set([
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_', 'hsa_', 'ad_', 'trk_',
    'spm_', 'scm_', 'bd_', 'video_utm_', 'vero_', '__cf_', '_hs', 'pk_', 'mtm_', 'campaign_', 'source_',
    'medium_', 'content_', 'term_', 'creative_', 'placement_', 'network_', 'device_', 'ref_', 'from_',
    'share_', 'aff_', 'alg_', 'li_', 'tt_', 'tw_', 'epik_', '_bta_', '_bta', '_oly_', 'cam_', 'cup_',
    'gdr_', 'gds_', 'et_', 'hmsr_', 'zanpid_', '_ga_', '_gid_', '_gat_', 's_'
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
    /^\/((?!_next\/static\/|static\/|assets\/)[a-z0-9]{12,})\.js$/i, // 根目錄長雜湊 js (排除靜態目錄)
    /[^\/]*sentry[^\/]*\.js/i,        // 檔名含 sentry 且以 .js 結尾
    /\/v\d+\/event/i                   // 通用事件API版本 (如 /v1/event, /v2/event)
  ],
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 OPTIMIZED CORE ENGINE (V39.0)                                  #
// #                                                                                               #
// #################################################################################################

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, PARAM_CLEAN: 3, SOFT_WHITELISTED: 4 });

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);

class OptimizedTrie {
  constructor() { this.root = Object.create(null); }
  insert(word) { let n = this.root; for (let i = 0; i < word.length; i++) { const c = word[i]; n = n[c] || (n[c] = Object.create(null)); } n.isEndOfWord = true; }
  startsWith(prefix) { let n = this.root; for (let i = 0; i < prefix.length; i++) { const c = prefix[i]; if (!n[c]) return false; n = n[c]; if (n.isEndOfWord) return true; } return false; }
  contains(text) { const N = text.length; for (let i = 0; i < N; i++) { let n = this.root; for (let j = i; j < N; j++) { const c = text[j]; if (!n[c]) break; n = n[c]; if (n.isEndOfWord) return true; } } return false; }
}

class HighPerformanceLRUCache {
    constructor(maxSize = 1000) { this.maxSize = maxSize; this.cache = new Map(); this.head = { k: null, v: null, p: null, n: null }; this.tail = { k: null, v: null, p: null, n: null }; this.head.n = this.tail; this.tail.p = this.head; this._h = 0; this._m = 0; }
    _add(node) { node.p = this.head; node.n = this.head.n; this.head.n.p = node; this.head.n = node; }
    _remove(node) { node.p.n = node.n; node.n.p = node.p; }
    _moveToHead(node) { this._remove(node); this._add(node); }
    _popTail() { const last = this.tail.p; this._remove(last); return last; }
    get(key) { const n = this.cache.get(key); if (n) { this._h++; this._moveToHead(n); return n.v; } this._m++; return null; }
    set(key, value) { let n = this.cache.get(key); if (n) { n.v = value; this._moveToHead(n); } else { n = { k: key, v: value, p: null, n: null }; if (this.cache.size >= this.maxSize) { const tail = this._popTail(); this.cache.delete(tail.k); } this.cache.set(key, n); this._add(n); } }
}

class MultiLevelCacheManager {
  constructor() { this.l1DomainCache = new HighPerformanceLRUCache(256); this.l2UrlDecisionCache = new HighPerformanceLRUCache(1024); this.urlObjectCache = new HighPerformanceLRUCache(64); }
  getDomainDecision(h) { return this.l1DomainCache.get(h); }
  setDomainDecision(h, d) { this.l1DomainCache.set(h, d); }
  getUrlDecision(k) { return this.l2UrlDecisionCache.get(k); }
  setUrlDecision(k, d) { this.l2UrlDecisionCache.set(k, d); }
  getUrlObject(rawUrl) { return this.urlObjectCache.get(rawUrl); }
  setUrlObject(rawUrl, urlObj) { this.urlObjectCache.set(rawUrl, urlObj); }
}

const multiLevelCache = new MultiLevelCacheManager();
const OPTIMIZED_TRIES = { prefix: new OptimizedTrie(), criticalPattern: new OptimizedTrie(), pathBlock: new OptimizedTrie(), allow: new OptimizedTrie(), drop: new OptimizedTrie() };

function initializeOptimizedTries() {
  CONFIG.TRACKING_PREFIXES.forEach(p => OPTIMIZED_TRIES.prefix.insert(String(p).toLowerCase()));
  CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => OPTIMIZED_TRIES.criticalPattern.insert(String(p).toLowerCase()));
  CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => OPTIMIZED_TRIES.pathBlock.insert(String(p).toLowerCase()));
  CONFIG.PATH_ALLOW_PATTERNS.forEach(p => OPTIMIZED_TRIES.allow.insert(String(p).toLowerCase()));
  CONFIG.DROP_KEYWORDS.forEach(p => OPTIMIZED_TRIES.drop.insert(String(p).toLowerCase()));
}

class OptimizedPerformanceStats {
    constructor() { this.counters = new Uint32Array(16); this.labels = ['totalRequests', 'blockedRequests', 'domainBlocked', 'pathBlocked', 'regexPathBlocked', 'criticalScriptBlocked', 'paramsCleaned', 'hardWhitelistHits', 'softWhitelistHits', 'errors', 'l1CacheHits', 'l2CacheHits', 'urlCacheHits']; }
    increment(type) { const idx = this.labels.indexOf(type); if (idx !== -1) this.counters[idx]++; }
    getStats() { const stats = {}; this.labels.forEach((l, i) => { stats[l] = this.counters[i]; }); return stats; }
}
const optimizedStats = new OptimizedPerformanceStats();

function isHardWhitelisted(h) { return CONFIG.HARD_WHITELIST_DOMAINS.has(h); }
function isSoftWhitelisted(h) { if (CONFIG.SOFT_WHITELIST_EXACT.has(h)) return true; let current = h; while (true) { const d = current.indexOf('.'); if (d === -1) break; current = current.slice(d + 1); if (CONFIG.SOFT_WHITELIST_WILDCARDS.has(current)) return true; } return CONFIG.SOFT_WHITELIST_WILDCARDS.has(h); }
function isDomainBlocked(h) { let c = h; while (c) { if (CONFIG.BLOCK_DOMAINS.has(c)) return true; const i = c.indexOf('.'); if (i === -1) break; c = c.slice(i + 1); } return false; }
function isCriticalTrackingScript(path) { const k = `crit:${path}`; const c = multiLevelCache.getUrlDecision(k); if (c !== null) return c; const q = path.indexOf('?'); const p = q !== -1 ? path.slice(0, q) : path; const s = p.lastIndexOf('/'); const n = s !== -1 ? p.slice(s + 1) : p; let b = false; if (n && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(n)) { b = true; } else { b = OPTIMIZED_TRIES.criticalPattern.contains(path); } multiLevelCache.setUrlDecision(k, b); return b; }
function isPathBlocked(path) { const k = `path:${path}`; const c = multiLevelCache.getUrlDecision(k); if (c !== null) return c; let r = false; if (OPTIMIZED_TRIES.pathBlock.contains(path) && !OPTIMIZED_TRIES.allow.contains(path)) { r = true; } multiLevelCache.setUrlDecision(k, r); return r; }
function isPathBlockedByRegex(path) { const k = `regex:${path}`; const c = multiLevelCache.getUrlDecision(k); if (c !== null) return c; for (const prefix of CONFIG.PATH_ALLOW_PREFIXES) { if (path.startsWith(prefix)) { multiLevelCache.setUrlDecision(k, false); return false; } } for (let i = 0; i < CONFIG.PATH_BLOCK_REGEX.length; i++) { if (CONFIG.PATH_BLOCK_REGEX[i].test(path)) { multiLevelCache.setUrlDecision(k, true); return true; } } multiLevelCache.setUrlDecision(k, false); return false; }
function getBlockResponse(path) { const lower = path.toLowerCase(); if (OPTIMIZED_TRIES.drop.contains(lower)) return DROP_RESPONSE; const dot = path.lastIndexOf('.'); if (dot !== -1) { const ext = path.slice(dot).toLowerCase(); if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE; } return REJECT_RESPONSE; }

function cleanTrackingParams(url) {
    // 複製一份新的 URL 物件進行操作，確保快取中的物件不可變
    const newUrl = new URL(url.toString());
    let modified = false;
    const toDelete = [];

    for (const key of newUrl.searchParams.keys()) {
        const lowerKey = key.toLowerCase();
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;
        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || OPTIMIZED_TRIES.prefix.startsWith(lowerKey)) {
            toDelete.push(key);
            modified = true;
        }
    }

    if (modified) {
        toDelete.forEach(k => newUrl.searchParams.delete(k));
        // [新增] 附加防循環旗標
        newUrl.searchParams.set('cleaned', '1');
        return newUrl.toString();
    }
    return null;
}

function processRequest(request) {
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
            multiLevelCache.setUrlObject(rawUrl, Object.freeze(url)); // 凍結物件使其不可變
        } catch (e) {
            optimizedStats.increment('errors');
            console.error(`[URL-Filter-v39.0] URL 解析失敗: "${rawUrl}", 錯誤: ${e.message}`);
            return null;
        }
    }
    
    // [新增] 防重導循環檢查
    if (url.searchParams.has('cleaned')) {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    
    // 階段 1: 硬白名單檢查 (最高優先級)
    if (isHardWhitelisted(hostname)) {
        optimizedStats.increment('hardWhitelistHits');
        return null;
    }
    
    // 階段 2: 域名級封鎖檢查
    const l1Decision = multiLevelCache.getDomainDecision(hostname);
    if (l1Decision === DECISION.BLOCK) {
        optimizedStats.increment('l1CacheHits');
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(url.pathname + url.search);
    }
    
    // [調整] 僅對明確在黑名單的域名進行 L1 快取，降低破壞面
    if (isDomainBlocked(hostname)) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(url.pathname + url.search);
    }
    
    const originalFullPath = url.pathname + url.search;
    const lowerFullPath = originalFullPath.toLowerCase();

    // 階段 3: 關鍵腳本攔截 (即使在軟白名單內也執行)
    if (isCriticalTrackingScript(lowerFullPath)) {
        optimizedStats.increment('criticalScriptBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(originalFullPath);
    }
    
    // 階段 4: 軟白名單檢查
    if (isSoftWhitelisted(hostname)) {
        optimizedStats.increment('softWhitelistHits');
        // 豁免後續的路徑封鎖，但會繼續進行參數清理
    } else {
        // 階段 5: 路徑與正則封鎖 (僅對非軟白名單域名執行)
        if (isPathBlocked(lowerFullPath)) {
            optimizedStats.increment('pathBlocked');
            optimizedStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }
        if (isPathBlockedByRegex(url.pathname.toLowerCase())) {
            optimizedStats.increment('regexPathBlocked');
            optimizedStats.increment('blockedRequests');
            return getBlockResponse(originalFullPath);
        }
    }
    
    // 階段 6: 參數清理 (對所有未被硬白名單或封鎖的請求執行)
    const cleanedUrl = cleanTrackingParams(url);
    if (cleanedUrl) {
        optimizedStats.increment('paramsCleaned');
        return REDIRECT_RESPONSE(cleanedUrl);
    }
    
    return null;

  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v39.0] 處理請求 "${request?.url}" 時發生錯誤: ${error?.message}`, error?.stack);
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
        $done({ version: '39.0', status: 'ready', message: 'URL Filter v39.0 - Granular Whitelisting & Precision Refactoring', stats: optimizedStats.getStats() });
      }
      return;
    }
    const result = processRequest($request);
    if (typeof $done !== 'undefined') $done(result || {});
  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v39.0] 致命錯誤: ${error?.message}`, error?.stack);
    }
    if (typeof $done !== 'undefined') $done({});
  }
})();
