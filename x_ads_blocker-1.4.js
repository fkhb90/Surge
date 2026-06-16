// X.com / Twitter Ads Blocker for Surge (iOS App optimized)
// Version: 1.4.0
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定（iOS 原生 App 請用下面兩條或合併 pattern）:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://([^/]+\.)?((x|twitter)\.com|albtls\.t\.co)(/i)?(/api)?/graphql/,script-path=x_ads_blocker-1.4.js,requires-body=true,max-size=4194304,timeout=5,debug=false
// x-ads-blocker-legacy = type=http-response,pattern=^https?://([^/]+\.)?(x|twitter)\.com/2/timeline/,script-path=x_ads_blocker-1.4.js,requires-body=true,max-size=4194304,timeout=5,debug=false
//
// [MITM] — iOS 原生 X App 首頁常見域名（依 Surge 日誌「Modified」與「MITM failed」調整）:
// hostname = %APPEND% x.com, twitter.com
// hostname = %APPEND% api.x.com
// hostname = %APPEND% api.twitter.com
// hostname = %APPEND% albtls.t.co
//
// 關於 api.twitter.com:
// - iOS App 首頁 GraphQL 常走 https://api.twitter.com/graphql/<hash>/HomeTimeline（無 /api/ 前綴）
// - 若 Surge 顯示 MITM failed，該域流量無法改 body，首頁廣告會漏擋；請確認已安裝並信任 Surge 根憑證。
// - 部分 App 版本改走 x.com 或 api.x.com，以 Surge Recent Requests 實際 URL 為準。
//
// 參數說明（iOS）:
// - http-response 必須 MITM「請求實際經過的域名」才能改 body。
// - max-size=4194304（4 MiB）：大型 Timeline 回應較不易 passthrough。
// - debug=true 時可在 Surge 日誌看到攔截的端點與刪除數量。

const VERSION = '1.4.0';

// 網頁: /i/api/graphql/ ；iOS/Android App: /graphql/（常無 /api/）
const GRAPHQL_RE = /(\/api)?\/graphql\//i;

const LEGACY_TIMELINE_RE = /\/2\/timeline\//i;

// 首頁等 Timeline 端點：即使預檢無廣告特徵也強制 parse（App 廣告欄位可能較隱蔽）
const FORCE_PARSE_RE = /HomeTimeline|HomeLatestTimeline|ForYouTimeline|FollowingTimeline|SearchTimeline|ListLatestTweetsTimeline|CommunityTweetsTimeline|generic_urt|ConversationTimeline/i;

const PROMOTED_HINT_RE = /"promotedMetadata"|"promoted_metadata"|"promotedContent"|"promoted_content"|"placementTracking"|"placement_tracking"|"impressionId"|"impression_id"|"ext_has_promoted"|promoted-tweet|"entryId"\s*:\s*"[^"]*promoted|"entry_id"\s*:\s*"[^"]*promoted|"disclosure_type"|"disclosureType"|TimelineTweetPromoted|"clientEventInfo"|"moduleItems"|"items_results"|ads-api\.twitter\.com|Twitter for Advertisers|"scribe_key"\s*:\s*"(ad|promoted)"/i;

const AD_KEY_RE = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata|placementTracking|placement_tracking|impressionId|impression_id|adImpressionId|ad_impression_id|ext_has_promoted_metadata)$/;

const PROMOTED_ENTRY_ID_RE = /promoted|advertisement|^ad-|-ad-|who-to-follow-ad|promoted-trend|promoted_event/i;

const PROMOTED_CLIENT_EVENT_RE = /promoted|advertisement|sponsored|ad_/i;

const PROMOTED_SOURCE_RE = /ads-api\.twitter\.com|Twitter for Advertisers/i;

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

function getEndpointName(url) {
    const gqlMatch = url.match(/\/graphql\/[^/]+\/([^/?]+)/i);
    if (gqlMatch) {
        return gqlMatch[1];
    }
    const legacyMatch = url.match(/\/2\/timeline\/([^/?]+)/i);
    if (legacyMatch) {
        return 'timeline/' + legacyMatch[1];
    }
    return (url.match(/\/([^/?]+)(?:\?|$)/) || [])[1] || 'unknown';
}

function shouldParseBody(url, body) {
    if (FORCE_PARSE_RE.test(url)) {
        return true;
    }
    if (LEGACY_TIMELINE_RE.test(url)) {
        return true;
    }
    return PROMOTED_HINT_RE.test(body);
}

function isPromotedEntryId(entryId) {
    return typeof entryId === 'string' && PROMOTED_ENTRY_ID_RE.test(entryId);
}

