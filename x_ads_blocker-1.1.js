// X.com / Twitter Ads Blocker for Surge (iOS optimized)
// Version: 1.1.0
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定（貼到 Surge 設定檔）:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://(x|twitter)\.com/i/api/graphql/,script-path=x_ads_blocker-1.0.js,requires-body=true,max-size=524288,engine=webview,timeout=10,debug=false
//
// [MITM]
// hostname = %APPEND% x.com, twitter.com
//
// 設計重點（iOS）:
// - engine=webview：大 JSON 解析較不易觸發 NE 記憶體上限
// - max-size=524288：Timeline 回應常超過預設 128KB
// - pattern 限縮 GraphQL，避免對所有 X 流量跑腳本

const VERSION = '1.1.0';

// 僅處理已知會帶 promoted 貼文的 GraphQL 端點
const TIMELINE_URL_RE = /\/i\/api\/graphql\/[^/]+\/(HomeTimeline|HomeLatestTimeline|SearchTimeline|TweetDetail|UserTweets|UserMedia|ListLatestTweetsTimeline|ListTimeline|Bookmarks|Likes|CommunityTweetsTimeline|ExploreSidebar|Trending|ImmersiveMedia|Following|Followers|ProfileSpotlightsQuery|SidebarUserRecommendations)/i;

// 快速預檢：無廣告特徵則跳過 JSON.parse（iOS 效能關鍵）
const PROMOTED_HINT_RE = /promoted|Promoted|sponsored|Sponsored|advertiser|disclosure_type|TimelineTweetPromoted/i;

// 已知 timeline instructions 路徑（依 X GraphQL 回應結構）
const INSTRUCTION_PATHS = [
    ['data', 'home', 'home_timeline_urt', 'instructions'],
    ['data', 'home', 'home_latest_timeline_urt', 'instructions'],
    ['data', 'threaded_conversation_with_injections_v2', 'instructions'],
    ['data', 'search_by_raw_query', 'search_timeline', 'timeline', 'instructions'],
    ['data', 'user', 'result', 'timeline_v2', 'timeline', 'instructions'],
    ['data', 'user', 'result', 'timeline', 'timeline', 'instructions'],
    ['data', 'list', 'tweets_timeline', 'timeline', 'instructions'],
    ['data', 'bookmark_timeline_v2', 'timeline', 'instructions'],
    ['data', 'bookmarks', 'timeline', 'instructions'],
    ['data', 'explore_page', 'body', 'primary', 'timeline', 'instructions'],
    ['data', 'sidebar', 'timeline', 'instructions'],
    ['data', 'community', 'results', 'timeline', 'instructions'],
    ['data', 'viewer', 'immersive_timeline', 'instructions'],
    ['data', 'following', 'timeline', 'instructions'],
    ['data', 'followers', 'timeline', 'instructions']
];

const AD_KEY_RE = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata)$/;

let removedCount = 0;

function getBodyString() {
    const raw = $response.body;
    if (typeof raw === 'string') {
        return raw;
    }
    if (raw && typeof raw.byteLength === 'number') {
        const encoding = ($response.headers['Content-Encoding'] || $response.headers['content-encoding'] || '').toLowerCase();
        if (encoding.includes('gzip') && typeof $utils.ungzip === 'function') {
            const decoded = new TextDecoder('utf-8').decode($utils.ungzip(raw));
            return decoded;
        }
        return new TextDecoder('utf-8').decode(raw);
    }
    return '';
}

function getByPath(root, path) {
    let current = root;
    for (const key of path) {
        if (!current || typeof current !== 'object') {
            return null;
        }
        current = current[key];
    }
    return Array.isArray(current) ? current : null;
}

