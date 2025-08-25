/**
 * Surge Script: Remove Tracking Parameters (Youtube Safe Version)
 * Version: 2.1
 * Author: Gemini
 * 修正：避免 Youtube 網址被誤傷，允許正常播放
 */
function removeTrackingParams(url) {
    try {
        const u = new URL(url);

        // --- 追蹤參數黑名單 ---
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
            'twclid',
            // LinkedIn
            'li_fat_id',
            // Oracle (Eloqua)
            'elqTrackId'
            // ⚠️ 移除 's'，避免誤傷 Youtube
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

        // 特殊處理 Youtube 網址
        if (
            u.hostname.endsWith('youtube.com') ||
            u.hostname.endsWith('youtu.be')
        ) {
            // 只移除明確黑名單，不做前綴模糊刪除
            for (const key of Array.from(u.searchParams.keys())) {
                if (exactTrackers.has(key)) {
                    u.searchParams.delete(key);
                    paramsChanged = true;
                }
            }
        } else {
            // 一般網址：黑名單 + 前綴模糊刪除
            for (const key of Array.from(u.searchParams.keys())) {
                if (exactTrackers.has(key)) {
                    u.searchParams.delete(key);
                    paramsChanged = true;
                    continue;
                }
                for (const prefix of prefixTrackers) {
                    if (key.startsWith(prefix)) {
                        u.searchParams.delete(key);
                        paramsChanged = true;
                        break;
                    }
                }
            }
        }

        if (paramsChanged) {
            return u.toString();
        }
    } catch (e) {
        console.log(`Error parsing URL for tracker removal: ${e}`);
    }
    return null;
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
    $done({});
}
