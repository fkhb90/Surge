/*
 * Surge 網路詳情面板 v2.1
 *
 * @author Nebulosa-Cat (Original Author)
 * @author Gemini (Code Refactoring & Optimization)
 *
 * 最後更新時間: 2025-09-17
 *
 * v2.1: 修正了 ip-api.com 免費版不支援 HTTPS 的問題，將 API URL 改回 HTTP。
 *
 * 此版本基於原版進行了全面的程式碼優化與現代化，提升了效能、可讀性與穩定性。
 * 詳情請見 README。
 */

// --- 全域靜態資料 ---

/**
 * 無線電技術世代對照表
 * @const {Object<string, string>}
 */
const RADIO_GENERATION = {
    'GPRS': '2.5G',
    'CDMA1x': '2.5G',
    'EDGE': '2.75G',
    'WCDMA': '3G',
    'HSDPA': '3.5G',
    'CDMAEVDORev0': '3.5G',
    'CDMAEVDORevA': '3.5G',
    'CDMAEVDORevB': '3.75G',
    'HSUPA': '3.75G',
    'eHRPD': '3.9G',
    'LTE': '4G',
    'NRNSA': '5G',
    'NR': '5G',
};

/**
 * 電信業者 MCC-MNC 代碼對照表
 * @const {Object<string, string>}
 */
const CARRIER_NAMES = {
    // 台灣電信業者 (Taiwan)
    '466-11': '中華電信', '466-92': '中華電信',
    '466-01': '遠傳電信', '466-03': '遠傳電信', '466-05': '遠傳電信 (原亞太)', // GT 亞太電信已併入遠傳
    '466-97': '台灣大哥大', '466-89': '台灣大哥大 (原台灣之星)', // 台灣之星已併入台灣大哥大

    // 中國電信業者 (China)
    '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
    '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
    '460-00': '中国移动', '460-02': '中国移动', '460-04': '中国移动', '460-07': '中国移动', '460-08': '中国移动',
    '460-15': '中国广电', '460-20': '中移铁通',

    // 香港電信業者 (Hong Kong)
    '454-00': 'CSL', '454-02': 'CSL', '454-10': 'CSL', '454-18': 'CSL',
    '454-03': '3', '454-04': '3', '454-05': '3',
    '454-06': 'SMC HK', '454-15': 'SMC HK', '454-17': 'SMC HK',
    '454-09': 'CMHK', '454-12': 'CMHK', '454-13': 'CMHK', '454-28': 'CMHK', '454-31': 'CMHK',
    '454-16': 'csl.', '454-19': 'csl.', '454-20': 'csl.', '454-29': 'csl.',
    '454-01': '中信國際電訊', '454-07': 'UNICOM HK', '454-08': 'Truphone', '454-11': 'CHKTL', '454-23': 'Lycamobile',

    // 日本電信業者 (Japan)
    '440-00': 'Y!mobile', '440-10': 'docomo', '440-11': 'Rakuten', '440-20': 'SoftBank',
    '440-50': 'au', '440-51': 'au', '440-52': 'au', '440-53': 'au', '440-54': 'au',
    '441-00': 'WCP', '441-10': 'UQ WiMAX',

    // 韓國電信業者 (South Korea)
    '450-03': 'SKT', '450-05': 'SKT',
    '450-02': 'KT', '450-04': 'KT', '450-08': 'KT',
    '450-06': 'LG U+', '450-10': 'LG U+',

    // 美國電信業者 (USA) - 僅列出主要業者
    '310-030': 'AT&T', '310-070': 'AT&T', '310-150': 'AT&T', '310-170': 'AT&T', '310-280': 'AT&T', '310-410': 'AT&T', '310-560': 'AT&T', '310-680': 'AT&T',
    '310-200': 'T-Mobile', '310-210': 'T-Mobile', '310-220': 'T-Mobile', '310-230': 'T-Mobile', '310-240': 'T-Mobile', '310-250': 'T-Mobile', '310-260': 'T-Mobile', '310-310': 'T-Mobile', '310-660': 'T-Mobile', '310-800': 'T-Mobile',
    '310-004': 'Verizon', '310-012': 'Verizon', '311-270': 'Verizon', '311-480': 'Verizon',
    '310-120': 'Sprint', // Sprint 已併入 T-Mobile

    // 英國電信業者 (UK)
    '234-02': 'O2-UK', '234-10': 'O2-UK',
    '234-15': 'Vodafone UK',
    '234-20': '3 UK',
    '234-30': 'EE', '234-33': 'EE',
    
    // 法國電信業者 (France)
    '208-01': 'Orange', '208-15': 'Free', '208-20': 'Bouygues',

    // 菲律賓電信業者 (Philippines)
    '515-01': 'Islacom', '515-02': 'Globe', '515-03': 'Smart', '515-04': 'Sun',

    // 越南電信業者 (Vietnam)
    '452-01': 'Mobifone', '452-02': 'VinaPhone', '452-04': 'Viettel', '452-05': 'VietNamobile',

    // 馬來西亞電信業者 (Malaysia)
    '502-13': 'CelcomDigi', '502-19': 'CelcomDigi',
    '502-150': 'Tune Talk',
    '502-17': 'Maxis',
};


