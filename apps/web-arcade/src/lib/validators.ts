/**
 * Shared validators for profile/identity types used across
 * the profile and leaderboard features.
 */

/** XRPL wallet address (classic address starting with 'r') */
const WALLET_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;
export function isWalletAddress(id: string): boolean {
  return WALLET_RE.test(id);
}

/** Guest ID format (Guest-XXXX where X is hex) */
const GUEST_RE = /^Guest-[0-9a-fA-F]{4,8}$/;
export function isGuestId(id: string): boolean {
  return GUEST_RE.test(id);
}
