"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useLeaderboard — Fetch, poll, and filter leaderboard scores
 *
 * Extracted from useArcadeState.ts for single-responsibility.
 * Handles auto-polling every 30s, visibility-change refetch,
 * and localStorage fallback when the server is unreachable.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from "react";

import type { ScoreEntry, LeaderboardReturn } from "../types/arcade";
import { API_SCORES, AUTO_POLL_MS, MAX_ENTRIES } from "../constants";
import { getCurrentWeekKey, getLocalScores, mergeScores } from "../utils/scoreHelpers";
import { toBackendSlug } from "../slugAliases";

/**
 * Fetches leaderboard data for a given game and week, with auto-polling
 * every 30s and refetch on visibility change. Falls back to localStorage
 * cached scores when the server is unreachable.
 *
 * @param game   - Game ID to filter scores by
 * @param week   - ISO week key (e.g., "2026-W20"), defaults to current week
 * @returns Object with scores array, loading/error states, and refetch functions
 */
export function useLeaderboard(game: string, week?: string): LeaderboardReturn {
  const resolvedWeek = week || getCurrentWeekKey();

  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastManualRef = useRef(0);
  const REFRESH_COOLDOWN_MS = 10_000;

  /** Core fetch logic with AbortController cleanup */
  const fetchScores = useCallback(
    async (showLoading = true) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (showLoading) {
        setLoading(true);
        setError(null);
      }

      // The backend (Mongo) stores legacy slugs (e.g. "survivors", "racer")
      // while the frontend speaks canonical registry slugs ("fuzzy-survivors",
      // "nut-racer"). Translate at the API/localStorage boundary; identity for
      // already-aligned slugs.
      const backendGame = toBackendSlug(game);

      try {
        const url = `${API_SCORES}?game=${backendGame}&week=${resolvedWeek}&limit=${MAX_ENTRIES}`;
        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();
        const raw: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.leaderboard || data.scores || data.data || [];

        // Normalize: API may return `rank`+`wallet` but missing `game` field
        const normalized = raw.map((entry) => ({
          ...entry,
          wallet: entry.wallet || "",
          game: entry.game || game,
        }));

        // Merge with localStorage fallback scores
        const localScores = getLocalScores(backendGame, resolvedWeek);
        const merged = mergeScores(normalized, localScores);

        const sorted = merged.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);

        setScores(sorted);
        setLoading(false);
        setError(null);
        setLastFetched(Date.now());
      } catch (err) {
        // Ignore abort errors (component unmounted or re-fetched)
        if (err instanceof DOMException && err.name === "AbortError") return;

        // Fallback to localStorage
        try {
          const localScores = getLocalScores(backendGame, resolvedWeek);
          if (localScores.length > 0) {
            setScores(localScores.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES));
            setLoading(false);
            setError("Showing cached scores — server temporarily unreachable");
            setLastFetched(Date.now());
            return;
          }
        } catch {
          // localStorage unavailable
        }

        setScores([]);
        setLoading(false);
        setError(
          err instanceof Error && err.name === "TimeoutError"
            ? "Request timed out — please try again"
            : "Unable to reach the leaderboard server",
        );
      }
    },
    [game, resolvedWeek],
  );

  /** Manual refresh with cooldown */
  const manualRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRef.current < REFRESH_COOLDOWN_MS) return;
    lastManualRef.current = now;
    setIsRefreshing(true);
    await fetchScores(false);
    setTimeout(() => setIsRefreshing(false), 600);
  }, [fetchScores]);

  /** Setup: initial fetch + polling + visibility change listener */
  useEffect(() => {
    fetchScores(true);

    // Auto-poll every 30s
    pollRef.current = setInterval(() => {
      fetchScores(false);
    }, AUTO_POLL_MS);

    // Re-fetch when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchScores(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      abortRef.current?.abort();
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchScores]);

  return {
    scores,
    loading,
    error,
    lastFetched,
    isRefreshing,
    refetch: fetchScores,
    manualRefresh,
  };
}
