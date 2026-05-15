import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";

// ── Lazy-load below-fold sections ──
// These components are dynamically imported so they don't block First Contentful Paint.
// Each gets its own chunk → smaller initial JS bundle.
const GamesShowcase = dynamic(() => import("@/components/sections/GamesShowcase").then(m => ({ default: m.GamesShowcase })));
const Features = dynamic(() => import("@/components/sections/Features").then(m => ({ default: m.Features })));
const Tokenomics = dynamic(() => import("@/components/sections/Tokenomics").then(m => ({ default: m.Tokenomics })));
const OnChainVerification = dynamic(() => import("@/components/sections/OnChainVerification").then(m => ({ default: m.OnChainVerification })));
const HowToGet = dynamic(() => import("@/components/sections/HowToGet").then(m => ({ default: m.HowToGet })));
const Footer = dynamic(() => import("@/components/layout/Footer").then(m => ({ default: m.Footer })));

export default function Home() {
  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[var(--color-gold)] focus:text-[var(--color-forest-900)] focus:font-bold focus:text-sm"
      >
        Skip to content
      </a>

      <ClientFallingNuts />
      <Navbar />
      <main id="main-content" className="relative z-10">
        <Hero />
        <div className="section-divider" role="separator" aria-hidden="true" />
        <GamesShowcase />
        <div className="section-divider" role="separator" aria-hidden="true" />
        <Features />
        <div className="section-divider" role="separator" aria-hidden="true" />
        <Tokenomics />
        <OnChainVerification />
      </main>

      {/* ── Shared background: HowToGet bleeds into Footer ── */}
      <div className="relative overflow-hidden">
        {/* Background image (herobackground flipped upside down) */}
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

        {/* Combined overlay (merged 3 layers into 1 for fewer DOM nodes / compositing layers) */}
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

        {/* Content flows through: HowToGet → Footer */}
        <div className="relative z-10">
          <HowToGet />
          <Footer />
        </div>
      </div>
    </>
  );
}
