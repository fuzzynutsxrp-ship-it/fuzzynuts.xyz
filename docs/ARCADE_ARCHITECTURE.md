# 🏗️ Arcade Domain Architecture

> **Last Updated:** May 18, 2026  
> **Domain Location:** `src/features/arcade/`

---

## Overview

The Arcade domain encapsulates all scoring, leaderboard, and rewards/claim logic for the Fuzzynuts Arcade. It follows a **domain-driven folder structure** with clear separation between types, constants, utilities, and React hooks.

### Import Convention

```typescript
// ✅ Preferred — import from barrel export
import { useLeaderboard, ScoreEntry, SCORE_CAPS } from "@/features/arcade";

// ⚠️ Legacy — still works via re-export shim (backward compat)
import { useLeaderboard } from "@/hooks/useArcadeState";
```

---

## Directory Structure

```
src/features/arcade/
├── index.ts                          # Barrel export — single import path
│
├── types/
│   └── arcade.ts                     # All shared types & interfaces
│       ├── ScoreEntry                # Leaderboard score row
│       ├── EligibilityData           # Prize eligibility check result
│       ├── ClaimResponse             # Prize claim API response
│       ├── SubmissionStatus          # "idle" | "submitting" | "success" | "error"
│       ├── ClaimStatus               # Full claim lifecycle states (10 states)
│       ├── LocalScoreEntry           # localStorage format (from fuzzy-score.js)
│       ├── LeaderboardReturn         # useLeaderboard return type
│       ├── ScoreSubmissionReturn     # useScoreSubmission return type
│       └── PayoutReturn              # usePayoutEligibility return type
│
├── constants/
│   └── index.ts                      # API URLs, score caps, prize tiers
│       ├── API_SCORES                # https://world.fuzzynuts.xyz/api/scores
│       ├── API_REWARDS               # https://world.fuzzynuts.xyz/api/rewards
│       ├── SCORE_CAPS                # Per-game anti-cheat score ceilings
│       ├── PRIZE_TIERS               # Weekly prize amounts by rank
│       ├── AUTO_POLL_MS              # 30s leaderboard poll interval
│       ├── MIN_PLAY_DURATION_MS      # 5s minimum play before score accepted
│       └── SUBMIT_COOLDOWN_MS        # 5s debounce between submissions
│
├── utils/
│   └── scoreHelpers.ts               # Pure functions (no React dependency)
│       ├── getCurrentWeekKey()        # ISO week key (e.g., "2026-W20")
│       ├── getWeekKeyOffset(n)        # N weeks ago
│       ├── timeAgo(timestamp)         # "5m ago", "2h ago"
│       ├── getLocalScores(game, week) # Read from localStorage
│       └── mergeScores(api, local)    # Merge with dedup + sort
│
└── hooks/
    ├── useLeaderboard.ts             # Fetch, poll, visibility-refetch
    ├── useScoreSubmission.ts         # postMessage validation + anti-cheat
    ├── usePayoutEligibility.ts       # Prize claim lifecycle (XRPL)
    └── useSyncLocalScores.ts         # Offline score sync on wallet connect
```

---

## Hook Responsibilities

### `useLeaderboard(game, week?)`
- Fetches scores from `GET /api/scores?game=X&week=Y`
- Auto-polls every 30 seconds
- Re-fetches on browser tab visibility change
- Falls back to localStorage when server unreachable
- Merges local + API scores with deduplication

### `useScoreSubmission(slug)`
- Listens for `postMessage` events from game iframes
- Validates score caps per game
- Enforces minimum play duration (5s anti-cheat)
- Debounces rapid submissions (5s cooldown)
- Tracks session uniqueness via localStorage

### `usePayoutEligibility(wallet)`
- Checks `GET /api/rewards/eligibility?wallet=X&week=Y`
- Manages confirmation → claim → polling lifecycle
- Executes `POST /api/rewards/claim` with wallet + week
- Polls `GET /api/rewards/claim/status` for XRPL tx hash
- Persists claim state to localStorage (double-claim prevention)
- Auto-checks on wallet connect

### `useSyncLocalScores(game, wallet)`
- Fire-and-forget sync on wallet connect
- Finds best unsynced score from localStorage
- POSTs to backend to ensure it appears on leaderboard
- Runs once per wallet per mount

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Game Iframe (fuzzy-score.js)                                 │
│   postMessage({ type: "FUZZY_SCORE_SUBMITTED", score, ... })│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ useScoreSubmission                                            │
│   • Validates score cap, play duration, session uniqueness   │
│   • Updates submission toast status                          │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ useLeaderboard                                               │
│   • Fetches from API, merges localStorage fallback           │
│   • Auto-polls every 30s, refetches on visibility change     │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ usePayoutEligibility                                         │
│   • Checks top-3 rank eligibility                            │
│   • Manages claim → XRPL payment → tx hash confirmation      │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Mapping

| Component | Hook(s) Used | Path |
|-----------|-------------|------|
| `GamePage` | `useLeaderboard`, `useScoreSubmission`, `usePayoutEligibility`, `useSyncLocalScores` | `components/game/GamePage.tsx` |
| `GameWrapper` | `useScoreSubmission` | `components/game/GameWrapper.tsx` |
| `Leaderboard` | `useLeaderboard`, `usePayoutEligibility` | `components/sections/Leaderboard.tsx` |
| `ClaimRewards` | `usePayoutEligibility` | `components/sections/ClaimRewards.tsx` |
| `LeaderboardClient` | Composes `Leaderboard` + `ClaimRewards` | `app/leaderboard/client.tsx` |
| `GameHeader` | `getCurrentWeekKey`, `getWeekKeyOffset` | `components/game/GameHeader.tsx` |
| `GameSidebar` | (types only: `ScoreEntry`, `EligibilityData`) | `components/game/GameSidebar.tsx` |
| `ScoreSubmissionPanel` | `timeAgo` | `components/game/ScoreSubmissionPanel.tsx` |

---

## Shared Dependencies (Not in Arcade Domain)

| Module | Path | Reason |
|--------|------|--------|
| `gameRegistry` | `src/lib/gameRegistry.ts` | Shared across homepage, game pages, and arcade |
| `wallet` | `src/store/wallet.ts` | Zustand store used by navbar, profile, and arcade |

These remain in their current locations because they serve the entire application, not just the arcade domain.

---

## Adding a New Game

1. Add game metadata to `src/lib/gameRegistry.ts`
2. Add game files to `public/games/<slug>/`
3. Register score cap in `src/features/arcade/constants/index.ts` → `SCORE_CAPS`
4. Register score cap on server in `packages/server/src/api/scores.ts`
5. Include `fuzzy-score.js` in the game's HTML

No changes needed to hooks — they use the slug dynamically.
