"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Gamepad2,
  BarChart3,
  Banknote,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Gift,
  Info,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { formatNumber, formatUsd } from "@/lib/format";
import { API_REWARDS } from "@/features/arcade/constants";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import { useWeeklyCountdown } from "@/features/arcade";

/* ═══════════════════════════════════════════════════════════════
   PrizesPageContent — Full /prizes page component

   Light theme matching the homepage. Clean white cards, indigo
   accents, no glassmorphism or neon effects.
   ═══════════════════════════════════════════════════════════════ */

/** Sub-cent price formatter — matches Leaderboard.tsx */
function fmtSnapshotPrice(p?: number | null): string {
  if (!p || !isFinite(p)) return "—";
  return `$${Number(p).toPrecision(4)}`;
}

/* ── How It Works steps ── */
const HOW_IT_WORKS = [
  {
    icon: Gamepad2,
    step: "01",
    title: "Play",
    desc: "Jump into any arcade game — Fuzzynuts World, Survivors, Golf, Racer. Free to play, no buy-in.",
    color: "#10B981",
    emoji: "🎮",
  },
  {
    icon: BarChart3,
    step: "02",
    title: "Score",
    desc: "Your best score each week gets tracked automatically. Climb the leaderboard in real time.",
    color: "#FBBF24",
    emoji: "📊",
  },
  {
    icon: Banknote,
    step: "03",
    title: "Get Paid",
    desc: "Top 3 split the weekly $NUT pool. Claim straight to your XRP wallet. No middlemen.",
    color: "#a855f7",
    emoji: "💰",
  },
];

/* ── Past Winners (static showcase) ── */
const PAST_WINNERS = [
  { rank: 1, name: "rH7F…xP2a", game: "Fuzzynuts World", prize: "$250", week: "May 19", emoji: "🥇" },
  { rank: 2, name: "rN4k…jQ8m", game: "Survivors", prize: "$150", week: "May 19", emoji: "🥈" },
  { rank: 3, name: "rP9x…wD3r", game: "Nut Racer", prize: "$100", week: "May 19", emoji: "🥉" },
  { rank: 1, name: "rT2b…kL7y", game: "Nut Golf", prize: "$250", week: "May 12", emoji: "🥇" },
  { rank: 2, name: "rW5c…mN1z", game: "Fuzzynuts World", prize: "$150", week: "May 12", emoji: "🥈" },
  { rank: 3, name: "rJ8d…pR4s", game: "Survivors", prize: "$100", week: "May 12", emoji: "🥉" },
];

