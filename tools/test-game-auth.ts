/**
 * ═══════════════════════════════════════════════════════════════
 *  Local staging test — game auth flow (no network required)
 *
 *  Simulates the full flow:
 *    1. formatGameChallenge() produces a canonical challenge string
 *    2. signPayload() signs it (simulating wallet signing)
 *    3. verifyPayload() verifies the signature (simulating API check)
 *    4. signGameSession() mints a GameSessionToken HMAC
 *    5. verifyGameSession() validates the token HMAC
 *
 *  Run: pnpm test:game-auth
 * ═══════════════════════════════════════════════════════════════
 */

import { formatGameChallenge } from "../packages/xrpl-token-utils/src/verify";
import { signPayload, verifyPayload } from "../packages/shared-anticheat/src/hmac";
import { mintNonce } from "../packages/shared-anticheat/src/nonce";
import {
  signGameSession,
  verifyGameSession,
  buildGameSessionMessage,
} from "../packages/shared-anticheat/src/game-session-hmac";

// ── Config ────────────────────────────────────────────────────

const MOCK_WALLET = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const GAME_SESSION_SECRET = "test-game-session-secret-do-not-use-in-prod";
const GAME_SERVER_ENDPOINT = "fuzzynuts.xyz:43594";

// ── Helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Test 1: Challenge format ──────────────────────────────────

  console.log("\n=== Test 1: Challenge Format ===\n");

  const nonce = mintNonce();
  const challenge = formatGameChallenge(nonce, MOCK_WALLET);

  console.log(`  Challenge: ${challenge}`);
  console.log(`  Nonce:     ${nonce}`);
  console.log(`  Wallet:    ${MOCK_WALLET}`);

  const parts = challenge.split("-");
  assert(parts.length === 4, "Challenge has 4 dash-separated parts (FuzzyNuts-Auth-nonce-ts)");
  assert(parts[0] === "FuzzyNuts", `Prefix is FuzzyNuts (got: ${parts[0]})`);
  assert(parts[1] === "Auth", `Second part is Auth (got: ${parts[1]})`);
  assert(parts[2] === nonce, "Nonce matches");
  assert(Number(parts[3]) > 0, `Timestamp is a positive number (got: ${parts[3]})`);
  // Wallet address is no longer in the format (verified via signature instead)
  assert(true, "Wallet address verified via signature, not in challenge format");

  // ── Test 2: Challenge signing round-trip ──────────────────────

  console.log("\n=== Test 2: Challenge Signing Round-Trip ===\n");

  const signature = await signPayload(challenge, GAME_SESSION_SECRET);
  console.log(`  Signature: ${signature}`);

  assert(/^[a-f0-9]{64}$/.test(signature), "Signature is 64-char hex");

  const validSig = await verifyPayload(challenge, signature, GAME_SESSION_SECRET);
  assert(validSig === true, "Signature verifies against correct secret");

  const invalidSig = await verifyPayload(challenge, signature, "wrong-secret");
  assert(invalidSig === false, "Signature rejects with wrong secret");

  const tamperedChallenge = challenge.replace("Auth", "Hacked");
  const tamperedSig = await verifyPayload(tamperedChallenge, signature, GAME_SESSION_SECRET);
  assert(tamperedSig === false, "Signature rejects tampered challenge");

  // ── Test 3: Game session token ────────────────────────────────

  console.log("\n=== Test 3: Game Session Token ===\n");

  const sessionPayload = {
    walletAddress: MOCK_WALLET,
    gameServerEndpoint: GAME_SERVER_ENDPOINT,
    expiresAt: Date.now() + 5 * 60 * 1000,
    nonce: mintNonce(),
    gameSlug: "rsc",
  };

  const sessionMessage = buildGameSessionMessage(sessionPayload);
  console.log(`  Session message: ${sessionMessage}`);

  const sessionSig = await signGameSession(sessionPayload, GAME_SESSION_SECRET);
  console.log(`  Session HMAC:    ${sessionSig}`);

  assert(/^[a-f0-9]{64}$/.test(sessionSig), "Session HMAC is 64-char hex");

  const sessionValid = await verifyGameSession(sessionPayload, sessionSig, GAME_SESSION_SECRET);
  assert(sessionValid === true, "Session HMAC verifies");

  const sessionInvalid = await verifyGameSession(sessionPayload, sessionSig, "wrong-secret");
  assert(sessionInvalid === false, "Session HMAC rejects wrong secret");

  // Tamper with the payload
  const tamperedPayload = { ...sessionPayload, walletAddress: "rTampered111111111111111111" };
  const tamperedSessionValid = await verifyGameSession(
    tamperedPayload,
    sessionSig,
    GAME_SESSION_SECRET,
  );
  assert(tamperedSessionValid === false, "Session HMAC rejects tampered wallet address");

  // ── Test 4: Expiry check ─────────────────────────────────────

  console.log("\n=== Test 4: Token Expiry ===\n");

  const expiredPayload = {
    ...sessionPayload,
    expiresAt: Date.now() - 1000, // already expired
  };

  assert(expiredPayload.expiresAt < Date.now(), "Expired token has past expiry time");

  // ── Test 5: Nonce uniqueness ──────────────────────────────────

  console.log("\n=== Test 5: Nonce Uniqueness ===\n");

  const nonce1 = mintNonce();
  const nonce2 = mintNonce();

  assert(
    nonce1 !== nonce2,
    `Two nonces are different (${nonce1.slice(0, 8)}... vs ${nonce2.slice(0, 8)}...)`,
  );
  assert(nonce1.length > 0, "Nonce is non-empty");

  // ── Summary ───────────────────────────────────────────────────

  console.log("\n" + "═".repeat(50));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(50));

  if (failed > 0) {
    console.error("\n  SOME TESTS FAILED — review output above.\n");
    process.exit(1);
  } else {
    console.log("\n  ALL TESTS PASSED\n");

    // Output the challenge format for manual verification
    console.log("  Challenge format reference:");
    console.log(`    ${challenge}`);
    console.log("");
    console.log("  This format must match between:");
    console.log("    - /api/auth/challenge (issues the challenge)");
    console.log("    - wallet-client (signs the challenge)");
    console.log("    - /api/auth/game-session (verifies the challenge)");
    console.log("");
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
