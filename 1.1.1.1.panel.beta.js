/*
 * Cloudflare 綜合面板腳本 (v2.0 優化版)
 *
 * 此腳本基於 VirgilClyne 的原始版本進行深度優化與繁體中文化。
 * 主要功能為在 Surge、Stash、Quantumult X 等網路工具中顯示 Cloudflare WARP+ 的相關資訊，
 * 包括連線狀態、IP 位址、節點位置以及帳號流量等。
 *
 * 優化重點：
 * 1. 程式碼現代化：全面採用 ES6+ 語法，提升執行效率與可讀性。
 * 2. 結構重構：簡化邏輯判斷，將重複程式碼模組化，提升可維護性。
 * 3. 錯誤處理：強化網路請求與資料解析的錯誤處理機制。
 * 4. 在地化：所有介面與日誌資訊均已針對台灣使用者進行繁體中文化。
 * 5. 註解完善：新增 JSDoc 註解，方便理解與後續開發。
 *
 * GitHub Repo: https://github.com/VirgilClyne/Cloudflare
 */

// 版本號 v2.0.0
const SCRIPT_VERSION = "2.0.0";

/**
 * @class Lodash
 * @description 一個輕量級的工具類別，模擬 Lodash 的部分核心功能，用於物件操作。
 * @version 1.3.0
 */
class Lodash {
	static name = "Lodash";
	static version = "1.3.0";

	/**
	 * 取得物件中指定路徑的值。
	 * @param {object} object - 來源物件。
	 * @param {string|string[]} path - 屬性路徑，例如 'a.b[0].c'。
	 * @param {*} [defaultValue=undefined] - 若找不到值時的回傳預設值。
	 * @returns {*} 找到的值或預設值。
	 */
	static get(object = {}, path = "", defaultValue = undefined) {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		const result = pathArray.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), object);
		return result === undefined ? defaultValue : result;
	}

	/**
	 * 設定物件中指定路徑的值。
	 * @param {object} object - 目標物件。
	 * @param {string|string[]} path - 屬性路徑。
	 * @param {*} value - 要設定的值。
	 * @returns {object} 修改後的物件。
	 */
	static set(object = {}, path = "", value) {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		let index = 0;
		for (index = 0; index < pathArray.length - 1; index++) {
			const key = pathArray[index];
			if (!object[key] || typeof object[key] !== 'object') {
				const nextKey = pathArray[index + 1];
				object[key] = /^\d+$/.test(nextKey) ? [] : {};
			}
			object = object[key];
		}
		object[pathArray[index]] = value;
		return object;
	}

	/**
	 * 從物件中移除指定路徑的屬性。
	 * @param {object} object - 目標物件。
	 * @param {string|string[]} path - 屬性路徑。
	 * @returns {boolean} 如果成功刪除則回傳 true，否則回傳 false。
	 */
	static unset(object = {}, path = "") {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		let current = object;
		for (let i = 0; i < pathArray.length - 1; i++) {
			const key = pathArray[i];
			if (current[key] === undefined) {
				return true;
			}
			current = current[key];
		}
		return delete current[pathArray[pathArray.length - 1]];
	}

	/**
	 * 將字串路徑轉換為路徑陣列。
	 * @param {string} value - 字串路徑，例如 'a[0].b'。
	 * @returns {string[]} 路徑陣列，例如 ['a', '0', 'b']。
	 */
	static toPath(value) {
		return value.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	}
}

/**
 * @class $Storage
 * @description 一個跨平台的持久化儲存類別，封裝了不同環境下的儲存 API。
 * @version 1.1.0
 */
