/**
 * @file        URL-Ultimate-Filter-Surge-V40.72.mem-wasm-async.js
 * @version     40.72-mwa (Memory-optimized Tries + Regex Auditor + Wasm hooks + Async init)
 * @desc        以最小侵入替換 V40.71+ 核心引擎與最末 IIFE，保留原規則集與輸入/輸出介面相容。
 * @note        若所在運行環境不支援 Worker/Wasm，將自動回退 JS 路徑並保持行為一致。
 * @author      Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-09-24
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION                                             #
// #                      (使用者在此區域安全地新增、修改或移除規則)                                 #
// #                                                                                               #
// #################################################################################################

/**
 * @note 規則分類哲學 (Rule Classification Philosophy) - V40.48 增補
 * 此設定檔中的規則，是基於「子域名的具體功能」而非「母公司品牌」進行分類。
 * 因此，您可能會看到同一個品牌（如 investing.com）的功能性 API 子域（iappapi.investing.com）被列入白名單，
 * 而其數據分析子域（data.investing.com）則被列入黑名單。
 * 同樣地，對於大型生態系（如 Facebook, Google），部分子域因承擔了 App 的必要功能（例如，WhatsApp 的 URL 預覽依賴 graph.facebook.com），
 * 會透過「路徑豁免清單」進行精準放行，而非將整個主域加入白名單。
 * 這種精細化的分類，旨在最大化地保障功能相容性與使用者隱私。
 */
