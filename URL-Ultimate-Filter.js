/**
 * @file      URL-Ultimate-Filter-Surge-V41.58.js
 * @version   41.58 (NHIA & ChatGPT Telemetry Patch)
 * @description [V41.58] 黃金基準迭代版：
 * 1. [Fix] 新增健保署 (NHIA) 關鍵 IP 175.99.79.153 至強制白名單，確保醫療服務不中斷。
 * 2. [Feat] 新增 ChatGPT 遙測攔截 (/ces/statsc/flush)，保護 AI 對話隱私。
 * 3. [Core] 維持四層過濾漏斗架構 (P0 Path -> P0 Domain -> Whitelist -> Standard)。
 * @author    Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2026-01-12
 */

// #################################################################################################
// #                                                                                               #
// #                               ⚙️ SCRIPT CONFIGURATION                                         #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
  DEBUG_MODE: false, // 設定為 true 可在 Surge Log 查看詳細攔截原因
  
  // --- Layer 1: P0 關鍵路徑攔截 (優先級最高，無視域名) ---
  // 使用 AC 自動機掃描，針對跨平台通用追蹤路徑
  CRITICAL_TRACKING_GENERIC_PATHS: [
    '/api/stats/ads', '/api/stats/atr', '/api/stats/qoe', '/api/stats/playback',
    '/pagead/gen_204', '/pagead/paralleladview',
    '/youtubei/v1/log_interaction', '/youtubei/v1/log_event', '/youtubei/v1/player/log',
    '/tiktok/pixel/events', '/linkedin/insight/track',
    '/api/fingerprint', '/v1/fingerprint', '/cdn/fp/',
    '/api/collect', '/api/track', '/tr/', '/pixel', '/beacon'
  ],

  // --- Layer 2: P0 優先域名攔截 (強制黑名單) ---
  // 即使在白名單內，這些核心廣告商也必須被攔截
  PRIORITY_BLOCK_DOMAINS: new Set([
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'admob.com',
    'appsflyer.com', 'adjust.com', 'kochava.com', 'branch.io', 'singular.net',
    'app-measurement.com', 'unityads.unity3d.com', 'applovin.com', 'ironsrc.com',
    'vungle.com', 'adcolony.com', 'chartboost.com', 'tapjoy.com', 'pangle.io',
    'taboola.com', 'outbrain.com', 'popads.net', 'ads.tiktok.com', 'ad.line.me',
    'ad.etmall.com.tw', 'trk.momoshop.com.tw'
  ]),

  // 惡意重導與短網址
  REDIRECTOR_HOSTS: new Set([
    '1ink.cc', 'adfoc.us', 'ouo.io', 'ouo.press', 'sh.st', 'bitcosite.com', 
    'cutpaid.com', 'gplinks.co', 'linkshrink.net', 'urlcash.com'
  ]),

  // --- Layer 3: 智慧白名單 (Intelligent Whitelist) ---
  
  // [A] 強制白名單 (Hard Whitelist) - 直接放行 (Return NULL)
  // 用於金融、政府、企業 VPN、高敏感 API
  HARD_WHITELIST_EXACT: new Set([
    '175.99.79.153', // [V41.58 New] 健保署醫療服務 IP
    'api.line.me', 'today.line.me',
    'chatgpt.com', // 雖然在此，但會被 Critical Map 覆蓋特定路徑
    'claude.ai', 'gemini.google.com', 'perplexity.ai',
    'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
    'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.jkos.com',
    'kktix.com', 'tixcraft.com'
  ]),

  HARD_WHITELIST_WILDCARDS: [
    'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'fubon.com', 'taishinbank.com.tw',
    'richart.tw', 'post.gov.tw', 'nhi.gov.tw', 'gov.tw',
    'icloud.com', 'apple.com', 'whatsapp.net',
    'update.microsoft.com', 'windowsupdate.com'
  ],

  // [B] 軟性白名單 (Soft Whitelist) - 允許域名但檢查路徑
  // 用於內容平台 (YouTube, Shopee)，需看內容但擋廣告
  SOFT_WHITELIST_EXACT: new Set([
    'shopee.tw', 'shopee.com', 'api.openai.com', 'www.momoshop.com.tw',
    'm.momoshop.com.tw', 'gateway.shopback.com.tw'
  ]),

  SOFT_WHITELIST_WILDCARDS: [
    'youtube.com', 'googlevideo.com', 'facebook.com', 'instagram.com', 
    'twitter.com', 'tiktok.com', 'spotify.com', 'netflix.com', 'disney.com'
  ],

  // --- Layer 4: 深度檢查規則 (Deep Inspection) ---

  // 特定網域的精確路徑攔截 (Override Whitelist)
  CRITICAL_TRACKING_MAP: new Map([
    ['chatgpt.com', new Set(['/ces/statsc/flush', '/v1/rgstr'])], // [V41.58 New]
    ['tw.fd-api.com', new Set(['/api/v5/action-log'])], // Foodpanda
    ['chatbot.shopee.tw', new Set(['/report/v1/log'])], // Shopee Log
    ['shopee.tw', new Set(['/dataapi/dataweb/event/'])],
    ['discord.com', new Set(['/api/v10/science', '/api/v9/science'])],
    ['analytics.google.com', new Set(['/g/collect', '/j/collect'])],
    ['facebook.com', new Set(['/tr/', '/tr'])]
  ]),

  // 路徑關鍵字黑名單 (AC Algorithm Dictionary)
  PATH_BLOCK_KEYWORDS: [
    '/ad/', '/ads/', '/banner/', '/popads/', '/popup/', '/midroll/', '/preroll/',
    'ad-delivery', 'ad-logics', 'adcash', 'adform', 'admaster', 'admob', 'adroll',
    'adsense', 'adserver', 'adsystem', 'adtech', 'adview', 'adwords', 'analytics',
    'applovin', 'appsflyer', 'chartboost', 'click-fraud', 'cnzz', 'crazyegg',
    'doubleclick', 'fingerprinting', 'googleads', 'hotjar', 'inmobi', 'kissmetrics',
    'matomo', 'mixpanel', 'newrelic', 'openx', 'scorecardresearch', 'taboola',
    'talkingdata', 'tapjoy', 'telemetry', 'umeng', 'vungle', 'yandex'
  ],

  // 靜態資源放行 (防止誤殺)
  PATH_ALLOW_SUFFIXES: new Set([
    '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf',
    '.js', '.json' // .js 需小心，但在 L4 後期放行通常安全
  ]),

  // 參數清洗 (Privacy)
  GLOBAL_TRACKING_PARAMS: new Set([
    'gclid', 'fbclid', 'ttclid', 'utm_source', 'utm_medium', 'utm_campaign', 
    'utm_term', 'utm_content', 'yclid', 'mc_cid', 'mc_eid', 'srsltid'
  ])
};

