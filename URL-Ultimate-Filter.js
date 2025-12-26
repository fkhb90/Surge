/**
 * @file      URL-Ultimate-Filter-Surge-V42.01.js
 * @version   42.01 (Action-Based Complex Rules)
 * @description [架構升級版] 在複雜規則引擎中引入 "action" 欄位，支援針對不同路徑定義 REJECT, TINY_GIF, NO_CONTENT 等精確攔截行為。優化 104 API 攔截體驗，防止 App 報錯。
 * @note      此版本基於 V42.00 架構進行功能擴充。
 * @author    Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-12-26
 */

// #################################################################################################
// #                                                                                               #
// #                               ⚙️ SCRIPT CONFIGURATION                                         #
// #                               (使用者在此區域安全地新增、修改或移除規則)                          #
// #                                                                                               #
// #################################################################################################

/**
 * @note 規則分類哲學 (Rule Classification Philosophy) - V40.48 增補
 * 此設定檔中的規則，是基於「子域名的具體功能」而非「母公司品牌」進行分類。
 */
const CONFIG = {
  /**
   * ✅ 全域「除錯模式」
   */
  DEBUG_MODE: false,

  /**
   * ✅ Aho-Corasick 演算法掃描路徑的最大長度
   */
  AC_SCAN_MAX_LENGTH: 512,

  /**
   * 🏗️ [V42.01 擴充] 進階複雜規則配置區 (Advanced Complex Rules)
   * 說明：支援 Regex 與自定義攔截動作 (Action)。
   * 結構：
   * {
   * "target_root": "主網域後綴",
   * "rules": [
   * { 
   * "pattern": "Regex字串", 
   * "flags": "Regex旗標", 
   * "action": "BLOCK | REJECT | TINY_GIF | NO_CONTENT | DROP" // [V42.01 新增]
   * }
   * ]
   * }
   */
  ADVANCED_COMPLEX_RULES: [
    {
      target_root: "104.com.tw",
      description: "104 Job Bank - Fine-grained Control",
      rules: [
        // 1. App 遙測日誌：使用 NO_CONTENT (204) 避免 App 出現「網路錯誤」提示
        { pattern: "/api/apps/createapploginlog", flags: "i", action: "NO_CONTENT" },
        
        // 2. 廣告 API 服務：使用 REJECT (403) 強制阻擋
        { pattern: "/jb/service/ad/.*\\?", flags: "i", action: "REJECT" },
        
        // 3. 廣告圖片/連結：使用 BLOCK (智慧判斷，若是圖片則回傳 GIF)
        { pattern: "/ad/(general|premium|recommend)\\?", flags: "i", action: "BLOCK" },
        
        // 4. 廣告配置檔：REJECT
        { pattern: "/publish/.*\\.txt", flags: "i", action: "REJECT" },
        
        // 5. 網站分析：REJECT
        { pattern: "/web/alexa\\.html", flags: "i", action: "REJECT" }
      ]
    }
  ],
   
  /**
   * ✅ [V40.76] L1 快取預熱種子
   */
  CACHE_SEEDS: new Map([
      ['google.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['apple.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['facebook.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['microsoft.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['googlevideo.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['gstatic.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
      ['doubleclick.net', { decision: 'BLOCK', ttl: 3600 * 1000 }],
      ['google-analytics.com', { decision: 'BLOCK', ttl: 3600 * 1000 }]
  ]),

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
    'tmearn.net', 'tnshort.net', 'tribuntekno.com', 'turdown.com', 'tutwuri.id', 'uplinkto.hair', 
    'urlbluemedia.shop', 'urlcash.com', 'urlcash.org', 'vinaurl.net', 'vzturl.com', 'xpshort.com', 
    'zegtrends.com'
  ]),

  /**
   * ✳️ 硬白名單 - 精確匹配 (Hard Whitelist - Exact)
   */
  HARD_WHITELIST_EXACT: new Set([
    // --- AI & Search Services ---
    'chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'www.perplexity.ai',
    'pplx-next-static-public.perplexity.ai',
    'private-us-east-1.monica.im', 'api.felo.ai',
    // --- Business & Developer Tools ---
    'adsbypasser.github.io', 'code.createjs.com', 'oa.ledabangong.com', 'oa.qianyibangong.com', 'qianwen.aliyun.com',
    'raw.githubusercontent.com', 'reportaproblem.apple.com', 'ss.ledabangong.com', 'userscripts.adtidy.org',
    // --- Meta / Facebook ---
    'ar-genai.graph.meta.com', 'ar.graph.meta.com', 'gateway.facebook.com', 'meta-ai-realtime.facebook.com', 'meta.graph.meta.com', 'wearable-ai-realtime.facebook.com',
    // --- Media & CDNs ---
    'cdn.ghostery.com', 'cdn.shortpixel.ai', 'cdn.syndication.twimg.com', 'd.ghostery.com', 'data-cloud.flightradar24.com', 'ssl.p.jwpcdn.com',
    'staticcdn.duckduckgo.com',
    // --- Music & Content Recognition ---
    'secureapi.midomi.com',
    // --- Services & App APIs ---
    'ap02.in.treasuredata.com', 
    // 'appapi.104.com.tw', // [V41.18] Moved to Soft Whitelist
    'eco-push-api-client.meiqia.com', 'exp.acsnets.com.tw', 'mpaystore.pcstore.com.tw',
    'mushroomtrack.com', 'phtracker.com', 
    'prodapp.babytrackers.com', 'sensordata.open.cn', 'static.stepfun.com', 'track.fstry.me',
    // --- 核心登入 & 認證 ---
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'sso.godaddy.com',
    'idmsa.apple.com',
    'api.login.yahoo.com',
    // --- 台灣地區服務 ---
    'api.etmall.com.tw', 'tw.fd-api.com',
    // --- [V40.42] 台灣關鍵基礎設施 ---
    'api.map.ecpay.com.tw',
    // --- 支付 & 金流 API ---
    'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw', 'api.jkos.com', 'payment.ecpay.com.tw',
    // --- 票務 & 關鍵 API ---
    'api.line.me', 'kktix.com', 'tixcraft.com',
    // --- 高互動性服務 API ---
    'api.discord.com', 'api.twitch.tv', 'graph.instagram.com', 'graph.threads.net', 'i.instagram.com',
    'iappapi.investing.com',
    'today.line.me',
    // --- 品牌短網址 & 重定向 ---
    't.uber.com',
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
    // --- [V40.82 新增] 核心重定向 & App 連結服務 ---
    'app.goo.gl', 'goo.gl',
    // --- 核心登入 & 協作平台 ---
    'atlassian.net', 'auth0.com', 'okta.com',
    // --- [V40.85 新增] DNS & 隱私工具 ---
    'nextdns.io',
    // --- 系統 & 平台核心服務 ---
    'googleapis.com',
    'icloud.com',
    'linksyssmartwifi.com', 'update.microsoft.com', 'windowsupdate.com',
    // --- 網頁存檔服務 (對參數極度敏感) ---
    'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com', 'perma.cc',
    'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'www.webarchive.org.uk',
    // --- YouTube 核心服務 (僅保留基礎建設) ---
    'googlevideo.com',
    // --- Uber 核心基礎設施 ---
    'cfe.uber.com',
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
    'www.momoshop.com.tw', // [V41.05] 優化 crossBridge.jsp
    'm.momoshop.com.tw', // [V41.14] 優化行動版 UI
    'bsp.momoshop.com.tw', // [V41.16] MOMO 供應商商品詳情
    // --- 104 Job Bank Services [V41.18] (降級至軟白名單以支援 Regex 攔截) ---
    'appapi.104.com.tw',
    'pro.104.com.tw',
    // --- Yahoo EC Services [V41.15] ---
    'prism.ec.yahoo.com',
    'graphql.ec.yahoo.com',
    // --- 其他 ---
    'visuals.feedly.com',
    'api.revenuecat.com', 
    'api-paywalls.revenuecat.com',
    'account.uber.com',
    'xlb.uber.com',
  ]),

  /**
   * ✅ 軟白名單 - 萬用字元 (Soft Whitelist - Wildcards)
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
    // --- 協作平台 ---
    'slack.com',
    // --- AdsBypasser ---
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
    'guce.oath.com', // [V41.15] Yahoo Privacy
    'mdap.alipay.com', 'loggw-ex.alipay.com',
    'adnext-a.akamaihd.net', 'appnext.hs.llnwd.net', 'cache.ltn.com.tw',
    'fusioncdn.com', 'pgdt.gtimg.cn', 'toots-a.akamaihd.net',
    'app-site-association.cdn-apple.com', 'iadsdk.apple.com',
    'afd.baidu.com', 'als.baidu.com', 'cpro.baidu.com', 'dlswbr.baidu.com', 'duclick.baidu.com', 'feed.baidu.com', 'h2tcbox.baidu.com', 'hm.baidu.com',
    'hmma.baidu.com', 'mobads-logs.baidu.com', 'mobads.baidu.com', 'nadvideo2.baidu.com', 'nsclick.baidu.com', 'sp1.baidu.com', 'voice.baidu.com',
    'admob.com', 'adsense.com', 'adservice.google.com', 'app-measurement.com', 'doubleclick.net', 'google-analytics.com',
    'googleadservices.com', 'googlesyndication.com', 'googletagmanager.com',
    'business.facebook.com', 'connect.facebook.net', 'graph.facebook.com',
    'ads.tiktok.com', 'analytics.tiktok.com', 'business-api.tiktok.com', 'events.tiktok.com',
    '3gimg.qq.com', 'fusion.qq.com', 'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com', 'wup.imtt.qq.com',
    'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com', 'sugar.zhihu.com',
    'cdn-edge-tracking.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com', 'edge-tracking.cloudflare.com', 'edgecompute-analytics.com', 'monitoring.edge-compute.io',
    'realtime-edge.fastly.com',
    '2o7.net', 'everesttech.net',
    'log.felo.ai',
    'event.sc.gearupportal.com',
    'pidetupop.com',
    'adform.net', 'adjust.com', 'ads.linkedin.com', 'adsrvr.org', 'agn.aty.sohu.com', 'amplitude.com', 'analytics.line.me',
    'analytics.slashdotmedia.com', 'analytics.strava.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'api.pendo.io',
    'apm.gotokeep.com', 'applog.uc.cn', 'appsflyer.com', 'branch.io', 'braze.com', 'bugsnag.com', 'c.clarity.ms',
    'c.segment.com',
    'chartbeat.com', 'clicktale.net', 'clicky.com', 'cn-huabei-1-lg.xf-yun.com', 'comscore.com', 'crazyegg.com', 'criteo.com',
    'criteo.net', 'customer.io', 'data.investing.com', 'datadoghq.com', 'dynatrace.com', 'fullstory.com', 'gs.getui.com', 'heap.io', 
    'hotjar.com', 'inspectlet.com', 'iterable.com', 'keen.io', 'kissmetrics.com', 'log.b612kaji.com', 'loggly.com', 'logrocket.com', 'matomo.cloud', 
    'mgid.com', 'mixpanel.com', 'mouseflow.com', 'mparticle.com', 'mlytics.com', 'newrelic.com', 'nr-data.net', 'oceanengine.com', 'openx.com', 
    'openx.net', 'optimizely.com', 'outbrain.com', 'pc-mon.snssdk.com', 'piwik.pro', 'posthog.com', 'pubmatic.com', 'quantserve.com', 'revcontent.com',
    'rubiconproject.com', 'rudderstack.com', 'scorecardresearch.com', 'segment.com', 'segment.io', 'semasio.net', 'sensorsdata.cn', 'sentry.io', 
    'snowplowanalytics.com', 'stat.m.jd.com', 'statcounter.com', 'statsig.com', 'static.ads-twitter.com', 'sumo.com', 'sumome.com', 'taboola.com', 
    'tealium.com', 'track.hubspot.com', 'track.tiara.daum.net', 'track.tiara.kakao.com', 'trackapp.guahao.cn', 'traffic.mogujie.com', 'vwo.com', 
    'wmlog.meituan.com', 'yieldlab.net', 'zgsdk.zhugeio.com',
    'analytics.linkedin.com', 'insight.linkedin.com', 'px.ads.linkedin.com',
    'fingerprint.com',
    'doubleverify.com', 'iasds.com', 'moat.com', 'moatads.com', 'sdk.iad-07.braze.com', 'serving-sys.com',
    'tw.ad.doubleverify.com',
    'agkn.com', 'id5-sync.com', 'liveramp.com', 'permutive.com', 'tags.tiqcdn.com',
    'klaviyo.com', 'marketo.com', 'mktoresp.com', 'pardot.com',
    'instana.io', 'kochava.com', 'launchdarkly.com', 'raygun.io', 'singular.net',
    'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad-cn.jovcloud.com', 'ad.12306.cn', 'ad.360in.com', 'ad.51wnl-cq.com', 'ad.api.3g.youku.com', 'ad.caiyunapp.com',
    'ad.hzyoka.com', 'ad.jiemian.com', 'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'adashxgc.ut.taobao.com', 'adashz4yt.m.taobao.com', 'adcolony.com',
    'adextra.51wnl-cq.com', 'adroll.com', 'ads.adadapted.com', 'ads.daydaycook.com.cn', 'ads.weilitoutiao.net',
    'ads.yahoo.com', 'adsapi.manhuaren.com', 'adsdk.dmzj.com', 'adse.ximalaya.com', 'adserver.pandora.com', 'adserver.yahoo.com', 'adsnative.com',
    'adswizz.com', 'adtrack.quark.cn', 'adui.tg.meitu.com', 'adv.bandi.so', 'adxserver.ad.cmvideo.cn', 'amazon-adsystem.com',
    'api.cupid.dns.iqiyi.com', 'api.joybj.com', 'api.whizzone.com', 'app-ad.variflight.com', 'applovin.com', 'appnexus.com',
    'asimgs.pplive.cn', 'atm.youku.com', 'beacon-api.aliyuncs.com', 'bdurl.net', 'bidswitch.net', 'bluekai.com', 'casalemedia.com',
    'contextweb.com', 'conversantmedia.com', 'cr-serving.com', 'creativecdn.com', 'csp.yahoo.com', 'flashtalking.com', 'geo.yahoo.com', 'ggs.myzaker.com',
    'go-mpulse.net', 'gumgum.com', 'idatalog.iflysec.com', 'indexexchange.com', 'inmobi.com', 'ironsrc.com', 'itad.linetv.tw', 'ja.chushou.tv',
    'liveintent.com', 'mads.suning.com', 'magnite.com', 'media.net', 'mobileads.msn.com', 'mopnativeadv.037201.com', 'mum.alibabachengdun.com',
    'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz', 'pbd.yahoo.com', 'pf.s.360.cn', 'puds.ucweb.com', 'pv.sohu.com', 's.youtube.com',
    'sharethrough.com', 'sitescout.com', 'smartadserver.com', 'soom.la', 'spotx.tv', 'spotxchange.com', 'tapad.com', 'teads.tv', 'thetradedesk.com',
    'tremorhub.com', 'unityads.unity3d.com', 'volces.com', 'vungle.com', 'yieldify.com', 'yieldmo.com', 'zemanta.com', 'zztfly.com',
    'innovid.com', 'springserve.com',
    'adcash.com', 'popads.net', 'propellerads.com', 'zeropark.com',
    'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com',
    'adriver.ru', 'yandex.ru',
    'addthis.com', 'cbox.ws', 'disqus.com', 'disquscdn.com', 'intensedebate.com', 'onesignal.com',
    'po.st', 'pushengage.com', 'sail-track.com', 'sharethis.com',
    'intercom.io', 'liveperson.net', 'zdassets.com',
    'cookielaw.org', 'onetrust.com', 'sourcepoint.com', 'trustarc.com', 'usercentrics.eu',
    'ad-geek.net', 'ad-hub.net', 'analysis.tw', 'aotter.net', 'cacafly.com',
    'clickforce.com.tw', 
    'ecdmp.momoshop.com.tw', 'analysis.momoshop.com.tw', 'event.momoshop.com.tw', 'log.momoshop.com.tw', 'trk.momoshop.com.tw', 'sspap.momoshop.com.tw',
    'fast-trk.com', 'funp.com', 'guoshipartners.com', 'imedia.com.tw', 'is-tracking.com',
    'likr.tw', 'rtb.momoshop.com.tw',
    'sitetag.us', 'tagtoo.co', 'tenmax.io', 'trk.tw', 'urad.com.tw', 'vpon.com',
    'analytics.shopee.tw', 'dmp.shopee.tw',
    'analytics.etmall.com.tw', 'ad.etmall.com.tw',
    'pixel.momoshop.com.tw', 'trace.momoshop.com.tw',
    'ad-serv.teepr.com',
    'appier.net',
    'admaster.com.cn', 'adview.cn', 'alimama.com', 'cnzz.com', 'getui.com', 'getui.net', 'gepush.com', 'gridsum.com', 'growingio.com',
    'igexin.com', 'jiguang.cn', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com', 'pangolin-sdk-toutiao.com',
    'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'umeng.cn', 'umeng.co', 'umeng.com',  'umengcloud.com', 'youmi.net', 'zhugeio.com',
    'bat.bing.com', 'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'hs-analytics.net',
    'hs-scripts.com', 'metrics.vitals.vercel-insights.com', 'monorail-edge.shopifysvc.com', 'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com',
    'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com',
    'snap.licdn.com', 'spade.twitch.tv', 'tr.snap.com',
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
    'ads.js', 'adsbygoogle.js', 'analytics.js', 'ga-init.js',
    'ga.js', 'gtag.js', 'gtm.js', 'ytag.js',
    'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js',
    'events.js', 'tiktok-pixel.js', 'ttclid.js',
    'insight.min.js',
    'amplitude.js', 'braze.js', 'chartbeat.js', 'clarity.js', 'comscore.js', 'crazyegg.js', 'customerio.js', 'fullstory.js', 'heap.js',
    'hotjar.js', 'inspectlet.js', 'iterable.js', 'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js',
    'piwik.js', 'posthog.js', 'quant.js', 'quantcast.js', 'segment.js', 'statsig.js', 'vwo.js',
    'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adroll.js', 'advideo.min.js', 'apstag.js',
    'criteo-loader.js', 'criteo.js', 'doubleclick.js', 'mgid.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'revcontent.js', 'taboola.js',
    'ad-full-page.min.js',
    'api_event_tracking_rtb_house.js', 'ed.js', 'itriweblog.js', 'api_event_tracking.js',
    'adobedtm.js', 'dax.js', 'tag.js', 'utag.js', 'visitorapi.js',
    'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js',
    'essb-core.min.js', 'intercom.js', 'pangle.js', 'tagtoo.js', 'tiktok-analytics.js',
    'aplus.js', 'aplus_wap.js', 'ec.js', 'gdt.js', 'hm.js', 'u.js', 'um.js',
    'bat.js', 'beacon.min.js', 'plausible.outbound-links.js',
    'abtasty.js', 'action.js', 'activity.js', 'ad-core.js', 'ad-lib.js', 'adroll_pro.js', 'ads-beacon.js',
    'autotrack.js', 'beacon.js', 'capture.js', 'cf.js', 'cmp.js', 'collect.js', 'conversion.js', 'event.js',
    'link-click-tracker.js', 'main-ad.js', 'scevent.min.js', 'showcoverad.min.js', 'sp.js', 'tracker.js',
    'tracking-api.js', 'tracking.js', 'user-id.js', 'user-timing.js', 'wcslog.js',
  ]),

  /**
   * 🚨 關鍵追蹤路徑模式 (主機名 -> 路徑前綴集)
   */
  CRITICAL_TRACKING_MAP: new Map([
    ['account.uber.com', new Set(['/_events'])],
    ['api.tongyi.com', new Set(['/app/mobilelog', '/qianwen/event/track'])],
    ['gw.alipayobjects.com', new Set(['/config/loggw/'])],
    ['slack.com', new Set(['/api/profiling.logging.enablement', '/api/telemetry'])],
    ['graphql.ec.yahoo.com', new Set(['/app/sas/v1/fullSitePromotions'])],
    ['prism.ec.yahoo.com', new Set(['/api/prism/v2/streamWithAds'])],
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
    ['ad.360yield.com', new Set([])],
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
    ['c.segment.com', new Set(['/v1/track', '/v1/page', '/v1/identify'])],
    ['heap.io', new Set(['/api/track'])],
    ['in.hotjar.com', new Set(['/api/v2/client'])],
    ['scorecardresearch.com', new Set(['/beacon.js'])],
    ['segment.io', new Set(['/v1/track'])],
    ['tr.snap.com', new Set(['/v2/conversion'])],
    ['widget.intercom.io', new Set([])],
    ['ads-api.tiktok.com', new Set(['/api/v2/pixel'])],
    ['ads.pinterest.com', new Set(['/v3/conversions/events'])],
    ['analytics.snapchat.com', new Set(['/v1/batch'])],
    ['cnzz.com', new Set(['/stat.php'])],
    ['gdt.qq.com', new Set(['/gdt_mview.fcg'])],
    ['hm.baidu.com', new Set(['/hm.js'])],
    ['cloudflareinsights.com', new Set(['/cdn-cgi/rum'])],
    ['static.cloudflareinsights.com', new Set(['/beacon.min.js'])],
    ['bat.bing.com', new Set(['/action'])],
    ['metrics.vitals.vercel-insights.com', new Set(['/v1/metrics'])],
    ['monorail-edge.shopifysvc.com', new Set(['/v1/produce'])],
    ['vitals.vercel-insights.com', new Set(['/v1/vitals'])],
    ['pbd.yahoo.com', new Set(['/data/logs'])],
    ['plausible.io', new Set(['/api/event'])],
    ['analytics.tiktok.com', new Set(['/i18n/pixel/events.js'])],
    ['a.clarity.ms', new Set(['/collect'])],
    ['d.clarity.ms', new Set(['/collect'])],
    ['l.clarity.ms', new Set(['/collect'])],
    ['ingest.sentry.io', new Set(['/api/'])],
    ['agent-http-intake.logs.us5.datadoghq.com', new Set([])],
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
   * 🚨 關鍵追蹤路徑模式 (通用)
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
    '/user-profile/', 'cacafly/track',
    '/api/v1/t',
    '/sa.gif',
  ]),

  /**
   * 🚫 路徑關鍵字黑名單
   */
  PATH_BLOCK_KEYWORDS: new Set([
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/banner/', '/interstitial/',
    '/midroll/', '/popads/', '/popup/', '/postroll/', '/preroll/', '/promoted/', '/sponsor/', '/vclick/',
    '/ads-self-serve/', 
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
    'quantumgraph', 'queryly', 'qxs', 'rayjump', 'retargeting', 'ronghub', 'scorecardresearch', 'scupio',
    'securepubads', 'sensor', 'sentry', 'shence', 'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'smartbanner', 
    'snowplow', 'socdm', 'sponsors', 'spy', 'spyware', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 'straas', 
    'studybreakmedia', 'stunninglover', 'supersonicads', 'syndication', 'taboola', 'tagtoo', 'talkingdata', 'tanx', 
    'tapjoy', 'tapjoyads', 'tenmax', 'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji', '/trace/', 'tracker', 
    'trackersimulator', 'tracking', 'trafficjunky', 'trafficmanager', 'tubemogul', 'uedas', 'umeng', 'umtrack', 
    'unidesk', 'usermaven', 'usertesting', 'vast', 'venraas', 'vilynx', 'vpaid', 'vpon', 'vungle', 'whalecloud', 'wistia', 'wlmonitor', 
    'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget', 'zgdfz6h7po', 'zgty365', 'zhengjian', 'zhengwunet', 'zhuichaguoji', 
    'zjtoolbar', 'zzhyyj',
    '/ad-choices', '/ad-click', '/ad-code', 'ad-conversion',
    '/ad-engagement', 'ad-engagement',
    '/ad-event', '/ad-events', '/ad-exchange', 'ad-impression',
    '/ad-impression', '/ad-inventory', '/ad-loader',
    '/ad-logic', '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request',
    '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', '/ad-tech',
    'ad-telemetry',
    '/ad-telemetry', '/ad-unit', 'ad-verification',
    '/ad-verification', '/ad-view', 'ad-viewability',
    '/ad-viewability', '/ad-wrapper', '/adframe/',
    '/adrequest/', '/adretrieve/', '/adserve/', '/adserving/', '/fetch_ads/', '/getad/', '/getads/', 'ad-break', 
    'ad_event', 'ad_logic', 'ad_pixel', 'ad-call', 'adsbygoogle', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 
    'amp-sticky-ad', 'amp4ads', 'apstag', 'google_ad', 'pagead', 'pwt.js',
    '/analytic/', '/analytics/', '/api/v2/rum', '/audit/', '/beacon/', '/collect?', '/collector/', 'g/collect', '/insight/',
    '/intelligence/', '/measurement', 'mp/collect', '/pixel/', '/report/', '/reporting/', '/reports/',
    '/telemetry/', '/unstable/produce_batch', '/v1/produce',
    '/bugsnag/', '/crash/', 'debug/mp/collect', '/error/', '/envelope', '/exception/', '/sentry/', '/stacktrace/',
    'performance-tracking', 'real-user-monitoring', 'web-vitals',
    'audience', 'attribution', 'behavioral-targeting', 'cohort', 'cohort-analysis', 'data-collection',
    'data-sync', 'fingerprint',
    'retargeting', 'session-replay', 'third-party-cookie', 'user-analytics', 'user-behavior', 'user-cohort', 'user-segment',
    'appier', 'comscore', 'fbevents', 'fbq', 'google-analytics', 'onead', 'osano', 'sailthru', 'tapfiliate', 'utag.js',
  ]),
    
  /**
   * ✅ 路徑前綴白名單
   */
  PATH_ALLOW_PREFIXES: new Set([
      '/.well-known/'
  ]),
   
  /**
   * ✅ 路徑白名單 - 後綴
   */
  PATH_ALLOW_SUFFIXES: new Set([
    'app.js', 'bundle.js', 'chunk.js', 'chunk.mjs', 'common.js', 'framework.js', 'framework.mjs', 'index.js',
    'index.mjs', 'main.js', 'polyfills.js', 'polyfills.mjs', 'runtime.js', 'styles.css', 'styles.js', 'vendor.js',
    'badge.svg', 'browser.js', 'card.js', 'chunk-common', 'chunk-vendors', 'component---', 'config.js', 'favicon.ico',
    'fetch-polyfill', 'head.js', 'header.js', 'icon.svg', 'legacy.js', 'loader.js', 'logo.svg', 'manifest.json',
    'modal.js', 'padding.css', 'page-data.js', 'polyfill.js', 'robots.txt', 'sitemap.xml', 'sw.js', 'theme.js', 
    'web.config',
  ]),

  /**
   * ✅ 路徑白名單 - 子字串
   */
  PATH_ALLOW_SUBSTRINGS: new Set([
    '_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/',
  ]),

  /**
   * ✅ 路徑白名單 - 區段
   */
  PATH_ALLOW_SEGMENTS: new Set([
    'admin', 'api', 'blog', 'catalog', 'collections', 'dashboard', 'dialog', 'login',
  ]),

  /**
   * 🚫 高信度追蹤關鍵字
   */
  HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH: new Set([
    '/ads', '/analytics', '/api/track', '/beacon', '/collect', '/pixel', '/tracker'
  ]),

  /**
   * 💧 直接拋棄請求的關鍵字
   */
  DROP_KEYWORDS: new Set([
    '.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 'airbrake',
    'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 'crashlytics', 'csp-report',
    'data-pipeline', 'error-monitoring', 'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event',
    'logevents', 'loggly', 'log-hl', 'realtime-log', 'rum', 'server-event', 'telemetry', 'uploadmobiledata', 'web-beacon', 
    'web-vitals',
    'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json',
  ]),

  /**
   * 🗑️ 追蹤參數黑名單 (全域)
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
   * 🗑️ Regex 追蹤參數黑名單 (全域)
   */
  GLOBAL_TRACKING_PARAMS_REGEX: [
      /^utm_\w+/,
      /^ig_[\w_]+/,
      /^asa_\w+/,
      /^tt_[\w_]+/,
      /^li_[\w_]+/,
  ],

  /**
   * 🗑️ 追蹤參數前綴黑名單
   */
  TRACKING_PREFIXES: new Set([
    '__cf_', '_bta', '_ga_', '_gat_', '_gid_', '_hs', '_oly_', 'action_', 'ad_', 'adjust_', 'aff_', 'af_', 
    'alg_', 'at_', 'bd_', 'bsft_', 'campaign_', 'cj', 'cm_', 'content_', 'creative_', 'fb_', 'from_', 
    'gcl_', 'guce_', 'hmsr_', 'hsa_', 'ir_', 'itm_', 'li_', 'matomo_', 'medium_', 'mkt_', 'ms_', 'mt_', 
    'mtm', 'pk_', 'piwik_', 'placement_', 'ref_', 'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_', 
    'ttc_', 'vsm_', 'li_fat_', 'linkedin_',
  ]),

  /**
   * 🗑️ Regex 追蹤參數前綴黑名單
   */
  TRACKING_PREFIXES_REGEX: [
      /_ga_/,
      /^tt_[\w_]+/,
      /^li_[\w_]+/,
  ],

  /**
   * 🗑️ 裝飾性參數黑名單
   */
  COSMETIC_PARAMS: new Set([
    'fb_ref', 'fb_source', 'from', 'ref', 'share_id', 'source', 'spot_im_redirect_source'
  ]),

  /**
   * ✅ 必要參數白名單
   */
  PARAMS_TO_KEEP_WHITELIST: new Set([
    'code', 'id', 'item', 'p', 'page', 'product_id', 'q', 'query', 'search', 'session_id', 'state', 't', 'targetid', 'token', 'v',
    'callback', 'ct', 'cv', 'filter', 'format', 'lang', 'locale', 'status', 'timestamp', 'type', 'withStats',
    'access_token', 'client_assertion', 'client_id', 'device_id', 'nonce', 'redirect_uri', 'refresh_token', 'response_type', 'scope',
    'direction', 'limit', 'offset', 'order', 'page_number', 'size', 'sort', 'sort_by',
    'aff_sub', 'click_id', 'deal_id', 'offer_id',
    'cancel_url', 'error_url', 'return_url', 'success_url',
  ]),
   
  /**
   * ✅ 參數清理豁免清單
   */
  PARAM_CLEANING_EXEMPTIONS: new Map([
      ['www.google.com', new Set(['/maps/'])],
  ]),

  /**
   * 🚫 基於正規表示式的路徑黑名單
   */
  PATH_BLOCK_REGEX: [
    /^\/(?!_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,
    /\/v\d+\/event/i,
    /\/api\/v\d+\/collect$/i,
  ],

  /**
   * 🚫 啟發式路徑攔截 Regex (實驗性)
   */
  HEURISTIC_PATH_BLOCK_REGEX: [
      /^[a-z0-9]{32,}\.(js|mjs)$/i,
  ],

  /**
   * ✅ 路徑豁免清單 (高風險)
   */
  PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS: new Map([
    ['graph.facebook.com', new Set([
        '/v19.0/',
        '/v20.0/',
        '/v21.0/',
        '/v22.0/',
    ])],
  ]),
};

// #################################################################################################
// #                                                                                               #
// #                            🚀 HYPER-OPTIMIZED CORE ENGINE (V42.01)                            #
// #                                                                                               #
// #################################################################################################

// ================================================================================================
// 🚀 CORE CONSTANTS & VERSION
// ================================================================================================
const SCRIPT_VERSION = '42.01';

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, SOFT_WHITELISTED: 4, NEGATIVE_CACHE: 5 });
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif', 'Content-Length': '43' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const NO_CONTENT_RESPONSE = { response: { status: 204 } };
const IMAGE_EXTENSIONS  = new Set(['.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.css']);

