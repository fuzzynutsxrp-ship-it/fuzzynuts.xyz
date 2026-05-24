"use client";

/* ═══════════════════════════════════════════════════════════════
   Hero3D — Full-screen immersive 3D landing experience.

   Architecture:
   ┌──────────────────────────────────────────────────────────┐
   │  <section #hero> full-viewport, dark forest backdrop      │
   │  ├─ <Hero3DCanvas>   (ssr:false dynamic import)           │
   │  │   • Forest / Squirrels / Floating acorns / $NUT moon   │
   │  │   • Game portals (click → /games/{slug}/)              │
   │  │   • Click bursts & Bloom post-processing               │
   │  └─ <Hero3DOverlay>  (HTML chrome on top of canvas)       │
   │      • Logo, headline, CTAs, stats, vault teaser          │
   │      • Smooth #games scroll buttons                       │
   └──────────────────────────────────────────────────────────┘

   The Canvas is dynamic-imported with ssr:false so the R3F /
   three.js / postprocessing bundles never block FCP. While it
   downloads, the SquirrelSpinner fallback fills the section.

   Mobile detection is done with a matchMedia listener so we
   only pay for the listener once, then forward an `isMobile`
   prop into the canvas to cap particle counts / dpr / disable
   post-processing on phones.
   ═══════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { SquirrelSpinner } from "./SquirrelSpinner";
import { Hero3DOverlay } from "./Hero3DOverlay";

// ssr:false — three.js touches `window`/WebGL during render init,
// so we MUST avoid running it server-side. The dynamic import
// also code-splits the heavy bundle into its own chunk.
const Hero3DCanvas = dynamic(() => import("./Hero3DCanvas"), {
  ssr: false,
  loading: () => <SquirrelSpinner />,
});

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(
      "(max-width: 768px), (pointer: coarse) and (max-width: 900px)",
    );
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export function Hero3D() {
  const isMobile = useIsMobile();

  return (
    <section
      id="hero"
      className="relative w-full min-h-[100svh] overflow-hidden bg-[var(--color-forest-dark)]"
      style={{ contain: "paint" }}
    >
      {/* 3D canvas (lazy / client-only) */}
      <Suspense fallback={<SquirrelSpinner />}>
        <Hero3DCanvas isMobile={isMobile} />
      </Suspense>

      {/* HTML overlay always on top of the canvas */}
      <Hero3DOverlay />
    </section>
  );
}

export default Hero3D;
