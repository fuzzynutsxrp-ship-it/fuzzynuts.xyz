/**
 * POST /api/game-session — mint a game session token
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
import { jwtVerify } from "jose";
import { mintNonce, signPayload } from "@fuzzynuts/shared-anticheat";
import { formatGameChallenge, verifyMessageSignature } from "@fuzzynuts/xrpl-token-utils/verify";

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
  WALLET_JWT_SECRET: string;
  OPENRSC_GAME_ENDPOINT?: string;
  GAME_SERVER_READY?: string;
  // Reuse the challenge store from auth.ts (injected)
  challengeStore: Map<string, { address: string; challenge: string; exp: number }>;
}): Router {
  const router = Router();
  const gameEndpoint = env.OPENRSC_GAME_ENDPOINT ?? "fuzzynuts.xyz:43594";
  const serverReady = env.GAME_SERVER_READY === "true";

  /**
   * Mint and return a game session token for the given wallet address.
   * Shared by both the challenge-verify path and the cookie-auth path.
   */
  async function mintGameSessionToken(walletAddress: string) {
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

    const signature = await signPayload(payload, env.GAME_SESSION_SECRET);

    return {
      token: {
        walletAddress,
        gameServerEndpoint: gameEndpoint,
        expiresAt,
        nonce: sessionNonce,
        gameSlug: "rsc",
        signature,
      },
    };
  }

  /**
   * Extract wallet address from the HttpOnly JWT cookie.
   * Returns null if cookie is missing or invalid.
   */
  async function getWalletFromCookie(req: any): Promise<string | null> {
    const cookies = req.headers.cookie;
    if (!cookies) return null;

    const match = cookies.match(/fuzzy_wallet_session=([^;]+)/);
    if (!match) return null;

    try {
      const { payload } = await jwtVerify(
        match[1],
        new TextEncoder().encode(env.WALLET_JWT_SECRET),
        { issuer: "fuzzynuts.xyz" },
      );
      if (typeof payload.address === "string" && XRPL_ADDR.test(payload.address)) {
        return payload.address;
      }
    } catch {
      // Invalid or expired JWT — fall through
    }
    return null;
  }

  // ── POST / — mint a game session token ────────────────────────
  // Two auth paths:
  //   Path A (cookie):  Valid fuzzy_wallet_session JWT cookie → mint token directly
  //   Path B (challenge): { challengeId, signature, publicKey } → verify XRPL sig → mint token
  router.post("/", async (req, res) => {
    // ── Env-driven toggle: block until game VPS is live ───────
    if (!serverReady) {
      return res.status(503).json({
        status: "provisioning",
        message:
          "Game server is being deployed. Check back shortly.",
      });
    }
    // ── end toggle ────────────────────────────────────────────

    // ── Path A: Cookie-authenticated (Xaman wallet-login JWT) ──
    const cookieWallet = await getWalletFromCookie(req);
    if (cookieWallet) {
      try {
        const result = await mintGameSessionToken(cookieWallet);
        return res.json(result);
      } catch (err) {
        console.error("[game-session] Token mint failed (cookie path):", err);
        return res.status(500).json({ error: "E_INTERNAL" });
      }
    }

    // ── Path B: Challenge-verified (XRPL signature) ───────────
    const parsed = GameSessionBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const { walletAddress, signature, publicKey, nonce, challengeId } =
      parsed.data;

    // 1. Validate the challenge exists and hasn't expired
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

    // 2. Verify XRPL signature
    const result = verifyMessageSignature({
      message: challengeRecord.challenge,
      signature,
      publicKey,
      expectedAddress: walletAddress,
    });
    if (!result.valid || !result.addressMatch) {
      return res.status(401).json({ error: "E_INVALID_SIGNATURE" });
    }

    // 3. Clean up the used challenge
    env.challengeStore.delete(challengeId);

    // 4. Mint the game session token
    try {
      const tokenResult = await mintGameSessionToken(walletAddress);
      return res.json(tokenResult);
    } catch (err) {
      console.error("[game-session] Token mint failed (challenge path):", err);
      return res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  return router;
}
