"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  RotateCcw,
  Volume2,
  VolumeX,
  Wallet,
  ChevronDown,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { getCurrentWeekKey, getWeekKeyOffset } from "@/features/arcade";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GameHeader — Top navigation bar for game pages

   Features:
   • Back to Arcade link
   • Game title + genre badge
   • Week selector (current / previous)
   • Wallet connection indicator
   • Fullscreen / Mute / Reload controls
   • Your best score + rank (quick stat)
   ═══════════════════════════════════════════════════════════════ */

interface GameHeaderProps {
  game: GameMetadata;
  isFullscreen: boolean;
  isMuted: boolean;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onReload: () => void;
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  bestScore: number | null;
  rank: number | null;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function GameHeader({
  game,
  isFullscreen,
  isMuted,
  onToggleFullscreen,
  onToggleMute,
  onReload,
  selectedWeek,
  onWeekChange,
  bestScore,
  rank,
}: GameHeaderProps) {
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    error: walletError,
    setError: setWalletError,
  } = useWalletStore();
  const [weekOpen, setWeekOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  // Open the dropdown automatically when an error fires so the user sees it
  useEffect(() => {
    if (walletError && !isConnected) setWalletOpen(true);
  }, [walletError, isConnected]);

  // Auto-dismiss wallet errors after 8s (matches Navbar behavior)
  useEffect(() => {
    if (!walletError) return;
    const t = setTimeout(() => setWalletError(null), 8_000);
    return () => clearTimeout(t);
  }, [walletError, setWalletError]);

  const currentWeek = getCurrentWeekKey();
  const lastWeek = getWeekKeyOffset(1);

  const weekLabel =
    selectedWeek === currentWeek
      ? "This Week"
      : selectedWeek === lastWeek
        ? "Last Week"
        : selectedWeek;

  const handleConnect = useCallback(
    (provider: "xaman" | "joey") => {
      setWalletOpen(false);
      setWalletError(null); // clear any prior error
      void connect(provider);
    },
    [connect, setWalletError],
  );

  // Close week dropdown on outside click
  useEffect(() => {
    if (!weekOpen) return;
    const close = () => setWeekOpen(false);
    document.addEventListener("click", close, { once: true });
    return () => document.removeEventListener("click", close);
  }, [weekOpen]);

  // Close wallet dropdown on outside click
  useEffect(() => {
    if (!walletOpen) return;
    const close = () => setWalletOpen(false);
    document.addEventListener("click", close, { once: true });
    return () => document.removeEventListener("click", close);
  }, [walletOpen]);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-3 py-2 sm:px-5 sm:py-3 border-b"
      style={{
        background: "rgba(10, 15, 10, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderColor: `${game.color}20`,
        height: "64px",
      }}
      id="game-header"
    >
      {/* ── Left: Back + Badge + Title ── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <motion.a
          href="/#games"
          whileHover={{ scale: 1.06, x: -2 }}
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass transition-colors shrink-0"
          aria-label="Back to Arcade"
          id="game-back-button"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Arcade</span>
        </motion.a>

        <div className="w-px h-5 bg-glass-strong hidden sm:block" />

        {/* Genre badge */}
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block shrink-0"
          style={{
            background: `${game.color}15`,
            color: game.color,
            border: `1px solid ${game.color}25`,
          }}
        >
          {game.genre}
        </span>

        {/* Title */}
        <h1
          className="font-display text-sm sm:text-lg font-bold truncate"
          style={{
            background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {game.title}
        </h1>
      </div>

      {/* ── Center: Quick stats (desktop only) ── */}
      <div className="hidden lg:flex items-center gap-4">
        {bestScore !== null && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-cream-dim)]">
            <Trophy size={13} className="text-[var(--color-brand-gold)]" />
            <span className="font-mono font-semibold text-[var(--color-cream)]">
              {bestScore.toLocaleString()}
            </span>
          </div>
        )}
        {rank !== null && rank <= 50 && (
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background:
                rank <= 3
                  ? "rgba(251, 191, 36, 0.15)"
                  : "var(--color-glass-border-faint)",
              color:
                rank <= 3
                  ? "var(--color-brand-gold)"
                  : "var(--color-cream-dim)",
              border:
                rank <= 3
                  ? "1px solid rgba(251, 191, 36, 0.3)"
                  : "1px solid var(--color-glass-border-strong)",
            }}
          >
            Rank #{rank}
          </div>
        )}
      </div>

      {/* ── Right: Week selector + Wallet + Controls ── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Week selector */}
        <div className="relative hidden sm:block">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setWeekOpen((p) => !p);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass transition-colors"
            id="game-week-selector"
          >
            <span className="font-mono">{weekLabel}</span>
            <ChevronDown size={12} />
          </button>
          {weekOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-glass-strong bg-forest-900/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden"
            >
              {[
                { key: currentWeek, label: "This Week" },
                { key: lastWeek, label: "Last Week" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    onWeekChange(opt.key);
                    setWeekOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    selectedWeek === opt.key
                      ? "text-[var(--color-neon-green)] bg-[var(--color-neon-green-dim)]"
                      : "text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass"
                  }`}
                >
                  <span className="font-mono">{opt.label}</span>
                  <span className="block text-[10px] opacity-60 mt-0.5">
                    {opt.key}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Wallet indicator */}
        {isConnected && address ? (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              color: "var(--color-neon-green)",
            }}
          >
            <Wallet size={12} />
            <span className="font-mono">{truncateAddress(address)}</span>
          </div>
        ) : (
          <div className="relative hidden sm:block">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setWalletOpen((p) => !p);
              }}
              disabled={isConnecting}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              style={{
                background: "rgba(251, 191, 36, 0.12)",
                border: "1px solid rgba(251, 191, 36, 0.25)",
                color: "var(--color-brand-gold)",
              }}
              id="game-connect-wallet"
              aria-haspopup="listbox"
              aria-expanded={walletOpen}
            >
              <Wallet size={12} />
              {isConnecting ? "Connecting…" : "Connect"}
              <ChevronDown
                size={12}
                className={`transition-transform ${walletOpen ? "rotate-180" : ""}`}
              />
            </motion.button>
            {walletOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-glass-strong bg-forest-900/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden"
                role="listbox"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-[10px] uppercase tracking-widest text-cream-dim px-3 pt-2 pb-1 font-semibold">
                  Choose wallet
                </p>

                {walletError && (
                  <div className="mx-2 mb-2 flex items-start gap-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20">
                    <AlertCircle
                      size={12}
                      className="text-red-400 mt-0.5 shrink-0"
                    />
                    <p className="text-[11px] text-red-400 leading-snug">
                      {walletError}
                    </p>
                  </div>
                )}

                {[
                  {
                    id: "xaman" as const,
                    name: "Xaman (Xumm)",
                    icon: "📱",
                    desc: "Mobile / Desktop",
                  },
                  {
                    id: "joey" as const,
                    name: "Joey Wallet",
                    icon: "🐭",
                    desc: "Mobile · WalletConnect",
                  },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleConnect(w.id)}
                    disabled={isConnecting}
                    role="option"
                    aria-selected={false}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-[var(--color-cream)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.08)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <span className="text-base w-6 text-center">{w.icon}</span>
                    <span className="flex-1">
                      <span className="block font-semibold">{w.name}</span>
                      <span className="block text-[10px] text-[var(--color-cream-dim)]">
                        {w.desc}
                      </span>
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        <div className="w-px h-4 bg-glass hidden sm:block" />

        {/* Mute */}
        <motion.button
          onClick={onToggleMute}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
          title={isMuted ? "Unmute (M)" : "Mute (M)"}
          id="game-mute-toggle"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </motion.button>

        {/* Reload */}
        <motion.button
          onClick={onReload}
          whileHover={{ scale: 1.1, rotate: -180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass transition-colors"
          aria-label="Reload game"
          title="Reload"
          id="game-reload-button"
        >
          <RotateCcw size={18} />
        </motion.button>

        {/* Fullscreen (desktop) */}
        <motion.button
          onClick={onToggleFullscreen}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-glass transition-colors"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          id="game-fullscreen-toggle"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </motion.button>
      </div>
    </header>
  );
}