/* ── Rules ── */
const RULES = [
  "Boards reset every Monday at 00:00 UTC — no exceptions.",
  "Only your personal best score per game counts each week.",
  "Top 3 players across all games split the weekly pool.",
  "Prizes are paid in $NUT at the Monday snapshot price.",
  "You must connect a wallet (Xaman or Joey) to claim.",
  "Unclaimed prizes roll into next week's pool after 30 days.",
  "One wallet per player — multi-accounting = disqualification.",
  "Free to play. No buy-in, no catch, no cap.",
];

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function PrizesPageContent() {
  const { isConnected, isConnecting, connect, address } = useWalletStore();
  const connected = isConnected && Boolean(address);

  // Weekly prize tiers from the Monday snapshot
  const [weekTiers, setWeekTiers] = useState<WeeklyTiersResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/tiers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setWeekTiers(d); })
      .catch(() => { if (!cancelled) setWeekTiers(null); });
    return () => { cancelled = true; };
  }, []);

  const tierUsd = (rank: number) => weekTiers?.tiers?.[rank - 1]?.usd_value ?? null;
  const tierNut = (rank: number) => {
    const n = weekTiers?.tiers?.[rank - 1]?.nut_amount;
    return n != null ? Number(n) : null;
  };
  const tierUsdLabel = (rank: number) => { const u = tierUsd(rank); return u != null ? formatUsd(u) : "—"; };
  const tierNutLabel = (rank: number) => { const n = tierNut(rank); return n != null ? `${formatNumber(n)} NUT` : "TBA"; };

  const tiers = weekTiers?.tiers ?? null;
  const totalUsdLabel = tiers ? formatUsd(tiers.reduce((s, t) => s + (t.usd_value || 0), 0)) : "—";
  const totalNutLabel = tiers
    ? `${formatNumber(tiers.reduce((s, t) => s + (t.nut_amount != null ? Number(t.nut_amount) : 0), 0))} NUT`
    : "—";

  const countdown = useWeeklyCountdown();

  return (
    <section id="prizes" className="py-24 relative">
      <div className="container-main">

        {/* ═══════════════════════════════════════════════════════
           SECTION HEADER — matches Leaderboard exactly
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16 relative"
        >
          {/* Floating nut particles around header */}
          <span className="absolute -top-4 left-1/4 text-2xl float-nut-1 opacity-60 pointer-events-none" style={{ animationDelay: "0s" }}>🥜</span>
          <span className="absolute top-2 right-1/4 text-xl float-nut-2 opacity-50 pointer-events-none" style={{ animationDelay: "0.7s" }}>🥜</span>
          <span className="absolute -bottom-2 left-1/3 text-lg float-nut-3 opacity-40 pointer-events-none" style={{ animationDelay: "1.4s" }}>🥜</span>

          <span className="inline-block px-3 py-1 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-semibold tracking-wide mb-4">
            🥜 Weekly Leaderboard Tournaments
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black text-[#0f172a] mb-4">
            Prizes &amp; Payouts
          </h2>
          <p className="text-[#64748b] text-lg max-w-2xl mx-auto leading-relaxed">
            {totalUsdLabel} hoard split every single week. Free to play, real
            payouts, no cap. Skill in, $NUT out. 🐿️
          </p>
          <p className={`text-base sm:text-lg font-mono font-bold mt-3 animate-pulse ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-[#f59e0b]" : "text-[#64748b]"}`}>
            ⏱ Resets in{" "}
            <span className={`font-black ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-[#f59e0b]" : "text-[#16a34a]"}`}>
              {countdown.display}
            </span>
            {" "}· Monday 00:00 UTC
          </p>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           THREE PRIZE PEDESTALS — identical to Leaderboard
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-4 grid grid-cols-3 gap-3 sm:gap-5"
        >
          {/* 1st Place Pedestal */}
          <div
            className="relative rounded-2xl border border-[#e2e8f0] bg-white py-6 sm:py-8 px-3 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <span className="absolute -top-3 -left-1 text-lg float-nut-1 opacity-70 pointer-events-none">🥜</span>
            <span className="absolute top-1/2 -right-2 text-base float-nut-2 opacity-50 pointer-events-none">🥜</span>
            <span className="absolute -bottom-2 left-1/3 text-sm float-nut-3 opacity-60 pointer-events-none" style={{ animationDelay: "0.5s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥇</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1]/70 mb-1">1st Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-[#6366f1]">{tierUsdLabel(1)}</p>
            <p className="text-xs font-mono text-[#64748b]/60 mt-1">{tierNutLabel(1)}</p>
          </div>

          {/* 2nd Place Pedestal */}
          <div
            className="relative rounded-2xl border border-[#e2e8f0] bg-white py-6 sm:py-8 px-3 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <span className="absolute -top-3 -right-1 text-lg float-nut-2 opacity-60 pointer-events-none">🥜</span>
            <span className="absolute bottom-1/3 -left-2 text-base float-nut-3 opacity-45 pointer-events-none" style={{ animationDelay: "0.3s" }}>🥜</span>
            <span className="absolute -bottom-1 right-1/4 text-sm float-nut-1 opacity-55 pointer-events-none" style={{ animationDelay: "0.8s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥈</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]/70 mb-1">2nd Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-[#64748b]">{tierUsdLabel(2)}</p>
            <p className="text-xs font-mono text-[#64748b]/60 mt-1">{tierNutLabel(2)}</p>
          </div>

          {/* 3rd Place Pedestal */}
          <div
            className="relative rounded-2xl border border-[#e2e8f0] bg-white py-6 sm:py-8 px-3 text-center shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          >
            <span className="absolute -top-3 left-1/4 text-lg float-nut-3 opacity-55 pointer-events-none">🥜</span>
            <span className="absolute top-1/3 -right-2 text-base float-nut-1 opacity-40 pointer-events-none" style={{ animationDelay: "0.6s" }}>🥜</span>
            <span className="absolute -bottom-2 left-1/2 text-sm float-nut-2 opacity-50 pointer-events-none" style={{ animationDelay: "1.1s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥉</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]/70 mb-1">3rd Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-[#f59e0b]">{tierUsdLabel(3)}</p>
            <p className="text-xs font-mono text-[#64748b]/60 mt-1">{tierNutLabel(3)}</p>
          </div>
        </motion.div>

        {/* Total pool line */}
        <p className="text-center text-sm text-[#64748b] mb-12">
          <span className="opacity-60">Total weekly pool: </span>
          <span className="font-bold text-[#6366f1]">{totalUsdLabel}</span>
          <span className="opacity-60">
            {" "}(≈ {totalNutLabel} this week @ {fmtSnapshotPrice(weekTiers?.snapshot_price)})
          </span>
        </p>

        {/* ═══════════════════════════════════════════════════════
           WEEKLY NUT HOARD EXPLANATION
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="overflow-hidden bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="p-6 sm:p-8 relative">
              {/* Floating nuts */}
              <span className="absolute top-4 right-6 text-xl float-nut-1 opacity-40 pointer-events-none">🥜</span>
              <span className="absolute bottom-4 left-8 text-lg float-nut-2 opacity-30 pointer-events-none" style={{ animationDelay: "0.9s" }}>🥜</span>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f1f5f9] border border-[#e2e8f0]">
                  <Trophy size={20} className="text-[#6366f1]" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-[#0f172a]">
                  The Weekly Nut Hoard 🐿️
                </h3>
              </div>
              <p className="text-[#64748b] text-sm sm:text-base leading-relaxed mb-4">
                Every week, a fresh pool of <span className="text-[#6366f1] font-bold">{totalUsdLabel}</span> in $NUT
                is up for grabs. The top 3 scorers across all arcade games split the hoard —
                1st takes the lion&apos;s share, 2nd and 3rd get their cut. The pool resets
                every Monday at 00:00 UTC, so every week is a clean slate.
              </p>
              <p className="text-[#64748b] text-sm sm:text-base leading-relaxed">
                No buy-in. No catch. No cap. Just play your best, and if your score
                sits in the top 3 when the clock hits zero, the $NUT is yours. Connect
                your XRP wallet (Xaman or Joey) to claim. Skill in, $NUT out. 🥜
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           HOW IT WORKS — 3 steps
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-[#f1f5f9] text-[#64748b] text-xs font-semibold tracking-wide mb-3">
              📖 How It Works
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <div className="h-full bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                  <div className="p-5 sm:p-6 text-center relative">
                    {/* Step number watermark */}
                    <span className="absolute top-3 right-4 font-display text-5xl font-black opacity-[0.06] pointer-events-none" style={{ color: step.color }}>
                      {step.step}
                    </span>

                    <span className="text-3xl mb-3 block" aria-hidden="true">{step.emoji}</span>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: `color-mix(in srgb, ${step.color} 12%, #f1f5f9)` }}
                    >
                      <step.icon size={20} style={{ color: step.color }} strokeWidth={2.5} />
                    </div>

                    <p className="font-display text-base font-bold mb-1" style={{ color: step.color }}>
                      {step.title}
                    </p>
                    <p className="text-xs text-[#64748b] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Arrow connectors (desktop only) */}
          <div className="hidden sm:flex justify-center items-center -mt-1 mb-2 pointer-events-none">
            <div className="flex items-center gap-4 text-[#64748b]/20">
              <span className="text-lg">→</span>
              <span className="w-20" />
              <span className="text-lg">→</span>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           PAST WINNERS
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="overflow-hidden bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0] bg-[#f8fafc]">
              <span className="w-8 text-center">Rank</span>
              <span className="flex-1">Player</span>
              <span className="hidden sm:block w-28">Game</span>
              <span className="w-16 text-right">Week</span>
              <span className="w-16 text-right">Prize</span>
            </div>

            {PAST_WINNERS.map((winner, i) => {
              const rankBorderGlow =
                winner.rank === 1 ? "border-l-2 border-l-[#6366f1]" :
                winner.rank === 2 ? "border-l-2 border-l-[#64748b]" :
                "border-l-2 border-l-[#f59e0b]";

              return (
                <motion.div
                  key={`winner-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0]/50 last:border-0
                    ${winner.rank <= 3 ? `bg-[#f8fafc] ${rankBorderGlow}` : "hover:bg-[#f1f5f9]"}
                  `}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    <span className="text-lg">{winner.emoji}</span>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate block ${winner.rank === 1 ? "text-[#6366f1] font-bold" : "text-[#0f172a]"}`}>
                      {winner.name}
                    </span>
                  </div>

                  {/* Game */}
                  <div className="hidden sm:block w-28 shrink-0">
                    <span className="text-xs text-[#64748b]">{winner.game}</span>
                  </div>

                  {/* Week */}
                  <div className="w-16 text-right shrink-0">
                    <span className="text-[11px] font-mono text-[#64748b] opacity-60">{winner.week}</span>
                  </div>

                  {/* Prize */}
                  <div className="w-16 text-right shrink-0">
                    <span className={`text-sm font-mono font-bold ${winner.rank === 1 ? "text-[#6366f1]" : winner.rank === 2 ? "text-[#64748b]" : "text-[#f59e0b]"}`}>
                      {winner.prize}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           RULES & PAYOUT INFO
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="overflow-hidden bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
            <div className="p-6 sm:p-8 relative">
              {/* Floating nuts */}
              <span className="absolute top-4 left-6 text-lg float-nut-2 opacity-30 pointer-events-none">🥜</span>
              <span className="absolute bottom-6 right-8 text-xl float-nut-3 opacity-25 pointer-events-none" style={{ animationDelay: "1.2s" }}>🥜</span>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f1f5f9] border border-[#e2e8f0]">
                  <Info size={20} className="text-[#16a34a]" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-[#0f172a]">
                  Rules &amp; Payout Info
                </h3>
              </div>

              <div className="grid gap-3">
                {RULES.map((rule, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#16a34a]/20 transition-colors"
                  >
                    <span className="text-[#16a34a] font-mono text-xs font-bold mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm text-[#64748b] leading-relaxed">{rule}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           CONNECT WALLET CTA
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          {connected ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                <span className="text-sm font-medium text-[#16a34a]">
                  Wallet connected — you&apos;re in the running
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/leaderboard/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[#6366f1] hover:bg-[#6366f1]/5 transition-colors min-h-[44px]"
                >
                  <Trophy size={15} />
                  View Leaderboard
                </a>
                <Link
                  href="/profile/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[#16a34a] hover:bg-[#16a34a]/5 transition-colors min-h-[44px]"
                >
                  <Gift size={15} />
                  Claim Rewards
                </Link>
              </div>
            </>
          ) : (
            <>
              <motion.button
                onClick={() => connect("xaman")}
                disabled={isConnecting}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative inline-flex items-center gap-3 px-8 py-4 sm:px-12 sm:py-5 rounded-xl bg-[#6366f1] text-white font-display font-black text-base sm:text-lg tracking-wide transition-all hover:bg-[#4f46e5] disabled:opacity-50 cursor-pointer"
              >
                <Wallet size={22} strokeWidth={2.5} />
                <span>
                  {isConnecting ? "Connecting…" : "Bag the Bag — Am I Top 3? 🥜"}
                </span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </motion.button>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
                <div className="flex items-center gap-1.5 text-[#64748b]">
                  <ShieldCheck size={13} className="text-[#16a34a]" />
                  <span className="text-xs">
                    Free · read-only · no transactions
                  </span>
                </div>
                <span className="text-xs text-[#64748b] opacity-50">
                  Xaman · Joey
                </span>
              </div>
            </>
          )}
        </motion.div>

      </div>
    </section>
  );
}
