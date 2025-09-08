/**
 * @file        URL-Ultimate-Filter-Surge-V38.3-complete-updated-v2.js
 * @version     38.3-complete-updated-v2 (含完整黑白名單與萬用字元事件攔截)
 * @description 完整黑白名單、白名單與攔截邏輯，包含Trie、LRU快取與請求處理。新增 /v.*/event 攔截規則。
 * @author      Claude & Gemini & Acterus (+ Final Polish)
 * @lastUpdated 2025-09-08
 */

// #################################################################################################
// #                                          配置區                                              #
// #################################################################################################

const CONFIG = {
  BLOCK_DOMAINS: new Set([
    'doubleclick.net', 'ad.doubleclick.net', 'bid.g.doubleclick.net', 'stats.g.doubleclick.net', 'securepubads.g.doubleclick.net',
    'google-analytics.com', 'googletagmanager.com', 'googleadservices.com', 'googlesyndication.com',
    'admob.com', 'adsense.com', 'app-measurement.com', 'adservice.google.com', 'pagead2.googlesyndication.com',
    'graph.facebook.com', 'connect.facebook.net',
    'scorecardresearch.com', 'chartbeat.com', 'analytics.twitter.com', 'static.ads-twitter.com', 'ads.linkedin.com',
    'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'pubmatic.com', 'rubiconproject.com',
    'openx.net', 'openx.com', 'adsrvr.org', 'adform.net', 'semasio.net', 'yieldlab.net', 'branch.io',
    'appsflyer.com', 'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com',
    'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms', 'track.hubspot.com', 'api.pendo.io',
    'fullstory.com', 'inspectlet.com', 'mouseflow.com', 'crazyegg.com', 'clicktale.net', 'kissmetrics.com',
    'keen.io', 'segment.com', 'segment.io', 'mparticle.com', 'snowplowanalytics.com', 'newrelic.com',
    'nr-data.net', 'datadoghq.com', 'logrocket.com', 'sumo.com', 'sumome.com', 'piwik.pro', 'matomo.cloud',
    'clicky.com', 'statcounter.com', 'quantserve.com', 'comscore.com', 'tealium.com', 'collector.newrelic.com',
    'analytics.line.me',
    'doubleverify.com', 'moatads.com', 'moat.com', 'iasds.com', 'serving-sys.com',
    'agkn.com', 'tags.tiqcdn.com',
    'adcolony.com', 'adroll.com', 'adsnative.com', 'bidswitch.net', 'casalemedia.com', 'conversantmedia.com',
    'media.net', 'soom.la', 'spotxchange.com', 'teads.tv', 'tremorhub.com', 'yieldmo.com', 'zemanta.com',
    'flashtalking.com', 'indexexchange.com', 'magnite.com', 'gumgum.com', 'inmobi.com', 'mopub.com',
    'sharethrough.com', 'smartadserver.com', 'applovin.com', 'ironsrc.com', 'unityads.unity3d.com', 'vungle.com',
    'appnexus.com', 'contextweb.com', 'spotx.tv', 'liveintent.com', 'narrative.io', 'neustar.biz', 'tapad.com',
    'thetradedesk.com', 'bluekai.com', 'amazon-adsystem.com', 'aax.amazon-adsystem.com', 'fls-na.amazon.com',
    'ib.adnxs.com', 'adserver.yahoo.com', 'ads.yahoo.com', 'analytics.yahoo.com', 'geo.yahoo.com',
    'adswizz.com', 'sitescout.com', 'ad.yieldmanager.com', 'creativecdn.com', 'cr-serving.com', 'yieldify.com', 'go-mpulse.net',
    'popads.net', 'propellerads.com', 'adcash.com', 'zeropark.com',
    'admitad.com', 'awin1.com', 'cj.com', 'impactradius.com', 'linkshare.com', 'rakutenadvertising.com',
    'yandex.ru', 'adriver.ru',
    'disqus.com', 'disquscdn.com', 'addthis.com', 'sharethis.com', 'po.st', 'cbox.ws', 'intensedebate.com',
    'onesignal.com', 'pushengage.com', 'sail-track.com',
    'onetrust.com', 'cookielaw.org', 'trustarc.com', 'sourcepoint.com', 'usercentrics.eu',
    'clickforce.com.tw', 'tagtoo.co', 'urad.com.tw', 'cacafly.com', 'is-tracking.com', 'vpon.com',
    'ad-specs.guoshipartners.com', 'sitetag.us', 'imedia.com.tw', 'ad.ettoday.net', 'ad.pixnet.net',
    'ad.pchome.com.tw', 'ad.momo.com.tw', 'ad.xuite.net', 'ad.cna.com.tw', 'ad.cw.com.tw',
    'ad.hi-on.org', 'adm.chinatimes.com', 'analysis.tw', 'trk.tw', 'fast-trk.com', 'gamani.com',
    'tenmax.io', 'aotter.net', 'funp.com', 'ad.ruten.com.tw', 'ad.books.com.tw', 'ad.etmall.com.tw',
    'ad.shopping.friday.tw', 'ad-hub.net', 'adgeek.net', 'ad.shopee.tw', 'rq.vpon.com',
    'umeng.com', 'umeng.co', 'umeng.cn', 'cnzz.com', 'talkingdata.com', 'talkingdata.cn', 'hm.baidu.com',
    'pos.baidu.com', 'cpro.baidu.com', 'eclick.baidu.com', 'usp1.baidu.com', 'pingjs.qq.com', 'wspeed.qq.com',
    'ads.tencent.com', 'gdt.qq.com', 'ta.qq.com', 'tanx.com', 'alimama.com', 'log.mmstat.com',
    'getui.com', 'jpush.cn', 'jiguang.cn', 'gridsum.com', 'admaster.com.cn', 'miaozhen.com',
    'su.baidu.com', 'mobads.baidu.com', 'mta.qq.com', 'log.tmall.com', 'ad.kuaishou.com',
    'pangolin-sdk-toutiao.com', 'zhugeio.com', 'growingio.com', 'youmi.net', 'adview.cn', 'igexin.com',
    'wcs.naver.net', 'adnx.com', 'rlcdn.com', 'revjet.com',
    'ads-api.tiktok.com', 'analytics.tiktok.com', 'tr.snapchat.com', 'sc-static.net', 'ads.pinterest.com',
    'log.pinterest.com', 'analytics.snapchat.com', 'ads-api.twitter.com', 'ads.youtube.com', 'cint.com',
  ]),

  API_WHITELIST_HARD_EXACT: new Set([]),

  API_WHITELIST_SOFT_EXACT: new Set([
    'youtubei.googleapis.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
    'open.spotify.com', 'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    'api.github.com', 'api.openai.com', 'api.anthropic.com', 'a-api.anthropic.com', 'api.cohere.ai',
    'gemini.google.com', 'api.telegram.org', 'api.slack.com', 'api.discord.com', 'api.twitch.tv',
    'api.vercel.com', 'api.netlify.com', 'api.heroku.com', 'api.digitalocean.com', 'firestore.googleapis.com',
    'database.windows.net', 'auth.docker.io', 'login.docker.com', 'api.cloudflare.com', 'api.fastly.com',
    'api.stripe.com', 'api.paypal.com', 'api.adyen.com', 'api.braintreegateway.com',
    'api.notion.com', 'api.figma.com', 'api.trello.com', 'api.asana.com', 'api.dropboxapi.com', 'clorasio.atlassian.net',
    'okta.com', 'auth0.com', 'sso.godaddy.com',
    'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.line.me', 'api.jkos.com', 'api.esunbank.com.tw',
    'api.cathaybk.com.tw', 'api.ctbcbank.com', 'tixcraft.com', 'kktix.com', 'netbank.bot.com.tw',
    'ebank.megabank.com.tw', 'ibank.firstbank.com.tw', 'netbank.hncb.com.tw', 'mma.sinopac.com',
    'richart.tw', 'api.irentcar.com.tw', 'ebank.tcb-bank.com.tw', 'ibanking.scsb.com.tw',
    'ebank.taipeifubon.com.tw', 'nbe.standardchartered.com.tw', 'usiot.roborock.com', 'cmapi.tw.coupang.com',
    'api.intercom.io', 'api.sendgrid.com', 'api.mailgun.com', 'hooks.slack.com', 'api.pagerduty.com',
    'api.zendesk.com', 'api.hubapi.com', 'secure.gravatar.com', 'legy.line-apps.com', 'obs.line-scdn.net',
    'duckduckgo.com', 'external-content.duckduckgo.com'
  ]),

  API_WHITELIST_WILDCARDS: new Set([
    'youtube.com', 'm.youtube.com', 'googlevideo.com', 'paypal.com', 'stripe.com', 'apple.com', 'icloud.com',
    'windowsupdate.com', 'update.microsoft.com', 'amazonaws.com', 'cloudfront.net', 'fastly.net',
    'akamaihd.net', 'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'gstatic.com',
    'fbcdn.net', 'twimg.com', 'inoreader.com', 'theoldreader.com', 'newsblur.com', 'flipboard.com',
    'itofoo.com', 'github.io', 'gitlab.io', 'windows.net', 'pages.dev', 'vercel.app', 'netlify.app',
    'azurewebsites.net', 'cloudfunctions.net', 'oraclecloud.com', 'digitaloceanspaces.com', 'okta.com',
    'auth0.com', 'atlassian.net', 'shopee.tw', 'fubon.com', 'bot.com.tw', 'megabank.com.tw', 'firstbank.com.tw',
    'hncb.com.tw', 'chb.com.tw', 'taishinbank.com.tw', 'sinopac.com', 'tcb-bank.com.tw', 'scsb.com.tw',
    'standardchartered.com.tw', 'web.archive.org', 'web-static.archive.org', 'archive.is', 'archive.today',
    'archive.ph', 'archive.li', 'archive.vn', 'webcache.googleusercontent.com', 'cc.bingj.com', 'perma.cc',
    'www.webarchive.org.uk', 'timetravel.mementoweb.org'
  ]),

  CRITICAL_TRACKING_SCRIPTS: new Set([
    'ytag.js', 'gtag.js', 'gtm.js', 'ga.js', 'analytics.js', 'adsbygoogle.js', 'ads.js',
    'fbevents.js', 'fbq.js', 'pixel.js', 'connect.js', 'tracking.js', 'tracker.js', 'tag.js',
    'doubleclick.js', 'adsense.js', 'adloader.js', 'hotjar.js', 'mixpanel.js', 'amplitude.js',
    'segment.js', 'clarity.js', 'matomo.js', 'piwik.js', 'fullstory.js', 'heap.js', 'inspectlet.js',
    'logrocket.js', 'vwo.js', 'optimizely.js', 'criteo.js', 'pubmatic.js', 'outbrain.js', 'taboola.js',
    'prebid.js', 'apstag.js', 'utag.js', 'beacon.js', 'event.js', 'collect.js', 'activity.js',
    'conversion.js', 'action.js', 'abtasty.js', 'cmp.js', 'sp.js', 'adobedtm.js', 'visitorapi.js',
    'intercom.js', 'link-click-tracker.js', 'user-timing.js', 'cf.js', 'tagtoo.js', 'wcslog.js',
    'ads-beacon.js', 'hm.js', 'u.js', 'um.js', 'aplus.js', 'gdt.js', 'tiktok-pixel.js',
    'pangle.js', 'ec.js', 'autotrack.js', 'capture.js', 'user-id.js', 'adroll.js', 'quant.js',
    'comscore.js', 'dax.js', 'chartbeat.js', 'crazyegg.js', 'mouseflow.js', 'newrelic.js',
    'nr-loader.js', 'perf.js', 'trace.js', 'tracking-api.js', 'scevent.min.js', 'ad-sdk.js',
    'ad-manager.js', 'ad-player.js'
  ]),

  CRITICAL_TRACKING_PATTERNS: new Set([
    '/googletagmanager/', '/google-analytics/', '/googlesyndication/', '/doubleclick/', '/googleadservices/',
    'google.com/ads', 'google.com/pagead', '/pagead/gen_204', '/collect', '/track', '/beacon', '/pixel',
    '/telemetry', '/api/log', '/api/track', '/api/collect', '/api/v1/track', '/intake', '/api/batch',
    'facebook.com/tr', 'scorecardresearch.com/beacon.js', 'analytics.twitter.com/li/track',
    'amazon-adsystem.com/e/ec', 'segment.io/v1/track', 'heap.io/api/track', 'api.mixpanel.com/track',
    'api.amplitude.com', 'api-iam.intercom.io/messenger/web/events', 'api.hubspot.com/events',
    'hm.baidu.com/hm.js', 'cnzz.com/stat.php', '/log/aplus', '/v.gif', 'gdt.qq.com/gdt_mview.fcg',
    '/abtesting/', '/feature-flag/', '/user-profile/', '/b/ss', '/i/adsct', 'cacafly/track', '/track/m',
    '/track/pc', '/v1/pixel', 'ads.tiktok.com/i1n/pixel/events.js', 'analytics.snapchat.com/v1/batch',
    'tr.snapchat.com', 'sc-static.net/scevent.min.js', '/ad/v1/event', 'ads.pinterest.com/v3/conversions/events',
    '/ad-call', '/adx/', '/adserver/', '/adsync/', '/adtech/'
  ]),

  PATH_BLOCK_KEYWORDS: new Set([
    '/ad/', '/ads/', '/adv/', '/advert/', '/advertising/', '/affiliate/', '/sponsor/', '/promoted/', '/banner/',
    '/popup/', '/interstitial/', '/preroll/', 'google_ad', 'pagead', 'adsbygoogle', 'doubleclick', 'adsense',
    'dfp', 'amp-ad', 'prebid', 'apstag', 'rtb', 'dsp', 'ssp', 'ad_logic', 'ad-choices', 'ad-manager',
    'ad-server', 'ad-tag', 'ad_pixel', 'ad-request', 'ad-system', 'ad-tech', 'ad-wrapper', 'ad-loader',
    'ad-placement', 'ad-metrics', 'ad-events', 'ad-impression', 'ad-click', 'ad-view', 'ad-break',
    'ad_event', 'ad-inventory', 'ad-specs', 'ad-verification', 'ad-viewability', 'ad-exchange', 'ad-network',
    'ad-platform', 'ad-response', 'ad-slot', 'ad-unit', 'ad-call', '/adserve/', '/adserving/', '/adframe/',
    '/adrequest/', '/getads/', '/getad/', '/fetch_ads/', '/track/', '/trace/', '/tracker/', '/tracking/',
    '/analytics/', '/metric/', '/metrics/', '/telemetry/', '/measurement/', '/insight/', '/monitor/', '/log/',
    '/logs/', 'logger', '/logging/', '/audit/', '/beacon/', '/pixel/', '/collect?', '/collector/', '/report/',
    '/sentry/', '/bugsnag/', '/crash/', '/error/', '/exception/', 'web-vitals', 'performance-tracking',
    'user-analytics', 'behavioral-targeting', 'data-collection', 'fingerprinting', 'third-party-cookie',
    'attribution', 'retargeting', 'audience', 'cohort', 'user-segment', 'session-replay', 'google-analytics',
    'fbevents', 'fbq', 'addthis', 'sharethis', 'taboola', 'criteo', 'osano', 'onead', 'sailthru',
    'tapfiliate', 'appier', 'hotjar', 'comscore', 'mixpanel', 'amplitude', 'utag.js', 'cookiepolicy',
    'gdpr', 'ccpa', 'plusone', 'optimize', 'pushnotification', 'privacy-policy', 'cookie-consent'
  ]),

  PATH_ALLOW_PATTERNS: new Set([
    'chunk.js', 'chunk.mjs', 'bundle.js', 'main.js', 'app.js', 'vendor.js', 'runtime.js', 'common.js',
    'framework.js', 'framework.mjs', 'polyfills.js', 'polyfills.mjs', 'styles.js', 'styles.css', 'index.js',
    'polyfill.js', 'fetch-polyfill', 'browser.js', 'sw.js', 'loader.js', 'header.js', 'head.js', 'padding.css',
    'badge.svg', 'modal.js', 'card.js', 'icon.svg', 'logo.svg', 'favicon.ico', 'manifest.json', 'robots.txt',
    'page-data.js', 'legacy.js', 'sitemap.xml', 'chunk-vendors', 'chunk-common', 'component---',
    '_next/static/', '_app/', '_nuxt/', 'static/js/', 'static/css/', 'static/media/', 'i18n/', 'locales/',
    'theme.js', 'config.js', 'web.config'
  ]),

  DROP_KEYWORDS: new Set([
    'amp-analytics', 'csp-report', 'crash', 'error-report', 'heartbeat', 'web-vitals', 'profiler',
    'event-stream', 'ingest', 'live-log', 'realtime-log', 'data-pipeline', 'rum', 'intake', 'batch', 'diag'
  ]),

  DROP_REGEX: [
    /(?:^|[\\/._?-])log(?:s|ging)?(?:[\\/._?-]|$)/i,
    /(?:^|[\\/])(?:beacon|collect|collector)(?:[\\/?.]|$)/i,
  ],

  GLOBAL_TRACKING_PARAMS: new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'dclid', 'fbclid',
    'msclkid', 'mc_eid', 'igshid', 'zanpid', 'affid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'ref'
  ]),

  TRACKING_PREFIXES: new Set([
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mkt_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'vero_'
  ]),

  PARAMS_TO_KEEP_WHITELIST: new Set(['t', 'v', 'id']),

  // [更新] 新增 /v.*/event 萬用字元攔截規則
  PATH_BLOCK_REGEX: [
    /^\/[a-z0-9]{12,}\.js$/i,
    /[^\/]*sentry[^\/]*\.js/i,
    /\/v.*\/event/i
  ]
};

