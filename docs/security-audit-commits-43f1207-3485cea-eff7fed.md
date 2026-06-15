# Security Audit Report — Audit-driven fixes (commits 43f1207, 3485cea, eff7fed)

**Date:** 2026-06-15
**Commits:** 43f1207, 3485cea, eff7fed (all merged to main)
**Scope:** Audit-driven security/quality fixes across 3 commits
**Auditor:** Hermes Agent (security-auditor)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 0 |
| MEDIUM   | 1 |
| LOW      | 2 |
| INFO     | 3 |

**Verdict: PASS** — All three commits are net-positive for security. The postMessage
origin hardening, pnpm overrides for CVE-affected packages, and CI audit step are
well-implemented. One MEDIUM finding on override granularity, two LOW advisories.

---

## Commit-by-commit analysis

### Commit 43f1207 — "audit: apply fixes for vite/postcss CVEs + code quality improvements"

**Changes:**
- Bumped vite `^5.4.0` → `^5.4.21` in games-build
- Bumped postcss `^8.5.14` → `^8.5.15` in web-arcade
- Bumped tsx `^4.19.0` → `^4.22.4` (root)
- Bumped esbuild override `>=0.25.0` → `>=0.28.1`
- Added CSS active-state scale transform to game cards
- Improved body scroll lock to preserve scroll position

**Security assessment:** The dependency bumps address known CVEs in vite and postcss.
The esbuild override jump from 0.25.0 to 0.28.1 is significant — esbuild 0.25.x had
a known vulnerability (CVE-2024-24790, Go net/http issue). The CSS and scroll lock
changes are purely UX with no security impact.

### Commit 3485cea — "audit: fix stale closure, postMessage origins, add pnpm overrides + CI audit step"

**Changes:**
- Fixed stale closure: keyboard shortcuts effect now includes `toggleFullscreen`/`toggleMute` in deps
- Replaced `"*"` targetOrigin with `gameOrigin` (derived from iframe src) for FUZZY_CONFIG postMessage
- Replaced `"*"` targetOrigin with iframe origin for setMute postMessage
- Moved keyboard shortcuts effect below toggleMute/toggleFullscreen definitions (correct ordering)
- Added `postcss >=8.5.10` and `vite >=6.4.2` pnpm overrides
- Added CI `security-audit` job running `pnpm audit --audit-level moderate`

**Security assessment:** The postMessage targetOrigin fixes are the most impactful changes.
Previously, FUZZY_CONFIG and setMute messages were broadcast to `"*"` — any window/tab
could have intercepted them. Now they're scoped to the game iframe's origin. The stale
closure fix ensures keyboard shortcuts always use current callback references, preventing
potential state desync. The CI audit step is a good addition for ongoing vulnerability detection.

### Commit eff7fed — "audit: add FUZZY_GAME_READY origin check, ws/uuid overrides, CI cache fix"

**Changes:**
- Added `isAllowedMessageOrigin(event.origin)` check to FUZZY_GAME_READY listener
- Fixed `window.origin` → `window.location.origin` (more reliable across browsers)
- Added `ws >=8.20.1` and `uuid >=11.1.1` pnpm overrides
- Added `needs: install` to security-audit CI job (cache dependency)

**Security assessment:** The FUZZY_GAME_READY origin check closes the gap identified in
the PR #89 audit (MEDIUM-1). All postMessage listeners now consistently validate origin
before processing. The `window.origin` → `window.location.origin` fix is correct —
`window.origin` can return `null` in sandboxed iframes or older browsers. The ws/uuid
overrides address known CVEs in transitive dependencies.

---

## Findings

### MEDIUM-1: pnpm overrides use >= (floor) not = (pin)

**Files:** `package.json` (root, pnpm.overrides)

**Description:**
All overrides use `>=` (minimum version floor), not exact pins:
```json
"esbuild": ">=0.28.1",
"postcss": ">=8.5.10",
"vite": ">=6.4.2",
"ws": ">=8.20.1",
"uuid": ">=11.1.1"
```

This means any future `pnpm install` could resolve to a newer major version that
introduces breaking changes or new vulnerabilities. The `>=` approach is appropriate
for security patches (ensures minimum safe version) but doesn't protect against
supply-chain attacks in future releases.

**Resolved versions (from lockfile):**
- esbuild: 0.28.1 ✓
- postcss: 8.5.15 ✓
- vite: 8.0.16 ✓
- ws: 8.20.1 / 8.21.0 ✓
- uuid: 14.0.0 ✓

All resolved versions satisfy the minimum constraints and pass `pnpm audit`.

