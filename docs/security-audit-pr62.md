# Security Audit — PR #62: CORS Headers + CSP frame-ancestors

**Branch:** `fix/game-asset-cors`
**Auditor:** security-auditor (Hermes Agent)
**Date:** 2026-06-13
**Files changed:** `apps/api/src/server.ts`, `apps/web-arcade/vercel.json`

---

## Summary

PR #62 adds CORS headers for game assets (WASM, WebGL, images, audio) and expands CSP
`frame-ancestors` to cover all FuzzyNuts subdomains. The changes are **generally well-scoped**
— static asset routes get permissive CORS while API routes stay origin-restricted. Two MEDIUM
findings and three LOW findings identified. No CRITICAL or HIGH issues.

**Verdict: APPROVE with recommended fixes (non-blocking).**

---

## Findings

### M1 — Global `crossOriginResourcePolicy: cross-origin` on all API responses

**Severity:** MEDIUM
**File:** `apps/api/src/server.ts` (line ~68)
**Category:** Overly broad security header

The PR adds `helmet.crossOriginResourcePolicy({ policy: "cross-origin" })` as global
middleware. This sets `Cross-Origin-Resource-Policy: cross-origin` on **every** response
from the API server, including:

- `/api/session` (auth tokens, session data)
- `/api/auth` (OAuth flows)
- `/api/monitoring` (admin-only endpoint)
- `/api/kanban` (admin + agent endpoint)
- `/api/chat/admin` (admin chat management)

While the CORS `origin` callback already blocks cross-origin reads from untrusted origins,
CORP is a **defense-in-depth** layer. Setting it to `cross-origin` globally weakens that
layer for sensitive endpoints.

**Impact:** Low practical risk because the CORS origin check is the primary gate. However,
if a CORS misconfiguration is introduced later, CORP would normally catch it — and now it
won't.

**Recommendation:** Apply CORP selectively to game asset routes only:

```typescript
app.use(
  "/games",
  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
);
```

Or use helmet's `crossOriginResourcePolicy: { policy: "same-site" }` as the global default
and override to `cross-origin` only on `/games`.

---

### M2 — `/api/(.*)` catch-all CORS in vercel.json covers admin/internal endpoints

**Severity:** MEDIUM
**File:** `apps/web-arcade/vercel.json` (new `/api/(.*)` header rule)
**Category:** Authorization boundary

The new catch-all rule:

```json
{
  "source": "/api/(.*)",
  "headers": [
    { "key": "Access-Control-Allow-Origin", "value": "https://www.fuzzynuts.xyz" },
    { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
    { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, X-Requested-With" },
    { "key": "Access-Control-Allow-Credentials", "value": "true" },
    { "key": "Access-Control-Max-Age", "value": "86400" }
  ]
}
```

This matches `/api/(.*)` which Vercel evaluates as a regex — it will match any API path
including future endpoints. The origin is correctly scoped to `https://www.fuzzynuts.xyz`
(not wildcard), so this is **not** an open-CORS vulnerability. However:

1. **Future endpoints inherit CORS automatically.** Any new `/api/*` route (admin, internal,
   webhook receivers) will get CORS headers without explicit review.

2. **`/api/chat/admin` and `/api/monitoring`** are admin-only endpoints that now accept
   cross-origin credentialed requests from `www.fuzzynuts.xyz`. This is fine today (the
   frontend IS the admin interface), but if admin routes move to a separate origin, the
   catch-all would need updating.

**Recommendation:** Consider an explicit allowlist instead of catch-all, or add a comment
in vercel.json noting that this pattern must be reviewed when new admin/internal API routes
are added.

---

### L1 — SSE endpoint origin changed from bare domain to www

**Severity:** LOW
**File:** `apps/web-arcade/vercel.json` (`/api/scores/stream`)
**Category:** Breaking change for existing clients

The SSE stream endpoint's `Access-Control-Allow-Origin` changed:

- **Before:** `https://fuzzynuts.xyz`
- **After:** `https://www.fuzzynuts.xyz`

If any existing client connects to the SSE stream from `https://fuzzynuts.xyz` (without
`www`), the browser will now block the connection. The `Vary: Origin` header was correctly
added, which is good.

**Impact:** Only affects clients using the bare domain. If the site canonicalizes to `www`,
this is fine. If both domains serve the stream, this is a regression.