const CONFIG = {
  /**
   * ✅ [V40.40 新增] 全域「除錯模式」
   * 說明：設為 true 時，將啟用一系列的進階日誌功能，用於無風險地測試與診斷。
   */
  DEBUG_MODE: false,

  /**
   * ✳️ [V40.59 新增, V40.60 重構] 啟發式直跳域名列表
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
   * ✳️ 硬白名單 - 精確匹配 (Hard Whitelist - Exact)
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
    // --- [V40.42] 台灣關鍵基礎設施 ---
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
   * ✳️ 硬白名單 - 萬用字元 (Hard Whitelist - Wildcards)
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
    'googleapis.com',
    'icloud.com', // [V40.48] 註解強化：因其大量動態生成的功能性子域，暫時保留於萬用字元硬白名單中。
    'linksyssmartwifi.com', 'update.microsoft.com', 'windowsupdate.com',
    // --- 網頁存檔服務 (對參數極度敏感) ---
    'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com', 'perma.cc',
    'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'www.webarchive.org.uk',
    // --- YouTube 核心服務 (僅保留基礎建設) ---
    'googlevideo.com',
  ]),

  /**
   * ✅ 軟白名單 - 精確匹配 (Soft Whitelist - Exact)
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
    // --- [V40.47] 修正：內容功能域不應被完全封鎖 ---
    'visuals.feedly.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元 (Soft Whitelist - Wildcards)
   */
  SOFT_WHITELIST_WILDCARDS: new Set([
    // --- [V40.44] 遷移自硬白名單的電商與內容平台 ---
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
    // --- [V40.57, V40.60 重構] AdsBypasser 規則庫整合 (檔案託管與圖片空間) ---
    'ak.sv', 'bayimg.com', 'beeimg.com', 'binbox.io', 'casimages.com', 'cocoleech.com', 'cubeupload.com', 
    'dlupload.com', 'fastpic.org', 'fotosik.pl', 'gofile.download', 'ibb.co', 'imagebam.com', 
    'imageban.ru', 'imageshack.com', 'imagetwist.com', 'imagevenue.com', 'imgbb.com', 'imgbox.com', 
    'imgflip.com', 'imx.to', 'indishare.org', 'infidrive.net', 'k2s.cc', 'katfile.com', 'mirrored.to', 
    'multiup.io', 'nmac.to', 'noelshack.com', 'pic-upload.de', 'pixhost.to', 'postimg.cc', 'prnt.sc', 
    'sfile.mobi', 'thefileslocker.net', 'turboimagehost.com', 'uploadhaven.com', 'uploadrar.com', 
    'usersdrive.com',
  ]),

  /**
   * 🚫 [V40.51 強化, V40.68 擴充] 域名攔截黑名單
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
    // --- [V40.51 新增] Facebook / Meta 追蹤增強 ---
    'business.facebook.com', 'connect.facebook.net', 'graph.facebook.com',
    // --- [V40.51 新增] TikTok 追蹤完整覆蓋 ---
    'ads.tiktok.com', 'analytics.tiktok.com', 'business-api.tiktok.com', 'events.tiktok.com',
    // --- Tencent (QQ) ---
    '3gimg.qq.com', 'fusion.qq.com', 'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com', 'wup.imtt.qq.com',
    // --- Zhihu ---
    'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com', 'sugar.zhihu.com',
    // --- [V40.51 新增] 邊緣計算追蹤服務域名 ---
    'cdn-edge-tracking.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com', 'edge-tracking.cloudflare.com', 'edgecompute-analytics.com', 'monitoring.edge-compute.io',
    'realtime-edge.fastly.com',
    // --- [V40.68 新增] CNAME 偽裝追蹤 ---
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
    // --- [V40.51 新增] LinkedIn 進階追蹤域名 ---
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
    // --- [V40.68 新增] 影片廣告聯播網 & VAST/VMAP ---
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
    // --- 台灣內容農場 (預測性防禦) ---
    'ad-serv.teepr.com',
    // --- 在地化 & App SDK 追蹤 ---
    'appier.net',
    // --- 中國大陸地區 (純廣告/追蹤) ---
    'admaster.com.cn', 'adview.cn', 'alimama.com', 'cnzz.com', 'getui.com', 'getui.net', 'gepush.com', 'gridsum.com', 'growingio.com',
    'igexin.com', 'jiguang.cn', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com', 'pangolin-sdk-toutiao.com',
    'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'umeng.cn', 'umeng.co', 'umeng.com',  'umengcloud.com', 'youmi.net', 'zhugeio.com',
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
   * 🚫 [V40.35 新增] Regex 域名攔截黑名單
   */
  BLOCK_DOMAINS_REGEX: [
    // --- 台灣新聞媒體廣告 (動態子域名) ---
    /^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/,
  ],
  
  /**
   * 🚨 [V40.61 擴充] 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: new Set([
    // --- Google ---
    'ads.js', 'adsbygoogle.js', 'analytics.js', 'ga.js', 'gtag.js', 'gtm.js', 'ytag.js',
    // --- Facebook / Meta ---
    'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js',
    // --- [V40.51 新增] TikTok 追蹤腳本 ---
    'events.js', 'tiktok-pixel.js', 'ttclid.js',
    // --- [V40.51 新增] LinkedIn 追蹤腳本 ---
    'analytics.js', 'insight.min.js',
    // --- 主流分析平台 ---
    'amplitude.js', 'braze.js', 'chartbeat.js', 'clarity.js', 'comscore.js', 'crazyegg.js', 'customerio.js', 'fullstory.js', 'heap.js',
    'hotjar.js', 'inspectlet.js', 'iterable.js', 'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js',
    'piwik.js', 'posthog.js', 'quant.js', 'quantcast.js', 'segment.js', 'statsig.js', 'vwo.js',
    // --- 廣告技術平台 (Ad Tech) ---
    'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adroll.js', 'adsense.js', 'advideo.min.js', 'apstag.js',
    'criteo.js', 'doubleclick.js', 'mgid.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'revcontent.js', 'taboola.js',
    // --- 平台特定腳本 (Platform-Specific) ---
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
   * 🚨 [V40.71 重構] 關鍵追蹤路徑模式 (主機名 -> 路徑前綴集)
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
    ['ad.360yield.com', new Set([])], // Host only
    ['ads.bing.com', new Set(['/msclkid'])],
    ['ads.linkedin.com', new Set(['/li/track'])],
    ['ads.yahoo.com', new Set(['/pixel'])],
    ['amazon-adsystem.com', new Set(['/e/ec'])],
    ['api-iam.intercom.io', new Set(['/messenger/web/events'])],
    ['api.amplitude.com', new Set(['/2/httpapi'])],
    ['api.hubspot.com', new Set(['/events'])],
    ['api-js.mixpanel.com', new Set(['/track'])],
    ['api.mixpanel.com', new Set(['/track'])],
    ['api.segment.io', new Set(['/v1/page', '/v1/track'])],
    ['heap.io', new Set(['/api/track'])],
    ['in.hotjar.com', new Set(['/api/v2/client'])],
    ['scorecardresearch.com', new Set(['/beacon.js'])],
    ['segment.io', new Set(['/v1/track'])],
    ['widget.intercom.io', new Set([])], // Host only
    ['ads-api.tiktok.com', new Set(['/api/v2/pixel'])],
    ['ads.pinterest.com', new Set(['/v3/conversions/events'])],
    ['analytics.snapchat.com', new Set(['/v1/batch'])],
    ['cnzz.com', new Set(['/stat.php'])],
    ['gdt.qq.com', new Set(['/gdt_mview.fcg'])],
    ['hm.baidu.com', new Set(['/hm.js'])],
    ['cloudflareinsights.com', new Set(['/cdn-cgi/rum'])],
    ['static.cloudflareinsights.com', new Set(['/beacon.min.js'])],
    ['bat.bing.com', new Set(['/action'])],
    ['monorail-edge.shopifysvc.com', new Set(['/v1/produce'])],
    ['vitals.vercel-insights.com', new Set(['/v1/vitals'])],
    ['pbd.yahoo.com', new Set(['/data/logs'])],
    ['plausible.io', new Set(['/api/event'])],
    ['analytics.tiktok.com', new Set(['/i18n/pixel/events.js'])],
    ['a.clarity.ms', new Set(['/collect'])],
    ['d.clarity.ms', new Set(['/collect'])],
    ['l.clarity.ms', new Set(['/collect'])],
    ['ingest.sentry.io', new Set(['/api/'])],
    ['agent-http-intake.logs.us5.datadoghq.com', new Set([])], // Host only
    ['browser-intake-datadoghq.com', new Set(['/api/v2/rum'])],
    ['browser-intake-datadoghq.eu', new Set(['/api/v2/rum'])],
    ['http-intake.logs.datadoghq.com', new Set(['/v1/input'])],
    ['ct.pinterest.com', new Set(['/v3'])],
    ['events.redditmedia.com', new Set(['/v1'])],
    ['s.pinimg.com', new Set(['/ct/core.js'])],
    ['www.redditstatic.com', new Set(['/ads/pixel.js'])],
    ['discord.com', new Set(['/api/v10/science', '/api/v9/science'])],
    ['vk.com', new Set(['/rtrg'])],
  ]),

  /**
   * 🚨 [V40.71 新增] 關鍵追蹤路徑模式 (通用)
   */
  CRITICAL_TRACKING_GENERIC_PATHS: new Set([
    '/ads/ga-audiences', '/doubleclick/', '/google-analytics/', '/googleadservices/', '/googlesyndication/',
    '/googletagmanager/', '/pagead/gen_204', '/tiktok/pixel/events', '/tiktok/track/', '/linkedin/insight/track',
    '/__utm.gif', '/j/collect', '/r/collect', '/api/batch', '/api/collect', '/api/event', '/api/events',
    '/api/log/', '/api/logs/', '/api/track/', '/api/v1/event', '/api/v1/events', '/api/v1/track',
    '/api/v2/event', '/api/v2/events', '/beacon/', '/collect?', '/data/collect', '/events/track', '/ingest/',
    '/intake', '/p.gif', '/pixel/', '/rec/bundle', '/t.gif', '/telemetry/', '/track/', '/v1/pixel',
    '/v2/track', '/v3/track', '/2/client/addlog_batch', '/plugins/easy-social-share-buttons/', '/event_report',
    '/log/aplus', '/v.gif', '/ad-sw.js', '/ads-sw.js', '/ad-call', '/adx/', '/adsales/', '/adserver/',
    '/adsync/', '/adtech/', '/abtesting/', '/b/ss', '/feature-flag/', '/i/adsct', '/track/m', '/track/pc',
    '/user-profile/', 'cacafly/track'
  ]),

  /**
   * 🚫 [V40.17 擴充, V40.68 擴充] 路徑關鍵字黑名單
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
    'advert', 'advertise', 'advertisement', 'advertiser', 'adview', 'ad-video', 'advideo', 'adware', 'adwhirl', 'adwords', 
    'adzcore', 'affiliate', 'alexametrics', 'allyes', 'amplitude', 'analysis', 'analysys', 'analytics', 'aottertrek', 
    'appadhoc', 'appads', 'appboy', 'appier', 'applovin', 'appsflyer', 'apptimize', 'apsalar', 'baichuan', 'bango', 
    'bangobango', 'bidvertiser', 'bingads', 'bkrtx', 'bluekai', 'breaktime', 'bugsense', 'burstly', 'cedexis', 
    'chartboost', 'circulate', 'click-fraud', 'clkservice', 'cnzz', 'cognitivlabs', 'collect', 'crazyegg', 'crittercism', 
    'cross-device', 'dealerfire', 'dfp', 'dienst', 'djns', 'dlads', 'dnserror', 'domob', 'doubleclick', 'doublemax', 
    'dsp', 'duapps', 'duomeng', 'dwtrack', 'egoid', 'emarbox', 'en25', 'eyeota', 'fenxi', 'fingerprinting', 'flurry', 
    'fwmrm', 'getadvltem', 'getexceptional', 'googleads', 'googlesyndication', 'greenplasticdua', 'growingio', 
    'guanggao', 'guomob', 'guoshipartners', 'heapanalytics', 'hotjar', 'hsappstatic', 'hubspot', 'igstatic', 'inmobi', 
    'innity', 'instabug', 'intercom', 'izooto', 'jpush', 'juicer', 'jumptap', 'kissmetrics', 'lianmeng', 'litix', 
    'localytics', 'logly', 'mailmunch', 'malvertising', 'matomo', 'medialytics', 'meetrics', 'mgid', 'mifengv', 
    'mixpanel', 'mobaders', 'mobclix', 'mobileapptracking', '/monitoring/', 'mvfglobal', 'networkbench', 'newrelic', 
    'omgmta', 'omniture', 'onead', 'openinstall', 'openx', 'optimizely', 'outstream', 'partnerad', 'pingfore', 'piwik', 
    'pixanalytics', 'playtomic', 'polyad', 'popin', 'popin2mdn', 'programmatic', 'pushnotification', 'quantserve', 
    'quantumgraph', 'queryly', 'qxs', 'rayjump', 'retargeting', 'ronghub', 'rtb', 'scorecardresearch', 'scupio', 
    'securepubads', 'sensor', 'sentry', 'shence', 'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'smartbanner', 
    'snowplow', 'socdm', 'sponsors', 'spy', 'spyware', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 'straas', 
    'studybreakmedia', 'stunninglover', 'supersonicads', 'syndication', 'taboola', 'tagtoo', 'talkingdata', 'tanx', 
    'tapjoy', 'tapjoyads', 'tenmax', 'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji', '/trace/', 'tracker', 
    'trackersimulator', 'tracking', 'trafficjunky', 'trafficmanager', 'tubemogul', 'uedas', 'umeng', 'umtrack', 
    'unidesk', 'usermaven', 'usertesting', 'vast', 'venraas', 'vilynx', 'vpaid', 'vpon', 'vungle', 'whalecloud', 'wistia', 'wlmonitor', 
    'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget', 'zgdfz6h7po', 'zgty365', 'zhengjian', 'zhengwunet', 'zhuichaguoji', 
    'zjtoolbar', 'zzhyyj',
    // --- Ad Tech ---
    '/ad-choices', '/ad-click', '/ad-code', '/ad-conversion',
    '/ad-engagement', '/ad-event', '/ad-events', '/ad-exchange', '/ad-impression', '/ad-inventory', '/ad-loader',
    '/ad-logic', '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request',
    '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', '/ad-tech',
    '/ad-telemetry', '/ad-unit', '/ad-verification', '/ad-view', '/ad-viewability', '/ad-wrapper', '/adframe/',
    '/adrequest/', '/adretrieve/', '/adserve/', '/adserving/', '/fetch_ads/', '/getad/', '/getads/', 'ad-break', 
    'ad_event', 'ad_logic', 'ad_pixel', 'ad-call', 'adsbygoogle', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 
    'amp-sticky-ad', 'amp4ads', 'apstag', 'google_ad', 'pagead', 'pwt.js',
    // --- Tracking & Analytics ---
    '/analytic/', '/analytics/', '/api/v2/rum', '/audit/', '/beacon/', '/collect?', '/collector/', 'g/collect', '/insight/',
    '/intelligence/', '/measurement', 'mp/collect', '/pixel/', '/report/', '/reporting/', '/reports/',
    '/telemetry/', '/unstable/produce_batch', '/v1/produce',
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
   */
  PATH_ALLOW_PREFIXES: new Set([
      '/.well-known/'
  ]),
  
  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 後綴 (Path Allowlist - Suffixes)
   */
  PATH_ALLOW_SUFFIXES: new Set([
    // --- 框架 & 套件常用檔 ---
    'app.js', 'bundle.js', 'chunk.js', 'chunk.mjs', 'common.js', 'framework.js', 'framework.mjs', 'index.js',
    'index.mjs', 'main.js', 'polyfills.js', 'polyfills.mjs', 'runtime.js', 'styles.css', 'styles.js', 'vendor.js',
    // --- 靜態資產與固定檔名 ---
    'badge.svg', 'browser.js', 'card.js', 'chunk-common', 'chunk-vendors', 'component---', 'config.js', 'favicon.ico',
    'fetch-polyfill', 'head.js', 'header.js', 'icon.svg', 'legacy.js', 'loader.js', 'logo.svg', 'manifest.json',
    'modal.js', 'padding.css', 'page-data.js', 'polyfill.js', 'robots.txt', 'sitemap.xml', 'sw.js', 'theme.js', 
    'web.config',
  ]),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 子字串 (Path Allowlist - Substrings)
   */
  PATH_ALLOW_SUBSTRINGS: new Set([
    '_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/',
  ]),

  /**
   * ✅ [V40.6 安全強化, V40.65 恢復] 路徑白名單 - 區段 (Path Allowlist - Segments)
   */
  PATH_ALLOW_SEGMENTS: new Set([
    'admin', 'api', 'blog', 'catalog', 'dashboard', 'dialog', 'login',
  ]),

  /**
   * 🚫 [V40.55 新增] 高信度追蹤關鍵字 (用於條件式豁免)
   */
  HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH: new Set([
    '/ads', '/analytics', '/api/track', '/beacon', '/collect', '/pixel', '/tracker'
  ]),

  /**
   * 💧 [V40.17 擴充] 直接拋棄請求 (DROP) 的關鍵字
   */
  DROP_KEYWORDS: new Set([
    // --- 日誌 & 遙測 (Logging & Telemetry) ---
    '.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 'airbrake',
    'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 'crashlytics', 'csp-report',
    'data-pipeline', 'error-monitoring', 'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event',
    'logevents', 'loggly', 'log-hl', 'realtime-log', 'rum', 'server-event', 'telemetry', 'uploadmobiledata', 'web-beacon', 
    'web-vitals',
    // --- 錯誤 & 診斷 (Error & Diagnostics) ---
    'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json',
  ]),

  /**
   * 🗑️ [V40.69 擴充] 追蹤參數黑名單 (全域)
   */
  GLOBAL_TRACKING_PARAMS: new Set([
     '_branch_match_id', '_ga', '_gl', '_gid', '_openstat', 'admitad_uid', 'aiad_clid', 'awc', 'btag',
     'cjevent', 'cmpid', 'cuid', 'dclid', 'external_click_id', 'fbclid', 'gad_source', 'gclid', 
     'gclsrc', 'gbraid', 'gps_adid', 'iclid', 'igshid', 'irclickid', 'is_retargeting', 
     'ko_click_id', 'li_fat_id', 'mc_cid', 'mc_eid', 'mibextid', 'msclkid', 'oprtrack', 'rb_clickid',
     'srsltid', 'sscid', 'trk', 'ttclid', 'twclid', 'usqp', 'vero_conv', 'vero_id', 'wbraid',
     'wt_mc', 'xtor', 'yclid', 'ysclid', 'zanpid',
  ]),

  /**
   * 🗑️ [V40.37 新增] Regex 追蹤參數黑名單 (全域)
   */
  GLOBAL_TRACKING_PARAMS_REGEX: [
      /^utm_\w+/,
      /^ig_[\w_]+/,
      /^asa_\w+/,
      /^tt_[\w_]+/,
      /^li_[\w_]+/,
  ],

  /**
   * 🗑️ [V40.69 擴充] 追蹤參數前綴黑名單
   */
  TRACKING_PREFIXES: new Set([
    '__cf_', '_bta', '_ga_', '_gat_', '_gid_', '_hs', '_oly_', 'action_', 'ad_', 'adjust_', 'aff_', 'af_', 
    'alg_', 'at_', 'bd_', 'bsft_', 'campaign_', 'cj', 'cm_', 'content_', 'creative_', 'fb_', 'from_', 
    'gcl_', 'guce_', 'hmsr_', 'hsa_', 'ir_', 'itm_', 'li_', 'matomo_', 'medium_', 'mkt_', 'ms_', 'mt_', 
    'mtm', 'pk_', 'piwik_', 'placement_', 'ref_', 'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_', 
    'ttc_', 'vsm_', 'li_fat_', 'linkedin_',
  ]),

  /**
   * 🗑️ [V40.37 新增] Regex 追蹤參數前綴黑名單
   */
  TRACKING_PREFIXES_REGEX: [
      /^_ga_/,
      /^tt_[\w_]+/,
      /^li_[\w_]+/,
  ],

  /**
   * 🗑️ [V40.69 擴充] 裝飾性參數黑名單
   */
  COSMETIC_PARAMS: new Set([
    'fb_ref', 'fb_source', 'from', 'ref', 'share_id', 'source', 'spot_im_redirect_source'
  ]),

  /**
   * ✅ [V40.53 擴充] 必要參數白名單
   */
  PARAMS_TO_KEEP_WHITELIST: new Set([
    // --- 核心 & 搜尋 ---
    'code', 'id', 'item', 'p', 'page', 'product_id', 'q', 'query', 'search', 'session_id', 'state', 't', 'targetid', 'token', 'v',
    // --- 通用功能 ---
    'callback', 'filter', 'format', 'lang', 'locale', 'status', 'timestamp', 'type',
    // --- [V40.51 新增] OAuth 流程 ---
    'access_token', 'client_assertion', 'client_id', 'device_id', 'nonce', 'redirect_uri', 'refresh_token', 'response_type', 'scope',
    // --- [V40.53 新增] 分頁 & 排序 ---
    'direction', 'limit', 'offset', 'order', 'page_number', 'size', 'sort', 'sort_by',
    // --- [V40.53 新增] 聯盟行銷 & 返利 ---
    'aff_sub', 'click_id', 'deal_id', 'offer_id',
    // --- 支付與認證流程 ---
    'cancel_url', 'error_url', 'return_url', 'success_url',
  ]),

  /**
   * 🚫 [V40.40 重構, V40.64 擴充] 基於正規表示式的路徑黑名單 (高信度)
   */
  PATH_BLOCK_REGEX: [
    /^\/(?!_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,
    /\/v\d+\/event/i,
    /\/collect$/i,
    /\/service\/collect$/i,
    /\/api\/v\d+\/collect$/i,
  ],

  /**
   * 🚫 [V40.40 新增] 啟發式路徑攔截 Regex (實驗性)
   */
  HEURISTIC_PATH_BLOCK_REGEX: [
      /[a-z0-9\-_]{32,}\.(js|mjs)$/i,
  ],

  /**
   * ✅ [V40.45 新增] 路徑豁免清單 (高風險)
   */
  PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS: new Map([
    ['graph.facebook.com', new Set([
        '/v19.0/',
        '/v20.0/',
    ])],
  ]),
};
// #################################################################################################
// #                                                                                               #
// #                      🚀 HYPER-OPTIMIZED CORE ENGINE (V40.72+)                                 #
// #                                                                                               #
// #################################################################################################

// ================================================================================================
// 🚀 CORE CONSTANTS
// ================================================================================================
// ========== 時間與常量 ==========
const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now() : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, PARAM_CLEAN: 3, SOFT_WHITELISTED: 4 });

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif', 'Content-Length': '43' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const NO_CONTENT_RESPONSE = { response: { status: 204 } };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });

