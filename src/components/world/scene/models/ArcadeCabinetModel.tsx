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

// 6 deterministic placements scattered around the camera path,
// inheriting the spirit of the previous procedural ARCADE_PLACEMENTS
// but at scales suitable for the actual GLB (1.2..2.0 per brief).
const PLACEMENTS: Placement[] = [
  { position: [-3.5, -0.5, 3.0], rotationY: 0.55, scale: 1.4 },
  { position: [3.6, -0.5, 3.2], rotationY: -0.6, scale: 1.5 },
  { position: [-5.5, -0.5, -2.0], rotationY: 1.1, scale: 1.7 },
  { position: [5.2, -0.5, -1.8], rotationY: -1.0, scale: 1.6 },
  { position: [0.8, -0.5, -6.0], rotationY: 0.2, scale: 1.9 },
  { position: [-3.0, -0.5, -8.0], rotationY: 0.9, scale: 2.0 },
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
