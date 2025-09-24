/**
 * @file        URL-Ultimate-Filter-Surge-V40.77.js
 * @version     40.77+ (TTL Cache, Indexing & Layered-AC)
 * @description 基於 V40.76 全面優化：修正軟白名單傳參、L2 決策 TTL、Regex 前置放寬、
 *              PATH allow 前綴 Trie／後綴分桶、AC 高信度分層、採樣統計與可選 Label 級 Trie。
 * @compat      Surge Scripting (http-request/http-response)
 * @lastUpdated 2025-09-24
 *
 * 使用說明：
 * 1) 直接貼上本檔至 Surge 腳本位置。
 * 2) 從附件 V40.76 複製「const CONFIG = { ... }」完整物件（含所有黑白名單、路徑規則、參數清單）替換本檔下方的「// === BEGIN: PASTE FULL CONFIG HERE ===」區塊。
 * 3) 儲存後即可使用 V40.77 的效能優化與正確性修正（原清單完整保留）。 
 */

/* =========================
 * 版本、除錯與採樣
 * ========================= */
const SCRIPT_VERSION = '40.77';
let CACHE_EPOCH = 0; // 規則熱更新時可 bump 使快取自然失效
function bumpCacheEpoch() { CACHE_EPOCH++; } // 外部可調用（如規則變更後）

// 非除錯模式僅以 SAMPLE_RATE 記錄計時
const DEFAULT_DEBUG_MODE = false;
const DEFAULT_TIMING_SAMPLE_RATE = 0.1; // 10%

