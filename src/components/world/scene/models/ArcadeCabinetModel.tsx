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

// 5 cabinets matching the reference image's "clearing in the
// canopy" arrangement: cabinets arranged in a loose ring at the
// center of the scene with several units of clear space between
// each one (not clustered tight). The bird's-eye hero camera at
// (0, 18, 14) looking at (0, 0, -4) sees all five from above.
//
// Source GLB natural bbox is ~155 units; scale 0.013 → ~2-unit-tall
// player-height cabinets.
const PLACEMENTS: Placement[] = [
  // Front-left — slightly closer to camera, angled inward.
  { position: [-3.2, -0.5, 1.5], rotationY: 0.6, scale: 0.013 },
  // Front-right — paired with front-left, mirrored angle.
  { position: [3.2, -0.5, 1.5], rotationY: -0.6, scale: 0.013 },
  // Center — facing the camera, anchoring the clearing.
  { position: [0, -0.5, -1.5], rotationY: 0, scale: 0.013 },
  // Back-left — recessed, rotated to face the clearing center.
  { position: [-2.8, -0.5, -4.5], rotationY: 0.8, scale: 0.013 },
  // Back-right — paired with back-left.
  { position: [2.8, -0.5, -4.5], rotationY: -0.8, scale: 0.013 },
];

export function ArcadeCabinetModel({ count = 5 }: ArcadeCabinetModelProps) {
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
