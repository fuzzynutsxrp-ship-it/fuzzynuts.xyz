"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useControls, folder } from "leva";
import { gameRegistry, type GameMetadata } from "@/lib/gameRegistry";
import { ScrollContext, type ScrollState } from "./ScrollContext";
import { CameraRig, type CameraOverride } from "./CameraRig";
import { Forest } from "@/components/hero/scene/Forest";
import { CyberForest } from "./scene/CyberForest";
import { ArcadeCabinet } from "./scene/ArcadeCabinet";
import { CityHorizon } from "./scene/CityHorizon";
import { GodRays } from "./scene/GodRays";
import { BioluminescentFerns } from "./scene/BioluminescentFerns";
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

/* ═══════════════════════════════════════════════════════════════
   DEV_MODE — Flip to `true` to fall back to the previous (pre-
   cyber-forest) visual treatment: the simple cone-Forest, no
   neon vines, no arcade cabinets, no god rays, no ferns, no
   city horizon. Useful for A/B comparison or rolling back the
   visual upgrade without redeploying.
   ═══════════════════════════════════════════════════════════════ */
const DEV_MODE: { legacyForest: boolean } = {
  legacyForest: false,
};

/* ─────────────────────────────────────────────────────────────
   WorldCanvas — Single fixed Canvas spanning the viewport.

   • Window-scroll listener → ref-context → CameraRig
   • Leva controls (grouped in folders) drive the live look:
       Atmosphere · Vines · Arcade · Ferns · Squirrels · City · FX
   • All control values are destructured from useControls() and
     forwarded as plain props to the scene primitives.
   ───────────────────────────────────────────────────────────── */

interface WorldCanvasProps {
  isMobile: boolean;
}

// Fixed positions for arcade cabinets — placed along the camera path so
// they're visible across all stations. Light scatter, slight rotation so
// each cabinet faces a "natural" direction.
const ARCADE_PLACEMENTS: {
  position: [number, number, number];
  rotation: number;
  accent: string;
}[] = [
  { position: [-2.6, -0.5, 4.5], rotation: 0.45, accent: "#ef4444" }, // hero left
  { position: [3.1, -0.5, 4.8], rotation: -0.6, accent: "#22d3ee" }, // hero right
  { position: [-5.2, -0.5, -2.5], rotation: 1.2, accent: "#a855f7" }, // games left
  { position: [5.0, -0.5, -2.0], rotation: -1.0, accent: "#fbbf24" }, // games right
  { position: [0.6, -0.5, -6.5], rotation: 0.2, accent: "#10b981" }, // mid back
  { position: [-3.5, -0.5, -8.2], rotation: 0.9, accent: "#f97316" }, // far back
];

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

  /* ─────────────────────────────────────────────────────────
     Leva controls — grouped by visual subsystem.

     Mobile users get a less aggressive default (lower density,
     fewer particles), but every value is still tweakable.
     ───────────────────────────────────────────────────────── */
  const controls = useControls({
    Atmosphere: folder({
      fogColor: "#03110a",
      fogNear: { value: 9, min: 0, max: 40, step: 0.5 },
      fogFar: { value: isMobile ? 30 : 42, min: 8, max: 80, step: 1 },
      saturation: { value: 1.0, min: 0.4, max: 1.8, step: 0.05 },
    }),
    Vines: folder({
      vineIntensity: { value: 1.4, min: 0, max: 3, step: 0.05 },
      vineColorA: "#22d3ee",
      vineColorB: "#3b82f6",
      vineColorC: "#10b981",
    }),
    Arcade: folder({
      arcadeGlow: { value: 1.2, min: 0, max: 3, step: 0.05 },
      arcadeCount: {
        value: isMobile ? 3 : 6,
        min: 0,
        max: 6,
        step: 1,
      },
    }),
    Ferns: folder({
      fernBrightness: { value: 1.1, min: 0, max: 3, step: 0.05 },
      fernCount: {
        value: isMobile ? 40 : 90,
        min: 0,
        max: 200,
        step: 5,
      },
    }),
    Squirrels: folder({
      squirrelAnimSpeed: { value: 1.0, min: 0.1, max: 3, step: 0.05 },
    }),
    City: folder({
      cityTint: "#3b5d8f",
      cityVisible: true,
    }),
    GodRays: folder({
      godRayBrightness: { value: 1.0, min: 0, max: 3, step: 0.05 },
      godRayColor: "#bce8d6",
    }),
    PostFX: folder({
      bloomIntensity: { value: 0.85, min: 0, max: 3, step: 0.05 },
      bloomThreshold: { value: 0.5, min: 0, max: 1, step: 0.02 },
      vignetteDarkness: { value: 0.75, min: 0, max: 1.5, step: 0.05 },
    }),
  });

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

  // ── Ambient particle bursts (desktop only) ──
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
    if (!explosionsRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    explosionsRef.current.burst(new THREE.Vector3(nx * 6, 1.5 + ny * 2.5, -4));
  };

  // Visible arcade cabinets — slice by Leva's `arcadeCount` value.
  const arcadeCabinets = ARCADE_PLACEMENTS.slice(0, controls.arcadeCount);

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
          toneMappingExposure: controls.saturation,
        }}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        shadows={false}
        style={{ background: "transparent" }}
      >
        <ScrollContext.Provider value={scrollState.current}>
          {/* ── Background + atmosphere ── */}
          <color attach="background" args={["#020608"]} />
          <fog
            attach="fog"
            args={[controls.fogColor, controls.fogNear, controls.fogFar]}
          />

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

            {DEV_MODE.legacyForest ? (
              <Forest treeCount={isMobile ? 18 : 32} wind={!isMobile} />
            ) : (
              <>
                <CyberForest
                  treeCount={isMobile ? 18 : 32}
                  wind={!isMobile}
                  vineIntensity={controls.vineIntensity}
                  vineColors={[
                    controls.vineColorA,
                    controls.vineColorB,
                    controls.vineColorC,
                  ]}
                />
                <BioluminescentFerns
                  count={controls.fernCount}
                  brightness={controls.fernBrightness}
                />
                <GodRays
                  count={isMobile ? 4 : 6}
                  brightness={controls.godRayBrightness}
                  color={controls.godRayColor}
                />
                {controls.cityVisible && (
                  <CityHorizon tint={controls.cityTint} count={32} />
                )}
                {arcadeCabinets.map((c, i) => (
                  <ArcadeCabinet
                    key={i}
                    position={c.position}
                    rotation={c.rotation}
                    accent={c.accent}
                    glow={controls.arcadeGlow}
                  />
                ))}
              </>
            )}

            <FloatingAcorns count={isMobile ? 6 : 14} trails={!isMobile} />
            <Squirrels
              count={isMobile ? 3 : 6}
              target={hoveredPos}
              animSpeed={controls.squirrelAnimSpeed}
            />

            {/* ── Stations ── */}
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

          {/* ── Post-processing (desktop only) ── */}
          {!isMobile && (
            <EffectComposer multisampling={0} enableNormalPass={false}>
              <Bloom
                intensity={controls.bloomIntensity}
                luminanceThreshold={controls.bloomThreshold}
                luminanceSmoothing={0.2}
                mipmapBlur
              />
              <Vignette
                eskil={false}
                offset={0.2}
                darkness={controls.vignetteDarkness}
              />
            </EffectComposer>
          )}
        </ScrollContext.Provider>
      </Canvas>
    </div>
  );
}
