# Security Audit Report — GameModal scroll lock refactor (commit fab2022)

**Date:** 2026-06-15
**Commit:** fab2022 ("fix: replace position:fixed body scroll lock (Qwen diagnosis)")
**Scope:** `apps/web-arcade/src/components/game/GameModal.tsx` — scroll lock useEffect refactor
**Auditor:** Hermes Agent (security-auditor)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 0 |
| MEDIUM   | 0 |
| LOW      | 1 |
| INFO     | 3 |

**Verdict: PASS** — The commit is net-positive for security. It replaces a fragile
`position:fixed` + negative `top` scroll lock (which blocked iframe touch on iOS Safari)
with the standard `overflow:hidden` + `overscroll-behavior:none` pattern. All 6 concerns
from the task description were analyzed — none rise to actionable security findings.
One LOW advisory on stale scroll position, three INFO notes.

---

## Commit analysis

### What changed

The scroll lock useEffect was refactored from:
- **Old:** `position:fixed` + `width:100%` + `top:-${scrollY}px` on `document.body` only
- **New:** `overflow:hidden` + `overscroll-behavior:none` on both `document.body` AND `document.documentElement`, plus `touchAction:manipulation` on body

Both approaches save/restore previous style values in the cleanup function.

### Lines changed (diff summary)

```
- 5 style properties saved/restored on document.body (overflow, touchAction, position, width, top)
+ 5 style properties saved/restored across body + html (bodyOverflow, bodyTouch, bodyOverscroll, htmlOverflow, htmlOverscroll)
```

The `position:fixed`/`width`/`top` hacks are gone. `touchAction:manipulation` persists
from the old code.

---

## Findings

### L1 — Stale scrollY if navigation occurs while modal is open

**Severity:** LOW
**Location:** `GameModal.tsx:177,194` (lines in current file)

**Description:**
`window.scrollY` is captured once when the effect runs (modal open) and used in the
cleanup function (`window.scrollTo(0, scrollY)`). If the user navigates to a different
page while the modal is open (e.g., via browser back button, or a link inside the game
iframe that escapes the sandbox), the captured `scrollY` may not match the new page's
scroll position.

**Impact:** Minimal. This is a UX glitch, not a security issue. The worst case is the
page scrolls to an unexpected position after modal close. In practice, the `<dialog>`
element's native modal behavior (inert background, focus trap) makes accidental
navigation while the modal is open unlikely. Client-side navigation in Next.js would
unmount the component, triggering cleanup with the current scrollY before the route
changes.

**Recommendation:** No change needed. If desired for robustness, wrap the `scrollTo` in
a try/catch or guard against stale values, but this is cosmetic.

---

### INFO-1 — touchAction:manipulation IS cleaned up (task concern #2 is a false alarm)

**Severity:** INFO

The task description states "touchAction:manipulation is set on body but NOT cleaned up
in the useEffect return." **This is incorrect.** The cleanup function at line 190 does:
```js
document.body.style.touchAction = prevBodyTouch;
```
where `prevBodyTouch` was captured from `document.body.style.touchAction` before the
modal opened (line 179). The style is properly saved and restored. No leaked style.

---

### INFO-2 — XSS exploitation of style manipulation is not feasible (task concern #1)

**Severity:** INFO

The task asks whether "rapid modal open/close" could let an XSS attacker inject
malicious styles. Analysis:

1. **No user input flows into style values.** All style changes are hardcoded constants
   (`"hidden"`, `"none"`, `"manipulation"`). There is no interpolation, no dynamic values
   from props/state/URL/cookies.

2. **The useEffect runs in React's controlled lifecycle.** Even if an attacker could
   trigger rapid open/close via `gameId` prop changes, each effect invocation saves the
   *current* style before overwriting, and the cleanup restores the *saved* value. React
   18's strict mode double-invocation is handled correctly (save → set → cleanup → save →
   set → cleanup).

3. **This code is only reachable if the attacker already has XSS.** If they do, they can
   already manipulate any DOM style directly — this useEffect is irrelevant. The style
   manipulation here does not create a new attack surface.

---

### INFO-3 — CSP implications are nil in current posture (task concern #5)

**Severity:** INFO

The existing CSP posture (per `docs/iframe-security-audit.md`) sets only `frame-ancestors`
— there is no `style-src` directive. The inline style manipulation via `element.style.X`
is permitted under the current (absent) CSP.

When a broader CSP is added post-launch (as recommended in the iframe audit), `style-src`
will need `'unsafe-inline'` — but this is already required by React, Framer Motion, and
Tailwind's runtime style injection. This commit adds no new CSP surface.

The `overscroll-behavior` and `touchAction` CSS properties are standard and have no CSP
bypass implications.

---

## Task concerns not addressed above

### Concern #3 — overscroll-behavior:none masking phishing indicators

`overscroll-behavior:none` disables the browser's pull-to-refresh and overscroll bounce.
This is a standard pattern for modal overlays and does not create a phishing vector because:
- The modal already occludes the entire page (fullscreen `<dialog>` with `::backdrop`)
- The browser's address bar and HTTPS indicator remain visible
- This is the same pattern used by YouTube, Twitch, and other major sites for their
  fullscreen/modal views

No finding.

### Concern #6 — useEffect cleanup on conditional unmount

React guarantees that the cleanup function of a `useEffect` runs when:
1. The component unmounts
2. The effect dependencies change (cleanup from previous run, then new effect)

The scroll lock effect depends on `[isOpen]`. When `isOpen` becomes `false` (modal
closes), the cleanup runs and restores all saved styles. When the component unmounts
(e.g., parent removes it from the tree), the cleanup also runs.

The only scenario where cleanup would NOT run is if the browser tab is force-closed or
the page crashes — but in that case all state is lost anyway, so leaked styles on
`document.body` are irrelevant.

No finding.

---

## Diff quality assessment

The refactor is well-executed:
- **Correct:** Saves and restores all 5 style properties (body overflow, body touchAction,
  body overscrollBehavior, html overflow, html overscrollBehavior)
- **Consistent:** Both body and html are treated symmetrically
- **Defensive:** Captures previous values before overwriting (idempotent on repeated opens)
- **Well-commented:** Explains WHY position:fixed was replaced (iOS Safari iframe touch)

The `position:fixed` + `top:-Npx` pattern was fragile (required matching `width:100%`,
caused iOS iframe issues, and was harder to reason about). The new `overflow:hidden` +
`overscroll-behavior:none` is the industry standard for scroll locking.
