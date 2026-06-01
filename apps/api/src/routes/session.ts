/**
 * POST /api/session
 *
 * Mints a per-game session token (HMAC-signed) at game start. The
 * game iframe uses the returned `secret` to HMAC its score before
 * POST /api/scores. The API verifies with the same secret on submit.
 *
 * Body: { game: GameSlug, wallet?: string }
 * Response: { token: string, secret: string, exp: number, jti: string }
 *
 * Replay protection: `jti` is single-use; persist to Mongo TTL collection.
 *
 * STATUS: scaffold. Wire into apps/api/src/server.ts and replace the
 *         in-memory replay store with the Mongo TTL one before merging
 *         the auth-rollout PR.
 */

import { Router } from "express";
import { z } from "zod";
import { normalizeSlug, getWeekKey } from "@fuzzynuts/arcade-core";
import { mintSessionToken } from "@fuzzynuts/shared-anticheat";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

const BodySchema = z.object({
  game: z.string().min(1).max(64),
  wallet: z.string().regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/).optional(),
});

export function buildSessionRouter(env: { GAME_SESSION_SECRET: string }): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "E_SCHEMA", details: parsed.error.flatten() });
    }
    const slug = normalizeSlug(parsed.data.game);
    if (!slug) return res.status(400).json({ error: "E_UNKNOWN_GAME" });

    const { token, claims } = await mintSessionToken(
      {
        game: slug,
        wallet: parsed.data.wallet ?? null,
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
    });
  });

  return router;
}
