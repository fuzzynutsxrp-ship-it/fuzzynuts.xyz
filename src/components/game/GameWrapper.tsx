"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { GameErrorBoundary } from "@/components/game/ErrorBoundary";

/** Canonical game metadata for the wrapper */
export interface GameConfig {
  slug: string;
  title: string;
  type: string;
  color: string;
  /** Path relative to public/ root for the iframe src */
  iframeSrc: string;
  /** Sandbox permissions for the iframe */
  sandbox?: string;
}

interface GameWrapperProps {
  game: GameConfig;
}

/**
 * GameWrapper — Renders a legacy game inside a sandboxed iframe with
 * fullscreen toggle, loading overlay, error boundary, and mobile-responsive
 * aspect ratio scaling.
 *
 * Features:
 * - Fullscreen API integration (with graceful fallback)
 * - Loading overlay that listens for `postMessage({ type: 'gameReady' })`
 * - Retry logic via key-based iframe remount
 * - Mobile-responsive: switches from 16:9 to 4:3 under 640px
 * - Mute toggle (sends postMessage to iframe for games that support it)
 */
export function GameWrapper({ game }: GameWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Restore mute preference from localStorage on mount
    if (typeof window !== "undefined") {
      return localStorage.getItem("fuzzynuts_muted") === "true";
    }
    return false;
  });
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track fullscreen state changes from external triggers (Esc key, etc.)
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Score Submission Listener ──
  // Listens for postMessage from fuzzy-score.js inside the game iframe.
  // Message contract: { type: 'FUZZY_SCORE_SUBMITTED', success: boolean }
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle objects with our expected message type
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type !== "FUZZY_SCORE_SUBMITTED") return;

      // Clear any existing dismiss timer
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      const status = event.data.success ? "success" : "error";
      setSubmissionStatus(status);

      // Auto-dismiss after 4 seconds
      dismissTimerRef.current = setTimeout(() => {
        setSubmissionStatus("idle");
      }, 4000);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setIframeError(false);
    setIsLoading(true);
    setIframeKey((k) => k + 1);
  }, []);

  const handleIframeLoad = useCallback(() => {
    // Give the game a moment to initialize before dismissing overlay.
    // The overlay also listens for postMessage 'gameReady' for faster dismiss.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
    setIsLoading(false);
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
      console.warn("[GameWrapper] Fullscreen not supported:", err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    // Persist preference across sessions
    try { localStorage.setItem("fuzzynuts_muted", String(next)); } catch {}
    // Send mute command to iframe (games can listen for this)
    iframeRef.current?.contentWindow?.postMessage(
      { type: "setMute", muted: next },
      "*"
    );
  }, [isMuted]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, toggleMute]);

  const defaultSandbox = [
    "allow-scripts",
    "allow-same-origin",
    "allow-popups",
    "allow-forms",
  ].join(" ");

  return (
    <GameErrorBoundary gameTitle={game.title} onRetry={handleRetry}>
      <div className="min-h-screen bg-[var(--color-forest-dark)] flex flex-col">
        {/* ── Top Bar ── */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-6 border-b"
          style={{
            background: "rgba(10, 15, 10, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: `${game.color}20`,
          }}
        >
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <motion.a
              href="/arcade/"
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.06)] transition-colors shrink-0"
              aria-label="Back to Arcade"
              id="game-back-button"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Arcade</span>
            </motion.a>

            <div className="w-px h-5 bg-[rgba(255,255,255,0.1)] hidden sm:block" />

            {/* Genre badge */}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block"
              style={{
                background: `${game.color}15`,
                color: game.color,
                border: `1px solid ${game.color}25`,
              }}
            >
              {game.type}
            </span>

            {/* Title */}
            <h1
              className="font-display text-base sm:text-lg font-bold truncate"
              style={{ color: game.color }}
            >
              {game.title}
            </h1>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mute toggle */}
            <motion.button
              onClick={toggleMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              aria-label={isMuted ? "Unmute game audio" : "Mute game audio"}
              title={isMuted ? "Unmute Game Audio (M)" : "Mute Game Audio (M)"}
              id="game-mute-toggle"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </motion.button>

            {/* Reload */}
            <motion.button
              onClick={handleRetry}
              whileHover={{ scale: 1.1, rotate: -180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              aria-label="Reload game"
              title="Reload Game"
              id="game-reload-button"
            >
              <RotateCcw size={18} />
            </motion.button>

            {/* Fullscreen — hidden on mobile (most browsers block programmatic fullscreen) */}
            <motion.button
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit Fullscreen (F)" : "Toggle Fullscreen (F)"}
              id="game-fullscreen-toggle"
            >
              {isFullscreen ? (
                <Minimize size={18} />
              ) : (
                <Maximize size={18} />
              )}
            </motion.button>
          </div>
        </header>

        {/* ── Score Submission Toast ── */}
        <AnimatePresence>
          {submissionStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-[60px] left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
            >
              <div
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl backdrop-blur-xl border shadow-lg ${
                  submissionStatus === "success"
                    ? "bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.4)] text-emerald-400"
                    : "bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-red-400"
                }`}
              >
                {submissionStatus === "success" ? (
                  <CheckCircle size={18} className="shrink-0" />
                ) : (
                  <XCircle size={18} className="shrink-0" />
                )}
                <span className="text-sm font-semibold whitespace-nowrap">
                  {submissionStatus === "success"
                    ? "Score Saved to Leaderboard! 🏆"
                    : "Submission Failed — Try Again!"}
                </span>
                <button
                  onClick={() => setSubmissionStatus("idle")}
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-xs"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Game Container ── */}
        <div
          ref={containerRef}
          className="relative flex-1 flex items-center justify-center bg-black overflow-hidden"
          style={{
            /* Fullscreen: fill everything. Normal: constrained aspect ratio */
            ...(isFullscreen
              ? {}
              : {
                  maxHeight: "calc(100vh - 56px)",
                }),
          }}
        >
          {/* Aspect ratio wrapper — 16:9 desktop, 4:3 mobile */}
          <div
            className="relative w-full h-full"
            style={{
              aspectRatio: isFullscreen ? "auto" : undefined,
              maxWidth: isFullscreen ? "100%" : "1440px",
            }}
          >
            {/* Loading overlay */}
            <LoadingOverlay
              isLoading={isLoading}
              gameTitle={game.title}
              accentColor={game.color}
              onLoadComplete={handleLoadComplete}
            />

            {/* Error state */}
            <AnimatePresence>
              {iframeError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-forest-dark)]"
                >
                  <div className="glass-card-elevated p-8 max-w-sm text-center">
                    <div className="text-5xl mb-4" aria-hidden="true">
                      ⚠️
                    </div>
                    <h2 className="font-display text-xl font-bold text-[var(--color-cream)] mb-2">
                      Failed to Load
                    </h2>
                    <p className="text-sm text-[var(--color-cream-dim)] mb-5">
                      {game.title} couldn&apos;t be loaded. Check your
                      connection and try again.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <motion.button
                        onClick={handleRetry}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn-primary px-5 py-2 text-sm"
                        id="game-iframe-retry"
                      >
                        🔄 Retry
                      </motion.button>
                      <motion.a
                        href="/arcade/"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn-secondary px-5 py-2 text-sm"
                        id="game-iframe-back"
                      >
                        ← Arcade
                      </motion.a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The iframe */}
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={game.iframeSrc}
              title={`Play ${game.title}`}
              sandbox={game.sandbox || defaultSandbox}
              loading="lazy"
              allow="autoplay; fullscreen; gamepad"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-0"
              style={{
                minHeight: "400px",
                background: "black",
              }}
              aria-label={`${game.title} game window`}
              id="game-iframe"
            />
          </div>
        </div>
      </div>
    </GameErrorBoundary>
  );
}