const IMAGE_EXTENSIONS  = new Set(['.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);

// ========== 觀測與錯誤 ==========
class ScriptExecutionError extends Error {
  constructor(message, context = {}) { super(message); this.name = 'ScriptExecutionError'; this.context = context; this.timestamp = new Date().toISOString(); }
}
class OptimizedPerformanceStats {
  constructor() {
    this.counters = Object.create(null);
    this.timings  = Object.create(null);
    [
      'totalRequests','blockedRequests','domainBlocked','pathBlocked','regexPathBlocked',
      'criticalScriptBlocked','paramsCleaned','hardWhitelistHits','softWhitelistHits',
      'errors','l1CacheHits','l2CacheHits','urlCacheHits','regexRejectedByAudit','regexAutoRewritten'
    ].forEach(k => this.counters[k] = 0);
    ['parse','whitelist','l1','domainStage','critical','allowlistEval','pathTrie','pathRegex','params','total','init'].forEach(b => this.timings[b] = 0);
  }
  increment(k){ if (k in this.counters) this.counters[k]++; }
  addTiming(b,ms){ if (b in this.timings) this.timings[b]+=ms; }
  getStats(){ return { ...this.counters, timings: { ...this.timings } }; }
}
const optimizedStats = new OptimizedPerformanceStats();
function logError(error, context = {}) {
  optimizedStats.increment('errors');
  if (typeof console !== 'undefined' && console.error) console.error('[URL-Filter-v40.72-mwa]', new ScriptExecutionError(error.message, { ...context, stack: error.stack }));
}

// ========== 記憶體優化：壓縮 Trie ==========
/**
 * Radix/Compact Trie：邊標籤為字串以壓縮單度節點，節省節點與指標數量。
 * 適用：一般字串 startsWith/contains 類查詢（此處用於參數前綴）。
 */
class RadixTrie {
  constructor(){ this.root = Object.create(null); this.root.edges = Object.create(null); this.root.end = false; }
  insert(word){
    if(!word) return;
    let node = this.root;
    let i = 0;
    while(i < word.length){
      const ch = word[i];
      let edge = node.edges[ch];
      if(edge === undefined){
        node.edges[ch] = { label: word.slice(i), edges: Object.create(null), end: true };
        return;
      }
      // 比對現有邊標籤的最長共同前綴
      const lbl = edge.label;
      let j = 0;
      while(i + j < word.length && j < lbl.length && word[i + j] === lbl[j]) j++;
      if (j === lbl.length){
        // 完全匹配此邊，向下
        i += j;
        node = edge;
      } else {
        // 分裂邊
        const common = lbl.slice(0, j);
        const remainOld = lbl.slice(j);
        const remainNew = word.slice(i + j);

        const oldChild = { label: remainOld, edges: edge.edges, end: edge.end };
        const newChild = { label: remainNew, edges: Object.create(null), end: true };

        edge.label = common;
        edge.edges = Object.create(null);
        edge.end = false;
        edge.edges[remainOld[0]] = oldChild;
        edge.edges[remainNew[0]] = newChild;
        return;
      }
    }
    node.end = true;
  }
  // 檢查是否存在某一前綴
  startsWith(prefix){
    if(!prefix) return false;
    let node = this.root;
    let i = 0;
    while(i < prefix.length){
      const ch = prefix[i];
      const edge = node.edges[ch];
      if(edge === undefined) return false;
      const lbl = edge.label;
      let j = 0;
      while(i + j < prefix.length && j < lbl.length && prefix[i + j] === lbl[j]) j++;
      if (j < lbl.length) return false; // 邊標籤不完全覆蓋查詢前綴
      i += j;
      node = edge;
      if (node.end) return true; // 任一路徑的終點視為命中（對前綴表達足夠）
    }
    return node.end === true;
  }
}

/**
 * DomainLabelTrie：以 DNS 標籤為單位（由右至左）建 Trie，天然避免跨標籤假陽性並壓縮節點。
 * 例如：'a.b.example.com' 以 ['com','example','b','a'] 插入，匹配子域必須沿標籤完整對齊。
 */
class DomainLabelTrie {
  constructor(){ this.root = new Map(); this.END = Symbol('END'); }
  insert(domain){
    const labels = domain.toLowerCase().split('.').reverse();
    let node = this.root;
    for(const label of labels){
      if(!node.has(label)) node.set(label, new Map());
      node = node.get(label);
    }
    node.set(this.END, true);
  }
  // isBlocked('sub.example.com')：沿標籤向上匹配，遇 END 即命中。
  isBlocked(hostname){
    const labels = hostname.toLowerCase().split('.').reverse();
    let node = this.root;
    for(const label of labels){
      if(node.has(this.END)) return true; // 完整規則命中（example.com 將覆蓋所有子域）
      if(!node.has(label)) return false;
      node = node.get(label);
    }
    return node.has(this.END);
  }
}

// ========== Aho–Corasick（JS） ==========
class AhoCorasick {
  constructor(patterns = []) {
    this.goto = [Object.create(null)];
    this.out  = [new Set()];
    this.fail = [0];
    this._build(patterns);
  }
  _build(patterns) {
    for (let pid = 0; pid < patterns.length; pid++) {
      const p = patterns[pid];
      let s = 0;
      for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (this.goto[s][c] === undefined) {
          this.goto[s][c] = this.goto.length;
          this.goto.push(Object.create(null));
          this.out.push(new Set());
          this.fail.push(0);
        }
        s = this.goto[s][c];
      }
      this.out[s].add(pid);
    }
    const q = [];
    for (const c in this.goto[0]) { const s = this.goto[0][c]; q.push(s); this.fail[s] = 0; }
    let head = 0;
    while (head < q.length) {
      const r = q[head++];
      for (const c in this.goto[r]) {
        const s = this.goto[r][c];
        q.push(s);
        let state = this.fail[r];
        while (this.goto[state][c] === undefined && state !== 0) state = this.fail[state];
        this.fail[s] = this.goto[state][c] !== undefined ? this.goto[state][c] : 0;
        for (const v of this.out[this.fail[s]]) this.out[s].add(v);
      }
    }
  }
  matches(text, maxScanLength = Infinity) {
    const N = Math.min(text.length, maxScanLength);
    let s = 0;
    for (let i = 0; i < N; i++) {
      const c = text[i];
      while (this.goto[s][c] === undefined && s !== 0) s = this.fail[s];
      s = this.goto[s][c] !== undefined ? this.goto[s][c] : 0;
      if (this.out[s].size) return true;
    }
    return false;
  }
}

// ========== 可選：Wasm 加速介面 ==========
const WasmAccelerator = {
  ready: false,
  mod: null,
  api: null, // { acBuild(ptr), acMatch(ptr,strPtr,len,maxLen) ... } 的抽象，實作依 wasm 匯出而定
  async initFrom(config){
    try{
      if (config?.WASM_AC_BASE64) {
        const bin = Uint8Array.from(atob(config.WASM_AC_BASE64), c => c.charCodeAt(0));
        const { instance } = await WebAssembly.instantiate(bin.buffer, {});
        this.mod = instance; this.api = instance.exports; this.ready = true; return true;
      }
      if (config?.WASM_AC_URL && typeof WebAssembly.instantiateStreaming === 'function') {
        const { instance } = await WebAssembly.instantiateStreaming(fetch(config.WASM_AC_URL), {});
        this.mod = instance; this.api = instance.exports; this.ready = true; return true;
      }
      return false;
    }catch(e){ logError(e, { stage: 'Wasm.init' }); return false; }
  },
  // 介面預留：此示例仍用 JS AC，若已接入 wasm，可在此委派到 this.api
  buildAC(patterns){ return new AhoCorasick(patterns); },
  acMatches(ac, text, maxLen){ return ac.matches(text, maxLen); }
};

// ========== Regex 審核與編譯 ==========
const RegexAuditor = {
  // 簡單靜態規則：偵測常見風險，如 (.+)+、(.*)+、(.+.*)+、(.*){m,} 與交錯選擇內含重複等
  dangerous(raw){
    const s = raw instanceof RegExp ? raw.source : String(raw);
    if (s.includes('(?R)')) return true;            // 遞迴式（JS 幾乎不支援，但防誤）
    if (/(?:\([^)]*[\+\*][^)]*\))[\+\*]/.test(s)) return true; // 嵌套量詞
    if (/\.\+.*\+/.test(s)) return true;            // .+ 之後又遇到 +
    if (/\.\*.*\+/.test(s)) return true;            // .* ... +
    if (/\([^\)]*\|\)[^\)]*\+/.test(s)) return false; // 粗略排除
    return false;
  },
  tryRewriteSafe(raw){
    // 嘗試將 (.*) 重複改為非貪婪 (.*?)，或以 [^&]* 等等替代（僅對 URL 參數常見模式安全）
    let s = raw instanceof RegExp ? raw.source : String(raw);
    const original = s;
    s = s.replace(/\(\.\*\)/g, '(.*?)');
    s = s.replace(/\(\.\+\)/g, '(.+?)');
    if (s !== original) return new RegExp(s);
    return null;
  },
  compileList(name, list, stats){
    const out = [];
    for (const item of list){
      try{
        if (this.dangerous(item)){
          const rewritten = this.tryRewriteSafe(item);
          if (rewritten){
            out.push(rewritten); stats.increment('regexAutoRewritten'); continue;
          }
          stats.increment('regexRejectedByAudit'); continue; // 嚴格模式：拒用
        }
        out.push(item instanceof RegExp ? item : new RegExp(item));
      }catch(e){ logError(e, { stage: 'Regex.compile', name, item: String(item) }); }
    }
    return out;
  }
};

