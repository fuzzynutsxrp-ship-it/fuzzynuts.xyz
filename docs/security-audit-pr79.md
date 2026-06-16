# Security Audit — PR #79: Profile Page Dynamic Route

**Branch:** `feat/profile-page`
**Auditor:** security-auditor (Hermes Agent)
**Date:** 2026-06-13
**Files changed:** `apps/web-arcade/package.json`, `apps/web-arcade/src/app/profile/[id]/client.tsx`, `apps/web-arcade/src/app/profile/[id]/layout.tsx`, `apps/web-arcade/src/app/profile/[id]/page.tsx`, `apps/web-arcade/src/components/ui/IdenticonAvatar.tsx`, `pnpm-lock.yaml`

---

## Summary

PR #79 adds a public profile page at `/profile/[id]` supporting XRPL wallet addresses and guest IDs. It introduces `jdenticon` for deterministic SVG identicons, a bio editor backed by localStorage, and a score timeline fetched from the existing API. The code is generally well-structured with proper URL encoding and React's built-in XSS escaping. One MEDIUM finding (unvalidated metadata injection), two LOW findings, and two INFO observations. No CRITICAL or HIGH issues.

**Verdict: APPROVE with recommended fixes (non-blocking).**

---

## Findings

### M1 — Unvalidated profile ID used in server-side metadata generation

**Severity:** MEDIUM
**File:** `apps/web-arcade/src/app/profile/[id]/page.tsx` (lines 14-40)
**Category:** Input validation / Metadata injection

`generateMetadata()` runs server-side and uses the raw `id` URL segment to construct the page `<title>`, Open Graph `title`, `description`, and `url`:

