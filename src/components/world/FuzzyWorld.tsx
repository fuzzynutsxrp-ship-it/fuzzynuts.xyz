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
   │   <LoadingScreen/>   ← real GLB progress via useProgress  │
   │   <div fixed inset-0 z-30 pointer-events:none>            │
   │     <WorldHUD/>      ← opening hero plate + station dots  │
   │   </div>                                                  │
   │   …main is N×100vh tall so window scroll has room…        │
   │ </main>                                                   │
   └──────────────────────────────────────────────────────────┘

   Production-friendly Leva: panel UI is hidden unless the URL has
   `?studio=1`. Public visitors never see it. The hook calls
   (useControls in WorldCanvas) still run with defaults — that
   was the simplest way to keep one code path for both modes.
   ═══════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Leva } from "leva";
import { SquirrelSpinner } from "@/components/hero/SquirrelSpinner";
import { WorldHUD } from "./WorldHUD";
import { WORLD_SCROLL_PAGES } from "./ScrollContext";

// ssr:false — Three.js touches WebGL / `window` at module init.
// Dynamic import also code-splits the heavy bundle into its own chunk.
const WorldCanvas = dynamic(() => import("./WorldCanvas"), {
  ssr: false,
  loading: () => <SquirrelSpinner />,
});

// LoadingScreen uses drei's `useProgress`, which pulls in part of
// drei. Dynamic-import it so drei stays out of the initial chunk —
// the screen only matters once the GLB loads start anyway, by
// which point this chunk has had time to download.
const LoadingScreen = dynamic(
  () => import("./LoadingScreen").then((m) => m.LoadingScreen),
  { ssr: false },
);

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

/**
 * Returns true if the URL contains `?studio=1` (or `?studio`).
 * Read once on first render so toggling requires a page reload —
 * which is exactly what we want; the panel shouldn't pop in
 * mid-session for visitors who don't know to look for it.
 */
function useStudioFlag() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("studio");
  }, []);
}

export function FuzzyWorld() {
  const isMobile = useIsMobile();
  const showStudio = useStudioFlag();

  return (
    <main
      id="main-content"
      className="relative bg-[var(--color-forest-dark)]"
      style={{ height: `${WORLD_SCROLL_PAGES * 100}vh` }}
    >
      {/* ── Leva live-tweak panel — only visible with ?studio=1 ──
            useControls() hook calls inside WorldCanvas still run so
            defaults are applied; only the panel UI is hidden for
            non-studio visitors. */}
      <Leva
        collapsed
        hidden={!showStudio || isMobile}
        hideCopyButton
        titleBar={{ title: "Forest Studio" }}
      />

      {/* ── Real GLB-progress loading overlay. Renders OVER the canvas
            until all useGLTF requests complete (driven by drei's
            useProgress hook). Fades out automatically. ── */}
      <LoadingScreen />

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
