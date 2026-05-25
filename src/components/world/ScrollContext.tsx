"use client";

import { createContext, useContext } from "react";

/* ─────────────────────────────────────────────────────────────
   ScrollContext — Ref-based scroll progress shared between the
   3D scene (CameraRig, stations) and 2D HUD overlays.

   Uses a *mutable ref object* instead of state so consumers can
   read the latest value inside `useFrame` without triggering a
   re-render every scroll tick.
   ───────────────────────────────────────────────────────────── */

export interface ScrollState {
  /** Normalized scroll position 0..1 across the whole scrollable page. */
  offset: number;
  /** Most recent scroll velocity (delta offset per frame), useful for FX. */
  velocity: number;
}

export const ScrollContext = createContext<ScrollState>({
  offset: 0,
  velocity: 0,
});

export function useScrollState() {
  return useContext(ScrollContext);
}

/* ─────────────────────────────────────────────────────────────
   Station definitions — each station owns a slice of the scroll
   range [from, to]. The CameraRig and the stations all read from
   this constant so labels, camera path, and visibility stay in
   sync.

   With 5 stations across `WORLD_SCROLL_PAGES` viewport heights:
     0.00 → 0.18  HERO         (the opening clearing)
     0.18 → 0.40  GAMES        (the circle of portals)
     0.40 → 0.60  VAULT        (treasure chest on a stump)
     0.60 → 0.80  LEADERBOARD  (floating named acorns)
     0.80 → 1.00  MOON         (giant $NUT + tokenomics + chain)
   ───────────────────────────────────────────────────────────── */

export const WORLD_SCROLL_PAGES = 5;

export type StationId = "hero" | "games" | "vault" | "leaderboard" | "moon";

export interface StationDef {
  id: StationId;
  /** Inclusive lower bound of scroll offset where this station owns focus. */
  from: number;
  /** Inclusive upper bound. */
  to: number;
  /** World-space camera target position (where the camera lerps to). */
  cameraPos: [number, number, number];
  /** World-space lookAt point. */
  lookAt: [number, number, number];
}

export const STATIONS: StationDef[] = [
  {
    // Bird's-eye twilight view of the canopy + arcade clearing,
    // matching the reference plate. Camera sits high and pulled
    // back, pitched downward so the canopy fills the lower 2/3 of
    // the frame and the distant horizon (city silhouette) sits
    // along the top edge. As the user scrolls into the next
    // station, the camera descends + tilts forward, giving a
    // cinematic "dive into the forest" feel.
    id: "hero",
    from: 0,
    to: 0.18,
    cameraPos: [0, 18, 14],
    lookAt: [0, 0, -4],
  },
  {
    // Games station — descended halfway, camera now near canopy
    // level looking forward at the portal circle.
    id: "games",
    from: 0.18,
    to: 0.42,
    cameraPos: [0, 6, 6],
    lookAt: [0, 2.0, -1.2],
  },
  {
    id: "vault",
    from: 0.42,
    to: 0.62,
    cameraPos: [4, 2.6, 2],
    lookAt: [6, 1.5, -1],
  },
  {
    id: "leaderboard",
    from: 0.62,
    to: 0.82,
    cameraPos: [-4, 3.4, 2.5],
    lookAt: [-6, 2.5, -1],
  },
  {
    id: "moon",
    from: 0.82,
    to: 1.0,
    cameraPos: [-3, 4.6, -8],
    lookAt: [-8, 4.2, -28],
  },
];

/** Map a global offset to a per-station progress in [0,1]. */
export function stationProgress(offset: number, station: StationDef): number {
  if (offset <= station.from) return 0;
  if (offset >= station.to) return 1;
  return (offset - station.from) / (station.to - station.from);
}

/** Find which station the camera is currently anchored to. */
export function activeStation(offset: number): StationDef {
  for (const s of STATIONS) {
    if (offset >= s.from && offset <= s.to) return s;
  }
  return STATIONS[STATIONS.length - 1];
}
