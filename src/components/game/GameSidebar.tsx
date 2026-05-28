"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ChevronRight,
  Gamepad2,
  Timer,
  Info,
  X,
  PanelRightClose,
  PanelRightOpen,
  Coins,
  GripHorizontal,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { API_REWARDS } from "@/features/arcade";
import type { ScoreEntry, EligibilityData } from "@/features/arcade";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import type { GameMetadata } from "@/lib/gameRegistry";
// DEGEN OVERHAUL — formatNumber from the lean @/lib/format module so this
// component doesn't drag TOKENOMICS/GAMES/HOW_TO_STEPS into the game route
import { formatNumber } from "@/lib/format";

/* ═══════════════════════════════════════════════════════════════
   GameSidebar — Live leaderboard preview, reward tracker, game info

   Responsive behavior:
   • Desktop (≥1024px): Fixed 280px panel, right side
   • Tablet (768–1023px): Collapsible overlay drawer (right)
   • Mobile (<768px): Bottom sheet (swipe up/down to open/close)
   ═══════════════════════════════════════════════════════════════ */

interface GameSidebarProps {
  game: GameMetadata;
  scores: ScoreEntry[];
  isOpen: boolean;
  onToggle: () => void;
  eligibility: EligibilityData | null;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return score.toLocaleString();
}

const RANK_ICONS = [Crown, Medal, Award];
const RANK_COLORS = ["#FBBF24", "#94A3B8", "#CD7F32"];

