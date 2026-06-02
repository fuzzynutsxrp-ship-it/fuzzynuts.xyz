/**
 * ═══════════════════════════════════════════════════════════════
 *  HMAC-SHA256 — Web Crypto, isomorphic
 *
 *  Same code path in Node 20+ (globalThis.crypto.subtle) and
 *  modern browsers. No Node 'crypto' import, no @noble/* dep.
 *  Constant-time signature comparison via crypto.subtle.verify.
 * ═══════════════════════════════════════════════════════════════
 */

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hmac.fromHex: odd-length hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign `message` with `secret`. Returns lowercase hex (64 chars).
 *
 * Use the same `message` format on both sides — typical:
 *   `${game}|${score}|${duration}|${nonce}|${wallet}|${weekKey}`
 */
export async function signPayload(message: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(sig);
}

/**
 * Verify a hex-encoded HMAC against `message`. Constant-time.
 * Returns true iff the signature matches.
 */
export async function verifyPayload(
  message: string,
  hexSignature: string,
  secret: string,
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(hexSignature)) return false;
  const key = await importKey(secret);
  const sigBytes = fromHex(hexSignature);
  return crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, encoder.encode(message));
}

/**
 * Canonical message format for score-submission HMACs.
 * Keep this function the only producer — never inline.
 */
export function buildScoreMessage(parts: {
  game: string;
  score: number;
  duration: number;
  nonce: string;
  wallet: string;
  weekKey: string;
}): string {
  return `${parts.game}|${parts.score}|${parts.duration}|${parts.nonce}|${parts.wallet}|${parts.weekKey}`;
}