**Recommendation:** Verify that all SSE clients use `www.fuzzynuts.xyz`, or allow both
origins for this endpoint.

---

### L2 — Wildcard CORS on `/games` interacts with global CORS middleware ordering

**Severity:** LOW
**File:** `apps/api/src/server.ts` (lines ~75-83 vs ~90-99)
**Category:** Middleware ordering

Express evaluates middleware in registration order. The current order is:

1. Global CORS (origin-check callback, credentials: true)
2. `/games` CORS (origin: `*`, no credentials)

For requests to `/games/*`:
- **Same-origin requests:** Hit global CORS first (origin passes check, headers set), then
  hit `/games` CORS (wildcard adds another set of CORS headers). Result: duplicate CORS
  headers. Browsers handle this, but it's untidy.
- **Cross-origin requests from non-ALLOWED_ORIGINS:** The global CORS callback calls
  `cb(new Error(...))`, which makes cors() skip setting headers. Then `/games` CORS runs
  and sets `Access-Control-Allow-Origin: *`. This works correctly for game assets.

The logic is **functionally correct** — cross-origin game asset loads will work. But the
global CORS error for non-whitelisted origins is silently swallowed before the `/games`
wildcard takes over. If someone adds error handling middleware that catches CORS errors
globally, it would break game asset loading.

**Recommendation:** Move the `/games` CORS middleware **before** the global CORS middleware,
or document the ordering dependency.

---

### L3 — `Access-Control-Allow-Methods` includes write verbs on API catch-all

**Severity:** LOW
**File:** `apps/web-arcade/vercel.json` and `apps/api/src/server.ts`
**Category:** Defense in depth

Both the vercel.json catch-all and the Express CORS config expose
`GET, POST, PUT, DELETE, PATCH, OPTIONS` on all API routes. This is standard for a REST API
but worth noting: any endpoint that should be read-only (e.g., `/api/scores` leaderboard
reads) still advertises `PUT`, `DELETE`, `PATCH` in its preflight response.

**Impact:** None if the server properly validates HTTP methods per route (which Express does
by default — unmatched methods return 404). The CORS header is advisory; browsers enforce
it, but the server is the real gatekeeper.

**Recommendation:** No action needed unless fine-grained CORS per route is desired in the
future.

---

## Positive observations

1. **Game asset CORS is properly scoped.** The `/games` wildcard CORS is limited to
   `GET, HEAD, OPTIONS` only — no write methods. This is correct for static asset serving.

2. **API CORS is origin-restricted.** The vercel.json catch-all uses a specific origin
   (`https://www.fuzzynuts.xyz`), not wildcard. Credentials are properly paired with a
   specific origin (browsers reject `credentials: true` with `origin: *`).

3. **CSP frame-ancestors expansion is reasonable.** Adding `fuzzynuts.xyz` (bare),
   `game.fuzzynuts.xyz` alongside existing `www.fuzzynuts.xyz` covers all legitimate
   embedding scenarios without opening to arbitrary origins.

4. **Preflight caching is set to 24h** (`maxAge: 86400`), reducing OPTIONS request overhead.

5. **Exposed headers are minimal.** Only `Content-Length`, `Content-Range`, and
   `X-Request-Id` are exposed — no sensitive server metadata.

6. **Vercel static asset CORS targets specific file extensions** (WASM, images, fonts,
   audio), not blanket path matching.

---

## Changes from main

| Area | Before (main) | After (PR #62) |
|------|---------------|-----------------|
| CSP frame-ancestors | `self`, `www.fuzzynuts.xyz`, `localhost:3000` | + `fuzzynuts.xyz`, `game.fuzzynuts.xyz` |
| CORP header | Not set | `cross-origin` (global) |
| API CORS (Express) | Origin-check callback, credentials | + methods, allowedHeaders, exposedHeaders, maxAge |
| `/games` CORS | Not present | `origin: *`, GET/HEAD/OPTIONS only |
| Vercel CORS | SSE stream only | + game assets, videos, icons, catch-all `/api/(.*)` |
| Vercel SSE origin | `https://fuzzynuts.xyz` | `https://www.fuzzynuts.xyz` |

---

## Verdict

**APPROVE** — No blocking issues. The CORS scoping is correct: static assets get wildcards,
API routes get specific origins. The two MEDIUM findings are defense-in-depth improvements,
not vulnerabilities. Recommend addressing M1 (global CORP) as a follow-up cleanup.
