"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * SubPageLayout — Shared layout wrapper for all sub-pages
 *
 * Provides consistent background, overlay, and spacing for
 * /leaderboard, /profile, and /games/[slug] routes.
 *
 * Props control:
 *   - showVideoBg: immersive video background (leaderboard, profile)
 *   - showFallingNuts: particle effect layer
 *   - navbarTransparent: overlay nav on game canvas
 * ═══════════════════════════════════════════════════════════════
 */

import { ReactNode, Suspense } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "./Navbar";

const Footer = dynamic(
  () => import("./Footer").then((m) => ({ default: m.Footer })),
  { ssr: false },
);

const ClientFallingNuts = dynamic(
  () =>
    import("@/components/ClientFallingNuts").then((m) => ({
      default: m.ClientFallingNuts,
    })),
  { ssr: false },
);

interface SubPageLayoutProps {
  children: ReactNode;
  /** Show immersive video background (default: true) */
  showVideoBg?: boolean;
  /** Show falling nuts particle effect (default: true) */
  showFallingNuts?: boolean;
  /** Make navbar transparent / overlay mode (default: false) */
  navbarTransparent?: boolean;
  /** Show the main Navbar (default: true) — set false on game pages where GameHeader replaces it */
  showNavbar?: boolean;
  /** Show the Footer (default: true) — set false on full-viewport game pages */
  showFooter?: boolean;
}

export function SubPageLayout({
  children,
  showVideoBg = true,
  showFallingNuts = true,
  navbarTransparent = false,
  showNavbar = true,
  showFooter = true,
}: SubPageLayoutProps) {
  return (
    // DEGEN OVERHAUL — animated degen mesh on the page chrome (matches
    // GamePage). When showVideoBg is true the fixed video layer above
    // covers it; when false (or while the video loads), the mesh shows
    // through so /leaderboard and /profile read as one degen surface.
    <div className="relative min-h-screen bg-degen-mesh" data-navbar-transparent={navbarTransparent || undefined}>
      {/* ── Background Layer ── */}
      {showVideoBg && (
        <div className="fixed inset-0 z-0">
          {/* Desktop: looping video */}
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

          {/* Mobile: static fallback */}
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

          {/* DEGEN OVERHAUL — overlay tint shifts from forest-dark to
              degen-950, with hot-pink + violet radial accents replacing
              the muted neon-green/gold spots. Video underneath unchanged. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                "linear-gradient(to bottom, rgba(10,6,19,0.92) 0%, rgba(10,6,19,0.78) 20%, rgba(10,6,19,0.65) 50%, rgba(10,6,19,0.78) 80%, rgba(10,6,19,0.96) 100%)",
                "linear-gradient(to right, rgba(10,6,19,0.5) 0%, transparent 15%, transparent 85%, rgba(10,6,19,0.5) 100%)",
                "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,46,136,0.07) 0%, transparent 70%)",
                "radial-gradient(ellipse 50% 50% at 50% 70%, rgba(124,58,237,0.06) 0%, transparent 60%)",
              ].join(", "),
            }}
          />

          {/* CRT scanlines (desktop only) */}
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
      )}

      {/* ── Particles ── */}
      {showFallingNuts && <ClientFallingNuts />}

      {/* ── Navbar ── */}
      {showNavbar && <Navbar />}

      {/* ── Content ── */}
      <div className={`relative ${showVideoBg ? "z-10" : ""}`}>
        <Suspense fallback={null}>{children}</Suspense>
      </div>

      {/* ── Footer ── */}
      {showFooter && <Footer />}
    </div>
  );
}
