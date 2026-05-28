"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Trophy,
  Keyboard,
} from "lucide-react";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GameMenu — Pause/Settings overlay

   Triggered by ESC key during gameplay. Provides:
   • Resume / Restart / Quit actions
   • Current & best score display
   • Collapsible controls reference
   • Keyboard navigation (arrows + enter)
   • Focus trap + auto-focus on open

   Desktop: centered modal (max-w-md)
   Mobile: full-height bottom sheet
   ═══════════════════════════════════════════════════════════════ */

interface GameMenuProps {
  /** Game metadata from registry */
  game: GameMetadata;
  /** Whether the menu is open */
  isOpen: boolean;
  /** Current score from the active session (if available) */
  currentScore?: number;
  /** User's all-time best score */
  bestScore?: number | null;
  /** Resume gameplay */
  onResume: () => void;
  /** Restart the game (remount iframe) */
  onRestart: () => void;
  /** Quit to arcade homepage */
  onQuit: () => void;
  /** Control hints from gameRegistry */
  controls: string[];
}

export function GameMenu({
  game,
  isOpen,
  currentScore,
  bestScore,
  onResume,
  onRestart,
  onQuit,
  controls,
}: GameMenuProps) {
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [focusedAction, setFocusedAction] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const actions = [
    { label: "Resume", icon: Play, onClick: onResume, primary: true },
    { label: "Restart", icon: RotateCcw, onClick: onRestart, primary: false },
    { label: "Quit to Arcade", icon: LogOut, onClick: onQuit, primary: false },
  ];

  // Focus trap + keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onResume();
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedAction((p) => (p - 1 + actions.length) % actions.length);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedAction((p) => (p + 1) % actions.length);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          actions[focusedAction].onClick();
          break;
      }
    },
    [isOpen, focusedAction, actions, onResume],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, handleKeyDown]);

  // Auto-focus and reset on open
  useEffect(() => {
    if (isOpen) {
      setFocusedAction(0);
      setControlsExpanded(false);
      menuRef.current?.focus();
    }
  }, [isOpen]);

  function formatScore(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* DEGEN OVERHAUL — degen-black/purple pause backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] bg-degen-950/90 backdrop-blur-sm"
            onClick={onResume}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={menuRef}
            role="dialog"
            aria-label={`${game.title} — Paused`}
            aria-modal="true"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed z-[71] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 sm:w-full sm:max-w-md outline-none"
          >
            <div
              // DEGEN OVERHAUL — degen-card surface w/ hot-pink ring
              className="rounded-2xl border border-hot-pink/25 overflow-hidden shadow-[0_0_40px_rgba(255,46,136,0.18),0_20px_60px_rgba(0,0,0,0.6)]"
              style={{
                background: "rgba(10, 6, 19, 0.95)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* DEGEN OVERHAUL START — acorn-on-pause with neon halo
                  (mirrors LoadingOverlay), title goes gradient gold + glow.
                  "Paused" text kept verbatim for a11y + the existing
                  aria-label on the dialog. */}
              <div className="px-6 pt-6 pb-4 text-center">
                <div
                  className="text-3xl mb-2 select-none drop-shadow-[0_0_16px_rgba(255,46,136,0.55)] [filter:drop-shadow(0_0_30px_rgba(251,191,36,0.4))]"
                  aria-hidden="true"
                >
                  🌰
                </div>
                <h2 className="font-display text-xl font-black gradient-text-gold text-hero-glow">
                  Paused
                </h2>
                <p
                  className="text-xs mt-1 font-mono uppercase tracking-[0.18em]"
                  style={{ color: game.color }}
                >
                  {game.title}
                </p>
              </div>
              {/* DEGEN OVERHAUL END */}

              {/* DEGEN OVERHAUL START — score cards: hot-pink edge on Current,
                  gold neon-ring on Best, gradient on the Best number */}
              {(currentScore != null || bestScore != null) && (
                <div className="mx-6 mb-4 flex gap-3">
                  {currentScore != null && (
                    <div className="flex-1 rounded-xl border border-hot-pink/25 bg-[rgba(255,46,136,0.04)] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-hot-pink)] font-bold mb-0.5">
                        🥜 Current
                      </p>
                      <p className="font-mono text-lg font-black text-[var(--color-cream)] tabular-nums">
                        {formatScore(currentScore)}
                      </p>
                    </div>
                  )}
                  {bestScore != null && (
                    <div className="flex-1 rounded-xl bg-[rgba(251,191,36,0.05)] p-3 text-center neon-ring-pink">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-brand-gold)] font-bold mb-0.5">
                        🏆 Best
                      </p>
                      <p className="font-mono text-lg font-black gradient-text-gold tabular-nums">
                        <Trophy size={14} className="inline mr-1 -mt-0.5 text-[var(--color-brand-gold)]" />
                        {formatScore(bestScore)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* DEGEN OVERHAUL END */}

              {/* Action buttons */}
              <div className="px-6 space-y-2">
                {actions.map((action, i) => {
                  const Icon = action.icon;
                  const isFocused = focusedAction === i;
                  return (
                    <motion.button
                      key={action.label}
                      onClick={action.onClick}
                      onMouseEnter={() => setFocusedAction(i)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      // DEGEN OVERHAUL START — primary action goes gold→hot-pink, hot-pink focus ring
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all outline-none ${
                        action.primary
                          ? "bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] text-[var(--color-degen-black)] font-black hover:shadow-[0_0_22px_rgba(255,46,136,0.5)]"
                          : "border border-[var(--color-glass-border)] text-[var(--color-cream)] hover:bg-[var(--color-glass-hover)]"
                      } ${isFocused ? "ring-2 ring-[var(--color-hot-pink)]/60" : ""}`}
                      // DEGEN OVERHAUL END
                      id={`game-menu-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Icon size={16} />
                      {action.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Controls reference (collapsible) */}
              <div className="mx-6 mt-4 mb-6">
                <button
                  onClick={() => setControlsExpanded((p) => !p)}
                  className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Gamepad2 size={10} />
                    Controls
                  </span>
                  {controlsExpanded ? (
                    <ChevronUp size={10} />
                  ) : (
                    <ChevronDown size={10} />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {controlsExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <ul className="space-y-1.5 pt-2">
                        {controls.map((ctrl) => (
                          <li
                            key={ctrl}
                            className="flex items-center gap-2 text-xs text-[var(--color-cream-dim)]"
                          >
                            <Keyboard size={10} className="opacity-40 shrink-0" />
                            {ctrl}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer hint */}
              <div className="px-6 py-3 border-t border-[var(--color-glass-border-faint)] text-center">
                <p className="text-[10px] text-[var(--color-cream-dim)] opacity-50">
                  Press{" "}
                  <kbd className="px-1 py-0.5 rounded bg-[var(--color-glass-border-faint)] font-mono text-[9px]">
                    ESC
                  </kbd>{" "}
                  to resume ·{" "}
                  <kbd className="px-1 py-0.5 rounded bg-[var(--color-glass-border-faint)] font-mono text-[9px]">
                    ↑↓
                  </kbd>{" "}
                  to navigate ·{" "}
                  <kbd className="px-1 py-0.5 rounded bg-[var(--color-glass-border-faint)] font-mono text-[9px]">
                    Enter
                  </kbd>{" "}
                  to select
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
