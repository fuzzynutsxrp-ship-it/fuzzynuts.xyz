"use client";

import { useMemo } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   NeonVine — A glowing biomechanical vine that spirals up a
   tree trunk. Reference: thick LED-strip cables wrapped around
   massive ancient trees in herobackground.jpg.

   Implementation:
   • Build a CatmullRomCurve3 by sampling a helix path with a
     small organic radial jitter.
   • Extrude a TubeGeometry along the curve.
   • Use a MeshBasicMaterial with strong emissive coloring so
     Bloom in post-processing picks it up as a neon glow.

   Geometry budget per vine: 6 radial × 40 tubular = ~480 tris.
   We only attach 1–2 vines to ~40% of trees (see CyberForest).
   ───────────────────────────────────────────────────────────── */

export interface NeonVineProps {
  /** Tree trunk height — vine winds the full height. */
  trunkHeight: number;
  /** Tree trunk radius — vine wraps at slightly larger radius. */
  trunkRadius: number;
  /** Starting angle around the trunk (radians). */
  startAngle: number;
  /** Number of full revolutions the vine makes climbing the trunk. */
  turns?: number;
  /** Vine glow color (hex). */
  color: string;
  /** Live intensity multiplier from Leva. */
  intensity?: number;
}

export function NeonVine({
  trunkHeight,
  trunkRadius,
  startAngle,
  turns = 2.5,
  color,
  intensity = 1,
}: NeonVineProps) {
  const tubeGeo = useMemo(() => {
    // Sample the helix with mild radial noise for an organic, "growing
    // around the bark" feel rather than a perfect machined spiral.
    const SAMPLES = 64;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const theta = startAngle + turns * Math.PI * 2 * t;
      // Subtle radial jitter — sinusoidal so it stays smooth across samples.
      const r =
        trunkRadius + 0.08 + Math.sin(theta * 1.4 + startAngle * 3) * 0.06;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      // Vine starts a hair above the ground, ends just below canopy.
      const y = 0.1 + t * (trunkHeight - 0.2);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05);
    return new THREE.TubeGeometry(curve, SAMPLES, 0.07, 6, false);
  }, [trunkHeight, trunkRadius, startAngle, turns]);

  // Bright emissive material — Bloom in the post-processing pass turns
  // this into a halo. No need for fancy shaders.
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
      }),
    [color],
  );

  // Apply intensity by multiplying the color (Bloom threshold is luminance,
  // so a brighter base color → bigger glow).
  mat.color.set(color).multiplyScalar(Math.max(0.2, intensity));

  return <mesh geometry={tubeGeo} material={mat} />;
}
