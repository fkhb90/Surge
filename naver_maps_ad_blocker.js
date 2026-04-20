/**
 * naver_maps_ad_blocker.js
 * ========================
 * Removes AD① sponsored listing cards from Naver Maps WebView search results.
 *
 * HOW IT WORKS
 * ─────────────
 * From reverse analysis of ssl.pstatic.net/adimg3.search/adpost/ad.js:
 *
 *   element.getAttribute("data-for-biz-catcher")
 *
 * Every Naver Maps ad card anchor has a `data-for-biz-catcher` attribute that
 * carries click-attribution parameters. This attribute is ONLY set on sponsored
 * listing cards, never on organic results. We use it as a reliable anchor.
 *
 * Belt-and-suspenders: we also match <li> elements containing the ad image
 * CDN path (adimg3.search) in case BizCatcher tracking is absent.
 *
 * REQUIRED SURGE CONFIGURATION
 * ─────────────────────────────
 * Add to [Script] section:
 *
 *   naver-maps-ad = type=http-response, \
 *     pattern=https://nmap\.place\.naver\.com/(place|restaurant)/list, \
 *     requires-body=1, max-size=0, script-path=naver_maps_ad_blocker.js
 *
 * Add to [MITM] section:
 *
 *   hostname = nmap.place.naver.com, %APPEND%
 *
 * IMPORTANT CAVEATS
 * ─────────────────
 * 1. This script targets the SSR HTML response from the WebView navigation.
 *    If Naver renders ad cards client-side via XHR (not in the initial HTML),
 *    this script will not see them. In that case, enable MITM and check XHR
 *    requests from nmap.place.naver.com with sec-fetch-mode: cors.
 *
 * 2. Naver Maps app may use SSL Pinning, which would block MITM entirely.
 *    If Surge shows "MITM Failed" for nmap.place.naver.com, SSL pinning is
 *    active and this script cannot intercept the responses.
 *
 * 3. The regex-based approach may fail on deeply nested <li> structures.
 *    If only some ads are removed, investigate the actual HTML structure
 *    to refine the removal pattern.
 *
 * Version: 1.0.0 (2026-04-20)
 * Investigation basis: ad.js reverse analysis + Naver Maps architecture study
 */

"use strict";

const TAG = "[NaverMapsAdBlocker]";

// ── Guard: empty body ────────────────────────────────────────────────────────
const rawBody = $response.body;
if (!rawBody || rawBody.length === 0) {
    console.log(`${TAG} Empty response body — nothing to filter`);
    $done({});
    /* return; */  // unreachable after $done but documents intent
}

// ── Determine content type ───────────────────────────────────────────────────
const contentType = ($response.headers["Content-Type"] || "").toLowerCase();
const isJson = contentType.includes("application/json");
const isHtml = contentType.includes("text/html");

console.log(`${TAG} Content-Type: ${contentType}, length: ${rawBody.length}`);

// ╔══════════════════════════════════════════════════════════════╗
// ║  PATH A: JSON response (XHR data endpoint)                   ║
// ║  Only reached if the actual data API is captured (not HTML). ║
// ╚══════════════════════════════════════════════════════════════╝
if (isJson) {
    let data;
    try {
        data = JSON.parse(rawBody);
    } catch (e) {
        console.log(`${TAG} JSON parse error: ${e.message} — passing through`);
        $done({});
    }

    // Naver place JSON structures we know about:
    //   { businesses: { [query]: { items: [...] } } }   (store.naver.com)
    //   { result: { place: { list: [...] } } }          (possible mobile API)
    //   { searchList: [...] }                           (possible alternative)
    //
    // We try to filter each known shape.
    let removedCount = 0;

    const isAdItem = (item) => {
        // Attempt to detect ad via common field name candidates.
        // These are GUESSES — enable MITM to see the actual field names.
        return (
            item.isAd === true ||
            item.adYn === "Y" ||
            item.ad_yn === "Y" ||
            item.isAdvertise === true ||
            item.placeAdYn === "Y" ||
            item.businessType === "AD" ||
            item.type === "AD" ||
            item.itemType === "ad" ||
            (item.adInfo !== undefined && item.adInfo !== null) ||
            (item.adStyle !== undefined && item.adStyle !== null)
        );
    };

    // Shape 1: businesses → [query] → items
    if (data && data.businesses) {
        for (const key of Object.keys(data.businesses)) {
            const bucket = data.businesses[key];
            if (bucket && Array.isArray(bucket.items)) {
                const before = bucket.items.length;
                bucket.items = bucket.items.filter(item => !isAdItem(item));
                removedCount += before - bucket.items.length;
            }
        }
    }

    // Shape 2: result → place → list
    if (data && data.result && data.result.place && Array.isArray(data.result.place.list)) {
        const before = data.result.place.list.length;
        data.result.place.list = data.result.place.list.filter(item => !isAdItem(item));
        removedCount += before - data.result.place.list.length;
    }

    // Shape 3: searchList (flat)
    if (data && Array.isArray(data.searchList)) {
        const before = data.searchList.length;
        data.searchList = data.searchList.filter(item => !isAdItem(item));
        removedCount += before - data.searchList.length;
    }

    // Shape 4: items (flat)
    if (data && Array.isArray(data.items)) {
        const before = data.items.length;
        data.items = data.items.filter(item => !isAdItem(item));
        removedCount += before - data.items.length;
    }

    console.log(`${TAG} JSON path: removed ${removedCount} ad item(s)`);
    $done({ body: JSON.stringify(data) });
}