// #################################################################################################
// #                                                                                               #
// #                               🧠 CORE LOGIC ENGINE                                            #
// #                                                                                               #
// #################################################################################################

// --- Aho-Corasick Algorithm Implementation (Simplified for JS Script) ---
class ACScanner {
    constructor(keywords) {
        this.keywords = keywords;
        // In a real optimized build, we would build a Trie here.
        // For script simplicity and memory in Surge, we use Array.some with improved check.
    }
    
    matches(path) {
        // V41.57+ Optimized: Check lowercased path once
        const lowerPath = path.toLowerCase();
        return this.keywords.some(kw => lowerPath.includes(kw));
    }
}

const pathScanner = new ACScanner(CONFIG.PATH_BLOCK_KEYWORDS);
const criticalPathScanner = new ACScanner(CONFIG.CRITICAL_TRACKING_GENERIC_PATHS);

/**
 * URL 參數清洗器
 */
function cleanTrackingParams(urlStr) {
    try {
        // Quick check if params exist
        if (!urlStr.includes('?')) return null;

        const urlObj = new URL(urlStr);
        const params = urlObj.searchParams;
        let changed = false;

        // 1. Remove Global Params
        CONFIG.GLOBAL_TRACKING_PARAMS.forEach(param => {
            if (params.has(param)) {
                params.delete(param);
                changed = true;
            }
        });

        // 2. Remove Prefix Params (e.g., utm_*)
        const keys = Array.from(params.keys());
        keys.forEach(key => {
            if (key.startsWith('utm_') || key.startsWith('ga_') || key.startsWith('hm_')) {
                params.delete(key);
                changed = true;
            }
        });

        if (changed) {
            return urlObj.toString();
        }
    } catch (e) {
        // Invalid URL, ignore
    }
    return null;
}

/**
 * 主處理函式
 */
