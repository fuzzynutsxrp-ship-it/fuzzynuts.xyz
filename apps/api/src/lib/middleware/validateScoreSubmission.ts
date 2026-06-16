/**
 * ═══════════════════════════════════════════════════════════════
 * validateScoreSubmission — Server-side score validation middleware
 *
 * Anti-cheat, replay protection, and wallet signature verification.
 * 7-step fail-fast pipeline:
 *   1. Zod schema parse          → 400
 *   2. Per-game score cap        → 400
 *   3. Timestamp freshness (±5m) → 400
 *   4. HMAC-SHA256 integrity     → 403
 *   5. Rate limiting (wallet+IP) → 429
 *   6. Nonce replay guard        → 409
 *   7. Optional wallet signature → 403
 *
 * DEPLOYMENT: Copy to Railway µWebSockets backend.
 * Framework-agnostic — call validateScoreSubmission(body, ip, secret).
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { createHmac } from "crypto";

// ── Zod schema for incoming score submission ──────────────────

export const ScoreSubmissionSchema = z.object({
  gameSlug: z.enum(["mario", "fuzzy-survivors", "minigolf", "nut-racer", "fuzzynuts-world"]),
  score: z.number().int().positive(),
  duration: z.number().min(5000), // 5s minimum play time
  walletAddress: z.string().regex(/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/), // XRPL r-address
  signature: z.string().optional(), // Optional Ed25519 signature
  timestamp: z.number(), // Unix ms
  nonce: z.string().min(16), // Anti-replay nonce
  clientHash: z.string().length(64), // SHA-256 of score+duration+nonce
});

export type ScoreSubmission = z.infer<typeof ScoreSubmissionSchema>;

// ── Game-specific score caps (server-side authority) ──────────

export const SCORE_CAPS: Record<string, number> = {
  "fuzzynuts-world": 10_000_000,
  mario: 9_999_990,
  "fuzzy-survivors": 5_000_000,
  minigolf: 100_000,
  "nut-racer": 2_000_000,
} as const;

// ── Rate limit state (in production, use Redis) ──────────────

const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

// GC stale entries every 60s
const _ratePurge = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitCache) {
    if (now - v.resetAt > 600_000) rateLimitCache.delete(k);
  }
}, 60_000);
if (typeof _ratePurge === "object" && "unref" in _ratePurge) _ratePurge.unref();

// ── Nonce Store — replay-attack prevention ───────────────────

const seenNonces = new Map<string, number>();

const _noncePurge = setInterval(() => {
  const now = Date.now();
  for (const [n, exp] of seenNonces) {
    if (now > exp) seenNonces.delete(n);
  }
}, 120_000);
if (typeof _noncePurge === "object" && "unref" in _noncePurge) _noncePurge.unref();

function consumeNonce(nonce: string): boolean {
  if (seenNonces.has(nonce)) return false; // already used
  seenNonces.set(nonce, Date.now() + 600_000); // 10 min TTL
  return true;
}

// ── Ed25519 Verification (optional wallet proof) ─────────────

async function verifyEd25519Signature(
  walletAddress: string,
  message: string,
  signatureHex: string,
): Promise<boolean> {
  try {
    // Dynamically import to keep this module portable
    const { verifyWalletSignature } = await import("../wallet/verifySignature");
    const result = await verifyWalletSignature(
      {
        message,
        signature: signatureHex,
        // For Ed25519 keys, the public key is passed as-is
        // In production, the wallet extension provides the pubkey alongside signature
        publicKey: walletAddress, // Placeholder — real flow extracts pubkey from wallet SDK
      },
      walletAddress,
    );
    return result.valid && result.addressMatch;
  } catch {
    return false;
  }
}

// ── Main Validation Pipeline ─────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  statusCode: number;
  data?: ScoreSubmission;
}

/**
 * Run the full 7-step validation pipeline on an incoming score POST.
 *
 * @param payload      - Raw request body
 * @param ipAddress    - Client IP (from x-forwarded-for or socket)
 * @param serverSecret - HMAC secret (32+ char, from env SERVER_SECRET)
 *
 * @example µWebSockets
 * ```ts
 * app.post('/api/scores', async (res, req) => {
 *   const body = await readJSON(res);
 *   const ip   = req.getHeader('x-forwarded-for') || 'unknown';
 *   const v    = await validateScoreSubmission(body, ip, process.env.SERVER_SECRET);
 *   if (!v.valid) {
 *     res.writeStatus(String(v.statusCode));
 *     return res.end(JSON.stringify({ ok: false, error: v.error }));
 *   }
 *   await db.collection('scores').updateOne(
 *     { wallet: v.data!.walletAddress, game: v.data!.gameSlug, week },
 *     { $max: { score: v.data!.score }, $set: { ts: v.data!.timestamp } },
 *     { upsert: true },
 *   );
 *   res.end(JSON.stringify({ ok: true }));
 * });
 * ```
 */
