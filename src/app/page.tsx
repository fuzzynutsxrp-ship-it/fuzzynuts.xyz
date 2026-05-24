import dynamic from "next/dynamic";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { FuzzyWorld } from "@/components/world/FuzzyWorld";
import { ClientFallingNuts } from "@/components/ClientFallingNuts";

/* ═══════════════════════════════════════════════════════════════
   DEV_MODE — Single toggle controlling the entire homepage.

   • use2DLayout = false (default)
       The whole page below the Navbar becomes one continuous
       immersive 3D scene (forest, portals, treasure vault,
       leaderboard acorns, $NUT moon). The 3D bundle is dynamic-
       imported behind `ssr:false`, so the initial HTML is light.

   • use2DLayout = true
       Falls back to the original 2D layout (Hero, GamesShowcase,
       PrizeTiers, WalletCTA, Features, Tokenomics,
       OnChainVerification, HowToGet, Footer). Useful for
       debugging, A/B comparison, or rolling back without a
       redeploy.

   Site-wide `SITE_LOCKDOWN_PASSWORD` middleware is unaffected.
   ═══════════════════════════════════════════════════════════════ */
const DEV_MODE: { use2DLayout: boolean } = {
  use2DLayout: false,
};

// ── Lazy-loaded 2D sections (only mount when DEV_MODE.use2DLayout) ──
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
  if (DEV_MODE.use2DLayout) {
    return <Legacy2DHome />;
  }

  return (
    <>
      <Navbar />
      <FuzzyWorld />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Legacy2DHome — Original 2D layout, kept verbatim so DEV_MODE
   can revert with zero behavioral drift. Mounts dynamically;
   none of these chunks load when the 3D world is active.
   ───────────────────────────────────────────────────────────── */
function Legacy2DHome() {
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
