import { describe, it, expect } from "vitest";
import { GAME_SLUGS } from "../src/constants/slugs";
import { SCORE_CAPS, getScoreCap, MIN_PLAY_DURATION_SECONDS } from "../src/constants/score-caps";

describe("SCORE_CAPS — single source of truth", () => {
  it("every slug in GAME_SLUGS has a cap", () => {
    for (const slug of GAME_SLUGS) {
      expect(SCORE_CAPS[slug]).toBeGreaterThan(0);
    }
  });

  it("every cap key is a known slug (no orphans)", () => {
    const known = new Set<string>(GAME_SLUGS);
    for (const key of Object.keys(SCORE_CAPS)) {
      expect(known.has(key)).toBe(true);
    }
  });

  it("getScoreCap returns the cap for canonical slugs", () => {
    expect(getScoreCap("nut-racer")).toBe(2_000_000);
    expect(getScoreCap("fuzzy-survivors")).toBe(5_000_000);
  });

  it("MIN_PLAY_DURATION_SECONDS is conservative enough to reject scripted bots", () => {
    expect(MIN_PLAY_DURATION_SECONDS).toBeGreaterThanOrEqual(5);
  });

  it("no cap is set absurdly high (sanity ceiling)", () => {
    for (const slug of GAME_SLUGS) {
      expect(SCORE_CAPS[slug]).toBeLessThanOrEqual(100_000_000);
    }
  });
});
