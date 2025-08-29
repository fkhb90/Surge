/**

@file URL-Ultimate-Filter-Surge-V25-Optimized.js
@version 25.1-Optimized
@baseline V25 (Core & Taiwan + China Expansion only; NO V27 additions)
@description 基於 V25 版本進行可靠性與性能優化；修正 /xx/ytag.js 攔截穩定性；不擴充名單，不使用 Trie。
@author You
@lastUpdated 2025-08-29 */
/* ============================ ⚙️ 可調整開關 ============================ */
const DEBUG = false;                 // 設為 true 以輸出除錯訊息
const ENABLE_STATS = true;           // 是否啟用統計
const ENABLE_CACHES = true;          // 是否啟用簡易快取 (單執行生命週期)
const STRICT_SCRIPT_MATCH = true;    // 僅精確檔名匹配 (true)；若設為 false 會使用 /ytag.js 片段兜底
const CLEAN_REDIRECT_STATUS = 302;   // 參數清理後使用的重導狀態碼 (302 or 301)

/* ============================ 🚫 域名攔截黑名單 (V25) ============================ */
const BLOCK_DOMAINS = new Set([
// Core & Taiwan Lists (V25)
'doubleclick.net','google-analytics.com','googletagmanager.com','googleadservices.com',
'googlesyndication.com','admob.com','adsense.com','scorecardresearch.com','chartbeat.com',
'graph.facebook.com','connect.facebook.net','analytics.twitter.com','static.ads-twitter.com',
'ads.linkedin.com','criteo.com','taboola.com','outbrain.com','pubmatic.com','rubiconproject.com',
'openx.net','adsrvr.org','adform.net','semasio.net','yieldlab.net','app-measurement.com',
'branch.io','appsflyer.com','adjust.com','sentry.io','bugsnag.com','hotjar.com','vwo.com',
'optimizely.com','mixpanel.com','amplitude.com','heap.io','loggly.com','c.clarity.ms',
'track.hubspot.com','api.pendo.io','adcolony.com','adroll.com','adsnative.com','bidswitch.net',
'casalemedia.com','conversantmedia.com','media.net','soom.la','spotxchange.com','teads.tv',
'tremorhub.com','yieldmo.com','zemanta.com','flashtalking.com','indexexchange.com','magnite.com',
'gumgum.com','inmobi.com','mopub.com','sharethrough.com','smartadserver.com','applovin.com',
'ironsrc.com','unityads.unity3d.com','vungle.com','yandex.ru','adriver.ru','criteo.net','adnx.com',
'rlcdn.com','fullstory.com','inspectlet.com','mouseflow.com','crazyegg.com','clicktale.net',
'kissmetrics.com','keen.io','segment.com','segment.io','mparticle.com','snowplowanalytics.com',
'newrelic.com','nr-data.net','datadoghq.com','logrocket.com','sumo.com','sumome.com','disqus.com',
'disquscdn.com','addthis.com','sharethis.com','po.st','cbox.ws','intensedebate.com','onesignal.com',
'pushengage.com','sail-track.com','piwik.pro','matomo.cloud','clicky.com','statcounter.com',
'quantserve.com','comscore.com','revjet.com','popads.net','propellerads.com','adcash.com',
'zeropark.com','admitad.com','awin1.com','cj.com','impactradius.com','linkshare.com',
'rakutenadvertising.com','appnexus.com','contextweb.com','openx.com','spotx.tv','onetrust.com',
'cookielaw.org','trustarc.com','sourcepoint.com','liveintent.com','narrative.io','neustar.biz',
'tapad.com','thetradedesk.com','bluekai.com','clickforce.com.tw','tagtoo.co','urad.com.tw',
'cacafly.com','is-tracking.com','vpon.com','ad-specs.guoshipartners.com','sitetag.us','imedia.com.tw',
'ad.ettoday.net','ad.pixnet.net','ad.pchome.com.tw','ad.momo.com.tw','ad.xuite.net','ad.cna.com.tw',
'ad.cw.com.tw','ad.hi-on.org','adm.chinatimes.com','analysis.tw','trk.tw','fast-trk.com','gamani.com',
'tenmax.io','aotter.net','funp.com','ad.ruten.com.tw','ad.books.com.tw','ad.etmall.com.tw',
'ad.shopping.friday.tw','ad-hub.net','adgeek.net','ad.shopee.tw',
// V25 China Expansion
'umeng.com','umeng.co','umeng.cn','cnzz.com','talkingdata.com','talkingdata.cn',
'hm.baidu.com','pos.baidu.com','cpro.baidu.com','eclick.baidu.com','usp1.baidu.com',
'pingjs.qq.com','wspeed.qq.com','ads.tencent.com','gdt.qq.com','ta.qq.com',
'tanx.com','alimama.com','log.mmstat.com',
'getui.com','jpush.cn','jiguang.cn',
'gridsum.com','admaster.com.cn','miaozhen.com'
]);

