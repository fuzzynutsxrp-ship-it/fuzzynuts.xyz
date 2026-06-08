"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
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
  Gamepad2,
  MessageCircle,
  Send,
  ChevronDown,
} from "lucide-react";
import { gameRegistry } from "@/lib/gameRegistry";
import type { GameMetadata } from "@/lib/gameRegistry";
import { useChatSocket } from "@/components/chat/useChatSocket";
import { trackGameStart, trackScoreSubmitted, trackDiscordClick } from "@/lib/analytics";
import { useWalletStore } from "@/store/wallet";

/* ═══════════════════════════════════════════════════════════════
   GameModal — CrazyGames-style lightbox for instant game play

   Battle-tested patterns:
   • React Portal → renders at document.body (no z-index wars)
   • <dialog> native element → ESC-to-close, focus trap, inert bg
   • iframe sandbox + allow → sandboxed game embedding
   • FUZZY_CONFIG postMessage → nav suppression inside iframe
   • LoadingOverlay reuse → branded spinner while iframe boots
   • Fullscreen API → same toggle as the full game page
   • Play Next sidebar → CrazyGames-style game switching

   This is the ONLY game shell. Just the iframe + chrome controls.
   ═══════════════════════════════════════════════════════════════ */

// ── GAMES id → gameRegistry slug bridge ──
// Most ids match 1:1, but two don't:
const ID_TO_SLUG: Record<string, string> = {
  survivors: "fuzzy-survivors",
  racer: "nut-racer",
};

// Reverse: slug → GAMES[].id  (for sidebar card clicks)
const SLUG_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ID_TO_SLUG).map(([id, slug]) => [slug, id])
);

function slugToGamesId(slug: string): string {
  return SLUG_TO_ID[slug] || slug;
}

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
  /** Called when user clicks a Play Next card — switches game in-place */
  onGameSwitch?: (gameId: string) => void;
}

// ── Component ──

