"use client";

import { motion } from "framer-motion";
import { Gamepad2, Globe, ArrowDown } from "lucide-react";
import Image from "next/image";
import { HeroPrizeTeaser } from "@/components/home/HeroPrizeTeaser";

const FLOAT_ANIMATION = {
  y: [0, -12, 0],
  rotate: [0, -3, 3, 0],
};

export function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden"
    >
      {/* ── Hero Background Video (Desktop) / Static Image (Mobile) ── */}
      <div className="absolute inset-0 z-0 hero-bg-animate" style={{ willChange: "transform" }}>
        {/* Desktop: looping background video — preload="none" until visible */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover hidden sm:block"
          poster="/images/hero/hero-bg-mobile.jpg"
        >
          <source src="/videos/herobackgroundvideo.mp4" type="video/mp4" />
        </video>
        {/* Mobile fallback: static image (saves data, reliable autoplay) */}
        <Image
          src="/images/hero/hero-bg-mobile.jpg"
          alt=""
          fill
          priority
          quality={75}
          className="object-cover object-center sm:hidden"
          sizes="100vw"
          aria-hidden="true"
        />
      </div>

      {/* ── Combined Overlay Stack (merged 4 layers → 1 for performance) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: [
            "linear-gradient(to top, rgba(1,5,8,0.96) 0%, rgba(1,5,8,0.8) 30%, rgba(1,5,8,0.4) 55%, rgba(1,5,8,0.15) 75%, rgba(1,5,8,0.3) 100%)",
            "linear-gradient(to right, rgba(1,5,8,0.6) 0%, transparent 20%, transparent 80%, rgba(1,5,8,0.6) 100%)",
            "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(251,191,36,0.05) 0%, transparent 70%)",
            "radial-gradient(ellipse 70% 50% at 50% 25%, rgba(16,185,129,0.06) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      {/* ── Hero Content ── */}
      <div className="container-main relative z-10 text-center">
        {/* Animated floating logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="mb-6"
        >
          <motion.div
            animate={FLOAT_ANIMATION}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="inline-block drop-shadow-[0_0_30px_rgba(245,196,66,0.3)]"
          >
            <Image
              src="/images/branding/logo.webp"
              alt="Fuzzynuts mascot — pixel art squirrel with sunglasses holding an acorn"
              width={160}
              height={107}
              className="w-28 h-auto sm:w-36 md:w-40 drop-shadow-[0_0_25px_rgba(245,196,66,0.25)]"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase bg-[rgba(245,196,66,0.12)] border border-[rgba(245,196,66,0.25)] text-[var(--color-gold)] backdrop-blur-sm"
          >
            🌰 Live on XRPL Mainnet
          </motion.span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-4"
        >
          <span className="gradient-text-gold text-glow-gold">Fuzzynuts</span>
          <br />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="text-[var(--color-cream)] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold"
          >
            ($NUT)
          </motion.span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xl sm:text-2xl md:text-3xl font-display font-semibold text-[var(--color-gold)] mb-4"
        >
          Play. Earn. Own.
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-base sm:text-lg text-[var(--color-cream)] max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        >
          The nuttiest meme coin on the XRP Ledger. Play arcade games, earn real $NUT tokens,
          and join a community of degens who refuse to take crypto seriously.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href="/games/fuzzynuts-world/"
            whileHover={{ scale: 1.06, boxShadow: "0 0 40px rgba(245,196,66,0.5)" }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-lg transition-all"
            style={{ animation: "pulse-gold 3s ease-in-out infinite" }}
          >
            <Globe size={20} />
            Enter World
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              →
            </motion.span>
          </motion.a>

          <motion.a
            href="#games"
            whileHover={{ scale: 1.06, backgroundColor: "rgba(245,196,66,0.15)" }}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-[var(--color-gold)] text-[var(--color-gold)] font-bold text-lg transition-all backdrop-blur-sm"
          >
            <Gamepad2 size={20} />
            Play Arcade
          </motion.a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto"
        >
          {[
            { value: "321B", label: "Total Supply" },
            { value: "5", label: "Games Live" },
            { value: "80%", label: "In Liquidity" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.1 + i * 0.15, type: "spring", stiffness: 200 }}
                className="text-2xl md:text-3xl font-display font-black gradient-text-gold"
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-[var(--color-cream-dim)] mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Prize teaser — 500K $NUT weekly */}
        <HeroPrizeTeaser />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16"
        >
          <a
            href="#games"
            className="inline-flex flex-col items-center text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors"
            aria-label="Scroll to games"
          >
            <span className="text-xs mb-2">Explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <ArrowDown size={20} />
            </motion.div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