// ================================================================================================
// 📊 STATS & ERROR
// ================================================================================================
class ScriptExecutionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ScriptExecutionError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class OptimizedPerformanceStats {
  constructor() {
    this.counters = Object.create(null);
    this.timings  = Object.create(null);
    this.labels   = [
      'totalRequests','blockedRequests','domainBlocked','pathBlocked','regexPathBlocked',
      'criticalScriptBlocked','paramsCleaned','hardWhitelistHits','softWhitelistHits',
      'errors','l1CacheHits','l2CacheHits', 'complexRuleHits'
    ];
    for (const l of this.labels) this.counters[l] = 0;
    this.timingBuckets = ['parse','whitelist','l1','domainStage','critical','allowlistEval','pathTrie','pathRegex','params','total', 'complex'];
    for (const b of this.timingBuckets) this.timings[b] = 0;
  }
  increment(type) { if (this.counters[type] !== undefined) this.counters[type]++; }
  addTiming(bucket, ms) { if (this.timings[bucket] !== undefined) this.timings[bucket] += ms; }
  getStats() { return { ...this.counters, timings: { ...this.timings } }; }
  
  getSummary() {
      const total = this.counters.totalRequests || 1;
      const blocked = this.counters.blockedRequests || 0;
      const cleaned = this.counters.paramsCleaned || 0;
      const l1Hits = this.counters.l1CacheHits || 0;
      const complexHits = this.counters.complexRuleHits || 0;
      const totalTime = this.timings.total || 0;

      const blockRate = ((blocked / total) * 100).toFixed(2);
      const cleanRate = ((cleaned / total) * 100).toFixed(2);
      const avgTotalTime = (totalTime / total).toFixed(3);
      
      return `[Stats Summary] Total: ${total}, Block: ${blocked} (${blockRate}%), Clean: ${cleaned}, ComplexHits: ${complexHits}, Avg Time: ${avgTotalTime}ms`;
  }
}
const optimizedStats = new OptimizedPerformanceStats();