class $Storage {
	static name = "$Storage";
	static version = "1.1.0";
	static #platform = (() => {
		if (typeof $environment !== 'undefined') {
			if ($environment['surge-version']) return 'Surge';
			if ($environment['stash-version']) return 'Stash';
		}
		if (typeof module !== 'undefined' && module.exports) return 'Node.js';
		if (typeof $task !== 'undefined') return 'Quantumult X';
		if (typeof $loon !== 'undefined') return 'Loon';
		if (typeof $rocket !== 'undefined') return 'Shadowrocket';
		if (typeof Egern !== 'undefined') return 'Egern';
		return undefined;
	})();
	static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;

	/**
	 * 讀取一個值。
	 * @param {string} keyName - 鍵名。支援 @key.path 格式讀取 JSON 子屬性。
	 * @param {*} [defaultValue=null] - 預設值。
	 * @returns {*} 儲存的值或預設值。
	 */
	static getItem(keyName = "", defaultValue = null) {
		if (keyName.startsWith('@')) {
			const match = keyName.match(this.#nameRegex);
			if (!match) return defaultValue;
			const { key, path } = match.groups;
			const storedValue = this.getItem(key, {});
			const value = typeof storedValue === 'object' && storedValue !== null ? Lodash.get(storedValue, path) : undefined;
			if (value !== undefined && value !== null) {
				try {
					return JSON.parse(value);
				} catch {
					return value;
				}
			}
			return defaultValue;
		}

		let value;
		switch (this.#platform) {
			case 'Surge':
			case 'Loon':
			case 'Stash':
			case 'Egern':
			case 'Shadowrocket':
				value = $persistentStore.read(keyName);
				break;
			case 'Quantumult X':
				value = $prefs.valueForKey(keyName);
				break;
			case 'Node.js':
				// Node.js 環境的讀取邏輯需自行實現
				value = null;
				break;
			default:
				value = null;
		}

		if (value === null || value === undefined) {
			return defaultValue;
		}
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}

	/**
	 * 寫入一個值。
	 * @param {string} keyName - 鍵名。支援 @key.path 格式寫入 JSON 子屬性。
	 * @param {*} keyValue - 要寫入的值。
	 * @returns {boolean} 是否寫入成功。
	 */
	static setItem(keyName = "", keyValue) {
		const valueToWrite = typeof keyValue === 'object' ? JSON.stringify(keyValue) : String(keyValue);

		if (keyName.startsWith('@')) {
			const match = keyName.match(this.#nameRegex);
			if (!match) return false;
			const { key, path } = match.groups;
			let rootValue = this.getItem(key, {});
			if (typeof rootValue !== 'object' || rootValue === null) {
				rootValue = {};
			}
			Lodash.set(rootValue, path, valueToWrite);
			return this.setItem(key, rootValue);
		}

		switch (this.#platform) {
			case 'Surge':
			case 'Loon':
			case 'Stash':
			case 'Egern':
			case 'Shadowrocket':
				return $persistentStore.write(valueToWrite, keyName);
			case 'Quantumult X':
				return $prefs.setValueForKey(valueToWrite, keyName);
			case 'Node.js':
				// Node.js 環境的寫入邏輯需自行實現
				return false;
			default:
				return false;
		}
	}
}

/**
 * @class ENV
 * @description 核心環境封裝類別，提供跨平台腳本執行所需的功能。
 * @version 2.0.0
 */
class ENV {
	static name = "ENV";
	static version = '2.0.0';

	constructor(name, opts) {
		this.name = name;
		this.logs = [];
		this.isMute = false;
		this.isMuteLog = false;
		this.logSeparator = '\n';
		this.startTime = Date.now();
		Object.assign(this, opts);
		this.log(`\n▶️ 開始執行腳本: ${name}`);
	}

	platform = (() => {
		if (typeof $environment !== 'undefined') {
			if ($environment['surge-version']) return 'Surge';
			if ($environment['stash-version']) return 'Stash';
		}
		if (typeof module !== 'undefined' && module.exports) return 'Node.js';
		if (typeof $task !== 'undefined') return 'Quantumult X';
		if (typeof $loon !== 'undefined') return 'Loon';
		if (typeof $rocket !== 'undefined') return 'Shadowrocket';
		if (typeof Egern !== 'undefined') return 'Egern';
		return 'Unknown';
	})();

	isNode = () => this.platform === 'Node.js';
	isQuanX = () => this.platform === 'Quantumult X';
	isSurge = () => this.platform === 'Surge';
	isLoon = () => this.platform === 'Loon';
	isStash = () => this.platform === 'Stash';
	isEgern = () => this.platform === 'Egern';
	isShadowrocket = () => this.platform === 'Shadowrocket';

	/**
	 * 執行網路請求。
	 * @param {string|object} request - 請求 URL 或完整的請求選項物件。
	 * @returns {Promise<object>} - 包含回應的 Promise。
	 */
	async fetch(request = {}) {
		const options = typeof request === 'string' ? { url: request } : request;
		if (!options.method) {
			options.method = (options.body || options.bodyBytes) ? "POST" : "GET";
		}
		const method = options.method.toLowerCase();

		switch (this.platform) {
			case 'Surge':
			case 'Loon':
			case 'Stash':
			case 'Egern':
			case 'Shadowrocket':
				return new Promise((resolve, reject) => {
					$httpClient[method](options, (error, response, body) => {
						if (error) return reject(error);
						response.ok = /^2\d\d$/.test(response.status);
						response.statusCode = response.status;
						response.body = body;
						if (options["binary-mode"]) {
							response.bodyBytes = body;
						}
						resolve(response);
					});
				});
			case 'Quantumult X':
				return $task.fetch(options).then(
					response => {
						response.ok = /^2\d\d$/.test(response.statusCode);
						response.status = response.statusCode;
						return response;
					},
					reason => Promise.reject(reason.error)
				);
			case 'Node.js':
				// Node.js 環境的 fetch 邏輯需自行實現
				return Promise.reject(new Error("Fetch not implemented in Node.js environment."));
			default:
				return Promise.reject(new Error("Unsupported platform for fetch."));
		}
	}

	/**
	 * 系統通知。
	 * @param {string} title - 標題。
	 * @param {string} [subt=''] - 副標題。
	 * @param {string} [desc=''] - 通知內容。
	 * @param {object|string} [opts] - 額外選項，如打開 URL。
	 */
	msg(title = this.name, subt = '', desc = '', opts) {
		if (!this.isMute) {
			const platform = this.platform;
			const notificationFunction = platform === 'Quantumult X' ? $notify : $notification?.post;
			if (notificationFunction) {
				notificationFunction(title, subt, desc, opts);
			}
		}
		this.log(`[📣 系統通知] ${title} - ${subt} - ${desc}`);
	}

	log(...messages) {
		if (!this.isMuteLog) {
			const logMessage = messages.join(this.logSeparator);
			this.logs.push(logMessage);
			console.log(logMessage);
		}
	}

	logErr(error) {
		this.log(`[❗️ 錯誤]`, error.stack || error);
	}

	/**
	 * 腳本執行完畢。
	 * @param {object} [result={}] - 回傳給主程式的結果。
	 */
	done(result = {}) {
		const endTime = Date.now();
		const costTime = (endTime - this.startTime) / 1000;
		this.log(`\n⏹️ 腳本執行完畢: ${this.name}, 耗時 ${costTime} 秒`);
		$done(result);
	}
}

/**
 * @class CloudflareAPI
 * @description Cloudflare API v4 的客戶端。
 * @version 1.2.0
 */
class CloudflareAPI {
	constructor(envInstance) {
		this.name = "Cloudflare API v4";
		this.version = '1.2.0';
		this.baseURL = "https://api.cloudflare.com/client/v4";
		this.$ = envInstance;
		this.$.log(`初始化 ${this.name} v${this.version}`);
	}

	async #apiRequest(request, options) {
		try {
			const response = await this.$.fetch(request, options);
			const body = JSON.parse(response.body);
			if (!body.success) {
				body.errors.forEach(error => this.$.msg(this.name, `錯誤碼: ${error.code}`, error.message));
				return null;
			}
			return body.result?.[0] ?? body.result ?? body;
		} catch (error) {
			this.$.logErr(error);
			return null;
		}
	}

	async trace(ipv, request) {
		const url = ipv === 4 ? "https://1.1.1.1/cdn-cgi/trace" : "https://[2606:4700:4700::1111]/cdn-cgi/trace";
		const req = { ...request, url, headers: {} };
		this.$.log(`執行 trace (IPv${ipv})...`);
		try {
			const response = await this.$.fetch(req);
			return Object.fromEntries(response.body.trim().split('\n').map(e => e.split('=')));
		} catch (error) {
			this.$.logErr(error);
			return null;
		}
	}
}

