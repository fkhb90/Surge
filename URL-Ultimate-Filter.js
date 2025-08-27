/**
 * @file        URL-Ultimate-Filter-Optimized.js
 * @version     15.1 (Strict Logging Filter)
 * @description 在 v14.0 基礎上進行架構性優化。引入 LRU 快取策略、參數清理白名單（軟白名單）、
 * URL 長度安全防護及增強型診斷模組，實現了更精細、健壯和高效的過濾邏輯。
 * @author      Gemini (基於 v14.0 全面優化)
 * @lastUpdated 2025-08-27
 */

// =================================================================================
// ⚙️ 核心設定區 (Centralized Configuration v15.0)
// =================================================================================

const config = {
    // 安全性設定
    MAX_URL_LENGTH: 4096,

    /**
     * 🚫 域名攔截黑名單 (Domain Blocklist)
     */
    BLOCK_DOMAINS: new Set([
        'doubleclick.net', 'google-analytics.com', 'googletagmanager.com', 'googleadservices.com',
        'googlesyndication.com', 'admob.com', 'adsense.com', 'pagead2.googlesyndication.com',
        'graph.facebook.com', 'connect.facebook.net', 'criteo.com', 'taboola.com', 'outbrain.com',
        'scorecardresearch.com', 'chartbeat.com', 'app-measurement.com', 'branch.io', 'appsflyer.com',
        'adjust.com', 'sentry.io', 'bugsnag.com', 'hotjar.com', 'vwo.com', 'optimizely.com',
        'mixpanel.com', 'amplitude.com', 'heap.io', 'loggly.com', 'c.clarity.ms', 'log.byteoversea.com', 's.yimg.jp',
    ]),

    /**
     * ✅ API 功能性域名白名單 (Hard Whitelist) - 完全豁免所有處理
     */
    API_WHITELIST: new Set([
        'youtubei.googleapis.com', 'api.weibo.cn', 'api.xiaohongshu.com', 'api.bilibili.com',
        'api.zhihu.com', 'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
        'api.github.com', 'api.openai.com', 'api.anthropic.com', 'api.google.com',
        'accounts.google.com', 'appleid.apple.com', 'login.microsoftonline.com',
        // 通用 CDN 和開發平台
        '*.googlevideo.com', '*.aliyuncs.com', '*.cloud.tencent.com', '*.cloudfront.net', 
        '*.vercel.app', '*.netlify.app', 'jsdelivr.net', 'unpkg.com',
        // RSS 服務
        'feedly.com', 'inoreader.com',
        // 支付與更新
        'paypal.com', 'stripe.com', 'apple.com', 'icloud.com', 'windowsupdate.com',
    ]),
    
    /**
     * ✅ 參數清理白名單 (Soft Whitelist) - 跳過攔截，但仍清理追蹤參數
     */
    CLEAN_PARAMS_DOMAINS: new Set([
        'youtube.com', 'm.youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'line.me', 'github.com', 'wikipedia.org', 'reddit.com', 'legy.line-apps.com',
    ]),

    // ... 其他設定與 v14.0 相同 ...
    PATH_ALLOW_KEYWORDS: new Set(['api', 'service', 'oauth', 'auth', 'login', 'chunk.js', 'download', 'upload', 'rss', 'feed']),
    PATH_BLOCK_KEYWORDS: ['/ad/', '/ads/', '/advert', '/affiliate/', '/sponsor', '/track', '/analytics', '/beacon', '/pixel', 'google_ad', 'pagead', 'gtag', 'ytag.js', 'fbevents', 'log', 'report']),
    DROP_PATH_KEYWORDS: new Set(['/log/', '/logs/', 'amp-loader', 'telemetry', 'crash', 'log', 'report']),
    GLOBAL_TRACKING_PARAMS: new Set(['gclid', 'dclid', 'fbclid', 'igshid', 'mc_cid', 'mc_eid', 'msclkid', 'from', 'source', 'ref', 'spm', 'scm', 'utm_source']),
    TRACKING_PREFIXES: ['utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mkt_', 'hsa_', 'ad_', 'trk_', 'spm_']
};

// =================================================================================
// 🏗️ 核心組件 (Core Components)
// =================================================================================

class Trie { /* ... 與 v14.0 相同 ... */ 
    constructor() { this.root = {}; }
    insert(word) { let n = this.root; for (const c of word) { n = n[c] = n[c] || {}; } n.isEnd = true; }
    startsWith(p) { let n = this.root; for (const c of p) { if (!n[c]) return false; n = n[c]; } return true; }
    contains(t) { for (let i = 0; i < t.length; i++) { let n = this.root; for (let j = i; j < t.length; j++) { if (!n[t[j]]) break; n = n[t[j]]; if (n.isEnd) return true; } } return false; }
}

class LRUCache {
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }
    get(key) {
        if (!this.cache.has(key)) return null;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.maxSize) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
}

