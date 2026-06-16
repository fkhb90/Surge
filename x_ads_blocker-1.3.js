// X.com / Twitter Ads Blocker for Surge (iOS optimized)
// Version: 1.3.0
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://[^/]*(x|twitter)\.com/(i/)?api/graphql/,script-path=x_ads_blocker-1.1.js,requires-body=true,max-size=4194304,timeout=5,debug=false
//
// [MITM] — 只開「腳本實際會攔到的域名」，不必全开 api.*
// hostname = %APPEND% x.com, twitter.com
// 選用（僅當 Surge 對該域 MITM 成功、且 X App 確實走此域時再加）:
// hostname = %APPEND% api.x.com
//
// 關於 api.twitter.com:
// - 不建議開啟。X/iOS 常對該域做憑證綁定（pinning），Surge 會顯示 MITM failed。
// - 本腳本 pattern 匹配的是 /api/graphql/，Timeline 廣告 JSON 通常在 x.com/i/api/graphql/，
//   不在 api.twitter.com，因此開 api.twitter.com 對本腳本通常沒有幫助。
//
// 參數說明（iOS）:
// - http-response 腳本必須 MITM「請求實際經過的域名」才能改 body；開錯域名等於腳本不執行。
// - Safari / 網頁版：x.com + twitter.com 通常就夠。
// - 原生 X App：若 api.x.com 也 MITM failed，代表 App API 無法解密，此腳本對 App 無效，請改用 Safari。
// - max-size=4194304（4 MiB）：大型 Timeline 回應較不易 passthrough

const VERSION = '1.3.0';

// GraphQL timeline / search / detail 等（寬鬆匹配，避免漏端點）
const GRAPHQL_RE = /\/api\/graphql\//i;

// 快速預檢：有特徵才 parse；刻意比 isPromoted 寬，避免漏掉變體欄位名
const PROMOTED_HINT_RE = /"promotedMetadata"|"promoted_metadata"|"placementTracking"|"placement_tracking"|"impressionId"|"impression_id"|promoted-tweet|"entryId":"[^"]*promoted|"entry_id":"[^"]*promoted|"disclosure_type"|"disclosureType"|TimelineTweetPromoted|"clientEventInfo"|"moduleItems"/i;

const AD_KEY_RE = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata|placementTracking|placement_tracking|impressionId|impression_id|adImpressionId|ad_impression_id)$/;

const PROMOTED_ENTRY_ID_RE = /promoted|advertisement|^ad-|-ad-|who-to-follow-ad|promoted-trend|promoted_event/i;

const PROMOTED_CLIENT_EVENT_RE = /promoted|advertisement|sponsored|ad_/i;

let removedCount = 0;

function getBodyString() {
    const raw = $response.body;
    if (typeof raw === 'string') {
        return raw;
    }
    if (raw && typeof raw.byteLength === 'number') {
        const encoding = ($response.headers['Content-Encoding'] || $response.headers['content-encoding'] || '').toLowerCase();
        if (encoding.includes('gzip') && typeof $utils.ungzip === 'function') {
            return new TextDecoder('utf-8').decode($utils.ungzip(raw));
        }
        return new TextDecoder('utf-8').decode(raw);
    }
    return '';
}

function isPromotedEntryId(entryId) {
    return typeof entryId === 'string' && PROMOTED_ENTRY_ID_RE.test(entryId);
}

function isPromotedSocialContext(socialContext) {
    if (!socialContext) {
        return false;
    }
    if (typeof socialContext === 'string') {
        return /promoted|sponsored|廣告|推广|推廣/i.test(socialContext);
    }
    if (typeof socialContext === 'object') {
        const text = [
            socialContext.text,
            socialContext.context,
            socialContext.contextType,
            socialContext.type,
            socialContext.__typename
        ].filter(Boolean).join(' ');
        return /promoted|sponsored|廣告|推广|推廣/i.test(text);
    }
    return false;
}

function resolveTweetResult(result) {
    if (!result || typeof result !== 'object') {
        return null;
    }

    if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
        return result.tweet;
    }

    if (result.tweet && typeof result.tweet === 'object') {
        return result.tweet;
    }

    return result;
}

function isPromotedTweetResult(result) {
    const tweet = resolveTweetResult(result);
    if (!tweet || typeof tweet !== 'object') {
        return false;
    }

    if (tweet.promotedMetadata || tweet.promoted_metadata) {
        return true;
    }

    const typename = tweet.__typename;
    if (typeof typename === 'string' && /Promoted|Ad/i.test(typename)) {
        return true;
    }

    const card = tweet.card;
    if (card && (card.promotedMetadata || card.promoted_metadata)) {
        return true;
    }

    const legacy = tweet.legacy;
    if (legacy && (legacy.scribe_key === 'ad' || legacy.scribe_key === 'promoted')) {
        return true;
    }

    return false;
}

