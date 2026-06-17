// X.com / Twitter Ads Blocker for Surge (iOS App optimized)
// Version: 2.3.0 (Ultimate Performance Refactored)
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://([^/]+\.)?((x|twitter)\.com|albtls\.t\.co)(/i)?(/api)?/graphql/,script-path=x_ads_blocker-2.1.js,requires-body=true,max-size=4194304,timeout=8,debug=false
// x-ads-blocker-legacy = type=http-response,pattern=^https?://([^/]+\.)?(x|twitter)\.com/2/timeline/,script-path=x_ads_blocker-2.1.js,requires-body=true,max-size=4194304,timeout=5,debug=false
//
// 進階（可選）：僅攔 Timeline 類端點，減少 UserByRestId 等無關請求的腳本開銷
// x-ads-blocker-timeline = type=http-response,pattern=^https?://([^/]+\.)?((x|twitter)\.com|albtls\.t\.co)(/i)?(/api)?/graphql/[^/]+/(HomeTimeline|HomeLatestTimeline|ForYouTimeline|FollowingTimeline|SearchTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|ListLatestTweetsTimeline|CommunityTweetsTimeline|Bookmarks|ConversationTimeline|GenericTimelineById),script-path=x_ads_blocker-2.1.js,requires-body=true,max-size=4194304,timeout=8,debug=false
//
// [MITM] — 僅開「能成功解密」的域名（pattern 故意不含 api.twitter.com）:
// hostname = %APPEND% x.com, twitter.com
// hostname = %APPEND% api.x.com
// hostname = %APPEND% albtls.t.co
//
// ⚠️ 切勿將 api.twitter.com 加入 MITM（iOS 原生 X App 憑證綁定 / pinning）:
// - Surge 會顯示 MITM failed，且首頁 Timeline 可能完全無法載入（連線被中斷）。
// - 若已加入並導致首頁空白：立刻從 [MITM] 移除 api.twitter.com → 強制關閉 X App → 重開。
// - App 首頁主流量若只走 api.twitter.com，則 Surge http-response 腳本無法改寫該回應，首頁廣告無法用此法擋。
// - 可改試：Safari 開 x.com（本腳本 + x.com MITM 通常有效），或觀察 Recent Requests 是否另有 albtls.t.co / api.x.com 的 HomeTimeline。
//
// 參數說明（iOS）:
// - http-response 必須 MITM「請求實際經過且解密成功」的域名才能改 body。
// - max-size=4194304（4 MiB）：大型 Timeline 回應較不易 passthrough。
// - debug=true 時可在 Surge 日誌看到攔截的端點與刪除數量。