// #################################################################################################
// #                                     核心代碼區                                              #
// #################################################################################################

const __now__ = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? () => performance.now() : () => Date.now();

const DECISION = Object.freeze({
  ALLOW: 1,
  BLOCK: 2
});

const TINY_GIF_RESPONSE = { response: { status: 200, headers: { 'Content-Type': 'image/gif' }, body: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } };
const REJECT_RESPONSE = { response: { status: 403 } };

const IMAGE_EXTENSIONS = new Set(['.gif', '.svg', '.png', 'jpg', 'jpeg', 'webp', 'ico']);

class OptimizedTrie {
  constructor() { this.root = {}; }
  insert(key) { let n = this.root; for(let c of key) { if (!n[c]) n[c] = {}; n = n[c]; } n.isEndOfWord = true; }
  contains(text) { for (let i = 0; i < text.length; i++) { let n = this.root; for (let j = i; j < text.length; j++) { let c = text[j]; if (!n[c]) break; n = n[c]; if (n.isEndOfWord) return true; } } return false; }
  startsWith(prefix) { let n = this.root; for(let c of prefix) { if (!n[c]) return false; n = n[c]; } return true; }
}

class HighPerformanceLRUCache {
    constructor(maxSize = 1000) { this.maxSize = maxSize; this.cache = new Map(); this.head = {k:null,v:null,p:null,n:null}; this.tail = {k:null,v:null,p:null,n:null}; this.head.n = this.tail; this.tail.p = this.head; }
    _add(n) { n.p = this.head; n.n = this.head.n; this.head.n.p = n; this.head.n = n; }
    _remove(n) { n.p.n = n.n; n.n.p = n.p; }
    get(k) { const n = this.cache.get(k); if(n){this._remove(n);this._add(n);return n.v;} return null; }
    set(k, v) { let n = this.cache.get(k); if(n){ n.v = v; this._remove(n); this._add(n); } else { n = {k,v,p:null,n:null}; if(this.cache.size >= this.maxSize){ const t = this.tail.p; this._remove(t); this.cache.delete(t.k); } this.cache.set(k,n); this._add(n); } }
}

