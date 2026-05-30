"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Globe } from "lucide-react";
import Image from "next/image";
import { gameRegistry } from "@/lib/gameRegistry";
import { formatUsd } from "@/lib/format";
import { API_REWARDS } from "@/features/arcade/constants";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import { PriceTicker } from "@/components/home/PriceTicker";

/* ─────────────────────────────────────────────────────────────
   Hero — Foreground content only.

   The hero photo is rendered at page level by <HeroBackground/>.
   This component is the centered HUD overlay (logo, title,
   CTAs, stats, vault teaser, scroll cue).
   ───────────────────────────────────────────────────────────── */

const FLOAT_ANIMATION = {
  y: [0, -12, 0],
  rotate: [0, -3, 3, 0],
};

export function Hero() {
  const [weekTiers, setWeekTiers] = useState<WeeklyTiersResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/tiers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setWeekTiers(d); })
      .catch(() => { if (!cancelled) setWeekTiers(null); });
    return () => { cancelled = true; };
  }, []);
  const poolUsd = (weekTiers?.tiers ?? []).reduce((s, t) => s + (t.usd_value || 0), 0);
  const poolLabel = weekTiers?.tiers ? formatUsd(poolUsd) : "Real $NUT";

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
    >
      <div className="relative z-20 flex flex-col items-center text-center px-4 pt-24 pb-16">
        {/* ── Floating nut particles ── */}
        <span className="absolute top-20 left-[15%] text-2xl float-nut-1 opacity-50 pointer-events-none">🥜</span>
        <span className="absolute top-32 right-[12%] text-xl float-nut-2 opacity-40 pointer-events-none" style={{ animationDelay: "0.8s" }}>🥜</span>
        <span className="absolute top-16 right-[35%] text-lg float-nut-3 opacity-35 pointer-events-none" style={{ animationDelay: "1.5s" }}>🥜</span>

        {/* ── Logo ── */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.15,
          }}
          className="mb-4"
        >
          <motion.div
            animate={FLOAT_ANIMATION}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => { document.getElementById("games")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
            role="button"
            tabIndex={0}
            aria-label="Enter the FuzzyNuts arcade"
            className="inline-block cursor-pointer drop-shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-[filter] duration-300 hover:drop-shadow-[0_0_44px_rgba(251,191,36,0.7)]"
          >
            <Image
              src="/images/branding/logo.webp"
              alt="Fuzzynuts mascot — pixel art squirrel with sunglasses holding an acorn"
              width={160}
              height={107}
              className="w-24 h-auto sm:w-32 md:w-36"
              priority
            />
          </motion.div>
        </motion.div>

        {/* ── Title ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-3 flex flex-col items-center"
          aria-label="Fuzzynuts"
        >
          <Image
            src="/images/branding/wordmarks/text_logo.png"
            alt="Fuzzynuts"
            width={473}
            height={89}
            className="h-8 sm:h-11 md:h-14 lg:h-16 w-auto drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            priority
          />
        </motion.div>

        {/* ── Tagline ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-2xl md:text-3xl font-display font-black gradient-text-gold mb-1"
        >
          Go Nuts. Get Paid.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="font-mono text-[11px] sm:text-sm uppercase tracking-[0.35em] text-brand-gold text-hero-glow mb-3"
        >
          Nut up or shut up
        </motion.p>

        {/* ── Description ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-sm sm:text-base md:text-lg text-[var(--color-cream)] max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
        >
          Free-to-play arcade on the XRP Ledger that pays out real $NUT every
          single week. The nuttiest coin in crypto, built by degens who refuse
          to take it seriously. Top the board, bag the bag.
        </motion.p>

        {/* ── CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <motion.a
            href="#games"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("games")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            whileHover={{
              scale: 1.06,
              boxShadow: "0 0 44px rgba(251,191,36,0.55), 0 0 80px rgba(251,191,36,0.25)",
            }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-forest-dark font-black text-base sm:text-lg transition-all shadow-[0_0_20px_rgba(251,191,36,0.3),0_0_40px_rgba(251,191,36,0.15)] animate-float"
          >
            <Globe size={18} />
            Enter World
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              →
            </motion.span>
          </motion.a>

          <motion.button
            type="button"
            onClick={() =>
              document
                .getElementById("games")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            whileHover={{
              scale: 1.06,
              boxShadow: "0 0 30px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.15)",
            }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-md text-brand-gold font-black text-base sm:text-lg border-2 border-brand-gold/40 bg-[#0a0a0a] shadow-[0_0_14px_rgba(251,191,36,0.2),inset_0_1px_0_rgba(251,191,36,0.1)]"
          >
            <Gamepad2 size={18} />
            Play Arcade
          </motion.button>
        </motion.div>

        {/* ── Stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-10 grid grid-cols-3 gap-3 max-w-lg mx-auto"
        >
          {[
            { value: "321B", label: "Total Supply" },
            {
              value: String(gameRegistry.getAllLive().length),
              label: "Games Live",
            },
            { value: "80%", label: "In Liquidity" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center rounded-md px-2 py-2 bg-[#0a0a0a] border-2 border-brand-gold/30 shadow-[0_0_15px_rgba(251,191,36,0.12),0_0_30px_rgba(251,191,36,0.06),inset_0_1px_0_rgba(251,191,36,0.1)]"
            >
              <p className="text-xl sm:text-2xl md:text-3xl font-display font-black gradient-text-gold">
                {stat.value}
              </p>
              <p className="text-[10px] sm:text-xs text-[var(--color-cream-dim)] mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* ── Live price / market cap + Chart & Buy CTAs ── */}
        <PriceTicker />

        {/* ── Prize teaser ── */}
        <motion.a
          href="#prizes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(251,191,36,0.35), 0 0 60px rgba(251,191,36,0.15)" }}
          whileTap={{ scale: 0.98 }}
          className="group mt-9 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-[#0a0a0a] border-2 border-brand-gold/30 text-sm sm:text-base shadow-[0_0_18px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(251,191,36,0.1)]"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
          <span className="text-[var(--color-cream)]">
            <span className="font-bold text-brand-gold">{poolLabel}</span>{" "}
            in weekly prizes — top 3 split the pool
          </span>
          <ArrowRight
            size={15}
            className="text-brand-gold opacity-70 transition-transform group-hover:translate-x-0.5"
          />
        </motion.a>
      </div>
    </section>
  );
}

export default Hero;
