"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Wallet,
  Gift,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";

/* ─────────────────────────────────────────────────────────────
   Prizes — the weekly $NUT hoard + connect CTA, merged.

   Replaces the old PrizeTiers + WalletCTA pair (which said the same
   "500K / Top 3 / connect" thing twice in a row). One section now:
   the promise, the three tiers, and a single connect action.

   Deliberately NOT the old sci-fi build — no constellation field,
   no 24 animated stars, no energy rings, no fake "data streams."
   Degen-skinned (it's a nut hoard), one soft glow, light entrances.
   ───────────────────────────────────────────────────────────── */

const TIERS = [
  { rank: "1st", amount: "250K", medal: "🥇", color: "#FBBF24" },
  { rank: "2nd", amount: "150K", medal: "🥈", color: "#C0C0C0" },
  { rank: "3rd", amount: "100K", medal: "🥉", color: "#CD7F32" },
];

const PERKS = [
  {
    icon: Trophy,
    title: "Crack the Top 3",
    desc: "Climb the weekly leaderboard. Top 3 take the hoard.",
    color: "#FBBF24",
  },
  {
    icon: Gift,
    title: "500K $NUT, every week",
    desc: "The pool resets every Monday. New week, new shot.",
    color: "#10B981",
  },
  {
    icon: TrendingUp,
    title: "Every score tracked",
    desc: "Personal bests and live rank across all games.",
    color: "#a855f7",
  },
];

export function Prizes() {
  const { isConnected, isConnecting, connect, address } = useWalletStore();
  const connected = isConnected && Boolean(address);

  return (
    <section id="prizes" className="py-16 md:py-20 relative overflow-hidden">
      {/* Single soft glow — replaces the old multi-layer star/ring stack */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 38%, rgba(251,191,36,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="container-main relative z-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-12 md:mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy size={15} className="text-[var(--color-gold)] opacity-70" />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-gold)] opacity-70">
              The Weekly Nut Hoard
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black gradient-text-gold mb-4">
            500K $NUT, Split Every Week
          </h2>
          <p className="text-[var(--color-cream-dim)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Crack the weekly leaderboard&apos;s top 3 and split the hoard. Free
            to play — no buy-in, no catch.
          </p>
        </motion.div>

        {/* ── Three tiers — clean cards (no holograms) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.rank}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: "easeOut" }}
              className={`relative rounded-2xl p-6 text-center ${
                tier.rank === "1st" ? "sm:-translate-y-3" : ""
              }`}
              style={{
                background: "rgba(1, 5, 8, 0.55)",
                border: `1px solid color-mix(in srgb, ${tier.color} 28%, transparent)`,
                boxShadow:
                  tier.rank === "1st"
                    ? `0 0 28px color-mix(in srgb, ${tier.color} 18%, transparent)`
                    : "0 2px 16px rgba(0,0,0,0.4)",
              }}
            >
              <div className="text-3xl mb-2" aria-hidden="true">
                {tier.medal}
              </div>
              <p
                className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2 opacity-70"
                style={{ color: tier.color }}
              >
                {tier.rank} Place
              </p>
              <p
                className="font-display text-3xl font-black"
                style={{ color: tier.color }}
              >
                {tier.amount}
              </p>
              <p className="text-xs text-[var(--color-cream-dim)] mt-1">$NUT</p>
            </motion.div>
          ))}
        </div>

        {/* ── Total pool line ── */}
        <p className="text-center text-sm text-[var(--color-cream-dim)] mb-12">
          <span className="opacity-60">Total weekly pool: </span>
          <span className="font-bold text-[var(--color-gold)]">
            500,000 $NUT
          </span>
        </p>

        {/* ── Perks row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col items-center text-center sm:items-start sm:text-left p-4 rounded-xl"
              style={{ background: "rgba(1, 5, 8, 0.4)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{
                  background: `color-mix(in srgb, ${perk.color} 12%, transparent)`,
                }}
              >
                <perk.icon
                  size={18}
                  style={{ color: perk.color }}
                  strokeWidth={2.5}
                />
              </div>
              <p
                className="font-display font-bold text-sm mb-1"
                style={{ color: perk.color }}
              >
                {perk.title}
              </p>
              <p className="text-xs text-[var(--color-cream-dim)] leading-relaxed">
                {perk.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Single CTA ── */}
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
                  Wallet connected — keep climbing
                </span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="/leaderboard/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--color-gold)] hover:bg-[rgba(251,191,36,0.06)] transition-colors"
                >
                  <Trophy size={15} />
                  View Leaderboard
                </a>
                <a
                  href="/profile/"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--color-neon-green)] hover:bg-[rgba(16,185,129,0.06)] transition-colors"
                >
                  <Gift size={15} />
                  Rewards
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
                  boxShadow: "0 0 30px rgba(251,191,36,0.35)",
                }}
                whileTap={{ scale: 0.97 }}
                className="wallet-cta-button-v3 relative inline-flex items-center gap-3 px-8 py-4 sm:px-12 sm:py-5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-brand-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-display font-black text-base sm:text-lg tracking-wide transition-all disabled:opacity-50 cursor-pointer"
              >
                <Wallet size={22} strokeWidth={2.5} />
                <span>
                  {isConnecting ? "Connecting…" : "See If You're in the Top 3"}
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
                  Xaman · GemWallet · Crossmark
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
