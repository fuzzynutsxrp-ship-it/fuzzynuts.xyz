/**
 * ═══════════════════════════════════════════════════════════════
 *  Score payload schema (zod)
 *
 *  The canonical shape of a POST /api/scores body.
 *  Imported by both the web-arcade (pre-flight validation) and
 *  the api (server-side enforcement). Never copy this schema.
 *
 *  Discriminated by `kind`:
 *    - "guest"  → no wallet, no signature; counts only toward local
 *                 storage display, never payouts.
 *    - "scored" → wallet + nonce + HMAC required. Eligible for the
 *                 weekly leaderboard. HMAC is verified against the
 *                 session token's secret in shared-anticheat.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { GAME_SLUGS } from "../constants/slugs";
import { MIN_PLAY_DURATION_SECONDS } from "../constants/score-caps";

const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const HEX64_RE = /^[a-f0-9]{64}$/;

const baseFields = {
  game: z.enum(GAME_SLUGS as unknown as [string, ...string[]]),
  score: z.number().int().positive(),
  duration: z.number().int().min(MIN_PLAY_DURATION_SECONDS),
  timestamp: z.number().int().positive(),
  weekKey: z.string().regex(/^\d{4}-W\d{2}$/),
} as const;

export const GuestScoreSchema = z
  .object({
    kind: z.literal("guest"),
    ...baseFields,
  })
  .strict();

export const ScoredSubmissionSchema = z
  .object({
    kind: z.literal("scored"),
    ...baseFields,
    wallet: z.string().regex(XRPL_ADDRESS_RE),
    nonce: z.string().regex(NONCE_RE),
    hash: z.string().length(64).regex(HEX64_RE),
    /** Bearer token from POST /api/session — the API verifies its HMAC and TTL. */
    sessionToken: z.string().min(1).max(512),
    /** Optional Xumm SignIn payload uuid (required for payout-eligible scores). */
    signinPayload: z.string().uuid().optional(),
  })
  .strict();

export const ScorePayloadSchema = z.discriminatedUnion("kind", [
  GuestScoreSchema,
  ScoredSubmissionSchema,
]);

export type GuestScore = z.infer<typeof GuestScoreSchema>;
export type ScoredSubmission = z.infer<typeof ScoredSubmissionSchema>;
export type ScorePayload = z.infer<typeof ScorePayloadSchema>;
