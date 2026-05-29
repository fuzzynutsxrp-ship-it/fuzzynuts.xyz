"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Globe } from "lucide-react";
import Image from "next/image";
import { gameRegistry } from "@/lib/gameRegistry";
// DEGEN OVERHAUL — formatter from the lean @/lib/format module
import { formatUsd } from "@/lib/format";
import { API_REWARDS } from "@/features/arcade/constants";
import type { WeeklyTiersResponse } from "@/features/arcade/types/arcade";
import { PriceTicker } from "@/components/home/PriceTicker";

/* ─────────────────────────────────────────────────────────────
   Hero — Foreground content only.

   The hero photo (`herobackground3.jpg`) is now rendered at the
   page level by <HeroBackground/> in src/app/page.tsx with a
   `fixed inset-0` wrapper, so it sits behind the ENTIRE page
   and is visible everywhere the content scrolls past it.
   This component is just the centered HUD overlay (logo, title,
   CTAs, stats, vault teaser, scroll cue).

   Zero Three.js, zero R3F, zero canvas. Just framer-motion for
   entrance animations + lucide-react icons.
   ───────────────────────────────────────────────────────────── */

const FLOAT_ANIMATION = {
  y: [0, -12, 0],
  rotate: [0, -3, 3, 0],
};

export function Hero() {
  // Live weekly prize pool from the Monday snapshot (keeps the pill in sync
  // with the Prizes section instead of a hardcoded number).
  const [weekTiers, setWeekTiers] = useState<WeeklyTiersResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/tiers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setWeekTiers(d); })
      .catch(() => { if (!cancelled) setWeekTiers(null); });
    return () => { cancelled = true; };
  }, []);
  // USD-fixed pool (the NUT amount is recalculated weekly from the snapshot,
  // so the pill must show the USD value, not a "fixed NUT" number).
  const poolUsd = (weekTiers?.tiers ?? []).reduce((s, t) => s + (t.usd_value || 0), 0);
  const poolLabel = weekTiers?.tiers ? formatUsd(poolUsd) : "Real $NUT";

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
    >
      {/* Hero sizes to its content (no forced viewport height). A
          `min-h-[100svh]` here used to lock the section to one viewport
          tall; because viewport units scale with browser zoom, at low
          zoom (e.g. 25%) the hero ballooned to several screens tall and
          the header floated far away from the rest of the page. Content
          height keeps the header packed with everything below it at every
          zoom level. pt-24 clears the fixed Navbar. */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 pt-24 pb-16">
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
          {/* DEGEN OVERHAUL START — central mascot: keep the framer float,
              add hover neon-pink glow + tap squish, make it tap-to-play.
              (Glow via CSS filter so it never fights the framer transform.) */}
          <motion.div
            animate={FLOAT_ANIMATION}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => { window.location.href = "/games/fuzzynuts-world/"; }}
            role="button"
            tabIndex={0}
            aria-label="Enter the FuzzyNuts arcade"
            className="inline-block cursor-pointer drop-shadow-[0_0_30px_rgba(245,196,66,0.5)] transition-[filter] duration-300 hover:drop-shadow-[0_0_44px_rgba(255,46,136,0.75)]"
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
          {/* DEGEN OVERHAUL END */}
        </motion.div>

        {/* ── Title — text_logo.png wordmark sized at ~25% of the
              previous heights. Hero now leads with the squirrel
              mascot, then a compact wordmark, then the tagline.
              The "Live on XRPL Mainnet" badge and the ($NUT)
              subtitle were removed at the user's request. ── */}
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
            className="h-8 sm:h-11 md:h-14 lg:h-16 w-auto drop-shadow-[0_0_30px_rgba(245,196,66,0.5)]"
            priority
          />
        </motion.div>

        {/* ── Tagline ── */}
        {/* DEGEN OVERHAUL START — gradient tagline + degen kicker */}
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
          className="font-mono text-[11px] sm:text-sm uppercase tracking-[0.35em] text-[var(--color-hot-pink)] text-pink-glow mb-3"
        >
          Nut up or shut up
        </motion.p>
        {/* DEGEN OVERHAUL END */}

        {/* ── Description ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-sm sm:text-base md:text-lg text-[var(--color-cream)] max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
        >
          {/* DEGEN OVERHAUL — edgier copy, same facts (free arcade, XRPL, weekly $NUT) */}
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
            href="/games/fuzzynuts-world/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/games/fuzzynuts-world/";
            }}
            // DEGEN OVERHAUL START — gold→hot-pink CTA, pink hover bloom
            whileHover={{
              scale: 1.06,
              boxShadow: "0 0 44px rgba(255,46,136,0.6)",
            }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] text-[var(--color-degen-black)] font-black text-base sm:text-lg transition-all shadow-[0_8px_30px_rgba(255,46,136,0.35)] animate-float"
            // DEGEN OVERHAUL END
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
              backgroundColor: "rgba(245,196,66,0.18)",
            }}
            whileTap={{ scale: 0.97 }}
            // DEGEN OVERHAUL — Play Arcade: kill glass. Solid degen-950, thick 2 px gold border, sharp 6 px corners, outer gold glow
            className="group flex items-center gap-2 px-7 py-3.5 rounded-md text-[var(--color-gold)] font-black text-base sm:text-lg border-2 border-[var(--color-gold)] bg-degen-950 shadow-[0_0_14px_rgba(251,191,36,0.3)]"
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
              // DEGEN OVERHAUL — stats boxes: solid degen-950, thick 2 px subtle hot-pink border, sharp 6 px corners
              className="text-center rounded-md px-2 py-2 bg-degen-950 border-2 border-hot-pink/40 shadow-[0_0_10px_rgba(255,46,136,0.22)]"
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

        {/* ── Prize teaser (compact) ── the full Top-3 pitch + connect CTA
              live in the Prizes section; the hero just points there. */}
        <motion.a
          href="#prizes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          // DEGEN OVERHAUL — weekly prize teaser ("$0.10 in weekly prizes — top 3 split the pool"):
          // kill glass pill. Solid degen-950, thick 2 px gold border, sharp 6 px corners, outer gold glow.
          className="group mt-9 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-degen-950 border-2 border-[var(--color-gold)] text-sm sm:text-base shadow-[0_0_18px_rgba(251,191,36,0.35)]"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
          <span className="text-[var(--color-cream)]">
            <span className="font-bold text-[var(--color-gold)]">{poolLabel}</span>{" "}
            in weekly prizes — top 3 split the pool
          </span>
          <ArrowRight
            size={15}
            className="text-[var(--color-gold)] opacity-70 transition-transform group-hover:translate-x-0.5"
          />
        </motion.a>
      </div>
    </section>
  );
}

export default Hero;