// --- 資料庫與設定 ---
const Database = {
	Panel: {
		Settings: {
			Switch: true,
			Title: "☁️ 𝗪𝗔𝗥𝗣 資訊面板",
			Icon: "lock.icloud.fill",
			IconColor: "#F48220",
			BackgroundColor: "#F6821F",
			Language: "auto"
		},
		Configs: {
			i18n: {
				"zh-Hans": {
					IPv4: "IPv4",
					IPv6: "IPv6",
					COLO: "托管中心",
					WARP_Level: "隐私保护",
					Account_Type: "账户类型",
					Data_Info: "流量信息",
					Fail: "获取失败",
					WARP_Level_Off: "关闭",
					WARP_Level_On: "开启",
					WARP_Level_Plus: "增强",
					Account_Type_unlimited: "无限版",
					Account_Type_limited: "有限版",
					Account_Type_team: "团队版",
					Account_Type_plus: "WARP+",
					Account_Type_free: "免费版",
					Data_Info_Used: "已用",
					Data_Info_Residual: "剩余",
					Data_Info_Total: "总计",
					Data_Info_Unlimited: "无限"
				},
				"zh-Hant": {
					IPv4: "IPv4 位址",
					IPv6: "IPv6 位址",
					COLO: "節點位置",
					WARP_Level: "隱私保護",
					Account_Type: "帳號類型",
					Data_Info: "流量資訊",
					Fail: "擷取失敗",
					WARP_Level_Off: "關閉",
					WARP_Level_On: "開啟",
					WARP_Level_Plus: "增強 (Plus)",
					Account_Type_unlimited: "無限版",
					Account_Type_limited: "有限版",
					Account_Type_team: "團隊版",
					Account_Type_plus: "WARP+",
					Account_Type_free: "免費版",
					Data_Info_Used: "已用",
					Data_Info_Residual: "剩餘",
					Data_Info_Total: "總計",
					Data_Info_Unlimited: "無限"
				},
				en: {
					IPv4: "IPv4",
					IPv6: "IPv6",
					COLO: "Colocation",
					WARP_Level: "WARP Level",
					Account_Type: "Account Type",
					Data_Info: "Data Info.",
					Fail: "Failed to fetch",
					WARP_Level_Off: "Off",
					WARP_Level_On: "On",
					WARP_Level_Plus: "Plus",
					Account_Type_unlimited: "Unlimited",
					Account_Type_limited: "Limited",
					Account_Type_team: "Team",
					Account_Type_plus: "WARP+",
					Account_Type_free: "Free",
					Data_Info_Used: "Used",
					Data_Info_Residual: "Remaining",
					Data_Info_Total: "Total",
					Data_Info_Unlimited: "Unlimited"
				}
			}
		}
	}
};

