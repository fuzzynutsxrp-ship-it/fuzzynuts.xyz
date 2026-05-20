"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * SectionSkeleton — Reusable skeleton for any section
 *
 * Variants:
 *   - table: leaderboard table rows
 *   - stats: stat cards grid
 *   - grid: game cards grid
 *   - card: single card skeleton
 * ═══════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";

interface SectionSkeletonProps {
  type: "table" | "stats" | "grid" | "card";
  rows?: number;
  cols?: number;
  className?: string;
}

export function SectionSkeleton({
  type,
  rows = 5,
  cols = 3,
  className = "",
}: SectionSkeletonProps) {
  const baseClasses = "animate-pulse bg-white/10 rounded";

  if (type === "table") {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-forest-900/50 ${className}`}
      >
        {/* Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-4 border-b border-white/5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`${baseClasses} h-4 ${i === 1 ? "w-32" : "w-16"}`}
            />
          ))}
        </div>
        {/* Rows */}
        {[...Array(rows)].map((_, r) => (
          <div
            key={r}
            className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/5 last:border-0"
          >
            <div className={`${baseClasses} w-8 h-8 rounded-full`} />
            <div className="flex items-center gap-3">
              <div className={`${baseClasses} w-8 h-8 rounded-full`} />
              <div className="space-y-2 flex-1">
                <div className={`${baseClasses} h-3 w-24`} />
                <div className={`${baseClasses} h-2 w-16`} />
              </div>
            </div>
            <div className={`${baseClasses} h-4 w-16`} />
            <div className={`${baseClasses} h-6 w-20 rounded-full`} />
          </div>
        ))}
      </div>
    );
  }

  if (type === "stats") {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      >
        {[...Array(cols)].map((_, i) => (
          <motion.div
            key={i}
            className="p-5 rounded-2xl border border-white/10 bg-forest-900/50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className={`${baseClasses} h-4 w-20 mb-3`} />
            <div className={`${baseClasses} h-8 w-24 mb-2`} />
            <div className={`${baseClasses} h-3 w-32`} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
      >
        {[...Array(rows)].map((_, i) => (
          <motion.div
            key={i}
            className="aspect-video rounded-2xl border border-white/10 bg-forest-900/50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="p-4 space-y-3">
              <div className={`${baseClasses} h-4 w-3/4`} />
              <div className={`${baseClasses} h-3 w-1/2`} />
              <div className="flex gap-2 pt-2">
                <div className={`${baseClasses} h-6 w-16 rounded-full`} />
                <div className={`${baseClasses} h-6 w-12 rounded-full`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Default: card skeleton
  return (
    <div
      className={`p-6 rounded-2xl border border-white/10 bg-forest-900/50 ${className}`}
    >
      <div className={`${baseClasses} h-6 w-40 mb-4`} />
      <div className={`${baseClasses} h-32 w-full mb-4`} />
      <div className="space-y-2">
        <div className={`${baseClasses} h-3 w-full`} />
        <div className={`${baseClasses} h-3 w-5/6`} />
        <div className={`${baseClasses} h-3 w-4/6`} />
      </div>
    </div>
  );
}
