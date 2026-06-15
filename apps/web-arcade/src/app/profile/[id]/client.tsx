"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Gamepad2,
  Trophy,
  TrendingUp,
  Pencil,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { IdenticonAvatar } from "@/components/ui/IdenticonAvatar";
import { truncateAddress, formatNumber, GAMES } from "@/lib/utils";
import { isWalletAddress, isGuestId } from "@/lib/validators";
import { API_SCORES } from "@/features/arcade/constants";

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

const GAME_EMOJIS: Record<string, string> = {
  "fuzzynuts-world": "🌍",
  mario: "🍄",
  survivors: "⚔️",
  minigolf: "⛳",
  racer: "🏎️",
  rsc: "⚔️",
  "dragon-hoard": "🐉",
  "cosmic-blaster": "🚀",
  snake: "🐍",
  breakout: "🧱",
  pong: "🏓",
  tetris: "🟦",
  asteroids: "☄️",
  flappy: "🐦",
};

const BIO_STORAGE_PREFIX = "fuzzy_profile_bio_";

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

/** Get the display name for a profile ID */
function getDisplayName(id: string): string {
  if (isWalletAddress(id)) return truncateAddress(id);
  if (isGuestId(id)) return id;
  return id;
}

/** Get the role label for a profile */
function getRoleLabel(id: string): string {
  if (isWalletAddress(id)) return "XRPL Player";
  if (isGuestId(id)) return "Guest Player";
  return "Player";
}

/** Format a timestamp to a short date */
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Get game title from registry */
function getGameTitle(gameId: string): string {
  return GAMES.find((g) => g.id === gameId)?.title || gameId;
}

/** Get game color from registry */
function getGameColor(gameId: string): string {
  return GAMES.find((g) => g.id === gameId)?.color || "#4ade80";
}

/* ═══════════════════════════════════════════════════════════════
   BioEditor — inline edit for guest profiles
   ═══════════════════════════════════════════════════════════════ */

