/*
 * Cloudflare 綜合面板腳本 (v2.2.1 穩健性增強版)
 *
 * 此版本基於 v2.2.0，核心優化是為網路請求增加了「策略回退」機制。
 *
 * v2.2.1 更新重點：
 * 1. 新增穩健性：當指定的策略組 (PolicyName) 不存在時，腳本不會再直接失敗。
 * 2. 策略回退：會自動嘗試移除 policy 參數並重試請求，確保在各種設定環境下都能成功取得資訊。
 * 3. 使用者提示：在發生策略回退時，會於日誌中輸出清晰的警告訊息。
 * 4. 錯誤處理：更精確地區分策略錯誤與其他網路錯誤。
 *
 * GitHub Repo: https://github.com/VirgilClyne/Cloudflare
 */

const SCRIPT_VERSION = "2.2.1";

/**
 * @constant PLATFORM
 * @description 全域唯一的平台檢測器。
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
 * @description 輕量級工具類別。
 * @version 1.4.0
 */
class Lodash {
	static toPath = (value) => value.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
	static get = (obj, path, def = undefined) => (Array.isArray(path) ? path : this.toPath(path)).reduce((acc, key) => acc?.[key], obj) ?? def;
	static set(obj, path, value) {
		const pathArray = Array.isArray(path) ? path : this.toPath(path);
		let current = obj;
		for (let i = 0; i < pathArray.length - 1; i++) {
			const key = pathArray[i];
			if (typeof current[key] !== 'object' || current[key] === null) {
				current[key] = /^\d+$/.test(pathArray[i + 1]) ? [] : {};
			}
			current = current[key];
		}
		current[pathArray[pathArray.length - 1]] = value;
		return obj;
	}
}

/**
 * @class $Storage
 * @description 跨平台的持久化儲存類別。
 * @version 1.2.0
 */
class $Storage {
	static #nameRegex = /^@(?<key>[^.]+)(?:\.(?<path>.*))?$/;
	static #parseValue = (val) => { try { return JSON.parse(val); } catch { return val; } };
	static getItem(keyName = "", defaultValue = null) {
		if (keyName.startsWith('@')) {
			const match = keyName.match(this.#nameRegex);
			if (!match) return defaultValue;
			const { key, path } = match.groups;
			return Lodash.get(this.getItem(key, {}), path, defaultValue);
		}
		let val;
		switch (PLATFORM) {
			case 'Surge': case 'Loon': case 'Stash': case 'Egern': case 'Shadowrocket': val = $persistentStore.read(keyName); break;
			case 'Quantumult X': val = $prefs.valueForKey(keyName); break;
			default: val = null;
		}
		return this.#parseValue(val) ?? defaultValue;
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
			case 'Surge': case 'Loon': case 'Stash': case 'Egern': case 'Shadowrocket': return $persistentStore.write(valueToWrite, keyName);
			case 'Quantumult X': return $prefs.setValueForKey(valueToWrite, keyName);
			default: return false;
		}
	}
}

/**
 * @class ENV
 * @description 核心環境封裝類別。
 * @version 2.2.1 - 新增 fetch 策略回退機制
 */
class ENV {
	constructor(name) {
		this.name = name;
		this.platform = PLATFORM;
		this.startTime = Date.now();
		this.log(`\n▶️ 開始執行腳本: ${name} (v${SCRIPT_VERSION}) on ${this.platform}`);
	}
	isQuanX = () => this.platform === 'Quantumult X';
	isLoon = () => this.platform === 'Loon';

	async fetch(request = {}) {
		const options = typeof request === 'string' ? { url: request } : request;
		options.method = options.method || ((options.body || options.bodyBytes) ? "POST" : "GET");

		const httpClient = (opts) => {
			return new Promise((resolve, reject) => {
				const method = opts.method.toLowerCase();
				if (this.isQuanX()) {
					$task.fetch(opts).then(
						response => resolve(Object.assign(response, { ok: /^2\d\d$/.test(response.statusCode), status: response.statusCode })),
						reason => reject(reason.error)
					);
				} else {
					$httpClient[method](opts, (error, response, body) => {
						if (error) return reject(error);
						resolve(Object.assign(response, { ok: /^2\d\d$/.test(response.status), statusCode: response.status, body }));
					});
				}
			});
		};

		try {
			return await httpClient(options);
		} catch (error) {
			const isPolicyError = typeof error === 'string' && error.includes("Policy") && error.includes("doesn't exist");
			if (options.policy && isPolicyError) {
				this.log(`[⚠️ 警告] 策略 '${options.policy}' 不存在，將嘗試不指定策略進行重試...`);
				delete options.policy;
				return await httpClient(options);
			}
			throw error;
		}
	}
	msg = (title = this.name, subt = '', desc = '', opts) => {
		const func = this.isQuanX() ? $notify : ($notification?.post || console.log);
		func(title, subt, desc, opts);
		this.log(`[📣 系統通知] ${title} - ${subt} - ${desc}`);
	};
	log = (...messages) => console.log(messages.join('\n'));
	logErr = (error) => this.log(`[❗️ 錯誤]`, error.stack || error);
	done = (result = {}) => {
		const costTime = (Date.now() - this.startTime) / 1000;
		this.log(`\n⏹️ 腳本執行完畢: ${this.name}, 耗時 ${costTime} 秒`);
		$done(result);
	};
}

