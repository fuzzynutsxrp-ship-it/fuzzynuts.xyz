"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   Shared Types — Used across Leaderboard, GameWrapper, UserProfile
   ═══════════════════════════════════════════════════════════════ */

/** A single leaderboard score entry from the API */
export interface ScoreEntry {
  wallet: string;
  name?: string;
  score: number;
  game: string;
  ts: number;
  session?: string;
  hasTrustline?: boolean;
  eligible?: boolean;
}

/** Eligibility data returned by /api/rewards/eligibility */
export interface EligibilityData {
  eligible: boolean;
  rank: number | null;
  game: string | null;
  prize: number | null;
  claimed: boolean;
  txHash: string | null;
}

/** Claim response from /api/rewards/claim */
export interface ClaimResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

/** Per-game score submission caps (anti-cheat ceiling) */
export const SCORE_CAPS: Record<string, number> = {
  "top-secret": 1_000_000,
  "fuzzynuts-world": 10_000_000,
  mario: 9_999_990,
  survivors: 5_000_000,
  minigolf: 100_000,
  racer: 2_000_000,
};

/** Minimum play duration in ms before a score is considered legit */
const MIN_PLAY_DURATION_MS = 5_000;

/** Debounce cooldown between score submissions */
const SUBMIT_COOLDOWN_MS = 5_000;

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const API_SCORES = "https://world.fuzzynuts.xyz/api/scores";
const API_REWARDS = "https://world.fuzzynuts.xyz/api/rewards";
const AUTO_POLL_MS = 30_000;
const MAX_ENTRIES = 50;
const REFRESH_COOLDOWN_MS = 10_000;

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

/** Compute ISO week key (e.g., "2026-W20") */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Compute N weeks ago in ISO week format */
export function getWeekKeyOffset(weeksAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeksAgo * 7);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Relative time display (e.g., "5m ago", "2h ago").
 * Returns "just now" for times less than 60s ago.
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* ═══════════════════════════════════════════════════════════════
   useLeaderboard — Fetch, poll, and filter leaderboard scores
   ═══════════════════════════════════════════════════════════════ */

interface LeaderboardReturn {
  scores: ScoreEntry[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isRefreshing: boolean;
  refetch: (showLoading?: boolean) => Promise<void>;
  manualRefresh: () => Promise<void>;
}

/**
 * Fetches leaderboard data for a given game and week, with auto-polling
 * every 30s and refetch on visibility change. Falls back to localStorage
 * cached scores when the server is unreachable.
 *
 * @param game   - Game ID to filter scores by
 * @param week   - ISO week key (e.g., "2026-W20"), defaults to current week
 * @returns Object with scores array, loading/error states, and refetch functions
 */
export function useLeaderboard(
  game: string,
  week?: string
): LeaderboardReturn {
  const resolvedWeek = week || getCurrentWeekKey();

  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastManualRef = useRef(0);
  const STORAGE_KEY = "fuzzy_arcade_scores";

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

      try {
        const url = `${API_SCORES}?game=${game}&week=${resolvedWeek}&limit=${MAX_ENTRIES}`;
        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();
        const raw: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.scores || data.data || [];

        const sorted = raw
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_ENTRIES);

        setScores(sorted);
        setLoading(false);
        setError(null);
        setLastFetched(Date.now());
      } catch (err) {
        // Ignore abort errors (component unmounted or re-fetched)
        if (err instanceof DOMException && err.name === "AbortError") return;

        // Fallback to localStorage
        try {
          const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
          const weekKey = getCurrentWeekKey();
          if (cached.weekKey === weekKey && cached.scores?.[game]?.length > 0) {
            const local: ScoreEntry[] = cached.scores[game];
            setScores(local.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES));
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
            : "Unable to reach the leaderboard server"
        );
      }
    },
    [game, resolvedWeek]
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

/* ═══════════════════════════════════════════════════════════════
   useScoreSubmission — Validate & submit scores with anti-cheat
   ═══════════════════════════════════════════════════════════════ */

/** Status for score submission toasts */
export type SubmissionStatus = "idle" | "submitting" | "success" | "error";

interface ScoreSubmissionReturn {
  status: SubmissionStatus;
  errorMessage: string | null;
  /** Register the game start time (call when iframe loads/game begins) */
  markGameStart: () => void;
  /** Dismiss the toast manually */
  dismiss: () => void;
}

/**
 * Manages score submission lifecycle inside GameWrapper.
 * Listens for postMessage events from the game iframe, validates
 * against score caps and minimum play duration, and debounces
 * rapid submissions. Tracks session uniqueness via localStorage.
 *
 * @param slug - Game ID slug for score cap lookup
 * @returns Object with submission status, error message, and control functions
 */
