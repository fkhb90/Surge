/**
 * @file        URL-Ultimate-Filter-Surge-V40.22.js
 * @version     40.22 (Syntax Correction)
 * @description 修正 BLOCK_DOMAINS 列表中因遺漏逗號而導致部分域名攔截規則失效的嚴重語法錯誤。
 * @author      Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-09-12
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION                                             #
// #                      (使用者在此區域安全地新增、修改或移除規則)                                 #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
  /**
   * ✳️ 硬白名單 - 精確匹配 (Hard Whitelist - Exact)
   * 說明：完全豁免所有檢查。此處的域名需要完整且精確的匹配。
   */
  HARD_WHITELIST_EXACT: new Set([
    // --- AI & Search Services ---
    'chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'private-us-east-1.monica.im',
    // --- Business & Developer Tools ---
    'adsbypasser.github.io', 'code.createjs.com', 'nextdns.io', 'oa.ledabangong.com', 'oa.qianyibangong.com', 'qianwen.aliyun.com',
    'raw.githubusercontent.com', 'reportaproblem.apple.com', 'ss.ledabangong.com', 'userscripts.adtidy.org',
    // --- Meta / Facebook ---
    'ar-genai.graph.meta.com', 'ar.graph.meta.com', 'gateway.facebook.com', 'meta-ai-realtime.facebook.com', 'meta.graph.meta.com', 'wearable-ai-realtime.facebook.com',
    // --- Media & CDNs ---
    'cdn.ghostery.com', 'cdn.shortpixel.ai', 'cdn.syndication.twimg.com', 'd.ghostery.com', 'data-cloud.flightradar24.com', 'ssl.p.jwpcdn.com',
    // --- Services & App APIs ---
    'ap02.in.treasuredata.com', 'appapi.104.com.tw', 'eco-push-api-client.meiqia.com', 'exp.acsnets.com.tw', 'mpaystore.pcstore.com.tw',
    'mushroomtrack.com', 'phtracker.com', 'pro.104.com.tw', 'prodapp.babytrackers.com', 'sensordata.open.com.cn', 'static.stepfun.com', 'track.fstry.me',
    // --- 核心登入 & 認證 ---
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'sso.godaddy.com',
    // --- 台灣地區服務 ---
    'api.etmall.com.tw', 'tw.fd-api.com',
    // --- 支付 & 金流 API ---
    'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw', 'api.jkos.com', 'payment.ecpay.com.tw',
    // --- 票務 & 關鍵 API ---
    'api.line.me', 'kktix.com', 'tixcraft.com',
    // --- 高互動性服務 API ---
    'api.discord.com', 'api.twitch.tv', 'graph.instagram.com', 'graph.threads.net', 'i.instagram.com', 'open.spotify.com',
    'iappapi.investing.com',
    // --- YouTube 核心 API ---
    'youtubei.googleapis.com',
  ]),

  /**
   * ✳️ 硬白名單 - 萬用字元 (Hard Whitelist - Wildcards)
   * 說明：完全豁免所有檢查。此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  HARD_WHITELIST_WILDCARDS: new Set([
    // --- AI & Search Services ---
    // Financial, Banking & Payments ---
    'bot.com.tw', 'cathaybk.com.tw', 'cathaysec.com.tw', 'chb.com.tw', 'citibank.com.tw', 'ctbcbank.com', 'dawho.tw', 'dbs.com.tw',
    'esunbank.com.tw', 'firstbank.com.tw', 'fubon.com', 'hncb.com.tw', 'hsbc.co.uk', 'hsbc.com.tw', 'landbank.com.tw',
    'megabank.com.tw', 'megatime.com.tw', 'mitake.com.tw', 'money-link.com.tw', 'mymobibank.com.tw', 'paypal.com', 'richart.tw',
    'scsb.com.tw', 'sinopac.com', 'sinotrade.com.tw', 'standardchartered.com.tw', 'stripe.com', 'taipeifubon.com.tw', 'taishinbank.com.tw',
    'taiwanpay.com.tw', 'tcb-bank.com.tw', 'momopay.com.tw',
    // Government & Utilities ---
    'org.tw', 'gov.tw', 'pay.taipei', 'tdcc.com.tw', 'twca.com.tw', 'twmp.com.tw',
    // --- 核心登入 & 協作平台 ---
    'atlassian.net', 'auth0.com', 'okta.com', 'slack.com', 'googleapis.com',
    // --- 社群 & 電商平台 (根域名) ---
    'book.com.tw', 'citiesocial.com', 'coupang.com', 'iherb.biz', 'iherb.com', 'shopee.com', 'shopeemobile.com', 'shopee.tw',
    'pxmart.com.tw', 'pxpayplus.com', 'momoshop.com.tw', 'momo.dm',
    // --- 系統 & 平台核心服務 ---
    'apple.com', 'icloud.com', 'update.microsoft.com', 'windowsupdate.com', 'linksyssmartwifi.com',
    // --- 網頁存檔服務 (對參數極度敏感) ---
    'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com', 'perma.cc',
    'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'www.webarchive.org.uk',
    // --- YouTube 核心服務 ---
    'googlevideo.com', 'm.youtube.com', 'youtube.com',
  ]),

  /**
   * ✅ 軟白名單 - 精確匹配 (Soft Whitelist - Exact)
   * 說明：豁免「域名」與「路徑」層級的封鎖，但仍會執行「參數清理」與「關鍵腳本攔截」。
   */
  SOFT_WHITELIST_EXACT: new Set([
    // --- Common APIs ---
    'a-api.anthropic.com', 'api.anthropic.com', 'api.cohere.ai', 'api.github.com', 'api.hubapi.com',
    'api.mailgun.com', 'api.openai.com', 'api.pagerduty.com', 'api.sendgrid.com', 'api.telegram.org',
    'api.zendesk.com', 'duckduckgo.com', 'legy.line-apps.com', 'obs.line-scdn.net', 'secure.gravatar.com',
    // --- 生產力 & 協作工具 ---
    'api.asana.com', 'api.dropboxapi.com', 'api.figma.com', 'api.notion.com', 'api.trello.com',
    // --- 開發 & 部署平台 ---
    'api.cloudflare.com', 'api.digitalocean.com', 'api.fastly.com', 'api.heroku.com', 'api.netlify.com', 'api.vercel.com',
    'auth.docker.io', 'database.windows.net', 'firestore.googleapis.com', 'login.docker.com',
    // --- 台灣地區服務 ---
    'api.irentcar.com.tw', 'usiot.roborock.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元 (Soft Whitelist - Wildcards)
   * 說明：豁免「域名」與「路徑」層級的封鎖，但仍會執行「參數清理」與「關鍵腳本攔截」。此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    // --- 核心 CDN ---
    'akamaihd.net', 'amazonaws.com', 'cdnjs.cloudflare.com', 'cloudflare.com', 'cloudfront.net', 'fastly.net',
    'fbcdn.net', 'gstatic.com', 'jsdelivr.net', 'twimg.com', 'unpkg.com', 'ytimg.com',
    // --- Publishing & CMS ---
    'new-reporter.com', 'wp.com',
    // --- 閱讀器 & 新聞 ---
    'flipboard.com', 'inoreader.com', 'itofoo.com', 'newsblur.com', 'theoldreader.com',
    // --- 開發 & 部署平台 ---
    'azurewebsites.net', 'cloudfunctions.net', 'digitaloceanspaces.com', 'github.io', 'gitlab.io', 'netlify.app',
    'oraclecloud.com', 'pages.dev', 'vercel.app', 'windows.net',
    // --- 社群平台相容性 ---
    'instagram.com', 'threads.net',
  ]),

  /**
   * 🚫 [V40.16 擴充] 域名攔截黑名單
   * 說明：僅列出純粹用於廣告、追蹤或分析的域名。
   */
  BLOCK_DOMAINS: new Set([
    // --- Ad & Tracking CDNs ---
    'adnext-a.akamaihd.net', 'appnext.hs.llnwd.net', 'pgdt.gtimg.cn', 'toots-a.akamaihd.net', 'video-akpcw-cdn-spotify-com.akamaized.net',
    // --- Apple ---
    'app-site-association.cdn-apple.com', 'iadsdk.apple.com',
    // --- Baidu ---
    'afd.baidu.com', 'als.baidu.com', 'cpro.baidu.com', 'dlswbr.baidu.com', 'duclick.baidu.com', 'feed.baidu.com', 'hm.baidu.com',
    'hmma.baidu.com', 'h2tcbox.baidu.com', 'mobads.baidu.com', 'mobads-logs.baidu.com', 'nadvideo2.baidu.com', 'nsclick.baidu.com',
    'sp1.baidu.com', 'voice.baidu.com',
    // --- Google / DoubleClick ---
    'admob.com', 'adsense.com', 'adservice.google.com', 'app-measurement.com', 'doubleclick.net', 'google-analytics.com',
    'googleadservices.com', 'googlesyndication.com', 'googletagmanager.com', 'mtalk.google.com',
    // --- Facebook / Meta ---
    'connect.facebook.net', 'graph.facebook.com',
    // --- Tencent (QQ) ---
    '3gimg.qq.com', 'fusion.qq.com', 'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com', 'wup.imtt.qq.com',
    // --- Zhihu ---
    'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com', 'sugar.zhihu.com',
    // --- 平台內部追蹤 & 分析 ---
    'adeventtracker.spotify.com', 'log.felo.ai', 'log.spotify.com', 'spclient.wg.spotify.com', 'visuals.feedly.com',
    // --- 主流分析 & 追蹤服務 ---
    'adjust.com', 'adform.net', 'ads.linkedin.com', 'adsrvr.org', 'agn.aty.sohu.com', 'amplitude.com', 'analytics.line.me',
    'analytics.slashdotmedia.com', 'analytics.strava.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'api.pendo.io',
    'apm.gotokeep.com', 'applog.mobike.com', 'applog.uc.cn', 'appsflyer.com', 'branch.io', 'bugsnag.com', 'c.clarity.ms',
    'chartbeat.com', 'clicktale.net', 'clicky.com', 'cn-huabei-1-lg.xf-yun.com', 'comscore.com', 'crazyegg.com', 'criteo.com',
    'criteo.net', 'datadoghq.com',    'fullstory.com', 'gs.getui.com', 'heap.io', 'hotjar.com', 'inspectlet.com', 'keen.io',
    'kissmetrics.com', 'log.b612kaji.com', 'loggly.com', 'logrocket.com', 'matomo.cloud', 'mixpanel.com', 'mouseflow.com',
    'mparticle.com', 'newrelic.com', 'nr-data.net', 'oceanengine.com', 'openx.com', 'openx.net', 'optimizely.com', 'outbrain.com',
    'pc-mon.snssdk.com', 'piwik.pro', 'pubmatic.com', 'quantserve.com', 'rubiconproject.com', 'scorecardresearch.com', 'segment.com',
    'segment.io', 'semasio.net', 'sentry.io', 'sensorsdata.cn', 'snowplowanalytics.com', 'stat.m.jd.com', 'statcounter.com',
    'static.ads-twitter.com', 'sumo.com', 'sumome.com', 'taboola.com', 'tealium.com', 'track.tiara.daum.net', 'track.tiara.kakao.com',
    'track.hubspot.com', 'trackapp.guahao.cn', 'traffic.mogujie.com', 'vwo.com', 'wmlog.meituan.com', 'yieldlab.net', 'zgsdk.zhugeio.com',
    // --- 廣告驗證 & 可見度追蹤 ---
    'doubleverify.com', 'iasds.com', 'moat.com', 'moatads.com', 'serving-sys.com', 'sdk.iad-07.braze.com',
    // --- 客戶數據平台 (CDP) & 身分識別 ---
    'agkn.com', 'id5-sync.com', 'liveramp.com', 'permutive.com', 'tags.tiqcdn.com',
    // --- CDP & 行銷自動化 ---
    'klaviyo.com', 'marketo.com', 'mktoresp.com', 'pardot.com',
    // --- Mobile & Performance ---
    'instana.io', 'kochava.com', 'launchdarkly.com', 'raygun.io', 'singular.net',
    // --- 主流廣告聯播網 & 平台 ---
    'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad.12306.cn', 'ad.360in.com', 'ad.51wnl-cq.com', 'ad.api.3g.youku.com', 'ad.caiyunapp.com', 'ad.huajiao.com',
    'ad.hzyoka.com', 'ad.jiemian.com', 'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'ad-cn.jovcloud.com', 'adcolony.com',
    'adextra.51wnl-cq.com', 'adroll.com', 'ads.adadapted.com', 'ads.daydaycook.com.cn', 'ads.mopub.com', 'ads.weilitoutiao.net',
    'ads.yahoo.com', 'adashxgc.ut.taobao.com', 'adsapi.manhuaren.com', 'adsdk.dmzj.com', 'adashz4yt.m.taobao.com', 'adtrack.quark.cn', 'adse.ximalaya.com',
    'adserver.pandora.com', 'adsnative.com', 'adserver.yahoo.com', 'adswizz.com', 'adui.tg.meitu.com', 'adv.bandi.so', 'adxserver.ad.cmvideo.cn',
    'amazon-adsystem.com', 'api.cupid.dns.iqiyi.com', 'api.joybj.com', 'api.whizzone.com', 'app-ad.variflight.com', 'applovin.com', 'appnexus.com',
    'ark.letv.com', 'asimgs.pplive.cn', 'atm.youku.com', 'beacon-api.aliyuncs.com', 'bdurl.net', 'bidswitch.net', 'bluekai.com', 'casalemedia.com',
    'contextweb.com', 'conversantmedia.com', 'cr-serving.com', 'creativecdn.com', 'csp.yahoo.com', 'flashtalking.com', 'geo.yahoo.com', 'ggs.myzaker.com',
    'go-mpulse.net', 'gumgum.com', 'idatalog.iflysec.com', 'indexexchange.com', 'inmobi.com', 'ironsrc.com', 'itad.linetv.tw', 'ja.chushou.tv',
    'liveintent.com', 'mads.suning.com', 'magnite.com', 'media.net', 'mobileads.msn.com', 'mopnativeadv.037201.com', 'mopub.com', 'mum.alibabachengdun.com',
    'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz', 'pbd.yahoo.com', 'pf.s.360.cn', 'puds.ucweb.com', 'pv.sohu.com', 's.youtube.com',
    'sharethrough.com', 'sitescout.com', 'smartadserver.com', 'soom.la', 'spotx.tv', 'spotxchange.com', 'tapad.com', 'teads.tv', 'thetradedesk.com',
    'tremorhub.com', 'unityads.unity3d.com', 'vungle.com', 'volces.com', 'yieldify.com', 'yieldmo.com', 'zemanta.com', 'zztfly',
    // --- 彈出式 & 其他廣告 ---
    'adcash.com', 'popads.net', 'propellerads.com', 'zeropark.com',
    // --- 聯盟行銷 ---
    'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com',
    // --- 俄羅斯 ---
    'adriver.ru', 'yandex.ru',
    // --- 內容管理 & 推播 ---
    'addthis.com', 'cbox.ws', 'disqus.com', 'disquscdn.com', 'intensedebate.com', 'onesignal.com',
    'po.st', 'pushengage.com', 'sail-track.com', 'sharethis.com',
    // --- 隱私權 & Cookie 同意管理 ---
    'cookielaw.org', 'onetrust.com', 'sourcepoint.com', 'trustarc.com', 'usercentrics.eu',
    // --- 台灣地區 (純廣告/追蹤) ---
    'ad-geek.net', 'ad-hub.net', 'analysis.tw', 'cacafly.com',
    'clickforce.com.tw', 'fast-trk.com', 'guoshipartners.com', 'imedia.com.tw', 'is-tracking.com',
    'sitetag.us', 'tagtoo.co', 'tenmax.io', 'trk.tw', 'urad.com.tw', 'vpon.com',
    // --- 中國大陸地區 (純廣告/追蹤) ---
    'admaster.com.cn', 'adview.cn', 'alimama.com', 'cnzz.com', 'getui.com', 'getui.net', 'gepush.com', 'gridsum.com', 'growingio.com',
    'igexin.com', 'jiguang.cn', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com', 'pangolin-sdk-toutiao.com',
    'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'umeng.cn', 'umeng.co', 'umeng.com',  'umengcloud.com', 'youmi.net', 'zhugeio.com',
    // --- 雲端與平台分析/廣告像素 ---
    'bat.bing.com', 'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'everesttech.net', 'hs-analytics.net',
    'hs-scripts.com', 'monorail-edge.shopifysvc.com', 'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com',
    // --- 社交平台追蹤子網域 ---
    'analytics.tiktok.com', 'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com',
    'snap.licdn.com', 'spade.twitch.tv',
    // --- 其他 ---
    'adnx.com', 'cint.com', 'revjet.com', 'rlcdn.com', 'sc-static.net', 'scootersoftware.com', 'wcs.naver.net',
  ]),

  /**
   * 🚨 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    // --- Google ---
    'ads.js', 'adsbygoogle.js', 'analytics.js', 'ga.js', 'gtag.js', 'gtm.js', 'ytag.js',
    // --- Facebook / Meta ---
    'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js',
    // --- 主流分析平台 ---
    'amplitude.js', 'chartbeat.js', 'clarity.js', 'comscore.js', 'crazyegg.js', 'fullstory.js', 'heap.js',
    'hotjar.js', 'inspectlet.js', 'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js',
    'piwik.js', 'quant.js', 'quantcast.js', 'segment.js', 'vwo.js',
    // --- 廣告技術平台 (Ad Tech) ---
    'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adroll.js', 'adsense.js', 'apstag.js',
    'criteo.js', 'doubleclick.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'taboola.js',
    // --- 平台特定腳本 (Platform-Specific) ---
    'ad-full-page.min.js', // Pixnet Full Page Ad
    // --- 內容傳遞 & 標籤管理 ---
    'adobedtm.js', 'dax.js', 'tag.js', 'utag.js', 'visitorapi.js',
    // --- 效能監控 ---
    'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js',
    // --- 社群 & LinkedIn Insight ---
    'essb-core.min.js', 'insight.min.js', 'intercom.js', 'pangle.js', 'tagtoo.js', 'tiktok-analytics.js', 'tiktok-pixel.js',
    // --- 中國大陸地區 ---
    'aplus.js', 'aplus_wap.js', 'ec.js', 'gdt.js', 'hm.js', 'u.js', 'um.js',
    // --- Cloudflare / Bing / Plausible ---
    'bat.js', 'beacon.min.js', 'plausible.outbound-links.js',
    // --- 通用 & 其他 ---
    'abtasty.js', 'action.js', 'activity.js', 'ad-core.js', 'ad-lib.js', 'adroll_pro.js', 'ads-beacon.js',
    'autotrack.js', 'beacon.js', 'capture.js', 'cf.js', 'cmp.js', 'collect.js', 'conversion.js', 'event.js',
    'link-click-tracker.js', 'scevent.min.js', 'sp.js', 'tracker.js', 'tracking-api.js', 'tracking.js',
    'user-id.js', 'user-timing.js', 'wcslog.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATTERNS: new Set([
  // --- Google ---
  '/ads/ga-audiences', '/doubleclick/', '/google-analytics/', '/googleadservices/', '/googlesyndication/',
  '/googletagmanager/', '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', 'google.com/ads', 'google.com/pagead',

  // --- GA4 Measurement Protocol / Client (新增) ---
  'www.google-analytics.com/mp/collect', 'www.google-analytics.com/debug/mp/collect', 'www.google-analytics.com/g/collect',
  'www.google-analytics.com/j/collect', 'analytics.google.com/g/collect', 'region1.analytics.google.com/g/collect',
  'stats.g.doubleclick.net/g/collect',

  // --- Facebook / Meta ---
  'facebook.com/tr', 'facebook.com/tr/',

  // --- 通用 API 端點 ---
  '/api/batch', '/api/collect', '/api/collect/', '/api/log/', '/api/track/', '/api/v1/events', '/api/v1/track',
  '/beacon/', '/collect?', '/ingest/', '/intake', '/p.gif', '/pixel/', '/t.gif', '/telemetry/', '/track/', '/v1/pixel',

  // --- 特定服務端點 ---
  '/2/client/addlog_batch', // Weibo log

  // --- 主流服務端點 ---
  'ad.360yield.com', 'ads.bing.com/msclkid', 'ads.linkedin.com/li/track', 'ads.yahoo.com/pixel', 'amazon-adsystem.com/e/ec',
  'api-iam.intercom.io/messenger/web/events', 'api.amplitude.com', 'api.hubspot.com/events', 'api.mixpanel.com/track',
  'heap.io/api/track', 'px.ads.linkedin.com', 'scorecardresearch.com/beacon.js', 'segment.io/v1/track', 'analytics.twitter.com',
  'widget.intercom.io',

  // --- 社群 & 其他 ---
  '/plugins/easy-social-share-buttons/', 'ads-api.tiktok.com/api/v2/pixel', 'ads.pinterest.com/v3/conversions/events',
  'ads.tiktok.com/i1n/pixel/events.js', 'analytics.pinterest.com/', 'analytics.snapchat.com/v1/batch',
  'events.reddit.com/v1/pixel', 'log.pinterest.com/', 'q.quora.com/', 'sc-static.net/scevent.min.js', 'tr.snapchat.com',

  // --- 中國大陸地區 ---
  '/log/aplus', '/v.gif', 'cnzz.com/stat.php', 'gdt.qq.com/gdt_mview.fcg', 'hm.baidu.com/hm.js', 'wgo.mmstat.com', '/event_report',

  // --- 通用廣告路徑 ---
  '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/',

  // --- Cloudflare Web Analytics / RUM ---
  'cloudflareinsights.com/cdn-cgi/rum', 'static.cloudflareinsights.com/beacon.min.js',

  // --- Shopify Monorail / Bing UET / Vercel Speed Insights ---
  'bat.bing.com/action', 'monorail-edge.shopifysvc.com/v1/produce', 'vitals.vercel-insights.com/v1/vitals',

  // --- Plausible Analytics / Yahoo Benji/Logs ---
  'pbd.yahoo.com/data/logs', 'plausible.io/api/event',

  // --- LinkedIn Insight / TikTok Pixel / Events API ---
  'analytics.tiktok.com/i18n/pixel/events.js', 'business-api.tiktok.com/open_api', 'business-api.tiktok.com/open_api/v1',
  'business-api.tiktok.com/open_api/v2',

  // --- TikTok Events API 精準端點（新增） ---
  'business-api.tiktok.com/open_api/v1.2/pixel/track', 'business-api.tiktok.com/open_api/v1.3/pixel/track',
  'business-api.tiktok.com/open_api/v1.3/event/track',

  // --- LinkedIn Insight 端點強化（新增） ---
  'px.ads.linkedin.com/collect',

  // --- Microsoft Clarity 收集端點（新增） ---
  'a.clarity.ms/collect', 'd.clarity.ms/collect', 'l.clarity.ms/collect',

  // --- Sentry Envelope（新增，涵蓋多 Org 前綴） ---
  'ingest.sentry.io/api/',

  // --- Datadog RUM / Logs（新增，涵蓋多區域） ---
  'browser-intake-datadoghq.com/api/v2/rum', 'browser-intake-datadoghq.eu/api/v2/rum', 'http-intake.logs.datadoghq.com/v1/input',
  'agent-http-intake.logs.us5.datadoghq.com',

  // --- Pinterest Tag / Reddit Pixel / 事件上報 ---
  'ct.pinterest.com/v3', 'events.redditmedia.com/v1', 's.pinimg.com/ct/core.js', 'www.redditstatic.com/ads/pixel.js',

  // --- Discord 遙測（science）/ VK（社交平台）像素/重定向 ---
  'discord.com/api/v10/science', 'discord.com/api/v9/science', 'vk.com/rtrg',

  // --- 其他 ---
  '/abtesting/', '/b/ss', '/feature-flag/', '/i/adsct', '/track/m', '/track/pc', '/user-profile/', 'cacafly/track',
]),

  /**
   * 🚫 [V40.17 擴充] 路徑關鍵字黑名單
   */
