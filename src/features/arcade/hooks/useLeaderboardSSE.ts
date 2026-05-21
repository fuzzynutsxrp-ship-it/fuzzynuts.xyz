"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useLeaderboardSSE — SSE-based leaderboard with polling fallback
 *
 * Real-time leaderboard updates via Server-Sent Events with
 * automatic degradation to polling when:
 *   - Browser doesn't support EventSource
 *   - SSE connection fails or drops
 *   - Server returns non-2xx
 *
 * Integrates with Zustand wallet store for user rank highlighting.
 * Returns the same LeaderboardReturn interface as useLeaderboard
 * for drop-in replacement compatibility.
 *
 * Wire protocol:
 *   GET /api/scores/stream?timeframe=weekly&game=mario&watch=rXxx
 *   → message: { type: "update"|"replace", data: ScoreEntry[] }
 *   → event: heartbeat
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useWalletStore } from "@/store/wallet";

import type { ScoreEntry, LeaderboardReturn } from "../types/arcade";
import { API_SCORES, MAX_ENTRIES } from "../constants";
import { getCurrentWeekKey, getLocalScores, mergeScores } from "../utils/scoreHelpers";
import { useLeaderboard } from "./useLeaderboard";

/* ── SSE Configuration ── */

interface UseLeaderboardSSEOptions {
  gameSlug?: string;
  timeframe: "weekly" | "alltime";
  enabled?: boolean;
}

/** SSE endpoint — backend must serve this */
const SSE_ENDPOINT = `${API_SCORES}/stream`;

/** Max time (ms) without a heartbeat before reconnecting */
const HEARTBEAT_TIMEOUT_MS = 45_000;

/** Backoff delays for reconnection attempts */
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/* ── Hook ── */

/**
 * Real-time leaderboard via Server-Sent Events.
 *
 * Dual-mode operation:
 *   1. Primary: SSE stream for sub-2s latency
 *   2. Fallback: polling hook (useLeaderboard) for compatibility
 *
 * @param game - Game ID to filter scores by
 * @param week - ISO week key (defaults to current week)
 */
