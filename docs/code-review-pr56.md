# Code Review: PR #56 — Homepage Poki Redesign + SiteHeader

**Branch:** `feat/web-homepage-polish`
**Commits:** 6 (c6db49c → efb58ab)
**Scope:** 49 files changed, 339 insertions, 1,525 deletions
**Reviewer:** dev-worker (Hermes kanban)
**Date:** 2026-06-13

---

## Verdict: APPROVE with minor issues

The PR achieves its goal: replaces the old dark-themed homepage with a light Poki-style design, unifies the site header into a single `SiteHeader` component, and cleans up dead static artifacts. No blocking issues found.

---

## 1. SiteHeader.tsx (new, 164 lines)

### Component Structure — ✅ Good

- Clean decomposition: nav links, search button, auth button/dropdown, mobile hamburger
- `variant` prop (`"light"` | `"dark"`) correctly themes it for homepage vs inner pages
- Self-contained inline CSS via `dangerouslySetInnerHTML` — scoped under `.sh` prefix, no conflicts with page-level `.fnx` CSS
- Props interface is minimal and well-typed (`SiteHeaderProps`)

### State Management — ✅ Good

- Auth state: `useSession()` (Google) + `useWalletStore()` (XRPL wallet) — both handled
- Dropdown: `dropdownOpen` state with outside-click detection via `useEffect` + `mousedown` listener
- Search: supports both controlled (`onSearchChange` prop) and uncontrolled (`localQuery` fallback) — line 58-59
- Mobile menu: delegated to parent via `onMenuToggle` callback — correct pattern

### Accessibility — ⚠️ Minor Issues

- **Missing `aria-expanded`** on the account dropdown button (line 94). Should be `aria-expanded={dropdownOpen}`.
- **Missing `role="menu"` / `role="menuitem"`** on dropdown items (lines 103-121). Screen readers won't identify it as a menu.
- **No keyboard navigation** for dropdown — no Escape-to-close, no arrow-key navigation between items.
- Mobile hamburger has `aria-label="Toggle menu"` ✅
- Search button has `aria-label="Search games"` ✅
- Account button has `aria-label="Account menu"` ✅

### SSR Compatibility — ✅ No Issues

- `"use client"` directive present
- All browser APIs (`document.addEventListener`) are inside `useEffect` — SSR-safe
- No `localStorage` or `window` access at module level

### CSS Injection Pattern — ⚠️ Acceptable but Notable

- `dangerouslySetInnerHTML` with static string `CSS` — safe (no user input)
- Injected on every page that renders `SiteHeader` — creates a `<style>` tag per render
- **Not a problem in practice** because: (a) Next.js App Router doesn't remount shared layout components during client navigation, (b) duplicate `<style>` tags with identical content are harmless, (c) the CSS is small (~1.2 KB)
- **Future improvement:** Move to `globals.css` or a CSS module if the header ever becomes a layout-level component

---

## 2. Homepage page.tsx (major rewrite, 203 lines)

### Game Grid Rendering — ✅ Good

- Proper `key={g.id}` on all mapped elements (lines 131, 143)
- Game cards use `<button>` (not `<a>`) — correct for actions that open a modal
- `loading="lazy"` on images ✅
- `onError` handler gracefully hides broken images (line 66)
- Empty state handled (line 146)

### Category Filtering — ✅ Good

- `matchesCat` uses regex on concatenated `type + tags` — more flexible than old switch/case
- Search filters on `title`, `type`, and `tags` — same coverage as before
- `useMemo` correctly depends on `[activeCat, searchQuery]`

### Responsive Layout — ✅ Good

- Hero banner: 2-column grid → 1-column on mobile (`@media max-width:768px`)
- Category grid: 4-col → 3-col → 2-col breakpoints
- Game cards: `minmax(160px, 1fr)` auto-fill grid
- Popular row: horizontal scroll with `scroll-snap-type: x mandatory`

### Hardcoded Data — ⚠️ Acceptable

- `FEATURED_ID = "rsc"` and `POPULAR_IDS` are hardcoded — acceptable for a curated homepage
- Category definitions are local constants — fine since they're UI-only filter logic
- No data that should come from the registry is hardcoded

### Changes from Old Homepage

