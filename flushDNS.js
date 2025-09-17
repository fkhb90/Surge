/*
 * @name         清除 DNS 快取 (Flush DNS Cache)
 * @description  用於 Surge Panel 的腳本，提供手動清除 DNS 快取功能，並顯示當前的 DNS 查詢延遲與伺服器資訊。
 * @version      2.1.0
 * @author       Pysta (原作者), Gemini (優化與重構)
 * @github       https://github.com/mieqq/mieqq (原作者項目)
 *
 * v2.1.0 更新日誌:
 * - 重構 httpAPI 函式為 httpGet 與 httpPost 兩個獨立函式，徹底避免因參數預設值或環境問題導致的 "Method Not Allowed" 錯誤。
 * - 新增版本號日誌，方便使用者確認腳本是否已成功更新。
 *
 * 使用說明：
 *
 * [Panel]
 * 清除 DNS 快取 = script-name=flush-dns.js, update-interval=600
 *
 * [Script]
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
    console.log("正在執行 [清除 DNS 快取] 腳本 v2.1.0");

    // 1. 解析傳入參數並設定面板預設值
    const config = parseArguments();

    try {
        // 2. 處理按鈕觸發事件
        if ($trigger === "button") {
            await httpPost("/v1/dns/flush"); // 使用明確的 httpPost 函式
            $notification.post(
                config.panel.title,
                "DNS 快取已成功清除",
                ""
            );
        }

        // 3. 平行獲取面板所需資訊
        const [dnsDelayResult, dnsCacheResult] = await Promise.all([
            httpGet("/v1/test/dns_delay"), // 使用明確的 httpGet 函式
            config.showServer ? httpGet("/v1/dns") : Promise.resolve(null) // 使用明確的 httpGet 函式
        ]);
        
        // 4. 處理並格式化獲取的數據
        const delay = (dnsDelayResult.delay * 1000).toFixed(0);
        let content = [`延遲: ${delay}ms`];
        
        if (config.showServer && dnsCacheResult?.dnsCache) {
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
        // 7. 錯誤處理
        console.log(`腳本執行錯誤: ${error}`);
        $notification.post(
            config.panel.title,
            "腳本執行失敗",
            `錯誤訊息: ${error}。請檢查 Surge 紀錄檔。`
        );
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
 * 封裝 Surge $httpAPI 的 GET 請求
 * @param {string} path - API 路徑
 * @returns {Promise<object>}
 */
function httpGet(path) {
    return new Promise((resolve, reject) => {
        $httpAPI("GET", path, null, (result) => {
            if (result.error) {
                reject(result.error);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * 封裝 Surge $httpAPI 的 POST 請求
 * @param {string} path - API 路徑
 * @param {object} [body=null] - 請求內文
 * @returns {Promise<object>}
 */
function httpPost(path, body = null) {
    return new Promise((resolve, reject) => {
        $httpAPI("POST", path, body, (result) => {
            if (result.error) {
                reject(result.error);
            } else {
                resolve(result);
            }
        });
    });
}
