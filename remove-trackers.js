/**
 * @file        URL-Tracking-Remover-Enhanced.js
 * @version     7.1
 * @description 新增 API 域名白名單機制，解決微博等 App 內部 API 請求被錯誤清理導致功能異常的問題。
 * 當請求域名匹配白名單時，腳本將完全跳過處理，確保 App 正常通訊。
 * @author      Gemini
 * @lastUpdated 2025-08-26
 */

// =================================================================================
// ⚙️ 核心設定區 (Configuration)
// =================================================================================

/**
 * 🚨 API 域名白名單 (v7.1 新增)
 * @description 列於此處的域名將被腳本完全忽略，不進行任何參數清理。
 * 主要用於放行 App 的內部 API 請求，避免破壞其功能。
 */
const API_HOSTNAME_WHITELIST = new Set([
    'api.weibo.cn',
    'api.weibo.com',
    'api.xiaohongshu.com',
    'api.bilibili.com',
    'api.zhihu.com',
    'api-ad.xiaohongshu.com',
    'app.bilibili.com',
    'passport.bilibili.com'
]);

/**
 * 域名必要參數白名單
 * @description 針對特定網站的「網頁」，保留其正常運作所需的核心參數。
 */
const ESSENTIAL_PARAMS_BY_DOMAIN = {
    'youtube': new Set([
        'v', 't', 'list', 'index', 'start', 'end', 'loop', 'controls',
        'autoplay', 'mute', 'cc_lang_pref', 'cc_load_policy', 'hl',
        'rel', 'showinfo', 'iv_load_policy', 'playsinline', 'time_continue',
        'bpctr', 'origin', 'shorts', 'si'
    ]),
    'weibo': new Set([ // 此處主要針對 weibo.com 的網頁，而非 api.weibo.cn
        'containerid', 'luicode', 'lfid', 'oid', 'id', 'uid'
    ]),
    'xiaohongshu': new Set([
        'noteId', 'exploreFeedId', 'share_from_user_id'
    ]),
    'bilibili': new Set([
        'p', 't', 'buvid', 'mid', 'avid', 'bvid', 'cid', 'season_id', 'ep_id'
    ])
};

/**
 * 全域追蹤參數黑名單 (精簡與擴充)
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'msclkid',
    'fbclid', 'igshid', 'mc_cid', 'mc_eid',
    'from', 'source', 'ref', 'spm', 'scm', 'share_source', 'share_medium',
    'share_tag', 'share_id', 'from_source', 'from_channel', 'from_spm',
    'tt_from', 'is_copy_url', 'is_from_webapp', 'xhsshare', 'share_plat',
    'pvid', 'fr', 'type', 'st',
    'aff_fcid', 'aff_fsk', 'aff_platform', 'algo_expid', 'algo_pvid',
    'tracking_id', 'piwik_campaign', 'piwik_kwd'
]);

/**
 * 追蹤參數前綴黑名單
 */
const TRACKING_PREFIXES = [
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'matomo_',
    'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'bdt'
];

/**
 * 惡意模式檢測 (更精準的規則)
 */
const MALICIOUS_PATTERNS = [
    /(javascript|data|vbscript):/i,
    /<script|on\w+=/i,
    /redirect_uri=javascript/i,
];

// =================================================================================
// 🚀 核心處理函式 (Core Logic)
// =================================================================================

function removeTrackingParams(url) {
    try {
        const u = new URL(url);
        const hostname = u.hostname.toLowerCase();
        let paramsChanged = false;

        // --- 🛡️ 步驟 1: 惡意 URL 初步篩檢 ---
        for (const pattern of MALICIOUS_PATTERNS) {
            if (pattern.test(decodeURIComponent(url))) {
                console.warn(`[Security Alert] 檢測到疑似惡意 URL，已阻擋: ${url.substring(0, 100)}...`);
                return null;
            }
        }

        // --- 🔍 步驟 2: 確定當前域名的白名單 ---
        let essentialParams = new Set();
        for (const domainKey in ESSENTIAL_PARAMS_BY_DOMAIN) {
            if (hostname.includes(domainKey)) {
                essentialParams = ESSENTIAL_PARAMS_BY_DOMAIN[domainKey];
                break;
            }
        }

        const paramKeys = Array.from(u.searchParams.keys());

        // --- 🔄 步驟 3: 遍歷並清理參數 ---
        for (const key of paramKeys) {
            if (essentialParams.has(key)) {
                continue;
            }

            let shouldDelete = false;
            if (GLOBAL_TRACKING_PARAMS.has(key)) {
                shouldDelete = true;
            } else {
                for (const prefix of TRACKING_PREFIXES) {
                    if (key.startsWith(prefix)) {
                        shouldDelete = true;
                        break;
                    }
                }
            }

            if (shouldDelete) {
                u.searchParams.delete(key);
                paramsChanged = true;
            }
        }

        // --- ✅ 步驟 4: 回傳結果 ---
        if (paramsChanged) {
            return u.toString();
        }
        return null;

    } catch (e) {
        console.error(`[Tracking Remover v7.1] 處理 URL 時發生錯誤: ${e.message}`);
        console.error(`原始 URL: ${url.substring(0, 100)}...`);
        return null;
    }
}

// =================================================================================
// ⚡ 主執行邏輯 (Execution) - 適用於 Surge / Quantumult X / Loon 等環境
// =================================================================================
(function() {
    if (typeof $request === 'undefined' || !$request.url) {
        if (typeof $done !== 'undefined') $done({});
        return;
    }

    const originalUrl = $request.url;
    let hostname;
    try {
        hostname = new URL(originalUrl).hostname.toLowerCase();
    } catch (e) {
        // 如果 URL 格式不正確，直接放行
        $done({});
        return;
    }
    
    // 🚨 v7.1 核心更新：檢查請求是否命中 API 域名白名單
    if (API_HOSTNAME_WHITELIST.has(hostname)) {
        console.log(`[API Whitelist] 命中 API 域名，跳過處理: ${hostname}`);
        $done({}); // 直接放行，不進行任何修改
        return;
    }

    // 如果不是 API 請求，則執行標準的清理流程
    const cleanedUrl = removeTrackingParams(originalUrl);

    if (cleanedUrl) {
        console.log(`https://dictionary.cambridge.org/dictionary/english/cleaned 追蹤參數已移除`);
        $done({
            response: {
                status: 302,
                headers: { 'Location': cleanedUrl }
            }
        });
    } else {
        $done({});
    }
})();
```

### 如何更新

請將上方 v7.1 版本的完整程式碼複製並替換掉您目前使用的腳本。儲存後，微博 App 應該就能夠正常刷新和使用了。

感謝您的耐心反饋，這對於完善腳本非常有
