/**
 * ═══════════════════════════════════════════════════════════════
 *  Challenge format verification test
 *
 *  Validates that:
 *    1. formatGameChallenge produces a deterministic canonical string
 *    2. The challenge format matches between issuer (API) and signer (wallet)
 *    3. HMAC round-trip works with the challenge as the signed message
 *    4. Real XRPL keypair sign→verify round-trip works with UTF-8 encoding
 *
 *  This test runs entirely offline — no XRPL network calls.
 * ═══════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatGameChallenge, verifyMessageSignature } from "../src/verify";
import { signPayload, verifyPayload } from "@fuzzynuts/shared-anticheat";
import { Wallet, verifyKeypairSignature, deriveAddress } from "xrpl";
import { deriveKeypair, sign } from "ripple-keypairs";

// ── Test helpers ──────────────────────────────────────────────

const MOCK_WALLET = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

/** Deterministic nonce for reproducible tests. */
const FIXED_NONCE = "dGVzdC1ub25jZS0xMjM0";

// ── formatGameChallenge ───────────────────────────────────────

describe("formatGameChallenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces FuzzyNuts-Auth-nonce-timestamp format", () => {
    const challenge = formatGameChallenge(FIXED_NONCE, MOCK_WALLET);

    expect(challenge).toMatch(/^FuzzyNuts-Auth-/);
    expect(challenge).toContain(FIXED_NONCE);
    expect(challenge).toContain("1768478400000");

    console.log("[CHALLENGE FORMAT]", challenge);
  });

  it("challenge parts are: FuzzyNuts-Auth-{nonce}-{timestamp}", () => {
    const challenge = formatGameChallenge(FIXED_NONCE, MOCK_WALLET);
    const parts = challenge.split("-");

    // FuzzyNuts, Auth, nonce, timestamp
    expect(parts[0]).toBe("FuzzyNuts");
    expect(parts[1]).toBe("Auth");
    expect(parts[2]).toBe(FIXED_NONCE);
    expect(Number(parts[3])).toBeGreaterThan(0);
  });

  it("ignores wallet and domain params (backwards compat)", () => {
    const c1 = formatGameChallenge(FIXED_NONCE, "rAAAA...");
    const c2 = formatGameChallenge(FIXED_NONCE, MOCK_WALLET, "custom.domain");
    // Both should produce the same format (wallet/domain ignored)
    expect(c1).toMatch(/^FuzzyNuts-Auth-/);
    expect(c2).toMatch(/^FuzzyNuts-Auth-/);
  });
});

// ── HMAC round-trip with challenge ────────────────────────────

describe("challenge HMAC round-trip", () => {
  const SECRET = "test-game-session-secret-do-not-use-in-prod";

  it("sign and verify a challenge message", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

    const challenge = formatGameChallenge(FIXED_NONCE, MOCK_WALLET);
    console.log("[HMAC TEST] challenge:", challenge);

    const signature = await signPayload(challenge, SECRET);
    console.log("[HMAC TEST] signature:", signature);

    expect(signature).toMatch(/^[a-f0-9]{64}$/);

    const valid = await verifyPayload(challenge, signature, SECRET);
    expect(valid).toBe(true);

    const tampered = challenge.replace("Auth", "Hacked");
    const tamperedValid = await verifyPayload(tampered, signature, SECRET);
    expect(tamperedValid).toBe(false);

    const wrongSecretValid = await verifyPayload(challenge, signature, "wrong-secret");
    expect(wrongSecretValid).toBe(false);

    vi.useRealTimers();
  });

  it("challenge from two calls with same nonce but different time differs", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const challenge1 = formatGameChallenge(FIXED_NONCE, MOCK_WALLET);

    vi.setSystemTime(new Date("2026-01-15T12:01:00Z"));
    const challenge2 = formatGameChallenge(FIXED_NONCE, MOCK_WALLET);

    expect(challenge1).not.toBe(challenge2);
    expect(challenge1).toContain(FIXED_NONCE);
    expect(challenge2).toContain(FIXED_NONCE);

    vi.useRealTimers();
  });
});

// ── verifyMessageSignature (offline, structural only) ─────────