function isPromotedClientEventInfo(clientEventInfo) {
    if (!clientEventInfo || typeof clientEventInfo !== 'object') {
        return false;
    }

    const parts = [
        clientEventInfo.component,
        clientEventInfo.element,
        clientEventInfo.action,
        clientEventInfo.details
    ].filter(Boolean).join(' ');

    return PROMOTED_CLIENT_EVENT_RE.test(parts);
}

function deepHasPromotedSignal(node, depth) {
    if (!node || typeof node !== 'object' || depth > 10) {
        return false;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            if (deepHasPromotedSignal(item, depth + 1)) {
                return true;
            }
        }
        return false;
    }

    for (const key of Object.keys(node)) {
        if (AD_KEY_RE.test(key)) {
            return true;
        }

        if (key === 'clientEventInfo' && isPromotedClientEventInfo(node[key])) {
            return true;
        }

        if (key === 'socialContext' || key === 'social_context') {
            if (isPromotedSocialContext(node[key])) {
                return true;
            }
        }

        if (key === 'tweet_results' || key === 'tweetResults') {
            const result = node[key] && node[key].result;
            if (isPromotedTweetResult(result)) {
                return true;
            }
        }

        if (deepHasPromotedSignal(node[key], depth + 1)) {
            return true;
        }
    }

    return false;
}

function hasPromotedMetadata(itemContent) {
    if (!itemContent || typeof itemContent !== 'object') {
        return false;
    }

    if (itemContent.promotedMetadata || itemContent.promoted_metadata) {
        return true;
    }

    if (itemContent.placementTracking || itemContent.placement_tracking) {
        return true;
    }

    const typename = itemContent.__typename;
    if (typeof typename === 'string' && /Promoted|Advertisement/i.test(typename)) {
        return true;
    }

    if (isPromotedSocialContext(itemContent.socialContext || itemContent.social_context)) {
        return true;
    }

    const tweetResults = itemContent.tweet_results || itemContent.tweetResults;
    if (isPromotedTweetResult(tweetResults && tweetResults.result)) {
        return true;
    }

    if (isPromotedClientEventInfo(itemContent.clientEventInfo || itemContent.client_event_info)) {
        return true;
    }

    const advertiser = itemContent.advertiser_results || itemContent.advertiserResults;
    if (advertiser && typeof advertiser === 'object') {
        return true;
    }

    const disclosure = itemContent.disclosure_type || itemContent.disclosureType;
    if (typeof disclosure === 'string' && /promoted|sponsored|ad/i.test(disclosure)) {
        return true;
    }

    return false;
}

function unwrapTimelineItem(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') {
        return null;
    }
    return wrapped.item || wrapped;
}

function sanitizeModuleItems(entry) {
    const content = entry && entry.content;
    if (!content || !Array.isArray(content.items)) {
        return entry;
    }

    const before = content.items.length;
    content.items = content.items.filter((wrapped) => {
        const nested = unwrapTimelineItem(wrapped);
        if (!nested) {
            return true;
        }
        const nestedContent = nested.itemContent || nested.item_content;
        return (
            !hasPromotedMetadata(nestedContent) &&
            !isPromotedEntryId(nested.entryId || nested.entry_id) &&
            !deepHasPromotedSignal(nested, 0)
        );
    });
    removedCount += before - content.items.length;

    if (content.items.length === 0) {
        removedCount++;
        return null;
    }

    return entry;
}

function isPromotedEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    if (isPromotedEntryId(entry.entryId || entry.entry_id)) {
        return true;
    }

    const content = entry.content;
    if (!content || typeof content !== 'object') {
        return deepHasPromotedSignal(entry, 0);
    }

    const contentType = content.__typename || content.item_type || content.itemType;
    if (typeof contentType === 'string' && /Promoted|Advertisement/i.test(contentType)) {
        return true;
    }

    const itemType = content.itemType || content.item_type;
    if (typeof itemType === 'string' && /promoted|advertisement/i.test(itemType)) {
        return true;
    }

    const itemContent = content.itemContent || content.item_content;
    if (hasPromotedMetadata(itemContent)) {
        return true;
    }

    const items = content.items;
    if (Array.isArray(items)) {
        for (const wrapped of items) {
            const nested = unwrapTimelineItem(wrapped);
            const nestedContent = nested && (nested.itemContent || nested.item_content);
            if (hasPromotedMetadata(nestedContent) || isPromotedEntryId(nested && (nested.entryId || nested.entry_id))) {
                return true;
            }
        }
    }

    if (deepHasPromotedSignal(entry, 0)) {
        return true;
    }

    return false;
}

