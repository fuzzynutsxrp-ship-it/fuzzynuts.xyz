"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Trophy,
  TrendingUp,
  Clock,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { gameRegistry } from "@/lib/gameRegistry";
import type { ScoreEntry } from "@/features/arcade/types/arcade";
import { API_SCORES } from "@/features/arcade/constants";
import { formatNumber } from "@/lib/format";

/* ═══════════════════════════════════════════════════════════════
   UserStatsGrid — Profile stats dashboard

   Displays: Total Games Played, Favorite Genre, Highest Score,
   and a "Recently Played" horizontal scroll with game thumbnails.
   Fetches scores from /api/scores?wallet={deviceId}.
   ═══════════════════════════════════════════════════════════════ */

interface StatsGridProps {
  /** Wallet address or device ID to fetch scores for */
  deviceId: string;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(ts);
}

/* ── Skeleton ── */
function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-degen-950 border-2 border-hot-pink/10 rounded-xl p-4 sm:p-5 animate-pulse"
        >
          <div className="w-8 h-8 rounded-lg bg-degen-900 mx-auto mb-3" />
          <div className="w-16 h-5 rounded bg-degen-900 mx-auto mb-2" />
          <div className="w-20 h-3 rounded bg-degen-900 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/* ── Recently Played Card ── */
