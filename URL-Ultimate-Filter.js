/**
 * @file        URL-Ultimate-Filter-Surge-V40.67.js
 * @version     40.67 (啟發式規則檢討與清單重組)
 * @description 基於對 Next.js 等現代前端框架建構模式的深度分析，微調路徑攔截正則表達式，提升對合法 hashed 資源的豁免精準度。同時，對全數組態清單執行嚴格的字母序排序，大幅改善規則的可讀性與可維護性。
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
    'accounts.google.com', 'adsbypasser.github.io', 'ap02.in.treasuredata.com', 'api.adyen.com', 
    'api.braintreegateway.com', 'api.discord.com', 'api.ecpay.com.tw', 'api.etmall.com.tw', 'api.jkos.com', 
    'api.line.me', 'api.map.ecpay.com.tw', 'api.twitch.tv', 'appleid.apple.com', 'appapi.104.com.tw', 
    'ar-genai.graph.meta.com', 'ar.graph.meta.com', 'cdn.ghostery.com', 'cdn.shortpixel.ai', 
    'cdn.syndication.twimg.com', 'chatgpt.com', 'claude.ai', 'code.createjs.com', 'd.ghostery.com', 
    'data-cloud.flightradar24.com', 'eco-push-api-client.meiqia.com', 'exp.acsnets.com.tw', 
    'gateway.facebook.com', 'gemini.google.com', 'graph.instagram.com', 'graph.threads.net', 
    'i.instagram.com', 'iappapi.investing.com', 'kktix.com', 'login.microsoftonline.com', 
    'meta-ai-realtime.facebook.com', 'meta.graph.meta.com', 'mpaystore.pcstore.com.tw', 'mushroomtrack.com', 
    'nextdns.io', 'oa.ledabangong.com', 'oa.qianyibangong.com', 'payment.ecpay.com.tw', 'perplexity.ai', 
    'phtracker.com', 'private-us-east-1.monica.im', 'pro.104.com.tw', 'prodapp.babytrackers.com', 
    'qianwen.aliyun.com', 'raw.githubusercontent.com', 'reportaproblem.apple.com', 'secureapi.midomi.com', 
    'sensordata.open.cn', 'sso.godaddy.com', 'ss.ledabangong.com', 'ssl.p.jwpcdn.com', 'static.stepfun.com', 
    'tixcraft.com', 'track.fstry.me', 'tw.fd-api.com', 'userscripts.adtidy.org', 'wearable-ai-realtime.facebook.com'
  ].sort(),

  /**
   * ✳️ 硬白名單 - 萬用字元 (Hard Whitelist - Wildcards)
   * 說明：完全豁免所有檢查。此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  HARD_WHITELIST_WILDCARDS: [
    'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'atlassian.net', 
    'auth0.com', 'bot.com.tw', 'cathaybk.com.tw', 'cathaysec.com.tw', 'cc.bingj.com', 'chb.com.tw', 
    'citibank.com.tw', 'ctbcbank.com', 'dawho.tw', 'dbs.com.tw', 'esunbank.com.tw', 'firstbank.com.tw', 
    'fubon.com', 'googleapis.com', 'googlevideo.com', 'gov.tw', 'hncb.com.tw', 'hsbc.co.uk', 
    'hsbc.com.tw', 'icloud.com', 'landbank.com.tw', 'linksyssmartwifi.com', 'megabank.com.tw', 
    'megatime.com.tw', 'mitake.com.tw', 'money-link.com.tw', 'momopay.com.tw', 'mymobibank.com.tw', 
    'okta.com', 'org.tw', 'pay.taipei', 'paypal.com', 'perma.cc', 'richart.tw', 'scsb.com.tw', 
    'sinopac.com', 'sinotrade.com.tw', 'slack.com', 'standardchartered.com.tw', 'stripe.com', 
    'taipeifubon.com.tw', 'taishinbank.com.tw', 'taiwanpay.com.tw', 'tcb-bank.com.tw', 'tdcc.com.tw', 
    'timetravel.mementoweb.org', 'twca.com.tw', 'twmp.com.tw', 'update.microsoft.com', 
    'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'windowsupdate.com', 
    'www.webarchive.org.uk'
  ].sort(),

  /**
   * ✅ 軟白名單 - 精確匹配 (Soft Whitelist - Exact)
   * 說明：豁免「路徑黑名單層 (Path Blacklist)」的檢查，但仍會執行「參數清理」與「關鍵追蹤模式攔截」。
   */
  SOFT_WHITELIST_EXACT: [
    'a-api.anthropic.com', 'api-client.tmall.com', 'api.anthropic.com', 'api.asana.com', 'api.cloudflare.com', 
    'api.cohere.ai', 'api.digitalocean.com', 'api.dropboxapi.com', 'api.fastly.com', 'api.figma.com', 
    'api.github.com', 'api.heroku.com', 'api.hubapi.com', 'api.irentcar.com.tw', 'api.mailgun.com', 
    'api.netlify.com', 'api.notion.com', 'api.openai.com', 'api.pagerduty.com', 'api.sendgrid.com', 
    'api.telegram.org', 'api.trello.com', 'api.vercel.com', 'api.zendesk.com', 'auth.docker.io', 
    'database.windows.net', 'duckduckgo.com', 'gateway.shopback.com.tw', 'legy.line-apps.com', 
    'login.docker.com', 'obs.line-scdn.net', 'secure.gravatar.com', 'usiot.roborock.com', 'visuals.feedly.com'
  ].sort(),

  /**
   * ✅ 軟白名單 - 萬用字元 (Soft Whitelist - Wildcards)
   * 說明：豁免「路徑黑名單層 (Path Blacklist)」的檢查，但仍會執行「參數清理」與「關鍵追蹤模式攔截」。
   * 此處的域名會匹配自身及其所有子域名 (例如 apple.com 會匹配 a.apple.com)。
   */
  SOFT_WHITELIST_WILDCARDS: [
    'ak.sv', 'akamaihd.net', 'amazonaws.com', 'azurewebsites.net', 'bayimg.com', 'beeimg.com', 
    'binbox.io', 'book.com.tw', 'casimages.com', 'cdnjs.cloudflare.com', 'citiesocial.com', 
    'cloudfunctions.net', 'cloudflare.com', 'cloudfront.net', 'cocoleech.com', 'coupang.com', 
    'cubeupload.com', 'digitaloceanspaces.com', 'dlupload.com', 'fastly.net', 'fastpic.org', 
    'fbcdn.net', 'flipboard.com', 'fotosik.pl', 'github.io', 'gitlab.io', 'gofile.download', 
    'gstatic.com', 'ibb.co', 'iherb.biz', 'iherb.com', 'imagebam.com', 'imageban.ru', 'imageshack.com', 
    'imagetwist.com', 'imagevenue.com', 'imgbb.com', 'imgbox.com', 'imgflip.com', 'imx.to', 
    'indishare.org', 'infidrive.net', 'inoreader.com', 'instagram.com', 'itofoo.com', 'jsdelivr.net', 
    'k2s.cc', 'katfile.com', 'm.youtube.com', 'mirrored.to', 'momo.dm', 'momoshop.com.tw', 
    'multiup.io', 'netlify.app', 'new-reporter.com', 'newsblur.com', 'nmac.to', 'noelshack.com', 
    'oraclecloud.com', 'pages.dev', 'pic-upload.de', 'pixhost.to', 'postimg.cc', 'prnt.sc', 
    'pxmart.com.tw', 'pxpayplus.com', 'sfile.mobi', 'shopee.com', 'shopee.tw', 'shopeemobile.com', 
    'shopback.com.tw', 'spotify.com', 'thefileslocker.net', 'theoldreader.com', 'threads.net', 
    'turboimagehost.com', 'twimg.com', 'unpkg.com', 'uploadhaven.com', 'uploadrar.com', 'usersdrive.com', 
    'vercel.app', 'windows.net', 'wp.com', 'ytimg.com', 'youtube.com'
  ].sort(),

  /**
   * 🚫 [V40.51 強化, V40.61 擴充] 域名攔截黑名單
   * 說明：僅列出純粹用於廣告、追蹤或分析的域名。此清單將被高速查詢。
   */
  BLOCK_DOMAINS: [
    '3gimg.qq.com', 'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad-cn.jovcloud.com', 'ad-geek.net', 
    'ad-hub.net', 'ad-serv.teepr.com', 'ad.12306.cn', 'ad.360in.com', 'ad.51wnl-cq.com', 
    'ad.api.3g.youku.com', 'ad.caiyunapp.com', 'ad.huajiao.com', 'ad.hzyoka.com', 'ad.jiemian.com', 
    'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'adashxgc.ut.taobao.com', 
    'adashz4yt.m.taobao.com', 'adcolony.com', 'adextra.51wnl-cq.com', 'adform.net', 'adjust.com', 
    'admaster.com.cn', 'admitad.com', 'admob.com', 'adnext-a.akamaihd.net', 'adnx.com', 'adriver.ru', 
    'adroll.com', 'ads.adadapted.com', 'ads.daydaycook.com.cn', 'ads.linkedin.com', 'ads.mopub.com', 
    'ads.tiktok.com', 'ads.weilitoutiao.net', 'ads.yahoo.com', 'adsapi.manhuaren.com', 'adsdk.dmzj.com', 
    'adsense.com', 'adse.ximalaya.com', 'adserver.pandora.com', 'adserver.yahoo.com', 'adservice.google.com', 
    'adsnative.com', 'adsrvr.org', 'adswizz.com', 'adtrack.quark.cn', 'adui.tg.meitu.com', 
    'adview.cn', 'adv.bandi.so', 'adxserver.ad.cmvideo.cn', 'afd.baidu.com', 'agn.aty.sohu.com', 
    'agkn.com', 'alimama.com', 'als.baidu.com', 'amazon-adsystem.com', 'amplitude.com', 'analysis.tw', 
    'analytics.line.me', 'analytics.linkedin.com', 'analytics.slashdotmedia.com', 'analytics.strava.com', 
    'analytics.tiktok.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'aotter.net', 'api.cupid.dns.iqiyi.com', 
    'api.joybj.com', 'api.pendo.io', 'api.whizzone.com', 'apm.gotokeep.com', 'app-ad.variflight.com', 
    'app-measurement.com', 'app-site-association.cdn-apple.com', 'appcloud.zhihu.com', 
    'appcloud2.in.zhihu.com', 'appier.net', 'applog.mobike.com', 'applog.uc.cn', 'applovin.com', 
    'appnext.hs.llnwd.net', 'appnexus.com', 'appsflyer.com', 'ark.letv.com', 'asimgs.pplive.cn', 
    'atm.youku.com', 'awin1.com', 'bat.bing.com', 'bdurl.net', 'beacon-api.aliyuncs.com', 'bidswitch.net', 
    'bluekai.com', 'branch.io', 'braze.com', 'bugsnag.com', 'business-api.tiktok.com', 'business.facebook.com', 
    'c.clarity.ms', 'cacafly.com', 'casalemedia.com', 'cdn-edge-tracking.com', 'cdn.vercel-insights.com', 
    'chartbeat.com', 'cint.com', 'cj.com', 'clickforce.com.tw', 'clicktale.net', 'clicky.com', 
    'cloudflareinsights.com', 'cn-huabei-1-lg.xf-yun.com', 'cnzz.com', 'comscore.com', 'connect.facebook.net', 
    'contextweb.com', 'conversantmedia.com', 'cookielaw.org', 'cpro.baidu.com', 'cr-serving.com', 
    'crash2.zhihu.com', 'crazyegg.com', 'creativecdn.com', 'criteo.com', 'criteo.net', 'csp.yahoo.com', 
    'ct.pinterest.com', 'customer.io', 'data.investing.com', 'datadoghq.com', 'demdex.net', 'disqus.com', 
    'disquscdn.com', 'dlswbr.baidu.com', 'doubleclick.net', 'doubleverify.com', 'duclick.baidu.com', 
    'dynatrace.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com', 'edge-tracking.cloudflare.com', 
    'edgecompute-analytics.com', 'everesttech.net', 'events.redditmedia.com', 'events.tiktok.com', 
    'fast-trk.com', 'feed.baidu.com', 'fingerprint.com', 'flashtalking.com', 'fullstory.com', 
    'fusion.qq.com', 'fusioncdn.com', 'geo.yahoo.com', 'getui.com', 'getui.net', 'gepush.com', 
    'ggs.myzaker.com', 'go-mpulse.net', 'google-analytics.com', 'googleadservices.com', 'googlesyndication.com', 
    'googletagmanager.com', 'graph.facebook.com', 'gridsum.com', 'growingio.com', 'gs.getui.com', 
    'gumgum.com', 'guoshipartners.com', 'h2tcbox.baidu.com', 'heap.io', 'hm.baidu.com', 'hmma.baidu.com', 
    'hotjar.com', 'hs-analytics.net', 'hs-scripts.com', 'iadsdk.apple.com', 'iasds.com', 'id5-sync.com', 
    'idatalog.iflysec.com', 'igexin.com', 'imedia.com.tw', 'impactradius.com', 'indexexchange.com', 
    'inmobi.com', 'insight.linkedin.com', 'inspectlet.com', 'instana.io', 'intensedebate.com', 
    'intercom.io', 'ios.bugly.qq.com', 'ironsrc.com', 'is-tracking.com', 'itad.linetv.tw', 'iterable.com', 
    'ja.chushou.tv', 'jiguang.cn', 'jpush.cn', 'keen.io', 'kissmetrics.com', 'klaviyo.com', 
    'kochava.com', 'kuaishou.com', 'launchdarkly.com', 'likr.tw', 'linkshare.com', 'liveintent.com', 
    'liveperson.net', 'liveramp.com', 'lives.l.qq.com', 'log.b612kaji.com', 'log.felo.ai', 'loggly.com', 
    'logrocket.com', 'mads.suning.com', 'magnite.com', 'marketo.com', 'matomo.cloud', 'media.net', 'mgid.com', 
    'miaozhen.com', 'mixpanel.com', 'mktoresp.com', 'mlytics.com', 'mmstat.com', 'moat.com', 'moatads.com', 
    'mobads-logs.baidu.com', 'mobads.baidu.com', 'mobileads.msn.com', 'monitor.uu.qq.com', 
    'monitoring.edge-compute.io', 'monorail-edge.shopifysvc.com', 'mopnativeadv.037201.com', 'mopub.com', 
    'mouseflow.com', 'mparticle.com', 'mqtt.zhihu.com', 'mum.alibabachengdun.com', 'nadvideo2.baidu.com', 
    'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz', 'newrelic.com', 'nr-data.net', 'nsclick.baidu.com', 
    'oceanengine.com', 'omtrdc.net', 'onesignal.com', 'onetrust.com', 'openx.com', 'openx.net', 
    'optimizely.com', 'outbrain.com', 'pangolin-sdk-toutiao.com', 'pardot.com', 'pbd.yahoo.com', 
    'pc-mon.snssdk.com', 'permutive.com', 'pf.s.360.cn', 'pgdt.gtimg.cn', 'pingma.qq.com', 'piwik.pro', 
    'plausible.io', 'po.st', 'popads.net', 'posthog.com', 'propellerads.com', 'pubmatic.com', 
    'puds.ucweb.com', 'pushengage.com', 'pv.sohu.com', 'px.ads.linkedin.com', 'px.srvcs.tumblr.com', 
    'quantserve.com', 'rakutenadvertising.com', 'raygun.io', 'realtime-edge.fastly.com', 'revcontent.com', 
    'revjet.com', 'rlcdn.com', 'rubiconproject.com', 'rudderstack.com', 's.youtube.com', 'sail-track.com', 
    'sc-static.net', 'scorecardresearch.com', 'sdk.e.qq.com', 'sdk.iad-07.braze.com', 'segment.com', 
    'segment.io', 'semasio.net', 'sensorsdata.cn', 'sentry.io', 'serving-sys.com', 'sharethis.com', 
    'sharethrough.com', 'singular.net', 'sitetag.us', 'sitescout.com', 'smartadserver.com', 'snap.licdn.com', 
    'snowplowanalytics.com', 'soom.la', 'sourcepoint.com', 'sp1.baidu.com', 'spade.twitch.tv', 'spotx.tv', 
    'spotxchange.com', 'stat.m.jd.com', 'statcounter.com', 'static.ads-twitter.com', 'static.cloudflareinsights.com', 
    'statsig.com', 'sugar.zhihu.com', 'sumo.com', 'sumome.com', 'taboola.com', 'tagtoo.co', 'tags.tiqcdn.com', 
    'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'tapad.com', 'teads.tv', 'tealium.com', 'tenmax.io', 
    'thetradedesk.com', 'toots-a.akamaihd.net', 'track.hubspot.com', 'track.tiara.daum.net', 
    'track.tiara.kakao.com', 'trackapp.guahao.cn', 'traffic.mogujie.com', 'tremorhub.com', 'trk.tw', 
    'trustarc.com', 'umeng.cn', 'umeng.co', 'umeng.com', 'umengcloud.com', 'unityads.unity3d.com', 
    'urad.com.tw', 'usercentrics.eu', 'vitals.vercel-insights.com', 'voice.baidu.com', 'volces.com', 'vpon.com', 
    'vungle.com', 'vwo.com', 'wcs.naver.net', 'wmlog.meituan.com', 'wup.imtt.qq.com', 'yandex.ru', 
    'yieldify.com', 'yieldlab.net', 'yieldmo.com', 'youmi.net', 'zdassets.com', 'zemanta.com', 'zeropark.com', 
    'zgsdk.zhugeio.com', 'zhugeio.com', 'zztfly.com'
  ].sort(),

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
    'abtasty.js', 'action.js', 'activity.js', 'ad-core.js', 'ad-full-page.min.js', 'ad-lib.js', 
    'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adobedtm.js', 'adroll.js', 
    'adroll_pro.js', 'ads-beacon.js', 'ads.js', 'adsbygoogle.js', 'adsense.js', 'advideo.min.js', 
    'amplitude.js', 'analytics.js', 'aplus.js', 'aplus_wap.js', 'apstag.js', 'autotrack.js', 
    'bat.js', 'beacon.js', 'beacon.min.js', 'braze.js', 'capture.js', 'cf.js', 'chartbeat.js', 
    'clarity.js', 'cmp.js', 'collect.js', 'comscore.js', 'connect.js', 'conversion.js', 
    'crazyegg.js', 'criteo.js', 'customerio.js', 'dax.js', 'doubleclick.js', 'ec.js', 
    'essb-core.min.js', 'event.js', 'events.js', 'fbevents.js', 'fbq.js', 'fullstory.js', 'ga.js', 
    'gdt.js', 'gtag.js', 'gtm.js', 'heap.js', 'hm.js', 'hotjar.js', 'inspectlet.js', 'insight.min.js', 
    'intercom.js', 'iterable.js', 'link-click-tracker.js', 'logrocket.js', 'main-ad.js', 'matomo.js', 
    'mgid.js', 'mixpanel.js', 'mouseflow.js', 'newrelic.js', 'nr-loader.js', 'optimizely.js', 
    'outbrain.js', 'pangle.js', 'perf.js', 'pixel.js', 'piwik.js', 'plausible.outbound-links.js', 
    'posthog.js', 'prebid.js', 'pubmatic.js', 'quant.js', 'quantcast.js', 'revcontent.js', 
    'scevent.min.js', 'segment.js', 'showcoverad.min.js', 'sp.js', 'statsig.js', 'taboola.js', 
    'tag.js', 'tagtoo.js', 'tiktok-analytics.js', 'tiktok-pixel.js', 'trace.js', 'tracker.js', 
    'tracking-api.js', 'tracking.js', 'ttclid.js', 'u.js', 'um.js', 'user-id.js', 'user-timing.js', 
    'utag.js', 'visitorapi.js', 'vwo.js', 'wcslog.js', 'ytag.js'
  ].sort(),

  /**
   * 🚨 [V40.61 擴充] 關鍵追蹤路徑模式
   */
  CRITICAL_TRACKING_PATTERNS: [
    '/2/client/addlog_batch', '/__utm.gif', '/abtesting/', '/ad-call', '/ad-sw.js', '/ads-sw.js', 
    '/ads/ga-audiences', '/adsales/', '/adserver/', '/adsync/', '/adtech/', '/adx/', '/analytics/', 
    '/api-iam.intercom.io/messenger/web/events', '/api/batch', '/api/collect', '/api/collect/', 
    '/api/event', '/api/events', '/api/log/', '/api/logs/', '/api/track/', '/api/v1/event', 
    '/api/v1/events', '/api/v1/track', '/api/v2/event', '/api/v2/events', '/b/ss', '/beacon/', 
    '/cacafly/track', '/collect?', '/data/collect', '/doubleclick/', '/event_report', '/events/track', 
    '/feature-flag/', '/google-analytics/', '/google.com/ads', '/google.com/pagead', '/googleadservices/', 
    '/googlesyndication/', '/googletagmanager/', '/i/adsct', '/ingest/', '/intake', '/j/collect', 
    '/linkedin/insight/track', '/log/aplus', '/p.gif', '/pagead/gen_204', '/pixel/', '/plugins/easy-social-share-buttons/', 
    '/r/collect', '/rec/bundle', '/service-worker.js', '/stats.g.doubleclick.net/j/collect', '/t.gif', 
    '/telemetry/', '/tiktok/pixel/events', '/tiktok/track/', '/track/', '/track/m', '/track/pc', 
    '/user-profile/', '/v.gif', '/v1/pixel', '/v2/track', '/v3/track', 'a.clarity.ms/collect', 
    'ad.360yield.com', 'ads-api.tiktok.com/api/v2/pixel', 'ads.bing.com/msclkid', 'ads.linkedin.com/li/track', 
    'ads.pinterest.com/v3/conversions/events', 'ads.tiktok.com/i18n/pixel', 'ads.tiktok.com/i1n/pixel/events.js', 
    'ads.yahoo.com/pixel', 'agent-http-intake.logs.us5.datadoghq.com', 'amazon-adsystem.com/e/ec', 
    'analytics.google.com/g/collect', 'analytics.linkedin.com/collect', 'analytics.pinterest.com/', 
    'analytics.snapchat.com/v1/batch', 'analytics.tiktok.com/i18n/pixel/events.js', 'analytics.twitter.com', 
    'api-js.mixpanel.com/track', 'api.amplitude.com', 'api.amplitude.com/2/httpapi', 'api.hubspot.com/events', 
    'api.mixpanel.com/track', 'api.segment.io/v1/page', 'api.segment.io/v1/track', 'bat.bing.com/action', 
    'browser-intake-datadoghq.com/api/v2/rum', 'browser-intake-datadoghq.eu/api/v2/rum', 'business-api.tiktok.com/open_api', 
    'business-api.tiktok.com/open_api/v1', 'business-api.tiktok.com/open_api/v1.2/pixel/track', 
    'business-api.tiktok.com/open_api/v1.3/event/track', 'business-api.tiktok.com/open_api/v1.3/pixel/track', 
    'business-api.tiktok.com/open_api/v2', 'cloudflareinsights.com/cdn-cgi/rum', 'cnzz.com/stat.php', 
    'ct.pinterest.com/v3', 'd.clarity.ms/collect', 'discord.com/api/v10/science', 'discord.com/api/v9/science', 
    'events.reddit.com/v1', 'events.redditmedia.com/v1/pixel', 'facebook.com/tr', 'facebook.com/tr/', 
    'gdt.qq.com/gdt_mview.fcg', 'heap.io/api/track', 'hm.baidu.com/hm.js', 'http-intake.logs.datadoghq.com/v1/input', 
    'in.hotjar.com/api/v2/client', 'ingest.sentry.io/api/', 'l.clarity.ms/collect', 'log.pinterest.com/', 
    'monorail-edge.shopifysvc.com/v1/produce', 'pbd.yahoo.com/data/logs', 'plausible.io/api/event', 
    'px.ads.linkedin.com', 'px.ads.linkedin.com/collect', 'q.quora.com/', 'region1.analytics.google.com/g/collect', 
    's.pinimg.com/ct/core.js', 'sc-static.net/scevent.min.js', 'scorecardresearch.com/beacon.js', 
    'segment.io/v1/track', 'static.cloudflareinsights.com/beacon.min.js', 'stats.g.doubleclick.net/g/collect', 
    'tiktok.com/events', 'tr.snapchat.com', 'vitals.vercel-insights.com/v1/vitals', 'vk.com/rtrg', 'wgo.mmstat.com', 
    'widget.intercom.io', 'www.google-analytics.com/debug/mp/collect', 'www.google-analytics.com/g/collect', 
    'www.google-analytics.com/j/collect', 'www.google-analytics.com/mp/collect', 'www.redditstatic.com/ads/pixel.js'
  ].sort(),

  /**
   * 🚫 [V40.17 擴充, V40.64 擴充] 路徑關鍵字黑名單
   */
  PATH_BLOCK_KEYWORDS: [
    '/ad/', '/ad-choices', '/ad-click', '/ad-code', '/ad-conversion', '/ad-engagement', '/ad-event', 
    '/ad-events', '/ad-exchange', '/ad-impression', '/ad-inventory', '/ad-loader', '/ad-logic', 
    '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request', 
    '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', 
    '/ad-tech', '/ad-telemetry', '/ad-unit', '/ad-verification', '/ad-view', '/ad-viewability', 
    '/ad-wrapper', '/adframe/', '/adrequest/', '/adretrieve/', '/ads/', '/adserve/', '/adserving/', 
    '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/analytic/', '/analytics/', 
    '/api/v2/rum', '/audit/', '/banner/', '/beacon/', '/bugsnag/', '/collect?', '/collector/', '/crash/', 
    '/error/', '/fetch_ads/', '/getad/', '/getads/', '/insight/', '/intelligence/', '/interstitial/', 
    '/measurement', '/midroll/', '/monitoring/', '/popads/', '/popup/', '/postroll/', '/prebid/', 
    '/preroll/', '/promoted/', '/report/', '/reporting/', '/reports/', '/sentry/', '/sponsor/', '/telemetry/', 
    '/trace/', '/unstable/produce_batch', '/v1/produce', '/vclick/', '112wan', '2mdn', '51y5', '51yes', 
    '789htbet', '96110', 'acs86', 'ad-break', 'ad-call', 'ad-choices', 'ad-logics', 'ad_event', 
    'ad_logic', 'ad_pixel', 'adash', 'adashx', 'adcash', 'adcome', 'addsticky', 'addthis', 'adform', 
    'adhacker', 'adinfuse', 'adjust', 'admarvel', 'admaster', 'admation', 'admdfs', 'admicro', 'admob', 
    'adnewnc', 'adpush', 'adpushup', 'adroll', 'adsage', 'adsame', 'adsbygoogle', 'adsense', 
    'adsensor', 'adserver', 'adservice', 'adsh', 'adskeeper', 'adsmind', 'adsmogo', 'adsnew', 
    'adsrvmedia', 'adsrvr', 'adsserving', 'adsterra', 'adsupply', 'adsupport', 'adswizz', 'adsystem', 
    'adtilt', 'adtima', 'adtrack', 'advert', 'advertise', 'advertisement', 'advertiser', 'adview', 
    'ad-video', 'advideo', 'adware', 'adwhirl', 'adwords', 'adzcore', 'affiliate', 'alexametrics', 
    'allyes', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'amplitude', 
    'analysis', 'analysys', 'analytics', 'aottertrek', 'appadhoc', 'appads', 'appboy', 'appier', 
    'applovin', 'appsflyer', 'apptimize', 'apsalar', 'apstag', 'audience', 'attribution', 'baichuan', 
    'bango', 'bangobango', 'behavioral-targeting', 'bidvertiser', 'bingads', 'bkrtx', 'bluekai', 
    'breaktime', 'bugsense', 'burstly', 'cedexis', 'chartboost', 'circulate', 'click-fraud', 
    'clkservice', 'cnzz', 'cognitivlabs', 'cohort', 'collect', 'comscore', 'crazyegg', 'crittercism', 
    'cross-device', 'data-collection', 'data-sync', 'dealerfire', 'debug/mp/collect', 'dfp', 'dienst', 
    'djns', 'dlads', 'dnserror', 'domob', 'doubleclick', 'doublemax', 'dsp', 'duapps', 'duomeng', 
    'dwtrack', 'egoid', 'emarbox', 'en25', 'envelope', 'exception', 'eyeota', 'fbevents', 'fbq', 'fenxi', 
    'fingerprint', 'fingerprinting', 'flurry', 'fwmrm', 'g/collect', 'getadvltem', 'getexceptional', 
    'google-analytics', 'google_ad', 'googleads', 'googlesyndication', 'greenplasticdua', 'growingio', 
    'guanggao', 'guomob', 'guoshipartners', 'heapanalytics', 'hotjar', 'hsappstatic', 'hubspot', 
    'igstatic', 'inmobi', 'innity', 'instabug', 'intercom', 'izooto', 'jpush', 'juicer', 'jumptap', 
    'kissmetrics', 'lianmeng', 'litix', 'localytics', 'logly', 'mailmunch', 'malvertising', 'matomo', 
    'medialytics', 'meetrics', 'mgid', 'mifengv', 'mixpanel', 'mobaders', 'mobclix', 
    'mobileapptracking', 'mp/collect', 'mvfglobal', 'networkbench', 'newrelic', 'omgmta', 'omniture', 
    'onead', 'openinstall', 'openx', 'optimizely', 'osano', 'outstream', 'pagead', 'partnerad', 
    'performance-tracking', 'pingfore', 'piwik', 'pixanalytics', 'playtomic', 'polyad', 'popin', 
    'popin2mdn', 'programmatic', 'pushnotification', 'pwt.js', 'quantserve', 'quantumgraph', 
    'queryly', 'qxs', 'rayjump', 'real-user-monitoring', 'retargeting', 'ronghub', 'rtb', 'sailthru', 
    'scorecardresearch', 'scupio', 'securepubads', 'sensor', 'sentry', 'session-replay', 'shence', 
    'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'smartbanner', 'snowplow', 'socdm', 
    'sponsors', 'spy', 'spyware', 'stacktrace', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 
    'straas', 'studybreakmedia', 'stunninglover', 'supersonicads', 'syndication', 'taboola', 
    'tagtoo', 'talkingdata', 'tanx', 'tapfiliate', 'tapjoy', 'tapjoyads', 'tenmax', 'third-party-cookie', 
    'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji', 'tracker', 'trackersimulator', 'tracking', 
    'trafficjunky', 'trafficmanager', 'tubemogul', 'uedas', 'umeng', 'umtrack', 'unidesk', 
    'user-analytics', 'user-behavior', 'user-cohort', 'user-segment', 'usermaven', 'usertesting', 
    'utag.js', 'venraas', 'vilynx', 'vpon', 'vungle', 'web-vitals', 'whalecloud', 'wistia', 
    'wlmonitor', 'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget', 'zgdfz6h7po', 'zgty365', 
    'zhengjian', 'zhengwunet', 'zhuichaguoji', 'zjtoolbar', 'zzhyyj'
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
    'app.js', 'badge.svg', 'browser.js', 'bundle.js', 'card.js', 'chunk-common', 'chunk-vendors', 
    'chunk.js', 'chunk.mjs', 'common.js', 'component---', 'config.js', 'favicon.ico', 'fetch-polyfill', 
    'framework.js', 'framework.mjs', 'head.js', 'header.js', 'icon.svg', 'index.js', 'index.mjs', 
    'legacy.js', 'loader.js', 'logo.svg', 'main.js', 'manifest.json', 'modal.js', 'padding.css', 
    'page-data.js', 'polyfill.js', 'polyfills.js', 'polyfills.mjs', 'robots.txt', 'runtime.js', 
    'sitemap.xml', 'styles.css', 'styles.js', 'sw.js', 'theme.js', 'vendor.js', 'web.config'
  ].sort(),

  /**
   * ✅ [V40.6 安全強化] 路徑白名單 - 子字串 (Path Allowlist - Substrings)
   * 說明：當路徑包含此處的字串時，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於典型靜態路徑)。
   */
  PATH_ALLOW_SUBSTRINGS: [
    '_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/'
  ].sort(),

  /**
   * ✅ [V40.6 安全強化, V40.65 恢復] 路徑白名單 - 區段 (Path Allowlist - Segments)
   * 說明：當路徑被 '/' 分割後，若任一區段完全匹配此處的字串，將豁免 `PATH_BLOCK_KEYWORDS` 檢查 (用於避免誤殺功能性路徑)。
   */
  PATH_ALLOW_SEGMENTS: [
    'admin', 'api', 'blog', 'catalog', 'dashboard', 'dialog', 'login'
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
    '.log', '-log.', '?diag=', '?log=', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 
    'airbrake', 'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 
    'crash-report', 'crashlytics', 'csp-report', 'data-pipeline', 'diagnostic.log', 'error-monitoring', 
    'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event', 'logevents', 'loggly', 
    'log-hl', 'profiler', 'realtime-log', 'rum', 'server-event', 'stacktrace', 'telemetry', 
    'trace.json', 'uploadmobiledata', 'web-beacon', 'web-vitals'
  ].sort(),

  /**
   * 🗑️ [V40.51 強化, V40.61 擴充] 追蹤參數黑名單 (全域)
   * 說明：用於高速比對常見的、靜態的追蹤參數。
   */
  GLOBAL_TRACKING_PARAMS: [
     '_branch_match_id', '_ga', '_gid', 'dclid', 'fbclid', 'gclid', 'gclsrc', 'gbraid', 'igshid', 
     'ko_click_id', 'li_fat_id', 'li_medium', 'li_source', 'linkedin_share', 'mc_cid', 'mc_eid', 
     'mibextid', 'msclkid', 'trk', 'tt_adgroup', 'tt_campaign', 'tt_creative', 'tt_c_id', 'ttclid', 
     'twclid', 'wbraid', 'yclid', 'zanpid'
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
    'li_fat_', 'linkedin_', 'matomo_', 'medium_', 'mkt_', 'ms_', 'mtm', 'pk_', 'piwik_', 
    'placement_', 'ref_', 'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_', 'ttc_'
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
    'access_token', 'aff_sub', 'callback', 'cancel_url', 'client_assertion', 'client_id', 'click_id', 
    'code', 'deal_id', 'device_id', 'direction', 'error_url', 'filter', 'format', 'id', 'item', 'lang', 
    'limit', 'locale', 'nonce', 'offer_id', 'offset', 'order', 'p', 'page', 'page_number', 'product_id', 
    'q', 'query', 'redirect_uri', 'refresh_token', 'response_type', 'return_url', 'scope', 'search', 
    'session_id', 'size', 'sort', 'sort_by', 'state', 'status', 'success_url', 't', 'targetid', 
    'timestamp', 'token', 'type', 'v'
  ].sort(),

  /**
   * 🚫 [V40.40 重構, V40.64 擴充, V40.67 優化] 基於正規表示式的路徑黑名單 (高信度)
   * 說明：用於攔截高信度的、確定性的威脅路徑模式。
   */
  PATH_BLOCK_REGEX: [
    // [V40.47 強化, V40.67 優化] 擴充例外目錄，以降低對傳統部署靜態站的誤殺率。
    /^\/(?!_app\/|_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i,
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
      /[a-z0-9\-_]{32,}\.(js|mjs)$/i,  // V40.37: 反混淆啟發式規則，攔截超長隨機路徑的腳本
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
                    console.log(`[URL-Filter-v40.67][Debug] 路徑豁免被覆蓋。豁免規則: "${exemptionRule}" | 偵測到關鍵字: "${trackerKeyword}" | 路徑: "${path}"`);
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
                console.log(`[URL-Filter-v40.67][Debug] 啟發式規則命中。規則: "${regex.toString()}" | 路徑: "${path}"`);
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
            console.log(`[URL-Filter-v40.67][Debug] 偵測到追蹤參數 (僅記錄)。原始 URL (淨化後): "${cleanedForLog.toString()}" | 待移除參數: ${JSON.stringify(toDelete)}`);
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
        console.error(`[URL-Filter-v40.67]`, executionError);
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
            console.log(`[URL-Filter-v40.67][Debug] 硬白名單命中。主機: "${hostname}" | 規則: "${hardWhitelistDetails.rule}" (${hardWhitelistDetails.type})`);
        }
        return null;
    }

    const softWhitelistDetails = getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_EXACT, CONFIG.SOFT_WHITELIST_WILDCARDS);
    if (softWhitelistDetails.matched) {
        optimizedStats.increment('softWhitelistHits');
        if (CONFIG.DEBUG_MODE) {
            console.log(`[URL-Filter-v40.67][Debug] 軟白名單命中。主機: "${hostname}" | 規則: "${softWhitelistDetails.rule}" (${softWhitelistDetails.type})`);
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
                        console.log(`[URL-Filter-v40.67][Debug] 域名封鎖被路徑豁免。主機: "${hostname}" | 豁免規則: "${exemption}"`);
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
        $done({ version: '40.67', status: 'ready', message: 'URL Filter v40.67 - 啟發式規則檢討與清單重組', stats: optimizedStats.getStats() });
      }
      return;
    }

    const result = processRequest($request);

    if (CONFIG.DEBUG_MODE) {
      const endTime = __now__();
      const executionTime = (endTime - startTime).toFixed(3);
      console.log(`[URL-Filter-v40.67][Debug] 請求處理耗時: ${executionTime} ms | URL: ${requestForLog}`);
    }

    if (typeof $done !== 'undefined') {
        $done(result || {});
    }
  } catch (error) {
    logError(error, { stage: 'globalExecution' });
    if (typeof $done !== 'undefined') $done({});
  }
})();
