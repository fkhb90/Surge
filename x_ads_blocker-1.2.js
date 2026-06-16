// X.com / Twitter Ads Blocker for Surge (iOS optimized)
// Version: 1.2.0
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://[^/]*(x|twitter)\.com/(i/)?api/graphql/,script-path=x_ads_blocker-1.1.js,requires-body=true,max-size=4194304,timeout=5,debug=false
//
// [MITM]
// hostname = %APPEND% x.com, twitter.com, api.x.com, api.twitter.com
//
// 參數說明（iOS）:
// - max-size=4194304（4 MiB）：大型 Timeline 回應較不易 passthrough
// - pattern 含 api.x.com / api.twitter.com（iOS App 常用）
// - 不設 engine：純 JSON 過濾，用預設 JSC 即可

const VERSION = '1.2.0';

// GraphQL timeline / search / detail 等（寬鬆匹配，避免漏端點）
const GRAPHQL_RE = /\/api\/graphql\//i;

// 快速預檢：有特徵才 parse；刻意比 isPromoted 寬，避免漏掉變體欄位名
const PROMOTED_HINT_RE = /"promotedMetadata"|"promoted_metadata"|"placementTracking"|"placement_tracking"|promoted-tweet|"entryId":"[^"]*promoted|"entry_id":"[^"]*promoted|"disclosure_type"|"disclosureType"|TimelineTweetPromoted/i;

const AD_KEY_RE = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata|placementTracking|placement_tracking)$/;

const PROMOTED_ENTRY_ID_RE = /promoted|advertisement|^ad-|-ad-|who-to-follow-ad|promoted-trend|promoted_event/i;

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

function isPromotedTweetResult(result) {
    if (!result || typeof result !== 'object') {
        return false;
    }

    if (result.promotedMetadata || result.promoted_metadata) {
        return true;
    }

    const typename = result.__typename;
    if (typeof typename === 'string' && /Promoted|Ad/i.test(typename)) {
        return true;
    }

    const card = result.card;
    if (card && (card.promotedMetadata || card.promoted_metadata)) {
        return true;
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
    const result = tweetResults && tweetResults.result;
    if (isPromotedTweetResult(result)) {
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
        return !hasPromotedMetadata(nestedContent) && !isPromotedEntryId(nested.entryId || nested.entry_id);
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
        return false;
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

    return false;
}

function filterInstruction(instruction) {
    if (!instruction || typeof instruction !== 'object') {
        return;
    }

    const type = instruction.type;
    if (type !== 'TimelineAddEntries' && type !== 'TimelineReplaceEntry' && type !== 'TimelinePinEntry') {
        return;
    }

    if (Array.isArray(instruction.entries)) {
        const before = instruction.entries.length;
        instruction.entries = instruction.entries
            .map((entry) => sanitizeModuleItems(entry))
            .filter((entry) => entry && !isPromotedEntry(entry));
        removedCount += before - instruction.entries.length;
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
    removedCount = 0;
    const buckets = [];
    const seen = [];

    if (json && json.data) {
        collectInstructionArrays(json.data, buckets, 0, seen);
    }

    for (const instructions of buckets) {
        for (const instruction of instructions) {
            filterInstruction(instruction);
        }
    }

    // 找到 instructions 但未刪到 entry 時，清殘留 promoted metadata 欄位
    if (removedCount === 0 && buckets.length > 0 && json && json.data) {
        stripAdKeys(json.data, 0, 8);
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
