function removeTrackingParams(url) {
    let u = new URL(url);
    const trackers = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'igshid', 'ref'];
    let paramsChanged = false;

    // 遍歷所有已知的追蹤參數並從 URLSearchParams 中刪除
    trackers.forEach(param => {
        if (u.searchParams.has(param)) {
            u.searchParams.delete(param);
            paramsChanged = true;
        }
    });

    // 處理 utm_* 這種模糊匹配
    for (let key of Array.from(u.searchParams.keys())) {
        if (key.startsWith('utm_')) {
            u.searchParams.delete(key);
            paramsChanged = true;
        }
    }
    
    if (paramsChanged) {
        return u.toString();
    }
    return null; // 返回 null 表示不進行重寫
}

let originalUrl = $request.url;
let rewrittenUrl = removeTrackingParams(originalUrl);

if (rewrittenUrl) {
    $done({
        response: {
            status: 302,
            headers: {
                Location: rewrittenUrl
            }
        }
    });
} else {
    $done({}); // 不做任何事
}
