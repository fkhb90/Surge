/*
  Cloudflare WARP 面板（修正優化版）
  - Surge：動態讀取「Proxy」群組當前所選節點
  - 修正：統一 URL 邏輯與 IPv6 強制檢測
*/

const PROXY_GROUP_NAME = 'Proxy'; // 請確認您的策略組名稱是否為 Proxy
const TITLE = '☁️ 𝗪𝗔𝗥𝗣 資訊面板';
const ICON = 'lock.icloud.fill';
const ICON_COLOR = '#F48220';

function isSurge() { return typeof $environment !== 'undefined' && !!$environment['surge-version']; }
function isLoon() { return typeof $loon !== 'undefined'; }
function isQX() { return typeof $task !== 'undefined' && typeof $prefs !== 'undefined'; }
function isStash() { return typeof $environment !== 'undefined' && !!$environment['stash-version']; }

function httpGet(opts) {
  return new Promise((resolve, reject) => {
    $httpClient.get(opts, (err, resp, body) => {
      if (err) return reject(err);
      if (typeof body === 'object' && body !== null && body.bytes) {
        body = body.bytes;
      }
      resp = resp || {};
      resp.body = body;
      resp.ok = resp.status >= 200 && resp.status < 300;
      resolve(resp);
    });
  });
}

function parseTrace(text) {
  if (!text || typeof text !== 'string') return null;
  const kv = Object.fromEntries(text.trim().split('\n').map(l => l.split('=')));
  return kv && kv.ip ? kv : null;
}

async function fetchTraceIPv4(requestOptions) {
  try {
    // <--- 修改處 1：統一改用 www.cloudflare.com，測試域名路由能力
    const r = await httpGet({ url: 'https://www.cloudflare.com/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

async function fetchTraceIPv6(requestOptions) {
  try {
    // <--- 修改處 2：強烈建議改回純 IPv6 地址。
    // 如果用域名，在不支援 v6 的環境會自動降級走 v4，導致面板顯示錯誤的 "IPv6 位址"。
    // 使用 [ ] 包裹 IPv6 地址是標準寫法。
    const r = await httpGet({ url: 'https://[2606:4700:4700::1111]/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

function donePanel(content) {
  const panel = { title: TITLE, content, icon: ICON, 'icon-color': ICON_COLOR };
  if (isStash()) panel.backgroundColor = '#F6821F';
  $done(panel);
}

function surgeGetSelectedOfGroup(groupName) {
  return new Promise((resolve) => {
    try {
      $httpAPI('GET', '/v1/policy_groups/select', { group_name: groupName }, data => {
        const selected = data && (data.selected || data.policy || data.value);
        if (selected) return resolve(selected);
        try {
          $httpAPI('GET', '/v1/policy_groups', null, groups => {
            let sel = null;
            if (Array.isArray(groups)) {
              const g = groups.find(x => x && (x.name === groupName || x.group === groupName));
              sel = g && (g.selected || g.now || g.current);
            } else if (groups && typeof groups === 'object') {
              const g = groups[groupName];
              sel = g && (g.selected || g.now || g.current);
            }
            resolve(sel || null);
          });
        } catch { resolve(null); }
      });
    } catch { resolve(null); }
  });
}

(async () => {
  let requestOptions = {};
  if (isLoon()) requestOptions.policy = $environment?.params?.node;
  if (isQX()) requestOptions.policy = $environment?.params;

  if (isSurge()) {
    const selected = await surgeGetSelectedOfGroup(PROXY_GROUP_NAME);
    if (selected) requestOptions.policy = selected;
  }

  const [t4, t6] = await Promise.all([
    fetchTraceIPv4(requestOptions),
    fetchTraceIPv6(requestOptions),
  ]);

  const ip4 = t4?.ip || '❌ 無連接';
  const ip6 = t6?.ip || '❌ 無連接';
  
  // 優先顯示 WARP+ 狀態，若 v4/v6 其中一個有 warp=plus 即視為 Plus
  // 修正邏輯：如果 IPv6 失敗，不該讓它覆蓋 IPv4 的成功資訊
  const rawWarp = (t4?.warp || t6?.warp || 'off').toUpperCase();
  const loc = (t4?.loc || t6?.loc) || '未知';
  const colo = (t4?.colo || t6?.colo) || '未知';
  
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
    content: `錯誤：${e?.message || e}`,
    icon: 'xmark.octagon.fill',
    'icon-color': '#FF3B30',
  });
});
