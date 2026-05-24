/**
 * ═══════════════════════════════════════════════════════════════
 * Arcade Domain — Constants
 *
 * API endpoints, polling intervals, score caps, and storage keys.
 * ═══════════════════════════════════════════════════════════════
 */

/** Backend API base URLs */
export const API_SCORES = "https://world.fuzzynuts.xyz/api/scores";
export const API_REWARDS = "https://world.fuzzynuts.xyz/api/rewards";

/** Polling interval for auto-refreshing leaderboard (ms) */
export const AUTO_POLL_MS = 30_000;

/** Maximum entries to display in leaderboard */
export const MAX_ENTRIES = 50;

/** Cooldown between manual refresh clicks (ms) */
export const REFRESH_COOLDOWN_MS = 10_000;

/** localStorage key used by fuzzy-score.js for offline score storage */
export const LOCAL_STORAGE_KEY = "fuzzy_arcade_scores";

/** Minimum play duration in ms before a score is considered legit */
export const MIN_PLAY_DURATION_MS = 5_000;

/** Debounce cooldown between score submissions (ms) */
export const SUBMIT_COOLDOWN_MS = 5_000;

import { gameRegistry } from "@/lib/gameRegistry";

/**
 * Per-game score submission caps (anti-cheat ceiling).
 * Scores above these values are automatically rejected.
 *
 * DERIVED from the gameRegistry — the registry is the single source
 * of truth for game metadata. Keys are CANONICAL slugs (matching
 * `public/games/<slug>/` folder names). API requests get translated
 * to backend slugs by `slugAliases.ts` at the boundary.
 */
export const SCORE_CAPS: Record<string, number> = Object.fromEntries(
  gameRegistry.getAll().map((g) => [g.slug, g.scoreCap]),
);

/**
 * Weekly prize tiers — maps rank to $NUT prize amounts.
 * Shared between ClaimRewards UI and server-side validation.
 */
export const PRIZE_TIERS: Record<
  number,
  { label: string; amount: string; nutAmount: number; emoji: string }
> = {
  1: { label: "1st Place", amount: "250,000 $NUT", nutAmount: 250_000, emoji: "🥇" },
  2: { label: "2nd Place", amount: "150,000 $NUT", nutAmount: 150_000, emoji: "🥈" },
  3: { label: "3rd Place", amount: "100,000 $NUT", nutAmount: 100_000, emoji: "🥉" },
};