/* ============================ ✅ API 白名單 (V25) ============================ /
const API_WHITELIST_EXACT = new Set([
'youtubei.googleapis.com','i.instagram.com','graph.instagram.com','graph.threads.net',
'open.spotify.com','accounts.google.com','appleid.apple.com','login.microsoftonline.com',
'api.github.com','api.openai.com','api.anthropic.com','api.cohere.ai','api.vercel.com',
'api.netlify.com','api.heroku.com','api.digitalocean.com','firestore.googleapis.com',
'database.windows.net','api.stripe.com','api.paypal.com','api.adyen.com',
'api.braintreegateway.com','auth.docker.io','login.docker.com','api.notion.com',
'api.figma.com','api.telegram.org','api.slack.com','api.discord.com','api.twitch.tv',
'okta.com','auth0.com','api.trello.com','api.asana.com','api.intercom.io','api.sendgrid.com',
'api.mailgun.com','.atlassian.net','hooks.slack.com','api.pagerduty.com','sso.godaddy.com',
'api.cloudflare.com','api.fastly.com','api.zende.sk','api.hubapi.com','api.dropboxapi.com',
'api.ecpay.com.tw','payment.ecpay.com.tw','api.line.me','api.jkos.com','api.esunbank.com.tw',
'api.cathaybk.com.tw','api.ctbcbank.com','tixcraft.com','kktix.com','netbank.bot.com.tw',
'ebank.megabank.com.tw','ibank.firstbank.com.tw','netbank.hncb.com.tw','mma.sinopac.com',
'richart.tw','api.irentcar.com.tw','ebank.tcb-bank.com.tw','ibanking.scsb.com.tw',
'ebank.taipeifubon.com.tw','nbe.standardchartered.com.tw','usiot.roborock.com'
]);

const API_WHITELIST_WILDCARDS = new Map([
['youtube.com',true],['m.youtube.com',true],['googlevideo.com',true],['paypal.com',true],
['stripe.com',true],['apple.com',true],['icloud.com',true],['windowsupdate.com',true],
['amazonaws.com',true],['cloudfront.net',true],['inoreader.com',true],
['theoldreader.com',true],['newsblur.com',true],['flipboard.com',true],['itofoo.com',true],
['fastly.net',true],['akamaihd.net',true],['cloudflare.com',true],['jsdelivr.net',true],
['unpkg.com',true],['cdnjs.cloudflare.com',true],['gstatic.com',true],['fbcdn.net',true],
['twimg.com',true],['github.io',true],['gitlab.io',true],['windows.net',true],
['pages.dev',true],['vercel.app',true],['netlify.app',true],['update.microsoft.com',true],
['okta.com',true],['auth0.com',true],['atlassian.net',true],['azurewebsites.net',true],
['cloudfunctions.net',true],['oraclecloud.com',true],['digitaloceanspaces.com',true],
['swscan.apple.com',true],['gsp-ssl.ls.apple.com',true],['fubon.com',true],['bot.com.tw',true],
['megabank.com.tw',true],['firstbank.com.tw',true],['hncb.com.tw',true],['chb.com.tw',true],
['taishinbank.com.tw',true],['sinopac.com',true],['tcb-bank.com.tw',true],['scsb.com.tw',true],
['standardchartered.com.tw',true]
]);

/* ============================ 🚨 關鍵追蹤腳本 / 路徑 (V25) ============================ */
const CRITICAL_TRACKING_SCRIPTS = new Set([
// Core
'ytag.js','gtag.js','gtm.js','ga.js','analytics.js','adsbygoogle.js','ads.js','fbevents.js','fbq.js',
'pixel.js','connect.js','tracking.js','tracker.js','tag.js','doubleclick.js','adsense.js','adloader.js',
'hotjar.js','mixpanel.js','amplitude.js','segment.js','clarity.js','matomo.js','piwik.js','fullstory.js',
'heap.js','inspectlet.js','logrocket.js','vwo.js','optimizely.js','criteo.js','pubmatic.js','outbrain.js',
'taboola.js','prebid.js','apstag.js','utag.js','beacon.js','event.js','collect.js','activity.js',
'conversion.js','action.js','abtasty.js','cmp.js','sp.js','adobedtm.js','visitorapi.js','intercom.js',
'link-click-tracker.js','user-timing.js','cf.js','tagtoo.js',
// China expansion
'hm.js','u.js','um.js','aplus.js','aplus_wap.js','gdt.js'
]);

