"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { gameRegistry, type GameMetadata } from "@/lib/gameRegistry";
import { ScrollContext, type ScrollState } from "./ScrollContext";
import { CameraRig, type CameraOverride } from "./CameraRig";
import { Forest } from "@/components/hero/scene/Forest";
import { FloatingAcorns } from "@/components/hero/scene/FloatingAcorns";
import { Squirrels } from "@/components/hero/scene/Squirrels";
import { NutMoon } from "@/components/hero/scene/NutMoon";
import {
  NutExplosions,
  type NutExplosionsHandle,
} from "@/components/hero/scene/NutExplosions";
import { GamesStation } from "./stations/GamesStation";
import { VaultStation } from "./stations/VaultStation";
import { LeaderboardStation } from "./stations/LeaderboardStation";
import { MoonStation } from "./stations/MoonStation";

/* ─────────────────────────────────────────────────────────────
   WorldCanvas — Single fixed Canvas spanning the viewport that
   renders the entire 3D world. The page above gives us
   `WORLD_SCROLL_PAGES × 100vh` of vertical scroll so the camera
   has somewhere to travel.

   We avoid drei's <ScrollControls> deliberately — its internal
   scroll proxy is fragile on mobile and clashes with Next.js
   anchor navigation. A plain window scroll listener feeding a
   ref-context is rock solid on both desktop and touch.
   ───────────────────────────────────────────────────────────── */

interface WorldCanvasProps {
  isMobile: boolean;
}

export default function WorldCanvas({ isMobile }: WorldCanvasProps) {
  const explosionsRef = useRef<NutExplosionsHandle>(null);
  const [hoveredPos, setHoveredPos] = useState<THREE.Vector3 | null>(null);
  const cameraOverride = useRef<CameraOverride["current"]>(null);

  const scrollState = useRef<ScrollState>({ offset: 0, velocity: 0 });

  // ── Live game count for the moon station ──
  const liveGameCount = useMemo<number>(
    () => gameRegistry.getAllLive().length,
    [],
  );

  // ── Window-scroll → scrollState.current ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = window.scrollY;
    let lastT = performance.now();
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? window.scrollY / max : 0;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const velocity = (window.scrollY - last) / dt; // px per ms
      scrollState.current.offset = next;
      scrollState.current.velocity = velocity;
      last = window.scrollY;
      lastT = now;
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // ── Ambient particle bursts so the scene always feels alive
  //    (desktop only — saves battery on mobile). ──
  useEffect(() => {
    if (isMobile) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const ref = explosionsRef.current;
      if (ref) {
        const x = (Math.random() - 0.5) * 14;
        const y = 1.5 + Math.random() * 4;
        const z = -2 - Math.random() * 8;
        ref.burst(new THREE.Vector3(x, y, z));
      }
      setTimeout(tick, 5500 + Math.random() * 4000);
    };
    const initial = setTimeout(tick, 3500);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [isMobile]);

  // ── Portal click: zoom camera toward portal, burst, then navigate ──
  const handlePortalActivate = (
    game: GameMetadata,
    worldPos: THREE.Vector3,
  ) => {
    explosionsRef.current?.burst(worldPos, game.color);
    // Push a camera override pointing past the portal for a "diving in" feel.
    const camTarget = worldPos.clone();
    camTarget.z += 1.2;
    camTarget.y += 0.4;
    cameraOverride.current = {
      position: camTarget,
      lookAt: worldPos.clone(),
      expires: performance.now() + 520,
    };
    setTimeout(() => {
      window.location.href = `/games/${game.slug}/`;
    }, 480);
  };

  const handleChestOpen = (worldPos: THREE.Vector3) => {
    explosionsRef.current?.burst(worldPos, "#fbbf24");
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Background click — ambient sparkle. Stops only at portal handlers.
    if (!explosionsRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    explosionsRef.current.burst(new THREE.Vector3(nx * 6, 1.5 + ny * 2.5, -4));
  };

  return (
    <div
      className="fixed inset-0 w-full h-full"
      onClick={handleCanvasClick}
      aria-hidden="true"
      style={{ touchAction: "auto" }}
    >
      <Canvas
        camera={{ position: [0, 2.4, 8.5], fov: isMobile ? 60 : 52 }}
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        shadows={false}
        style={{ background: "transparent" }}
      >
        <ScrollContext.Provider value={scrollState.current}>
          {/* ── Background + atmosphere ── */}
          <color attach="background" args={["#020608"]} />
          <fog attach="fog" args={["#03110a", 9, 38]} />

          {/* ── Lights ── */}
          <ambientLight intensity={0.35} color="#3a4a5a" />
          <directionalLight
            position={[-6, 8, 4]}
            intensity={1.1}
            color="#fbbf24"
          />
          <directionalLight
            position={[4, 6, -8]}
            intensity={0.6}
            color="#6dd3ff"
          />
          <pointLight
            position={[0, -1, 0]}
            intensity={0.35}
            color="#10b981"
            distance={10}
          />
          <pointLight
            position={[-8, 4, -22]}
            intensity={1.4}
            color="#fbbf24"
            distance={42}
          />

          <CameraRig override={cameraOverride} />

          <Suspense fallback={null}>
            {/* ── Always-on scene primitives ── */}
            <NutMoon />
            <Forest treeCount={isMobile ? 18 : 32} wind={!isMobile} />
            <FloatingAcorns count={isMobile ? 6 : 14} trails={!isMobile} />
            <Squirrels count={isMobile ? 3 : 6} target={hoveredPos} />

            {/* ── Stations: each fades in/out based on scroll progress ── */}
            <GamesStation
              onHover={setHoveredPos}
              onActivate={handlePortalActivate}
            />
            <VaultStation onChestOpen={handleChestOpen} />
            <LeaderboardStation />
            <MoonStation gameCount={liveGameCount} />

            <NutExplosions
              ref={explosionsRef}
              capacity={isMobile ? 90 : 220}
              perBurst={isMobile ? 14 : 24}
            />
          </Suspense>

          {/* ── Post-processing (desktop only — too costly on mobile) ── */}
          {!isMobile && (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <Bloom
                intensity={0.75}
                luminanceThreshold={0.55}
                luminanceSmoothing={0.2}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.2} darkness={0.7} />
            </EffectComposer>
          )}
        </ScrollContext.Provider>
      </Canvas>
    </div>
  );
}
