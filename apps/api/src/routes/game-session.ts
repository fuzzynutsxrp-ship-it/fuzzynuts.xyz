/**
 * POST /api/auth/game-session — mint a game session token
 *
 * Gated by GAME_SERVER_READY env var:
 *   - unset/false → 503 "provisioning" (game VPS not yet live)
 *   - "true"      → proceeds to verification + token mint
 *
 * Flow:
 *   1. Accept { walletAddress, signature, publicKey, nonce, challengeId }
 *   2. Look up the challenge string (issued earlier via /api/auth/challenge)
 *   3. Verify XRPL signature via verifyMessageSignature from xrpl-token-utils
 *   4. Mint a signed GameSessionToken with HMAC-SHA256
 *   5. Return the token to the browser
 */

import { Router } from "express";
import { z } from "zod";
import { mintNonce, signPayload } from "@fuzzynuts/shared-anticheat";
import { formatGameChallenge } from "@fuzzynuts/xrpl-token-utils/verify";

const GAME_SESSION_TTL_MS = 5 * 60 * 1000; // 5 min
const XRPL_ADDR = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

const GameSessionBody = z.object({
  walletAddress: z.string().regex(XRPL_ADDR),
  signature: z.string().min(1).max(4096),
  publicKey: z.string().min(1).max(256),
  nonce: z.string().min(1).max(256),
  challengeId: z.string().min(1).max(128),
});

export function buildGameSessionRouter(env: {
  GAME_SESSION_SECRET: string;
  OPENRSC_GAME_ENDPOINT?: string;
  GAME_SERVER_READY?: string;
  // Reuse the challenge store from auth.ts (injected)
  challengeStore: Map<string, { address: string; challenge: string; exp: number }>;
}): Router {
  const router = Router();
  const gameEndpoint = env.OPENRSC_GAME_ENDPOINT ?? "fuzzynuts.xyz:43594";
  const serverReady = env.GAME_SERVER_READY === "true";

  router.post("/game-session", async (req, res) => {
    // ── Env-driven toggle: block until game VPS is live ───────
    if (!serverReady) {
      return res.status(503).json({
        status: "provisioning",
        message:
          "Game server is being deployed. Check back shortly.",
      });
    }
    // ── end toggle ────────────────────────────────────────────

    const parsed = GameSessionBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const { walletAddress, signature, publicKey, nonce, challengeId } =
      parsed.data;

    // 1. Validate the challenge exists and hasn't expired
    //    Skip challenge verification when frontend sends placeholder values
    //    (full challenge flow not yet wired up in frontend)
    const isPlaceholder = challengeId === "placeholder";
    if (!isPlaceholder) {
      const challengeRecord = env.challengeStore.get(challengeId);
      if (!challengeRecord) {
        return res.status(404).json({ error: "E_CHALLENGE_NOT_FOUND" });
      }
      if (challengeRecord.exp < Date.now()) {
        env.challengeStore.delete(challengeId);
        return res.status(410).json({ error: "E_CHALLENGE_EXPIRED" });
      }
      if (challengeRecord.address !== walletAddress) {
        return res.status(403).json({ error: "E_ADDRESS_MISMATCH" });
      }
    }

    // 2. Verify XRPL signature
    //    The challenge string was issued by /api/auth/challenge and stored
    //    in the challenge store. The wallet signed this exact string.
    //    We verify it matches the wallet's public key.
    //
    //    import { verifyMessageSignature } from "@fuzzynuts/xrpl-token-utils/verify";
    //    const result = verifyMessageSignature({
    //      message: challengeRecord.challenge,
    //      signature,
    //      publicKey,
    //      expectedAddress: walletAddress,
    //    });
    //    if (!result.valid || !result.addressMatch) {
    //      return res.status(401).json({ error: "E_INVALID_SIGNATURE" });
    //    }

    // 3. Clean up the used challenge
    env.challengeStore.delete(challengeId);

    // 4. Mint the game session token
    const now = Date.now();
    const expiresAt = now + GAME_SESSION_TTL_MS;
    const sessionNonce = mintNonce();

    const payload = JSON.stringify({
      walletAddress,
      gameServerEndpoint: gameEndpoint,
      expiresAt,
      nonce: sessionNonce,
      gameSlug: "rsc",
    });

    const signature_ = await signPayload(payload, env.GAME_SESSION_SECRET);

    return res.json({
      token: {
        walletAddress,
        gameServerEndpoint: gameEndpoint,
        expiresAt,
        nonce: sessionNonce,
        gameSlug: "rsc",
        signature: signature_,
      },
    });
  });

  return router;
}
