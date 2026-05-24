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
import { CityHorizon } from "./scene/CityHorizon";
import { GodRays } from "./scene/GodRays";
import { BioluminescentFerns } from "./scene/BioluminescentFerns";
import { ForestBackdrop } from "./scene/ForestBackdrop";
import { AtmosphericMotes } from "./scene/AtmosphericMotes";
import { FloatingAcorns } from "@/components/hero/scene/FloatingAcorns";
import { NutMoon } from "@/components/hero/scene/NutMoon";
// ── GLB-backed model components — drop-in replacements for the
//    previous procedural ArcadeCabinet, Squirrels, BioluminescentFerns,
//    and CyberForest. Selected via Leva's `useGLBModels` toggle. ──
import { ArcadeCabinetModel } from "./scene/models/ArcadeCabinetModel";
import { SquirrelModel } from "./scene/models/SquirrelModel";
import { FernModel } from "./scene/models/FernModel";
import { ForestModel } from "./scene/models/ForestModel";
import { preloadModel } from "./scene/models/Model";

// Preload the most-likely-needed GLBs as soon as this module
// imports — useGLTF caches by URL so when <Model> renders, the
// download is already in-flight (or done). We DO NOT preload the
// 90 MB forest unconditionally; let it suspend only when chosen.
preloadModel("/models/arcade-cabinet.glb");
preloadModel("/models/low_poly_squirrel.glb");
preloadModel("/models/low_poly_fern.glb");
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

