/**
 * Weekly prize tiers — rank → $NUT payout.
 * USD-denominated tier amounts live server-side in the API
 * (rewards-api / xrpl-token-utils), since they depend on the
 * AMM-snapshotted NUT/USD price.
 */

export interface PrizeTier {
  readonly rank: 1 | 2 | 3;
  readonly label: string;
  readonly nutAmount: number;
  readonly emoji: string;
}

export const PRIZE_TIERS: readonly PrizeTier[] = [
  { rank: 1, label: "1st Place", nutAmount: 250_000, emoji: "🥇" },
  { rank: 2, label: "2nd Place", nutAmount: 150_000, emoji: "🥈" },
  { rank: 3, label: "3rd Place", nutAmount: 100_000, emoji: "🥉" },
] as const;

export const TOTAL_WEEKLY_NUT_POOL = PRIZE_TIERS.reduce((sum, t) => sum + t.nutAmount, 0);
