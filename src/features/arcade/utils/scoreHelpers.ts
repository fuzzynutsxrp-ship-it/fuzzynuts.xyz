/**
 * ═══════════════════════════════════════════════════════════════
 * Arcade Domain — Utility Functions
 *
 * Pure functions for week-key calculation, time formatting,
 * and localStorage score merging. No React dependencies.
 * ═══════════════════════════════════════════════════════════════
 */

import type { ScoreEntry, LocalScoreEntry } from "../types/arcade";
import { LOCAL_STORAGE_KEY, MAX_ENTRIES } from "../constants";

/* ── Week Key Calculations ── */

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

/* ── Time Formatting ── */

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

/* ── Score Validation & Merging ── */

/**
 * Read scores from localStorage (written by fuzzy-score.js).
 * These exist even when the backend POST failed or wallet wasn't connected.
 * Returns only scores matching the given weekKey.
 */
export function getLocalScores(game: string, weekKey: string): ScoreEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "{}");
    // Only use if the localStorage weekKey matches the requested week
    if (data.weekKey !== weekKey) return [];
    const localEntries: LocalScoreEntry[] = data.scores?.[game] || [];
    return localEntries
      .filter((e) => typeof e.score === "number" && e.score > 0)
      .map((e) => ({
        wallet: e.address || "Guest",
        name: e.name,
        score: e.score,
        game,
        ts: e.ts || Date.now(),
        session: e.session,
        hasTrustline: e.hasTrustline,
        eligible: e.eligible,
      }));
  } catch {
    return [];
  }
}

/**
 * Merge localStorage scores into API scores.
 * API scores are authoritative — local scores fill gaps for wallets
 * not yet present in the API results.
 */
export function mergeScores(apiScores: ScoreEntry[], localScores: ScoreEntry[]): ScoreEntry[] {
  if (localScores.length === 0) return apiScores;
  const merged = [...apiScores];
  const apiWallets = new Set(apiScores.map((s) => s.wallet?.toLowerCase()));
  for (const local of localScores) {
    const key = local.wallet?.toLowerCase();
    if (key && key !== "guest" && !apiWallets.has(key)) {
      merged.push(local);
      apiWallets.add(key);
    }
  }
  // Also include guest scores if no API results exist
  if (apiScores.length === 0) {
    for (const local of localScores) {
      const key = local.wallet?.toLowerCase();
      if (!key || key === "guest") {
        merged.push(local);
      }
    }
  }
  return merged.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
}
