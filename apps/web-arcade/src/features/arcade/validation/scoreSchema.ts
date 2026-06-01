/**
 * ═══════════════════════════════════════════════════════════════
 * Score Submission — Zod Validation Schemas
 *
 * Shared between frontend (pre-flight validation) and backend
 * (server-side enforcement). Defines the canonical shape for
 * score payloads with anti-cheat constraints.
 *
 * Usage:
 *   import { ScorePayloadSchema } from "@/features/arcade/validation/scoreSchema";
 *   const result = ScorePayloadSchema.safeParse(body);
 *
 * IMPORTANT: This file has ZERO React dependencies — it can be
 * imported from API routes, middleware, or backend services.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { SCORE_CAPS } from "../constants";

/* ── Allowed game slugs (derived from SCORE_CAPS keys) ── */
const VALID_GAMES = Object.keys(SCORE_CAPS) as [string, ...string[]];

/* ── Constants ── */
const MIN_DURATION_SECONDS = 5;
const MAX_TIMESTAMP_DRIFT_MS = 120_000; // ±2 minutes from server time
const NONCE_REGEX = /^[a-zA-Z0-9_-]{16,64}$/;
const XRPL_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

/* ═══════════════════════════════════════════════════════════════
   Base Object Schema (shared between standard and secure)
   ═══════════════════════════════════════════════════════════════ */

const BaseScoreObject = z.object({
  /** Game identifier — must be a registered game slug */
  game: z.enum(VALID_GAMES),

  /** Player's score — positive integer, capped per game */
  score: z
    .number()
    .int()
    .positive(),

  /** XRPL wallet address (r-address) — optional for guest plays */
  wallet: z
    .string()
    .regex(XRPL_ADDRESS_REGEX)
    .optional()
    .nullable(),

  /** Unix timestamp (ms) of submission — drift-checked server-side */
  timestamp: z
    .number()
    .int()
    .positive(),

  /** Play duration in seconds — must exceed minimum */
  duration: z
    .number()
    .min(MIN_DURATION_SECONDS)
    .optional(),

  /** Client-generated nonce for replay attack prevention */
  nonce: z
    .string()
    .regex(NONCE_REGEX)
    .optional(),

  /** HMAC-SHA256 integrity hash: SHA256(game + score + timestamp + nonce + secret) */
  hash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/)
    .optional(),

  /** Optional wallet-signed message (hex-encoded) for high-value scores */
  signature: z
    .string()
    .min(1)
    .max(512)
    .optional(),
});

/* ═══════════════════════════════════════════════════════════════
   Core Payload Schema
   ═══════════════════════════════════════════════════════════════ */

/**
 * Standard score submission payload.
 * Sent from fuzzy-score.js (iframe) → backend /api/scores.
 */
export const ScorePayloadSchema = BaseScoreObject.refine(
  (data) => {
    const cap = (SCORE_CAPS as Record<string, number>)[data.game];
    return cap === undefined || data.score <= cap;
  },
  {
    message: "Score exceeds maximum allowed for this game",
    path: ["score"],
  }
);

export type ScorePayload = z.infer<typeof ScorePayloadSchema>;

/* ═══════════════════════════════════════════════════════════════
   Enhanced Payload (with anti-replay fields)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Secure score submission — extends the base schema with
 * mandatory anti-replay fields. Used for wallet-connected players
 * competing for prizes.
 */
export const SecureScorePayloadSchema = BaseScoreObject
  .extend({
    /** Required for secure submissions */
    nonce: z.string().regex(NONCE_REGEX),

    /** Required integrity hash */
    hash: z.string().length(64).regex(/^[a-f0-9]{64}$/),

    /** Required wallet address */
    wallet: z.string().regex(XRPL_ADDRESS_REGEX),

    /** Timestamp — will be drift-checked via refine */
    timestamp: z.number().int().positive(),
  })
  .refine(
    (data) => {
      const cap = (SCORE_CAPS as Record<string, number>)[data.game];
      return cap === undefined || data.score <= cap;
    },
    { message: "Score exceeds maximum allowed for this game", path: ["score"] }
  )
  .refine(
    (data) => Math.abs(Date.now() - data.timestamp) < MAX_TIMESTAMP_DRIFT_MS,
    { message: `Timestamp must be within ${MAX_TIMESTAMP_DRIFT_MS / 1000}s of server time`, path: ["timestamp"] }
  );

export type SecureScorePayload = z.infer<typeof SecureScorePayloadSchema>;

/* ═══════════════════════════════════════════════════════════════
   Validation Helpers
   ═══════════════════════════════════════════════════════════════ */

/** Generate a cryptographically random nonce */
export function generateNonce(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute HMAC-SHA256 hash for score integrity.
 * Uses the Web Crypto API (available in browsers + Node 18+).
 */
export async function computeScoreHash(
  game: string,
  score: number,
  timestamp: number,
  nonce: string,
  secret: string
): Promise<string> {
  const message = `${game}:${score}:${timestamp}:${nonce}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if a timestamp is within the acceptable drift window.
 */
export function isTimestampValid(timestamp: number, maxDriftMs = MAX_TIMESTAMP_DRIFT_MS): boolean {
  return Math.abs(Date.now() - timestamp) < maxDriftMs;
}
