"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Gamepad2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   GameControls — Floating controls overlay

   Shows the control scheme for the current game in a glassmorphic
   dialog. Toggled by pressing `?` key or clicking the controls
   button in GameHeader.

   Features:
   • Auto-show on first visit per game (localStorage gate)
   • Auto-dismiss after `autoDismissMs` (default: 8000ms)
   • ESC or X button closes
   • Backdrop click closes
   • Fully responsive: centered overlay
   ═══════════════════════════════════════════════════════════════ */

interface GameControlsProps {
  /** Control hints from gameRegistry.controls */
  controls: string[];
  /** Game display title */
  gameTitle: string;
  /** Game accent color (hex) */
  accentColor?: string;
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Auto-dismiss duration (ms). Set 0 to disable. */
  autoDismissMs?: number;
}

export function GameControls({
  controls,
  gameTitle,
  accentColor = "var(--color-brand-gold)",
  isOpen,
  onClose,
  autoDismissMs = 8000,
}: GameControlsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss timer
  useEffect(() => {
    if (!isOpen || autoDismissMs <= 0) return;

    timerRef.current = setTimeout(onClose, autoDismissMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, autoDismissMs, onClose]);

  // ESC key closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, handleKeyDown]);

  // Focus trap: focus panel on open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* DEGEN OVERHAUL — degen-black/purple backdrop matches GameMenu */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-degen-950/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label={`${gameTitle} controls`}
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md outline-none"
          >
            {/* DEGEN OVERHAUL — degen-card surface w/ hot-pink ring (parity with GameMenu) */}
            <div
              className="rounded-2xl border border-hot-pink/25 overflow-hidden shadow-[0_0_40px_rgba(255,46,136,0.18),0_20px_60px_rgba(0,0,0,0.6)]"
              style={{
                background: "rgba(10, 6, 19, 0.95)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-glass"
                style={{ background: `${accentColor}08` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `${accentColor}15`,
                      border: `1px solid ${accentColor}30`,
                    }}
                  >
                    <Gamepad2 size={16} style={{ color: accentColor }} />
                  </div>
                  {/* DEGEN OVERHAUL — degen title, per-game accent kept on subtitle */}
                  <div>
                    <h3 className="font-display text-sm font-black gradient-text-gold text-hero-glow">
                      🥜 Controls
                    </h3>
                    <p
                      className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-90"
                      style={{ color: accentColor }}
                    >
                      {gameTitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[var(--color-glass-hover)] transition-colors"
                  aria-label="Close controls"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Controls List */}
              <div className="px-5 py-4 space-y-2">
                {/* DEGEN OVERHAUL — numbered chip gets a hot-pink edge */}
                {controls.map((ctrl, i) => (
                  <div
                    key={ctrl}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,46,136,0.06)] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black font-mono bg-[rgba(255,46,136,0.08)] text-[var(--color-hot-pink)] border border-hot-pink/25">
                      {i + 1}
                    </div>
                    <span className="text-sm text-[var(--color-cream)] leading-snug">
                      {ctrl}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-glass-faint flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-cream-dim)] opacity-50">
                  <Keyboard size={10} />
                  <span>Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-glass-border-faint)] font-mono text-[9px]">?</kbd> to toggle</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-cream-dim)] opacity-50">
                  <span>Auto-closes in {Math.round(autoDismissMs / 1000)}s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Hook: First-visit detection ── */

/**
 * Returns whether this is the user's first visit to a game page.
 * Sets a localStorage flag on first call.
 */
export function useFirstVisit(gameSlug: string): boolean {
  if (typeof window === "undefined") return false;

  const key = `fuzzynuts_seen_controls_${gameSlug}`;
  try {
    const seen = localStorage.getItem(key);
    if (!seen) {
      localStorage.setItem(key, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
