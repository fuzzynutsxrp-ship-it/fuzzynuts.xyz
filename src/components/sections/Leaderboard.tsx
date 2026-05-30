"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Trophy, Clock, Wifi, WifiOff, ChevronDown, Radio, Gift, Star, Zap } from "lucide-react";
import { GAMES, truncateAddress, formatNumber } from "@/lib/utils";
import { API_REWARDS } from "@/features/arcade/constants";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import { CyberCard } from "@/components/ui/CyberCard";
import { LeaderboardSkeleton } from "@/components/ui/LeaderboardSkeleton";
import { useWalletStore } from "@/store/wallet";
import {
  useLeaderboardSSE,
  useWeeklyCountdown,
  usePayoutEligibility,
  getCurrentWeekKey,
  getWeekKeyOffset,
  timeAgo,
} from "@/features/arcade";

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "fuzzy_arcade_scores";
const MAX_ENTRIES = 50;

/** Rank → styling only; amounts are dynamic (USD-announced, NUT @ snapshot). */
const PRIZE_LABELS: Record<number, { color: string; glow: string }> = {
  1: { color: "text-brand-gold", glow: "winner-row-glow" },
  2: { color: "text-silver", glow: "silver-row-glow" },
  3: { color: "text-bronze", glow: "bronze-row-glow" },
};

/** Map game IDs to accent colors for the CyberCard system */
const GAME_ACCENTS: Record<string, "green" | "red" | "purple" | "cyan" | "orange" | "gold"> = {
  "top-secret": "purple",
  "fuzzynuts-world": "green",
  mario: "red",
  survivors: "purple",
  minigolf: "cyan",
  racer: "orange",
};

/** Map game IDs to emojis for the tab selector */
const GAME_EMOJIS: Record<string, string> = {
  "top-secret": "🕵️",
  "fuzzynuts-world": "🌍",
  mario: "🍄",
  survivors: "⚔️",
  minigolf: "⛳",
  racer: "🏎️",
};

/** Week options for the week selector dropdown */
const WEEK_OPTIONS = [
  { label: "This Week", offset: 0 },
  { label: "Last Week", offset: 1 },
  { label: "2 Weeks Ago", offset: 2 },
  { label: "3 Weeks Ago", offset: 3 },
];

/* getTimeUntilReset replaced by useWeeklyCountdown hook — see below */

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

/** Read personal bests from localStorage (fuzzy-score.js format) */
function getPersonalBest(gameId: string): number | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return data.personalBests?.[gameId] ?? null;
  } catch {
    return null;
  }
}

/* SkeletonRow replaced by <LeaderboardSkeleton /> from @/components/ui */

