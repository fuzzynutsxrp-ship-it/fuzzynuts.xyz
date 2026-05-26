"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Gamepad2, Globe } from "lucide-react";
import Image from "next/image";
import { gameRegistry } from "@/lib/gameRegistry";

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
          <motion.div
            animate={FLOAT_ANIMATION}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="inline-block drop-shadow-[0_0_30px_rgba(245,196,66,0.5)]"
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
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-2xl md:text-3xl font-display font-semibold text-[var(--color-gold)] mb-3"
        >
          Play. Earn. Own.
        </motion.p>

        {/* ── Description ── */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-sm sm:text-base md:text-lg text-[var(--color-cream)] max-w-2xl mx-auto mb-8 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
        >
          Free arcade games on the XRP Ledger that pay out real $NUT every week.
          The nuttiest meme coin in crypto — built by degens who refuse to take
          it seriously.
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
            whileHover={{
              scale: 1.06,
              boxShadow: "0 0 40px rgba(245,196,66,0.55)",
            }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-base sm:text-lg transition-all shadow-[0_8px_30px_rgba(245,196,66,0.35)] animate-float"
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
            className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-[var(--color-gold)] font-bold text-base sm:text-lg border border-[rgba(251,191,36,0.35)] backdrop-blur-sm bg-[rgba(1,5,8,0.35)]"
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
              className="text-center rounded-xl px-2 py-2 bg-[rgba(1,5,8,0.35)] backdrop-blur-sm border border-[var(--color-glass-border-faint)]"
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

        {/* ── Prize teaser (compact) ── the full Top-3 pitch + connect CTA
              live in the Prizes section; the hero just points there. */}
        <motion.a
          href="#prizes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="group mt-9 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[rgba(1,5,8,0.55)] backdrop-blur-md border border-[rgba(251,191,36,0.25)] text-sm sm:text-base"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
          <span className="text-[var(--color-cream)]">
            <span className="font-bold text-[var(--color-gold)]">500K $NUT</span>{" "}
            in weekly prizes — top 3 split the pool
          </span>
          <ArrowRight
            size={15}
            className="text-[var(--color-gold)] opacity-70 transition-transform group-hover:translate-x-0.5"
          />
        </motion.a>

        {/* ── Scroll cue ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8"
        >
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("games")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="inline-flex flex-col items-center text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors"
            aria-label="Scroll to games"
          >
            <span className="text-[10px] sm:text-xs mb-1.5 tracking-widest uppercase">
              Explore Arcade
            </span>
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
              }}
            >
              <ArrowDown size={20} />
            </motion.span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
