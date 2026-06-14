"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useMyRank — Fetch the current user's global rank + personal stats
 *
 * Uses the server-side /api/scores/aggregate?wallet= endpoint
 * to get rank data in a SINGLE request instead of 38+ parallel
 * per-game fetches. Properly cleans up AbortController on unmount.
 *
 * Supports two identity sources:
 *   1. XRPL wallet address (from useWalletStore)
 *   2. Google Auth session userId (from next-auth useSession)
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { API_SCORES_AGGREGATE } from "../constants";
import { getCurrentWeekKey } from "../utils/scoreHelpers";

export interface MyRankData {
  rank: number | null;
  totalScore: number;
  gamesPlayed: number;
  nextRankScore: number | null;
  prevRankScore: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches aggregated rank data in a single request.
 *
 * @param userId - Wallet address or Google session userId
 * @param timeframe - "weekly" or "alltime"
 * @returns Rank data, personal stats, loading/error states
 */
export function useMyRank(
  userId: string | null,
  timeframe: "weekly" | "alltime" = "weekly",
): MyRankData {
  const [rank, setRank] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextRankScore, setNextRankScore] = useState<number | null>(null);
  const [prevRankScore, setPrevRankScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the current AbortController for cleanup
  const abortRef = useRef<AbortController | null>(null);

  const fetchRank = useCallback(async () => {
    if (!userId) return;

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const weekParam =
        timeframe === "weekly" ? `?week=${getCurrentWeekKey()}` : "";
      const walletParam = weekParam ? "&" : "?";
      const url = `${API_SCORES_AGGREGATE}${weekParam}${walletParam}wallet=${encodeURIComponent(userId)}`;

      const res = await fetch(url, {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // The aggregate endpoint returns { rank, totalScore, gamesPlayed,
      // nextRankScore, prevRankScore, scores } when wallet is provided
      setRank(data.rank ?? null);
      setTotalScore(data.totalScore ?? 0);
      setGamesPlayed(data.gamesPlayed ?? 0);
      setNextRankScore(data.nextRankScore ?? null);
      setPrevRankScore(data.prevRankScore ?? null);
      setLoading(false);
    } catch (err) {
      // Don't update state if this request was aborted
      if (controller.signal.aborted) return;

      setRank(null);
      setTotalScore(0);
      setGamesPlayed(0);
      setNextRankScore(null);
      setPrevRankScore(null);
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Failed to load rank data",
      );
    }
  }, [userId, timeframe]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRank();

    // Cleanup: abort in-flight request on unmount or dep change
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [fetchRank]);

  return {
    rank,
    totalScore,
    gamesPlayed,
    nextRankScore,
    prevRankScore,
    loading,
    error,
    refetch: fetchRank,
  };
}