const CRITICAL_TRACKING_PATTERNS = new Set([
// Core
'/googletagmanager/','/google-analytics/','/googlesyndication/','/doubleclick/','/googleadservices/','google.com/ads',
'google.com/pagead','/pagead/gen_204','facebook.com/tr','facebook.com/tr/','/collect?','/track/','/v1/event',
'/v1/events','/events/','/beacon/','/pixel/','/telemetry/','/api/log/','/api/track/','/api/collect/',
'/api/v1/track','scorecardresearch.com/beacon.js','analytics.twitter.com','ads.linkedin.com/li/track',
'amazon-adsystem.com/e/ec','ads.yahoo.com/pixel','ads.bing.com/msclkid','segment.io/v1/track',
'heap.io/api/track','api.mixpanel.com/track','api.amplitude.com','/v2/event','/v2/events','/intake','/batch',
'/abtesting/','/feature-flag/','/user-profile/','api-iam.intercom.io/messenger/web/events',
'api.hubspot.com/events','/b/ss','/i/adsct','cacafly/track','/track/m','/track/pc',
// China expansion
'hm.baidu.com/hm.js','cnzz.com/stat.php','wgo.mmstat.com','/log/aplus','/v.gif','gdt.qq.com/gdt_mview.fcg'
]);

/* ============================ ✅ 路徑白名單 (V25) ============================ */
const PATH_ALLOW_PATTERNS = new Set([
'chunk.js','chunk.mjs','polyfill.js','fetch-polyfill','browser.js','sw.js','loader.js','header.js',
'head.js','padding.css','badge.svg','modal.js','card.js','download','upload','payload','broadcast',
'roadmap','gradient','shadow','board','dialog','blog','catalog','game','language','page','page-data.js',
'legacy.js','article','assets','cart','chart','start','parts','partner','amp-anim','amp-animation',
'amp-iframe','api','service','endpoint','webhook','callback','oauth','auth','login','register','profile',
'dashboard','admin','config','settings','preference','notification','message','chat','comment','review',
'rating','search','filter','sort','category','media','image','video','audio','document','pdf','export',
'import','backup','restore','sync','feed','rss','atom','xml','opml','subscription','subscribe',
'collections','boards','streams','contents','preferences','folders','entries','items','posts','articles',
'sources','categories','bundle.js','main.js','app.js','vendor.js','runtime.js','common.js','util.js',
'script.js','index.js','index.mjs','main.mjs','app.mjs','vendor.mjs','runtime.mjs','framework.js',
'framework.mjs','polyfills.js','polyfills.mjs','styles.js','styles.css','icon.svg','logo.svg',
'favicon.ico','manifest.json','robots.txt','_next/static/','_app/','_nuxt/','static/js/','static/css/',
'static/media/','i18n/','locales/','theme.js','config.js','web.config','sitemap.xml','chunk-vendors',
'chunk-common','component---'
]);

