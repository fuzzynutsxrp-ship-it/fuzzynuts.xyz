import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/hero/Hero";
import { HeroBackground } from "@/components/hero/HeroBackground";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";
// DEGEN OVERHAUL — live wins ticker (SSRs hype fallback, hydrates to live SSE)
import { LiveWinsTicker } from "@/components/home/LiveWinsTicker";

/* ═══════════════════════════════════════════════════════════════
   Homepage — `herobackground3.jpg` is now the fixed page-level
   background. <HeroBackground/> sits behind everything via
   `fixed inset-0 z-0`; the page content (Hero + below-fold
   marketing sections) scrolls on top of it. Sections that have
   their own opaque backgrounds (GamesShowcase, etc.) cover the
   image where they render; transparent gaps let it show through.

   All 3D / Three.js scene code has been deleted from the
   homepage path. Three.js stays installed because
   src/components/ui/RotatingNut.tsx still uses R3F elsewhere
   in the app (game pages).
   ═══════════════════════════════════════════════════════════════ */

const GamesShowcase = dynamic(() =>
  import("@/components/sections/GamesShowcase").then((m) => ({
    default: m.GamesShowcase,
  })),
);
const Prizes = dynamic(() =>
  import("@/components/sections/Prizes").then((m) => ({
    default: m.Prizes,
  })),
);
const Trust = dynamic(() =>
  import("@/components/sections/Trust").then((m) => ({
    default: m.Trust,
  })),
);
const Community = dynamic(() =>
  import("@/components/sections/Community").then((m) => ({
    default: m.Community,
  })),
);
const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);
const FloatingMascot = dynamic(() =>
  import("@/components/home/FloatingMascot").then((m) => ({
    default: m.FloatingMascot,
  })),
);

export default function Home() {
  return (
    <>
      {/* Page-level fixed backdrop — herobackground3.jpg stays put while
          the rest of the page scrolls on top of it. */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        <HeroBackground />
      </div>

      <ClientFallingNuts />
      <Navbar />
      <main id="main-content" className="relative z-10">
        <Hero />
        {/* DEGEN OVERHAUL — live wins ticker below the hero */}
        <LiveWinsTicker />
        <GamesShowcase />
        <Prizes />
        <Trust />
      </main>

      {/* howto-bg.jpg + dark overlay removed — Community and Footer
          now render directly over the page-level herobackground3.jpg. */}
      <div className="relative z-10">
        <Community />
        <Footer />
      </div>

      <FloatingMascot />
    </>
  );
}