PATH_BLOCK_KEYWORDS: new Set([
  // --- Ad Generic ---
  '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/banner/', '/interstitial/',
  '/midroll/', '/popads/', '/popup/', '/postroll/', '/prebid/', '/preroll/', '/promoted/', '/sponsor/', '/vclick/',
  '112wan', '2mdn', '51y5', '51yes', '789htbet', '96110', 'acs86', 'ad-choices', 'ad-logics', 'adash', 'adashx',
  'adcash', 'adcome', 'addsticky', 'addthis', 'adform', 'adhacker', 'adinfuse', 'adjust', 'admarvel', 'admaster',
  'admation', 'admdfs', 'admicro', 'admob', 'adnewnc', 'adpush', 'adpushup', 'adroll', 'adsage', 'adsame',
  'adsense', 'adsensor', 'adserver', 'adservice', 'adsh', 'adskeeper', 'adsmind', 'adsmogo', 'adsnew', 'adsrvmedia',
  'adsrvr', 'adsserving', 'adsterra', 'adsupply', 'adsupport', 'adswizz', 'adsystem', 'adtilt', 'adtima', 'adtrack',
  'advert', 'advertise', 'advertisement', 'advertiser', 'adview', 'adware', 'adwhirl', 'adwords', 'adzcore', 'affiliate',
  'alexametrics', 'allyes', 'amplitude', 'analysis', 'analysys', 'analytics', 'aottertrek', 'appadhoc',
  'appads', 'appboy', 'appier', 'applovin', 'appsflyer', 'apptimize', 'apsalar', 'baichuan', 'bango', 'bangobango',
  'bidvertiser', 'bingads', 'bkrtx', 'bluekai', 'breaktime', 'bugsense', 'burstly', 'cedexis', 'chartboost',
  'circulate', 'click-fraud', 'clkservice', 'cnzz', 'cognitivlabs', 'crazyegg',
  'crittercism', 'cross-device', 'dealerfire', 'dfp', 'dienst', 'djns', 'dlads', 'dnserror', 'domob',
  'doubleclick', 'doublemax', 'dsp', 'duapps', 'duomeng', 'dwtrack', 'egoid', 'emarbox', 'en25', 'eyeota', 'fenxi',
  'fingerprinting', 'flurry', 'fwmrm', 'getadvltem', 'getexceptional', 'googleads', 'googlesyndication',
  'greenplasticdua', 'growingio', 'guanggao', 'guomob', 'guoshipartners', 'heapanalytics', 'hotjar', 'hsappstatic',
  'hubspot', 'igstatic', 'inmobi', 'innity', 'instabug', 'intercom', 'izooto', 'jpush', 'juicer', 'jumptap',
  'kissmetrics', 'lianmeng', 'litix', 'localytics', 'logly', 'mailmunch', 'malvertising', 'matomo', 'medialytics',
  'meetrics', 'mgid', 'mifengv', 'mixpanel', 'mobaders', 'mobclix', 'mobileapptracking', 'monitor',
  'mvfglobal', 'networkbench', 'newrelic', 'omgmta', 'omniture', 'onead', 'openinstall', 'openx', 'optimizely',
  'outstream', 'partnerad', 'pingfore', 'piwik', 'pixanalytics', 'playtomic', 'polyad', 'popin',
  'popin2mdn', 'programmatic', 'pushnotification', 'quantserve', 'quantumgraph', 'queryly', 'qxs',
  'rayjump', 'retargeting', 'ronghub', 'rtb', 'scorecardresearch', 'scupio', 'securepubads', 'sensor',
  'sentry', 'shence', 'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'snowplow', 'socdm', 'sponsors', 'spy',
  'spyware', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 'straas', 'studybreakmedia', 'stunninglover',
  'supersonicads', 'syndication', 'taboola', 'tagtoo', 'talkingdata', 'tanx', 'tapjoy', 'tapjoyads',
  'tenmax', 'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji', 'trace', 'track', 'tracker', 'trackersimulator',
  'tracking', 'traffic', 'trafficjunky', 'trafficmanager', 'tubemogul', 'uedas', 'umeng', 'umtrack', 'unidesk',
  'usermaven', 'usertesting', 'venraas', 'vilynx', 'vpon', 'vungle', 'whalecloud', 'wistia',
  'wlmonitor', 'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget', 'zgdfz6h7po', 'zgty365', 'zhengjian',
  'zhengwunet', 'zhuichaguoji', 'zjtoolbar', 'zzhyyj',
  // --- Ad Tech ---
  'ad_logic', 'ad-break', 'ad_event', 'ad_pixel', 'ad-call', '/ad-choices', '/ad-click', '/ad-code', '/ad-conversion',
  '/ad-engagement', '/ad-event', '/ad-events', '/ad-exchange', '/ad-impression', '/ad-inventory', '/ad-loader',
  '/ad-logic', '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request',
  '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', '/ad-tech',
  '/ad-telemetry', '/ad-unit', '/ad-verification', '/ad-view', '/ad-viewability', '/ad-wrapper', '/adframe/',
  '/adrequest/', '/adretrieve/', '/adserve/', '/adserving/', '/fetch_ads/', '/getad/', '/getads/', 'adsbygoogle',
  'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'apstag', 'google_ad', 'pagead', 'pwt.js',
  // --- Tracking & Analytics ---
  '/analytic/', '/analytics/', '/api/v2/rum', '/audit/', '/beacon/', '/collect?', '/collector/', 'g/collect', '/insight/',
  '/intelligence/', '/measurement/', '/monitoring/', 'mp/collect', '/pixel/', '/report/', '/reporting/', '/reports/',
  '/telemetry/', '/trace/', '/track/', '/tracker/', '/tracking/', '/unstable/produce_batch', '/v1/produce',
  // --- Error & Performance ---
  '/bugsnag/', '/crash/', 'debug/mp/collect', '/error/', '/envelope', '/exception/', '/sentry/', '/stacktrace/',
  'performance-tracking', 'real-user-monitoring', 'web-vitals',
  // --- User Behavior ---
  'audience', 'attribution', 'behavioral-targeting', 'cohort', 'data-collection', 'data-sync', 'fingerprint',
  'retargeting', 'session-replay', 'third-party-cookie', 'user-analytics', 'user-behavior', 'user-cohort', 'user-segment',
  // --- 3rd Party Services ---
  'appier', 'comscore', 'fbevents', 'fbq', 'google-analytics', 'onead', 'osano', 'sailthru', 'tapfiliate', 'utag.js',
]),
    
  /**
   * ✅ 路徑前綴白名單
   * 說明：用於豁免正則表達式封鎖，避免誤殺 SPA/CDN 的合法資源。
   */
  PATH_ALLOW_PREFIXES: new Set([
      '/.well-known/'
  ]),
  
  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 後綴 (Path Allowlist - Suffixes)
   * 說明：當路徑以此處的字串結尾時，將豁免 `PATH_BLOCK_KEYWORDS` 檢查。
   */
  PATH_ALLOW_SUFFIXES: new Set([
    // --- 框架 & 套件常用檔 ---
    'app.js', 'bundle.js', 'chunk.js', 'chunk.mjs', 'common.js', 'framework.js', 'framework.mjs', 'index.js',
    'index.mjs', 'main.js', 'polyfills.js', 'polyfills.mjs', 'runtime.js', 'styles.css', 'styles.js', 'vendor.js',
    // --- 靜態資產與固定檔名 ---
    'badge.svg', 'browser.js', 'card.js', 'chunk-common', 'chunk-vendors', 'component---', 'favicon.ico',
    'fetch-polyfill', 'head.js', 'header.js', 'icon.svg', 'legacy.js', 'loader.js', 'logo.svg', 'manifest.json',
    'modal.js', 'padding.css', 'page-data.js', 'polyfill.js', 'robots.txt', 'sitemap.xml', 'sw.js',
    // --- 常見主題或設定檔 ---
    'config.js', 'theme.js', 'web.config',
  ]),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 子字串 (Path Allowlist - Substrings)
   * 說明：當路徑包含此處的字串時，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於典型靜態路徑)。
   */
  PATH_ALLOW_SUBSTRINGS: new Set([
    '_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/',
  ]),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 區段 (Path Allowlist - Segments)
   * 說明：當路徑被 '/' 分割後，若任一區段完全匹配此處的字串，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於避免誤殺功能性路徑)。
   */
  PATH_ALLOW_SEGMENTS: new Set([
    'blog', 'catalog', 'dialog', 'login',
  ]),

  /**
   * 💧 [V40.17 擴充] 直接拋棄請求 (DROP) 的關鍵字
   * 說明：改為更精準的匹配，需包含分隔符或位於詞界，避免誤殺。
   */
  DROP_KEYWORDS: new Set([
    // --- 日誌 & 遙測 (Logging & Telemetry) ---
    '.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 'airbrake',
    'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 'crashlytics', 'csp-report',
    'data-pipeline', 'error-monitoring', 'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event',
    'logevents', 'loggly', 'log-hl', 'realtime-log', 'rum', 'server-event', 'telemetry', 'uploadmobiledata', 'web-beacon', 'web-vitals',
    // --- 錯誤 & 診斷 (Error & Diagnostics) ---
    'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json',
  ]),

  /**
   * 🗑️ 全域追蹤參數黑名單 (V40.1 標準化為全小寫)
   */
  GLOBAL_TRACKING_PARAMS: new Set([
    // --- UTM 家族 ---
    'utm_campaign', 'utm_content', 'utm_creative_format', 'utm_id', 'utm_marketing_tactic', 'utm_medium',
    'utm_source', 'utm_source_platform', 'utm_term',
    // --- Google ---
    '__gac', '__gads', '_ga', '_gat', '_gid', 'dclid', 'gad', 'gad_source', 'gbraid', 'gcl_au', 'gclid', 'gclsrc', 'gsid', 'wbraid',
    // --- Microsoft / Bing ---
    'msad', 'msadgroupid', 'mscampaignid', 'msclkid',
    // --- Facebook / Meta ---
    'fbclid', 'fbadid', 'fbadsetid', 'fbcampaignid', 'fbplacementid', 'igsh', 'igshid', 'mibextid', 'x-threads-app-object-id',
    // --- 其他主流平台 (Yandex, Twitter, TikTok, LinkedIn, Mailchimp) ---
    'li_fat_id', 'mc_cid', 'mc_eid', 'mkt_tok', 'ttclid', 'twclid', 'yclid',
    // --- 聯盟行銷 & 點擊 ID (Affiliate & Click ID) ---
    'affid', 'affiliate_id', 'click_id', 'clickid', 'coupon_code', 'customid', 'deal_id', 'ef_id',
    'offer_id', 'partner_id', 'promo_code', 'rb_clickid', 's_kwcid', 'sub_id', 'transaction_id', 'zanpid',
    // --- 通用 & 其他 (Generic & Misc) ---
    'ecid', 'epik', 'feature', 'fr', 'pvid', 'request_id', 'scene', 'scm', 'si', 'spm', 'src', 'traceid', 'trk', 'trk_params',
    // --- 社群分享特定 (Social Sharing) ---
    '__twitter_impression', 'app_platform', 'from_channel', 'from_source', 'from_uid', 'from_user', 'is_copy_url',
    'is_from_webapp', 'share_app_id', 'share_from', 'share_id', 'share_medium', 'share_plat', 'share_source',
    'share_tag', 'share_token', 'tt_campaign', 'tt_from', 'tt_medium', 'wechat_id', 'weibo_id', 'xhs_share', 'xhsshare',
    // --- 特定服務 (Service Specific) ---
    '_bta_c', '_bta_tid', '_openstat', 'action_object_map', 'action_ref_map', 'action_type_map', 'biz', 'camid',
    'ck_subscriber_id', 'cupid', 'from_ad', 'from_promo', 'from_search', 'hmci', 'hmcu', 'hmkw', 'hmpl', 'hmsr',
    'hsa_ad', 'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_src', 'hsctatracking', 'idx', 'matomo_campaign', 'matomo_kwd',
    'mid', 'oly_anon_id', 'oly_enc_id', 'piwik_campaign', 'piwik_kwd', 'redirect_log_mongo_id', 'redirect_mongo_id',
    'sb_referer_host', 'union_id', 'vero_conv', 'vero_id',
    // --- 廣告參數 (Ad Parameters) ---
    'ad', 'ad_id', 'adgroup_id', 'adposition', 'adset', 'campaign_id', 'creative', 'creative_id', 'device',
    'devicemodel', 'event_id', 'feeditemid', 'keyword', 'loc_interest_ms', 'loc_physical_ms', 'matchtype',
    'network', 'pixel_id', 'placement', 'targetid',
    // --- 搜尋特定 (Search Specific) ---
    'algolia_object_id', 'algolia_position', 'algolia_query', 'algolia_query_id',
    // --- Yahoo 特定參數 ---
    '.tsrc', 'rapidkeys', 'spaceid', 'test_id', 'tsrc'
  ]),

  /**
   * 🗑️ 追蹤參數前綴黑名單 (V40.5 移除 s_ 與 ul_ 以提升相容性)
   */
  TRACKING_PREFIXES: new Set([
    '__cf_', '_bta', '_bta_', '_ga_', '_gid_', '_gat_', '_hs', '_oly_', 'ad_', 'aff_', 'alg_', 'bd_', 'cam_',
    'campaign_', 'content_', 'creative_', 'cup_', 'device_', 'epik_', 'et_', 'fb_', 'from_', 'ga_', 'gcl_',
    'gdr_', 'gds_', 'hmsr_', 'hsa_', 'li_', 'matomo_', 'mc_', 'medium_', 'mke_', 'mkt_', 'ms_', 'mtm_',
    'network_', 'pk_', 'piwik_', 'placement', 'ref_', 'scm_', 'share_', 'source_', 'spm_', 'term_', 'tt_',
    'trk_', 'tw_', 'utm_', 'vero_', 'video_utm_', 'zanpid_',
  ]),

  /**
   * ✅ 必要參數白名單 (V40.5 擴充以提升相容性)
   * 說明：此處的參數永遠不會被清理，以避免破壞網站核心功能。
   */
  PARAMS_TO_KEEP_WHITELIST: new Set([
    'code', 'id', 'item', 'page', 'product_id', 'q', 'query', 'search', 'session_id', 'state', 't', 'targetid', 'token', 'v'
  ]),

  /**
   * 🚫 基於正規表示式的路徑黑名單 (V40.5 修正正則)
   */
  PATH_BLOCK_REGEX: [
    /^\/((?!_next\/static\/|static\/|assets\/)[a-z0-9]{12,})\.js$/i, // 根目錄長雜湊 js (排除靜態目錄)，修正 [a-z0-9]
    /[^\/]*sentry[^\/]*\.js/i,        // 檔名含 sentry 且以 .js 結尾
    /\/v\d+\/event/i                   // 通用事件API版本 (如 /v1/event, /v2/event)
  ],
};

