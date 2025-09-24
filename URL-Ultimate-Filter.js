/**
 * @file        URL-Ultimate-Filter-Surge-V40.72.js
 * @version     40.72 (超效能重構：導入AC自動機與多維度度量)
 * @description 根據社群的專家級建議，對核心引擎進行了全面性的架構重構。導入Aho-Corasick自動機以實現線性時間的多模式匹配；優化快取策略、URL解析與初始化流程；並內建了詳細的階段性效能度量系統，以數據驅動未來優化。
 * @author      Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2025-09-24
 *
 * @note        使用前請務必收緊 Surge 腳本的 pattern 規則，僅處理必要的網路請求，以最大化整體效益。
 */

// #################################################################################################
// #                                                                                               #
// #                             ⚙️ SCRIPT CONFIGURATION (Build-Time Optimized)                      #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
  DEBUG_MODE: false,

  PERFORMANCE_PROFILING: {
    ENABLED: true, // 啟用後，$done 的結果將包含詳細的各階段效能統計
    CATEGORIES: new Map([
      ['socialmedia', new Set(['facebook.com', 'instagram.com', 'threads.net', 'x.com'])],
      ['videostreaming', new Set(['youtube.com', 'vimeo.com', 'twitch.tv'])],
      ['trackingplatform', new Set(['google-analytics.com', 'googletagmanager.com', 'doubleclick.net'])]
    ])
  },
  
  // [V40.72] 所有規則列表皆已在建置期完成小寫轉換與 Set/Map 結構化，移除了執行期的 sort() 與正規化開銷。
  REDIRECTOR_HOSTS: new Set(['1ink.cc', '1link.club', 'adfoc.us', 'adsafelink.com', 'adshnk.com', 'adz7short.space', 'aylink.co', 'bc.vc', 'bcvc.ink', 'birdurls.com', 'bitcosite.com', 'blogbux.net', 'boost.ink', 'ceesty.com', 'clik.pw', 'clk.sh', 'clkmein.com', 'cllkme.com', 'corneey.com', 'cpmlink.net', 'cpmlink.pro', 'cutpaid.com', 'destyy.com', 'dlink3.com', 'dz4link.com', 'earnlink.io', 'exe-links.com', 'exeo.app', 'fc-lc.com', 'fc-lc.xyz', 'fcd.su', 'festyy.com', 'fir3.net', 'forex-trnd.com', 'gestyy.com', 'get-click2.blogspot.com', 'getthot.com', 'gitlink.pro', 'gplinks.co', 'hotshorturl.com', 'icutlink.com', 'kimochi.info', 'kingofshrink.com', 'linegee.net', 'link1s.com', 'linkmoni.com', 'linkpoi.me', 'linkshrink.net', 'linksly.co', 'lnk2.cc', 'loaninsurehub.com', 'lolinez.com', 'mangalist.org', 'megalink.pro', 'met.bz', 'miniurl.pw', 'mitly.us', 'noweconomy.live', 'oke.io', 'oko.sh', 'oni.vn', 'onlinefreecourse.net', 'ouo.io', 'ouo.press', 'pahe.plus', 'payskip.org', 'pingit.im', 'realsht.mobi', 'rlu.ru', 'sh.st', 'short.am', 'shortlinkto.biz', 'shortmoz.link', 'shrinkcash.com', 'shrt10.com', 'similarsites.com', 'smilinglinks.com', 'spacetica.com', 'spaste.com', 'srt.am', 'stfly.me', 'stfly.xyz', 'supercheats.com', 'swzz.xyz', 'techgeek.digital', 'techstudify.com', 'techtrendmakers.com', 'thinfi.com', 'thotpacks.xyz', 'tmearn.net', 'tnshort.net', 'tribuntekno.com', 'turkdown.com', 'tutwuri.id', 'uplinkto.hair', 'urlbluemedia.shop', 'urlcash.com', 'urlcash.org', 'vinaurl.net', 'vzturl.com', 'xpshort.com', 'zegtrends.com']),
  HARD_WHITELIST_EXACT: new Set(['chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'private-us-east-1.monica.im', 'adsbypasser.github.io', 'code.createjs.com', 'nextdns.io', 'oa.ledabangong.com', 'oa.qianyibangong.com', 'qianwen.aliyun.com', 'raw.githubusercontent.com', 'reportaproblem.apple.com', 'ss.ledabangong.com', 'userscripts.adtidy.org', 'ar-genai.graph.meta.com', 'ar.graph.meta.com', 'gateway.facebook.com', 'meta-ai-realtime.facebook.com', 'meta.graph.meta.com', 'wearable-ai-realtime.facebook.com', 'cdn.ghostery.com', 'cdn.shortpixel.ai', 'cdn.syndication.twimg.com', 'd.ghostery.com', 'data-cloud.flightradar24.com', 'ssl.p.jwpcdn.com', 'secureapi.midomi.com', 'ap02.in.treasuredata.com', 'appapi.104.com.tw', 'eco-push-api-client.meiqia.com', 'exp.acsnets.com.tw', 'mpaystore.pcstore.com.tw', 'mushroomtrack.com', 'phtracker.com', 'pro.104.com.tw', 'prodapp.babytrackers.com', 'sensordata.open.cn', 'static.stepfun.com', 'track.fstry.me', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com', 'sso.godaddy.com', 'api.etmall.com.tw', 'tw.fd-api.com', 'api.map.ecpay.com.tw', 'api.adyen.com', 'api.braintreegateway.com', 'api.ecpay.com.tw', 'api.jkos.com', 'payment.ecpay.com.tw', 'api.line.me', 'kktix.com', 'tixcraft.com', 'api.discord.com', 'api.twitch.tv', 'graph.instagram.com', 'graph.threads.net', 'i.instagram.com', 'iappapi.investing.com']),
  HARD_WHITELIST_WILDCARDS: new Set(['bot.com.tw', 'cathaybk.com.tw', 'cathaysec.com.tw', 'chb.com.tw', 'citibank.com.tw', 'ctbcbank.com', 'dawho.tw', 'dbs.com.tw', 'esunbank.com.tw', 'firstbank.com.tw', 'fubon.com', 'hncb.com.tw', 'hsbc.co.uk', 'hsbc.com.tw', 'landbank.com.tw', 'megabank.com.tw', 'megatime.com.tw', 'mitake.com.tw', 'money-link.com.tw', 'momopay.com.tw', 'mymobibank.com.tw', 'paypal.com', 'richart.tw', 'scsb.com.tw', 'sinopac.com', 'sinotrade.com.tw', 'standardchartered.com.tw', 'stripe.com', 'taipeifubon.com.tw', 'taishinbank.com.tw', 'taiwanpay.com.tw', 'tcb-bank.com.tw', 'gov.tw', 'org.tw', 'pay.taipei', 'tdcc.com.tw', 'twca.com.tw', 'twmp.com.tw', 'atlassian.net', 'auth0.com', 'okta.com', 'slack.com', 'googleapis.com', 'icloud.com', 'linksyssmartwifi.com', 'update.microsoft.com', 'windowsupdate.com', 'archive.is', 'archive.li', 'archive.ph', 'archive.today', 'archive.vn', 'cc.bingj.com', 'perma.cc', 'timetravel.mementoweb.org', 'web-static.archive.org', 'web.archive.org', 'webcache.googleusercontent.com', 'www.webarchive.org.uk', 'googlevideo.com']),
  SOFT_WHITELIST_EXACT: new Set(['a-api.anthropic.com', 'api.anthropic.com', 'api.cohere.ai', 'api.digitalocean.com', 'api.fastly.com', 'api.feedly.com', 'api.github.com', 'api.heroku.com', 'api.hubapi.com', 'api.mailgun.com', 'api.netlify.com', 'api.openai.com', 'api.pagerduty.com', 'api.sendgrid.com', 'api.telegram.org', 'api.vercel.com', 'api.zendesk.com', 'duckduckgo.com', 'legy.line-apps.com', 'obs.line-scdn.net', 'secure.gravatar.com', 'api.asana.com', 'api.dropboxapi.com', 'api.figma.com', 'api.notion.com', 'api.trello.com', 'api.cloudflare.com', 'auth.docker.io', 'database.windows.net', 'login.docker.com', 'api.irentcar.com.tw', 'gateway.shopback.com.tw', 'usiot.roborock.com', 'visuals.feedly.com']),
  SOFT_WHITELIST_WILDCARDS: new Set(['book.com.tw', 'citiesocial.com', 'coupang.com', 'iherb.biz', 'iherb.com', 'm.youtube.com', 'momo.dm', 'momoshop.com.tw', 'pxmart.com.tw', 'pxpayplus.com', 'shopee.com', 'shopeemobile.com', 'shopee.tw', 'shopback.com.tw', 'spotify.com', 'youtube.com', 'akamaihd.net', 'amazonaws.com', 'cloudflare.com', 'cloudfront.net', 'fastly.net', 'fbcdn.net', 'gstatic.com', 'jsdelivr.net', 'cdnjs.cloudflare.com', 'twimg.com', 'unpkg.com', 'ytimg.com', 'new-reporter.com', 'wp.com', 'flipboard.com', 'inoreader.com', 'itofoo.com', 'newsblur.com', 'theoldreader.com', 'azurewebsites.net', 'cloudfunctions.net', 'digitaloceanspaces.com', 'github.io', 'gitlab.io', 'netlify.app', 'oraclecloud.com', 'pages.dev', 'vercel.app', 'windows.net', 'instagram.com', 'threads.net', 'ak.sv', 'bayimg.com', 'beeimg.com', 'binbox.io', 'casimages.com', 'cocoleech.com', 'cubeupload.com', 'dlupload.com', 'fastpic.org', 'fotosik.pl', 'gofile.download', 'ibb.co', 'imagebam.com', 'imageban.ru', 'imageshack.com', 'imagetwist.com', 'imagevenue.com', 'imgbb.com', 'imgbox.com', 'imgflip.com', 'imx.to', 'indishare.org', 'infidrive.net', 'k2s.cc', 'katfile.com', 'mirrored.to', 'multiup.io', 'nmac.to', 'noelshack.com', 'pic-upload.de', 'pixhost.to', 'postimg.cc', 'prnt.sc', 'sfile.mobi', 'thefileslocker.net', 'turboimagehost.com', 'uploadhaven.com', 'uploadrar.com', 'usersdrive.com']),
  BLOCK_DOMAINS: new Set(['adnext-a.akamaihd.net', 'appnext.hs.llnwd.net', 'fusioncdn.com', 'pgdt.gtimg.cn', 'toots-a.akamaihd.net', 'app-site-association.cdn-apple.com', 'iadsdk.apple.com', 'afd.baidu.com', 'als.baidu.com', 'cpro.baidu.com', 'dlswbr.baidu.com', 'duclick.baidu.com', 'feed.baidu.com', 'h2tcbox.baidu.com', 'hm.baidu.com', 'hmma.baidu.com', 'mobads-logs.baidu.com', 'mobads.baidu.com', 'nadvideo2.baidu.com', 'nsclick.baidu.com', 'sp1.baidu.com', 'voice.baidu.com', 'admob.com', 'adsense.com', 'adservice.google.com', 'app-measurement.com', 'doubleclick.net', 'google-analytics.com', 'googleadservices.com', 'googlesyndication.com', 'googletagmanager.com', 'business.facebook.com', 'connect.facebook.net', 'graph.facebook.com', 'ads.tiktok.com', 'analytics.tiktok.com', 'business-api.tiktok.com', 'events.tiktok.com', '3gimg.qq.com', 'fusion.qq.com', 'ios.bugly.qq.com', 'lives.l.qq.com', 'monitor.uu.qq.com', 'pingma.qq.com', 'sdk.e.qq.com', 'wup.imtt.qq.com', 'appcloud.zhihu.com', 'appcloud2.in.zhihu.com', 'crash2.zhihu.com', 'mqtt.zhihu.com', 'sugar.zhihu.com', 'cdn-edge-tracking.com', 'edge-analytics.amazonaws.com', 'edge-telemetry.akamai.com', 'edge-tracking.cloudflare.com', 'edgecompute-analytics.com', 'monitoring.edge-compute.io', 'realtime-edge.fastly.com', '2o7.net', 'everesttech.net', 'log.felo.ai', 'adform.net', 'adjust.com', 'ads.linkedin.com', 'adsrvr.org', 'agn.aty.sohu.com', 'amplitude.com', 'analytics.line.me', 'analytics.slashdotmedia.com', 'analytics.strava.com', 'analytics.twitter.com', 'analytics.yahoo.com', 'api.pendo.io', 'apm.gotokeep.com', 'applog.mobike.com', 'applog.uc.cn', 'appsflyer.com', 'branch.io', 'braze.com', 'bugsnag.com', 'c.clarity.ms', 'chartbeat.com', 'clicktale.net', 'clicky.com', 'cn-huabei-1-lg.xf-yun.com', 'comscore.com', 'crazyegg.com', 'criteo.com', 'criteo.net', 'customer.io', 'data.investing.com', 'datadoghq.com', 'dynatrace.com', 'fullstory.com', 'gs.getui.com', 'heap.io', 'hotjar.com', 'inspectlet.com', 'iterable.com', 'keen.io', 'kissmetrics.com', 'log.b612kaji.com', 'loggly.com', 'logrocket.com', 'matomo.cloud', 'mgid.com', 'mixpanel.com', 'mouseflow.com', 'mparticle.com', 'mlytics.com', 'newrelic.com', 'nr-data.net', 'oceanengine.com', 'openx.com', 'openx.net', 'optimizely.com', 'outbrain.com', 'pc-mon.snssdk.com', 'piwik.pro', 'posthog.com', 'pubmatic.com', 'quantserve.com', 'revcontent.com', 'rubiconproject.com', 'rudderstack.com', 'scorecardresearch.com', 'segment.com', 'segment.io', 'semasio.net', 'sensorsdata.cn', 'sentry.io', 'snowplowanalytics.com', 'stat.m.jd.com', 'statcounter.com', 'statsig.com', 'static.ads-twitter.com', 'sumo.com', 'sumome.com', 'taboola.com', 'tealium.com', 'track.hubspot.com', 'track.tiara.daum.net', 'track.tiara.kakao.com', 'trackapp.guahao.cn', 'traffic.mogujie.com', 'vwo.com', 'wmlog.meituan.com', 'yieldlab.net', 'zgsdk.zhugeio.com', 'analytics.linkedin.com', 'insight.linkedin.com', 'px.ads.linkedin.com', 'fingerprint.com', 'doubleverify.com', 'iasds.com', 'moat.com', 'moatads.com', 'sdk.iad-07.braze.com', 'serving-sys.com', 'agkn.com', 'id5-sync.com', 'liveramp.com', 'permutive.com', 'tags.tiqcdn.com', 'klaviyo.com', 'marketo.com', 'mktoresp.com', 'pardot.com', 'instana.io', 'kochava.com', 'launchdarkly.com', 'raygun.io', 'singular.net', 'abema-adx.ameba.jp', 'abtest.yuewen.cn', 'ad-cn.jovcloud.com', 'ad.12306.cn', 'ad.360in.com', 'ad.51wnl-cq.com', 'ad.api.3g.youku.com', 'ad.caiyunapp.com', 'ad.huajiao.com', 'ad.hzyoka.com', 'ad.jiemian.com', 'ad.qingting.fm', 'ad.wappalyzer.com', 'ad.yieldmanager.com', 'adashxgc.ut.taobao.com', 'adashz4yt.m.taobao.com', 'adcolony.com', 'adextra.51wnl-cq.com', 'adroll.com', 'ads.adadapted.com', 'ads.daydaycook.com.cn', 'ads.mopub.com', 'ads.weilitoutiao.net', 'ads.yahoo.com', 'adsapi.manhuaren.com', 'adsdk.dmzj.com', 'adse.ximalaya.com', 'adserver.pandora.com', 'adserver.yahoo.com', 'adsnative.com', 'adswizz.com', 'adtrack.quark.cn', 'adui.tg.meitu.com', 'adv.bandi.so', 'adxserver.ad.cmvideo.cn', 'amazon-adsystem.com', 'api.cupid.dns.iqiyi.com', 'api.joybj.com', 'api.whizzone.com', 'app-ad.variflight.com', 'applovin.com', 'appnexus.com', 'ark.letv.com', 'asimgs.pplive.cn', 'atm.youku.com', 'beacon-api.aliyuncs.com', 'bdurl.net', 'bidswitch.net', 'bluekai.com', 'casalemedia.com', 'contextweb.com', 'conversantmedia.com', 'cr-serving.com', 'creativecdn.com', 'csp.yahoo.com', 'flashtalking.com', 'geo.yahoo.com', 'ggs.myzaker.com', 'go-mpulse.net', 'gumgum.com', 'idatalog.iflysec.com', 'indexexchange.com', 'inmobi.com', 'ironsrc.com', 'itad.linetv.tw', 'ja.chushou.tv', 'liveintent.com', 'mads.suning.com', 'magnite.com', 'media.net', 'mobileads.msn.com', 'mopnativeadv.037201.com', 'mopub.com', 'mum.alibabachengdun.com', 'narrative.io', 'nativeadv.dftoutiao.com', 'neustar.biz', 'pbd.yahoo.com', 'pf.s.360.cn', 'puds.ucweb.com', 'pv.sohu.com', 's.youtube.com', 'sharethrough.com', 'sitescout.com', 'smartadserver.com', 'soom.la', 'spotx.tv', 'spotxchange.com', 'tapad.com', 'teads.tv', 'thetradedesk.com', 'tremorhub.com', 'unityads.unity3d.com', 'volces.com', 'vungle.com', 'yieldify.com', 'yieldmo.com', 'zemanta.com', 'zztfly.com', 'innovid.com', 'springserve.com', 'adcash.com', 'popads.net', 'propellerads.com', 'zeropark.com', 'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com', 'adriver.ru', 'yandex.ru', 'addthis.com', 'cbox.ws', 'disqus.com', 'disquscdn.com', 'intensedebate.com', 'onesignal.com', 'po.st', 'pushengage.com', 'sail-track.com', 'sharethis.com', 'intercom.io', 'liveperson.net', 'zdassets.com', 'cookielaw.org', 'onetrust.com', 'sourcepoint.com', 'trustarc.com', 'usercentrics.eu', 'ad-geek.net', 'ad-hub.net', 'analysis.tw', 'aotter.net', 'cacafly.com', 'clickforce.com.tw', 'fast-trk.com', 'guoshipartners.com', 'imedia.com.tw', 'is-tracking.com', 'likr.tw', 'sitetag.us', 'tagtoo.co', 'tenmax.io', 'trk.tw', 'urad.com.tw', 'vpon.com', 'ad-serv.teepr.com', 'appier.net', 'admaster.com.cn', 'adview.cn', 'alimama.com', 'cnzz.com', 'getui.com', 'getui.net', 'gepush.com', 'gridsum.com', 'growingio.com', 'igexin.com', 'jiguang.cn', 'jpush.cn', 'kuaishou.com', 'miaozhen.com', 'mmstat.com', 'pangolin-sdk-toutiao.com', 'talkingdata.cn', 'talkingdata.com', 'tanx.com', 'umeng.cn', 'umeng.co', 'umeng.com', 'umengcloud.com', 'youmi.net', 'zhugeio.com', 'bat.bing.com', 'cdn.vercel-insights.com', 'cloudflareinsights.com', 'demdex.net', 'hs-analytics.net', 'hs-scripts.com', 'monorail-edge.shopifysvc.com', 'omtrdc.net', 'plausible.io', 'static.cloudflareinsights.com', 'vitals.vercel-insights.com', 'business-api.tiktok.com', 'ct.pinterest.com', 'events.redditmedia.com', 'px.srvcs.tumblr.com', 'snap.licdn.com', 'spade.twitch.tv', 'adnx.com', 'cint.com', 'revjet.com', 'rlcdn.com', 'sc-static.net', 'wcs.naver.net']),
  BLOCK_DOMAINS_REGEX: [/^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/],
  CRITICAL_TRACKING_SCRIPTS: new Set(['ads.js', 'adsbygoogle.js', 'analytics.js', 'ga.js', 'gtag.js', 'gtm.js', 'ytag.js', 'connect.js', 'fbevents.js', 'fbq.js', 'pixel.js', 'events.js', 'tiktok-pixel.js', 'ttclid.js', 'analytics.js', 'insight.min.js', 'amplitude.js', 'braze.js', 'chartbeat.js', 'clarity.js', 'comscore.js', 'crazyegg.js', 'customerio.js', 'fullstory.js', 'heap.js', 'hotjar.js', 'inspectlet.js', 'iterable.js', 'logrocket.js', 'matomo.js', 'mixpanel.js', 'mouseflow.js', 'optimizely.js', 'piwik.js', 'posthog.js', 'quant.js', 'quantcast.js', 'segment.js', 'statsig.js', 'vwo.js', 'ad-manager.js', 'ad-player.js', 'ad-sdk.js', 'adloader.js', 'adroll.js', 'adsense.js', 'advideo.min.js', 'apstag.js', 'criteo.js', 'doubleclick.js', 'mgid.js', 'outbrain.js', 'prebid.js', 'pubmatic.js', 'revcontent.js', 'taboola.js', 'ad-full-page.min.js', 'adobedtm.js', 'dax.js', 'tag.js', 'utag.js', 'visitorapi.js', 'newrelic.js', 'nr-loader.js', 'perf.js', 'trace.js', 'essb-core.min.js', 'intercom.js', 'pangle.js', 'tagtoo.js', 'tiktok-analytics.js', 'aplus.js', 'aplus_wap.js', 'ec.js', 'gdt.js', 'hm.js', 'u.js', 'um.js', 'bat.js', 'beacon.min.js', 'plausible.outbound-links.js', 'abtasty.js', 'action.js', 'activity.js', 'ad-core.js', 'ad-lib.js', 'adroll_pro.js', 'ads-beacon.js', 'autotrack.js', 'beacon.js', 'capture.js', 'cf.js', 'cmp.js', 'collect.js', 'conversion.js', 'event.js', 'link-click-tracker.js', 'main-ad.js', 'scevent.min.js', 'showcoverad.min.js', 'sp.js', 'tracker.js', 'tracking-api.js', 'tracking.js', 'user-id.js', 'user-timing.js', 'wcslog.js']),
  CRITICAL_TRACKING_MAP: new Map([['analytics.google.com', new Set(['/g/collect'])], ['region1.analytics.google.com', new Set(['/g/collect'])], ['stats.g.doubleclick.net', new Set(['/g/collect', '/j/collect'])], ['www.google-analytics.com', new Set(['/debug/mp/collect', '/g/collect', '/j/collect', '/mp/collect'])], ['google.com', new Set(['/ads', '/pagead'])], ['facebook.com', new Set(['/tr'])], ['ads.tiktok.com', new Set(['/i18n/pixel'])], ['business-api.tiktok.com', new Set(['/open_api', '/open_api/v1.2/pixel/track', '/open_api/v1.3/event/track', '/open_api/v1.3/pixel/track'])], ['analytics.linkedin.com', new Set(['/collect'])], ['px.ads.linkedin.com', new Set(['/collect'])], ['ad.360yield.com', new Set([])], ['ads.bing.com', new Set(['/msclkid'])], ['ads.linkedin.com', new Set(['/li/track'])], ['ads.yahoo.com', new Set(['/pixel'])], ['amazon-adsystem.com', new Set(['/e/ec'])], ['api-iam.intercom.io', new Set(['/messenger/web/events'])], ['api.amplitude.com', new Set(['/2/httpapi'])], ['api.hubspot.com', new Set(['/events'])], ['api-js.mixpanel.com', new Set(['/track'])], ['api.mixpanel.com', new Set(['/track'])], ['api.segment.io', new Set(['/v1/page', '/v1/track'])], ['heap.io', new Set(['/api/track'])], ['in.hotjar.com', new Set(['/api/v2/client'])], ['scorecardresearch.com', new Set(['/beacon.js'])], ['segment.io', new Set(['/v1/track'])], ['widget.intercom.io', new Set([])], ['ads-api.tiktok.com', new Set(['/api/v2/pixel'])], ['ads.pinterest.com', new Set(['/v3/conversions/events'])], ['analytics.snapchat.com', new Set(['/v1/batch'])], ['cnzz.com', new Set(['/stat.php'])], ['gdt.qq.com', new Set(['/gdt_mview.fcg'])], ['hm.baidu.com', new Set(['/hm.js'])], ['cloudflareinsights.com', new Set(['/cdn-cgi/rum'])], ['static.cloudflareinsights.com', new Set(['/beacon.min.js'])], ['bat.bing.com', new Set(['/action'])], ['monorail-edge.shopifysvc.com', new Set(['/v1/produce'])], ['vitals.vercel-insights.com', new Set(['/v1/vitals'])], ['pbd.yahoo.com', new Set(['/data/logs'])], ['plausible.io', new Set(['/api/event'])], ['analytics.tiktok.com', new Set(['/i18n/pixel/events.js'])], ['a.clarity.ms', new Set(['/collect'])], ['d.clarity.ms', new Set(['/collect'])], ['l.clarity.ms', new Set(['/collect'])], ['ingest.sentry.io', new Set(['/api/'])], ['agent-http-intake.logs.us5.datadoghq.com', new Set([])], ['browser-intake-datadoghq.com', new Set(['/api/v2/rum'])], ['browser-intake-datadoghq.eu', new Set(['/api/v2/rum'])], ['http-intake.logs.datadoghq.com', new Set(['/v1/input'])], ['ct.pinterest.com', new Set(['/v3'])], ['events.redditmedia.com', new Set(['/v1'])], ['s.pinimg.com', new Set(['/ct/core.js'])], ['www.redditstatic.com', new Set(['/ads/pixel.js'])], ['discord.com', new Set(['/api/v10/science', '/api/v9/science'])], ['vk.com', new Set(['/rtrg'])]]),
  
  // [V40.72] AC自動機的關鍵字來源
  PATH_BLOCK_KEYWORDS: ['/ad/', '/ads/', '/adv/', '/advert/', '/advertisement/', '/advertising/', '/affiliate/', '/banner/', '/interstitial/', '/midroll/', '/popads/', '/popup/', '/postroll/', '/prebid/', '/preroll/', '/promoted/', '/sponsor/', '/vclick/', '112wan', '2mdn', '51y5', '51yes', '789htbet', '96110', 'acs86', 'ad-choices', 'ad-logics', 'adash', 'adashx', 'adcash', 'adcome', 'addsticky', 'addthis', 'adform', 'adhacker', 'adinfuse', 'adjust', 'admarvel', 'admaster', 'admation', 'admdfs', 'admicro', 'admob', 'adnewnc', 'adpush', 'adpushup', 'adroll', 'adsage', 'adsame', 'adsense', 'adsensor', 'adserver', 'adservice', 'adsh', 'adskeeper', 'adsmind', 'adsmogo', 'adsnew', 'adsrvmedia', 'adsrvr', 'adsserving', 'adsterra', 'adsupply', 'adsupport', 'adswizz', 'adsystem', 'adtilt', 'adtima', 'adtrack', 'advert', 'advertise', 'advertisement', 'advertiser', 'adview', 'ad-video', 'advideo', 'adware', 'adwhirl', 'adwords', 'adzcore', 'affiliate', 'alexametrics', 'allyes', 'amplitude', 'analysis', 'analysys', 'analytics', 'aottertrek', 'appadhoc', 'appads', 'appboy', 'appier', 'applovin', 'appsflyer', 'apptimize', 'apsalar', 'baichuan', 'bango', 'bangobango', 'bidvertiser', 'bingads', 'bkrtx', 'bluekai', 'breaktime', 'bugsense', 'burstly', 'cedexis', 'chartboost', 'circulate', 'click-fraud', 'clkservice', 'cnzz', 'cognitivlabs', 'collect', 'crazyegg', 'crittercism', 'cross-device', 'dealerfire', 'dfp', 'dienst', 'djns', 'dlads', 'dnserror', 'domob', 'doubleclick', 'doublemax', 'dsp', 'duapps', 'duomeng', 'dwtrack', 'egoid', 'emarbox', 'en25', 'eyeota', 'fenxi', 'fingerprinting', 'flurry', 'fwmrm', 'getadvltem', 'getexceptional', 'googleads', 'googlesyndication', 'greenplasticdua', 'growingio', 'guanggao', 'guomob', 'guoshipartners', 'heapanalytics', 'hotjar', 'hsappstatic', 'hubspot', 'igstatic', 'inmobi', 'innity', 'instabug', 'intercom', 'izooto', 'jpush', 'juicer', 'jumptap', 'kissmetrics', 'lianmeng', 'litix', 'localytics', 'logly', 'mailmunch', 'malvertising', 'matomo', 'medialytics', 'meetrics', 'mgid', 'mifengv', 'mixpanel', 'mobaders', 'mobclix', 'mobileapptracking', '/monitoring/', 'mvfglobal', 'networkbench', 'newrelic', 'omgmta', 'omniture', 'onead', 'openinstall', 'openx', 'optimizely', 'outstream', 'partnerad', 'pingfore', 'piwik', 'pixanalytics', 'playtomic', 'polyad', 'popin', 'popin2mdn', 'programmatic', 'pushnotification', 'quantserve', 'quantumgraph', 'queryly', 'qxs', 'rayjump', 'retargeting', 'ronghub', 'rtb', 'scorecardresearch', 'scupio', 'securepubads', 'sensor', 'sentry', 'shence', 'shenyun', 'shoplytics', 'shujupie', 'smartadserver', 'smartbanner', 'snowplow', 'socdm', 'sponsors', 'spy', 'spyware', 'statcounter', 'stathat', 'sticky-ad', 'storageug', 'straas', 'studybreakmedia', 'stunninglover', 'supersonicads', 'syndication', 'taboola', 'tagtoo', 'talkingdata', 'tanx', 'tapjoy', 'tapjoyads', 'tenmax', 'tingyun', 'tiqcdn', 'tlcafftrax', 'toateeli', 'tongji', '/trace/', 'tracker', 'trackersimulator', 'tracking', 'trafficjunky', 'trafficmanager', 'tubemogul', 'uedas', 'umeng', 'umtrack', 'unidesk', 'usermaven', 'usertesting', 'vast', 'venraas', 'vilynx', 'vpaid', 'vpon', 'vungle', 'whalecloud', 'wistia', 'wlmonitor', 'woopra', 'xxshuyuan', 'yandex', 'zaoo', 'zarget', 'zgdfz6h7po', 'zgty365', 'zhengjian', 'zhengwunet', 'zhuichaguoji', 'zjtoolbar', 'zzhyyj', '/ad-choices', '/ad-click', '/ad-code', '/ad-conversion', '/ad-engagement', '/ad-event', '/ad-events', '/ad-exchange', '/ad-impression', '/ad-inventory', '/ad-loader', '/ad-logic', '/ad-manager', '/ad-metrics', '/ad-network', '/ad-placement', '/ad-platform', '/ad-request', '/ad-response', '/ad-script', '/ad-server', '/ad-slot', '/ad-specs', '/ad-system', '/ad-tag', '/ad-tech', '/ad-telemetry', '/ad-unit', '/ad-verification', '/ad-view', '/ad-viewability', '/ad-wrapper', '/adframe/', '/adrequest/', '/adretrieve/', '/adserve/', '/adserving/', '/fetch_ads/', '/getad/', '/getads/', 'ad-break', 'ad_event', 'ad_logic', 'ad_pixel', 'ad-call', 'adsbygoogle', 'amp-ad', 'amp-analytics', 'amp-auto-ads', 'amp-sticky-ad', 'amp4ads', 'apstag', 'google_ad', 'pagead', 'pwt.js', '/analytic/', '/analytics/', '/api/v2/rum', '/audit/', '/beacon/', '/collect?', '/collector/', 'g/collect', '/insight/', '/intelligence/', '/measurement', 'mp/collect', '/pixel/', '/report/', '/reporting/', '/reports/', '/telemetry/', '/unstable/produce_batch', '/v1/produce', '/bugsnag/', '/crash/', 'debug/mp/collect', '/error/', '/envelope', '/exception/', '/sentry/', '/stacktrace/', 'performance-tracking', 'real-user-monitoring', 'web-vitals', 'audience', 'attribution', 'behavioral-targeting', 'cohort', 'data-collection', 'data-sync', 'fingerprint', 'retargeting', 'session-replay', 'third-party-cookie', 'user-analytics', 'user-behavior', 'user-cohort', 'user-segment', 'appier', 'comscore', 'fbevents', 'fbq', 'google-analytics', 'onead', 'osano', 'sailthru', 'tapfiliate', 'utag.js'],
  CRITICAL_TRACKING_GENERIC_PATHS: ['/ads/ga-audiences', '/doubleclick/', '/google-analytics/', '/googleadservices/', '/googlesyndication/', '/googletagmanager/', '/pagead/gen_204', '/tiktok/pixel/events', '/tiktok/track/', '/linkedin/insight/track', '/__utm.gif', '/j/collect', '/r/collect', '/api/batch', '/api/collect', '/api/event', '/api/events', '/api/log/', '/api/logs/', '/api/track/', '/api/v1/event', '/api/v1/events', '/api/v1/track', '/api/v2/event', '/api/v2/events', '/beacon/', '/collect?', '/data/collect', '/events/track', '/ingest/', '/intake', '/p.gif', '/pixel/', '/rec/bundle', '/t.gif', '/telemetry/', '/track/', '/v1/pixel', '/v2/track', '/v3/track', '/2/client/addlog_batch', '/plugins/easy-social-share-buttons/', '/event_report', '/log/aplus', '/v.gif', '/ad-sw.js', '/ads-sw.js', '/ad-call', '/adx/', '/adsales/', '/adserver/', '/adsync/', '/adtech/', '/abtesting/', '/b/ss', '/feature-flag/', '/i/adsct', '/track/m', '/track/pc', '/user-profile/', 'cacafly/track'],
  PATH_ALLOW_PREFIXES: new Set(['/.well-known/']),
  PATH_ALLOW_SUFFIXES: new Set(['app.js', 'bundle.js', 'chunk.js', 'chunk.mjs', 'common.js', 'framework.js', 'framework.mjs', 'index.js', 'index.mjs', 'main.js', 'polyfills.js', 'polyfills.mjs', 'runtime.js', 'styles.css', 'styles.js', 'vendor.js', 'badge.svg', 'browser.js', 'card.js', 'chunk-common', 'chunk-vendors', 'component---', 'config.js', 'favicon.ico', 'fetch-polyfill', 'head.js', 'header.js', 'icon.svg', 'legacy.js', 'loader.js', 'logo.svg', 'manifest.json', 'modal.js', 'padding.css', 'page-data.js', 'polyfill.js', 'robots.txt', 'sitemap.xml', 'sw.js', 'theme.js', 'web.config']),
  PATH_ALLOW_SUBSTRINGS: new Set(['_app/', '_next/static/', '_nuxt/', 'i18n/', 'locales/', 'static/css/', 'static/js/', 'static/media/']),
  PATH_ALLOW_SEGMENTS: new Set(['admin', 'api', 'blog', 'catalog', 'dashboard', 'dialog', 'login']),
  HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH: new Set(['/ads', '/analytics', '/api/track', '/beacon', '/collect', '/pixel', '/tracker']),
  DROP_KEYWORDS: new Set(['.log', '?diag=', '?log=', '-log.', '/diag/', '/log/', '/logging/', '/logs/', 'adlog', 'ads-beacon', 'airbrake', 'amp-analytics', 'batch', 'beacon', 'client-event', 'collect', 'collect?', 'collector', 'crashlytics', 'csp-report', 'data-pipeline', 'error-monitoring', 'error-report', 'heartbeat', 'ingest', 'intake', 'live-log', 'log-event', 'logevents', 'loggly', 'log-hl', 'realtime-log', 'rum', 'server-event', 'telemetry', 'uploadmobiledata', 'web-beacon', 'web-vitals', 'crash-report', 'diagnostic.log', 'profiler', 'stacktrace', 'trace.json']),
  GLOBAL_TRACKING_PARAMS: new Set(['_branch_match_id', '_ga', '_gl', '_gid', '_openstat', 'admitad_uid', 'aiad_clid', 'awc', 'btag', 'cjevent', 'cmpid', 'cuid', 'dclid', 'external_click_id', 'fbclid', 'gad_source', 'gclid', 'gclsrc', 'gbraid', 'gps_adid', 'iclid', 'igshid', 'irclickid', 'is_retargeting', 'ko_click_id', 'li_fat_id', 'mc_cid', 'mc_eid', 'mibextid', 'msclkid', 'oprtrack', 'rb_clickid', 'srsltid', 'sscid', 'trk', 'ttclid', 'twclid', 'usqp', 'vero_conv', 'vero_id', 'wbraid', 'wt_mc', 'xtor', 'yclid', 'ysclid', 'zanpid']),
  GLOBAL_TRACKING_PARAMS_REGEX: [/^utm_\w+/, /^ig_[\w_]+/, /^asa_\w+/, /^tt_[\w_]+/, /^li_[\w_]+/],
  TRACKING_PREFIXES: new Set(['__cf_', '_bta', '_ga_', '_gat_', '_gid_', '_hs', '_oly_', 'action_', 'ad_', 'adjust_', 'aff_', 'af_', 'alg_', 'at_', 'bd_', 'bsft_', 'campaign_', 'cj', 'cm_', 'content_', 'creative_', 'fb_', 'from_', 'gcl_', 'guce_', 'hmsr_', 'hsa_', 'ir_', 'itm_', 'li_', 'matomo_', 'medium_', 'mkt_', 'ms_', 'mt_', 'mtm', 'pk_', 'piwik_', 'placement_', 'ref_', 'share_', 'source_', 'space_', 'term_', 'trk_', 'tt_', 'ttc_', 'vsm_', 'li_fat_', 'linkedin_']),
  TRACKING_PREFIXES_REGEX: [/_ga_/, /^tt_[\w_]+/, /^li_[\w_]+/],
  COSMETIC_PARAMS: new Set(['fb_ref', 'fb_source', 'from', 'ref', 'share_id', 'source', 'spot_im_redirect_source']),
  PARAMS_TO_KEEP_WHITELIST: new Set(['code', 'id', 'item', 'p', 'page', 'product_id', 'q', 'query', 'search', 'session_id', 'state', 't', 'targetid', 'token', 'v', 'callback', 'filter', 'format', 'lang', 'locale', 'status', 'timestamp', 'type', 'access_token', 'client_assertion', 'client_id', 'device_id', 'nonce', 'redirect_uri', 'refresh_token', 'response_type', 'scope', 'direction', 'limit', 'offset', 'order', 'page_number', 'size', 'sort', 'sort_by', 'aff_sub', 'click_id', 'deal_id', 'offer_id', 'cancel_url', 'error_url', 'return_url', 'success_url']),
  PATH_BLOCK_REGEX: [/^\/(?!_next\/static\/|static\/|assets\/|dist\/|build\/|public\/)[a-z0-9]{12,}\.js$/i, /[^\/]*sentry[^\/]*\.js/i, /\/v\d+\/event/i, /\/collect$/i, /\/service\/collect$/i, /\/api\/v\d+\/collect$/i],
  HEURISTIC_PATH_BLOCK_REGEX: [/[a-z0-9\-_]{32,}\.(js|mjs)$/i],
  PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS: new Map([['graph.facebook.com', new Set(['/v19.0/', '/v20.0/'])]]),
};
// #################################################################################################
// #                                                                                               #
// #                             🚀 HYPER-OPTIMIZED CORE ENGINE (V40.72+)                           #
// #                                                                                               #
// #################################################################################################

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function')
  ? () => performance.now()
  : () => Date.now();

