/**
 * @name Yahoo Finance/News Stream Cleaner
 * @version 2.0
 * @description 過濾 Yahoo 股市與新聞流中的原生廣告 (Native Ads)，消除灰底佔位框。（全面優化版）
 */

let body = $response.body;

// 廣告項目判定函數
function isAdItem(item) {
    if (!item || typeof item !== 'object') return false;

    // 1. 直接類型標記
    const adTypes = ['ad', 'ytd', 'nativeAd', 'sponsored', 'Ad', 'promoAd'];
    if (adTypes.includes(item.type) || adTypes.includes(item.subType)) return true;

    // 2. 廣告追蹤信標
    if (item.ad_feedback_beacon || item.adFeedbackBeacon) return true;
    if (item.beacons?.adFeedback || item.beacons?.ad) return true;

    // 3. Gemini 廣告標記
    if (item.geminiAd || item.isGeminiAd || item.gemini) return true;

    // 4. 贊助/推廣內容
    if (item.sponsored === true || item.isSponsored === true) return true;
    if (item.promoted === true || item.isPromoted === true) return true;

    // 5. 廣告相關欄位存在性檢查
    const adFields = ['adId', 'ad_id', 'advertiserId', 'advertiser_id', 'adCreative', 'ad_creative'];
    if (adFields.some(f => item[f] !== undefined)) return true;

    // 6. 字串型態的關鍵字偵測
    if (typeof item.type === 'string' && /^(ad|sponsor|promo)/i.test(item.type)) return true;
    if (typeof item.category === 'string' && /^(ad|sponsor)/i.test(item.category)) return true;

    return false;
}

// 過濾陣列中的廣告項目
function filterArray(arr) {
    if (!Array.isArray(arr)) return { arr, changed: false };
    const original = arr.length;
    const filtered = arr.filter(item => !isAdItem(item));
    return { arr: filtered, changed: filtered.length !== original };
}

try {
    let json = JSON.parse(body);
    let modified = false;

    // 路徑 1: data.main.stream（常見於股市/新聞列表）
    if (Array.isArray(json?.data?.main?.stream)) {
        const result = filterArray(json.data.main.stream);
        json.data.main.stream = result.arr;
        if (result.changed) modified = true;
    }

    // 路徑 2: data.stream（部分舊版或不同版位）
    if (Array.isArray(json?.data?.stream)) {
        const result = filterArray(json.data.stream);
        json.data.stream = result.arr;
        if (result.changed) modified = true;
    }

    // 路徑 3: data.items
    if (Array.isArray(json?.data?.items)) {
        const result = filterArray(json.data.items);
        json.data.items = result.arr;
        if (result.changed) modified = true;
    }

    // 路徑 4: items（頂層）
    if (Array.isArray(json?.items)) {
        const result = filterArray(json.items);
        json.items = result.arr;
        if (result.changed) modified = true;
    }

    // 路徑 5: data.contentStream.stream
    if (Array.isArray(json?.data?.contentStream?.stream)) {
        const result = filterArray(json.data.contentStream.stream);
        json.data.contentStream.stream = result.arr;
        if (result.changed) modified = true;
    }

    // 路徑 6: 各類特殊 stream（trending / lead / side / packagedContent）
    for (const key of ['trendingStream', 'leadStream', 'sideStream', 'packagedContent']) {
        if (Array.isArray(json?.data?.[key])) {
            const result = filterArray(json.data[key]);
            json.data[key] = result.arr;
            if (result.changed) modified = true;
        }
    }

    // 路徑 7: data.modules 陣列（部分 Yahoo 頁面用 modules 結構）
    if (Array.isArray(json?.data?.modules)) {
        json.data.modules = json.data.modules.filter(mod => {
            if (isAdItem(mod)) { modified = true; return false; }
            // 遞迴處理模組內的 stream
            if (Array.isArray(mod?.stream)) {
                const result = filterArray(mod.stream);
                mod.stream = result.arr;
                if (result.changed) modified = true;
            }
            if (Array.isArray(mod?.data?.stream)) {
                const result = filterArray(mod.data.stream);
                mod.data.stream = result.arr;
                if (result.changed) modified = true;
            }
            return true;
        });
    }

    if (modified) {
        console.log("🧹 [Yahoo Cleaner] 成功移除原生廣告物件。");
        $done({ body: JSON.stringify(json) });
    } else {
        $done({});
    }

} catch (e) {
    console.log("⚠️ [Yahoo Cleaner] 解析失敗: " + e.message);
    $done({});
}
