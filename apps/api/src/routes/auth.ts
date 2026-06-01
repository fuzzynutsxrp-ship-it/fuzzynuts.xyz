/**
 * POST /api/auth/challenge   — issue a signing challenge
 * POST /api/auth/verify      — verify the wallet signature + set JWT cookie
 *
 * STATUS: scaffold. xrpl.verify wiring + Xumm SignIn payload lookup
 *         live in @fuzzynuts/xrpl-token-utils (Phase E) — finish that
 *         package, then replace the TODOs here.
 */

import { Router } from "express";
import { z } from "zod";
import { SignJWT } from "jose";
import { mintNonce } from "@fuzzynuts/shared-anticheat";

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

export function buildAuthRouter(env: {
  WALLET_JWT_SECRET: string;
  // TODO(auth-rollout): replace with a real store (Mongo TTL or Redis).
  challengeStore?: Map<string, { address: string; challenge: string; exp: number }>;
}): Router {
  const router = Router();
  const store = env.challengeStore ?? new Map();

  router.post("/challenge", (req, res) => {
    const parsed = ChallengeBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "E_SCHEMA" });

    const challengeId = mintNonce();
    const challenge = `fuzzynuts.xyz:${parsed.data.address}:${mintNonce()}:${Date.now()}`;
    const exp = Date.now() + CHALLENGE_TTL_MS;
    store.set(challengeId, { address: parsed.data.address, challenge, exp });
    return res.json({ challenge, challengeId, exp });
  });

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

    // TODO(auth-rollout): real signature check via
    //   import { verifyXrplSignature } from "@fuzzynuts/xrpl-token-utils";
    //   const ok = await verifyXrplSignature(record.challenge, parsed.data.signature, parsed.data.publicKey, parsed.data.address);
    //   if (!ok) return res.status(401).json({ error: "E_BAD_SIGNATURE" });
    // For now this scaffold REJECTS all verifies so it cannot be deployed
    // accidentally without the real implementation:
    if (process.env.NODE_ENV === "production") {
      return res.status(501).json({ error: "E_NOT_IMPLEMENTED" });
    }

    store.delete(parsed.data.challengeId);

    const cookieExp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC;
    const jwt = await new SignJWT({ address: parsed.data.address, provider: "xaman" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("fuzzynuts.xyz")
      .setExpirationTime(cookieExp)
      .sign(new TextEncoder().encode(env.WALLET_JWT_SECRET));

    res.setHeader("Set-Cookie", [
      `fuzzy_wallet_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
      `fuzzy_session_meta=${encodeURIComponent(
        JSON.stringify({ address: parsed.data.address, provider: "xaman", cookieExp: cookieExp * 1000 }),
      )}; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
    ]);

    return res.json({ ok: true, address: parsed.data.address, cookieExp: cookieExp * 1000 });
  });

  return router;
}
