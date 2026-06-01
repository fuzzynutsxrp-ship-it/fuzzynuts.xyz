/**
 * ═══════════════════════════════════════════════════════════════
 * Arcade Domain — Constants (web-arcade shim)
 *
 * The canonical constants now live in @fuzzynuts/arcade-core.
 * This file re-exports them so existing imports inside
 * apps/web-arcade keep working without a sweep.
 *
 * New code should import directly from @fuzzynuts/arcade-core:
 *   import { SCORE_CAPS, normalizeSlug } from "@fuzzynuts/arcade-core";
 *
 * Web-arcade-only UI constants (API URLs, polling intervals,
 * localStorage keys) stay here — they don't belong in arcade-core
 * because the api package doesn't need them.
 * ═══════════════════════════════════════════════════════════════
 */

// ── Canonical re-exports (single source of truth) ──
export {
  SCORE_CAPS,
  getScoreCap,
  MIN_PLAY_DURATION_SECONDS,
  SUBMIT_COOLDOWN_MS,
  MAX_TIMESTAMP_DRIFT_MS,
  PRIZE_TIERS,
  TOTAL_WEEKLY_NUT_POOL,
  GAME_SLUGS,
  ID_TO_SLUG,
  SLUG_TO_LEGACY_ID,
  normalizeSlug,
  isGameSlug,
  type GameSlug,
  type PrizeTier,
} from "@fuzzynuts/arcade-core";

// ── Backwards-compat alias: MIN_PLAY_DURATION_MS (was milliseconds) ──
import { MIN_PLAY_DURATION_SECONDS } from "@fuzzynuts/arcade-core";
/** @deprecated Use MIN_PLAY_DURATION_SECONDS from @fuzzynuts/arcade-core and multiply at the call site. */
export const MIN_PLAY_DURATION_MS = MIN_PLAY_DURATION_SECONDS * 1000;

// ── Web-arcade-specific (not in arcade-core) ──

/** Backend API base URLs (web-arcade reads, doesn't write) */
export const API_SCORES = "https://world.fuzzynuts.xyz/api/scores";
export const API_REWARDS = "https://world.fuzzynuts.xyz/api/rewards";

/** Polling interval for auto-refreshing leaderboard (ms) */
export const AUTO_POLL_MS = 30_000;

/** Maximum entries to display in leaderboard */
export const MAX_ENTRIES = 50;

/** Cooldown between manual refresh clicks (ms) */
export const REFRESH_COOLDOWN_MS = 10_000;

/** localStorage key used by the score-submitter for offline score storage */
export const LOCAL_STORAGE_KEY = "fuzzy_arcade_scores";
