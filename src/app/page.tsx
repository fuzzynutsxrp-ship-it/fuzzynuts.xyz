import { Navbar } from "@/components/layout/Navbar";
import { FuzzyWorld } from "@/components/world/FuzzyWorld";

/* ═══════════════════════════════════════════════════════════════
   Homepage — Full-page immersive 3D world (FuzzyWorld) tuned to a
   bird's-eye twilight cyber-forest view. Camera starts high (hero
   station) and dives down into the canopy as the user scrolls
   through the stations (Games, Vault, Leaderboard, Moon).

   The static-image Hero from the prior "EMERGENCY RESET" remains
   in the repo at src/components/hero/Hero.tsx — revert by swapping
   this <FuzzyWorld/> for <Hero/> if needed.
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <>
      <Navbar />
      <FuzzyWorld />
    </>
  );
}