function filterEntryList(entries) {
    if (!Array.isArray(entries)) {
        return entries;
    }

    const before = entries.length;
    const filtered = entries
        .map((entry) => sanitizeModuleItems(entry))
        .filter((entry) => entry && !isPromotedEntry(entry));

    removedCount += before - filtered.length;
    return filtered;
}

function filterInstruction(instruction) {
    if (!instruction || typeof instruction !== 'object') {
        return;
    }

    const type = instruction.type;
    const handledTypes = {
        TimelineAddEntries: true,
        TimelineReplaceEntry: true,
        TimelinePinEntry: true,
        TimelineAddToModule: true
    };

    if (!handledTypes[type]) {
        return;
    }

    if (Array.isArray(instruction.entries)) {
        instruction.entries = filterEntryList(instruction.entries);
    }

    if (Array.isArray(instruction.moduleItems)) {
        instruction.moduleItems = filterEntryList(instruction.moduleItems);
    }

    if (instruction.entry) {
        let entry = sanitizeModuleItems(instruction.entry);
        if (!entry || isPromotedEntry(entry)) {
            instruction.entry = null;
            removedCount++;
        } else {
            instruction.entry = entry;
        }
    }
}

function collectInstructionArrays(node, bucket, depth, seen) {
    if (!node || typeof node !== 'object' || depth > 14) {
        return;
    }

    const nodeId = seen.length;
    if (seen.indexOf(node) !== -1) {
        return;
    }
    seen.push(node);

    if (Array.isArray(node.instructions)) {
        bucket.push(node.instructions);
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            collectInstructionArrays(item, bucket, depth + 1, seen);
        }
        return;
    }

    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === 'instructions') {
            continue;
        }
        collectInstructionArrays(node[key], bucket, depth + 1, seen);
    }
}

function cleanTimelineJson(json) {
    let totalRemoved = 0;
    const buckets = [];
    const seen = [];

    if (json && json.data) {
        collectInstructionArrays(json.data, buckets, 0, seen);
    }

    // 多輪過濾：TimelineAddToModule 等可能需連續清理
    for (let pass = 0; pass < 3; pass++) {
        removedCount = 0;

        for (const instructions of buckets) {
            for (const instruction of instructions) {
                filterInstruction(instruction);
            }
        }

        totalRemoved += removedCount;
        if (removedCount === 0) {
            break;
        }
    }

    removedCount = totalRemoved;

    // 找到 instructions 但未刪到 entry 時，清殘留 promoted metadata 欄位
    if (removedCount === 0 && buckets.length > 0 && json && json.data) {
        stripAdKeys(json.data, 0, 10);
    }

    return removedCount > 0 ? json : null;
}

function stripAdKeys(node, depth, maxDepth) {
    if (!node || typeof node !== 'object' || depth > maxDepth) {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            stripAdKeys(item, depth + 1, maxDepth);
        }
        return;
    }

    for (const key of Object.keys(node)) {
        if (AD_KEY_RE.test(key)) {
            delete node[key];
            removedCount++;
            continue;
        }
        stripAdKeys(node[key], depth + 1, maxDepth);
    }
}

function fallbackRegexClean(rawBody) {
    let cleaned = rawBody;
    const patterns = [
        /,\s*\{[^{}]*"entryId"\s*:\s*"[^"]*promoted[^"]*"[^{}]*\}/gi,
        /\{\s*"entryId"\s*:\s*"[^"]*promoted[^"]*"[^{}]*\}\s*,/gi,
        /,\s*\{[^{}]*"entry_id"\s*:\s*"[^"]*promoted[^"]*"[^{}]*\}/gi,
        /\{\s*"entry_id"\s*:\s*"[^"]*promoted[^"]*"[^{}]*\}\s*,/gi,
        /,\s*\{[^{}]*"promotedMetadata"[^{}]*\}/gi,
        /\{\s*"promotedMetadata"[^{}]*\}\s*,/gi
    ];

    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
}

const url = $request.url || '';

if (!GRAPHQL_RE.test(url)) {
    $done({});
} else {
    let body = getBodyString();

    if (!body || !PROMOTED_HINT_RE.test(body)) {
        $done({});
    } else {
        try {
            const json = JSON.parse(body);
            const cleaned = cleanTimelineJson(json);

            if (cleaned) {
                body = JSON.stringify(cleaned);
                const endpoint = (url.match(/\/([^/?]+)(?:\?|$)/) || [])[1] || 'graphql';
                console.log(`[X Ads Blocker ${VERSION}] ${endpoint} removed ${removedCount} promoted item(s).`);
                $done({ body });
            } else {
                $done({});
            }
        } catch (error) {
            const cleanedBody = fallbackRegexClean(body);
            if (cleanedBody !== body) {
                console.log(`[X Ads Blocker ${VERSION}] JSON parse failed, regex fallback: ${error}`);
                $done({ body: cleanedBody });
            } else {
                $done({});
            }
        }
    }
}