const CONFIG = {
  /**
   * ✅ [V40.40 新增] 全域「除錯模式」
   * 說明：設為 true 時，將啟用一系列的進階日誌與細粒度計時功能。在生產環境中建議設為 false 以獲得最佳效能。
   */
  DEBUG_MODE: false,

  /**
   * ✅ [V40.75 修訂] Aho-Corasick 演算法掃描路徑的最大長度
   * 說明：限制 AC 自動機掃描 URL 路徑的字元數。下調至 512 以進一步最佳化常見請求的處理速度。
   * 可選值建議：512 (高效能), 768 (平衡), 1024 (最大攔截)。
   */
  AC_SCAN_MAX_LENGTH: 512,
  
  /**
   * ✅ [V40.76 新增] L1 快取預熱種子
   * 說明：在腳本首次初始化時，預先將全球最高頻的域名決策寫入快取，以消除這些域名的首次請求判定延遲。
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
    '/midroll/', '/popads/', '/popup/', '/postroll/', '/preroll/', '/promoted/', '/sponsor/', '/vclick/',
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
   * 🚫 [V40.76 修訂] 基於正規表示式的路徑黑名單
   * 說明：移除了可被原生字串方法取代的簡單規則，以提升效能。
   */
  PATH_BLOCK_REGEX: [
    /^\/(?!_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,
    /\/v\d+\/event/i,
    // '/collect$/i' -> 已改為原生 .endsWith()
    // '/service\/collect$/i' -> 已改為原生 .endsWith()
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

  // L1 預熱（示範）
  CACHE_SEEDS: new Map([
    ['google.com', { decision: 'ALLOW', ttl: 3600 * 1000 }],
    ['apple.com',  { decision: 'ALLOW', ttl: 3600 * 1000 }],
    ['gstatic.com',{ decision: 'ALLOW', ttl: 3600 * 1000 }],
    ['doubleclick.net', { decision: 'BLOCK', ttl: 3600 * 1000 }],
    ['google-analytics.com', { decision: 'BLOCK', ttl: 3600 * 1000 }],
  ]),

  // 白名單（示範）
  HARD_WHITELIST_EXACT: new Set(['accounts.google.com','login.microsoftonline.com']),
  HARD_WHITELIST_WILDCARDS: new Set(['googlevideo.com','googleapis.com']),
  SOFT_WHITELIST_EXACT: new Set(['api.github.com','api.openai.com']),
  SOFT_WHITELIST_WILDCARDS: new Set(['github.io','gstatic.com']),

  // 黑名單（示範）
  BLOCK_DOMAINS: new Set(['doubleclick.net','google-analytics.com']),
  BLOCK_DOMAINS_REGEX: [ /^ads?\\d*\\.(ettoday\\.net|ltn\\.com\\.tw)$/ ],

  // 重要追蹤腳本與路徑（示範）
  CRITICAL_TRACKING_SCRIPTS: new Set(['analytics.js','gtag.js','fbevents.js']),
  CRITICAL_TRACKING_MAP: new Map([
    ['stats.g.doubleclick.net', new Set(['/g/collect'])],
    ['www.google-analytics.com', new Set(['/collect','/g/collect'])],
  ]),
  CRITICAL_TRACKING_GENERIC_PATHS: new Set(['/google-analytics/','/doubleclick/','/collect?','/pixel/']),

  // 路徑允許（示範）
  PATH_ALLOW_PREFIXES: new Set(['/.well-known/','/static/','/assets/']),
  PATH_ALLOW_SUFFIXES: new Set(['.css','.js','.png','.jpg','.svg','.webp']),
  PATH_ALLOW_SUBSTRINGS: new Set(['_next/static/','_nuxt/','static/js/','static/css/']),
  PATH_ALLOW_SEGMENTS: new Set(['api','assets','static']),

  // 關鍵字與 Regex（示範）
  PATH_BLOCK_KEYWORDS: new Set(['collect','pixel','analytics','track','g/collect']),
  PATH_BLOCK_REGEX: [
    /tracking-api\\.js/i,
    /analytics(\\.min)?\\.js/i,
    /\\/ads?\\/(click|collect|measure)\\b/i,
  ],
  HEURISTIC_PATH_BLOCK_REGEX: [ /\\b(beacon|collect|measure)\\b/i ],

  // 參數清理（示範）
  GLOBAL_TRACKING_PARAMS: new Set(['fbclid','gclid','ttclid','msclkid','gbraid','wbraid','yclid']),
  GLOBAL_TRACKING_PARAMS_REGEX: [/^utm_\\w+/,/^ig_[\\w_]+/,/^tt_[\\w_]+/,/^li_[\\w_]+/],
  TRACKING_PREFIXES: new Set(['utm_','ref','spm','gcl_','li_','tt_']),
  TRACKING_PREFIXES_REGEX: [/^_ga_/],
  COSMETIC_PARAMS: new Set(['from','source','ref','share_id']),

  // 被封鎖網域的路徑豁免（示範）
  PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS: new Map([
    ['graph.facebook.com', new Set(['/v20.0/'])],
  ]),
};
/* === END: PASTE FULL CONFIG HERE === */

/* =========================
 * 統計（採樣化）
 * ========================= */
class OptimizedPerformanceStats {
  constructor() {
    this.counters = Object.create(null);
    this.timings = Object.create(null);
  }
  increment(key, n = 1) { this.counters[key] = (this.counters[key] || 0) + n; }
  addTiming(bucket, ms) {
    const sample = (CONFIG.DEBUG_MODE ?? DEFAULT_DEBUG_MODE) || Math.random() <= (CONFIG.TIMING_SAMPLE_RATE ?? DEFAULT_TIMING_SAMPLE_RATE);
    if (!sample) return;
    this.timings[bucket] = (this.timings[bucket] || 0) + ms;
  }
}
const optimizedStats = new OptimizedPerformanceStats();

/* =========================
 * LRU（含 TTL、抽樣過期清理）
 * ========================= */
class LRUNode { constructor(k,v,exp=0){ this.k=k; this.v=v; this.exp=exp; this.n=null; this.p=null; } }
class HighPerformanceLRUCache {
  constructor(maxSize=2048){ this.maxSize=maxSize; this.cache=new Map(); this.head=new LRUNode(null,null); this.tail=new LRUNode(null,null); this.head.n=this.tail; this.tail.p=this.head; this._sets=0; }
  _add(node){ node.n=this.head.n; node.p=this.head; this.head.n.p=node; this.head.n=node; }
  _remove(node){ node.p.n=node.n; node.n.p=node.p; }
  _moveToFront(node){ this._remove(node); this._add(node); }
  pruneExpired(limit=3){ let node=this.tail.p, now=Date.now(), n=0; while(node&&node!==this.head&&n<limit){ if(node.exp&&node.exp<now){ const prev=node.p; this._remove(node); this.cache.delete(node.k); node=prev; n++; } else { node=node.p; } } }
  get(key){ const node=this.cache.get(key); if(!node) return null; if(node.exp && node.exp < Date.now()){ this._remove(node); this.cache.delete(key); return null; } this._moveToFront(node); return node.v; }
  set(key,value,ttlMs=0){ const exp=ttlMs>0?(Date.now()+ttlMs):0; let node=this.cache.get(key); if(node){ node.v=value; node.exp=exp; this._moveToFront(node); } else { node=new LRUNode(key,value,exp); this._add(node); this.cache.set(key,node); if(this.cache.size>this.maxSize){ const last=this.tail.p; if(last!==this.head){ this._remove(last); this.cache.delete(last.k); } } } if(((++this._sets)&0xF)===0) this.pruneExpired(3); }
  clear(){ this.cache.clear(); this.head.n=this.tail; this.tail.p=this.head; }
}

/* =========================
 * 多層快取（L1/L2）
 * ========================= */
function stableKey(ns,a='',b=''){ return `${SCRIPT_VERSION}:${CACHE_EPOCH}:${ns}:${a}:${b}`; }
class MultiLevelCacheManager {
  constructor(){ this.l1DomainDecisionCache=new HighPerformanceLRUCache(4096); this.l2UrlDecisionCache=new HighPerformanceLRUCache(8192); }
  seedDomainDecisions(seeds=CONFIG.CACHE_SEEDS){ if(!seeds) return; for(const [host,info] of seeds.entries()){ const k=stableKey('domain',host,''); const allow = (info.decision === 'ALLOW'); this.l1DomainDecisionCache.set(k, allow, info.ttl||0); } }
  seedUrlDecisions(seeds=CONFIG.CACHE_SEEDS_URL){ if(!seeds) return; for(const {ns,a,b,decision,ttlMs} of seeds){ this.setUrlDecision(ns,a,b,!!decision, ttlMs||0); } }
  getDomainDecision(host){ return this.l1DomainDecisionCache.get(stableKey('domain',host,'')); }
  setDomainDecision(host, decision, ttlMs=0){ this.l1DomainDecisionCache.set(stableKey('domain',host,''), !!decision, ttlMs); }
  getUrlDecision(ns,a,b){ return this.l2UrlDecisionCache.get(stableKey(ns,a,b)); }
  setUrlDecision(ns,a,b,decision,ttlMs=0){ this.l2UrlDecisionCache.set(stableKey(ns,a,b), !!decision, ttlMs); }
  clearAll(){ this.l1DomainDecisionCache.clear(); this.l2UrlDecisionCache.clear(); }
}
const multiLevelCache = new MultiLevelCacheManager();
multiLevelCache.seedDomainDecisions();
multiLevelCache.seedUrlDecisions(CONFIG.CACHE_SEEDS_URL || []);

/* =========================
 * 小工具與惰性構建
 * ========================= */
function lazy(factory){ let inited=false; let cache; return ()=>{ if(!inited){ cache=factory(); inited=true; } return cache; }; }

/* =========================
 * 白名單（含短 TTL 快取）
 * ========================= */
const WL_CACHE = new HighPerformanceLRUCache(2048);
function getWhitelistMatchDetails(hostname, exactSet, wildcardSet){
  const k=`wl:${hostname}`; const c=WL_CACHE.get(k); if(c) return c;
  if (exactSet && exactSet.has(hostname)){ const r={matched:true, rule:hostname, type:'Exact'}; WL_CACHE.set(k,r,5*60*1000); return r; }
  if (wildcardSet){ let domain=hostname; while(true){ if (wildcardSet.has(domain)){ const r={matched:true, rule:domain, type:'Wildcard'}; WL_CACHE.set(k,r,5*60*1000); return r; } const dot=domain.indexOf('.'); if(dot===-1) break; domain=domain.substring(dot+1); } }
  const r={matched:false}; WL_CACHE.set(k,r,5*60*1000); return r;
}

/* =========================
 * 網域封鎖 Trie（字元級／標籤級）
 * ========================= */
class CharReverseTrie{
  constructor(){ this.root=Object.create(null); this.end=Symbol('end'); }
  insert(host){ const s=host.split('').reverse().join(''); let n=this.root; for(let i=0;i<s.length;i++){ const c=s[i]; n=(n[c]||(n[c]=Object.create(null))); } n[this.end]=true; }
  matches(host){ const s=host.split('').reverse().join(''); let n=this.root; for(let i=0;i<s.length;i++){ if(n[this.end]) return true; const c=s[i]; if(!n[c]) return false; n=n[c]; } return !!n[this.end]; }
}
class LabelTrie{
  constructor(){ this.root=Object.create(null); this.end=Symbol('end'); }
  insert(host){ const labs=host.split('.').reverse(); let n=this.root; for(const lab of labs){ n=(n[lab]||(n[lab]=Object.create(null))); } n[this.end]=true; }
  matches(host){ const labs=host.split('.').reverse(); let n=this.root; for(const lab of labs){ if(n[this.end]) return true; if(!n[lab]) return false; n=n[lab]; } return !!n[this.end]; }
}
const getBlockedDomainTrie = lazy(()=>{
  const trie = (CONFIG.EXPERIMENTAL_LABEL_TRIE ? new LabelTrie() : new CharReverseTrie());
  (CONFIG.BLOCK_DOMAINS || new Set()).forEach(d=>trie.insert(d));
  return trie;
});

/* =========================
 * PATH Allow：Prefix Trie 與 Suffix 分桶
 * ========================= */
class OptimizedTrie{
  constructor(){ this.root=Object.create(null); this.end=Symbol('end'); }
  insert(prefix){ let n=this.root; for(let i=0;i<prefix.length;i++){ const c=prefix[i]; n=(n[c]||(n[c]=Object.create(null))); } n[this.end]=true; }
  startsWith(str){ let n=this.root; for(let i=0;i<str.length;i++){ if(n[this.end]) return true; const c=str[i]; if(!n[c]) return false; n=n[c]; } return !!n[this.end]; }
}
const getPathAllowPrefixTrie = lazy(()=>{
  const trie=new OptimizedTrie();
  (CONFIG.PATH_ALLOW_PREFIXES||new Set()).forEach(p=>trie.insert(String(p).toLowerCase()));
  return trie;
});
const getPathAllowSuffixBuckets = lazy(()=>{
  const buckets=new Map();
  (CONFIG.PATH_ALLOW_SUFFIXES||new Set()).forEach(s=>{
    const val=String(s).toLowerCase(); const L=val.length;
    if(!buckets.has(L)) buckets.set(L,[]);
    buckets.get(L).push(val);
  });
  return buckets;
});

/* =========================
 * Aho–Corasick（高信度與通用）
 * ========================= */
class ACNode{ constructor(){ this.next=Object.create(null); this.fail=null; this.out=[]; } }
class AhoCorasick{
  constructor(patterns){ this.root=new ACNode(); this._build(patterns||[]); }
  _build(patterns){
    for(const p0 of patterns){ let n=this.root; const p=String(p0); for(let i=0;i<p.length;i++){ const c=p[i]; if(!n.next[c]) n.next[c]=new ACNode(); n=n.next[c]; } n.out.push(p); }
    const q=[]; for(const c in this.root.next){ const node=this.root.next[c]; node.fail=this.root; q.push(node); }
    while(q.length){ const r=q.shift(); for(const c in r.next){ const s=r.next[c]; q.push(s); let f=r.fail; while(f && !f.next[c]) f=f.fail; s.fail=(f&&f.next[c])?f.next[c]:this.root; s.out=s.out.concat(s.fail.out); } }
  }
  matches(text,maxLen=Infinity){ let n=this.root; const m=Math.min(text.length,maxLen); for(let i=0;i<m;i++){ const c=text[i]; while(n && !n.next[c]) n=n.fail; n = n ? n.next[c] : this.root; if(!n) n=this.root; if(n.out && n.out.length) return true; } return false; }
}
const getAcHighConfidence = lazy(()=> new AhoCorasick(Array.from(CONFIG.HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH || new Set())));
const getAcPathBlock     = lazy(()=> new AhoCorasick(Array.from(CONFIG.PATH_BLOCK_KEYWORDS || new Set())));

/* =========================
 * Regex 編譯與首字布林表
 * ========================= */
const FIRST_CHAR_TABLE = (()=>{ const t=Object.create(null); ['t','a','c','p','b','m','u','i','l','_'].forEach(c=>t[c]=true); return t; })();
const getCompiledPathBlockRegex = lazy(()=> (CONFIG.PATH_BLOCK_REGEX||[]).map(r=>r));
const getCompiledHeuristicPathBlockRegex = lazy(()=> (CONFIG.HEURISTIC_PATH_BLOCK_REGEX||[]).map(r=>r));

/* =========================
 * Critical Tracking Script（主機映射＋最短前綴早停）
 * ========================= */
function isCriticalTrackingScript(host, pathOnlyLower){
  const map = CONFIG.CRITICAL_TRACKING_MAP || new Map();
  const set = map.get(host);
  if (!set) return false;
  if (set.size===0) return true; // host-only
  const ordered = Array.from(set).sort((a,b)=>a.length-b.length);
  for (const pref of ordered){ if (pathOnlyLower.startsWith(pref)) return true; }
  return false;
}

/* =========================
 * 參數清洗（快速路徑）
 * ========================= */
function cleanTrackingParams(rawUrl){
  if (typeof rawUrl !== 'string') return null;
  const qpos = rawUrl.indexOf('?'); if (qpos === -1) return null;
  const lower = rawUrl.toLowerCase();
  const hints = ['utm_','fbclid','gclid','ttclid','msclkid','yclid','wbraid','gbraid'];
  let likely=false; for(const h of hints){ if(lower.includes(h)){ likely=true; break; } }
  if(!likely) return null;

  let url; try{ url=new URL(rawUrl); }catch{ return null; }
  const params = url.searchParams; let changed=false;

  // exact
  for (const key of Array.from(params.keys())) {
    const lk = key.toLowerCase();
    if ((CONFIG.PARAMS_TO_KEEP_WHITELIST||new Set()).has(lk)) continue;
    if ((CONFIG.GLOBAL_TRACKING_PARAMS||new Set()).has(lk) || (CONFIG.COSMETIC_PARAMS||new Set()).has(lk)) { params.delete(key); changed=true; continue; }
    // prefix
    let removed=false;
    for (const p of (CONFIG.TRACKING_PREFIXES||new Set())) { if (lk.startsWith(p)) { params.delete(key); changed=true; removed=true; break; } }
    if (removed) continue;
    // regex buckets
    const c0 = lk[0]; if (FIRST_CHAR_TABLE[c0]) {
      for (const rx of (CONFIG.GLOBAL_TRACKING_PARAMS_REGEX||[])) { if (rx.test(lk)) { params.delete(key); changed=true; removed=true; break; } }
      if (removed) continue;
      for (const rx of (CONFIG.TRACKING_PREFIXES_REGEX||[])) { if (rx.test(lk)) { params.delete(key); changed=true; removed=true; break; } }
    }
  }
  if (!changed) return null;
  url.search = params.toString() ? `?${params.toString()}` : '';
  return url.toString();
}

/* =========================
 * Allow Path（Prefix Trie + Suffix 分桶）
 * ========================= */
function isPathExplicitlyAllowed(lowerPathOnly){
  if (getPathAllowPrefixTrie().startsWith(lowerPathOnly)) return true;
  const buckets = getPathAllowSuffixBuckets();
  for (const [L,arr] of buckets.entries()){
    if (lowerPathOnly.length >= L){
      const tail = lowerPathOnly.slice(-L);
      for (const s of arr){ if (tail === s) return true; }
    }
  }
  // 子字串白名單與區段白名單（保持與 V40.76 一致）
  for (const sub of (CONFIG.PATH_ALLOW_SUBSTRINGS||new Set())){ if (lowerPathOnly.includes(sub)) return true; }
  const segs = lowerPathOnly.startsWith('/') ? lowerPathOnly.substring(1).split('/') : lowerPathOnly.split('/');
  for (const seg of segs){ if ((CONFIG.PATH_ALLOW_SEGMENTS||new Set()).has(seg)) return true; }
  return false;
}

/* =========================
 * Path by AC（分層）
 * ========================= */
function isPathBlockedByKeywords(lowerPathOnly, isExplicitlyAllowed){
  const cached = multiLevelCache.getUrlDecision('pathac', lowerPathOnly, '');
  if (cached != null) return cached;

  const maxLen = CONFIG.AC_SCAN_MAX_LENGTH || 512;
  if (!isExplicitlyAllowed && getAcHighConfidence().matches(lowerPathOnly, maxLen)){
    multiLevelCache.setUrlDecision('pathac', lowerPathOnly, '', true, 20*60*1000);
    return true;
  }
  let r=false;
  if (!isExplicitlyAllowed && getAcPathBlock().matches(lowerPathOnly, maxLen)) r=true;
  multiLevelCache.setUrlDecision('pathac', lowerPathOnly, '', r, r ? 20*60*1000 : 10*60*1000);
  return r;
}

/* =========================
 * Path by Regex（移除過度前置 gating，改以早停）
 * ========================= */
function isPathBlockedByRegex(lowerPathOnly, isExplicitlyAllowed){
  const cached = multiLevelCache.getUrlDecision('pathrx', lowerPathOnly, '');
  if (cached != null) return cached;

  if (isExplicitlyAllowed){
    multiLevelCache.setUrlDecision('pathrx', lowerPathOnly, '', false, 20*60*1000);
    return false;
  }
  for (const re of getCompiledPathBlockRegex()){
    if (re.test(lowerPathOnly)){ multiLevelCache.setUrlDecision('pathrx', lowerPathOnly, '', true, 20*60*1000); return true; }
  }
  for (const re of getCompiledHeuristicPathBlockRegex()){
    if (re.test(lowerPathOnly)){ multiLevelCache.setUrlDecision('pathrx', lowerPathOnly, '', true, 10*60*1000); return true; }
  }
  multiLevelCache.setUrlDecision('pathrx', lowerPathOnly, '', false, 10*60*1000);
  return false;
}

/* =========================
 * 網域封鎖與豁免
 * ========================= */
function isDomainBlocked(hostname, lowerPathOnly){
  const l1 = multiLevelCache.getDomainDecision(hostname);
  if (l1 != null) return !l1; // true => blocked

  // 硬白名單（Exact + Wildcards）
  const hard = getWhitelistMatchDetails(hostname, CONFIG.HARD_WHITELIST_EXACT||new Set(), CONFIG.HARD_WHITELIST_WILDCARDS||new Set());
  if (hard.matched){ multiLevelCache.setDomainDecision(hostname, true, 60*60*1000); return false; }

  const blocked = getBlockedDomainTrie().matches(hostname) || (CONFIG.BLOCK_DOMAINS_REGEX||[]).some(rx=>rx.test(hostname));
  if (!blocked){ multiLevelCache.setDomainDecision(hostname, true, 30*60*1000); return false; }

  // 路徑豁免
  const ex = (CONFIG.PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS||new Map()).get(hostname);
  if (ex && ex.size>0){ for (const p of ex){ if (lowerPathOnly.startsWith(String(p).toLowerCase())){ multiLevelCache.setDomainDecision(hostname, true, 10*60*1000); return false; } } }

  multiLevelCache.setDomainDecision(hostname, false, 60*60*1000);
  return true;
}

/* =========================
 * 回應模板
 * ========================= */
const RESPONSES = {
  TINY_GIF: { status:200, headers:{'Content-Type':'image/gif','Cache-Control':'no-store'}, body: atob('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==') },
  NO_CONTENT: { status:204, headers:{'Cache-Control':'no-store'}, body:'' },
  REJECT: { status:403, headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}, body:'Blocked by URL-Ultimate-Filter' },
};

/* =========================
 * 主決策流程（http-request）
 * ========================= */
function decideForRequest(rawUrl, method='GET', headers={}){
  const t0 = Date.now();
  try{
    const url = new URL(rawUrl);
    const hostname = url.hostname;
    const pathOnly = url.pathname + (url.search || '');
    const lowerPathOnly = pathOnly.toLowerCase();

    // 軟白名單（修正傳參：EXACT + WILDCARDS）
    const soft = getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_EXACT||new Set(), CONFIG.SOFT_WHITELIST_WILDCARDS||new Set());
    if (soft.matched){ optimizedStats.increment('softWhitelistHits'); return { action:'allow' }; }

    // Domain Block 與豁免
    if (isDomainBlocked(hostname, lowerPathOnly)){
      optimizedStats.increment('domainBlocked');
      if (/\.(gif|png|jpe?g|webp|bmp|ico)$/i.test(lowerPathOnly)) return { action:'respond', response: RESPONSES.TINY_GIF };
      return { action:'respond', response: RESPONSES.NO_CONTENT };
    }

    // 明確允許剪枝
    const explicitlyAllowed = isPathExplicitlyAllowed(lowerPathOnly);
    if (explicitlyAllowed){ optimizedStats.increment('pathAllow'); multiLevelCache.setUrlDecision('allowpath', lowerPathOnly, '', true, 20*60*1000); return { action:'allow' }; }

    // Critical（主機映射＋最短前綴）
    if (isCriticalTrackingScript(hostname, lowerPathOnly)){
      optimizedStats.increment('criticalBlocked');
      multiLevelCache.setUrlDecision('crit', hostname, lowerPathOnly, true, 30*60*1000);
      return { action:'respond', response: RESPONSES.NO_CONTENT };
    }

    // AC（高信度→通用）
    if (isPathBlockedByKeywords(lowerPathOnly, explicitlyAllowed)){ optimizedStats.increment('pathBlockedAC'); return { action:'respond', response: RESPONSES.NO_CONTENT }; }

    // Regex（放寬 gating，早停）
    if (isPathBlockedByRegex(lowerPathOnly, explicitlyAllowed)){ optimizedStats.increment('pathBlockedRegex'); return { action:'respond', response: RESPONSES.NO_CONTENT }; }

    // 參數清洗
    const cleaned = cleanTrackingParams(rawUrl);
    if (cleaned && cleaned !== rawUrl){ optimizedStats.increment('paramsCleaned'); return { action:'rewrite', url: cleaned }; }

    return { action:'allow' };
  } catch {
    optimizedStats.increment('errors');
    return { action:'allow' };
  } finally {
    optimizedStats.addTiming('decideForRequest', Date.now() - t0);
  }
}

