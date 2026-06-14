/**
 * ═══════════════════════════════════════════════════════════════
 * aggregateByPlayer — Pure aggregation function
 *
 * Groups raw ScoreEntry[] into deduplicated PlayerRow[] by
 * wallet (XRPL) or userId (Google) or displayName/name fallback.
 * Sorted descending by totalScore, capped at LEADERBOARD_SIZE.
 * ═══════════════════════════════════════════════════════════════
 */

import { truncateAddress } from "@/lib/format";
import type { ScoreEntry } from "@/features/arcade";

export interface PlayerRow {
  /** Best display name available */
  displayName: string;
  /** Wallet address (if XRPL) */
  wallet?: string;
  /** Google userId (if web2) */
  userId?: string;
  /** Sum of scores across games */
  totalScore: number;
  /** Count of distinct games played */
  gamesPlayed: number;
  /** Best rank across all game entries */
  bestRank: number;
  /** Most recent timestamp */
  lastActive: number;
}

export const LEADERBOARD_SIZE = 100;

export function aggregateByPlayer(entries: ScoreEntry[]): PlayerRow[] {
  const map = new Map<string, PlayerRow>();

  for (const entry of entries) {
    // Key by wallet (XRPL) or userId (Google) or name fallback
    const key =
      entry.wallet?.toLowerCase() ||
      entry.userId ||
      entry.displayName ||
      entry.name ||
      `anon-${Math.random()}`;

    const existing = map.get(key);
    if (existing) {
      existing.totalScore += entry.score;
      existing.gamesPlayed += 1;
      if (entry.ts && entry.ts > existing.lastActive) {
        existing.lastActive = entry.ts;
      }
      // Keep best display name
      if (entry.displayName && !existing.displayName) {
        existing.displayName = entry.displayName;
      }
    } else {
      map.set(key, {
        displayName:
          entry.displayName ||
          entry.name ||
          (entry.wallet ? truncateAddress(entry.wallet) : "Anonymous"),
        wallet: entry.wallet,
        userId: entry.userId,
        totalScore: entry.score,
        gamesPlayed: 1,
        bestRank: 0,
        lastActive: entry.ts || 0,
      });
    }
  }

  // Sort by total score descending and assign ranks
  const rows = Array.from(map.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, LEADERBOARD_SIZE);

  rows.forEach((row, i) => {
    row.bestRank = i + 1;
  });

  return rows;
}