class MultiLevelCacheManager {
    constructor() { this.l1 = new HighPerformanceLRUCache(256); this.l2 = new HighPerformanceLRUCache(1024); this.urlObj = new HighPerformanceLRUCache(64); }
    getDomainDecision(h) { return this.l1.get(h); }
    setDomainDecision(h,d) { this.l1.set(h,d); }
    getUrlDecision(k) { return this.l2.get(k); }
    setUrlDecision(k,d) { this.l2.set(k,d); }
    getUrlObject(r) { return this.urlObj.get(r); }
    setUrlObject(r,o) { this.urlObj.set(r,o); }
}

const multiLevelCache = new MultiLevelCacheManager();
const OPTIMIZED_TRIES = {
  prefix: new OptimizedTrie(), criticalPattern: new OptimizedTrie(), pathBlock: new OptimizedTrie(),
  allow: new OptimizedTrie(), drop: new OptimizedTrie()
};

function initializeOptimizedTries() {
    for(let k of CONFIG.TRACKING_PREFIXES) OPTIMIZED_TRIES.prefix.insert(k);
    for(let k of CONFIG.CRITICAL_TRACKING_PATTERNS) OPTIMIZED_TRIES.criticalPattern.insert(k);
    for(let k of CONFIG.PATH_BLOCK_KEYWORDS) OPTIMIZED_TRIES.pathBlock.insert(k);
    for(let k of CONFIG.PATH_ALLOW_PATTERNS) OPTIMIZED_TRIES.allow.insert(k);
    for(let k of CONFIG.DROP_KEYWORDS) OPTIMIZED_TRIES.drop.insert(k);
}