// --- 工具類別與函數 ---

/**
 * 網路請求封裝，將 $httpClient 回調函數 Promise 化。
 * @class
 */
class Http {
    /**
     * 發送 HTTP GET 請求
     * @param {Object|string} options - 請求選項或 URL
     * @returns {Promise<{status: number, headers: Object, data: string|Object}>}
     */
    get(options = {}) {
        return new Promise((resolve, reject) => {
            $httpClient.get(options, (error, response, data) => {
                if (error) {
                    return reject(error);
                }
                resolve({ ...response, data });
            });
        });
    }

    /**
     * 發送 HTTP POST 請求
     * @param {Object} options - 請求選項
     * @returns {Promise<{status: number, headers: Object, data: string|Object}>}
     */
    post(options = {}) {
        return new Promise((resolve, reject) => {
            $httpClient.post(options, (error, response, data) => {
                if (error) {
                    return reject(error);
                }
                resolve({ ...response, data });
            });
        });
    }
}

/**
 * 簡單日誌工具，為日誌添加隨機 ID 以便於追蹤。
 * @class
 */
class Logger {
    constructor() {
        this.id = this.randomString();
    }
    
    /**
     * 產生指定長度的隨機字串
     * @param {number} [length=6] - 字串長度
     * @returns {string}
     */
    randomString(length = 6) {
        const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    log(message) {
        console.log(`[${this.id}] [LOG] ${message}`);
    }

    error(message) {
        console.log(`[${this.id}] [ERROR] ${message}`);
    }
}

/**
 * 將國家代碼轉換為國旗表情符號
 * @param {string} countryCode - ISO 3166-1 alpha-2 國家代碼
 * @returns {string} 國旗表情符號
 */
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '❓';
    }
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

/**
 * 取得當前 Wi-Fi 的 SSID
 * @returns {string|undefined}
 */
function getSSID() {
    return $network.wifi?.ssid;
}

/**
 * 取得行動網路資訊
 * @returns {string}
 */
function getCellularInfo() {
    const cellularData = $network['cellular-data'];
    if (!cellularData?.carrier || !cellularData?.radio) {
        return '';
    }
    
    const carrierId = cellularData.carrier;
    const radio = cellularData.radio;
    const generation = RADIO_GENERATION[radio] || 'N/A';
    const carrierName = CARRIER_NAMES[carrierId] || `行動數據 (${carrierId})`;
    
    return `${carrierName} | ${generation} - ${radio}`;
}

/**
 * 格式化並取得本地 IP 位址資訊
 * @returns {string}
 */