export function useScoreSubmission(slug: string): ScoreSubmissionReturn {
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const gameStartRef = useRef<number>(Date.now());
  const lastSubmitRef = useRef<number>(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionKeyRef = useRef<string>(`fuzzy_session_${slug}_${Date.now()}`);

  const markGameStart = useCallback(() => {
    gameStartRef.current = Date.now();
    sessionKeyRef.current = `fuzzy_session_${slug}_${Date.now()}`;
  }, [slug]);

  const dismiss = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;

      // ── Handle score error channel from iframe ──
      if (event.data.type === "SCORE_ERROR") {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setStatus("error");
        setErrorMessage(event.data.message || "Score submission failed");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 5000);
        return;
      }

      // ── Handle standard score submission ──
      if (event.data.type !== "FUZZY_SCORE_SUBMITTED") return;

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      // Debounce: reject if too fast
      const now = Date.now();
      if (now - lastSubmitRef.current < SUBMIT_COOLDOWN_MS) {
        setStatus("error");
        setErrorMessage("Too fast — wait a few seconds between submissions");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Validate play duration
      const duration = now - gameStartRef.current;
      if (duration < MIN_PLAY_DURATION_MS) {
        setStatus("error");
        setErrorMessage("Play session too short — score rejected");
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Validate score cap
      const score = event.data.score as number | undefined;
      const cap = SCORE_CAPS[slug] ?? Infinity;
      if (score !== undefined && (score <= 0 || score > cap)) {
        setStatus("error");
        setErrorMessage(`Invalid score — must be between 1 and ${cap.toLocaleString()}`);
        dismissTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setErrorMessage(null);
        }, 4000);
        return;
      }

      // Duplicate session check
      try {
        const sessionFlag = `fuzzy_submitted_${slug}_${getCurrentWeekKey()}`;
        const lastSession = localStorage.getItem(sessionFlag);
        if (lastSession === sessionKeyRef.current) {
          setStatus("error");
          setErrorMessage("Score already submitted for this session");
          dismissTimerRef.current = setTimeout(() => {
            setStatus("idle");
            setErrorMessage(null);
          }, 4000);
          return;
        }
        // Mark this session as submitted
        localStorage.setItem(sessionFlag, sessionKeyRef.current);
      } catch {
        // localStorage unavailable — proceed anyway
      }

      lastSubmitRef.current = now;

      // Show result from iframe's own submission
      if (event.data.success) {
        setStatus("success");
        setErrorMessage(null);
      } else {
        setStatus("error");
        const reason = event.data.reason || event.data.message;
        if (typeof reason === "string") {
          // Map API error codes to user-friendly messages
          if (reason.includes("429") || reason.toLowerCase().includes("rate")) {
            setErrorMessage("Rate limited — try again in a minute");
          } else if (reason.includes("400") || reason.toLowerCase().includes("validation")) {
            setErrorMessage("Score validation failed — invalid data");
          } else if (reason.includes("500")) {
            setErrorMessage("Server error — please try again later");
          } else {
            setErrorMessage(reason);
          }
        } else {
          setErrorMessage("Score submission failed — try again");
        }
      }

      dismissTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setErrorMessage(null);
      }, 4000);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [slug]);

  return { status, errorMessage, markGameStart, dismiss };
}

/* ═══════════════════════════════════════════════════════════════
   usePayoutEligibility — Check eligibility, claim, track tx
   ═══════════════════════════════════════════════════════════════ */

export type ClaimStatus =
  | "idle"
  | "checking"
  | "eligible"
  | "not-eligible"
  | "confirming"
  | "claiming"
  | "polling"
  | "success"
  | "error"
  | "already-claimed";

interface PayoutReturn {
  eligibility: EligibilityData | null;
  status: ClaimStatus;
  error: string | null;
  txHash: string | null;
  /** Re-check eligibility from the API */
  checkEligibility: () => Promise<void>;
  /** Open confirmation modal (sets status to "confirming") */
  startClaim: () => void;
  /** Cancel confirmation modal */
  cancelClaim: () => void;
  /** Execute the actual claim after confirmation */
  confirmClaim: () => Promise<void>;
}

/**
 * Manages the full payout lifecycle: eligibility check, confirmation,
 * claim execution, polling for transaction status, and persisting
 * claim state to localStorage to prevent double-claims.
 *
 * @param wallet - Connected XRPL wallet address (null if disconnected)
 * @returns Object with eligibility data, claim functions, and status
 */