function getWhitelistStatus(host) {
    if (CONFIG.API_WHITELIST_HARD_EXACT.has(host)) return 2;
    let current = host;
    while(true){
        if(CONFIG.API_WHITELIST_SOFT_EXACT.has(current) || CONFIG.API_WHITELIST_WILDCARDS.has(current)) return 1;
        const d = current.indexOf('.'); if (d === -1) break; current = current.slice(d+1);
    }
    return 0;
}

function isOptimizedDomainBlocked(h) {
    let c = h;
    while(c){ if(CONFIG.BLOCK_DOMAINS.has(c)) return true; const i=c.indexOf('.'); if(i === -1)break; c=c.slice(i+1); }
    return false;
}

function isOptimizedCriticalTrackingScript(path) {
    const k = `crit:${path}`; const c = multiLevelCache.getUrlDecision(k); if(c!==null) return c;
    const s = path.lastIndexOf('/'); const n = s !== -1 ? path.slice(s+1).split('?')[0] : path.split('?')[0];
    const b = CONFIG.CRITICAL_TRACKING_SCRIPTS.has(n) || OPTIMIZED_TRIES.criticalPattern.contains(path);
    multiLevelCache.setUrlDecision(k,b); return b;
}

function isOptimizedPathBlocked(path) {
    const k = `path:${path}`; const c = multiLevelCache.getUrlDecision(k); if(c!==null) return c;
    const r = OPTIMIZED_TRIES.pathBlock.contains(path) && !OPTIMIZED_TRIES.allow.contains(path);
    multiLevelCache.setUrlDecision(k,r); return r;
}