function getLocalIPInfo() {
    const { v4, v6 } = $network;
    const info = [];
    
    if (!v4?.primaryAddress && !v6?.primaryAddress) {
        return '網路可能切換中，請手動重整面板\n';
    }

    if (v4?.primaryAddress) info.push(`IPv4: ${v4.primaryAddress}`);
    if (v6?.primaryAddress) info.push(`IPv6: ${v6.primaryAddress}`);

    const isWifi = !!getSSID();
    if (isWifi && v4?.primaryRouter) info.push(`Router IPv4: ${v4.primaryRouter}`);
    if (isWifi && v6?.primaryRouter) info.push(`Router IPv6: ${v6.primaryRouter}`);

    return info.join('\n') + '\n';
}

/**
 * 獲取公網 IP 資訊並產生面板
 * @param {Logger} logger - 日誌實例
 * @param {Http} http - Http 請求實例
 * @param {number} [retryTimes=3] - 剩餘重試次數
 * @param {number} [retryInterval=1000] - 重試間隔 (ms)
 */
async function generatePanel(logger, http, retryTimes = 3, retryInterval = 1000) {
    try {
        // [v2.1] 修正：免費版 API 不支援 HTTPS，改回 HTTP
        const apiUrl = 'http://ip-api.com/json?fields=status,country,countryCode,city,isp,query';
        const response = await http.get(apiUrl);

        if (response.status !== 200) {
            throw new Error(`API 請求失敗，狀態碼: ${response.status}`);
        }
        
        const info = JSON.parse(response.data);
        if (info.status !== 'success') {
            throw new Error(`API 回應錯誤: ${info.message || '未知錯誤'}`);
        }

        const isWifi = !!getSSID();
        const content = `
[本地網路資訊]
${getLocalIPInfo()}
[節點 IP] ${info.query}
[節點 ISP] ${info.isp}
[節點位置] ${getFlagEmoji(info.countryCode)} ${info.country} - ${info.city}
        `.trim();

        $done({
            title: getSSID() || getCellularInfo() || '網路資訊',
            content,
            icon: isWifi ? 'wifi' : 'simcard',
            'icon-color': isWifi ? '#007AFF' : '#F9BF45',
        });

    } catch (error) {
        logger.error(error.toString());
        
        // Surge 特有的網路切換錯誤
        if (error.toString().includes("Network changed")) {
            // 清除舊的網路狀態，以便下次重試時重新獲取
            $network.wifi = undefined;
            $network.v4 = undefined;
            $network.v6 = undefined;
        }

        if (retryTimes > 0) {
            logger.log(`請求失敗，${retryInterval}ms 後重試... (剩餘 ${retryTimes - 1} 次)`);
            setTimeout(() => generatePanel(logger, http, retryTimes - 1, retryInterval), retryInterval);
        } else {
            logger.error('重試次數已用盡，顯示錯誤面板');
            $done({
                title: '網路資訊獲取失敗',
                content: '無法獲取目前網路資訊，請檢查網路連線後重試。',
                icon: 'wifi.exclamationmark',
                'icon-color': '#FF3B30',
            });
        }
    }
}

/**
 * 主執行函數
 */
(function main() {
    const logger = new Logger();
    const http = new Http();

    const retryTimes = 3;
    const retryInterval = 1000;
    
    // Surge 腳本預設逾時為 30 秒，這裡設定一個較短的逾時以提供更友善的錯誤訊息。
    // 計算方式：(請求逾時(預設5s) + 重試間隔) * 重試次數 + 緩衝時間
    const scriptTimeout = (5000 + retryInterval) * (retryTimes + 1) + 500;
    const surgeMaxTimeout = 29500; // 略小於 30s
    
    const timeoutHandle = setTimeout(() => {
        logger.error("腳本執行逾時");
        $done({
            title: "請求逾時",
            content: "連線請求逾時，請檢查網路狀態或代理設定。",
            icon: 'wifi.exclamationmark',
            'icon-color': '#FF3B30',
        });
    }, Math.min(scriptTimeout, surgeMaxTimeout));

    logger.log("腳本啟動，開始獲取網路資訊...");
    generatePanel(logger, http, retryTimes, retryInterval).finally(() => {
        // 無論成功或失敗，只要 generatePanel 執行完畢就清除計時器
        clearTimeout(timeoutHandle);
    });
})();
