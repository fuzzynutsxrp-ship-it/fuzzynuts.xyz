"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Trophy,
  Gamepad2,
  Award,
  RefreshCw,
  WifiOff,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { GAMES, truncateAddress, formatNumber } from "@/lib/utils";
import { ClaimRewards } from "@/components/sections/ClaimRewards";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface ScoreEntry {
  wallet: string;
  name?: string;
  score: number;
  game: string;
  ts: number;
}

interface ProfileState {
  scores: ScoreEntry[];
  loading: boolean;
  error: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "https://world.fuzzynuts.xyz/api/scores";

const GAME_EMOJIS: Record<string, string> = {
  "top-secret": "🕵️",
  "fuzzynuts-world": "🌍",
  mario: "🍄",
  survivors: "⚔️",
  minigolf: "⛳",
  racer: "🏎️",
};

/* ═══════════════════════════════════════════════════════════════
   Achievement Definitions
   ═══════════════════════════════════════════════════════════════ */

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  game: string;
  storageKey: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "desert-explorer",
    title: "Classified Agent",
    description: "Played the Top Secret game before anyone else",
    icon: "🕵️",
    game: "top-secret",
    storageKey: "fuzzy_achievement_desert_explorer",
  },
  {
    id: "world-traveler",
    title: "World Traveler",
    description: "Explored Fuzzynuts World",
    icon: "🌍",
    game: "fuzzynuts-world",
    storageKey: "fuzzy_achievement_world_traveler",
  },
  {
    id: "mushroom-stomper",
    title: "Mushroom Stomper",
    description: "Completed a run in Super Fuzzynuts",
    icon: "🍄",
    game: "mario",
    storageKey: "fuzzy_achievement_mushroom_stomper",
  },
  {
    id: "survivor",
    title: "Survivor",
    description: "Survived a wave in Fuzzy Survivors",
    icon: "⚔️",
    game: "survivors",
    storageKey: "fuzzy_achievement_survivor",
  },
  {
    id: "hole-in-one",
    title: "Hole in One",
    description: "Played a round of Fuzzy Putt",
    icon: "⛳",
    game: "minigolf",
    storageKey: "fuzzy_achievement_hole_in_one",
  },
];

function getUnlockedAchievements(): Set<string> {
  const unlocked = new Set<string>();
  if (typeof window === "undefined") return unlocked;
  for (const a of ACHIEVEMENTS) {
    try {
      if (localStorage.getItem(a.storageKey) === "true") {
        unlocked.add(a.id);
      }
    } catch {
      // localStorage unavailable
    }
  }
  return unlocked;
}

/* ═══════════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════════ */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGameTitle(gameId: string): string {
  return GAMES.find((g) => g.id === gameId)?.title || gameId;
}

function getGameColor(gameId: string): string {
  return GAMES.find((g) => g.id === gameId)?.color || "#4ade80";
}

/* ═══════════════════════════════════════════════════════════════
   Connect Prompt — Not Connected State
   ═══════════════════════════════════════════════════════════════ */