/* ============================ 🚫 路徑黑名單 (V25) ============================ */
const PATH_BLOCK_KEYWORDS = new Set([
'/ad/','/ads/','/adv/','/advert/','/advertisement/','/advertising/','/affiliate/','/sponsor/','/promoted/',
'/banner/','/popup/','/interstitial/','/preroll/','/midroll/','/postroll/','/track/','/trace/','/tracker/',
'/tracking/','/analytics/','/analytic/','/metric/','/metrics/','/telemetry/','/measurement/','/insight/',
'/intelligence/','/monitor/','/monitoring/','/log/','/logs/','logger','/logging/','/logrecord/','/putlog/',
'/audit/','/event/','/beacon/','/pixel/','/collect?','/collector/','/report/','/reports/','/reporting/',
'/sentry/','/bugsnag/','/crash/','/error/','/exception/','/stacktrace/','google_ad','pagead','adsbygoogle',
'doubleclick','adsense','dfp','google-analytics','fbevents','fbq','addthis','sharethis','taboola','criteo',
'osano','onead','sailthru','tapfiliate','appier','hotjar','comscore','mixpanel','amplitude','amp-ad',
'amp-analytics','amp-auto-ads','amp-sticky-ad','amp4ads','prebid','apstag','pwt.js','utag.js','rtb','dsp',
'ssp','cookiepolicy','gdpr','ccpa','plusone','optimize','pushnotification','ad_logic','ad-choices',
'ad-manager','ad-server','ad-tag','ad_pixel','ad-request','ad-system','ad-tech','ad-wrapper','ad-loader',
'ad-placement','user-analytics','behavioral-targeting','data-collection','data-sync','fingerprint',
'fingerprinting','third-party-cookie','user-cohort','web-vitals','performance-tracking',
'real-user-monitoring','attribution','retargeting','audience','cohort','user-segment','ad-metrics',
'ad-events','ad-impression','ad-click','ad-view','ad-engagement','ad-conversion','user-behavior',
'session-replay','privacy-policy','cookie-consent'
]);

/* ============================ 💧 丟棄關鍵字 (V25) ============================ */
const DROP_KEYWORDS = new Set([
'log','logs','logger','logging','amp-loader','amp-analytics','beacon','collect?','collector','telemetry',
'crash','error-report','metric','insight','audit','event-stream','ingest','live-log','realtime-log',
'data-pipeline','rum','intake','batch','diag','client-event','server-event','heartbeat'
]);

/* ============================ 🗑️ 追蹤參數黑名單 (V25) ============================ */
const GLOBAL_TRACKING_PARAMS = new Set([
// Core & Taiwan Lists
'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','utm_source_platform',
'utm_creative_format','utm_marketing_tactic','gclid','dclid','gclsrc','wbraid','gbraid','gad_source','gad',
'gcl_au','msclkid','yclid','msad','mscampaignid','msadgroupid','fbclid','fbadid','fbcampaignid','fbadsetid',
'fbplacementid','igshid','igsh','x-threads-app-object-id','mibextid','mc_cid','mc_eid','mkt_tok',
'email_source','email_campaign','from','source','ref','referrer','campaign','medium','content','spm','scm',
'share_source','share_medium','share_plat','share_id','share_tag','from_source','from_channel','from_uid',
'from_user','tt_from','tt_medium','tt_campaign','share_token','share_app_id','xhsshare','xhs_share',
'app_platform','share_from','weibo_id','wechat_id','is_copy_url','is_from_webapp','pvid','fr','type','scene',
'clickid','traceid','request_id','__twitter_impression','_openstat','hsCtaTracking','hsa_acc','hsa_cam',
'hsa_grp','hsa_ad','hsa_src','vero_conv','vero_id','ck_subscriber_id','action_object_map','action_type_map',
'action_ref_map','feature','src','si','trk','trk_params','ttclid','twclid','li_fat_id','epik','piwik_campaign',
'piwik_kwd','matomo_campaign','matomo_kwd','_bta_c','_bta_tid','oly_anon_id','oly_enc_id',
'redirect_log_mongo_id','redirect_mongo_id','sb_referer_host','ecid','from_ad','from_search','from_promo',
'camid','cupid',
// China expansion
'hmsr','hmpl','hmcu','hmkw','hmci','union_id','biz','mid','idx'
]);

/* ============================ 🔎 追蹤參數前綴 (保持 V25 基礎) ============================ */
const TRACKING_PREFIX_REGEX = /^(utm_|ga_|fb_|gcl_|ms_|mc_|mkt_|matomo_|piwik_|hsa_|ad_|trk_|spm_|scm_|bd_|vero_|cf|hs|pk|mtm|campaign_|source_|medium_|content_|term_|creative_|placement_|network_|device_|ref_|from_|share_|aff_|li_|tt_|tw_|epik_|bta|oly|cam_|gdr_|gds_|et_|hmsr_|zanpid_|ga|gid|gat|s_)/;

