/**
 * ═══════════════════════════════════════════════════════════════
 *  Guest Session Middleware — issue lightweight JWT for anonymous
 *  visitors so they can track stats and use chat.
 *
 *  On first request (no `fuzzy_guest` cookie), generates a random
 *  deviceId UUID, stores it in an HttpOnly cookie, and mints a
 *  Guest JWT signed with GAME_SESSION_SECRET.
 *
 *  On subsequent requests, verifies the existing cookie and
 *  attaches guest claims to `req.guest`.
 * ═══════════════════════════════════════════════════════════════
 */

import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "fuzzy_guest";
const GUEST_JWT_TTL = "30d";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface GuestJwtPayload extends JWTPayload {
  type: "guest";
  deviceId: string;
}

/** Augment Express Request with optional guest property */
export interface GuestRequest extends Request {
  guest?: GuestJwtPayload;
}

/**
 * Build Express middleware that ensures every request carries a
 * valid guest session cookie + JWT.
 *
 * - If the cookie is missing or invalid → mint a fresh one.
 * - If the cookie is valid → attach decoded claims to `req.guest`.
 * - Always calls `next()` — this middleware never rejects requests.
 */
export function guestSessionMiddleware(env: { GAME_SESSION_SECRET: string }) {
  const secret = new TextEncoder().encode(env.GAME_SESSION_SECRET);
  const isProduction = process.env.NODE_ENV === "production";

  async function mintGuestJwt(deviceId: string): Promise<string> {
    return new SignJWT({ type: "guest", deviceId } satisfies Omit<GuestJwtPayload, "iat" | "exp">)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(GUEST_JWT_TTL)
      .setIssuer("fuzzynuts.xyz")
      .sign(secret);
  }

  function setGuestCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: isProduction,
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });
  }

  return async function guestSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Try to read existing cookie
    const cookies = parseCookies(req.headers.cookie ?? "");
    const existing = cookies[COOKIE_NAME];

    if (existing) {
      try {
        const { payload } = await jwtVerify(existing, secret, {
          issuer: "fuzzynuts.xyz",
        });
        (req as GuestRequest).guest = payload as GuestJwtPayload;
        next();
        return;
      } catch {
        // Cookie is expired / tampered — fall through to mint a new one
      }
    }

    // No valid cookie → mint a fresh guest session
    const deviceId = crypto.randomUUID();
    const token = await mintGuestJwt(deviceId);
    setGuestCookie(res, token);

    (req as GuestRequest).guest = { type: "guest", deviceId };
    next();
  };
}

/**
 * Minimal cookie header parser — no external dependency needed.
 * Handles `key=value; key2=value2` shapes.
 */
function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}
