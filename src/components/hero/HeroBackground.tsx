"use client";

import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   HeroBackground — Warm neon hero backdrop.

   Layers (z-stack, bottom → top):
   1. Solid dark base with warm gold/amber radial glows
   2. Forest photo at low opacity + mix-blend-overlay — faint
      texture peeking through, never competes with the UI.
   3. Warm neon overlay: gold/amber corner accents, heavy
      bottom fade for legibility, center vignette.
   4. Subtle warm CRT scanlines (desktop only).

   Zero JavaScript animation — only CSS background-position drift.
   ───────────────────────────────────────────────────────────── */

export interface HeroBackgroundProps {
  /** Path to desktop image (1920×1080 WebP recommended). */
  desktopSrc?: string;
  /** Path to mobile image (1080×1920 WebP recommended). */
  mobileSrc?: string;
}

export function HeroBackground({
  desktopSrc = "/images/hero/herobackground3.jpg",
  mobileSrc = "/images/hero/herobackground3.jpg",
}: HeroBackgroundProps) {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{
        background: [
          // Warm gold top-left accent
          "radial-gradient(ellipse 55% 40% at 8% 0%, rgba(251,191,36,0.18) 0%, transparent 60%)",
          // Amber mid-right glow
          "radial-gradient(ellipse 60% 45% at 100% 20%, rgba(245,158,11,0.15) 0%, transparent 62%)",
          // Soft gold bottom center
          "radial-gradient(ellipse 55% 45% at 50% 100%, rgba(251,191,36,0.10) 0%, transparent 65%)",
          // Deep dark base
          "linear-gradient(to bottom, #0a0a0a 0%, #050309 100%)",
        ].join(", "),
        backgroundSize: "180% 180%, 180% 180%, 200% 200%, 100% 100%",
        animation: "hero-mesh 22s ease-in-out infinite",
      }}
    >
      {/* 1. Photo — crushed forest texture */}
      <Image
        src={desktopSrc}
        alt=""
        fill
        priority
        quality={80}
        sizes="100vw"
        className="object-cover object-center hidden sm:block opacity-[0.15] mix-blend-overlay [filter:brightness(0.35)_saturate(1.2)_contrast(1.1)]"
      />
      <Image
        src={mobileSrc}
        alt=""
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover object-center sm:hidden opacity-[0.15] mix-blend-overlay [filter:brightness(0.35)_saturate(1.2)_contrast(1.1)]"
      />

      {/* 2. Warm neon overlay — gold accents, heavy bottom fade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            // Gold bottom-right accent
            "radial-gradient(ellipse 55% 40% at 90% 95%, rgba(251,191,36,0.12) 0%, transparent 60%)",
            // Amber bottom-left glow
            "radial-gradient(ellipse 45% 35% at 5% 95%, rgba(245,158,11,0.10) 0%, transparent 65%)",
            // Heavy dark bottom fade for legibility
            "linear-gradient(to bottom, rgba(10,10,10,0.25) 0%, rgba(10,10,10,0.50) 50%, rgba(10,10,10,0.92) 100%)",
            // Center vignette
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 0%, rgba(10,10,10,0.50) 100%)",
          ].join(", "),
        }}
      />

      {/* 3. Subtle warm CRT scanlines — desktop only */}
      <div
        className="absolute inset-0 pointer-events-none hidden sm:block opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 2px, rgba(251,191,36,0.15) 2px 3px)",
        }}
      />
    </div>
  );
}

export default HeroBackground;
