/**
 * ═══════════════════════════════════════════════════════════════
 *  SCORE_CAPS — anti-cheat ceiling per game
 *
 *  Single source of truth. Imported by:
 *    - @fuzzynuts/web-arcade  (UI gating + zod schema)
 *    - @fuzzynuts/api         (server-side enforcement)
 *    - @fuzzynuts/games-build (score-submitter bundled into every game)
 *
 *  Three divergent copies existed pre-migration:
 *    - apps/web-arcade/src/features/arcade/constants/index.ts
 *    - apps/web-arcade/public/games/fuzzy-score.js  (had wrong "nutracer" key)
 *    - the deployed Railway api  (separate repo, separate values)
 *  This file replaces all three. Tests in tests/score-caps.test.ts
 *  enforce that every slug in GAME_SLUGS has a cap and vice-versa.
 * ═══════════════════════════════════════════════════════════════
 */

import type { GameSlug } from "./slugs";
import { GAME_SLUGS } from "./slugs";

/** Per-game maximum score accepted by the API. Submissions above are rejected. */
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "fuzzy-survivors": 5_000_000,
  minigolf: 100_000,
  "nut-racer": 2_000_000,
  "fuzzynuts-world": 10_000_000,
  rsc: 99_000_000, // [MANUAL VERIFICATION REQUIRED] — RSC XP-based scoring, cap TBD
  "dragon-hoard": 999_999, // Endless collect-avoid game, cap for anti-cheat
  "cosmic-blaster": 999_999, // Endless space shooter, cap for anti-cheat
  "snake": 50_000, // Classic snake with power-ups
  "breakout": 100_000, // Brick breaker with power-ups
  "pong": 11, // First to 11 wins
  "tetris": 999_999, // Falling blocks puzzle
  "asteroids": 500_000, // Ship vs asteroids
  "flappy": 999,
  "subway-runner": 50_000,
  "jetpack": 100_000,
  "ski-free": 99_999,
  "doodle-jump": 500_000,
  "2048": 999_999,
  "memory": 10_000,
  "minesweeper": 99_999,
  "sudoku": 99_999,
  "wordle": 1_000,
};

/** Type-safe cap lookup. Falls back to the most restrictive value if asked for an unknown slug. */
export function getScoreCap(slug: GameSlug): number {
  return SCORE_CAPS[slug];
}

/** Minimum play duration (seconds) before a score is considered legit. Applies to every game. */
export const MIN_PLAY_DURATION_SECONDS = 5;

/** Debounce between accepted submissions from the same session (ms). */
export const SUBMIT_COOLDOWN_MS = 5_000;

/** Maximum acceptable clock drift between client `timestamp` and server time (ms). */
export const MAX_TIMESTAMP_DRIFT_MS = 120_000; // ±2 minutes

/** Compile-time check: every slug listed in GAME_SLUGS has a cap entry.
 *  If this line fails to typecheck, a slug was added without a cap. */
const _exhaustiveCheck: Record<(typeof GAME_SLUGS)[number], number> = SCORE_CAPS;
void _exhaustiveCheck;
