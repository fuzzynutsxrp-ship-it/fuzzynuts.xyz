"use client";

import { useMemo } from "react";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   NeonVine — Glowing biomechanical cable wrapping a tree trunk.

   Reference (herobackground.jpg + herobackground2.jpg): thick,
   chunky LED-cable bundles hugging ancient bark. Bright cyan /
   electric blue / magenta with deep emissive glow that Bloom
   picks up as halos.

   What changed from the first pass:
   • Tube radius bumped from 0.07 → 0.20 (much chunkier).
   • Sample resolution increased so big tubes still bend smoothly.
   • Optional 2nd "strand" — a thin parallel inner core in a
     contrasting tone, sells the "bundled cable" look you see in
     image 2 where vines have a darker inner channel + bright
     outer skin.

   Geometry budget per vine: ~720 tris main + ~480 inner =
   ~1.2k tris. We only attach 1–2 vines to ~40% of trees.
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
  /** Outer tube radius — defaults to the chunky look from references. */
  radius?: number;
  /** Add a thinner inner-core strand for the "bundled cable" look. */
  withInnerCore?: boolean;
}

export function NeonVine({
  trunkHeight,
  trunkRadius,
  startAngle,
  turns = 2.5,
  color,
  intensity = 1,
  radius = 0.2,
  withInnerCore = true,
}: NeonVineProps) {
  // Build the curve once and reuse for both the outer + inner strands.
  const curve = useMemo(() => {
    const SAMPLES = 72;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const theta = startAngle + turns * Math.PI * 2 * t;
      // Wider radial breathing so the chunky tube doesn't look like a
      // perfect machined spring — it should feel "grown" around the bark.
      const r =
        trunkRadius +
        0.18 +
        Math.sin(theta * 1.3 + startAngle * 3) * 0.12 +
        Math.cos(theta * 2.7) * 0.04;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = 0.1 + t * (trunkHeight - 0.2);
      pts.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05);
  }, [trunkHeight, trunkRadius, startAngle, turns]);

  const outerGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 72, radius, 8, false),
    [curve, radius],
  );
  const innerGeo = useMemo(
    () =>
      withInnerCore
        ? new THREE.TubeGeometry(curve, 72, radius * 0.45, 6, false)
        : null,
    [curve, radius, withInnerCore],
  );

  // Outer skin — bright, Bloom-friendly.
  const outerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    [color],
  );
  // Inner core — slightly desaturated / brighter white so the cable
  // looks "lit from within".
  const innerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    [],
  );

  // Apply intensity by scaling the color (Bloom is luminance-thresholded).
  outerMat.color.set(color).multiplyScalar(Math.max(0.25, intensity));
  innerMat.color
    .set("#ffffff")
    .multiplyScalar(Math.max(0.15, intensity * 0.55));

  return (
    <group>
      <mesh geometry={outerGeo} material={outerMat} />
      {innerGeo && <mesh geometry={innerGeo} material={innerMat} />}
    </group>
  );
}
