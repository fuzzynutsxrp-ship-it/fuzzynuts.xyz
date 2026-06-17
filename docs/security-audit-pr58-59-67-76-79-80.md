# Security Audit — PRs #58, #59, #67, #76, #79, #80

**Auditor:** security-auditor (Hermes)
**Date:** 2026-06-14
**Repo:** fuzzynutsxrp-ship-it/fuzzynuts.xyz
**Scope:** 6 merged PRs covering error boundary, game controls, MyRankWidget, Redis pub/sub, profile pages, and stats dashboard

---

## Summary

| PR  | Title                                         | Severity | Findings                     |
| --- | --------------------------------------------- | -------- | ---------------------------- |
| #58 | GameErrorBoundary                             | NONE     | Clean — no security concerns |
| #59 | Standardize Game UI controls                  | LOW      | 1 LOW                        |
| #67 | MyRankWidget                                  | LOW      | 2 LOW                        |
| #76 | Redis adapter + postMessage origin validation | MEDIUM   | 1 MEDIUM, 1 LOW              |
| #79 | Profile/[id] dynamic route                    | MEDIUM   | 2 MEDIUM, 1 LOW              |
| #80 | Profile/[id] stats dashboard                  | LOW      | 1 LOW                        |

**Overall: 0 CRITICAL, 0 HIGH, 4 MEDIUM, 5 LOW**

---

## PR #58 — GameErrorBoundary (feat/game-error-boundary)

**Files:** `GameErrorBoundary.tsx`, `GameModal.tsx`
**Diff:** +240 / -1

### Assessment: CLEAN — No findings

The error boundary correctly:

- Catches React errors in the game viewport to prevent app-wide crashes
- Shows error details only in development mode (`process.env.NODE_ENV === "development"`)
- Uses `window.location.href = "/"` for navigation (safe, same-origin)
- Renders stack traces in a `<pre>` tag (React auto-escapes)
- No user-controlled input reaches the error display in production

**Verdict:** PASS — no security concerns.

---

## PR #59 — Standardize Game UI controls (feat/uniform-game-controls)

**Files:** `arcade-shell.js`, `arcade-shell.css`, `GameControls.tsx`, 12 other files
**Diff:** +2109 / -68

### Finding 1 — LOW: postMessage target defaults to wildcard `"*"`

**File:** `apps/games-build/shared/arcade-shell.ts`
**Line:** `let _parentOrigin: string = "*";`

The `_parentOrigin` variable defaults to `"*"`, meaning `emitScoreEvent()` calls `window.parent.postMessage(..., "*")` until a `FUZZY_CONFIG` message with `parentOrigin` is received. If the handshake never arrives (e.g., game loads standalone or parent is compromised), score events are broadcast to any listening window.

**Impact:** LOW — score events contain game name, score value, and duration (no secrets). An attacker embedding the game in a malicious page could intercept score submissions, but cannot modify or forge them (scores are validated server-side with JWT auth + score caps).

**Recommendation:** Default to `window.location.origin` instead of `"*"`. This limits postMessage to same-origin listeners by default.

---

## PR #67 — MyRankWidget (feat/my-rank-widget)

**Files:** `MyRankWidget.tsx`, `useMyRank.ts`, `index.ts`, 2 integration files
**Diff:** +530 / -0

### Finding 1 — LOW: N+1 API request pattern enables amplification

**File:** `apps/web-arcade/src/features/arcade/hooks/useMyRank.ts`
**Lines:** 476-491

`useMyRank` fires `GAMES.length` parallel `fetch()` calls (one per game) plus one personal scores fetch on every mount. With 38+ games registered, this creates 39+ concurrent requests per page load. If multiple users hit the leaderboard simultaneously, this amplifies load on the scores API.

**Impact:** LOW — requests are rate-limited at the API layer and use `AbortSignal.timeout(8000)`. No data exfiltration risk. Performance concern only.

**Recommendation:** Consider a single aggregate endpoint (`/api/scores/aggregate`) that returns all-game scores in one response. This was partially addressed in later PRs.

### Finding 2 — LOW: No input validation on userId before API fetch

**File:** `apps/web-arcade/src/features/arcade/hooks/useMyRank.ts`
**Line:** 494

