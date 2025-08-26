/**
 * Surge Script: Enhanced Tracking Parameters Remover
 * Version: 7.0 - 增強版追蹤參數清理腳本
 * 功能：移除追蹤參數，保護隱私，排除 YouTube 必要功能參數，並採用更精準、更廣泛的追蹤與惡意代碼過濾規則。
 * 
 * @author      Gemini
 * @lastUpdated 2025-08-26
 */

// =================================================================================
// ⚙️ 核心設定區 (Configuration)
// =================================================================================

/**
 * 域名必要參數白名單
 * @description 針對特定網站，保留其正常運作所需的核心參數，防止功能異常。
 * 鍵 (key) 為域名中的關鍵字，值 (value) 為需要保留的參數 Set 集合。
 */

const ESSENTIAL_PARAMS_BY_DOMAIN = {
    'youtube': new Set([
        'v', 't', 'list', 'index', 'start', 'end', 'loop', 'controls',
        'autoplay', 'mute', 'cc_lang_pref', 'cc_load_policy', 'hl',
        'rel', 'showinfo', 'iv_load_policy', 'playsinline', 'time_continue',
        'bpctr', 'origin', 'shorts', 'si' // si 為 YouTube 新的分享識別參數
    ]),
    'weibo': new Set([
        'containerid', // 微博容器 ID，定位內容核心參數
        'luicode',     // 來源碼，影響跳轉與返回邏輯
        'lfid',        // 列表流 ID，影響 Feed 載入
        'oid',         // 對象 ID，指向特定微博
        'id',          // 同上，文章或用戶 ID
        'uid'          // 用戶 ID
    ]),
    'xiaohongshu': new Set([
        'noteId',      // 小紅書筆記唯一 ID，必須保留
        'exploreFeedId', // 探索 Feed ID
        'share_from_user_id' // 分享用戶 ID，部分場景需要
    ]),
    'bilibili': new Set([
        'p',           // 視頻分P
        't',           // 時間戳定位
        'buvid',       // 設備標識符，影響個人化推薦但移除可能導致功能異常
        'mid',         // 用戶 ID
        'avid',        // 視頻 AV 號
        'bvid',        // 視頻 BV 號
        'cid',         // 彈幕池 ID
        'season_id',   // 劇集 ID
        'ep_id'        // 單集 ID
    ])
};

/**
 * 全域追蹤參數黑名單 (精簡與擴充)
 * @description 整合常見的廣告、分析、聯盟行銷追蹤參數。
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    // --- 通用點擊與分析 (UTM & Co.) ---
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'msclkid',
    'fbclid', 'igshid', 'mc_cid', 'mc_eid', 'vero_conv', 'vero_id',

    // --- 社交媒體與分享 ---
    'from', 'source', 'ref', 'spm', 'scm', 'share_source', 'share_medium',
    'share_tag', 'share_id', 'from_source', 'from_channel', 'from_spm',
    'tt_from', 'tt_group_id', 'is_copy_url', 'is_from_webapp',
    'share_from_user_hidden', 'xhsshare', 'share_plat', 'share_session_id',
    'share_times', 'pvid', 'fr', 'type', 'st',

    // --- 電商與聯盟行銷 ---
    'aff_fcid', 'aff_fsk', 'aff_platform', 'aff_trace_key', 'algo_expid',
    'algo_pvid', 'sp_atk', 'sp_aid', 'sp_mid', 'sp_uid', 'tag', 'couponCode',
    'jd_pop', 'jdv', 'ptag', 'union_lens',

    // --- 其他常見追蹤參數 ---
    'si', '_trms', 'tracking_id', 'action_type', 'mbid', 'nsid',
    'redirect_log_mongo_id', 'redirect_mongo_id', 'scene', 'sub_biz',
    'trigger_page_type', 'pk_campaign', 'pk_kwd', 'piwik_campaign',
    'piwik_kwd'
]);

/**
 * 追蹤參數前綴黑名單
 * @description 匹配以特定前綴開頭的參數。
 */
const TRACKING_PREFIXES = [
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'matomo_',
    'piwik_', 'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'bdt'
];

/**
 * 惡意模式檢測 (更精準的規則)
 * @description 檢測 URL 或其參數中可能存在的惡意代碼模式。
 */
const MALICIOUS_PATTERNS = [
    /(javascript|data|vbscript):/i, // 檢測偽協議 XSS
    /<script|on\w+=/i,             // 檢測 HTML 注入或事件處理器
    /redirect_uri=javascript/i,    // 檢測惡意重定向
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
        // 如果整個 URL 包含惡意模式，直接阻止，不進行處理。
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
            // 如果參數在當前域名的白名單中，則跳過，不予移除。
            if (essentialParams.has(key)) {
                continue;
            }

            let shouldDelete = false;

            // 規則 1: 檢查全域黑名單 (O(1) 效率)
            if (GLOBAL_TRACKING_PARAMS.has(key)) {
                shouldDelete = true;
            }
            // 規則 2: 檢查前綴黑名單
            else {
                for (const prefix of TRACKING_PREFIXES) {
                    if (key.startsWith(prefix)) {
                        shouldDelete = true;
                        break;
                    }
                }
            }

            // 執行刪除
            if (shouldDelete) {
                u.searchParams.delete(key);
                paramsChanged = true;
            }
        }

        // --- ✅ 步驟 4: 回傳結果 ---
        if (paramsChanged) {
            return u.toString();
        }

        // 如果沒有任何更改，返回 null，讓主邏輯知道無需重定向。
        return null;

    } catch (e) {
        console.error(`[Tracking Remover v7.0] 處理 URL 時發生錯誤: ${e.message}`);
        console.error(`原始 URL: ${url.substring(0, 100)}...`);
        // 發生錯誤時返回 null，避免輸出損壞的 URL
        return null;
    }
}

// =================================================================================
// ⚡ 主執行邏輯 (Execution) - 適用於 Surge / Quantumult X / Loon 等環境
// =================================================================================
(function() {
    // 檢查 $request 是否存在，以確保在正確的環境中運行
    if (typeof $request === 'undefined' || !$request.url) {
        console.error('[Execution Error] 無法獲取請求 URL，腳本可能在不支援的環境中運行。');
        if (typeof $done !== 'undefined') $done({});
        return;
    }

    const originalUrl = $request.url;
    const cleanedUrl = removeTrackingParams(originalUrl);

    if (cleanedUrl) {
        console.log(`https://dictionary.cambridge.org/dictionary/english/cleaned 追蹤參數已移除`);
        console.log(`Original: ${originalUrl}`);
        console.log(`Cleaned:  ${cleanedUrl}`);
        // 執行 302 重定向到清理後的 URL
        $done({
            response: {
                status: 302,
                headers: { 'Location': cleanedUrl }
            }
        });
    } else {
        // 如果 URL 無需清理或處理失敗，則不進行任何操作
        $done({});
    }
})();
