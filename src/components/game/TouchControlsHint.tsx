"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand } from "lucide-react";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   TouchControlsHint — Mobile touch hint overlay

   Shows a brief animated hint for touch-friendly games:
   • Only appears on touch devices
   • Only for games with a touchHint defined
   • Auto-dismisses after 8s or first user interaction
   • Remembers dismissal per game in localStorage
   ═══════════════════════════════════════════════════════════════ */

interface TouchControlsHintProps {
  /** Game metadata */
  game: GameMetadata;
  /** Whether the hint is visible */
  isVisible: boolean;
  /** Dismiss callback */
  onDismiss: () => void;
}

const TOUCH_GAMES = new Set(["minigolf", "nut-racer", "fuzzynuts-world", "fuzzy-survivors", "top-secret"]);

export function TouchControlsHint({
  game,
  isVisible,
  onDismiss,
}: TouchControlsHintProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!isVisible) return;
    timerRef.current = setTimeout(onDismiss, 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, onDismiss]);

  // Dismiss on any touch
  useEffect(() => {
    if (!isVisible) return;
    const handler = () => onDismiss();
    window.addEventListener("touchstart", handler, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", handler);
  }, [isVisible, onDismiss]);

  const hint = game.touchHint;
  if (!hint || !TOUCH_GAMES.has(game.slug)) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[55] max-w-xs w-[calc(100%-2rem)]"
        >
          <div
            className="rounded-xl border border-[var(--color-glass-border-strong)] px-4 py-3 flex items-center gap-3 shadow-xl"
            style={{
              background: "rgba(6, 10, 6, 0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            {/* Animated hand */}
            <motion.div
              animate={{
                x: [0, 8, 0, -8, 0],
                y: [0, -4, 0, -4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="shrink-0"
            >
              <Hand size={20} style={{ color: game.color }} />
            </motion.div>

            <p className="text-xs text-[var(--color-cream)] leading-snug">
              {hint}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Hook: Touch hint visibility ── */

export function useTouchHint(gameSlug: string): {
  showHint: boolean;
  dismissHint: () => void;
} {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // Only show on touch devices
    if (typeof window === "undefined") return;
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    // Check localStorage
    const key = `fuzzy_hint_dismissed_${gameSlug}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* noop */
    }

    // Show after a brief delay
    const timer = setTimeout(() => setShowHint(true), 2000);
    return () => clearTimeout(timer);
  }, [gameSlug]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    const key = `fuzzy_hint_dismissed_${gameSlug}`;
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* noop */
    }
  }, [gameSlug]);

  return { showHint, dismissHint };
}