function logError(error, context = {}) {
  optimizedStats.increment('errors');
  if (typeof console !== 'undefined' && console.error) {
    const executionError = new ScriptExecutionError(error.message, { ...context, originalStack: error.stack });
    console.error(`[URL-Filter-v${SCRIPT_VERSION}]`, executionError);
  }
}

// ================================================================================================
/** ⚙️ Complex Rule Engine (V42 New Feature) */
// ================================================================================================
class ComplexRuleEngine {
  constructor() {
    this.rulesMap = new Map();
  }

  compile(configArray) {
    if (!configArray || !Array.isArray(configArray)) return;
    
    configArray.forEach(config => {
      try {
        const compiledRules = config.rules.map(rule => {
          return {
            regex: new RegExp(rule.pattern, rule.flags || ''),
            action: rule.action || 'BLOCK' // Default action
          };
        });
        this.rulesMap.set(config.target_root, compiledRules);
      } catch (e) {
        logError(e, { stage: 'complexRuleCompile', target: config.target_root });
      }
    });
  }

  // Returns { matched: boolean, action: string }
  match(hostname, fullPath) {
    for (const [rootDomain, rulesList] of this.rulesMap) {
      if (hostname.endsWith(rootDomain)) {
        for (const ruleObj of rulesList) {
          if (ruleObj.regex.test(fullPath)) {
            return { matched: true, action: ruleObj.action };
          }
        }
      }
    }
    return null;
  }
}
const complexRuleEngine = new ComplexRuleEngine();

