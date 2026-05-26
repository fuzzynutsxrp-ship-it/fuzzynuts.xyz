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
  usd_value?: number | null;
  nut_amount?: string | null;
  snapshot_price?: number | null;
  snapshot_timestamp?: string | null;
  announced?: boolean;
  cap_applied?: boolean | null;
  tiers?: WeeklyPrizeTier[] | null;
}

/** Claim response from /api/rewards/claim */
export interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  nut_amount_paid?: string;
  usd_value?: number;
  snapshot_price?: number;
}

/** A single dynamic prize tier (USD-announced, NUT pre-calculated at snapshot) */
export interface WeeklyPrizeTier {
  rank: number;
  label: string;
  usd_value: number;
  nut_amount: string | null;
}

/** Response shape of GET /api/rewards/tiers */
export interface WeeklyTiersResponse {
  announced: boolean;
  weekKey: string;
  tiers: WeeklyPrizeTier[] | null;
  snapshot_price: number | null;
  snapshot_timestamp: string | null;
  cap_applied?: boolean;
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
  /** The score value from the most recent successful submission */
  lastScore: number | null;
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
