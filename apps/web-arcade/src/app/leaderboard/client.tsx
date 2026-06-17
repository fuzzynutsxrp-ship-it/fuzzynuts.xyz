"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Clock,
  RefreshCw,
  WifiOff,
  Radio,
  ChevronDown,
  Gamepad2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { truncateAddress, formatNumber } from "@/lib/utils";
import { useWalletStore } from "@/store/wallet";
import { useSession } from "next-auth/react";
import { useLeaderboardSSE, getCurrentWeekKey, timeAgo } from "@/features/arcade";
import type { ScoreEntry } from "@/features/arcade";
import { API_SCORES } from "@/features/arcade/constants";
import { toBackendSlug } from "@/features/arcade/slugAliases";
import { MyRankWidget } from "@/components/ui/MyRankWidget";
import { gameRegistry } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const LEADERBOARD_SIZE = 100;

/** Build game filter list from gameRegistry — only games with leaderboards */
const GAME_FILTERS = [
  { slug: "all", title: "All Games" },
  ...gameRegistry
    .getAll()
    .filter((g) => g.status === "live" && g.leaderboardEnabled)
    .map((g) => ({ slug: g.slug, title: g.title })),
];

const TIMEFRAMES = [
  { id: "weekly", label: "This Week" },
  { id: "alltime", label: "All Time" },
];

/* ═══════════════════════════════════════════════════════════════
   Aggregated player row type
   ═══════════════════════════════════════════════════════════════ */