describe("verifyMessageSignature — structure", () => {
  it("returns error result for malformed inputs", () => {
    const result = verifyMessageSignature({
      message: "test",
      signature: "deadbeef",
      publicKey: "02" + "aa".repeat(32),
      expectedAddress: MOCK_WALLET,
    });

    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("derivedAddress");
    expect(result).toHaveProperty("addressMatch");

    console.log("[VERIFY STRUCT] result:", JSON.stringify(result));
  });

  it("returns false for empty signature", () => {
    const result = verifyMessageSignature({
      message: "test",
      signature: "",
      publicKey: "02" + "aa".repeat(32),
      expectedAddress: MOCK_WALLET,
    });

    expect(result.valid).toBe(false);
  });
});

// ── Real XRPL keypair round-trip ──────────────────────────────

describe("verifyMessageSignature — real XRPL keypair round-trip", () => {
  it("signs a UTF-8 challenge and verifies with verifyKeypairSignature", () => {
    // Generate a real XRPL wallet
    const wallet = Wallet.generate();
    const kp = deriveKeypair(wallet.seed);

    // Produce the canonical challenge
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const challenge = formatGameChallenge("test-nonce-abc", wallet.address);
    vi.useRealTimers();

    // Wallet signs the raw UTF-8 bytes (hex-encoded for ripple-keypairs.sign)
    const messageHex = Buffer.from(challenge, "utf-8").toString("hex");
    const signature = sign(messageHex, kp.privateKey);

    // Backend verifies via verifyMessageSignature
    const result = verifyMessageSignature({
      message: challenge,
      signature,
      publicKey: wallet.publicKey,
      expectedAddress: wallet.address,
    });

    console.log("[REAL KEYPAIR] challenge:", challenge);
    console.log("[REAL KEYPAIR] signature:", signature);
    console.log("[REAL KEYPAIR] result:", JSON.stringify(result));

    expect(result.valid).toBe(true);
    expect(result.addressMatch).toBe(true);
    expect(result.derivedAddress).toBe(wallet.address);
  });

  it("rejects a tampered challenge with real keypair", () => {
    const wallet = Wallet.generate();
    const kp = deriveKeypair(wallet.seed);

    const challenge = formatGameChallenge("test-nonce-xyz", wallet.address);
    const messageHex = Buffer.from(challenge, "utf-8").toString("hex");
    const signature = sign(messageHex, kp.privateKey);

    // Tamper with the challenge
    const tamperedChallenge = challenge.replace("Auth", "Hacked");
    const result = verifyMessageSignature({
      message: tamperedChallenge,
      signature,
      publicKey: wallet.publicKey,
      expectedAddress: wallet.address,
    });

    expect(result.valid).toBe(false);
  });

  it("rejects when address does not match public key", () => {
    const wallet = Wallet.generate();
    const otherWallet = Wallet.generate();
    const kp = deriveKeypair(wallet.seed);

    const challenge = formatGameChallenge("test-nonce-addr", wallet.address);
    const messageHex = Buffer.from(challenge, "utf-8").toString("hex");
    const signature = sign(messageHex, kp.privateKey);

    const result = verifyMessageSignature({
      message: challenge,
      signature,
      publicKey: wallet.publicKey,
      expectedAddress: otherWallet.address, // wrong address
    });

    expect(result.valid).toBe(true); // signature is valid
    expect(result.addressMatch).toBe(false); // but address doesn't match
  });

  it("full encoding chain: UTF-8 → hex → sign → verify", () => {
    const wallet = Wallet.generate();
    const kp = deriveKeypair(wallet.seed);

    // The challenge is a plain UTF-8 string
    const challenge = "FuzzyNuts-Auth-" + "test123" + "-" + Date.now();
    expect(challenge).toMatch(/^FuzzyNuts-Auth-/);

    // Wallet side: sign the UTF-8 bytes
    const messageHex = Buffer.from(challenge, "utf-8").toString("hex");
    const signature = sign(messageHex, kp.privateKey);

    // Backend side: verify using the same UTF-8 string
    const result = verifyMessageSignature({
      message: challenge,
      signature,
      publicKey: wallet.publicKey,
      expectedAddress: wallet.address,
    });

    expect(result.valid).toBe(true);
    expect(result.addressMatch).toBe(true);

    // Direct verifyKeypairSignature also works
    const directValid = verifyKeypairSignature(messageHex, signature, wallet.publicKey);
    expect(directValid).toBe(true);

    // Derive address matches
    const derived = deriveAddress(wallet.publicKey);
    expect(derived).toBe(wallet.address);
  });
});
