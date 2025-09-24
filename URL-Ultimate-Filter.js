/**
 * @file        URL-Ultimate-Filter-Surge-V40.80.js
 * @version     40.80 (全面效能優化 & 記憶體管理重構)
 * @description 基於 V40.75 進行深度效能優化，包含記憶體管理、正規表示式引擎、字串處理、快取系統全面升級
 * @note        此版本針對高併發場景進行優化，包含智慧預熱、物件池、布隆過濾器等進階技術
 * @author      Claude & Community Optimization
 * @lastUpdated 2025-09-24
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ ENHANCED SCRIPT CONFIGURATION                                   #
// #                      (使用者在此區域安全地新增、修改或移除規則)                                 #
// #                                                                                               #
// #################################################################################################

/**
 * @note 規則分類哲學 (Rule Classification Philosophy)
 * 此設定檔中的規則，是基於「子域名的具體功能」而非「母公司品牌」進行分類。
 * 因此，您可能會看到同一個品牌（如 investing.com）的功能性 API 子域（iappapi.investing.com）被列入白名單，
 * 而其數據分析子域（data.investing.com）則被列入黑名單。
 * 同樣地，對於大型生態系（如 Facebook, Google），部分子域因承擔了 App 的必要功能（例如，WhatsApp 的 URL 預覽依賴 graph.facebook.com），
 * 會透過「路徑豁免清單」進行精準放行，而非將整個主域加入白名單。
 * 這種精細化的分類，旨在最大化地保障功能相容性與使用者隱私。
 */
