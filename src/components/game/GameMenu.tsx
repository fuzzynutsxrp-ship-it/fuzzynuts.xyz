"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

  const actions = useMemo(
    () => [
      { label: "Resume", icon: Play, onClick: onResume, primary: true },
      { label: "Restart", icon: RotateCcw, onClick: onRestart, primary: false },
      { label: "Quit to Arcade", icon: LogOut, onClick: onQuit, primary: false },
    ],
    [onResume, onRestart, onQuit],
  );

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] bg-[var(--color-forest-900)]/90 backdrop-blur-sm"
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
              className="rounded-2xl border border-[var(--color-glass-border-strong)] overflow-hidden shadow-2xl"
              style={{
                background: "rgba(6, 10, 6, 0.95)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="text-3xl mb-2" aria-hidden="true">
                  ⏸️
                </div>
                <h2 className="font-display text-xl font-bold text-[var(--color-cream)]">
                  Paused
                </h2>
                <p
                  className="text-xs mt-1 font-medium"
                  style={{ color: game.color }}
                >
                  {game.title}
                </p>
              </div>

              {/* Score display */}
              {(currentScore != null || bestScore != null) && (
                <div className="mx-6 mb-4 flex gap-3">
                  {currentScore != null && (
                    <div className="flex-1 rounded-xl border border-[var(--color-glass-border)] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)] mb-0.5">
                        Current
                      </p>
                      <p className="font-mono text-lg font-bold text-[var(--color-cream)]">
                        {formatScore(currentScore)}
                      </p>
                    </div>
                  )}
                  {bestScore != null && (
                    <div className="flex-1 rounded-xl border border-[var(--color-glass-border)] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)] mb-0.5">
                        Best
                      </p>
                      <p className="font-mono text-lg font-bold text-[var(--color-brand-gold)]">
                        <Trophy size={14} className="inline mr-1 -mt-0.5" />
                        {formatScore(bestScore)}
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                        action.primary
                          ? "bg-[var(--color-neon-green)] text-[var(--color-forest-dark)] hover:brightness-110"
                          : "border border-[var(--color-glass-border)] text-[var(--color-cream)] hover:bg-[var(--color-glass-hover)]"
                      } ${isFocused ? "ring-2 ring-[var(--color-neon-green)]/50" : ""}`}
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
