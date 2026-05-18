/**
 * ═══════════════════════════════════════════════════════════════
 * useArcadeState — Re-export Shim (Backward Compatibility)
 *
 * This file previously contained all arcade hooks, types, and
 * utilities in a single 840-line module. That code has been
 * extracted into the `@/features/arcade/` domain structure:
 *
 *   src/features/arcade/
 *   ├── types/arcade.ts          — All shared types
 *   ├── constants/index.ts       — API URLs, score caps, prize tiers
 *   ├── utils/scoreHelpers.ts    — Week keys, time formatting, score merging
 *   ├── hooks/
 *   │   ├── useLeaderboard.ts    — Leaderboard fetching + polling
 *   │   ├── useScoreSubmission.ts — Score validation + anti-cheat
 *   │   ├── usePayoutEligibility.ts — Prize claim lifecycle
 *   │   └── useSyncLocalScores.ts   — Offline score sync
 *   └── index.ts                 — Barrel export
 *
 * This shim re-exports everything so existing imports like
 *   import { useLeaderboard } from "@/hooks/useArcadeState"
 * continue to work without modification.
 *
 * PREFERRED IMPORT PATH (new code):
 *   import { useLeaderboard, ScoreEntry } from "@/features/arcade";
 * ═══════════════════════════════════════════════════════════════
 */

// Re-export everything from the new domain location
export {
  // ── Types ──
  type ScoreEntry,
  type EligibilityData,
  type ClaimResponse,
  type SubmissionStatus,
  type ClaimStatus,
  type LocalScoreEntry,
  type LeaderboardReturn,
  type ScoreSubmissionReturn,
  type PayoutReturn,

  // ── Constants ──
  API_SCORES,
  API_REWARDS,
  SCORE_CAPS,
  PRIZE_TIERS,

  // ── Utility Functions ──
  getCurrentWeekKey,
  getWeekKeyOffset,
  timeAgo,

  // ── Hooks ──
  useLeaderboard,
  useScoreSubmission,
  usePayoutEligibility,
  useSyncLocalScores,
} from "@/features/arcade";
