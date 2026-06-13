/**
 * Auth router — wallet authentication via Xaman OAuth2 + challenge/verify.
 *
 * Endpoints:
 *   POST /api/auth/challenge     — issue a signing challenge (existing)
 *   POST /api/auth/verify        — verify wallet signature + set JWT cookie (existing)
 *   POST /api/auth/wallet-login  — validate Xaman OAuth token + set JWT cookie (NEW)
 *   GET  /api/auth/me            — read current session from JWT cookie (NEW)
 *   POST /api/auth/logout        — clear session cookies (NEW)
 *
 * Security (per security audit t_525af322):
 *   - Server validates Xaman OAuth token via userinfo endpoint (not trust client)
 *   - CSRF protection via custom header requirement
 *   - JWT TTL reduced from 7 days to 24 hours
 *   - XRPL address regex tightened to exactly 34 chars
 */

import { Router } from "express";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { mintNonce } from "@fuzzynuts/shared-anticheat";
import { verifyMessageSignature } from "@fuzzynuts/xrpl-token-utils/verify";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 min
const COOKIE_TTL_SEC = 60 * 60 * 24; // 24 hours (was 7 days — audit fix)

// Exactly 34 chars: r + 33 base58 chars (audit fix — was {24,34})
const XRPL_ADDR = /^r[1-9A-HJ-NP-Za-km-z]{33}$/;

const XAMAN_USERINFO_URL = "https://oauth2.xumm.me/v1/userinfo";

const ChallengeBody = z.object({ address: z.string().regex(XRPL_ADDR) });
const VerifyBody = z.object({
  challengeId: z.string().min(16).max(128),
  address: z.string().regex(XRPL_ADDR),
  signature: z.string().min(1).max(1024),
  publicKey: z.string().min(1).max(256),
});

const WalletLoginBody = z.object({
  address: z.string().regex(XRPL_ADDR),
  token: z.string().min(1).max(4096), // Xaman OAuth2 access token
});

/**
 * Validate a Xaman OAuth2 token by calling their userinfo endpoint.
 * Returns the verified address if valid, or null if invalid.
 *
 * This is the critical security fix: we verify the token server-side
 * instead of trusting the client-claimed address.
 */