class Diagnostics {
    constructor() {
        this.stats = { total: 0, errors: 0, rejected: 0, cleaned: 0, hardWhitelisted: 0, softWhitelisted: 0 };
    }
    increment(key, details = {}) { if (this.stats.hasOwnProperty(key)) this.stats[key]++; }
    getReport() { return this.stats; }
}

// =================================================================================
// 🚀 核心處理邏輯 (Core Processing Logic v15.0)
// =================================================================================

class URLFilter {
    constructor(config) {
        this.config = config;
        this.diagnostics = new Diagnostics();
        this.cache = new LRUCache();
        this.prefixTrie = new Trie();
        this.config.TRACKING_PREFIXES.forEach(p => this.prefixTrie.insert(p));
        this.pathBlockTrie = new Trie();
        this.config.PATH_BLOCK_KEYWORDS.forEach(k => this.pathBlockTrie.insert(k));
    }

    _isWhitelisted(hostname, whitelistSet) {
        const parts = hostname.split('.');
        while (parts.length > 1) {
            const domain = parts.join('.');
            const wildcard = `*.${domain}`;
            if (whitelistSet.has(domain) || whitelistSet.has(wildcard)) return true;
            parts.shift();
        }
        return false;
    }
    
    _checkDomainLists(hostname) {
        const cacheKey = `domain:${hostname}`;
        const cached = this.cache.get(cacheKey);
        if (cached !== null) return cached;

        if (this._isWhitelisted(hostname, this.config.API_WHITELIST)) return 'hard-whitelist';
        if (this._isWhitelisted(hostname, this.config.CLEAN_PARAMS_DOMAINS)) return 'soft-whitelist';
        for (const domain of this.config.BLOCK_DOMAINS) {
            if (hostname === domain || hostname.endsWith('.' + domain)) return 'block';
        }
        return 'pass';
    }
    
    // ... isPathBlocked 和 cleanTrackingParams 與 v14.0 類似 ...
    isPathBlocked(path) { /* ... */ return this.pathBlockTrie.contains(path) && ![...this.config.PATH_ALLOW_KEYWORDS].some(k => path.includes(k)); }
    cleanTrackingParams(url) { /* ... */ let changed = false; for (const key of [...url.searchParams.keys()]) { const lk = key.toLowerCase(); if (this.config.GLOBAL_TRACKING_PARAMS.has(lk) || this.prefixTrie.startsWith(lk)) { url.searchParams.delete(key); changed = true; } } return changed; }


    process(request) {
        this.diagnostics.increment('total');
        if (!request || !request.url) return null;

        // 🛡️ 安全策略：URL 長度檢查
        if (request.url.length > this.config.MAX_URL_LENGTH) {
            this.diagnostics.increment('rejected', { reason: 'url_too_long' });
            return { response: { status: 414 } }; // 414 URI Too Long
        }

        let url;
        try {
            url = new URL(request.url);
        } catch (e) {
            this.diagnostics.increment('errors', { error: 'invalid_url' });
            return null;
        }
        
        const hostname = url.hostname.toLowerCase();
        const path = (url.pathname + url.search).toLowerCase();

        // Step 1: 域名策略判斷 (整合黑白名單)
        const domainAction = this._checkDomainLists(hostname);
        this.cache.set(`domain:${hostname}`, domainAction);

        if (domainAction === 'hard-whitelist') {
            this.diagnostics.increment('hardWhitelisted');
            return null; // 完全放行
        }
        if (domainAction === 'block') {
            this.diagnostics.increment('rejected', { reason: 'domain_block' });
            return { response: { status: 403 } }; // REJECT
        }
        
        // Step 2: 路徑攔截 (軟白名單和普通域名)
        if (domainAction !== 'soft-whitelist' && this.isPathBlocked(path)) {
            this.diagnostics.increment('rejected', { reason: 'path_block' });
            // Drop 邏輯
            for (const dropKeyword of this.config.DROP_PATH_KEYWORDS) {
                if (path.includes(dropKeyword)) return { response: {} }; // DROP
            }
            return { response: { status: 403 } }; // REJECT
        }

        // Step 3: 參數清理 (軟白名單和普通域名)
        if (this.cleanTrackingParams(url)) {
            this.diagnostics.increment('cleaned');
            return { response: { status: 302, headers: { 'Location': url.toString() } } };
        }

        return null; // 無匹配規則，放行
    }
}

// =================================================================================
// 🎬 主執行邏輯 (Main Execution Logic)
// =================================================================================
const urlFilter = new URLFilter(config);
(function() {
    try {
        if (typeof $request === 'undefined') {
            console.log("URLFilter v15.0 Initialized.");
            return;
        }
        const result = urlFilter.process($request);
        if (typeof $done !== 'undefined') $done(result || {});
    } catch (error) {
        console.error(`[URLFilter] Critical Error: ${error.message}`);
        if (typeof $done !== 'undefined') $done({});
    }
})();