// ================================================================================================
/** 🔡 Tries & Cache */
// ================================================================================================
class OptimizedTrie {
  constructor() { this.root = Object.create(null); }
  insert(word) {
    let n = this.root;
    for (let i = 0; i < word.length; i++) {
      const c = word[i];
      n = n[c] || (n[c] = Object.create(null));
    }
    n.isEndOfWord = true;
  }
  startsWith(prefix) {
    let n = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const c = prefix[i];
      if (!n[c]) return false;
      n = n[c];
      if (n.isEndOfWord) return true;
    }
    return false;
  }
}

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
    for (const c in this.goto[0]) {
      const s = this.goto[0][c];
      q.push(s);
      this.fail[s] = 0;
    }
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

class HighPerformanceLRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = { k: null, v: null, p: null, n: null };
    this.tail = { k: null, v: null, p: null, n: null };
    this.head.n = this.tail; this.tail.p = this.head;
  }
  _add(node) { node.p = this.head; node.n = this.head.n; this.head.n.p = node; this.head.n = node; }
  _remove(node) { node.p.n = node.n; node.n.p = node.p; }
  _moveToHead(node) { this._remove(node); this._add(node); }
  _popTail() { const last = this.tail.p; this._remove(last); return last; }
  get(key) {
    const n = this.cache.get(key);
    if (n) {
      if (n.exp && n.exp < Date.now()) {
        this._remove(n);
        this.cache.delete(key);
        return null;
      }
      this._moveToHead(n); return n.v;
    }
    return null;
  }
  set(key, value, ttlMs = 0) {
    let n = this.cache.get(key);
    const exp = ttlMs > 0 ? Date.now() + ttlMs : 0;
    if (n) {
      n.v = value; n.exp = exp; this._moveToHead(n);
    } else {
      n = { k: key, v: value, p: null, n: null, exp };
      if (this.cache.size >= this.maxSize) {
        const t = this._popTail(); this.cache.delete(t.k);
      }
      this.cache.set(key, n); this._add(n);
    }
  }
}

