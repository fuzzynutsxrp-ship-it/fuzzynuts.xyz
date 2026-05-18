"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import type { ScoreEntry, EligibilityData } from "@/features/arcade";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   GameSidebar — Live leaderboard preview, reward tracker, game info

   Responsive behavior:
   • Desktop (≥1024px): Fixed 280px panel, right side
   • Tablet (768–1023px): Collapsible overlay drawer
   • Mobile (<768px): Bottom sheet (toggle button in header)
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
                      ? "bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)]"
                      : "hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                >
                  {/* Rank */}
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded-full shrink-0 font-bold text-[10px]"
                    style={{
                      background:
                        i < 3
                          ? `${RANK_COLORS[i]}15`
                          : "rgba(255,255,255,0.04)",
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
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)]">
                  <div className="w-5 h-5 flex items-center justify-center rounded-full shrink-0 font-bold text-[10px] text-[var(--color-cream-dim)] bg-[rgba(255,255,255,0.04)]">
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
          className="flex items-center justify-center gap-1 mt-3 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
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
        {/* Prize pool */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.1)]">
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)] font-medium">
            Weekly Prize Pool
          </span>
          <span className="text-xs font-bold text-[var(--color-brand-gold)] font-mono">
            500K $NUT
          </span>
        </div>

        {/* Eligibility */}
        <div className="mt-2 px-2.5 py-2.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
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

          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.05)]">
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

          <p className="text-[10px] opacity-50 pt-2 border-t border-[rgba(255,255,255,0.05)] leading-relaxed">
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
          background: "rgba(10, 15, 10, 0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        id="game-sidebar-toggle"
      >
        {isOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>

      {/* Desktop: always-visible panel */}
      <aside
        className="hidden lg:flex flex-col w-[280px] shrink-0 border-l border-[rgba(255,255,255,0.06)] overflow-y-auto"
        style={{
          background: "rgba(6, 10, 6, 0.6)",
          backdropFilter: "blur(8px)",
        }}
        id="game-sidebar-desktop"
      >
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet: overlay drawer */}
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
            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[300px] max-w-[85vw] flex flex-col border-l border-[rgba(255,255,255,0.08)] overflow-y-auto lg:hidden"
              style={{
                background: "rgba(6, 10, 6, 0.95)",
                backdropFilter: "blur(16px)",
              }}
              id="game-sidebar-mobile"
            >
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
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
    <div className="border-b border-[rgba(255,255,255,0.04)]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[rgba(255,255,255,0.02)]"
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