function isPromotedEntry(entry) {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    const entryId = entry.entryId || entry.entry_id;
    if (typeof entryId === 'string') {
        const lowered = entryId.toLowerCase();
        if (
            lowered.includes('promoted') ||
            lowered.includes('advertisement') ||
            lowered.startsWith('ad-') ||
            lowered.includes('-ad-')
        ) {
            return true;
        }
    }

    const content = entry.content;
    if (!content || typeof content !== 'object') {
        return false;
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
            const nested = wrapped && (wrapped.item || wrapped);
            const nestedContent = nested && (nested.itemContent || nested.item_content);
            if (hasPromotedMetadata(nestedContent)) {
                return true;
            }
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

    const typename = itemContent.__typename;
    if (typeof typename === 'string' && /Promoted/i.test(typename)) {
        return true;
    }

    const socialContext = itemContent.socialContext || itemContent.social_context;
    if (typeof socialContext === 'string' && /promoted/i.test(socialContext)) {
        return true;
    }

    const tweetResults = itemContent.tweet_results || itemContent.tweetResults;
    const result = tweetResults && tweetResults.result;
    if (result && (result.promotedMetadata || result.promoted_metadata)) {
        return true;
    }

    return false;
}

function filterInstructions(instructions) {
    if (!Array.isArray(instructions)) {
        return instructions;
    }

    for (const instruction of instructions) {
        if (!instruction || typeof instruction !== 'object') {
            continue;
        }

        const type = instruction.type;
        if (type !== 'TimelineAddEntries' && type !== 'TimelineReplaceEntry') {
            continue;
        }

        if (Array.isArray(instruction.entries)) {
            const before = instruction.entries.length;
            instruction.entries = instruction.entries.filter((entry) => !isPromotedEntry(entry));
            removedCount += before - instruction.entries.length;
        }

        if (instruction.entry && isPromotedEntry(instruction.entry)) {
            instruction.entry = null;
            removedCount++;
        }
    }

    return instructions;
}

function stripAdKeys(node, depth) {
    if (!node || typeof node !== 'object' || depth > 6) {
        return;
    }

    if (Array.isArray(node)) {
        for (const item of node) {
            stripAdKeys(item, depth + 1);
        }
        return;
    }

    for (const key of Object.keys(node)) {
        if (AD_KEY_RE.test(key)) {
            delete node[key];
            removedCount++;
            continue;
        }
        stripAdKeys(node[key], depth + 1);
    }
}

function cleanTimelineJson(json) {
    removedCount = 0;
    let foundInstructions = false;

    for (const path of INSTRUCTION_PATHS) {
        const instructions = getByPath(json, path);
        if (!instructions) {
            continue;
        }
        foundInstructions = true;
        filterInstructions(instructions);
    }

    // 預檢有 promoted 特徵但 entries 沒刪到時，清殘留 metadata 欄位
    if (foundInstructions && removedCount === 0 && json.data) {
        stripAdKeys(json.data, 0);
    }

    return removedCount > 0 ? json : null;
}

function fallbackRegexClean(rawBody) {
    return rawBody
        .replace(/,\s*\{[^{}]*"entryId"\s*:\s*"promoted[^"]*"[^{}]*\}/gi, '')
        .replace(/\{\s*"entryId"\s*:\s*"promoted[^"]*"[^{}]*\}\s*,/gi, '')
        .replace(/,\s*\{[^{}]*"entry_id"\s*:\s*"promoted[^"]*"[^{}]*\}/gi, '')
        .replace(/\{\s*"entry_id"\s*:\s*"promoted[^"]*"[^{}]*\}\s*,/gi, '');
}

const url = $request.url || '';

if (!TIMELINE_URL_RE.test(url)) {
    $done({});
} else {
    let body = getBodyString();

    if (!body || !PROMOTED_HINT_RE.test(body)) {
        $done({});
    } else {
        try {
            const json = JSON.parse(body);
            const cleaned = cleanTimelineJson(json);

            if (cleaned && removedCount > 0) {
                body = JSON.stringify(cleaned);
                console.log(`[X Ads Blocker ${VERSION}] ${url.split('/').pop()} removed ${removedCount} promoted item(s).`);
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