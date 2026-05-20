"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  Trophy,
  Clock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   GameScoreHistory — Enhanced score panel

   Shows:
   • "Connect wallet to save scores" CTA when no wallet
   • Last 5 scores with trend arrows (↑ improved, ↓ declined)
   • Empty state for connected wallets with no scores
   ═══════════════════════════════════════════════════════════════ */

interface ScoreEntry {
  score: number;
  timestamp: number;
  status: "success" | "error" | "pending";
  errorMessage?: string;
}

interface GameScoreHistoryProps {
  /** Connected wallet address (null if not connected) */
  walletAddress: string | null;
  /** Score history entries */
  scores: ScoreEntry[];
  /** User's best score on the leaderboard */
  bestScore: number | null;
  /** Trigger wallet connection */
  onConnectWallet: () => void;
  /** Game accent color */
  accentColor?: string;
}

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GameScoreHistory({
  walletAddress,
  scores,
  bestScore,
  onConnectWallet,
  accentColor = "var(--color-brand-gold)",
}: GameScoreHistoryProps) {
  const recentScores = scores.slice(0, 5);

  // Compute trend for each score (compared to the next older score)
  const scoreTrends = useMemo(() => {
    return recentScores.map((entry, i) => {
      if (i >= recentScores.length - 1) return "first"; // oldest entry
      const older = recentScores[i + 1];
      if (entry.score > older.score) return "up";
      if (entry.score < older.score) return "down";
      return "same";
    });
  }, [recentScores]);

  // No wallet connected
  if (!walletAddress) {
    return (
      <div className="px-4 py-5 text-center">
        <div
          className="mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}25`,
          }}
        >
          <Wallet size={18} style={{ color: accentColor }} />
        </div>
        <p className="text-sm font-semibold text-[var(--color-cream)] mb-1">
          Connect to Save Scores
        </p>
        <p className="text-[11px] text-[var(--color-cream-dim)] mb-4 leading-relaxed">
          Link your XRPL wallet to save scores, compete on the leaderboard, and
          earn weekly $NUT prizes.
        </p>
        <motion.button
          onClick={onConnectWallet}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          style={{
            background: `${accentColor}18`,
            border: `1px solid ${accentColor}40`,
            color: accentColor,
          }}
          id="score-history-connect-wallet"
        >
          <Wallet size={12} className="inline mr-1.5 -mt-0.5" />
          Connect Wallet
        </motion.button>
      </div>
    );
  }

  // Wallet connected but no scores
  if (recentScores.length === 0) {
    return (
      <div className="px-4 py-5 text-center">
        <div className="text-3xl mb-2" aria-hidden="true">
          🎮
        </div>
        <p className="text-sm font-semibold text-[var(--color-cream)] mb-1">
          No Scores Yet
        </p>
        <p className="text-[11px] text-[var(--color-cream-dim)] leading-relaxed">
          Play a game to see your score history here. Your best score will appear
          on the leaderboard!
        </p>
      </div>
    );
  }

  // Score history
  return (
    <div className="px-4 py-3 space-y-2">
      {/* Best score banner */}
      {bestScore != null && (
        <div
          className="flex items-center justify-between px-3 py-2 rounded-lg mb-1"
          style={{
            background: `${accentColor}08`,
            border: `1px solid ${accentColor}20`,
          }}
        >
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)] font-medium flex items-center gap-1">
            <Trophy size={10} style={{ color: accentColor }} />
            Best Score
          </span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: accentColor }}
          >
            {formatScore(bestScore)}
          </span>
        </div>
      )}

      {/* Recent scores */}
      {recentScores.map((entry, i) => {
        const trend = scoreTrends[i];
        const TrendIcon =
          trend === "up"
            ? TrendingUp
            : trend === "down"
              ? TrendingDown
              : Minus;
        const trendColor =
          trend === "up"
            ? "var(--color-neon-green)"
            : trend === "down"
              ? "#ef4444"
              : "var(--color-cream-dim)";

        return (
          <div
            key={entry.timestamp + entry.score}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-glass-hover)] transition-colors"
          >
            {/* Trend indicator */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                background:
                  trend === "first"
                    ? "var(--color-glass-border-faint)"
                    : `${trendColor}15`,
              }}
            >
              {trend === "first" ? (
                <span className="text-[8px] font-bold text-[var(--color-cream-dim)]">
                  1st
                </span>
              ) : (
                <TrendIcon size={10} style={{ color: trendColor }} />
              )}
            </div>

            {/* Score */}
            <span
              className={`font-mono text-xs font-bold flex-1 ${
                entry.status === "error"
                  ? "text-red-400 line-through"
                  : "text-[var(--color-cream)]"
              }`}
            >
              {formatScore(entry.score)}
            </span>

            {/* Status badge */}
            {entry.status === "pending" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                Syncing
              </span>
            )}
            {entry.status === "error" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                Failed
              </span>
            )}

            {/* Timestamp */}
            <span className="text-[10px] text-[var(--color-cream-dim)] opacity-50 flex items-center gap-0.5">
              <Clock size={8} />
              {timeAgo(entry.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