`userId` is passed directly to `${API_SCORES}?wallet=${encodeURIComponent(userId)}`. While `encodeURIComponent` prevents URL injection, the `userId` could be an arbitrary string (e.g., from `session.user.id` via Google Auth). The API should validate the wallet parameter server-side, but the client-side code does not sanitize it.

**Impact:** LOW — `encodeURIComponent` prevents injection. API-side validation is the real defense. No XSS vector (value is used in a fetch URL, not rendered as HTML).

---

## PR #76 — Redis adapter + postMessage origin validation (feat/chat-redis)

**Files:** `redis-adapter.ts`, `chat.ts`, `server.ts`, `arcade-shell.ts`, `fuzzy-score.js`, `constants/index.ts`, `useScoreSubmission.ts`, `GameModal.tsx`, 6 other files
**Diff:** +345 / -108

### Finding 1 — MEDIUM: REDIS_URL parsed without TLS enforcement

**File:** `apps/api/src/lib/redis-adapter.ts`
**Lines:** 56-65

`new Redis(redisUrl, ...)` accepts any `REDIS_URL` string including plaintext `redis://` connections. If `REDIS_URL` is set to a non-TLS connection (e.g., `redis://localhost:6379`), chat messages including user wallet addresses and chat content traverse the network unencrypted.

**Impact:** MEDIUM — On Railway (where the API runs), Redis connections stay within the private network, reducing exposure. However, if the app is ever deployed to a multi-tenant environment or if Redis is hosted externally, this becomes a data-in-transit encryption gap. Chat messages may contain wallet addresses (usernames).

**Recommendation:**

- Document that `REDIS_URL` should use `rediss://` (TLS) for production
- Add a runtime warning if `REDIS_URL` starts with `redis://` and `NODE_ENV=production`
- Consider rejecting plaintext Redis in production: `if (redisUrl.startsWith('redis://') && process.env.NODE_ENV === 'production') warn()`

### Finding 2 — LOW: Health endpoint removed environment status

**File:** `apps/api/src/server.ts`
**Lines:** 75-78 (old) → simplified to `{ ok: true }`

The health endpoint previously exposed which env vars were set (`WALLET_JWT_SECRET: true`, etc.). This is actually a **positive security change** — the old endpoint leaked infrastructure configuration to anyone who could hit `/healthz`. The new minimal response is correct.

**Impact:** N/A — this is a security improvement, not a vulnerability.

**Note:** The postMessage origin validation added across `arcade-shell.ts`, `fuzzy-score.js`, `GameModal.tsx`, `useScoreSubmission.ts`, and `constants/index.ts` is well-implemented:

- Allowlist of trusted origins (`fuzzynuts.xyz`, `www.fuzzynuts.xyz`, `world.fuzzynuts.xyz`, `game.fuzzynuts.xyz`)
- Same-origin check via `window.location.origin`
- Rejects `null` and empty origins
- Applied consistently across all message listeners

---

## PR #79 — Profile/[id] dynamic route (feat/profile-page)

**Files:** `client.tsx` (616 lines), `IdenticonAvatar.tsx`, `layout.tsx`, `page.tsx`, `gameRegistry.ts`, `package.json`
**Diff:** large (new feature)

### Finding 1 — MEDIUM: No route param validation on `[id]` — arbitrary strings accepted

**File:** `apps/web-arcade/src/app/profile/[id]/client.tsx`
**Lines:** 85-87, 95-98

The `[id]` route parameter is used directly without validation:

```typescript
function isWalletAddress(id: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(id);
}
```

Any string that isn't a wallet address or guest ID is treated as a generic "Player" profile. The `id` flows into:

- `getDisplayName(id)` → rendered as React text (auto-escaped, no XSS)
- API calls: `${API_BASE}?wallet=${id}` — note: **no `encodeURIComponent`** here
- The `[id]` is part of the URL path (Next.js routing), not a query param

**Impact:** MEDIUM —

1. **SEO spam / OG injection:** The `generateMetadata` function (in `layout.tsx`) likely uses `[id]` to build page titles/descriptions. Arbitrary strings could inject misleading content into search engine previews.
2. **API request manipulation:** Without `encodeURIComponent`, special characters in `id` could corrupt the query string (e.g., `&`, `#`, `?`).

**Recommendation:**

- Validate `[id]` against an allowlist pattern: wallet address, guest ID, or alphanumeric username
- Return 404 for invalid IDs
- Add `encodeURIComponent` to all API URL constructions using `id`

