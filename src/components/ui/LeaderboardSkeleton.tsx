"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * LeaderboardSkeleton — Premium shimmer loading state
 *
 * Tailwind + Framer Motion skeleton loader for leaderboard table.
 * Multi-layer, stagger-animated with CSS-only shimmer.
 * Matches the Fuzzynuts "Cyber-Nature" glass aesthetic.
 *
 * Usage:
 *   import { LeaderboardSkeleton } from "@/components/ui/LeaderboardSkeleton";
 *   {loading ? <LeaderboardSkeleton /> : <ScoreTable />}
 * ═══════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";

/* ── Configuration ── */

const ROW_COUNT = 10;

/* ── Animation variants ── */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

/* ── Sub-components ── */

function ShimmerBar({
  className,
  delay = 0,
  style,
}: {
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded ldr-shimmer ${className ?? ""}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
    />
  );
}

/* ── Main Component ── */

export function LeaderboardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-hot-pink/30 bg-degen-950 relative">
      {/* Ambient neon glow */}
      <div className="absolute inset-0 pointer-events-none ldr-ambient" />

      {/* Header skeleton */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-4 border-b border-hot-pink/10">
        <ShimmerBar className="w-8 h-4" />
        <ShimmerBar className="h-4 w-32" delay={50} />
        <ShimmerBar className="w-20 h-4" delay={100} />
        <ShimmerBar className="w-24 h-4" delay={150} />
      </div>

      {/* Row skeletons */}
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {[...Array(ROW_COUNT)].map((_, i) => (
          <motion.div
            key={i}
            className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-3 border-b border-hot-pink/10 last:border-0"
            variants={rowVariants}
          >
            {/* Rank badge */}
            <div className="flex items-center justify-center w-8 h-8">
              <div
                className={`w-6 h-6 rounded-full ${
                  i < 3 ? "bg-gold/20" : "bg-hot-pink/10"
                } animate-pulse`}
              />
            </div>

            {/* Player info */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-degen-900 animate-pulse" />
              <div className="space-y-2">
                <ShimmerBar
                  className={`h-3 ${
                    ["w-24", "w-28", "w-20", "w-32", "w-24", "w-36", "w-20", "w-28", "w-24", "w-32"][i % 10]
                  }`}
                  delay={i * 80}
                />
                <ShimmerBar className="w-16 h-2 opacity-50" delay={i * 80 + 40} />
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-end">
              <ShimmerBar
                className={`h-4 ${i < 3 ? "w-16" : "w-12"}`}
                delay={i * 80 + 60}
              />
            </div>

            {/* Game badge */}
            <div className="flex items-center justify-end">
              <ShimmerBar
                className="w-20 h-6 rounded-full"
                delay={i * 80 + 80}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer skeleton */}
      <div className="px-6 py-3 bg-degen-900">
        <ShimmerBar className="w-32 h-3" />
      </div>

      {/* Bottom fade (matches CyberCard bg) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, var(--color-card, rgba(26,26,36,0.85)), transparent)",
        }}
      />

      {/* ── CSS-only shimmer animation ── */}
      <style>{`
        @keyframes ldr-shimmer-slide {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .ldr-shimmer {
          background: linear-gradient(
            90deg,
            var(--color-glass-hover) 0%,
            var(--color-glass-border-strong) 40%,
            var(--color-glass-hover) 80%
          );
          background-size: 200% 100%;
          animation: ldr-shimmer-slide 1.8s ease-in-out infinite;
        }
        .ldr-ambient {
          background: radial-gradient(
            ellipse at 50% 0%,
            rgba(16,185,129,0.02) 0%,
            transparent 60%
          );
          animation: ldr-ambient-pulse 3s ease-in-out infinite;
        }
        @keyframes ldr-ambient-pulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes shimmer-flow {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer-flow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ── Shimmer Variant: Premium overlay effect ── */

export function LeaderboardSkeletonShimmer() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-hot-pink/20 bg-degen-950">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      <LeaderboardSkeleton />
    </div>
  );
}
