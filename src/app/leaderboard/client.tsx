"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Thin Client Component wrapper — needed because `ssr: false`
 * is only allowed inside Client Components (not Server Components).
 * The parent page.tsx exports metadata as a Server Component,
 * then renders this client boundary.
 *
 * Also renders the immersive Cyber-Nature video background
 * (matching Hero.tsx) so the leaderboard feels like part of
 * the main site experience.
 */
const Leaderboard = dynamic(
  () => import("@/components/sections/Leaderboard").then((mod) => mod.Leaderboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-32">
        <p className="text-neon-green animate-pulse font-display text-lg">
          Loading leaderboard…
        </p>
      </div>
    ),
  }
);

export function LeaderboardClient() {
  return (
    <div className="relative min-h-screen">
      {/* ═══════════════════════════════════════════════════════
          Background Layer — matches Hero.tsx exactly
          ═══════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 z-0">
        {/* Desktop: looping background video */}
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

        {/* Mobile fallback: static image */}
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

        {/* Combined overlay — deeper than Hero to improve text legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "linear-gradient(to bottom, rgba(1,5,8,0.92) 0%, rgba(1,5,8,0.78) 20%, rgba(1,5,8,0.65) 50%, rgba(1,5,8,0.78) 80%, rgba(1,5,8,0.96) 100%)",
              "linear-gradient(to right, rgba(1,5,8,0.5) 0%, transparent 15%, transparent 85%, rgba(1,5,8,0.5) 100%)",
              "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(16,185,129,0.05) 0%, transparent 70%)",
              "radial-gradient(ellipse 50% 50% at 50% 70%, rgba(251,191,36,0.03) 0%, transparent 60%)",
            ].join(", "),
          }}
        />

        {/* Subtle CRT scanline texture (desktop only) */}
        <div
          className="absolute inset-0 pointer-events-none hidden sm:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
            backgroundSize: "100% 4px",
          }}
          aria-hidden="true"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════
          Content Layer — sits above the fixed background
          ═══════════════════════════════════════════════════════ */}
      <div className="relative z-10">
        {/* ── Back to Home ── */}
        <div className="container-main pt-6">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href="/"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-gradient-to-r from-brand-gold to-yellow-500
                         text-forest-dark font-bold text-sm
                         hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                         active:scale-95 transition-all min-h-[44px]"
            >
              <ArrowLeft
                size={16}
                className="transition-transform group-hover:-translate-x-1"
              />
              Back to Home
            </Link>
          </motion.div>
        </div>

        {/* ── Leaderboard Glass Container ── */}
        <div className="container-main py-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-white/[0.08]
                       bg-[rgba(1,5,8,0.55)] backdrop-blur-xl
                       shadow-[0_8px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(16,185,129,0.04)]
                       overflow-hidden"
          >
            <Leaderboard />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
