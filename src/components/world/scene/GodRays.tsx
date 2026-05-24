"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   GodRays — Fake volumetric light shafts cutting down through
   the canopy. Approach: a small set of tall additive cones,
   tilted ~10°, that slowly drift in opacity / position so the
   rays "breathe" instead of looking stamped on.

   We avoid the postprocessing GodRays effect because it requires
   a light-source mesh and a second render pass — way too costly
   for the visual budget. Additive cones look just as cinematic
   under Bloom.

   ~6 rays × ~24 tris = ~150 tris. Trivial.
   ───────────────────────────────────────────────────────────── */

export interface GodRaysProps {
  /** How many rays to render (kept low; each is large + additive). */
  count?: number;
  /** Brightness multiplier from Leva. */
  brightness?: number;
  /** Ray tint — usually a pale blue-green to match the canopy light. */
  color?: string;
}

interface RayData {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  phase: number;
  speed: number;
}

export function GodRays({
  count = 6,
  brightness = 1,
  color = "#bce8d6",
}: GodRaysProps) {
  // Deterministic placement so the rays don't dance around on re-render.
  // Now mixes TWO ray types for dramatic falloff matching herobackground2.jpg:
  //   • Wide hero rays   (5–8 units wide, 18–24 long) — big atmospheric shafts
  //   • Narrow spotlights (0.8–1.4 wide, 22–28 long) — sharp bright pillars
  //     punching through the canopy
  const rays = useMemo<RayData[]>(() => {
    let seed = 5151;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const heroCount = Math.ceil(count * 0.55);
    const narrowCount = count - heroCount;
    const out: RayData[] = [];
    for (let i = 0; i < heroCount; i++) {
      const x = (rand() - 0.5) * 26;
      const z = -2 - rand() * 16;
      out.push({
        position: [x, 10, z],
        rotation: [
          (rand() - 0.5) * 0.3,
          rand() * Math.PI,
          (rand() - 0.5) * 0.18,
        ],
        scale: [5 + rand() * 3, 18 + rand() * 6, 5 + rand() * 3],
        phase: rand() * Math.PI * 2,
        speed: 0.35 + rand() * 0.4,
      });
    }
    for (let i = 0; i < narrowCount; i++) {
      const x = (rand() - 0.5) * 18;
      const z = -3 - rand() * 12;
      out.push({
        position: [x, 11, z],
        rotation: [
          (rand() - 0.5) * 0.2,
          rand() * Math.PI,
          (rand() - 0.5) * 0.12,
        ],
        // Narrow + tall — sharp pillars
        scale: [0.8 + rand() * 0.6, 22 + rand() * 6, 0.8 + rand() * 0.6],
        phase: rand() * Math.PI * 2,
        speed: 0.5 + rand() * 0.7,
      });
    }
    return out;
  }, [count]);

  // Single shared geometry + material — instanced visually via per-ray refs.
  const coneGeo = useMemo(() => new THREE.ConeGeometry(1, 1, 8, 1, true), []);

  // Per-ray refs so we can pulse opacity individually.
  const matRefs = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < matRefs.current.length; i++) {
      const m = matRefs.current[i];
      const d = rays[i];
      if (!m || !d) continue;
      // Narrow rays peak harder + faster — they look like sharp spotlights
      // breaking through the canopy. Wide rays breathe softer.
      const isNarrow = d.scale[0] < 2;
      const peak = isNarrow ? 0.42 : 0.22;
      const base = isNarrow ? 0.18 : 0.12;
      const o =
        (base + Math.abs(Math.sin(t * d.speed + d.phase)) * peak) * brightness;
      m.opacity = o;
    }
  });

  return (
    <group>
      {rays.map((r, i) => (
        <mesh
          key={i}
          geometry={coneGeo}
          position={r.position}
          rotation={r.rotation}
          scale={r.scale}
        >
          <meshBasicMaterial
            ref={(el) => {
              if (el) matRefs.current[i] = el;
            }}
            color={color}
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