const DECISION = Object.freeze({ ALLOW: 1, BLOCK: 2, PARAM_CLEAN: 3, SOFT_WHITELISTED: 4, ALLOW_DOMAIN: 5 });
const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif', 'Content-Length': '43' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE   = { response: { status: 403 } };
const DROP_RESPONSE     = { response: {} };
const NO_CONTENT_RESPONSE = { response: { status: 204 } };
const REDIRECT_RESPONSE = (url) => ({ response: { status: 302, headers: { 'Location': url } } });
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);
const FAST_URL_PARSE_REGEX = /^(?:https?:)\/\/([^\/]+)(\/[^?#]*)?.*$/;

class ScriptExecutionError extends Error {
  constructor(message, context = {}) { super(message); this.name = 'ScriptExecutionError'; this.context = context; this.timestamp = new Date().toISOString(); }
}

// [V40.72] 引入 Aho-Corasick 自動機，用於線性時間多模式匹配
class AhoCorasick {
    constructor(keywords) { this.root = { children: {}, output: [], failure: null }; this.build(keywords); }
    build(keywords) {
        for (const keyword of keywords) { let node = this.root; for (const char of keyword) { node = node.children[char] || (node.children[char] = { children: {}, output: [], failure: null }); } node.output.push(keyword); }
        const queue = [];
        for (const node of Object.values(this.root.children)) { node.failure = this.root; queue.push(node); }
        while (queue.length > 0) {
            const current = queue.shift();
            for (const [char, next] of Object.entries(current.children)) {
                let failure = current.failure;
                while (failure && !failure.children[char]) { failure = failure.failure; }
                next.failure = failure ? failure.children[char] : this.root;
                next.output.push(...next.failure.output);
                queue.push(next);
            }
        }
    }
    search(text) {
        let node = this.root;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            while (node && !node.children[char]) { node = node.failure; }
            node = node ? node.children[char] : this.root;
            if (node.output.length > 0) return true;
        }
        return false;
    }
}
class ReversedTrie { constructor() { this.root = {}; } insert(word) { let n = this.root; for (const c of word) n = n[c] || (n[c] = {}); n.isEnd = true; } startsWith(prefix) { let n = this.root; for (const c of prefix) { if (!n[c]) return false; n = n[c]; if (n.isEnd) return true; } return false; } }

// [V40.72] 精簡快取鍵，使用巢狀 Map 降低 GC 壓力
class HierarchicalCache {
    constructor(maxSize) { this.cache = new Map(); this.maxSize = maxSize; this.size = 0; }
    _getNamespace(ns) { let nsCache = this.cache.get(ns); if (!nsCache) { nsCache = new Map(); this.cache.set(ns, nsCache); } return nsCache; }
    get(ns, key) { const nsCache = this.cache.get(ns); return nsCache ? nsCache.get(key) : null; }
    set(ns, key, value) { const nsCache = this._getNamespace(ns); if (!nsCache.has(key)) this.size++; nsCache.set(key, value); if (this.size > this.maxSize) { const oldestNs = this.cache.keys().next().value; this.cache.get(oldestNs).delete(this.cache.get(oldestNs).keys().next().value); this.size--; } }
}

class MultiLevelCacheManager {
  constructor() { this.l1DomainCache = new HierarchicalCache(256); this.l2UrlDecisionCache = new HierarchicalCache(1024); this.urlObjectCache = new HierarchicalCache(64); }
  getDomainDecision(h) { return this.l1DomainCache.get('domain', h); }
  setDomainDecision(h, d) { this.l1DomainCache.set('domain', h, d); }
  getUrlDecision(ns, k) { const decision = this.l2UrlDecisionCache.get(ns, k); if (decision !== null) globalStats.increment('l2CacheHits'); return decision; }
  setUrlDecision(ns, k, d) { this.l2UrlDecisionCache.set(ns, k, d); }
  getParsedUrl(rawUrl) { return this.urlObjectCache.get('url', rawUrl); }
  setParsedUrl(rawUrl, urlObj) { this.urlObjectCache.set('url', rawUrl, urlObj); }
}

let COMPILED_BLOCK_DOMAINS_REGEX, COMPILED_GLOBAL_TRACKING_PARAMS_REGEX, COMPILED_TRACKING_PREFIXES_REGEX, COMPILED_PATH_BLOCK_REGEX, COMPILED_HEURISTIC_PATH_BLOCK_REGEX;
const multiLevelCache = new MultiLevelCacheManager();
const REVERSED_DOMAIN_BLOCK_TRIE = new ReversedTrie();
let PATH_BLOCK_AC;

// [V40.72] 引入階段性效能度量
class PerformanceStats {
    constructor() {
        this.reset();
        this.labels = ['totalRequests', 'blockedRequests', 'domainBlocked', 'pathBlocked', 'regexPathBlocked', 'criticalScriptBlocked', 'paramsCleaned', 'hardWhitelistHits', 'softWhitelistHits', 'errors', 'l1CacheHits', 'l2CacheHits'];
        this.stageLabels = ['total', 'urlParsing', 'whitelist', 'domainBlock', 'criticalCheck', 'pathBlock', 'paramClean'];
    }
    reset() {
        this.counts = {}; this.labels.forEach(l => this.counts[l] = 0);
        this.timings = {}; this.stageLabels.forEach(s => this.timings[s] = { total: 0, hits: 0 });
    }
    increment(type) { if(this.counts[type] !== undefined) this.counts[type]++; }
    recordTime(stage, time) { if(this.timings[stage]) { this.timings[stage].total += time; this.timings[stage].hits++; } }
    getStats() {
        const stats = { ...this.counts };
        if (CONFIG.PERFORMANCE_PROFILING.ENABLED) {
            stats.perf = {};
            for (const stage of this.stageLabels) {
                const { total, hits } = this.timings[stage];
                stats.perf[stage] = { total: parseFloat(total.toFixed(3)), hits, avg: hits > 0 ? parseFloat((total / hits).toFixed(3)) : 0 };
            }
        }
        return stats;
    }
}
const globalStats = new PerformanceStats();
const categorizedStats = new Map();

function initializeCoreEngine() {
    PATH_BLOCK_AC = new AhoCorasick([...CONFIG.PATH_BLOCK_KEYWORDS, ...CONFIG.CRITICAL_TRACKING_GENERIC_PATHS]);
    CONFIG.BLOCK_DOMAINS.forEach(domain => REVERSED_DOMAIN_BLOCK_TRIE.insert(domain.split('').reverse().join('')));
    
    const compile = (list) => list.map(r => r instanceof RegExp ? r : new RegExp(r)).filter(Boolean);
    COMPILED_BLOCK_DOMAINS_REGEX = compile(CONFIG.BLOCK_DOMAINS_REGEX);
    COMPILED_GLOBAL_TRACKING_PARAMS_REGEX = compile(CONFIG.GLOBAL_TRACKING_PARAMS_REGEX);
    COMPILED_TRACKING_PREFIXES_REGEX = compile(CONFIG.TRACKING_PREFIXES_REGEX);
    COMPILED_PATH_BLOCK_REGEX = compile(CONFIG.PATH_BLOCK_REGEX);
    COMPILED_HEURISTIC_PATH_BLOCK_REGEX = compile(CONFIG.HEURISTIC_PATH_BLOCK_REGEX);

    if (CONFIG.PERFORMANCE_PROFILING.ENABLED) {
        CONFIG.PERFORMANCE_PROFILING.CATEGORIES.forEach((_, key) => categorizedStats.set(key, new PerformanceStats()));
    }
}

function getWhitelistMatchDetails(hostname, exactSet, wildcardSet) {
    if (exactSet.has(hostname)) return { matched: true, rule: hostname, type: 'Exact' };
    let domain = hostname;
    while (true) { if (wildcardSet.has(domain)) return { matched: true, rule: domain, type: 'Wildcard' }; const i = domain.indexOf('.'); if (i === -1) break; domain = domain.substring(i + 1); }
    return { matched: false };
}

function isDomainBlocked(hostname) {
    if (REVERSED_DOMAIN_BLOCK_TRIE.startsWith(hostname.split('').reverse().join(''))) return true;
    for (const regex of COMPILED_BLOCK_DOMAINS_REGEX) { if (regex.test(hostname)) return true; }
    return false;
}

function isCriticalTrackingScript(hostname, path) {
    const cached = multiLevelCache.getUrlDecision('crit', path);
    if (cached !== null) return cached;
    
    const slashIndex = path.lastIndexOf('/');
    const scriptName = slashIndex !== -1 ? path.slice(slashIndex + 1) : path;
    if (scriptName && CONFIG.CRITICAL_TRACKING_SCRIPTS.has(scriptName.split('?')[0])) { multiLevelCache.setUrlDecision('crit', path, true); return true; }
    
    const hostPrefixes = CONFIG.CRITICAL_TRACKING_MAP.get(hostname);
    if (hostPrefixes) {
        if (hostPrefixes.size === 0) { multiLevelCache.setUrlDecision('crit', path, true); return true; }
        for (const prefix of hostPrefixes) { if (path.startsWith(prefix)) { multiLevelCache.setUrlDecision('crit', path, true); return true; } }
    }
    multiLevelCache.setUrlDecision('crit', path, false); return false;
}

function isPathExplicitlyAllowed(path) {
    const check = (p, rule) => { for (const kw of CONFIG.HIGH_CONFIDENCE_TRACKER_KEYWORDS_IN_PATH) if (p.includes(kw)) return false; return true; };
    for (const sub of CONFIG.PATH_ALLOW_SUBSTRINGS) if (path.includes(sub)) return check(path, `sub:${sub}`);
    const segs = path.substring(1).split('/'); for (const seg of segs) if (CONFIG.PATH_ALLOW_SEGMENTS.has(seg)) return check(path, `seg:${seg}`);
    for (const suf of CONFIG.PATH_ALLOW_SUFFIXES) if (path.endsWith(suf)) return check(path.substring(0, path.lastIndexOf('/')), `suf:${suf}`);
    return false;
}

function getBlockResponse(path) {
    for (const keyword of CONFIG.DROP_KEYWORDS) if (path.includes(keyword)) return DROP_RESPONSE;
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex !== -1 && SCRIPT_EXTENSIONS.has(path.substring(dotIndex))) return NO_CONTENT_RESPONSE;
    return REJECT_RESPONSE;
}

