/**
 * Surge Script: Remove Tracking Parameters
 * Version: 2.0
 * Author: Gemini
 * * This script removes known tracking parameters from URLs to enhance privacy.
 * It handles both exact parameter matches and prefix-based matches.
 */
function removeTrackingParams(url) {
    try {
        const u = new URL(url);

        // --- 追蹤參數黑名單 ---
        
        // 使用 Set 結構以獲得更佳的查詢效能 O(1)
        const exactTrackers = new Set([
            // Google Ads & Analytics
            'gclid', 'dclid',
            // Facebook (Meta)
            'fbclid',
            // Microsoft Ads
            'msclkid',
            // Mailchimp
            'mc_cid', 'mc_eid',
            // HubSpot
            '_hsenc', '_hsmi',
            // Marketo
            'mkt_tok',
            // Instagram
            'igshid',
            // Yandex
            'yclid', '_openstat',
            // Drip
            '__s',
            // General Affiliate & Referrer
            'ref', 'source', 'affiliate_id', 'cjevent',
            // Amazon
            'tag',
            // TikTok
            'ttclid',
            // Twitter / X.com
            'twclid', 's',
            // LinkedIn
            'li_fat_id',
            // Oracle (Eloqua)
            'elqTrackId'
        ]);

        // 需要基於前綴進行模糊匹配的參數
        const prefixTrackers = [
            'utm_',       // Universal Tracking Module (e.g., utm_source)
            'pk_',        // Matomo Analytics (e.g., pk_campaign)
            'pi_',        // Pardot / Salesforce (e.g., pi_campaign_id)
            'vero_',      // Vero Email Marketing
            'trk_',       // General Tracking Prefix
            'cmpid'       // Campaign ID
        ];

        let paramsChanged = false;

        // 遍歷並刪除所有 URL 參數
        for (const key of Array.from(u.searchParams.keys())) {
            // 檢查是否完全匹配黑名單
            if (exactTrackers.has(key)) {
                u.searchParams.delete(key);
                paramsChanged = true;
                continue; // 繼續下一個參數的檢查
            }

            // 檢查是否匹配前綴黑名單
            for (const prefix of prefixTrackers) {
                if (key.startsWith(prefix)) {
                    u.searchParams.delete(key);
                    paramsChanged = true;
                    break; // 已刪除，跳出內層迴圈
                }
            }
        }

        // 僅在參數確實被修改後才返回新的 URL 字串
        if (paramsChanged) {
            return u.toString();
        }

    } catch (e) {
        // 如果傳入的 URL 格式錯誤，則不進行任何操作
        console.log(`Error parsing URL for tracker removal: ${e}`);
    }

    return null; // 返回 null 表示不進行重寫
}

// --- Surge Script Main Logic ---
const originalUrl = $request.url;
const rewrittenUrl = removeTrackingParams(originalUrl);

if (rewrittenUrl) {
    $done({
        response: {
            status: 302,
            headers: { 'Location': rewrittenUrl }
        }
    });
} else {
    $done({}); // 不做任何事
}
