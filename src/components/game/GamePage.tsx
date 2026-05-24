"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { GameHeader } from "@/components/game/GameHeader";
import { GameSidebar } from "@/components/game/GameSidebar";
import { GameViewport } from "@/components/game/GameViewport";
import { GameControls, useFirstVisit } from "@/components/game/GameControls";
import { GameMenu } from "@/components/game/GameMenu";
import {
  TouchControlsHint,
  useTouchHint,
} from "@/components/game/TouchControlsHint";
import { ScoreSubmissionPanel } from "@/components/game/ScoreSubmissionPanel";
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
import { TOAST_CLASSES } from "@/lib/ui/badges";

/* ═══════════════════════════════════════════════════════════════
   GamePage — Unified game page template

   Layout (Navbar is HIDDEN via game layout — GameHeader replaces it):
   ┌──────────────────────────────────────────────────────┐
   │ GameHeader (sticky, 64px)                             │
   ├────────────────────────────────┬──────────────────────┤
   │                                │                      │
   │   GameViewport (flex-1)        │  GameSidebar (280px) │
   │   (iframe + loading + error)   │  Desktop: right      │
   │                                │  Mobile: bottom sheet│
   ├────────────────────────────────┴──────────────────────┤
   │ ScoreSubmissionPanel (bottom bar)                     │
   └──────────────────────────────────────────────────────┘

   Overlays:
   • GameMenu — pause overlay (ESC key)
   • GameControls — floating controls dialog (? key)
   • TouchControlsHint — mobile touch hint (auto-show)
   • Toast — score submission feedback

   Responsive:
   • Desktop (≥1024px): Full layout with sidebar
   • Tablet (768-1023): Sidebar is a toggle drawer
   • Mobile (<768px): Sidebar is a bottom sheet
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { address } = useWalletStore();

  // Show controls overlay on first visit
  const isFirstVisit = useFirstVisit(game.slug);
  useEffect(() => {
    if (isFirstVisit) {
      // Delay slightly so the loading screen shows first
      const timer = setTimeout(() => setControlsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);

  // Touch hint for mobile
  const { showHint, dismissHint } = useTouchHint(game.slug);

  // ── Hooks ──
  const {
    status: submissionStatus,
    errorMessage,
    markGameStart,
    dismiss,
  } = useScoreSubmission(game.slug);

  const { scores, refetch: refetchLeaderboard } = useLeaderboard(
    game.slug,
    selectedWeek,
  );

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

  // ── Iframe-initiated "back to arcade" navigation ──
  // Games inside the iframe send { type: "FUZZY_NAV_BACK" } when the user
  // clicks an in-game back link. The iframe sandbox blocks top navigation,
  // so the parent has to do it. Matches handlePauseQuit below.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "FUZZY_NAV_BACK") {
        window.location.href = "/#games";
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ── Handlers ──
  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setIframeError(false);
    setIsLoading(true);
    setIframeKey((k) => k + 1);
    setMenuOpen(false);
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
      "*",
    );
  }, [isMuted]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((p) => !p);
  }, []);

  const toggleControls = useCallback(() => {
    setControlsOpen((p) => !p);
  }, []);

  const handleWeekChange = useCallback((week: string) => {
    setSelectedWeek(week);
  }, []);

  // Pause menu handlers
  const handlePauseResume = useCallback(() => {
    setMenuOpen(false);
    // Refocus iframe for keyboard passthrough
    iframeRef.current?.focus();
  }, []);

  const handlePauseRestart = useCallback(() => {
    setMenuOpen(false);
    handleRetry();
  }, [handleRetry]);

  const handlePauseQuit = useCallback(() => {
    setMenuOpen(false);
    window.location.href = "/#games";
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // If menu is open, only ESC works (handled inside GameMenu)
      if (menuOpen) return;

      // If controls overlay is open, only ? works
      if (controlsOpen && e.key !== "?") return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          // Open pause menu instead of navigating away
          setMenuOpen(true);
          break;
        case "F1":
          e.preventDefault();
          toggleSidebar();
          break;
        case "?":
          e.preventDefault();
          toggleControls();
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
  }, [
    toggleFullscreen,
    toggleMute,
    toggleSidebar,
    toggleControls,
    controlsOpen,
    menuOpen,
  ]);

  // ── Toast config ──
  const toastConfig = useMemo(() => {
    switch (submissionStatus) {
      case "submitting":
        return {
          icon: <Loader2 size={18} className="shrink-0 animate-spin" />,
          text: "Saving score...",
          style: TOAST_CLASSES.info,
        };
      case "success":
        return {
          icon: <CheckCircle size={18} className="shrink-0" />,
          text: "Score Saved to Leaderboard! 🏆",
          style: TOAST_CLASSES.success,
        };
      case "error":
        return {
          icon:
            errorMessage?.includes("Rate") || errorMessage?.includes("fast") ? (
              <AlertTriangle size={18} className="shrink-0" />
            ) : (
              <XCircle size={18} className="shrink-0" />
            ),
          text: errorMessage || "Submission Failed — Try Again!",
          style: TOAST_CLASSES.error,
        };
      default:
        return null;
    }
  }, [submissionStatus, errorMessage]);

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
          {/* Game viewport (extracted component) */}
          <GameViewport
            game={game}
            iframeRef={iframeRef}
            iframeKey={iframeKey}
            isFullscreen={isFullscreen}
            isLoading={isLoading}
            hasError={iframeError}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            onRetry={handleRetry}
            onLoadComplete={handleLoadComplete}
            containerRef={containerRef}
          />

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

        {/* ── Overlays ── */}

        {/* Pause Menu (ESC key) */}
        <GameMenu
          game={game}
          isOpen={menuOpen}
          currentScore={lastSubmission?.score}
          bestScore={userBestScore}
          onResume={handlePauseResume}
          onRestart={handlePauseRestart}
          onQuit={handlePauseQuit}
          controls={game.controls}
        />

        {/* Controls Overlay (? key) */}
        <GameControls
          controls={game.controls}
          gameTitle={game.title}
          accentColor={game.color}
          isOpen={controlsOpen}
          onClose={() => setControlsOpen(false)}
        />

        {/* Touch Controls Hint (mobile only, auto-show) */}
        <TouchControlsHint
          game={game}
          isVisible={showHint && !isLoading && !menuOpen && !controlsOpen}
          onDismiss={dismissHint}
        />
      </div>
    </GameErrorBoundary>
  );
}
