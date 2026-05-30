"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Maximize,
  Minimize,
  RotateCcw,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { gameRegistry } from "@/lib/gameRegistry";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GameModal — CrazyGames-style lightbox for instant game play

   Battle-tested patterns:
   • React Portal → renders at document.body (no z-index wars)
   • <dialog> native element → ESC-to-close, focus trap, inert bg
   • iframe sandbox + allow → sandboxed game embedding
   • FUZZY_CONFIG postMessage → nav suppression inside iframe
   • LoadingOverlay reuse → branded spinner while iframe boots
   • Fullscreen API → same toggle as the full game page

   This is the ONLY game shell. Just the iframe + chrome controls.
   ═══════════════════════════════════════════════════════════════ */

// ── GAMES id → gameRegistry slug bridge ──
// Most ids match 1:1, but two don't:
const ID_TO_SLUG: Record<string, string> = {
  survivors: "fuzzy-survivors",
  racer: "nut-racer",
};

function resolveGameMetadata(gamesId: string): GameMetadata | undefined {
  const slug = ID_TO_SLUG[gamesId] || gamesId;
  return gameRegistry.getBySlug(slug);
}

// ── Props ──

interface GameModalProps {
  /** GAMES[].id — resolved to gameRegistry slug internally */
  gameId: string | null;
  /** Called when user closes the modal */
  onClose: () => void;
}

// ── Component ──

export function GameModal({ gameId, onClose }: GameModalProps) {
  const isOpen = gameId !== null;
  const game = gameId ? resolveGameMetadata(gameId) : undefined;

  // ── Refs ──
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── State ──
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fuzzynuts_muted") === "true";
    }
    return false;
  });

  // ── Open / close <dialog> ──
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && game && !dialog.open) {
      dialog.showModal();
      setIsLoading(true);
      setIframeKey(0);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, game]);

  // ── Reset state when gameId changes ──
  useEffect(() => {
    if (gameId) {
      setIsLoading(true);
      setIframeKey((k) => k + 1);
    }
  }, [gameId]);

  // ── Lock body scroll while open ──
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // ── Fullscreen tracking ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── FUZZY_CONFIG postMessage after iframe load ──
  useEffect(() => {
    if (isLoading || !iframeRef.current) return;

    const sendConfig = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "FUZZY_CONFIG", hideNav: true, parentOrigin: window.origin },
          "*"
        );
      } catch {
        /* cross-origin, noop */
      }
    };

    sendConfig();
    const timer = setTimeout(sendConfig, 1000);
    return () => clearTimeout(timer);
  }, [isLoading, iframeKey]);

  // ── ESC key + keyboard shortcuts ──
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // <dialog> handles ESC natively via onCancel — we handle others
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case "m":
        case "M":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleMute();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // ── Handlers ──
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setIframeKey((k) => k + 1);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("[GameModal] Fullscreen not supported:", err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem("fuzzynuts_muted", String(next));
    } catch {
      /* noop */
    }
    iframeRef.current?.contentWindow?.postMessage(
      { type: "setMute", muted: next },
      "*"
    );
  }, [isMuted]);

  // Don't render anything if no game
  if (!game) return null;

  const defaultSandbox =
    "allow-scripts allow-same-origin allow-popups allow-forms";

  return createPortal(
    <dialog
      ref={dialogRef}
      className="game-modal"
      onClose={handleClose}
      onCancel={(e) => {
        // Native ESC triggers this — close cleanly
        e.preventDefault();
        handleClose();
      }}
      // Click on backdrop (the ::backdrop pseudo) closes
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          handleClose();
        }
      }}
    >
      {/* DEGEN OVERHAUL START — game modal chrome */}

      {/* ── Header bar ── */}
      <div className="game-modal__header">
        <div className="game-modal__header-left">
          {/* Genre badge */}
          <span
            className="game-modal__genre-badge"
            style={{
              background: `${game.color}15`,
              color: game.color,
              border: `1px solid ${game.color}25`,
            }}
          >
            {game.genre}
          </span>
          {/* Title */}
          <h2
            className="game-modal__title"
            style={{
              background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {game.title}
          </h2>
        </div>

        <div className="game-modal__header-right">
          {/* Mute */}
          <motion.button
            onClick={toggleMute}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="game-modal__control-btn"
            aria-label={isMuted ? "Unmute" : "Mute"}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>

          {/* Reload */}
          <motion.button
            onClick={handleRetry}
            whileHover={{ scale: 1.1, rotate: -180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="game-modal__control-btn"
            aria-label="Reload game"
            title="Reload"
          >
            <RotateCcw size={16} />
          </motion.button>

          {/* Fullscreen */}
          <motion.button
            onClick={toggleFullscreen}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="game-modal__control-btn hidden sm:flex"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </motion.button>

          {/* Close */}
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="game-modal__close-btn"
            aria-label="Close game"
            title="Close (ESC)"
          >
            <X size={20} />
          </motion.button>
        </div>
      </div>

      {/* ── Game viewport ── */}
      <div
        ref={containerRef}
        className="game-modal__viewport"
        style={{
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* Loading state */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="game-modal__loading"
              role="status"
              aria-label={`Loading ${game.title}`}
            >
              <motion.div
                animate={{
                  y: [0, -14, 0],
                  rotate: [0, 12, -12, 0],
                }}
                transition={{
                  y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }}
                className="text-5xl sm:text-6xl mb-4 select-none drop-shadow-[0_0_18px_rgba(255,46,136,0.65)]"
                aria-hidden="true"
              >
                🌰
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-xl sm:text-2xl font-black gradient-text-gold text-hero-glow mb-2"
              >
                {game.title}
              </motion.h2>
              <div className="flex items-center gap-2 text-sm text-[var(--color-cream-dim)]">
                <Loader2 size={16} className="animate-spin" />
                <span>Booting cabinet…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The iframe */}
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={game.iframePath}
          title={`Play ${game.title}`}
          sandbox={game.sandbox || defaultSandbox}
          loading="eager"
          allow="autoplay; fullscreen; gamepad"
          onLoad={handleIframeLoad}
          className="game-modal__iframe"
          aria-label={`${game.title} game window`}
        />
      </div>
      {/* DEGEN OVERHAUL END */}
    </dialog>,
    document.body
  );
}