// #################################################################################################
// #                                                                                               #
// #                             🚀 OPTIMIZED CORE ENGINE (V40.6+)                                 #
// #                                                                                               #
// #################################################################################################

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, PARAM_CLEAN: 3, SOFT_WHITELISTED: 4 });
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif', 'Content-Length': '43' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const NO_CONTENT_RESPONSE = { response: { status: 204 } };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });
const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.css']);

class OptimizedTrie {
  constructor() { this.root = Object.create(null); }
  insert(word) { let n = this.root; for (let i = 0; i < word.length; i++) { const c = word[i]; n = n[c] || (n[c] = Object.create(null)); } n.isEndOfWord = true; }
  startsWith(prefix) { let n = this.root; for (let i = 0; i < prefix.length; i++) { const c = prefix[i]; if (!n[c]) return false; n = n[c]; if (n.isEndOfWord) return true; } return false; }
  contains(text) {
    // V40.6 安全強化: 增加長度上限，防禦 ReDoS 攻擊
    const N = Math.min(text.length, 1024);
    for (let i = 0; i < N; i++) {
        let n = this.root;
        for (let j = i; j < N; j++) {
            const c = text[j];
            if (!n[c]) break;
            n = n[c];
            if (n.isEndOfWord) return true;
        }
    }
    return false;
  }
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
  getUrlDecision(k) { const decision = this.l2UrlDecisionCache.get(k); if (decision !== null) optimizedStats.increment('l2CacheHits'); return decision; }
  setUrlDecision(k, d) { this.l2UrlDecisionCache.set(k, d); }
  getUrlObject(rawUrl) { return this.urlObjectCache.get(rawUrl); }
  setUrlObject(rawUrl, urlObj) { this.urlObjectCache.set(rawUrl, urlObj); }
}