- **Removed:** Coming Soon section (12 placeholder games) — intentional, reduces noise
- **Removed:** CategoryTabs component — replaced with inline category grid
- **Removed:** GameRow wrapper — replaced with simpler Card + grid layout
- **Added:** Hero banner with featured game
- **Added:** Category browse section with gradient tiles
- **Added:** Popular carousel row

---

## 3. Deleted Artifacts — ✅ Clean

### Files Deleted

- `public/index.html` (847 lines) — old static homepage
- `public/data/games.json` (230 lines) — third-party game data
- `public/data/games-manifest.json` (29 lines) — game manifest
- `src/app/page.legacy.tsx` (221 lines) — old homepage backup
- ~40 thumbnail JPEGs in `public/images/thumbnails/`

### Remaining References — ✅ None Found

- Searched all `.tsx` and `.ts` files for `games.json`, `games-manifest.json`, `public/index.html`, `page.legacy`, `thumbnails/game-` — zero matches
- All routes still functional (no broken imports)

---

## 4. ESLint `<a>` to `<Link />` Migration — ⚠️ 1 Remaining

The PR migrates `<TopNav>` → `<SiteHeader>` across all pages, which was the main `<a>` → `<Link />` vector. However:

- **1 remaining `<a>` tag** in `ClaimRewards.tsx` line 393:
  ```tsx
  <a href="/leaderboard/" className="text-neon-green hover:underline font-semibold">
  ```
  Should be `<Link href="/leaderboard/">`. **Not blocking** — this file wasn't part of the PR scope, and it's a pre-existing issue.

---

## 5. leaderboard/client.tsx and legacy/page.tsx — ✅ Minimal, Clean

### leaderboard/client.tsx (5 lines changed)

- Import: `TopNav` → `SiteHeader`
- Usage: `<TopNav ...>` → `<SiteHeader variant="dark" ...>`
- No functional changes to leaderboard logic

### legacy/page.tsx (5 lines changed)

- Import: `TopNav` → `SiteHeader`
- Usage: `<TopNav ...>` → `<SiteHeader variant="dark" ...>`
- No functional changes — preserves the old dark-themed sectioned layout

---

## 6. next.config.ts — ✅ Good

- Rewrites array emptied — correct since `public/index.html` (the old static homepage) is deleted
- Comment block explains the change clearly (lines 9-19)
- Headers for minigolf COOP/COEP preserved
- Video/image cache headers preserved

---

## 7. Dead Code: TopNav.tsx — ⚠️ Should Delete

`src/components/layout/TopNav.tsx` (184 lines) is no longer imported by any component. It was the predecessor to `SiteHeader.tsx`. Should be deleted in a follow-up or this PR.

Additionally, `src/app/leaderboard/layout.tsx` line 3 has a stale comment:

```
 * TopNav + Sidebar are rendered inside the client component.
```

Should reference `SiteHeader` instead.

---

## 8. CI Results

| Check            | Result                  | Notes                                                                                                                                                                               |
| ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | ❌ 6 errors             | **Pre-existing** — all in `playwright.config.ts` and `tests/smoke/top10-games.spec.ts` (missing `@playwright/test` types). Identical on `main`. PR introduces zero new type errors. |
| `pnpm lint`      | ❌ 1 error, 48 warnings | **Pre-existing** — the 1 error is `useMemo` conditional call in `GameModal.tsx:295` (untouched by PR). Main has 1 error + 49 warnings. PR actually **reduced** 1 warning.           |
| `pnpm test`      | ✅ 19/19 pass           | All tests pass.                                                                                                                                                                     |

---

## Summary of Findings

### Blocking Issues

None.

### Should Fix (non-blocking)

1. **Delete `TopNav.tsx`** — 184 lines of dead code
2. **Update stale comment** in `leaderboard/layout.tsx` line 3

### Nice to Have

3. **Add `aria-expanded`** to account dropdown button in SiteHeader
4. **Add `role="menu"` / `role="menuitem"`** to dropdown for screen reader support
5. **Escape key** to close dropdown
6. **Fix `<a>` → `<Link />`** in `ClaimRewards.tsx:393` (pre-existing, out of PR scope)

### Positive Notes

- Clean unification of header components — one SiteHeader replaces TopNav across all pages
- Light/dark variant system is elegant and self-contained
- Homepage redesign is well-structured with proper responsive breakpoints
- Dead artifact cleanup is thorough — no dangling references
- All game routes preserved, no broken navigation
