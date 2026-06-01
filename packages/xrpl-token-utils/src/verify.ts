/**
 * verifyXrplSignature — wraps xrpl.js verify() for both ed25519 and
 * secp256k1 keys. Used by apps/api/src/routes/auth.ts /verify endpoint.
 *
 * The XRPL public-key prefix byte tells us which curve:
 *   0xED → ed25519
 *   0x02 / 0x03 → secp256k1 compressed
 * xrpl.js's `verify` handles both transparently when given the
 * transaction blob; for arbitrary message verification we route to
 * the appropriate primitive.
 */

import { verify as xrplVerify, deriveAddress } from "xrpl";

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
    const valid = xrplVerify(payload);
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