export async function validateScoreSubmission(
  payload: unknown,
  ipAddress: string,
  serverSecret: string,
): Promise<ValidationResult> {
  // ── 1. Parse and validate schema ──
  const parseResult = ScoreSubmissionSchema.safeParse(payload);
  if (!parseResult.success) {
    return {
      valid: false,
      error: `Invalid payload: ${parseResult.error.issues[0]!.message}`,
      statusCode: 400,
    };
  }
  const data = parseResult.data;

  // ── 2. Verify score cap ──
  const cap = SCORE_CAPS[data.gameSlug]!;
  if (data.score > cap) {
    return {
      valid: false,
      error: `Score ${data.score} exceeds cap ${cap} for ${data.gameSlug}`,
      statusCode: 400,
    };
  }

  // ── 3. Verify timestamp freshness (±5 min window) ──
  const now = Date.now();
  if (Math.abs(now - data.timestamp) > 300_000) {
    return {
      valid: false,
      error: "Timestamp outside valid window",
      statusCode: 400,
    };
  }

  // ── 4. Anti-replay: HMAC hash verification ──
  const expectedHash = createHmac("sha256", serverSecret)
    .update(`${data.score}:${data.duration}:${data.nonce}`)
    .digest("hex");
  if (data.clientHash !== expectedHash) {
    return {
      valid: false,
      error: "Hash mismatch — possible tampering",
      statusCode: 403,
    };
  }

  // ── 5. Rate limiting: 5 submissions per 5 min per wallet+game+IP ──
  const rateKey = `${data.walletAddress}:${data.gameSlug}:${ipAddress}`;
  const nowSec = Math.floor(now / 1000);
  const windowStart = nowSec - 300; // 5 min window

  const record = rateLimitCache.get(rateKey);
  if (record && record.resetAt > windowStart) {
    if (record.count >= 5) {
      return {
        valid: false,
        error: "Rate limit exceeded — try again later",
        statusCode: 429,
      };
    }
    record.count += 1;
  } else {
    rateLimitCache.set(rateKey, { count: 1, resetAt: nowSec });
  }

  // ── 6. Nonce replay guard ──
  if (!consumeNonce(data.nonce)) {
    return {
      valid: false,
      error: "Duplicate submission (nonce reused)",
      statusCode: 409,
    };
  }

  // ── 7. Optional: Verify wallet signature if provided ──
  if (data.signature) {
    const message = `${data.gameSlug}:${data.score}:${data.duration}:${data.nonce}:${data.timestamp}`;
    const verified = await verifyEd25519Signature(data.walletAddress, message, data.signature);
    if (!verified) {
      return {
        valid: false,
        error: "Wallet signature verification failed",
        statusCode: 403,
      };
    }
  }

  // ── All checks passed ──
  return { valid: true, statusCode: 200, data };
}

// ── Utility: Generate challenge for client to sign ───────────

export function generateScoreChallenge(
  gameSlug: string,
  walletAddress: string,
  serverSecret: string,
): { nonce: string; challenge: string; expiresAt: number } {
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const timestamp = Date.now();
  const challenge = `${gameSlug}:${walletAddress}:${nonce}:${timestamp}`;
  const hash = createHmac("sha256", serverSecret).update(challenge).digest("hex");

  return {
    nonce,
    challenge: `${challenge}:${hash}`,
    expiresAt: timestamp + 300_000, // 5 min expiry
  };
}
