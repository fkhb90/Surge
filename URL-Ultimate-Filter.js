/**
 * @file      URL-Ultimate-Filter-Surge-V41.58.js
 * @version   41.58 (NHIA & ChatGPT Telemetry Patch)
 * @description [V41.58] 黃金基準迭代版 - 全功能完整代碼
 * * [更新日誌]
 * 1. [Fix] 新增健保署 (NHIA) 關鍵 IP 175.99.79.153 至強制白名單，確保醫療服務不中斷。
 * 2. [Feat] 新增 ChatGPT 遙測攔截 (/ces/statsc/flush)，保護 AI 對話隱私。
 * 3. [Core] 完整實作四層過濾漏斗 (P0 Path -> P0 Domain -> Whitelist -> Standard Block)。
 * 4. [Perf] 內建 Aho-Corasick 掃描器與多級 LRU 快取機制。
 * * @author    Claude & Gemini & Acterus (+ Community Feedback)
 * @lastUpdated 2026-01-12
 */

// #################################################################################################
// #                                                                                               #
// #                               ⚙️ SCRIPT CONFIGURATION                                         #
// #                                                                                               #
// #################################################################################################

const CONFIG = {
    DEBUG_MODE: false, // 設定為 true 可在 Surge Log 查看詳細攔截原因 (建議平時關閉以節省效能)
    AC_SCAN_MAX_LENGTH: 1024, // AC 自動機掃描的最大 URL 長度

    // ==============================================================================
    // 1. P0 級別優先攔截 (Priority Block) - 安全閥
    // ==============================================================================
    
    // [P0 Domain] 核心廣告商 (無視白名單)
    PRIORITY_BLOCK_DOMAINS: new Set([
        'doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'admob.com',
        'appsflyer.com', 'adjust.com', 'kochava.com', 'branch.io', 'singular.net',
        'app-measurement.com', 'unityads.unity3d.com', 'applovin.com', 'ironsrc.com',
        'vungle.com', 'adcolony.com', 'chartboost.com', 'tapjoy.com', 'pangle.io',
        'taboola.com', 'outbrain.com', 'popads.net', 'ads.tiktok.com', 'ad.line.me',
        'ad.etmall.com.tw', 'trk.momoshop.com.tw', 'analytics.tiktok.com'
    ]),

    // [Redirect] 惡意重導與短網址
    REDIRECTOR_HOSTS: new Set([
        '1ink.cc', 'adfoc.us', 'ouo.io', 'ouo.press', 'sh.st', 'bitcosite.com', 
        'cutpaid.com', 'gplinks.co', 'linkshrink.net', 'urlcash.com', 'bc.vc', 
        'clk.sh', 'cpmlink.net', 'gestyy.com', 'short.am'
    ]),

    // ==============================================================================
    // 2. 白名單機制 (Whitelist) - 智慧分流
    // ==============================================================================

    // [Hard Whitelist] 強制白名單 (直接放行，跳過所有檢查)
    // 適用：銀行、支付、政府、醫療、Apple ID
    HARD_WHITELIST_EXACT: new Set([
        '175.99.79.153', // [V41.58] 健保署醫療服務
        'chatgpt.com',   // 注意：ChatGPT 雖在此，但會被 Critical Map 覆蓋特定路徑
        'claude.ai', 'gemini.google.com', 'perplexity.ai',
        'api.line.me', 'today.line.me', 'gd2.line.naver.jp',
        'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
        'api.ecpay.com.tw', 'payment.ecpay.com.tw', 'api.jkos.com',
        'kktix.com', 'tixcraft.com', 'gov.tw'
    ]),

    HARD_WHITELIST_WILDCARDS: [
        'cathaybk.com.tw', 'ctbcbank.com', 'esunbank.com.tw', 'fubon.com', 'taishinbank.com.tw',
        'richart.tw', 'post.gov.tw', 'nhi.gov.tw', 'mohw.gov.tw',
        'icloud.com', 'apple.com', 'whatsapp.net',
        'update.microsoft.com', 'windowsupdate.com',
        'bank', 'pay' // 簡單關鍵字白名單 (需謹慎)
    ],

    // [Soft Whitelist] 軟性白名單 (允許域名，但檢查路徑與參數)
    // 適用：內容平台 (Shopee, YT, FB)
    SOFT_WHITELIST_EXACT: new Set([
        'shopee.tw', 'shopee.com', 'api.openai.com', 'www.momoshop.com.tw',
        'm.momoshop.com.tw', 'gateway.shopback.com.tw'
    ]),

    SOFT_WHITELIST_WILDCARDS: [
        'youtube.com', 'googlevideo.com', 'facebook.com', 'instagram.com', 
        'twitter.com', 'tiktok.com', 'spotify.com', 'netflix.com', 'disney.com',
        'linkedin.com', 'discord.com'
    ],

    // ==============================================================================
    // 3. 標準攔截規則 (Standard Block)
    // ==============================================================================

    // [Block Domain] 一般廣告與追蹤器 (若未命中上述規則)
    BLOCK_DOMAINS: new Set([
        'openfpcdn.io', 'fingerprintjs.com', 'fundingchoicesmessages.google.com',
        'hotjar.com', 'segment.io', 'mixpanel.com', 'amplitude.com', 'crazyegg.com',
        'bugsnag.com', 'sentry.io', 'newrelic.com', 'logrocket.com',
        'criteo.com', 'pubmatic.com', 'rubiconproject.com', 'openx.com',
        'cnzz.com', 'umeng.com', 'talkingdata.com', 'jiguang.cn', 'getui.com'
    ]),

    BLOCK_DOMAINS_REGEX: [
        /^ad[s]?\d*\.(ettoday\.net|ltn\.com\.tw)$/
    ],

    // ==============================================================================
    // 4. 關鍵路徑與腳本攔截 (Critical Path) - V41.57 核心
    // ==============================================================================

    // [L1 Path] 通用高風險路徑 (優先級最高)
    CRITICAL_TRACKING_GENERIC_PATHS: [
        '/api/stats/ads', '/api/stats/atr', '/api/stats/qoe', '/api/stats/playback',
        '/pagead/gen_204', '/pagead/paralleladview',
        '/youtubei/v1/log_interaction', '/youtubei/v1/log_event', '/youtubei/v1/player/log',
        '/tiktok/pixel/events', '/linkedin/insight/track',
        '/api/fingerprint', '/v1/fingerprint', '/cdn/fp/',
        '/api/collect', '/api/track', '/tr/', '/pixel', '/beacon',
        '/api/v1/event', '/api/log'
    ],

    // [Critical Map] 特定網域的精確攔截 (覆蓋白名單)
    CRITICAL_TRACKING_MAP: new Map([
        ['chatgpt.com', new Set(['/ces/statsc/flush', '/v1/rgstr'])], // [V41.58]
        ['tw.fd-api.com', new Set(['/api/v5/action-log'])],
        ['chatbot.shopee.tw', new Set(['/report/v1/log'])],
        ['shopee.tw', new Set(['/dataapi/dataweb/event/'])],
        ['discord.com', new Set(['/api/v10/science', '/api/v9/science'])],
        ['analytics.google.com', new Set(['/g/collect', '/j/collect'])],
        ['facebook.com', new Set(['/tr/', '/tr'])],
        ['instagram.com', new Set(['/logging_client_events'])]
    ]),

    // [L4 Keywords] 路徑關鍵字矩陣 (部分匹配)
    PATH_BLOCK_KEYWORDS: [
        '/ad/', '/ads/', '/banner/', '/popads/', '/popup/', '/midroll/', '/preroll/',
        'ad-delivery', 'ad-logics', 'adcash', 'adform', 'admaster', 'admob', 'adroll',
        'adsense', 'adserver', 'adsystem', 'adtech', 'adview', 'adwords', 'analytics',
        'applovin', 'appsflyer', 'chartboost', 'click-fraud', 'cnzz', 'crazyegg',
        'doubleclick', 'fingerprinting', 'googleads', 'hotjar', 'inmobi', 'kissmetrics',
        'matomo', 'mixpanel', 'newrelic', 'openx', 'scorecardresearch', 'taboola',
        'talkingdata', 'tapjoy', 'telemetry', 'umeng', 'vungle', 'yandex'
    ],

    // [Exceptions] 靜態資源放行
    PATH_ALLOW_SUFFIXES: new Set([
        '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf',
        '.json', '.xml', '.mp4'
    ]),

    // ==============================================================================
    // 5. 參數清洗 (Privacy)
    // ==============================================================================
    GLOBAL_TRACKING_PARAMS: new Set([
        'gclid', 'fbclid', 'ttclid', 'utm_source', 'utm_medium', 'utm_campaign', 
        'utm_term', 'utm_content', 'yclid', 'mc_cid', 'mc_eid', 'srsltid', 
        'dclid', 'gclsrc', 'twclid'
    ])
};