// ========== 高效快取（穩定鍵） ==========
class HighPerformanceLRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize; this.cache = new Map();
    this.head = { k: null, v: null, p: null, n: null };
    this.tail = { k: null, v: null, p: null, n: null };
    this.head.n = this.tail; this.tail.p = this.head;
  }
  _add(node){ node.p = this.head; node.n = this.head.n; this.head.n.p = node; this.head.n = node; }
  _remove(node){ node.p.n = node.n; node.n.p = node.p; }
  _move(node){ this._remove(node); this._add(node); }
  _pop(){ const last = this.tail.p; this._remove(last); return last; }
  get(key){
    const n = this.cache.get(key);
    if (!n) return null;
    if (n.exp && n.exp < Date.now()){ this._remove(n); this.cache.delete(key); return null; }
    this._move(n); return n.v;
  }
  set(key, value, ttlMs = 0){
    let n = this.cache.get(key);
    const exp = ttlMs > 0 ? Date.now() + ttlMs : 0;
    if (n){ n.v = value; n.exp = exp; this._move(n); }
    else {
      n = { k: key, v: value, p: null, n: null, exp };
      if (this.cache.size >= this.maxSize){ const t = this._pop(); this.cache.delete(t.k); }
      this.cache.set(key, n); this._add(n);
    }
  }
}
const stableKey = (ns, a = '', b = '') => `${ns}|${a}|${b}`;
class MultiLevelCacheManager {
  constructor(){ this.l1Domain = new HighPerformanceLRUCache(512); this.l2Decision = new HighPerformanceLRUCache(4096); this.urlStr = new HighPerformanceLRUCache(256); }
  getDomainDecision(h){ return this.l1Domain.get(h); }
  setDomainDecision(h, d, ttl=0){ this.l1Domain.set(h,d,ttl); }
  getUrlDecision(ns,a,b){ const v = this.l2Decision.get(stableKey(ns,a,b)); if (v!==null) optimizedStats.increment('l2CacheHits'); return v; }
  setUrlDecision(ns,a,b,d){ this.l2Decision.set(stableKey(ns,a,b), d); }
  getUrlString(s){ const v = this.urlStr.get(s); if (v!==null) optimizedStats.increment('urlCacheHits'); return v; }
  setUrlString(s){ this.urlStr.set(s, s); }
}
const multiLevelCache = new MultiLevelCacheManager();

