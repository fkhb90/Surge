/**
 * @file      URL-Ultimate-Filter-Surge-V43.05.js
 * @version   43.05 (Inbox Sync Fix)
 * @description [V43.05] Google Inbox 修正：
 * 1) [Fix] 將 inbox.google.com 加入絕對白名單 (Hard Whitelist)，防止舊版同步參數 (hl, c) 被清洗或誤擋。
 * 2) [Base] 繼承 V43.04 的事件收集治理 (OTLP/Snowplow) 與 Coupang 全方位防護。
 * @lastUpdated 2026-01-25
 */

// #################################################################################################
// #  ⚙️ RULES CONFIGURATION
// #################################################################################################

const RULES = {
  // [1] P0 Priority Block
  PRIORITY_BLOCK_DOMAINS: new Set([
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'admob.com', 'ads.google.com',
    'appsflyer.com', 'adjust.com', 'kochava.com', 'branch.io', 'app-measurement.com', 'singular.net',
    'unityads.unity3d.com', 'applovin.com', 'ironsrc.com', 'vungle.com', 'adcolony.com', 'chartboost.com',
    'tapjoy.com', 'pangle.io', 'taboola.com', 'outbrain.com', 'popads.net', 'ads.tiktok.com',
    'analytics.tiktok.com', 'ads.linkedin.com', 'ad.etmall.com.tw', 'trk.momoshop.com.tw', 'ad.line.me',
    'ad-history.line.me' // [V42.82] Added
  ]),

  // 惡意跳轉與縮網址
  REDIRECTOR_HOSTS: new Set([
    '1ink.cc', '1link.club', 'adfoc.us', 'adsafelink.com', 'adshnk.com', 'adz7short.space', 'aylink.co',
    'bc.vc', 'bcvc.ink', 'birdurls.com', 'bitcosite.com', 'blogbux.net', 'boost.ink', 'ceesty.com',
    'clik.pw', 'clk.sh', 'clkmein.com', 'cllkme.com', 'corneey.com', 'cpmlink.net', 'cpmlink.pro',
    'cutpaid.com', 'destyy.com', 'dlink3.com', 'dz4link.com', 'earnlink.io', 'exe-links.com', 'exeo.app',
    'fc-lc.com', 'fc-lc.xyz', 'fcd.su', 'festyy.com', 'fir3.net', 'forex-trnd.com', 'gestyy.com',
    'getthot.com', 'gitlink.pro', 'gplinks.co', 'hotshorturl.com', 'icutlink.com', 'kimochi.info',
    'kingofshrink.com', 'linegee.net', 'link1s.com', 'linkmoni.com', 'linkpoi.me', 'linkshrink.net',
    'linksly.co', 'lnk2.cc', 'loaninsurehub.com', 'lolinez.com', 'mangalist.org', 'megalink.pro', 'met.bz',
    'miniurl.pw', 'mitly.us', 'noweconomy.live', 'oke.io', 'oko.sh', 'oni.vn', 'onlinefreecourse.net',
    'ouo.io', 'ouo.press', 'pahe.plus', 'payskip.org', 'pingit.im', 'realsht.mobi', 'rlu.ru', 'sh.st',
    'short.am', 'shortlinkto.biz', 'shortmoz.link', 'shrinkcash.com', 'shrt10.com', 'similarsites.com',
    'smilinglinks.com', 'spacetica.com', 'spaste.com', 'srt.am', 'stfly.me', 'stfly.xyz', 'supercheats.com',
    'swzz.xyz', 'techgeek.digital', 'techstudify.com', 'techtrendmakers.com', 'thinfi.com', 'thotpacks.xyz',
    'tmearn.net', 'tnshort.net', 'tribuntekno.com', 'turdown.com', 'tutwuri.id', 'uplinkto.hair',
    'urlbluemedia.shop', 'urlcash.com', 'urlcash.org', 'vinaurl.net', 'vzturl.com', 'xpshort.com',
    'zegtrends.com'
  ]),

  // [2] Intelligent Whitelists
  // Layer 0: 絕對放行 (Hard Whitelist) - 優先級最高，跳過所有檢查，包含參數清洗
  HARD_WHITELIST: {
    EXACT: new Set([
      // AI & Productivity Assets (Images/CSS/JS)
      'cdn.oaistatic.com', 'files.oaiusercontent.com', 
      
      'claude.ai', 'gemini.google.com', 'perplexity.ai', 'www.perplexity.ai',
      'pplx-next-static-public.perplexity.ai', 'private-us-east-1.monica.im', 'api.felo.ai',
      'qianwen.aliyun.com', 'static.stepfun.com', 'api.openai.com', 'a-api.anthropic.com',
      
      // News & Productivity
      'api.feedly.com', 'sandbox.feedly.com', 'cloud.feedly.com',
      'translate.google.com', 'translate.googleapis.com', // [V42.86] Google Translate
      'inbox.google.com', // [V43.05] Google Inbox Legacy Sync Fix

      // System & Auth
      'reportaproblem.apple.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
      'sso.godaddy.com', 'idmsa.apple.com', 'api.login.yahoo.com', 
      'firebaseappcheck.googleapis.com', // [V42.83] Firebase App Check
      'firebaseinstallations.googleapis.com', // [V42.84] Firebase Installations (FID)
      'firebaseremoteconfig.googleapis.com', // [V42.85] Firebase Remote Config (Feature Flags)
      'accounts.google.com.tw', // [V42.87] Google Auth TW (SetSID)
      
      // Taiwan Finance & Payment & E-commerce API
      'api.etmall.com.tw', 'api.map.ecpay.com.tw', 'api.ecpay.com.tw', 'payment.ecpay.com.tw',
      'api.jkos.com', 'tw.fd-api.com', 'tw.mapi.shp.yahoo.com', 
      // 'cmapi.tw.coupang.com', // [V42.96] Moved to Soft Whitelist + Param Exemption
      
      // Dev Tools
      'code.createjs.com', 'oa.ledabangong.com', 'oa.qianyibangong.com', 'raw.githubusercontent.com',
      'ss.ledabangong.com', 'userscripts.adtidy.org', 'api.github.com', 'api.vercel.com',
      
      // Social Infra
      'gateway.facebook.com', 'graph.instagram.com', 'graph.threads.net', 'i.instagram.com',
      'api.discord.com', 'api.twitch.tv', 'api.line.me', 'today.line.me',
      
      // Fixes
      'pro.104.com.tw', 'gov.tw'
    ]),
    WILDCARDS: [
      // [V42.79] Shopee TW Hard Whitelist - No Cleaning, No Blocking
      'shopee.tw',

      'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'fubon.com', 'taishinbank.com.tw',
      'richart.tw', 'bot.com.tw', 'cathaysec.com.tw', 'chb.com.tw', 'citibank.com.tw',
      'dawho.tw', 'dbs.com.tw', 'firstbank.com.tw', 'hncb.com.tw', 'hsbc.co.uk', 'hsbc.com.tw',
      'landbank.com.tw', 'megabank.com.tw', 'megatime.com.tw', 'mitake.com.tw', 'money-link.com.tw',
      'momopay.com.tw', 'mymobibank.com.tw', 'paypal.com', 'scsb.com.tw', 'sinopac.com',
      'sinotrade.com.tw', 'standardchartered.com.tw', 'stripe.com', 'taipeifubon.com.tw',
      'taiwanpay.com.tw', 'tcb-bank.com.tw', 'twca.com.tw', 'twmp.com.tw', 'pay.taipei',
      'post.gov.tw', 'nhi.gov.tw', 'mohw.gov.tw', 'org.tw', 'tdcc.com.tw',
      'icloud.com', 'apple.com', 'whatsapp.net', 'update.microsoft.com', 'windowsupdate.com',
      'atlassian.net', 'auth0.com', 'okta.com', 'nextdns.io',
      'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com',
      'perma.cc', 'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org',
      'googlevideo.com', 'app.goo.gl', 'goo.gl'
    ]
  },

  // Layer 3: 軟性白名單 (Soft Whitelist)
  // 允許正常瀏覽，但會經過 Layer 4 (Map/Keyword) 檢查，可用於攔截特定路徑，且會執行參數清洗
  SOFT_WHITELIST: {
    EXACT: new Set([
      'gateway.shopback.com.tw', 'api.anthropic.com', 'api.cohere.ai', 'api.digitalocean.com',
      'api.fastly.com', 'api.heroku.com', 'api.hubapi.com', 'api.mailgun.com', 'api.netlify.com',
      'api.pagerduty.com', 'api.sendgrid.com', 'api.telegram.org', 'api.zendesk.com', 'duckduckgo.com',
      'legy.line-apps.com', 'obs.line-scdn.net', 'secure.gravatar.com', 'api.asana.com',
      'api.dropboxapi.com', 'api.figma.com', 'api.notion.com', 'api.trello.com', 'api.cloudflare.com',
      'auth.docker.io', 'database.windows.net', 'login.docker.com', 'api.irentcar.com.tw',
      'usiot.roborock.com', 'appapi.104.com.tw',
      'prism.ec.yahoo.com', 'graphql.ec.yahoo.com', 'visuals.feedly.com', 'api.revenuecat.com',
      'api-paywalls.revenuecat.com', 'account.uber.com', 'xlb.uber.com',
      'cmapi.tw.coupang.com' // [V42.96] Moved from Hard Whitelist (Blocked in L4, Params Exempted below)
    ]),
    WILDCARDS: [
      'chatgpt.com', // [Critical] Soft Whitelist to allow deep inspection (blocking /v1/rgstr)
      
      'shopee.com', 'shopeemobile.com', 'shopee.io', // Shopee.com remains in Soft Whitelist
      'youtube.com', 'facebook.com', 'instagram.com',
      'twitter.com', 'tiktok.com', 'spotify.com', 'netflix.com', 'disney.com',
      'linkedin.com', 'discord.com', 'googleapis.com', 'book.com.tw', 'citiesocial.com',
      'coupang.com', 'iherb.biz', 'iherb.com', 'm.youtube.com', 'momo.dm', 'momoshop.com.tw', 
      'pxmart.com.tw', 'pxpayplus.com', 'shopback.com.tw', 'akamaihd.net',
      'amazonaws.com', 'cloudflare.com', 'cloudfront.net', 'fastly.net', 'fbcdn.net', 'gstatic.com',
      'jsdelivr.net', 'cdnjs.cloudflare.com', 'twimg.com', 'unpkg.com', 'ytimg.com', 'new-reporter.com',
      'wp.com', 'flipboard.com', 'inoreader.com', 'itofoo.com', 'newsblur.com', 'theoldreader.com',
      'azurewebsites.net', 'cloudfunctions.net', 'digitaloceanspaces.com', 'github.io', 'gitlab.io',
      'netlify.app', 'oraclecloud.com', 'pages.dev', 'vercel.app', 'windows.net', 'threads.net',
      'slack.com', 'feedly.com',
      'ak.sv', 'bayimg.com', 'beeimg.com', 'binbox.io', 'casimages.com', 'cocoleech.com',
      'cubeupload.com', 'dlupload.com', 'fastpic.org', 'fotosik.pl', 'gofile.download', 'ibb.co',
      'imagebam.com', 'imageban.ru', 'imageshack.com', 'imagetwist.com', 'imagevenue.com', 'imgbb.com',
      'imgbox.com', 'imgflip.com', 'imx.to', 'indishare.org', 'infidrive.net', 'k2s.cc', 'katfile.com',
      'mirrored.to', 'multiup.io', 'nmac.to', 'noelshack.com', 'pic-upload.de', 'pixhost.to',
      'postimg.cc', 'prnt.sc', 'sfile.mobi', 'thefileslocker.net', 'turboimagehost.com', 'uploadhaven.com',
      'uploadrar.com', 'usersdrive.com',
      '__sbcdn' // [V42.73] ShopBack CDN Exception
    ]
  },

  // [3] Standard Blocking
  BLOCK_DOMAINS: new Set([
    'simonsignal.com', // [V43.02] Simon Data (Marketing CDP) Block
    'mercury.coupang.com', // [V43.01] Coupang Telemetry/Event Logging
    'slackb.com', // [V42.94] Slack Telemetry Block
    // RUM & Session Replay & Error Tracking
    'dem.shopee.com', 'apm.tracking.shopee.tw', 'live-apm.shopee.tw', 'log-collector.shopee.tw',
    'browser.sentry-cdn.com', 'browser-intake-datadoghq.com', 'browser-intake-datadoghq.eu',
    'browser-intake-datadoghq.us', 'bam.nr-data.net', 'bam-cell.nr-data.net',
    'lrkt-in.com', 'cdn.lr-ingest.com', 'r.lr-ingest.io', 'api-iam.intercom.io',
    'openfpcdn.io', 'fingerprintjs.com', 'fundingchoicesmessages.google.com', 'hotjar.com', 'segment.io',
    'mixpanel.com', 'amplitude.com', 'crazyegg.com', 'bugsnag.com', 'sentry.io', 'newrelic.com',
    'logrocket.com', 'criteo.com', 'pubmatic.com', 'rubiconproject.com', 'openx.com', 'fpjs.io',
    'adunblock1.static-cloudflare.workers.dev', 'guce.oath.com', 'app-site-association.cdn-apple.com',
    'iadsdk.apple.com', 'cdn-edge-tracking.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com',
    'edge-tracking.cloudflare.com', 'edgecompute-analytics.com', 'monitoring.edge-compute.io',
    'realtime-edge.fastly.com', '2o7.net', 'everesttech.net', 'log.felo.ai', 'event.sc.gearupportal.com',
    'pidetupop.com', 'adform.net', 'adsrvr.org', 'analytics.line.me', 'analytics.slashdotmedia.com',
    'analytics.strava.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'api.pendo.io',
    'c.clarity.ms', 'c.segment.com', 'chartbeat.com', 'clicktale.net', 'clicky.com',
    'comscore.com', 'criteo.net', 'customer.io', 'data.investing.com', 'datadoghq.com',
    'dynatrace.com', 'fullstory.com', 'heap.io', 'inspectlet.com', 'iterable.com', 'keen.io',
    'kissmetrics.com', 'loggly.com', 'matomo.cloud', 'mgid.com', 'mouseflow.com', 'mparticle.com',
    'mlytics.com', 'nr-data.net', 'oceanengine.com', 'openx.net', 'optimizely.com', 'piwik.pro',
    'posthog.com', 'quantserve.com', 'revcontent.com', 'rudderstack.com', 'scorecardresearch.com',
    'segment.com', 'semasio.net', 'snowplowanalytics.com', 'statcounter.com', 'statsig.com',
    'static.ads-twitter.com', 'sumo.com', 'sumome.com', 'tealium.com', 'track.hubspot.com',
    'track.tiara.daum.net', 'track.tiara.kakao.com', 'vwo.com', 'yieldlab.net', 'insight.linkedin.com',
    'px.ads.linkedin.com', 'fingerprint.com', 'doubleverify.com', 'iasds.com', 'moat.com',
    'moatads.com', 'sdk.iad-07.braze.com', 'serving-sys.com', 'tw.ad.doubleverify.com', 'agkn.com',
    'id5-sync.com', 'liveramp.com', 'permutive.com', 'tags.tiqcdn.com', 'klaviyo.com', 'marketo.com',
    'mktoresp.com', 'pardot.com', 'instana.io', 'launchdarkly.com', 'raygun.io', 'navify.com',
    
    // China
    'cnzz.com', 'umeng.com', 'talkingdata.com', 'jiguang.cn', 'getui.com',
    'mdap.alipay.com', 'loggw-ex.alipay.com', 'pgdt.gtimg.cn', 'afd.baidu.com', 'als.baidu.com',
    'cpro.baidu.com', 'dlswbr.baidu.com', 'duclick.baidu.com', 'feed.baidu.com', 'h2tcbox.baidu.com',
    'hm.baidu.com', 'hmma.baidu.com', 'mobads-logs.baidu.com', 'mobads.baidu.com', 'nadvideo2.baidu.com',
    'nsclick.baidu.com', 'sp1.baidu.com', 'voice.baidu.com', '3gimg.qq.com', 'fusion.qq.com',
    'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com',
    'wup.imtt.qq.com', 'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com',
    'sugar.zhihu.com', 'agn.aty.sohu.com', 'apm.gotokeep.com', 'applog.uc.cn', 'cn-huabei-1-lg.xf-yun.com',
    'gs.getui.com', 'log.b612kaji.com', 'pc-mon.snssdk.com', 'sensorsdata.cn', 'stat.m.jd.com',
    'trackapp.guahao.cn', 'traffic.mogujie.com', 'wmlog.meituan.com', 'zgsdk.zhugeio.com',
    'admaster.com.cn', 'adview.cn', 'alimama.com', 'getui.net', 'gepush.com', 'gridsum.com',
    'growingio.com', 'igexin.com', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com',
    'pangolin-sdk-toutiao.com', 'talkingdata.cn', 'tanx.com', 'umeng.cn', 'umeng.co',
    'umengcloud.com', 'youmi.net', 'zhugeio.com',

    // TW & E-commerce
    'cache.ltn.com.tw', 'adnext-a.akamaihd.net', 'appnext.hs.llnwd.net', 'fusioncdn.com',
    'toots-a.akamaihd.net', 'ad-geek.net', 'ad-hub.net', 'analysis.tw', 'aotter.net', 'cacafly.com',
    'clickforce.com.tw', 'ecdmp.momoshop.com.tw', 'analysis.momoshop.com.tw', 'event.momoshop.com.tw',
    'log.momoshop.com.tw', 'sspap.momoshop.com.tw', 'fast-trk.com', 'funp.com', 'guoshipartners.com',
    'imedia.com.tw', 'is-tracking.com', 'likr.tw', 'rtb.momoshop.com.tw', 'sitetag.us', 'tagtoo.co',
    'tenmax.io', 'trk.tw', 'urad.com.tw', 'vpon.com', 'analytics.shopee.tw', 'dmp.shopee.tw',
    'analytics.etmall.com.tw', 'pixel.momoshop.com.tw', 'trace.momoshop.com.tw', 'ad-serv.teepr.com',
    'appier.net', 'itad.linetv.tw',

    // Ad Networks
    'business.facebook.com', 'connect.facebook.net', 'graph.facebook.com', 'events.tiktok.com',
    'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad-cn.jovcloud.com', 'ad.12306.cn', 'ad.360in.com',
    'ad.51wnl-cq.com', 'ad.api.3g.youku.com', 'ad.caiyunapp.com', 'ad.hzyoka.com', 'ad.jiemian.com',
    'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'adashxgc.ut.taobao.com',
    'adashz4yt.m.taobao.com', 'adextra.51wnl-cq.com', 'adroll.com', 'ads.adadapted.com',
    'ads.daydaycook.com.cn', 'ads.weilitoutiao.net', 'ads.yahoo.com', 'adsapi.manhuaren.com',
    'adsdk.dmzj.com', 'adse.ximalaya.com', 'adserver.pandora.com', 'adserver.yahoo.com',
    'adsnative.com', 'adswizz.com', 'adtrack.quark.cn', 'adui.tg.meitu.com', 'adv.bandi.so',
    'adxserver.ad.cmvideo.cn', 'amazon-adsystem.com', 'api.cupid.dns.iqiyi.com', 'api.joybj.com',
    'api.whizzone.com', 'app-ad.variflight.com', 'appnexus.com', 'asimgs.pplive.cn', 'atm.youku.com',
    'beacon-api.aliyuncs.com', 'bdurl.net', 'bidswitch.net', 'bluekai.com', 'casalemedia.com',
    'contextweb.com', 'conversantmedia.com', 'cr-serving.com', 'creativecdn.com', 'csp.yahoo.com',
    'flashtalking.com', 'geo.yahoo.com', 'ggs.myzaker.com', 'go-mpulse.net', 'gumgum.com',
    'idatalog.iflysec.com', 'indexexchange.com', 'inmobi.com', 'ja.chushou.tv', 'liveintent.com',
    'mads.suning.com', 'magnite.com', 'media.net', 'mobileads.msn.com', 'mopnativeadv.037201.com',
    'mum.alibabachengdun.com', 'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz',
    'pbd.yahoo.com', 'pf.s.360.cn', 'puds.ucweb.com', 'pv.sohu.com', 's.youtube.com',
    'sharethrough.com', 'sitescout.com', 'smartadserver.com', 'soom.la', 'spotx.tv', 'spotxchange.com',
    'tapad.com', 'teads.tv', 'thetradedesk.com', 'tremorhub.com', 'volces.com', 'yieldify.com',
    'yieldmo.com', 'zemanta.com', 'zztfly.com', 'innovid.com', 'springserve.com', 'adcash.com',
    'propellerads.com', 'zeropark.com', 'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com',
    'linkshare.com', 'rakutenadvertising.com', 'adriver.ru', 'yandex.ru', 'addthis.com', 'cbox.ws',
    'disqus.com', 'disquscdn.com', 'intensedebate.com', 'onesignal.com', 'po.st', 'pushengage.com',
    'sail-track.com', 'sharethis.com', 'intercom.io', 'liveperson.net', 'zdassets.com', 'cookielaw.org',
    'onetrust.com', 'sourcepoint.com', 'trustarc.com', 'usercentrics.eu', 'bat.bing.com',
    'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'hs-analytics.net',
    'hs-scripts.com', 'metrics.vitals.vercel-insights.com', 'monorail-edge.shopifysvc.com',
    'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com',
    'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com',
    'snap.licdn.com', 'spade.twitch.tv', 'tr.snap.com', 'adnx.com', 'cint.com', 'revjet.com',
    'rlcdn.com', 'sc-static.net', 'wcs.naver.net',
    's.temu.com', 'events.reddit.com', 't.reddit.com'
  ]),

  BLOCK_DOMAINS_REGEX: [
    /^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/i,
    /^(.+\.)?sentry\.io$/i,
    /^(.+\.)?browser-intake-datadoghq\.(com|eu|us)$/i,
    /^(.+\.)?lr-ingest\.io$/i
  ],

  // [4] Critical Path Blocking
  CRITICAL_PATH: {
    GENERIC: [
      // [V43.04 Governance] Expanded Standard Telemetry Paths
      // Includes OTLP (/v1/traces), Snowplow (/tp2, /i), and generic variants
      '/collect', '/events', '/telemetry', '/metrics', '/traces', '/track', '/beacon', '/pixel',
      '/v1/collect', '/v1/events', '/v1/track', '/v1/telemetry', '/v1/metrics', '/v1/log', '/v1/traces',
      '/v2/collect', '/v2/events', '/v2/track', '/v2/telemetry', '/tp2', '/i',
      '/api/v1/collect', '/api/v1/events', '/api/v1/track', '/api/v1/telemetry',
      '/api/v1/log', '/api/log',
      
      // Existing Specific Paths
      '/api/stats/ads', '/api/stats/atr', '/api/stats/qoe', '/api/stats/playback',
      '/pagead/gen_204', '/pagead/paralleladview',
      '/youtubei/v1/log_interaction', '/youtubei/v1/log_event', '/youtubei/v1/player/log',
      '/tiktok/pixel/events', '/linkedin/insight/track',
      '/api/fingerprint', '/v1/fingerprint', '/cdn/fp/',
      '/api/collect', '/api/track', '/tr/', '/beacon',
      '/api/v1/event', '/ptracking', '/rest/n/log', '/action-log', '/ramen/v1/events',
      '/_events', '/report/v1/log', '/app/mobilelog', '/api/web/ad/', '/cdn/fingerprint/',
      '/api/device-id', '/api/visitor-id', '/ads/ga-audiences', '/doubleclick/', '/google-analytics/',
      '/googleadservices/', '/googlesyndication/', '/googletagmanager/', '/tiktok/track/',
      '/__utm.gif', '/j/collect', '/r/collect', '/api/batch', '/api/events', '/api/logs/',
      '/api/v1/events', '/api/v1/track', '/api/v2/event', '/api/v2/events', '/collect?', '/data/collect',
      '/events/track', '/ingest/', '/intake', '/p.gif', '/rec/bundle', '/t.gif', '/telemetry/',
      '/track/', '/v1/pixel', '/v2/track', '/v3/track', '/2/client/addlog_batch',
      '/plugins/easy-social-share-buttons/', '/event_report', '/log/aplus', '/v.gif', '/ad-sw.js',
      '/ads-sw.js', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/', '/abtesting/',
      '/b/ss', '/feature-flag/', '/i/adsct', '/track/m', '/track/pc', '/user-profile/', 'cacafly/track',
      '/api/v1/t', '/sa.gif',
      '/api/v2/rum' // [V42.89 Fix] Moved to Critical Path to bypass 'api' exemption
    ],
    SCRIPTS: new Set([
      'ads.js', 'adsbygoogle.js', 'analytics.js', 'ga-init.js', 'ga.js', 'gtag.js', 'gtm.js', 'ytag.js',
      'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'tiktok-pixel.js', 'ttclid.js',
      'insight.min.js', 'amplitude.js', 'braze.js', 'chartbeat.js', 'clarity.js', 'comscore.js',
      'crazyegg.js', 'customerio.js', 'fullstory.js', 'heap.js', 'hotjar.js', 'inspectlet.js', 'iterable.js',
      'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js', 'piwik.js', 'posthog.js',
      'quant.js', 'quantcast.js', 'segment.js', 'statsig.js', 'vwo.js', 'ad-manager.js', 'ad-player.js',
      'ad-sdk.js', 'adloader.js', 'adroll.js', 'adsense.js', 'advideo.min.js', 'apstag.js', 'criteo-loader.js',
      'criteo.js', 'doubleclick.js', 'mgid.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'revcontent.js',
      'taboola.js', 'ad-full-page.min.js', 'api_event_tracking_rtb_house.js', 'ed.js', 'itriweblog.js',
      'api_event_tracking.js', 'adobedtm.js', 'dax.js', 'tag.js', 'utag.js', 'visitorapi.js', 'newrelic.js',
      'nr-loader.js', 'perf.js', 'essb-core.min.js', 'intercom.js', 'pangle.js', 'tagtoo.js',
      'tiktok-analytics.js', 'aplus.js', 'aplus_wap.js', '/ec.js', '/gdt.js', '/hm.js', '/u.js', '/um.js', '/bat.js',
      'beacon.min.js', 'plausible.outbound-links.js', 'abtasty.js', 'ad-core.js',
      'ad-lib.js', 'adroll_pro.js', 'ads-beacon.js', 'autotrack.js', 'beacon.js', 'capture.js', '/cf.js',
      'cmp.js', 'collect.js', 'link-click-tracker.js', 'main-ad.js',
      'scevent.min.js', 'showcoverad.min.js', 'sp.js', 'tracker.js', 'tracking-api.js', 'tracking.js',
      'user-id.js', 'user-timing.js', 'wcslog.js', 'jslog.min.js' // [V42.95] Block Coupang Error Log
    ]),
    MAP: new Map([
      ['js.stripe.com', new Set(['/fingerprinted/'])], // [V42.4] Stripe Fingerprint Block
      ['chatgpt.com', new Set(['/ces/statsc/flush', '/v1/rgstr'])],
      ['tw.fd-api.com', new Set(['/api/v5/action-log'])],
      ['chatbot.shopee.tw', new Set(['/report/v1/log'])],
      ['data-rep.livetech.shopee.tw', new Set(['/dataapi/dataweb/event/'])],
      ['shopee.tw', new Set(['/dataapi/dataweb/event/'])],
      ['api.tongyi.com', new Set(['/qianwen/event/track'])],
      ['gw.alipayobjects.com', new Set(['/config/loggw/'])],
      ['slack.com', new Set(['/api/profiling.logging.enablement', '/api/telemetry'])],
      ['graphql.ec.yahoo.com', new Set(['/app/sas/v1/fullsitepromotions'])],
      ['prism.ec.yahoo.com', new Set(['/api/prism/v2/streamwithads'])],
      ['analytics.google.com', new Set(['/g/collect', '/j/collect'])],
      ['region1.analytics.google.com', new Set(['/g/collect'])],
      ['stats.g.doubleclick.net', new Set(['/g/collect', '/j/collect'])],
      ['www.google-analytics.com', new Set(['/debug/mp/collect', '/g/collect', '/j/collect', '/mp/collect'])],
      ['google.com', new Set(['/ads', '/pagead'])],
      ['facebook.com', new Set(['/tr', '/tr/'])],
      ['ads.tiktok.com', new Set(['/i18n/pixel'])],
      ['business-api.tiktok.com', new Set(['/open_api', '/open_api/v1.2/pixel/track', '/open_api/v1.3/event/track', '/open_api/v1.3/pixel/track'])],
      ['analytics.linkedin.com', new Set(['/collect'])],
      ['px.ads.linkedin.com', new Set(['/collect'])],
      ['ad.360yield.com', new Set([])],
      ['ads.bing.com', new Set(['/msclkid'])],
      ['ads.linkedin.com', new Set(['/li/track'])],
      ['ads.yahoo.com', new Set(['/pixel'])],
      ['amazon-adsystem.com', new Set(['/e/ec'])],
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
      ['ct.pinterest.com', new Set(['/v3'])],
      ['events.redditmedia.com', new Set(['/v1'])],
      ['s.pinimg.com', new Set(['/ct/core.js'])],
      ['www.redditstatic.com', new Set(['/ads/pixel.js'])],
      ['discord.com', new Set(['/api/v10/science', '/api/v9/science'])],
      ['vk.com', new Set(['/rtrg'])],
      ['instagram.com', new Set(['/logging_client_events'])],
      ['mall.shopee.tw', new Set(['/userstats_record/batchrecord'])],
      ['patronus.idata.shopeemobile.com', new Set(['/log-receiver/api/v1/0/tw/event/batch', '/event-receiver/api/v4/tw'])], // [V42.80 Patch] Shopee API v4 Tracking Block
      ['dp.tracking.shopee.tw', new Set(['/v4/event_batch'])], // [V42.75] Shopee Event Batch Block
      ['live-apm.shopee.tw', new Set(['/apmapi/v1/event'])], // [V42.77] Shopee Live APM Block
      ['cmapi.tw.coupang.com', new Set(['/featureflag/batchtracking', '/sdp-atf-ads/', '/sdp-btf-ads/', '/home-banner-ads/', '/category-banner-ads/', '/plp-ads/'])] // [V42.99] Coupang Omni-Block
    ])
  },

  // [5] Keyword & Regex Blocking
  KEYWORDS: {
    PATH_BLOCK: [
      // [V42.5 Refine] 移除 'tracking', 'client-id' 避免誤殺物流與登入
      // [V42.5 Feature] 新增指紋關鍵字 canvas, webgl, audio-fp, font-detect
      '/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/banner/',
      '/interstitial/', '/midroll/', '/popads/', '/popup/', '/postroll/', '/preroll/', '/promoted/',
      '/sponsor/', '/vclick/', '/ads-self-serve/',
      // [V42.74] HTTPDNS Detection Keywords
      '/httpdns/', '/d?dn=', '/resolve?host=', '/query?host=', '__httpdns__', 'dns-query',
      '112wan', '2mdn', '51y5', '51yes', '789htbet', '96110',
      'acs86', 'ad-choices', 'ad-logics', 'adash', 'adashx', 'adcash', 'adcome', 'addsticky', 'addthis',
      'adform', 'adhacker', 'adinfuse', 'adjust', 'admarvel', 'admaster', 'admation', 'admdfs', 'admicro',
      'admob', 'adnewnc', 'adpush', 'adpushup', 'adroll', 'adsage', 'adsame', 'adsense', 'adsensor',
      'adserver', 'adservice', 'adsh', 'adskeeper', 'adsmind', 'adsmogo', 'adsnew', 'adsrvmedia', 'adsrvr',
      'adsserving', 'adsterra', 'adsupply', 'adsupport', 'adswizz', 'adsystem', 'adtilt', 'adtima', 'adtrack',
      'advert', 'advertise', 'advertisement', 'advertiser', 'adview', 'ad-video', 'advideo', 'adware',
      'adwhirl', 'adwords', 'adzcore', 'affiliate', 'alexametrics', 'allyes', 'amplitude', 'analysis',
      'analysys', 'analytics', 'aottertrek', 'appadhoc', 'appads', 'appboy', 'appier', 'applovin', 'appsflyer',
      'apptimize', 'apsalar', 'baichuan', 'bango', 'bangobango', 'bidvertiser', 'bingads', 'bkrtx', 'bluekai',
      'breaktime', 'bugsense', 'burstly', 'cedexis', 'chartboost', 'circulate', 'click-fraud', 'clkservice',
      'cnzz', 'cognitivlabs', 'collect', 'crazyegg', 'crittercism', 'cross-device', 'dealerfire', 'dfp',
      'dienst', 'djns', 'dlads', 'dnserror', 'domob', 'doubleclick', 'doublemax', 'dsp', 'duapps', 'duomeng',
      'dwtrack', 'egoid', 'emarbox', 'en25', 'eyeota', 'fenxi', 'fingerprinting', 'flurry', 'fwmrm',
      'getadvltem', 'getexceptional', 'googleads', 'googlesyndication', 'greenplasticdua', 'growingio',
      'guanggao', 'guomob', 'guoshipartners', 'heapanalytics', 'hotjar', 'hsappstatic', 'hubspot', 'igstatic',
      'inmobi', 'innity', 'instabug', 'intercom', 'izooto', 'jpush', 'juicer', 'jumptap', 'kissmetrics',
      'lianmeng', 'litix', 'localytics', 'logly', 'mailmunch', 'malvertising', 'matomo', 'medialytics',
      'meetrics', 'mgid', 'mifengv', 'mixpanel', 'mobaders', 'mobclix', 'mobileapptracking', '/monitoring/',
      'mvfglobal', 'networkbench', 'newrelic', 'omgmta', 'omniture', 'onead', 'openinstall', 'openx',
      'optimizely', 'outstream', 'partnerad', 'pingfore', 'piwik', 'pixanalytics', 'playtomic', 'polyad',
      'popin', 'popin2mdn', 'programmatic', 'pushnotification', 'quantserve', 'quantumgraph', 'queryly',
      'qxs', 'rayjump', 'retargeting', 'ronghub', 'scorecardresearch', 'scupio', 'securepubads', 'sensor',
      'sentry', 'shence', 'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'smartbanner', 'snowplow',
      'socdm', 'sponsors', 'spy', 'spyware', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 'straas',
      'studybreakmedia', 'stunninglover', 'supersonicads', 'syndication', 'taboola', 'tagtoo', 'talkingdata',
      'tanx', 'tapjoy', 'tapjoyads', 'tenmax', 'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji',
      '/trace/', 'tracker', 'trackersimulator', 'trafficjunky', 'trafficmanager', 'tubemogul',
      'uedas', 'umeng', 'umtrack', 'unidesk', 'usermaven', 'usertesting', 'vast', 'venraas', 'vilynx', 'vpaid',
      'vpon', 'vungle', 'whalecloud', 'wistia', 'wlmonitor', 'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget',
      'zgdfz6h7po', 'zgty365', 'zhengjian', 'zhengwunet', 'zhuichaguoji', 'zjtoolbar', 'zzhyyj',
      '/ad-choices', '/ad-click', '/ad-code', 'ad-conversion', '/ad-engagement', 'ad-engagement', '/ad-event',
      '/ad-events', '/ad-exchange', 'ad-impression', '/ad-impression', '/ad-inventory', '/ad-loader',
      '/ad-logic', '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request',
      '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', '/ad-tech',
      'ad-telemetry', '/ad-telemetry', '/ad-unit', 'ad-verification', '/ad-verification', '/ad-view',
      'ad-viewability', '/ad-viewability', '/ad-wrapper', '/adframe/', '/adrequest/', '/adretrieve/',
      '/adserve/', '/adserving/', '/fetch_ads/', '/getad/', '/getads/',
      'ad-break', 'ad_event', 'ad_logic', 'ad_pixel', 'ad-call', 'adsbygoogle',
      'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'apstag', 'google_ad', 'pagead',
      'pwt.js', '/analytic/', '/analytics/', '/api/v2/rum', '/audit/', '/beacon/', '/collect?', '/collector/',
      'g/collect', '/insight/', '/intelligence/', '/measurement', 'mp/collect', '/pixel/', '/report/',
      '/reporting/', '/reports/', '/telemetry/', '/unstable/produce_batch', '/v1/produce', '/bugsnag/',
      '/crash/', 'debug/mp/collect', '/error/', '/envelope', '/exception/', '/sentry/', '/stacktrace/',
      'performance-tracking', 'real-user-monitoring', 'web-vitals',
      'audience', 'attribution', 'behavioral-targeting', 'cohort', 'cohort-analysis',
      'data-collection', 'data-sync', 'fingerprint', 'retargeting', 'session-replay', 'third-party-cookie',
      'user-analytics', 'user-behavior', 'user-cohort', 'user-segment',
      'appier', 'comscore', 'fbevents', 'fbq', 'google-analytics', 'onead', 'osano', 'sailthru', 'tapfiliate', 'utag.js',
      '/apmapi/', 'canvas', 'webgl', 'audio-fp', 'font-detect'
    ],
    HIGH_CONFIDENCE_TRACKER: new Set(['/ads', '/analytics', '/api/track', '/beacon', '/collect', '/pixel', '/tracker']),
    DROP: new Set([
      '.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog',
      'ads-beacon', 'airbrake', 'amp-analytics', 'batch', 'beacon', 'client-event', 'collect',
      'collect?', 'collector', 'crashlytics', 'csp-report', 'data-pipeline', 'error-monitoring',
      'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event', 'logevents',
      'loggly', 'log-hl', 'realtime-log', '/rum/', 'server-event', 'telemetry', 'uploadmobiledata',
      'web-beacon', 'web-vitals', 'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json'
    ])
  },

  // [8] Parameter Cleaning
  PARAMS: {
    GLOBAL: new Set([
      'gclid', 'fbclid', 'ttclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'yclid', 'mc_cid', 'mc_eid', 'srsltid', 'dclid', 'gclsrc', 'twclid', 'lid', '_branch_match_id',
      '_ga', '_gl', '_gid', '_openstat', 'admitad_uid', 'aiad_clid', 'awc', 'btag', 'cjevent', 'cmpid',
      'cuid', 'external_click_id', 'gad_source', 'gbraid', 'gps_adid', 'iclid', 'igshid', 'irclickid',
      'is_retargeting', 'ko_click_id', 'li_fat_id', 'mibextid', 'msclkid', 'oprtrack', 'rb_clickid',
      'sscid', 'trk', 'usqp', 'vero_conv', 'vero_id', 'wbraid', 'wt_mc', 'xtor', 'ysclid', 'zanpid',
      'yt_src', 'yt_ad'
    ]),
    GLOBAL_REGEX: [/^utm_\w+/i, /^ig_[\w_]+/i, /^asa_\w+/i, /^tt_[\w_]+/i, /^li_[\w_]+/i],
    PREFIXES: new Set([
      '__cf_', '_bta', '_ga_', '_gat_', '_gid_', '_hs', '_oly_', 'action_', 'ad_', 'adjust_', 'aff_', 'af_',
      'alg_', 'at_', 'bd_', 'bsft_', 'campaign_', 'cj', 'cm_', 'content_', 'creative_', 'fb_', 'from_',
      'gcl_', 'guce_', 'hmsr_', 'hsa_', 'ir_', 'itm_', 'li_', 'matomo_', 'medium_', 'mkt_', 'ms_', 'mt_',
      'mtm', 'pk_', 'piwik_', 'placement_', 'ref_', 'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_',
      'ttc_', 'vsm_', 'li_fat_', 'linkedin_'
    ]),
    PREFIXES_REGEX: [/_ga_/i, /^tt_[\w_]+/i, /^li_[\w_]+/i],
    COSMETIC: new Set(['fb_ref', 'fb_source', 'from', 'ref', 'share_id', 'source', 'spot_im_redirect_source']),
    WHITELIST: new Set([
      'code', 'id', 'item', 'p', 'page', 'product_id', 'q', 'query', 'search', 'session_id', 'state', 't',
      'targetid', 'token', 'v', 'callback', 'ct', 'cv', 'filter', 'format', 'lang', 'locale', 'status',
      'timestamp', 'type', 'withstats', 'access_token', 'client_assertion', 'client_id', 'device_id',
      'nonce', 'redirect_uri', 'refresh_token', 'response_type', 'scope', 'direction', 'limit', 'offset',
      'order', 'page_number', 'size', 'sort', 'sort_by', 'aff_sub', 'click_id', 'deal_id', 'offer_id',
      'cancel_url', 'error_url', 'return_url', 'success_url',
      // [V43.00] Coupang Double Safety Whitelist
      'metadata', 'pagestatus', 'eventactiontype', 'unitpricewithdeliveryfee',
      'previousitempricecount', 'optiontablelandingvendoritemid', 'selectedshowdeliverypddstatus'
    ]),
    EXEMPTIONS: new Map([
        ['www.google.com', new Set(['/maps/'])],
        ['taxi.sleepnova.org', new Set(['/api/v4/routes_estimate'])], // [V42.94] Taxi API Exemption
        ['cmapi.tw.coupang.com', new Set(['/'])] // [V42.96] Coupang Full Param Exemption
    ])
  }
};