const multiLevelCache = new MultiLevelCacheManager();
const OPTIMIZED_TRIES = { prefix: new OptimizedTrie(), criticalPattern: new OptimizedTrie(), pathBlock: new OptimizedTrie(), drop: new OptimizedTrie() };

function initializeOptimizedTries() {
  CONFIG.TRACKING_PREFIXES.forEach(p => OPTIMIZED_TRIES.prefix.insert(String(p).toLowerCase()));
  CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => OPTIMIZED_TRIES.criticalPattern.insert(String(p).toLowerCase()));
  CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => OPTIMIZED_TRIES.pathBlock.insert(String(p).toLowerCase()));
  CONFIG.DROP_KEYWORDS.forEach(p => OPTIMIZED_TRIES.drop.insert(String(p).toLowerCase()));
}

class OptimizedPerformanceStats {
    constructor() { this.counters = new Uint32Array(16); this.labels = ['totalRequests', 'blockedRequests', 'domainBlocked', 'pathBlocked', 'regexPathBlocked', 'criticalScriptBlocked', 'paramsCleaned', 'hardWhitelistHits', 'softWhitelistHits', 'errors', 'l1CacheHits', 'l2CacheHits', 'urlCacheHits']; }
    increment(type) { const idx = this.labels.indexOf(type); if (idx !== -1) this.counters[idx]++; }
    getStats() { const stats = {}; this.labels.forEach((l, i) => { stats[l] = this.counters[i]; }); return stats; }
}
const optimizedStats = new OptimizedPerformanceStats();