interface PlayerRow {
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

/* ═══════════════════════════════════════════════════════════════
   Aggregate raw score entries into player rows
   ═══════════════════════════════════════════════════════════════ */

function aggregateByPlayer(entries: ScoreEntry[]): PlayerRow[] {
  const map = new Map<string, PlayerRow>();
  let anonCounter = 0;

  for (const entry of entries) {
    // Key by wallet (XRPL) or userId (Google) or name fallback
    const key =
      entry.wallet?.toLowerCase() ||
      entry.userId ||
      entry.displayName ||
      entry.name ||
      `anon-${anonCounter++}`;

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

/* ═══════════════════════════════════════════════════════════════
   Podium Component — Top 3 players
   ═══════════════════════════════════════════════════════════════ */

function Podium({ rows, currentUserKey }: { rows: PlayerRow[]; currentUserKey?: string | null }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumConfig = [
    {
      rank: 1,
      medal: "🥇",
      borderClass: "border-[#e2e8f0]",
      shadowStyle: "0 1px 3px rgba(15,23,42,0.08)",
      textClass: "text-[#6366f1]",
      label: "1st Place",
      order: "order-2",
    },
    {
      rank: 2,
      medal: "🥈",
      borderClass: "border-gray-400/40",
      shadowStyle: "0 0 25px rgba(192,192,192,0.15)",
      textClass: "text-gray-300",
      label: "2nd Place",
      order: "order-1",
    },
    {
      rank: 3,
      medal: "🥉",
      borderClass: "border-amber-700/40",
      shadowStyle: "0 0 25px rgba(180,83,9,0.15)",
      textClass: "text-amber-600",
      label: "3rd Place",
      order: "order-3",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
      {podiumConfig.map((cfg) => {
        const entry = top3[cfg.rank - 1];
        if (!entry) return <div key={cfg.rank} />;
        const isYou =
          currentUserKey &&
          (entry.wallet?.toLowerCase() === currentUserKey.toLowerCase() ||
            entry.userId === currentUserKey);

        return (
          <div
            key={cfg.rank}
            className={`relative rounded-2xl border-2 ${cfg.borderClass} bg-white py-5 sm:py-6 px-3 text-center ${cfg.order}`}
            style={{ boxShadow: cfg.shadowStyle }}
          >
            <div className="text-3xl sm:text-4xl mb-2">{cfg.medal}</div>
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${cfg.textClass} mb-1.5`}
            >
              {cfg.label}
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-[#0f172a] truncate">
              {entry.displayName}
              {isYou && (
                <span className="ml-1 text-[10px] font-mono text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 px-1 py-0.5 rounded-full">
                  you
                </span>
              )}
            </p>
            <p className={`font-mono text-lg sm:text-xl font-black ${cfg.textClass} mt-1`}>
              {formatNumber(entry.totalScore)}
            </p>
            <p className="text-[10px] text-[#64748b] mt-1">
              {entry.gamesPlayed} game{entry.gamesPlayed !== 1 ? "s" : ""} played
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Rank Badge — Inline medal or #N
   ═══════════════════════════════════════════════════════════════ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-xs font-mono text-[#64748b] w-8 text-center">#{rank}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   Provider Badge — [Google] or [XRPL]
   ═══════════════════════════════════════════════════════════════ */

function ProviderBadge({ row }: { row: PlayerRow }) {
  const hasUserId = !!row.userId;
  const hasWallet = !!row.wallet && row.wallet.startsWith("r");

  if (hasUserId && !hasWallet) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </span>
    );
  }

  if (hasWallet) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/20">
        XRPL
      </span>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Main Leaderboard Client Component
   ═══════════════════════════════════════════════════════════════ */

export function LeaderboardClient() {
  const [selectedGame, setSelectedGame] = useState("all");
  const [timeframe, setTimeframe] = useState<"weekly" | "alltime">("weekly");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const walletAddress = useWalletStore((s) => s.address);
  const { data: session } = useSession();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Current week key
  const weekKey = useMemo(() => getCurrentWeekKey(), []);

  // ── Data fetching ──
  // For a single game, use the SSE hook directly.
  // For "all", fetch all games in parallel and merge.
  const singleGameHook = useLeaderboardSSE(
    selectedGame !== "all" ? selectedGame : "fuzzynuts-world",
    timeframe === "weekly" ? weekKey : undefined,
  );

  const [allScores, setAllScores] = useState<ScoreEntry[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  // Fetch all games when "all" is selected
  useEffect(() => {
    if (selectedGame !== "all") return;

    let cancelled = false;
    const fetchAll = async () => {
      setAllLoading(true);
      setAllError(null);
      try {
        const liveGames = gameRegistry
          .getAll()
          .filter((g) => g.status === "live" && g.leaderboardEnabled);
        const params = timeframe === "weekly" ? `&week=${weekKey}` : "";
        const promises = liveGames.map(async (game) => {
          const backendSlug = toBackendSlug(game.slug);
          const url = `${API_SCORES}?game=${backendSlug}&limit=${LEADERBOARD_SIZE}${params}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          const raw: ScoreEntry[] = Array.isArray(data)
            ? data
            : data.leaderboard || data.scores || data.data || [];
          return raw.map((e) => ({ ...e, game: e.game || game.slug }));
        });
        const results = await Promise.all(promises);
        if (!cancelled) {
          setAllScores(results.flat());
        }
      } catch (err) {
        if (!cancelled) {
          setAllError(err instanceof Error ? err.message : "Failed to load scores");
        }
      } finally {
        if (!cancelled) setAllLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedGame, timeframe, weekKey]);

  // Resolve raw scores
  const rawScores = selectedGame === "all" ? allScores : singleGameHook.scores;
  const loading = selectedGame === "all" ? allLoading : singleGameHook.loading;
  const error = selectedGame === "all" ? allError : singleGameHook.error;
  const isRefreshing = selectedGame === "all" ? false : singleGameHook.isRefreshing;
  const lastFetched = selectedGame === "all" ? null : singleGameHook.lastFetched;
  const manualRefresh = selectedGame === "all" ? () => {} : singleGameHook.manualRefresh;

  // ── Aggregate into player rows ──
  const playerRows = useMemo(() => aggregateByPlayer(rawScores), [rawScores]);

  // ── Find current user ──
  const currentUserKey = walletAddress || session?.user?.email || null;
  const userRowIndex = currentUserKey
    ? playerRows.findIndex(
        (r) =>
          r.wallet?.toLowerCase() === currentUserKey.toLowerCase() || r.userId === currentUserKey,
      )
    : -1;
  const userRank = userRowIndex >= 0 ? userRowIndex + 1 : null;

  // Game title for empty state
  const selectedGameMeta = selectedGame !== "all" ? gameRegistry.getBySlug(selectedGame) : null;
  const selectedGameLabel = selectedGameMeta?.title || "All Games";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navigation */}
      <SiteHeader
        variant="light"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Sidebar — no categories on sub-pages */}
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          activeCategory="popular"
          onCategoryChange={() => {}}
          hideCategories
        />

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-6 pb-32">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0f172a] flex items-center gap-3">
              <Trophy className="text-[#6366f1]" size={28} />
              Global Leaderboard
            </h1>
            <p className="text-sm text-[#64748b] mt-1">
              Top {LEADERBOARD_SIZE} players
              {timeframe === "weekly" && " · Resets every Monday 00:00 UTC"}
            </p>
          </div>

          {/* ── My Rank Widget ── */}
          <MyRankWidget className="mb-6" />

          {/* ── Filters Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            {/* Game filter — Desktop pills */}
            <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.03] border border-[#e2e8f0] overflow-x-auto">
              {GAME_FILTERS.map((gf) => (
                <button
                  key={gf.slug}
                  onClick={() => setSelectedGame(gf.slug)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedGame === gf.slug
                      ? "bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/30"
                      : "text-[#64748b] hover:text-[#0f172a] hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{gf.title}</span>
                </button>
              ))}
            </div>

            {/* Game filter — Mobile dropdown */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setGameDropdownOpen(!gameDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-[#e2e8f0] text-[#0f172a] font-semibold text-sm"
              >
                <span>{GAME_FILTERS.find((g) => g.slug === selectedGame)?.title}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${gameDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {gameDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-30 top-full left-0 right-0 mt-2 rounded-xl overflow-hidden bg-white border border-[#e2e8f0] shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {GAME_FILTERS.map((gf) => (
                      <button
                        key={gf.slug}
                        onClick={() => {
                          setSelectedGame(gf.slug);
                          setGameDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                          selectedGame === gf.slug
                            ? "bg-[#6366f1]/10 text-[#6366f1]"
                            : "text-[#64748b] hover:text-[#0f172a] hover:bg-white/5"
                        }`}
                      >
                        <span>{gf.title}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right side: Timeframe tabs + Refresh */}
            <div className="flex items-center gap-2">
              {/* Timeframe tabs */}
              <div className="flex items-center p-1 rounded-lg bg-white/[0.03] border border-[#e2e8f0]">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as "weekly" | "alltime")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                      timeframe === tf.id
                        ? "bg-[#6366f1]/15 text-[#6366f1]"
                        : "text-[#64748b] hover:text-[#0f172a]"
                    }`}
                  >
                    <Clock size={12} />
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Live indicator */}
              {timeframe === "weekly" && lastFetched && (
                <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-neon-green/70">
                  <Radio size={10} className="animate-pulse" />
                  Live
                </span>
              )}

              {/* Refresh */}
              <button
                onClick={manualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#64748b] hover:text-[#0f172a] bg-white/[0.03] hover:bg-white/[0.06] border border-[#e2e8f0] transition-all disabled:opacity-40"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Podium (Top 3) ── */}
          {!loading && playerRows.length > 0 && (
            <Podium rows={playerRows} currentUserKey={currentUserKey} />
          )}

          {/* ── Leaderboard Table ── */}
          <div className="rounded-xl overflow-hidden border border-[#e2e8f0] bg-white">
            {/* Table Header — desktop */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0] bg-white/[0.02]">
              <span className="w-10 text-center">Rank</span>
              <span className="flex-1">Player</span>
              <span className="w-28 text-right">Games Played</span>
              <span className="w-28 text-right">Total Score</span>
            </div>

            {/* Mobile header */}
            <div className="sm:hidden px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0] bg-white/[0.02]">
              Top Players
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] animate-pulse"
                  >
                    <div className="w-10 flex justify-center">
                      <div className="w-6 h-6 rounded bg-white/5" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5" />
                      <div className="w-24 h-4 rounded bg-white/5" />
                    </div>
                    <div className="w-24 h-4 rounded bg-white/5 hidden sm:block" />
                    <div className="w-24 h-4 rounded bg-white/5 hidden sm:block" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && playerRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <WifiOff size={32} className="text-orange mb-4 opacity-60" />
                <p className="font-display text-lg font-bold text-[#0f172a] mb-2">
                  Unable to load scores
                </p>
                <p className="text-sm text-[#64748b] max-w-sm mb-6">{error}</p>
                <button onClick={manualRefresh} className="btn-secondary text-sm">
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && playerRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <Gamepad2 size={48} className="text-[#6366f1]/30 mb-4" />
                <p className="font-display text-xl font-bold text-[#0f172a] mb-2">No scores yet</p>
                <p className="text-sm text-[#64748b] max-w-sm mb-6">
                  Be the first to play{" "}
                  <span className="text-[#0f172a] font-semibold">{selectedGameLabel}</span> and
                  claim the #1 spot!
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6366f1] text-white font-display font-black text-sm hover:shadow-[0_4px_12px_rgba(99,102,241,0.2)] transition-all"
                >
                  🐿️ Play Now
                </Link>
              </div>
            )}

            {/* Player rows — skip top 3 (podium) */}
            {!loading && playerRows.length > 0 && (
              <div>
                {playerRows.slice(3).map((row, index) => {
                  const rank = index + 4; // offset by 3 for podium
                  const isCurrentUser =
                    currentUserKey &&
                    (row.wallet?.toLowerCase() === currentUserKey.toLowerCase() ||
                      row.userId === currentUserKey);

                  return (
                    <div
                      key={`${row.wallet || row.userId || index}`}
                      className={`border-b border-white/[0.03] last:border-0 transition-colors ${
                        isCurrentUser
                          ? "bg-[#6366f1]/[0.06] border-l-2 border-l-[#6366f1]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Desktop row */}
                      <div className="hidden sm:flex items-center gap-3 px-4 py-3">
                        {/* Rank */}
                        <div className="w-10 flex justify-center shrink-0">
                          <RankBadge rank={rank} />
                        </div>

                        {/* Player */}
                        <div className="flex-1 min-w-0 flex items-center">
                          <span
                            className={`text-sm font-medium truncate ${
                              isCurrentUser ? "text-[#6366f1] font-bold" : "text-[#0f172a]"
                            }`}
                          >
                            {row.displayName}
                          </span>
                          <ProviderBadge row={row} />
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] font-mono text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 px-1.5 py-0.5 rounded-full">
                              you
                            </span>
                          )}
                        </div>

                        {/* Games Played */}
                        <div className="w-28 text-right shrink-0">
                          <span className="font-mono text-sm tabular-nums text-[#64748b]">
                            {row.gamesPlayed}
                          </span>
                        </div>

                        {/* Total Score */}
                        <div className="w-28 text-right shrink-0">
                          <span className="font-mono text-sm font-bold tabular-nums text-[#0f172a]">
                            {formatNumber(row.totalScore)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile card — stacked columns */}
                      <div className="sm:hidden px-4 py-3 flex items-start gap-3">
                        {/* Rank */}
                        <div className="flex justify-center shrink-0 pt-0.5">
                          <RankBadge rank={rank} />
                        </div>

                        {/* Player info + stats stacked */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-medium truncate ${
                                isCurrentUser ? "text-[#6366f1] font-bold" : "text-[#0f172a]"
                              }`}
                            >
                              {row.displayName}
                            </span>
                            <ProviderBadge row={row} />
                            {isCurrentUser && (
                              <span className="text-[10px] font-mono text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/20 px-1 py-0.5 rounded-full">
                                you
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-[#64748b]">
                              <Users size={10} className="inline mr-0.5" />
                              {row.gamesPlayed} game{row.gamesPlayed !== 1 ? "s" : ""}
                            </span>
                            <span className="font-mono text-xs font-bold tabular-nums text-[#0f172a]">
                              {formatNumber(row.totalScore)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Soft warning (partial error with cached data) */}
            {error && playerRows.length > 0 && (
              <div className="px-4 py-2 bg-orange/5 border-t border-orange/20 text-xs text-orange flex items-center gap-2">
                <WifiOff size={12} />
                {error}
              </div>
            )}
          </div>

          {/* Footer meta */}
          {lastFetched && (
            <p className="text-[11px] text-[#64748b]/60 text-center mt-4 font-mono">
              Updated {timeAgo(lastFetched)} · Top {LEADERBOARD_SIZE} ·{" "}
              {timeframe === "weekly" ? "Resets Monday 00:00 UTC" : "All Time"}
            </p>
          )}

          {/* ── Sticky User Rank Banner (if not in top 100) ── */}
          <AnimatePresence>
            {currentUserKey && userRank === null && !loading && playerRows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-white border border-[#6366f1]/30 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex items-center gap-3"
              >
                <Trophy size={16} className="text-[#6366f1]" />
                <span className="text-sm text-[#0f172a]">
                  Your rank is outside the top {LEADERBOARD_SIZE}. Play to climb!
                </span>
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-white font-bold text-xs"
                >
                  Play
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </div>
  );
}
