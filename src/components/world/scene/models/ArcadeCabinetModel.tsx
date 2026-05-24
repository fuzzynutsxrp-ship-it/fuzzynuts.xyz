"use client";

import { useMemo } from "react";
import { Model } from "./Model";

/* ─────────────────────────────────────────────────────────────
   ArcadeCabinetModel — Scatters 4-6 instances of the
   arcade-cabinet.glb across the mid-ground with deterministic
   positions / rotations / scales.

   The procedural ArcadeCabinet (with custom marquee + CRT
   flicker materials) is no longer used — this GLB carries its
   own baked materials.
   ───────────────────────────────────────────────────────────── */

const MODEL_URL = "/models/arcade-cabinet.glb";

interface Placement {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface ArcadeCabinetModelProps {
  /** How many cabinets to render (capped to the placement count). */
  count?: number;
}

// Placements tuned to mirror herobackground2.jpg: two prominent
// cabinets framing the foreground (left + right, partially angled
// inward), then 3 smaller / further cabinets receding into the
// mid-ground mist. Larger scales on the foreground pair so they
// dominate the silhouette like the reference.
const PLACEMENTS: Placement[] = [
  // Foreground left  — closest, biggest, angled slightly inward.
  { position: [-4.2, -0.5, 4.0], rotationY: 0.85, scale: 1.9 },
  // Foreground right — slightly bigger still (mirrors the larger
  // cabinet in the reference's right side).
  { position: [4.4, -0.5, 4.3], rotationY: -0.9, scale: 2.0 },
  // Mid-ground left — recessed and rotated to face the path.
  { position: [-6.2, -0.5, -1.0], rotationY: 1.2, scale: 1.6 },
  // Mid-ground right — paired with the left mid-ground.
  { position: [5.8, -0.5, -1.2], rotationY: -1.1, scale: 1.6 },
  // Deep center — small, peeking through the trees.
  { position: [0.4, -0.5, -7.5], rotationY: 0.2, scale: 1.4 },
  // Deep left — almost lost in the fog.
  { position: [-3.6, -0.5, -10.0], rotationY: 0.7, scale: 1.3 },
];

export function ArcadeCabinetModel({ count = 6 }: ArcadeCabinetModelProps) {
  const visible = useMemo(
    () => PLACEMENTS.slice(0, Math.max(0, Math.min(count, PLACEMENTS.length))),
    [count],
  );
  return (
    <>
      {visible.map((p, i) => (
        <Model
          key={i}
          url={MODEL_URL}
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        />
      ))}
    </>
  );
}

export default ArcadeCabinetModel;