/* =========================
 * Surge Glue
 * ========================= */
try{
  if (typeof $request !== 'undefined' && typeof $done === 'function'){
    const r = decideForRequest($request.url, $request.method||'GET', $request.headers||{});
    switch(r.action){
      case 'respond': $done({ response: r.response }); break;
      case 'rewrite': $done({ url: r.url }); break;
      case 'allow':
      default: $done({}); break;
    }
  }
}catch(_){ /* 非 Surge 環境忽略 */ }

/* =========================
 * Node.js 測試掛鉤（可移除）
 * ========================= */
if (typeof module!=='undefined' && module.exports){
  module.exports = { decideForRequest, bumpCacheEpoch, multiLevelCache, getWhitelistMatchDetails, isPathExplicitlyAllowed, isPathBlockedByKeywords, isPathBlockedByRegex, isDomainBlocked, CONFIG, SCRIPT_VERSION };
}
// #################################################################################################
// #                                                                                               #
// #                      🚀 HYPER-OPTIMIZED CORE ENGINE (V40.77)                                  #
// #                                                                                               #
// #################################################################################################

// ================================================================================================
// 🚀 CORE CONSTANTS & VERSION
// ================================================================================================
const SCRIPT_VERSION = '40.77'; // [V40.76] 版本戳，用於快取失效

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
      'errors','l1CacheHits','l2CacheHits'
    ];
    for (const l of this.labels) this.counters[l] = 0;
    this.timingBuckets = ['parse','whitelist','l1','domainStage','critical','allowlistEval','pathTrie','pathRegex','params','total'];
    for (const b of this.timingBuckets) this.timings[b] = 0;
  }
  increment(type) { if (this.counters[type] !== undefined) this.counters[type]++; }
  addTiming(bucket, ms) { if (this.timings[bucket] !== undefined) this.timings[bucket] += ms; }
  getStats() { return { ...this.counters, timings: { ...this.timings } }; }
  getSummary() {
      const total = this.counters.totalRequests || 1;
      const blockRate = ((this.counters.blockedRequests / total) * 100).toFixed(2);
      const cleanRate = ((this.counters.paramsCleaned / total) * 100).toFixed(2);
      const l1HitRate = ((this.counters.l1CacheHits / total) * 100).toFixed(2);
      const avgTotalTime = (this.timings.total / total).toFixed(3);
      return `[Stats Summary] Total: ${total}, Block: ${this.counters.blockedRequests} (${blockRate}%), Clean: ${this.counters.paramsCleaned} (${cleanRate}%), L1 Hit: ${l1HitRate}%, Avg Time: ${avgTotalTime}ms`;
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
/** 🔡 Tries */
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

// ================================================================================================
/** 🔎 Aho–Corasick */
// ================================================================================================
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

// ================================================================================================
/** ⚡ 多級快取（穩定鍵＋TTL LRU） */
// ================================================================================================
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
    this.l1DomainCache      = new HighPerformanceLRUCache(512);
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
  
  // [V40.76] 原生字串取代 Regex
  if (lowerPathOnly.endsWith('/collect') || lowerPathOnly.endsWith('/service/collect')) {
      multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true);
      return true;
  }
  
  if (lowerPathOnly.includes('sentry') || lowerPathOnly.includes('event') || lowerPathOnly.includes('.js')) {
      for (const regex of getCompiledPathBlockRegex()) {
        if (regex.test(lowerPathOnly)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }
      }
      for (const regex of getCompiledHeuristicPathBlockRegex()) {
        if (regex.test(lowerPathOnly)) { multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', true); return true; }
      }
  }
  
  multiLevelCache.setUrlDecision('path:rx', lowerPathOnly, '', false);
  return false;
}

