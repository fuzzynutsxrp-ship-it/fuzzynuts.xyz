import { describe, it, expect } from "vitest";
import { mintSessionToken, verifySessionToken } from "../src/session-token";

const SIGNING_SECRET = "session-secret-for-tests-only";

describe("session token — mint / verify", () => {
  const claims = {
    game: "fuzzy-survivors" as const,
    wallet: "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
    weekKey: "2026-W22",
    exp: Date.now() + 60_000,
  };

  it("round-trips a freshly minted token", async () => {
    const { token } = await mintSessionToken(claims, SIGNING_SECRET);
    const result = await verifySessionToken(token, SIGNING_SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.claims.game).toBe("fuzzy-survivors");
      expect(result.claims.wallet).toBe(claims.wallet);
    }
  });

  it("includes a unique per-session secret", async () => {
    const a = await mintSessionToken(claims, SIGNING_SECRET);
    const b = await mintSessionToken(claims, SIGNING_SECRET);
    expect(a.claims.secret).not.toBe(b.claims.secret);
    expect(a.claims.jti).not.toBe(b.claims.jti);
  });

  it("rejects an expired token", async () => {
    const { token } = await mintSessionToken({ ...claims, exp: Date.now() - 1 }, SIGNING_SECRET);
    const result = await verifySessionToken(token, SIGNING_SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("rejects a tampered token", async () => {
    const { token } = await mintSessionToken(claims, SIGNING_SECRET);
    const idx = token.lastIndexOf(".");
    const tampered = token.slice(0, idx) + "X" + token.slice(idx);
    const result = await verifySessionToken(tampered, SIGNING_SECRET);
    expect(result.ok).toBe(false);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const { token } = await mintSessionToken(claims, SIGNING_SECRET);
    const result = await verifySessionToken(token, "different-secret");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad-signature");
  });

  it("rejects malformed input without throwing", async () => {
    expect((await verifySessionToken("garbage", SIGNING_SECRET)).ok).toBe(false);
    expect((await verifySessionToken("", SIGNING_SECRET)).ok).toBe(false);
  });
});
