"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { PlayNowSidebar } from "@/components/game/PlayNowSidebar";

/* ═══════════════════════════════════════════════════════════════
   LeaderboardModal — CrazyGames-style full-screen modal

   Reuses the same <dialog> + chrome as GameModal.
   The existing /leaderboard/ route stays as a fallback for
   direct links and SEO — this modal is the in-arcade version.
   ═══════════════════════════════════════════════════════════════ */

const Leaderboard = dynamic(
  () =>
    import("@/components/sections/Leaderboard").then(
      (mod) => mod.Leaderboard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-brand-gold animate-pulse font-display text-lg">
            Loading leaderboard…
          </p>
        </div>
      </div>
    ),
  },
);

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when user clicks a game in the sidebar */
  onGameSelect?: (gamesId: string) => void;
}

export function LeaderboardModal({ isOpen, onClose, onGameSelect }: LeaderboardModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  // ── SSR guard — portal needs document.body ──
  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Open / close <dialog> ──
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // ── Lock body scroll while open ──
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // ── ESC key ──
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // <dialog> handles ESC natively via onCancel
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // SSR guard — don't render portal on the server
  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="game-modal"
      onClose={handleClose}
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      {/* DEGEN OVERHAUL START — leaderboard modal chrome */}

      {/* ── Header bar — gold accent, same chrome as game modal ── */}
      <div className="game-modal__header">
        <div className="game-modal__header-left">
          <span
            className="game-modal__genre-badge"
            style={{
              background: "rgba(251,191,36,0.12)",
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            Rankings
          </span>
          <h2
            className="game-modal__title"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Leaderboard
          </h2>
        </div>
        <div className="game-modal__header-right">
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="game-modal__close-btn"
            aria-label="Close leaderboard"
            title="Close (ESC)"
          >
            <X size={20} />
          </motion.button>
        </div>
      </div>

      {/* ── Body: content + sidebar ── */}
      <div className="game-modal__body">
        <div className="game-modal__body-scroll">
          <Leaderboard />
        </div>
        <PlayNowSidebar onGameSelect={onGameSelect} />
      </div>

      {/* DEGEN OVERHAUL END */}
    </dialog>,
    document.body,
  );
}
