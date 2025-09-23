/**
 * @file        URL-Ultimate-Filter-Surge-V40.64.js
 * @version     40.64 (通用追蹤端點攔截強化)
 * @description 強化對通用追蹤端點 (如 /collect) 的攔截能力。將 'collect' 納入關鍵字黑名單，並新增多項正則表達式規則以覆蓋 API 形式的追蹤路徑變體。
 * @author      Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-09-23
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
   * 1. 參數清理將轉為「僅記錄模式」，不會執行實際重導向。
   * 2. 「啟發式規則」的命中事件將被詳細記錄至控制台。
   * 3. [V40.42 新增] 白名單（硬/軟）的命中事件將被詳細記錄。
   * 4. [V40.43 新增] 每個請求的處理耗時將被精確計時並記錄。
   */
  DEBUG_MODE: false,

  /**
   * ✳️ [V40.59 新增, V40.60 重構] 啟發式直跳域名列表
   * 說明：此處的域名被視為純粹的 URL 跳轉器。腳本將優先嘗試從其 URL 參數中解析並直接跳轉至最終目標。
   */
  REDIRECTOR_HOSTS: [
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
  ].sort(),

  /**
   * ✳️ 硬白名單 - 精確匹配 (Hard Whitelist - Exact)
   * 說明：完全豁免所有檢查。此處的域名需要完整且精確的匹配。
   */
  HARD_WHITELIST_EXACT: [
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
  ].sort(),

  /**
   * ✳️ 硬白名單 - 萬用字元 (Hard Whitelist - Wildcards)
   * 說明：完全豁免所有檢查。此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  HARD_WHITELIST_WILDCARDS: [
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
  ].sort(),

  /**
   * ✅ 軟白名單 - 精確匹配 (Soft Whitelist - Exact)
   * 說明：豁免「路徑黑名單層 (Path Blacklist)」的檢查，但仍會執行「參數清理」與「關鍵追蹤模式攔截」。
   */
  SOFT_WHITELIST_EXACT: [
    // --- Common APIs ---
    'a-api.anthropic.com', 'api.anthropic.com', 'api.cohere.ai', 'api.github.com', 'api.hubapi.com',
    'api.mailgun.com', 'api.openai.com', 'api.pagerduty.com', 'api.sendgrid.com', 'api.telegram.org',
    'api.zendesk.com', 'duckduckgo.com', 'legy.line-apps.com', 'obs.line-scdn.net', 'secure.gravatar.com',
    // --- 生產力 & 協作工具 ---
    'api.asana.com', 'api.dropboxapi.com', 'api.figma.com', 'api.notion.com', 'api.trello.com',
    // --- 開發 & 部署平台 ---
    'api.cloudflare.com', 'api.digitalocean.com', 'api.fastly.com', 'api.heroku.com', 'api.netlify.com', 'api.vercel.com',
    'auth.docker.io', 'database.windows.net', 'login.docker.com',
    // --- 台灣地區服務 ---
    'api.irentcar.com.tw', 'gateway.shopback.com.tw', 'usiot.roborock.com',
    // --- [V40.47] 修正：內容功能域不應被完全封鎖 ---
    'visuals.feedly.com',
  ].sort(),

  /**
   * ✅ 軟白名單 - 萬用字元 (Soft Whitelist - Wildcards)
   * 說明：豁免「路徑黑名單層 (Path Blacklist)」的檢查，但仍會執行「參數清理」與「關鍵追蹤模式攔截」。
   * 此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  SOFT_WHITELIST_WILDCARDS: [
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
  ].sort(),

  /**
   * 🚫 [V40.51 強化, V40.61 擴充] 域名攔截黑名單
   * 說明：僅列出純粹用於廣告、追蹤或分析的域名。此清單將被高速查詢。
   */
  BLOCK_DOMAINS: [
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
    'bat.bing.com', 'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'everesttech.net', 'hs-analytics.net',
    'hs-scripts.com', 'monorail-edge.shopifysvc.com', 'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com',
    // --- 社交平台追蹤子網域 ---
    'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com',
    'snap.licdn.com', 'spade.twitch.tv',
    // --- 其他 ---
    'adnx.com', 'cint.com', 'revjet.com', 'rlcdn.com', 'sc-static.net', 'wcs.naver.net',
  ].sort()),

  /**
   * 🚫 [V40.35 新增] Regex 域名攔截黑名單
   * 說明：用於攔截符合特定模式的域名，僅在標準域名黑名單未命中時執行，以平衡效能。
   */
  BLOCK_DOMAINS_REGEX: [
    // --- 台灣新聞媒體廣告 (動態子域名) ---
    /^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/, // Matches ad.ettoday.net, ads.ettoday.net, ad1.ettoday.net, ad.ltn.com.tw etc.
  ],
  
  /**
   * 🚨 [V40.61 擴充] 關鍵追蹤腳本攔截清單
   */
  CRITICAL_TRACKING_SCRIPTS: [
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
  ].sort(),

  /**
   * 🚨 [V40.61 擴充] 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATTERNS: [
  // --- Google ---
  '/ads/ga-audiences', '/doubleclick/', '/google-analytics/', '/googleadservices/', '/googlesyndication/',
  '/googletagmanager/', '/pagead/gen_204', '/stats.g.doubleclick.net/j/collect', 'google.com/ads', 'google.com/pagead',

  // --- GA4 Measurement Protocol / Client (新增) ---
  'analytics.google.com/g/collect', 'region1.analytics.google.com/g/collect', 'stats.g.doubleclick.net/g/collect', 'www.google-analytics.com/debug/mp/collect', 
  'www.google-analytics.com/g/collect', 'www.google-analytics.com/j/collect', 'www.google-analytics.com/mp/collect',

  // --- Facebook / Meta ---
  'facebook.com/tr', 'facebook.com/tr/',

  // --- [V40.51 新增] TikTok 追蹤路徑 ---
  '/tiktok/pixel/events', '/tiktok/track/', 'ads.tiktok.com/i18n/pixel', 'business-api.tiktok.com/open_api', 
  'business-api.tiktok.com/open_api/v1.2/pixel/track', 'business-api.tiktok.com/open_api/v1.3/event/track', 
  'business-api.tiktok.com/open_api/v1.3/pixel/track', 'tiktok.com/events',

  // --- [V40.51 新增] LinkedIn 追蹤路徑 ---
  '/linkedin/insight/track', 'analytics.linkedin.com/collect', 'px.ads.linkedin.com/collect',

  // --- CNAME 偽裝 / 第一方代理緩解 ---
  '/__utm.gif', '/j/collect', '/r/collect',

  // --- 通用 API 端點 ---
  '/api/batch', '/api/collect', '/api/collect/', '/api/event', '/api/events', '/api/log/', '/api/logs/', 
  '/api/track/', '/api/v1/event', '/api/v1/events', '/api/v1/track', '/api/v2/event', '/api/v2/events',
  '/beacon/', '/collect?', '/data/collect', '/events/track', '/ingest/', '/intake', '/p.gif', '/pixel/', 
  '/rec/bundle', '/t.gif', '/telemetry/', '/track/', '/v1/pixel', '/v2/track', '/v3/track',

  // --- 特定服務端點 ---
  '/2/client/addlog_batch', // Weibo log

  // --- 主流服務端點 ---
  'ad.360yield.com', 'ads.bing.com/msclkid', 'ads.linkedin.com/li/track', 'ads.yahoo.com/pixel', 'amazon-adsystem.com/e/ec',
  'api-iam.intercom.io/messenger/web/events', 'api.amplitude.com', 'api.amplitude.com/2/httpapi', 'api.hubspot.com/events', 
  'api-js.mixpanel.com/track', 'api.mixpanel.com/track', 'api.segment.io/v1/page', 'api.segment.io/v1/track', 'analytics.twitter.com',
  'heap.io/api/track', 'in.hotjar.com/api/v2/client', 'px.ads.linkedin.com', 'scorecardresearch.com/beacon.js', 
  'segment.io/v1/track', 'widget.intercom.io',

  // --- 社群 & 其他 ---
  '/plugins/easy-social-share-buttons/', 'ads-api.tiktok.com/api/v2/pixel', 'ads.pinterest.com/v3/conversions/events',
  'ads.tiktok.com/i1n/pixel/events.js', 'analytics.pinterest.com/', 'analytics.snapchat.com/v1/batch',
  'events.reddit.com/v1/pixel', 'log.pinterest.com/', 'q.quora.com/', 'sc-static.net/scevent.min.js', 'tr.snapchat.com',

  // --- 中國大陸地區 ---
  '/event_report', '/log/aplus', '/v.gif', 'cnzz.com/stat.php', 'gdt.qq.com/gdt_mview.fcg', 'hm.baidu.com/hm.js', 'wgo.mmstat.com',
  
  // --- Service Worker 追蹤對策 ---
  '/ad-sw.js', '/ads-sw.js',

  // --- 通用廣告路徑 ---
  '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/',

  // --- Cloudflare Web Analytics / RUM ---
  'cloudflareinsights.com/cdn-cgi/rum', 'static.cloudflareinsights.com/beacon.min.js',

  // --- Shopify Monorail / Bing UET / Vercel Speed Insights ---
  'bat.bing.com/action', 'monorail-edge.shopifysvc.com/v1/produce', 'vitals.vercel-insights.com/v1/vitals',

  // --- Plausible Analytics / Yahoo Benji/Logs ---
  'pbd.yahoo.com/data/logs', 'plausible.io/api/event',

  // --- LinkedIn Insight / TikTok Pixel / Events API ---
  'analytics.tiktok.com/i18n/pixel/events.js', 'business-api.tiktok.com/open_api/v1', 'business-api.tiktok.com/open_api/v2',

  // --- Microsoft Clarity 收集端點 ---
  'a.clarity.ms/collect', 'd.clarity.ms/collect', 'l.clarity.ms/collect',

  // --- Sentry Envelope ---
  'ingest.sentry.io/api/',

  // --- Datadog RUM / Logs ---
  'agent-http-intake.logs.us5.datadoghq.com', 'browser-intake-datadoghq.com/api/v2/rum', 'browser-intake-datadoghq.eu/api/v2/rum', 'http-intake.logs.datadoghq.com/v1/input',

  // --- Pinterest Tag / Reddit Pixel / 事件上報 ---
  'ct.pinterest.com/v3', 'events.redditmedia.com/v1', 's.pinimg.com/ct/core.js', 'www.redditstatic.com/ads/pixel.js',

  // --- Discord 遙測（science）/ VK（社交平台）像素/重定向 ---
  'discord.com/api/v10/science', 'discord.com/api/v9/science', 'vk.com/rtrg',

  // --- 其他 ---
  '/abtesting/', '/b/ss', '/feature-flag/', '/i/adsct', '/track/m', '/track/pc', '/user-profile/', 'cacafly/track',
].sort(),

  /**
   * 🚫 [V40.17 擴充, V40.64 擴充] 路徑關鍵字黑名單
   */