function RecentGameCard({ game, score, ts }: { game: string; score: number; ts: number }) {
  const meta = gameRegistry.getBySlug(game);
  const title = meta?.title ?? game;
  const iconPath = meta?.iconPath ?? "/icons/icon-world-pop.webp";
  const color = meta?.color ?? "#4ade80";

  return (
    <Link
      href={`/games/${game}`}
      className="group shrink-0 w-40 sm:w-48 snap-start"
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="bg-degen-950 border-2 border-hot-pink/15 hover:border-gold/40
                   rounded-xl overflow-hidden transition-all"
        style={{
          boxShadow: "inset 0 1px 0 var(--color-inset-highlight)",
        }}
      >
        {/* Thumbnail */}
        <div
          className="relative w-full aspect-[4/3] flex items-center justify-center"
          style={{ background: `${color}10` }}
        >
          <Image
            src={iconPath}
            alt={title}
            width={64}
            height={64}
            className="object-contain drop-shadow-lg group-hover:scale-110 transition-transform"
            unoptimized
          />
          {/* Score badge */}
          <div
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-cream"
            style={{ background: `${color}90`, backdropFilter: "blur(4px)" }}
          >
            {formatNumber(score)}
          </div>
        </div>
        {/* Info */}
        <div className="p-3">
          <p
            className="text-sm font-bold truncate"
            style={{ color }}
          >
            {title}
          </p>
          <p className="text-[11px] text-cream-dim mt-0.5">
            {relativeTime(ts)}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export function UserStatsGrid({ deviceId }: StatsGridProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /* ── Fetch scores ── */
  const fetchScores = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const url = `${API_SCORES}?wallet=${encodeURIComponent(deviceId)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      const entries: ScoreEntry[] = Array.isArray(data)
        ? data
        : data.scores ?? data.data ?? [];
      // Sort by most recent
      entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setScores(entries);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Request timed out"
          : "Unable to reach the server",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) fetchScores();
    return () => abortRef.current?.abort();
  }, [deviceId, fetchScores]);

  /* ── Derived stats ── */
  const totalGamesPlayed = scores.length;

  const favoriteGenre = useMemo(() => {
    if (scores.length === 0) return "—";
    const genreCounts = new Map<string, number>();
    for (const s of scores) {
      const meta = gameRegistry.getBySlug(s.game);
      const genre = meta?.genre ?? "Other";
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
    let best = "—";
    let bestCount = 0;
    for (const [genre, count] of genreCounts) {
      if (count > bestCount) {
        best = genre;
        bestCount = count;
      }
    }
    return best;
  }, [scores]);

  const highestScore = useMemo(() => {
    if (scores.length === 0) return null;
    return scores.reduce((best, s) => (s.score > best.score ? s : best), scores[0]);
  }, [scores]);

  const uniqueGames = useMemo(() => new Set(scores.map((s) => s.game)).size, [scores]);

  const recentFive = useMemo(() => {
    // Dedupe by game, keep most recent per game, take 5
    const seen = new Set<string>();
    const result: ScoreEntry[] = [];
    for (const s of scores) {
      if (!seen.has(s.game)) {
        seen.add(s.game);
        result.push(s);
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [scores]);

  /* ── Error state ── */
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <WifiOff size={28} className="text-orange mb-3 opacity-60" />
        <p className="font-display text-base font-bold text-cream mb-2">
          Couldn&apos;t Load Stats
        </p>
        <p className="text-sm text-cream-dim mb-5 max-w-sm">{error}</p>
        <button
          onClick={fetchScores}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm
                     font-semibold text-cream bg-degen-900 hover:bg-[#1a1a1a]
                     border border-hot-pink/20 hover:border-gold/40
                     transition-all min-h-[40px] cursor-pointer"
        >
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <StatSkeleton />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-40 sm:w-48 h-44 rounded-xl bg-degen-950 border-2 border-hot-pink/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (scores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <Gamepad2 size={32} className="text-neon-green mb-4 opacity-40" />
        <p className="font-display text-lg font-bold text-cream mb-2">
          No scores yet
        </p>
        <p className="text-sm text-cream-dim max-w-sm">
          Play some games to see your stats here!
        </p>
      </div>
    );
  }

  const highestMeta = highestScore
    ? gameRegistry.getBySlug(highestScore.game)
    : null;

  return (
    <div className="space-y-6">
      {/* ═══ STATS GRID ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Games Played */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-degen-950 border-2 border-neon-green/40 rounded-xl p-4 sm:p-5 text-center"
          style={{
            boxShadow:
              "0 0 25px rgba(16,185,129,0.15), 0 0 50px rgba(16,185,129,0.08), inset 0 1px 0 rgba(16,185,129,0.15)",
          }}
        >
          <div className="flex justify-center mb-2">
            <Gamepad2 size={20} className="text-neon-green" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-cream">
            {totalGamesPlayed}
          </p>
          <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
            Games Played
          </p>
        </motion.div>

        {/* Favorite Genre */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-[#0f0a00] border-2 border-brand-gold/40 rounded-xl p-4 sm:p-5 text-center"
          style={{
            boxShadow:
              "0 0 25px rgba(251,191,36,0.15), 0 0 50px rgba(251,191,36,0.08), inset 0 1px 0 rgba(251,191,36,0.15)",
          }}
        >
          <div className="flex justify-center mb-2">
            <Trophy size={20} className="text-brand-gold" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-cream">
            {favoriteGenre}
          </p>
          <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
            Favorite Genre
          </p>
        </motion.div>

        {/* Highest Single Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="col-span-2 lg:col-span-1 bg-[#0f0a00] border-2 border-amber-500/40 rounded-xl p-4 sm:p-5 text-center"
          style={{
            boxShadow:
              "0 0 25px rgba(245,158,11,0.15), 0 0 50px rgba(245,158,11,0.08), inset 0 1px 0 rgba(245,158,11,0.15)",
          }}
        >
          <div className="flex justify-center mb-2">
            <TrendingUp size={20} className="text-amber-500" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-cream">
            {highestScore ? formatNumber(highestScore.score) : "—"}
          </p>
          <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
            {highestMeta?.title ?? highestScore?.game ?? "Best Score"}
          </p>
        </motion.div>

        {/* Total Unique Games */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="col-span-2 lg:col-span-1 bg-degen-950 border-2 border-[#7c3aed]/40 rounded-xl p-4 sm:p-5 text-center"
          style={{
            boxShadow:
              "0 0 25px rgba(124,58,237,0.15), 0 0 50px rgba(124,58,237,0.08), inset 0 1px 0 rgba(124,58,237,0.15)",
          }}
        >
          <div className="flex justify-center mb-2">
            <Clock size={20} className="text-[#7c3aed]" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-cream">
            {uniqueGames}
          </p>
          <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
            Unique Games
          </p>
        </motion.div>
      </div>

      {/* ═══ RECENTLY PLAYED — Horizontal Scroll ═══ */}
      {recentFive.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
            <Clock size={16} className="text-neon-green" />
            Recently Played
          </h3>
          <div
            className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory
                       scrollbar-thin scrollbar-track-degen-950 scrollbar-thumb-hot-pink/30"
          >
            {recentFive.map((entry) => (
              <RecentGameCard
                key={entry.game}
                game={entry.game}
                score={entry.score}
                ts={entry.ts}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