export function GameModal({ gameId, onClose, onGameSwitch }: GameModalProps) {
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

  // DEGEN CHAT START — live chat via Socket.io
  const { address } = useWalletStore();
  const { messages: chatMessages, onlineUsers: chatOnlineUsers, connected: chatConnected, sendMessage: sendChatMessage } = useChatSocket(address);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  // DEGEN CHAT END

  // ── Victory detection — listen for score submissions from iframe ──
  const [lastScore, setLastScore] = useState<{ score: number; game: string } | null>(null);
  const [showVictory, setShowVictory] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "FUZZY_SCORE_SUBMITTED" && event.data.success) {
        const score = event.data.score as number | undefined;
        if (score && score > 0) {
          setLastScore({ score, game: game?.title ?? "this game" });
          setShowVictory(true);
          if (game?.slug) trackScoreSubmitted(game.slug, score);
          // Auto-hide after 30 seconds
          setTimeout(() => setShowVictory(false), 30_000);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [game?.title]);

  // ── Play Next recommendations (all live games except current) ──
  const recommendations = useMemo(() => {
    if (!game) return [];
    return gameRegistry
      .getAllLive()
      .filter((g) => g.slug !== game.slug)
      .map((g) => ({
        ...g,
        gamesId: slugToGamesId(g.slug),
      }));
  }, [game]);

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
    if (game?.slug) trackGameStart(game.slug);
  }, [game?.slug]);

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

  const handleGameSwitch = useCallback(
    (newGamesId: string) => {
      // Kill any accidental text selection from the sidebar click
      try { window.getSelection()?.removeAllRanges(); } catch { /* noop */ }
      onGameSwitch?.(newGamesId);
    },
    [onGameSwitch]
  );

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
      {/* DEGEN OVERHAUL START — game modal chrome + Play Next sidebar */}

      {/* ── Header bar ── */}
      <div className="game-modal__header">
        <div className="game-modal__header-left">
          {/* Genre badge — keyed to game slug for clean remount on switch */}
          <span
            key={`badge-${game.slug}`}
            className="game-modal__genre-badge"
            style={{
              background: `${game.color}15`,
              color: game.color,
              border: `1px solid ${game.color}25`,
            }}
          >
            {game.genre}
          </span>
          {/* Title — keyed to game slug so CSS animation replays on switch */}
          <h2
            key={game.slug}
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

      {/* ── Body: viewport + sidebar ── */}
      <div className="game-modal__body">
        {/* Game viewport */}
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

        {/* ── Play Next sidebar (CrazyGames pattern) ── */}
        <aside className="game-modal__sidebar" aria-label="More games">
          <div className="game-modal__sidebar-header">
            <Gamepad2 size={14} className="game-modal__sidebar-icon" />
            <span className="game-modal__sidebar-title">Play Next</span>
          </div>
          <div className="game-modal__sidebar-list">
            {recommendations.map((rec, i) => (
              <motion.button
                key={rec.slug}
                className="play-next-card"
                onClick={() => handleGameSwitch(rec.gamesId)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                aria-label={`Switch to ${rec.title}`}
              >
                {/* Thumbnail */}
                <div className="play-next-card__thumb">
                  <img
                    src={rec.iconPath}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                {/* Info */}
                <div className="play-next-card__info">
                  <span className="play-next-card__title">{rec.title}</span>
                  <span
                    className="play-next-card__genre"
                    style={{ color: rec.color }}
                  >
                    {rec.genre}
                  </span>
                </div>
                {/* Play button */}
                <span
                  className="play-next-card__play"
                  style={{
                    background: `linear-gradient(135deg, ${rec.color}, ${rec.color}cc)`,
                  }}
                >
                  PLAY
                </span>
              </motion.button>
            ))}
          </div>

          {/* Victory banner — shows after a score is submitted */}
          {showVictory && lastScore && (
            <div className="mx-3 mt-2 mb-1 px-3 py-3 rounded-lg bg-gradient-to-r from-brand-gold/15 to-[var(--color-hot-pink)]/15 border border-brand-gold/30">
              <p className="text-xs font-bold text-brand-gold mb-1">
                🏆 Score Submitted!
              </p>
              <p className="text-[11px] text-[var(--color-cream)]">
                {lastScore.score.toLocaleString()} on {lastScore.game}
              </p>
              <p className="text-[10px] text-[var(--color-cream-dim)] mt-1">
                Check the leaderboard to see your rank
              </p>
            </div>
          )}

          {/* Discord CTA — capture engaged players */}
          <a
            href="https://discord.gg/fuzzynuts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 mx-3 mt-2 mb-1 px-3 py-2.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 hover:bg-[#5865F2]/25 hover:border-[#5865F2]/50 transition-all group"
            aria-label="Join our Discord community"
            onClick={() => trackDiscordClick("sidebar")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#5865F2"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#5865F2] group-hover:text-white transition-colors">
                Join our Discord
              </p>
              <p className="text-[10px] text-[var(--color-cream-dim)] truncate">
                Weekly tournaments · Game tips · Community
              </p>
            </div>
          </a>

          {/* DEGEN CHAT START — collapsible live chat at bottom of sidebar */}
          <div className="sidebar-chat">
            {/* Toggle button — always visible */}
            <button
              className="sidebar-chat__toggle"
              onClick={() => setChatOpen((o) => !o)}
              aria-expanded={chatOpen}
              aria-label={chatOpen ? "Collapse live chat" : "Expand live chat"}
            >
              <MessageCircle size={13} />
              <span>Live Chat</span>
              {chatConnected && (
                <span className="sidebar-chat__count">{chatOnlineUsers.length || ""}</span>
              )}
              {!chatConnected && (
                <span className="sidebar-chat__count" style={{ opacity: 0.4 }}>...</span>
              )}
              <ChevronDown
                size={13}
                className={`sidebar-chat__chevron ${chatOpen ? "sidebar-chat__chevron--open" : ""}`}
              />
            </button>

            {/* Chat panel — collapsible */}
            <AnimatePresence initial={false}>
              {chatOpen && (
                <motion.div
                  className="sidebar-chat__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {/* Message list */}
                  <div className="sidebar-chat__messages">
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", padding: "1rem" }}>
                        {chatConnected ? "No messages yet" : "Connecting..."}
                      </div>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="sidebar-chat__msg">
                        <span
                          className="sidebar-chat__user"
                          style={{
                            color: msg.muted ? "#FBBF24" : msg.shadowed ? "#ef4444" : "#7c3aed"
                          }}
                        >
                          {msg.username}
                        </span>
                        <span className="sidebar-chat__text" style={{
                          textDecoration: (msg.shadowed || msg.muted) ? "line-through" : "none",
                          opacity: msg.shadowed ? 0.6 : 1
                        }}>
                          {msg.content}
                        </span>
                      </div>
                    ))}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    className="sidebar-chat__input-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (chatInput.trim()) {
                        sendChatMessage(chatInput);
                        setChatInput("");
                      }
                    }}
                  >
                    <input
                      className="sidebar-chat__input"
                      placeholder={chatConnected ? "Type a message…" : "Connecting..."}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      maxLength={500}
                      disabled={!chatConnected}
                    />
                    <button
                      type="submit"
                      className="sidebar-chat__send"
                      aria-label="Send message"
                      disabled={!chatInput.trim() || !chatConnected}
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* DEGEN CHAT END */}
        </aside>
      </div>
      {/* DEGEN OVERHAUL END */}
    </dialog>,
    document.body
  );
}