PATH_BLOCK_KEYWORDS: [
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
  'unidesk', 'usermaven', 'usertesting', 'venraas', 'vilynx', 'vpon', 'vungle', 'whalecloud', 'wistia', 'wlmonitor', 
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
].sort(),
    
  /**
   * ✅ 路徑前綴白名單
   * 說明：用於豁免正則表達式封鎖，避免誤殺 SPA/CDN 的合法資源。
   */
  PATH_ALLOW_PREFIXES: [
      '/.well-known/'
  ].sort(),
  
  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 後綴 (Path Allowlist - Suffixes)
   * 說明：當路徑以此處的字串結尾時，將豁免 `PATH_BLOCK_KEYWORDS` 檢查。
   */
  PATH_ALLOW_SUFFIXES: [
    // --- 框架 & 套件常用檔 ---
    'app.js', 'bundle.js', 'chunk.js', 'chunk.mjs', 'common.js', 'framework.js', 'framework.mjs', 'index.js',
    'index.mjs', 'main.js', 'polyfills.js', 'polyfills.mjs', 'runtime.js', 'styles.css', 'styles.js', 'vendor.js',
    // --- 靜態資產與固定檔名 ---
    'badge.svg', 'browser.js', 'card.js', 'chunk-common', 'chunk-vendors', 'component---', 'config.js', 'favicon.ico',
    'fetch-polyfill', 'head.js', 'header.js', 'icon.svg', 'legacy.js', 'loader.js', 'logo.svg', 'manifest.json',
    'modal.js', 'padding.css', 'page-data.js', 'polyfill.js', 'robots.txt', 'sitemap.xml', 'sw.js', 'theme.js', 
    'web.config',
  ].sort(),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 子字串 (Path Allowlist - Substrings)
   * 說明：當路徑包含此處的字串時，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於典型靜態路徑)。
   */
  PATH_ALLOW_SUBSTRINGS: [
    '_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/',
  ].sort(),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 區段 (Path Allowlist - Segments)
   * 說明：當路徑被 '/' 分割後，若任一區段完全匹配此處的字串，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於避免誤殺功能性路徑)。
   */
  PATH_ALLOW_SEGMENTS: [
    'admin', 'blog', 'catalog', 'dashboard', 'dialog', 'login',
  ].sort(),

  /**
   * 🚫 [V40.55 新增] 高信度追蹤關鍵字 (用於條件式豁免)
   * 說明：當一個請求的路徑後綴符合豁免條件時 (如 index.js)，將會使用此處的關鍵字對其上層路徑進行二次審查。
   */
  HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH: [
    '/ads', '/analytics', '/api/track', '/beacon', '/collect', '/pixel', '/tracker'
  ].sort(),

  /**
   * 💧 [V40.17 擴充] 直接拋棄請求 (DROP) 的關鍵字
   * 說明：用於識別應被「靜默拋棄」而非「明確拒絕」的請求。為避免誤殺，此處的關鍵字應盡可能完整，並包含分隔符。
   */
  DROP_KEYWORDS: [
    // --- 日誌 & 遙測 (Logging & Telemetry) ---
    '.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 'airbrake',
    'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 'crashlytics', 'csp-report',
    'data-pipeline', 'error-monitoring', 'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event',
    'logevents', 'loggly', 'log-hl', 'realtime-log', 'rum', 'server-event', 'telemetry', 'uploadmobiledata', 'web-beacon', 
    'web-vitals',
    // --- 錯誤 & 診斷 (Error & Diagnostics) ---
    'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json',
  ].sort(),

  /**
   * 🗑️ [V40.51 強化, V40.61 擴充] 追蹤參數黑名單 (全域)
   * 說明：用於高速比對常見的、靜態的追蹤參數。
   */
  GLOBAL_TRACKING_PARAMS: [
     '_branch_match_id', '_ga', '_gid', 'dclid', 'fbclid', 'gclid', 'gclsrc', 'gbraid', 'igshid', 
     'ko_click_id', 'li_fat_id', 'mc_cid', 'mc_eid', 'mibextid', 'msclkid', 'twclid', 
     'ttclid', 'tt_c_id', 'tt_campaign', 'tt_creative', 'tt_adgroup', 'trk', 'linkedin_share', 
     'li_medium', 'li_source', 'wbraid', 'yclid', 'zanpid',
  ].sort(),

  /**
   * 🗑️ [V40.37 新增] Regex 追蹤參數黑名單 (全域)
   * 說明：用於攔截符合特定模式的動態追蹤參數。
   */
  GLOBAL_TRACKING_PARAMS_REGEX: [
      /^utm_\w+/, // Matches all UTM parameters (utm_source, utm_medium, etc.)
      /^ig_[\w_]+/, // Matches Instagram click trackers (ig_rid, ig_mid, etc.)
      /^asa_\w+/, // Apple Search Ads 的 asa_* 系列參數
      // --- [V40.51 新增] TikTok 動態參數模式 ---
      /^tt_[\w_]+/, // Matches TikTok tracking parameters like tt_campaign_id, tt_adset_id
      /^li_[\w_]+/, // Matches LinkedIn tracking parameters
  ],

  /**
   * 🗑️ [V40.38 重構] 追蹤參數前綴黑名單
   * 說明：用於高速比對常見的追蹤參數前綴。
   */
  TRACKING_PREFIXES: [
    '__cf_', '_bta', '_ga_', '_gat_', '_gid_', '_hs', '_oly_', 'ad_', 'aff_', 'alg_', 'bd_',
    'campaign_', 'content_', 'creative_', 'fb_', 'from_', 'gcl_', 'hmsr_', 'hsa_', 'li_',
    'matomo_', 'medium_', 'mkt_', 'ms_', 'mtm', 'pk_', 'piwik_', 'placement_', 'ref_',
    'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_', 'ttc_', 'li_fat_', 'linkedin_',
  ].sort(),

  /**
   * 🗑️ [V40.37 新增] Regex 追蹤參數前綴黑名單
   * 說明：用於攔截符合特定模式的動態追蹤參數前綴。
   */
  TRACKING_PREFIXES_REGEX: [
      /^_ga_/, // Matches Google Analytics cross-domain linkers like _ga_XXXX
      /^tt_[\w_]+/, // [V40.51] TikTok 追蹤參數動態匹配
      /^li_[\w_]+/, // [V40.51] LinkedIn 追蹤參數動態匹配
  ],

  /**
   * ✅ [V40.53 擴充] 必要參數白名單
   * 說明：此處的參數永遠不會被清理，以避免破壞網站核心功能。
   */
  PARAMS_TO_KEEP_WHITELIST: [
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
  ].sort(),

  /**
   * 🚫 [V40.40 重構, V40.64 擴充] 基於正規表示式的路徑黑名單 (高信度)
   * 說明：用於攔截高信度的、確定性的威脅路徑模式。
   */
  PATH_BLOCK_REGEX: [
    // [V40.47 強化] 擴充例外目錄，以降低對傳統部署靜態站的誤殺率。
    /^\/(?!_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,        // 檔名含 sentry 且以 .js 結尾
    /\/v\d+\/event/i,                 // 通用事件 API 版本 (如 /v1/event)
    /\/collect$/i,                     // 通用數據收集端點 (寬泛)
    /\/service\/collect$/i,           // 通用數據收集端點 (服務)
    /\/api\/v\d+\/collect$/i,         // 通用數據收集端點 (API)
  ],

  /**
   * 🚫 [V40.40 新增] 啟發式路徑攔截 Regex (實驗性)
   * 說明：用於攔截潛在的、基於模式推測的威脅。其攔截事件將在除錯模式下被記錄。
   */
  HEURISTIC_PATH_BLOCK_REGEX: [
      /[a-z0-9\/\-_]{32,}\.(js|mjs)$/i,  // V40.37: 反混淆啟發式規則，攔截超長隨機路徑的腳本
  ],

  /**
   * ✅ [V40.45 新增] 路徑豁免清單 (高風險)
   * 說明：用於豁免已被「域名黑名單」攔截的請求中的特定功能性路徑。
   * 格式為 Map，其中 Key 是被封鎖的域名，Value 是一個包含路徑前綴或 Regex 的 Set。
   * [V40.47] 註解修正：目前版本僅支援「路徑前綴 (startsWith)」匹配，尚不支援 Regex。
   * 警告：此為高風險操作，僅在確認絕對必要時使用。
   */
  PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS: new Map([
    // 範例：為了修復 WhatsApp 的 URL 預覽功能 (See #123. Review by: 2026-03-22.)
    ['graph.facebook.com', new Set([
        '/v19.0/', // 豁免所有 v19.0 API 的路徑
        '/v20.0/', // [V40.51] 新增未來版本預備豁免
    ])],
    // 範例：未來若需修復 LINE 的某項功能
    // ['obs.line-scdn.net', new Set([
    //     '/stickershop/v1/product/', // 僅豁免貼圖預覽路徑
    // ])],
  ]),
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
const IMAGE_EXTENSIONS = new Set(['.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);

// [V40.58 新增] 結構化錯誤處理
class ScriptExecutionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ScriptExecutionError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

// 預編譯後的 Regex 規則
let COMPILED_BLOCK_DOMAINS_REGEX = [];
let COMPILED_GLOBAL_TRACKING_PARAMS_REGEX = [];
let COMPILED_TRACKING_PREFIXES_REGEX = [];
let COMPILED_PATH_BLOCK_REGEX = [];
let COMPILED_HEURISTIC_PATH_BLOCK_REGEX = [];

class OptimizedTrie {
  constructor() { this.root = Object.create(null); }
  insert(word) { let n = this.root; for (let i = 0; i < word.length; i++) { const c = word[i]; n = n[c] || (n[c] = Object.create(null)); } n.isEndOfWord = true; }
  startsWith(prefix) { let n = this.root; for (let i = 0; i < prefix.length; i++) { const c = prefix[i]; if (!n[c]) return false; n = n[c]; if (n.isEndOfWord) return true; } return false; }
  contains(text) {
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
const OPTIMIZED_TRIES = { prefix: new OptimizedTrie(), criticalPattern: new OptimizedTrie(), pathBlock: new OptimizedTrie() };

class OptimizedPerformanceStats {
    constructor() { this.counters = new Uint32Array(16); this.labels = ['totalRequests', 'blockedRequests', 'domainBlocked', 'pathBlocked', 'regexPathBlocked', 'criticalScriptBlocked', 'paramsCleaned', 'hardWhitelistHits', 'softWhitelistHits', 'errors', 'l1CacheHits', 'l2CacheHits', 'urlCacheHits']; }
    increment(type) { const idx = this.labels.indexOf(type); if (idx !== -1) this.counters[idx]++; }
    getStats() { const stats = {}; this.labels.forEach((l, i) => { stats[l] = this.counters[i]; }); return stats; }
}
const optimizedStats = new OptimizedPerformanceStats();

function compileRegexList(list) {
    return list.map(regex => {
        try {
            return (regex instanceof RegExp) ? regex : new RegExp(regex);
        } catch (e) {
            logError(e, { rule: regex ? regex.toString() : 'invalid', stage: 'compileRegex' });
            return null;
        }
    }).filter(Boolean);
}

function initializeCoreEngine() {
    // [V40.63] 自動化正規化，將所有陣列規則轉換為小寫 Set
    const listsToNormalize = [
        'REDIRECTOR_HOSTS', 'HARD_WHITELIST_EXACT', 'HARD_WHITELIST_WILDCARDS', 
        'SOFT_WHITELIST_EXACT', 'SOFT_WHITELIST_WILDCARDS', 'BLOCK_DOMAINS',
        'CRITICAL_TRACKING_SCRIPTS', 'CRITICAL_TRACKING_PATTERNS', 'PATH_BLOCK_KEYWORDS', 
        'PATH_ALLOW_PREFIXES', 'PATH_ALLOW_SUFFIXES', 'PATH_ALLOW_SUBSTRINGS', 
        'PATH_ALLOW_SEGMENTS', 'HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH',
        'DROP_KEYWORDS', 'GLOBAL_TRACKING_PARAMS', 'TRACKING_PREFIXES', 
        'PARAMS_TO_KEEP_WHITELIST'
    ];
    for (const key of listsToNormalize) {
        if (Array.isArray(CONFIG[key])) {
            CONFIG[key] = new Set(CONFIG[key].map(item => String(item).toLowerCase()));
        }
    }
    
    // 初始化 Trie 結構
    CONFIG.TRACKING_PREFIXES.forEach(p => OPTIMIZED_TRIES.prefix.insert(p));
    CONFIG.CRITICAL_TRACKING_PATTERNS.forEach(p => OPTIMIZED_TRIES.criticalPattern.insert(p));
    CONFIG.PATH_BLOCK_KEYWORDS.forEach(p => OPTIMIZED_TRIES.pathBlock.insert(p));

    // 預編譯所有 Regex 規則
    COMPILED_BLOCK_DOMAINS_REGEX = compileRegexList(CONFIG.BLOCK_DOMAINS_REGEX);
    COMPILED_GLOBAL_TRACKING_PARAMS_REGEX = compileRegexList(CONFIG.GLOBAL_TRACKING_PARAMS_REGEX);
    COMPILED_TRACKING_PREFIXES_REGEX = compileRegexList(CONFIG.TRACKING_PREFIXES_REGEX);
    COMPILED_PATH_BLOCK_REGEX = compileRegexList(CONFIG.PATH_BLOCK_REGEX);
    COMPILED_HEURISTIC_PATH_BLOCK_REGEX = compileRegexList(CONFIG.HEURISTIC_PATH_BLOCK_REGEX);
}

function getWhitelistMatchDetails(hostname, exactSet, wildcardSet) {
    if (exactSet.has(hostname)) return { matched: true, rule: hostname, type: 'Exact' };
    let domain = hostname;
    while (true) {
        if (wildcardSet.has(domain)) return { matched: true, rule: domain, type: 'Wildcard' };
        const dotIndex = domain.indexOf('.');
        if (dotIndex === -1) break;
        domain = domain.substring(dotIndex + 1);
    }
    return { matched: false };
}

function isDomainBlocked(hostname) {
    let currentDomain = hostname;
    while (true) {
        if (CONFIG.BLOCK_DOMAINS.has(currentDomain)) return true;
        const dotIndex = currentDomain.indexOf('.');
        if (dotIndex === -1) break;
        currentDomain = currentDomain.substring(dotIndex + 1);
    }
    for (const regex of COMPILED_BLOCK_DOMAINS_REGEX) {
        if (regex.test(hostname)) return true;
    }
    return false;
}

function getCacheKey(namespace, part1, part2) {
    return `${namespace}---${part1}---${part2}`;
}

function isCriticalTrackingScript(hostname, path) {
    const key = getCacheKey('crit', hostname, path);
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

// [V40.56 邏輯升級] 全面引入「條件式豁免」
function isPathExplicitlyAllowed(path) {
    // 內部輔助函數，執行二次審查
    const runSecondaryCheck = (pathToCheck, exemptionRule) => {
        for (const trackerKeyword of CONFIG.HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH) {
            if (pathToCheck.includes(trackerKeyword)) {
                if (CONFIG.DEBUG_MODE) {
                    console.log(`[URL-Filter-v40.62][Debug] 路徑豁免被覆蓋。豁免規則: "${exemptionRule}" | 偵測到關鍵字: "${trackerKeyword}" | 路徑: "${path}"`);
                }
                return false; // 拒絕豁免
            }
        }
        return true; // 路徑安全，給予豁免
    };

    // 1. 子字串豁免 (條件式)
    for (const substring of CONFIG.PATH_ALLOW_SUBSTRINGS) {
        if (path.includes(substring)) {
            return runSecondaryCheck(path, `substring: ${substring}`);
        }
    }

    // 2. 區段豁免 (條件式)
    const segments = path.startsWith('/') ? path.substring(1).split('/') : path.split('/');
    for (const segment of segments) {
        if (CONFIG.PATH_ALLOW_SEGMENTS.has(segment)) {
            return runSecondaryCheck(path, `segment: ${segment}`);
        }
    }

    // 3. 後綴豁免 (條件式)
    for (const suffix of CONFIG.PATH_ALLOW_SUFFIXES) {
        if (path.endsWith(suffix)) {
            const parentPath = path.substring(0, path.lastIndexOf('/'));
            return runSecondaryCheck(parentPath, `suffix: ${suffix}`);
        }
    }

    return false;
}

function isPathBlocked(path) {
    const k = getCacheKey('path', path, '');
    const c = multiLevelCache.getUrlDecision(k);
    if (c !== null) return c;
    let r = false;
    if (OPTIMIZED_TRIES.pathBlock.contains(path) && !isPathExplicitlyAllowed(path)) {
        r = true;
    }
    multiLevelCache.setUrlDecision(k, r);
    return r;
}

function isPathBlockedByRegex(path) {
    const k = getCacheKey('regex', path, '');
    const c = multiLevelCache.getUrlDecision(k);
    if (c !== null) return c;
    for (const prefix of CONFIG.PATH_ALLOW_PREFIXES) {
        if (path.startsWith(prefix)) {
            multiLevelCache.setUrlDecision(k, false);
            return false;
        }
    }
    for (const regex of COMPILED_PATH_BLOCK_REGEX) {
        if (regex.test(path)) {
            multiLevelCache.setUrlDecision(k, true);
            return true;
        }
    }
    for (const regex of COMPILED_HEURISTIC_PATH_BLOCK_REGEX) {
        if (regex.test(path)) {
            if (CONFIG.DEBUG_MODE) {
                console.log(`[URL-Filter-v40.62][Debug] 啟發式規則命中。規則: "${regex.toString()}" | 路徑: "${path}"`);
            }
            multiLevelCache.setUrlDecision(k, true);
            return true;
        }
    }
    multiLevelCache.setUrlDecision(k, false);
    return false;
}

function getBlockResponse(path) {
    const lowerPath = path.toLowerCase();
    for (const keyword of CONFIG.DROP_KEYWORDS) {
        if (lowerPath.includes(keyword)) {
            return DROP_RESPONSE;
        }
    }
    const dotIndex = lowerPath.lastIndexOf('.');
    if (dotIndex !== -1) {
        const ext = lowerPath.substring(dotIndex);
        if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
        if (SCRIPT_EXTENSIONS.has(ext)) return NO_CONTENT_RESPONSE;
    }
    return REJECT_RESPONSE;
}

function cleanTrackingParams(url) {
    // 確保傳入的是 URL 物件
    const urlObj = (typeof url === 'string') ? new URL(url) : url;
    const originalSearchParams = urlObj.search;
    let modified = false;
    const toDelete = [];

    for (const key of urlObj.searchParams.keys()) {
        const lowerKey = key.toLowerCase();

        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;

        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) || OPTIMIZED_TRIES.prefix.startsWith(lowerKey)) {
            toDelete.push(key);
            modified = true;
            continue;
        }

        let regexMatched = false;
        for (const regex of COMPILED_GLOBAL_TRACKING_PARAMS_REGEX) {
            if (regex.test(lowerKey)) {
                toDelete.push(key);
                modified = true;
                regexMatched = true;
                break;
            }
        }
        if (regexMatched) continue;

        for (const regex of COMPILED_TRACKING_PREFIXES_REGEX) {
            if (regex.test(lowerKey)) {
                toDelete.push(key);
                modified = true;
                break;
            }
        }
    }

    if (modified) {
        if (CONFIG.DEBUG_MODE) {
            const cleanedForLog = new URL(urlObj.toString());
            toDelete.forEach(k => cleanedForLog.searchParams.delete(k));
            console.log(`[URL-Filter-v40.62][Debug] 偵測到追蹤參數 (僅記錄)。原始 URL (淨化後): "${cleanedForLog.toString()}" | 待移除參數: ${JSON.stringify(toDelete)}`);
            return null;
        }
        toDelete.forEach(k => urlObj.searchParams.delete(k));
        // 僅在有 search 參數時才加上 #cleaned 標記，避免汙染無參數的 URL
        if(originalSearchParams) {
            urlObj.hash = 'cleaned';
        }
        return urlObj.toString();
    }
    return null;
}

function getSanitizedUrlForLogging(url) {
    try {
        const tempUrl = new URL(url.toString());
        const paramsToRemove = ['token', 'password', 'key', 'secret', 'auth', 'otp', 'access_token', 'refresh_token'];
        for (const param of tempUrl.searchParams.keys()) {
            const lowerParam = param.toLowerCase();
            for (const sensitive of paramsToRemove) {
                if (lowerParam.includes(sensitive)) {
                    tempUrl.searchParams.set(param, 'REDACTED');
                    break;
                }
            }
        }
        return tempUrl.toString();
    } catch (e) {
        return (typeof url === 'string' ? url.split('?')[0] : '<INVALID_URL_OBJECT>') + '?<URL_PARSE_ERROR>';
    }
}

// [V40.58 新增] 統一的錯誤日誌記錄函數
function logError(error, context = {}) {
    optimizedStats.increment('errors');
    if (typeof console !== 'undefined' && console.error) {
        const executionError = new ScriptExecutionError(error.message, {
            ...context,
            originalStack: error.stack
        });
        console.error(`[URL-Filter-v40.62]`, executionError);
    }
}

function processRequest(request) {
  try {
    optimizedStats.increment('totalRequests');
    if (!request?.url || typeof request.url !== 'string' || request.url.length < 10) return null;

    const rawUrl = request.url;
    let url;
    try {
        url = multiLevelCache.getUrlObject(rawUrl);
        if (!url) {
            url = new URL(rawUrl);
            multiLevelCache.setUrlObject(rawUrl, Object.freeze(url));
        }
    } catch (e) {
        logError(e, { stage: 'urlParsing', url: getSanitizedUrlForLogging(rawUrl) });
        return null; // 無法解析的 URL 直接放行
    }
    
    if (url.hash === '#cleaned') {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    
    const hardWhitelistDetails = getWhitelistMatchDetails(hostname, CONFIG.HARD_WHITELIST_EXACT, CONFIG.HARD_WHITELIST_WILDCARDS);
    if (hardWhitelistDetails.matched) {
        optimizedStats.increment('hardWhitelistHits');
        if (CONFIG.DEBUG_MODE) {
            console.log(`[URL-Filter-v40.62][Debug] 硬白名單命中。主機: "${hostname}" | 規則: "${hardWhitelistDetails.rule}" (${hardWhitelistDetails.type})`);
        }
        return null;
    }

    const softWhitelistDetails = getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_EXACT, CONFIG.SOFT_WHITELIST_WILDCARDS);
    if (softWhitelistDetails.matched) {
        optimizedStats.increment('softWhitelistHits');
        if (CONFIG.DEBUG_MODE) {
            console.log(`[URL-Filter-v40.62][Debug] 軟白名單命中。主機: "${hostname}" | 規則: "${softWhitelistDetails.rule}" (${softWhitelistDetails.type})`);
        }
        const cleanedUrl = cleanTrackingParams(url);
        if (cleanedUrl) {
            optimizedStats.increment('paramsCleaned');
            return REDIRECT_RESPONSE(cleanedUrl);
        }
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
        const exemptions = CONFIG.PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS.get(hostname);
        let isExempted = false;
        if (exemptions) {
            const currentPath = url.pathname;
            for (const exemption of exemptions) {
                if (currentPath.startsWith(exemption)) {
                    if (CONFIG.DEBUG_MODE) {
                        console.log(`[URL-Filter-v40.62][Debug] 域名封鎖被路徑豁免。主機: "${hostname}" | 豁免規則: "${exemption}"`);
                    }
                    isExempted = true;
                    break;
                }
            }
        }
        
        if (!isExempted) {
            multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
            optimizedStats.increment('domainBlocked');
            optimizedStats.increment('blockedRequests');
            return getBlockResponse(url.pathname + url.search);
        }
    }
    
    const originalFullPath = url.pathname + url.search;
    const lowerFullPath = originalFullPath.toLowerCase();

    if (isCriticalTrackingScript(hostname, lowerFullPath)) {
        optimizedStats.increment('criticalScriptBlocked');
        optimizedStats.increment('blockedRequests');
        return getBlockResponse(originalFullPath);
    }
    
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
    
    const cleanedUrl = cleanTrackingParams(url);
    if (cleanedUrl) {
        optimizedStats.increment('paramsCleaned');
        return REDIRECT_RESPONSE(cleanedUrl);
    }
    
    return null;

  } catch (error) {
    logError(error, { stage: 'processRequest', url: getSanitizedUrlForLogging(request?.url) });
    return null;
  }
}

// 執行入口
(function () {
  try {
    let startTime;
    let requestForLog;
    if (CONFIG.DEBUG_MODE && typeof $request !== 'undefined') {
      startTime = __now__();
      requestForLog = getSanitizedUrlForLogging($request.url);
    }

    initializeCoreEngine();
    
    if (typeof $request === 'undefined') {
      if (typeof $done !== 'undefined') {
        $done({ version: '40.62', status: 'ready', message: 'URL Filter v40.62 - 二次深度審查與規則擴充', stats: optimizedStats.getStats() });
      }
      return;
    }

    const result = processRequest($request);

    if (CONFIG.DEBUG_MODE) {
      const endTime = __now__();
      const executionTime = (endTime - startTime).toFixed(3);
      console.log(`[URL-Filter-v40.62][Debug] 請求處理耗時: ${executionTime} ms | URL: ${requestForLog}`);
    }

    if (typeof $done !== 'undefined') {
        $done(result || {});
    }
  } catch (error) {
    logError(error, { stage: 'globalExecution' });
    if (typeof $done !== 'undefined') $done({});
  }
})();
