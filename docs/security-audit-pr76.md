# Security Audit: PR #76 — Redis adapter for Socket.io

**PR:** #76 (feat/chat-redis)
**Branch:** feat/chat-redis → main
**Audit date:** 2026-06-14
**Auditor:** security-auditor
**Diff:** 345 additions across 14 files (excluding pnpm-lock.yaml)

---

## Summary

0 CRITICAL, 0 HIGH, 3 MEDIUM, 3 LOW, 1 INFO

PR adds Redis pub/sub adapter for multi-instance Socket.io, postMessage origin validation for game iframes, and raised score caps. Overall security posture is **solid** — the postMessage origin hardening is well-executed and closes real attack surface. The Redis integration is clean but lacks URL validation and graceful shutdown. No client-controlled channel subscription is possible (server-controlled only).

---

## Files Reviewed

| File                                                              | Lines | Verdict                        |
| ----------------------------------------------------------------- | ----- | ------------------------------ |
| `apps/api/src/lib/redis-adapter.ts`                               | +72   | 2 MEDIUM, 1 LOW                |
| `apps/api/src/routes/chat.ts`                                     | +8    | Clean — wiring only            |
| `apps/api/src/routes/scores.ts`                                   | ±4    | Clean — cap adjustments        |
| `apps/api/src/server.ts`                                          | +2    | Clean — env passthrough        |
| `.env.example`                                                    | +2    | Clean — commented-out template |
| `apps/games-build/shared/arcade-shell.ts`                         | +10   | 1 LOW (default `"*"`)          |
| `apps/games-build/shared/fuzzy-score.js`                          | +5    | Clean                          |
| `apps/games-build/templates/game-starter/index.html`              | +4    | Clean                          |
| `apps/web-arcade/src/components/game/GameModal.tsx`               | +3    | Clean                          |
| `apps/web-arcade/src/features/arcade/constants/index.ts`          | +29   | Clean — well-structured        |
| `apps/web-arcade/src/features/arcade/hooks/useScoreSubmission.ts` | +5    | Clean                          |
| `apps/api/tests/scores-caps.test.ts`                              | ±12   | Clean — caps synced            |

---

## Findings

### M1 — No REDIS_URL validation (MEDIUM)

**File:** `apps/api/src/lib/redis-adapter.ts` line 56
**OWASP:** API8 — Security Misconfiguration

`attachRedisAdapter(io, redisUrl)` passes `redisUrl` directly to `new Redis(redisUrl)` with no validation. While `ioredis` rejects non-`redis://`/`rediss://` schemes at the transport layer, the function accepts any string. A malformed URL could cause confusing error messages or unexpected parsing behavior.

**Risk:** LOW exploitation. The URL comes from server-side env vars (not user input), so injection is not possible through normal HTTP paths. However, defense-in-depth suggests validating the URL format before use.

**Recommendation:**

```typescript
export async function attachRedisAdapter(io: Server, redisUrl: string): Promise<boolean> {
  if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
    console.warn("[redis] Invalid REDIS_URL — must start with redis:// or rediss://");
    return false;
  }
  // ... rest of function
}
```

---

### M2 — No graceful shutdown for Redis clients (MEDIUM)

**File:** `apps/api/src/lib/redis-adapter.ts`
**OWASP:** API8 — Security Misconfiguration

`pubClient` and `subClient` are created but never closed. The server has no `SIGTERM`/`SIGINT` handler, and `redis-adapter.ts` doesn't expose the clients for external cleanup. On Railway redeploy or process termination:

- Redis connections may hang in `CLOSE_WAIT` state
- Subscribed channels remain active on Redis until TCP timeout
- Railway's health check may fail during graceful shutdown window

**Risk:** LOW — Railway kills processes after timeout anyway, but leaked connections can accumulate under frequent deploys.

**Recommendation:**

1. Return the clients from `attachRedisAdapter()` so the caller can close them:
   ```typescript
   export async function attachRedisAdapter(
     io: Server,
     redisUrl: string,
   ): Promise<{ connected: boolean; cleanup: () => Promise<void> }> {
     // ...
     return {
       connected: true,
       cleanup: async () => {
         await pubClient.quit();
         await subClient.quit();
       },
     };
   }
   ```
2. Add `SIGTERM` handler in `server.ts`:
   ```typescript
   process.on("SIGTERM", async () => {
     await redisCleanup?.();
     server.close();
   });
   ```

---

### M3 — REDIS_URL exposed in error logs (MEDIUM)

**File:** `apps/api/src/lib/redis-adapter.ts` line 99-100

When Redis connection fails, the catch block logs `err.message`. If `ioredis` includes the connection URL in its error message (which it does for auth failures: `"WRONGPASS invalid username-password pair"` or connection refused errors that may include the host), this could leak Redis credentials to Railway log drains.

The current code is:

```typescript
console.warn(
  "[redis] Failed to connect — falling back to in-memory adapter:",
  err instanceof Error ? err.message : err,
);
```

**Risk:** LOW — Railway logs are access-controlled, but log drain integrations (Datadog, etc.) may be less restricted.

**Recommendation:** Sanitize the error message or log only the error type:

```typescript
console.warn(
  "[redis] Failed to connect — falling back to in-memory adapter:",
  err instanceof Error ? err.name : "unknown error",
);
```

---

### L1 — Race condition: async Redis import vs. server startup (LOW)

**File:** `apps/api/src/routes/chat.ts` lines 296-301

The Redis adapter is imported asynchronously:

```typescript
if (opts.REDIS_URL) {
  import("../lib/redis-adapter.js")
    .then(({ attachRedisAdapter }) => attachRedisAdapter(io, opts.REDIS_URL!))
    .catch((err) => console.error("[chat] Redis adapter import failed:", err));
}
```