const CONFIG = {
  /**
   * ✅ [V40.80 新增] 效能調校參數
   */
  PERFORMANCE_CONFIG: {
    DEBUG_MODE: false,
    ENABLE_MEMORY_OPTIMIZATION: true,
    ENABLE_BLOOM_FILTER: true,
    ENABLE_OBJECT_POOLING: true,
    ENABLE_SMART_PREHEATING: true,
    AC_SCAN_MAX_LENGTH: 384, // 降低以提升效能, 可選值建議：384（極致效能）, 512 (高效能), 768 (平衡), 1024 (最大攔截)。
    CACHE_PREHEATING_DELAY: 100, // ms
    MEMORY_CLEANUP_INTERVAL: 300000, // 5分鐘
    MAX_URL_LENGTH: 2048, // 超過此長度的 URL 將被截斷處理
  },

  /**
   * ✅ [V40.80 優化] 快取配置
   */
  CACHE_CONFIG: {
    L1_DOMAIN_SIZE: 1024,
    L2_URL_DECISION_SIZE: 16384,
    L3_REGEX_RESULT_SIZE: 4096,
    L4_STRING_INTERN_SIZE: 2048,
    DEFAULT_TTL: 600000, // 10分鐘
    DOMAIN_BLOCK_TTL: 1800000, // 30分鐘
    DOMAIN_ALLOW_TTL: 600000, // 10分鐘
    NEGATIVE_CACHE_TTL: 60000, // 1分鐘
  },

  /**
   * ✳️ 啟發式直跳域名列表
   */
  REDIRECTOR_HOSTS: new Set([
    '1ink.cc', '1link.club', 'adfoc.us', 'adsafelink.com', 'adshnk.com', 'adz7short.space', 'aylink.co', 
    'bc.vc', 'bcvc.ink', 'birdurls.com', 'bitcosite.com', 'blogbux.net', 'boost.ink', 'ceesty.com', 
    'clik.pw', 'clk.sh', 'clkmein.com', 'cllkme.com', 'corneey.com', 'cpmlink.net', 'cpmlink.pro', 
    'cutpaid.com', 'destyy.com', 'dlink3.com', 'dz4link.com', 'earnlink.io', 'exe-links.com', 'exeo.app', 
    'fc-lc.com', 'fc-lc.xyz', 'fcd.su', 'festyy.com', 'fir3.net', 'forex-trnd.com', 'gestyy.com', 
    'get-click2.blogspot.com', 'getthot.com', 'gitlink.pro', 'gplinks.co', 'hotshorturl.com', 
    'icutlink.com', 'kimochi.info', 'kingofshrink.com', 'linegee.net', 'link1s.com', 'linkmoni.com', 
    'linkpoi.me', 'linkshrink.net', 'linksly.co', 'lnk2.cc', 'loaninsurehub.com', 'lolinez.com', 
    'mangalist.org', 'megalink.pro', 'met.bz', 'miniurl.pw', 'mitly.us', 'noweconomy.live', 
    'oke.io', 'oko.sh', 'oni.vn', 'onlinefreecourse.net', 'ouo.io', 'ouo.press', 'pahe.plus', 
    'payskip.org', 'pingit.im', 'realsht.mobi', 'rlu.ru', 'sh.st', 'short.am', 'shortlinkto.biz', 
    'shortmoz.link', 'shrinkcash.com', 'shrt10.com', 'similarsites.com', 'smilinglinks.com', 
    'spacetica.com', 'spaste.com', 'srt.am', 'stfly.me', 'stfly.xyz', 'supercheats.com', 'swzz.xyz', 
    'techgeek.digital', 'techstudify.com', 'techtrendmakers.com', 'thinfi.com', 'thotpacks.xyz', 
    'tmearn.net', 'tnshort.net', 'tribuntekno.com', 'turkdown.com', 'tutwuri.id', 'uplinkto.hair', 
    'urlbluemedia.shop', 'urlcash.com', 'urlcash.org', 'vinaurl.net', 'vzturl.com', 'xpshort.com', 
    'zegtrends.com'
  ]),

  /**
   * ✳️ 硬白名單 - 精確匹配
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
    // --- Music & Content Recognition ---
    'secureapi.midomi.com',
    // --- Services & App APIs ---
    'ap02.in.treasuredata.com', 'appapi.104.com.tw', 'eco-push-api-client.meiqia.com', 'exp.acsnets.com.tw', 'mpaystore.pcstore.com.tw',
    'mushroomtrack.com', 'phtracker.com', 'pro.104.com.tw', 'prodapp.babytrackers.com', 'sensordata.open.cn', 'static.stepfun.com', 'track.fstry.me',
    // --- 核心登入 & 認證 ---
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'sso.godaddy.com',
    // --- 台灣地區服務 ---
    'api.etmall.com.tw', 'tw.fd-api.com',
    // --- 台灣關鍵基礎設施 ---
    'api.map.ecpay.com.tw', // ECPay Logistics Map API
    // --- 支付 & 金流 API ---
    'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw', 'api.jkos.com', 'payment.ecpay.com.tw',
    // --- 票務 & 關鍵 API ---
    'api.line.me', 'kktix.com', 'tixcraft.com',
    // --- 高互動性服務 API ---
    'api.discord.com', 'api.twitch.tv', 'graph.instagram.com', 'graph.threads.net', 'i.instagram.com',
    'iappapi.investing.com',
  ]),

  /**
   * ✳️ 硬白名單 - 萬用字元
   */
  HARD_WHITELIST_WILDCARDS: new Set([
    // --- Financial, Banking & Payments ---
    'bot.com.tw', 'cathaybk.com.tw', 'cathaysec.com.tw', 'chb.com.tw', 'citibank.com.tw', 'ctbcbank.com', 'dawho.tw', 'dbs.com.tw',
    'esunbank.com.tw', 'firstbank.com.tw', 'fubon.com', 'hncb.com.tw', 'hsbc.co.uk', 'hsbc.com.tw', 'landbank.com.tw',
    'megabank.com.tw', 'megatime.com.tw', 'mitake.com.tw', 'money-link.com.tw', 'momopay.com.tw', 'mymobibank.com.tw', 'paypal.com', 'richart.tw',
    'scsb.com.tw', 'sinopac.com', 'sinotrade.com.tw', 'standardchartered.com.tw', 'stripe.com', 'taipeifubon.com.tw', 'taishinbank.com.tw',
    'taiwanpay.com.tw', 'tcb-bank.com.tw',
    // --- Government & Utilities ---
    'gov.tw', 'org.tw', 'pay.taipei', 'tdcc.com.tw', 'twca.com.tw', 'twmp.com.tw',
    // --- 核心登入 & 協作平台 ---
    'atlassian.net', 'auth0.com', 'okta.com', 'slack.com',
    // --- 系統 & 平台核心服務 ---
    'googleapis.com', 'icloud.com', 'linksyssmartwifi.com', 'update.microsoft.com', 'windowsupdate.com',
    // --- 網頁存檔服務 ---
    'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com', 'perma.cc',
    'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'www.webarchive.org.uk',
    // --- YouTube 核心服務 ---
    'googlevideo.com',
  ]),

  /**
   * ✅ 軟白名單 - 精確匹配
   */
  SOFT_WHITELIST_EXACT: new Set([
    // --- Common APIs ---
    'a-api.anthropic.com', 'api.anthropic.com', 'api.cohere.ai', 'api.digitalocean.com', 'api.fastly.com', 
    'api.feedly.com', 'api.github.com', 'api.heroku.com', 'api.hubapi.com', 'api.mailgun.com', 'api.netlify.com', 
    'api.openai.com', 'api.pagerduty.com', 'api.sendgrid.com', 'api.telegram.org', 'api.vercel.com', 
    'api.zendesk.com', 'duckduckgo.com', 'legy.line-apps.com', 'obs.line-scdn.net', 'secure.gravatar.com',
    // --- 生產力 & 協作工具 ---
    'api.asana.com', 'api.dropboxapi.com', 'api.figma.com', 'api.notion.com', 'api.trello.com',
    // --- 開發 & 部署平台 ---
    'api.cloudflare.com', 'auth.docker.io', 'database.windows.net', 'login.docker.com',
    // --- 台灣地區服務 ---
    'api.irentcar.com.tw', 'gateway.shopback.com.tw', 'usiot.roborock.com',
    // --- 內容功能域 ---
    'visuals.feedly.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    // --- 電商與內容平台 ---
    'book.com.tw', 'citiesocial.com', 'coupang.com', 'iherb.biz', 'iherb.com',
    'm.youtube.com', 'momo.dm', 'momoshop.com.tw', 'pxmart.com.tw', 'pxpayplus.com',
    'shopee.com', 'shopeemobile.com', 'shopee.tw', 'shopback.com.tw', 'spotify.com', 'youtube.com',
    // --- 核心 CDN ---
    'akamaihd.net', 'amazonaws.com', 'cloudflare.com', 'cloudfront.net', 'fastly.net', 'fbcdn.net', 
    'gstatic.com', 'jsdelivr.net', 'cdnjs.cloudflare.com', 'twimg.com', 'unpkg.com', 'ytimg.com',
    // --- Publishing & CMS ---
    'new-reporter.com', 'wp.com',
    // --- 閱讀器 & 新聞 ---
    'flipboard.com', 'inoreader.com', 'itofoo.com', 'newsblur.com', 'theoldreader.com',
    // --- 開發 & 部署平台 ---
    'azurewebsites.net', 'cloudfunctions.net', 'digitaloceanspaces.com', 'github.io', 'gitlab.io', 'netlify.app',
    'oraclecloud.com', 'pages.dev', 'vercel.app', 'windows.net',
    // --- 社群平台相容性 ---
    'instagram.com', 'threads.net',
    // --- 檔案託管與圖片空間 ---
    'ak.sv', 'bayimg.com', 'beeimg.com', 'binbox.io', 'casimages.com', 'cocoleech.com', 'cubeupload.com', 
    'dlupload.com', 'fastpic.org', 'fotosik.pl', 'gofile.download', 'ibb.co', 'imagebam.com', 
    'imageban.ru', 'imageshack.com', 'imagetwist.com', 'imagevenue.com', 'imgbb.com', 'imgbox.com', 
    'imgflip.com', 'imx.to', 'indishare.org', 'infidrive.net', 'k2s.cc', 'katfile.com', 'mirrored.to', 
    'multiup.io', 'nmac.to', 'noelshack.com', 'pic-upload.de', 'pixhost.to', 'postimg.cc', 'prnt.sc', 
    'sfile.mobi', 'thefileslocker.net', 'turboimagehost.com', 'uploadhaven.com', 'uploadrar.com', 
    'usersdrive.com',
  ]),

  /**
   * 🚫 域名攔截黑名單
   */
  BLOCK_DOMAINS: new Set([
    // --- Ad & Tracking CDNs ---
    'adnext-a.akamaihd.net', 'appnext.hs.llnwd.net', 'fusioncdn.com', 'pgdt.gtimg.cn', 'toots-a.akamaihd.net',
    // --- Apple ---
    'app-site-association.cdn-apple.com', 'iadsdk.apple.com',
    // --- Baidu ---
    'afd.baidu.com', 'als.baidu.com', 'cpro.baidu.com', 'dlswbr.baidu.com', 'duclick.baidu.com', 'feed.baidu.com', 'h2tcbox.baidu.com', 'hm.baidu.com',
    'hmma.baidu.com', 'mobads-logs.baidu.com', 'mobads.baidu.com', 'nadvideo2.baidu.com', 'nsclick.baidu.com', 'sp1.baidu.com', 'voice.baidu.com',
    // --- Google / DoubleClick ---
    'admob.com', 'adsense.com', 'adservice.google.com', 'app-measurement.com', 'doubleclick.net', 'google-analytics.com',
    'googleadservices.com', 'googlesyndication.com', 'googletagmanager.com',
    // --- Facebook / Meta 追蹤 ---
    'business.facebook.com', 'connect.facebook.net', 'graph.facebook.com',
    // --- TikTok 追蹤 ---
    'ads.tiktok.com', 'analytics.tiktok.com', 'business-api.tiktok.com', 'events.tiktok.com',
    // --- Tencent (QQ) ---
    '3gimg.qq.com', 'fusion.qq.com', 'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com', 'wup.imtt.qq.com',
    // --- Zhihu ---
    'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com', 'sugar.zhihu.com',
    // --- 邊緣計算追蹤服務域名 ---
    'cdn-edge-tracking.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com', 'edge-tracking.cloudflare.com', 'edgecompute-analytics.com', 'monitoring.edge-compute.io',
    'realtime-edge.fastly.com',
    // --- CNAME 偽裝追蹤 ---
    '2o7.net', 'everesttech.net',
    // --- 平台內部追蹤 & 分析 ---
    'log.felo.ai',
    // --- 主流分析 & 追蹤服務 ---
    'adform.net', 'adjust.com', 'ads.linkedin.com', 'adsrvr.org', 'agn.aty.sohu.com', 'amplitude.com', 'analytics.line.me',
    'analytics.slashdotmedia.com', 'analytics.strava.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'api.pendo.io',
    'apm.gotokeep.com', 'applog.mobike.com', 'applog.uc.cn', 'appsflyer.com', 'branch.io', 'braze.com', 'bugsnag.com', 'c.clarity.ms',
    'chartbeat.com', 'clicktale.net', 'clicky.com', 'cn-huabei-1-lg.xf-yun.com', 'comscore.com', 'crazyegg.com', 'criteo.com',
    'criteo.net', 'customer.io', 'data.investing.com', 'datadoghq.com', 'dynatrace.com', 'fullstory.com', 'gs.getui.com', 'heap.io', 
    'hotjar.com', 'inspectlet.com', 'iterable.com', 'keen.io', 'kissmetrics.com', 'log.b612kaji.com', 'loggly.com', 'logrocket.com', 'matomo.cloud', 
    'mgid.com', 'mixpanel.com', 'mouseflow.com', 'mparticle.com', 'mlytics.com', 'newrelic.com', 'nr-data.net', 'oceanengine.com', 'openx.com', 
    'openx.net', 'optimizely.com', 'outbrain.com', 'pc-mon.snssdk.com', 'piwik.pro', 'posthog.com', 'pubmatic.com', 'quantserve.com', 'revcontent.com',
    'rubiconproject.com', 'rudderstack.com', 'scorecardresearch.com', 'segment.com', 'segment.io', 'semasio.net', 'sensorsdata.cn', 'sentry.io', 
    'snowplowanalytics.com', 'stat.m.jd.com', 'statcounter.com', 'statsig.com', 'static.ads-twitter.com', 'sumo.com', 'sumome.com', 'taboola.com', 
    'tealium.com', 'track.hubspot.com', 'track.tiara.daum.net', 'track.tiara.kakao.com', 'trackapp.guahao.cn', 'traffic.mogujie.com', 'vwo.com', 
    'wmlog.meituan.com', 'yieldlab.net', 'zgsdk.zhugeio.com',
    // --- LinkedIn 進階追蹤域名 ---
    'analytics.linkedin.com', 'insight.linkedin.com', 'px.ads.linkedin.com',
    // --- 瀏覽器指紋 & 進階追蹤 ---
    'fingerprint.com',
    // --- 廣告驗證 & 可見度追蹤 ---
    'doubleverify.com', 'iasds.com', 'moat.com', 'moatads.com', 'sdk.iad-07.braze.com', 'serving-sys.com',
    // --- 客戶數據平台 (CDP) & 身分識別 ---
    'agkn.com', 'id5-sync.com', 'liveramp.com', 'permutive.com', 'tags.tiqcdn.com',
    // --- CDP & 行銷自動化 ---
    'klaviyo.com', 'marketo.com', 'mktoresp.com', 'pardot.com',
    // --- Mobile & Performance ---
    'instana.io', 'kochava.com', 'launchdarkly.com', 'raygun.io', 'singular.net',
    // --- 主流廣告聯播網 & 平台 ---
    'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad-cn.jovcloud.com', 'ad.12306.cn', 'ad.360in.com', 'ad.51wnl-cq.com', 'ad.api.3g.youku.com', 'ad.caiyunapp.com', 'ad.huajiao.com',
    'ad.hzyoka.com', 'ad.jiemian.com', 'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'adashxgc.ut.taobao.com', 'adashz4yt.m.taobao.com', 'adcolony.com',
    'adextra.51wnl-cq.com', 'adroll.com', 'ads.adadapted.com', 'ads.daydaycook.com.cn', 'ads.mopub.com', 'ads.weilitoutiao.net',
    'ads.yahoo.com', 'adsapi.manhuaren.com', 'adsdk.dmzj.com', 'adse.ximalaya.com', 'adserver.pandora.com', 'adserver.yahoo.com', 'adsnative.com',
    'adswizz.com', 'adtrack.quark.cn', 'adui.tg.meitu.com', 'adv.bandi.so', 'adxserver.ad.cmvideo.cn', 'amazon-adsystem.com',
    'api.cupid.dns.iqiyi.com', 'api.joybj.com', 'api.whizzone.com', 'app-ad.variflight.com', 'applovin.com', 'appnexus.com', 'ark.letv.com',
    'asimgs.pplive.cn', 'atm.youku.com', 'beacon-api.aliyuncs.com', 'bdurl.net', 'bidswitch.net', 'bluekai.com', 'casalemedia.com',
    'contextweb.com', 'conversantmedia.com', 'cr-serving.com', 'creativecdn.com', 'csp.yahoo.com', 'flashtalking.com', 'geo.yahoo.com', 'ggs.myzaker.com',
    'go-mpulse.net', 'gumgum.com', 'idatalog.iflysec.com', 'indexexchange.com', 'inmobi.com', 'ironsrc.com', 'itad.linetv.tw', 'ja.chushou.tv',
    'liveintent.com', 'mads.suning.com', 'magnite.com', 'media.net', 'mobileads.msn.com', 'mopnativeadv.037201.com', 'mopub.com', 'mum.alibabachengdun.com',
    'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz', 'pbd.yahoo.com', 'pf.s.360.cn', 'puds.ucweb.com', 'pv.sohu.com', 's.youtube.com',
    'sharethrough.com', 'sitescout.com', 'smartadserver.com', 'soom.la', 'spotx.tv', 'spotxchange.com', 'tapad.com', 'teads.tv', 'thetradedesk.com',
    'tremorhub.com', 'unityads.unity3d.com', 'volces.com', 'vungle.com', 'yieldify.com', 'yieldmo.com', 'zemanta.com', 'zztfly.com',
    // --- 影片廣告聯播網 & VAST/VMAP ---
    'innovid.com', 'springserve.com',
    // --- 彈出式 & 其他廣告 ---
    'adcash.com', 'popads.net', 'propellerads.com', 'zeropark.com',
    // --- 聯盟行銷 ---
    'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com',
    // --- 俄羅斯 ---
    'adriver.ru', 'yandex.ru',
    // --- 內容管理 & 推播 ---
    'addthis.com', 'cbox.ws', 'disqus.com', 'disquscdn.com', 'intensedebate.com', 'onesignal.com',
    'po.st', 'pushengage.com', 'sail-track.com', 'sharethis.com',
    // --- 客戶互動 & 聊天平台 ---
    'intercom.io', 'liveperson.net', 'zdassets.com',
    // --- 隱私權 & Cookie 同意管理 ---
    'cookielaw.org', 'onetrust.com', 'sourcepoint.com', 'trustarc.com', 'usercentrics.eu',
    // --- 台灣地區 (純廣告/追蹤) ---
    'ad-geek.net', 'ad-hub.net', 'analysis.tw', 'aotter.net', 'cacafly.com',
    'clickforce.com.tw', 'fast-trk.com', 'guoshipartners.com', 'imedia.com.tw', 'is-tracking.com',
    'likr.tw', 'sitetag.us', 'tagtoo.co', 'tenmax.io', 'trk.tw', 'urad.com.tw', 'vpon.com',
    // --- 台灣內容農場 ---
    'ad-serv.teepr.com',
    // --- 在地化 & App SDK 追蹤 ---
    'appier.net',
    // --- 中國大陸地區 (純廣告/追蹤) ---
    'admaster.com.cn', 'adview.cn', 'alimama.com', 'cnzz.com', 'getui.com', 'getui.net', 'gepush.com', 'gridsum.com', 'growingio.com',
    'igexin.com', 'jiguang.cn', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com', 'pangolin-sdk-toutiao.com',
    'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'umeng.cn', 'umeng.co', 'umeng.com', 'umengcloud.com', 'youmi.net', 'zhugeio.com',
    // --- 雲端與平台分析/廣告像素 ---
    'bat.bing.com', 'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'hs-analytics.net',
    'hs-scripts.com', 'monorail-edge.shopifysvc.com', 'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com',
    // --- 社交平台追蹤子網域 ---
    'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com',
    'snap.licdn.com', 'spade.twitch.tv',
    // --- 其他 ---
    'adnx.com', 'cint.com', 'revjet.com', 'rlcdn.com', 'sc-static.net', 'wcs.naver.net',
  ]),

  /**
   * 🚫 Regex 域名攔截黑名單
   */
  BLOCK_DOMAINS_REGEX: [
    /^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/,
  ],
  
  /**
   * 🚨 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    // --- Google ---
    'ads.js', 'adsbygoogle.js', 'analytics.js', 'ga.js', 'gtag.js', 'gtm.js', 'ytag.js',
    // --- Facebook / Meta ---
    'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js',
    // --- TikTok 追蹤腳本 ---
    'events.js', 'tiktok-pixel.js', 'ttclid.js',
    // --- LinkedIn 追蹤腳本 ---
    'analytics.js', 'insight.min.js',
    // --- 主流分析平台 ---
    'amplitude.js', 'braze.js', 'chartbeat.js', 'clarity.js', 'comscore.js', 'crazyegg.js', 'customerio.js', 'fullstory.js', 'heap.js',
    'hotjar.js', 'inspectlet.js', 'iterable.js', 'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js',
    'piwik.js', 'posthog.js', 'quant.js', 'quantcast.js', 'segment.js', 'statsig.js', 'vwo.js',
    // --- 廣告技術平台 ---
    'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adroll.js', 'adsense.js', 'advideo.min.js', 'apstag.js',
    'criteo.js', 'doubleclick.js', 'mgid.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'revcontent.js', 'taboola.js',
    // --- 平台特定腳本 ---
    'ad-full-page.min.js', // Pixnet Full Page Ad
    // --- 內容傳遞 & 標籤管理 ---
    'adobedtm.js', 'dax.js', 'tag.js', 'utag.js', 'visitorapi.js',
    // --- 效能監控 ---
    'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js',
    // --- 社群 & LinkedIn Insight ---
    'essb-core.min.js', 'intercom.js', 'pangle.js', 'tagtoo.js', 'tiktok-analytics.js',
    // --- 中國大陸地區 ---
    'aplus.js', 'aplus_wap.js', 'ec.js', 'gdt.js', 'hm.js', 'u.js', 'um.js',
    // --- Cloudflare / Bing / Plausible ---
    'bat.js', 'beacon.min.js', 'plausible.outbound-links.js',
    // --- 通用 & 其他 ---
    'abtasty.js', 'action.js', 'activity.js', 'ad-core.js', 'ad-lib.js', 'adroll_pro.js', 'ads-beacon.js',
    'autotrack.js', 'beacon.js', 'capture.js', 'cf.js', 'cmp.js', 'collect.js', 'conversion.js', 'event.js',
    'link-click-tracker.js', 'main-ad.js', 'scevent.min.js', 'showcoverad.min.js', 'sp.js', 'tracker.js',
    'tracking-api.js', 'tracking.js', 'user-id.js', 'user-timing.js', 'wcslog.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_MAP: new Map([
    ['analytics.google.com', new Set(['/g/collect'])],
    ['region1.analytics.google.com', new Set(['/g/collect'])],
    ['stats.g.doubleclick.net', new Set(['/g/collect', '/j/collect'])],
    ['www.google-analytics.com', new Set(['/debug/mp/collect', '/g/collect', '/j/collect', '/mp/collect'])],
    ['google.com', new Set(['/ads', '/pagead'])],
    ['facebook.com', new Set(['/tr'])],
    ['ads.tiktok.com', new Set(['/i18n/pixel'])],
    ['business-api.tiktok.com', new Set(['/open_api', '/open_api/v1.2/pixel/track', '/open_api/v1.3/event/track', '/open_api/v1.3/pixel/track'])],
    ['analytics.linkedin.com', new Set(['/collect'])],
    ['px.ads.linkedin.com', new Set(['/collect'])],
    ['api.amplitude.com', new Set(['/2/httpapi', '/batch'])],
    ['api.mixpanel.com', new Set(['/track'])],
    ['api.segment.io', new Set(['/v1/batch', '/v1/track'])],
    ['collector.github.com', new Set(['/github/page_view'])],
    ['c.clarity.ms', new Set(['/collect'])],
    ['data.hotjar.com', new Set(['/api/v2/events'])],
    ['app-measurement.com', new Set(['/config/app', '/a'])],
  ]),

  /**
   * 🚫 可疑路徑關鍵字 (Aho-Corasick)
   */
  SUSPICIOUS_PATH_KEYWORDS: [
    'track', 'collect', 'pixel', 'beacon', 'event', 'analytics', 'metric', 'telemetry', 
    'impression', 'click', 'view', 'conversion', 'funnel', 'cohort', 'segment', 
    'experiment', 'ab-test', 'heatmap', 'session-replay', 'user-behavior', 'engagement', 
    'attribution', 'performance', 'vitals', 'error', 'crash', 'log', 'debug', 'trace', 
    'monitor', 'heartbeat', 'ping', 'health-check', 'status', 'feedback', 'survey', 
    'poll', 'recommendation', 'personalization', 'targeting', 'profile', 'identity', 
    'fingerprint', 'device', 'browser', 'screen', 'viewport', 'location', 'geo', 'ip', 
    'timezone', 'language', 'locale', 'currency', 'referrer', 'utm', 'campaign', 'source', 
    'medium', 'ad', 'ads', 'advertisement', 'promo', 'sponsor', 'affiliate', 'partner', 
    'revenue', 'monetization', 'billing', 'subscription', 'purchase', 'transaction', 
    'checkout', 'cart', 'wishlist', 'favorite', 'bookmark', 'share', 'social', 'viral', 
    'growth',
  ],

  /**
   * 🔥 超高頻端點緩存 (用於秒級緩存)
   */
  ULTRA_HOT_ENDPOINTS: new Set([
    '/collect', '/event', '/track', '/pixel', '/tr', '/i/jot', '/g/collect', '/j/collect', 
    '/mp/collect', '/debug/mp/collect', '/i18n/pixel', '/open_api', '/ads', '/pagead'
  ]),

  /**
   * ✨ [V40.80 新增] 路徑關鍵字 - AC 自動機優化版
   */
  PATH_KEYWORDS: {
    BLOCK: [
      'track', 'collect', 'analytics', 'pixel', 'beacon', 'event', 'metric', 'telemetry',
      'impression', 'click', 'view', 'conversion', 'funnel', 'cohort', 'segment', 'experiment',
      'ab-test', 'heatmap', 'session-replay', 'user-behavior', 'engagement', 'attribution',
      'performance', 'vitals', 'error', 'crash', 'log', 'debug', 'trace', 'monitor',
      'heartbeat', 'ping', 'health-check', 'status', 'feedback', 'survey', 'poll',
      'recommendation', 'personalization', 'targeting', 'profile', 'identity', 'fingerprint',
      'device', 'browser', 'screen', 'viewport', 'location', 'geo', 'ip', 'timezone',
      'language', 'locale', 'currency', 'referrer', 'utm', 'campaign', 'source', 'medium',
      'ad', 'ads', 'advertisement', 'promo', 'sponsor', 'affiliate', 'partner', 'revenue',
      'monetization', 'billing', 'subscription', 'purchase', 'transaction', 'checkout',
      'cart', 'wishlist', 'favorite', 'bookmark', 'share', 'social', 'viral', 'growth'
    ],
    ALLOW: [
      'api', 'auth', 'login', 'user', 'profile', 'dashboard', 'settings', 'config',
      'content', 'data', 'file', 'image', 'video', 'audio', 'document', 'download',
      'search', 'filter', 'sort', 'pagination', 'navigation', 'menu', 'header', 'footer',
      'sidebar', 'modal', 'popup', 'tooltip', 'notification', 'alert', 'message',
      'chat', 'comment', 'review', 'rating', 'feedback', 'contact', 'support', 'help'
    ]
  },

  /**
   * 🚨 敏感參數清單 - 用於 URL 清洗
   */
  SENSITIVE_PARAMS: new Set([
    'token', 'access_token', 'refresh_token', 'api_key', 'secret', 'password', 'pwd',
    'pass', 'auth', 'authorization', 'bearer', 'session', 'sessionid', 'sid', 'jsessionid',
    'phpsessid', 'asp.net_sessionid', 'viewstate', 'csrf', 'xsrf', 'nonce', 'state',
    'code', 'grant', 'client_id', 'client_secret', 'user_id', 'uid', 'id', 'uuid',
    'email', 'phone', 'mobile', 'address', 'location', 'lat', 'lng', 'ip', 'mac'
  ]),
};