// ╔══════════════════════════════════════════════════════════════╗
// ║  PATH B: HTML response (WebView document navigation)         ║
// ║  Primary target for nmap.place.naver.com/restaurant/list     ║
// ╚══════════════════════════════════════════════════════════════╝

let result = rawBody;
let removedCount = 0;

// ── Strategy 1: Remove <li> blocks with data-for-biz-catcher ────────────────
// `data-for-biz-catcher` is set ONLY on ad card elements (proven from ad.js source).
// We split on <li to handle the blocks without regex backtracking across the whole body.
(function removeBizCatcher() {
    const OPEN = "<li";
    const CLOSE = "</li>";
    const MARKER = "data-for-biz-catcher";

    const parts = result.split(OPEN);
    let rebuilt = parts[0]; // preamble before first <li

    for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i];
        const closeIdx = chunk.indexOf(CLOSE);
        if (closeIdx === -1) {
            // Malformed HTML — keep as-is
            rebuilt += OPEN + chunk;
            continue;
        }
        const liInner = chunk.substring(0, closeIdx);
        const afterClose = chunk.substring(closeIdx + CLOSE.length);

        if (liInner.indexOf(MARKER) !== -1) {
            // Ad card — skip the entire <li>...</li>
            removedCount++;
            rebuilt += afterClose;
        } else {
            rebuilt += OPEN + chunk;
        }
    }
    result = rebuilt;
})();

// ── Strategy 2: Remove <li> blocks with ad image CDN path ───────────────────
// Belt-and-suspenders: catches ad cards without BizCatcher (e.g., image-only ads).
(function removeAdImg() {
    const OPEN = "<li";
    const CLOSE = "</li>";
    const MARKER = "adimg3.search";

    const parts = result.split(OPEN);
    let rebuilt = parts[0];

    for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i];
        const closeIdx = chunk.indexOf(CLOSE);
        if (closeIdx === -1) {
            rebuilt += OPEN + chunk;
            continue;
        }
        const liInner = chunk.substring(0, closeIdx);
        const afterClose = chunk.substring(closeIdx + CLOSE.length);

        if (liInner.indexOf(MARKER) !== -1) {
            removedCount++;
            rebuilt += afterClose;
        } else {
            rebuilt += OPEN + chunk;
        }
    }
    result = rebuilt;
})();

// ── Strategy 3 (fallback): Remove <li> with 광고 badge element ──────────────
// Only runs if strategies 1 & 2 found nothing — catches cases where
// the HTML structure differs from the expected BizCatcher pattern.
if (removedCount === 0) {
    // Naver's ad badge text is "광고" in a standalone span/em element.
    // Pattern: <span>광고</span> or <em class="...">광고</em> inside the <li>.
    const AD_TEXT = "광고";
    const OPEN = "<li";
    const CLOSE = "</li>";

    const parts = result.split(OPEN);
    let rebuilt = parts[0];

    for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i];
        const closeIdx = chunk.indexOf(CLOSE);
        if (closeIdx === -1) {
            rebuilt += OPEN + chunk;
            continue;
        }
        const liInner = chunk.substring(0, closeIdx);
        const afterClose = chunk.substring(closeIdx + CLOSE.length);

        // Only match if 광고 appears inside an HTML tag (not as part of business name)
        // Pattern: ><span[^>]*>광고</ or similar
        const adBadgePattern = />광고</;
        if (adBadgePattern.test(liInner)) {
            removedCount++;
            rebuilt += afterClose;
        } else {
            rebuilt += OPEN + chunk;
        }
    }
    result = rebuilt;
}

console.log(`${TAG} HTML path: removed ${removedCount} ad card(s) from ${rawBody.length} byte response`);

if (removedCount === 0) {
    console.log(`${TAG} ⚠ No ads removed. Possible causes:`);
    console.log(`${TAG}   1. Ad cards are rendered client-side (not in initial HTML)`);
    console.log(`${TAG}   2. HTML structure differs from expected <li> pattern`);
    console.log(`${TAG}   3. SSL pinning bypassed MITM — verify response is decrypted`);
    console.log(`${TAG}   Enable Surge HTTP Capture to inspect the actual response body`);
}

$done({ body: result });