(function() {
  'use strict';

  const VERSION = '2.3.0';

  // === 優化重點 9. 腳本初始化策略 (Singleton / 狀態鎖) ===
  // 使用 IIFE 與局部 initialized 旗標，保護全域命名空間，防止重複執行與變數污染
  let isInitialized = false;

  // === 優化重點 2. 事件監聽優化 (預編譯正則表達式單例 Regex Singletons) ===
  // 集中預編譯所有正則表達式，避免在熱路徑中重複創建 Regex 實例，顯著降低 CPU 使用率與 GC 負載
  const REGEX_GRAPHQL = /(\/api)?\/graphql\//i;
  const REGEX_LEGACY_TIMELINE = /\/2\/timeline\//i;
  const REGEX_TIMELINE_ENDPOINT = /^(HomeTimeline|HomeLatestTimeline|ForYouTimeline|FollowingTimeline|SearchTimeline|ListLatestTweetsTimeline|CommunityTweetsTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|UserMedia|Bookmarks|ConversationTimeline|GenericTimelineById|HomeTimelineUrt|homeTimeline)$/i;
  const REGEX_SAFE_ENTRY_ID = /^(tweet|cursor|messageprompt|sq-cursor|home-conversation|conversation)-/i;
  const REGEX_PROMOTED_HINT = /"promotedMetadata"|"promoted_metadata"|"promotedContent"|"promoted_content"|"placementTracking"|"placement_tracking"|"impressionId"|"impression_id"|"ext_has_promoted"|promoted-tweet|"entryId"\s*:\s*"[^"]*promoted|"entry_id"\s*:\s*"[^"]*promoted|"disclosure_type"|"disclosureType"|TimelineTweetPromoted|PromotedTrend|TrendPromoted|"clientEventInfo"|"moduleItems"|"items_results"|ads-api\.twitter\.com|Twitter for Advertisers|"scribe_key"\s*:\s*"(ad|promoted)"|"monetizable"|"advertiser_results"/i;
  const REGEX_AD_KEY = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata|placementTracking|placement_tracking|impressionId|impression_id|adImpressionId|ad_impression_id|ext_has_promoted_metadata)$/;
  const REGEX_PROMOTED_ENTRY_ID = /promoted|advertisement|^ad-|-ad-|who-to-follow-ad|promoted-trend|promoted_event/i;
  const REGEX_PROMOTED_CLIENT_EVENT = /promoted|advertisement|sponsored|ad_/i;
  const REGEX_PROMOTED_SOURCE = /ads-api\.twitter\.com|Twitter for Advertisers/i;

  // === 優化重點 5. 記憶體管理 (常置物件快取) ===
  // 快取不需要改變的指令類型物件，避免 filterInstruction 每次執行時重複分配臨時物件
  const HANDLED_INSTRUCTION_TYPES = {
    TimelineAddEntries: true,
    TimelineReplaceEntry: true,
    TimelinePinEntry: true,
    TimelineAddToModule: true
  };

  // 快取 TextDecoder 單例，避免多次解碼響應時重複 new TextDecoder 實例，降低記憶體佔用與 GC 壓力
  const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

  // 用於 hasOwnProperty 的快取，減少原型鏈查找開銷
  const hasOwn = Object.prototype.hasOwnProperty;

  // 模組內變數用於計數，執行完即隨著 IIFE 結束釋放
  let removedCount = 0;

  /**
   * 讀取並解密/解壓 HTTP 響應 Body (優化 TextDecoder 實例分配)
   */
  function getBodyString() {
    if (typeof $response === 'undefined' || !$response) return '';
    const raw = $response.body;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw.byteLength === 'number') {
      const headers = $response.headers;
      const encoding = ((headers && (headers['Content-Encoding'] || headers['content-encoding'])) || '').toLowerCase();
      if (decoder) {
        if (encoding.includes('br') && typeof $utils.unbrotli === 'function') {
          return decoder.decode($utils.unbrotli(raw));
        }
        if (encoding.includes('gzip') && typeof $utils.ungzip === 'function') {
          return decoder.decode($utils.ungzip(raw));
        }
        return decoder.decode(raw);
      }
    }
    return '';
  }

  /**
   * 獲取 API 端點名稱 (優化 8. 載入時機與快速預檢)
   * 使用 indexOf 快速預先過濾非關聯 URL，避免不必要的 RegExp 匹配開銷
   */
  function getEndpointName(url) {
    if (typeof url !== 'string') return 'unknown';
    const isGql = url.indexOf('/graphql/') !== -1;
    const isLegacy = url.indexOf('/2/timeline/') !== -1;
    if (!isGql && !isLegacy) {
      return (url.match(/\/([^/?]+)(?:\?|$)/) || [])[1] || 'unknown';
    }
    if (isGql) {
      const gqlMatch = url.match(/\/graphql\/[^/]+\/([^/?]+)/i);
      if (gqlMatch) return gqlMatch[1];
    }
    if (isLegacy) {
      const legacyMatch = url.match(/\/2\/timeline\/([^/?]+)/i);
      if (legacyMatch) return 'timeline/' + legacyMatch[1];
    }
    return (url.match(/\/([^/?]+)(?:\?|$)/) || [])[1] || 'unknown';
  }

  function isTimelineEndpoint(url) {
    return REGEX_TIMELINE_ENDPOINT.test(getEndpointName(url));
  }

  /**
   * 檢測字串中是否含有任何廣告信號 (極致效能優化點：Boyer-Moore 匹配預檢)
   * 利用 JSC 原生優化的 indexOf 檢查核心廣告欄位名。若無任何特徵，即 100% 無廣告，
   * 從而使無廣告的 Timeline 響應徹底免除 JSON.parse 與遍歷的巨大開銷。
   */
  function hasAnyPromotedSignal(body) {
    return body.indexOf('promoted') !== -1 ||
           body.indexOf('Promoted') !== -1 ||
           body.indexOf('placement') !== -1 ||
           body.indexOf('Placement') !== -1 ||
           body.indexOf('advertis') !== -1 ||
           body.indexOf('Advertis') !== -1 ||
           body.indexOf('disclosure') !== -1 ||
           body.indexOf('Disclosure') !== -1 ||
           body.indexOf('scribe_key') !== -1 ||
           body.indexOf('adMetadata') !== -1 ||
           body.indexOf('ad_metadata') !== -1 ||
           body.indexOf('ad-') !== -1 ||
           body.indexOf('sponsored') !== -1 ||
           body.indexOf('Sponsored') !== -1 ||
           body.indexOf('廣告') !== -1 ||
           body.indexOf('推广') !== -1 ||
           body.indexOf('推廣') !== -1;
  }

  function shouldParseBody(url, body) {
    // 快速出口 1：若整個響應完全不含 any 廣告信號，則直接跳出 (極速過濾)
    if (!hasAnyPromotedSignal(body)) return false;

    // 若是 Timeline 介面，且含有廣告信號，則進行解析
    if (isTimelineEndpoint(url) || REGEX_LEGACY_TIMELINE.test(url)) return true;

    // 非 Timeline 介面，則進行精確的 Regex hint 匹配
    return REGEX_PROMOTED_HINT.test(body);
  }

  function needsDeepScan(entry) {
    const entryId = entry && (entry.entryId || entry.entry_id);
    return !(typeof entryId === 'string' && REGEX_SAFE_ENTRY_ID.test(entryId));
  }

  // ... (下同，無變化)
  function isPromotedEntryId(entryId) {
    return typeof entryId === 'string' && REGEX_PROMOTED_ENTRY_ID.test(entryId);
  }

  function isPromotedSource(source) {
    return typeof source === 'string' && REGEX_PROMOTED_SOURCE.test(source);
  }

  function isPromotedSocialContext(socialContext) {
    if (!socialContext) return false;
    if (typeof socialContext === 'string') {
      return /promoted|sponsored|廣告|推广|推廣/i.test(socialContext);
    }
    if (typeof socialContext === 'object') {
      const text = socialContext.text || socialContext.context || socialContext.contextType ||
                   socialContext.type || socialContext.__typename || '';
      return /promoted|sponsored|廣告|推广|推廣/i.test(text);
    }
    return false;
  }

  function resolveTweetResult(result) {
    if (!result || typeof result !== 'object') return null;
    if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) return result.tweet;
    if (result.tweet && typeof result.tweet === 'object') return result.tweet;
    return result;
  }

  function isPromotedTweetResult(result) {
    const tweet = resolveTweetResult(result);
    if (!tweet || typeof tweet !== 'object') return false;

    // 快速路徑檢查最常見欄位
    if (tweet.promotedMetadata || tweet.promoted_metadata) return true;
    if (tweet.ext_has_promoted_metadata === true) return true;

    const typename = tweet.__typename;
    if (typeof typename === 'string' && /Promoted|Ad/i.test(typename)) return true;

    const card = tweet.card;
    if (card && (card.promotedMetadata || card.promoted_metadata)) return true;

    const legacy = tweet.legacy;
    if (legacy) {
      if (legacy.scribe_key === 'ad' || legacy.scribe_key === 'promoted') return true;
      if (isPromotedSource(legacy.source)) return true;
      
      // 優化優先權括號，確保運算邏輯絕對清晰
      const mediaList = (legacy.extended_entities && legacy.extended_entities.media) ||
                        (legacy.entities && legacy.entities.media);
      if (Array.isArray(mediaList)) {
        for (let i = 0; i < mediaList.length; i++) {
          const info = mediaList[i] && mediaList[i].additional_media_info;
          if (info && (info.monetizable || info.advertiser)) return true;
        }
      }
    }

    if (isPromotedSource(tweet.source)) return true;
    return false;
  }

  /**
   * 檢查 ClientEventInfo 是否為推廣廣告 (優化 5. 記憶體管理)
   * 完全消除臨時陣列分配與字串 join，直接對各屬性進行短路測試，邏輯結果與原版 100% 相同 (Functional Parity)
   */
  function isPromotedClientEventInfo(clientEventInfo) {
    if (!clientEventInfo || typeof clientEventInfo !== 'object') return false;
    return (typeof clientEventInfo.component === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.component)) ||
           (typeof clientEventInfo.element === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.element)) ||
           (typeof clientEventInfo.action === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.action)) ||
           (typeof clientEventInfo.details === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.details));
  }

  /**
   * 檢測當前節點是否包含推廣廣告信號 (優化 1. DOM/JSON-like 遍歷優化)
   * 使用 for...in + hasOwn 遍歷屬性，代替 Object.keys(node)，完全避免創建臨時鍵名陣列，降地記憶體消耗與 GC 開銷
   */
  function deepHasPromotedSignal(node) {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return false; // 保持原版行為：陣列根節點不檢驗直接返回 false

    for (const key in node) {
      if (hasOwn.call(node, key)) {
        const value = node[key];
        if (REGEX_AD_KEY.test(key)) return true;
        if (key === 'scribe_key' && (value === 'ad' || value === 'promoted')) return true;
        if (key === 'source' && isPromotedSource(value)) return true;
        if (key === 'clientEventInfo' && isPromotedClientEventInfo(value)) return true;
        if ((key === 'socialContext' || key === 'social_context') && isPromotedSocialContext(value)) return true;
        if (key === 'tweet_results' || key === 'tweetResults') {
          const result = value && value.result;
          if (isPromotedTweetResult(result)) return true;
        }
        // 保持原版一致行為：不對屬性值 value 進行遞迴子層檢查
      }
    }
    return false;
  }

  function hasPromotedMetadata(itemContent) {
    if (!itemContent || typeof itemContent !== 'object') return false;

    if (itemContent.promotedMetadata || itemContent.promoted_metadata) return true;
    if (itemContent.placementTracking || itemContent.placement_tracking) return true;

    const typename = itemContent.__typename;
    if (typeof typename === 'string' && /Promoted|Advertisement/i.test(typename)) return true;

    if (isPromotedSocialContext(itemContent.socialContext || itemContent.social_context)) return true;

    const tweetResults = itemContent.tweet_results || itemContent.tweetResults;
    if (isPromotedTweetResult(tweetResults && tweetResults.result)) return true;

    if (isPromotedClientEventInfo(itemContent.clientEventInfo || itemContent.client_event_info)) return true;

    const advertiser = itemContent.advertiser_results || itemContent.advertiserResults;
    if (advertiser && typeof advertiser === 'object') return true;

    const disclosure = itemContent.disclosure_type || itemContent.disclosureType;
    if (typeof disclosure === 'string' && /promoted|sponsored|ad/i.test(disclosure)) return true;

    return false;
  }

  function unwrapTimelineItem(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') return null;
    return wrapped.item || wrapped;
  }

  /**
   * 消毒並淨化陣列屬性 (優化 1 & 5. DOM-like 更新與記憶體管理)
   * 實施 Lazy Copy (延遲複製) 策略：在沒有廣告元素需要被過濾時，完全不分配新陣列，零記憶體開銷。
   * 僅在偵測到第一個需要被過濾的廣告時，才建立 filtered 陣列並複製先前元素。
   */
  function sanitizeArrayProperty(entry, propertyName) {
    const content = entry && entry.content;
    if (!content || !Array.isArray(content[propertyName])) return entry;

    const originalArray = content[propertyName];
    const before = originalArray.length;
    let filtered = null;
    let writeIdx = 0;

    for (let i = 0; i < before; i++) {
      const wrapped = originalArray[i];
      const nested = unwrapTimelineItem(wrapped);
      let isAd = false;

      if (nested) {
        const nestedContent = nested.itemContent || nested.item_content;
        if (isPromotedEntryId(nested.entryId || nested.entry_id) ||
            hasPromotedMetadata(nestedContent) ||
            (needsDeepScan(nested) && deepHasPromotedSignal(nested))) {
          isAd = true;
        }
      }

      if (isAd) {
        if (filtered === null) {
          filtered = [];
          for (let j = 0; j < writeIdx; j++) {
            filtered.push(originalArray[j]);
          }
        }
      } else {
        if (filtered !== null) {
          filtered.push(wrapped);
        } else {
          writeIdx++;
        }
      }
    }

    if (filtered !== null) {
      content[propertyName] = filtered;
      removedCount += before - filtered.length;

      if (filtered.length === 0 && !(Array.isArray(content.items) && propertyName === 'moduleItems')) {
        removedCount++;
        return null;
      }
    }
    return entry;
  }

  function sanitizeModuleItems(entry) {
    const content = entry && entry.content;
    if (!content) return entry;

    if (Array.isArray(content.items)) {
      entry = sanitizeArrayProperty(entry, 'items');
      if (entry === null) return null;
    }

    if (Array.isArray(content.moduleItems)) {
      entry = sanitizeArrayProperty(entry, 'moduleItems');
      if (entry === null) return null;
    }

    return entry;
  }

  function isPromotedEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;

    if (isPromotedEntryId(entry.entryId || entry.entry_id)) return true;

    const content = entry.content;
    if (!content || typeof content !== 'object') {
      return needsDeepScan(entry) && deepHasPromotedSignal(entry);
    }

    const contentType = content.__typename || content.item_type || content.itemType;
    if (typeof contentType === 'string' && /Promoted|Advertisement/i.test(contentType)) return true;

    const itemType = content.itemType || content.item_type;
    if (typeof itemType === 'string' && /promoted|advertisement/i.test(itemType)) return true;

    const itemContent = content.itemContent || content.item_content;
    if (hasPromotedMetadata(itemContent)) return true;

    const items = content.items;
    if (Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const wrapped = items[i];
        const nested = unwrapTimelineItem(wrapped);
        const nestedContent = nested && (nested.itemContent || nested.item_content);
        if (hasPromotedMetadata(nestedContent) || isPromotedEntryId(nested && (nested.entryId || nested.entry_id))) {
          return true;
        }
      }
      return false;
    }

    return needsDeepScan(entry) && deepHasPromotedSignal(entry);
  }

  /**
   * 過濾並更新 Entry 列表 (優化 5. 記憶體管理)
   * 同樣使用 Lazy Copy 策略，在沒有任何 entry 屬於廣告時，直接回傳原 entries 陣列，完全避免建立臨時 filtered 陣列
   */
  function filterEntryList(entries) {
    if (!Array.isArray(entries)) return entries;

    const before = entries.length;
    let filtered = null;
    let writeIdx = 0;

    for (let i = 0; i < before; i++) {
      const origEntry = entries[i];
      const entry = sanitizeModuleItems(origEntry);
      const isAd = !entry || isPromotedEntry(entry);

      if (isAd) {
        if (filtered === null) {
          filtered = [];
          for (let j = 0; j < writeIdx; j++) {
            filtered.push(entries[j]);
          }
        }
      } else {
        if (filtered !== null) {
          filtered.push(entry);
        } else {
          writeIdx++;
        }
      }
    }

    if (filtered !== null) {
      removedCount += before - filtered.length;
      return filtered;
    }
    return entries;
  }

  function filterInstruction(instruction) {
    if (!instruction || typeof instruction !== 'object') return;

    const type = instruction.type;
    // 使用預先快取的常置屬性判定 O(1) 檢查，避免重複宣告 Handled Types 物件
    if (!HANDLED_INSTRUCTION_TYPES[type]) return;

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
      const entry = sanitizeModuleItems(instruction.entry);
      if (!entry || isPromotedEntry(entry)) {
        instruction.entry = null;
        removedCount++;
      } else {
        instruction.entry = entry;
      }
    }
  }

  /**
   * 遞迴改迭代 DFS 收集指令陣列 (優化 1 & 6. DOM-like 遍歷與非同步阻塞優化)
   * 1. 徹底消滅遞迴，使用「迭代 DFS」遍歷，完全避免極端資料結構下的 Call Stack Overflow 風險。
   * 2. 採用「扁平棧（Flat Stack）」結構，在 stack 內交替儲存 [node, depth]，避免為每個節點創建 `{node, depth}` 暫存物件。
   * 3. 捨棄 Object.keys，全面改用 for...in + hasOwn，避免高頻大量分配鍵名陣列。
   */
  function collectInstructionArrays(root, bucket) {
    if (!root || typeof root !== 'object') return;

    const seen = new Set();
    const stack = [];
    stack.push(root, 0);

    while (stack.length > 0) {
      const depth = stack.pop();
      const node = stack.pop();

      if (!node || typeof node !== 'object' || depth > 14) continue;
      if (seen.has(node)) continue;
      seen.add(node);

      if (Array.isArray(node.instructions)) {
        bucket.push(node.instructions);
      }

      if (Array.isArray(node.items_results)) {
        bucket.push({ type: 'items_results', list: node.items_results });
      }

      if (Array.isArray(node)) {
        // 從後往前壓棧，以確保迭代出棧時的遍歷順序與原本從前往後的遞迴順序 100% 完全相同
        for (let i = node.length - 1; i >= 0; i--) {
          const item = node[i];
          if (item && typeof item === 'object') {
            stack.push(item, depth + 1);
          }
        }
      } else {
        for (const key in node) {
          if (hasOwn.call(node, key)) {
            if (key === 'instructions' || key === 'items_results') continue;
            const val = node[key];
            if (val && typeof val === 'object') {
              stack.push(val, depth + 1);
            }
          }
        }
      }
    }
  }

  function applyInstructionBuckets(buckets) {
    for (let b = 0; b < buckets.length; b++) {
      const instructions = buckets[b];
      if (instructions && instructions.type === 'items_results') {
        instructions.list = filterEntryList(instructions.list);
        continue;
      }
      if (!Array.isArray(instructions)) continue;
      for (let i = 0; i < instructions.length; i++) {
        filterInstruction(instructions[i]);
      }
    }
  }

  function cleanTimelineJson(json) {
    let totalRemoved = 0;
    const buckets = [];

    if (json && json.data) {
      collectInstructionArrays(json.data, buckets);
    }

    // === 優化重點 3. MutationObserver 機制映射 (條件停止機制) ===
    // 最多 3 次迴圈處理級聯刪除，若單次 Pass 無任何元素被刪除則提前 break 停止，避免無窮迴圈
    for (let pass = 0; pass < 3; pass++) {
      removedCount = 0;
      applyInstructionBuckets(buckets);
      totalRemoved += removedCount;
      if (removedCount === 0) break;
    }

    removedCount = totalRemoved;

    if (removedCount === 0 && buckets.length > 0 && json && json.data) {
      // 若無明顯廣告，則清理微小的 ad keys，此處同樣重構成「扁平棧迭代」以優化效能
      stripAdKeys(json.data, 0, 10);
    }

    return removedCount > 0 ? json : null;
  }

  /**
   * 清洗 Legacy 舊版時間線 (優化 5. 記憶體管理)
   * 捨棄 Object.keys(tweets)，使用 for...in + hasOwn 減少暫存陣列分配
   */
  function cleanLegacyTimeline(json) {
    const tweets = json && json.globalObjects && json.globalObjects.tweets;
    if (!tweets || typeof tweets !== 'object') return null;

    removedCount = 0;
    for (const key in tweets) {
      if (hasOwn.call(tweets, key)) {
        const tweet = tweets[key];
        if (!tweet || typeof tweet !== 'object') continue;
        if (isPromotedSource(tweet.source) || tweet.scribe_key === 'ad' || tweet.scribe_key === 'promoted') {
          delete tweets[key];
          removedCount++;
        }
      }
    }

    return removedCount > 0 ? json : null;
  }

  /**
   * 剝離 Ad Keys (優化 1 & 6. DOM-like 遍歷與非同步阻塞優化)
   * 使用與 collectInstructionArrays 相同的「迭代 DFS」與「扁平棧」結構，徹底防止遞迴呼叫與 Object.keys 的記憶體開銷
   */
  function stripAdKeys(root, startDepth, maxDepth) {
    if (!root || typeof root !== 'object' || startDepth > maxDepth) return;

    const stack = [];
    stack.push(root, startDepth);

    while (stack.length > 0) {
      const depth = stack.pop();
      const cur = stack.pop();

      if (!cur || typeof cur !== 'object' || depth > maxDepth) continue;

      if (Array.isArray(cur)) {
        for (let i = cur.length - 1; i >= 0; i--) {
          const item = cur[i];
          if (item && typeof item === 'object') {
            stack.push(item, depth + 1);
          }
        }
      } else {
        for (const key in cur) {
          if (hasOwn.call(cur, key)) {
            if (REGEX_AD_KEY.test(key)) {
              delete cur[key];
              removedCount++;
              continue;
            }
            const val = cur[key];
            if (val && typeof val === 'object') {
              stack.push(val, depth + 1);
            }
          }
        }
      }
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

    for (let i = 0; i < patterns.length; i++) {
      cleaned = cleaned.replace(patterns[i], '');
    }

    return cleaned;
  }

  // === 主執行區 ===
  // 增加對外部環境的安全性檢驗，避免在非 Surge/HTTP-Response 環境下直譯報錯
  if (isInitialized) {
    if (typeof $done === 'function') $done({});
    return;
  }

  const url = (typeof $request !== 'undefined' && $request && $request.url) || '';
  const isGraphql = REGEX_GRAPHQL.test(url);
  const isLegacyTimeline = REGEX_LEGACY_TIMELINE.test(url);

  // 快速出口：若 URL 不匹配則直接回傳，防止無意義的後續耗時操作
  if (!isGraphql && !isLegacyTimeline) {
    if (typeof $done === 'function') $done({});
    return;
  }

  isInitialized = true;
  let body = getBodyString();

  if (!body || !shouldParseBody(url, body)) {
    if (typeof $done === 'function') $done({});
    return;
  }

  try {
    const json = JSON.parse(body);
    const cleaned = isLegacyTimeline ? cleanLegacyTimeline(json) : cleanTimelineJson(json);

    if (cleaned) {
      body = JSON.stringify(cleaned);
      const endpoint = getEndpointName(url);
      const host = (url.match(/^https?:\/\/([^/?#]+)/i) || [])[1] || 'unknown';
      console.log(`[X Ads Blocker ${VERSION}] ${endpoint} removed ${removedCount} promoted item(s). host=${host}`);
      if (typeof $done === 'function') $done({ body });
    } else {
      if (typeof $done === 'function') $done({});
    }
  } catch (error) {
    const cleanedBody = fallbackRegexClean(body);
    if (cleanedBody !== body) {
      console.log(`[X Ads Blocker ${VERSION}] JSON parse failed, regex fallback: ${error}`);
      if (typeof $done === 'function') $done({ body: cleanedBody });
    } else {
      if (typeof $done === 'function') $done({});
    }
  }
})();