const CONFIG = { DEBUG_MODE: false, AC_SCAN_MAX_LENGTH: 1024 };

// #################################################################################################
// #  🧠 CORE LOGIC ENGINE (Classes & Helpers)
// #################################################################################################

class ACScanner {
  constructor(keywords) { this.keywords = keywords; }
  matches(text) {
    if (!text) return false;
    const target = text.length > CONFIG.AC_SCAN_MAX_LENGTH ? text.substring(0, CONFIG.AC_SCAN_MAX_LENGTH) : text;
    const lowerTarget = target.toLowerCase();
    return this.keywords.some(kw => lowerTarget.includes(kw));
  }
}

class HighPerformanceLRUCache {
  constructor(limit = 256) {
    this.limit = limit;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return null;
    const entry = this.cache.get(key);
    if (Date.now() > entry.expiry) { this.cache.delete(key); return null; }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }
  set(key, value, ttl = 300000) {
    if (this.cache.size >= this.limit) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }
}

// -----------------------------
// Precomputations (Hotpath)
// -----------------------------

// Scanner setup (one-time)
const pathScanner = new ACScanner(RULES.KEYWORDS.PATH_BLOCK);
const criticalPathScanner = new ACScanner([
  ...RULES.CRITICAL_PATH.GENERIC,
  ...Array.from(RULES.CRITICAL_PATH.SCRIPTS)
]);