// ========== 編譯後索引 ==========
let COMPILED_BLOCK_DOMAINS_REGEX = [];
let COMPILED_GLOBAL_TRACKING_PARAMS_REGEX = [];
let COMPILED_TRACKING_PREFIXES_REGEX = [];
let COMPILED_PATH_BLOCK_REGEX = [];
let COMPILED_HEURISTIC_PATH_BLOCK_REGEX = [];

const DOMAIN_BLOCK_TRIE = new DomainLabelTrie(); // 以標籤壓縮
const PARAM_PREFIX_TRIE = new RadixTrie();       // 以壓縮 Trie 儲存常見參數前綴

let AC_PATH_BLOCK = null;
let AC_CRITICAL_GENERIC = null;

const REGEX_FIRST_CHAR_BUCKET = new Set(['u','i','a','t','l','_']); // utm_, ig_, asa_, tt_, li_, _ga_

// ========== 初始化（非同步） ==========
let ENGINE_READY = false;
async function initializeCoreEngineAsync() {
  const t0 = __now__();
  try{
    // 1) Regex 編譯（含審核）
    COMPILED_BLOCK_DOMAINS_REGEX          = RegexAuditor.compileList('BLOCK_DOMAINS_REGEX', CONFIG.BLOCK_DOMAINS_REGEX || [], optimizedStats);
    COMPILED_GLOBAL_TRACKING_PARAMS_REGEX = RegexAuditor.compileList('GLOBAL_TRACKING_PARAMS_REGEX', CONFIG.GLOBAL_TRACKING_PARAMS_REGEX || [], optimizedStats);
    COMPILED_TRACKING_PREFIXES_REGEX      = RegexAuditor.compileList('TRACKING_PREFIXES_REGEX', CONFIG.TRACKING_PREFIXES_REGEX || [], optimizedStats);
    COMPILED_PATH_BLOCK_REGEX             = RegexAuditor.compileList('PATH_BLOCK_REGEX', CONFIG.PATH_BLOCK_REGEX || [], optimizedStats);
    COMPILED_HEURISTIC_PATH_BLOCK_REGEX   = RegexAuditor.compileList('HEURISTIC_PATH_BLOCK_REGEX', CONFIG.HEURISTIC_PATH_BLOCK_REGEX || [], optimizedStats);

    // 2) Trie（壓縮）
    (CONFIG.TRACKING_PREFIXES || []).forEach(p => PARAM_PREFIX_TRIE.insert(String(p || '').toLowerCase()));
    (CONFIG.BLOCK_DOMAINS || []).forEach(d => DOMAIN_BLOCK_TRIE.insert(String(d || '').toLowerCase()));

    // 3) AC：可選 Wasm
    const wasmOk = await WasmAccelerator.initFrom(CONFIG).catch(()=>false);
    AC_PATH_BLOCK = WasmAccelerator.buildAC(Array.from(CONFIG.PATH_BLOCK_KEYWORDS || []));
    AC_CRITICAL_GENERIC = WasmAccelerator.buildAC(Array.from(CONFIG.CRITICAL_TRACKING_GENERIC_PATHS || []));

    ENGINE_READY = true;
  }catch(e){ logError(e, { stage: 'initializeCoreEngineAsync' }); }
  finally{ optimizedStats.addTiming('init', __now__() - t0); }
}

