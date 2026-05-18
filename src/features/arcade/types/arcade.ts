/**
 * ═══════════════════════════════════════════════════════════════
 * Arcade Domain — Shared Types
 *
 * All types used across leaderboard, scoring, and rewards components.
 * Single source of truth for the Arcade domain's data contracts.
 * ═══════════════════════════════════════════════════════════════
 */

/** A single leaderboard score entry from the API */
export interface ScoreEntry {
  wallet: string;
  name?: string;
  score: number;
  game: string;
  ts: number;
  session?: string;
  hasTrustline?: boolean;
  eligible?: boolean;
}

/** Eligibility data returned by /api/rewards/eligibility */
export interface EligibilityData {
  eligible: boolean;
  rank: number | null;
  game: string | null;
  prize: number | null;
  claimed: boolean;
  txHash: string | null;
}

/** Claim response from /api/rewards/claim */
export interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

/** Status for score submission toasts */
export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

/** Payout / claim lifecycle status */
export type ClaimStatus =
  | "idle"
  | "checking"
  | "eligible"
  | "not-eligible"
  | "confirming"
  | "claiming"
  | "polling"
  | "success"
  | "error"
  | "already-claimed";

/** Local score entry shape (from fuzzy-score.js localStorage) */
export interface LocalScoreEntry {
  address?: string;
  name?: string;
  score: number;
  ts: number;
  session?: string;
  hasTrustline?: boolean;
  eligible?: boolean;
}

/** Return type for useLeaderboard hook */
export interface LeaderboardReturn {
  scores: ScoreEntry[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isRefreshing: boolean;
  refetch: (showLoading?: boolean) => Promise<void>;
  manualRefresh: () => Promise<void>;
}

/** Return type for useScoreSubmission hook */
export interface ScoreSubmissionReturn {
  status: SubmissionStatus;
  errorMessage: string | null;
  /** Register the game start time (call when iframe loads/game begins) */
  markGameStart: () => void;
  /** Dismiss the toast manually */
  dismiss: () => void;
}

/** Return type for usePayoutEligibility hook */
export interface PayoutReturn {
  eligibility: EligibilityData | null;
  status: ClaimStatus;
  error: string | null;
  txHash: string | null;
  /** Re-check eligibility from the API */
  checkEligibility: () => Promise<void>;
  /** Open confirmation modal (sets status to "confirming") */
  startClaim: () => void;
  /** Cancel confirmation modal */
  cancelClaim: () => void;
  /** Execute the actual claim after confirmation */
  confirmClaim: () => Promise<void>;
}
