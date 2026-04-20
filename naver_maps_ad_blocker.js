/**
 * naver_maps_ad_blocker.js  ·  v3.0.0 (2026-04-20)
 * ===================================================
 * Removes AD① sponsored listing cards from Naver Maps WebView search results.
 *
 * ARCHITECTURE (confirmed via HTML analysis + Apollo SSR study)
 * ─────────────────────────────────────────────────────────────
 *
 *  Phase 1 — Initial page load (WebView navigation)
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │ GET nmap.place.naver.com/restaurant/list                        │
 *  │ → 200 HTML with window.__APOLLO_STATE__ embedded (~958 KB)      │
 *  │ → ROOT_QUERY.adBusinesses → RestaurantAdSummary items           │
 *  │ Target: patch __APOLLO_STATE__ JSON in HTML                     │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 *  Phase 2 — React hydration re-fetch (XHR, ~500ms after Phase 1)
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │ POST bff-gateway.place.naver.com/graphql                        │
 *  │ → JSON: { data: { restaurantList: {...},                        │
 *  │                    adBusinesses: { total: 4, items: [...] } } } │
 *  │ Apollo fetchPolicy: cache-and-network → overwrites SSR cache    │
 *  │ Target: strip data.adBusinesses from GraphQL JSON response      │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * THIS SCRIPT handles BOTH phases.
 *
 * REQUIRED SURGE CONFIGURATION
 * ─────────────────────────────
 * Script URL (hosted on GitHub):
 *   https://raw.githubusercontent.com/fkhb90/Surge/main/naver_maps_ad_blocker.js
 *
 * [Script]
 * ; Phase 1: HTML SSR Apollo State patch (initial page load)
 * naver-maps-html = type=http-response, pattern=https://nmap\.place\.naver\.com/(place|restaurant)/list, requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/fkhb90/Surge/main/naver_maps_ad_blocker.js
 *
 * ; Phase 2a: BFF GraphQL – initial search + re-sort re-fetch
 * naver-maps-gql = type=http-response, pattern=https://bff-gateway\.place\.naver\.com/, requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/fkhb90/Surge/main/naver_maps_ad_blocker.js
 *
 * ; Phase 2b: nmap-api – alternate endpoint used after re-sort / pagination
 * naver-maps-api = type=http-response, pattern=https://nmap-api\.place\.naver\.com/, requires-body=1, max-size=0, script-path=https://raw.githubusercontent.com/fkhb90/Surge/main/naver_maps_ad_blocker.js
 *
 * [MITM]
 * hostname = nmap.place.naver.com, bff-gateway.place.naver.com, nmap-api.place.naver.com, %APPEND%
 *
 * Version history:
 *   v3.0.0 (2026-04-20) - Dual-phase: HTML patch + GraphQL XHR strip.
 *                          Removed bad early-exit on removedAdEntries=0.
 *   v2.0.0 (2026-04-20) - Apollo State surgical patch (HTML only).
 *   v1.0.0 (2026-04-20) - Original provisional HTML regex approach.
 */

"use strict";

const TAG = "[NaverMapsAd v3]";

// ── Guard: empty body ────────────────────────────────────────────────────────
const rawBody = $response.body;
if (!rawBody || rawBody.length === 0) {
    console.log(`${TAG} Empty body — skip`);
    $done({});
}

// ── Route by Content-Type ────────────────────────────────────────────────────
const headers = $response.headers || {};
const contentType = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
const isJson = contentType.includes("application/json");

