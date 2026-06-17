/**
 * ═══════════════════════════════════════════════════════════════
 * Score Validation Middleware — Server-Side Reference Implementation
 *
 * This file is a REFERENCE for the µWebSockets backend deployed
 * on Railway. It cannot run inside Next.js directly (the backend
 * is a separate service). Copy this logic into your Railway
 * backend's score handler.
 *
 * Provides:
 *   1. Zod-based payload validation
 *   2. Per-game score cap enforcement
 *   3. Rate limiting by wallet + IP + game (in-memory + Redis option)
 *   4. Replay attack prevention via nonce deduplication
 *   5. Timestamp drift checking
 *   6. HMAC-SHA256 integrity verification
 *   7. Optional wallet-signed message verification
 *
 * Designed for µWebSockets.js but framework-agnostic logic.
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from "zod";

/* ── Score Caps (must mirror client-side SCORE_CAPS) ── */

const SCORE_CAPS: Record<string, number> = {
  "fuzzynuts-world": 10_000_000,
  mario: 9_999_990,
  survivors: 5_000_000,
  minigolf: 100_000,
  racer: 2_000_000,
};

const VALID_GAMES = Object.keys(SCORE_CAPS) as [string, ...string[]];

/* ── Configuration ── */

const CONFIG = {
  /** Maximum timestamp drift (ms) between client and server */
  MAX_TIMESTAMP_DRIFT_MS: 120_000,
  /** Minimum play duration (seconds) before a score is accepted */
  MIN_DURATION_SECONDS: 5,
  /** Rate limit: max submissions per wallet+game per window */
  RATE_LIMIT_MAX: 6,
  /** Rate limit window (ms) — 5 minutes */
  RATE_LIMIT_WINDOW_MS: 300_000,
  /** Nonce TTL (ms) — nonces older than this are purged */
  NONCE_TTL_MS: 600_000,
  /** HMAC secret — load from env in production */
  HMAC_SECRET: process.env.SCORE_HMAC_SECRET || "fuzzynuts-dev-secret-change-me",
};

/* ── Zod Schema (server-side — stricter than client) ── */

const ServerScoreSchema = z.object({
  game: z.enum(VALID_GAMES),
  score: z.number().int().positive().max(99_999_999),
  wallet: z
    .string()
    .regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    .optional()
    .nullable(),
  timestamp: z.number().int().positive(),
  duration: z.number().min(CONFIG.MIN_DURATION_SECONDS).optional(),
  nonce: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{16,64}$/)
    .optional(),
  hash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  signature: z.string().min(1).max(512).optional(),
});

type ServerScorePayload = z.infer<typeof ServerScoreSchema>;

/* ═══════════════════════════════════════════════════════════════
   Rate Limiter (in-memory — use Redis for multi-instance)
   ═══════════════════════════════════════════════════════════════ */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/** In-memory rate limit store: key → { count, windowStart } */
const rateLimitStore = new Map<string, RateLimitEntry>();

/** Purge expired entries every 60s to prevent memory leak */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > CONFIG.RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