const stableKey = (ns, a = '', b = '') => `${SCRIPT_VERSION}|${ns}|${a}|${b}`;
class MultiLevelCacheManager {
  constructor() {
    this.l1DomainCache        = new HighPerformanceLRUCache(512);
    this.l2UrlDecisionCache = new HighPerformanceLRUCache(8192);
  }
  getDomainDecision(hostname) {
    const k = `${SCRIPT_VERSION}|${hostname}`;
    const v = this.l1DomainCache.get(k);
    if (v !== null) optimizedStats.increment('l1CacheHits');
    return v;
  }
  setDomainDecision(hostname, decision, ttlMs = 0) {
    const k = `${SCRIPT_VERSION}|${hostname}`;
    this.l1DomainCache.set(k, decision, ttlMs);
  }
  getUrlDecision(ns, a, b) {
    const k = stableKey(ns, a, b);
    const v = this.l2UrlDecisionCache.get(k);
    if (v !== null) optimizedStats.increment('l2CacheHits');
    return v;
  }
  setUrlDecision(ns, a, b, decision) {
    const k = stableKey(ns, a, b);
    this.l2UrlDecisionCache.set(k, decision);
  }
  seed() {
    for (const [hostname, { decision, ttl }] of CONFIG.CACHE_SEEDS.entries()) {
        const decisionEnum = decision === 'BLOCK' ? DECISION.BLOCK : DECISION.ALLOW;
        this.setDomainDecision(hostname, decisionEnum, ttl);
    }
  }
}
const multiLevelCache = new MultiLevelCacheManager();

