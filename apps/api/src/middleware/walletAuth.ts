/**
 * walletAuth — Express middleware verifying the JWT cookie set by
 *   POST /api/auth/verify (see ../routes/auth.ts).
 *
 * Replaces the old Next.js Edge middleware that decoded a base64-JSON
 * cookie without verification. That cookie was forgeable by any client;
 * this middleware fails closed on missing or unsigned cookies.
 *
 * STATUS: scaffold. Mount in src/server.ts after Phase E completes
 *         the xrpl.verify wiring used by /api/auth/verify.
 */

import { jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";

export interface WalletJwtPayload {
  address: string;
  provider: string;
  iat: number;
  exp: number;
}

/** Augment Express Request with wallet property */
interface WalletRequest extends Request {
  wallet?: WalletJwtPayload;
}

export function buildWalletAuth(env: { WALLET_JWT_SECRET: string }) {
  const secret = new TextEncoder().encode(env.WALLET_JWT_SECRET);

  return async function walletAuth(req: Request, res: Response, next: NextFunction) {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|;\s*)fuzzy_wallet_session=([^;]+)/);
    if (!match) {
      res.status(401).json({ error: "E_NO_SESSION" });
      return;
    }

    try {
      const { payload } = await jwtVerify(match[1]!, secret, {
        issuer: "fuzzynuts.xyz",
      });
      (req as WalletRequest).wallet = payload as unknown as WalletJwtPayload;
      next();
    } catch {
      res.status(401).json({ error: "E_BAD_SESSION" });
    }
  };
}
