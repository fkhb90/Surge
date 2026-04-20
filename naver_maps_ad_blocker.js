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
 * [Script]
 * ; Phase 1: HTML Apollo State patch
 * naver-maps-html = type=http-response, \
 *   pattern=https://nmap\.place\.naver\.com/(place|restaurant)/list, \
 *   requires-body=1, max-size=0, \
 *   script-path=/path/to/naver_maps_ad_blocker.js
 *
 * ; Phase 2: GraphQL BFF XHR response strip
 * naver-maps-gql = type=http-response, \
 *   pattern=https://bff-gateway\.place\.naver\.com/, \
 *   requires-body=1, max-size=0, \
 *   script-path=/path/to/naver_maps_ad_blocker.js
 *
 * [MITM]
 * hostname = nmap.place.naver.com, bff-gateway.place.naver.com, %APPEND%
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
// ║  PHASE 2 — GraphQL JSON response from bff-gateway               ║
// ║  Intercepts the Apollo re-fetch that overwrites SSR cache        ║
// ╚══════════════════════════════════════════════════════════════════╝
if (isJson) {
    let gql;
    try {
        gql = JSON.parse(rawBody);
    } catch (e) {
        console.log(`${TAG} JSON parse error: ${e.message}`);
        $done({});
    }

    let patched = false;

    // Standard GraphQL response envelope: { data: { adBusinesses: { ... } } }
    if (gql && gql.data) {
        // --- adBusinesses (primary ad query) ---
        if (gql.data.adBusinesses) {
            const before = Array.isArray(gql.data.adBusinesses.items)
                ? gql.data.adBusinesses.items.length : 0;
            gql.data.adBusinesses.items = [];
            gql.data.adBusinesses.total = 0;
            gql.data.adBusinesses.bucket = null;
            gql.data.adBusinesses.bucketTest = null;
            console.log(`${TAG} [GQL] Cleared adBusinesses (was ${before} items)`);
            patched = true;
        }

        // --- Batched queries: array of { data: {...} } ---
        // Apollo sometimes batches multiple operations in one request
        if (Array.isArray(gql)) {
            for (let i = 0; i < gql.length; i++) {
                const op = gql[i];
                if (op && op.data && op.data.adBusinesses) {
                    const before = Array.isArray(op.data.adBusinesses.items)
                        ? op.data.adBusinesses.items.length : 0;
                    op.data.adBusinesses.items = [];
                    op.data.adBusinesses.total = 0;
                    console.log(`${TAG} [GQL batch #${i}] Cleared adBusinesses (was ${before} items)`);
                    patched = true;
                }
            }
        }
    }

    if (!patched) {
        console.log(`${TAG} [GQL] No adBusinesses field found in response — pass through`);
    }

    $done({ body: JSON.stringify(gql) });
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
