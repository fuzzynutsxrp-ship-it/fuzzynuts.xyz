# Code Review: Feature PRs Batch (PR #71, #68, #66, #65)

Reviewed: 2026-06-13
Reviewer: Hermes Agent (reviewer profile)

---

## PR #71 — feat/leaderboard-ui: Global Leaderboard UI

**Branch:** feat/leaderboard-ui | **Files:** 2 | **Diff:** +309/-205
**Commit:** 1074dec

### Summary

Rewrites the leaderboard from per-game score entries to an aggregated player-centric view. Introduces `PlayerRow` interface and `aggregateByPlayer()` that groups scores by wallet/userId. Switches from static `GAMES` array to `gameRegistry` for game filtering. Adds responsive mobile layout with stacked card design.

### Findings

**HIGH — Unstable anonymous key in `aggregateByPlayer()`**

```typescript
const key =
  entry.wallet?.toLowerCase() ||
  entry.userId ||
  entry.displayName ||
  entry.name ||
  `anon-${Math.random()}`;
```

`Math.random()` produces a new key every render. If the same anonymous player appears in multiple API responses, they'll get duplicate rows. Worse, React keys based on random values cause unnecessary re-renders and DOM thrashing. Use a deterministic fallback (e.g. index-based `anon-${index}`) or filter out entries with no identifying key.

**MEDIUM — `gamesPlayed` shows 1 when filtering by single game**
When `selectedGame !== "all"`, the API returns entries for only that game, so `gamesPlayed` is always 1. The column is misleading in single-game mode. Either hide the column when filtering or compute from the "all" dataset.

**MEDIUM — `manualRefresh` is a no-op for "all games" mode**

```typescript
const manualRefresh = selectedGame === "all" ? () => {} : singleGameHook.manualRefresh;
```

The refresh button renders but does nothing in the default "All Games" view. Implement a refresh for the aggregated fetch or hide the button when it won't work.

**LOW — Test assertion always passes**

```typescript
expect(headerVisible || true).toBe(true);
```

This is a tautology. Either remove the test or assert something meaningful (e.g. check the header exists in DOM even if not visible on mobile).

**LOW — Unused imports**
`Radio` from lucide-react and `Gamepad2` from lucide-react are imported but `Radio` doesn't appear in the rendered JSX. Clean up.

**LOOKS GOOD**

- Clean `PlayerRow` interface design with proper aggregation logic
- Responsive desktop/mobile dual layout is well-structured
- Proper use of `useMemo` for `aggregateByPlayer`
- Podium component correctly handles PlayerRow data
- "you" badge works for both wallet and Google sessions
- Mobile dropdown gets `max-h-64 overflow-y-auto` — good for many games
- E2E tests updated to match new UI structure

### Verdict: CONDITIONAL GO

Fix the `Math.random()` key (HIGH) and the no-op refresh (MEDIUM) before merge. The `gamesPlayed=1` issue is acceptable for v1 but should be noted.

---

## PR #68 — feat/profile-page: /profile/[id] Dynamic Route with Identicon Avatar

**Branch:** feat/profile-page | **Files:** 6 | **Diff:** +779/-0
**Commit:** 9204d9a

### Summary

Adds `/profile/[id]` dynamic route supporting XRPL wallet addresses and guest IDs. Includes `IdenticonAvatar` component using `jdenticon` library, `BioEditor` for guest localStorage bios, `ScoreTimeline` for recent score history, and proper Next.js 15 async params handling.

### Findings

**MEDIUM — `dangerouslySetInnerHTML` with jdenticon SVG**

```tsx
dangerouslySetInnerHTML={{ __html: svgMarkup }}
```

jdenticon's `toSvg()` is deterministic and doesn't include user-supplied raw HTML, so this is safe in practice. However, if `value` ever contains crafted input, jdenticon's internal escaping may not cover all vectors. Add a comment noting the trust boundary: "value is a wallet address or guest ID — no user-controlled HTML."

**MEDIUM — Hardcoded `GAME_EMOJIS` duplicates game metadata**
The component defines its own `GAME_EMOJIS` mapping and uses `GAMES` from utils for `getGameTitle`/`getGameColor`. PR #71 is migrating away from `GAMES` to `gameRegistry`. This PR should do the same to avoid inconsistency. Use `gameRegistry.getBySlug()` instead.

**MEDIUM — Guest profiles always show empty scores**

```typescript
if (!isWallet) {
  setState({ scores: [], loading: false, error: null });
  return;
}
```

Guest users see "No scores recorded yet" even if they have localStorage-based scores. Consider reading from localStorage for guests or showing a more helpful message.

**LOW — Duplicate `ScoreEntry` interface**
Defines a local `ScoreEntry` that differs slightly from the shared `ScoreEntry` in `@/features/arcade`. Consolidate to avoid drift.

**LOW — `BIO_STORAGE_PREFIX` is client-only**
Bios stored in `localStorage` are per-browser and not synced. This is fine for v1 but should be documented in the UI ("Bios are saved locally on this device").

**LOOKS GOOD**

- Proper Next.js 15 `params: Promise<PageParams>` handling
- `generateMetadata` produces good SEO with OG tags
- IdenticonAvatar has graceful fallback (🥜 icon) on error
- BioEditor has clear edit/save/cancel UX with maxLength=200
- ScoreTimeline has nice animation stagger (delay: i \* 0.04)
- Skeleton loader matches the actual content structure
- Clean separation: layout.tsx, page.tsx, client.tsx

### Verdict: CONDITIONAL GO

Address the `gameRegistry` migration (MEDIUM) and add a trust-boundary comment on `dangerouslySetInnerHTML` (MEDIUM). Otherwise solid.

---

