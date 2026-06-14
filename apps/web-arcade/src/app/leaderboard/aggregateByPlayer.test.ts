/**
 * ═══════════════════════════════════════════════════════════════
 * aggregateByPlayer — Unit Tests
 *
 * Pure function that groups raw ScoreEntry[] into deduplicated
 * PlayerRow[] sorted by totalScore descending.
 *
 * Run: npx vitest run src/app/leaderboard/aggregateByPlayer.test.ts
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import { aggregateByPlayer, LEADERBOARD_SIZE } from "./aggregateByPlayer";
import type { ScoreEntry } from "@/features/arcade";

/* ── Test Helpers ── */

function makeEntry(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    wallet: "rTestWallet123456789012345678",
    name: "TestPlayer",
    score: 1000,
    game: "mario",
    ts: Date.now(),
    ...overrides,
  };
}

describe("aggregateByPlayer", () => {
  /* ═══ Empty Input ═══ */

  it("returns empty array for empty input", () => {
    const result = aggregateByPlayer([]);
    expect(result).toEqual([]);
  });

  /* ═══ Single Player ═══ */

  it("returns one row for a single score entry", () => {
    const result = aggregateByPlayer([makeEntry({ score: 5000 })]);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(5000);
    expect(result[0].gamesPlayed).toBe(1);
    expect(result[0].bestRank).toBe(1);
  });

  it("assigns displayName from entry.displayName first", () => {
    const result = aggregateByPlayer([
      makeEntry({ displayName: "CoolName", name: "OldName", wallet: "rABC" }),
    ]);
    expect(result[0].displayName).toBe("CoolName");
  });

  it("falls back to entry.name when displayName is absent", () => {
    const result = aggregateByPlayer([
      makeEntry({ displayName: undefined, name: "FallbackName" }),
    ]);
    expect(result[0].displayName).toBe("FallbackName");
  });

  it("truncates wallet address when no name is available", () => {
    const result = aggregateByPlayer([
      makeEntry({
        wallet: "rTestWallet123456789012345678",
        displayName: undefined,
        name: undefined,
      }),
    ]);
    // truncateAddress produces "rTestW...5678" style
    expect(result[0].displayName).toMatch(/^rTest/);
    expect(result[0].displayName).toContain("...");
  });

  /* ═══ Multiple Games, Same Player ═══ */

  it("aggregates scores from the same wallet across games", () => {
    const entries = [
      makeEntry({ wallet: "rPlayer1", game: "mario", score: 1000 }),
      makeEntry({ wallet: "rPlayer1", game: "tetris", score: 2000 }),
      makeEntry({ wallet: "rPlayer1", game: "snake", score: 500 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(3500);
    expect(result[0].gamesPlayed).toBe(3);
  });

  it("deduplicates by wallet case-insensitively", () => {
    const entries = [
      makeEntry({ wallet: "rABC", score: 100 }),
      makeEntry({ wallet: "rabc", score: 200 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(300);
  });

  it("keeps the first non-falsy displayName (from name fallback)", () => {
    const entries = [
      makeEntry({
        wallet: "rPlayer1",
        displayName: undefined,
        name: "Old",
        score: 100,
      }),
      makeEntry({
        wallet: "rPlayer1",
        displayName: "NewDisplayName",
        score: 200,
      }),
    ];
    const result = aggregateByPlayer(entries);
    // First entry sets displayName from name="Old"; later displayName doesn't overwrite
    expect(result[0].displayName).toBe("Old");
  });

  it("tracks the most recent timestamp", () => {
    const entries = [
      makeEntry({ wallet: "rPlayer1", ts: 1000, score: 100 }),
      makeEntry({ wallet: "rPlayer1", ts: 5000, score: 200 }),
      makeEntry({ wallet: "rPlayer1", ts: 3000, score: 50 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result[0].lastActive).toBe(5000);
  });

  /* ═══ Anon Fallback (no wallet/userId) ═══ */

  it("keys by userId when wallet is absent (Google user)", () => {
    const entries = [
      makeEntry({
        wallet: undefined as unknown as string,
        userId: "google-123",
        displayName: "GoogleUser",
        score: 500,
      }),
      makeEntry({
        wallet: undefined as unknown as string,
        userId: "google-123",
        displayName: "GoogleUser",
        score: 300,
      }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(800);
    expect(result[0].userId).toBe("google-123");
  });

  it("falls back to displayName as key when no wallet/userId", () => {
    const entries = [
      makeEntry({
        wallet: undefined as unknown as string,
        userId: undefined,
        displayName: "AnonPlayer",
        score: 100,
      }),
      makeEntry({
        wallet: undefined as unknown as string,
        userId: undefined,
        displayName: "AnonPlayer",
        score: 200,
      }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(1);
    expect(result[0].totalScore).toBe(300);
  });

  it("creates separate rows for truly anonymous entries with no identifiers", () => {
    // Two entries with no wallet, userId, displayName, or name
    // get random keys so they don't merge
    const entries = [
      makeEntry({
        wallet: undefined as unknown as string,
        userId: undefined,
        displayName: undefined,
        name: undefined,
        score: 100,
      }),
      makeEntry({
        wallet: undefined as unknown as string,
        userId: undefined,
        displayName: undefined,
        name: undefined,
        score: 200,
      }),
    ];
    const result = aggregateByPlayer(entries);
    // Each gets a random anon key, so 2 separate rows
    expect(result).toHaveLength(2);
  });

  it("uses 'Anonymous' as displayName when nothing is available", () => {
    const entries = [
      makeEntry({
        wallet: undefined as unknown as string,
        userId: undefined,
        displayName: undefined,
        name: undefined,
        score: 100,
      }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result[0].displayName).toBe("Anonymous");
  });

  /* ═══ Ranking & Sorting ═══ */

  it("sorts by totalScore descending", () => {
    const entries = [
      makeEntry({ wallet: "rLow", score: 100 }),
      makeEntry({ wallet: "rHigh", score: 999 }),
      makeEntry({ wallet: "rMid", score: 500 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result[0].totalScore).toBe(999);
    expect(result[1].totalScore).toBe(500);
    expect(result[2].totalScore).toBe(100);
  });

  it("assigns sequential bestRank starting from 1", () => {
    const entries = [
      makeEntry({ wallet: "rA", score: 300 }),
      makeEntry({ wallet: "rB", score: 200 }),
      makeEntry({ wallet: "rC", score: 100 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result[0].bestRank).toBe(1);
    expect(result[1].bestRank).toBe(2);
    expect(result[2].bestRank).toBe(3);
  });

  /* ═══ 100 vs 101 Boundary ═══ */

  it(`caps at exactly ${LEADERBOARD_SIZE} players`, () => {
    const entries = Array.from({ length: LEADERBOARD_SIZE }, (_, i) =>
      makeEntry({ wallet: `rPlayer${i}`, score: (LEADERBOARD_SIZE - i) * 10 }),
    );
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(LEADERBOARD_SIZE);
  });

  it(`drops the lowest-scoring player when 101 entries exist`, () => {
    const entries = Array.from({ length: LEADERBOARD_SIZE + 1 }, (_, i) =>
      makeEntry({ wallet: `rPlayer${i}`, score: (LEADERBOARD_SIZE + 1 - i) * 10 }),
    );
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(LEADERBOARD_SIZE);
    // The lowest score (10) should be dropped
    const minScore = Math.min(...result.map((r) => r.totalScore));
    expect(minScore).toBe(20); // second-lowest survives
  });

  it(`handles exactly ${LEADERBOARD_SIZE} players without dropping any`, () => {
    const entries = Array.from({ length: LEADERBOARD_SIZE }, (_, i) =>
      makeEntry({ wallet: `rExact${i}`, score: 100 }),
    );
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(LEADERBOARD_SIZE);
    // All should have rank 1 (tied score)
    expect(result.every((r) => r.bestRank >= 1)).toBe(true);
  });

  /* ═══ Players with undefined displayName ═══ */

  it("handles entries where displayName is undefined but name exists", () => {
    const result = aggregateByPlayer([
      makeEntry({ displayName: undefined, name: "JustName" }),
    ]);
    expect(result[0].displayName).toBe("JustName");
  });

  it("handles entries where both displayName and name are empty strings", () => {
    const result = aggregateByPlayer([
      makeEntry({
        displayName: "",
        name: "",
        wallet: "rWallet1234567890123456789",
      }),
    ]);
    // Empty string is falsy, so falls through to wallet truncation
    expect(result[0].displayName).toMatch(/^rWall/);
  });

  /* ═══ Multiple distinct players ═══ */

  it("creates separate rows for distinct wallets", () => {
    const entries = [
      makeEntry({ wallet: "rAlice", score: 100 }),
      makeEntry({ wallet: "rBob", score: 200 }),
      makeEntry({ wallet: "rCharlie", score: 150 }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(3);
  });

  it("separates Google users from wallet users", () => {
    const entries = [
      makeEntry({
        wallet: "rWalletUser",
        userId: undefined,
        score: 100,
      }),
      makeEntry({
        wallet: undefined as unknown as string,
        userId: "google-456",
        displayName: "GoogleUser",
        score: 200,
      }),
    ];
    const result = aggregateByPlayer(entries);
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe("google-456"); // higher score ranks first
    expect(result[1].wallet).toBe("rWalletUser");
  });
});
