/**
 * ═══════════════════════════════════════════════════════════════
 *  Slug map — single source of truth
 *
 *  Background: prior to monorepo migration, three files had three
 *  different slug spellings ("racer" vs "nutracer" vs "nut-racer").
 *  This caused per-game score caps to silently miss for nut-racer
 *  because the lookup key didn't match. Fixed here, enforced by
 *  the round-trip test in tests/slugs.test.ts.
 * ═══════════════════════════════════════════════════════════════
 */

/** Canonical URL slug for each game — used in URLs and as the score-caps key. */
export type GameSlug =
  | "mario"
  | "fuzzy-survivors"
  | "minigolf"
  | "nut-racer"
  | "fuzzynuts-world"
  | "rsc"
  | "dragon-hoard"
  | "cosmic-blaster"
  | "snake"
  | "breakout"
  | "pong"
  | "tetris"
  | "asteroids"
  | "flappy"
  | "subway-runner"
  | "jetpack"
  | "ski-free"
  | "doodle-jump"
  | "2048"
  | "memory"
  | "minesweeper"
  | "sudoku"
  | "wordle"
  | "tank-battle"
  | "helicopter"
  | "fruit-ninja"
  | "tower-defense"
  | "space-invaders"
  | "boxing"
  | "bowling"
  | "archery"
  | "surf-up"
  | "rally";

/** Every canonical slug, in display order. */
export const GAME_SLUGS: readonly GameSlug[] = [
  "mario",
  "fuzzy-survivors",
  "minigolf",
  "nut-racer",
  "fuzzynuts-world",
  "rsc",
  "dragon-hoard",
  "cosmic-blaster",
  "snake",
  "breakout",
  "pong",
  "tetris",
  "asteroids",
  "flappy",
  "subway-runner",
  "jetpack",
  "ski-free",
  "doodle-jump",
  "2048",
  "memory",
  "minesweeper",
  "sudoku",
  "wordle",
  "tank-battle",
  "helicopter",
  "fruit-ninja",
  "tower-defense",
  "space-invaders",
  "boxing",
  "bowling",
  "archery",
  "surf-up",
  "rally",
] as const;

/**
 * Legacy ID → canonical slug mapping.
 *
 * Two ids did not match 1:1 with their slugs historically:
 *   - "survivors" → "fuzzy-survivors"
 *   - "racer"     → "nut-racer"  (also seen as "nutracer" in the broken submitter)
 *
 * Any new id must be added here, never inferred at call sites.
 */
export const ID_TO_SLUG: Record<string, GameSlug> = {
  // canonical ids = canonical slugs
  mario: "mario",
  "fuzzy-survivors": "fuzzy-survivors",
  minigolf: "minigolf",
  "nut-racer": "nut-racer",
  "fuzzynuts-world": "fuzzynuts-world",
  // legacy aliases (do not remove without a migration)
  survivors: "fuzzy-survivors",
  racer: "nut-racer",
  nutracer: "nut-racer", // the bug spelling — accept it as input, normalize to canonical
  rsc: "rsc",
  "dragon-hoard": "dragon-hoard",
  "cosmic-blaster": "cosmic-blaster",
  "snake": "snake",
  "breakout": "breakout",
  "pong": "pong",
  "tetris": "tetris",
  "asteroids": "asteroids",
  "flappy": "flappy",
  "subway-runner": "subway-runner",
  "jetpack": "jetpack",
  "ski-free": "ski-free",
  "doodle-jump": "doodle-jump",
  "2048": "2048",
  "memory": "memory",
  "minesweeper": "minesweeper",
  "sudoku": "sudoku",
  "wordle": "wordle",
  "tank-battle": "tank-battle",
  "helicopter": "helicopter",
  "fruit-ninja": "fruit-ninja",
  "tower-defense": "tower-defense",
  "space-invaders": "space-invaders",
  "boxing": "boxing",
  "bowling": "bowling",
  "archery": "archery",
  "surf-up": "surf-up",
  "rally": "rally",
};

/** Reverse: canonical slug → legacy id used by GAMES[] in the web-arcade UI. */
export const SLUG_TO_LEGACY_ID: Record<GameSlug, string> = {
  mario: "mario",
  "fuzzy-survivors": "survivors",
  minigolf: "minigolf",
  "nut-racer": "racer",
  "fuzzynuts-world": "fuzzynuts-world",
  rsc: "rsc",
  "dragon-hoard": "dragon-hoard",
  "cosmic-blaster": "cosmic-blaster",
  "snake": "snake",
  "breakout": "breakout",
  "pong": "pong",
  "tetris": "tetris",
  "asteroids": "asteroids",
  "flappy": "flappy",
  "subway-runner": "subway-runner",
  "jetpack": "jetpack",
  "ski-free": "ski-free",
  "doodle-jump": "doodle-jump",
  "2048": "2048",
  "memory": "memory",
  "minesweeper": "minesweeper",
  "sudoku": "sudoku",
  "wordle": "wordle",
  "tank-battle": "tank-battle",
  "helicopter": "helicopter",
  "fruit-ninja": "fruit-ninja",
  "tower-defense": "tower-defense",
  "space-invaders": "space-invaders",
  "boxing": "boxing",
  "bowling": "bowling",
  "archery": "archery",
  "surf-up": "surf-up",
  "rally": "rally",
};

/**
 * Normalize any incoming game identifier to a canonical slug.
 * Returns null for unknown inputs — callers must handle that explicitly
 * rather than silently falling through to a default.
 */
export function normalizeSlug(input: string | null | undefined): GameSlug | null {
  if (!input) return null;
  const lowered = input.toLowerCase().trim();
  return ID_TO_SLUG[lowered] ?? null;
}

/** Type guard. */
export function isGameSlug(value: unknown): value is GameSlug {
  return typeof value === "string" && (GAME_SLUGS as readonly string[]).includes(value);
}
