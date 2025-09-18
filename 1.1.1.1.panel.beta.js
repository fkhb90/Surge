/*
  Cloudflare WARP 面板（增強版）
  - Surge：動態讀取「Proxy」群組當前所選節點，並以該節點作為 policy 發出 Cloudflare Trace 請求
  - Loon / Quantumult X：沿用既有傳入參數（node / params）綁定路由策略
  - Stash：面板配色適配
  - 新增：持久化比對（IP/節點），偵測變更自動提示（配合面板 update-interval 近即時刷新）
*/

const PROXY_GROUP_NAME = 'Proxy'; // 若群組名不同，請改這裡
const STORE_KEY = 'WARP_PANEL_STATE';

const TITLE = '☁️ WARP 資訊面板';
const ICON = 'lock.icloud.fill';
const ICON_COLOR = '#F48220';

function isSurge() { return typeof $environment !== 'undefined' && !!$environment['surge-version']; }
function isLoon() { return typeof $loon !== 'undefined'; }
function isQX() { return typeof $task !== 'undefined' && typeof $prefs !== 'undefined'; }
function isStash() { return typeof $environment !== 'undefined' && !!$environment['stash-version']; }

function toStringBody(body) {
  try {
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object') {
      if (body.bytes && (typeof body.bytes === 'object' || Array.isArray(body.bytes))) {
        const u8 = body.bytes instanceof Uint8Array ? body.bytes : new Uint8Array(body.bytes);
        return new TextDecoder('utf-8').decode(u8);
      }
      if (body instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(body));
      if (body instanceof Uint8Array) return new TextDecoder('utf-8').decode(body);
    }
  } catch {}
  return body + '';
}

function httpGet(opts) {
  return new Promise((resolve, reject) => {
    $httpClient.get(opts, (err, resp, body) => {
      if (err) return reject(err);
      resp = resp || {};
      resp.body = toStringBody(body);
      resp.ok = resp.status >= 200 && resp.status < 300;
      resolve(resp);
    });
  });
}

function parseTrace(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.trim().split('\n');
  const kv = Object.fromEntries(lines.map(l => {
    const i = l.indexOf('=');
    return i >= 0 ? [l.slice(0, i), l.slice(i + 1)] : [l, ''];
  }));
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
    const r = await httpGet({ url: 'https://[2606:4700:4700::1111]/cdn-cgi/trace', ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

function loadState() {
  try { return JSON.parse($persistentStore.read(STORE_KEY) || '{}'); } catch { return {}; }
}
function saveState(s) {
  try { $persistentStore.write(JSON.stringify(s || {}), STORE_KEY); } catch {}
}
function fmtTs(t) {
  try { return new Date(t).toLocaleString(); } catch { return String(t || ''); }
}

function donePanel(content) {
  const panel = { title: TITLE, content, icon: ICON, 'icon-color': ICON_COLOR };
  if (isStash()) panel.backgroundColor = '#F6821F';
  $done(panel);
}

function surgeGetSelectedOfGroup(groupName) {
  return new Promise((resolve) => {
    try {
      // 精確查詢選中值
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

  const now = Date.now();
  const prev = loadState();
  const curr = {
    ip4, ip6,
    policy: requestOptions.policy || '',
    ts: now
  };
  const changed =
    (prev?.ip4 && prev.ip4 !== curr.ip4) ||
    (prev?.ip6 && prev.ip6 !== curr.ip6) ||
    (prev?.policy && prev.policy !== curr.policy);

  if (!prev || changed) {
    saveState(curr);
    try {
      $notification.post('WARP 面板', '偵測到 IP 或節點變更', `Policy: ${curr.policy || '未知'}\nIPv4: ${ip4}\nIPv6: ${ip6}`);
    } catch {}
  }

  const lastTs = prev?.ts ? fmtTs(prev.ts) : '—';
  const hint = changed ? '狀態：剛剛變更' : `上次變更：${lastTs}`;

  const content =
    `IPv4 位址: ${ip4}\n` +
    `IPv6 位址: ${ip6}\n` +
    `節點位置: ${loc} - ${colo}\n` +
    `隱私保護: ${warp}\n` +
    `${hint}`;

  donePanel(content);
})().catch(e => {
  $done({
    title: '面板錯誤',
    content: `腳本執行失敗：${e?.message || e}`,
    icon: 'xmark.octagon.fill',
    'icon-color': '#FF3B30',
  });
});