// ========== 白名單 / 域名封鎖 ==========
function getWhitelistMatchDetails(hostname, exactSet = new Set(), wildcardSet = new Set()) {
  const host = hostname.toLowerCase();
  if (exactSet.has(host)) return { matched: true, rule: host, type: 'Exact' };
  // wildcardSet 存儲為根域，例如 example.com；以標籤沿路向上檢查
  let d = host;
  while(true){
    if (wildcardSet.has(d)) return { matched: true, rule: d, type: 'Wildcard' };
    const i = d.indexOf('.');
    if (i === -1) break;
    d = d.slice(i+1);
  }
  return { matched: false };
}

function isDomainBlocked(hostname) {
  // 先以標籤 Trie 判斷，再以 Regex 複核保障彈性
  if (DOMAIN_BLOCK_TRIE.isBlocked(hostname)) return true;
  for (const rx of COMPILED_BLOCK_DOMAINS_REGEX) if (rx.test(hostname)) return true;
  return false;
}

// ========== 關鍵追蹤偵測 ==========
function isCriticalTrackingScript(hostname, lowerFullPath) {
  const cached = multiLevelCache.getUrlDecision('crit', hostname, lowerFullPath);
  if (cached !== null) return cached;

  const qIdx = lowerFullPath.indexOf('?');
  const pathOnly = qIdx !== -1 ? lowerFullPath.slice(0, qIdx) : lowerFullPath;
  const slashIndex = pathOnly.lastIndexOf('/');
  const scriptName = slashIndex !== -1 ? pathOnly.slice(slashIndex + 1) : pathOnly;

  if (scriptName && CONFIG.CRITICAL_TRACKING_SCRIPTS?.has(scriptName)) { multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true); return true; }

  const hostPrefixes = CONFIG.CRITICAL_TRACKING_MAP?.get(hostname);
  if (hostPrefixes) {
    if (hostPrefixes.size === 0) { multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true); return true; }
    for (const prefix of hostPrefixes) if (lowerFullPath.startsWith(prefix)) { multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true); return true; }
  }

  if (WasmAccelerator.acMatches(AC_CRITICAL_GENERIC, pathOnly, 1024)) { multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true); return true; }

  multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, false);
  return false;
}