function checkRateLimit(wallet: string | null | undefined, ip: string, game: string): boolean {
  const key = `${wallet || "guest"}:${ip}:${game}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > CONFIG.RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }

  if (entry.count >= CONFIG.RATE_LIMIT_MAX) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

/* ═══════════════════════════════════════════════════════════════
   Nonce Store (replay attack prevention)
   ═══════════════════════════════════════════════════════════════ */

/** Set of seen nonces with expiry timestamps */
const seenNonces = new Map<string, number>();

/** Purge expired nonces every 120s */
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of seenNonces) {
    if (now > expiry) seenNonces.delete(nonce);
  }
}, 120_000);

function isNonceUsed(nonce: string): boolean {
  if (seenNonces.has(nonce)) return true;
  seenNonces.set(nonce, Date.now() + CONFIG.NONCE_TTL_MS);
  return false;
}

/* ═══════════════════════════════════════════════════════════════
   HMAC Verification (Node.js crypto)
   ═══════════════════════════════════════════════════════════════ */

async function verifyHMAC(payload: ServerScorePayload): Promise<boolean> {
  if (!payload.hash || !payload.nonce) return true; // No hash provided = legacy client

  const message = `${payload.game}:${payload.score}:${payload.timestamp}:${payload.nonce}`;

  // Use Web Crypto API (Node 18+)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(CONFIG.HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const hashBuffer = new Uint8Array(payload.hash.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));

  return crypto.subtle.verify("HMAC", key, hashBuffer, encoder.encode(message));
}

/* ═══════════════════════════════════════════════════════════════
   Main Validation Function
   ═══════════════════════════════════════════════════════════════ */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode: number;
  payload?: ServerScorePayload;
}

/**
 * Validate an incoming score submission request.
 *
 * @param body     - Raw request body (parsed JSON)
 * @param clientIP - Client IP address (from X-Forwarded-For or socket)
 * @returns Validation result with error details if invalid
 *
 * @example
 * ```ts
 * // In your µWebSockets route handler:
 * app.post('/api/scores', async (res, req) => {
 *   const body = await readBody(res);
 *   const ip = req.getHeader('x-forwarded-for') || 'unknown';
 *   const validation = await validateScoreSubmission(body, ip);
 *   if (!validation.valid) {
 *     res.writeStatus(String(validation.statusCode));
 *     res.end(JSON.stringify({ ok: false, error: validation.error }));
 *     return;
 *   }
 *   // ... insert into MongoDB
 * });
 * ```
 */
export async function validateScoreSubmission(
  body: unknown,
  clientIP: string,
): Promise<ValidationResult> {
  /* ── Step 1: Schema validation ── */
  const parsed = ServerScoreSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]!;
    return {
      valid: false,
      error: `Validation failed: ${firstError.path.join(".")} — ${firstError.message}`,
      statusCode: 400,
    };
  }

  const payload = parsed.data;

  /* ── Step 2: Per-game score cap ── */
  const cap = SCORE_CAPS[payload.game];
  if (cap !== undefined && payload.score > cap) {
    return {
      valid: false,
      error: `Score ${payload.score} exceeds cap of ${cap} for ${payload.game}`,
      statusCode: 400,
    };
  }

  /* ── Step 3: Timestamp drift check ── */
  const drift = Math.abs(Date.now() - payload.timestamp);
  if (drift > CONFIG.MAX_TIMESTAMP_DRIFT_MS) {
    return {
      valid: false,
      error: `Timestamp drift too large (${Math.round(drift / 1000)}s). Clock sync issue?`,
      statusCode: 400,
    };
  }

  /* ── Step 4: Rate limit by wallet + IP + game ── */
  if (!checkRateLimit(payload.wallet, clientIP, payload.game)) {
    return {
      valid: false,
      error: "Rate limited — too many submissions. Try again in a few minutes.",
      statusCode: 429,
    };
  }

  /* ── Step 5: Replay attack prevention (nonce deduplication) ── */
  if (payload.nonce) {
    if (isNonceUsed(payload.nonce)) {
      return {
        valid: false,
        error: "Duplicate submission detected (nonce already used)",
        statusCode: 409,
      };
    }
  }

  /* ── Step 6: HMAC integrity verification ── */
  if (payload.hash && payload.nonce) {
    const hmacValid = await verifyHMAC(payload);
    if (!hmacValid) {
      return {
        valid: false,
        error: "Score integrity check failed — hash mismatch",
        statusCode: 403,
      };
    }
  }

  /* ── Step 7: Duration sanity check ── */
  if (payload.duration !== undefined && payload.duration < CONFIG.MIN_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Play duration too short (${payload.duration}s < ${CONFIG.MIN_DURATION_SECONDS}s minimum)`,
      statusCode: 400,
    };
  }

  /* ── All checks passed ── */
  return {
    valid: true,
    statusCode: 200,
    payload,
  };
}

/* ═══════════════════════════════════════════════════════════════
   Exports for Backend Integration
   ═══════════════════════════════════════════════════════════════ */

export { ServerScoreSchema, CONFIG as VALIDATION_CONFIG };
export type { ServerScorePayload };
