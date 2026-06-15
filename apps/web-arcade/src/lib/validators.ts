/**
 * Shared validators for profile/identity types used across
 * the profile and leaderboard features.
 */

/** XRPL wallet address (classic address starting with 'r') */
export function isWalletAddress(id: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(id);
}

/** Guest ID format (Guest-XXXX where X is hex) */
export function isGuestId(id: string): boolean {
  return /^Guest-[0-9a-fA-F]{4,8}$/.test(id);
}