console.log(`${TAG} URL: ${$request.url.substring(0, 80)}`);
console.log(`${TAG} Content-Type: ${contentType}, body: ${rawBody.length} bytes`);

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PHASE 2 — GraphQL JSON response (bff-gateway / nmap-api)        ║
// ║  Handles BOTH initial load AND re-sort re-fetch patterns          ║
// ╚══════════════════════════════════════════════════════════════════╝
if (isJson) {
    let gql;
    try {
        gql = JSON.parse(rawBody);
    } catch (e) {
        console.log(`${TAG} JSON parse error: ${e.message}`);
        $done({ body: rawBody });
    }

    // Determine if this is a batched request (array of operations)
    const ops = Array.isArray(gql) ? gql : [gql];
    let totalRemoved = 0;

    // Helper: returns true if an item is a sponsored ad
    const isAdItem = (item) => {
        if (!item || typeof item !== "object") return false;
        // __typename is the most reliable field (present in un-normalized GQL responses)
        if (item.__typename === "RestaurantAdSummary") return true;
        // adId present = sponsored item (from HTML analysis: RestaurantAdSummary has adId)
        if (item.adId !== undefined && item.adId !== null) return true;
        // impressionEventUrl is exclusive to ad items
        if (item.impressionEventUrl !== undefined) return true;
        return false;
    };

    for (let opIdx = 0; opIdx < ops.length; opIdx++) {
        const op = ops[opIdx];
        if (!op || !op.data) continue;
        const d = op.data;
        const prefix = ops.length > 1 ? `[GQL batch #${opIdx}]` : "[GQL]";

        // ── Layer 1: Clear adBusinesses (initial search, top-slot ads) ──────
        // Fired on first search AND after each re-sort if ad slots are separate
        if (d.adBusinesses) {
            const before = Array.isArray(d.adBusinesses.items)
                ? d.adBusinesses.items.length : 0;
            d.adBusinesses.items = [];
            d.adBusinesses.total = 0;
            d.adBusinesses.bucket = null;
            d.adBusinesses.bucketTest = null;
            totalRemoved += before;
            console.log(`${TAG} ${prefix} adBusinesses cleared (was ${before})`);
        }

        // ── Layer 2: Filter ads mixed into restaurantList.items ──────────────
        // After re-sort, Naver may inject RestaurantAdSummary items directly
        // into the organic restaurantList rather than using a separate adBusinesses query
        if (d.restaurantList && Array.isArray(d.restaurantList.items)) {
            const before = d.restaurantList.items.length;
            d.restaurantList.items = d.restaurantList.items.filter(item => !isAdItem(item));
            const removed = before - d.restaurantList.items.length;
            if (removed > 0) {
                // Adjust reported total to avoid "X results" count including removed ads
                if (typeof d.restaurantList.total === "number") {
                    d.restaurantList.total -= removed;
                }
                totalRemoved += removed;
                console.log(`${TAG} ${prefix} restaurantList: removed ${removed} ad items`);
            }
        }

        // ── Layer 3: adBusinesses variant field names ─────────────────────────
        // Some re-sort or channel queries use different top-level field names
        const adFieldVariants = ["adList", "adItems", "sponsoredList", "promotedList"];
        for (const field of adFieldVariants) {
            if (d[field]) {
                const arr = Array.isArray(d[field]) ? d[field]
                          : (Array.isArray(d[field].items) ? d[field].items : null);
                if (arr && arr.length > 0) {
                    totalRemoved += arr.length;
                    if (Array.isArray(d[field])) d[field] = [];
                    else { d[field].items = []; d[field].total = 0; }
                    console.log(`${TAG} ${prefix} Cleared alt ad field: ${field}`);
                }
            }
        }
    }

    if (totalRemoved === 0) {
        console.log(`${TAG} [GQL] No ad items found in this response`);
    } else {
        console.log(`${TAG} [GQL] ✓ Total removed: ${totalRemoved} ad item(s)`);
    }

    $done({ body: JSON.stringify(Array.isArray(gql) ? ops : ops[0]) });
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PHASE 1 — HTML Apollo SSR State patch                          ║
// ║  Removes ads from the server-side rendered initial payload       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── Locate the Apollo State block ────────────────────────────────────────────
const APOLLO_MARKER = "window.__APOLLO_STATE__ = ";
const markerIdx = rawBody.indexOf(APOLLO_MARKER);

if (markerIdx === -1) {
    console.log(`${TAG} [HTML] No __APOLLO_STATE__ found — pass through`);
    $done({ body: rawBody });
}

// Find exact JSON boundaries by brace counting
const jsonStart = markerIdx + APOLLO_MARKER.length;
let depth = 0, jsonEnd = jsonStart, found = false;

for (let i = jsonStart; i < rawBody.length; i++) {
    const ch = rawBody[i];
    if (ch === '{') { depth++; }
    else if (ch === '}') {
        depth--;
        if (depth === 0) { jsonEnd = i + 1; found = true; break; }
    }
}

if (!found) {
    console.log(`${TAG} [HTML] Could not find end of __APOLLO_STATE__ — pass through`);
    $done({ body: rawBody });
}

// ── Parse Apollo State ───────────────────────────────────────────────────────
let apolloState;
try {
    apolloState = JSON.parse(rawBody.substring(jsonStart, jsonEnd));
} catch (e) {
    console.log(`${TAG} [HTML] JSON parse error: ${e.message} — pass through`);
    $done({ body: rawBody });
}

// ── Surgical patch ───────────────────────────────────────────────────────────
let removedAdEntries = 0;
let patchedQueries = 0;

// Step 1: Delete all RestaurantAdSummary cache entries (the ad item objects)
for (const key of Object.keys(apolloState)) {
    if (key.startsWith("RestaurantAdSummary:")) {
        delete apolloState[key];
        removedAdEntries++;
    }
}

// Step 2: Zero out adBusinesses query results in ROOT_QUERY
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
                console.log(`${TAG} [HTML] Zeroed adBusinesses (was ${before} items)`);
            }
        }
    }
}

// ── Always return body (even if 0 ads found) ─────────────────────────────────
// Returning unchanged body prevents Surge from showing "Script skipped modification"
// and ensures the script path is exercised on every request for debugging.
if (removedAdEntries === 0 && patchedQueries === 0) {
    console.log(`${TAG} [HTML] No ad entries found in this response.`);
    console.log(`${TAG}   Likely cause: non-Korean IP (VPN/proxy) → Naver omits adBusinesses from SSR`);
    console.log(`${TAG}   Add DIRECT rule for nmap.place.naver.com to get geo-targeted ads`);
}

// ── Reconstruct and return ───────────────────────────────────────────────────
let newApolloJsonStr;
try {
    newApolloJsonStr = JSON.stringify(apolloState);
} catch (e) {
    console.log(`${TAG} [HTML] JSON stringify error — pass through unchanged`);
    $done({ body: rawBody });
}

const newBody =
    rawBody.substring(0, jsonStart) +
    newApolloJsonStr +
    rawBody.substring(jsonEnd);

console.log(
    `${TAG} [HTML] ✓ Done — removed ${removedAdEntries} AdSummary entries, ` +
    `patched ${patchedQueries} adBusinesses quer${patchedQueries === 1 ? "y" : "ies"}. ` +
    `${rawBody.length} → ${newBody.length} bytes`
);

$done({ body: newBody });