export function useLeaderboardSSE(
  game: string,
  week?: string,
): LeaderboardReturn {
  const resolvedWeek = week || getCurrentWeekKey();

  /* ── SSE-driven state ── */
  const [sseScores, setSseScores] = useState<ScoreEntry[] | null>(null);
  const [sseError, setSseError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [lastSseUpdate, setLastSseUpdate] = useState<number | null>(null);

  /* ── Refs for lifecycle management ── */
  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  /* ── Zustand wallet integration ── */
  const walletAddress = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);

  /* ── Fallback: standard polling hook (always runs) ── */
  const pollingHook = useLeaderboard(game, resolvedWeek);

  /* ── Determine SSE capability ── */
  const canUseSSE = typeof EventSource !== "undefined";

  /** Cleanup SSE connection */
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    setSseConnected(false);
  }, []);

  /** Reset heartbeat watchdog */
  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      console.warn("[SSE] Heartbeat timeout — reconnecting…");
      closeSSE();
    }, HEARTBEAT_TIMEOUT_MS);
  }, [closeSSE]);

  /** Process incoming score data */
  const processScores = useCallback(
    (raw: ScoreEntry[]) => {
      const normalized = raw.map((entry) => ({
        ...entry,
        wallet: entry.wallet || "",
        game: entry.game || game,
      }));

      const localScores = getLocalScores(game, resolvedWeek);
      const merged = mergeScores(normalized, localScores);
      const sorted = merged
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_ENTRIES);

      setSseScores(sorted);
      setSseError(null);
      setLastSseUpdate(Date.now());
    },
    [game, resolvedWeek],
  );

  /** Connect to SSE stream */
  const connectSSE = useCallback(() => {
    if (!canUseSSE || !mountedRef.current) return;

    closeSSE();

    const params = new URLSearchParams({
      timeframe: "weekly",
      stream: "true",
      game,
      week: resolvedWeek,
    });
    if (walletAddress) params.append("watch", walletAddress);

    const url = `${SSE_ENDPOINT}?${params}`;
    console.log(`[SSE] Connecting: ${url}`);

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      console.log("[SSE] Connected");
      setSseConnected(true);
      setSseError(null);
      reconnectAttemptRef.current = 0;
      resetHeartbeat();
    };

    /* ── Generic message handler (works with simple backends) ── */
    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const update: { type: "initial" | "update" | "replace"; data: ScoreEntry[] } =
          JSON.parse(event.data);

        if (update.type === "replace" || update.type === "initial") {
          processScores(update.data);
        } else {
          // Incremental merge
          setSseScores((prev) => {
            if (!prev) return update.data;
            const merged = [...prev];
            for (const entry of update.data) {
              const idx = merged.findIndex(
                (e) =>
                  e.wallet?.toLowerCase() === entry.wallet?.toLowerCase() &&
                  e.game === entry.game,
              );
              if (idx >= 0) {
                if (entry.score > merged[idx].score) {
                  merged[idx] = { ...merged[idx], ...entry };
                }
              } else {
                merged.push(entry);
              }
            }
            return merged.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
          });
          setLastSseUpdate(Date.now());
        }
        setSseError(null);
        resetHeartbeat();
      } catch (err) {
        console.warn("SSE parse error:", err);
      }
    };

    /* ── Named event: leaderboard snapshot ── */
    es.addEventListener("leaderboard", (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const scores: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.scores || data.leaderboard || data.data || [];
        processScores(scores);
        resetHeartbeat();
      } catch (err) {
        console.error("[SSE] Failed to parse leaderboard event:", err);
      }
    });

    /* ── Named event: single score update ── */
    es.addEventListener("score_update", (event) => {
      if (!mountedRef.current) return;
      try {
        const update: ScoreEntry = JSON.parse(event.data);
        setSseScores((prev) => {
          if (!prev) return prev;
          const existing = prev.findIndex(
            (s) =>
              s.wallet?.toLowerCase() === update.wallet?.toLowerCase() &&
              s.game === update.game,
          );
          const updated = [...prev];
          if (existing >= 0) {
            if (update.score > updated[existing].score) {
              updated[existing] = { ...updated[existing], ...update };
            }
          } else {
            updated.push(update);
          }
          return updated
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_ENTRIES);
        });
        setLastSseUpdate(Date.now());
        resetHeartbeat();
      } catch (err) {
        console.error("[SSE] Failed to parse score_update:", err);
      }
    });

    /* ── Named event: heartbeat keepalive ── */
    es.addEventListener("heartbeat", () => {
      resetHeartbeat();
    });

    /* ── Error handling with exponential backoff ── */
    es.onerror = () => {
      if (!mountedRef.current) return;

      console.warn("[SSE] Connection failed — falling back to polling");
      closeSSE();
      setSseError("SSE connection lost — using cached data");

      const attempt = reconnectAttemptRef.current;
      const delay =
        RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;

      console.warn(
        `[SSE] Reconnecting in ${delay}ms (attempt ${attempt + 1})`,
      );

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectSSE();
      }, delay);
    };
  }, [canUseSSE, game, resolvedWeek, walletAddress, closeSSE, resetHeartbeat, processScores]);

  /* ── Connect on mount / game+week change ── */
  useEffect(() => {
    mountedRef.current = true;

    if (canUseSSE) {
      connectSSE();
    }

    return () => {
      mountedRef.current = false;
      closeSSE();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [canUseSSE, connectSSE, closeSSE]);

  /* ── Reconnect when tab becomes visible ── */
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        canUseSSE &&
        !eventSourceRef.current
      ) {
        reconnectAttemptRef.current = 0;
        connectSSE();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [canUseSSE, connectSSE]);

  /* ── Manual refresh ── */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (canUseSSE) {
      closeSSE();
      reconnectAttemptRef.current = 0;
      connectSSE();
    }
    await pollingHook.manualRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [canUseSSE, closeSSE, connectSSE, pollingHook]);

  /* ── Find user's rank in current scores (used by options overload) ── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _userRank =
    isConnected && walletAddress
      ? sseScores?.find(
          (s) => s.wallet?.toLowerCase() === walletAddress.toLowerCase(),
        ) ?? null
      : null;

  /* ═══════════════════════════════════════════════════════════════
     Return: prefer SSE data, fall back to polling data.
     Maintains LeaderboardReturn interface compatibility.
     ═══════════════════════════════════════════════════════════════ */

  const useSSEData = sseConnected && sseScores !== null;

  return {
    scores: useSSEData ? sseScores : pollingHook.scores,
    loading: useSSEData ? false : pollingHook.loading,
    error: useSSEData ? sseError : pollingHook.error,
    lastFetched: useSSEData ? lastSseUpdate : pollingHook.lastFetched,
    isRefreshing: isRefreshing || pollingHook.isRefreshing,
    refetch: pollingHook.refetch,
    manualRefresh,
  };
}

/* ── Options-based overload for flexible usage ── */

export function useLeaderboardSSEWithOptions({
  gameSlug,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeframe: _timeframe,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enabled: _enabled = true,
}: UseLeaderboardSSEOptions): LeaderboardReturn & {
  userRank: ScoreEntry | null;
  isStreaming: boolean;
  lastUpdated: Date | null;
} {
  const game = gameSlug || "all";
  const hook = useLeaderboardSSE(game);

  const walletAddress = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);

  const userRank =
    isConnected && walletAddress
      ? hook.scores.find(
          (s) => s.wallet?.toLowerCase() === walletAddress.toLowerCase(),
        ) ?? null
      : null;

  return {
    ...hook,
    userRank,
    isStreaming: typeof EventSource !== "undefined",
    lastUpdated: hook.lastFetched ? new Date(hook.lastFetched) : null,
  };
}