function isWhitelisted(hostname, exactSet, wildcardSet) {
    if (exactSet.has(hostname)) return true;
    let domain = hostname;
    while (true) {
        if (wildcardSet.has(domain)) return true;
        const dotIndex = domain.indexOf('.');
        if (dotIndex === -1) break;
        domain = domain.substring(dotIndex + 1);
    }
    return false;
}

function isHardWhitelisted(h) { return isWhitelisted(h, CONFIG.HARD_WHITELIST_EXACT, CONFIG.HARD_WHITELIST_WILDCARDS); }
function isSoftWhitelisted(h) { return isWhitelisted(h, CONFIG.SOFT_WHITELIST_EXACT, CONFIG.SOFT_WHITELIST_WILDCARDS); }
function isDomainBlocked(h) { let c = h; while (c) { if (CONFIG.BLOCK_DOMAINS.has(c)) return true; const i = c.indexOf('.'); if (i === -1) break; c = c.slice(i + 1); } return false; }

function isCriticalTrackingScript(hostname, path) { 
    const key = `crit:${hostname}:${path}`;
    const cachedDecision = multiLevelCache.getUrlDecision(key); 
    if (cachedDecision !== null) return cachedDecision; 
    
    const urlFragment = hostname + path;
    const queryIndex = path.indexOf('?');
    const pathOnly = queryIndex !== -1 ? path.slice(0, queryIndex) : path;
    const slashIndex = pathOnly.lastIndexOf('/');
    const scriptName = slashIndex !== -1 ? pathOnly.slice(slashIndex + 1) : pathOnly;
    
    let shouldBlock = false;
    if (scriptName && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName)) {
        shouldBlock = true;
    } else {
        shouldBlock = OPTIMIZED_TRIES.criticalPattern.contains(urlFragment);
    }
    
    multiLevelCache.setUrlDecision(key, shouldBlock);
    return shouldBlock;
}