function ConnectPrompt() {
  const { connect, isConnecting } = useWalletStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="w-24 h-24 rounded-2xl bg-[#0f0a00] border-2 border-brand-gold/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
        <Wallet size={40} className="text-brand-gold" />
      </div>
      <h2 className="font-display text-2xl font-bold text-cream mb-3">
        Connect Your Wallet
      </h2>
      <p className="text-cream-dim text-sm max-w-md mb-8 leading-relaxed">
        Link your XRPL wallet to view your personal score history, track your
        best runs, and verify your $NUT prize eligibility.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {[
          { id: "xaman" as const, label: "Xaman", icon: "📱" },
          { id: "joey" as const, label: "Joey", icon: "🦘" },
        ].map((w) => (
          <motion.button
            key={w.id}
            onClick={() => connect(w.id)}
            disabled={isConnecting}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       active:scale-95 transition-all min-h-[44px]
                       disabled:opacity-50 cursor-pointer"
          >
            <span>{w.icon}</span>
            {w.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton Loader — Timeline Style
   ═══════════════════════════════════════════════════════════════ */

function SkeletonRows() {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.04]" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative mb-4 last:mb-0" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="absolute -left-5 top-3.5 w-3 h-3 rounded-full bg-[#111] animate-pulse" />
          <div className="bg-[#0d0d0d] border border-white/[0.04] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-[#111] animate-pulse" />
              <div className="w-24 h-4 rounded bg-[#111] animate-pulse" />
              <div className="ml-auto w-16 h-4 rounded bg-[#111] animate-pulse" />
            </div>
            <div className="w-20 h-3 rounded bg-[#111] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

export function UserProfile() {
  const { address, isConnected, disconnect } = useWalletStore();
  const [state, setState] = useState<ProfileState>({
    scores: [],
    loading: false,
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const unlockedAchievements = useMemo(() => getUnlockedAchievements(), []);

  /* ── Fetch user scores ── */
  const fetchUserScores = useCallback(
    async (showLoading = true) => {
      if (!address) return;

      if (showLoading) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const url = `${API_BASE}?wallet=${encodeURIComponent(address)}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const scores: ScoreEntry[] = Array.isArray(data)
          ? data
          : data.scores || data.data || [];

        // Sort by most recent first
        const sorted = scores.sort((a, b) => (b.ts || 0) - (a.ts || 0));

        setState({ scores: sorted, loading: false, error: null });
      } catch (err) {
        setState({
          scores: [],
          loading: false,
          error:
            err instanceof Error && err.name === "TimeoutError"
              ? "Request timed out — please try again"
              : "Unable to reach the server",
        });
      }
    },
    [address]
  );

  /* ── Fetch on connect ── */
  useEffect(() => {
    if (isConnected && address) {
      fetchUserScores(true);
    }
  }, [isConnected, address, fetchUserScores]);

  /* ── Manual refresh ── */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchUserScores(false);
    setTimeout(() => setIsRefreshing(false), 600);
  }, [fetchUserScores]);

  /* ── Not connected ── */
  if (!isConnected || !address) {
    return (
      <section id="user-profile" className="py-16 relative">
        <div className="container-main">
          <div className="bg-[#0a0a0a] border-2 border-brand-gold/30 rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-brand-gold via-neon-green to-brand-gold" />
            <ConnectPrompt />
          </div>
        </div>
      </section>
    );
  }

  /* ── Derived stats ── */
  const totalGames = state.scores.length;
  const uniqueGames = new Set(state.scores.map((s) => s.game)).size;
  const topScore = state.scores.length
    ? Math.max(...state.scores.map((s) => s.score))
    : 0;

  // Best score per game
  const bestByGame = state.scores.reduce<Record<string, ScoreEntry>>(
    (acc, entry) => {
      if (!acc[entry.game] || entry.score > acc[entry.game].score) {
        acc[entry.game] = entry;
      }
      return acc;
    },
    {}
  );

  // XP progress
  const xpProgress = (unlockedAchievements.size / ACHIEVEMENTS.length) * 100;

  return (
    <section id="user-profile" className="py-16 relative">
      <div className="container-main space-y-6">

        {/* ═══ PROFILE HEADER — Squirrel Profile Card ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-[#0a0a0a] border-2 border-brand-gold/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.08)]">
            {/* Gold accent stripe */}
            <div className="h-1 bg-gradient-to-r from-brand-gold via-neon-green to-brand-gold" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar — Fuzzynuts logo */}
                  <div className="w-20 h-20 rounded-2xl bg-[#0f0a00] border-2 border-brand-gold/40 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
                    <img
                      src="/images/branding/logo.webp"
                      alt="Fuzzynuts"
                      className="w-14 h-14 object-contain"
                      draggable={false}
                    />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-cream">
                      {truncateAddress(address)}
                    </h2>
                    <p className="text-xs text-cream-dim font-mono mt-0.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                      XRPL Player Profile
                    </p>
                    {/* XP mini bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-[#111] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-gold to-neon-green"
                          style={{ width: `${xpProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-cream-dim">
                        {unlockedAchievements.size}/{ACHIEVEMENTS.length} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                               font-semibold text-cream-dim hover:text-cream
                               bg-[#111] hover:bg-[#1a1a1a]
                               border border-white/[0.08] hover:border-neon-green/20
                               transition-all min-h-[40px]
                               disabled:opacity-40 cursor-pointer"
                    title="Refresh scores"
                  >
                    <RefreshCw
                      size={14}
                      className={isRefreshing ? "animate-spin" : ""}
                    />
                    Refresh
                  </motion.button>
                  <motion.button
                    onClick={disconnect}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                               font-semibold text-red-400 hover:bg-[#1a0a0a]
                               border border-red-400/20 hover:border-red-400/40
                               transition-all min-h-[40px] cursor-pointer"
                  >
                    Disconnect
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ PRIZE CLAIMING ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ClaimRewards />
        </motion.div>

        {/* ═══ STATS SUMMARY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 sm:gap-4"
        >
          {[
            {
              label: "Total Plays",
              value: totalGames,
              icon: <Gamepad2 size={20} className="text-neon-green" />,
              borderColor: "border-neon-green/30",
              glowColor: "shadow-[0_0_20px_rgba(16,185,129,0.08)]",
            },
            {
              label: "Games Played",
              value: uniqueGames,
              icon: <Trophy size={20} className="text-brand-gold" />,
              borderColor: "border-brand-gold/30",
              glowColor: "shadow-[0_0_20px_rgba(251,191,36,0.08)]",
            },
            {
              label: "Best Score",
              value: topScore > 0 ? formatNumber(topScore) : "—",
              icon: <TrendingUp size={20} className="text-cyan-400" />,
              borderColor: "border-cyan-400/30",
              glowColor: "shadow-[0_0_20px_rgba(34,211,238,0.08)]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-[#0a0a0a] border ${stat.borderColor} rounded-xl ${stat.glowColor} p-4 sm:p-5 text-center`}
            >
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <p className="font-display text-xl sm:text-2xl font-bold text-cream">
                {stat.value}
              </p>
              <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ═══ PERSONAL BESTS BY GAME ═══ */}
        {Object.keys(bestByGame).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-brand-gold" />
              Personal Bests
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(bestByGame).map(([gameId, entry]) => (
                <div
                  key={gameId}
                  className="bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: `${getGameColor(gameId)}15`,
                      border: `1px solid ${getGameColor(gameId)}30`,
                    }}
                  >
                    {GAME_EMOJIS[gameId] || "🎮"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold truncate"
                      style={{ color: getGameColor(gameId) }}
                    >
                      {getGameTitle(gameId)}
                    </p>
                    <p className="text-[11px] text-cream-dim">
                      {entry.ts ? formatDate(entry.ts) : "—"}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-brand-gold tabular-nums">
                    {formatNumber(entry.score)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ ACHIEVEMENTS + XP BAR ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
            <Award size={16} className="text-brand-gold" />
            Achievements
          </h3>

          {/* XP Progress Bar */}
          <div className="mb-4 bg-[#0a0a0a] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-cream">
                Achievement Progress
              </span>
              <span className="text-sm font-mono text-brand-gold">
                {unlockedAchievements.size}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#111] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-gold to-neon-green transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-cream-dim mt-2">
              {unlockedAchievements.size === ACHIEVEMENTS.length
                ? "All achievements unlocked! You're a true degen."
                : `${ACHIEVEMENTS.length - unlockedAchievements.size} more to unlock — keep playing!`}
            </p>
          </div>

          {/* Achievement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlockedAchievements.has(achievement.id);
              return (
                <div key={achievement.id} className="group relative">
                  <div
                    className={`p-4 flex items-center gap-3 rounded-xl border transition-all ${
                      isUnlocked
                        ? "bg-[#0f0a00] border-brand-gold/30 shadow-[0_0_15px_rgba(251,191,36,0.08)]"
                        : "bg-[#0a0a0a] border-white/[0.06] opacity-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                        isUnlocked
                          ? "bg-[#0f0a00] border border-brand-gold/30"
                          : "bg-[#111] border border-white/[0.06]"
                      }`}
                    >
                      {isUnlocked ? achievement.icon : "🔒"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${
                          isUnlocked ? "text-brand-gold" : "text-cream-dim"
                        }`}
                      >
                        {achievement.title}
                      </p>
                      <p className="text-[11px] text-cream-dim">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  {/* Tooltip for locked achievements */}
                  {!isUnlocked && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/[0.08] text-xs text-cream-dim whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      Play {getGameTitle(achievement.game)} to unlock
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ SCORE HISTORY — VERTICAL TIMELINE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-neon-green" />
            Score History
          </h3>
          <div className="bg-[#0a0a0a] border border-white/[0.08] rounded-2xl overflow-hidden">
            {/* Loading */}
            {state.loading && <div className="p-4 sm:p-5"><SkeletonRows /></div>}

            {/* Error */}
            <AnimatePresence>
              {!state.loading && state.error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center"
                >
                  <WifiOff size={28} className="text-orange mb-3 opacity-60" />
                  <p className="font-display text-base font-bold text-cream mb-2">
                    Server Unreachable
                  </p>
                  <p className="text-sm text-cream-dim mb-5 max-w-sm">
                    {state.error}
                  </p>
                  <button
                    onClick={() => fetchUserScores(true)}
                    className="btn-secondary text-sm cursor-pointer"
                  >
                    <RefreshCw size={14} /> Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty */}
            {!state.loading && !state.error && state.scores.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Gamepad2
                  size={32}
                  className="text-neon-green mb-4 opacity-40"
                />
                <p className="font-display text-lg font-bold text-cream mb-2">
                  No scores yet
                </p>
                <p className="text-sm text-cream-dim max-w-sm">
                  Play a game to set your first record! Head to the{" "}
                  <a
                    href="#games"
                    className="text-neon-green hover:underline font-semibold"
                  >
                    Arcade
                  </a>{" "}
                  and start earning $NUT.
                </p>
              </div>
            )}

            {/* Timeline */}
            {!state.loading && state.scores.length > 0 && (
              <div className="p-4 sm:p-5">
                <div className="relative pl-8">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-white/[0.06]" />

                  {state.scores.map((entry, index) => {
                    const isRecent = index === 0;
                    return (
                      <motion.div
                        key={`${entry.game}-${entry.ts}-${index}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="relative mb-4 last:mb-0"
                      >
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-5 top-3.5 w-3 h-3 rounded-full border-2"
                          style={{
                            borderColor: getGameColor(entry.game),
                            background: isRecent
                              ? getGameColor(entry.game)
                              : "#0a0a0a",
                            boxShadow: isRecent
                              ? `0 0 8px ${getGameColor(entry.game)}40`
                              : "none",
                          }}
                        />

                        {/* Entry card */}
                        <div
                          className={`bg-[#0d0d0d] border rounded-xl p-3 sm:p-4 ${
                            isRecent
                              ? "border-white/[0.08]"
                              : "border-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">
                              {GAME_EMOJIS[entry.game] || "🎮"}
                            </span>
                            <span
                              className="text-sm font-bold truncate"
                              style={{ color: getGameColor(entry.game) }}
                            >
                              {getGameTitle(entry.game)}
                            </span>
                            <span className="ml-auto font-mono text-sm font-bold text-brand-gold tabular-nums">
                              {formatNumber(entry.score)}
                            </span>
                          </div>
                          <p className="text-[11px] text-cream-dim font-mono">
                            {entry.ts ? formatDate(entry.ts) : "—"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