// ========== 路徑允許 / 阻擋 ==========
function isPathExplicitlyAllowed(lowerPathOnly) {
  const k = multiLevelCache.getUrlDecision('allow:path', lowerPathOnly, '');
  if (k !== null) return k;

  const runSecondaryCheck = (pathToCheck) => {
    for (const trackerKeyword of (CONFIG.HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH || [])) if (pathToCheck.includes(trackerKeyword)) return false;
    return true;
  };

  for (const substring of (CONFIG.PATH_ALLOW_SUBSTRINGS || [])) {
    if (lowerPathOnly.includes(substring)) { const r = runSecondaryCheck(lowerPathOnly); multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', r); return r; }
  }

  const segments = lowerPathOnly.startsWith('/') ? lowerPathOnly.substring(1).split('/') : lowerPathOnly.split('/');
  for (const segment of segments) {
    if (CONFIG.PATH_ALLOW_SEGMENTS?.has(segment)) { const r = runSecondaryCheck(lowerPathOnly); multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', r); return r; }
  }

  for (const suffix of (CONFIG.PATH_ALLOW_SUFFIXES || [])) {
    if (lowerPathOnly.endsWith(suffix)) {
      const parentPath = lowerPathOnly.substring(0, lowerPathOnly.lastIndexOf('/'));
      const r = runSecondaryCheck(parentPath);
      multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', r);
      return r;
    }
  }

  multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', false);
  return false;
}

function isPathBlockedByKeywords(lowerPathOnly, isExplicitlyAllowed) {
  const c = multiLevelCache.getUrlDecision('path:ac', lowerPathOnly, '');
  if (c !== null) return c;
  let r = false;
  if (!isExplicitlyAllowed && WasmAccelerator.acMatches(AC_PATH_BLOCK, lowerPathOnly, 1024)) r = true;
  multiLevelCache.setUrlDecision('path:ac', lowerPathOnly, '', r);
  return r;
}

function isPathBlockedByRegex(lowerPathOnly, isExplicitlyAllowed) {
  const c = multiLevelCache.getUrlDecision('path:rx', lowerPathOnly, '');
  if (c !== null) return c;

  for (const prefix of (CONFIG.PATH_ALLOW_PREFIXES || [])) if (lowerPathOnly.startsWith(prefix)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false); return false; }
  if (isExplicitlyAllowed) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false); return false; }

  for (const regex of COMPILED_PATH_BLOCK_REGEX) if (regex.test(lowerPathOnly)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }
  for (const regex of COMPILED_HEURISTIC_PATH_BLOCK_REGEX) if (regex.test(lowerPathOnly)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }

  multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false);
  return false;
}

