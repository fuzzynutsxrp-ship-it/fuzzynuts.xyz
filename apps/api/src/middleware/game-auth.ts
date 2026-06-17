/**
 * ═══════════════════════════════════════════════════════════════
 *  Game Auth Middleware — validate GameSessionToken HMAC
 *
 *  Applied to score-submission endpoints that require a valid
 *  game session. Rejects requests with missing, expired, or
 *  tampered tokens with 401 Unauthorized.
 * ═══════════════════════════════════════════════════════════════
 */

import type { Request, Response, NextFunction } from "express";
import { verifyPayload } from "@fuzzynuts/shared-anticheat";

/** Shape of the game session claims carried in the request. */
interface GameSessionClaims {
  readonly walletAddress: string;
  readonly gameServerEndpoint: string;
  readonly expiresAt: number;
  readonly nonce: string;
  readonly gameSlug: string;
  readonly signature: string;
}

/**
 * Build an Express middleware that validates a GameSessionToken
 * HMAC before allowing the request to proceed.
 *
 * The token is expected in the `X-Game-Session` header as a
 * JSON string, or in `req.body.gameSession`.
 */
export function gameAuthMiddleware(secret: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Extract token from header or body
    const raw = req.headers["x-game-session"] ?? (req.body?.gameSession as string | undefined);

    if (!raw || typeof raw !== "string") {
      return res.status(401).json({ error: "E_MISSING_GAME_SESSION" });
    }

    let claims: GameSessionClaims;
    try {
      claims = JSON.parse(raw) as GameSessionClaims;
    } catch {
      return res.status(401).json({ error: "E_MALFORMED_GAME_SESSION" });
    }

    // 1. Check expiry
    if (typeof claims.expiresAt !== "number" || claims.expiresAt < Date.now()) {
      return res.status(401).json({ error: "E_SESSION_EXPIRED" });
    }

    // 2. Verify HMAC
    const message = [
      claims.walletAddress,
      claims.gameServerEndpoint,
      claims.expiresAt,
      claims.nonce,
      claims.gameSlug,
    ].join("|");

    const valid = await verifyPayload(message, claims.signature, secret);
    if (!valid) {
      return res.status(401).json({ error: "E_INVALID_SESSION_SIGNATURE" });
    }

    // 3. Attach claims to request for downstream handlers
    (req as Request & { gameSession?: GameSessionClaims }).gameSession = claims;
    next();
  };
}