/**
 * V40.6 安全強化: 新增精確的路徑豁免檢查函式
 * 說明：取代舊有的 `allow.contains`，以更嚴格的後綴、子字串和路徑區段匹配來避免繞過。
 */
function isPathExplicitlyAllowed(path) {
    for (const suffix of CONFIG.PATH_ALLOW_SUFFIXES) {
        if (path.endsWith(suffix)) return true;
    }
    for (const substring of CONFIG.PATH_ALLOW_SUBSTRINGS) {
        if (path.includes(substring)) return true;
    }
    // 檢查路徑區段，移除開頭的'/'並過濾空字串
    const segments = path.startsWith('/') ? path.substring(1).split('/') : path.split('/');
    for (const segment of segments) {
        if (segment && CONFIG.PATH_ALLOW_SEGMENTS.has(segment)) return true;
    }
    return false;
}

function isPathBlocked(path) { 
    const k = `path:${path}`;
    const c = multiLevelCache.getUrlDecision(k); 
    if (c !== null) return c; 
    let r = false;
    // V40.6 安全強化: 使用 isPathExplicitlyAllowed 進行更嚴格的檢查
    if (OPTIMIZED_TRIES.pathBlock.contains(path) && !isPathExplicitlyAllowed(path)) { 
        r = true; 
    } 
    multiLevelCache.setUrlDecision(k, r); 
    return r; 
}