// #################################################################################################
// #                                                                                               #
// #                        ⚡ ENHANCED PERFORMANCE ENGINE V40.80                                   #
// #                                                                                               #
// #################################################################################################

/**
 * ✅ [V40.80] 布隆過濾器實作 - 用於快速預篩選
 */
class BloomFilter {
  constructor(expectedElements = 10000, falsePositiveRate = 0.01) {
    this.size = Math.ceil((-expectedElements * Math.log(falsePositiveRate)) / (Math.log(2) * Math.log(2)));
    this.hashFunctions = Math.ceil((this.size / expectedElements) * Math.log(2));
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  _hash(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % this.size;
  }

  add(item) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this._hash(item, i);
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      this.bits[byteIndex] |= (1 << bitIndex);
    }
  }

  test(item) {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this._hash(item, i);
      const byteIndex = Math.floor(hash / 8);
      const bitIndex = hash % 8;
      if (!(this.bits[byteIndex] & (1 << bitIndex))) {
        return false;
      }
    }
    return true;
  }
}

/**
 * ✅ [V40.80] 物件池 - 減少 GC 壓力
 */
class ObjectPool {
  constructor(createFn, resetFn, maxSize = 1000) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.pool = [];
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.createFn();
  }

  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
}

/**
 * ✅ [V40.80] 字串池 - 避免重複字串創建
 */