// ========== 阻擋回應 ==========
function getBlockResponse(pathLowercase) {
  for (const keyword of (CONFIG.DROP_KEYWORDS || [])) if (pathLowercase.includes(keyword)) return DROP_RESPONSE;
  const dotIndex = pathLowercase.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = pathLowercase.substring(dotIndex);
    if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
    if (SCRIPT_EXTENSIONS.has(ext)) return NO_CONTENT_RESPONSE;
  }
  return REJECT_RESPONSE;
}

// ========== 參數清理 ==========
function cleanTrackingParams(urlOrObj) {
  const urlObj = (typeof urlOrObj === 'string') ? new URL(urlOrObj) : new URL(urlOrObj.toString());
  const original = urlObj.search;
  let modified = false; const del = [];

  for (const key of urlObj.searchParams.keys()) {
    const lowerKey = key.toLowerCase();
    if (CONFIG.PARAMS_TO_KEEP_WHITELIST?.has(lowerKey)) continue;

    if (CONFIG.GLOBAL_TRACKING_PARAMS?.has(lowerKey) || CONFIG.COSMETIC_PARAMS?.has(lowerKey) || PARAM_PREFIX_TRIE.startsWith(lowerKey)) {
      del.push(key); modified = true; continue;
    }

    const first = lowerKey[0];
    if (REGEX_FIRST_CHAR_BUCKET.has(first)) {
      let matched = false;
      for (const rx of COMPILED_GLOBAL_TRACKING_PARAMS_REGEX) { if (rx.test(lowerKey)) { del.push(key); modified = true; matched = true; break; } }
      if (matched) continue;
      for (const rx of COMPILED_TRACKING_PREFIXES_REGEX) { if (rx.test(lowerKey)) { del.push(key); modified = true; break; } }
    }
  }

  if (modified) {
    del.forEach(k => urlObj.searchParams.delete(k));
    if (original) urlObj.hash = 'cleaned';
    return urlObj.toString();
  }
  return null;
}

// ========== 日誌脫敏 ==========
function getSanitizedUrlForLogging(url) {
  try {
    const u = new URL(url.toString());
    const sens = ['token','password','key','secret','auth','otp','access_token','refresh_token'];
    for (const k of u.searchParams.keys()){
      const lk = k.toLowerCase();
      for (const s of sens) if (lk.includes(s)) { u.searchParams.set(k, 'REDACTED'); break; }
    }
    return u.toString();
  }catch(_){ return (typeof url === 'string' ? url.split('?')[0] : '<INVALID_URL_OBJECT>') + '?<URL_PARSE_ERROR>'; }
}

// ========== 主流程（含未就緒快速路徑） ==========
function processRequest(request) {
  const t0 = __now__();
  try {
    optimizedStats.increment('totalRequests');
    if (!request?.url || typeof request.url !== 'string' || request.url.length < 10) { optimizedStats.addTiming('total', __now__() - t0); return null; }

    // 解析 URL（以字串快取避免 URL 物件狀態污染）
    const tParse0 = __now__();
    const rawUrl = request.url;
    let cachedRaw = multiLevelCache.getUrlString(rawUrl);
    if (!cachedRaw) { multiLevelCache.setUrlString(rawUrl); cachedRaw = rawUrl; }
    const url = new URL(cachedRaw);
    optimizedStats.addTiming('parse', __now__() - tParse0);

    if (url.hash === '#cleaned') { optimizedStats.addTiming('total', __now__() - t0); return null; }

    const hostname      = url.hostname.toLowerCase();
    const pathnameLower = url.pathname.toLowerCase();
    const fullLower     = (url.pathname + url.search).toLowerCase();

    // 未就緒：極簡保守路徑（可選擇只放行或最小清理）
    if (!ENGINE_READY) {
      // 硬白名單
      const hard = getWhitelistMatchDetails(hostname, CONFIG.HARD_WHITELIST_EXACT, CONFIG.HARD_WHITELIST_WILDCARDS);
      if (hard.matched) { optimizedStats.increment('hardWhitelistHits'); optimizedStats.addTiming('total',
