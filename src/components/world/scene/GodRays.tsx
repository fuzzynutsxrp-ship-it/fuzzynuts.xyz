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
  const rays = useMemo<RayData[]>(() => {
    let seed = 5151;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => {
      // Spread the rays across the canopy ahead of the camera path.
      const x = (rand() - 0.5) * 22;
      const z = -2 - rand() * 14;
      return {
        position: [x, 9, z] as [number, number, number],
        rotation: [
          (rand() - 0.5) * 0.25, // slight tilt
          rand() * Math.PI,
          (rand() - 0.5) * 0.15,
        ] as [number, number, number],
        scale: [
          2 + rand() * 1.5, // width
          14 + rand() * 6, // length (cone-tall)
          2 + rand() * 1.5,
        ] as [number, number, number],
        phase: rand() * Math.PI * 2,
        speed: 0.4 + rand() * 0.5,
      };
    });
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
      // Breathing opacity — never goes above ~0.22 so rays stay subtle.
      const o =
        (0.12 + Math.abs(Math.sin(t * d.speed + d.phase)) * 0.1) * brightness;
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