export function GameSidebar({
  game,
  scores,
  isOpen,
  onToggle,
  eligibility,
}: GameSidebarProps) {
  const { address } = useWalletStore();
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "leaderboard"
  );

  // DEGEN OVERHAUL START — live weekly hoard from GET /api/rewards/tiers.
  // Same pattern as Prizes.tsx / ClaimRewards.tsx / Leaderboard.tsx.
  // Pre-launch the snapshot may be empty/missing → falls back to "—".
  const [weekTiers, setWeekTiers] = useState<WeeklyTiersResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/tiers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setWeekTiers(d); })
      .catch(() => { if (!cancelled) setWeekTiers(null); });
    return () => { cancelled = true; };
  }, []);
  const totalNut = weekTiers?.tiers
    ? weekTiers.tiers.reduce(
        (s, t) => s + (t.nut_amount != null ? Number(t.nut_amount) : 0),
        0,
      )
    : null;
  const hoardLabel =
    totalNut != null && totalNut > 0 ? `${formatNumber(totalNut)} NUT` : "—";
  // DEGEN OVERHAUL END

  const top5 = scores.slice(0, 5);
  const userEntry = address
    ? scores.find((s) => s.wallet === address)
    : null;
  const userRank = userEntry
    ? scores.indexOf(userEntry) + 1
    : null;

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  // Bottom sheet swipe-to-close
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // If user drags down more than 80px or with velocity > 500, close
      if (info.offset.y > 80 || info.velocity.y > 500) {
        onToggle();
      }
    },
    [onToggle],
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Section A: Live Leaderboard ── */}
      <SidebarSection
        title="Leaderboard"
        icon={<Trophy size={14} />}
        isExpanded={expandedSection === "leaderboard"}
        onToggle={() => toggleSection("leaderboard")}
        accentColor={game.color}
      >
        {top5.length === 0 ? (
          <p className="text-xs text-[var(--color-cream-dim)] py-3 text-center opacity-60">
            No scores this week yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {top5.map((entry, i) => {
              const RankIcon = i < 3 ? RANK_ICONS[i] : null;
              const isUser = address === entry.wallet;
              return (
                <div
                  key={entry.wallet + i}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    isUser
                      ? "bg-neon-green-dim border border-glass-neon"
                      : "hover:bg-[var(--color-glass-hover)]"
                  }`}
                >
                  {/* Rank */}
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full shrink-0 font-bold text-[10px]"
                    style={{
                      background:
                        i < 3
                          ? `${RANK_COLORS[i]}15`
                          : "var(--color-glass-border-faint)",
                      color: i < 3 ? RANK_COLORS[i] : "var(--color-cream-dim)",
                    }}
                  >
                    {RankIcon ? <RankIcon size={11} /> : i + 1}
                  </div>
                  {/* Name */}
                  <span
                    className={`font-mono truncate flex-1 ${
                      isUser
                        ? "text-[var(--color-neon-green)] font-semibold"
                        : "text-[var(--color-cream-dim)]"
                    }`}
                  >
                    {isUser ? "You" : truncateAddress(entry.wallet)}
                  </span>
                  {/* Score */}
                  <span className="font-mono font-bold text-[var(--color-cream)] shrink-0">
                    {formatScore(entry.score)}
                  </span>
                </div>
              );
            })}

            {/* User not in top 5 */}
            {userEntry && userRank && userRank > 5 && (
              <>
                <div className="flex items-center justify-center gap-1 py-0.5">
                  <span className="text-[10px] text-[var(--color-cream-dim)] opacity-40">
                    ···
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs bg-neon-green-dim border border-glass-neon">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full shrink-0 font-bold text-[10px] text-[var(--color-cream-dim)] bg-[var(--color-glass-border-faint)]">
                    {userRank}
                  </div>
                  <span className="font-mono truncate flex-1 text-[var(--color-neon-green)] font-semibold">
                    You
                  </span>
                  <span className="font-mono font-bold text-[var(--color-cream)] shrink-0">
                    {formatScore(userEntry.score)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
        <a
          href={`/leaderboard?game=${game.slug}`}
          className="flex items-center justify-center gap-1 mt-3 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[var(--color-glass-border-faint)] transition-colors"
        >
          View Full Leaderboard <ChevronRight size={10} />
        </a>
      </SidebarSection>

      {/* ── Section B: Reward Tracker ── */}
      <SidebarSection
        title="Rewards"
        icon={<Coins size={14} />}
        isExpanded={expandedSection === "rewards"}
        onToggle={() => toggleSection("rewards")}
        accentColor="#FBBF24"
      >
        {/* DEGEN OVERHAUL — neon-ringed prize pool pill, now wired to the
            live weekly_prize_tiers API (computed above as hoardLabel). */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-degen-950/60 neon-ring-pink">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-hot-pink)] font-bold tracking-[0.18em]">
            🥜 Weekly Hoard
          </span>
          <span className="text-xs font-black text-[var(--color-gold)] font-mono tabular-nums">
            {hoardLabel}
          </span>
        </div>

        {/* Eligibility */}
        <div className="mt-2 px-2.5 py-2.5 rounded-lg border border-glass">
          {eligibility?.eligible ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[var(--color-brand-gold)] animate-pulse" />
                <span className="text-xs font-bold text-[var(--color-brand-gold)]">
                  Eligible for Prize!
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-cream-dim)]">
                Ranked #{eligibility.rank} —{" "}
                <span className="font-bold text-[var(--color-cream)]">
                  {eligibility.prize?.toLocaleString()} $NUT
                </span>
              </p>
              {eligibility.claimed && (
                <p className="text-[10px] text-[var(--color-neon-green)] font-medium">
                  ✓ Already claimed
                </p>
              )}
            </motion.div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-[var(--color-cream-dim)]">
                Not eligible yet
              </p>
              <p className="text-[10px] text-[var(--color-cream-dim)] opacity-60">
                Reach Top 3 to earn weekly $NUT prizes
              </p>
            </div>
          )}
        </div>
      </SidebarSection>

      {/* ── Section C: Game Info ── */}
      <SidebarSection
        title="Game Info"
        icon={<Info size={14} />}
        isExpanded={expandedSection === "info"}
        onToggle={() => toggleSection("info")}
        accentColor="var(--color-cream-dim)"
      >
        <div className="space-y-2.5 text-xs text-[var(--color-cream-dim)]">
          <div className="flex items-center gap-2">
            <Gamepad2 size={12} className="shrink-0 opacity-50" />
            <span className="font-medium text-[var(--color-cream)]">
              Controls
            </span>
          </div>
          <ul className="space-y-1 pl-5">
            {game.controls.map((ctrl) => (
              <li key={ctrl} className="text-[11px] list-disc opacity-70">
                {ctrl}
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between pt-2 border-t border-glass-faint">
            <div className="flex items-center gap-1.5">
              <Trophy size={11} className="opacity-40" />
              <span className="text-[10px]">Score Cap</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-[var(--color-cream)]">
              {game.scoreCap.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Timer size={11} className="opacity-40" />
              <span className="text-[10px]">Min Play Time</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-[var(--color-cream)]">
              {game.minPlayTime}s
            </span>
          </div>

          <p className="text-[10px] opacity-50 pt-2 border-t border-glass-faint leading-relaxed">
            {game.description}
          </p>
        </div>
      </SidebarSection>
    </div>
  );

  return (
    <>
      {/* Toggle button (visible on tablet / when sidebar is collapsed) */}
      <button
        onClick={onToggle}
        className="fixed right-3 top-[76px] z-50 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] transition-colors"
        style={{
          background: "var(--color-forest-900)",
          border: "1px solid var(--color-glass-border-strong)",
          backdropFilter: "blur(12px)",
        }}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        id="game-sidebar-toggle"
      >
        {isOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>

      {/* DEGEN OVERHAUL — degen panel surface + hot-pink edge */}
      <aside
        className="hidden lg:flex flex-col w-[280px] shrink-0 border-l border-hot-pink/15 overflow-y-auto"
        style={{
          background: "rgba(10, 6, 19, 0.72)",
          backdropFilter: "blur(8px)",
        }}
        id="game-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet: overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={onToggle}
            />

            {/* Mobile (<md): Bottom sheet */}
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              // DEGEN OVERHAUL — degen mobile bottom sheet
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[65vh] border-t border-hot-pink/25 rounded-t-2xl overflow-hidden md:hidden"
              style={{
                background: "rgba(10, 6, 19, 0.97)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
              id="game-sidebar-mobile-sheet"
            >
              {/* Drag handle */}
              <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-[var(--color-glass-border-strong)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2 border-b border-glass">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-cream-dim)] flex items-center gap-1.5">
                  <GripHorizontal size={12} className="opacity-40" />
                  Game Panel
                </span>
                <button
                  onClick={onToggle}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content (scrollable) */}
              <div className="overflow-y-auto flex-1 overscroll-contain">
                {sidebarContent}
              </div>
            </motion.aside>

            {/* Tablet (md to lg): Right drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              // DEGEN OVERHAUL — degen tablet drawer
              className="fixed right-0 top-0 bottom-0 z-50 w-[300px] max-w-[85vw] flex-col border-l border-hot-pink/20 overflow-y-auto hidden md:flex lg:hidden"
              style={{
                background: "rgba(10, 6, 19, 0.95)",
                backdropFilter: "blur(16px)",
              }}
              id="game-sidebar-tablet"
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-glass">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-cream-dim)]">
                  Game Panel
                </span>
                <button
                  onClick={onToggle}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Reusable Accordion Section ── */

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: string;
  children: React.ReactNode;
}

function SidebarSection({
  title,
  icon,
  isExpanded,
  onToggle,
  accentColor,
  children,
}: SidebarSectionProps) {
  return (
    <div className="border-b border-glass-faint">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[var(--color-glass-hover)]"
        style={{ color: isExpanded ? accentColor : "var(--color-cream-dim)" }}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronRight
          size={12}
          className={`transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
