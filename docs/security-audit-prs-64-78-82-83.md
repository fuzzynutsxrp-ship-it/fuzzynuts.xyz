# Security Audit — PRs #64, #78, #82, #83: OAuth2, Guest Sessions, CORS/COEP, Leaderboard

**PRs:** #64 (COOP/COEP), #78 (Guest Sessions), #82 (CORS), #83 (Leaderboard)
**Commits:** `698039d`, `273329b`, `fef624b`, `367f690`
**Scope:** 9 files across API and web-arcade
**Auditor:** Hermes Agent (security-auditor)
**Date:** 2026-06-14

---

## PR #64 — COOP/COEP for Minigolf SharedArrayBuffer

**Commit:** `698039d` — fix: add COOP/COEP headers for minigolf SharedArrayBuffer
**Files:** 1 file (+27 lines)
| File | Role |
|------|------|
| `apps/web-arcade/next.config.ts` | Next.js config — adds COOP/COEP headers scoped to `/games/minigolf/*` |

### Assessment: PASS (no findings)

The implementation is correctly scoped and uses the right header values:

- `Cross-Origin-Opener-Policy: same-origin` — required for `SharedArrayBuffer` access
- `Cross-Origin-Embedder-Policy: credentialless` — chosen over `require-corp`, which allows cross-origin subresources (Google Fonts, CDN assets) without explicit CORP/CORS headers. Correct tradeoff for a game that loads third-party assets.
- Narrowly scoped to `/games/minigolf/:path*` — other routes unaffected
- The `gameRegistry.ts` confirms minigolf has `crossOriginIsolated: true` and `allow-cross-origin-isolated` sandbox permission — consistent

---

## PR #78 — Guest Session JWT Middleware

**Commit:** `273329b` — Merge pull request #78 from feat/guest-sessions
**Files:** 3 files (+195 lines)
| File | Lines | Role |
|------|-------|------|
| `apps/api/src/middleware/guest-session.ts` | 106 | Middleware — mints/verifies guest JWT cookies |
| `apps/api/src/middleware/guest-session.test.ts` | 85 | Tests — 3 test cases |
| `apps/api/src/server.ts` | +4 | Wiring — mounts middleware globally |

### Findings

#### MEDIUM — 1. Silent failure when GAME_SESSION_SECRET is empty

**File:** `server.ts` line 34, `guest-session.ts` line 42

`GAME_SESSION_SECRET` is loaded via `optionalEnv()` which returns `""` when unset. This empty string is passed to `guestSessionMiddleware`:

```ts
const GAME_SESSION_SECRET = optionalEnv("GAME_SESSION_SECRET"); // → ""
app.use(guestSessionMiddleware({ GAME_SESSION_SECRET }));        // → new TextEncoder().encode("")
```

With an empty secret, `jose` will still sign/verify JWTs using an empty key. Every guest JWT becomes trivially forgeable — an attacker can mint their own guest cookies with arbitrary `deviceId` values.

**Impact:** Medium. Guest sessions are anonymous (no PII, no auth-gated actions), but forged deviceIds could be used for leaderboard manipulation (multiple fake identities) or chat spam if guest chat is enabled.

**Recommendation:** Throw at startup or disable guest middleware when `GAME_SESSION_SECRET` is empty:
```ts
export function guestSessionMiddleware(env: { GAME_SESSION_SECRET: string }) {
  if (!env.GAME_SESSION_SECRET) {
    console.warn("[guest-session] GAME_SESSION_SECRET missing — guest sessions disabled");
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  // ... existing code
}
```

---

#### LOW — 2. Global middleware adds latency to every request

**File:** `server.ts` line 107

The guest session middleware runs on every request (including `/healthz`, static assets, SSE streams). Each invocation:
1. Parses the full `Cookie` header string
2. Runs `jwtVerify()` (crypto operation) on every request with a cookie
3. On cookie miss: generates UUID + signs JWT + sets cookie

For a high-traffic arcade, this adds measurable overhead to health checks and static routes.

**Recommendation:** Add a path exclusion for health checks and static routes:
```ts
app.use((req, res, next) => {
  if (req.path === '/healthz' || req.path.startsWith('/static')) return next();
  return guestSessionMiddleware({ GAME_SESSION_SECRET })(req, res, next);
});
```

---

#### LOW — 3. Custom cookie parser doesn't handle edge cases

**File:** `guest-session.ts` lines 96-105

The `parseCookies()` function splits on `;` and `=`. Edge cases:
- Cookie values containing `=` (JWT tokens contain `=` padding) — handled correctly (uses `indexOf` for first `=` only)
- Cookie values containing `%` — handled via `decodeURIComponent`
- Cookies with no value (`; ;`) — skipped correctly

This is actually well-implemented for its purpose. Noting for completeness; no action needed.

---

#### INFO — 4. `SameSite=Strict` may break cross-site navigation flows

