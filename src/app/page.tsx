import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/hero/Hero";
import { HeroBackground } from "@/components/hero/HeroBackground";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";

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
const PrizeTiers = dynamic(() =>
  import("@/components/sections/PrizeTiers").then((m) => ({
    default: m.PrizeTiers,
  })),
);
const WalletCTA = dynamic(() =>
  import("@/components/home/WalletCTA").then((m) => ({
    default: m.WalletCTA,
  })),
);
const SectionTransition = dynamic(() =>
  import("@/components/home/SectionTransition").then((m) => ({
    default: m.SectionTransition,
  })),
);
const Features = dynamic(() =>
  import("@/components/sections/Features").then((m) => ({
    default: m.Features,
  })),
);
const Tokenomics = dynamic(() =>
  import("@/components/sections/Tokenomics").then((m) => ({
    default: m.Tokenomics,
  })),
);
const OnChainVerification = dynamic(() =>
  import("@/components/sections/OnChainVerification").then((m) => ({
    default: m.OnChainVerification,
  })),
);
const HowToGet = dynamic(() =>
  import("@/components/sections/HowToGet").then((m) => ({
    default: m.HowToGet,
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
        <SectionTransition variant="vine" />
        <GamesShowcase />
        <SectionTransition variant="glow" />
        <PrizeTiers />
        <WalletCTA />
        <SectionTransition variant="vine" flip />
        <Features />
        <SectionTransition variant="fade" />
        <Tokenomics />
        <SectionTransition variant="vine" />
        <OnChainVerification />
      </main>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/sections/howto-bg.jpg"
            alt=""
            fill
            quality={72}
            className="object-cover object-center hidden sm:block"
            sizes="100vw"
            aria-hidden="true"
            loading="lazy"
          />
          <Image
            src="/images/sections/howto-bg-mobile.jpg"
            alt=""
            fill
            quality={68}
            className="object-cover object-center sm:hidden"
            sizes="100vw"
            aria-hidden="true"
            loading="lazy"
          />
        </div>

        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: [
              "linear-gradient(to bottom, rgba(1,5,8,0.95) 0%, rgba(1,5,8,0.6) 12%, rgba(1,5,8,0.48) 35%, rgba(1,5,8,0.55) 65%, rgba(1,5,8,0.75) 100%)",
              "linear-gradient(to right, rgba(1,5,8,0.6) 0%, transparent 18%, transparent 82%, rgba(1,5,8,0.6) 100%)",
              "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(74,222,128,0.05) 0%, transparent 65%)",
            ].join(", "),
          }}
        />

        <div className="relative z-10">
          <HowToGet />
          <Footer />
        </div>
      </div>

      <FloatingMascot />
    </>
  );
}