/**
 * @class CloudflareAPI
 * @description Cloudflare API 的客戶端。
 * @version 1.3.0
 */
class CloudflareAPI {
	constructor(env) {
		this.$ = env;
		this.name = "Cloudflare API";
		this.$.log(`初始化 ${this.name} v1.3.0`);
	}
	async trace(ipv, requestOptions) {
		const url = ipv === 4 ? "https://1.1.1.1/cdn-cgi/trace" : "https://[2606:4700:4700::1111]/cdn-cgi/trace";
		const request = { ...requestOptions, url, headers: {} };
		this.$.log(`執行 trace (IPv${ipv})...`);
		const response = await this.$.fetch(request);
		if (!response.ok) throw new Error(`HTTP status ${response.statusCode}`);
		return Object.fromEntries(response.body.trim().split('\n').map(e => e.split('=')));
	}
}

// --- 資料庫與設定 ---
const Database = {
	Panel: {
		Settings: {
			Switch: true, Title: "☁️ 𝗪𝗔𝗥𝗣 資訊面板", Icon: "lock.icloud.fill", IconColor: "#F48220",
			BackgroundColor: "#F6821F", Language: "auto", PolicyName: "WARP-Select"
		},
		Configs: {
			i18n: {
				"zh-Hant": {
					Egress_IP: "出口 IP", IPv4: "介面 IPv4", IPv6: "介面 IPv6", COLO: "節點位置",
					WARP_Level: "隱私保護", Account_Type: "帳號類型", Data_Info: "流量資訊", Fail: "擷取失敗",
					WARP_Level_Off: "關閉", WARP_Level_On: "開啟", WARP_Level_Plus: "增強 (Plus)",
					Account_Type_unlimited: "無限版", Account_Type_team: "團隊版", Account_Type_plus: "WARP+",
					Account_Type_free: "免費版", Data_Info_Used: "已用", Data_Info_Residual: "剩餘",
					Data_Info_Unlimited: "無限"
				},
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
	const map = { off: i18n[lang].WARP_Level_Off, on: i18n[lang].WARP_Level_On, plus: i18n[lang].WARP_Level_Plus };
	trace.warp = `${trace.warp.toUpperCase()} (${map[trace.warp] || '未知'})`;
	return trace;
}
function formatAccountInfo(account, lang, i18n) {
	if (!account?.account_type) return { type: i18n[lang].Fail, text: i18n[lang].Fail };
	const map = { unlimited: i18n[lang].Account_Type_unlimited, team: i18n[lang].Account_Type_team, plus: i18n[lang].Account_Type_plus, free: i18n[lang].Account_Type_free };
	const data = { type: `${account.account_type.toUpperCase()} (${map[account.account_type] || '未知'})`, limited: ["limited", "free"].includes(account.account_type) };
	data.text = data.limited ? `${i18n[lang].Data_Info_Used}: ${bytesToSize(account.premium_data - account.quota)}\n${i18n[lang].Data_Info_Residual}: ${bytesToSize(account.quota)}` : `♾️ ${i18n[lang].Data_Info_Unlimited}`;
	return data;
}

// --- 主流程 ---
(async () => {
	const $ = new ENV(`Cloudflare Panel`);
	const Settings = getSettings();
	if (!Settings.Switch) return $.done($.log("腳本功能已關閉。"));

	const cfAPI = new CloudflareAPI($);
	const i18n = Database.Panel.Configs.i18n;
	const lang = Settings.Language === "auto" ? ($environment?.language || "zh-Hant") : Settings.Language;

	let reqOpts = { policy: Settings.PolicyName, timeout: 5 };
	if ($.isLoon() && $environment?.params?.node) reqOpts.policy = $environment.params.node;
	if ($.isQuanX() && $environment?.params) reqOpts.policy = $environment.params;

	const results = await Promise.allSettled([
		cfAPI.trace(4, reqOpts),
		cfAPI.trace(6, reqOpts),
		$.fetch({ url: "https://api.my-ip.io/ip", ...reqOpts })
	]);

	const egressIp = results[2].status === 'fulfilled' && results[2].value.ok ? results[2].value.body.trim() : i18n[lang].Fail;
	const trace4 = formatTraceInfo(results[0].value, lang, i18n);
	const trace6 = formatTraceInfo(results[1].value, lang, i18n);

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
