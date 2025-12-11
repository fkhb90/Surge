/*
  Cloudflare WARP 面板（最終修正版）
  - 修正：IPv4 與 IPv6 測試目標分離，確保路由準確
  - 優化：IPv6 使用 IP Literal 避免 DNS 汙染誤判
  - 相容：無需 script-allow-http-api 也能透過規則自動分流
*/

const PROXY_GROUP_NAME = 'Proxy'; // 若您的策略組叫其他名字（如 "Select"），請改這裡
const TITLE = '☁️ 𝗪𝗔𝗥𝗣 資訊面板';
const ICON = 'lock.icloud.fill';
const ICON_COLOR = '#F48220';

// 平台檢測
function isSurge() { return typeof $environment !== 'undefined' && !!$environment['surge-version']; }
function isLoon() { return typeof $loon !== 'undefined'; }
function isQX() { return typeof $task !== 'undefined' && typeof $prefs !== 'undefined'; }
function isStash() { return typeof $environment !== 'undefined' && !!$environment['stash-version']; }

// 封裝 HTTP GET
function httpGet(opts) {
  return new Promise((resolve, reject) => {
    $httpClient.get(opts, (err, resp, body) => {
      if (err) return reject(err);
      if (typeof body === 'object' && body !== null && body.bytes) {
        body = body.bytes; // Surge binary body fix
      }
      resp = resp || {};
      resp.body = body;
      resp.ok = resp.status >= 200 && resp.status < 300;
      resolve(resp);
    });
  });
}

// 解析 Trace 內容
function parseTrace(text) {
  if (!text || typeof text !== 'string') return null;
  const kv = Object.fromEntries(text.trim().split('\n').map(l => l.split('=')));
  return kv && kv.ip ? kv : null;
}

// 檢測 IPv4：使用域名，測試 WARP 對域名的接管能力
async function fetchTraceIPv4(requestOptions) {
  try {
    // 這裡改為 www.cloudflare.com 確保測試到真實路由
    const r = await httpGet({ url: 'https://www.cloudflare.com/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

// 檢測 IPv6：使用純 IP，確保只有具備 IPv6 能力時才通
async function fetchTraceIPv6(requestOptions) {
  try {
    // 使用 IPv6 Literal 地址，避免被 DNS 降級為 v4
    const r = await httpGet({ url: 'https://[2606:4700:4700::1111]/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

// 顯示面板
function donePanel(content) {
  const panel = { title: TITLE, content, icon: ICON, 'icon-color': ICON_COLOR };
  if (isStash()) panel.backgroundColor = '#F6821F';
  $done(panel);
}

// Surge 專用：嘗試獲取群組選中節點（失敗則回傳 null，走規則路由）
function surgeGetSelectedOfGroup(groupName) {
  return new Promise((resolve) => {
    if (!isSurge()) return resolve(null);
    try {
      $httpAPI('GET', '/v1/policy_groups/select', { group_name: groupName }, data => {
        const selected = data && (data.selected || data.policy || data.value);
        if (selected) return resolve(selected);
        resolve(null);
      });
    } catch { 
      // 若無權限或 API 報錯，直接回傳 null，讓請求遵循 Surge 規則系統
      resolve(null); 
    }
  });
}

(async () => {
  let requestOptions = {};
  
  // 1. 嘗試綁定策略（如果有權限或平台支援）
  if (isLoon()) requestOptions.policy = $environment?.params?.node;
  if (isQX()) requestOptions.policy = $environment?.params;
  
  if (isSurge()) {
    const selected = await surgeGetSelectedOfGroup(PROXY_GROUP_NAME);
    if (selected) requestOptions.policy = selected;
  }

  // 2. 平行發送 v4 與 v6 請求
  const [t4, t6] = await Promise.all([
    fetchTraceIPv4(requestOptions),
    fetchTraceIPv6(requestOptions),
  ]);

  // 3. 組合資訊
  const ip4 = t4?.ip || '❌ 無連接';
  const ip6 = t6?.ip || '❌ 無連接';
  const loc = (t4?.loc || t6?.loc) || '未知';
  const colo = (t4?.colo || t6?.colo) || '未知';
  
  // 4. 判斷 WARP 狀態 (只要有一個通就是通)
  const rawWarp = (t4?.warp || t6?.warp || 'off').toUpperCase();
  const warpMap = { OFF: '關閉', ON: '開啟', PLUS: '增強 (Plus)' };
  const warpStatus = warpMap[rawWarp] || '未知';

  const content =
    `IPv4: ${ip4}\n` +
    `IPv6: ${ip6}\n` +
    `節點: ${loc} - ${colo}\n` +
    `狀態: ${warpStatus}`;

  donePanel(content);
})().catch(e => {
  $done({
    title: '面板錯誤',
    content: `執行異常：${e?.message || e}`,
    icon: 'xmark.octagon.fill',
    'icon-color': '#FF3B30',
  });
});