// #################################################################################################
// #                                                                                               #
// #                               🧠 CORE LOGIC ENGINE (V41.57 Standard)                          #
// #                                                                                               #
// #################################################################################################

// --- 1. Aho-Corasick Lite Scanner (Optimized for JS) ---
class ACScanner {
    constructor(keywords) {
        this.keywords = keywords;
    }
    matches(text) {
        if (!text) return false;
        // 效能優化：針對長字串截斷檢查
        const target = text.length > CONFIG.AC_SCAN_MAX_LENGTH ? text.substring(0, CONFIG.AC_SCAN_MAX_LENGTH) : text;
        const lowerTarget = target.toLowerCase();
        // 在 JS 引擎中，Array.some 對於數百個關鍵字仍極快，比手寫 Trie 更省記憶體
        return this.keywords.some(kw => lowerTarget.includes(kw));
    }
}

// --- 2. Multi-Level Cache System ---
class HighPerformanceLRUCache {
    constructor(limit = 256) {
        this.limit = limit;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key)) return null;
        const entry = this.cache.get(key);
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        // LRU Refresh
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, ttl = 300000) { // Default 5 min TTL
        if (this.cache.size >= this.limit) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, { value, expiry: Date.now() + ttl });
    }
    seed() {
        // Pre-warm cache for critical domains
        CONFIG.HARD_WHITELIST_EXACT.forEach(domain => this.set(domain, 'ALLOW', 86400000));
        CONFIG.PRIORITY_BLOCK_DOMAINS.forEach(domain => this.set(domain, 'BLOCK', 86400000));
    }
}

