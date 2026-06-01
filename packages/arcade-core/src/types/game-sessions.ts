/**
 * ═══════════════════════════════════════════════════════════════
 *  Game Session Token — XRPL wallet → game server bridge
 *
 *  Minted by POST /api/auth/game-session after verifying the
 *  player's XRPL wallet signature. Carried by the Java client
 *  and validated by the Open-RSC server on TCP connect.
 * ═══════════════════════════════════════════════════════════════
 */

import type { GameSlug } from "../constants/slugs";

/**
 * Token issued after XRPL wallet verification. The player presents
 * this to the game server on connect. Signed with HMAC-SHA256 by
 * the API server using GAME_SESSION_SECRET.
 */
export interface GameSessionToken {
  /** XRPL r-address of the player. */
  readonly walletAddress: string;
  /** TCP endpoint the client should connect to. */
  readonly gameServerEndpoint: string;
  /** Unix ms — token expires after this time. */
  readonly expiresAt: number;
  /** HMAC-SHA256 signature over the token payload. */
  readonly signature: string;
  /** Nonce to prevent replay attacks. */
  readonly nonce: string;
  /** Which game this session is for. */
  readonly gameSlug: GameSlug;
}

/**
 * Wire format for the POST /api/auth/game-session request body.
 */
export interface GameSessionRequest {
  /** XRPL r-address. */
  readonly walletAddress: string;
  /** Hex-encoded signed challenge from the wallet. */
  readonly signature: string;
  /** Hex-encoded public key. */
  readonly publicKey: string;
  /** Challenge nonce from /api/auth/challenge. */
  readonly nonce: string;
  /** Challenge id from /api/auth/challenge. */
  readonly challengeId: string;
}

/**
 * Default game server endpoint. Override via OPENRSC_GAME_ENDPOINT env var.
 */
export const DEFAULT_GAME_SERVER_ENDPOINT = "fuzzynuts.xyz:43594";

/**
 * Game session token TTL in milliseconds (5 minutes).
 * Short-lived to limit replay attack window.
 */
export const GAME_SESSION_TTL_MS = 5 * 60 * 1000;
