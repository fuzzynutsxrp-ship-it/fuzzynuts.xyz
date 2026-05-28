"use client";

import { type RefObject, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GameViewport — Responsive iframe container for all games

   Wraps the game iframe with:
   • 16:9 aspect ratio in windowed mode, full viewport in fullscreen
   • Branded LoadingOverlay (acorn spinner + progress bar)
   • Error state with retry CTA
   • Focus management for keyboard passthrough to iframe
   • Max-width constraint (1440px) for ultra-wide monitors
   • Responsive padding on mobile
   • Touch optimization: prevents scroll/zoom during gameplay

   This component is the single rendering point for all game
   iframes, ensuring pixel-perfect consistency across all 6 games.
   ═══════════════════════════════════════════════════════════════ */

interface GameViewportProps {
  /** Game metadata from registry */
  game: GameMetadata;
  /** Ref to the iframe element (used for postMessage / fullscreen) */
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** Key for forcing iframe remount on retry */
  iframeKey: number;
  /** Whether the game is in fullscreen mode */
  isFullscreen: boolean;
  /** Whether the game is still loading */
  isLoading: boolean;
  /** Whether the iframe has errored */
  hasError: boolean;
  /** Called when iframe successfully loads */
  onLoad: () => void;
  /** Called when iframe fails to load */
  onError: () => void;
  /** Called when user clicks retry */
  onRetry: () => void;
  /** Called when loading overlay completes (animation done) */
  onLoadComplete: () => void;
  /** Ref for fullscreen container element */
  containerRef: RefObject<HTMLDivElement | null>;
}

export function GameViewport({
  game,
  iframeRef,
  iframeKey,
  isFullscreen,
  isLoading,
  hasError,
  onLoad,
  onError,
  onRetry,
  onLoadComplete,
  containerRef,
}: GameViewportProps) {
  const defaultSandbox = [
    "allow-scripts",
    "allow-same-origin",
    "allow-popups",
    "allow-forms",
  ].join(" ");

  // Send FUZZY_CONFIG to iframe after load for nav suppression
  useEffect(() => {
    if (isLoading || !iframeRef.current) return;

    const sendConfig = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "FUZZY_CONFIG", hideNav: true, parentOrigin: window.origin },
          "*",
        );
      } catch {
        /* cross-origin, noop */
      }
    };

    // Send immediately and after a delay for lazy-rendered iframes
    sendConfig();
    const timer = setTimeout(sendConfig, 1000);
    return () => clearTimeout(timer);
  }, [isLoading, iframeRef]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center bg-black overflow-hidden"
      style={{
        // Touch optimization: prevent scroll/zoom during gameplay
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...(isFullscreen ? {} : { maxWidth: "100%" }),
      }}
    >
      {/* Aspect ratio wrapper */}
      <div
        className="relative w-full h-full"
        style={{
          aspectRatio: isFullscreen ? "auto" : undefined,
          maxWidth: isFullscreen ? "100%" : "1440px",
        }}
      >
        {/* Loading overlay with game-specific tips */}
        <LoadingOverlay
          isLoading={isLoading}
          gameTitle={game.title}
          accentColor={game.color}
          onLoadComplete={onLoadComplete}
          loadingTips={game.loadingTips}
        />

        {/* Error state */}
        {/* DEGEN OVERHAUL START — error state goes degen; iframe + handlers unchanged */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-degen-mesh"
            >
              <div className="glass-card-elevated p-8 max-w-sm text-center border border-hot-pink/25 shadow-[0_0_40px_rgba(255,46,136,0.18)]">
                <div className="text-5xl mb-4 drop-shadow-[0_0_14px_rgba(255,46,136,0.55)]" aria-hidden="true">
                  💀
                </div>
                <h2 className="font-display text-xl font-black gradient-text-gold text-hero-glow mb-2">
                  Cabinet Jammed 🥜
                </h2>
                <p className="text-sm text-[var(--color-cream-dim)] mb-5">
                  {game.title} couldn&apos;t boot. Check your connection
                  and slam the coin slot again.
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    onClick={onRetry}
                    whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(255,46,136,0.5)" }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] text-[var(--color-degen-black)] transition-all"
                    id="game-iframe-retry"
                  >
                    🔄 Retry
                  </motion.button>
                  <motion.a
                    href="/#games"
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
        {/* DEGEN OVERHAUL END */}

        {/* The iframe */}
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={game.iframePath}
          title={`Play ${game.title}`}
          sandbox={game.sandbox || defaultSandbox}
          loading="eager"
          allow="autoplay; fullscreen; gamepad"
          onLoad={onLoad}
          onError={onError}
          className="w-full h-full border-0"
          style={{
            minHeight: "400px",
            background: "black",
            touchAction: "none",
          }}
          aria-label={`${game.title} game window`}
          id="game-iframe"
        />
      </div>
    </div>
  );
}
