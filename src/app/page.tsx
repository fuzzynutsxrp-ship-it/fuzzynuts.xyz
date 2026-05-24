import { Navbar } from "@/components/layout/Navbar";
import { FuzzyWorld } from "@/components/world/FuzzyWorld";

/* ═══════════════════════════════════════════════════════════════
   Homepage — Full-page immersive 3D FuzzyWorld scene with GLB-
   backed models (arcade cabinets, squirrels, ferns, optional
   90 MB forest). Toggle each via the Forest Studio (Leva) panel
   under the "Models" folder.

   The video-backed <Hero/> + below-fold marketing sections are
   still in the repo for easy revert — see git history if needed.
   SITE_LOCKDOWN_PASSWORD middleware is unaffected.
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <>
      <Navbar />
      <FuzzyWorld />
    </>
  );
}
