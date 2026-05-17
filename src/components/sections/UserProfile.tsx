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
import { CyberCard } from "@/components/ui/CyberCard";
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
  "mirage-realms": "🕵️",
  kaetram: "🌍",
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
    game: "mirage-realms",
    storageKey: "fuzzy_achievement_desert_explorer",
  },
  {
    id: "world-traveler",
    title: "World Traveler",
    description: "Explored Fuzzynuts World",
    icon: "🌍",
    game: "kaetram",
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
   Not Connected State
   ═══════════════════════════════════════════════════════════════ */

function ConnectPrompt() {
  const { connect, isConnecting } = useWalletStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-6">
        <Wallet size={32} className="text-brand-gold" />
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
          { id: "gemwallet" as const, label: "GemWallet", icon: "💎" },
          { id: "crossmark" as const, label: "Crossmark", icon: "✖️" },
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
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════ */

function SkeletonRows() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4 border-b border-white/[0.04]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="w-28 h-4 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-20 h-3 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="w-16 h-5 rounded bg-white/[0.06] animate-pulse" />
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
          <CyberCard accentColor="gold">
            <ConnectPrompt />
          </CyberCard>
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

  return (
    <section id="user-profile" className="py-16 relative">
      <div className="container-main space-y-6">
        {/* ── Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CyberCard accentColor="gold">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-gold/20 to-neon-green/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                    <span className="text-2xl">🐿️</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-cream">
                      {truncateAddress(address)}
                    </h2>
                    <p className="text-xs text-cream-dim font-mono mt-0.5">
                      XRPL Player Profile
                    </p>
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
                               bg-white/[0.04] hover:bg-white/[0.08]
                               border border-white/[0.06] hover:border-neon-green/20
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
                               font-semibold text-red-400 hover:bg-red-400/10
                               border border-red-400/20 hover:border-red-400/40
                               transition-all min-h-[40px] cursor-pointer"
                  >
                    Disconnect
                  </motion.button>
                </div>
              </div>
            </div>
          </CyberCard>
        </motion.div>

        {/* ── Prize Claiming ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ClaimRewards />
        </motion.div>

        {/* ── Stats Summary ── */}
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
              icon: <Gamepad2 size={18} className="text-neon-green" />,
            },
            {
              label: "Games Played",
              value: uniqueGames,
              icon: <Trophy size={18} className="text-brand-gold" />,
            },
            {
              label: "Best Score",
              value: topScore > 0 ? formatNumber(topScore) : "—",
              icon: <TrendingUp size={18} className="text-cyan-400" />,
            },
          ].map((stat) => (
            <CyberCard key={stat.label} accentColor="green">
              <div className="p-4 sm:p-5 text-center">
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <p className="font-display text-xl sm:text-2xl font-bold text-cream">
                  {stat.value}
                </p>
                <p className="text-[11px] text-cream-dim mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            </CyberCard>
          ))}
        </motion.div>

        {/* ── Personal Bests by Game ── */}
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
                <CyberCard key={gameId} accentColor="gold">
                  <div className="p-4 flex items-center gap-3">
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
                </CyberCard>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Achievements ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
            <Award size={16} className="text-brand-gold" />
            Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlockedAchievements.has(achievement.id);
              return (
                <CyberCard
                  key={achievement.id}
                  accentColor={isUnlocked ? "gold" : "green"}
                >
                  <div
                    className={`p-4 flex items-center gap-3 transition-opacity ${
                      isUnlocked ? "opacity-100" : "opacity-40"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                        isUnlocked
                          ? "bg-brand-gold/15 border border-brand-gold/30"
                          : "bg-white/[0.04] border border-white/[0.08]"
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
                </CyberCard>
              );
            })}
          </div>
        </motion.div>

        {/* ── Score History Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-display text-lg font-bold text-cream mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-neon-green" />
            Score History
          </h3>
          <CyberCard accentColor="green" className="overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider
                          text-cream-dim border-b border-white/[0.08] bg-white/[0.02]"
            >
              <span className="w-10">Game</span>
              <span className="flex-1">Title</span>
              <span className="w-20 text-right">Score</span>
              <span className="w-28 text-right hidden sm:block">Date</span>
            </div>

            {/* Loading */}
            {state.loading && <SkeletonRows />}

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

            {/* Score rows */}
            {!state.loading && state.scores.length > 0 && (
              <div>
                {state.scores.map((entry, index) => (
                  <motion.div
                    key={`${entry.game}-${entry.ts}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="flex items-center gap-3 px-4 py-3.5
                               border-b border-white/[0.04] last:border-0
                               hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Game emoji */}
                    <div className="w-10 flex justify-center shrink-0">
                      <span className="text-lg">
                        {GAME_EMOJIS[entry.game] || "🎮"}
                      </span>
                    </div>

                    {/* Game title */}
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-semibold truncate block"
                        style={{ color: getGameColor(entry.game) }}
                      >
                        {getGameTitle(entry.game)}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="w-20 text-right shrink-0">
                      <span className="font-mono text-sm font-bold text-cream tabular-nums">
                        {formatNumber(entry.score)}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="w-28 text-right shrink-0 hidden sm:block">
                      <span className="text-[11px] font-mono text-cream-dim opacity-60">
                        {entry.ts ? formatDate(entry.ts) : "—"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CyberCard>
        </motion.div>
      </div>
    </section>
  );
}
