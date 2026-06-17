/**
 * ═══════════════════════════════════════════════════════════════
 *  Game Session HMAC — sign and verify game session tokens
 *
 *  Used to protect game score submissions from tampering.
 *  The API server signs the session token; the game server
 *  (or score-submission endpoint) verifies it.
 * ═══════════════════════════════════════════════════════════════
 */

import { signPayload, verifyPayload } from "./hmac";

export interface GameSessionPayload {
  readonly walletAddress: string;
  readonly gameServerEndpoint: string;
  readonly expiresAt: number;
  readonly nonce: string;
  readonly gameSlug: string;
}

/**
 * Canonical message format for game-session HMACs.
 * Keep this function the only producer — never inline.
 */
export function buildGameSessionMessage(parts: GameSessionPayload): string {
  return `${parts.walletAddress}|${parts.gameServerEndpoint}|${parts.expiresAt}|${parts.nonce}|${parts.gameSlug}`;
}

/**
 * Sign a game session token payload with the server secret.
 * Returns lowercase hex (64 chars).
 */
export async function signGameSession(token: GameSessionPayload, secret: string): Promise<string> {
  const message = buildGameSessionMessage(token);
  return signPayload(message, secret);
}

/**
 * Verify a game session token's HMAC signature.
 * Returns true iff the signature matches and is well-formed.
 */
export async function verifyGameSession(
  token: GameSessionPayload,
  hexSignature: string,
  secret: string,
): Promise<boolean> {
  const message = buildGameSessionMessage(token);
  return verifyPayload(message, hexSignature, secret);
}
