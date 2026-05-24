"use client";

import { useMemo } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   CityHorizon — Very faint cyberpunk skyline silhouette far in
   the background, glimpsed between trees. Matches the distant
   high-rises in herobackground.jpg.

   Implementation: a ring of low-poly box "buildings" placed far
   behind the camera path. They sit at the edge of the fog
   distance so they read as ghostly silhouettes rather than
   sharp shapes.
   ───────────────────────────────────────────────────────────── */

export interface CityHorizonProps {
  /** Live tint from Leva — usually a desaturated blue. */
  tint?: string;
  /** Number of buildings (kept low; they're far). */
  count?: number;
}

interface BuildingData {
  position: [number, number, number];
  size: [number, number, number];
  windowSeed: number;
}

export function CityHorizon({
  tint = "#3b5d8f",
  count = 32,
}: CityHorizonProps) {
  const buildings = useMemo<BuildingData[]>(() => {
    let seed = 7777;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const out: BuildingData[] = [];
    for (let i = 0; i < count; i++) {
      // Concentrated in the camera's forward arc so it's visible at
      // the MoonStation looking past the moon and beyond.
      const angle = -Math.PI / 2 + (i / count - 0.5) * Math.PI * 1.1;
      const r = 60 + rand() * 14;
      const w = 1.4 + rand() * 2.2;
      const d = 1.4 + rand() * 2.2;
      const h = 6 + rand() * 18;
      out.push({
        position: [Math.cos(angle) * r, h / 2 - 0.5, Math.sin(angle) * r],
        size: [w, h, d],
        windowSeed: rand(),
      });
    }
    return out;
  }, [count]);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tint,
        roughness: 1,
        metalness: 0.1,
        // Very small emissive so far-distance buildings barely glow blue.
        emissive: new THREE.Color(tint).multiplyScalar(0.4),
        emissiveIntensity: 0.35,
      }),
    [tint],
  );

  const windowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#a3d7ff",
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
      }),
    [],
  );

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={b.position}>
          {/* Building body */}
          <mesh material={bodyMat}>
            <boxGeometry args={b.size} />
          </mesh>
          {/* A vertical strip of "windows" — single emissive plane to keep
              tris low. Some buildings get the strip, some don't. */}
          {b.windowSeed > 0.35 && (
            <mesh material={windowMat} position={[0, 0, b.size[2] / 2 + 0.01]}>
              <planeGeometry args={[b.size[0] * 0.6, b.size[1] * 0.85]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