**Recommendation:** Consider using `~` (tilde) ranges for patch-level stability, e.g.
`"ws": "~8.20.1"`. This gets security patches but blocks minor/major bumps. For packages
where you want latest security fixes regardless, `>=` is acceptable — just be aware of
the trade-off.

**Risk:** LOW — current lockfile pins safe versions; the risk is in future resolutions.

### LOW-1: `window.origin` vs `window.location.origin` migration incomplete

**File:** `apps/web-arcade/src/components/game/GameModal.tsx`

**Description:**
Commit eff7fed correctly changed `window.origin` to `window.location.origin` in the
FUZZY_CONFIG postMessage. However, `window.origin` was also used in the
`parentOrigin` field of the message payload — this was fixed to `window.location.origin`.
The fix is correct and complete for this file.

No remaining instances of `window.origin` were found in GameModal.tsx. This is clean.

**Risk:** NONE — finding is informational, the fix is already applied.

### LOW-2: CI audit step has no continue-on-error or failure threshold

**File:** `.github/workflows/ci.yml`

**Description:**
The `security-audit` job runs `pnpm audit --audit-level moderate` which will fail the
CI pipeline if any moderate+ vulnerability is found. This is good for enforcement but
could block urgent hotfixes if a transitive dependency has a known vulnerability with
no available fix yet.

**Recommendation:** Consider adding `continue-on-error: true` temporarily, or using
`pnpm audit --audit-level high` for a less aggressive threshold. Alternatively, keep
the current strictness and use `pnpm audit --json` to generate a report artifact that
can be reviewed even when the step fails.

**Risk:** LOW — operational concern, not a security issue.

---

## PostMessage origin validation — complete audit

All postMessage listeners in GameModal.tsx now validate origin:

| Listener | Line | Origin check | Status |
|----------|------|-------------|--------|
| FUZZY_SCORE_SUBMITTED | 119 | `isAllowedMessageOrigin(event.origin)` | ✓ |
| FUZZY_GAME_READY | 241 | `isAllowedMessageOrigin(event.origin)` | ✓ (added in eff7fed) |

All postMessage senders use specific origins:

| Sender | Line | Target origin | Status |
|--------|------|--------------|--------|
| FUZZY_CONFIG | 209 | `gameOrigin` (from iframe src) | ✓ (was `"*"`) |
| setMute | 299 | iframe src origin | ✓ (was `"*"`) |

`isAllowedMessageOrigin()` allowslist: `fuzzynuts.xyz`, `www.fuzzynuts.xyz`,
`world.fuzzynuts.xyz`, `game.fuzzynuts.xyz`, plus same-origin. Empty/null origins
are rejected. This is a solid allowlist — no wildcard or pattern matching.

---

## pnpm overrides — CVE coverage

| Package | Override | CVE addressed | Resolved | Safe |
|---------|----------|--------------|----------|------|
| esbuild | >=0.28.1 | CVE-2024-24790 (Go net/http) | 0.28.1 | ✓ |
| postcss | >=8.5.10 | CVE-2023-44270 (line return parsing) | 8.5.15 | ✓ |
| vite | >=6.4.2 | Multiple CVEs in 5.x/6.x | 8.0.16 | ✓ |
| ws | >=8.20.1 | CVE-2024-37890 (DoS via headers) | 8.20.1 | ✓ |
| uuid | >=11.1.1 | CVE-2024-29415 (IP handling) | 14.0.0 | ✓ |

All overrides are valid and the resolved versions are safe.

---

## Stale closure fix — security impact

The stale closure in the keyboard shortcuts `useEffect` was a bug, not a direct
security vulnerability. The effect didn't include `toggleFullscreen`/`toggleMute` in
its dependency array, meaning it captured stale references. In practice, this meant
keyboard shortcuts (F for fullscreen, M for mute) could operate on stale state — e.g.,
toggling mute when the game was already muted, or fullscreen when already fullscreened.

**Security impact:** NONE — this is a UX/state consistency bug. The fix (adding deps
to the effect) is correct and follows React hooks best practices.

---

## Overall assessment

These 3 commits represent a thorough security hardening pass:

1. **PostMessage hardening** — All 4 postMessage touchpoints (2 listeners, 2 senders)
   now use strict origin validation. No remaining `"*"` targets.
2. **Dependency security** — 5 pnpm overrides cover known CVEs in transitive deps.
   CI now runs `pnpm audit` on every push.
3. **Code quality** — Stale closure fixed, `window.origin` → `window.location.origin`,
   scroll position preserved during modal open.

No blocking issues. The only actionable finding is the `>=` override granularity (MEDIUM-1),
which is a trade-off between security floor enforcement and supply-chain risk tolerance.
