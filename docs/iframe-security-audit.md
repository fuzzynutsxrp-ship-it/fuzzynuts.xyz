# Iframe Sandbox & CSP Security Audit

**Date:** 2026-06-13
**Auditor:** security-auditor (Hermes Agent)
**Scope:** GameModal iframe embedding, middleware CSP headers, postMessage handling
**Branch:** chore/iframe-security
**Severity scale:** CRITICAL > HIGH > MEDIUM > LOW > INFO

---

## Executive Summary

The iframe embedding architecture is **functionally sound for same-origin games** — frame-ancestors correctly restrict who can embed the site, and the `<dialog>` + portal pattern is well-implemented. However, the sandbox attributes provide **no real isolation** because all games are same-origin with `allow-scripts allow-same-origin`, and postMessage handlers lack origin validation. These are defense-in-depth gaps, not active exploits, since all game content is first-party static assets.

**Verdict: APPROVED with 2 MEDIUM + 2 LOW + 2 INFO findings. No blocking issues.**

---

## Findings

### M1 — Sandbox `allow-scripts + allow-same-origin` provides no isolation on same-origin iframes

**Severity:** MEDIUM
**Location:** `src/components/game/GameModal.tsx:290-291`, `src/lib/gameRegistry.ts:52-53`
**Files:** GameModal.tsx, gameRegistry.ts

**Description:**
The default sandbox is:
```
allow-scripts allow-same-origin allow-popups allow-forms
```
All game iframes load from same-origin paths (`/games/{slug}/`). Per the HTML spec, `allow-scripts` + `allow-same-origin` on a same-origin iframe allows the framed content to:
- Access the parent DOM via `window.parent.document`
- Read/write `localStorage` (including wallet store)
- Programmatically remove its own sandbox attribute (`frameElement.removeAttribute('sandbox')`)
- Access all cookies and session state

This effectively means the sandbox provides **zero isolation** for same-origin games.

**Impact:** If any game's static assets were compromised (supply chain attack, CDN tampering, XSS in a game's HTML/JS), the attacker gets full access to the parent page's DOM, localStorage, and cookies. The wallet address stored in Zustand (persisted to localStorage) would be exposed.

**Mitigation:** This is an accepted tradeoff — the games NEED `allow-scripts` (for JS execution) and `allow-same-origin` (for localStorage access to wallet state, postMessage for score reporting). The games are self-hosted first-party content under `public/games/`, not third-party.

**Recommendation (defense-in-depth):**
- Consider moving game assets to a separate subdomain (e.g., `games.fuzzynuts.xyz`) so the sandbox provides real cross-origin isolation
- Alternatively, document this as an accepted risk in PROJECT_STATE.md

---

### M2 — postMessage listener lacks origin validation (GameModal)

**Severity:** MEDIUM
**Location:** `src/components/game/GameModal.tsx:113-128`

**Description:**
The `message` event handler that processes `FUZZY_SCORE_SUBMITTED` events does NOT validate `event.origin`:
```typescript
const handleMessage = (event: MessageEvent) => {
  if (!event.data || typeof event.data !== "object") return;
  if (event.data.type === "FUZZY_SCORE_SUBMITTED" && event.data.success) {
    // triggers victory banner, analytics tracking
  }
};
window.addEventListener("message", handleMessage);
```

Any open window, popup, or other iframe on the page could send a crafted `FUZZY_SCORE_SUBMITTED` message to trigger the victory banner and fire analytics events.

**Impact:** LOW practical impact — the victory banner is purely cosmetic, and actual score validation happens server-side via `SCORE_CAPS` and HMAC. An attacker could only trigger a fake victory animation and pollute analytics.

**Note:** Contrast with `fuzzy-score.js` (line 51-53) which correctly validates origin via `ALLOWED_ORIGINS` allowlist. The parent-side handler should follow the same pattern.

**Recommendation:**
```typescript
const handleMessage = (event: MessageEvent) => {
  const ALLOWED_ORIGINS = [
    window.location.origin, // same-origin games
  ];
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  // ... rest of handler
};
```

---

### L1 — postMessage sends use wildcard `"*"` targetOrigin

**Severity:** LOW
**Location:** `src/components/game/GameModal.tsx:189, 274`

