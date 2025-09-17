/*
 * Cloudflare 綜合面板腳本 (v2.2 功能增強版)
 *
 * 此版本基於 v2.1 架構重構版，新增了「出口 IP 查詢」功能，
 * 可透過指定策略（預設為 WARP-Select）查詢實際的網路出口 IP。
 *
 * v2.2 更新重點：
 * 1. 新增功能：在面板頂部顯示透過特定策略組的出口 IP 位址。
 * 2. 提升效率：將新的 IP 查詢與原有 trace 請求並行處理，不增加額外延遲。
 * 3. 增強彈性：新增 `PolicyName` 參數，允許使用者自訂要查詢的策略組名稱。
 * 4. 國際化 (i18n)：為新功能增加了多語言支援。
 * 5. 版本號更新與註解完善。
 *
 * GitHub Repo: https://github.com/VirgilClyne/Cloudflare
 */

const SCRIPT_VERSION = "2.2.0";

/**
 * @constant PLATFORM
 * @description 全域唯一的平台檢測器。腳本載入時執行一次，後續直接取用結果。
 * @returns {string} 當前執行的平台名稱 ('Surge', 'Stash', 'Quantumult X', etc.)
 */
const PLATFORM = (() => {
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

/**
 * @class Lodash
 * @description 一個輕量級的工具類別，模擬 Lodash 的部分核心功能，用於物件操作。
 * @version 1.4.0
 */
class Lodash {
	static name = "Lodash";
	static version = "1.4.0";
	static toPath = (value) => value.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	static get(object, path, defaultValue = undefined) {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		return pathArray.reduce((acc, key) => acc?.[key], object) ?? defaultValue;
	}
	static set(object, path, value) {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		let current = object;
		for (let i = 0; i < pathArray.length - 1; i++) {
			const key = pathArray[i];
			if (typeof current[key] !== 'object' || current[key] === null) {
				current[key] = /^\d+$/.test(pathArray[i + 1]) ? [] : {};
			}
			current = current[key];
		}
		current[pathArray[pathArray.length - 1]] = value;
		return object;
	}
}

/**
 * @class $Storage
 * @description 跨平台的持久化儲存類別，封裝不同環境的儲存 API。
 * @version 1.2.0
 */
class $Storage {
	static name = "$Storage";
	static version = "1.2.0";
	static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;
	static #parseValue(value) {
		if (value === null || value === undefined) return value;
		try { return JSON.parse(value); } catch { return value; }
	}
	static getItem(keyName = "", defaultValue = null) {
		if (keyName.startsWith('@')) {
			const match = keyName.match(this.#nameRegex);
			if (!match) return defaultValue;
			const { key, path } = match.groups;
			const storedValue = this.getItem(key, {});
			return Lodash.get(storedValue, path, defaultValue);
		}
		let value;
		switch (PLATFORM) {
			case 'Surge': case 'Loon': case 'Stash': case 'Egern': case 'Shadowrocket':
				value = $persistentStore.read(keyName);
				break;
			case 'Quantumult X':
				value = $prefs.valueForKey(keyName);
				break;
			default: value = null;
		}
		return this.#parseValue(value) ?? defaultValue;
	}
	static setItem(keyName = "", keyValue) {
		const valueToWrite = typeof keyValue === 'object' ? JSON.stringify(keyValue) : String(keyValue);
		if (keyName.startsWith('@')) {
			const match = keyName.match(this.#nameRegex);
			if (!match) return false;
			const { key, path } = match.groups;
			let rootValue = this.getItem(key, {});
			if (typeof rootValue !== 'object' || rootValue === null) rootValue = {};
			Lodash.set(rootValue, path, keyValue);
			return this.setItem(key, rootValue);
		}
		switch (PLATFORM) {
			case 'Surge': case 'Loon': case 'Stash': case 'Egern': case 'Shadowrocket':
				return $persistentStore.write(valueToWrite, keyName);
			case 'Quantumult X':
				return $prefs.setValueForKey(valueToWrite, keyName);
			default: return false;
		}
	}
}

/**
 * @class ENV
 * @description 核心環境封裝類別。
 * @version 2.1.0
 */
class ENV {
	constructor(name, opts) {
		this.name = name;
		this.platform = PLATFORM;
		this.logs = [];
		this.isMute = false;
		this.isMuteLog = false;
		this.logSeparator = '\n';
		this.startTime = Date.now();
		Object.assign(this, opts);
		this.log(`\n▶️ 開始執行腳本: ${name} (v${SCRIPT_VERSION}) on ${this.platform}`);
	}
	isQuanX = () => this.platform === 'Quantumult X';
	isLoon = () => this.platform === 'Loon';
	
	async fetch(request = {}) {
		const options = typeof request === 'string' ? { url: request } : request;
		options.method = options.method || ((options.body || options.bodyBytes) ? "POST" : "GET");
		const method = options.method.toLowerCase();
		switch (this.platform) {
			case 'Surge': case 'Loon': case 'Stash': case 'Egern': case 'Shadowrocket':
				return new Promise((resolve, reject) => {
					$httpClient[method](options, (error, response, body) => {
						if (error) return reject(error);
						Object.assign(response, { ok: /^2\d\d$/.test(response.status), statusCode: response.status, body });
						if (options["binary-mode"]) response.bodyBytes = body;
						resolve(response);
					});
				});
			case 'Quantumult X':
				return $task.fetch(options).then(
					response => {
						Object.assign(response, { ok: /^2\d\d$/.test(response.statusCode), status: response.statusCode });
						return response;
					}, reason => Promise.reject(reason.error)
				);
			default: return Promise.reject(new Error("Unsupported platform for fetch."));
		}
	}
	msg = (title = this.name, subt = '', desc = '', opts) => {
		if (this.isMute) return;
		const func = this.isQuanX() ? $notify : ($notification?.post || console.log);
		func(title, subt, desc, opts);
		this.log(`[📣 系統通知] ${title} - ${subt} - ${desc}`);
	};
	log = (...messages) => console.log(messages.join(this.logSeparator));
	logErr = (error) => this.log(`[❗️ 錯誤]`, error.stack || error);
	done = (result = {}) => {
		const costTime = (Date.now() - this.startTime) / 1000;
		this.log(`\n⏹️ 腳本執行完畢: ${this.name}, 耗時 ${costTime} 秒`);
		$done(result);
	};
}

/**
 * @class CloudflareAPI
 * @description Cloudflare API v4 的客戶端。
 * @version 1.3.0
 */
class CloudflareAPI {
	constructor(env) {
		this.$ = env;
		this.name = "Cloudflare API";
		this.$.log(`初始化 ${this.name}`);
	}
	async trace(ipv, requestOptions) {
		const url = ipv === 4 ? "https://1.1.1.1/cdn-cgi/trace" : "https://[2606:4700:4700::1111]/cdn-cgi/trace";
		const request = { ...requestOptions, url, headers: {} };
		this.$.log(`執行 trace (IPv${ipv})...`);
		try {
			const response = await this.$.fetch(request);
			if (!response.ok) throw new Error(`HTTP status ${response.statusCode}`);
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
			Language: "auto",
			PolicyName: "WARP-Select" // 新增：可配置的策略組名稱
		},
		Configs: {
			i18n: {
				"zh-Hant": {
					Egress_IP: "出口 IP", // 新增
					IPv4: "介面 IPv4", IPv6: "介面 IPv6", COLO: "節點位置", WARP_Level: "隱私保護",
					Account_Type: "帳號類型", Data_Info: "流量資訊", Fail: "擷取失敗",
					WARP_Level_Off: "關閉", WARP_Level_On: "開啟", WARP_Level_Plus: "增強 (Plus)",
					Account_Type_unlimited: "無限版", Account_Type_team: "團隊版",
					Account_Type_plus: "WARP+", Account_Type_free: "免費版", Data_Info_Used: "已用",
					Data_Info_Residual: "剩餘", Data_Info_Unlimited: "無限"
				},
				// ... 其他語言
			}
		}
	}
};

// --- 輔助函式 ---
const getSettings = () => ({ ...$Storage.getItem("Cloudflare.Panel.Settings", Database.Panel.Settings), ...(typeof $argument !== "undefined" ? Object.fromEntries($argument.split("&").map(item => item.split("="))) : {}) });
const bytesToSize = (bytes = 0, precision = 3) => {
	if (bytes === 0) return '0 B';
	const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toPrecision(precision))} ${sizes[i]}`;
};
function formatTraceInfo(trace, lang, i18n) {
	if (!trace?.warp) return { ip: i18n[lang].Fail, loc: i18n[lang].Fail, colo: i18n[lang].Fail, warp: i18n[lang].Fail };
	const warpStatusMap = { off: i18n[lang].WARP_Level_Off, on: i18n[lang].WARP_Level_On, plus: i18n[lang].WARP_Level_Plus };
	trace.warp = `${trace.warp.toUpperCase()} (${warpStatusMap[trace.warp] || '未知'})`;
	return trace;
}
function formatAccountInfo(account, lang, i18n) {
	if (!account?.account_type) return { type: i18n[lang].Fail, text: i18n[lang].Fail };
	const typeMap = { unlimited: i18n[lang].Account_Type_unlimited, team: i18n[lang].Account_Type_team, plus: i18n[lang].Account_Type_plus, free: i18n[lang].Account_Type_free };
	const data = { type: `${account.account_type.toUpperCase()} (${typeMap[account.account_type] || '未知'})`, limited: ["limited", "free"].includes(account.account_type) };
	data.text = data.limited ? `${i18n[lang].Data_Info_Used}: ${bytesToSize(account.premium_data - account.quota)}\n${i18n[lang].Data_Info_Residual}: ${bytesToSize(account.quota)}` : `♾️ ${i18n[lang].Data_Info_Unlimited}`;
	return data;
}

// --- 主流程 ---
(async () => {
	const $ = new ENV(`Cloudflare Panel`);
	const Settings = getSettings();
	if (!Settings.Switch) {
		$.log("腳本功能已關閉。");
		return $.done();
	}

	const cfAPI = new CloudflareAPI($);
	const i18n = Database.Panel.Configs.i18n;
	const lang = Settings.Language === "auto" ? ($environment?.language || "zh-Hant") : Settings.Language;

	let requestOptions = { policy: Settings.PolicyName };
	if ($.isLoon() && $environment?.params?.node) requestOptions.policy = $environment.params.node;
	if ($.isQuanX() && $environment?.params) requestOptions.policy = $environment.params;

	const [trace4Result, trace6Result, egressIpResult] = await Promise.allSettled([
		cfAPI.trace(4, requestOptions),
		cfAPI.trace(6, requestOptions),
		$.fetch({ url: "https://api.my-ip.io/ip", timeout: 5, policy: requestOptions.policy })
	]);

	const egressIp = egressIpResult.status === 'fulfilled' && egressIpResult.value.ok
		? egressIpResult.value.body.trim()
		: i18n[lang].Fail;
	
	const trace4 = formatTraceInfo(trace4Result.value, lang, i18n);
	const trace6 = formatTraceInfo(trace6Result.value, lang, i18n);

	let content = `${i18n[lang].Egress_IP}: ${egressIp}\n`
				+ `${i18n[lang].IPv4}: ${trace4.ip}\n`
				+ `${i18n[lang].IPv6}: ${trace6.ip}\n`
				+ `${i18n[lang].COLO}: ${trace4.loc || trace6.loc} - ${trace4.colo || trace6.colo}\n`
				+ `${i18n[lang].WARP_Level}: ${trace4.warp || trace6.warp}`;

	const accountCache = $Storage.getItem("@Cloudflare.1dot1dot1dot1.Caches", {});
	if (accountCache?.url && accountCache?.headers) {
		const accountResponse = await $.fetch({ url: accountCache.url, headers: accountCache.headers });
		const accountData = accountResponse.ok ? JSON.parse(accountResponse.body) : null;
		const formattedAccount = formatAccountInfo(accountData?.account, lang, i18n);
		content += `\n${i18n[lang].Account_Type}: ${formattedAccount.type}\n`
				 + `${i18n[lang].Data_Info}: ${formattedAccount.text}`;
	}

	const panel = { title: Settings.Title, icon: Settings.Icon, "icon-color": Settings.IconColor, content };
	if (PLATFORM === 'Stash') panel.backgroundColor = Settings.BackgroundColor;
	
	$.done(panel);

})().catch((err) => {
	const $ = new ENV("Cloudflare Panel");
	$.logErr(err);
	$.done({
		title: "面板錯誤",
		content: "腳本執行失敗，請檢查日誌以獲取更多資訊。",
		icon: "xmark.octagon.fill",
		"icon-color": "#FF3B30"
	});
});