The Socket.io server starts accepting connections immediately. If a client connects and sends a message before the Redis adapter attaches, that message uses the in-memory adapter. Once Redis attaches, subsequent messages use pub/sub — creating a split-brain window where messages may be lost across instances.

**Risk:** LOW — this is a brief startup race. Single-instance deploys don't use Redis at all. Multi-instance deploys on Railway typically start one instance at a time.

**Recommendation:** Accept the tradeoff (documented in code comment) or await the adapter before accepting connections:

```typescript
if (opts.REDIS_URL) {
  await import("../lib/redis-adapter.js")
    .then(({ attachRedisAdapter }) => attachRedisAdapter(io, opts.REDIS_URL!))
    .catch((err) => console.error("[chat] Redis adapter import failed:", err));
}
```

Note: this would require making `initChat` async, which may have downstream implications.

---

### L2 — `_parentOrigin` defaults to `"*"` in arcade-shell.ts (LOW)

**File:** `apps/games-build/shared/arcade-shell.ts` line 63

```typescript
let _parentOrigin: string = "*";
```

If the game never receives a `FUZZY_CONFIG` message (e.g., loaded directly without iframe), `_parentOrigin` remains `"*"` and `emitScoreEvent` sends to all origins. This is intentional for backwards compatibility with legacy game loads, but means games loaded outside the FuzzyNuts iframe can leak score events to any listening parent.

**Risk:** LOW — score events are not sensitive data (they're submitted via authenticated API anyway), and direct game loads are uncommon in production.

**Recommendation:** Acceptable as-is for backwards compat. Consider documenting the default in a code comment.

---

### L3 — Hardcoded allowed origins in game templates (LOW)

**Files:**

- `apps/games-build/shared/arcade-shell.ts` line 50-51
- `apps/games-build/shared/fuzzy-score.js` line 45-46
- `apps/games-build/templates/game-starter/index.html` line 212-213

All three files hardcode `["https://fuzzynuts.xyz", "https://www.fuzzynuts.xyz"]` as allowed origins. The `constants/index.ts` set additionally includes `world.fuzzynuts.xyz` and `game.fuzzynuts.xyz`. If new subdomains are added, the game templates need manual updates.

**Risk:** LOW — the hardcoded list covers the primary domains. The `isAllowedMessageOrigin()` function in `constants/index.ts` is the authoritative check on the parent side.

**Recommendation:** Consider extracting the allowed origins to a shared build-time constant or injecting via `FUZZY_CONFIG`.

---

### I1 — Score cap increases are configuration changes (INFO)

**File:** `apps/api/src/routes/scores.ts`

Four game caps were raised:

- `mario`: 99,999 → 9,999,990
- `fuzzy-survivors`: 999,999 → 5,000,000
- `minigolf`: 10,500 → 100,000
- `nut-racer`: 99,999 → 2,000,000

The test file (`scores-caps.test.ts`) was updated to match. These are pure configuration changes with no security impact. The existing Zod schema validates `z.number().int().positive().max(99_999_999)` which still covers all new caps.

---

## Positive Security Improvements

1. **postMessage origin validation** — Comprehensive and well-structured. The `isAllowedMessageOrigin()` function rejects null/empty origins, checks a hardcoded allowlist, and supports same-origin games. Applied consistently across `GameModal.tsx`, `useScoreSubmission.ts`, `arcade-shell.ts`, `fuzzy-score.js`, and `game-starter/index.html`.

2. **Graceful Redis fallback** — The adapter catches connection failures and falls back to in-memory, preventing Redis outages from taking down the chat. Good defensive pattern.

3. **Redis retry strategy** — 3 retries with exponential backoff before giving up. Prevents indefinite connection loops.

4. **Socket.io auth middleware** — Wallet address required on connect (`io.use()`). Clients without a valid wallet mapping are rejected. This is pre-existing but applies to Redis-backed connections too.

5. **Server-controlled channels only** — The `@socket.io/redis-adapter` uses Socket.io's built-in channel naming (room-based). Clients cannot subscribe to arbitrary Redis channels — they can only join Socket.io rooms that the server permits.

---

## OWASP API Security Top 10 Coverage

| Risk                               | Status | Notes                                                                     |
| ---------------------------------- | ------ | ------------------------------------------------------------------------- |
| API1: BOLA                         | N/A    | No new object endpoints                                                   |
| API2: Broken Auth                  | PASS   | Redis connection is server-side only; Socket.io auth unchanged            |
| API3: BOPLA                        | N/A    | No new user-facing properties                                             |
| API4: Resource Consumption         | PASS   | Rate limiting unchanged (5 msg/10s); Redis doesn't add new attack surface |
| API5: Function Level Auth          | N/A    | No new admin endpoints                                                    |
| API6: Unrestricted Sensitive Flows | PASS   | Chat rate limiting unchanged                                              |
| API7: SSRF                         | PASS   | REDIS_URL is env-var only, not user-controlled                            |
| API8: Misconfiguration             | MEDIUM | REDIS_URL not validated, no graceful shutdown (M1, M2, M3)                |
| API9: Improper Inventory           | N/A    | No new undocumented endpoints                                             |
| API10: Unsafe Consumption          | N/A    | No new third-party API consumption                                        |

---

## Verdict

**APPROVE with recommendations.** No blocking issues. The 3 MEDIUM findings are defense-in-depth improvements for the Redis integration — none are exploitable in the current deployment model (server-side env vars, Railway single-process). The postMessage origin validation is a significant security improvement that closes real XSS/CSRF attack surface on the game iframe communication channel.

Recommended follow-ups (non-blocking):

1. Add REDIS_URL scheme validation (M1)
2. Expose Redis clients for graceful shutdown (M2)
3. Sanitize Redis error messages in logs (M3)
