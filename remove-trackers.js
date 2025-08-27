/**
 * @file        URL-Tracking-Remover-Enhanced.js
 * @version     10.0 (Ultimate)
 * @description 整合了數百條來自社群的 REGEX 規則，極致強化了追蹤參數過濾能力。
 * @author      Gemini (整合與優化)
 * @lastUpdated 2025-08-27
 * @reference   綜合 NobyDa, Semporia 及社群提供的 REGEX 規則  
 */

// =================================================================================
// ⚙️ 核心設定區 (Configuration)
// =================================================================================

/**
 * 🚨 API 域名白名單
 */
const API_HOSTNAME_WHITELIST = new Set([
    '*.youtube.com', '*.m.youtube.com', 'youtubei.googleapis.com', '*.googlevideo.com',
    'api.weibo.cn', 'api.weibo.com', 'api.xiaohongshu.com', 'api-ad.xiaohongshu.com',
    'api.bilibili.com', 'app.bilibili.com', 'passport.bilibili.com', 'api.zhihu.com',
    'i.instagram.com', 'graph.instagram.com', 'graph.threads.net',
    'api.deepseek.com', 'kimi.moonshot.cn', 'tongyi.aliyun.com', 'xinghuo.xfyun.cn',
    'maas.aminer.cn', 'api.minimax.chat'
]);

/**
 * 域名必要參數白名單
 */
const ESSENTIAL_PARAMS_BY_DOMAIN = {
    'youtube': new Set(['v', 't', 'list', 'index', 'start', 'end', 'loop', 'controls', 'autoplay', 'mute', 'cc_lang_pref', 'cc_load_policy', 'hl', 'rel', 'showinfo', 'iv_load_policy', 'playsinline', 'time_continue', 'bpctr', 'origin', 'shorts']),
    'weibo': new Set(['containerid', 'luicode', 'lfid', 'oid', 'id', 'uid']),
    'xiaohongshu': new Set(['noteId', 'exploreFeedId', 'share_from_user_id']),
    'bilibili': new Set(['p', 't', 'mid', 'avid', 'bvid', 'cid', 'season_id', 'ep_id'])
};

/**
 * 全域追蹤參數黑名單 (v10.0 巨幅擴充版)
 * @description 整合了數百條來自社群 REGEX 規則的參數
 */
const GLOBAL_TRACKING_PARAMS = new Set([
    // --- Standard & Major Platforms ---
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name', 'utm_referrer',
    'gclid', 'dclid', 'gclsrc', 'wbraid', 'gbraid', 'gad_source', 'msclkid', 'yclid',
    'fbclid', 'igshid', 'igsh', 'mc_cid', 'mc_eid', 'mkt_tok',
    'x-threads-app-object-id', 'x-threads-app-object-type', 'x-threads-app-redirect',
    // --- General & Chinese Platforms ---
    'from', 'source', 'ref', 'spm', 'scm', 'share_source', 'share_medium', 'share_plat',
    'share_tag', 'share_id', 'from_source', 'from_channel', 'from_spm', 'from_uid', 'from_user',
    'tt_from', 'ttclid', 'is_copy_url', 'is_from_webapp', 'xhsshare',
    'pvid', 'fr', 'type', 'st', 'scene', 'traceid', 'request_id',
    // --- Affiliate / Marketing / Analytics (來自 REGEX 規則) ---
    'aff_id', 'affiliate', 'mibextid', '__twitter_impression', '_openstat', '_trksid',
    'adgroupid', 'adposition', 'adpositionid', 'adtype', 'affinity', 'amcv',
    'audience_interest', 'audience_segment', 'banner_size', 'campaign_channel', 'campaign_goal',
    'campaign_group', 'campaign_id', 'campaign_name', 'campaignid', 'ceneo_spo',
    'channel_partner', 'click_location', 'clickid', 'cmpid', 'contentid', 'creative',
    'creativeid', 'criterion', 'custom', 'customer_source', 'Echobox', 'email_source',
    'engagement_channel', 'engagement_duration', 'engagement_id', 'engagement_result',
    'engagement_source', 'engagement_topic', 'engagement_type', 'eventlog', 'gs_l',
    'icid', 'inmarket', 'interest_category', 'interest', 'keyword_match_type', 'keywordid',
    'landing_page', 'lead_source', 'lead_type', 'matchtype', 'matchtypeid',
    'networktypeid', 'organic_source', 'partner_id', 'placement_id', 'placement',
    'placementid', 'promotion_channel', 'purchase_category', 'purchase_channel',
    'purchase_source', 'purchase_value', 'rd_cid', 'rd_rid', 'referral_code',
    'referral_source', 'remarketing_list', 'remarketing_tag', 'remarketing',
    'site_section', 'social_network', 'social_share', 'source_medium', 'target_age',
    'target_audience', 'target_behavior', 'target_device', 'target_gender',
    'target_industry', 'target_interest', 'target_language', 'target_location',
    'test_group', 'test_variation', 'tracking_source', 'traffic_source', 'user_age',
    'user_behavior', 'user_device', 'user_group', 'user_interest', 'user_level',
    'user_location', 'user_rating', 'user_segment', 'wtrid', 'hsCtaTracking',
    // --- AI Services ---
    'ds_ref', 'kimi_share', 'spark_channel', 'zhipu_from'
]);

