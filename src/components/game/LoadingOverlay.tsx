"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Game title for branded messaging */
  gameTitle?: string;
  /** Accent color for the progress bar */
  accentColor?: string;
  /** Max loading time (ms) before auto-dismiss — safety fallback */
  maxLoadTime?: number;
  /** Called when loading completes (either via event or timeout) */
  onLoadComplete?: () => void;
  /** Game-specific loading tips (overrides defaults if provided) */
  loadingTips?: string[];
}

// DEGEN OVERHAUL — degen "nut factory" loading copy
const DEFAULT_LOADING_TIPS = [
  "🥜 Cracking the nut factory open…",
  "🐿️ Bribing the squirrels…",
  "⚡ Loading degen physics…",
  "🎰 Spinning up the cabinet…",
  "🚀 Warming the leaderboard…",
  "🔥 Calibrating tail fluffiness…",
  "💰 Counting the hoard…",
];

/**
 * LoadingOverlay — Branded loading screen for the game wrapper.
 *
 * Displays an animated acorn spinner with a shimmer progress bar.
 * Listens for `postMessage({ type: 'gameReady' })` from the iframe
 * to auto-dismiss. Falls back to `maxLoadTime` timeout.
 */
export function LoadingOverlay({
  isLoading,
  gameTitle = "Game",
  accentColor = "var(--color-brand-gold)",
  maxLoadTime = 5000,
  onLoadComplete,
  loadingTips,
}: LoadingOverlayProps) {
  // Merge game-specific tips with defaults for variety
  const tips = loadingTips && loadingTips.length > 0
    ? [...loadingTips, ...DEFAULT_LOADING_TIPS]
    : DEFAULT_LOADING_TIPS;
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(() =>
    tips[Math.floor(Math.random() * tips.length)]
  );

  const handleComplete = useCallback(() => {
    setProgress(100);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // Simulated progress + auto-dismiss timeout
  useEffect(() => {
    if (!isLoading) return;

    setProgress(0);
    setTip(tips[Math.floor(Math.random() * tips.length)]);

    // Simulate progress that slows down as it approaches 90%
    let frame: number;
    let start: number | null = null;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      // Ease-out curve: approaches 90% asymptotically
      const simulated = Math.min(90, (elapsed / maxLoadTime) * 120);
      setProgress(simulated);

      if (elapsed < maxLoadTime * 0.9) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    // Rotate tips every 3s
    const tipInterval = setInterval(() => {
      setTip(tips[Math.floor(Math.random() * tips.length)]);
    }, 3000);

    // Safety fallback: auto-dismiss after maxLoadTime
    const fallback = setTimeout(handleComplete, maxLoadTime);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(tipInterval);
      clearTimeout(fallback);
    };
  }, [isLoading, maxLoadTime, handleComplete]);

  // Listen for gameReady postMessage from iframe
  useEffect(() => {
    if (!isLoading) return;

    const handler = (event: MessageEvent) => {
      if (
        event.data &&
        (event.data.type === "gameReady" ||
          event.data === "gameReady" ||
          event.data.type === "game-ready")
      ) {
        handleComplete();
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isLoading, handleComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          // DEGEN OVERHAUL — degen-black/purple loading surface with subtle mesh
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-degen-mesh"
          role="status"
          aria-label={`Loading ${gameTitle}`}
          aria-live="polite"
        >
          {/* DEGEN OVERHAUL — acorn spinner now wears a hot-pink neon halo */}
          <motion.div
            animate={{
              y: [0, -18, 0],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            className="text-6xl sm:text-7xl mb-6 select-none drop-shadow-[0_0_18px_rgba(255,46,136,0.65)] [filter:drop-shadow(0_0_36px_rgba(251,191,36,0.45))]"
            aria-hidden="true"
          >
            🌰
          </motion.div>

          {/* DEGEN OVERHAUL — title goes gradient-gold + text-hero-glow */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-2xl sm:text-3xl font-black gradient-text-gold text-hero-glow mb-2"
          >
            {gameTitle}
          </motion.h2>

          {/* Loading tip */}
          <motion.p
            key={tip}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-[var(--color-cream-dim)] mb-8"
          >
            {tip}
          </motion.p>

          {/* Progress bar */}
          <div
            className="w-48 sm:w-64 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-glass-border-strong)" }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* DEGEN OVERHAUL — accent → hot-pink degen ramp with neon glow */}
            <motion.div
              className="h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                background: `linear-gradient(90deg, ${accentColor}, var(--color-hot-pink))`,
                boxShadow: `0 0 14px ${accentColor}, 0 0 28px rgba(255, 46, 136, 0.45)`,
              }}
            />
          </div>

          {/* Percentage */}
          <p className="text-xs font-mono text-[var(--color-cream-dim)] mt-3 tabular-nums">
            {Math.round(progress)}%
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
