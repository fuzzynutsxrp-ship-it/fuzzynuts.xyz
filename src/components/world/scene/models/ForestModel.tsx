"use client";

import { Model } from "./Model";

/* ─────────────────────────────────────────────────────────────
   ForestModel — Loads low_poly_forest.glb as a single mesh that
   replaces the procedural cone-tree forest in CyberForest.

   ⚠️  PERFORMANCE WARNING ⚠️
   This GLB is ~90 MB. Even on a fast connection it adds several
   seconds of first-paint latency. Drei `useGLTF` caches it, and
   the whole 3D bundle is dynamic-imported behind `ssr:false` so
   the page's static HTML doesn't block on it — but users will
   see the SquirrelSpinner fallback for noticeably longer than
   before. If this proves unacceptable, swap back to procedural
   CyberForest via the DEV_MODE toggle in WorldCanvas.
   ───────────────────────────────────────────────────────────── */

const MODEL_URL = "/models/low_poly_forest.glb";

export interface ForestModelProps {
  /** World-space position (sits on the ground plane by default). */
  position?: [number, number, number];
  /** Y-axis rotation in radians (orients the forest's "front" toward camera). */
  rotationY?: number;
  /** Uniform scale — tune to match scene proportions. */
  scale?: number;
}

// Source GLB has a natural bbox of ~4040 units across (Sketchfab
// export at meter scale × 1000ish). Default scale 0.005 brings that
// down to ~20 units — about the size of our playable forest area.
// Adjust via the Forest Studio "glbForestScale" slider.
export function ForestModel({
  position = [0, -0.5, 0],
  rotationY = 0,
  scale = 0.005,
}: ForestModelProps) {
  return (
    <Model
      url={MODEL_URL}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={scale}
    />
  );
}

export default ForestModel;
