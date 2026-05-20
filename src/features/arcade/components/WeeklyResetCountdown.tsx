"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * WeeklyResetCountdown — Visual countdown to Monday 00:00 UTC
 *
 * Displays a premium, animated countdown timer synced to the
 * prize cycle. Shows urgency states with color transitions:
 *   - Normal (green): >6h remaining
 *   - Urgent (orange): <6h remaining
 *   - Critical (red pulse): <1h remaining
 *
 * Features:
 *   - Tick-accurate per-second updates (via useWeeklyCountdown)
 *   - Progress bar showing week elapsed
 *   - Responsive design (full/compact modes)
 * ═══════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { useWeeklyCountdown } from "../hooks/useWeeklyCountdown";

interface WeeklyResetCountdownProps {
  /** Render mode */
  variant?: "full" | "compact" | "inline";
  /** Additional CSS classes */
  className?: string;
}

/** Two-digit padded display */
function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="font-mono text-lg sm:text-xl font-black tabular-nums min-w-[2ch] text-center"
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span className="text-[9px] uppercase tracking-widest opacity-50 font-semibold mt-0.5">
        {label}
      </span>
    </div>
  );
}

function Separator() {
  return (
    <span className="text-lg sm:text-xl font-mono font-black opacity-30 mx-0.5 -mt-2">
      :
    </span>
  );
}

/**
 * Animated weekly reset countdown component.
 */
export function WeeklyResetCountdown({
  variant = "full",
  className = "",
}: WeeklyResetCountdownProps) {
  const countdown = useWeeklyCountdown();

  const colorClass = countdown.isCritical
    ? "text-red-400"
    : countdown.isUrgent
    ? "text-orange"
    : "text-neon-green";

  const borderClass = countdown.isCritical
    ? "border-red-400/30"
    : countdown.isUrgent
    ? "border-orange/20"
    : "border-neon-green/20";

  const bgClass = countdown.isCritical
    ? "bg-red-400/[0.06]"
    : countdown.isUrgent
    ? "bg-orange/[0.04]"
    : "bg-neon-green/[0.03]";

  /* ── Inline variant (single line, for headers) ── */
  if (variant === "inline") {
    return (
      <span className={`text-xs font-mono ${colorClass} ${className}`}>
        <Clock size={10} className="inline mr-1 opacity-60" />
        {countdown.short}
        {countdown.isCritical && (
          <Zap size={10} className="inline ml-1 text-red-400 animate-pulse" />
        )}
      </span>
    );
  }

  /* ── Compact variant (no progress bar) ── */
  if (variant === "compact") {
    return (
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          ${bgClass} border ${borderClass}
          ${countdown.isCritical ? "animate-pulse" : ""}
          ${className}
        `}
      >
        <Clock size={12} className={`${colorClass} opacity-70`} />
        <span className={`font-mono text-sm font-bold ${colorClass}`}>
          {countdown.display}
        </span>
      </div>
    );
  }

  /* ── Full variant (with progress bar + digit boxes) ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border ${borderClass} ${bgClass}
        p-4 sm:p-5
        ${countdown.isCritical ? "countdown-critical" : ""}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className={`${colorClass} opacity-70`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-cream-dim">
            {countdown.isCritical
              ? "Final Hour!"
              : countdown.isUrgent
              ? "Almost Over!"
              : "Resets In"}
          </span>
        </div>
        <span className="text-[10px] font-mono text-cream-dim/50">
          Mon 00:00 UTC
        </span>
      </div>

      {/* Digit display */}
      <div className={`flex items-start justify-center gap-1 ${colorClass} mb-4`}>
        {countdown.days > 0 && (
          <>
            <Digit value={countdown.days} label="days" />
            <Separator />
          </>
        )}
        <Digit value={countdown.hours} label="hrs" />
        <Separator />
        <Digit value={countdown.minutes} label="min" />
        <Separator />
        <Digit value={countdown.seconds} label="sec" />
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${countdown.weekProgress * 100}%`,
            background: countdown.isCritical
              ? "linear-gradient(90deg, #ef4444, #f87171)"
              : countdown.isUrgent
              ? "linear-gradient(90deg, #f97316, #fb923c)"
              : "linear-gradient(90deg, #10b981, #34d399)",
          }}
          initial={false}
          animate={{ width: `${countdown.weekProgress * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Pulse dot at the end */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{
            left: `calc(${countdown.weekProgress * 100}% - 5px)`,
            background: countdown.isCritical ? "#ef4444" : countdown.isUrgent ? "#f97316" : "#10b981",
            boxShadow: countdown.isCritical
              ? "0 0 8px #ef4444"
              : countdown.isUrgent
              ? "0 0 8px #f97316"
              : "0 0 8px #10b981",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: countdown.isCritical ? 0.5 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-mono text-cream-dim/40">
          {Math.round(countdown.weekProgress * 100)}% elapsed
        </span>
        <span className="text-[10px] font-mono text-cream-dim/40">
          500K $NUT
        </span>
      </div>

      {/* Critical pulse animation */}
      <style jsx global>{`
        .countdown-critical {
          animation: countdown-critical-pulse 1s ease-in-out infinite;
        }
        @keyframes countdown-critical-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
          50% {
            box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.1);
          }
        }
      `}</style>
    </motion.div>
  );
}
