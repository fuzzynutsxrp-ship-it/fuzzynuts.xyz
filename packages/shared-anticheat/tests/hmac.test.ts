import { describe, it, expect } from "vitest";
import { signPayload, verifyPayload, buildScoreMessage } from "../src/hmac";

const SECRET = "test-secret-do-not-use-in-prod";

describe("hmac — sign/verify round-trip", () => {
  it("signs and verifies a simple message", async () => {
    const sig = await signPayload("hello", SECRET);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyPayload("hello", sig, SECRET)).toBe(true);
  });

  it("rejects a tampered message", async () => {
    const sig = await signPayload("hello", SECRET);
    expect(await verifyPayload("hello!", sig, SECRET)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const sig = await signPayload("hello", SECRET);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(await verifyPayload("hello", flipped, SECRET)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const sig = await signPayload("hello", SECRET);
    expect(await verifyPayload("hello", sig, "another-secret")).toBe(false);
  });

  it("rejects a non-hex signature without throwing", async () => {
    expect(await verifyPayload("hello", "zzz", SECRET)).toBe(false);
  });
});

describe("buildScoreMessage — canonical wire format", () => {
  it("produces a stable, deterministic string", () => {
    const msg = buildScoreMessage({
      game: "nut-racer",
      score: 12345,
      duration: 60,
      nonce: "abc",
      wallet: "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
      weekKey: "2026-W22",
    });
    expect(msg).toBe("nut-racer|12345|60|abc|rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh|2026-W22");
  });
});
