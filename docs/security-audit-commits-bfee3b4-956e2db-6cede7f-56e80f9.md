# Security Audit Report — start-btn + MutationObserver + dismissOverlay + validators

**Date:** 2026-06-15
**Commits:** bfee3b4, 956e2db, 6cede7f, 56e80f9
**Scope:** `apps/web-arcade/public/js/arcade-shell.js`, `apps/web-arcade/src/lib/validators.ts`, `apps/web-arcade/src/lib/__tests__/validators.test.ts`
**Auditor:** Hermes Agent (security-auditor)

---

## Summary

| Severity | Count |
| -------- | ----- |
| CRITICAL | 0     |
| HIGH     | 0     |
| MEDIUM   | 1     |
| LOW      | 3     |
| INFO     | 3     |

**Verdict: PASS with advisory** — No CRITICAL or HIGH findings. One MEDIUM functional bug
(commit bfee3b4's MutationObserver is dead code due to early return). Three LOW advisories
(test description inaccuracies, event listener accumulation, missing null-guard tests).
Three INFO notes on code quality improvements that are net-positive.

---

## Commit 1: bfee3b4 — MutationObserver fallback for dynamic start screens

### What changed

Added a `MutationObserver` block at the end of `setupStartScreen()` that watches
`document.body` for child node insertion. If `#start-screen` appears dynamically
(e.g., Phaser/Construct engines), the observer disconnects and re-calls
`setupStartScreen()`. A 10-second safety timeout disconnects the observer if the
element never appears.

### Findings

#### M1 — MutationObserver is unreachable dead code (early return on line 275)

**Severity:** MEDIUM
**Location:** `arcade-shell.js:323-334`

**Description:**
The MutationObserver block at line 323 is guarded by `if (!overlay)`, which is the
exact condition that triggers the early return at line 275:

```
Line 275: if (!overlay) return;    // <-- exits function when overlay is null
...
Line 323: if (!overlay) {           // <-- DEAD CODE: overlay is always truthy here
    var observer = new MutationObserver(...)
```

When `#start-screen` does not exist at call time (`overlay` is null), line 275
returns immediately. The observer code at line 323 is never reached. When
`#start-screen` DOES exist (`overlay` is truthy), the `if (!overlay)` guard at
line 323 is false, so the observer is never created.

**This means commit bfee3b4 has zero functional effect.** The MutationObserver
fallback it was supposed to provide does not work. Games that inject `#start-screen`
after DOMContentLoaded will still miss the `setupStartScreen()` call.

**Impact:** Functional — not a direct security vulnerability, but the intended
fallback for late-loading game start screens is absent. If a game's start screen
never appears, the user cannot start the game (UX issue, not exploitable).

**Recommendation:** Move the MutationObserver block BEFORE the `if (!overlay) return`
guard, or restructure so the observer is created when `overlay` is null:

```js
function setupStartScreen() {
  if (document.body.dataset.customStart === "true") return;
  var overlay = document.getElementById("start-screen");
  // ... other element lookups ...

  // MutationObserver fallback — must be BEFORE the early return
  if (!overlay) {
    var observer = new MutationObserver(function (mutations) {
      var el = document.getElementById("start-screen");
      if (el) {
        observer.disconnect();
        setupStartScreen();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      observer.disconnect();
    }, 10000);
    return; // bail now, observer will re-call setupStartScreen() when element appears
  }

  // ... rest of setupStartScreen (dismissOverlay, startGame, etc.) ...
}
```

#### INFO-1 — No XSS via innerHTML or attribute injection

**Severity:** INFO

The observer callback only calls `document.getElementById('start-screen')` to check
for existence, then `observer.disconnect()` and `setupStartScreen()`. No innerHTML,
no attribute reading/setting, no user input flows into DOM manipulation. The observer
is safe from XSS vectors.

#### INFO-2 — Observer memory leak prevention is correctly implemented

**Severity:** INFO

The observer is disconnected in both paths: on element discovery (line 327) and via
the 10-second safety timeout (line 333). The `setTimeout` + `disconnect()` pattern is
correct. If this code were reachable, it would not leak.

---

## Commit 2: 956e2db — Improved universal start-btn handler

### What changed

- Added `data-custom-start="true"` body attribute check to opt out of auto-start
- AudioContext unlock for iOS Safari autoplay policy
- Canvas focus restoration after overlay dismiss (keyboard controls)
- Switched from `click` to `pointerdown` for better mobile responsiveness
- `DOMContentLoaded` guard for late initialization
- Early return if no overlay found

### Findings

#### L1 — Restart button listener accumulates across setupStartScreen calls

**Severity:** LOW
**Location:** `arcade-shell.js:306-311`

**Description:**
The restart button uses `addEventListener('pointerdown', ...)` without `{ once: true }`.
Unlike the start button (which uses `{ once: true }`), the restart button listener
persists. If `setupStartScreen()` were called multiple times (e.g., via the
MutationObserver fallback if it were working, or via manual re-initialization),
duplicate listeners would accumulate.

**Impact:** Minimal. `dismissOverlay()` and `resetScoreTracking()` are both idempotent
(hiding an already-hidden overlay is a no-op, resetting score tracking just sets two
variables). Multiple fires produce the same result. However, the accumulation wastes
memory and indicates inconsistent listener lifecycle management.

**Recommendation:** Either use `{ once: true }` on the restart button listener (if
restart should only fire once per game session), or track and remove the previous
listener before adding a new one.

#### INFO-3 — data-custom-start bypass is not client-exploitable

**Severity:** INFO

The `document.body.dataset.customStart === 'true'` check reads a server-controlled
HTML attribute. An attacker cannot set this via XSS (if they had XSS, they could
already do anything). The attribute is set in static HTML templates served by the
web server. No finding.

---

## Commit 3: 6cede7f — Extract dismissOverlay helper, add resetScoreTracking to restart

### What changed

- Extracted repeated overlay-dismiss code into a shared `dismissOverlay()` helper
- Added `resetScoreTracking()` to the restart button handler
- Removed dead `AudioCtx` constructor check (was checking `window.AudioContext` but
  `window.audioContext` is the actual instance managed elsewhere)
- Removed redundant `canvas.removeEventListener('pointerdown', onFirstTouch)` since
  `{ once: true }` already handles auto-removal

### Findings

No security findings. This commit is a pure code quality improvement.

**Positive security impact:** Adding `resetScoreTracking()` to the restart button
closes a gap where restarting a game without going through the start button path
would preserve stale score tracking state from the previous session. This prevents
potential score inflation if the start and restart paths diverged.

---

## Commit 4: 56e80f9 — Hoist regex to module const, add validators.test.ts

### What changed

- Hoisted `WALLET_RE` and `GUEST_RE` regex patterns from inline to module-level `const`
- Created `validators.test.ts` with 16 tests covering both validators

### Findings

#### L2 — Test descriptions are inaccurate for boundary values

**Severity:** LOW
**Location:** `validators.test.ts:9-17`

**Description:**
Three test descriptions don't match the actual string lengths being tested:

| Test description                           | Actual string length | Regex range             | Verdict                                           |
| ------------------------------------------ | -------------------- | ----------------------- | ------------------------------------------------- |
| "accepts valid 34-char address"            | 34 chars             | `{24,34}` → 25-35 total | ✓ Correct (but describes body, not total)         |
| "accepts valid 25-char address (shortest)" | 24 chars             | `{24,34}` → 25-35 total | ✓ Passes (24 is in range) but description says 25 |
| "accepts valid 35-char address (longest)"  | 35 chars             | `{24,34}` → 25-35 total | ✓ Correct                                         |

The "25-char (shortest)" test string `rHb9CJAWyB4rj91VRWn96Dkux` is actually 24
characters (r + 23 base58 chars), not 25. The test passes because `{24,34}` accepts
24 body chars, but the description misleads reviewers into thinking the minimum is 25.

**Impact:** No security impact. Tests pass and the regex is correct. The inaccurate
descriptions could mislead future auditors or developers about the actual accepted
address length range.

**Recommendation:** Fix test descriptions to match actual string lengths, or clarify
whether descriptions refer to total length or body length (after 'r' prefix).

#### L3 — Missing null/undefined guard tests for isGuestId

**Severity:** LOW
**Location:** `validators.test.ts:41-75`

**Description:**
`isWalletAddress` has explicit tests for `null` and `undefined` inputs (lines 37-39),
but `isGuestId` does not. While the regex `.test()` method coerces non-strings to
strings (e.g., `null` → `"null"`, which fails the regex), the test coverage is
asymmetric.

**Impact:** Minimal. The regex naturally rejects non-string inputs. This is a test
coverage gap, not a runtime vulnerability.

**Recommendation:** Add null/undefined tests for `isGuestId` for consistency:

```ts
it("rejects non-string inputs gracefully", () => {
  expect(isGuestId(null as unknown as string)).toBe(false);
  expect(isGuestId(undefined as unknown as string)).toBe(false);
});
```

#### INFO-4 — Regex patterns are ReDoS-safe

**Severity:** INFO

Both regexes use anchored patterns with no nested quantifiers, alternation, or
backtracking risk:

- `WALLET_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/` — single character class with
  bounded repetition, anchored both sides
- `GUEST_RE = /^Guest-[0-9a-fA-F]{4,8}$/` — literal prefix + bounded character class

Neither pattern is susceptible to ReDoS. Hoisting to module constants also avoids
re-compilation on each function call (minor performance improvement, no security
impact).

---

## Cross-cutting concerns

### XSS via innerHTML — NOT FOUND

None of the 4 commits use innerHTML, outerHTML, insertAdjacentHTML, or eval. All DOM
manipulation uses safe APIs: `classList.add`, `style.display`, `setAttribute`, `focus`.

### Event listener leaks — MINOR

The start button uses `{ once: true }` (auto-cleanup), the restart button does not.
The canvas fallback uses `{ once: true }`. The MutationObserver (if reachable) properly
disconnects. Overall listener hygiene is good with one minor gap (L1 above).

### State leakage between games — NOT FOUND

`resetScoreTracking()` properly resets `lastSubmittedScore` and `gameStartTime` on both
start and restart paths. The `dismissOverlay()` helper is stateless. No shared mutable
state leaks between game sessions.

### Prototype pollution — NOT FOUND

No dynamic property access from user input. `document.body.dataset.customStart` reads
a server-controlled data attribute.

---

## Summary of recommendations

1. **[MEDIUM]** Fix MutationObserver dead code — move the observer block before the
   `if (!overlay) return` guard (commit bfee3b4)
2. **[LOW]** Fix test description inaccuracies in validators.test.ts (commit 56e80f9)
3. **[LOW]** Add null/undefined tests for `isGuestId` (commit 56e80f9)
4. **[LOW]** Consider `{ once: true }` or listener cleanup on restart button (commit 956e2db)