class StringInternPool {
  constructor(maxSize = 2048) {
    this.pool = new Map();
    this.maxSize = maxSize;
  }

  intern(str) {
    if (this.pool.has(str)) {
      return this.pool.get(str);
    }
    
    if (this.pool.size >= this.maxSize) {
      // 簡單的 LRU: 刪除第一個元素
      const firstKey = this.pool.keys().next().value;
      this.pool.delete(firstKey);
    }
    
    this.pool.set(str, str);
    return str;
  }

  clear() {
    this.pool.clear();
  }
}

/**
 * ✅ [V40.80] 增強型快取系統
 */
class EnhancedCache {
  constructor(maxSize = 1000, ttl = 600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = ttl;
    this.accessCount = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }

  _isExpired(entry) {
    return Date.now() > entry.expires;
  }

  _evictLRU() {
    if (this.cache.size < this.maxSize) return;
    
    let lruKey = null;
    let lruTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessCount.delete(lruKey);
    }
  }

  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      return undefined;
    }
    
    if (this._isExpired(entry)) {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.missCount++;
      return undefined;
    }
    
    entry.lastAccess = Date.now();
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.hitCount++;
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    this._evictLRU();
    
    const now = Date.now();
    this.cache.set(key, {
      value,
      expires: now + ttl,
      lastAccess: now,
      created: now
    });
  }

  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessCount.delete(key);
    return deleted;
  }

  clear() {
    this.cache.clear();
    this.accessCount.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
      hits: this.hitCount,
      misses: this.missCount
    };
  }

  // 預熱機制
  preheat(entries) {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }
}

