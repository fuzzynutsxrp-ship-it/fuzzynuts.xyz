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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { GAMES, truncateAddress, formatNumber } from "@/lib/utils";
import { useWalletStore } from "@/store/wallet";
import { useSession } from "next-auth/react";
import {
  useLeaderboardSSE,
  getCurrentWeekKey,
  getWeekKeyOffset,
  timeAgo,
} from "@/features/arcade";
import type { ScoreEntry } from "@/features/arcade";
import { API_SCORES, MAX_ENTRIES } from "@/features/arcade/constants";
import { toBackendSlug } from "@/features/arcade/slugAliases";

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const GAME_FILTERS = [
  { id: "all", label: "All Games", emoji: "🎮" },
  ...GAMES.map((g) => ({ id: g.id, label: g.title, emoji: g.image })),
];

const TIMEFRAMES = [
  { id: "weekly", label: "This Week" },
  { id: "alltime", label: "All Time" },
];

const GAME_EMOJIS: Record<string, string> = Object.fromEntries(
  GAMES.map((g) => [g.id, g.image]),
);

/* ═══════════════════════════════════════════════════════════════
   Podium Component — Top 3 players
   ═══════════════════════════════════════════════════════════════ */

function Podium({
  scores,
  currentUserId,
}: {
  scores: ScoreEntry[];
  currentUserId?: string | null;
}) {
  const top3 = scores.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumConfig = [
    {
      rank: 1,
      medal: "🥇",
      borderClass: "border-brand-gold/40",
      shadowStyle: "0 0 30px rgba(251,191,36,0.2), 0 0 60px rgba(251,191,36,0.08)",
      textClass: "text-brand-gold",
      label: "1st Place",
      order: "order-2", // center on desktop
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
        const name =
          entry.displayName ||
          entry.name ||
          (entry.wallet ? truncateAddress(entry.wallet) : "Anonymous");
        const isYou =
          currentUserId &&
          entry.wallet?.toLowerCase() === currentUserId.toLowerCase();

        return (
          <div
            key={cfg.rank}
            className={`relative rounded-2xl border-2 ${cfg.borderClass} bg-[#0a0613] py-5 sm:py-6 px-3 text-center ${cfg.order}`}
            style={{ boxShadow: cfg.shadowStyle }}
          >
            <div className="text-3xl sm:text-4xl mb-2">{cfg.medal}</div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${cfg.textClass} mb-1.5`}>
              {cfg.label}
            </p>
            <p className="font-display text-sm sm:text-base font-bold text-cream truncate">
              {name}
              {isYou && (
                <span className="ml-1 text-[10px] font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1 py-0.5 rounded-full">
                  you
                </span>
              )}
            </p>
            <p className={`font-mono text-lg sm:text-xl font-black ${cfg.textClass} mt-1`}>
              {formatNumber(entry.score)}
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
  return (
    <span className="text-xs font-mono text-[var(--color-cream-dim)] w-8 text-center">
      #{rank}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Provider Badge — [Google] or [XRPL]
   ═══════════════════════════════════════════════════════════════ */

function ProviderBadge({ entry }: { entry: ScoreEntry }) {
  // Heuristic: if entry has userId and it looks like a Google ID, show Google.
  // If it has a wallet address (starts with r), show XRPL.
  const hasUserId = !!entry.userId;
  const hasWallet = !!entry.wallet && entry.wallet.startsWith("r");

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
        const params = timeframe === "weekly" ? `&week=${weekKey}` : "";
        const promises = GAMES.map(async (game) => {
          const backendSlug = toBackendSlug(game.id);
          const url = `${API_SCORES}?game=${backendSlug}&limit=${MAX_ENTRIES}${params}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          const raw: ScoreEntry[] = Array.isArray(data)
            ? data
            : data.leaderboard || data.scores || data.data || [];
          return raw.map((e) => ({ ...e, game: e.game || game.id }));
        });
        const results = await Promise.all(promises);
        if (!cancelled) {
          const merged = results
            .flat()
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_ENTRIES);
          setAllScores(merged);
        }
      } catch (err) {
        if (!cancelled) {
          setAllError(
            err instanceof Error ? err.message : "Failed to load scores",
          );
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

  // Resolve which data to use
  const scores =
    selectedGame === "all" ? allScores : singleGameHook.scores;
  const loading =
    selectedGame === "all" ? allLoading : singleGameHook.loading;
  const error =
    selectedGame === "all" ? allError : singleGameHook.error;
  const isRefreshing =
    selectedGame === "all" ? false : singleGameHook.isRefreshing;
  const lastFetched =
    selectedGame === "all" ? null : singleGameHook.lastFetched;
  const manualRefresh =
    selectedGame === "all" ? () => {} : singleGameHook.manualRefresh;

  // ── Find current user's rank ──
  const userRankIndex = walletAddress
    ? scores.findIndex(
        (s) => s.wallet?.toLowerCase() === walletAddress.toLowerCase(),
      )
    : -1;
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userEntry = userRank ? scores[userRankIndex] : null;

  // Table rows (skip top 3 if podium is shown)
  const tableScores = scores.slice(3);

  // Game title for empty state
  const selectedGameMeta =
    selectedGame !== "all" ? GAMES.find((g) => g.id === selectedGame) : null;
  const selectedGameLabel = selectedGameMeta?.title || "All Games";

  return (
    <div className="min-h-screen bg-[#0a0613] flex flex-col">
      {/* Top Navigation */}
      <SiteHeader
        variant="dark"
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
            <h1 className="font-display text-2xl sm:text-3xl font-black text-cream flex items-center gap-3">
              <Trophy className="text-brand-gold" size={28} />
              Global Leaderboard
            </h1>
            {timeframe === "weekly" && (
              <p className="text-sm text-[var(--color-cream-dim)] mt-1">
                Resets every Monday 00:00 UTC
              </p>
            )}
          </div>

          {/* ── Filters Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            {/* Game filter — Desktop pills */}
            <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto">
              {GAME_FILTERS.map((gf) => (
                <button
                  key={gf.id}
                  onClick={() => setSelectedGame(gf.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedGame === gf.id
                      ? "bg-brand-gold/15 text-brand-gold border border-brand-gold/30"
                      : "text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span>{gf.emoji}</span>
                  <span>{gf.label}</span>
                </button>
              ))}
            </div>

            {/* Game filter — Mobile dropdown */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setGameDropdownOpen(!gameDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-cream font-semibold text-sm"
              >
                <span className="flex items-center gap-2">
                  <span>{GAME_FILTERS.find((g) => g.id === selectedGame)?.emoji}</span>
                  <span>{GAME_FILTERS.find((g) => g.id === selectedGame)?.label}</span>
                </span>
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
                    className="absolute z-30 top-full left-0 right-0 mt-2 rounded-xl overflow-hidden bg-[#0a0613] border border-white/10 shadow-2xl"
                  >
                    {GAME_FILTERS.map((gf) => (
                      <button
                        key={gf.id}
                        onClick={() => {
                          setSelectedGame(gf.id);
                          setGameDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                          selectedGame === gf.id
                            ? "bg-brand-gold/10 text-brand-gold"
                            : "text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5"
                        }`}
                      >
                        <span>{gf.emoji}</span>
                        <span>{gf.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right side: Timeframe tabs + Refresh */}
            <div className="flex items-center gap-2">
              {/* Timeframe tabs */}
              <div className="flex items-center p-1 rounded-lg bg-white/[0.03] border border-white/5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as "weekly" | "alltime")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                      timeframe === tf.id
                        ? "bg-brand-gold/15 text-brand-gold"
                        : "text-[var(--color-cream-dim)] hover:text-cream"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-cream-dim)] hover:text-cream bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all disabled:opacity-40"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Podium (Top 3) ── */}
          {!loading && scores.length > 0 && (
            <Podium scores={scores} currentUserId={walletAddress} />
          )}

          {/* ── Leaderboard Table ── */}
          <div className="rounded-xl overflow-hidden border border-white/5 bg-[#0a0613]">
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-cream-dim)] border-b border-white/5 bg-white/[0.02]">
              <span className="w-10 text-center">Rank</span>
              <span className="flex-1">Player</span>
              {selectedGame === "all" && (
                <span className="w-28 text-right hidden md:block">Game</span>
              )}
              <span className="w-24 text-right">Score</span>
              <span className="w-20 text-right hidden sm:block">When</span>
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
                    <div className="w-24 h-4 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <WifiOff size={32} className="text-orange mb-4 opacity-60" />
                <p className="font-display text-lg font-bold text-cream mb-2">
                  Unable to load scores
                </p>
                <p className="text-sm text-[var(--color-cream-dim)] max-w-sm mb-6">
                  {error}
                </p>
                <button
                  onClick={manualRefresh}
                  className="btn-secondary text-sm"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <Gamepad2
                  size={48}
                  className="text-brand-gold/30 mb-4"
                />
                <p className="font-display text-xl font-bold text-cream mb-2">
                  No scores yet
                </p>
                <p className="text-sm text-[var(--color-cream-dim)] max-w-sm mb-6">
                  Be the first to play{" "}
                  <span className="text-cream font-semibold">
                    {selectedGameLabel}
                  </span>{" "}
                  and claim the #1 spot!
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-[#0a0613] font-display font-black text-sm hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all"
                >
                  🐿️ Play Now
                </Link>
              </div>
            )}

            {/* Score rows (starting from rank 4, since top 3 are in podium) */}
            {!loading && tableScores.length > 0 && (
              <div>
                {tableScores.map((entry, index) => {
                  const rank = index + 4; // offset by 3 for podium
                  const isCurrentUser =
                    walletAddress &&
                    entry.wallet?.toLowerCase() ===
                      walletAddress.toLowerCase();
                  const displayName =
                    entry.displayName ||
                    entry.name ||
                    (entry.wallet
                      ? truncateAddress(entry.wallet)
                      : "Anonymous");
                  const gameMeta = GAMES.find(
                    (g) => g.id === entry.game,
                  );

                  return (
                    <div
                      key={`${entry.wallet || index}-${entry.score}-${entry.game}`}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 transition-colors ${
                        isCurrentUser
                          ? "bg-brand-gold/[0.06] border-l-2 border-l-brand-gold"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-10 flex justify-center shrink-0">
                        <RankBadge rank={rank} />
                      </div>

                      {/* Player */}
                      <div className="flex-1 min-w-0 flex items-center">
                        <span
                          className={`text-sm font-medium truncate ${
                            isCurrentUser
                              ? "text-brand-gold font-bold"
                              : "text-cream"
                          }`}
                        >
                          {displayName}
                        </span>
                        <ProviderBadge entry={entry} />
                        {isCurrentUser && (
                          <span className="ml-1.5 text-[10px] font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </div>

                      {/* Game column (All Games mode only) */}
                      {selectedGame === "all" && (
                        <div className="w-28 text-right shrink-0 hidden md:block">
                          <span className="text-xs text-[var(--color-cream-dim)]">
                            {gameMeta?.image} {gameMeta?.title || entry.game}
                          </span>
                        </div>
                      )}

                      {/* Score */}
                      <div className="w-24 text-right shrink-0">
                        <span className="font-mono text-sm font-bold tabular-nums text-cream">
                          {formatNumber(entry.score)}
                        </span>
                      </div>

                      {/* Time ago */}
                      <div className="w-20 text-right shrink-0 hidden sm:block">
                        <span className="text-[11px] font-mono text-[var(--color-cream-dim)] opacity-60">
                          {entry.ts ? timeAgo(entry.ts) : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Soft warning (partial error with cached data) */}
            {error && scores.length > 0 && (
              <div className="px-4 py-2 bg-orange/5 border-t border-orange/20 text-xs text-orange flex items-center gap-2">
                <WifiOff size={12} />
                {error}
              </div>
            )}
          </div>

          {/* Footer meta */}
          {lastFetched && (
            <p className="text-[11px] text-[var(--color-cream-dim)]/60 text-center mt-4 font-mono">
              Updated {timeAgo(lastFetched)} · Top {MAX_ENTRIES} ·{" "}
              {timeframe === "weekly"
                ? "Resets Monday 00:00 UTC"
                : "All Time"}
            </p>
          )}

          {/* ── Sticky User Rank Banner (if not in top 100) ── */}
          <AnimatePresence>
            {walletAddress && userRank === null && !loading && scores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[#0a0613] border border-brand-gold/30 shadow-[0_0_30px_rgba(251,191,36,0.15)] flex items-center gap-3"
              >
                <Trophy size={16} className="text-brand-gold" />
                <span className="text-sm text-cream">
                  Your rank is outside the top {MAX_ENTRIES}. Play to climb!
                </span>
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg bg-brand-gold text-[#0a0613] font-bold text-xs"
                >
                  Play
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
