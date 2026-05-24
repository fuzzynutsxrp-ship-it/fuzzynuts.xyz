"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { Forest } from "./scene/Forest";
import { FloatingAcorns } from "./scene/FloatingAcorns";
import { Squirrels } from "./scene/Squirrels";
import { NutMoon } from "./scene/NutMoon";
import { NutExplosions, type NutExplosionsHandle } from "./scene/NutExplosions";
import { GamePortals } from "./scene/GamePortals";
import { gameRegistry, type GameMetadata } from "@/lib/gameRegistry";

/* ─────────────────────────────────────────────────────────────
   Hero3DCanvas — Root R3F scene for the immersive landing page.

   • Mobile-aware perf scaling (lower DPR, fewer particles, no
     post-processing on phones).
   • Suspense everywhere so missing chunks never crash hydration.
   • Single handler funnels clicks → particle explosion → nav.
   ───────────────────────────────────────────────────────────── */

interface Hero3DCanvasProps {
  /** Forwarded from the parent so the overlay UI can update too. */
  isMobile: boolean;
}

export default function Hero3DCanvas({ isMobile }: Hero3DCanvasProps) {
  const explosionsRef = useRef<NutExplosionsHandle>(null);
  const [hoveredPos, setHoveredPos] = useState<THREE.Vector3 | null>(null);

  // Live games only — coming-soon entries don't need a 3D portal.
  const games = useMemo<GameMetadata[]>(
    () => gameRegistry.getAll().filter((g) => !g.comingSoon),
    [],
  );

  // Auto-celebration: spawn ambient bursts every few seconds at random
  // points so the scene always feels alive even without interaction.
  useEffect(() => {
    if (isMobile) return; // skip on phones
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const ref = explosionsRef.current;
      if (ref) {
        const x = (Math.random() - 0.5) * 14;
        const y = 1.5 + Math.random() * 3;
        const z = -2 - Math.random() * 6;
        ref.burst(new THREE.Vector3(x, y, z));
      }
      setTimeout(tick, 4500 + Math.random() * 3500);
    };
    const initial = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      clearTimeout(initial);
    };
  }, [isMobile]);

  const handlePortalActivate = (
    game: GameMetadata,
    worldPos: THREE.Vector3,
  ) => {
    explosionsRef.current?.burst(worldPos, game.color);
    // Brief delay so the explosion is visible before page transitions.
    const href = `/games/${game.slug}/`;
    setTimeout(() => {
      window.location.href = href;
    }, 520);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Cheap ambient burst on any background click (not portal — portal
    // clicks stopPropagation, so this only fires on the canvas itself).
    if (!explosionsRef.current) return;
    // Convert client coords to a rough world position in front of camera.
    // We don't raycast — that'd be overkill; just spawn ~2 units ahead.
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    explosionsRef.current.burst(new THREE.Vector3(nx * 6, 1.5 + ny * 2.5, -4));
  };

  return (
    <div
      className="absolute inset-0 w-full h-full"
      onClick={handleCanvasClick}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 2.2, 7], fov: isMobile ? 60 : 52 }}
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        shadows={false}
        style={{ background: "transparent" }}
      >
        {/* ── Fog & background colour ── */}
        <color attach="background" args={["#020608"]} />
        <fog attach="fog" args={["#03110a", 9, 32]} />

        {/* ── Lights ── */}
        <ambientLight intensity={0.35} color="#3a4a5a" />
        {/* Warm dusk key light from upper-left */}
        <directionalLight
          position={[-6, 8, 4]}
          intensity={1.1}
          color="#fbbf24"
        />
        {/* Cool moonlight rim from behind */}
        <directionalLight
          position={[4, 6, -8]}
          intensity={0.6}
          color="#6dd3ff"
        />
        {/* Ground bounce */}
        <pointLight
          position={[0, -1, 0]}
          intensity={0.35}
          color="#10b981"
          distance={10}
        />
        {/* Glow from the $NUT moon */}
        <pointLight
          position={[-8, 4, -22]}
          intensity={1.4}
          color="#fbbf24"
          distance={40}
        />

        <Suspense fallback={null}>
          <NutMoon />
          <Forest treeCount={isMobile ? 16 : 28} wind={!isMobile} />
          <FloatingAcorns count={isMobile ? 6 : 12} trails={!isMobile} />
          <Squirrels count={isMobile ? 3 : 5} target={hoveredPos} />
          <GamePortals
            games={games}
            onHover={setHoveredPos}
            onActivate={handlePortalActivate}
            showLabels
          />
          <NutExplosions
            ref={explosionsRef}
            capacity={isMobile ? 80 : 200}
            perBurst={isMobile ? 14 : 22}
          />
        </Suspense>

        {/* ── God-ray-ish bloom + soft vignette (desktop only) ── */}
        {!isMobile && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={0.7}
              luminanceThreshold={0.55}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.7} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