function BioEditor({
  profileId,
  isEditable,
}: {
  profileId: string;
  isEditable: boolean;
}) {
  const storageKey = `${BIO_STORAGE_PREFIX}${profileId}`;
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Load bio from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setBio(stored);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    setBio(trimmed);
    setEditing(false);
    try {
      if (trimmed) {
        localStorage.setItem(storageKey, trimmed);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // localStorage unavailable
    }
  }, [draft, storageKey]);

  const handleCancel = useCallback(() => {
    setDraft(bio);
    setEditing(false);
  }, [bio]);

  const startEditing = useCallback(() => {
    setDraft(bio);
    setEditing(true);
  }, [bio]);

  if (!isEditable) {
    // Read-only bio for wallet profiles
    return (
      <p className="text-cream-dim text-sm mt-2 max-w-md leading-relaxed">
        {bio || "No bio set."}
      </p>
    );
  }

  if (editing) {
    return (
      <div className="mt-2 flex items-start gap-2 max-w-md">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
          rows={2}
          className="flex-1 bg-degen-900 border border-hot-pink/30 rounded-lg px-3 py-2
                     text-cream text-sm resize-none focus:outline-none
                     focus:border-neon-green/60 focus:ring-1 focus:ring-neon-green/30
                     placeholder:text-cream-dim/50"
          placeholder="Tell the world about yourself…"
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <motion.button
            onClick={handleSave}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-lg bg-neon-green/20 text-neon-green
                       hover:bg-neon-green/30 transition-colors cursor-pointer"
            title="Save bio"
          >
            <Check size={14} />
          </motion.button>
          <motion.button
            onClick={handleCancel}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-lg bg-red-500/20 text-red-400
                       hover:bg-red-500/30 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={14} />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 max-w-md group">
      <p className="text-cream-dim text-sm leading-relaxed">
        {bio || (
          <span className="italic text-cream-dim/50">
            No bio yet — click to add one
          </span>
        )}
      </p>
      <motion.button
        onClick={startEditing}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="p-1 rounded text-cream-dim/40 hover:text-neon-green
                   transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Edit bio"
      >
        <Pencil size={12} />
      </motion.button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScoreTimeline — recent score history
   ═══════════════════════════════════════════════════════════════ */

function ScoreTimeline({ scores }: { scores: ScoreEntry[] }) {
  if (scores.length === 0) {
    return (
      <div className="text-center py-12">
        <Gamepad2 size={40} className="mx-auto text-cream-dim/30 mb-3" />
        <p className="text-cream-dim text-sm">No scores recorded yet.</p>
        <Link
          href="/"
          className="inline-block mt-3 text-neon-green text-xs hover:underline"
        >
          Play some games →
        </Link>
      </div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-hot-pink/10" />

      {scores.slice(0, 15).map((entry, i) => (
        <motion.div
          key={`${entry.game}-${entry.ts}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="relative mb-3 last:mb-0"
        >
          {/* Timeline dot */}
          <div
            className="absolute -left-5 top-3.5 w-3 h-3 rounded-full border-2"
            style={{
              borderColor: getGameColor(entry.game),
              backgroundColor: `${getGameColor(entry.game)}22`,
            }}
          />

          <div className="bg-degen-950 border border-hot-pink/10 rounded-xl p-4 hover:border-hot-pink/25 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {GAME_EMOJIS[entry.game] || "🎮"}
              </span>
              <span className="text-cream font-semibold text-sm">
                {getGameTitle(entry.game)}
              </span>
              <span
                className="ml-auto font-display text-lg font-bold"
                style={{ color: getGameColor(entry.game) }}
              >
                {formatNumber(entry.score)}
              </span>
            </div>
            <p className="text-cream-dim text-[11px] mt-1">
              {formatDate(entry.ts)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton Loader
   ═══════════════════════════════════════════════════════════════ */

function SkeletonRows() {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-hot-pink/10" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="relative mb-4 last:mb-0"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="absolute -left-5 top-3.5 w-3 h-3 rounded-full bg-degen-900 animate-pulse" />
          <div className="bg-degen-950 border border-hot-pink/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-degen-900 animate-pulse" />
              <div className="w-24 h-4 rounded bg-degen-900 animate-pulse" />
              <div className="ml-auto w-16 h-4 rounded bg-degen-900 animate-pulse" />
            </div>
            <div className="w-20 h-3 rounded bg-degen-900 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */

interface ProfileIdClientProps {
  /** The profile ID from the URL param (wallet address or guest ID) */
  profileId: string;
}

export function ProfileIdClient({ profileId }: ProfileIdClientProps) {
  const [state, setState] = useState<ProfileState>({
    scores: [],
    loading: true,
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isWallet = isWalletAddress(profileId);
  const isGuest = isGuestId(profileId);
  const displayName = getDisplayName(profileId);
  const roleLabel = getRoleLabel(profileId);
  const isBioEditable = isGuest; // Only guests can edit bio via localStorage

  /* ── Fetch scores ── */
  const fetchScores = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        // For wallet addresses, query by wallet
        // For guest IDs, we don't have server-side scores — show empty
        if (!isWallet) {
          setState({ scores: [], loading: false, error: null });
          return;
        }

        const url = `${API_SCORES}?wallet=${encodeURIComponent(profileId)}`;
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

        const sorted = [...scores].sort((a, b) => (b.ts || 0) - (a.ts || 0));
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
    [profileId, isWallet]
  );

  /* ── Fetch on mount ── */
  useEffect(() => {
    fetchScores(true);
  }, [fetchScores]);

  /* ── Manual refresh ── */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchScores(false);
    setTimeout(() => setIsRefreshing(false), 600);
  }, [fetchScores]);

  /* ── Derived stats ── */
  const { totalGames, uniqueGames, topScore } = useMemo(() => {
    const scores = state.scores;
    return {
      totalGames: scores.length,
      uniqueGames: new Set(scores.map((s) => s.game)).size,
      topScore: scores.length ? Math.max(...scores.map((s) => s.score)) : 0,
    };
  }, [state.scores]);

  return (
    <div className="relative z-10">
      {/* Back to Home */}
      <div className="container-main pt-6">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       active:scale-95 transition-all min-h-[44px]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to Home
          </Link>
        </motion.div>
      </div>

      {/* Profile Container */}
      <div className="container-main py-6 space-y-6">
        {/* ═══ PROFILE HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div
            className="rounded-2xl border-2 border-hot-pink neon-ring-pink
                       bg-degen-950
                       shadow-[0_0_24px_rgba(255,46,136,0.25),0_8px_40px_rgba(0,0,0,0.5)]
                       overflow-hidden"
          >
            {/* Floating nuts */}
            <span className="absolute top-4 right-8 text-lg float-nut-1 opacity-60 pointer-events-none z-10">
              🥜
            </span>
            <span className="absolute bottom-6 left-12 text-base float-nut-2 opacity-45 pointer-events-none z-10">
              🥜
            </span>

            {/* Accent stripe */}
            <div className="h-1 bg-gradient-to-r from-hot-pink via-degen-violet to-hot-pink" />

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar + Info */}
                <div className="flex items-center gap-4">
                  <IdenticonAvatar
                    value={profileId}
                    size={80}
                  />
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-cream">
                      {displayName}
                    </h2>
                    <p className="text-xs text-cream-dim font-mono mt-0.5 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          isWallet ? "bg-neon-green" : "bg-brand-gold"
                        }`}
                      />
                      {roleLabel}
                    </p>

                    {/* Bio editor */}
                    <BioEditor
                      profileId={profileId}
                      isEditable={isBioEditable}
                    />
                  </div>
                </div>

                {/* Actions (wallet profiles get refresh) */}
                {isWallet && (
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <motion.button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs
                                 font-semibold text-cream-dim hover:text-cream
                                 bg-degen-900 hover:bg-[#1a1a1a]
                                 border border-hot-pink/20 hover:border-gold/40
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══ STATS SUMMARY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 sm:gap-4"
        >
          {[
            {
              label: "Total Plays",
              value: totalGames,
              icon: <Gamepad2 size={20} className="text-neon-green" />,
              borderColor: "border-neon-green/40",
              glowColor: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
              bg: "bg-degen-950",
            },
            {
              label: "Games Played",
              value: uniqueGames,
              icon: <Trophy size={20} className="text-brand-gold" />,
              borderColor: "border-brand-gold/40",
              glowColor: "shadow-[0_0_20px_rgba(251,191,36,0.12)]",
              bg: "bg-[#0f0a00]",
            },
            {
              label: "Best Score",
              value: topScore > 0 ? formatNumber(topScore) : "—",
              icon: <TrendingUp size={20} className="text-amber-500" />,
              borderColor: "border-amber-500/40",
              glowColor: "shadow-[0_0_20px_rgba(245,158,11,0.12)]",
              bg: "bg-[#0f0a00]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} border-2 ${stat.borderColor} rounded-xl ${stat.glowColor} p-4 sm:p-5 text-center`}
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

        {/* ═══ SCORE TIMELINE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            className="rounded-2xl border-2 border-hot-pink/20 bg-degen-950
                       shadow-[0_0_20px_rgba(255,46,136,0.08)] overflow-hidden"
          >
            <div className="h-px bg-gradient-to-r from-transparent via-hot-pink/30 to-transparent" />
            <div className="p-6">
              <h3 className="font-display text-lg font-bold text-cream mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-brand-gold" />
                Recent Scores
              </h3>

              {state.loading ? (
                <SkeletonRows />
              ) : state.error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 text-sm mb-3">{state.error}</p>
                  <motion.button
                    onClick={handleRefresh}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold
                               text-cream bg-degen-900 border border-hot-pink/20
                               hover:border-neon-green/40 transition-all cursor-pointer"
                  >
                    Try Again
                  </motion.button>
                </div>
              ) : (
                <ScoreTimeline scores={state.scores} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