async function validateXamanToken(
  token: string,
  expectedAddress: string,
): Promise<{ valid: boolean; address?: string; error?: string }> {
  try {
    const res = await fetch(XAMAN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!res.ok) {
      return {
        valid: false,
        error: `Xaman userinfo returned ${res.status}`,
      };
    }

    const data = (await res.json()) as { sub?: string; account?: string };
    const verifiedAddress = data.account || data.sub;

    if (!verifiedAddress || typeof verifiedAddress !== "string") {
      return { valid: false, error: "No address in Xaman userinfo response" };
    }

    if (!XRPL_ADDR.test(verifiedAddress)) {
      return { valid: false, error: "Invalid address format from Xaman" };
    }

    if (verifiedAddress !== expectedAddress) {
      return {
        valid: false,
        error: "Address mismatch: token does not match claimed address",
      };
    }

    return { valid: true, address: verifiedAddress };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Xaman validation failed: ${message}` };
  }
}

/**
 * Build session cookies (shared by challenge/verify and wallet-login).
 */
function buildSessionCookies(
  address: string,
  provider: string,
  secret: Uint8Array,
): Promise<{ jwt: string; cookieExp: number; cookies: string[] }> {
  const cookieExp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC;

  return new SignJWT({ address, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("fuzzynuts.xyz")
    .setExpirationTime(cookieExp)
    .sign(secret)
    .then((jwt) => ({
      jwt,
      cookieExp,
      cookies: [
        `fuzzy_wallet_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
        `fuzzy_session_meta=${encodeURIComponent(
          JSON.stringify({
            address,
            provider,
            cookieExp: cookieExp * 1000,
          }),
        )}; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
      ],
    }));
}

export function buildAuthRouter(env: {
  WALLET_JWT_SECRET: string;
  challengeStore?: Map<
    string,
    { address: string; challenge: string; exp: number }
  >;
}): Router {
  const router = Router();
  const store =
    env.challengeStore ??
    new Map<string, { address: string; challenge: string; exp: number }>();
  const secret = new TextEncoder().encode(env.WALLET_JWT_SECRET);

  // ── CSRF protection middleware (audit fix: HIGH) ──────────────
  // Require custom header on state-changing endpoints.
  // Simple CSRF protection: custom header cannot be sent cross-origin
  // without CORS preflight (which is blocked by our CORS config).
  function requireCsrfHeader(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) {
    const header =
      req.headers["x-requested-with"] || req.headers["x-fn-request"];
    if (!header || header !== "XMLHttpRequest") {
      res.status(403).json({ error: "E_CSRF" });
      return;
    }
    next();
  }

  // ── POST /challenge ───────────────────────────────────────────
  router.post("/challenge", (req, res) => {
    const parsed = ChallengeBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const challengeId = mintNonce();
    const challenge = `fuzzynuts.xyz:${parsed.data.address}:${mintNonce()}:${Date.now()}`;
    const exp = Date.now() + CHALLENGE_TTL_MS;
    store.set(challengeId, {
      address: parsed.data.address,
      challenge,
      exp,
    });
    return res.json({ challenge, challengeId, exp });
  });

  // ── POST /verify ──────────────────────────────────────────────
  router.post("/verify", async (req, res) => {
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const record = store.get(parsed.data.challengeId);
    if (!record)
      return res.status(404).json({ error: "E_CHALLENGE_NOT_FOUND" });
    if (record.exp < Date.now()) {
      store.delete(parsed.data.challengeId);
      return res.status(410).json({ error: "E_CHALLENGE_EXPIRED" });
    }
    if (record.address !== parsed.data.address) {
      return res.status(403).json({ error: "E_ADDRESS_MISMATCH" });
    }

    // Verify XRPL signature using our proven xrpl-token-utils
    const result = verifyMessageSignature({
      message: record.challenge,
      signature: parsed.data.signature,
      publicKey: parsed.data.publicKey,
      expectedAddress: parsed.data.address,
    });
    if (!result.valid || !result.addressMatch) {
      return res.status(401).json({ error: "E_BAD_SIGNATURE" });
    }

    store.delete(parsed.data.challengeId);

    const { cookieExp, cookies } = await buildSessionCookies(
      parsed.data.address,
      "xaman",
      secret,
    );

    res.setHeader("Set-Cookie", cookies);
    return res.json({
      ok: true,
      address: parsed.data.address,
      cookieExp: cookieExp * 1000,
    });
  });

  // ── POST /wallet-login (NEW — Xaman OAuth2 with server-side validation) ──
  router.post("/wallet-login", requireCsrfHeader, async (req, res) => {
    const parsed = WalletLoginBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    if (!env.WALLET_JWT_SECRET) {
      return res.status(503).json({ error: "E_SERVICE_UNAVAILABLE" });
    }

    // CRITICAL: Validate the Xaman OAuth token server-side.
    // Do NOT trust the client-claimed address alone.
    const validation = await validateXamanToken(
      parsed.data.token,
      parsed.data.address,
    );

    if (!validation.valid) {
      return res.status(401).json({
        error: "E_XAMAN_TOKEN_INVALID",
        detail: validation.error,
      });
    }

    const { cookieExp, cookies } = await buildSessionCookies(
      parsed.data.address,
      "xaman-oauth",
      secret,
    );

    res.setHeader("Set-Cookie", cookies);
    return res.json({
      ok: true,
      address: parsed.data.address,
      cookieExp: cookieExp * 1000,
    });
  });

  // ── GET /me (NEW — read current session) ──────────────────────
  router.get("/me", async (req, res) => {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|;\s*)fuzzy_wallet_session=([^;]+)/);
    if (!match) {
      return res.status(401).json({ error: "E_NO_SESSION" });
    }

    try {
      const { payload } = await jwtVerify(match[1]!, secret, {
        issuer: "fuzzynuts.xyz",
      });
      return res.json({
        user: {
          address: (payload as { address: string }).address,
          provider: (payload as { provider: string }).provider,
        },
      });
    } catch {
      return res.status(401).json({ error: "E_BAD_SESSION" });
    }
  });

  // ── POST /logout (NEW — clear session cookies) ────────────────
  router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", [
      "fuzzy_wallet_session=; HttpOnly; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=0",
      "fuzzy_session_meta=; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=0",
    ]);
    return res.json({ ok: true });
  });

  return router;
}
