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
}

const LOADING_TIPS = [
  "Gathering acorns…",
  "Shaking the trees…",
  "Waking up the squirrels…",
  "Polishing the leaderboard…",
  "Loading nut physics…",
  "Calibrating tail fluffiness…",
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
}: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [tip, setTip] = useState(() =>
    LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]
  );

  const handleComplete = useCallback(() => {
    setProgress(100);
    onLoadComplete?.();
  }, [onLoadComplete]);

  // Simulated progress + auto-dismiss timeout
  useEffect(() => {
    if (!isLoading) return;

    setProgress(0);
    setTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);

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
      setTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
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
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[var(--color-forest-dark)]"
          role="status"
          aria-label={`Loading ${gameTitle}`}
          aria-live="polite"
        >
          {/* Animated acorn spinner */}
          <motion.div
            animate={{
              y: [0, -18, 0],
              rotate: [0, 15, -15, 0],
            }}
            transition={{
              y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
            className="text-6xl sm:text-7xl mb-6 select-none"
            aria-hidden="true"
          >
            🌰
          </motion.div>

          {/* Game title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-2xl sm:text-3xl font-bold gradient-text-gold mb-2"
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
            <motion.div
              className="h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                background: `linear-gradient(90deg, ${accentColor}, var(--color-neon-green))`,
                boxShadow: `0 0 12px ${accentColor}`,
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