## PR #66 — feat/profile-stats: /profile/[id] Stats Dashboard

**Branch:** feat/profile-stats | **Files:** 3 | **Diff:** +532/-0
**Commit:** 390a695

### Summary

Adds `UserStatsGrid` component showing Games Played, Favorite Genre, Highest Score, and Unique Games stats in a 4-card grid. Includes "Recently Played" horizontal scroll with game thumbnails. Uses dynamic import for code splitting.

### Findings

**HIGH — `fetchScores` missing from `useEffect` dependency array**

```typescript
useEffect(() => {
  if (deviceId) fetchScores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [deviceId]);
```

The ESLint disable is a red flag. If `fetchScores` identity changes (e.g. on re-render), the effect won't re-run. Since `fetchScores` is defined inside the component without `useCallback`, it changes every render. Either wrap in `useCallback` or accept the lint disable with a comment explaining why it's safe (deviceId is the only meaningful trigger).

**MEDIUM — Duplicate utility functions**
`formatNumber`, `formatDate`, `relativeTime` are all defined locally. `formatNumber` and `formatDate` already exist in `@/lib/utils` and `@/lib/format`. Import them instead of duplicating.

**MEDIUM — Duplicate `ScoreEntry` interface**
Third instance of a local `ScoreEntry` across these PRs. Create a shared type.

**LOW — `Clock` icon for "Unique Games" stat**
The `Clock` icon semantically represents time, not game count. Use `Layers`, `Grid3X3`, or a custom icon.

**LOW — Skeleton always shows 4 stat cards**
The skeleton renders 4 cards matching the 4-stat layout, but the actual grid uses `col-span-2` for two of them. The skeleton should mirror this.

**LOOKS GOOD**

- Dynamic import of `UserStatsGrid` with `ssr: false` for code splitting
- `favoriteGenre` computation uses `useMemo` correctly
- `recentFive` dedupes by game, keeps most recent — good logic
- Error state has retry button
- Horizontal scroll with `snap-x snap-mandatory` for nice UX
- Loading skeleton matches actual card dimensions

### Verdict: CONDITIONAL GO

Fix the `useEffect` dependency (HIGH) and consolidate duplicate utilities (MEDIUM). The component logic is clean.

---

## PR #65 — chore/registry-descriptions: Expand Terse Game Descriptions

**Branch:** chore/registry-descriptions | **Files:** 31 | **Diff:** +45/-45
**Commit:** e3f05bc

### Summary

Expands one-line game descriptions to 2-3 sentence paragraphs across 15 games. Changes are applied consistently in three locations: `apps/games-build/games/*/index.html`, `apps/web-arcade/public/games/*/index.html`, and `apps/web-arcade/src/lib/gameRegistry.ts`. All 31 files have exactly +1/-1 (description swap only).

### Findings

**LOW — Minor grammar: missing apostrophes**

- Boxing: "your opponents counter-attacks" → "your opponent's counter-attacks"
- Capture the Flag: "the opponents half" → "the opponent's half"
- Frogger: "One wrong move and its game over" → "One wrong move and it's game over"

**LOW — gameRegistry `description` field now much longer**
Previously: 5-10 words. Now: 30-50 words. If any UI component renders `description` without truncation (e.g. tooltip, card), the long text may overflow. Verify that no component renders `gameRegistry.getBySlug(x).description` in a constrained container.

**LOOKS GOOD**

- All 3 locations kept in sync (games-build, web-arcade/public, gameRegistry.ts)
- Each game only has its description changed — no accidental content changes
- Descriptions are well-written, engaging, and SEO-friendly
- Consistent style across all 15 games
- `loadingTips` are intentionally left as short one-liners (not expanded) — good judgment

### Verdict: GO (with minor grammar fixes)

Merge after fixing the 3 apostrophe issues. Purely content, no functional risk.

---

## Cross-PR Concerns

### 1. Duplicate `ScoreEntry` interface (3 instances)

PR #68 and PR #66 each define a local `ScoreEntry`. The shared one lives in `@/features/arcade`. After these PRs merge, consolidate into a single shared type.

### 2. Duplicate utility functions

PR #66 redefines `formatNumber`, `formatDate`, `relativeTime`. PR #68 redefines `formatDate`. Import from `@/lib/utils` or `@/lib/format`.

### 3. Hardcoded API_BASE URL

Both PR #68 and PR #66 hardcode `const API_BASE = "https://world.fuzzynuts.xyz/api/scores"`. Use the shared `API_SCORES` constant from `@/features/arcade/constants`.

### 4. Merge order

PR #65 (descriptions) is independent — merge anytime.
PR #68 (profile page) and PR #66 (profile stats) both create `profile/[id]/page.tsx` — they'll conflict. Merge #68 first, then rebase #66 and integrate `UserStatsGrid` into the existing profile page.
PR #71 (leaderboard) is independent of #68/#66 but shares the `gameRegistry` migration pattern.

---

## Summary Table

| PR  | Title                 | Verdict        | Blockers            | Warnings                                              |
| --- | --------------------- | -------------- | ------------------- | ----------------------------------------------------- |
| #71 | Leaderboard UI        | CONDITIONAL GO | 1 (Math.random key) | 2 (gamesPlayed, no-op refresh)                        |
| #68 | Profile Page          | CONDITIONAL GO | 0                   | 3 (dangerouslySetInnerHTML, GAME_EMOJIS, guest empty) |
| #66 | Profile Stats         | CONDITIONAL GO | 1 (useEffect deps)  | 2 (duplicate utils, duplicate types)                  |
| #65 | Registry Descriptions | GO             | 0                   | 1 (grammar)                                           |

**Overall: All 4 PRs can merge after addressing blockers. No critical security issues found.**
