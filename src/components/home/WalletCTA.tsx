"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  Trophy,
  Gift,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";

/* ─────────────────────────────────────────────────────────────
   WalletCTA v3 — Refined persuasion with restraint

   Changes from v2:
   - Removed shimmer overlay on card (too glassy)
   - Urgency badge simplified (no pulsing animation)
   - Removed FOMO micro-line (felt spammy)
   - Button copy changed: "See If I'm in the Top 3" (personal + action-oriented)
   - Benefit cards use darker bg, no hover glow layer (cleaner)
   - Fewer stacked animations overall
   - Card background uses subtler gradient, lower blur
   ───────────────────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: Trophy,
    title: "Check If You're in the Top 3",
    desc: "Your rank may already qualify — you just can't see it yet.",
    color: "#FBBF24",
  },
  {
    icon: Gift,
    title: "Claim 500K $NUT Weekly",
    desc: "Top 3 players split the prize pool every single week.",
    color: "#10B981",
  },
  {
    icon: TrendingUp,
    title: "Track Scores Across All Games",
    desc: "Full history, personal bests, and live rank tracking.",
    color: "#a855f7",
  },
];

export function WalletCTA() {
  const { isConnected, isConnecting, connect, address } = useWalletStore();

  if (isConnected && address) {
    return (
      <section className="py-12 relative" aria-label="Wallet connected">
        <div className="container-main">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="max-w-2xl mx-auto text-center px-6 py-6 rounded-2xl"
            style={{
              background: "rgba(16,185,129,0.04)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
              <span className="text-sm font-medium text-[var(--color-neon-green)]">
                Wallet Connected
              </span>
            </div>
            <p className="text-sm text-[var(--color-cream-dim)] mb-4">
              Your scores are being tracked. Keep playing to climb the
              leaderboard!
            </p>
            <div className="flex items-center justify-center gap-3">
              <motion.a
                href="/leaderboard/"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-[var(--color-gold)] hover:bg-[rgba(251,191,36,0.06)] transition-colors"
              >
                <Trophy size={14} />
                Leaderboard
              </motion.a>
              <motion.a
                href="/profile/"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-[var(--color-neon-green)] hover:bg-[rgba(16,185,129,0.06)] transition-colors"
              >
                <Gift size={14} />
                Rewards
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-16 md:py-24 relative overflow-hidden"
      aria-label="Connect wallet"
    >
      {/* ── Ambient background — single soft glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(251,191,36,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="container-main relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          {/* ── Main Card — dark with thin accent border ── */}
          <div className="relative rounded-2xl overflow-hidden wallet-cta-card-v3">
            {/* Thin accent line at top */}
            <div className="wallet-cta-topline" />

            <div className="relative z-10 p-5 sm:p-8 md:p-12 lg:p-14">
              {/* ── Header ── */}
              <div className="text-center mb-8 sm:mb-10">
                {/* Simple urgency line — no animation */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{
                    background: "rgba(251,191,36,0.06)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] animate-pulse" />
                  <span className="text-xs font-bold tracking-widest uppercase text-[var(--color-gold)]">
                    This week&apos;s prizes are live
                  </span>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[var(--color-cream)] mb-4 leading-tight"
                >
                  Are You in the{" "}
                  <span className="gradient-text-gold">Top 3</span>?
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-[var(--color-cream-dim)] text-sm sm:text-base md:text-lg max-w-lg mx-auto leading-relaxed"
                >
                  Connect your wallet to see your rank and claim your share
                  of{" "}
                  <span className="text-[var(--color-gold)] font-semibold">
                    500,000 $NUT
                  </span>{" "}
                  in weekly prizes.
                </motion.p>
              </div>

              {/* ── Benefit Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
                {BENEFITS.map((benefit, i) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
                    whileHover={{ y: -4 }}
                    className="p-4 sm:p-5 rounded-xl transition-transform"
                    style={{
                      background: "rgba(1, 5, 8, 0.5)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{
                        background: `color-mix(in srgb, ${benefit.color} 12%, transparent)`,
                      }}
                    >
                      <benefit.icon
                        size={18}
                        style={{ color: benefit.color }}
                        strokeWidth={2.5}
                      />
                    </div>
                    <p
                      className="font-display font-bold text-sm mb-1"
                      style={{ color: benefit.color }}
                    >
                      {benefit.title}
                    </p>
                    <p className="text-xs text-[var(--color-cream-dim)] leading-relaxed">
                      {benefit.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* ── CTA ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <motion.button
                  onClick={() => connect("xaman")}
                  disabled={isConnecting}
                  whileHover={{
                    scale: 1.03,
                    boxShadow:
                      "0 0 30px rgba(251,191,36,0.35)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="wallet-cta-button-v3 relative inline-flex items-center gap-3 px-8 py-4 sm:px-12 sm:py-5 md:px-14 md:py-5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] via-[var(--color-brand-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-display font-black text-base sm:text-lg md:text-xl tracking-wide transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Wallet size={22} strokeWidth={2.5} />
                  <span>
                    {isConnecting
                      ? "Connecting…"
                      : "See If I'm in the Top 3"}
                  </span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.button>

                <p className="mt-3 text-xs text-[var(--color-cream-dim)] opacity-60">
                  Free · 10 seconds · Read-only
                </p>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-[var(--color-cream-dim)]">
                    <ShieldCheck
                      size={13}
                      className="text-[var(--color-neon-green)]"
                    />
                    <span className="text-xs">No transactions required</span>
                  </div>
                  <span className="text-xs text-[var(--color-cream-dim)] opacity-50">
                    Xaman · Joey
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
