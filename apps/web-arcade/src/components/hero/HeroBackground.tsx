"use client";

import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   HeroBackground — Degen underground hero backdrop.

   Layers (z-stack, bottom → top):
   1. `bg-degen-mesh` wrapper (tailwind.config.ts plugin utility):
      animated black-purple base + drifting hot-pink/violet/cyan
      radial glows. THIS is the dominant surface.
   2. Forest photo at opacity-[0.20] + mix-blend-overlay + crushed
      brightness/contrast — reads as faint texture peeking through
      the mesh, never competes with the neon UI on top.
   3. Neon overlay div: acid + extra hot-pink corner accents,
      heavy degen-950 bottom fade for legibility, center vignette.
   4. Subtle hot-pink CRT scanlines (desktop only, 6% opacity).

   Zero JavaScript animation work — the only motion is the
   `bg-degen-mesh` 22s keyframe drift (reduced-motion gated by
   globals.css). Image is `priority` for fast LCP.
   ───────────────────────────────────────────────────────────── */

export interface HeroBackgroundProps {
  /** Path to desktop image (1920×1080 WebP recommended). */
  desktopSrc?: string;
  /** Path to mobile image (1080×1920 WebP recommended). */
  mobileSrc?: string;
}

export function HeroBackground({
  // Both pointed at herobackground3.jpg — the user's bird's-eye
  // cyber-forest reference. Same image desktop + mobile for now;
  // swap mobileSrc to a portrait crop later if needed.
  desktopSrc = "/images/hero/herobackground3.jpg",
  mobileSrc = "/images/hero/herobackground3.jpg",
}: HeroBackgroundProps) {
  return (
    // DEGEN OVERHAUL START — hero crush.
    //
    // Was: cinematic misty-jungle photo at full brightness with a light
    // bg-hero-gradient (gold/cyan/magenta) underneath and a soft 45%
    // bottom vignette. Read as a serene Web3 game backdrop competing
    // with the hot-pink/neon UI on top of it.
    //
    // Now: `bg-degen-mesh` (the animated black-purple-pink-cyan radial
    // mesh from round 1) IS the dominant surface. The forest photo is
    // crushed via mix-blend-overlay + low opacity + heavy brightness
    // crush so it reads as faint forest *texture* peeking through neon
    // mesh — never competes with the UI. Acid + extra hot-pink corner
    // accents complement the mesh's existing pink/violet/cyan glows.
    // Subtle CRT scanlines on desktop add underground arcade grit.
    //
    // Net effect: neon-lit underground arcade in the nut forest, same
    // visual language as GamePage and SubPageLayout (both also use
    // bg-degen-mesh as of rounds 7 + 8). The whole site now reads as
    // one continuous degen den.
    <div className="absolute inset-0 z-0 overflow-hidden bg-degen-mesh" aria-hidden="true">
      {/* 1. Photo — heavily crushed forest texture peeking through the
            mesh. Same two-Image desktop/mobile media-query pattern as
            before; only the className changes. */}
      <Image
        src={desktopSrc}
        alt=""
        fill
        priority
        quality={80}
        sizes="100vw"
        className="object-cover object-center hidden sm:block opacity-[0.20] mix-blend-overlay [filter:brightness(0.4)_saturate(1.4)_contrast(1.15)]"
      />
      <Image
        src={mobileSrc}
        alt=""
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover object-center sm:hidden opacity-[0.20] mix-blend-overlay [filter:brightness(0.4)_saturate(1.4)_contrast(1.15)]"
      />

      {/* 2. Neon underground overlay — adds acid (mesh doesn't ship it)
            and an extra hot-pink corner glow, then a heavy degen-950
            bottom fade + center vignette so hero text stays legible. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            // Acid bottom-right accent (mesh doesn't have this colour)
            "radial-gradient(ellipse 55% 40% at 90% 95%, rgba(57,255,20,0.13) 0%, transparent 60%)",
            // Extra hot-pink edge glow bottom-left
            "radial-gradient(ellipse 45% 35% at 5% 95%, rgba(255,46,136,0.18) 0%, transparent 65%)",
            // Heavy degen-950 bottom fade for legibility
            "linear-gradient(to bottom, rgba(10,6,19,0.25) 0%, rgba(10,6,19,0.50) 50%, rgba(10,6,19,0.88) 100%)",
            // Center vignette
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 0%, rgba(10,6,19,0.50) 100%)",
          ].join(", "),
        }}
      />

      {/* 3. Subtle CRT scanlines — underground arcade grit. Desktop
            only to keep mobile GPU clean. Hot-pink tinted at 6% so it
            reads as glow flicker rather than literal scanlines. */}
      <div
        className="absolute inset-0 pointer-events-none hidden sm:block opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,46,136,0.22) 2px 3px)",
        }}
      />
    </div>
    // DEGEN OVERHAUL END
  );
}

export default HeroBackground;