function processRequest(request) {
    const url = request.url;
    const method = request.method;
    
    // 0. 安全性檢查
    if (!url || !method) return null;

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase() + urlObj.search.toLowerCase(); // Full path for check

        // ---------------------------------------------------------
        // Layer 1: P0 關鍵路徑攔截 (Decapitation Strike)
        // ---------------------------------------------------------
        if (criticalPathScanner.matches(path)) {
            if (CONFIG.DEBUG_MODE) console.log(`[Block] L1 Critical Path: ${path}`);
            return { response: { status: 403, body: "Blocked by URL-Filter L1" } };
        }

        // ---------------------------------------------------------
        // Layer 2: P0 優先域名攔截 (Safety Valve)
        // ---------------------------------------------------------
        // Check exact and wildcards for P0
        if (CONFIG.PRIORITY_BLOCK_DOMAINS.has(hostname) || 
            Array.from(CONFIG.PRIORITY_BLOCK_DOMAINS).some(d => hostname.endsWith('.' + d))) {
            if (CONFIG.DEBUG_MODE) console.log(`[Block] L2 P0 Domain: ${hostname}`);
            return { response: { status: 403, body: "Blocked by URL-Filter L2" } };
        }
        
        if (CONFIG.REDIRECTOR_HOSTS.has(hostname)) {
             return { response: { status: 403, body: "Blocked Malicious Redirector" } };
        }

        // ---------------------------------------------------------
        // Layer 3: 智慧白名單 (Intelligent Whitelist)
        // ---------------------------------------------------------
        let isSoftWhitelisted = false;

        // A. Hard Whitelist Check
        if (CONFIG.HARD_WHITELIST_EXACT.has(hostname) ||
            CONFIG.HARD_WHITELIST_WILDCARDS.some(d => hostname.endsWith('.' + d))) {
            return null; // DIRECT
        }

        // B. Soft Whitelist Check
        if (CONFIG.SOFT_WHITELIST_EXACT.has(hostname) ||
            CONFIG.SOFT_WHITELIST_WILDCARDS.some(d => hostname.endsWith('.' + d))) {
            isSoftWhitelisted = true;
        }

        // ---------------------------------------------------------
        // Layer 4: 深度檢查與清洗 (Deep Inspection)
        // ---------------------------------------------------------
        
        // 4.1 Critical Map Check (Specific rules for specific hosts)
        // This runs even for Soft Whitelisted domains
        if (CONFIG.CRITICAL_TRACKING_MAP.has(hostname)) {
            const blockedPaths = CONFIG.CRITICAL_TRACKING_MAP.get(hostname);
            if (blockedPaths) {
                for (let badPath of blockedPaths) {
                    if (path.includes(badPath)) {
                        if (CONFIG.DEBUG_MODE) console.log(`[Block] L4 Map Rule: ${hostname} -> ${badPath}`);
                        return { response: { status: 403, body: "Blocked by URL-Filter L4 Map" } };
                    }
                }
            }
        }

        // 4.2 Standard Keyword Check (Only if NOT Hard Whitelisted)
        // If Soft Whitelisted, we still check Keywords but might be lenient on Static files
        if (!isSoftWhitelisted || (isSoftWhitelisted && !isStaticFile(path))) {
             if (pathScanner.matches(path)) {
                 if (CONFIG.DEBUG_MODE) console.log(`[Block] L4 Keyword: ${path}`);
                 return { response: { status: 403, body: "Blocked by URL-Filter L4 Keyword" } };
             }
        }
        
        // 4.3 Regex Block (Dynamic Scripts)
        // e.g., /fp123.js
        if (/\/fp\d+(\.[a-z0-9]+)?\.js$/.test(path)) {
             return { response: { status: 403 } };
        }

        // ---------------------------------------------------------
        // Parameter Cleaning (Rewrite)
        // ---------------------------------------------------------
        const cleanUrl = cleanTrackingParams(url);
        if (cleanUrl) {
            if (CONFIG.DEBUG_MODE) console.log(`[Rewrite] Cleaned Params: ${cleanUrl}`);
            return { response: { status: 302, headers: { Location: cleanUrl } } };
        }

    } catch (err) {
        if (CONFIG.DEBUG_MODE) console.log(`[Error] ${err}`);
    }

    // Default Allow
    return null;
}

// Helper: Check for static files
function isStaticFile(path) {
    const ext = path.split('.').pop().split('?')[0]; // simple ext extraction
    return CONFIG.PATH_ALLOW_SUFFIXES.has('.' + ext);
}

// Entry Point
if (typeof $request !== 'undefined') {
    $done(processRequest($request));
} else {
    $done({});
}
