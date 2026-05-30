"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Gamepad2,
  BarChart3,
  Banknote,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Gift,
  Clock,
  Star,
  Zap,
  Info,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { formatNumber, formatUsd } from "@/lib/format";
import { API_REWARDS } from "@/features/arcade/constants";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import { useWeeklyCountdown } from "@/features/arcade";
import { CyberCard } from "@/components/ui/CyberCard";

/* ═══════════════════════════════════════════════════════════════
   PrizesPageContent — Full /prizes page component

   Same DNA as the Leaderboard page: solid dark cards (#0a0a0a /
   #0f0a0a), neon borders/glows, floating nut particles, and the
   chaotic degen squirrel energy. Just different content.
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

          <span className="neon-chip text-degen-crisp mb-4 animate-glitch-skew">
            🥜 Hall of Degens
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
            Prizes &amp; Payouts
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto leading-relaxed">
            {totalUsdLabel} hoard split every single week. Free to play, real
            payouts, no cap. Skill in, $NUT out. 🐿️
          </p>
          <p className={`text-base sm:text-lg font-mono font-bold mt-3 animate-pulse ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-orange" : "text-cream-dim/80"} countdown-pulse`}>
            ⏱ Resets in{" "}
            <span className={`font-black ${countdown.isCritical ? "text-red-400" : countdown.isUrgent ? "text-orange" : "text-neon-green"}`}>
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
            className="relative prize-pedestal-glow rounded-2xl border-2 border-brand-gold/40 bg-[#0f0a00] py-6 sm:py-8 px-3 text-center"
            style={{ boxShadow: "0 0 30px rgba(251,191,36,0.2), 0 0 60px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.2)" }}
          >
            <span className="absolute -top-3 -left-1 text-lg float-nut-1 opacity-70 pointer-events-none">🥜</span>
            <span className="absolute top-1/2 -right-2 text-base float-nut-2 opacity-50 pointer-events-none">🥜</span>
            <span className="absolute -bottom-2 left-1/3 text-sm float-nut-3 opacity-60 pointer-events-none" style={{ animationDelay: "0.5s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥇</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-gold/70 mb-1">1st Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-brand-gold">{tierUsdLabel(1)}</p>
            <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(1)}</p>
          </div>

          {/* 2nd Place Pedestal */}
          <div
            className="relative prize-pedestal-glow rounded-2xl border-2 border-gray-400/40 bg-[#0a0a0a] py-6 sm:py-8 px-3 text-center"
            style={{ boxShadow: "0 0 25px rgba(192,192,192,0.15), 0 0 50px rgba(192,192,192,0.08), inset 0 1px 0 rgba(192,192,192,0.15)" }}
          >
            <span className="absolute -top-3 -right-1 text-lg float-nut-2 opacity-60 pointer-events-none">🥜</span>
            <span className="absolute bottom-1/3 -left-2 text-base float-nut-3 opacity-45 pointer-events-none" style={{ animationDelay: "0.3s" }}>🥜</span>
            <span className="absolute -bottom-1 right-1/4 text-sm float-nut-1 opacity-55 pointer-events-none" style={{ animationDelay: "0.8s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥈</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400/70 mb-1">2nd Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-gray-300">{tierUsdLabel(2)}</p>
            <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(2)}</p>
          </div>

          {/* 3rd Place Pedestal */}
          <div
            className="relative prize-pedestal-glow rounded-2xl border-2 border-amber-700/40 bg-[#0f0800] py-6 sm:py-8 px-3 text-center"
            style={{ boxShadow: "0 0 25px rgba(180,83,9,0.15), 0 0 50px rgba(180,83,9,0.08), inset 0 1px 0 rgba(180,83,9,0.15)" }}
          >
            <span className="absolute -top-3 left-1/4 text-lg float-nut-3 opacity-55 pointer-events-none">🥜</span>
            <span className="absolute top-1/3 -right-2 text-base float-nut-1 opacity-40 pointer-events-none" style={{ animationDelay: "0.6s" }}>🥜</span>
            <span className="absolute -bottom-2 left-1/2 text-sm float-nut-2 opacity-50 pointer-events-none" style={{ animationDelay: "1.1s" }}>🥜</span>
            <div className="text-4xl sm:text-5xl mb-2">🥉</div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 mb-1">3rd Place</p>
            <p className="font-display text-2xl sm:text-3xl font-black text-amber-600">{tierUsdLabel(3)}</p>
            <p className="text-xs font-mono text-cream-dim/60 mt-1">{tierNutLabel(3)}</p>
          </div>
        </motion.div>

        {/* Total pool line */}
        <p className="text-center text-sm text-[var(--color-cream-dim)] mb-12">
          <span className="opacity-60">Total weekly pool: </span>
          <span className="font-bold text-[var(--color-gold)]">{totalUsdLabel}</span>
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
          <CyberCard accentColor="gold" className="overflow-hidden bg-[#0a0a0a]">
            <div className="p-6 sm:p-8 relative">
              {/* Floating nuts */}
              <span className="absolute top-4 right-6 text-xl float-nut-1 opacity-40 pointer-events-none">🥜</span>
              <span className="absolute bottom-4 left-8 text-lg float-nut-2 opacity-30 pointer-events-none" style={{ animationDelay: "0.9s" }}>🥜</span>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0f0a00] border border-brand-gold/30">
                  <Trophy size={20} className="text-brand-gold" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-cream">
                  The Weekly Nut Hoard 🐿️
                </h3>
              </div>
              <p className="text-[var(--color-cream-dim)] text-sm sm:text-base leading-relaxed mb-4">
                Every week, a fresh pool of <span className="text-brand-gold font-bold">{totalUsdLabel}</span> in $NUT
                is up for grabs. The top 3 scorers across all arcade games split the hoard —
                1st takes the lion&apos;s share, 2nd and 3rd get their cut. The pool resets
                every Monday at 00:00 UTC, so every week is a clean slate.
              </p>
              <p className="text-[var(--color-cream-dim)] text-sm sm:text-base leading-relaxed">
                No buy-in. No catch. No cap. Just play your best, and if your score
                sits in the top 3 when the clock hits zero, the $NUT is yours. Connect
                your XRP wallet (Xaman or Joey) to claim. Skill in, $NUT out. 🥜
              </p>
            </div>
          </CyberCard>
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
            <span className="neon-chip text-degen-crisp mb-3 text-xs">
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
                <CyberCard accentColor="green" className="h-full bg-[#0a0a0a]">
                  <div className="p-5 sm:p-6 text-center relative">
                    {/* Step number watermark */}
                    <span className="absolute top-3 right-4 font-display text-5xl font-black opacity-[0.06] pointer-events-none" style={{ color: step.color }}>
                      {step.step}
                    </span>

                    <span className="text-3xl mb-3 block" aria-hidden="true">{step.emoji}</span>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: `color-mix(in srgb, ${step.color} 12%, #0a0a0a)` }}
                    >
                      <step.icon size={20} style={{ color: step.color }} strokeWidth={2.5} />
                    </div>

                    <p className="font-display text-base font-bold mb-1" style={{ color: step.color }}>
                      {step.title}
                    </p>
                    <p className="text-xs text-[var(--color-cream-dim)] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </CyberCard>
              </motion.div>
            ))}
          </div>

          {/* Arrow connectors (desktop only) */}
          <div className="hidden sm:flex justify-center items-center -mt-1 mb-2 pointer-events-none">
            <div className="flex items-center gap-4 text-cream-dim/20">
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
          <CyberCard accentColor="gold" className="overflow-hidden bg-[#0a0a0a]">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cream-dim border-b border-white/[0.08] bg-[#0d0d0d]">
              <span className="w-8 text-center">Rank</span>
              <span className="flex-1">Degen</span>
              <span className="hidden sm:block w-28">Game</span>
              <span className="w-16 text-right">Week</span>
              <span className="w-16 text-right">Prize</span>
            </div>

            {PAST_WINNERS.map((winner, i) => {
              const rankBorderGlow =
                winner.rank === 1 ? "border-l-2 border-l-brand-gold shadow-[inset_4px_0_12px_-4px_rgba(251,191,36,0.3)]" :
                winner.rank === 2 ? "border-l-2 border-l-gray-400 shadow-[inset_4px_0_12px_-4px_rgba(192,192,192,0.2)]" :
                "border-l-2 border-l-amber-700 shadow-[inset_4px_0_12px_-4px_rgba(180,83,9,0.2)]";

              return (
                <motion.div
                  key={`winner-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0
                    ${winner.rank <= 3 ? `bg-[#0d0d0d] ${rankBorderGlow}` : "hover:bg-[#111]"}
                  `}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    <span className="text-lg">{winner.emoji}</span>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate block ${winner.rank === 1 ? "text-brand-gold font-bold" : "text-cream"}`}>
                      {winner.name}
                    </span>
                  </div>

                  {/* Game */}
                  <div className="hidden sm:block w-28 shrink-0">
                    <span className="text-xs text-cream-dim">{winner.game}</span>
                  </div>

                  {/* Week */}
                  <div className="w-16 text-right shrink-0">
                    <span className="text-[11px] font-mono text-cream-dim opacity-60">{winner.week}</span>
                  </div>

                  {/* Prize */}
                  <div className="w-16 text-right shrink-0">
                    <span className={`text-sm font-mono font-bold ${winner.rank === 1 ? "text-brand-gold" : winner.rank === 2 ? "text-gray-300" : "text-amber-600"}`}>
                      {winner.prize}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </CyberCard>
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
          <CyberCard accentColor="green" className="overflow-hidden bg-[#0a0a0a]">
            <div className="p-6 sm:p-8 relative">
              {/* Floating nuts */}
              <span className="absolute top-4 left-6 text-lg float-nut-2 opacity-30 pointer-events-none">🥜</span>
              <span className="absolute bottom-6 right-8 text-xl float-nut-3 opacity-25 pointer-events-none" style={{ animationDelay: "1.2s" }}>🥜</span>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0a1a0f] border border-neon-green/30">
                  <Info size={20} className="text-neon-green" />
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-cream">
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
                    className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#0d0d0d] border border-white/[0.04] hover:border-neon-green/20 transition-colors"
                  >
                    <span className="text-neon-green font-mono text-xs font-bold mt-0.5 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-sm text-cream-dim leading-relaxed">{rule}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </CyberCard>
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
                <div className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
                <span className="text-sm font-medium text-[var(--color-neon-green)]">
                  Wallet connected — you&apos;re in the running
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/leaderboard/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--color-gold)] hover:bg-[rgba(251,191,36,0.06)] transition-colors min-h-[44px]"
                >
                  <Trophy size={15} />
                  View Leaderboard
                </a>
                <a
                  href="/profile/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--color-neon-green)] hover:bg-[rgba(16,185,129,0.06)] transition-colors min-h-[44px]"
                >
                  <Gift size={15} />
                  Claim Rewards
                </a>
              </div>
            </>
          ) : (
            <>
              <motion.button
                onClick={() => connect("xaman")}
                disabled={isConnecting}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 34px rgba(255,46,136,0.55)",
                }}
                whileTap={{ scale: 0.97 }}
                className="wallet-cta-button-v3 relative inline-flex items-center gap-3 px-8 py-4 sm:px-12 sm:py-5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] text-[var(--color-degen-black)] font-display font-black text-base sm:text-lg tracking-wide transition-all disabled:opacity-50 cursor-pointer"
              >
                <Wallet size={22} strokeWidth={2.5} />
                <span>
                  {isConnecting ? "Connecting…" : "Bag the Bag — Am I Top 3? 🥜"}
                </span>
                <ArrowRight size={18} strokeWidth={2.5} />
              </motion.button>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4">
                <div className="flex items-center gap-1.5 text-[var(--color-cream-dim)]">
                  <ShieldCheck
                    size={13}
                    className="text-[var(--color-neon-green)]"
                  />
                  <span className="text-xs">
                    Free · read-only · no transactions
                  </span>
                </div>
                <span className="text-xs text-[var(--color-cream-dim)] opacity-50">
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