// ================================================================================================
/** 📚 惰性初始化索引容器 */
// ================================================================================================
const lazy = (builder) => {
    let instance = null;
    return () => {
        if (instance === null) {
            instance = builder();
        }
        return instance;
    };
};

const getReversedDomainBlockTrie = lazy(() => {
    const trie = new OptimizedTrie();
    CONFIG.BLOCK_DOMAINS.forEach(domain => {
        const reversedDomain = domain.split('').reverse().join('');
        trie.insert(reversedDomain);
    });
    return trie;
});

const getAcPathBlock = lazy(() => new AhoCorasick(Array.from(CONFIG.PATH_BLOCK_KEYWORDS)));
const getAcCriticalGeneric = lazy(() => new AhoCorasick(Array.from(CONFIG.CRITICAL_TRACKING_GENERIC_PATHS)));

const getPrefixTrieForParam = lazy(() => {
    const trie = new OptimizedTrie();
    CONFIG.TRACKING_PREFIXES.forEach(p => trie.insert(p));
    return trie;
});

const getCompiledBlockDomainsRegex = lazy(() => compileRegexList(CONFIG.BLOCK_DOMAINS_REGEX));
const getCompiledGlobalTrackingParamsRegex = lazy(() => compileRegexList(CONFIG.GLOBAL_TRACKING_PARAMS_REGEX));
const getCompiledTrackingPrefixesRegex = lazy(() => compileRegexList(CONFIG.TRACKING_PREFIXES_REGEX));
const getCompiledPathBlockRegex = lazy(() => compileRegexList(CONFIG.PATH_BLOCK_REGEX));
const getCompiledHeuristicPathBlockRegex = lazy(() => compileRegexList(CONFIG.HEURISTIC_PATH_BLOCK_REGEX));

function compileRegexList(list) {
  return list.map(regex => {
    try { return (regex instanceof RegExp) ? regex : new RegExp(regex); }
    catch (e) { logError(e, { rule: regex ? regex.toString() : 'invalid', stage: 'compileRegex' }); return null; }
  }).filter(Boolean);
}

// ================================================================================================
/** ✅ 白名單與域名封鎖 */
// ================================================================================================
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
  const trie = getReversedDomainBlockTrie();
  let node = trie.root;
  for (let i = hostname.length - 1; i >= 0; i--) {
    const char = hostname[i];
    if (!node[char]) break;
    node = node[char];
    if (node.isEndOfWord) {
      const prevChar = hostname[i - 1];
      if (prevChar === undefined || prevChar === '.') return true;
    }
  }
  for (const regex of getCompiledBlockDomainsRegex()) if (regex.test(hostname)) return true;
  return false;
}

// ================================================================================================
/** 🚨 關鍵追蹤偵測 */
// ================================================================================================
function isCriticalTrackingScript(hostname, lowerFullPath) {
  const cached = multiLevelCache.getUrlDecision('crit', hostname, lowerFullPath);
  if (cached !== null) return cached;

  const qIdx = lowerFullPath.indexOf('?');
  const pathOnly = qIdx !== -1 ? lowerFullPath.slice(0, qIdx) : lowerFullPath;
  const slashIndex = pathOnly.lastIndexOf('/');
   
  let scriptName = '';
  if (slashIndex !== -1) {
    if (pathOnly.endsWith('.js') || pathOnly.endsWith('.mjs')) {
        scriptName = pathOnly.slice(slashIndex + 1);
    }
  }

  if (scriptName && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName)) {
    multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true);
    return true;
  }

  const hostPrefixes = CONFIG.CRITICAL_TRACKING_MAP.get(hostname);
  if (hostPrefixes) {
    if (hostPrefixes.size === 0) {
      multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true);
      return true;
    }
    for (const prefix of hostPrefixes) {
      if (lowerFullPath.startsWith(prefix)) {
        multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true);
        return true;
      }
    }
  }

  if (getAcCriticalGeneric().matches(pathOnly, CONFIG.AC_SCAN_MAX_LENGTH)) {
    multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, true);
    return true;
  }

  multiLevelCache.setUrlDecision('crit', hostname, lowerFullPath, false);
  return false;
}

// ================================================================================================
/** 🧯 路徑白名單與阻擋 */
// ================================================================================================
function isPathExplicitlyAllowed(lowerPathOnly) {
  const k = multiLevelCache.getUrlDecision('allow:path', lowerPathOnly, '');
  if (k !== null) return k;

  const runSecondaryCheck = (pathToCheck) => {
    for (const trackerKeyword of CONFIG.HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH) {
      if (pathToCheck.includes(trackerKeyword)) return false;
    }
    return true;
  };

  for (const substring of CONFIG.PATH_ALLOW_SUBSTRINGS) {
    if (lowerPathOnly.includes(substring)) {
      const r = runSecondaryCheck(lowerPathOnly);
      multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', r);
      return r;
    }
  }

  const segments = lowerPathOnly.startsWith('/') ? lowerPathOnly.substring(1).split('/') : lowerPathOnly.split('/');
  for (const segment of segments) {
    if (CONFIG.PATH_ALLOW_SEGMENTS.has(segment)) {
      const r = runSecondaryCheck(lowerPathOnly);
      multiLevelCache.setUrlDecision('allow:path', lowerPathOnly, '', r);
      return r;
    }
  }

  for (const suffix of CONFIG.PATH_ALLOW_SUFFIXES) {
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
  if (!isExplicitlyAllowed && getAcPathBlock().matches(lowerPathOnly, CONFIG.AC_SCAN_MAX_LENGTH)) r = true;
  multiLevelCache.setUrlDecision('path:ac', lowerPathOnly, '', r);
  return r;
}

function isPathBlockedByRegex(lowerPathOnly, isExplicitlyAllowed) {
  const c = multiLevelCache.getUrlDecision('path:rx', lowerPathOnly, '');
  if (c !== null) return c;

  for (const prefix of CONFIG.PATH_ALLOW_PREFIXES) {
    if (lowerPathOnly.startsWith(prefix)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false); return false; }
  }
  if (isExplicitlyAllowed) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false); return false; }
   
  if (lowerPathOnly.endsWith('/collect') || lowerPathOnly.endsWith('/service/collect')) {
      multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true);
      return true;
  }
   
  if (lowerPathOnly.includes('sentry') || lowerPathOnly.includes('event') || lowerPathOnly.includes('.js')) {
      for (const regex of getCompiledPathBlockRegex()) {
        if (regex.test(lowerPathOnly)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }
      }
      for (const regex of getCompiledHeuristicPathBlockRegex()) {
        const segments = lowerPathOnly.split('/');
        const filename = segments[segments.length - 1];
        if (regex.test(filename)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }
      }
  }
   
  multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false);
  return false;
}

