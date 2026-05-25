import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/hero/Hero";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";

/* ═══════════════════════════════════════════════════════════════
   Homepage — herobackground3.jpg as a clean HTML hero, the same
   pattern as the EMERGENCY RESET (commit bfc8901). Below-fold
   marketing sections (GamesShowcase, PrizeTiers, etc.) are
   preserved.

   FuzzyWorld (3D scene + game portals + treasure vault + leader-
   board acorns + moon close-up + Leva) is still in the repo at
   src/components/world/. Re-import + replace <Hero/> below to
   bring it back when the 3D side is wanted again.
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
