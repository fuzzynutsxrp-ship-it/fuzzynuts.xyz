/**
 * ═══════════════════════════════════════════════════════════════
 *  XRPL Game Auth — bridge wallet verification to game sessions
 *
 *  Encoding contract:
 *    - formatGameChallenge() produces a plain UTF-8 string
 *    - Wallet SDK signs this exact string (raw UTF-8 bytes)
 *    - Backend passes the same UTF-8 string to verifyMessageSignature()
 *    - verifyMessageSignature() hex-encodes it before calling
 *      verifyKeypairSignature (required by ripple-keypairs API)
 *
 *  Flow:
 *    1. Player connects XRP wallet via wallet-client/SignIn
 *    2. API issues a challenge via formatGameChallenge()
 *    3. Wallet signs the challenge string (UTF-8 bytes)
 *    4. Browser calls POST /api/auth/game-session with the proof
 *    5. API verifies via verifyMessageSignature() from xrpl-token-utils
 *    6. On success, mints a signed GameSessionToken
 *    7. Player downloads client JAR, token is embedded in config
 *    8. Client presents token on TCP connect to Open-RSC server
 * ═══════════════════════════════════════════════════════════════
 */

import { verifyMessageSignature, formatGameChallenge } from "@fuzzynuts/xrpl-token-utils/verify";
import { signPayload, mintNonce } from "@fuzzynuts/shared-anticheat";
import type { GameSessionToken, GameSessionRequest } from "@fuzzynuts/arcade-core";
import { DEFAULT_GAME_SERVER_ENDPOINT, GAME_SESSION_TTL_MS } from "@fuzzynuts/arcade-core";

/**
 * Nonce replay-protection store. In production, replace with
 * Redis or Mongo TTL collection. Keys are nonces; values are
 * expiry timestamps.
 */
const usedNonces = new Map<string, number>();

/** Clean expired nonces every 60 seconds. */
setInterval(() => {
  const now = Date.now();
  for (const [nonce, exp] of usedNonces) {
    if (exp < now) usedNonces.delete(nonce);
  }
}, 60_000);

export interface CreateGameSessionOptions {
  /** GAME_SESSION_SECRET from env. */
  readonly signingSecret: string;
  /** Game server TCP endpoint. Defaults to DEFAULT_GAME_SERVER_ENDPOINT. */
  readonly gameServerEndpoint?: string;
  /** The challenge string that was signed by the wallet. */
  readonly challenge: string;
}

export interface CreateGameSessionResult {
  readonly ok: true;
  readonly token: GameSessionToken;
}

export interface CreateGameSessionError {
  readonly ok: false;
  readonly error:
    | "E_INVALID_SIGNATURE"
    | "E_ADDRESS_MISMATCH"
    | "E_NONCE_EXPIRED"
    | "E_NONCE_REPLAY"
    | "E_INTERNAL";
  readonly detail?: string;
}

/**
 * Verify an XRPL wallet signature and mint a game session token.
 *
 * Uses verifyMessageSignature() which handles arbitrary challenge
 * strings (not transaction blobs). The challenge is produced by
 * formatGameChallenge() to ensure both sides use the same format.
 *
 * @param req - The game session request from the browser.
 * @param opts - Server-side configuration including the original challenge.
 * @returns Signed GameSessionToken on success, or an error.
 */
export async function createGameSession(
  req: GameSessionRequest,
  opts: CreateGameSessionOptions,
): Promise<CreateGameSessionResult | CreateGameSessionError> {
  try {
    // 1. Check nonce replay protection
    if (usedNonces.has(req.nonce)) {
      return { ok: false, error: "E_NONCE_REPLAY" };
    }

    // 2. Verify the XRPL message signature
    //    The challenge string was issued by the API via formatGameChallenge()
    //    and signed by the player's wallet. We verify it here.
    const result = verifyMessageSignature({
      message: opts.challenge,
      signature: req.signature,
      publicKey: req.publicKey,
      expectedAddress: req.walletAddress,
    });

    if (!result.valid) {
      return {
        ok: false,
        error: "E_INVALID_SIGNATURE",
        detail: result.error,
      };
    }

    if (!result.addressMatch) {
      return { ok: false, error: "E_ADDRESS_MISMATCH" };
    }

    // 3. Mark nonce as used (replay protection, 5-min expiry)
    usedNonces.set(req.nonce, Date.now() + GAME_SESSION_TTL_MS);

    // 4. Build and sign the game session token
    const now = Date.now();
    const expiresAt = now + GAME_SESSION_TTL_MS;
    const gameServerEndpoint = opts.gameServerEndpoint ?? DEFAULT_GAME_SERVER_ENDPOINT;

    const tokenNonce = mintNonce();
    const payload = JSON.stringify({
      walletAddress: req.walletAddress,
      gameServerEndpoint,
      expiresAt,
      nonce: tokenNonce,
      gameSlug: "rsc" as const,
    });

    const signature = await signPayload(payload, opts.signingSecret);

    const token: GameSessionToken = {
      walletAddress: req.walletAddress,
      gameServerEndpoint,
      expiresAt,
      signature,
      nonce: tokenNonce,
      gameSlug: "rsc",
    };

    return { ok: true, token };
  } catch (e) {
    return {
      ok: false,
      error: "E_INTERNAL",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

// Re-export the challenge formatter so callers use the same format
export { formatGameChallenge } from "@fuzzynuts/xrpl-token-utils/verify";