export function usePayoutEligibility(wallet: string | null): PayoutReturn {
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const CLAIM_STORAGE_KEY = `fuzzy_claimed_${getCurrentWeekKey()}`;

  /** Check if already claimed this week (localStorage guard) */
  const isAlreadyClaimed = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(CLAIM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.wallet === wallet && parsed.claimed) {
          setTxHash(parsed.txHash || null);
          return true;
        }
      }
    } catch {
      // localStorage unavailable
    }
    return false;
  }, [wallet, CLAIM_STORAGE_KEY]);

  /** Fetch eligibility from the API */
  const checkEligibility = useCallback(async () => {
    if (!wallet) return;

    // Check localStorage first
    if (isAlreadyClaimed()) {
      setStatus("already-claimed");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("checking");
    setError(null);

    try {
      const week = getCurrentWeekKey();
      const url = `${API_REWARDS}/eligibility?wallet=${encodeURIComponent(wallet)}&week=${week}`;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data: EligibilityData = await res.json();
      setEligibility(data);

      if (data.claimed) {
        setTxHash(data.txHash || null);
        setStatus("already-claimed");
        // Persist to localStorage
        try {
          localStorage.setItem(
            CLAIM_STORAGE_KEY,
            JSON.stringify({ wallet, claimed: true, txHash: data.txHash })
          );
        } catch {}
      } else if (data.eligible) {
        setStatus("eligible");
      } else {
        setStatus("not-eligible");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Graceful fallback — show not eligible rather than crashing
      setEligibility({
        eligible: false,
        rank: null,
        game: null,
        prize: null,
        claimed: false,
        txHash: null,
      });
      setStatus("not-eligible");
    }
  }, [wallet, isAlreadyClaimed, CLAIM_STORAGE_KEY]);

  /** Open confirmation dialog */
  const startClaim = useCallback(() => {
    setStatus("confirming");
    setError(null);
  }, []);

  /** Cancel confirmation */
  const cancelClaim = useCallback(() => {
    setStatus("eligible");
    setError(null);
  }, []);

  /** Execute claim and poll for tx status */
  const confirmClaim = useCallback(async () => {
    if (!wallet || !eligibility?.eligible) return;

    setStatus("claiming");
    setError(null);

    try {
      const res = await fetch(`${API_REWARDS}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          week: getCurrentWeekKey(),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || `Server returned ${res.status}`;

        // Map specific error types
        if (res.status === 409 || msg.toLowerCase().includes("already")) {
          setStatus("already-claimed");
          try {
            localStorage.setItem(
              CLAIM_STORAGE_KEY,
              JSON.stringify({ wallet, claimed: true, txHash: null })
            );
          } catch {}
          return;
        }

        throw new Error(msg);
      }

      const result: ClaimResponse = await res.json();

      if (result.txHash) {
        setTxHash(result.txHash);
        setStatus("success");
        // Persist claim
        try {
          localStorage.setItem(
            CLAIM_STORAGE_KEY,
            JSON.stringify({ wallet, claimed: true, txHash: result.txHash })
          );
        } catch {}
      } else {
        // No txHash yet — poll for it
        setStatus("polling");
        let attempts = 0;
        const maxAttempts = 15; // 30s max

        pollTimerRef.current = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetch(
              `${API_REWARDS}/claim/status?wallet=${encodeURIComponent(wallet)}&week=${getCurrentWeekKey()}`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.txHash) {
                setTxHash(pollData.txHash);
                setStatus("success");
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                try {
                  localStorage.setItem(
                    CLAIM_STORAGE_KEY,
                    JSON.stringify({ wallet, claimed: true, txHash: pollData.txHash })
                  );
                } catch {}
              } else if (pollData.status === "failed") {
                setError("Transaction failed on XRPL — contact support");
                setStatus("error");
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              }
            }
          } catch {
            // Silently retry
          }
          if (attempts >= maxAttempts) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setStatus("success");
            // Even without txHash, the claim was accepted
          }
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Claim failed — please try again";
      if (message.toLowerCase().includes("reject")) {
        setError("Wallet rejected the transaction");
      } else if (message.toLowerCase().includes("network") || message.toLowerCase().includes("timeout")) {
        setError("Network error — check your connection and try again");
      } else {
        setError(message);
      }
      setStatus("error");
    }
  }, [wallet, eligibility, CLAIM_STORAGE_KEY]);

  /** Cleanup polling on unmount */
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /** Auto-check eligibility on wallet connect */
  useEffect(() => {
    if (wallet) checkEligibility();
  }, [wallet, checkEligibility]);

  return {
    eligibility,
    status,
    error,
    txHash,
    checkEligibility,
    startClaim,
    cancelClaim,
    confirmClaim,
  };
}
