/**
 * naver_maps_ad_blocker.js  ·  v2.0.0 (2026-04-20)
 * ===================================================
 * Removes AD① sponsored listing cards from Naver Maps WebView search results
 * by surgically patching the Apollo GraphQL SSR state embedded in the HTML.
 *
 * ARCHITECTURE DISCOVERY (via Surge HTTP Capture + HTML analysis)
 * ──────────────────────────────────────────────────────────────
 * The page at nmap.place.naver.com/restaurant/list is a React SPA shell
 * with server-side pre-rendered Apollo GraphQL state embedded as:
 *
 *   window.__APOLLO_STATE__ = { ... }
 *
 * This state object contains TWO separate GraphQL query result types:
 *
 *   ┌─ Organic results ────────────────────────────────────────────────┐
 *   │  ROOT_QUERY.restaurantList(...)                                   │
 *   │  Items: RestaurantListSummary:{id}  (NO adId field)              │
 *   └──────────────────────────────────────────────────────────────────┘
 *   ┌─ Ad results ─────────────────────────────────────────────────────┐
 *   │  ROOT_QUERY.adBusinesses(...)  ← total: 4  ← TARGET             │
 *   │  Items: RestaurantAdSummary:{id}  (HAS adId, adClickLog, etc.)   │
 *   │  adClickLog.clickUrl  →  ader.naver.com/v1/...                   │
 *   │  impressionEventUrl   →  ader.naver.com/v1/...                   │
 *   │  adImages             →  searchad-phinf.pstatic.net/...          │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * SURGICAL PATCH STRATEGY
 * ───────────────────────
 * 1. Locate window.__APOLLO_STATE__ = {...}; in the HTML
 * 2. JSON.parse the state object
 * 3. For every key that starts with "RestaurantAdSummary:" → delete it
 * 4. For every ROOT_QUERY key that includes "adBusinesses" → zero its items
 * 5. JSON.stringify and splice back into the HTML
 *
 * This leaves all 30+ organic RestaurantListSummary items untouched.
 *
 * REQUIRED SURGE CONFIGURATION
 * ─────────────────────────────
 * [Script]
 * naver-maps-ad = type=http-response, \
 *   pattern=https://nmap\.place\.naver\.com/(place|restaurant)/list, \
 *   requires-body=1, max-size=0, \
 *   script-path=/path/to/naver_maps_ad_blocker.js
 *
 * [MITM]
 * hostname = nmap.place.naver.com, %APPEND%
 *
 * IMPORTANT NOTES
 * ───────────────
 * • This script requires MITM to be enabled for nmap.place.naver.com.
 *   If Surge shows "MITM Failed", the Naver Maps app has SSL Pinning
 *   and interception is not possible at this layer.
 *
 * • The Apollo State patch prevents the React app from rendering ad cards
 *   at all, since the data never reaches the component layer.
 *
 * • Organic results are completely untouched (different __typename).
 *
 * • For belt-and-suspenders coverage, also configure SSOT_Compiler to:
 *     DROP: ader.naver.com         (ad click/impression tracking)
 *     DROP: veta.naver.com         (GFP ad SDK)
 *     BLOCK: searchad-phinf.pstatic.net  (ad image CDN)
 *
 * Version history:
 *   v2.0.0 (2026-04-20) - Complete rewrite. Apollo State surgical patch.
 *                          Based on confirmed HTML structure analysis.
 *   v1.0.0 (2026-04-20) - Original provisional version (HTML regex approach).
 */

"use strict";

const TAG = "[NaverMapsAdBlocker v2]";

// ── Guard: empty body ────────────────────────────────────────────────────────
const rawBody = $response.body;
if (!rawBody || rawBody.length === 0) {
    console.log(`${TAG} Empty response — skip`);
    $done({});
}

// ── Locate the Apollo State block ────────────────────────────────────────────
const APOLLO_MARKER = "window.__APOLLO_STATE__ = ";
const markerIdx = rawBody.indexOf(APOLLO_MARKER);

if (markerIdx === -1) {
    console.log(`${TAG} No __APOLLO_STATE__ found (page structure may have changed)`);
    $done({});
}

// Find the exact JSON object boundaries using brace counting
const jsonStart = markerIdx + APOLLO_MARKER.length;
let depth = 0;
let jsonEnd = jsonStart;
let found = false;

for (let i = jsonStart; i < rawBody.length; i++) {
    const ch = rawBody[i];
    if (ch === '{') {
        depth++;
    } else if (ch === '}') {
        depth--;
        if (depth === 0) {
            jsonEnd = i + 1;
            found = true;
            break;
        }
    }
}

if (!found) {
    console.log(`${TAG} Could not find end of __APOLLO_STATE__ object`);
    $done({});
}

const apolloJsonStr = rawBody.substring(jsonStart, jsonEnd);

// ── Parse the Apollo State ───────────────────────────────────────────────────
let apolloState;
try {
    apolloState = JSON.parse(apolloJsonStr);
} catch (e) {
    console.log(`${TAG} JSON parse error: ${e.message} — passing through unchanged`);
    $done({});
}

// ── Surgical patch ───────────────────────────────────────────────────────────
let removedAdEntries = 0;
let patchedQueries = 0;

// Step 1: Remove all RestaurantAdSummary cache entries
// These are the individual ad item objects (adId, adClickLog, adImages, etc.)
const keysToDelete = [];
for (const key of Object.keys(apolloState)) {
    if (key.startsWith("RestaurantAdSummary:")) {
        keysToDelete.push(key);
    }
}
for (const key of keysToDelete) {
    delete apolloState[key];
    removedAdEntries++;
}

// Step 2: Zero out adBusinesses query results in ROOT_QUERY
// The component reads ROOT_QUERY.adBusinesses(...) to get the ad list.
// Clearing items[] and setting total=0 makes the component render nothing.
const rootQuery = apolloState["ROOT_QUERY"];
if (rootQuery) {
    for (const queryKey of Object.keys(rootQuery)) {
        if (queryKey.startsWith("adBusinesses(")) {
            const adResult = rootQuery[queryKey];
            if (adResult && typeof adResult === "object") {
                const before = Array.isArray(adResult.items) ? adResult.items.length : 0;
                adResult.items = [];
                adResult.total = 0;
                adResult.bucket = null;
                adResult.bucketTest = null;
                patchedQueries++;
                console.log(`${TAG} Zeroed adBusinesses query (had ${before} items): ${queryKey.substring(0, 60)}...`);
            }
        }
    }
}

// ── Reconstruct the response body ────────────────────────────────────────────
if (removedAdEntries === 0 && patchedQueries === 0) {
    console.log(`${TAG} ⚠ Nothing patched. Possible causes:`);
    console.log(`${TAG}   • No ads in this search result (0 ad slots)`);
    console.log(`${TAG}   • Apollo State schema changed — check __typename values`);
    $done({});
}

let newApolloJsonStr;
try {
    newApolloJsonStr = JSON.stringify(apolloState);
} catch (e) {
    console.log(`${TAG} JSON stringify error: ${e.message}`);
    $done({});
}

// Splice the patched JSON back into the HTML
const newBody =
    rawBody.substring(0, jsonStart) +
    newApolloJsonStr +
    rawBody.substring(jsonEnd);

console.log(
    `${TAG} ✓ Patch complete — removed ${removedAdEntries} RestaurantAdSummary entries, ` +
    `zeroed ${patchedQueries} adBusinesses quer${patchedQueries === 1 ? "y" : "ies"}. ` +
    `Body: ${rawBody.length} → ${newBody.length} bytes`
);

$done({ body: newBody });
