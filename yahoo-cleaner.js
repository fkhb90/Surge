/**
 * @name Yahoo Finance/News Stream Cleaner
 * @version 1.0
 * @description 過濾 Yahoo 股市與新聞流中的原生廣告 (Native Ads)，消除灰底佔位框。
 */

let body = $response.body;

try {
    let json = JSON.parse(body);
    let modified = false;

    // 針對 Yahoo API 常見的數據結構進行掃描
    // 路徑 1: data.main.stream (常見於股市/新聞列表)
    if (json?.data?.main?.stream) {
        const originalLength = json.data.main.stream.length;
        json.data.main.stream = json.data.main.stream.filter(item => {
            // 過濾條件：類型為廣告 (ad) 或 原生廣告 (nativeAd)
            // Yahoo 常用的廣告標記：type: "ad", type: "ytd", 或含有 ad_feedback_beacon
            if (item.type === 'ad' || item.type === 'ytd' || item.subType === 'nativeAd') return false;
            if (item.ad_feedback_beacon) return false;
            return true;
        });
        if (json.data.main.stream.length !== originalLength) modified = true;
    }

    // 路徑 2: data.stream (部分舊版或不同版位)
    if (json?.data?.stream) {
        const originalLength = json.data.stream.length;
        json.data.stream = json.data.stream.filter(item => {
            if (item.type === 'ad') return false;
            return true;
        });
        if (json.data.stream.length !== originalLength) modified = true;
    }

    if (modified) {
        console.log("🧹 [Yahoo Cleaner] 成功移除原生廣告物件，灰框應已消失。");
        $done({ body: JSON.stringify(json) });
    } else {
        $done({});
    }

} catch (e) {
    console.log("⚠️ [Yahoo Cleaner] 解析失敗: " + e);
    $done({});
}