// Regex merged once (Fix: avoid per-request allocation)
const COMBINED_REGEX = [
  ...RULES.REGEX.PATH_BLOCK,
  ...RULES.REGEX.HEURISTIC
];

// Priority suffix list (for subdomains)
const PRIORITY_SUFFIX_LIST = Array.from(RULES.PRIORITY_BLOCK_DOMAINS);

// Split static suffix rules into 2 sets (Fix: avoid iterating whole SUFFIXES each request)
const STATIC_EXTENSIONS = new Set();
const STATIC_FILENAMES = new Set();
for (const s of RULES.EXCEPTIONS.SUFFIXES) {
  if (!s) continue;
  if (s.startsWith('.')) STATIC_EXTENSIONS.add(s);
  else STATIC_FILENAMES.add(s);
}

// Cache & stats
const multiLevelCache = new HighPerformanceLRUCache(512);
const stats = { blocks: 0, allows: 0, toString: () => `Blocked: ${stats.blocks}, Allowed: ${stats.allows}` };

// Cache CRITICAL_PATH.MAP.get(hostname) results
const criticalMapCache = new HighPerformanceLRUCache(256);

// #################################################################################################
// #  🔧 HELPERS
// #################################################################################################

const HELPERS = {
  isStaticFile: (pathLowerMaybeWithQuery) => {
    if (!pathLowerMaybeWithQuery) return false;
    const cleanPath = pathLowerMaybeWithQuery.split('?')[0].toLowerCase();

    // 1) extension-based
    const lastDot = cleanPath.lastIndexOf('.');
    if (lastDot !== -1) {
      const ext = cleanPath.substring(lastDot);
      if (STATIC_EXTENSIONS.has(ext)) return true;
    }

    // 2) filename-based (exact tail)
    // (only iterate the smaller set; and this set is inherently smaller than the original mixed SUFFIXES)
    for (const fn of STATIC_FILENAMES) {
      if (cleanPath.endsWith(fn)) return true;
    }

    return false;
  },

  isPathExplicitlyAllowed: (pathLower) => {
    for (const prefix of RULES.EXCEPTIONS.PREFIXES) if (pathLower.startsWith(prefix)) return true;
    for (const sub of RULES.EXCEPTIONS.SUBSTRINGS) if (pathLower.includes(sub)) return true;
    for (const seg of RULES.EXCEPTIONS.SEGMENTS) if (pathLower.includes('/' + seg + '/')) return true;
    return false;
  },

  isPathExemptedForDomain: (hostname, pathLower) => {
    const exemptedPaths = RULES.EXCEPTIONS.PATH_EXEMPTIONS.get(hostname);
    if (!exemptedPaths) return false;
    for (const exemptedPath of exemptedPaths) {
      if (pathLower.includes(exemptedPath)) return true;
    }
    return false;
  },

  cleanTrackingParams: (urlStr, hostname, pathLower) => {
    // [V43.00 Core Fix] Generic Parameter Exemption Check (Critical for Coupang/Taxi)
    // 舊版腳本可能缺少此段邏輯，導致豁免表失效。此為強制修復。
    const exemptions = RULES.PARAMS.EXEMPTIONS.get(hostname);
    if (exemptions) {
        for (const ex of exemptions) {
            if (pathLower.includes(ex)) return null; // 豁免生效，直接回傳 null (不清洗)
        }
    }

    try {
      if (!urlStr.includes('?')) return null;

      const urlObj = new URL(urlStr);
      const params = urlObj.searchParams;
      let changed = false;

      // 1) Global & Cosmetic
      for (const p of RULES.PARAMS.GLOBAL) {
        if (params.has(p)) { params.delete(p); changed = true; }
      }
      for (const p of RULES.PARAMS.COSMETIC) {
        if (params.has(p)) { params.delete(p); changed = true; }
      }

      // 2) Prefix & Regex
      const keys = Array.from(params.keys());
      for (const key of keys) {
        const lowerKey = key.toLowerCase();

        // keep whitelist params
        if (RULES.PARAMS.WHITELIST.has(lowerKey)) continue;

        // Prefix set
        for (const p of RULES.PARAMS.PREFIXES) {
          if (lowerKey.startsWith(p)) { params.delete(key); changed = true; break; }
        }
        if (!params.has(key)) continue;

        // Regex sets
        if (RULES.PARAMS.GLOBAL_REGEX.some(r => r.test(lowerKey)) ||
            RULES.PARAMS.PREFIXES_REGEX.some(r => r.test(lowerKey))) {
          params.delete(key);
          changed = true;
        }
      }

      return changed ? urlObj.toString() : null;
    } catch (_) {
      return null;
    }
  }
};

