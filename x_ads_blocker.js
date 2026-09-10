// X.com / Twitter Ads Blocker for Surge (iOS App optimized)
// Version: 2.4.0 (Deep strict scan + injectionType + leak detector)
// Purpose: Remove promoted tweets / ads from X.com / Twitter GraphQL timeline responses.
//
// Surge [Script] 建議設定:
// [Script]
// x-ads-blocker = type=http-response,pattern=^https?://([^/]+\.)?((x|twitter)\.com|albtls\.t\.co)(/i)?(/api)?/graphql/,script-path=x_ads_blocker.js,requires-body=true,max-size=4194304,timeout=8,debug=false
// x-ads-blocker-legacy = type=http-response,pattern=^https?://([^/]+\.)?(x|twitter)\.com/2/timeline/,script-path=x_ads_blocker.js,requires-body=true,max-size=4194304,timeout=5,debug=false
//
// 進階（可選）：僅攔 Timeline 類端點，減少 UserByRestId 等無關請求的腳本開銷
// x-ads-blocker-timeline = type=http-response,pattern=^https?://([^/]+\.)?((x|twitter)\.com|albtls\.t\.co)(/i)?(/api)?/graphql/[^/]+/(HomeTimeline|HomeLatestTimeline|ForYouTimeline|FollowingTimeline|SearchTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|UserMedia|ListLatestTweetsTimeline|CommunityTweetsTimeline|Bookmarks|ConversationTimeline|GenericTimelineById|HomeTimelineUrt|homeTimeline),script-path=x_ads_blocker.js,requires-body=true,max-size=4194304,timeout=8,debug=false
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

  const VERSION = '2.4.0';

  // === 優化重點 2. 事件監聽優化 (預編譯正則表達式單例 Regex Singletons) ===
  // 集中預編譯所有正則表達式，避免在熱路徑中重複創建 Regex 實例，顯著降低 CPU 使用率與 GC 負載
  const REGEX_GRAPHQL = /(\/api)?\/graphql\//i;
  const REGEX_LEGACY_TIMELINE = /\/2\/timeline\//i;
  const REGEX_TIMELINE_ENDPOINT = /^(HomeTimeline|HomeLatestTimeline|ForYouTimeline|FollowingTimeline|SearchTimeline|ListLatestTweetsTimeline|CommunityTweetsTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|UserMedia|Bookmarks|ConversationTimeline|GenericTimelineById|HomeTimelineUrt|homeTimeline)$/i;
  const REGEX_PROMOTED_HINT = /"promotedMetadata"|"promoted_metadata"|"promotedContent"|"promoted_content"|"placementTracking"|"placement_tracking"|"impressionId"|"impression_id"|"ext_has_promoted"|promoted-tweet|"entryId"\s*:\s*"[^"]*promoted|"entry_id"\s*:\s*"[^"]*promoted|"disclosure_type"|"disclosureType"|TimelineTweetPromoted|PromotedTrend|TrendPromoted|"clientEventInfo"|"moduleItems"|"items_results"|ads-api\.twitter\.com|Twitter for Advertisers|"scribe_key"\s*:\s*"(ad|promoted)"|"monetizable"|"advertiser_results"|"isPromoted"|"is_promoted"/i;
  // 廣義預檢：涵蓋原版 23 個 indexOf 的全部大小寫變體（advertiser⊂advertis、isPromoted⊂promoted、
  // impressionId / impression_id 由 impression_?id 合併），單次掃描即可。
  const REGEX_ANY_PROMOTED_SIGNAL = /promoted|placement|advertis|disclosure|scribe_key|ad[_m]etadata|ad-|sponsored|impression_?id|monetizable|廣告|推广|推廣/i;
  // X 以 injectionType 標記「注入式」項目，廣告為 PromotedTweet / PromotedTrend 等。
  // 舊版完全沒有檢查這個欄位，是首頁廣告最主要的漏網來源之一。
  const REGEX_PROMOTED_INJECTION = /promoted|advertis/i;
  // 嚴格型別比對：GraphQL __typename / itemType 皆為 PascalCase，用大小寫敏感避免命中 "ad" 子字串。
  const REGEX_STRICT_AD_TYPENAME = /Promoted|Advertisement/;
  // 清理後仍殘留的廣告痕跡：用於在 Surge 日誌回報「有東西沒擋掉」，只記錄不改寫。
  const REGEX_RESIDUAL_AD = /"promotedMetadata"|"promoted_metadata"|"injectionType"\s*:\s*"[^"]*[Pp]romoted|"entryId"\s*:\s*"[^"]*[Pp]romoted/;
  const REGEX_AD_KEY = /^(promotedMetadata|promoted_metadata|promotedContent|promoted_content|adMetadata|ad_metadata|placementTracking|placement_tracking|impressionId|impression_id|adImpressionId|ad_impression_id|ext_has_promoted_metadata)$/;
  const REGEX_PROMOTED_ENTRY_ID = /promoted|advertisement|^ad-|-ad-|who-to-follow-ad|promoted-trend|promoted_event/i;
  // `ad_` 必須位於字首或 `_` 之後，避免 "download_adapter"、"thread_ad" 這類子字串誤判。
  const REGEX_PROMOTED_CLIENT_EVENT = /promoted|advertisement|sponsored|(^|_)ad_/i;
  const REGEX_PROMOTED_SOURCE = /ads-api\.twitter\.com|Twitter for Advertisers/i;
  const REGEX_PROMOTED_TEXT = /promoted|sponsored|廣告|推广|推廣/i;
  const REGEX_PROMOTED_ENTRY_TYPE = /Promoted|Advertisement/i;
  // 原本的 /Promoted|Ad/i 會命中任何含 "ad" 的 __typename（例如 Thread / TweetUnavailable 類新型別），
  // 造成正常推文被誤刪。改為大小寫敏感且要求 Ad 為 PascalCase 型別字首。
  const REGEX_PROMOTED_TWEET_TYPE = /Promoted|^Ad$|^Ad[A-Z]/;
  // 同理，/ad/i 太寬鬆；限制為完整詞或 advert 前綴。
  const REGEX_PROMOTED_DISCLOSURE = /promoted|sponsored|advert|^ad$/i;

  // 快取 TextDecoder 單例，避免多次解碼響應時重複 new TextDecoder 實例，降低記憶體佔用與 GC 壓力
  const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

  // 用於 hasOwnProperty 的快取，減少原型鏈查找開銷
  const hasOwn = Object.prototype.hasOwnProperty;

  // 模組內變數用於計數，執行完即隨著 IIFE 結束釋放
  let removedCount = 0;

  // 標記 body 是否由腳本自行解壓縮。若為 true，回寫 body 時必須移除 Content-Encoding /
  // Content-Length，否則客戶端會拿明文去做 brotli/gzip 解碼而失敗（Timeline 直接空白）。
  let bodyWasDecompressed = false;

  /**
   * 讀取並解密/解壓 HTTP 響應 Body (優化 TextDecoder 實例分配)
   */
  function getBodyString() {
    if (typeof $response === 'undefined' || !$response) return '';
    const raw = $response.body;
    if (typeof raw === 'string') return raw;
    if (!raw || typeof raw.byteLength !== 'number' || !decoder) return '';

    const headers = $response.headers;
    const headerEncoding = headers && (headers['Content-Encoding'] || headers['content-encoding']);
    const encoding = typeof headerEncoding === 'string' ? headerEncoding.toLowerCase() : '';
    const utils = typeof $utils !== 'undefined' ? $utils : null;

    try {
      if (encoding.includes('br')) {
        if (!utils || typeof utils.unbrotli !== 'function') return '';
        const text = decoder.decode(utils.unbrotli(raw));
        bodyWasDecompressed = true;
        return text;
      }
      if (encoding.includes('gzip')) {
        if (!utils || typeof utils.ungzip !== 'function') return '';
        const text = decoder.decode(utils.ungzip(raw));
        bodyWasDecompressed = true;
        return text;
      }
      return decoder.decode(raw);
    } catch (error) {
      // 解壓縮或解碼失敗時 fail open，避免把壓縮資料當 JSON 改寫。
      return '';
    }
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
   * 檢測字串中是否含有任何已知廣告信號。
   * 這只是預檢；未命中不代表回應絕對沒有廣告，因此新欄位仍應在結構化掃描中補上。
   */
  function hasAnyPromotedSignal(body) {
    // 原版對同一份最大 4 MiB 的 body 連做 23 次 indexOf 全掃描；改為單一 case-insensitive
    // regex 只掃一遍，涵蓋範圍為原版之超集（不會漏判），成本降到約 1/23。
    return REGEX_ANY_PROMOTED_SIGNAL.test(body);
  }

  function shouldParseBody(url, body) {
    // 快速出口：未命中已知信號時先不解析，降低一般回應的成本。
    if (!hasAnyPromotedSignal(body)) return false;

    // 若是 Timeline 介面，且含有廣告信號，則進行解析
    if (isTimelineEndpoint(url) || REGEX_LEGACY_TIMELINE.test(url)) return true;

    // 非 Timeline 介面，則進行精確的 Regex hint 匹配
    return REGEX_PROMOTED_HINT.test(body);
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
      return REGEX_PROMOTED_TEXT.test(socialContext);
    }
    if (typeof socialContext === 'object') {
      const text = socialContext.text || socialContext.context || socialContext.contextType ||
                   socialContext.type || socialContext.__typename || '';
      return REGEX_PROMOTED_TEXT.test(text);
    }
    return false;
  }

  function hasPromotedAdFields(record) {
    if (!record || typeof record !== 'object') return false;
    return !!(record.promotedMetadata ||
              record.promoted_metadata ||
              record.promotedContent ||
              record.promoted_content ||
              record.adMetadata ||
              record.ad_metadata ||
              record.placementTracking ||
              record.placement_tracking ||
              record.impressionId ||
              record.impression_id ||
              record.adImpressionId ||
              record.ad_impression_id ||
              record.ext_has_promoted_metadata === true ||
              record.ext_has_promoted === true ||
              record.isPromoted === true ||
              record.is_promoted === true);
  }

  function resolveTweetResult(result) {
    if (!result || typeof result !== 'object') return null;
    if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) return result.tweet;
    if (result.tweet && typeof result.tweet === 'object') return result.tweet;
    return result;
  }

  function isPromotedTweetResult(result) {
    if (!result || typeof result !== 'object') return false;
    if (hasPromotedAdFields(result)) return true;

    const tweet = resolveTweetResult(result);
    if (!tweet || typeof tweet !== 'object') return false;
    if (tweet !== result && hasPromotedAdFields(tweet)) return true;

    const typename = tweet.__typename;
    if (typeof typename === 'string' && REGEX_PROMOTED_TWEET_TYPE.test(typename)) return true;

    const card = tweet.card;
    if (hasPromotedAdFields(card)) return true;

    const legacy = tweet.legacy;
    if (legacy) {
      if (hasPromotedAdFields(legacy) ||
          legacy.scribe_key === 'ad' ||
          legacy.scribe_key === 'promoted' ||
          isPromotedSource(legacy.source)) return true;

      const mediaList = (legacy.extended_entities && legacy.extended_entities.media) ||
                        (legacy.entities && legacy.entities.media);
      if (Array.isArray(mediaList)) {
        for (let i = 0; i < mediaList.length; i++) {
          const info = mediaList[i] && mediaList[i].additional_media_info;
          if (info && (info.monetizable || info.advertiser)) return true;
        }
      }
    }

    return isPromotedSource(tweet.source);
  }

  /**
   * 檢查 ClientEventInfo 是否為推廣廣告 (優化 5. 記憶體管理)
   * 完全消除臨時陣列分配與字串 join，直接對各屬性進行短路測試，邏輯結果與原版 100% 相同 (Functional Parity)
   */
  function isPromotedClientEventInfo(clientEventInfo) {
    if (!clientEventInfo || typeof clientEventInfo !== 'object') return false;
    if ((typeof clientEventInfo.component === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.component)) ||
        (typeof clientEventInfo.element === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.element)) ||
        (typeof clientEventInfo.action === 'string' && REGEX_PROMOTED_CLIENT_EVENT.test(clientEventInfo.action))) {
      return true;
    }

    // 舊版只在 details 為字串時比對，但實際 X 回應中 details 一律是物件：
    //   clientEventInfo.details.timelinesDetails.injectionType === 'PromotedTweet'
    // 導致整條 clientEventInfo 偵測形同虛設。這裡同時支援字串與物件兩種形態。
    const details = clientEventInfo.details;
    if (typeof details === 'string') return REGEX_PROMOTED_CLIENT_EVENT.test(details);
    if (details && typeof details === 'object') {
      if (hasPromotedInjectionType(details)) return true;
      const timelines = details.timelinesDetails || details.timelines_details;
      if (timelines && typeof timelines === 'object' && hasPromotedInjectionType(timelines)) return true;
    }
    return false;
  }

  /**
   * 檢查物件上的 injectionType / injection_type 是否標示為廣告。
   * X 用這個欄位區分自然內容（OrganicTweet / WhoToFollow）與注入廣告（PromotedTweet）。
   */
  function hasPromotedInjectionType(record) {
    if (!record || typeof record !== 'object') return false;
    const injection = record.injectionType || record.injection_type;
    return typeof injection === 'string' && REGEX_PROMOTED_INJECTION.test(injection);
  }

  /**
   * 檢測當前節點是否包含推廣廣告信號 (優化 1. DOM/JSON-like 遍歷優化)
   * 使用 for...in + hasOwn 遍歷屬性，代替 Object.keys(node)，完全避免創建臨時鍵名陣列，降地記憶體消耗與 GC 開銷
   */
  function deepHasPromotedSignal(node) {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return false; // 保持原版行為：陣列根節點不檢驗直接返回 false
    if (hasPromotedAdFields(node)) return true;

    for (const key in node) {
      if (hasOwn.call(node, key)) {
        const value = node[key];
        if (REGEX_AD_KEY.test(key) && value) return true;
        if ((key === 'ext_has_promoted' || key === 'isPromoted' || key === 'is_promoted') && value === true) return true;
        if (key === 'scribe_key' && (value === 'ad' || value === 'promoted')) return true;
        if (key === 'source' && isPromotedSource(value)) return true;
        if (key === 'clientEventInfo' || key === 'client_event_info') {
          if (isPromotedClientEventInfo(value)) return true;
        }
        if ((key === 'socialContext' || key === 'social_context') && isPromotedSocialContext(value)) return true;
        if (key === 'advertiser_results' || key === 'advertiserResults') {
          // 必須有實際 result 才算廣告：X 在一般推文上也可能帶出空的 advertiser_results
          // 或 { result: null }，原版只檢查 typeof === 'object' 會把正常推文誤刪。
          if (value && typeof value === 'object' && value.result) return true;
        }
        if (key === 'tweet_results' || key === 'tweetResults') {
          const result = value && value.result;
          if (isPromotedTweetResult(result)) return true;
        }
        // 保持原版一致行為：不對屬性值 value 進行遞迴子層檢查
      }
    }
    return false;
  }

  /**
   * 單一 key/value 是否為「無歧義」的廣告標記。
   * 刻意只收錄明確標記，不含 promoted/ad 之類的模糊字串比對 ——
   * 因為這組判定會被套用到 entry 的整棵子樹，寬鬆規則會誤刪正常推文。
   */
  function isStrictPromotedMarker(key, value) {
    if (REGEX_AD_KEY.test(key)) return !!value;

    switch (key) {
      case 'ext_has_promoted':
      case 'isPromoted':
      case 'is_promoted':
        return value === true;
      case 'scribe_key':
        return value === 'ad' || value === 'promoted';
      case 'injectionType':
      case 'injection_type':
        return typeof value === 'string' && REGEX_PROMOTED_INJECTION.test(value);
      case 'source':
        return isPromotedSource(value);
      case 'disclosureType':
      case 'disclosure_type':
        return typeof value === 'string' && REGEX_PROMOTED_DISCLOSURE.test(value);
      case 'advertiser_results':
      case 'advertiserResults':
        return !!(value && typeof value === 'object' && value.result);
      case '__typename':
      case 'entryType':
      case 'itemType':
      case 'item_type':
        return typeof value === 'string' && REGEX_STRICT_AD_TYPENAME.test(value);
      default:
        return false;
    }
  }

  /**
   * 對 entry 子樹做真正的遞迴掃描（迭代 DFS 實作）。
   *
   * 為什麼需要這個：舊版的 deepHasPromotedSignal 只檢查節點「自己的一層」屬性，
   * 註解甚至明寫「不對屬性值進行遞迴子層檢查」。因此只要 X 把廣告標記多包一層
   * （例如 content.itemContent.promotedMetadata 之外的新位置、或
   * clientEventInfo.details.timelinesDetails.injectionType），整個 entry 就漏掉。
   * 這是首頁仍看得到廣告的結構性原因。
   *
   * 用 isStrictPromotedMarker 的嚴格標記集掃全子樹：
   * schema 怎麼改、標記埋多深都攔得到，同時不會因為模糊字串誤刪正常內容。
   *
   * maxDepth 與 visited 上限用來限制單一 entry 的最壞成本，避免 Surge timeout。
   */
  function deepScanPromoted(root, maxDepth) {
    if (!root || typeof root !== 'object') return false;

    const stack = [root, 0];
    const seen = new Set();
    let visited = 0;

    while (stack.length > 0) {
      const depth = stack.pop();
      const node = stack.pop();

      if (!node || typeof node !== 'object' || depth > maxDepth) continue;
      if (seen.has(node)) continue;
      seen.add(node);
      if (++visited > 4000) break; // CPU 保險絲：超大 entry 直接停掃，寧可漏也不要 timeout

      if (Array.isArray(node)) {
        for (let i = node.length - 1; i >= 0; i--) {
          const item = node[i];
          if (item && typeof item === 'object') stack.push(item, depth + 1);
        }
        continue;
      }

      for (const key in node) {
        if (!hasOwn.call(node, key)) continue;
        const value = node[key];
        if (isStrictPromotedMarker(key, value)) return true;
        if (value && typeof value === 'object') stack.push(value, depth + 1);
      }
    }

    return false;
  }

  function hasPromotedMetadata(itemContent) {
    if (!itemContent || typeof itemContent !== 'object') return false;
    if (hasPromotedAdFields(itemContent)) return true;

    const typename = itemContent.__typename;
    if (typeof typename === 'string' && REGEX_PROMOTED_ENTRY_TYPE.test(typename)) return true;

    if (isPromotedSocialContext(itemContent.socialContext) ||
        isPromotedSocialContext(itemContent.social_context)) return true;

    const tweetResults = itemContent.tweet_results;
    if (tweetResults && isPromotedTweetResult(tweetResults.result)) return true;
    const tweetResultsCamel = itemContent.tweetResults;
    if (tweetResultsCamel && isPromotedTweetResult(tweetResultsCamel.result)) return true;

    if (isPromotedClientEventInfo(itemContent.clientEventInfo) ||
        isPromotedClientEventInfo(itemContent.client_event_info)) return true;

    if (hasPromotedInjectionType(itemContent)) return true;

    // 同 deepHasPromotedSignal：要求 result 非空，避免空殼欄位造成誤判。
    const advertiser = itemContent.advertiser_results;
    if (advertiser && typeof advertiser === 'object' && advertiser.result) return true;
    const advertiserCamel = itemContent.advertiserResults;
    if (advertiserCamel && typeof advertiserCamel === 'object' && advertiserCamel.result) return true;

    const disclosure = itemContent.disclosure_type;
    if (typeof disclosure === 'string' && REGEX_PROMOTED_DISCLOSURE.test(disclosure)) return true;
    const disclosureCamel = itemContent.disclosureType;
    if (typeof disclosureCamel === 'string' && REGEX_PROMOTED_DISCLOSURE.test(disclosureCamel)) return true;

    return false;
  }

  function unwrapTimelineItem(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') return null;
    return wrapped.item || wrapped;
  }

  function isPromotedWrappedEntry(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') return false;
    if (isPromotedEntryId(wrapped.entryId || wrapped.entry_id)) return true;

    const nested = unwrapTimelineItem(wrapped);
    return isPromotedEntry(wrapped) ||
           (nested !== wrapped && isPromotedEntry(nested));
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
      const isAd = isPromotedWrappedEntry(wrapped);

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

      const otherItems = content[propertyName === 'items' ? 'moduleItems' : 'items'];
      if (filtered.length === 0 && !(Array.isArray(otherItems) && otherItems.length > 0)) {
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
    if (hasPromotedMetadata(entry) || deepHasPromotedSignal(entry)) return true;

    if (hasPromotedMetadata(entry.itemContent || entry.item_content)) return true;

    const content = entry.content;
    if (!content || typeof content !== 'object') {
      return deepScanPromoted(entry, 8);
    }

    if (hasPromotedMetadata(content) || deepHasPromotedSignal(content)) return true;

    const contentType = content.__typename || content.item_type || content.itemType;
    if (typeof contentType === 'string' && REGEX_PROMOTED_ENTRY_TYPE.test(contentType)) return true;

    const itemType = content.itemType || content.item_type;
    if (typeof itemType === 'string' && REGEX_PROMOTED_ENTRY_TYPE.test(itemType)) return true;

    const itemContent = content.itemContent || content.item_content;
    if (hasPromotedMetadata(itemContent)) return true;

    const items = content.items;
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        if (isPromotedWrappedEntry(items[i])) return true;
      }
    }

    const moduleItems = content.moduleItems;
    if (Array.isArray(moduleItems)) {
      for (let i = 0; i < moduleItems.length; i++) {
        if (isPromotedWrappedEntry(moduleItems[i])) return true;
      }
    }

    // 最終保險：對整棵 entry 子樹做嚴格標記遞迴掃描。
    // 舊版此處是 `needsDeepScan(entry) && deepHasPromotedSignal(entry)`，
    // 只要 entryId 以 tweet-/cursor- 開頭就整個跳過，而 X 的首頁廣告 entryId
    // 確實常常就是 `tweet-<id>` —— 等於對最常見的廣告形態直接放行。
    return deepScanPromoted(entry, 8);
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
      const nested = unwrapTimelineItem(origEntry);
      const entry = sanitizeModuleItems(nested);
      const isAd = !entry || isPromotedWrappedEntry(origEntry);

      if (isAd) {
        if (filtered === null) {
          filtered = [];
          for (let j = 0; j < writeIdx; j++) {
            filtered.push(entries[j]);
          }
        }
      } else {
        if (filtered !== null) {
          filtered.push(origEntry);
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

  /**
   * 過濾單一 instruction。
   * 回傳 false 代表這條 instruction 整條應該被移除（而非把 entry 設為 null）。
   * 原版對 TimelineReplaceEntry / TimelinePinEntry 直接寫入 `entry: null`，
   * 但這兩種指令的 schema 中 entry 為非空必填欄位，客戶端讀到 null 會渲染異常甚至崩潰；
   * 正確做法是讓「替換 / 置頂」這個動作根本不發生。
   */
  function filterInstruction(instruction) {
    if (!instruction || typeof instruction !== 'object') return true;

    // 舊版用寫死的型別白名單（TimelineAddEntries / ReplaceEntry / PinEntry / AddToModule）。
    // X 只要新增一種攜帶 entries 的指令型別，該型別裡的廣告就整條被放行。
    // 改為依「是否存在可過濾欄位」判斷，對未知型別同樣有效。
    if (!Array.isArray(instruction.entries) &&
        !Array.isArray(instruction.moduleItems) &&
        !Array.isArray(instruction.items_results) &&
        !instruction.entry) {
      return true;
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
      const entry = sanitizeModuleItems(instruction.entry);
      if (!entry || isPromotedEntry(entry)) {
        removedCount++;
        return false;
      }
      instruction.entry = entry;
    }

    return true;
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
        bucket.push({ type: 'items_results', owner: node });
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
      const bucket = buckets[b];
      if (bucket && bucket.type === 'items_results') {
        const owner = bucket.owner;
        if (owner && Array.isArray(owner.items_results)) {
          owner.items_results = filterEntryList(owner.items_results);
        }
        continue;
      }
      if (!Array.isArray(bucket)) continue;
      // 反向走訪，讓 splice 移除整條 instruction 時不會跳過下一個元素。
      // instruction 之間互相獨立，處理順序不影響結果。
      // 直接 splice 原陣列（而非重建）是刻意的：bucket 就是父物件持有的同一個
      // instructions 陣列參考，就地修改才會反映到最終輸出的 JSON。
      for (let i = bucket.length - 1; i >= 0; i--) {
        if (!filterInstruction(bucket[i])) bucket.splice(i, 1);
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
        if (isPromotedEntryId(key) ||
            isPromotedTweetResult(tweet) ||
            hasPromotedMetadata(tweet)) {
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

  /**
   * 統一的 body 回寫出口。
   * 若 body 是本腳本自行解壓縮出來的，回傳的必然是「未壓縮明文」，
   * 因此必須同時移除 Content-Encoding（否則客戶端會嘗試解壓明文而失敗）
   * 與 Content-Length（長度已改變，留著會造成截斷或連線錯誤）。
   */
  function doneWithBody(newBody) {
    if (typeof $done !== 'function') return;
    if (!bodyWasDecompressed) {
      $done({ body: newBody });
      return;
    }
    const src = (typeof $response !== 'undefined' && $response && $response.headers) || {};
    const headers = {};
    for (const key in src) {
      if (!hasOwn.call(src, key)) continue;
      const lower = key.toLowerCase();
      if (lower === 'content-encoding' || lower === 'content-length') continue;
      headers[key] = src[key];
    }
    $done({ body: newBody, headers });
  }

  /**
   * 殘留偵測：清理完成後（或判定不需清理後）檢查輸出裡是否還留有廣告痕跡。
   * 只寫日誌、絕不改寫回應 —— 目的是把「為什麼首頁還有廣告」變成可觀測的事實，
   * 而不是靠猜。日誌會印出殘留標記附近的 entryId，方便針對真實 payload 補規則。
   */
  function reportResidualAds(outBody, endpoint) {
    if (typeof outBody !== 'string') return;
    const match = outBody.match(REGEX_RESIDUAL_AD);
    if (!match) return;

    // 往前找最近的 entryId，指出是哪一則沒被擋掉。
    const at = match.index || 0;
    const head = outBody.lastIndexOf('"entryId"', at);
    let where = 'unknown-entry';
    if (head !== -1) {
      const idMatch = outBody.slice(head, head + 120).match(/"entryId"\s*:\s*"([^"]{0,80})"/);
      if (idMatch) where = idMatch[1];
    }
    console.log(`[X Ads Blocker ${VERSION}] RESIDUAL ad marker survived: endpoint=${endpoint} marker=${match[0].slice(0, 40)} entryId=${where}`);
  }

  function fallbackRegexClean(rawBody) {
    if (typeof rawBody !== 'string') return null;

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

    return cleaned === rawBody ? null : cleaned;
  }

  // === 主執行區 ===
  // 增加對外部環境的安全性檢驗，避免在非 Surge/HTTP-Response 環境下直譯報錯
  const url = (typeof $request !== 'undefined' && $request && $request.url) || '';
  const isGraphql = REGEX_GRAPHQL.test(url);
  const isLegacyTimeline = REGEX_LEGACY_TIMELINE.test(url);

  // 快速出口：若 URL 不匹配則直接回傳，防止無意義的後續耗時操作
  if (!isGraphql && !isLegacyTimeline) {
    if (typeof $done === 'function') $done({});
    return;
  }

  let body = getBodyString();

  if (!body || !shouldParseBody(url, body)) {
    if (typeof $done === 'function') $done({});
    return;
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch (error) {
    const cleanedBody = fallbackRegexClean(body);
    if (cleanedBody) {
      try {
        const fallbackJson = JSON.parse(cleanedBody);
        if (!fallbackJson || typeof fallbackJson !== 'object') throw new Error('fallback is not an object');
      } catch (fallbackError) {
        // Regex fallback 仍不是有效 JSON 時，保留原始回應，避免送出損壞資料。
        if (typeof $done === 'function') $done({});
        return;
      }
      console.log(`[X Ads Blocker ${VERSION}] JSON parse failed, regex fallback: ${error}`);
      doneWithBody(cleanedBody);
    } else if (typeof $done === 'function') {
      $done({});
    }
    return;
  }

  try {
    const cleaned = isLegacyTimeline ? cleanLegacyTimeline(json) : cleanTimelineJson(json);

    if (cleaned) {
      body = JSON.stringify(cleaned);
      const endpoint = getEndpointName(url);
      const host = (url.match(/^https?:\/\/([^/?#]+)/i) || [])[1] || 'unknown';
      console.log(`[X Ads Blocker ${VERSION}] ${endpoint} removed ${removedCount} promoted item(s). host=${host}`);
      reportResidualAds(body, endpoint);
      doneWithBody(body);
    } else {
      // 判定「無廣告可清」時同樣檢查一次：若這裡出現殘留，代表偵測規則有缺口，
      // 正是首頁仍看得到廣告的情況，日誌會直接指出漏掉的 entryId。
      reportResidualAds(body, getEndpointName(url));
      if (typeof $done === 'function') $done({});
    }
  } catch (error) {
    // 有效 JSON 的清理若出錯，直接 passthrough，不對回應做猜測式 regex 修改。
    console.log(`[X Ads Blocker ${VERSION}] cleaning failed, passthrough: ${error}`);
    if (typeof $done === 'function') $done({});
  }
})();