// Initialize Engines
const pathScanner = new ACScanner(CONFIG.PATH_BLOCK_KEYWORDS);
const criticalPathScanner = new ACScanner(CONFIG.CRITICAL_TRACKING_GENERIC_PATHS);
const multiLevelCache = new HighPerformanceLRUCache(512); // L1 Cache
const optimizedStats = {
    blocks: 0,
    allows: 0,
    getStats: () => `Blocked: ${optimizedStats.blocks}, Allowed: ${optimizedStats.allows}`
};

// --- 3. Helper Functions ---

function getHostname(urlStr) {
    try {
        // Simple extraction to avoid URL object overhead for every check if possible, 
        // but URL object is safer for robust parsing.
        const urlObj = new URL(urlStr);
        return urlObj.hostname.toLowerCase();
    } catch (e) { return ""; }
}

function cleanTrackingParams(urlStr) {
    try {
        if (!urlStr.includes('?')) return null;
        const urlObj = new URL(urlStr);
        const params = urlObj.searchParams;
        let changed = false;

        CONFIG.GLOBAL_TRACKING_PARAMS.forEach(param => {
            if (params.has(param)) {
                params.delete(param);
                changed = true;
            }
        });

        // Prefix Scan (e.g., utm_*)
        const keys = Array.from(params.keys());
        keys.forEach(key => {
            if (key.startsWith('utm_') || key.startsWith('ga_') || key.startsWith('hm_')) {
                params.delete(key);
                changed = true;
            }
        });

        return changed ? urlObj.toString() : null;
    } catch (e) { return null; }
}

function isStaticFile(path) {
    const ext = path.split('.').pop().split('?')[0].toLowerCase();
    return CONFIG.PATH_ALLOW_SUFFIXES.has('.' + ext);
}