// #################################################################################################
// #  🚀 MAIN LOGIC FUNNEL
// #################################################################################################

let __INITIALIZED__ = false;

function initializeOnce() {
  if (__INITIALIZED__) return;
  __INITIALIZED__ = true;

  // Seed allow/block hints for faster hot path
  RULES.HARD_WHITELIST.EXACT.forEach(d => multiLevelCache.set(d, 'ALLOW', 86400000));
  RULES.PRIORITY_BLOCK_DOMAINS.forEach(d => multiLevelCache.set(d, 'BLOCK', 86400000));
}

function isDomainMatch(setExact, wildcards, hostname) {
  if (setExact.has(hostname)) return true;
  for (const d of wildcards) {
    if (hostname === d || hostname.endsWith('.' + d)) return true;
  }
  return false;
}

function isPriorityDomain(hostname) {
  if (RULES.PRIORITY_BLOCK_DOMAINS.has(hostname)) return true;
  // subdomain suffix match
  for (const d of PRIORITY_SUFFIX_LIST) {
    if (hostname.endsWith('.' + d)) return true;
  }
  return false;
}

function getCriticalBlockedPaths(hostname) {
  const cached = criticalMapCache.get(hostname);
  if (cached !== null) return cached; // may be Set or false

  const setOrUndef = RULES.CRITICAL_PATH.MAP.get(hostname);
  const value = setOrUndef ? setOrUndef : false;
  criticalMapCache.set(hostname, value, 300000);
  return value;
}