// Note: the old ARCADE_PLACEMENTS constant has been removed. The new
// GLB-backed <ArcadeCabinetModel/> owns its own placement array
// internally (src/components/world/scene/models/ArcadeCabinetModel.tsx).

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
    Mood: folder({
      // `overallSceneMood` is a single 0..1 darkness multiplier applied on
      // top of the individual atmospheric controls below. 0 = bright /
      // cheerful; 1 = full eerie dusk like herobackground2.jpg.
      // Default cranked to 0.9 — the user has consistently said previous
      // passes were "not dark enough".
      overallSceneMood: { value: 0.9, min: 0, max: 1, step: 0.02 },
    }),
    Atmosphere: folder({
      // Deeper blue-tinted fog matching the dark plate. Fog far pulled
      // even closer so distance dissolves faster.
      fogColor: "#03101a",
      fogNear: { value: 5, min: 0, max: 40, step: 0.5 },
      fogFar: { value: isMobile ? 22 : 27, min: 8, max: 80, step: 1 },
      saturation: { value: 1.05, min: 0.4, max: 1.8, step: 0.05 },
    }),
    Vines: folder({
      // 1.9 default was creating HDR-bright cyan/blue slashes across
      // the frame at the hero scroll position. Dropped to 1.0 — vines
      // still bloom and glow, but no longer drown the foreground.
      vineIntensity: { value: 1.0, min: 0, max: 3, step: 0.05 },
      vineColorA: "#22d3ee",
      vineColorB: "#3b82f6",
      vineColorC: "#10b981",
      vineColorD: "#d946ef",
    }),
    Arcade: folder({
      // Was 2.0 — combined with the close-foreground cabinets it was
      // flooding the corners of the frame. 1.3 reads as "lit machine",
      // not "bloomed lighthouse".
      arcadeGlow: { value: 1.3, min: 0, max: 3, step: 0.05 },
      // Now 8 placements total (added 2 close-foreground). Default shows
      // all 8 on desktop, 4 on mobile to keep render cheap.
      arcadeCount: { value: isMobile ? 4 : 8, min: 0, max: 8, step: 1 },
      // ── Marquee color override ──
      // When `marqueeOverride` is on, every cabinet's marquee uses
      // `arcadeMarqueeColor`. When off, each cabinet keeps its preset
      // accent from ARCADE_PLACEMENTS.
      marqueeOverride: false,
      arcadeMarqueeColor: "#ef4444",
      // ── Screen color override ──
      // Same pattern for CRT screens. Default off so the per-cabinet
      // screen color (always blue/cyan) is used.
      screenOverride: false,
      arcadeScreenColor: "#22d3ee",
    }),
    Ferns: folder({
      fernBrightness: { value: 2.1, min: 0, max: 3, step: 0.05 },
      fernCount: {
        value: isMobile ? 90 : 180,
        min: 0,
        max: 240,
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
      // Cranked again (1.9 → 2.4) and ray density increased — now mixes
      // wide hero shafts with narrow sharp pillars (see GodRays.tsx).
      godRayBrightness: { value: 2.4, min: 0, max: 3, step: 0.05 },
      godRayDensity: {
        value: isMobile ? 7 : 12,
        min: 0,
        max: 16,
        step: 1,
      },
      godRayColor: "#a8d0ff",
    }),
    Motes: folder({
      // Volumetric dust particles drifting through the air. They make
      // god rays read as actually-volumetric instead of flat additive
      // cones — the dust is what catches the light.
      motesEnabled: !isMobile,
      moteBrightness: { value: 1.0, min: 0, max: 2.5, step: 0.05 },
      moteCount: {
        value: isMobile ? 200 : 700,
        min: 0,
        max: 1200,
        step: 50,
      },
    }),
    Backdrop: folder({
      // Distant matte-painting using public/images/hero/herobackground.jpg.
      // `backdropTint` darkens the photo so it sits inside the dark mood.
      // Default pulled down (0.55 → 0.4) since the user said previous
      // passes were still too bright.
      backdropEnabled: true,
      backdropTint: { value: 0.4, min: 0, max: 1.2, step: 0.02 },
    }),
    Models: folder({
      // ── GLB toggles ──
      // useGLBForest swaps the procedural CyberForest (cone-trees +
      // vines) for the 90 MB low_poly_forest.glb. Default OFF — flip
      // on once you've verified the asset loads at acceptable speed.
      useGLBForest: false,
      // Source GLB bbox is ~4040 units → 0.005 default scales it to
      // ~20 units across (right-sized for our playable area).
      glbForestScale: { value: 0.005, min: 0.001, max: 0.03, step: 0.0005 },
      // useGLBFerns swaps the additive-sprite BioluminescentFerns for
      // ~40 cloned low_poly_fern.glb instances. ON by default — the
      // GLB is small (~670 KB) and looks more natural than sprites.
      useGLBFerns: true,
      glbFernCount: { value: isMobile ? 25 : 40, min: 0, max: 60, step: 1 },
    }),
    PostFX: folder({
      // Bloom dampened HARD — previous pass washed the scene into
      // bright pastel. New defaults only bloom the brightest neon.
      bloomIntensity: { value: 0.55, min: 0, max: 3, step: 0.05 },
      bloomThreshold: { value: 0.75, min: 0, max: 1, step: 0.02 },
      vignetteDarkness: { value: 1.05, min: 0, max: 1.5, step: 0.05 },
    }),
  });

  /* ── Derived values — `overallSceneMood` (0..1) is mixed into the
        atmospheric values so a single slider sweep takes the scene from
        cheerful → eerie without the user having to retune everything. ── */
  const mood = controls.overallSceneMood;
  const derived = {
    // Mood pulls fog far further in (was 0.35, now 0.45) — heavier
    // mist when dark, matching herobackground2.jpg's foggy depth.
    fogFar: controls.fogFar * (1 - mood * 0.45),
    // Ambient base lowered (0.45 → 0.35) and scaled more aggressively
    // by mood so high-mood scenes are nearly silhouette-only.
    ambient: 0.35 * (1 - mood * 0.7),
    vignette: Math.min(1.5, controls.vignetteDarkness + mood * 0.2),
    bloomIntensity: controls.bloomIntensity * (1 + mood * 0.2),
    godRayBrightness: controls.godRayBrightness * (1 + mood * 0.25),
  };

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
            args={[controls.fogColor, controls.fogNear, derived.fogFar]}
          />

          {/* ── Lights — ambient is mood-scaled (mood↑ → ambient↓). ── */}
          <ambientLight intensity={derived.ambient} color="#3a4a5a" />
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
                {/* Distant matte painting using the reference photo. Sits
                    BEHIND everything else; depthWrite is off in the
                    backdrop material so it always renders first. */}
                {controls.backdropEnabled && (
                  <ForestBackdrop tint={controls.backdropTint} />
                )}

                {/* ── Forest body: GLB or procedural cone-trees ──
                    The 90 MB low_poly_forest.glb takes several seconds
                    to download; the Suspense fallback (SquirrelSpinner
                    in FuzzyWorld) covers the wait. Switch off via
                    Leva → Models → useGLBForest. */}
                {controls.useGLBForest ? (
                  <ForestModel scale={controls.glbForestScale} />
                ) : (
                  <CyberForest
                    treeCount={isMobile ? 18 : 32}
                    wind={!isMobile}
                    vineIntensity={controls.vineIntensity}
                    vineColors={[
                      controls.vineColorA,
                      controls.vineColorB,
                      controls.vineColorC,
                      controls.vineColorD,
                    ]}
                  />
                )}

                {/* ── Ferns: GLB or procedural sprites ── */}
                {controls.useGLBFerns ? (
                  <FernModel count={controls.glbFernCount} />
                ) : (
                  <BioluminescentFerns
                    count={controls.fernCount}
                    brightness={controls.fernBrightness}
                  />
                )}

                <GodRays
                  count={controls.godRayDensity}
                  brightness={derived.godRayBrightness}
                  color={controls.godRayColor}
                />
                {/* Volumetric dust motes — make the god rays read as
                    actually-volumetric. Disabled on mobile by default. */}
                {controls.motesEnabled && (
                  <AtmosphericMotes
                    count={controls.moteCount}
                    brightness={controls.moteBrightness}
                  />
                )}
                {controls.cityVisible && (
                  <CityHorizon tint={controls.cityTint} count={32} />
                )}

                {/* ── Arcade cabinets: GLB Model (replaces the procedural
                      cabinet entirely — Leva accent / screen / glow
                      overrides no longer apply since the GLB has baked
                      materials). ── */}
                <ArcadeCabinetModel count={controls.arcadeCount} />
              </>
            )}

            <FloatingAcorns count={isMobile ? 6 : 14} trails={!isMobile} />

            {/* ── Squirrels: GLB Model preserves orbit/hop/glance from
                  the procedural component, just swaps geometry. ── */}
            <SquirrelModel
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
                intensity={derived.bloomIntensity}
                luminanceThreshold={controls.bloomThreshold}
                luminanceSmoothing={0.2}
                mipmapBlur
              />
              <Vignette
                eskil={false}
                offset={0.2}
                darkness={derived.vignette}
              />
            </EffectComposer>
          )}
        </ScrollContext.Provider>
      </Canvas>
    </div>
  );
}