```typescript
const { id } = await params;
const isWallet = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(id);
const displayName = isWallet ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
return {
  title: `${displayName} | Fuzzynuts.xyz`,
  openGraph: { url: `https://fuzzynuts.xyz/profile/${id}` },
  // ...
};
```

For non-wallet IDs, `displayName` is the raw `id` string. Any URL-safe character sequence works as a profile ID — including strings crafted for SEO spam, misleading OG previews, or social media card injection.

**Impact:** Not a direct XSS vector (Next.js HTML-escapes metadata values). However:

- Social media crawlers (Twitter, Discord, Slack) render OG cards — a crafted `id` could produce misleading preview cards.
- The OG `url` field contains the raw unvalidated `id`, which could break link previews.
- Search engines index the page with the crafted title, enabling SEO pollution.

**Recommendation:** Validate `id` in `page.tsx` before passing to metadata and client. Return 404 for IDs that don't match wallet or guest format:

```typescript
export default async function ProfileIdPage({ params }) {
  const { id } = await params;
  if (!isWalletAddress(id) && !isGuestId(id)) {
    notFound();
  }
  return <ProfileIdClient profileId={id} />;
}
```

---

### L1 — `dangerouslySetInnerHTML` with identicon SVG output

**Severity:** LOW
**File:** `apps/web-arcade/src/components/ui/IdenticonAvatar.tsx` (line 68)
**Category:** XSS / DOM injection

The component renders jdenticon's SVG output via `dangerouslySetInnerHTML={{ __html: svgMarkup }}`:

```tsx
<div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
```

The `value` prop is the profile ID from the URL — user-controlled input.

**Analysis:** jdenticon's `toSvg()` hashes the input string to generate a deterministic geometric pattern. It does **not** embed the raw input string in the SVG output — the input is used purely as a hash seed. The generated SVG consists only of `<svg>`, `<path>`, and `<rect>` elements with computed color values. This makes SVG injection via the `value` prop extremely unlikely.

Additionally, `jdenticon@3.3.0` has no known CVEs. The transitive dependency `canvas-renderer@2.2.1` also has no known advisories.

**Risk:** Negligible in practice. The `dangerouslySetInnerHTML` pattern is worth flagging as defense-in-depth awareness — if jdenticon ever had a bug that embedded raw input, this would become an XSS vector.

**Recommendation:** No action required. If defense-in-depth is desired, wrap the SVG with DOMPurify:

```typescript
import DOMPurify from "dompurify";
const cleanSvg = DOMPurify.sanitize(svgMarkup, { USE_PROFILES: { svg: true } });
```

---

### L2 — Bio content stored in localStorage keyed by arbitrary profile ID

**Severity:** LOW
**File:** `apps/web-arcade/src/app/profile/[id]/client.tsx` (lines 130-170)
**Category:** Client-side data integrity

The `BioEditor` component stores bio text in `localStorage` under key `fuzzy_profile_bio_${profileId}`. Issues:

1. **No length enforcement on the storage side.** The `<textarea>` has `maxLength={200}`, but `localStorage.setItem` has no limit. A crafted script could bypass the textarea constraint.
2. **No server-side persistence.** Bio is purely client-local — different browsers/devices see different bios for the same profile ID.
3. **Any visitor can edit any guest profile's bio** (in their own browser's localStorage). This is by design for a local-only feature, but could confuse users who expect bio to be shared.

**Impact:** Minimal — React's JSX auto-escaping prevents stored bio from being rendered as HTML. The `<p>{bio}</p>` pattern safely escapes any HTML in the stored text.

**Recommendation:** Consider adding a server-side bio endpoint if persistence across devices is desired. For the current localStorage-only approach, no security action needed.

---

### INFO — No CVEs in new dependencies

**Severity:** INFO
**File:** `pnpm-lock.yaml`

New dependencies introduced:

- `jdenticon@3.3.0` — No known CVEs. Well-maintained (GitHub: dmester/jdenticon).
- `canvas-renderer@2.2.1` (transitive) — No known CVEs.

Pre-existing `pnpm audit` findings (`tar` vulnerability via `bcrypt > node-pre-gyp`) are unrelated to this PR.

---

### INFO — Layout.tsx is clean

**Severity:** INFO
**File:** `apps/web-arcade/src/app/profile/[id]/layout.tsx`

The layout component wraps children in `SubPageLayout` with static configuration props (`showVideoBg`, `showFallingNuts`, `navbarTransparent`). No user-controlled data flows through the layout. No metadata injection risk here.

---

## Positive observations

1. **Wallet address validation uses a proper regex.** The `isWalletAddress()` function correctly validates XRPL address format (`/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/`), preventing injection of malformed wallet strings.

2. **API fetch uses `encodeURIComponent`.** The score API call properly encodes the profile ID: `` `${API_BASE}?wallet=${encodeURIComponent(profileId)}` ``.

3. **Guest ID validation is reasonable.** The `isGuestId()` regex (`/^Guest-[0-9a-fA-F]{4,8}$/`) limits guest IDs to a narrow character set.

4. **AbortSignal timeout on API calls.** The fetch uses `AbortSignal.timeout(8000)` to prevent hanging requests.

5. **Score data is public.** The API returns wallet, score, game, and timestamp — all already visible on the leaderboard. No sensitive data exposure.

6. **Bio editor has client-side maxLength.** The `<textarea maxLength={200}>` provides reasonable client-side enforcement.

7. **Error handling is defensive.** The component handles fetch timeouts, server errors, and localStorage unavailability gracefully.

---

## Changes from main

| Area                  | Before (main)    | After (PR #79)                                  |
| --------------------- | ---------------- | ----------------------------------------------- |
| `/profile/[id]` route | Does not exist   | New dynamic route with client-side profile page |
| Identicon library     | None             | `jdenticon@3.3.0` + `canvas-renderer@2.2.1`     |
| Bio storage           | None             | localStorage per profile ID                     |
| Score display         | Leaderboard only | Per-profile score timeline (top 15)             |
| Profile metadata      | None             | `generateMetadata` with OG tags                 |

---

## Verdict

**APPROVE** — No blocking issues. The MEDIUM finding (M1) is a metadata injection risk that should be addressed as a follow-up: validate the `[id]` param against known formats and return 404 for invalid IDs. The LOW findings are defense-in-depth observations with negligible practical risk. The `jdenticon` library is safe and well-maintained.