// --- Helper Functions ---
function getSettings() {
	const settings = $Storage.getItem("Cloudflare.Panel.Settings", Database.Panel.Settings);
	const arg = typeof $argument !== "undefined" ? Object.fromEntries($argument.split("&").map(item => item.split("="))) : {};
	return { ...settings, ...arg };
}

function bytesToSize(bytes = 0, precision = 3) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toPrecision(precision)) + ' ' + sizes[i];
}

function formatTraceInfo(trace, lang, i18n) {
	if (!trace || !trace.warp) return { ip: i18n[lang].Fail, loc: i18n[lang].Fail, colo: i18n[lang].Fail, warp: i18n[lang].Fail };
	const warpStatusMap = {
		off: i18n[lang].WARP_Level_Off,
		on: i18n[lang].WARP_Level_On,
		plus: i18n[lang].WARP_Level_Plus
	};
	trace.warp = `${trace.warp.toUpperCase()} (${warpStatusMap[trace.warp] || '未知'})`;
	return trace;
}

function formatAccountInfo(account, lang, i18n) {
	if (!account || !account.account_type) return { type: i18n[lang].Fail, text: i18n[lang].Fail };
	const typeMap = {
		unlimited: i18n[lang].Account_Type_unlimited,
		limited: i18n[lang].Account_Type_limited,
		team: i18n[lang].Account_Type_team,
		plus: i18n[lang].Account_Type_plus,
		free: i18n[lang].Account_Type_free
	};
	const accountData = {
		type: `${account.account_type.toUpperCase()} (${typeMap[account.account_type] || '未知'})`,
		limited: ["limited", "free"].includes(account.account_type)
	};

	if (accountData.limited) {
		const used = account.premium_data - account.quota;
		const remaining = account.quota;
		const total = account.premium_data;
		accountData.text = `${i18n[lang].Data_Info_Used}: ${bytesToSize(used)}\n${i18n[lang].Data_Info_Residual}: ${bytesToSize(remaining)}`;
	} else {
		accountData.text = `♾️ ${i18n[lang].Data_Info_Unlimited}`;
	}
	return accountData;
}


