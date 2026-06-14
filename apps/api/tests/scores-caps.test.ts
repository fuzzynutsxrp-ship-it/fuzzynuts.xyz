import { describe, it, expect } from "vitest";
import { VALID_GAMES, SCORE_CAPS } from "../src/routes/scores";

/**
 * Tests for SCORE_CAPS and VALID_GAMES in the API scores route.
 *
 * TOUCHES MONEY CODE — these caps control which scores the server accepts.
 * Every game in GAME_CONFIG (game-loader.js) and gameRegistry.ts must be
 * represented here. Caps must match gameRegistry.ts exactly.
 */

// Authoritative cap values from gameRegistry.ts (the SSOT)
const GAME_REGISTRY_CAPS: Record<string, number> = {
  "mario": 9_999_990,
  "fuzzy-survivors": 5_000_000,
  "minigolf": 100_000,
  "nut-racer": 2_000_000,
  "fuzzynuts-world": 10_000_000,
  "rsc": 99_000_000,
  "dragon-hoard": 999_999,
  "cosmic-blaster": 999_999,
  "snake": 50_000,
  "breakout": 100_000,
  "pong": 11,
  "tetris": 999_999,
  "asteroids": 500_000,
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
  "tank-battle": 500_000,
  "helicopter": 99_999,
  "fruit-ninja": 999_999,
  "tower-defense": 999_999,
  "space-invaders": 99_999,
  "boxing": 99_999,
  "bowling": 300,
  "archery": 99_999,
  "surf-up": 99_999,
  "rally": 99_999,
  "maze-escape": 99_999,
  "frogger": 99_999,
  "bomberman": 99_999,
  "capture-flag": 99_999,
  "tower-stack": 99_999,
};

// Legacy slugs that must NOT appear in VALID_GAMES
const LEGACY_SLUGS = ["survivors", "racer", "nutracer"];

describe("VALID_GAMES", () => {
  it("contains all 38 FuzzyNuts game slugs", () => {
    expect(VALID_GAMES).toHaveLength(38);
  });

  it("includes every slug from gameRegistry.ts", () => {
    const gamesSet = new Set<string>(VALID_GAMES as readonly string[]);
    for (const slug of Object.keys(GAME_REGISTRY_CAPS)) {
      expect(gamesSet.has(slug)).toBe(true);
    }
  });

  it("does not contain legacy slugs (survivors, racer)", () => {
    for (const legacy of LEGACY_SLUGS) {
      expect(VALID_GAMES).not.toContain(legacy);
    }
  });

  it("has no duplicates", () => {
    const unique = new Set(VALID_GAMES);
    expect(unique.size).toBe(VALID_GAMES.length);
  });

  it("contains expected game slugs", () => {
    const expected = [
      "mario", "fuzzy-survivors", "minigolf", "nut-racer",
      "fuzzynuts-world", "rsc", "dragon-hoard", "cosmic-blaster",
      "snake", "breakout", "pong", "tetris", "asteroids", "flappy",
      "subway-runner", "jetpack", "ski-free", "doodle-jump", "2048",
      "memory", "minesweeper", "sudoku", "wordle", "tank-battle",
      "helicopter", "fruit-ninja", "tower-defense", "space-invaders",
      "boxing", "bowling", "archery", "surf-up", "rally", "maze-escape",
      "frogger", "bomberman", "capture-flag", "tower-stack",
    ];
    expect([...VALID_GAMES].sort()).toEqual(expected.sort());
  });
});

describe("SCORE_CAPS", () => {
  it("has an entry for every game in VALID_GAMES", () => {
    for (const slug of VALID_GAMES) {
      expect(SCORE_CAPS[slug]).toBeDefined();
      expect(SCORE_CAPS[slug]).toBeGreaterThan(0);
    }
  });

  it("has no orphan keys (every key is in VALID_GAMES)", () => {
    const gamesSet = new Set<string>(VALID_GAMES as readonly string[]);
    for (const key of Object.keys(SCORE_CAPS)) {
      expect(gamesSet.has(key)).toBe(true);
    }
  });

  it("caps match gameRegistry.ts exactly (the authoritative source)", () => {
    for (const [slug, expectedCap] of Object.entries(GAME_REGISTRY_CAPS)) {
      expect(SCORE_CAPS[slug]).toBe(expectedCap);
    }
  });

  it("no cap exceeds 100M (sanity ceiling)", () => {
    for (const [slug, cap] of Object.entries(SCORE_CAPS)) {
      expect(cap).toBeLessThanOrEqual(100_000_000);
    }
  });

  it("no cap is zero or negative", () => {
    for (const [slug, cap] of Object.entries(SCORE_CAPS)) {
      expect(cap).toBeGreaterThan(0);
    }
  });

  it("specific high-value games have correct caps", () => {
    expect(SCORE_CAPS["rsc"]).toBe(99_000_000);
    expect(SCORE_CAPS["fuzzynuts-world"]).toBe(10_000_000);
    expect(SCORE_CAPS["pong"]).toBe(11);
    expect(SCORE_CAPS["bowling"]).toBe(300);
    expect(SCORE_CAPS["flappy"]).toBe(999);
  });

  it("fuzzy-survivors cap matches (not legacy 'survivors')", () => {
    expect(SCORE_CAPS["fuzzy-survivors"]).toBe(5_000_000);
    expect(SCORE_CAPS["survivors"]).toBeUndefined();
  });

  it("nut-racer cap matches (not legacy 'racer')", () => {
    expect(SCORE_CAPS["nut-racer"]).toBe(2_000_000);
    expect(SCORE_CAPS["racer"]).toBeUndefined();
  });
});
