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

// IMPORTANT: the source GLB's natural bounding box is ~155 units
// across (Sketchfab export unit weirdness). To get a player-height
// cabinet (~2 units tall in our scene), we need scale ≈ 0.013.
// The numbers below are scenes-relative arcade heights:
//   0.013 → ~2.0 unit tall cabinet  (foreground)
//   0.011 → ~1.7 unit tall cabinet  (mid-ground)
//   0.009 → ~1.4 unit tall cabinet  (deep distance)
const PLACEMENTS: Placement[] = [
  // Foreground left  — biggest, framing the left edge.
  { position: [-3.5, -0.5, 4.0], rotationY: 0.85, scale: 0.013 },
  // Foreground right — biggest, framing the right edge.
  { position: [3.6, -0.5, 4.3], rotationY: -0.9, scale: 0.013 },
  // Mid-ground left.
  { position: [-5.5, -0.5, -0.5], rotationY: 1.2, scale: 0.011 },
  // Mid-ground right.
  { position: [5.2, -0.5, -0.8], rotationY: -1.1, scale: 0.011 },
  // Deep center — peeking through trees.
  { position: [0.4, -0.5, -7.5], rotationY: 0.2, scale: 0.009 },
  // Deep left — almost lost in the fog.
  { position: [-3.6, -0.5, -10.0], rotationY: 0.7, scale: 0.009 },
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
