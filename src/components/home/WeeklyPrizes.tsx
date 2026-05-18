"use client";

import { motion } from "framer-motion";
import { Trophy, Wallet, ArrowRight } from "lucide-react";
import { PRIZE_TIERS } from "@/features/arcade";
import { useWalletStore } from "@/store/wallet";

/* ─────────────────────────────────────────────────────────────
   WeeklyPrizes v4 — Borderless Podium

   Design philosophy:
   - ZERO borders on any element. No 1px solid anything.
   - Hierarchy through typography scale, color, and vertical
     position only.
   - Prize amounts float on the dark background with colored
     text — no card wrapping them.
   - Emoji circles use soft radial fills, no ring borders.
   - Bottom CTA is a clean inline row, no callout box.
   ───────────────────────────────────────────────────────────── */

const PODIUM_STYLES: Record<number, {
  bgFill: string;
  textColor: string;
  dimColor: string;
}> = {
  1: {
    bgFill: "rgba(251,191,36,0.06)",
    textColor: "#FBBF24",
    dimColor: "rgba(251,191,36,0.25)",
  },
  2: {
    bgFill: "rgba(192,192,192,0.04)",
    textColor: "#C0C0C0",
    dimColor: "rgba(192,192,192,0.18)",
  },
  3: {
    bgFill: "rgba(205,127,50,0.04)",
    textColor: "#CD7F32",
    dimColor: "rgba(205,127,50,0.18)",
  },
};

function PrizeCard({ rank, delay }: { rank: number; delay: number }) {
  const tier = PRIZE_TIERS[rank];
  const style = PODIUM_STYLES[rank];
  if (!tier || !style) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 300 } }}
      className={`relative flex flex-col items-center text-center px-5 py-7 sm:py-8 rounded-2xl ${
        rank === 1 ? "prize-card-gold" : ""
      }`}
      style={{
        background: style.bgFill,
      }}
    >
      {/* Emoji — soft radial glow behind, no ring border */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.12, type: "spring", stiffness: 200, damping: 12 }}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-4 relative"
        style={{
          background: `radial-gradient(circle, ${style.dimColor}, transparent 70%)`,
        }}
      >
        {tier.emoji}
      </motion.div>

      {/* Rank label */}
      <p
        className="font-display text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-80"
        style={{ color: style.textColor }}
      >
        {tier.label}
      </p>

      {/* Prize amount — the hero element */}
      <motion.p
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.2, type: "spring", stiffness: 180 }}
        className="font-display text-3xl sm:text-4xl font-black leading-none"
        style={{ color: style.textColor }}
      >
        {tier.amount.replace(" $NUT", "")}
      </motion.p>
      <p className="text-[10px] sm:text-xs text-[var(--color-cream-dim)] mt-1.5 font-mono tracking-wider opacity-50">
        $NUT / week
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WeeklyPrizes — Full section
   ───────────────────────────────────────────────────────────── */
export function WeeklyPrizes() {
  const { isConnected } = useWalletStore();

  return (
    <section id="prizes" className="py-20 md:py-28 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 60% 45% at 50% 40%, rgba(251,191,36,0.05) 0%, transparent 70%)",
            "radial-gradient(ellipse 40% 35% at 30% 65%, rgba(245,196,66,0.02) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      <div className="container-main relative z-10">
        {/* Section header — no bordered badge pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-5">
            <Trophy size={15} className="text-[var(--color-gold)] opacity-60" />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-gold)] opacity-60">
              Weekly Prizes
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            500K $NUT Every Week
          </h2>
          <p className="text-[var(--color-cream-dim)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Top 3 players on the weekly leaderboard win real $NUT tokens.
            Play any game, climb the ranks, claim your prize.
          </p>
        </motion.div>

        {/* Prize podium — no borders, just fills and typography */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto mb-14">
          {/* Desktop: 2-1-3 podium order. Mobile: 1-2-3 */}
          <div className="sm:order-2 sm:transform sm:-translate-y-5">
            <PrizeCard rank={1} delay={0.1} />
          </div>
          <div className="sm:order-1 sm:mt-8">
            <PrizeCard rank={2} delay={0.2} />
          </div>
          <div className="sm:order-3 sm:mt-8">
            <PrizeCard rank={3} delay={0.3} />
          </div>
        </div>

        {/* Bottom CTA — clean inline, no callout box */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6 text-center"
        >
          {/* Total pool — just text, no box */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-cream-dim)] opacity-60">
              Total Weekly Pool:
            </span>
            <span className="font-display font-black text-[var(--color-gold)] text-base">
              500,000 $NUT
            </span>
          </div>

          {/* Separator dot — desktop only */}
          <span className="hidden sm:block w-1 h-1 rounded-full bg-[var(--color-cream-dim)] opacity-20" />

          {!isConnected && (
            <motion.a
              href="#how-to-get"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-sm transition-transform"
            >
              <Wallet size={16} />
              Connect & Start Earning
              <ArrowRight size={14} />
            </motion.a>
          )}

          {isConnected && (
            <motion.a
              href="/leaderboard/"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[var(--color-gold)] font-bold text-sm hover:bg-[rgba(251,191,36,0.06)] transition-colors"
            >
              <Trophy size={16} />
              View Leaderboard
              <ArrowRight size={14} />
            </motion.a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
