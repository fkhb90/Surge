/**
 * @file      Universal-Fingerprint-Poisoning.js
 * @version   1.44 (Performance & Security Enhancement)
 * @description [v1.44] 效能優化、安全性強化、相容性改善
 * @changes   - Set-based whitelist O(1) lookup
 *            - Enhanced CSP bypass
 *            - Modular architecture
 *            - Safari 15+ compatibility
 *            - WebGL2 complete coverage
 *            - Improved error boundaries
 * @author    Claude & Gemini
 */

(function() {
    'use strict';
    
    // ================================================================
    // 核心設定區
    // ================================================================
    const CONFIG = {
        MAX_CONTENT_LENGTH: 2000000,
        MIN_CANVAS_SIZE: 50,
        NOISE_RANGE: [-4, 4],
        AUDIO_NOISE_MAGNITUDE: 0.00001,
        BADGE_DISPLAY_TIME: 3000,
        DEBUG_MODE: false
    };

    // ================================================================
    // 0. 快速路徑：串流與協議級避讓
    // ================================================================
    if ($response.status === 206) { 
        $done({}); 
        return; 
    }

    const headers = $response.headers;
    const normalizedHeaders = normalizeHeaders(headers);

    // WebSocket 連線跳過
    if (normalizedHeaders['upgrade'] === 'websocket') { 
        $done({}); 
        return; 
    }

    // 大型檔案跳過
    const contentLength = parseInt(normalizedHeaders['content-length'] || '0');
    if (contentLength > CONFIG.MAX_CONTENT_LENGTH) { 
        $done({}); 
        return; 
    }

    // ================================================================
    // 1. 標頭驗證：僅處理 HTML
    // ================================================================
    const contentType = normalizedHeaders['content-type'] || '';
    if (contentType && !contentType.includes('text/html')) {
        $done({});
        return;
    }

    // ================================================================
    // 2. User-Agent 深度檢測
    // ================================================================
    const uaRaw = $request.headers['User-Agent'] || $request.headers['user-agent'];
    const ua = (uaRaw || '').toLowerCase();
    
    if (!isValidUserAgent(ua)) {
        $done({});
        return;
    }

    // ================================================================
    // 3. 網域白名單 (Set-based O(1) 查詢)
    // ================================================================
    const url = $request.url;
    const hostname = extractHostname(url);
    
    if (isWhitelistedDomain(hostname)) {
        $done({});
        return;
    }

    // ================================================================
    // 4. 內容驗證與注入
    // ================================================================
    let body = $response.body;
    if (!body || !isHTMLContent(body)) { 
        $done({}); 
        return; 
    }

    // 移除 CSP 標頭
    removeCSPHeaders(headers);

    // 注入防護腳本
    const injection = generateInjectionScript();
    body = injectScript(body, injection);

    $done({ body: body, headers: headers });

    // ================================================================
    // 工具函數區
    // ================================================================
    
    function normalizeHeaders(headers) {
        const normalized = {};
        for (const key in headers) {
            normalized[key.toLowerCase()] = headers[key];
        }
        return normalized;
    }

    function isValidUserAgent(ua) {
        if (!ua || !ua.includes('mozilla')) return false;
        
        const blacklist = [
            'line/', 'fb_iab', 'micromessenger', 'worksmobile', 
            'naver', 'github', 'git/', 'shopee', 'seamoney'
        ];
        
        return !blacklist.some(pattern => ua.includes(pattern));
    }

    function extractHostname(url) {
        const match = url.match(/^https?:\/\/([^/:]+)/i);
        return match ? match[1].toLowerCase() : '';
    }

    function isWhitelistedDomain(hostname) {
        if (!hostname) return false;
        
        // 使用 Set 進行 O(1) 查詢
        const whitelistSet = getWhitelistSet();
        
        // 精確匹配
        if (whitelistSet.has(hostname)) return true;
        
        // 子網域匹配
        const parts = hostname.split('.');
        for (let i = 1; i < parts.length; i++) {
            const parent = parts.slice(i).join('.');
            if (whitelistSet.has(parent)) return true;
        }
        
        return false;
    }

    function getWhitelistSet() {
        // 使用閉包快取 Set
        if (!getWhitelistSet._cache) {
            const domains = [
                // 金融機構
                "bot.com.tw", "cathaybk.com.tw", "cathaysec.com.tw", "chb​​​​​​​​​​​​​​​​