// ================================================================================================
/** 🧱 阻擋回應 */
// ================================================================================================
function getBlockResponse(pathnameLower) {
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
            toDelete.push(key); modified = true; continue;
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

    if (rawUrl.charCodeAt(protocolEnd) === 91) {
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

    if (l1Decision === DECISION.BLOCK) {
      optimizedStats.increment('domainBlocked'); optimizedStats.increment('blockedRequests');
      if (t0) { optimizedStats.addTiming('l1', __now__() - tL10); optimizedStats.addTiming('total', __now__() - t0); }
      return getBlockResponse(pathnameLower);
    }
    if (t0) optimizedStats.addTiming('l1', __now__() - tL10);
    
    let isSoftWhitelisted = false;
    if (getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_WILDCARDS, CONFIG.SOFT_WHITELIST_WILDCARDS).matched) {
        optimizedStats.increment('softWhitelistHits');
        isSoftWhitelisted = true;
    }
    if (t0) optimizedStats.addTiming('whitelist', __now__() - tWl0);

    if (!isSoftWhitelisted) {
        if (l1Decision !== DECISION.ALLOW && l1Decision !== DECISION.NEGATIVE_CACHE) {
            const tDom0 = t0 ? __now__() : 0;
            if (isDomainBlocked(hostname)) {
                let isExempted = false;
                const exemptions = CONFIG.PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS.get(hostname);
                if (exemptions) {
                    for (const ex of exemptions) if (fullPath.startsWith(ex)) { isExempted = true; break; }
                }
                if (!isExempted) {
                    multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK, 30 * 60 * 1000);
                    optimizedStats.increment('domainBlocked'); optimizedStats.increment('blockedRequests');
                    if (t0) { optimizedStats.addTiming('domainStage', __now__() - tDom0); optimizedStats.addTiming('total', __now__() - t0); }
                    return getBlockResponse(pathnameLower);
                }
            } else {
                multiLevelCache.setDomainDecision(hostname, DECISION.ALLOW, 10 * 60 * 1000);
            }
            if(t0) optimizedStats.addTiming('domainStage', __now__() - tDom0);
        }
    
        const lowerFullPath = fullPath.toLowerCase();
        const tCrit0 = t0 ? __now__() : 0;
        if (isCriticalTrackingScript(hostname, lowerFullPath)) {
          optimizedStats.increment('criticalScriptBlocked'); optimizedStats.increment('blockedRequests');
          if(t0) { optimizedStats.addTiming('critical', __now__() - tCrit0); optimizedStats.addTiming('total', __now__() - t0); }
          return getBlockResponse(pathnameLower);
        }
        if(t0) optimizedStats.addTiming('critical', __now__() - tCrit0);
        
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
        $done({ version: SCRIPT_VERSION, status: 'ready', message: 'URL Filter v40.77 - Smart Cache & Final Optimizations', stats: optimizedStats.getStats() });
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
