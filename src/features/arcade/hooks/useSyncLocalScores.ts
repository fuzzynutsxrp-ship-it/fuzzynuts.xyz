"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useSyncLocalScores — Push unsynced localStorage scores to backend
 *
 * Extracted from useArcadeState.ts for single-responsibility.
 * When a wallet connects, check if there are localStorage scores
 * that were never synced (submitted as guest or when offline).
 * Push them to the backend so they appear on the leaderboard.
 * ═══════════════════════════════════════════════════════════════
 */

import { useRef, useEffect } from "react";

import type { LocalScoreEntry } from "../types/arcade";
import { API_SCORES, LOCAL_STORAGE_KEY } from "../constants";
import { getCurrentWeekKey } from "../utils/scoreHelpers";

/**
 * Auto-syncs localStorage scores to the backend when a wallet is connected.
 * Runs once per game on mount and whenever the wallet address changes.
 *
 * @param game   - Game slug to sync scores for
 * @param wallet - Connected wallet address (null if disconnected)
 */
export function useSyncLocalScores(game: string, wallet: string | null): void {
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wallet || syncedRef.current === wallet) return;

    const weekKey = getCurrentWeekKey();

    try {
      const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
      if (data.weekKey !== weekKey) return;

      const localEntries: LocalScoreEntry[] = data.scores?.[game] || [];
      const personalBest = data.personalBests?.[game];

      // Find the best score for this wallet or any unsynced entry
      let bestScore = 0;
      for (const entry of localEntries) {
        if (entry.score > bestScore) {
          // If entry has an address, it must match current wallet
          if (!entry.address || entry.address.toLowerCase() === wallet.toLowerCase()) {
            bestScore = entry.score;
          }
        }
      }

      // Also check personalBests (may have a higher score)
      if (personalBest && personalBest > bestScore) {
        bestScore = personalBest;
      }

      if (bestScore <= 0) return;

      // POST to backend
      const payload = {
        game,
        score: Math.floor(bestScore),
        wallet,
        timestamp: Date.now(),
      };

      fetch(API_SCORES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.ok) {
            console.log(`[SyncScores] Synced ${game} score ${bestScore} for ${wallet}`);
          } else {
            console.warn(`[SyncScores] Backend rejected:`, result.error);
          }
        })
        .catch((err) => {
          console.warn(`[SyncScores] Sync failed:`, err.message);
        });

      syncedRef.current = wallet;
    } catch {
      // localStorage unavailable
    }
  }, [game, wallet]);
}
