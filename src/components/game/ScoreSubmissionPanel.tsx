"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Zap,
  Target,
} from "lucide-react";
import { timeAgo } from "@/features/arcade";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   ScoreSubmissionPanel — Bottom bar showing score history + status

   Shows:
   • Last submitted score + status badge
   • Best score this week + rank progress
   • Submission history (last 5, collapsible)
   • Achievement unlocks (if any, Fuzzynuts World only)
   ═══════════════════════════════════════════════════════════════ */

interface ScoreHistoryEntry {
  score: number;
  timestamp: number;
  status: "success" | "error" | "pending";
  errorMessage?: string;
}

interface ScoreSubmissionPanelProps {
  game: GameMetadata;
  bestScore: number | null;
  rank: number | null;
  lastSubmission: ScoreHistoryEntry | null;
  history: ScoreHistoryEntry[];
  submissionStatus: "idle" | "submitting" | "success" | "error";
}

function formatScore(score: number): string {
  return score.toLocaleString();
}

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle,
    label: "Saved",
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  error: {
    icon: XCircle,
    label: "Failed",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "#FBBF24",
    bgColor: "rgba(251, 191, 36, 0.08)",
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
};

export function ScoreSubmissionPanel({
  game,
  bestScore,
  rank,
  lastSubmission,
  history,
  submissionStatus,
}: ScoreSubmissionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // No panel if nothing to show
  if (!lastSubmission && !bestScore && history.length === 0) {
    return null;
  }

  // Calculate progress to next rank
  const nextRankInfo = (() => {
    if (rank === null || rank <= 1) return null;
    // Prize tiers: 1st, 2nd, 3rd
    if (rank > 3) return { targetRank: 3, label: "Top 3 for prizes" };
    if (rank === 3) return { targetRank: 2, label: "2nd place" };
    if (rank === 2) return { targetRank: 1, label: "1st place" };
    return null;
  })();

  return (
    <div
      className="border-t border-[rgba(255,255,255,0.06)]"
      style={{
        background: "rgba(6, 10, 6, 0.8)",
        backdropFilter: "blur(8px)",
      }}
      id="score-submission-panel"
    >
      {/* ── Main bar (always visible) ── */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5">
        {/* Left: Last submission */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          {/* Last score */}
          {lastSubmission && (
            <div className="flex items-center gap-2 min-w-0">
              <StatusBadge status={lastSubmission.status} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-[var(--color-cream)]">
                    {formatScore(lastSubmission.score)}
                  </span>
                  <span className="text-[10px] text-[var(--color-cream-dim)] opacity-60 hidden sm:inline">
                    {timeAgo(lastSubmission.timestamp)}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-cream-dim)] truncate">
                  Last score
                </p>
              </div>
            </div>
          )}

          {/* Divider */}
          {lastSubmission && bestScore !== null && (
            <div className="w-px h-8 bg-[rgba(255,255,255,0.06)] hidden sm:block" />
          )}

          {/* Best score */}
          {bestScore !== null && (
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} className="text-[var(--color-brand-gold)]" />
                <span className="font-mono text-sm font-bold text-[var(--color-cream)]">
                  {formatScore(bestScore)}
                </span>
                {rank !== null && rank <= 50 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background:
                        rank <= 3
                          ? "rgba(251, 191, 36, 0.12)"
                          : "rgba(255,255,255,0.04)",
                      color:
                        rank <= 3
                          ? "var(--color-brand-gold)"
                          : "var(--color-cream-dim)",
                    }}
                  >
                    #{rank}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--color-cream-dim)]">
                Best this week
              </p>
            </div>
          )}

          {/* Score type indicator */}
          {game.scoreType === "cumulative" && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.1)]">
              <Zap size={10} className="text-[var(--color-accent-green)]" />
              <span className="text-[10px] font-medium text-[var(--color-accent-green)]">
                Cumulative
              </span>
            </div>
          )}
        </div>

        {/* Right: Expand button (if history exists) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Progress hint */}
          {nextRankInfo && bestScore !== null && (
            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[var(--color-cream-dim)]">
              <Target size={10} className="opacity-50" />
              <span>{nextRankInfo.label}</span>
            </div>
          )}

          {history.length > 0 && (
            <button
              onClick={() => setIsExpanded((p) => !p)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.04)] transition-colors min-h-[36px]"
              aria-label={isExpanded ? "Collapse history" : "Expand history"}
              id="score-history-toggle"
            >
              <span className="hidden sm:inline">History ({history.length})</span>
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronUp size={12} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded history ── */}
      <AnimatePresence>
        {isExpanded && history.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.04)]"
          >
            <div className="px-3 sm:px-5 py-3 space-y-1.5 max-h-[200px] overflow-y-auto">
              {history.slice(0, 10).map((entry, i) => {
                const config = STATUS_CONFIG[entry.status];
                const Icon = config.icon;
                return (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={12} style={{ color: config.color }} />
                      <span className="font-mono text-xs font-semibold text-[var(--color-cream)]">
                        {formatScore(entry.score)}
                      </span>
                      {entry.errorMessage && (
                        <span className="text-[10px] text-red-400 truncate max-w-[150px]">
                          {entry.errorMessage}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--color-cream-dim)] opacity-50 shrink-0">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submitting indicator bar ── */}
      {submissionStatus === "submitting" && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2, ease: "linear" }}
          className="h-[2px] origin-left"
          style={{ background: game.color }}
        />
      )}
    </div>
  );
}

/* ── Status Badge Component ── */

function StatusBadge({ status }: { status: "success" | "error" | "pending" }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
      style={{
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
    >
      <Icon size={14} style={{ color: config.color }} />
    </div>
  );
}
