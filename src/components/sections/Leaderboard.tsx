"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Trophy, Clock, Wifi, WifiOff, ChevronDown } from "lucide-react";
import { GAMES, truncateAddress, formatNumber } from "@/lib/utils";
import { CyberCard } from "@/components/ui/CyberCard";
import { useWalletStore } from "@/store/wallet";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface ScoreEntry {
  wallet: string;
  name?: string;
  score: number;
  game: string;
  ts: number;
  session?: string;
  hasTrustline?: boolean;
  eligible?: boolean;
}

interface LeaderboardState {
  scores: ScoreEntry[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "https://world.fuzzynuts.xyz/api/scores";
const STORAGE_KEY = "fuzzy_arcade_scores";
const REFRESH_COOLDOWN_MS = 10_000; // 10s between manual refreshes
const AUTO_POLL_MS = 30_000; // 30s auto-poll interval
const MAX_ENTRIES = 50;

/** Map game IDs to accent colors for the CyberCard system */
const GAME_ACCENTS: Record<string, "green" | "red" | "purple" | "cyan" | "orange" | "gold"> = {
  "mirage-realms": "purple",
  kaetram: "green",
  mario: "red",
  survivors: "purple",
  minigolf: "cyan",
  racer: "orange",
};

/** Map game IDs to emojis for the tab selector */
const GAME_EMOJIS: Record<string, string> = {
  "mirage-realms": "🕵️",
  kaetram: "🌍",
  mario: "🍄",
  survivors: "⚔️",
  minigolf: "⛳",
  racer: "🏎️",
};

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

function timeAgo(timestamp: number): string {
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

function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Read personal bests from localStorage (fuzzy-score.js format) */
function getLocalScores(gameId: string): ScoreEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const currentWeek = getCurrentWeekKey();
    if (data.weekKey !== currentWeek) return [];
    return (data.scores?.[gameId] || []) as ScoreEntry[];
  } catch {
    return [];
  }
}

function getPersonalBest(gameId: string): number | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return data.personalBests?.[gameId] ?? null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════ */

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Rank */}
      <div className="w-8 h-5 rounded bg-white/[0.06] animate-pulse" />
      {/* Name */}
      <div className="flex-1">
        <div className="w-24 h-4 rounded bg-white/[0.06] animate-pulse" />
      </div>
      {/* Score */}
      <div className="w-16 h-5 rounded bg-white/[0.06] animate-pulse" />
      {/* Time */}
      <div className="w-12 h-4 rounded bg-white/[0.06] animate-pulse hidden sm:block" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Medal Component
   ═══════════════════════════════════════════════════════════════ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="text-base font-bold" title="1st Place">
        🥇
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="text-base font-bold" title="2nd Place">
        🥈
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="text-base font-bold" title="3rd Place">
        🥉
      </span>
    );
  }
  return (
    <span className="text-xs font-mono text-cream-dim w-8 text-center">
      #{rank}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Leaderboard Component
   ═══════════════════════════════════════════════════════════════ */

export function Leaderboard() {
  const [selectedGame, setSelectedGame] = useState("kaetram");
  const [state, setState] = useState<LeaderboardState>({
    scores: [],
    loading: true,
    error: null,
    lastFetched: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const lastManualRefresh = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const walletAddress = useWalletStore((s) => s.address);
  const personalBest = getPersonalBest(selectedGame);

  /* ── Fetch leaderboard data ── */
  const fetchScores = useCallback(
    async (showLoadingState = true) => {
      if (showLoadingState) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const url = `${API_BASE}?game=${selectedGame}&limit=${MAX_ENTRIES}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // API might return { scores: [...] } or just [...]
        const scores: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.scores || data.data || [];

        // Sort descending by score, cap at MAX_ENTRIES
        const sorted = scores
          .sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score)
          .slice(0, MAX_ENTRIES);

        setState({
          scores: sorted,
          loading: false,
          error: null,
          lastFetched: Date.now(),
        });
      } catch (err) {
        // Fallback to localStorage if the backend is unreachable
        const localScores = getLocalScores(selectedGame);

        if (localScores.length > 0) {
          setState({
            scores: localScores.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES),
            loading: false,
            error: "Showing cached scores — server temporarily unreachable",
            lastFetched: Date.now(),
          });
        } else {
          setState({
            scores: [],
            loading: false,
            error:
              err instanceof Error && err.name === "TimeoutError"
                ? "Request timed out — please try again"
                : "Unable to reach the leaderboard server",
            lastFetched: null,
          });
        }
      }
    },
    [selectedGame]
  );

  /* ── Initial fetch + polling ── */
  useEffect(() => {
    fetchScores(true);

    // Set up auto-polling
    pollTimer.current = setInterval(() => {
      fetchScores(false); // silent background refresh
    }, AUTO_POLL_MS);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchScores]);

  /* ── Manual refresh handler ── */
  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastManualRefresh.current < REFRESH_COOLDOWN_MS) return;

    lastManualRefresh.current = now;
    setIsRefreshing(true);
    await fetchScores(false);

    // Hold the spinning animation for at least 600ms
    setTimeout(() => setIsRefreshing(false), 600);
  }, [fetchScores]);

  /* ── Derived state ── */
  const currentGameMeta = GAMES.find((g) => g.id === selectedGame);
  const accent = GAME_ACCENTS[selectedGame] || "green";
  const weekKey = getCurrentWeekKey();
  const isOnline = state.lastFetched !== null;

  /* ── Check if user's score is in the list ── */
  const userRank = walletAddress
    ? state.scores.findIndex(
        (s) => s.wallet?.toLowerCase() === walletAddress.toLowerCase()
      ) + 1
    : 0;

  return (
    <section id="leaderboard" className="py-24 relative">
      <div className="container-main">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-10"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="section-badge mb-4"
          >
            🏆 Global Rankings
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-3">
            Leaderboard
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-xl mx-auto">
            Top scores reset every Monday. Climb the ranks, earn $NUT.
          </p>
        </motion.div>

        {/* ── Controls Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6"
        >
          {/* Game Selector — Desktop Tabs */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--color-card)] border border-[var(--color-glass-border)]">
            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                  transition-all duration-200 min-h-[44px]
                  ${
                    selectedGame === game.id
                      ? "bg-neon-green/15 text-neon-green border border-neon-green/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "text-cream-dim hover:text-cream hover:bg-white/[0.04] border border-transparent"
                  }
                `}
                aria-pressed={selectedGame === game.id}
              >
                <span className="text-base">{GAME_EMOJIS[game.id]}</span>
                <span className="hidden lg:inline">{game.title}</span>
              </button>
            ))}
          </div>

          {/* Game Selector — Mobile Dropdown */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
                         bg-[var(--color-card)] border border-[var(--color-glass-border)]
                         text-cream font-semibold text-sm min-h-[44px]"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="flex items-center gap-2">
                <span>{GAME_EMOJIS[selectedGame]}</span>
                <span>{currentGameMeta?.title || selectedGame}</span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 top-full left-0 right-0 mt-2 rounded-xl overflow-hidden
                             bg-[rgba(1,5,8,0.96)] border border-[var(--color-glass-border)]
                             backdrop-blur-xl shadow-2xl"
                  role="listbox"
                >
                  {GAMES.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => {
                        setSelectedGame(game.id);
                        setDropdownOpen(false);
                      }}
                      role="option"
                      aria-selected={selectedGame === game.id}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                        transition-colors min-h-[44px]
                        ${
                          selectedGame === game.id
                            ? "bg-neon-green/10 text-neon-green"
                            : "text-cream-dim hover:text-cream hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      <span className="text-base">{GAME_EMOJIS[game.id]}</span>
                      <span>{game.title}</span>
                      <span className="ml-auto text-xs opacity-60">{game.type}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side: Meta info + Refresh */}
          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {/* Week indicator */}
            <span className="text-xs font-mono text-cream-dim flex items-center gap-1.5">
              <Clock size={12} className="opacity-60" />
              {weekKey}
            </span>

            {/* Online status */}
            <span className="text-xs flex items-center gap-1">
              {isOnline ? (
                <Wifi size={12} className="text-neon-green" />
              ) : (
                <WifiOff size={12} className="text-orange" />
              )}
            </span>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         text-cream-dim hover:text-cream bg-white/[0.04] hover:bg-white/[0.08]
                         border border-white/[0.06] hover:border-neon-green/20
                         transition-all duration-200 min-h-[44px] min-w-[44px]
                         disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refresh leaderboard"
              aria-label="Refresh leaderboard"
            >
              <RefreshCw
                size={14}
                className={`transition-transform ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </motion.div>

        {/* ── Personal Best Banner ── */}
        <AnimatePresence>
          {personalBest !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                            bg-brand-gold/[0.06] border border-brand-gold/20"
              >
                <span className="text-sm text-cream-dim flex items-center gap-2">
                  <Trophy size={14} className="text-brand-gold" />
                  Your Best — {currentGameMeta?.title}
                </span>
                <span className="font-mono font-bold text-brand-gold text-sm">
                  {formatNumber(personalBest)}
                </span>
                {userRank > 0 && (
                  <span className="text-xs text-neon-green font-semibold">
                    Rank #{userRank}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Leaderboard Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <CyberCard accentColor={accent} className="overflow-hidden">
            {/* Table Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider
                          text-cream-dim border-b border-white/[0.08] bg-white/[0.02]"
            >
              <span className="w-8 text-center">Rank</span>
              <span className="flex-1">Player</span>
              <span className="w-20 text-right">Score</span>
              <span className="w-16 text-right hidden sm:block">When</span>
            </div>

            {/* ── Loading State ── */}
            {state.loading && (
              <div>
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={i} index={i} />
                ))}
              </div>
            )}

            {/* ── Error State (full error, no data) ── */}
            {!state.loading && state.error && state.scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <WifiOff size={32} className="text-orange mb-4 opacity-60" />
                <p className="font-display text-lg font-bold text-cream mb-2">
                  Server Unreachable
                </p>
                <p className="text-sm text-cream-dim max-w-sm mb-6">
                  {state.error}
                </p>
                <button
                  onClick={() => fetchScores(true)}
                  className="btn-secondary text-sm"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            )}

            {/* ── Empty State ── */}
            {!state.loading && !state.error && state.scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Trophy size={32} className="text-brand-gold mb-4 opacity-40" />
                <p className="font-display text-lg font-bold text-cream mb-2">
                  No scores yet
                </p>
                <p className="text-sm text-cream-dim max-w-sm">
                  Be the first to set a record in{" "}
                  <span className="text-cream font-semibold">
                    {currentGameMeta?.title}
                  </span>
                  ! Play now and claim the #1 spot.
                </p>
              </div>
            )}

            {/* ── Score Rows ── */}
            {!state.loading && state.scores.length > 0 && (
              <div>
                {state.scores.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser =
                    walletAddress &&
                    entry.wallet?.toLowerCase() === walletAddress.toLowerCase();
                  const displayName =
                    entry.name ||
                    (entry.wallet
                      ? truncateAddress(entry.wallet)
                      : "Anonymous");

                  return (
                    <motion.div
                      key={`${entry.wallet || entry.session || index}-${entry.score}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.25 }}
                      className={`
                        flex items-center gap-3 px-4 py-3
                        border-b border-white/[0.04] last:border-0
                        transition-colors duration-150
                        ${
                          isCurrentUser
                            ? "bg-brand-gold/[0.06] border-l-2 border-l-brand-gold"
                            : rank <= 3
                            ? "bg-white/[0.01]"
                            : "hover:bg-white/[0.02]"
                        }
                      `}
                    >
                      {/* Rank */}
                      <div className="w-8 flex justify-center shrink-0">
                        <RankBadge rank={rank} />
                      </div>

                      {/* Player Name */}
                      <div className="flex-1 min-w-0">
                        <span
                          className={`
                            text-sm font-medium truncate block
                            ${
                              isCurrentUser
                                ? "text-brand-gold font-bold"
                                : rank <= 3
                                ? "text-cream"
                                : "text-cream-dim"
                            }
                          `}
                        >
                          {displayName}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] font-mono text-brand-gold/70">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="w-20 text-right shrink-0">
                        <span
                          className={`
                            font-mono text-sm font-bold tabular-nums
                            ${
                              rank === 1
                                ? "text-brand-gold text-glow-gold"
                                : rank <= 3
                                ? "text-neon-green"
                                : "text-cream"
                            }
                          `}
                        >
                          {formatNumber(entry.score)}
                        </span>
                      </div>

                      {/* Time Ago — hidden on mobile */}
                      <div className="w-16 text-right shrink-0 hidden sm:block">
                        <span className="text-[11px] font-mono text-cream-dim opacity-60">
                          {entry.ts ? timeAgo(entry.ts) : "—"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Soft Warning Banner (partial error — showing cached data) ── */}
            {state.error && state.scores.length > 0 && (
              <div className="px-4 py-2 bg-orange/[0.06] border-t border-orange/20 text-xs text-orange flex items-center gap-2">
                <WifiOff size={12} />
                {state.error}
              </div>
            )}
          </CyberCard>
        </motion.div>

        {/* ── Footer Meta ── */}
        {state.lastFetched && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-cream-dim/50 text-center mt-4 font-mono"
          >
            Updated {timeAgo(state.lastFetched)} · Top {MAX_ENTRIES} · Resets Monday 00:00 UTC
          </motion.p>
        )}
      </div>
    </section>
  );
}
