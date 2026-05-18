"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { GameHeader } from "@/components/game/GameHeader";
import { GameSidebar } from "@/components/game/GameSidebar";
import { ScoreSubmissionPanel } from "@/components/game/ScoreSubmissionPanel";
import { LoadingOverlay } from "@/components/game/LoadingOverlay";
import { GameErrorBoundary } from "@/components/game/ErrorBoundary";
import {
  useLeaderboard,
  useScoreSubmission,
  usePayoutEligibility,
  useSyncLocalScores,
  getCurrentWeekKey,
} from "@/features/arcade";
import { useWalletStore } from "@/store/wallet";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GamePage — Unified game page template

   Layout:
   ┌──────────────────────────────────────────────────────┐
   │ GameHeader (sticky, 64px)                             │
   ├────────────────────────────────┬──────────────────────┤
   │                                │                      │
   │   Game iframe (flex-1)         │  GameSidebar (280px) │
   │                                │                      │
   ├────────────────────────────────┴──────────────────────┤
   │ ScoreSubmissionPanel (bottom bar)                     │
   └──────────────────────────────────────────────────────┘

   Responsive:
   • Desktop (≥1024px): Full layout with sidebar
   • Tablet: Sidebar is a toggle drawer
   • Mobile: Sidebar is an overlay sheet
   ═══════════════════════════════════════════════════════════════ */

interface GamePageProps {
  game: GameMetadata;
}

/** Score history entry stored in component state */
interface ScoreHistoryEntry {
  score: number;
  timestamp: number;
  status: "success" | "error" | "pending";
  errorMessage?: string;
}

export function GamePage({ game }: GamePageProps) {
  // ── State ──
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fuzzynuts_muted") === "true";
    }
    return false;
  });
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekKey);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { address } = useWalletStore();

  // ── Hooks ──
  const {
    status: submissionStatus,
    errorMessage,
    markGameStart,
    dismiss,
  } = useScoreSubmission(game.slug);

  const {
    scores,
    refetch: refetchLeaderboard,
  } = useLeaderboard(game.slug, selectedWeek);

  const { eligibility } = usePayoutEligibility(address ?? null);

  // Auto-sync localStorage scores to backend when wallet connects
  useSyncLocalScores(game.slug, address ?? null);

  // ── Derived state ──
  const userBestScore = useMemo(() => {
    if (!address) return null;
    const entry = scores.find((s) => s.wallet === address);
    return entry?.score ?? null;
  }, [scores, address]);

  const userRank = useMemo(() => {
    if (!address) return null;
    const idx = scores.findIndex((s) => s.wallet === address);
    return idx >= 0 ? idx + 1 : null;
  }, [scores, address]);

  const lastSubmission = scoreHistory.length > 0 ? scoreHistory[0] : null;

  // ── Track submissions in history ──
  useEffect(() => {
    if (submissionStatus === "success" || submissionStatus === "error") {
      // Listen for the submission result from postMessage
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "FUZZY_SCORE_SUBMITTED") {
          const entry: ScoreHistoryEntry = {
            score: e.data.score ?? 0,
            timestamp: Date.now(),
            status: e.data.success ? "success" : "error",
            errorMessage: e.data.success ? undefined : "Submission failed",
          };
          setScoreHistory((prev) => [entry, ...prev.slice(0, 9)]);
          // Refresh leaderboard after successful submission
          if (e.data.success) {
            setTimeout(() => refetchLeaderboard(false), 2000);
          }
        }
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    }
  }, [submissionStatus, refetchLeaderboard]);

  // ── Fullscreen tracking ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Handlers ──
  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setIframeError(false);
    setIsLoading(true);
    setIframeKey((k) => k + 1);
    markGameStart();
  }, [markGameStart]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    markGameStart();
  }, [markGameStart]);

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
      console.warn("[GamePage] Fullscreen not supported:", err);
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

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((p) => !p);
  }, []);

  const handleWeekChange = useCallback((week: string) => {
    setSelectedWeek(week);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "Escape":
          // ESC → back to arcade
          window.location.href = "/#games";
          break;
        case "F1":
          e.preventDefault();
          toggleSidebar();
          break;
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
  }, [toggleFullscreen, toggleMute, toggleSidebar]);

  // ── Toast config ──
  const toastConfig = useMemo(() => {
    switch (submissionStatus) {
      case "submitting":
        return {
          icon: <Loader2 size={18} className="shrink-0 animate-spin" />,
          text: "Saving score...",
          style:
            "bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.4)] text-blue-400",
        };
      case "success":
        return {
          icon: <CheckCircle size={18} className="shrink-0" />,
          text: "Score Saved to Leaderboard! 🏆",
          style:
            "bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.4)] text-emerald-400",
        };
      case "error":
        return {
          icon:
            errorMessage?.includes("Rate") ||
            errorMessage?.includes("fast") ? (
              <AlertTriangle size={18} className="shrink-0" />
            ) : (
              <XCircle size={18} className="shrink-0" />
            ),
          text: errorMessage || "Submission Failed — Try Again!",
          style:
            "bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-red-400",
        };
      default:
        return null;
    }
  }, [submissionStatus, errorMessage]);

  const defaultSandbox = [
    "allow-scripts",
    "allow-same-origin",
    "allow-popups",
    "allow-forms",
  ].join(" ");

  return (
    <GameErrorBoundary gameTitle={game.title} onRetry={handleRetry}>
      <div className="h-screen flex flex-col bg-[var(--color-forest-dark)] overflow-hidden">
        {/* ── Header ── */}
        <GameHeader
          game={game}
          isFullscreen={isFullscreen}
          isMuted={isMuted}
          onToggleFullscreen={toggleFullscreen}
          onToggleMute={toggleMute}
          onReload={handleRetry}
          selectedWeek={selectedWeek}
          onWeekChange={handleWeekChange}
          bestScore={userBestScore}
          rank={userRank}
        />

        {/* ── Score Toast ── */}
        <AnimatePresence>
          {toastConfig && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-[72px] left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
            >
              <div
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl backdrop-blur-xl border shadow-lg ${toastConfig.style}`}
              >
                {toastConfig.icon}
                <span className="text-sm font-semibold whitespace-nowrap">
                  {toastConfig.text}
                </span>
                <button
                  onClick={dismiss}
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-xs"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content: Game + Sidebar ── */}
        <div className="flex-1 flex min-h-0">
          {/* Game container */}
          <div
            ref={containerRef}
            className="relative flex-1 flex items-center justify-center bg-black overflow-hidden"
            style={{
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

          {/* Sidebar */}
          <GameSidebar
            game={game}
            scores={scores}
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            eligibility={eligibility}
          />
        </div>

        {/* ── Score Submission Panel (bottom) ── */}
        <ScoreSubmissionPanel
          game={game}
          bestScore={userBestScore}
          rank={userRank}
          lastSubmission={lastSubmission}
          history={scoreHistory}
          submissionStatus={submissionStatus}
        />
      </div>
    </GameErrorBoundary>
  );
}
