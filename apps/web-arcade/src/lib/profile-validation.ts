/**
 * Profile ID validation guards.
 *
 * Valid profile IDs:
 *   - XRPL wallet address (r...) — 25-35 chars, base58
 *   - Guest ID (Guest-XXXX) — hex suffix, 4-8 chars
 */

const WALLET_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
const GUEST_REGEX = /^Guest-[0-9a-fA-F]{4,8}$/;

/** Check if an ID is a valid XRPL wallet address */
export function isWalletAddress(id: string): boolean {
  return WALLET_REGEX.test(id);
}

/** Check if an ID is a valid guest ID (Guest-XXXX) */
export function isGuestId(id: string): boolean {
  return GUEST_REGEX.test(id);
}

/** Check if an ID is any valid profile identifier */
export function isValidProfileId(id: string): boolean {
  return isWalletAddress(id) || isGuestId(id);
}
