"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useMyRank — Fetch the current user's global rank + personal stats
 *
 * Aggregates scores across all games, computes global rank from
 * the merged leaderboard, and fetches the user's personal score
 * history for stats like total score and games played.
 *
 * Supports two identity sources:
 *   1. XRPL wallet address (from useWalletStore)
 *   2. Google Auth session userId (from next-auth useSession)
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import { GAMES } from "@/lib/utils";
import { API_SCORES, MAX_ENTRIES } from "../constants";
import { toBackendSlug } from "../slugAliases";
import type { ScoreEntry } from "../types/arcade";

export interface MyRankData {
  rank: number | null;
  totalScore: number;
  gamesPlayed: number;
  nextRankScore: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches aggregated leaderboard across all games and personal
 * scores to compute the user's global rank and stats.
 *
 * @param userId - Wallet address or Google session userId
 * @returns Rank data, personal stats, loading/error states
 */
export function useMyRank(userId: string | null): MyRankData {
  const [rank, setRank] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextRankScore, setNextRankScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRank = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch ALL scores across all games
      const promises = GAMES.map(async (game) => {
        const backendSlug = toBackendSlug(game.id);
        const url = `${API_SCORES}?game=${backendSlug}&limit=${MAX_ENTRIES}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return [];
        const data = await res.json();
        const raw: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.leaderboard || data.scores || data.data || [];
        return raw.map((e: ScoreEntry) => ({
          ...e,
          game: e.game || game.id,
        }));
      });

      // 2. Fetch user's personal scores
      const userUrl = `${API_SCORES}?wallet=${encodeURIComponent(userId)}`;
      const userPromise = fetch(userUrl, {
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          const raw: ScoreEntry[] = Array.isArray(d)
            ? d
            : d.scores || d.data || [];
          return raw;
        })
        .catch(() => [] as ScoreEntry[]);

      const [gameResults, userScores] = await Promise.all([
        Promise.all(promises),
        userPromise,
      ]);

      // 3. Merge all game scores into one global leaderboard
      const allScores = gameResults
        .flat()
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);

      // 4. Find user rank (case-insensitive match on wallet, or userId)
      const uid = userId.toLowerCase();
      const rankIndex = allScores.findIndex(
        (s) =>
          s.wallet?.toLowerCase() === uid ||
          s.userId?.toLowerCase() === uid,
      );
      const userRank = rankIndex >= 0 ? rankIndex + 1 : null;

      // 5. Score needed for next rank
      const nextScore =
        rankIndex > 0 ? allScores[rankIndex - 1].score : null;

      // 6. Personal stats from user's own scores
      const uniqueGames = new Set(
        (userScores as ScoreEntry[]).map((s) => s.game),
      );
      const bestPerGame = new Map<string, number>();
      for (const s of userScores as ScoreEntry[]) {
        const existing = bestPerGame.get(s.game) ?? 0;
        if (s.score > existing) bestPerGame.set(s.game, s.score);
      }
      const userTotal = Array.from(bestPerGame.values()).reduce(
        (sum, s) => sum + s,
        0,
      );

      setRank(userRank);
      setTotalScore(userTotal);
      setGamesPlayed(uniqueGames.size);
      setNextRankScore(nextScore);
      setLoading(false);
    } catch (err) {
      setRank(null);
      setTotalScore(0);
      setGamesPlayed(0);
      setNextRankScore(null);
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to load rank data",
      );
    }
  }, [userId]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchRank();
  }, [fetchRank]);

  return {
    rank,
    totalScore,
    gamesPlayed,
    nextRankScore,
    loading,
    error,
    refetch: fetchRank,
  };
}
