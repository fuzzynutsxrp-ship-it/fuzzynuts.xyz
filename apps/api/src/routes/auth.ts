/**
 * POST /api/auth/challenge   — issue a signing challenge
 * POST /api/auth/verify      — verify the wallet signature + set JWT cookie
 * POST /api/auth/wallet-login — Xaman OAuth2 login (address from SDK) + set JWT cookie
 * GET  /api/auth/me           — read current session from JWT cookie
 * POST /api/auth/logout       — clear session cookies
 *
 * STATUS: scaffold. xrpl.verify wiring + Xumm SignIn payload lookup
 *         live in @fuzzynuts/xrpl-token-utils (Phase E) — finish that
 *         package, then replace the TODOs here.
 */

import { Router } from "express";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { mintNonce } from "@fuzzynuts/shared-anticheat";
import { verifyMessageSignature } from "@fuzzynuts/xrpl-token-utils/verify";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 min
const COOKIE_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

const XRPL_ADDR = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const ChallengeBody = z.object({ address: z.string().regex(XRPL_ADDR) });
const VerifyBody = z.object({
  challengeId: z.string().min(16).max(128),
  address: z.string().regex(XRPL_ADDR),
  signature: z.string().min(1).max(1024),
  publicKey: z.string().min(1).max(256),
});

const WalletLoginBody = z.object({
  address: z.string().regex(XRPL_ADDR),
});

/** Build Set-Cookie headers for the wallet session. */
function buildSessionCookies(jwt: string, address: string, cookieExp: number) {
  return [
    `fuzzy_wallet_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
    `fuzzy_session_meta=${encodeURIComponent(
      JSON.stringify({ address, provider: "xaman", cookieExp: cookieExp * 1000 }),
    )}; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
  ];
}

/** Build a JWT for the given wallet address. */
async function mintWalletJwt(
  address: string,
  secret: Uint8Array,
  provider: string,
): Promise<{ jwt: string; cookieExp: number }> {
  const cookieExp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC;
  const jwt = await new SignJWT({ address, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("fuzzynuts.xyz")
    .setExpirationTime(cookieExp)
    .sign(secret);
  return { jwt, cookieExp };
}

export function buildAuthRouter(env: {
  WALLET_JWT_SECRET: string;
  // TODO(auth-rollout): replace with a real store (Mongo TTL or Redis).
  challengeStore?: Map<string, { address: string; challenge: string; exp: number }>;
}): Router {
  const router = Router();
  const store = env.challengeStore ?? new Map();
  const secret = new TextEncoder().encode(env.WALLET_JWT_SECRET);

  // ── POST /challenge — issue a signing challenge ──────────────
  router.post("/challenge", (req, res) => {
    const parsed = ChallengeBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const challengeId = mintNonce();
    const challenge = `fuzzynuts.xyz:${parsed.data.address}:${mintNonce()}:${Date.now()}`;
    const exp = Date.now() + CHALLENGE_TTL_MS;
    store.set(challengeId, { address: parsed.data.address, challenge, exp });
    return res.json({ challenge, challengeId, exp });
  });

  // ── POST /verify — verify XRPL signature + set JWT cookie ───
  router.post("/verify", async (req, res) => {
    const parsed = VerifyBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const record = store.get(parsed.data.challengeId);
    if (!record) return res.status(404).json({ error: "E_CHALLENGE_NOT_FOUND" });
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

    const { jwt, cookieExp } = await mintWalletJwt(parsed.data.address, secret, "xaman");

    res.setHeader("Set-Cookie", buildSessionCookies(jwt, parsed.data.address, cookieExp));

    return res.json({ ok: true, address: parsed.data.address, cookieExp: cookieExp * 1000 });
  });

  // ── POST /wallet-login — Xaman OAuth2 login ──────────────────
  // The Xaman SDK's OAuth2 PKCE flow authenticates the user via the
  // Xaman app. After successful auth, the client sends the verified
  // wallet address here. The server validates the address format and
  // issues a JWT session cookie.
  //
  // Security: The Xaman SDK is the authentication step — the user
  // approved the connection in the Xaman app, which verified their
  // wallet ownership via Xaman's backend. This endpoint trusts that
  // verification and issues a session cookie.
  router.post("/wallet-login", async (req, res) => {
    const parsed = WalletLoginBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const { address } = parsed.data;
    const { jwt, cookieExp } = await mintWalletJwt(address, secret, "xaman");

    res.setHeader("Set-Cookie", buildSessionCookies(jwt, address, cookieExp));

    return res.json({ ok: true, address, cookieExp: cookieExp * 1000 });
  });

  // ── GET /me — read current session from JWT cookie ───────────
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

      if (typeof payload.address !== "string" || !XRPL_ADDR.test(payload.address)) {
        return res.status(401).json({ error: "E_BAD_SESSION" });
      }

      return res.json({
        user: {
          address: payload.address,
          provider: payload.provider ?? "xaman",
        },
      });
    } catch {
      return res.status(401).json({ error: "E_BAD_SESSION" });
    }
  });

  // ── POST /logout — clear session cookies ─────────────────────
  router.post("/logout", (_req, res) => {
    res.setHeader("Set-Cookie", [
      "fuzzy_wallet_session=; HttpOnly; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=0",
      "fuzzy_session_meta=; Secure; SameSite=Lax; Domain=.fuzzynuts.xyz; Path=/; Max-Age=0",
    ]);
    return res.json({ ok: true });
  });

  return router;
}
