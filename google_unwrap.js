/**
 * @file    google_unwrap.js
 * @title   Google Open Redirect Unwrapper
 * @desc    自動解析 google.com/url?q=... 連結，直接重定向至目標網址。
 * 用途：跳過 Google 中轉頁面，或用於安全分析時快速提取目標。
 * @warning 請注意，此腳本會讓您「更快」接觸到目標網站。若目標為惡意網站，風險將更直接。
 */

function unwrap() {
    const url = $request.url;
    const urlObj = new URL(url);
    
    // 檢查是否為 Google 重定向路徑
    if (urlObj.pathname === '/url') {
        const target = urlObj.searchParams.get('q');
        
        if (target) {
            // 解碼目標網址 (Google 可能進行了 URL Encode)
            const decodedTarget = decodeURIComponent(target);
            
            console.log(`[Google Unwrap] Redirecting to: ${decodedTarget}`);
            
            // 直接回傳 302 重定向，讓瀏覽器跳轉到真實目標
            $done({
                response: {
                    status: 302,
                    headers: {
                        Location: decodedTarget
                    }
                }
            });
            return;
        }
    }
    
    // 若無匹配或無參數，則放行原始請求
    $done({});
}

unwrap();
