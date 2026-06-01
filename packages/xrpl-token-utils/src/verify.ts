/**
 * verifyXrplSignature — wraps xrpl.js v4 functions for both ed25519 and
 * secp256k1 keys. Used by apps/api/src/routes/auth.ts /verify endpoint.
 *
 * XRPL v4 exports:
 *   - verifySignature(tx, publicKey)       — transaction blob verification
 *   - verifyKeypairSignature(msg, sig, pk) — arbitrary message verification
 *   - deriveAddress(publicKey)             — r-address from public key
 *
 * The XRPL public-key prefix byte tells us which curve:
 *   0xED → ed25519
 *   0x02 / 0x03 → secp256k1 compressed
 */

import {
  verifyKeypairSignature,
  verifySignature,
  deriveAddress,
} from "xrpl";

export interface VerifyArgs {
  /** Hex-encoded signed-blob OR plain message; see `mode`. */
  readonly payload: string;
  /** Hex-encoded signature from the wallet. */
  readonly signature: string;
  /** Hex-encoded public key (33 bytes secp256k1 / 32 bytes ed25519). */
  readonly publicKey: string;
  /** Expected XRPL r-address derived from the public key. */
  readonly expectedAddress: string;
}

export interface VerifyResult {
  readonly valid: boolean;
  readonly derivedAddress: string;
  readonly addressMatch: boolean;
  readonly error?: string;
}

/**
 * Verify a signed XRPL transaction blob (what Xumm SignIn payloads return).
 * `payload` should be the hex-encoded TxBlob as Xumm returns it.
 */
export function verifySignedTxBlob({
  payload,
  publicKey,
  expectedAddress,
}: Pick<VerifyArgs, "payload" | "publicKey" | "expectedAddress">): VerifyResult {
  try {
    // xrpl.js v4: verifySignature(tx, publicKey) verifies a transaction blob
    const derivedAddress = deriveAddress(publicKey);
    const valid = verifySignature(payload, publicKey);
    return {
      valid,
      derivedAddress,
      addressMatch: derivedAddress === expectedAddress,
    };
  } catch (e) {
    return {
      valid: false,
      derivedAddress: "",
      addressMatch: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Verify an arbitrary message signature from an XRPL wallet.
 *
 * Unlike verifySignedTxBlob (which expects a hex-encoded transaction blob),
 * this function verifies a plain-text message signed by the wallet.
 *
 * The message is UTF-8 encoded to hex before verification. This is required
 * because ripple-keypairs.verify() (re-exported as verifyKeypairSignature)
 * expects a hex-encoded byte string and internally calls hexToBytes().
 *
 * Encoding chain:
 *   Wallet signs:   Buffer.from(challenge, "utf-8") → bytes → sign(bytes, privateKey)
 *   Backend verifies: Buffer.from(challenge, "utf-8").toString("hex") → verifyKeypairSignature(hex, sig, pk)
 *
 * Wallet SDK signs this exact string. Backend verifies UTF-8 directly
 * via verifyKeypairSignature after hex-encoding.
 *
 * @param message  - The plain-text challenge string the wallet signed (UTF-8).
 * @param signature - Hex-encoded signature from the wallet.
 * @param publicKey - Hex-encoded public key (33 bytes secp256k1 / 32 bytes ed25519).
 * @param expectedAddress - Expected XRPL r-address derived from the public key.
 */
export function verifyMessageSignature({
  message,
  signature,
  publicKey,
  expectedAddress,
}: {
  readonly message: string;
  readonly signature: string;
  readonly publicKey: string;
  readonly expectedAddress: string;
}): VerifyResult {
  try {
    // ripple-keypairs.verify expects hex-encoded message bytes.
    // The wallet signs the raw UTF-8 bytes; we hex-encode for verification.
    const messageHex = Buffer.from(message, "utf-8").toString("hex");

    const valid = verifyKeypairSignature(messageHex, signature, publicKey);
    const derivedAddress = deriveAddress(publicKey);
    return {
      valid,
      derivedAddress,
      addressMatch: derivedAddress === expectedAddress,
    };
  } catch (e) {
    return {
      valid: false,
      derivedAddress: "",
      addressMatch: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Canonical challenge string format for game session authentication.
 *
 * Both the API server (issuer) and the wallet client (signer) must use
 * this exact format. Changing the format breaks existing signatures.
 *
 * Wallet SDK signs this exact string. Backend verifies UTF-8 directly
 * via verifyKeypairSignature after hex-encoding.
 *
 * @param nonce - Random nonce from mintNonce().
 * @param wallet - XRPL r-address of the player (unused in format, kept for API compat).
 * @param domain - Ignored (kept for backwards compat with existing call sites).
 * @returns Canonical challenge string for signing.
 */
export function formatGameChallenge(
  nonce: string,
  _wallet: string,
  _domain: string = "fuzzynuts.xyz",
): string {
  return `FuzzyNuts-Auth-${nonce}-${Date.now()}`;
}