**File:** `guest-session.ts` line 57

The cookie uses `sameSite: "strict"`. If a user navigates to fuzzynuts.xyz from an external link, the browser won't send the cookie on that first request. This means:
- First visit from external link: new guest session minted (overwriting any existing one)
- Subsequent navigations within the site: cookie sent normally

**Impact:** Minimal. Guest sessions are disposable and this is actually more secure than `lax`. But it means external link → fuzzynuts always gets a fresh guest session, which could affect analytics accuracy.

---

## PR #82 — CORS Headers + Game Asset CORS Middleware

**Commit:** `fef624b` — fix(cors): add preflight support, expose headers, game asset CORS middleware
**Files:** 2 files (+193/-21)
| File | Lines | Role |
|------|-------|------|
| `apps/api/src/server.ts` | +27 | CORS middleware for API + game assets, CORP header, CSP update |
| `apps/web-arcade/vercel.json` | +187/-21 | Vercel CORS headers, reformatted JSON |

### Findings

#### MEDIUM — 1. Global `crossOriginResourcePolicy: cross-origin` on all API routes

**File:** `server.ts` lines 63-65

```ts
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
```

This sets `Cross-Origin-Resource-Policy: cross-origin` on every response from the API server, including:
- `/api/scores` (public — fine)
- `/api/session` (auth endpoints — should NOT be cross-origin embeddable)
- `/api/kanban` (admin endpoints — should NOT be cross-origin embeddable)
- `/api/monitoring` (admin health data — should NOT be cross-origin embeddable)

**Risk:** An attacker-controlled page could use `<img>` or `<script>` tags to embed responses from admin endpoints. While CORS still blocks reading the response body, CORP `cross-origin` explicitly permits the browser to make the request and deliver the response to the embedder. Combined with timing attacks, this could leak information about admin endpoint existence and response sizes.

**Recommendation:** Scope CORP to game asset routes only:
```ts
app.use("/games", helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
```

---

#### MEDIUM — 2. Wide-open CORS on `/games` allows credential forwarding

**File:** `server.ts` lines 94-102

```ts
app.use("/games", cors({
  origin: "*",
  methods: ["GET", "HEAD", "OPTIONS"],
  allowedHeaders: ["Range", "Content-Type"],
  exposedHeaders: ["Content-Length", "Content-Range"],
}));
```

The comment says "public files" but the `/games` path prefix is broad. If any authenticated or state-modifying route is ever added under `/games/*`, it would inherit this wide-open CORS. Currently safe since only static assets are served, but fragile.

**Recommendation:** Add a comment noting this must not be extended with dynamic routes, or use a more specific path like `/games/*/assets`.

---

#### LOW — 3. Vercel SSE CORS restricts to `www.fuzzynuts.xyz` only

**File:** `vercel.json` lines 131-132

```json
{ "key": "Access-Control-Allow-Origin", "value": "https://www.fuzzynuts.xyz" }
```

The SSE stream endpoint only allows `https://www.fuzzynuts.xyz`. If any page on `https://fuzzynuts.xyz` (without www) tries to connect to the SSE stream, it will be CORS-blocked. The API server's `ALLOWED_ORIGINS` includes both `fuzzynuts.xyz` and `www.fuzzynuts.xyz`, but the Vercel-level header only allows www.

**Recommendation:** Verify that `fuzzynuts.xyz` always redirects to `www.fuzzynuts.xyz`. If not, add both origins or use a Vercel dynamic origin.

---

#### LOW — 4. Vercel `/api/(.*)` CORS header static, not dynamic

**File:** `vercel.json` lines 158-180

Vercel headers are static — they always return `Access-Control-Allow-Origin: https://www.fuzzynuts.xyz` regardless of the request's `Origin` header. This means:
- No `Vary: Origin` header (except on SSE endpoint)
- If the site ever needs to serve multiple origins, this breaks

Currently acceptable since only one origin is allowed, but worth noting for future multi-domain support.

---

#### INFO — 5. CSP `frameAncestors` updated to include bare domain

**File:** `server.ts` lines 50-56

Added `https://fuzzynuts.xyz` (without www) to `frameAncestors`. Good — prevents CSP violation if the bare domain is used to embed the API in an iframe. Consistent with `ALLOWED_ORIGINS`.

---

## PR #83 — Leaderboard Aggregated Table

**Commit:** `367f690` — feat(leaderboard): player-aggregated table with gameRegistry filter
**Note:** Squash re-merge of PR #77 (identical tree). Diff reviewed from `367703f`.
**Files:** 5 files (+362/-287)
| File | Lines | Role |
|------|-------|------|
| `apps/web-arcade/src/app/leaderboard/client.tsx` | 432 | Leaderboard UI — aggregation, filters, podium |
| `apps/web-arcade/e2e/leaderboard.spec.ts` | 122 | E2E tests — updated for new UI structure |
| `apps/web-arcade/src/app/prizes/client.tsx` | 61 | Prizes page — light theme update |
| `apps/web-arcade/src/app/prizes/layout.tsx` | 27 | Prizes layout — replaced SubPageLayout |
| `apps/web-arcade/src/app/prizes/page.tsx` | 7 | Prizes page — simplified |

