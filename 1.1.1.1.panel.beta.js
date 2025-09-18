/*
  Cloudflare WARP 面板（強制以群組名綁定出站策略版）
  - 核心變更：Surge 直接以 policy = 'Proxy' 綁定 HTTP 請求出站策略，確保實際跟隨群組目前選中項
  - 補充：僅用 HTTP API 讀取「當前選中項」做顯示，不再把子項名稱拿去當 policy
*/

const PROXY_GROUP_NAME = 'Proxy'; // 依設定檔群組名稱而定，預設即為「Proxy」

const TITLE = '☁️ 𝗪𝗔𝗥𝗣 資訊面板';
const ICON = 'lock.icloud.fill';
const ICON_COLOR = '#F48220';

function isSurge() { return typeof $environment !== 'undefined' && !!$environment['surge-version']; }
function isStash() { return typeof $environment !== 'undefined' && !!$environment['stash-version']; }

function httpGet(opts) {
  return new Promise((resolve, reject) => {
    $httpClient.get(opts, (err, resp, body) => {
      if (err) return reject(err);
      resp = resp || {};
      resp.body = body && body.bytes ? body.bytes : body;
      resp.ok = resp.status >= 200 && resp.status < 300;
      resolve(resp);
    });
  });
}

function parseTrace(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const kv = Object.fromEntries(text.trim().split('\n').map(l => l.split('=')));
    return kv && kv.ip ? kv : null;
  } catch { return null; }
}

async function fetchTraceIPv4(requestOptions) {
  try {
    const r = await httpGet({ url: 'https://1.1.1.1/cdn-cgi/trace', timeout: 8000, ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

async function fetchTraceIPv6(requestOptions) {
  try {
    const r = await httpGet({ url: 'https://[2606:4700:4700::1111]/cdn-cgi/trace', timeout: 8000, ...requestOptions });
    return r.ok ? parseTrace(r.body) : null;
  } catch { return null; }
}

function surgeGetSelectedOfGroup(groupName) {
  return new Promise((resolve) => {
    try {
      $httpAPI('GET', '/v1/policy_groups/select', { group_name: groupName }, data => {
        const sel = data?.policy || data?.selected || data?.value || null;
        resolve(sel);
      });
    } catch { resolve(null); }
  });
}

function donePanel(content) {
  const panel = { title: TITLE, content, icon: ICON, 'icon-color': ICON_COLOR };
  if (isStash()) panel.backgroundColor = '#F6821F';
  $done(panel);
}

(async () => {
  // 關鍵：強制以群組名綁定出站策略
  const requestOptions = isSurge() ? { policy: PROXY_GROUP_NAME } : {};

  // 讀取當前選中項僅用於顯示（不作為 policy 參數）
  const currentSelection = isSurge() ? await surgeGetSelectedOfGroup(PROXY_GROUP_NAME) : null;

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
  const bound = `群組: ${PROXY_GROUP_NAME}${currentSelection ? ` → 選中: ${currentSelection}` : ''}`;

  const content =
    `${bound}\n` +
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