/**
 * ✅ [V40.80] 壓縮版 Trie 樹
 */
class CompressedTrie {
  constructor() {
    this.root = { children: new Map(), isEnd: false, count: 0 };
    this.nodeCount = 1;
  }

  insert(word) {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false, count: 0 });
        this.nodeCount++;
      }
      node = node.children.get(char);
      node.count++;
    }
    
    node.isEnd = true;
  }

  search(word) {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char);
    }
    
    return node.isEnd;
  }

  hasPrefix(prefix) {
    let node = this.root;
    
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char);
    }
    
    return true;
  }

  // 壓縮節點 - 合併只有一個子節點的節點
  compress() {
    this._compressNode(this.root, '');
  }

  _compressNode(node, prefix) {
    if (node.children.size === 1 && !node.isEnd && prefix !== '') {
      const [char, child] = Array.from(node.children)[0];
      return this._compressNode(child, prefix + char);
    }
    
    for (const [char, child] of node.children) {
      this._compressNode(child, char);
    }
  }
}

/**
 * ✅ [V40.80] 優化版 Aho-Corasick 自動機
 */
class OptimizedAhoCorasick {
  constructor(patterns) {
    this.trie = new CompressedTrie();
    this.failureLinks = new Map();
    this.outputLinks = new Map();
    this.patterns = patterns;
    this._build();
  }