**Description:**
Two `postMessage` calls use `"*"` as targetOrigin:
```typescript
// Line 189 — FUZZY_CONFIG
iframeRef.current?.contentWindow?.postMessage(
  { type: "FUZZY_CONFIG", hideNav: true, parentOrigin: window.origin },
  "*"
);

// Line 274 — setMute
iframeRef.current?.contentWindow?.postMessage(
  { type: "setMute", muted: next },
  "*"
);
```

The `"*"` wildcard means the message is delivered regardless of what origin is loaded in the iframe. Since all games are same-origin static files, this is not exploitable in practice.

**Recommendation:** Replace `"*"` with `window.location.origin` for defense-in-depth:
```typescript
iframeRef.current?.contentWindow?.postMessage(
  { type: "FUZZY_CONFIG", hideNav: true, parentOrigin: window.origin },
  window.location.origin
);
```

Note: `fuzzy-score.js` (line 203) correctly uses specific origin `'https://fuzzynuts.xyz'` for its outbound messages. The React side should match.

---

### L2 — No CSP beyond frame-ancestors

**Severity:** LOW
**Location:** `src/middleware.ts:78-84`

**Description:**
The middleware sets `Content-Security-Policy` with only `frame-ancestors`:
```
/games/*:      frame-ancestors 'self'
everything else: frame-ancestors 'none'
```

There is no `script-src`, `connect-src`, `default-src`, `style-src`, or any other CSP directive. This means:
- No CSP protection against XSS (inline scripts, `eval()`, dynamic script injection all allowed)
- No `connect-src` restriction (fetch/XHR can reach any endpoint)
- No `style-src` restriction

`next.config.ts` has no CSP headers at all — only cache headers for videos/images.

**Recommendation:** Add a broader CSP once the lockdown is lifted. During pre-launch lockdown, the edge Basic Auth provides stronger protection than CSP would. Post-launch, add at minimum:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://xumm.app;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://world.fuzzynuts.xyz https://xrplcluster.com wss://xrplcluster.com;
frame-ancestors 'self'  (for /games/*) or 'none' (for everything else);
```

---

### INFO — Positive findings

**I1 — frame-ancestors split is correct**
`middleware.ts:78-84` correctly applies `frame-ancestors 'self'` to `/games/*` (so the React shell can iframe them) and `frame-ancestors 'none'` to everything else. This prevents clickjacking on all non-game pages.

**I2 — fuzzy-score.js validates inbound message origin**
`public/games/fuzzy-score.js:44-53` correctly maintains an `ALLOWED_ORIGINS` allowlist and rejects messages from unknown origins. This is the right pattern — the GameModal handler (M2) should follow suit.

---

## Files Reviewed

| File | Role |
|------|------|
| `src/components/game/GameModal.tsx` | Primary iframe shell — sandbox, postMessage, dialog |
| `src/lib/gameRegistry.ts` | Per-game sandbox overrides, iframe paths |
| `src/middleware.ts` | Edge security headers, CSP frame-ancestors |
| `next.config.ts` | Next.js config — no CSP headers |
| `vercel.json` | Vercel-level headers — basic security, no CSP |
| `public/games/fuzzy-score.js` | Score submission + postMessage origin validation |

## NOT Reviewed (out of scope)

- `.env` files (explicitly excluded per task)
- Server-side score validation (covered in prior audit t_2dd00551)
- HMAC score verification (covered in prior audit t_1503a3ae)
- Game content itself (static HTML/JS under `public/games/`)

---

## Summary Table

| ID | Severity | Title | Status |
|----|----------|-------|--------|
| M1 | MEDIUM | Sandbox provides no isolation on same-origin iframes | Accepted risk — games need scripts + storage |
| M2 | MEDIUM | postMessage listener lacks origin validation | Recommend fix — add origin allowlist |
| L1 | LOW | postMessage sends use wildcard `"*"` targetOrigin | Recommend fix — use `window.location.origin` |
| L2 | LOW | No CSP beyond frame-ancestors | Defer to post-launch |
| I1 | INFO | frame-ancestors split is correct | N/A |
| I2 | INFO | fuzzy-score.js validates inbound origin | N/A |
