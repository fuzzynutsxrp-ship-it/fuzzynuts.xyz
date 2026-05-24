"use client";

import { useMemo } from "react";
import { Model } from "./Model";

/* ─────────────────────────────────────────────────────────────
   FernModel — Scatters N instances of low_poly_fern.glb across
   the forest floor with seeded deterministic placement.

   Brief asks for 30..50 instances. Default 40.
   ───────────────────────────────────────────────────────────── */

const MODEL_URL = "/models/low_poly_fern.glb";

export interface FernModelProps {
  /** Number of fern instances (30..50 per the brief; default 40). */
  count?: number;
}

interface FernPlacement {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export function FernModel({ count = 40 }: FernModelProps) {
  // Seeded RNG → same layout on every render / SSR + CSR agree.
  const placements = useMemo<FernPlacement[]>(() => {
    let seed = 5151;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => {
      // Annulus around the camera path: keep ferns OFF the playable
      // center axis so they don't poke through the path or portals.
      const angle = rand() * Math.PI * 2;
      const r = 3.5 + rand() * 8;
      return {
        position: [Math.cos(angle) * r, -0.5, Math.sin(angle) * r - 1] as [
          number,
          number,
          number,
        ],
        rotationY: rand() * Math.PI * 2,
        scale: 0.4 + rand() * 0.5,
      };
    });
  }, [count]);

  return (
    <>
      {placements.map((p, i) => (
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

export default FernModel;