// ================================================================================================
/** 🧱 阻擋回應 */
// ================================================================================================
function getBlockResponse(pathnameLower) {
  if (pathnameLower.includes('/sa.gif')) {
    return TINY_GIF_RESPONSE;
  }

  for (const keyword of CONFIG.DROP_KEYWORDS) {
    if (pathnameLower.includes(keyword)) return DROP_RESPONSE;
  }
  const dotIndex = pathnameLower.lastIndexOf('.');
  if (dotIndex > pathnameLower.lastIndexOf('/')) {
    const ext = pathnameLower.substring(dotIndex);
    if (IMAGE_EXTENSIONS.has(ext)) return TINY_GIF_RESPONSE;
    if (SCRIPT_EXTENSIONS.has(ext)) return NO_CONTENT_RESPONSE;
  }
  return REJECT_RESPONSE;
}

// [V42.01] Helper to get response object from action string
function getActionResponse(action) {
  switch (action) {
    case 'TINY_GIF': return TINY_GIF_RESPONSE;
    case 'NO_CONTENT': return NO_CONTENT_RESPONSE;
    case 'REJECT': return REJECT_RESPONSE;
    case 'DROP': return DROP_RESPONSE;
    case 'BLOCK': 
    default: 
      // Fallback to auto-detection, but we need pathname for that.
      // Since complex rules match full paths, we can usually default to REJECT or reuse getBlockResponse logic
      // if we had the pathname. Here we default to REJECT for strictness.
      return REJECT_RESPONSE;
  }
}

// ================================================================================================
/** 🧼 參數清理 */
// ================================================================================================
const REGEX_FIRST_CHAR_BUCKET = new Set(['u','i','a','t','l','_']);
function cleanTrackingParams(rawUrl) {
    const urlObj = new URL(rawUrl);
    let modified = false;
    const toDelete = [];

    for (const key of urlObj.searchParams.keys()) {
        if (key.length < 2) continue;
        const lowerKey = key.toLowerCase();
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;

        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey) ||
            CONFIG.COSMETIC_PARAMS.has(lowerKey) ||
            getPrefixTrieForParam().startsWith(lowerKey)) {
            toDelete.push(key);
            modified = true; continue;
        }

        const first = lowerKey[0];
        if (REGEX_FIRST_CHAR_BUCKET.has(first)) {
            let matched = false;
            for (const rx of getCompiledGlobalTrackingParamsRegex()) {
                if (rx.test(lowerKey)) { toDelete.push(key); modified = true; matched = true; break; }
            }
            if (matched) continue;
            for (const rx of getCompiledTrackingPrefixesRegex()) {
                if (rx.test(lowerKey)) { toDelete.push(key); modified = true; break; }
            }
        }
    }

    if (modified) {
        toDelete.forEach(k => urlObj.searchParams.delete(k));
        return urlObj.toString();
    }

    return null;
}

// ================================================================================================
/** 🔏 記錄清洗 */
// ================================================================================================
const SENSITIVE_PARAMS_CONFIG = {
    keywords: ['token','password','key','secret','auth','otp','access_token','refresh_token'],
    firstCharBucket: new Set(['t', 'p', 'k', 's', 'a', 'o', 'r'])
};

function getSanitizedUrlForLogging(urlStr) {
  try {
    const tempUrl = new URL(urlStr);
    if (!tempUrl.search) return urlStr;

    for (const param of tempUrl.searchParams.keys()) {
      const lowerParam = param.toLowerCase();
      if (!SENSITIVE_PARAMS_CONFIG.firstCharBucket.has(lowerParam[0])) continue;
      for (const sensitive of SENSITIVE_PARAMS_CONFIG.keywords) {
        if (lowerParam.includes(sensitive)) { tempUrl.searchParams.set(param, 'REDACTED'); break; }
      }
    }
    return tempUrl.toString();
  } catch (e) {
    return (typeof urlStr === 'string' ? urlStr.split('?')[0] : '<INVALID_URL_OBJECT>') + '?<URL_PARSE_ERROR>';
  }
}