function isOptimizedPathBlockedByRegex(path) {
    const k = `regex:${path}`; const c = multiLevelCache.getUrlDecision(k); if(c!==null) return c;
    for(const regex of CONFIG.PATH_BLOCK_REGEX){ if(regex.test(path)){multiLevelCache.setUrlDecision(k,true);return true;} }
    multiLevelCache.setUrlDecision(k,false); return false;
}

function isDropPath(pathLower) {
    for(const regex of CONFIG.DROP_REGEX){ if(regex.test(pathLower)) return true; }
    return OPTIMIZED_TRIES.drop.contains(pathLower);
}

function getOptimizedBlockResponse(path) {
    if(isDropPath(path.toLowerCase())) return REJECT_RESPONSE;
    const dot = path.lastIndexOf('.');
    if(dot !== -1 && IMAGE_EXTENSIONS.has(path.slice(dot+1).toLowerCase())) return TINY_GIF_RESPONSE;
    return REJECT_RESPONSE;
}

function optimizedCleanTrackingParams(urlObj) {
    const cloned = new URL(urlObj.href); let toDelete = null;
    for (const key of cloned.searchParams.keys()) {
        if (CONFIG.PARAMS_TO_KEEP_WHITELIST.has(key)) continue;
        if (CONFIG.GLOBAL_TRACKING_PARAMS.has(key) || OPTIMIZED_TRIES.prefix.startsWith(key)) {
            if (!toDelete) toDelete = []; toDelete.push(key);
        }
    }
    if (toDelete) { toDelete.forEach(k => cloned.searchParams.delete(k)); return cloned; }
    return null;
}

