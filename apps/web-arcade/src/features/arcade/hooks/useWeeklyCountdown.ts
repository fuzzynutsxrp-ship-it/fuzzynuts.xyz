"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * useWeeklyCountdown — Live countdown to Monday 00:00 UTC reset
 *
 * Tick-accurate countdown that updates every second when visible,
 * and every minute when the tab is hidden (battery friendly).
 * Returns formatted countdown + progress percentage.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";

export interface CountdownState {
  /** Formatted countdown string (e.g., "2d 14h 23m 45s") */
  display: string;
  /** Short format (e.g., "2d 14h") */
  short: string;
  /** Total milliseconds remaining */
  remainingMs: number;
  /** Progress through the week (0.0 = Monday 00:00 → 1.0 = next Monday 00:00) */
  weekProgress: number;
  /** Days remaining */
  days: number;
  /** Hours remaining (after days) */
  hours: number;
  /** Minutes remaining (after hours) */
  minutes: number;
  /** Seconds remaining (after minutes) */
  seconds: number;
  /** True in the final 6 hours before reset */
  isUrgent: boolean;
  /** True in the final 1 hour before reset */
  isCritical: boolean;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const URGENT_THRESHOLD_MS = 6 * 60 * 60 * 1000;
const CRITICAL_THRESHOLD_MS = 60 * 60 * 1000;

/** Calculate milliseconds until next Monday 00:00 UTC */
function getMsUntilReset(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0, 0, 0, 0
    )
  );
  return Math.max(0, nextMonday.getTime() - now.getTime());
}

/** Parse milliseconds into countdown components */
function parseCountdown(ms: number): CountdownState {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const display = days > 0
    ? `${days}d ${hours}h ${minutes}m ${seconds}s`
    : hours > 0
    ? `${hours}h ${minutes}m ${seconds}s`
    : minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const short = days > 0
    ? `${days}d ${hours}h`
    : hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;

  // Progress through the week (Monday 00:00 UTC → Monday 00:00 UTC)
  const elapsed = WEEK_MS - ms;
  const weekProgress = Math.min(1, Math.max(0, elapsed / WEEK_MS));

  return {
    display,
    short,
    remainingMs: ms,
    weekProgress,
    days,
    hours,
    minutes,
    seconds,
    isUrgent: ms <= URGENT_THRESHOLD_MS,
    isCritical: ms <= CRITICAL_THRESHOLD_MS,
  };
}

/**
 * Live countdown to the weekly leaderboard reset.
 *
 * Updates every second when the tab is visible, every minute
 * when hidden. Automatically adapts tick rate based on
 * document.visibilityState for battery efficiency.
 *
 * @returns CountdownState with display, progress, and urgency flags
 */
export function useWeeklyCountdown(): CountdownState {
  const [countdown, setCountdown] = useState<CountdownState>(() =>
    parseCountdown(getMsUntilReset())
  );

  const tick = useCallback(() => {
    setCountdown(parseCountdown(getMsUntilReset()));
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const setupInterval = () => {
      const isVisible = document.visibilityState === "visible";
      const tickMs = isVisible ? 1_000 : 60_000;

      if (interval) clearInterval(interval);
      interval = setInterval(tick, tickMs);

      // Immediate tick on visibility change
      if (isVisible) tick();
    };

    setupInterval();

    const handleVisibility = () => setupInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tick]);

  return countdown;
}
