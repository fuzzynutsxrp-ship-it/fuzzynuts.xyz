"use client";

import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   HeroBackground — Clean, zero-dependency hero backdrop.

   Layers (z-stack, bottom → top):
   1. Static <picture>:
        <source srcset=".../hero-bg-desktop.webp" media="(min-width: 640px)">
        <source srcset=".../hero-bg-mobile.webp" media="(max-width: 639px)">
        <img    src=".../hero-fallback.webp" loading=eager>
      Browser-native fallback chain: WebP → JPG content under .webp
      filename (browsers content-sniff) → still-renders gradient via
      Tailwind class on the wrapper if all images fail.
   2. CSS-only animated gradient mesh (`.bg-hero-gradient` from
      tailwind.config.ts). Sits BELOW the photo at 20% opacity so
      it adds a subtle drifting hue rather than dominating.
   3. Dark vignette + bottom fade so HTML text on top stays legible.

   Zero JavaScript animation work — no Three.js, no R3F, no particles.
   Image is `priority` for fast LCP.
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
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-hero-gradient bg-[var(--color-forest-dark)]"
      aria-hidden="true"
    >
      {/* 1. Photo. <Image> with `unoptimized: true` set globally in
            next.config.ts → serves the file as-is. We use TWO
            <Image> tags (desktop + mobile) controlled by media
            queries on the wrapper class rather than `srcset` because
            next/image doesn't expose <source media> directly. The
            mobile one is hidden on desktop and vice versa, so only
            one ever loads (lazy/eager decoding by the browser). */}
      <Image
        src={desktopSrc}
        alt=""
        fill
        priority
        quality={80}
        sizes="100vw"
        className="object-cover object-center hidden sm:block"
      />
      <Image
        src={mobileSrc}
        alt=""
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover object-center sm:hidden"
      />

      {/* 2. Vignette + bottom fade so overlay text stays readable
            against any photo frame. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            // Bottom-up dark fade
            "linear-gradient(to bottom, rgba(1,5,8,0.45) 0%, rgba(1,5,8,0.10) 30%, rgba(1,5,8,0.10) 60%, rgba(1,5,8,0.85) 100%)",
            // Radial vignette
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 0%, rgba(1,5,8,0.45) 100%)",
          ].join(", "),
        }}
      />
    </div>
  );
}

export default HeroBackground;