function processOptimizedRequest(request) {
    try {
        if (!request?.url || request.url.length < 10) return null;
        const rawUrl = request.url;
        let url = multiLevelCache.getUrlObject(rawUrl);
        if (!url) { try { url = new URL(rawUrl); multiLevelCache.setUrlObject(rawUrl, url); } catch (e) { return null; } }
        const hostname = url.hostname.toLowerCase();
        const wl = getWhitelistStatus(hostname);
        if (wl === 2) return null;
        const isSoftWhitelist = wl === 1;
        if (!isSoftWhitelist && multiLevelCache.getDomainDecision(hostname) === DECISION.BLOCK) {
            return getOptimizedBlockResponse(url.pathname + url.search);
        }
        if (isOptimizedDomainBlocked(hostname)) {
            if (!isSoftWhitelist) multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
            return getOptimizedBlockResponse(url.pathname + url.search);
        }
        const fullPath = url.pathname + url.search;
        if (isOptimizedCriticalTrackingScript(fullPath) || isOptimizedPathBlocked(fullPath) || isOptimizedPathBlockedByRegex(url.pathname)) {
            if (!isSoftWhitelist) multiLevelCache.setDomainDecision(hostname, DECISION.BLOCK);
            return getOptimizedBlockResponse(fullPath);
        }
        const cleaned = optimizedCleanTrackingParams(url);
        if (cleaned && cleaned.href !== url.href) {
            return { response: { status: 302, headers: { Location: cleaned.href } } };
        }
        return null;
    } catch (e) { return null; }
}

(function () {
  try {
    initializeOptimizedTries();
    if (typeof $request === 'undefined') {
      if (typeof $done !== 'undefined') $done({ version: '38.3-complete-updated-v2' });
      return;
    }
    const result = processOptimizedRequest($request);
    if (typeof $done !== 'undefined') $done(result || {});
  } catch (e) { if (typeof $done !== 'undefined') $done({}); }
})();