// ================================================================================================
/** 🛠️ 主流程 */
// ================================================================================================
function processRequest(request) {
  const t0 = CONFIG.DEBUG_MODE ? __now__() : 0;
  try {
    optimizedStats.increment('totalRequests');
    const rawUrl = request.url;

    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.length < 10) {
      if (t0) optimizedStats.addTiming('total', __now__() - t0);
      return null;
    }
     
    const tParse0 = t0 ? __now__() : 0;
    const protocolEnd = rawUrl.indexOf('//') + 2;
    let hostname, fullPath, hostEndIndex;
    if (rawUrl.charCodeAt(protocolEnd) === 91) { // IPv6
        hostEndIndex = rawUrl.indexOf(']', protocolEnd) + 1;
        hostname = rawUrl.substring(protocolEnd, hostEndIndex).toLowerCase();
    } else {
        hostEndIndex = rawUrl.indexOf('/', protocolEnd);
        if (hostEndIndex === -1) hostEndIndex = rawUrl.length;
        let portIndex = rawUrl.indexOf(':', protocolEnd);
        if (portIndex !== -1 && portIndex < hostEndIndex) {
            hostname = rawUrl.substring(protocolEnd, portIndex).toLowerCase();
        } else {
            hostname = rawUrl.substring(protocolEnd, hostEndIndex).toLowerCase();
        }
    }
    const pathStartIndex = rawUrl.indexOf('/', protocolEnd);
    fullPath = pathStartIndex === -1 ? '/' : rawUrl.substring(pathStartIndex);

    if(t0) optimizedStats.addTiming('parse', __now__() - tParse0);

    const exemptions = CONFIG.PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS.get(hostname);
    if (exemptions) {
        for (const prefix of exemptions) {
            if (fullPath.startsWith(prefix)) {
                if (t0) { optimizedStats.addTiming('whitelist', __now__() - t0); optimizedStats.addTiming('total', __now__() - t0); }
                return null;
            }
        }
    }

    const tWl0 = t0 ? __now__() : 0;
    if (getWhitelistMatchDetails(hostname, CONFIG.HARD_WHITELIST_EXACT, CONFIG.HARD_WHITELIST_WILDCARDS).matched) {
      optimizedStats.increment('hardWhitelistHits');
      if (t0) { optimizedStats.addTiming('whitelist', __now__() - tWl0); optimizedStats.addTiming('total', __now__() - t0); }
      return null;
    }

    const tL10 = t0 ? __now__() : 0;
    const l1Decision = multiLevelCache.getDomainDecision(hostname);
    const qIndex = fullPath.indexOf('?');
    const pathname = qIndex === -1 ? fullPath : fullPath.substring(0, qIndex);
    const pathnameLower = pathname.toLowerCase();
     
    if (isDomainBlocked(hostname)) {
        multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK, 30 * 60 * 1000);
        optimizedStats.increment('domainBlocked'); optimizedStats.increment('blockedRequests');
        if (t0) { optimizedStats.addTiming('domainStage', __now__() - tL10); optimizedStats.addTiming('total', __now__() - t0); }
        return getBlockResponse(pathnameLower);
    }
     
    if (l1Decision === DECISION.BLOCK) {
      optimizedStats.increment('domainBlocked'); optimizedStats.increment('blockedRequests');
      if (t0) { optimizedStats.addTiming('l1', __now__() - tL10); optimizedStats.addTiming('total', __now__() - t0); }
      return getBlockResponse(pathnameLower);
    }
    if (t0) optimizedStats.addTiming('l1', __now__() - tL10);
     
    // [V42.01] Complex Rule Engine (High Priority, Action Aware)
    const complexMatch = complexRuleEngine.match(hostname, fullPath);
    if (complexMatch && complexMatch.matched) {
        optimizedStats.increment('complexRuleHits');
        optimizedStats.increment('blockedRequests');
        if (complexMatch.action === 'BLOCK') {
             return getBlockResponse(pathnameLower);
        } else {
             return getActionResponse(complexMatch.action);
        }
    }

    const lowerFullPath = fullPath.toLowerCase();
    const tCrit0 = t0 ? __now__() : 0;
    if (isCriticalTrackingScript(hostname, lowerFullPath)) {
      optimizedStats.increment('criticalScriptBlocked'); optimizedStats.increment('blockedRequests');
      if(t0) { optimizedStats.addTiming('critical', __now__() - tCrit0); optimizedStats.addTiming('total', __now__() - t0); }
      return getBlockResponse(pathnameLower);
    }
    if(t0) optimizedStats.addTiming('critical', __now__() - tCrit0);

    let isSoftWhitelisted = false;
    if (getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_EXACT, CONFIG.SOFT_WHITELIST_WILDCARDS).matched) {
        optimizedStats.increment('softWhitelistHits');
        isSoftWhitelisted = true;
    }
    if (t0) optimizedStats.addTiming('whitelist', __now__() - tWl0);

    if (!isSoftWhitelisted) {
        if (l1Decision !== DECISION.ALLOW && l1Decision !== DECISION.NEGATIVE_CACHE) {
            const tDom0 = t0 ? __now__() : 0;
            multiLevelCache.setDomainDecision(hostname, DECISION.ALLOW, 10 * 60 * 1000);
            if(t0) optimizedStats.addTiming('domainStage', __now__() - tDom0);
        }
        
        const tAllow0 = t0 ? __now__() : 0;
        const isAllowed = isPathExplicitlyAllowed(pathnameLower);
        if(t0) optimizedStats.addTiming('allowlistEval', __now__() - tAllow0);

        const tPB0 = t0 ? __now__() : 0;
        if (isPathBlockedByKeywords(pathnameLower, isAllowed)) {
          optimizedStats.increment('pathBlocked'); optimizedStats.increment('blockedRequests');
          if(t0) { optimizedStats.addTiming('pathTrie', __now__() - tPB0); optimizedStats.addTiming('total', __now__() - t0); }
          return getBlockResponse(pathnameLower);
        }
        if(t0) optimizedStats.addTiming('pathTrie', __now__() - tPB0);

        const tPR0 = t0 ? __now__() : 0;
        if (isPathBlockedByRegex(pathnameLower, isAllowed)) {
          optimizedStats.increment('regexPathBlocked'); optimizedStats.increment('blockedRequests');
          if(t0) { optimizedStats.addTiming('pathRegex', __now__() - tPR0); optimizedStats.addTiming('total', __now__() - t0); }
          return getBlockResponse(pathnameLower);
        }
        if(t0) optimizedStats.addTiming('pathRegex', __now__() - tPR0);
    }
     
    if (qIndex !== -1) {
        let isExemptFromParamCleaning = false;
        const exemptions = CONFIG.PARAM_CLEANING_EXEMPTIONS.get(hostname);
        if (exemptions) {
            for (const prefix of exemptions) {
                if (fullPath.startsWith(prefix)) {
                    isExemptFromParamCleaning = true;
                    break;
                }
            }
        }

        if (!isExemptFromParamCleaning) {
            const tP0 = t0 ? __now__() : 0;
            const cleanedUrl = cleanTrackingParams(rawUrl);
            if (cleanedUrl) {
                optimizedStats.increment('paramsCleaned');
                request.url = cleanedUrl;
                if (t0) { optimizedStats.addTiming('params', __now__() - tP0); optimizedStats.addTiming('total', __now__() - t0); }
                return { request };
            }
            if(t0) optimizedStats.addTiming('params', __now__() - tP0);
        }
    }

    if (l1Decision === null) {
        multiLevelCache.setDomainDecision(hostname, DECISION.NEGATIVE_CACHE, 60 * 1000);
    }

    if(t0) optimizedStats.addTiming('total', __now__() - t0);
    return null;
  } catch (error) {
    logError(error, { stage: 'processRequest', url: getSanitizedUrlForLogging(request?.url) });
    if(t0) optimizedStats.addTiming('total', __now__() - t0);
    return null;
  }
}

// ================================================================================================
/** 🏁 啟動 */
// ================================================================================================
let isInitialized = false;
function initialize() {
    if (isInitialized) return;
    multiLevelCache.seed();
    
    // [V42.01] Compile advanced complex rules
    const tCompile = CONFIG.DEBUG_MODE ? __now__() : 0;
    complexRuleEngine.compile(CONFIG.ADVANCED_COMPLEX_RULES);
    if (CONFIG.DEBUG_MODE) optimizedStats.addTiming('complex', __now__() - tCompile);

    isInitialized = true;
}

(async function () {
  try {
    let startTime;
    if (CONFIG.DEBUG_MODE && typeof $request !== 'undefined') {
      startTime = __now__();
    }
     
    initialize();

    if (typeof $request === 'undefined') {
      if (typeof $done !== 'undefined') {
        $done({ version: SCRIPT_VERSION, status: 'ready', message: 'URL Filter v42.01 - Action-Based Complex Rules', stats: optimizedStats.getStats() });
      }
      return;
    }

    const result = processRequest($request);

    if (CONFIG.DEBUG_MODE) {
      const endTime = __now__();
      const executionTime = (endTime - startTime).toFixed(3);
      console.log(`[URL-Filter-v${SCRIPT_VERSION}][Debug] Time: ${executionTime}ms | URL: ${getSanitizedUrlForLogging($request.url)} | ${optimizedStats.getSummary()}`);
    }
     
    if (typeof $done !== 'undefined') {
        if (result && result.request) {
            $done(result);
        } else if (result && result.response) {
            $done(result);
        } else {
            $done({});
        }
    }
  } catch (error) {
    logError(error, { stage: 'globalExecution' });
    if (typeof $done !== 'undefined') $done({});
  }
})();
