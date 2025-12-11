/*
  Cloudflare WARP 面板（修正版）
  - Surge：動態讀取「Proxy」群組當前所選節點，並以該節點作為 policy 發出 Cloudflare Trace 請求
  - 其他平台：維持原行為（可自行延伸）
*/

const PROXY_GROUP_NAME = 'Proxy'; // 若群組名不同，請改這裡
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
        // Surge 可能回傳 bodyBytes
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
    const r = await httpGet({ url: 'https://1.1.1.1/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

async function fetchTraceIPv6(requestOptions) {
  try {
    const r = await httpGet({ url: 'https://www.cloudflare.com/cdn-cgi/trace', ...requestOptions });
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
    // 嘗試精確查詢選中
    try {
      $httpAPI('GET', '/v1/policy_groups/select', { group_name: groupName }, data => {
        const selected = data && (data.selected || data.policy || data.value);
        if (selected) return resolve(selected);
        // 後備：讀整表尋找群組
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
  // 綁定不同平台的「策略/節點」參數（如有）
  if (isLoon()) requestOptions.policy = $environment?.params?.node;
  if (isQX()) requestOptions.policy = $environment?.params;

  // Surge：讀取 Proxy 群組目前選中節點，將節點名綁定為 policy
  if (isSurge()) {
    const selected = await surgeGetSelectedOfGroup(PROXY_GROUP_NAME);
    if (selected) requestOptions.policy = selected;
  }

  const [t4, t6] = await Promise.all([
    fetchTraceIPv4(requestOptions),
    fetchTraceIPv6(requestOptions),
  ]);

  const ip4 = t4?.ip || '擷取失敗';
  const ip6 = t6?.ip || '擷取失敗';
  const loc = (t4?.loc || t6?.loc) || '擷取失敗';
  const colo = (t4?.colo || t6?.colo) || '擷取失敗';
  const warpRaw = (t4?.warp || t6?.warp || 'off').toUpperCase();
  const warpMap = { OFF: '關閉', ON: '開啟', PLUS: '增強 (Plus)' };
  const warp = `${warpRaw} (${warpMap[warpRaw] || '未知'})`;

  const content =
    `IPv4 位址: ${ip4}\n` +
    `IPv6 位址: ${ip6}\n` +
    `節點位置: ${loc} - ${colo}\n` +
    `隱私保護: ${warp}`;

  donePanel(content);
})().catch(e => {
  $done({
    title: '面板錯誤',
    content: `腳本執行失敗：${e?.message || e}`,
    icon: 'xmark.octagon.fill',
    'icon-color': '#FF3B30',
  });
});
