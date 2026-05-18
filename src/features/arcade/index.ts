/**
 * ═══════════════════════════════════════════════════════════════
 * Arcade Domain — Barrel Export
 *
 * Single entry point for importing anything from the arcade domain.
 * Usage: import { useLeaderboard, ScoreEntry, SCORE_CAPS } from "@/features/arcade";
 * ═══════════════════════════════════════════════════════════════
 */

// ── Types ──
export type {
  ScoreEntry,
  EligibilityData,
  ClaimResponse,
  SubmissionStatus,
  ClaimStatus,
  LocalScoreEntry,
  LeaderboardReturn,
  ScoreSubmissionReturn,
  PayoutReturn,
} from "./types/arcade";

// ── Constants ──
export {
  API_SCORES,
  API_REWARDS,
  AUTO_POLL_MS,
  MAX_ENTRIES,
  REFRESH_COOLDOWN_MS,
  LOCAL_STORAGE_KEY,
  MIN_PLAY_DURATION_MS,
  SUBMIT_COOLDOWN_MS,
  SCORE_CAPS,
  PRIZE_TIERS,
} from "./constants";

// ── Utility Functions ──
export {
  getCurrentWeekKey,
  getWeekKeyOffset,
  timeAgo,
  getLocalScores,
  mergeScores,
} from "./utils/scoreHelpers";

// ── Hooks ──
export { useLeaderboard } from "./hooks/useLeaderboard";
export { useScoreSubmission } from "./hooks/useScoreSubmission";
export { usePayoutEligibility } from "./hooks/usePayoutEligibility";
export { useSyncLocalScores } from "./hooks/useSyncLocalScores";
