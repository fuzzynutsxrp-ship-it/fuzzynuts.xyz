import { describe, it, expect } from "vitest";
import { ScorePayloadSchema } from "../src/schema/score";

describe("ScorePayloadSchema — discriminated union", () => {
  const baseValid = {
    game: "fuzzy-survivors" as const,
    score: 100_000,
    duration: 60,
    timestamp: Date.now(),
    weekKey: "2026-W22",
  };

  it("accepts a well-formed guest payload", () => {
    const parsed = ScorePayloadSchema.safeParse({ kind: "guest", ...baseValid });
    expect(parsed.success).toBe(true);
  });

  it("accepts a well-formed scored payload", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "scored",
      ...baseValid,
      wallet: "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
      nonce: "abcdefghijklmnop1234",
      hash: "a".repeat(64),
      sessionToken: "tk_" + "x".repeat(32),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a scored payload missing HMAC hash (the bug pre-migration)", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "scored",
      ...baseValid,
      wallet: "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
      nonce: "abcdefghijklmnop1234",
      sessionToken: "tk_" + "x".repeat(32),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown game slugs", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "guest",
      ...baseValid,
      game: "nutracer", // the typo — must be rejected at the schema layer
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects durations below MIN_PLAY_DURATION_SECONDS", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "guest",
      ...baseValid,
      duration: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects malformed XRPL addresses", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "scored",
      ...baseValid,
      wallet: "0xNotAnXrplAddress",
      nonce: "abcdefghijklmnop1234",
      hash: "a".repeat(64),
      sessionToken: "tk_x",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects extra unknown fields (strict mode)", () => {
    const parsed = ScorePayloadSchema.safeParse({
      kind: "guest",
      ...baseValid,
      foo: "bar",
    } as unknown);
    expect(parsed.success).toBe(false);
  });
});