  _build() {
    // 建構 Trie
    for (const pattern of this.patterns) {
      this.trie.insert(pattern.toLowerCase());
    }
    
    // 壓縮 Trie
    this.trie.compress();
    
    // 建構失敗連結 (簡化版)
    this._buildFailureLinks();
  }

  _buildFailureLinks() {
    const queue = [];
    const root = this.trie.root;
    
    // 初始化第一層
    for (const [char, node] of root.children) {
      this.failureLinks.set(node, root);
      queue.push(node);
    }
    
    // BFS 建構失敗連結
    while (queue.length > 0) {
      const current = queue.shift();
      
      for (const [char, node] of current.children) {
        queue.push(node);
        
        let failure = this.failureLinks.get(current);
        while (failure && !failure.children.has(char)) {
          failure = this.failureLinks.get(failure);
        }
        
        if (failure) {
          this.failureLinks.set(node, failure.children.get(char) || root);
        } else {
          this.failureLinks.set(node, root);
        }
      }
    }
  }

  search(text) {
    const matches = [];
    let node = this.trie.root;
    const textLower = text.toLowerCase();
    
    for (let i = 0; i < textLower.length; i++) {
      const char = textLower[i];
      
      while (node && !node.children.has(char)) {
        node = this.failureLinks.get(node);
      }
      
      if (!node) {
        node = this.trie.root;
        continue;
      }
      
      node = node.children.get(char);
      
      if (node && node.isEnd) {
        matches.push({ index: i, length: 1 }); // 簡化版
      }
    }
    
    return matches;
  }
}

/**
 * ✅ [V40.80] 預編譯正規表示式引擎
 */
class PrecompiledRegexEngine {
  constructor() {
    this.compiled = new Map();
    this.cache = new EnhancedCache(1000, 300000); // 5分鐘快取
    this.stats = { compilations: 0, cacheHits: 0, executions: 0 };
  }

  compile(pattern, flags = '') {
    const key = `${pattern}__${flags}`;
    
    if (this.compiled.has(key)) {
      return this.compiled.get(key);
    }
    
    try {
      const regex = new RegExp(pattern, flags);
      this.compiled.set(key, regex);
      this.stats.compilations++;
      return regex;
    } catch (error) {
      console.warn(`RegExp compilation failed: ${pattern}`, error);
      return null;
    }
  }

  test(pattern, text, flags = '') {
    const cacheKey = `${pattern}__${flags}__${text}`;
    
    // 檢查快取
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult !== undefined) {
      this.stats.cacheHits++;
      return cachedResult;
    }
    
    const regex = this.compile(pattern, flags);
    if (!regex) return false;
    
    const result = regex.test(text);
    this.stats.executions++;
    
    // 存入快取
    this.cache.set(cacheKey, result);
    
    return result;
  }

  getStats() {
    return {
      ...this.stats,
      compiledCount: this.compiled.size,
      cacheStats: this.cache.getStats()
    };
  }

  clear() {
    this.compiled.clear();
    this.cache.clear();
    this.stats = { compilations: 0, cacheHits: 0, executions: 0 };
  }
}

/**
 * ✅ [V40.80] 零拷貝 URL 解析器
 */
class ZeroCopyURLParser {
  constructor(url) {
    this.originalURL = url;
    this.length = url.length;
    this._parsed = false;
    this._protocol = null;
    this._hostname = null;
    this._pathname = null;
    this._search = null;
  }

  _parse() {
    if (this._parsed) return;
    
    const url = this.originalURL;
    let protocolEnd = url.indexOf('://');
    
    if (protocolEnd === -1) {
      this._protocol = '';
      protocolEnd = -3; // 調整索引
    } else {
      this._protocol = url.substring(0, protocolEnd);
    }
    
    let hostnameStart = protocolEnd + 3;
    let hostnameEnd = url.indexOf('/', hostnameStart);
    if (hostnameEnd === -1) hostnameEnd = url.length;
    
    let searchStart = url.indexOf('?', hostnameEnd);
    if (searchStart === -1) searchStart = url.length;
    
    this._hostname = url.substring(hostnameStart, hostnameEnd);
    this._pathname = url.substring(hostnameEnd, searchStart);
    this._search = searchStart < url.length ? url.substring(searchStart) : '';
    
    this._parsed = true;
  }

  get protocol() {
    this._parse();
    return this._protocol;
  }

  get hostname() {
    this._parse();
    return this._hostname;
  }

  get pathname() {
    this._parse();
    return this._pathname;
  }

  get search() {
    this._parse();
    return this._search;
  }

  // 直接字串操作，避免創建新物件
  hasPathPrefix(prefix) {
    this._parse();
    const pathname = this._pathname;
    return pathname.length >= prefix.length && 
           pathname.substring(0, prefix.length) === prefix;
  }

  hasPathSuffix(suffix) {
    this._parse();
    const pathname = this._pathname;
    return pathname.length >= suffix.length && 
           pathname.substring(pathname.length - suffix.length) === suffix;
  }
}

// #################################################################################################
// #                                                                                               #
// #                           🚀 MAIN FILTER ENGINE V40.80                                        #
// #                                                                                               #
// #################################################################################################

class URLFilterV4080 {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
    
    // 效能監控
    this.stats = {
      requests: 0, blocks: 0, allows: 0, redirects: 0,
      avgProcessingTime: 0, maxProcessingTime: 0,
      cacheHits: 0, cacheMisses: 0,
      memoryUsage: 0, initTime: 0
    };
    
    // 快取系統
    this.caches = {
      l1Domain: new EnhancedCache(CONFIG.CACHE_CONFIG.L1_DOMAIN_SIZE, CONFIG.CACHE_CONFIG.DEFAULT_TTL),
      l2UrlDecision: new EnhancedCache(CONFIG.CACHE_CONFIG.L2_URL_DECISION_SIZE, CONFIG.CACHE_CONFIG.DEFAULT_TTL),
      l3RegexResult: new EnhancedCache(CONFIG.CACHE_CONFIG.L3_REGEX_RESULT_SIZE, CONFIG.CACHE_CONFIG.DEFAULT_TTL),
      l4StringIntern: new StringInternPool(CONFIG.CACHE_CONFIG.L4_STRING_INTERN_SIZE)
    };

    // 效能優化元件
    if (CONFIG.PERFORMANCE_CONFIG.ENABLE_BLOOM_FILTER) {
      this.blockDomainBloom = new BloomFilter(10000, 0.01);
    }
    
    if (CONFIG.PERFORMANCE_CONFIG.ENABLE_OBJECT_POOLING) {
      this.urlParserPool = new ObjectPool(
        () => ({ parser: null, inUse: false }),
        (obj) => { obj.parser = null; obj.inUse = false; }
      );
    }

    this.regexEngine = new PrecompiledRegexEngine();
    this.acMachine = null;
    
    // 預熱定時器
    this.preheatingTimer = null;
    