/* ============================ 🧪 其他常量 ============================ */
const IMAGE_EXT_REGEX = /.(gif|svg|png|jpe?g|webp|ico)(?:[?#]|$)/i;

/* ============================ 🧩 簡易快取 ============================ */
const cache = ENABLE_CACHES ? {
whitelist: new Map(),
domainBlock: new Map(),
pathAllow: new Map(),
pathBlock: new Map(),
script: new Map()
} : null;

/* ============================ 🛠️ 工具函式 ============================ */
function debug(...a){ if (DEBUG && typeof console!=='undefined') console.log('[V25-OPT]',...a); }

function isApiWhitelisted(host){
if (cache && cache.whitelist.has(host)) return cache.whitelist.get(host);
if (API_WHITELIST_EXACT.has(host)){
cache && cache.whitelist.set(host,true);
return true;
}
for (const [d] of API_WHITELIST_WILDCARDS){
if (host===d || host.endsWith('.'+d)){
cache && cache.whitelist.set(host,true);
return true;
}
}
cache && cache.whitelist.set(host,false);
return false;
}

function isDomainBlocked(host){
if (cache && cache.domainBlock.has(host)) return cache.domainBlock.get(host);
// 子域逐級檢查避免誤殺
const parts = host.split('.');
for (let i=0;i<parts.length;i++){
const sub = parts.slice(i).join('.');
if (BLOCK_DOMAINS.has(sub)){
cache && cache.domainBlock.set(host,true);
return true;
}
}
cache && cache.domainBlock.set(host,false);
return false;
}

function normalizePathOnly(path){
if (!path) return '/';
let p = path;
// 去掉 query/hash
const q = p.indexOf('?'); if (q!==-1) p = p.slice(0,q);
const h = p.indexOf('#'); if (h!==-1) p = p.slice(0,h);
while (p.length>1 && p.endsWith('/')) p = p.slice(0,-1);
return p;
}

function extractFileName(path){
const clean = normalizePathOnly(path);
const idx = clean.lastIndexOf('/');
return idx>=0 ? clean.slice(idx+1) : clean;
}

function isCriticalTrackingScript(path){
if (cache && cache.script.has(path)) return cache.script.get(path);
const file = extractFileName(path).toLowerCase();
let hit = false;
if (CRITICAL_TRACKING_SCRIPTS.has(file)){
hit = true;
} else if (!STRICT_SCRIPT_MATCH && path.includes('/ytag.js')) {
// 安全兜底 (僅在 STRICT_SCRIPT_MATCH = false 時啟用)
hit = true;
} else {
for (const pattern of CRITICAL_TRACKING_PATTERNS){
if (path.includes(pattern)){
hit = true;
break;
}
}
}
cache && cache.script.set(path,hit);
return hit;
}

function isPathAllowed(p){
if (cache && cache.pathAllow.has(p)) return cache.pathAllow.get(p);
for (const allow of PATH_ALLOW_PATTERNS){
if (p.includes(allow)){
cache && cache.pathAllow.set(p,true);
return true;
}
}
cache && cache.pathAllow.set(p,false);
return false;
}

function isPathBlocked(p){
if (cache && cache.pathBlock.has(p)) return cache.pathBlock.get(p);
if (isPathAllowed(p)){
cache && cache.pathBlock.set(p,false);
return false;
}
for (const k of PATH_BLOCK_KEYWORDS){
if (p.includes(k)){
cache && cache.pathBlock.set(p,true);
return true;
}
}
cache && cache.pathBlock.set(p,false);
return false;
}

function shouldDrop(p){
for (const k of DROP_KEYWORDS){
if (p.includes(k)) return true;
}
return false;
}

function cleanTrackingParams(urlObj){
let changed = false;
const keys = Array.from(urlObj.searchParams.keys());
for (const k of keys){
const lk = k.toLowerCase();
if (GLOBAL_TRACKING_PARAMS.has(lk) || TRACKING_PREFIX_REGEX.test(lk)){
urlObj.searchParams.delete(k);
changed = true;
}
}
return changed;
}

/* ============================ 📊 統計 ============================ /
class Stats{
constructor(){
this.s = {
total:0,whitelist:0,critical:0,domain:0,path:0,params:0,blocked:0,errors:0
};
}
inc(k){ if (this.s[k]!=null) this.s[k]++; }
summary(){ const {total,blocked}=this.s;
return { ...this.s, blockRate: total? (blocked/total100).toFixed(2)+'%':'0%' };
}
}
const stats = ENABLE_STATS ? new Stats() : null;

/* ============================ 🚀 響應模板 ============================ */
const RESPONSES = {
gif: {
response:{
status:200,
headers:{'Content-Type':'image/gif'},
body:'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
}
},
reject:{ response:{ status:403 }},
drop:{ response:{} },
redirect:(u)=>({ response:{ status:CLEAN_REDIRECT_STATUS, headers:{ Location:u }}})
};

function buildBlockResponse(path){
if (shouldDrop(path)) return RESPONSES.drop;
if (IMAGE_EXT_REGEX.test(path)) return RESPONSES.gif;
return RESPONSES.reject;
}

/* ============================ 🎯 主處理流程 ============================ */
function processRequest(req){
stats && stats.inc('total');
if (!req || !req.url) return null;
let urlObj;
try {
urlObj = new URL(req.url);
} catch(e){
stats && stats.inc('errors');
return null;
}

const host = urlObj.hostname.toLowerCase();
const pathFull = (urlObj.pathname + urlObj.search).toLowerCase();

// Step 1: API 白名單
if (isApiWhitelisted(host)){
stats && stats.inc('whitelist');
debug('WHITELIST',host);
return null;
}

// Step 2: 關鍵追蹤腳本 / 路徑
if (isCriticalTrackingScript(pathFull) || isCriticalTrackingScript(urlObj.pathname.toLowerCase())){
stats && stats.inc('critical');
stats && stats.inc('blocked');
debug('BLOCK script',pathFull);
return buildBlockResponse(pathFull);
}

// Step 3: 域名黑名單
if (isDomainBlocked(host)){
stats && stats.inc('domain');
stats && stats.inc('blocked');
debug('BLOCK domain',host);
return buildBlockResponse(pathFull);
}

// Step 4: 路徑黑名單
if (isPathBlocked(pathFull)){
stats && stats.inc('path');
stats && stats.inc('blocked');
debug('BLOCK path',pathFull);
return buildBlockResponse(pathFull);
}

// Step 5: 參數清理
if (cleanTrackingParams(urlObj)){
stats && stats.inc('params');
debug('CLEAN params -> redirect', urlObj.toString());
return RESPONSES.redirect(urlObj.toString());
}

return null;
}

/* ============================ 🏁 執行入口 ============================ */
(function main(){
try{
if (typeof $request === 'undefined'){
if (typeof $done === 'function'){
$done({
status:'ready',
version:'25.1-Optimized',
message:'URL Filter V25 Base Optimized'
});
}
return;
}
const res = processRequest($request);
if (ENABLE_STATS && DEBUG){
debug('STATS', stats.summary());
}
if (typeof $done === 'function') $done(res || {});
}catch(err){
stats && stats.inc('errors');
if (typeof console!=='undefined') console.error('[V25-OPT] Fatal:',err);
if (typeof $done==='function') $done({});
}
})();

/* ============================ 📝 更新日誌 (V25.1-Optimized) ============================
日期: 2025-08-29

以 V25 名單為唯一基礎：

未加入任何 V27「New Additions」域名 / 腳本 / 路徑 / 參數。
僅保留「Core & Taiwan Lists」+「China Expansion」。
修正 ytag.js 攔截：

新增 extractFileName/normalizePathOnly，支援末尾斜線 /ytag.js/ 與 ?query、#hash。
精確檔名比對確保 .../xx/ytag.js 正確攔截。
提供 STRICT_SCRIPT_MATCH 開關；如需針對變體 fallback 可改 false。
結構與效能優化（不引入 Trie）：

加入可選 Map 快取 (ENABLE_CACHES) 減少重複判斷。
白名單 → 關鍵腳本/路徑 → 域名 → 路徑黑名單 → 參數清理，流程清晰。
isDomainBlocked 使用子域逐級方式避免誤殺。
相容性：

僅使用 ES6 在 Surge (iOS) JSCore 可支持的語法。
無持久化、無異步、無巨大常量初始化成本。
可調整參數：

DEBUG、ENABLE_STATS、ENABLE_CACHES、STRICT_SCRIPT_MATCH、CLEAN_REDIRECT_STATUS。
未做的事：

未擴充任何名單。
未使用 Trie、未壓縮代碼，保持可讀性。
未寬鬆匹配 ytag.js 版本化（符合你要求保守策略）。
如需：

Minified 版本
將 STRICT_SCRIPT_MATCH 設為 false 並加 ytag.js 前綴寬鬆
顯示統計於 console 或注入自定標頭 請再回覆指示。 ================================================================================ */
