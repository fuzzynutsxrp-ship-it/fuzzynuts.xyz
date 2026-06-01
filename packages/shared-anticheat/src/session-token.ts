/**
 * ═══════════════════════════════════════════════════════════════
 *  Game-session token
 *
 *  Issued by POST /api/session at game-start. Carries:
 *    - the wallet (optional, for non-guest sessions)
 *    - the game slug being played
 *    - the weekKey (so a token from last week can't submit this week)
 *    - an expiry (typically game-start + 30 min)
 *    - a random secret used as the HMAC key for that session's score
 *
 *  Wire format (URL-safe base64):
 *    `<json>.<hmac>`  where json is JSON.stringify(claims) and
 *    hmac is HMAC-SHA256(json, GAME_SESSION_SECRET).
 *
 *  GAME_SESSION_SECRET is server-side only — the API mints + verifies.
 *  Never ship it to the browser.
 * ═══════════════════════════════════════════════════════════════
 */

import type { GameSlug } from "@fuzzynuts/arcade-core";
import { signPayload, verifyPayload } from "./hmac";
import { mintNonce } from "./nonce";

export interface SessionClaims {
  /** Canonical game slug. */
  readonly game: GameSlug;
  /** XRPL r-address, or null for guest. */
  readonly wallet: string | null;
  /** ISO-week key, e.g. "2026-W22". */
  readonly weekKey: string;
  /** Expiry — Unix ms. */
  readonly exp: number;
  /** Per-session secret (sent to the game so it can HMAC the score). */
  readonly secret: string;
  /** Token id — single-use enforcement nonce. */
  readonly jti: string;
}

const SEP = ".";

function toB64Url(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

/** Mint a session token. The caller MUST persist `jti` to a replay store. */
export async function mintSessionToken(
  claims: Omit<SessionClaims, "secret" | "jti">,
  signingSecret: string,
): Promise<{ token: string; claims: SessionClaims }> {
  const full: SessionClaims = {
    ...claims,
    secret: mintNonce(),
    jti: mintNonce(),
  };
  const json = JSON.stringify(full);
  const sig = await signPayload(json, signingSecret);
  return { token: `${toB64Url(json)}${SEP}${sig}`, claims: full };
}

export type VerifyResult =
  | { ok: true; claims: SessionClaims }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

/** Verify a session token's HMAC and expiry. Does NOT check the jti replay store. */
export async function verifySessionToken(
  token: string,
  signingSecret: string,
  now: number = Date.now(),
): Promise<VerifyResult> {
  const idx = token.lastIndexOf(SEP);
  if (idx <= 0) return { ok: false, reason: "malformed" };

  const b64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  let json: string;
  try {
    json = fromB64Url(b64);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const valid = await verifyPayload(json, sig, signingSecret);
  if (!valid) return { ok: false, reason: "bad-signature" };

  let claims: SessionClaims;
  try {
    claims = JSON.parse(json) as SessionClaims;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof claims.exp !== "number" || claims.exp < now) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, claims };
}