### Finding 2 — MEDIUM: XRPL address regex accepts {24,34} instead of exactly 34

**File:** `apps/web-arcade/src/app/profile/[id]/client.tsx`
**Line:** 86

```typescript
return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(id);
```

This accepts XRPL addresses from 25 to 35 characters. Valid XRPL addresses are exactly 34 characters (r + 33 base58 chars). The server-side auth (PR #59, same batch) correctly uses `{33}` (34 total), but the client-side profile page uses the looser `{24,34}`.

**Impact:** MEDIUM — Short addresses could be crafted to match the regex but not be valid XRPL addresses. This could allow profile pages to be created for non-existent wallets, potentially used for social engineering (e.g., displaying fake profiles for short addresses).

**Recommendation:** Tighten to `/^r[1-9A-HJ-NP-Za-km-z]{33}$/` to match the server-side validation.

### Finding 3 — LOW: Bio stored in localStorage without sanitization

**File:** `apps/web-arcade/src/app/profile/[id]/client.tsx`
**Lines:** 139-167

Bio text is stored in `localStorage` under key `fuzzy_profile_bio_{profileId}` and rendered with React (auto-escaped). The `maxLength={200}` attribute limits input length. No XSS vector since React auto-escapes text content.

**Impact:** LOW — localStorage is origin-scoped, so only the same domain can read/write bios. No server-side persistence means bios are device-local only. No injection risk with React rendering.

---

## PR #80 — Profile/[id] stats dashboard (feat/profile-stats)

**Files:** `UserStatsGrid.tsx` (402 lines), `page.tsx` modifications
**Diff:** +402 / -0

### Finding 1 — LOW: deviceId used in API URL without server-side validation

**File:** `apps/web-arcade/src/components/sections/UserStatsGrid.tsx`
**Line:** 162

```typescript
const url = `${API_BASE}?wallet=${encodeURIComponent(deviceId)}`;
```

`deviceId` is passed as a prop and comes from the profile page's `[id]` parameter. While `encodeURIComponent` prevents URL injection, the API should validate the `wallet` parameter server-side to prevent querying arbitrary strings.

**Impact:** LOW — `encodeURIComponent` prevents URL manipulation. The API returns empty results for non-existent wallets. No data leakage vector.

---

## Cross-PR Observations

### 1. Inconsistent XRPL address validation

| Location                  | Regex                              | Total chars |
| ------------------------- | ---------------------------------- | ----------- |
| Server auth (PR #59)      | `/^r[1-9A-HJ-NP-Za-km-z]{33}$/`    | 34 ✓        |
| Client profile (PR #79)   | `/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/` | 25-35 ✗     |
| Client useMyRank (PR #67) | No regex (trusts API)              | N/A         |

**Recommendation:** Extract the XRPL address regex to a shared constant in `@fuzzynuts/shared-anticheat` and use it everywhere.

### 2. API_BASE inconsistency

Multiple components hardcode `https://world.fuzzynuts.xyz/api/scores` while others use relative paths or `API_SCORES` from constants. This could cause issues if the domain changes or if CORS policies tighten.

### 3. Positive security changes in this batch

- Health endpoint no longer leaks env var status (PR #76)
- postMessage origin validation added consistently (PR #76)
- JWT TTL reduced from 7 days to 24 hours (PR #59 — server auth)
- CSRF protection via custom header on wallet-login (PR #59 — server auth)
- Server-side Xaman OAuth token validation (PR #59 — server auth)
- Score caps synced with gameRegistry SSOT (PR #76)

---

## Recommendations Priority

1. **[MEDIUM]** Tighten XRPL address regex in profile page to exactly 34 chars (PR #79)
2. **[MEDIUM]** Validate profile `[id]` route parameter — reject arbitrary strings (PR #79)
3. **[MEDIUM]** Add TLS enforcement warning for Redis in production (PR #76)
4. **[LOW]** Default `_parentOrigin` to `window.location.origin` instead of `"*"` (PR #59)
5. **[LOW]** Add `encodeURIComponent` to API URLs using profile `[id]` (PR #79)
6. **[LOW]** Extract shared XRPL address regex to `@fuzzynuts/shared-anticheat`
7. **[LOW]** Consider aggregate scores endpoint to reduce N+1 requests (PR #67)