function cleanTrackingParams(urlObj) {
    let modified = false; const toDelete = [];
    for (const key of urlObj.searchParams.keys()) {
        const lowerKey = key.toLowerCase();
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(lowerKey)) continue;
        const firstChar = lowerKey[0];
        // [V40.72] 參數前置分類，降低 Regex 負擔
        if (firstChar === '_' || firstChar === 'g' || firstChar === 'f' || firstChar === 'm' || firstChar === 'y' || firstChar === 't') {
            if (CONFIG.GLOBAL_TRACKING_PARAMS.has(lowerKey)) { toDelete.push(key); modified = true; continue; }
            for (const regex of COMPILED_GLOBAL_TRACKING_PARAMS_REGEX) if (regex.test(lowerKey)) { toDelete.push(key); modified = true; break; }
        }
    }
    if (modified) { toDelete.forEach(k => urlObj.searchParams.delete(k)); if(urlObj.search) urlObj.hash = 'cleaned'; return urlObj; }
    return null;
}

function processRequest(request) {
  let stageStart, totalStart = __now__();
  let currentStats = globalStats;
  currentStats.increment('totalRequests');

  const rawUrl = request.url;
  if (!rawUrl || rawUrl.length < 10) return null;

  // [V40.72] 階段1: URL 解析與分類
  stageStart = __now__();
  let parsedUrl = multiLevelCache.getParsedUrl(rawUrl);
  if (!parsedUrl) {
    const match = rawUrl.match(FAST_URL_PARSE_REGEX);
    if (match) {
        parsedUrl = { href: rawUrl, hostname: match[1].toLowerCase(), pathname: match[2] || '/', search: rawUrl.substring(rawUrl.indexOf('?')), isFast: true };
    } else {
        try { parsedUrl = new URL(rawUrl); parsedUrl.hostname = parsedUrl.hostname.toLowerCase(); } catch (e) { return null; }
    }
    // [V40.72] 移除 Object.freeze，允許 JIT 優化
    multiLevelCache.setParsedUrl(rawUrl, parsedUrl);
  }
  
  if (CONFIG.PERFORMANCE_PROFILING.ENABLED) {
    for (const [category, hosts] of CONFIG.PERFORMANCE_PROFILING.CATEGORIES) {
        let domain = parsedUrl.hostname;
        while(true) { if(hosts.has(domain)) { currentStats = categorizedStats.get(category); break; } const i = domain.indexOf('.'); if(i===-1) break; domain = domain.substring(i+1); }
        if (currentStats !== globalStats) break;
    }
  }
  currentStats.recordTime('urlParsing', __now__() - stageStart);
  
  // [V40.72] 階段2: 白名單檢查
  stageStart = __now__();
  const { hostname, pathname } = parsedUrl;
  const hardWhitelist = getWhitelistMatchDetails(hostname, CONFIG.HARD_WHITELIST_EXACT, CONFIG.HARD_WHITELIST_WILDCARDS);
  if (hardWhitelist.matched) { currentStats.increment('hardWhitelistHits'); currentStats.recordTime('whitelist', __now__() - stageStart); currentStats.recordTime('total', __now__() - totalStart); return null; }
  
  const softWhitelist = getWhitelistMatchDetails(hostname, CONFIG.SOFT_WHITELIST_EXACT, CONFIG.SOFT_WHITELIST_WILDCARDS);
  if (softWhitelist.matched) {
    currentStats.increment('softWhitelistHits');
    const cleaned = cleanTrackingParams(parsedUrl.isFast ? new URL(rawUrl) : parsedUrl);
    if (cleaned) { currentStats.increment('paramsCleaned'); currentStats.recordTime('paramClean', __now__() - stageStart); return REDIRECT_RESPONSE(cleaned.toString()); }
    currentStats.recordTime('whitelist', __now__() - stageStart); currentStats.recordTime('total', __now__() - totalStart); return null;
  }
  currentStats.recordTime('whitelist', __now__() - stageStart);

  // [V40.72] 階段3: 域名封鎖檢查
  stageStart = __now__();
  const l1Decision = multiLevelCache.getDomainDecision(hostname);
  if (l1Decision === DECISION.BLOCK) {
    currentStats.increment('l1CacheHits'); currentStats.increment('domainBlocked'); currentStats.increment('blockedRequests'); return getBlockResponse(pathname);
  }
  if (l1Decision !== DECISION.ALLOW_DOMAIN) {
      if (isDomainBlocked(hostname)) {
        const exemptions = CONFIG.PATH_EXEMPTIONS_FOR_BLOCKED_DOMAINS.get(hostname);
        if (!exemptions || ![...exemptions].some(ex => pathname.startsWith(ex))) {
          multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
          currentStats.increment('domainBlocked'); currentStats.increment('blockedRequests'); return getBlockResponse(pathname);
        }
      } else {
        multiLevelCache.setDomainDecision(hostname, DECISION.ALLOW_DOMAIN);
      }
  }
  currentStats.recordTime('domainBlock', __now__() - stageStart);

  // [V40.72] 階段4: 關鍵追蹤檢查
  stageStart = __now__();
  if (isCriticalTrackingScript(hostname, pathname)) {
    currentStats.increment('criticalScriptBlocked'); currentStats.increment('blockedRequests');
    currentStats.recordTime('criticalCheck', __now__() - stageStart); currentStats.recordTime('total', __now__() - totalStart);
    return getBlockResponse(pathname);
  }
  currentStats.recordTime('criticalCheck', __now__() - stageStart);

  // [V40.72] 階段5: 路徑封鎖檢查
  stageStart = __now__();
  const allowCacheKey = pathname;
  let isAllowed = multiLevelCache.getUrlDecision('allow', allowCacheKey);
  if (isAllowed === null) { isAllowed = isPathExplicitlyAllowed(pathname); multiLevelCache.setUrlDecision('allow', allowCacheKey, isAllowed); }

  if (!isAllowed) {
      if (PATH_BLOCK_AC.search(pathname)) {
          currentStats.increment('pathBlocked'); currentStats.increment('blockedRequests'); return getBlockResponse(pathname);
      }
      for (const regex of COMPILED_PATH_BLOCK_REGEX) if (regex.test(pathname)) { currentStats.increment('regexPathBlocked'); currentStats.increment('blockedRequests'); return getBlockResponse(pathname); }
      for (const regex of COMPILED_HEURISTIC_PATH_BLOCK_REGEX) if (regex.test(pathname)) { currentStats.increment('regexPathBlocked'); currentStats.increment('blockedRequests'); return getBlockResponse(pathname); }
  }
  currentStats.recordTime('pathBlock', __now__() - stageStart);
  
  // [V40.72] 階段6: 參數清理
  stageStart = __now__();
  const cleanedUrl = cleanTrackingParams(parsedUrl.isFast ? new URL(rawUrl) : parsedUrl);
  if (cleanedUrl) {
      currentStats.increment('paramsCleaned');
      currentStats.recordTime('paramClean', __now__() - stageStart); currentStats.recordTime('total', __now__() - totalStart);
      return REDIRECT_RESPONSE(cleanedUrl.toString());
  }
  currentStats.recordTime('paramClean', __now__() - stageStart);
  currentStats.recordTime('total', __now__() - totalStart);
  return null;
}

(function () {
  try {
    initializeCoreEngine();
    if (typeof $request === 'undefined') {
      if (typeof $done !== 'undefined') $done({ version: '40.72', status: 'ready' }); return;
    }
    const result = processRequest($request);
    if (typeof $done !== 'undefined') {
        const finalStats = { global: globalStats.getStats() };
        if (CONFIG.PERFORMANCE_PROFILING.ENABLED) {
            finalStats.categorized = {};
            categorizedStats.forEach((stats, category) => { finalStats.categorized[category] = stats.getStats(); });
        }
        $done(result ? { ...result, stats: finalStats } : { stats: finalStats });
    }
  } catch (e) {
    if (typeof $done !== 'undefined') $done({});
  }
})();
