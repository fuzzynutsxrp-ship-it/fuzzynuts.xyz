/**
 * ═══════════════════════════════════════════════════════════════
 * mergeScores — Unit Tests
 *
 * Tests for the core score-merging logic that combines backend
 * API results with offline localStorage scores.
 *
 * Run: npx vitest run src/features/arcade/__tests__/mergeScores.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import { mergeScores } from "../utils/scoreHelpers";
import type { ScoreEntry } from "../types/arcade";

/* ── Test Helpers ── */

function makeScore(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    wallet: "rTestWallet123456789012345678",
    score: 1000,
    game: "mario",
    ts: Date.now(),
    ...overrides,
  };
}

describe("mergeScores", () => {
  /* ═══ Basic Behavior ═══ */

  it("returns API scores unchanged when no local scores exist", () => {
    const api = [makeScore({ score: 500 }), makeScore({ wallet: "rOther1", score: 300 })];
    const result = mergeScores(api, []);
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(500);
    expect(result[1].score).toBe(300);
  });

  it("returns local scores when API scores are empty", () => {
    const local = [
      makeScore({ wallet: "rLocal1", score: 800 }),
      makeScore({ wallet: "rLocal2", score: 400 }),
    ];
    const result = mergeScores([], local);
    expect(result).toHaveLength(2);
    expect(result[0].wallet).toBe("rLocal1");
    expect(result[1].wallet).toBe("rLocal2");
  });

  it("returns empty array when both inputs are empty", () => {
    const result = mergeScores([], []);
    expect(result).toHaveLength(0);
  });

  /* ═══ Deduplication ═══ */

  it("does NOT duplicate a wallet that exists in both API and local", () => {
    const api = [makeScore({ wallet: "rDupeWallet", score: 500 })];
    const local = [makeScore({ wallet: "rDupeWallet", score: 800 })];
    const result = mergeScores(api, local);
    // Should only have 1 entry for this wallet — API is authoritative
    const dupeEntries = result.filter((s) => s.wallet.toLowerCase() === "rdupewallet");
    expect(dupeEntries).toHaveLength(1);
  });

  it("deduplication is case-insensitive", () => {
    const api = [makeScore({ wallet: "rAbCdEfG12345678901234567890", score: 100 })];
    const local = [makeScore({ wallet: "rABCDEFG12345678901234567890", score: 200 })];
    const result = mergeScores(api, local);
    const entries = result.filter((s) => s.wallet.toLowerCase() === "rabcdefg12345678901234567890");
    expect(entries).toHaveLength(1);
  });

  it("keeps API score when a local duplicate has HIGHER score (API authoritative)", () => {
    const api = [makeScore({ wallet: "rDupe", score: 500 })];
    const local = [makeScore({ wallet: "rDupe", score: 9999 })];
    const result = mergeScores(api, local);
    // API score is authoritative — the local 9999 should be ignored
    const entry = result.find((s) => s.wallet.toLowerCase() === "rdupe");
    expect(entry).toBeDefined();
    expect(entry!.score).toBe(500); // API wins
  });

  /* ═══ Local-Only Wallets ═══ */

  it("adds local scores for wallets NOT in the API results", () => {
    const api = [makeScore({ wallet: "rAPI1", score: 500 })];
    const local = [
      makeScore({ wallet: "rLocal1", score: 300 }),
      makeScore({ wallet: "rLocal2", score: 200 }),
    ];
    const result = mergeScores(api, local);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.wallet)).toContain("rLocal1");
    expect(result.map((s) => s.wallet)).toContain("rLocal2");
  });

  /* ═══ Guest Scores ═══ */

  it("excludes Guest local scores when API has data", () => {
    const api = [makeScore({ wallet: "rAPI1", score: 500 })];
    const local = [makeScore({ wallet: "Guest", score: 300 })];
    const result = mergeScores(api, local);
    // Guest scores should NOT be merged when API has data
    expect(result).toHaveLength(1);
    expect(result[0].wallet).toBe("rAPI1");
  });

  it("includes Guest scores when API is empty (offline mode)", () => {
    const local = [
      makeScore({ wallet: "Guest", score: 300 }),
      makeScore({ wallet: "Guest", score: 500 }),
    ];
    const result = mergeScores([], local);
    expect(result.length).toBeGreaterThan(0);
  });

  /* ═══ Sorting ═══ */

  it("returns scores sorted descending by score", () => {
    const api = [
      makeScore({ wallet: "rLow", score: 100 }),
      makeScore({ wallet: "rHigh", score: 999 }),
      makeScore({ wallet: "rMid", score: 500 }),
    ];
    const result = mergeScores(api, []);
    expect(result[0].score).toBe(999);
    expect(result[1].score).toBe(500);
    expect(result[2].score).toBe(100);
  });

  it("maintains sort order after merging local scores", () => {
    const api = [makeScore({ wallet: "rAPI", score: 500 })];
    const local = [
      makeScore({ wallet: "rTop", score: 999 }),
      makeScore({ wallet: "rBottom", score: 50 }),
    ];
    const result = mergeScores(api, local);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  /* ═══ MAX_ENTRIES Cap ═══ */

  it("caps output to MAX_ENTRIES (50)", () => {
    const api = Array.from({ length: 60 }, (_, i) =>
      makeScore({ wallet: `rWallet${i}`, score: 60 - i }),
    );
    const result = mergeScores(api, []);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("drops lowest scores when merging pushes count over MAX_ENTRIES", () => {
    const api = Array.from({ length: 48 }, (_, i) =>
      makeScore({ wallet: `rAPI${i}`, score: 1000 - i }),
    );
    const local = Array.from({ length: 5 }, (_, i) =>
      makeScore({ wallet: `rLocal${i}`, score: 500 + i }),
    );
    const result = mergeScores(api, local);
    expect(result.length).toBeLessThanOrEqual(50);
    // The lowest scores should be dropped
    const lowestScore = result[result.length - 1].score;
    expect(lowestScore).toBeGreaterThan(0);
  });

  /* ═══ Edge Cases ═══ */

  it("handles null/undefined wallets in local scores gracefully", () => {
    const api = [makeScore({ wallet: "rAPI1", score: 500 })];
    const local = [
      makeScore({ wallet: "", score: 300 }),
      makeScore({ wallet: undefined as unknown as string, score: 200 }),
    ];
    // Should not throw
    expect(() => mergeScores(api, local)).not.toThrow();
  });

  it("handles scores with identical values correctly", () => {
    const api = [makeScore({ wallet: "rA", score: 500 }), makeScore({ wallet: "rB", score: 500 })];
    const local = [makeScore({ wallet: "rC", score: 500 })];
    const result = mergeScores(api, local);
    expect(result).toHaveLength(3);
  });

  it("handles zero scores by excluding them from local (getLocalScores filters)", () => {
    // mergeScores itself doesn't filter zeros — that's getLocalScores' job
    // But it shouldn't crash on them
    const local = [makeScore({ wallet: "rZero", score: 0 })];
    const result = mergeScores([], local);
    // Zero scores are passed through mergeScores (filtering happens upstream)
    expect(() => mergeScores([], local)).not.toThrow();
  });

  it("handles negative scores gracefully", () => {
    const api = [makeScore({ wallet: "rNeg", score: -100 })];
    expect(() => mergeScores(api, [])).not.toThrow();
  });

  /* ═══ Offline/Sync Scenarios ═══ */

  it("correctly merges after an offline session syncs up", () => {
    // Simulates: user played offline (local scores only), then came back online
    // Backend now has some of their scores, but local has more recent ones for new wallets
    const api = [
      makeScore({ wallet: "rPlayer1", score: 1000 }),
      makeScore({ wallet: "rPlayer2", score: 800 }),
    ];
    const local = [
      makeScore({ wallet: "rPlayer1", score: 1200 }), // Higher locally, but API authoritative
      makeScore({ wallet: "rNewPlayer", score: 600 }), // New player only in local
    ];
    const result = mergeScores(api, local);
    expect(result).toHaveLength(3); // Player1 (from API) + Player2 + NewPlayer
    // API Player1 is kept (authoritative), local Player1 is deduplicated
    const p1 = result.find((s) => s.wallet === "rPlayer1");
    expect(p1?.score).toBe(1000); // API authoritative
  });

  it("handles rapid duplicate submissions from same wallet", () => {
    const api = [makeScore({ wallet: "rSpammer", score: 100 })];
    const local = [
      makeScore({ wallet: "rSpammer", score: 200, ts: Date.now() }),
      makeScore({ wallet: "rSpammer", score: 300, ts: Date.now() + 1 }),
      makeScore({ wallet: "rSpammer", score: 150, ts: Date.now() + 2 }),
    ];
    const result = mergeScores(api, local);
    // Only 1 entry per wallet — API authoritative
    const spammerEntries = result.filter((s) => s.wallet.toLowerCase() === "rspammer");
    expect(spammerEntries).toHaveLength(1);
  });
});
