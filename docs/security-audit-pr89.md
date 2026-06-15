# Security Audit Report — PR #89 (fix/ci-errors)

**Date:** 2026-06-15
**PR:** #89 — fix/ci-errors (merged)
**Branch:** fix/ci-errors → main
**Scope:** 103 additions, 27 deletions, 12 files
**Auditor:** Hermes Agent (security-auditor)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 0 |
| MEDIUM   | 1 |
| LOW      | 2 |
| INFO     | 2 |

**Verdict: PASS** — No blocking issues. The PR is primarily CI fixes, layout
consistency, and a loading UX improvement. The MONEY CODE change is a safe
type-only fix. One MEDIUM finding relates to missing origin validation on a
new postMessage listener.

---

## Findings

### MEDIUM-1: FUZZY_GAME_READY listener lacks origin validation

**File:** `apps/web-arcade/src/components/game/GameModal.tsx` (lines 256-261)

**Description:**
The new `FUZZY_GAME_READY` postMessage listener does NOT check
`isAllowedMessageOrigin(event.origin)`, unlike the existing
`FUZZY_SCORE_SUBMITTED` handler (line 119) which properly validates origin.

```typescript
// NEW — NO origin check
const handleMessage = (event: MessageEvent) => {
  if (event.data?.type === "FUZZY_GAME_READY") {
    clearInterval(interval);
    setLoadProgress(100);
    setTimeout(() => setIsLoading(false), 300);
  }
};
```

Compare with the existing score handler:

```typescript
// EXISTING — HAS origin check
if (!isAllowedMessageOrigin(event.origin)) return;
```

**Risk:** Any page/tab in the user's browser could send a
`FUZZY_GAME_READY` message to prematurely dismiss the loading screen.
While this only affects UX (no financial or auth impact), it violates
the defense-in-depth pattern already established in this file and could
be chained with other UI manipulation attacks.

**Recommendation:** Add the same origin check:

```typescript
const handleMessage = (event: MessageEvent) => {
  if (!isAllowedMessageOrigin(event.origin)) return;
  if (event.data?.type === "FUZZY_GAME_READY") {
    // ...
  }
};
```

---

### LOW-1: Sandbox policy change — removed `allow-forms`

**File:** `apps/web-arcade/src/components/game/GameModal.tsx` (line 340)

**Change:**
```
- "allow-scripts allow-same-origin allow-popups allow-forms"
+ "allow-scripts allow-same-origin allow-popups-to-escape-sandbox"
```

**Analysis:**
- **Removed `allow-forms`** — GOOD. Games no longer can submit forms from
  the iframe, reducing phishing and CSRF-style attack surface.
- **Changed `allow-popups` → `allow-popups-to-escape-sandbox`** — This is
  actually LESS permissive. `allow-popups` allows popups that inherit no
  sandbox restrictions. `allow-popups-to-escape-sandbox` only allows popups
  when the game explicitly opts in; by default, popups remain sandboxed.

**Risk:** LOW positive. This is a security improvement. However, note that
`allow-popups-to-escape-sandbox` still permits popups to escape if the
iframe explicitly sets `sandbox=""` on a `window.open()` call. Monitor
game behavior for unexpected popup redirects.

---

### LOW-2: `wallet.seed!` non-null assertions in tests

**File:** `packages/xrpl-token-utils/tests/verify-challenge.test.ts`

**Change:** 4 instances of `wallet.seed` → `wallet.seed!`

**Risk:** Negligible. These are test files only. The `!` non-null assertion
is safe here because `Wallet.generate()` always produces a seed. However,
if the xrpl.js API ever changes to make `seed` optional, these tests would
silently pass with `undefined` instead of failing loudly.

---

### INFO-1: payout.ts — type-only change (MONEY CODE)

**File:** `packages/xrpl-token-utils/src/payout.ts`

**Change:**
```typescript
// Import line: added TxResponse, SubmittableTransaction types
- import type { Payment, SubmitResponse } from "xrpl";
+ import type { Payment, SubmitResponse, TxResponse, SubmittableTransaction } from "xrpl";

// Return type of submitPayout():
- ): Promise<SubmitResponse> {
+ ): Promise<TxResponse<SubmittableTransaction>> {
```

**Analysis:** This is a **pure type signature change** to fix TypeScript
compatibility with newer xrpl.js versions. Zero behavioral change:
- `buildPayment()` is untouched — same Payment object construction
- `submitPayout()` logic is untouched — same signing, same submission
- Amount calculation, issuer, distributor, destination — all unchanged
- The multisig guard, production single-sig guard, seed validation — all intact

**Risk:** NONE. The return type is more precise (`TxResponse<SubmittableTransaction>`)
but the actual runtime object returned by `client.submitAndWait()` is identical.

---

### INFO-2: Layout/Footer refactoring — no data exposure

**Files:**
- `apps/web-arcade/src/components/DynamicFooter.tsx` (new)
- `apps/web-arcade/src/app/tokenomics/layout.tsx` (new)
- `apps/web-arcade/src/app/prizes/layout.tsx` (modified)
- `apps/web-arcade/src/app/profile/layout.tsx` (modified)

**Analysis:** These changes extract the `dynamic(() => import('Footer'), { ssr: false })`
pattern into a shared `DynamicFooter` component, and add a consistent layout to the
`/tokenomics` route. No new API calls, no data fetching, no sensitive data exposure.
The `tokenomics/layout.tsx` is a standard Next.js layout with `SiteHeader` + `DynamicFooter`.

---

## Other Changes (no security impact)

| File | Change | Assessment |
|------|--------|------------|
| `leaderboard/client.tsx` | Added `<Footer />` import + render | Cosmetic — adds footer to leaderboard |
| `Prizes.tsx` | `<a>` → `<Link>` for /profile/ | Client-side nav improvement |
| `PrizesPageContent.tsx` | `<a>` → `<Link>` for /profile/ | Same as above |
| `tsconfig.json` | Added `lib: ["ES2022", "DOM", "DOM.Iterable"]` | Build config for newer xrpl.js types |

---

## Recommendation

Merge approved with one follow-up: add `isAllowedMessageOrigin` check to the
`FUZZY_GAME_READY` handler in GameModal.tsx (MEDIUM-1). This can be a
fast-follow PR — it's not a launch blocker but should be addressed before
the game catalog grows.