function processRequest(request) {
  const url = request && request.url;
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathLower = (urlObj.pathname + urlObj.search).toLowerCase();

    // 參數清洗邏輯提前定義，即使是白名單網域也需要清洗
    const performCleaning = () => {
        const cleanUrl = HELPERS.cleanTrackingParams(url, hostname, pathLower);
        if (cleanUrl) {
            stats.allows++;
            return { response: { status: 302, headers: { Location: cleanUrl } } };
        }
        return null;
    };

    // Layer 0: Hard whitelist must win (stability > aggressive P0 path)
    // [V42.81 Update] Restore Pure Hard Whitelist Logic: Return null immediately, SKIP cleaning.
    if (isDomainMatch(RULES.HARD_WHITELIST.EXACT, RULES.HARD_WHITELIST.WILDCARDS, hostname)) {
      multiLevelCache.set(hostname, 'ALLOW', 86400000);
      stats.allows++;
      return null; // <--- The Golden Rule of Hard Whitelist: Do Nothing.
    }

    // Cache fast path (ALLOW / BLOCK)
    const cached = multiLevelCache.get(hostname);
    if (cached === 'ALLOW') { 
        stats.allows++; 
        // Cached Soft Whitelists still get cleaned
        return performCleaning(); 
    }
    if (cached === 'BLOCK') { stats.blocks++; return { response: { status: 403, body: 'Blocked by Cache' } }; }

    // [New] Layer 0.5: Path Exemption Check (Domain-specific allow list)
    // 檢查此請求是否位於特定域名的「放行路徑」中 (如 shopee.tw/verify/traffic)
    if (HELPERS.isPathExemptedForDomain(hostname, pathLower)) {
        if (CONFIG.DEBUG_MODE) console.log(`[Allow] Exempted Path: ${pathLower}`);
        stats.allows++;
        return performCleaning();
    }

    // Layer 1: P0 Critical Path (generic + scripts)
    if (criticalPathScanner.matches(pathLower)) {
      stats.blocks++;
      if (CONFIG.DEBUG_MODE) console.log(`[Block] L1 Critical: ${pathLower}`);
      return { response: { status: 403, body: 'Blocked by L1' } };
    }

    // Layer 2: P0 Priority Domain
    if (isPriorityDomain(hostname)) {
      stats.blocks++;
      multiLevelCache.set(hostname, 'BLOCK', 86400000);
      return { response: { status: 403, body: 'Blocked by L2' } };
    }

    if (RULES.REDIRECTOR_HOSTS.has(hostname)) {
      stats.blocks++;
      return { response: { status: 403, body: 'Blocked Redirector' } };
    }

    // Layer 3: Soft whitelist mark
    const isSoftWhitelisted = isDomainMatch(RULES.SOFT_WHITELIST.EXACT, RULES.SOFT_WHITELIST.WILDCARDS, hostname);

    // Layer 4: Deep Inspection
    // 4.1 Critical Map
    const blockedPaths = getCriticalBlockedPaths(hostname);
    if (blockedPaths && blockedPaths !== false) {
      for (const badPath of blockedPaths) {
        if (badPath && pathLower.includes(badPath)) {
          stats.blocks++;
          if (CONFIG.DEBUG_MODE) console.log(`[Block] L4 Map: ${badPath}`);
          return { response: { status: 403, body: 'Blocked by Map' } };
        }
      }
    }

    // [V42.99] Omni-Block for Coupang Ads (Regex Match within L4 Logic)
    // 這是針對 Coupang 的特殊邏輯，能夠攔截所有 *-ads 路徑
    if (hostname === 'cmapi.tw.coupang.com') {
      if (/\/.*-ads\//.test(pathLower)) {
        stats.blocks++;
        if (CONFIG.DEBUG_MODE) console.log(`[Block] Coupang Omni-Ad: ${pathLower}`);
        return { response: { status: 403, body: 'Blocked by Coupang Omni-Block' } };
      }
    }

    // 4.2 Standard Block Domains (skip for soft whitelist)
    if (!isSoftWhitelisted) {
      if (RULES.BLOCK_DOMAINS.has(hostname) || RULES.BLOCK_DOMAINS_REGEX.some(r => r.test(hostname))) {
        stats.blocks++;
        return { response: { status: 403, body: 'Blocked by Domain' } };
      }
    }

    // 4.3 Keywords & Regex
    // For soft whitelist: only deep-check non-static resources to reduce breakage
    // [V42.2 Fix] Cache exemption result for both Keyword and Drop layers
    const isExplicitlyAllowed = HELPERS.isPathExplicitlyAllowed(pathLower);

    if (!isSoftWhitelisted || (isSoftWhitelisted && !HELPERS.isStaticFile(pathLower))) {
      if (!isExplicitlyAllowed) {
        if (pathScanner.matches(pathLower)) {
          stats.blocks++;
          return { response: { status: 403, body: 'Blocked by Keyword' } };
        }
        // Regex Check (pre-merged)
        if (COMBINED_REGEX.some(r => r.test(pathLower))) {
          stats.blocks++;
          return { response: { status: 403, body: 'Blocked by Regex' } };
        }
      }
    }

    // 4.4 Drop Keywords (respond 204)
    // [V42.2 Fix] Added exemption check wrapper to prevent 'collectionService' (API) from being dropped by 'collect'
    if (!isExplicitlyAllowed && !HELPERS.isStaticFile(pathLower)) { // [V42.92 Fix] Added static file check
      for (const k of RULES.KEYWORDS.DROP) {
        if (pathLower.includes(k)) {
          stats.blocks++;
          return { response: { status: 204 } };
        }
      }
    }

    // Parameter Cleaning (redirect to clean URL) - Main Execution for Non-Hard Whitelisted
    return performCleaning();

  } catch (err) {
    if (CONFIG.DEBUG_MODE) console.log(`[Error] ${err}`);
  }

  stats.allows++;
  return null;
}

if (typeof $request !== 'undefined') {
  initializeOnce();
  $done(processRequest($request));
} else {
  $done({ title: 'URL Ultimate Filter', content: `V43.04 Active\n${stats.toString()}` });
}