function isPromotedSource(source) {
    return typeof source === 'string' && PROMOTED_SOURCE_RE.test(source);
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

    if (tweet.ext_has_promoted_metadata === true) {
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
    if (legacy) {
        if (legacy.scribe_key === 'ad' || legacy.scribe_key === 'promoted') {
            return true;
        }
        if (isPromotedSource(legacy.source)) {
            return true;
        }
    }

    if (isPromotedSource(tweet.source)) {
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

        if (key === 'scribe_key' && (node[key] === 'ad' || node[key] === 'promoted')) {
            return true;
        }

        if (key === 'source' && isPromotedSource(node[key])) {
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
    if (!content) {
        return entry;
    }

    if (Array.isArray(content.items)) {
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
    }

    if (Array.isArray(content.moduleItems)) {
        const before = content.moduleItems.length;
        content.moduleItems = content.moduleItems.filter((wrapped) => {
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
        removedCount += before - content.moduleItems.length;

        if (content.moduleItems.length === 0 && !Array.isArray(content.items)) {
            removedCount++;
            return null;
        }
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

    // TimelineTimelineModule：先 sanitize 再判斷；若模組內仍有廣告才整條刪除
    const items = content.items;
    if (Array.isArray(items) && items.length > 0) {
        for (const wrapped of items) {
            const nested = unwrapTimelineItem(wrapped);
            const nestedContent = nested && (nested.itemContent || nested.item_content);
            if (hasPromotedMetadata(nestedContent) || isPromotedEntryId(nested && (nested.entryId || nested.entry_id))) {
                return true;
            }
        }
        return false;
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

    if (Array.isArray(instruction.items_results)) {
        instruction.items_results = filterEntryList(instruction.items_results);
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

    if (seen.indexOf(node) !== -1) {
        return;
    }
    seen.push(node);

    if (Array.isArray(node.instructions)) {
        bucket.push(node.instructions);
    }

    if (Array.isArray(node.items_results)) {
        bucket.push({ type: 'items_results', list: node.items_results });
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
        if (key === 'instructions' || key === 'items_results') {
            continue;
        }
        collectInstructionArrays(node[key], bucket, depth + 1, seen);
    }
}

function applyInstructionBuckets(buckets) {
    for (const instructions of buckets) {
        if (instructions && instructions.type === 'items_results') {
            instructions.list = filterEntryList(instructions.list);
            continue;
        }
        if (!Array.isArray(instructions)) {
            continue;
        }
        for (const instruction of instructions) {
            filterInstruction(instruction);
        }
    }
}

function cleanKnownHomePaths(json) {
    const paths = [
        ['home', 'home_timeline_urt', 'instructions'],
        ['home', 'home_latest_timeline_urt', 'instructions'],
        ['viewer', 'home_timeline_urt', 'instructions'],
        ['home_timeline', 'timeline', 'instructions'],
        ['home', 'home_timeline', 'instructions']
    ];

    let touched = false;
    for (const parts of paths) {
        let node = json && json.data;
        for (let i = 0; i < parts.length; i++) {
            if (!node || typeof node !== 'object') {
                node = null;
                break;
            }
            node = node[parts[i]];
        }
        if (Array.isArray(node)) {
            bucketPushUnique(node);
            touched = true;
        }
    }
    return touched;
}

const _bucketRegistry = [];

function bucketPushUnique(instructions) {
    if (_bucketRegistry.indexOf(instructions) === -1) {
        _bucketRegistry.push(instructions);
    }
}

function cleanTimelineJson(json) {
    let totalRemoved = 0;
    const buckets = [];
    const seen = [];
    _bucketRegistry.length = 0;

    if (json && json.data) {
        collectInstructionArrays(json.data, buckets, 0, seen);
        cleanKnownHomePaths(json);
        for (const instructions of _bucketRegistry) {
            buckets.push(instructions);
        }
    }

    for (let pass = 0; pass < 3; pass++) {
        removedCount = 0;
        applyInstructionBuckets(buckets);

        totalRemoved += removedCount;
        if (removedCount === 0) {
            break;
        }
    }

    removedCount = totalRemoved;

    if (removedCount === 0 && buckets.length > 0 && json && json.data) {
        stripAdKeys(json.data, 0, 10);
    }

    return removedCount > 0 ? json : null;
}

function cleanLegacyTimeline(json) {
    const tweets = json && json.globalObjects && json.globalObjects.tweets;
    if (!tweets || typeof tweets !== 'object') {
        return null;
    }

    removedCount = 0;
    for (const key of Object.keys(tweets)) {
        const tweet = tweets[key];
        if (!tweet || typeof tweet !== 'object') {
            continue;
        }
        if (isPromotedSource(tweet.source) || tweet.scribe_key === 'ad' || tweet.scribe_key === 'promoted') {
            delete tweets[key];
            removedCount++;
        }
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
const isGraphql = GRAPHQL_RE.test(url);
const isLegacyTimeline = LEGACY_TIMELINE_RE.test(url);

if (!isGraphql && !isLegacyTimeline) {
    $done({});
} else {
    let body = getBodyString();

    if (!body || !shouldParseBody(url, body)) {
        $done({});
    } else {
        try {
            const json = JSON.parse(body);
            const cleaned = isLegacyTimeline ? cleanLegacyTimeline(json) : cleanTimelineJson(json);

            if (cleaned) {
                body = JSON.stringify(cleaned);
                const endpoint = getEndpointName(url);
                const host = (url.match(/^https?:\/\/([^/?#]+)/i) || [])[1] || 'unknown';
                console.log(`[X Ads Blocker ${VERSION}] ${endpoint} removed ${removedCount} promoted item(s). host=${host}`);
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
