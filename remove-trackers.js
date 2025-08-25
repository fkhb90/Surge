/**
 * Surge Script: Remove Tracking Parameters (Youtube API Safe)
 * Version: 2.2
 * Author: Gemini
 * 修正：允許 Youtube API 網址完全通過，不做任何參數移除
 */
function removeTrackingParams(url) {
    try {
        const u = new URL(url);

        // --- Youtube API 網址完全放行 ---
        if (u.hostname === 'youtubei.googleapis.com') {
            // 直接返回 null，不做任何處理
            return null;
        }

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
            'twclid', // ⚠️ 's' 已移除
            // LinkedIn
            'li_fat_id',
            // Oracle (Eloqua)
            'elqTrackId'
        ]);

        const prefixTrackers = [
            'utm_',       // Universal Tracking Module (e.g., utm_source)
            'pk_',        // Matomo Analytics (e.g., pk_campaign)
            'pi_',        // Pardot / Salesforce (e.g., pi_campaign_id)
            'vero_',      // Vero Email Marketing
            'trk_',       // General Tracking Prefix
            'cmpid'       // Campaign ID
        ];

        let paramsChanged = false;

        // Youtube 主網站：只移除明確黑名單，不做前綴模糊刪除
        if (
            u.hostname.endsWith('youtube.com') ||
            u.hostname.endsWith('youtu.be')
        ) {
            for (const key of Array.from(u.searchParams.keys())) {
                if (exactTrackers.has(key)) {
                    u.searchParams.delete(key);
                    paramsChanged = true;
                }
            }
        } else {
            // 其他網址：黑名單 + 前綴模糊刪除
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
    $done({}); // Youtube API 直接通過，不做任何事
}
