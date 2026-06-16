/**
 * POST /api/session — Mint a game session token
 *
 * Supports two auth paths:
 *   Path A (Web3):  { wallet: "rXxx..." } — existing XRPL flow
 *   Path B (Web2):  Authorization: Bearer ***  — NextAuth JWT from Google sign-in
 *
 * The session token is HMAC-signed and carries:
 *   - `wallet` (optional — null for Google-only users)
 *   - `userId` (always present)
 *   - `game` slug, `weekKey`, expiry, nonce
 *
 * STATUS: scaffold. Wire into apps/api/src/server.ts and replace the
 *         in-memory replay store with the Mongo TTL one before merging
 *         the auth-rollout PR.
 */

import { Router } from "express";
import { z } from "zod";
import { jwtVerify } from "jose";
import { normalizeSlug, getWeekKey } from "@fuzzynuts/arcade-core";
import { mintSessionToken } from "@fuzzynuts/shared-anticheat";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

const BodySchema = z.object({
  game: z.string().min(1).max(64),
  wallet: z
    .string()
    .regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    .optional(),
});

export function buildSessionRouter(env: {
  GAME_SESSION_SECRET: string;
  WALLET_JWT_SECRET: string;
}): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "E_SCHEMA", details: parsed.error.flatten() });
    }

    const slug = normalizeSlug(parsed.data.game);
    if (!slug) return res.status(400).json({ error: "E_UNKNOWN_GAME" });

    // ── Resolve wallet from auth path ─────────────────────

    let wallet: string | null = parsed.data.wallet ?? null;

    // If no wallet in body, check Authorization header (NextAuth JWT)
    if (!wallet) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const jwt = authHeader.slice(7);
          const { payload } = await jwtVerify(
            jwt,
            new TextEncoder().encode(env.WALLET_JWT_SECRET),
            { issuer: "https://fuzzynuts.xyz" },
          );

          // If the JWT has a walletAddress (XRPL credentials provider), use it
          if (
            typeof payload.walletAddress === "string" &&
            /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(payload.walletAddress)
          ) {
            wallet = payload.walletAddress;
          }
          // For Google-only users, wallet stays null (guest session)
        } catch {
          // Invalid JWT — proceed as guest (wallet=null)
        }
      }
    }

    // ── Mint session token ────────────────────────────────

    const { token, claims } = await mintSessionToken(
      {
        game: slug,
        wallet,
        weekKey: getWeekKey().value,
        exp: Date.now() + SESSION_TTL_MS,
      },
      env.GAME_SESSION_SECRET,
    );

    // TODO(auth-rollout): persist claims.jti to a Mongo TTL collection
    //  for single-use enforcement at POST /api/scores.

    return res.json({
      token,
      secret: claims.secret,
      exp: claims.exp,
      jti: claims.jti,
      wallet, // null for Google-only users
    });
  });

  return router;
}
