"use client";

/* ═══════════════════════════════════════════════════════════════
   FuzzyWorld — Full-page immersive 3D world that replaces the
   entire homepage content below the Navbar.

   Architecture:
   ┌──────────────────────────────────────────────────────────┐
   │ <main style="height: WORLD_SCROLL_PAGES × 100vh">         │
   │   <div fixed inset-0 z-0>                                 │
   │     <WorldCanvas/>   ← single Canvas; reads window scroll │
   │   </div>                                                  │
   │   <div fixed inset-0 z-30 pointer-events:none>            │
   │     <WorldHUD/>      ← opening hero plate + station dots  │
   │   </div>                                                  │
   │   …main is N×100vh tall so window scroll has room…        │
   │ </main>                                                   │
   └──────────────────────────────────────────────────────────┘

   Why window scroll instead of <ScrollControls>:
   • Native touch / momentum scrolling on mobile (Drei's
     ScrollControls intercepts the wheel and breaks iOS momentum).
   • Anchor links (#games) still work via native hash scrolling.
   • Browser scrollbar / Page-Up/Down keys / accessibility tools
     all behave normally.
   ═══════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { SquirrelSpinner } from "@/components/hero/SquirrelSpinner";
import { WorldHUD } from "./WorldHUD";
import { WORLD_SCROLL_PAGES } from "./ScrollContext";

// ssr:false — Three.js touches WebGL / `window` at module init.
// Dynamic import also code-splits the heavy bundle into its own chunk.
const WorldCanvas = dynamic(() => import("./WorldCanvas"), {
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

export function FuzzyWorld() {
  const isMobile = useIsMobile();

  return (
    <main
      id="main-content"
      className="relative bg-[var(--color-forest-dark)]"
      style={{ height: `${WORLD_SCROLL_PAGES * 100}vh` }}
    >
      {/* ── Fixed canvas — fills viewport, scrolls underneath the page ── */}
      <Suspense fallback={<SquirrelSpinner />}>
        <WorldCanvas isMobile={isMobile} />
      </Suspense>

      {/* ── HUD overlay — every element inside WorldHUD positions
            itself with `fixed` and controls its own pointer-events. ── */}
      <WorldHUD isMobile={isMobile} />
    </main>
  );
}

export default FuzzyWorld;
