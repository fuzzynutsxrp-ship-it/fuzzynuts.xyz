"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * LeaderboardSkeleton — Premium shimmer loading state
 *
 * Animated skeleton loader for the leaderboard table.
 * Uses staggered pulse animations with a multi-layer shimmer
 * effect that matches the Fuzzynuts "Cyber-Nature" aesthetic.
 *
 * Usage:
 *   import { LeaderboardSkeleton } from "@/features/arcade/components/LeaderboardSkeleton";
 *   {loading ? <LeaderboardSkeleton rows={10} /> : <ScoreTable ... />}
 * ═══════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";

interface LeaderboardSkeletonProps {
  /** Number of skeleton rows to render (default: 10) */
  rows?: number;
  /** Show the table header skeleton (default: true) */
  showHeader?: boolean;
}

/** Single skeleton row with staggered animation */
function SkeletonRow({ index }: { index: number }) {
  const isTopThree = index < 3;
  const widthVariants = [
    "w-20",
    "w-28",
    "w-24",
    "w-32",
    "w-20",
    "w-36",
    "w-24",
    "w-28",
    "w-20",
    "w-32",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
      className={`
        flex items-center gap-3 px-4 py-3.5
        border-b border-hot-pink/10 last:border-0
        ${isTopThree ? "bg-degen-900" : ""}
      `}
    >
      {/* Rank badge */}
      <div className="w-8 flex justify-center shrink-0">
        {isTopThree ? (
          <div
            className="w-7 h-7 rounded-full skeleton-shimmer"
            style={{
              animationDelay: `${index * 100}ms`,
              background:
                index === 0
                  ? "linear-gradient(135deg, rgba(245,196,66,0.15), rgba(245,196,66,0.05))"
                  : index === 1
                    ? "linear-gradient(135deg, rgba(192,192,192,0.15), rgba(192,192,192,0.05))"
                    : "linear-gradient(135deg, rgba(205,127,50,0.15), rgba(205,127,50,0.05))",
            }}
          />
        ) : (
          <div
            className="w-6 h-4 rounded skeleton-shimmer"
            style={{ animationDelay: `${index * 100}ms` }}
          />
        )}
      </div>

      {/* Player name */}
      <div className="flex-1 min-w-0">
        <div
          className={`h-4 rounded skeleton-shimmer ${widthVariants[index % widthVariants.length]}`}
          style={{ animationDelay: `${index * 100 + 50}ms` }}
        />
        {isTopThree && (
          <div
            className="h-2.5 w-16 rounded skeleton-shimmer mt-1.5 opacity-50"
            style={{ animationDelay: `${index * 100 + 100}ms` }}
          />
        )}
      </div>

      {/* Prize badge (top 3 only) */}
      {isTopThree && (
        <div className="hidden sm:block shrink-0">
          <div
            className="w-20 h-5 rounded-full skeleton-shimmer"
            style={{ animationDelay: `${index * 100 + 75}ms` }}
          />
        </div>
      )}

      {/* Score */}
      <div className="w-20 flex justify-end shrink-0">
        <div
          className={`h-5 rounded skeleton-shimmer ${isTopThree ? "w-16" : "w-12"}`}
          style={{ animationDelay: `${index * 100 + 100}ms` }}
        />
      </div>

      {/* Time ago */}
      <div className="w-16 hidden sm:flex justify-end shrink-0">
        <div
          className="w-10 h-3 rounded skeleton-shimmer opacity-60"
          style={{ animationDelay: `${index * 100 + 150}ms` }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Full leaderboard skeleton with header and configurable row count.
 */
export function LeaderboardSkeleton({ rows = 10, showHeader = true }: LeaderboardSkeletonProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none skeleton-ambient-glow" />

      {/* Table header skeleton */}
      {showHeader && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hot-pink/20 bg-degen-900">
          <div className="w-8 h-3 rounded skeleton-shimmer" />
          <div className="flex-1">
            <div className="w-14 h-3 rounded skeleton-shimmer" style={{ animationDelay: "50ms" }} />
          </div>
          <div className="w-20 flex justify-end">
            <div
              className="w-10 h-3 rounded skeleton-shimmer"
              style={{ animationDelay: "100ms" }}
            />
          </div>
          <div className="w-16 hidden sm:flex justify-end">
            <div className="w-8 h-3 rounded skeleton-shimmer" style={{ animationDelay: "150ms" }} />
          </div>
        </div>
      )}

      {/* Skeleton rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} index={i} />
      ))}

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, var(--color-card, rgba(26,26,36,0.85)), transparent)",
        }}
      />

      {/* Inline styles for skeleton animation */}
      <style jsx global>{`
        @keyframes skeleton-shimmer-move {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            var(--color-glass-hover) 0%,
            var(--color-glass-border-strong) 40%,
            var(--color-glass-hover) 80%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer-move 1.8s ease-in-out infinite;
        }

        .skeleton-ambient-glow {
          background: radial-gradient(
            ellipse at 50% 0%,
            rgba(16, 185, 129, 0.02) 0%,
            transparent 60%
          );
          animation: skeleton-ambient-pulse 3s ease-in-out infinite;
        }

        @keyframes skeleton-ambient-pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
