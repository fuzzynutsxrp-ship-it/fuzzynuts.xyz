import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Hero3D } from "@/components/hero/Hero3D";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";

/* ═══════════════════════════════════════════════════════════════
   DEV_MODE — Flip to `true` to bring the original 2D hero back.
   The 3D hero is lazy-loaded behind `ssr:false`, so toggling
   this off does not bloat the initial bundle of the 2D path.
   ═══════════════════════════════════════════════════════════════ */
const DEV_MODE: { use2DHero: boolean } = {
  use2DHero: false,
};

// ── Lazy-load below-fold sections ──
// These components are dynamically imported so they don't block First Contentful Paint.
// Each gets its own chunk → smaller initial JS bundle.
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
  import("@/components/home/WalletCTA").then((m) => ({ default: m.WalletCTA })),
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
      <ClientFallingNuts />
      <Navbar />
      <main id="main-content" className="relative z-10">
        {/* ═══ HERO — Immersive 3D forest experience.
            Flip DEV_MODE.use2DHero above to bring the old 2D
            hero back instantly. ═══ */}
        {DEV_MODE.use2DHero ? <Hero /> : <Hero3D />}

        {/* ── Vine transition: Hero → Games ── */}
        <SectionTransition variant="vine" />

        {/* ═══ GAMES — The arcade showcase ═══ */}
        <GamesShowcase />

        {/* ── Glow transition: Games → Prizes ── */}
        <SectionTransition variant="glow" />

        {/* ═══ PRIZE TIERS — Holographic Vault (500K $NUT) ═══ */}
        <PrizeTiers />

        {/* ── Wallet CTA: Convert interested visitors (NEW) ── */}
        <WalletCTA />

        {/* ── Vine transition: Wallet CTA → Features ── */}
        <SectionTransition variant="vine" flip />

        {/* ═══ FEATURES — Why Fuzzynuts ═══ */}
        <Features />

        {/* ── Fade transition: Features → Tokenomics ── */}
        <SectionTransition variant="fade" />

        {/* ═══ TOKENOMICS — Distribution & facts ═══ */}
        <Tokenomics />

        {/* ── Vine transition: Tokenomics → Verification ── */}
        <SectionTransition variant="vine" />

        {/* ═══ ON-CHAIN VERIFICATION — Addresses & proof ═══ */}
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

      {/* ── Floating mascot — looping slide-up from bottom right ── */}
      <FloatingMascot />
    </>
  );
}