function isPathBlockedByRegex(path) { 
    const k = `regex:${path}`;
    const c = multiLevelCache.getUrlDecision(k); 
    if (c !== null) return c;
    for (const prefix of CONFIG.PATH_ALLOW_PREFIXES) { 
        if (path.startsWith(prefix)) { 
            multiLevelCache.setUrlDecision(k, false); 
            return false;
        } 
    } 
    for (let i = 0; i < CONFIG.PATH_BLOCK_REGEX.length; i++) { 
        if (CONFIG.PATH_BLOCK_REGEX[i].test(path)) { 
            multiLevelCache.setUrlDecision(k, true); 
            return true;
        } 
    } 
    multiLevelCache.setUrlDecision(k, false); 
    return false; 
}

function getBlockResponse(path) {
    const lowerPath = path.toLowerCase();
    const dotIndex = lowerPath.lastIndexOf('.');
    if (dotIndex !== -1) {
        const ext = lowerPath.substring(dotIndex);
        if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
        if (SCRIPT_EXTENSIONS.has(ext)) return NO_CONTENT_RESPONSE;
    }
    if (OPTIMIZED_TRIES.drop.contains(lowerPath)) return DROP_RESPONSE;
    return REJECT_RESPONSE;
}

function cleanTrackingParams(url) {
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
        newUrl.hash = 'cleaned';
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
            multiLevelCache.setUrlObject(rawUrl, Object.freeze(url));
        } catch (e) {
            optimizedStats.increment('errors');
            // V40.6 安全強化: 移除日誌中的查詢參數，避免敏感資訊外洩
            const sanitizedUrl = rawUrl.split('?')[0];
            console.error(`[URL-Filter-v40.22] URL 解析失敗 (查詢參數已移除): "${sanitizedUrl}", 錯誤: ${e.message}`);
            return null;
        }
    }
    
    if (url.hash === '#cleaned') {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    
    if (isHardWhitelisted(hostname)) {
        optimizedStats.increment('hardWhitelistHits');
        return null;
    }
    
    const l1Decision = multiLevelCache.getDomainDecision(hostname);
    if (l1Decision === DECISION.BLOCK) {
        optimizedStats.increment('l1CacheHits');
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(url.pathname + url.search);
    }
    
    if (isDomainBlocked(hostname)) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
        optimizedStats.increment('domainBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(url.pathname + url.search);
    }
    
    const originalFullPath = url.pathname + url.search;
    const lowerFullPath = originalFullPath.toLowerCase();

    if (isCriticalTrackingScript(hostname, lowerFullPath)) {
        optimizedStats.increment('criticalScriptBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(originalFullPath);
    }
    
    if (isSoftWhitelisted(hostname)) {
        optimizedStats.increment('softWhitelistHits');
    } else {
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
    
    const cleanedUrl = cleanTrackingParams(url);
    if (cleanedUrl) {
        optimizedStats.increment('paramsCleaned');
        return REDIRECT_RESPONSE(cleanedUrl);
    }
    
    return null;

  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v40.22] 處理請求 "${request?.url?.split('?')[0]}" 時發生錯誤: ${error?.message}`, error?.stack);
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
        $done({ version: '40.22', status: 'ready', message: 'URL Filter v40.22 - Syntax Correction', stats: optimizedStats.getStats() });
      }
      return;
    }
    const result = processRequest($request);
    if (typeof $done !== 'undefined') $done(result || {});
  } catch (error) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[URL-Filter-v40.22] 致命錯誤: ${error?.message}`, error?.stack);
    }
    if (typeof $done !== 'undefined') $done({});
  }
})();