// --- Main Execution ---
(async () => {
	const $ = new ENV(`Cloudflare Panel v${SCRIPT_VERSION}`);
	const cfAPI = new CloudflareAPI($);

	const Settings = getSettings();
	const Configs = Database.Panel.Configs;

	if (!Settings.Switch) {
		$.log("腳本功能已關閉。");
		return $.done();
	}

	const lang = Settings.Language === "auto" ? ($environment?.language || "zh-Hant") : Settings.Language;
	const i18n = Configs.i18n;

	let request = {};
	if ($.isLoon()) request.policy = $environment?.params?.node;
	if ($.isQuanX()) request.policy = $environment?.params;

	const [trace4Result, trace6Result] = await Promise.all([
		cfAPI.trace(4, request),
		cfAPI.trace(6, request)
	]);

	const trace4 = formatTraceInfo(trace4Result, lang, i18n);
	const trace6 = formatTraceInfo(trace6Result, lang, i18n);

	const ipInfo = `${i18n[lang].IPv4}: ${trace4.ip}\n`
		+ `${i18n[lang].IPv6}: ${trace6.ip}\n`
		+ `${i18n[lang].COLO}: ${trace4.loc || trace6.loc} - ${trace4.colo || trace6.colo}\n`
		+ `${i18n[lang].WARP_Level}: ${trace4.warp || trace6.warp}`;

	let accountInfoContent = '';
	const accountCache = $Storage.getItem("@Cloudflare.1dot1dot1dot1.Caches", {});
	if (accountCache?.url && accountCache?.headers) {
		const accountRequest = { url: accountCache.url, headers: accountCache.headers };
		try {
			const accountResponse = await $.fetch(accountRequest);
			if (accountResponse.ok) {
				const accountData = JSON.parse(accountResponse.body);
				const formattedAccount = formatAccountInfo(accountData.account, lang, i18n);
				accountInfoContent = `\n${i18n[lang].Account_Type}: ${formattedAccount.type}\n`
					+ `${i18n[lang].Data_Info}: ${formattedAccount.text}`;
			} else {
				throw new Error(`Account fetch failed with status ${accountResponse.status}`);
			}
		} catch (error) {
			$.logErr(error);
			accountInfoContent = `\n帳號資訊擷取失敗`;
		}
	}

	const panelContent = ipInfo + accountInfoContent;
	const panel = {
		title: Settings.Title,
		icon: Settings.Icon,
		"icon-color": Settings.IconColor,
	};

	if ($.isLoon() || $.isQuanX()) {
		panel.content = panelContent; // Loon/QX 使用 content 屬性
	} else if ($.isStash()) {
		panel.content = panelContent;
		panel.backgroundColor = Settings.BackgroundColor;
	} else { // Surge & others
		panel.content = panelContent;
	}

	$.done(panel);
})().catch((e) => {
	const $ = new ENV("Cloudflare Panel Error");
	$.logErr(e);
	$.done();
});