"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Gamepad2,
  Globe,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useWalletStore } from "@/store/wallet";
import { gameRegistry } from "@/lib/gameRegistry";
import { HeroBackground } from "./HeroBackground";

/* ─────────────────────────────────────────────────────────────
   Hero — CLEAN RESET.

   Zero Three.js, zero R3F, zero canvas, zero particle systems.
   Just:
     • HeroBackground   — static image w/ gradient mesh overlay
     • Framer Motion    — entrance animations for the foreground content
     • Lucide icons     — small SVGs already in the bundle

   Wallet connect lives in <Navbar/> (rendered by page.tsx).
   Scroll cue smooth-scrolls to the GamesShowcase section below.
   ───────────────────────────────────────────────────────────── */

const FLOAT_ANIMATION = {
  y: [0, -12, 0],
  rotate: [0, -3, 3, 0],
};

export function Hero() {
  const { isConnected, connect, isConnecting } = useWalletStore();

  return (
    <section
      id="hero"
      className="relative w-full min-h-[100svh] overflow-hidden bg-[var(--color-forest-dark)]"
    >
      {/* z-0 — background image + gradient mesh + vignette */}
      <HeroBackground />

      {/* z-20 — foreground content (no z-10 layer needed now) */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 pt-24 pb-12">
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

        {/* ── Badge ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase bg-[rgba(245,196,66,0.18)] backdrop-blur-sm text-[var(--color-gold)] border border-[rgba(251,191,36,0.25)]">
            🌰 Live on XRPL Mainnet
          </span>
        </motion.div>

        {/* ── Title ── */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-3"
        >
          <span className="gradient-text-gold text-hero-glow">Fuzzynuts</span>
          <br />
          <span className="text-[var(--color-cream)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            ($NUT)
          </span>
        </motion.h1>

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
          The nuttiest meme coin on the XRP Ledger. Play arcade games, earn real
          $NUT, and join a community of degens who refuse to take crypto
          seriously.
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

        {/* ── Vault teaser ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7 }}
          className="relative mt-10 max-w-xl mx-auto"
        >
          <div className="rounded-2xl px-5 py-4 sm:px-6 sm:py-5 bg-[rgba(1,5,8,0.55)] backdrop-blur-md border border-[rgba(251,191,36,0.25)] shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
              <span className="text-[var(--color-gold)] text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase">
                500,000 $NUT vault is live this week
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black mb-2 leading-tight">
              <span className="text-[var(--color-cream)]">Are You in the </span>
              <span
                className="gradient-text-gold"
                style={{ textShadow: "0 0 24px rgba(251,191,36,0.4)" }}
              >
                Top 3?
              </span>
            </h2>
            <motion.button
              onClick={() => {
                if (isConnected) {
                  window.location.href = "/leaderboard/";
                } else {
                  connect("xaman");
                }
              }}
              disabled={isConnecting}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative group inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-gradient-to-r from-[var(--color-gold)] to-yellow-500 font-bold text-sm sm:text-base text-[var(--color-forest-900)] overflow-hidden transition-shadow hover:shadow-[0_0_30px_rgba(251,191,36,0.45)]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <span className="relative flex items-center gap-2">
                {isConnecting ? (
                  "Connecting…"
                ) : isConnected ? (
                  <>
                    View My Rank
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <Wallet size={16} />
                    See If I&rsquo;m in the Top 3
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-xs text-[var(--color-cream-dim)] opacity-70">
              {["Free", "10 seconds", "Read-only"].map((sig) => (
                <div key={sig} className="flex items-center gap-1">
                  <Check size={12} className="text-[var(--color-neon-green)]" />
                  {sig}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

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