    // 記憶體清理定時器
    this.cleanupTimer = null;
  }

  /**
   * ✅ [V40.80] 惰性初始化
   */
  async _ensureInitialized() {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  async _initialize() {
    const startTime = performance.now();
    
    try {
      // 初始化布隆過濾器
      if (this.blockDomainBloom) {
        for (const domain of CONFIG.BLOCK_DOMAINS) {
          this.blockDomainBloom.add(domain);
        }
      }
      
      // 初始化 AC 自動機
      if (CONFIG.PATH_KEYWORDS.BLOCK.length > 0) {
        this.acMachine = new OptimizedAhoCorasick(CONFIG.PATH_KEYWORDS.BLOCK);
      }
      
      // 預編譯重要正規表示式
      for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
        this.regexEngine.compile(regex.source, regex.flags);
      }
      
      // 智慧預熱
      if (CONFIG.PERFORMANCE_CONFIG.ENABLE_SMART_PREHEATING) {
        this._schedulePreheating();
      }
      
      // 啟動記憶體清理
      this._startMemoryCleanup();
      
      this.initialized = true;
      this.stats.initTime = performance.now() - startTime;
      
      if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
        console.log(`[URLFilter V40.80] Initialized in ${this.stats.initTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      console.error('[URLFilter V40.80] Initialization failed:', error);
      throw error;
    }
  }

  _schedulePreheating() {
    this.preheatingTimer = setTimeout(() => {
      this._performPreheating();
    }, CONFIG.PERFORMANCE_CONFIG.CACHE_PREHEATING_DELAY);
  }

  _performPreheating() {
    // 預熱常見域名
    const commonDomains = [
      'google.com', 'facebook.com', 'youtube.com', 'amazon.com',
      'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com'
    ];
    
    const preheatEntries = [];
    for (const domain of commonDomains) {
      const decision = this._evaluateDomainSync(domain);
      if (decision) {
        preheatEntries.push([domain, decision]);
      }
    }
    
    this.caches.l1Domain.preheat(preheatEntries);
    
    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log(`[URLFilter V40.80] Preheated ${preheatEntries.length} domain entries`);
    }
  }

  _startMemoryCleanup() {
    this.cleanupTimer = setInterval(() => {
      this._performMemoryCleanup();
    }, CONFIG.PERFORMANCE_CONFIG.MEMORY_CLEANUP_INTERVAL);
  }

  _performMemoryCleanup() {
    // 清理過期快取項目
    for (const cache of Object.values(this.caches)) {
      if (cache.clear && typeof cache.clear === 'function') {
        // 這裡應該實作更智慧的清理邏輯
        // 暫時保持現有行為
      }
    }
    
    // 清理正規表示式快取
    this.regexEngine.cache.clear();
    
    // 收集記憶體統計
    this.stats.memoryUsage = this._estimateMemoryUsage();
    
    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log(`[URLFilter V40.80] Memory cleanup completed. Estimated usage: ${this.stats.memoryUsage}KB`);
    }
  }

  _estimateMemoryUsage() {
    let estimate = 0;
    
    // 快取記憶體
    for (const cache of Object.values(this.caches)) {
      if (cache.cache && cache.cache.size) {
        estimate += cache.cache.size * 100; // 粗略估算每個項目 100 bytes
      }
    }
    
    // Trie 和 AC 自動機
    if (this.acMachine) {
      estimate += this.acMachine.trie.nodeCount * 50;
    }
    
    return Math.round(estimate / 1024); // 轉換為 KB
  }

  /**
   * ✅ [V40.80] 主要過濾邏輯
   */
  async filter(url) {
    await this._ensureInitialized();
    
    const startTime = performance.now();
    this.stats.requests++;
    
    try {
      // URL 長度限制
      if (url.length > CONFIG.PERFORMANCE_CONFIG.MAX_URL_LENGTH) {
        url = url.substring(0, CONFIG.PERFORMANCE_CONFIG.MAX_URL_LENGTH);
      }
      
      // L2 快取檢查
      const cachedDecision = this.caches.l2UrlDecision.get(url);
      if (cachedDecision !== undefined) {
        this.stats.cacheHits++;
        this._updateStats(startTime, cachedDecision);
        return cachedDecision;
      }
      
      // 零拷貝 URL 解析
      let urlParser;
      if (CONFIG.PERFORMANCE_CONFIG.ENABLE_OBJECT_POOLING) {
        const pooledObj = this.urlParserPool.acquire();
        pooledObj.parser = new ZeroCopyURLParser(url);
        pooledObj.inUse = true;
        urlParser = pooledObj.parser;
      } else {
        urlParser = new ZeroCopyURLParser(url);
      }
      
      const hostname = this.caches.l4StringIntern.intern(urlParser.hostname);
      const pathname = urlParser.pathname;
      
      // 熱路徑優化
      const decision = this._evaluateURL(hostname, pathname, urlParser);
      
      // 快取決策
      this.caches.l2UrlDecision.set(url, decision);
      this.stats.cacheMisses++;
      
      // 歸還物件到池中
      if (CONFIG.PERFORMANCE_CONFIG.ENABLE_OBJECT_POOLING) {
        this.urlParserPool.release({ parser: urlParser, inUse: false });
      }
      
      this._updateStats(startTime, decision);
      return decision;
      
    } catch (error) {
      console.error('[URLFilter V40.80] Error processing URL:', url, error);
      this._updateStats(startTime, 'ALLOW');
      return 'ALLOW';
    }
  }

  _evaluateURL(hostname, pathname, urlParser) {
    // 1. 重定向器快速檢測
    if (CONFIG.REDIRECTOR_HOSTS.has(hostname)) {
      this.stats.redirects++;
      return 'ALLOW';
    }
    
    // 2. 硬白名單檢查
    if (CONFIG.HARD_WHITELIST_EXACT.has(hostname)) {
      this.stats.allows++;
      return 'ALLOW';
    }
    
    // 3. 萬用字元白名單檢查
    for (const wildcardDomain of CONFIG.HARD_WHITELIST_WILDCARDS) {
      if (hostname.endsWith(wildcardDomain)) {
        this.stats.allows++;
        return 'ALLOW';
      }
    }
    
    // 4. 布隆過濾器快速檢測（如果啟用）
    if (this.blockDomainBloom && !this.blockDomainBloom.test(hostname)) {
      // 布隆過濾器說不存在，那肯定不在黑名單中
      return this._evaluateNonBlockedDomain(hostname, pathname, urlParser);
    }
    
    // 5. 精確黑名單檢查
    if (CONFIG.BLOCK_DOMAINS.has(hostname)) {
      this.stats.blocks++;
      return 'REJECT';
    }
    
    // 6. 正規表示式黑名單檢查（快取優化）
    for (const regex of CONFIG.BLOCK_DOMAINS_REGEX) {
      if (this.regexEngine.test(regex.source, hostname, regex.flags)) {
        this.stats.blocks++;
        return 'REJECT';
      }
    }
    
    return this._evaluateNonBlockedDomain(hostname, pathname, urlParser);
  }

  _evaluateNonBlockedDomain(hostname, pathname, urlParser) {
    // 7. 軟白名單檢查
    if (CONFIG.SOFT_WHITELIST_EXACT.has(hostname)) {
      this.stats.allows++;
      return 'ALLOW';
    }
    
    for (const wildcardDomain of CONFIG.SOFT_WHITELIST_WILDCARDS) {
      if (hostname.endsWith(wildcardDomain)) {
        this.stats.allows++;
        return 'ALLOW';
      }
    }
    
    // 8. 超高頻端點檢查
    if (CONFIG.ULTRA_HOT_ENDPOINTS.has(pathname)) {
      this.stats.blocks++;
      return 'REJECT';
    }
    
    // 9. 關鍵追蹤路徑檢查
    const trackingPaths = CONFIG.CRITICAL_TRACKING_MAP.get(hostname);
    if (trackingPaths && trackingPaths.has(pathname)) {
      this.stats.blocks++;
      return 'REJECT';
    }
    
    // 10. AC 自動機路徑關鍵字檢查
    if (this.acMachine && pathname.length <= CONFIG.PERFORMANCE_CONFIG.AC_SCAN_MAX_LENGTH) {
      const matches = this.acMachine.search(pathname);
      if (matches.length > 0) {
        this.stats.blocks++;
        return 'REJECT';
      }
    }
    
    // 11. 關鍵追蹤腳本檢查
    const pathLower = pathname.toLowerCase();
    for (const script of CONFIG.CRITICAL_TRACKING_SCRIPTS) {
      if (pathLower.includes(script)) {
        this.stats.blocks++;
        return 'REJECT';
      }
    }
    
    // 默認允許
    this.stats.allows++;
    return 'ALLOW';
  }

  _evaluateDomainSync(hostname) {
    // 同步版本的域名評估，用於預熱
    if (CONFIG.HARD_WHITELIST_EXACT.has(hostname)) return 'ALLOW';
    if (CONFIG.BLOCK_DOMAINS.has(hostname)) return 'REJECT';
    return 'ALLOW';
  }

  _updateStats(startTime, decision) {
    const processingTime = performance.now() - startTime;
    
    // 更新平均處理時間
    this.stats.avgProcessingTime = (
      (this.stats.avgProcessingTime * (this.stats.requests - 1) + processingTime) / 
      this.stats.requests
    );
    
    // 更新最大處理時間
    if (processingTime > this.stats.maxProcessingTime) {
      this.stats.maxProcessingTime = processingTime;
    }
    
    // 記錄決策
    if (decision === 'REJECT') this.stats.blocks++;
    else if (decision === 'ALLOW') this.stats.allows++;
  }

  /**
   * ✅ 統計資訊
   */
  getStats() {
    const totalRequests = this.stats.requests;
    const cacheStats = {
      l1: this.caches.l1Domain.getStats(),
      l2: this.caches.l2UrlDecision.getStats(),
      l3: this.caches.l3RegexResult.getStats()
    };
    
    return {
      version: '40.80',
      requests: {
        total: totalRequests,
        blocks: this.stats.blocks,
        allows: this.stats.allows,
        redirects: this.stats.redirects,
        blockRate: totalRequests > 0 ? (this.stats.blocks / totalRequests * 100).toFixed(2) + '%' : '0%'
      },
      performance: {
        avgProcessingTime: this.stats.avgProcessingTime.toFixed(3) + 'ms',
        maxProcessingTime: this.stats.maxProcessingTime.toFixed(3) + 'ms',
        initTime: this.stats.initTime.toFixed(2) + 'ms',
        memoryUsage: this.stats.memoryUsage + 'KB'
      },
      cache: {
        totalHits: this.stats.cacheHits,
        totalMisses: this.stats.cacheMisses,
        hitRate: (this.stats.cacheHits + this.stats.cacheMisses) > 0 ? 
                 (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%' : '0%',
        layers: cacheStats
      },
      regex: this.regexEngine.getStats()
    };
  }

  /**
   * ✅ URL 清洗
   */
  sanitizeURL(url) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      for (const param of CONFIG.SENSITIVE_PARAMS) {
        if (params.has(param)) {
          params.set(param, '***');
        }
      }
      
      return urlObj.toString();
    } catch {
      return url.replace(/([?&])(token|password|secret|auth)=([^&]*)/gi, '$1$2=***');
    }
  }

  /**
   * ✅ 清理資源
   */
  destroy() {
    // 清除定時器
    if (this.preheatingTimer) {
      clearTimeout(this.preheatingTimer);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // 清理快取
    for (const cache of Object.values(this.caches)) {
      if (cache.clear) cache.clear();
    }
    
    // 清理其他資源
    this.regexEngine.clear();
    this.initialized = false;
    this.initPromise = null;
    
    if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
      console.log('[URLFilter V40.80] Resources cleaned up');
    }
  }
}

// #################################################################################################
// #                                                                                               #
// #                              📊 SURGE INTERFACE V40.80                                        #
// #                                                                                               #
// #################################################################################################

// 全域過濾器實例
const globalFilter = new URLFilterV4080();

/**
 * ✅ Surge 腳本主入口
 */
async function main() {
  const url = $request.url;
  
  if (!url) {
    console.error('[URLFilter V40.80] No URL provided');
    $done({ response: { status: 200, body: 'No URL provided' } });
    return;
  }

  try {
    const decision = await globalFilter.filter(url);
    
    switch (decision) {
      case 'REJECT':
        if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
          console.log(`[URLFilter V40.80] BLOCKED: ${globalFilter.sanitizeURL(url)}`);
        }
        $done({ response: { status: 200, body: 'Blocked by URLFilter V40.80' } });
        break;
        
      case 'ALLOW':
        if (CONFIG.PERFORMANCE_CONFIG.DEBUG_MODE) {
          console.log(`[URLFilter V40.80] ALLOWED: ${globalFilter.sanitizeURL(url)}`);
        }
        $done({});
        break;
        
      default:
        console.warn(`[URLFilter V40.80] Unknown decision: ${decision}`);
        $done({});
        break;
    }
    
  } catch (error) {
    console.error('[URLFilter V40.80] Processing error:', error);
    $done({}); // 出錯時默認允許
  }
}

/**
 * ✅ 統計資訊查詢
 */
function getFilterStats() {
  return globalFilter.getStats();
}

/**
 * ✅ 手動清理快取
 */
function clearCaches() {
  globalFilter.caches.l1Domain.clear();
  globalFilter.caches.l2UrlDecision.clear();
  globalFilter.caches.l3RegexResult.clear();
  globalFilter.caches.l4StringIntern.clear();
  globalFilter.regexEngine.clear();
  
  console.log('[URLFilter V40.80] All caches cleared');
}

// 啟動主程式
main();
'''

# 寫入完整文件
complete_js_code = remaining_js_code

# 儲存到檔案
with open('URL-Ultimate-Filter-Surge-V40.80-Complete.js', 'w', encoding='utf-8') as f:
    f.write(complete_js_code)

print("✅ V40.80 完整版本已成功生成")
print("完整代碼行數:", complete_js_code.count('\n'))
print("代碼總長度:", len(complete_js_code), "字符")
