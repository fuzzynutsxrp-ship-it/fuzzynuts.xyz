"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * MyRankWidget — Personal stats card for leaderboard & profile
 *
 * Shows the current user's global rank, total score, games played,
 * and a progress bar indicating score needed for the next rank.
 * Renders a "Login to save progress" CTA for guest users.
 *
 * Usage:
 *   <MyRankWidget />            — auto-detects auth from context
 *   <MyRankWidget compact />    — smaller variant for sidebars
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo, useCallback } from "react";
import Link from "next/link";
import { Trophy, Gamepad2, TrendingUp, LogIn, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useWalletStore } from "@/store/wallet";
import { formatNumber } from "@/lib/utils";
import { useMyRank } from "@/features/arcade/hooks/useMyRank";

interface MyRankWidgetProps {
  compact?: boolean;
  className?: string;
}

export function MyRankWidget({ compact = false, className = "" }: MyRankWidgetProps) {
  const { data: session } = useSession();
  const walletAddress = useWalletStore((s) => s.address);

  // Determine the user identifier: wallet takes priority over session
  const userId = useMemo(
    () => walletAddress || session?.user?.id || null,
    [walletAddress, session?.user?.id],
  );

  const { rank, totalScore, gamesPlayed, nextRankScore, prevRankScore, loading, error, refetch } =
    useMyRank(userId);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Progress bar math ──
  const progressPercent = useMemo(() => {
    // Rank 1: no bar needed (trophy emoji shown instead)
    if (!rank || rank <= 1) return 0;
    // No scores yet: 0%
    if (totalScore <= 0) return 0;
    // If we've already passed the next rank score
    if (nextRankScore && totalScore >= nextRankScore) return 100;
    // Calculate progress within the gap between prev rank and next rank
    if (prevRankScore !== null && nextRankScore !== null) {
      const range = nextRankScore - prevRankScore;
      if (range <= 0) return 100;
      return Math.max(0, Math.min(99, ((totalScore - prevRankScore) / range) * 100));
    }
    // Fallback: progress toward next rank from 0
    if (nextRankScore) {
      return Math.max(0, Math.min(99, (totalScore / nextRankScore) * 100));
    }
    return 0;
  }, [rank, totalScore, nextRankScore, prevRankScore]);

  const scoreToNextRank = useMemo(() => {
    if (!nextRankScore || totalScore >= nextRankScore) return null;
    return nextRankScore - totalScore;
  }, [nextRankScore, totalScore]);

  const isGuest = !userId;
  const isTopRank = rank !== null && rank <= 3;

  // ── Loading state ──
  if (loading) {
    return (
      <div
        className={`relative rounded-2xl border-2 border-white/10 bg-[#0a0613] overflow-hidden ${className}`}
      >
        <div className="h-1 bg-gradient-to-r from-brand-gold/40 via-amber-500/40 to-brand-gold/40" />
        <div className={compact ? "p-4" : "p-5 sm:p-6"}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-white/5 animate-pulse" />
            <div className="w-20 h-4 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center"
              >
                <div className="w-6 h-6 rounded bg-white/5 animate-pulse mx-auto mb-2" />
                <div className="w-12 h-4 rounded bg-white/5 animate-pulse mx-auto mb-1" />
                <div className="w-16 h-3 rounded bg-white/5 animate-pulse mx-auto" />
              </div>
            ))}
          </div>
          <div className="mt-4 w-full h-2 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Guest CTA ──
  if (isGuest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl border-2 border-brand-gold/30 bg-[#0a0613] overflow-hidden ${className}`}
        style={{
          boxShadow: "0 0 30px rgba(251,191,36,0.08), inset 0 1px 0 rgba(251,191,36,0.1)",
        }}
      >
        <div className="h-1 bg-gradient-to-r from-brand-gold via-amber-500 to-brand-gold" />
        <div className={compact ? "p-4" : "p-5 sm:p-6"}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-brand-gold" />
            <h3
              className={`font-display font-bold text-cream ${compact ? "text-sm" : "text-base"}`}
            >
              My Rank
            </h3>
          </div>
          <p className="text-sm text-[var(--color-cream-dim)] mb-4 leading-relaxed">
            Login to save your progress and compete on the global leaderboard.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       active:scale-95 transition-all min-h-[40px]"
          >
            <LogIn size={16} />
            Login to save progress
          </Link>
        </div>
      </motion.div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        className={`relative rounded-2xl border-2 border-orange/30 bg-[#0a0613] overflow-hidden ${className}`}
      >
        <div className={compact ? "p-4" : "p-5 sm:p-6"}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-brand-gold" />
              <h3
                className={`font-display font-bold text-cream ${compact ? "text-sm" : "text-base"}`}
              >
                My Rank
              </h3>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                         text-[var(--color-cream-dim)] hover:text-cream
                         bg-white/[0.03] hover:bg-white/[0.06]
                         border border-white/5 transition-all cursor-pointer"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
          <p className="text-sm text-orange/80">{error}</p>
        </div>
      </div>
    );
  }

  // ── Authenticated stats ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border-2 bg-[#0a0613] overflow-hidden ${
        isTopRank ? "border-brand-gold/40" : "border-white/10"
      } ${className}`}
      style={
        isTopRank
          ? {
              boxShadow: "0 0 30px rgba(251,191,36,0.12), inset 0 1px 0 rgba(251,191,36,0.15)",
            }
          : undefined
      }
    >
      <div
        className={`h-1 ${
          isTopRank
            ? "bg-gradient-to-r from-brand-gold via-amber-500 to-brand-gold"
            : "bg-gradient-to-r from-neon-green/40 via-neon-green/20 to-neon-green/40"
        }`}
      />

      <div className={compact ? "p-4" : "p-5 sm:p-6"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-brand-gold" />
            <h3
              className={`font-display font-bold text-cream ${compact ? "text-sm" : "text-base"}`}
            >
              My Rank
            </h3>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                       text-[var(--color-cream-dim)] hover:text-cream
                       bg-white/[0.03] hover:bg-white/[0.06]
                       border border-white/5 transition-all cursor-pointer"
            title="Refresh rank"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Stats grid */}
        <div className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-3"} mb-4`}>
          {/* Rank */}
          <div
            className={`rounded-xl border-2 p-3 text-center ${
              isTopRank
                ? "border-brand-gold/30 bg-brand-gold/[0.06]"
                : "border-white/[0.08] bg-white/[0.02]"
            }`}
            style={
              isTopRank
                ? {
                    boxShadow: "0 0 16px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.1)",
                  }
                : undefined
            }
          >
            <div className="flex justify-center mb-1.5">
              {rank !== null && rank <= 3 ? (
                <span className={compact ? "text-xl" : "text-2xl"}>
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                </span>
              ) : (
                <TrendingUp size={compact ? 18 : 20} className="text-brand-gold" />
              )}
            </div>
            <p
              className={`font-display font-bold text-cream ${
                compact ? "text-base" : "text-lg sm:text-xl"
              }`}
            >
              {rank !== null ? `#${rank}` : "—"}
            </p>
            <p className="text-[10px] text-[var(--color-cream-dim)] uppercase tracking-wider mt-0.5">
              Global Rank
            </p>
          </div>

          {/* Total Score */}
          <div
            className="rounded-xl border-2 border-neon-green/30 bg-neon-green/[0.04] p-3 text-center"
            style={{
              boxShadow: "0 0 16px rgba(16,185,129,0.08), inset 0 1px 0 rgba(16,185,129,0.1)",
            }}
          >
            <div className="flex justify-center mb-1.5">
              <TrendingUp size={compact ? 18 : 20} className="text-neon-green" />
            </div>
            <p
              className={`font-display font-bold text-cream ${
                compact ? "text-base" : "text-lg sm:text-xl"
              }`}
            >
              {totalScore > 0 ? formatNumber(totalScore) : "—"}
            </p>
            <p className="text-[10px] text-[var(--color-cream-dim)] uppercase tracking-wider mt-0.5">
              Total Score
            </p>
          </div>

          {/* Games Played */}
          <div
            className="rounded-xl border-2 border-amber-500/30 bg-amber-500/[0.04] p-3 text-center"
            style={{
              boxShadow: "0 0 16px rgba(245,158,11,0.08), inset 0 1px 0 rgba(245,158,11,0.1)",
            }}
          >
            <div className="flex justify-center mb-1.5">
              <Gamepad2 size={compact ? 18 : 20} className="text-amber-500" />
            </div>
            <p
              className={`font-display font-bold text-cream ${
                compact ? "text-base" : "text-lg sm:text-xl"
              }`}
            >
              {gamesPlayed > 0 ? gamesPlayed : "—"}
            </p>
            <p className="text-[10px] text-[var(--color-cream-dim)] uppercase tracking-wider mt-0.5">
              Games Played
            </p>
          </div>
        </div>

        {/* Progress to next rank — hidden for rank 1 */}
        {rank !== null && rank > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-cream-dim)] font-medium">
                Progress to next rank
              </span>
              <span className="font-mono text-neon-green/80">
                {scoreToNextRank ? `+${formatNumber(scoreToNextRank)} pts` : "—"}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  isTopRank
                    ? "bg-gradient-to-r from-brand-gold to-amber-500"
                    : "bg-gradient-to-r from-neon-green to-neon-green/60"
                }`}
                style={{
                  boxShadow: isTopRank
                    ? "0 0 8px rgba(251,191,36,0.4)"
                    : "0 0 8px rgba(16,185,129,0.4)",
                }}
              />
            </div>
          </div>
        )}
        {/* Rank 1 trophy message */}
        {rank === 1 && (
          <div className="flex items-center justify-center gap-2 text-[11px] pt-1">
            <span className="text-[var(--color-cream-dim)] font-medium">{"You're #1!"}</span>
            <span>🏆</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