/* ═══════════════════════════════════════════════════════════════
   Medal Component
   ═══════════════════════════════════════════════════════════════ */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="text-lg font-bold trophy-float" title="1st Place — 250,000 $NUT">
        🥇
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="text-lg font-bold" title="2nd Place — 150,000 $NUT">
        🥈
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="text-lg font-bold" title="3rd Place — 100,000 $NUT">
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
  const [selectedGame, setSelectedGame] = useState("fuzzynuts-world");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [weekDropdownOpen, setWeekDropdownOpen] = useState(false);

  const walletAddress = useWalletStore((s) => s.address);
  const personalBest = getPersonalBest(selectedGame);

  // Compute selected week key
  const selectedWeek = useMemo(
    () => (weekOffset === 0 ? getCurrentWeekKey() : getWeekKeyOffset(weekOffset)),
    [weekOffset]
  );

  // SSE-powered leaderboard with automatic polling fallback
  const { scores, loading, error, lastFetched, isRefreshing, refetch, manualRefresh } =
    useLeaderboardSSE(selectedGame, selectedWeek);

  // Tick-accurate countdown (1 s visible, 60 s hidden)
  const countdown = useWeeklyCountdown();

  /* ── Derived state ── */
  const currentGameMeta = GAMES.find((g) => g.id === selectedGame);
  const accent = GAME_ACCENTS[selectedGame] || "green";
  const isOnline = lastFetched !== null;
  const isCurrentWeek = weekOffset === 0;

  /* ── Check if user's score is in the list ── */
  const userRank = walletAddress
    ? scores.findIndex(
        (s) => s.wallet?.toLowerCase() === walletAddress.toLowerCase()
      ) + 1
    : 0;

  // Prize eligibility for connected wallet
  const { eligibility, status: claimStatus } = usePayoutEligibility(walletAddress ?? null);

  // Dynamic prize tiers for the selected week (USD-announced, NUT @ snapshot)
  const [weekTiers, setWeekTiers] = useState<WeeklyTiersResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/tiers?week=${selectedWeek}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setWeekTiers(d); })
      .catch(() => { if (!cancelled) setWeekTiers(null); });
    return () => { cancelled = true; };
  }, [selectedWeek]);

  const fmtPrice = (p?: number | null) => (p && isFinite(p) ? `$${Number(p).toPrecision(4)}` : "—");
  const tierUsd = (rank: number) => weekTiers?.tiers?.[rank - 1]?.usd_value ?? null;
  const tierNut = (rank: number) => {
    const n = weekTiers?.tiers?.[rank - 1]?.nut_amount;
    return n != null ? Number(n) : null;
  };
  const tierUsdLabel = (rank: number) => { const u = tierUsd(rank); return u != null ? `$${u}` : "—"; };
  const tierNutLabel = (rank: number) => { const n = tierNut(rank); return n != null ? `${formatNumber(n)} NUT` : "TBA"; };
  const isWinner = isCurrentWeek && userRank > 0 && userRank <= 3;
  const prizeInfo = isWinner ? PRIZE_LABELS[userRank] : null;

  /* countdown now driven by useWeeklyCountdown() above — no polling needed */

  return (
    <section id="leaderboard" className="py-24 relative">
      <div className="container-main">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16 relative"
        >
          {/* Floating nut particles around header */}
          <span className="absolute -top-4 left-1/4 text-2xl float-nut-1 opacity-60 pointer-events-none" style={{ animationDelay: "0s" }}>🥜</span>
          <span className="absolute top-2 right-1/4 text-xl float-nut-2 opacity-50 pointer-events-none" style={{ animationDelay: "0.7s" }}>🥜</span>
          <span className="absolute -bottom-2 left-1/3 text-lg float-nut-3 opacity-40 pointer-events-none" style={{ animationDelay: "1.4s" }}>🥜</span>

          <span
            className="neon-chip text-degen-crisp mb-4 animate-glitch-skew"
          >
            🏆 Hall of Degens
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
            Leaderboard
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto leading-relaxed">
            Boards wipe every Monday 00:00 UTC. Climb the ranks, bag real $NUT,
            flex on the timeline. Paper hands need not apply.
          </p>
          {isCurrentWeek && (
            <p className={`text-base sm:text-lg font-mono font-bold mt-3 animate-pulse ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-orange" : "text-cream-dim/80"} countdown-pulse`}>
              ⏱ Resets in <span className={`font-black ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-orange" : "text-neon-green"}`}>{countdown.display}</span> · Monday 00:00 UTC
            </p>
          )}
        </motion.div>

        {/* ═══ PRIZE WINNER BANNER ═══ */}
        <AnimatePresence>
          {isWinner && prizeInfo && isCurrentWeek && claimStatus !== "success" && claimStatus !== "already-claimed" && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="mb-8"
            >
              <div className="relative overflow-hidden rounded-2xl border-2 border-brand-gold/40 prize-shimmer"
                style={{
                  background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(1,5,8,0.95) 40%, rgba(16,185,129,0.05) 100%)",
                  boxShadow: "0 0 40px rgba(251,191,36,0.15), 0 0 80px rgba(251,191,36,0.05), inset 0 1px 0 rgba(251,191,36,0.1)"
                }}
              >
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 p-6 sm:p-8">
                  {/* Trophy */}
                  <div className="trophy-float text-6xl sm:text-7xl shrink-0">
                    {userRank === 1 ? "🏆" : userRank === 2 ? "🥈" : "🥉"}
                  </div>

                  {/* Message */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <Star size={16} className="text-brand-gold" />
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-gold">
                        You&apos;re a Winner!
                      </span>
                      <Star size={16} className="text-brand-gold" />
                    </div>
                    <h3 className="font-display text-2xl sm:text-3xl font-black text-cream mb-1">
                      You&apos;re <span className="gradient-text-gold">#{userRank}</span> this week!
                    </h3>
                    <p className="text-sm text-cream-dim">
                      in {currentGameMeta?.title ?? selectedGame}
                    </p>
                    <p className="font-display text-3xl sm:text-4xl font-black text-brand-gold text-glow-gold mt-2">
                      {tierUsdLabel(userRank)}
                    </p>
                    <p className="text-xs font-mono text-cream-dim mt-1">
                      ({tierNutLabel(userRank)} @ {fmtPrice(weekTiers?.snapshot_price)} snapshot)
                    </p>
                  </div>

                  {/* Claim CTA */}
                  {eligibility?.eligible && claimStatus !== "claiming" && (
                    <motion.a
                      href="/profile/"
                      whileHover={{ scale: 1.06, boxShadow: "0 0 50px rgba(251,191,36,0.6)" }}
                      whileTap={{ scale: 0.95 }}
                      className="claim-fab-pulse flex items-center gap-2.5 px-7 py-4 rounded-xl
                                 bg-gradient-to-r from-brand-gold to-yellow-500
                                 text-forest-dark font-black text-base shrink-0
                                 cursor-pointer min-h-[52px]"
                    >
                      <Gift size={20} />
                      Claim Prize
                    </motion.a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Controls Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6"
        >
          {/* Game Selector — Desktop Tabs */}
          <div className="hidden sm:flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-glass-border)]">
            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold
                  transition-all duration-200 min-h-[44px]
                  ${
                    selectedGame === game.id
                      ? "bg-neon-green/20 text-neon-green border border-neon-green/40 shadow-[0_0_20px_rgba(16,185,129,0.25),0_0_40px_rgba(16,185,129,0.1)]"
                      : "text-cream-dim hover:text-cream hover:bg-white/[0.04] border border-transparent"
                  }
                `}
                aria-pressed={selectedGame === game.id}
              >
                <span className="text-base">{GAME_EMOJIS[game.id]}</span>
                <span>{game.title}</span>
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

          {/* Right side: Week Selector + Meta info + Refresh */}
          <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
            {/* Week selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setWeekDropdownOpen(!weekDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                           text-cream-dim hover:text-cream bg-white/[0.04] hover:bg-white/[0.08]
                           border border-white/[0.06] hover:border-neon-green/20
                           transition-all duration-200 min-h-[44px]"
                aria-expanded={weekDropdownOpen}
                aria-haspopup="listbox"
              >
                <Clock size={12} className="opacity-60" />
                <span className="font-mono">{selectedWeek}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${weekDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {weekDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-30 top-full right-0 mt-2 rounded-xl overflow-hidden w-44
                               bg-[rgba(1,5,8,0.96)] border border-[var(--color-glass-border)]
                               backdrop-blur-xl shadow-2xl"
                    role="listbox"
                  >
                    {WEEK_OPTIONS.map((opt) => {
                      const weekKey = opt.offset === 0 ? getCurrentWeekKey() : getWeekKeyOffset(opt.offset);
                      return (
                        <button
                          key={opt.offset}
                          onClick={() => {
                            setWeekOffset(opt.offset);
                            setWeekDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={weekOffset === opt.offset}
                          className={`
                            w-full flex items-center justify-between px-4 py-3 text-sm font-medium
                            transition-colors min-h-[44px]
                            ${
                              weekOffset === opt.offset
                                ? "bg-neon-green/10 text-neon-green"
                                : "text-cream-dim hover:text-cream hover:bg-white/[0.04]"
                            }
                          `}
                        >
                          <span>{opt.label}</span>
                          <span className="text-[10px] font-mono opacity-60">{weekKey}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live updating badge (current week only) */}
            {isCurrentWeek && isOnline && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-neon-green/70">
                <Radio size={10} className="live-pulse-dot" />
                Live
              </span>
            )}

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
              onClick={manualRefresh}
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

        {/* ── Weekly Prize Pool — Hero Pedestals ── */}
        {isCurrentWeek && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8 grid grid-cols-3 gap-3 sm:gap-5"
          >
            {/* 1st Place Pedestal */}
            <div className="relative prize-pedestal-glow rounded-2xl border-2 border-brand-gold/30 bg-gradient-to-b from-brand-gold/[0.08] to-transparent py-6 sm:py-8 px-3 text-center"
              style={{ boxShadow: "0 0 30px rgba(251,191,36,0.15), 0 0 60px rgba(251,191,36,0.08), inset 0 1px 0 rgba(251,191,36,0.15)" }}
            >
              <span className="absolute -top-3 -left-1 text-lg float-nut-1 opacity-70 pointer-events-none">🥜</span>
              <span className="absolute top-1/2 -right-2 text-base float-nut-2 opacity-50 pointer-events-none">🥜</span>
              <span className="absolute -bottom-2 left-1/3 text-sm float-nut-3 opacity-60 pointer-events-none" style={{ animationDelay: "0.5s" }}>🥜</span>
              <div className="text-4xl sm:text-5xl mb-2">🥇</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gold/70 mb-1">1st Place</p>
              <p className="font-display text-2xl sm:text-3xl font-black text-brand-gold">{tierUsdLabel(1)}</p>
              <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(1)}</p>
            </div>

            {/* 2nd Place Pedestal */}
            <div className="relative prize-pedestal-glow rounded-2xl border-2 border-gray-400/30 bg-gradient-to-b from-gray-400/[0.06] to-transparent py-6 sm:py-8 px-3 text-center"
              style={{ boxShadow: "0 0 25px rgba(192,192,192,0.12), 0 0 50px rgba(192,192,192,0.06), inset 0 1px 0 rgba(192,192,192,0.12)" }}
            >
              <span className="absolute -top-3 -right-1 text-lg float-nut-2 opacity-60 pointer-events-none">🥜</span>
              <span className="absolute bottom-1/3 -left-2 text-base float-nut-3 opacity-45 pointer-events-none" style={{ animationDelay: "0.3s" }}>🥜</span>
              <span className="absolute -bottom-1 right-1/4 text-sm float-nut-1 opacity-55 pointer-events-none" style={{ animationDelay: "0.8s" }}>🥜</span>
              <div className="text-4xl sm:text-5xl mb-2">🥈</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400/70 mb-1">2nd Place</p>
              <p className="font-display text-2xl sm:text-3xl font-black text-gray-300">{tierUsdLabel(2)}</p>
              <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(2)}</p>
            </div>

            {/* 3rd Place Pedestal */}
            <div className="relative prize-pedestal-glow rounded-2xl border-2 border-amber-700/30 bg-gradient-to-b from-amber-700/[0.06] to-transparent py-6 sm:py-8 px-3 text-center"
              style={{ boxShadow: "0 0 25px rgba(180,83,9,0.12), 0 0 50px rgba(180,83,9,0.06), inset 0 1px 0 rgba(180,83,9,0.12)" }}
            >
              <span className="absolute -top-3 left-1/4 text-lg float-nut-3 opacity-55 pointer-events-none">🥜</span>
              <span className="absolute top-1/3 -right-2 text-base float-nut-1 opacity-40 pointer-events-none" style={{ animationDelay: "0.6s" }}>🥜</span>
              <span className="absolute -bottom-2 left-1/2 text-sm float-nut-2 opacity-50 pointer-events-none" style={{ animationDelay: "1.1s" }}>🥜</span>
              <div className="text-4xl sm:text-5xl mb-2">🥉</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 mb-1">3rd Place</p>
              <p className="font-display text-2xl sm:text-3xl font-black text-amber-600">{tierUsdLabel(3)}</p>
              <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(3)}</p>
            </div>
          </motion.div>
        )}

        {/* ── Leaderboard Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
        >
          <CyberCard accentColor={accent} className="overflow-hidden bg-[rgba(1,5,8,0.97)]">
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
            {loading && (
              <LeaderboardSkeleton />
            )}

            {/* ── Error State (full error, no data) ── */}
            {!loading && error && scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <WifiOff size={32} className="text-orange mb-4 opacity-60" />
                <p className="font-display text-lg font-bold text-cream mb-2">
                  Server Unreachable
                </p>
                <p className="text-sm text-cream-dim max-w-sm mb-6">
                  {error}
                </p>
                <button
                  onClick={() => refetch(true)}
                  className="btn-secondary text-sm"
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
            )}

            {/* ── Empty State ── */}
            {!loading && !error && scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center relative">
                {/* Fuzzynuts logo — centerpiece */}
                <div className="empty-squirrel-bounce mb-5">
                  <img
                    src="/images/branding/logo.webp"
                    alt="Fuzzynuts"
                    className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-[0_0_28px_rgba(251,191,36,0.5)]"
                    draggable={false}
                  />
                </div>
                {/* Scattered nuts around squirrel */}
                <span className="absolute top-12 left-1/4 text-2xl nut-scatter-1 pointer-events-none">🥜</span>
                <span className="absolute top-8 right-1/4 text-xl nut-scatter-2 pointer-events-none">🥜</span>
                <span className="absolute bottom-20 left-1/3 text-lg nut-scatter-3 pointer-events-none">🥜</span>
                <span className="absolute bottom-16 right-1/3 text-2xl nut-scatter-4 pointer-events-none">🥜</span>
                <span className="absolute top-1/2 left-1/5 text-base nut-scatter-5 pointer-events-none">🥜</span>

                <p className="font-display text-xl font-bold text-cream mb-3">
                  No scores yet
                </p>
                <p className="text-sm text-cream-dim max-w-sm mb-6">
                  {isCurrentWeek ? (
                    <>
                      Be the first to set a record in{" "}
                      <span className="text-cream font-semibold">
                        {currentGameMeta?.title}
                      </span>
                      ! Play now and claim the #1 spot.
                    </>
                  ) : (
                    <>No scores recorded for {selectedWeek}.</>
                  )}
                </p>
                {isCurrentWeek && (
                  <button className="cta-nut-pulse px-8 py-3 rounded-xl font-display font-black text-forest-dark text-base bg-gradient-to-r from-neon-green to-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4),0_0_60px_rgba(16,185,129,0.15)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6),0_0_80px_rgba(16,185,129,0.2)] transition-shadow">
                    🐿️ NUT UP — PLAY NOW
                  </button>
                )}
              </div>
            )}

            {/* ── Score Rows ── */}
            {!loading && scores.length > 0 && (
              <div>
                {scores.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser =
                    walletAddress &&
                    entry.wallet?.toLowerCase() === walletAddress.toLowerCase();
                  const displayName =
                    entry.name ||
                    (entry.wallet
                      ? truncateAddress(entry.wallet)
                      : "Anonymous");
                  const rowPrize = isCurrentWeek ? PRIZE_LABELS[rank] : null;

                  const rankBorderGlow =
                    rank === 1 ? "border-l-2 border-l-brand-gold shadow-[inset_4px_0_12px_-4px_rgba(251,191,36,0.3)]" :
                    rank === 2 ? "border-l-2 border-l-gray-400 shadow-[inset_4px_0_12px_-4px_rgba(192,192,192,0.2)]" :
                    rank === 3 ? "border-l-2 border-l-amber-700 shadow-[inset_4px_0_12px_-4px_rgba(180,83,9,0.2)]" :
                    "";

                  return (
                    <motion.div
                      key={`${entry.wallet || entry.session || index}-${entry.score}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.25 }}
                      className={`
                        flex items-center gap-3 px-4 py-3
                        border-b border-white/[0.04] last:border-0
                        transition-all duration-150
                        ${
                          isCurrentUser
                            ? `bg-brand-gold/[0.08] border-l-2 border-l-brand-gold ${rowPrize?.glow ?? ""}`
                            : rank <= 3
                            ? `bg-white/[0.015] ${rankBorderGlow} ${rowPrize?.glow ?? ""}`
                            : "hover:bg-white/[0.03] hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.03)]"
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
                                ? "text-cream font-semibold"
                                : "text-cream-dim"
                            }
                          `}
                        >
                          {displayName}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[10px] font-mono text-brand-gold/80 bg-brand-gold/10 px-1.5 py-0.5 rounded-full">
                              you
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Prize Badge — current week only for top 3 */}
                      {rowPrize && isCurrentWeek && (
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border
                            ${rank === 1
                              ? "bg-brand-gold/10 border-brand-gold/30 text-brand-gold"
                              : rank === 2
                              ? "bg-silver/10 border-silver/30 text-silver"
                              : "bg-bronze/10 border-bronze/30 text-bronze"
                            }`}
                            title={`${tierNutLabel(rank)} @ ${fmtPrice(weekTiers?.snapshot_price)} snapshot`}
                          >
                            <Zap size={8} className="inline mr-0.5" />{tierUsdLabel(rank)}
                          </span>
                        </div>
                      )}

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
            {error && scores.length > 0 && (
              <div className="px-4 py-2 bg-orange/[0.06] border-t border-orange/20 text-xs text-orange flex items-center gap-2">
                <WifiOff size={12} />
                {error}
              </div>
            )}
          </CyberCard>
        </motion.div>

        {/* ── Footer Meta ── */}
        {lastFetched && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-cream-dim/50 text-center mt-4 font-mono"
          >
            Updated {timeAgo(lastFetched)} · Top {MAX_ENTRIES} · {isCurrentWeek ? "Resets Monday 00:00 UTC" : `Week: ${selectedWeek}`}
          </motion.p>
        )}
      </div>
    </section>
  );
}
