"use client";

import { motion } from "framer-motion";
import { Trophy, Wallet, ArrowRight } from "lucide-react";
import { HologramProjector } from "@/components/ui/HologramProjector";
import { useWalletStore } from "@/store/wallet";

/* ─────────────────────────────────────────────────────────────
   PrizeTiers — Holographic Vault v2

   Three HologramProjectors in a 3D perspective podium layout.
   Side projectors are rotated on the Y axis for depth.

   Background layers:
   - Constellation dot pattern (CSS class)
   - Triple radial glow (gold / silver / bronze)
   - Animated energy ring pulse at top

   Bottom: Total pool display (large glow text) + CTA
   ───────────────────────────────────────────────────────────── */

/* Data stream labels — more descriptive, sci-fi */
const DATA_STREAMS = {
  1: ["prize_pool", "verified", "ready_to_claim", "instant_payout"],
  2: ["wallet_verified", "blockchain_confirmed", "rank_eligible", "xrpl_mainnet"],
  3: ["smart_contract", "auto_deploy", "on_chain", "trust_line"],
};

export function PrizeTiers() {
  const { isConnected } = useWalletStore();

  return (
    <section
      id="prizes"
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* ── Layer 0: Deep space gradient ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(1,5,8,1) 0%, rgba(3,8,12,1) 30%, rgba(5,10,15,1) 50%, rgba(3,8,12,1) 70%, rgba(1,5,8,1) 100%)",
        }}
      />

      {/* ── Layer 1: Constellation dot pattern ── */}
      <div className="absolute inset-0 z-[1] constellation-bg opacity-30 pointer-events-none" />

      {/* ── Layer 2: Triple radial glow (one per tier) ── */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 50% 50% at 50% 48%, rgba(251,191,36,0.06) 0%, transparent 65%)",
            "radial-gradient(ellipse 25% 35% at 22% 55%, rgba(192,192,192,0.03) 0%, transparent 55%)",
            "radial-gradient(ellipse 25% 35% at 78% 55%, rgba(205,127,50,0.03) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      {/* ── Layer 3: Constellation stars (animated) ── */}
      <div className="absolute inset-0 z-[3] pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const size = i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                background:
                  i % 7 === 0
                    ? "rgba(192,192,192,0.3)"
                    : "rgba(251,191,36,0.25)",
                left: `${5 + ((i * 37 + 13) % 90)}%`,
                top: `${8 + ((i * 53 + 7) % 84)}%`,
              }}
              animate={{ opacity: [0.1, 0.5, 0.1] }}
              transition={{
                duration: 3 + (i % 4),
                repeat: Infinity,
                delay: (i * 0.4) % 3,
              }}
            />
          );
        })}
      </div>

      {/* ── Energy ring pulse at top ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[4] pointer-events-none">
        <div
          className="w-[800px] h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.3) 30%, rgba(251,191,36,0.5) 50%, rgba(251,191,36,0.3) 70%, transparent 100%)",
          }}
        />
        {/* Expanding ping ring */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] rounded-full"
          style={{
            width: 1000,
            background:
              "linear-gradient(90deg, transparent, rgba(251,191,36,0.12), transparent)",
          }}
          animate={{ opacity: [0.4, 0, 0.4], scaleX: [0.6, 1.2, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container-main relative z-10">
        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-16 md:mb-20"
        >
          <div className="flex items-center justify-center gap-2 mb-5">
            <Trophy
              size={15}
              className="text-[var(--color-gold)] opacity-60"
            />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[var(--color-gold)] opacity-60">
              Treasure Vault
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black gradient-text-gold mb-4">
            500K $NUT Every Week
          </h2>
          <p className="text-[var(--color-cream-dim)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Top 3 players on the weekly leaderboard unlock their share of the
            holographic vault.
          </p>
        </motion.div>

        {/* ── Energy divider line ── */}
        <motion.div
          className="h-px max-w-2xl mx-auto mb-14 md:mb-20"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.2) 30%, rgba(16,185,129,0.15) 50%, rgba(251,191,36,0.2) 70%, transparent 100%)",
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* ── 3D Perspective Podium: 2nd → 1st → 3rd ── */}
        <div
          className="flex flex-col sm:flex-row justify-center items-center sm:items-end gap-8 sm:gap-6 lg:gap-12 max-w-5xl mx-auto mb-20 md:mb-24"
          style={{ perspective: 1200 }}
        >
          {/* 2nd Place — rotated slightly toward center */}
          <motion.div
            className="flex justify-center sm:mt-8"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(12deg)",
            }}
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            <HologramProjector
              amount={150_000}
              rank="2nd"
              label="2nd Place"
              size="md"
              dataStream={DATA_STREAMS[2]}
              delay={0.2}
            />
          </motion.div>

          {/* 1st Place — center, largest, no rotation */}
          <motion.div
            className="flex justify-center sm:-translate-y-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.7 }}
          >
            <HologramProjector
              amount={250_000}
              rank="1st"
              label="1st Place"
              size="lg"
              dataStream={DATA_STREAMS[1]}
              delay={0}
            />
          </motion.div>

          {/* 3rd Place — rotated slightly toward center */}
          <motion.div
            className="flex justify-center sm:mt-8"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(-12deg)",
            }}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            <HologramProjector
              amount={100_000}
              rank="3rd"
              label="3rd Place"
              size="md"
              dataStream={DATA_STREAMS[3]}
              delay={0.3}
            />
          </motion.div>
        </div>

        {/* ── Total pool display (prominent) ── */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[var(--color-cream-dim)] text-xs sm:text-sm uppercase tracking-[0.2em] mb-3 opacity-50">
            Total Weekly Pool
          </p>
          <p
            className="font-display text-4xl sm:text-5xl font-black text-[var(--color-gold)]"
            style={{
              textShadow:
                "0 0 30px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.2)",
            }}
          >
            500,000 $NUT
          </p>
        </motion.div>

        {/* ── Energy divider line ── */}
        <motion.div
          className="h-px max-w-xl mx-auto mb-8"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.15) 30%, rgba(16,185,129,0.1) 50%, rgba(251,191,36,0.15) 70%, transparent 100%)",
          }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        />

        {/* ── CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          {!isConnected && (
            <motion.a
              href="#how-to-get"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-sm transition-transform"
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
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[var(--color-gold)] font-bold text-sm hover:bg-[rgba(251,191,36,0.06)] transition-colors"
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
