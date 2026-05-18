"use client";

import { motion } from "framer-motion";
import { Trophy, Wallet, ArrowRight } from "lucide-react";
import { PRIZE_TIERS } from "@/features/arcade";
import { useWalletStore } from "@/store/wallet";

/* ─────────────────────────────────────────────────────────────
   Prize Podium Card — Individual prize tier display
   ───────────────────────────────────────────────────────────── */

const PODIUM_STYLES: Record<number, {
  gradient: string;
  glow: string;
  borderColor: string;
  textColor: string;
  ringColor: string;
}> = {
  1: {
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(245,196,66,0.03) 100%)",
    glow: "0 0 24px rgba(251,191,36,0.12), 0 0 50px rgba(251,191,36,0.03)",
    borderColor: "rgba(251,191,36,0.25)",
    textColor: "#FBBF24",
    ringColor: "rgba(251,191,36,0.3)",
  },
  2: {
    gradient: "linear-gradient(135deg, rgba(192,192,192,0.08) 0%, rgba(192,192,192,0.02) 100%)",
    glow: "0 0 20px rgba(192,192,192,0.08)",
    borderColor: "rgba(192,192,192,0.18)",
    textColor: "#C0C0C0",
    ringColor: "rgba(192,192,192,0.25)",
  },
  3: {
    gradient: "linear-gradient(135deg, rgba(205,127,50,0.08) 0%, rgba(205,127,50,0.02) 100%)",
    glow: "0 0 20px rgba(205,127,50,0.08)",
    borderColor: "rgba(205,127,50,0.18)",
    textColor: "#CD7F32",
    ringColor: "rgba(205,127,50,0.25)",
  },
};

function PrizeCard({ rank, delay }: { rank: number; delay: number }) {
  const tier = PRIZE_TIERS[rank];
  const style = PODIUM_STYLES[rank];
  if (!tier || !style) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
      className={`relative flex flex-col items-center text-center p-6 rounded-2xl ${
        rank === 1 ? "prize-card-gold" : ""
      }`}
      style={{
        background: style.gradient,
        border: `1px solid ${style.borderColor}`,
        boxShadow: style.glow,
      }}
    >
      {/* Rank emoji circle */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.15, type: "spring", stiffness: 200, damping: 12 }}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-3 relative"
        style={{
          background: `radial-gradient(circle, ${style.borderColor}, transparent 70%)`,
          boxShadow: `0 0 12px ${style.ringColor}`,
        }}
      >
        {tier.emoji}
        {/* Glowing ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${style.ringColor}`,
            animation: rank === 1 ? "pulse-gold 3s ease-in-out infinite" : undefined,
          }}
        />
      </motion.div>

      {/* Label */}
      <p
        className="font-display text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: style.textColor }}
      >
        {tier.label}
      </p>

      {/* Amount — big and bold */}
      <motion.p
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.25, type: "spring", stiffness: 180 }}
        className="font-display text-2xl md:text-3xl font-black"
        style={{ color: style.textColor }}
      >
        {tier.amount.replace(" $NUT", "")}
      </motion.p>
      <p className="text-xs text-[var(--color-cream-dim)] mt-1 font-mono tracking-wider">
        $NUT / week
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WeeklyPrizes — Full section for the homepage
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
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(251,191,36,0.06) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 40% at 30% 60%, rgba(245,196,66,0.03) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 40% at 70% 60%, rgba(16,185,129,0.03) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.15)",
              color: "var(--color-gold)",
            }}
          >
            <Trophy size={14} />
            Weekly Prizes
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            500K $NUT Every Week
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Top 3 players on the weekly leaderboard win real $NUT tokens.
            Play any game, climb the ranks, and claim your prize.
          </p>
        </motion.div>

        {/* Prize cards podium */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto mb-12">
          {/* On desktop: order 2-1-3 for podium effect; on mobile: 1-2-3 */}
          <div className="sm:order-2 sm:transform sm:-translate-y-4">
            <PrizeCard rank={1} delay={0.1} />
          </div>
          <div className="sm:order-1 sm:mt-6">
            <PrizeCard rank={2} delay={0.2} />
          </div>
          <div className="sm:order-3 sm:mt-6">
            <PrizeCard rank={3} delay={0.3} />
          </div>
        </div>

        {/* Total prize pool callout */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.12)]">
            <span className="text-lg">🏆</span>
            <div className="text-left">
              <p className="text-xs text-[var(--color-cream-dim)] font-medium">Total Weekly Pool</p>
              <p className="font-display font-black text-[var(--color-gold)]">500,000 $NUT</p>
            </div>
          </div>

          {!isConnected && (
            <motion.a
              href="#how-to-get"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-sm transition-all"
            >
              <Wallet size={16} />
              Connect & Start Earning
              <ArrowRight size={14} />
            </motion.a>
          )}

          {isConnected && (
            <motion.a
              href="/leaderboard/"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--color-gold)] text-[var(--color-gold)] font-bold text-sm hover:bg-[rgba(251,191,36,0.1)] transition-all"
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
