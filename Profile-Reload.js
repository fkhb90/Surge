/*
 * =================================================================================
 * Surge 設定檔重載面板 v2.0
 * =================================================================================
 *
 * 功能：此腳本提供一個 Surge 面板按鈕，點擊後會透過 Surge HTTP API 觸發
 * 設定檔重載 (Profile Reload) 的動作，並透過系統通知與面板狀態回饋
 * 操作結果。
 *
 * 作者：Pysta
 * GitHub: https://github.com/mieqq/mieqq
 *
 * 修改與優化：TributePaulWalker, Gemini
 * 版本：2.0
 * 更新日期：2025-09-17
 *
 * =================================================================================
 * Surge 設定檔範例：
 * =================================================================================
 *
 * [Panel]
 * 設定檔重載 = title=設定檔重載, content=點擊以重新載入設定檔, style=info, script-name=Profile-Reload, update-interval=-1
 *
 * [Script]
 * # 將 "Profile-Reload.js" 替換為您儲存此腳本的實際檔案名稱
 * Profile-Reload = type=generic, script-path=https://example.com/Profile-Reload.js
 *
 * =================================================================================
 */

// IIFE (立即調用函式表達式) 以避免全域變數污染
(async () => {
    // --- 常數定義 ---
    const SCRIPT_NAME = "設定檔重載";

    // 成功時的面板設定
    const SUCCESS_CONFIG = {
        title: SCRIPT_NAME,
        content: "設定檔已成功重載",
        icon: "arrow.triangle.2.circlepath",
        "icon-color": "#5AC8FA", // 藍色
    };

    // 失敗時的面板設定
    const FAILURE_CONFIG = {
        title: SCRIPT_NAME,
        content: "設定檔重載失敗，請檢查 Surge 錯誤日誌",
        icon: "xmark.octagon.fill",
        "icon-color": "#FF3B30", // 紅色
    };

    /**
     * 封裝 Surge HTTP API 請求為 Promise 物件
     * @param {string} method - HTTP 方法 (例如 "POST", "GET")
     * @param {string} path - API 路徑 (例如 "/v1/profiles/reload")
     * @param {object} body - 請求主體
     * @returns {Promise<object>} - 解析後的回應資料
     */
    const sendHttpApiRequest = (method, path, body = {}) => {
        return new Promise((resolve, reject) => {
            $httpAPI(method, path, body, (result, error) => {
                if (error) {
                    // 若 API 請求失敗，則 reject Promise 並附上錯誤資訊
                    return reject(new Error(`HTTP API 請求錯誤: ${error}`));
                }
                // 請求成功，resolve Promise
                resolve(result);
            });
        });
    };

    /**
     * 執行設定檔重載的主要函式
     */
    const executeReload = async () => {
        try {
            // 發送重載請求並等待回應
            await sendHttpApiRequest("POST", "/v1/profiles/reload");

            // 成功邏輯
            console.log(`[${SCRIPT_NAME}]：${SUCCESS_CONFIG.content}`);
            $notification.post(SUCCESS_CONFIG.title, "", SUCCESS_CONFIG.content);
            $done(SUCCESS_CONFIG);

        } catch (error) {
            // 失敗邏輯
            console.error(`[${SCRIPT_NAME}]：${FAILURE_CONFIG.content} | 錯誤詳情：${error.message}`);
            // 在面板內容中加入更詳細的錯誤訊息，方便除錯
            const failureContent = `${FAILURE_CONFIG.content}\n錯誤詳情：${error.message}`;
            $notification.post(FAILURE_CONFIG.title, "", failureContent);
            $done({ ...FAILURE_CONFIG, content: failureContent });
        }
    };

    // --- 腳本執行入口 ---
    await executeReload();
})();