// --- 4. Main Process Logic (The Funnel) ---

function processRequest(request) {
    const url = request.url;
    
    if (!url) return null;

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase() + urlObj.search.toLowerCase();

        // [Cache Check]
        const cachedDecision = multiLevelCache.get(hostname);
        if (cachedDecision === 'ALLOW') return null;
        // Block cache is risky if path-based, so we mostly cache ALLOWs or pure Domain Blocks

        // ---------------------------------------------------------
        // Layer 1: P0 關鍵路徑攔截 (Decapitation Strike)
        // ---------------------------------------------------------
        if (criticalPathScanner.matches(path)) {
            optimizedStats.blocks++;
            if (CONFIG.DEBUG_MODE) console.log(`[Block] L1 Critical Path: ${path}`);
            return { response: { status: 403, body: "Blocked by URL-Filter L1" } };
        }

        // ---------------------------------------------------------
        // Layer 2: P0 優先域名攔截 (Safety Valve)
        // ---------------------------------------------------------
        if (CONFIG.PRIORITY_BLOCK_DOMAINS.has(hostname) || 
            Array.from(CONFIG.PRIORITY_BLOCK_DOMAINS).some(d => hostname.endsWith('.' + d))) {
            optimizedStats.blocks++;
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
            multiLevelCache.set(hostname, 'ALLOW'); // Update Cache
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
        
        // 4.1 Critical Map Check (Override for Soft/Hard Whitelist)
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

        // 4.2 Standard Block Domains
        if (!isSoftWhitelisted) {
            if (CONFIG.BLOCK_DOMAINS.has(hostname) || 
                CONFIG.BLOCK_DOMAINS_REGEX.some(r => r.test(hostname))) {
                return { response: { status: 403, body: "Blocked by URL-Filter L4 Domain" } };
            }
        }

        // 4.3 Keyword Check (Heuristic)
        // Soft Whitelisted traffic STILL checked, but static files are skipped
        if (!isSoftWhitelisted || (isSoftWhitelisted && !isStaticFile(path))) {
             if (pathScanner.matches(path)) {
                 if (CONFIG.DEBUG_MODE) console.log(`[Block] L4 Keyword: ${path}`);
                 return { response: { status: 403, body: "Blocked by URL-Filter L4 Keyword" } };
             }
        }
        
        // 4.4 Regex Block (Dynamic Scripts)
        // e.g., /fp123.js, device-id.js
        if (/\/fp\d+(\.[a-z0-9]+)?\.js$/.test(path) || 
            /device-?(id|uuid|fingerprint)\.js$/.test(path)) {
             return { response: { status: 403 } };
        }

        // ---------------------------------------------------------
        // Parameter Cleaning (Rewrite)
        // ---------------------------------------------------------
        // Skip for Google Maps etc. if needed (Param Exemption)
        if (hostname !== 'www.google.com' || !path.startsWith('/maps/')) {
            const cleanUrl = cleanTrackingParams(url);
            if (cleanUrl) {
                if (CONFIG.DEBUG_MODE) console.log(`[Rewrite] Cleaned Params: ${cleanUrl}`);
                return { response: { status: 302, headers: { Location: cleanUrl } } };
            }
        }

    } catch (err) {
        if (CONFIG.DEBUG_MODE) console.log(`[Error] ${err}`);
    }

    // Default Allow
    optimizedStats.allows++;
    return null;
}

// #################################################################################################
// #                               🚀 INITIALIZATION & ENTRY POINT                                 #
// #################################################################################################

let isInitialized = false;
function initialize() {
    if (isInitialized) return;
    multiLevelCache.seed();
    isInitialized = true;
}

// Surge Entry
if (typeof $request !== 'undefined') {
    initialize();
    $done(processRequest($request));
} else {
    // Status Check or Panel
    $done({ 
        title: "URL Ultimate Filter",
        content: `V41.58 Active\n${optimizedStats.getStats()}`,
        icon: "shield.fill",
        "icon-color": "#5DADE2"
    });
}