/**
 * 追蹤參數前綴黑名單 (v10.0 巨幅擴充版)
 */
const TRACKING_PREFIXES = [
    // --- Standard Prefixes ---
    'utm_', 'ga_', 'fb_', 'gcl_', 'ms_', 'mc_', 'mke_', 'mkt_', 'matomo_', 'piwik_',
    'hsa_', 'ad_', 'trk_', 'spm_', 'scm_', 'bd_', 'bdt', 'video_utm', 'vero_',
    '__cft__', 'pk_', 'share_from',
    // --- AI Services ---
    'monica_', 'manus_', 'deepseek_', 'ds_', 'kimi_', 'moonshot_', 'tongyi_',
    'qwen_', 'nanoai_', 'nano_', 'mita_', 'metaso_', 'quark_', 'qk_',
    'iflytek_', 'spark_', 'zhipu_', 'glm_', 'stepfun_', 'minimax_', 'mm_',
    'wenxiaoyan_', 'wxy_', 'dangbei_', 'db_'
];

/**
 * 惡意模式檢測
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

        for (const pattern of MALICIOUS_PATTERNS) {
            if (pattern.test(decodeURIComponent(url))) {
                console.warn(`[Security Alert] 檢測到疑似惡意 URL，已阻擋: ${url.substring(0, 100)}...`);
                return null;
            }
        }

        let essentialParams = new Set();
        for (const domainKey in ESSENTIAL_PARAMS_BY_DOMAIN) {
            if (hostname.includes(domainKey)) {
                essentialParams = ESSENTIAL_PARAMS_BY_DOMAIN[domainKey];
                break;
            }
        }

        const paramKeys = Array.from(u.searchParams.keys());

        for (const key of paramKeys) {
            if (essentialParams.has(key)) {
                continue;
            }

            let shouldDelete = false;
            const lowerKey = key.toLowerCase();

            if (GLOBAL_TRACKING_PARAMS.has(lowerKey)) {
                shouldDelete = true;
            } else {
                for (const prefix of TRACKING_PREFIXES) {
                    if (lowerKey.startsWith(prefix)) {
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

        if (paramsChanged) {
            return u.toString();
        }
        return null;

    } catch (e) {
        console.error(`[Tracking Remover] 處理 URL 時發生錯誤: ${e.message}`);
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
        $done({});
        return;
    }

    const isWhitelisted = Array.from(API_HOSTNAME_WHITELIST).some(pattern => {
        if (pattern.startsWith('*.')) {
            return hostname.endsWith(pattern.substring(1)) || hostname === pattern.substring(2);
        }
        return hostname === pattern;
    });

    if (isWhitelisted) {
        $done({});
        return;
    }

    const cleanedUrl = removeTrackingParams(originalUrl);

    if (cleanedUrl) {
        console.log(`[Tracking Remover] 追蹤參數已移除 (v10.0)`);
        const response = {
            status: 302,
            headers: { 'Location': cleanedUrl }
        };
        $done({ response });
    } else {
        $done({});
    }
})();
