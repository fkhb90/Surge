/*
 * @name         清除 DNS 快取 (Flush DNS Cache)
 * @description  用於 Surge Panel 的腳本，提供手動清除 DNS 快取功能，並顯示當前的 DNS 查詢延遲與伺服器資訊。
 * @version      2.0.0
 * @author       Pysta (原作者), Gemini (優化與重構)
 * @github       https://github.com/mieqq/mieqq (原作者項目)
 *
 * 使用說明：
 *
 * [Panel]
 * # 面板模式：顯示延遲與伺服器資訊，點擊可刷新。
 * 清除 DNS 快取 = script-name=flush-dns.js, update-interval=600
 *
 * [Script]
 * # 按鈕模式：僅執行清除 DNS 的操作。
 * 手動清除 DNS = type=generic, script-path=flush-dns.js, argument=title=清除 DNS&icon=arrow.clockwise.circle&color=#3d3d5b
 *
 * 可選參數 (argument):
 * title=標題文字     (例如: title=刷新 DNS)
 * icon=圖示名稱      (Surge SF Symbols 圖示, 例如: icon=trash)
 * color=#色碼      (圖示顏色, 例如: color=#FF0000)
 * server=false    (設為 false 則不在面板中顯示 DNS 伺服器列表)
 */

// 立即執行函式 (IIFE)，確保腳本內部變數不會污染全域。
!(async () => {
    // 1. 解析傳入參數並設定面板預設值
    const config = parseArguments();

    try {
        // 2. 處理按鈕觸發事件
        if ($trigger === "button") {
            await httpAPI("/v1/dns/flush", "POST");
            $notification.post(
                config.panel.title, // 通知標題
                "DNS 快取已成功清除", // 通知子標題
                "" // 通知內容
            );
        }

        // 3. 平行獲取面板所需資訊 (DNS 延遲和伺服器列表)
        const [dnsDelayResult, dnsCacheResult] = await Promise.all([
            httpAPI("/v1/test/dns_delay", "GET"),
            config.showServer ? httpAPI("/v1/dns", "GET") : Promise.resolve(null)
        ]);
        
        // 4. 處理並格式化獲取的數據
        const delay = (dnsDelayResult.delay * 1000).toFixed(0);
        let content = [`延遲: ${delay}ms`]; // 初始化內容陣列
        
        if (config.showServer && dnsCacheResult?.dnsCache) {
            // 使用 Set 去除重複的伺服器地址，並用換行符號連接
            const servers = [...new Set(dnsCacheResult.dnsCache.map(d => d.server))].join("\n");
            if (servers) {
                content.push(`伺服器:\n${servers}`);
            }
        }

        // 5. 更新面板內容
        config.panel.content = content.join("\n");

        // 6. 腳本執行完畢，更新面板
        $done(config.panel);

    } catch (error) {
        // 7. 錯誤處理：若 API 請求失敗則發出通知
        console.log(`腳本執行錯誤: ${error}`);
        $notification.post(
            config.panel.title,
            "腳本執行失敗",
            "請檢查 Surge 紀錄檔以獲取詳細錯誤資訊。"
        );
        // 結束腳本，不更新面板
        $done();
    }
})();

/**
 * 解析傳入的腳本參數 ($argument)
 * @returns {object} 包含面板設定 (panel) 與是否顯示伺服器 (showServer) 的物件
 */
function parseArguments() {
    let panel = { title: "清除 DNS 快取" };
    let showServer = true;

    if (typeof $argument !== "undefined" && $argument) {
        const args = Object.fromEntries(
            $argument.split("&").map(item => {
                const parts = item.split("=");
                // 解碼 URI 編碼的參數值
                if (parts.length > 1) {
                    parts[1] = decodeURIComponent(parts[1]);
                }
                return parts;
            })
        );
        
        if (args.title) panel.title = args.title;
        if (args.icon) panel.icon = args.icon;
        if (args.color) panel["icon-color"] = args.color;
        if (args.server === "false") showServer = false;
    }
    return { panel, showServer };
}

/**
 * 封裝 Surge $httpAPI 的 Promise 版本
 * @param {string} path - API 路徑 (例如: /v1/dns)
 * @param {string} method - HTTP 方法 (預設為 'POST')
 * @param {object} body - 請求內文 (預設為 null)
 * @returns {Promise<object>} - 回傳一個解析後的 API 結果物件
 */
function httpAPI(path = "", method = "POST", body = null) {
    return new Promise((resolve, reject) => {
        $httpAPI(method, path, body, (result) => {
            // 如果 result 物件中包含 error 鍵，則拒絕 Promise
            if (result.error) {
                reject(result.error);
            } else {
                resolve(result);
            }
        });
    });
}