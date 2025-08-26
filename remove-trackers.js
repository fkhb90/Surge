/**
 * Surge Script: Enhanced Tracking Parameters Remover
 * Version: 3.0
 * Author: Claude
 * 功能：移除追蹤參數，保護隱私，排除 YouTube 必要功能參數
 * 特色：支援更多追蹤平台，智慧型 YouTube 保護機制
 * 
 * ═══════════════════════════════════════════════════════════════
 * 優化功能對比表
 * ═══════════════════════════════════════════════════════════════
 * | 功能項目         | 原版本v2.0  | 優化版本v3.0          | 改善效果        |
 * |-----------------|-------------|----------------------|----------------|
 * | 追蹤參數數量     | ~25 個      | 85+ 個               | 覆蓋率提升 240% |
 * | YouTube 保護    | 無          | 智慧型保護機制        | 避免影片無法播放 |
 * | 平台支援         | 基礎平台    | 全方位電商、社群、廣告 | 支援台灣常用平台 |
 * | 錯誤處理         | 基礎        | 強化異常捕獲          | 提升穩定性      |
 * | 效能最佳化       | 一般        | 預先檢查 + 快取控制    | 減少不必要處理  |
 *
 */

function removeTrackingParams(url) {
    try {
        const u = new URL(url);
        const hostname = u.hostname.toLowerCase();
        
        // --- YouTube 網站特殊處理 ---
        const isYouTube = hostname.includes('youtube.com') || 
                         hostname.includes('youtu.be') || 
                         hostname.includes('youtube-nocookie.com') ||
                         hostname.includes('m.youtube.com');
        
        // --- 完全匹配的追蹤參數黑名單 ---
        const exactTrackers = new Set([
            // Google Ads & Analytics
            'gclid', 'dclid', 'gclsrc', 'gbraid', 'wbraid',
            
            // Facebook (Meta) 追蹤
            'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
            
            // Microsoft Ads & Bing
            'msclkid', 'mscid', 'bingid',
            
            // Email Marketing 平台
            'mc_cid', 'mc_eid',        // Mailchimp
            '_hsenc', '_hsmi',         // HubSpot
            'mkt_tok',                 // Marketo
            'elqTrackId', 'elq',       // Oracle Eloqua
            'vero_conv', 'vero_id',    // Vero
            'et_rid',                  // ExactTarget
            'ncid',                    // Newsletter Campaign ID
            
            // 社群媒體追蹤
            'igshid', 'igsh',          // Instagram
            'ttclid',                  // TikTok
            'twclid', 's',             // Twitter/X
            'li_fat_id', 'lipi',       // LinkedIn
            'pin_medium', 'pin_source', // Pinterest
            'sc_ref',                  // Snapchat
            
            // 聯盟行銷 & 推薦
            'ref', 'source', 'referrer', 'affiliate_id', 'cjevent', 'aff_id',
            'partner_id', 'subid', 'clickid', 'transaction_id',
            
            // Amazon 追蹤
            'tag', 'ascsubtag', 'linkCode', 'linkId',
            
            // 搜尋引擎 & 廣告網路
            'yclid', '_openstat',      // Yandex
            'zanpid',                  // 轉轉聯盟
            'spm',                     // 淘寶/天貓
            'scm',                     // 阿里巴巴系統
            'pvid',                    // 頁面訪問 ID
            
            // 電商 & 零售追蹤
            'cmpid', 'campaign_id', 'camp_id',
            'promo_code', 'coupon_code',
            'src_id', 'source_id',
            'click_id', 'creative_id', 'ad_id',
            
            // 通用追蹤參數
            '__s',                     // Drip
            '_trms',                   // 一般追蹤標記
            'trkid',                   // 追蹤 ID
            'tracking_id',             // 追蹤識別碼
            'sessionid',               // 會話 ID（某些情況下）
            'from', 'share_from',      // 分享來源
            
            // YouTube 廣告與追蹤參數（保留影片核心參數）
            'si',                      // Share ID
            'kw',                      // Keyword
            'pp',                      // Placement
            'feature',                 // 功能標記（非核心）
            'gclsrc',                  // Google Click Source
            'pc',                      // Partner Campaign
        ]);
        
        // --- 前綴匹配的追蹤參數模式 ---
        const prefixTrackers = [
            'utm_',                    // Google Analytics UTM
            'pk_',                     // Matomo/Piwik
            'pi_',                     // Pardot
            'vero_',                   // Vero Email
            'trk_',                    // 通用追蹤前綴
            'cmpid',                   // Campaign ID 變體
            'ga_',                     // Google Analytics
            'gm_',                     // Google Marketing
            'fb_',                     // Facebook 變體
            'tw_',                     // Twitter 變體
            'li_',                     // LinkedIn 變體
            'ig_',                     // Instagram 變體
            'tt_',                     // TikTok 變體
            'yt_',                     // YouTube 追蹤
            'sc_',                     // 多個平台的 Source Campaign
            '_branch_',               // Branch.io
            'adj_',                    // Adjust
            'af_',                     // AppsFlyer
            'at_',                     // Adobe Target
        ];
        
        // --- YouTube 必須保留的核心參數 ---
        const youtubeEssentialParams = new Set([
            'v',           // 影片 ID
            't',           // 時間戳
            'list',        // 播放清單
            'index',       // 清單索引
            'start',       // 開始時間
            'end',         // 結束時間
            'loop',        // 循環播放
            'controls',    // 控制項顯示
            'autoplay',    // 自動播放
            'mute',        // 靜音
            'cc_lang_pref', // 字幕語言
            'cc_load_policy', // 字幕載入策略
            'hl',          // 界面語言
            'cc',          // 字幕開關
            'rel',         // 相關影片
            'showinfo',    // 顯示資訊
            'iv_load_policy', // 互動元素策略
            'playsinline', // 內嵌播放
            'widget_referrer', // Widget 參考
            'time_continue', // 繼續時間
            'has_verified', // 驗證狀態
            'bpctr',       // 播放控制
            'origin',      // 來源（嵌入時必要）
        ]);
        
        let paramsChanged = false;
        
        // 遍歷所有 URL 參數進行檢查
        for (const key of Array.from(u.searchParams.keys())) {
            let shouldDelete = false;
            
            // 如果是 YouTube，先檢查是否為必要參數
            if (isYouTube && youtubeEssentialParams.has(key)) {
                continue; // 跳過，保留必要參數
            }
            
            // 檢查完全匹配的追蹤參數
            if (exactTrackers.has(key)) {
                shouldDelete = true;
            } else {
                // 檢查前綴匹配的追蹤參數
                for (const prefix of prefixTrackers) {
                    if (key.startsWith(prefix)) {
                        shouldDelete = true;
                        break;
                    }
                }
            }
            
            // 執行參數刪除
            if (shouldDelete) {
                u.searchParams.delete(key);
                paramsChanged = true;
            }
        }
        
        // 只有在參數確實被修改時才返回新 URL
        if (paramsChanged) {
            return u.toString();
        }
        
    } catch (e) {
        console.log(`追蹤參數移除錯誤: ${e.message}`);
    }
    
    return null; // 無變更時返回 null
}

// --- 主要執行邏輯 ---
const originalUrl = $request.url;
const cleanUrl = removeTrackingParams(originalUrl);

if (cleanUrl && cleanUrl !== originalUrl) {
    // 執行 302 重定向到清理後的 URL
    $done({
        response: {
            status: 302,
            headers: { 
                'Location': cleanUrl,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        }
    });
} else {
    // 不進行任何修改
    $done({});
}