### Findings

#### MEDIUM — 1. Anonymous player key collision via `Math.random()`

**File:** `client.tsx` lines 64-67

```ts
const key =
  entry.wallet?.toLowerCase() ||
  entry.userId ||
  entry.displayName ||
  entry.name ||
  `anon-${Math.random()}`;
```

When a score entry has no wallet, no userId, no displayName, and no name, it gets `anon-${Math.random()}` as its key. `Math.random()` produces a float in [0, 1), so `anon-0.123456789` is the key. Two issues:

1. **Collision risk:** `Math.random()` can produce duplicate values (especially on older V8 engines). Two anonymous players could merge into one aggregated row.
2. **Non-deterministic:** Every re-render produces different keys for anonymous entries, causing the leaderboard to reshuffle on each render.

**Impact:** Low-medium. Anonymous players without any identifier are edge cases, but the non-deterministic key causes UI instability.

**Recommendation:** Use a stable hash of available fields, or index-based fallback:
```ts
const key = entry.wallet?.toLowerCase() || entry.userId || entry.name || `anon-${index}`;
```

---

#### LOW — 2. `currentUserKey` may expose email in leaderboard comparison

**File:** `client.tsx` lines 300-302

```ts
const currentUserKey = walletAddress || session?.user?.email || null;
```

For Google OAuth users (no wallet), the `currentUserKey` is the user's email. This email is then compared against `row.userId` to highlight the current user's row:

```ts
const isCurrentUser = currentUserKey && (
  row.wallet?.toLowerCase() === currentUserKey.toLowerCase() ||
  row.userId === currentUserKey
);
```

If the backend stores the user's email in the `userId` field of score entries, and if that field is ever exposed in the leaderboard data, the email would be visible to all users. However, examining the `aggregateByPlayer` function, `userId` is used only as a map key and is NOT rendered in the UI — only `displayName` is shown.

**Impact:** Low. The email is used for matching but not displayed. However, the `userId` field is present in the aggregated `PlayerRow` object client-side, meaning it's accessible via browser DevTools.

**Recommendation:** Strip `userId` from the `PlayerRow` object after aggregation, or hash it before comparison.

---

#### LOW — 3. E2E test: `expect(headerVisible || true).toBe(true)` is a no-op assertion

**File:** `e2e/leaderboard.spec.ts` line 146

```ts
expect(headerVisible || true).toBe(true);
```

This assertion always passes regardless of `headerVisible`. It was likely intended as a soft check (header may be hidden on mobile viewport), but it provides zero test coverage.

**Recommendation:** Either remove the assertion or make it meaningful:
```ts
// If mobile viewport, skip; otherwise assert visible
if (page.viewportSize().width >= 640) {
  await expect(header.first()).toBeVisible();
}
```

---

#### INFO — 4. Prizes page layout change — SubPageLayout removed

**File:** `prizes/layout.tsx`

The prizes page switched from `SubPageLayout` (dark theme with video background, falling particles) to a light theme with `SiteHeader variant="light"`. This is a UI change, not a security concern. The dynamic import of `Footer` with `ssr: false` is consistent with the pattern used in other layouts.

---

## Summary

| PR | CRITICAL | HIGH | MEDIUM | LOW | INFO |
|----|----------|------|--------|-----|------|
| #64 (COOP/COEP) | 0 | 0 | 0 | 0 | 0 |
| #78 (Guest Sessions) | 0 | 0 | 1 | 2 | 1 |
| #82 (CORS) | 0 | 0 | 2 | 2 | 1 |
| #83 (Leaderboard) | 0 | 0 | 1 | 2 | 1 |
| **Total** | **0** | **0** | **4** | **6** | **3** |

### Prioritized Recommendations

1. **[MEDIUM, PR #78]** Guard against empty `GAME_SESSION_SECRET` — either throw or disable guest middleware
2. **[MEDIUM, PR #82]** Scope `crossOriginResourcePolicy` to `/games` only, not globally
3. **[MEDIUM, PR #82]** Document that `/games` CORS must not be extended with dynamic/auth routes
4. **[MEDIUM, PR #83]** Replace `Math.random()` anonymous key with deterministic fallback
5. **[LOW, PR #83]** Strip `userId` from client-side `PlayerRow` after aggregation
6. **[LOW, PR #78]** Exclude health/static paths from guest middleware
7. **[LOW, PR #82]** Verify `fuzzynuts.xyz` → `www.fuzzynuts.xyz` redirect for SSE CORS
