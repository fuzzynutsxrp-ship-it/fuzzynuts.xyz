"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   ForestBackdrop — Single large textured plane using
   `herobackground3.jpg` (the bird's-eye cyber-forest reference
   the user added). The photo carries everything we used to
   approximate procedurally: lush canopy, neon vines, arcade
   cabinets nested in a clearing, mist, distant city skyline.

   Interactive 3D (arcade GLBs, squirrels, portals, stations)
   is layered IN FRONT of this plane via the rest of the scene.

   The earlier two-photo-plus-two-wings layout was retired —
   `herobackground.jpg` and `herobackground2.jpg` showed
   different views and made adjacent panels conflict visually.
   Those files stay in the repo (used elsewhere or available
   for future revert) but this component no longer loads them.

   `MeshBasicMaterial` so the plane is unlit (the photo has its
   own lighting baked in). `fog: true` so it blends with scene
   atmospheric depth.
   ───────────────────────────────────────────────────────────── */

export interface ForestBackdropProps {
  /** Live tint multiplier from Leva. 1.0 = original photo brightness;
   *  drop below 1.0 to darken if needed. The new photo is already
   *  balanced, so the default sits high. */
  tint?: number;
}

export function ForestBackdrop({ tint = 0.85 }: ForestBackdropProps) {
  const tex = useTexture("/images/hero/herobackground3.jpg");

  const tintColor = useMemo(() => new THREE.Color(tint, tint, tint), [tint]);

  // Foreground silhouette material — pure-black, no fog, semi-opaque.
  // Frames the top of the view consistently across scroll camera
  // positions so the photo's edges never look like cut-off rectangles.
  const silhouetteMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#020405",
        transparent: true,
        opacity: 0.88,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  return (
    <>
      {/* ── Main backdrop plane ──
            Placed at z=-40 (closer than the old -55) and sized 110×62
            so it dominates the bird's-eye camera view (camera at
            (0, 18, 14) looking at (0, 0, -4)) and still fills the
            frame at the other scroll stations as the camera moves
            sideways. */}
      <mesh position={[0, 6, -40]} rotation={[0, 0, 0]}>
        <planeGeometry args={[110, 62]} />
        <meshBasicMaterial
          map={tex}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── Foreground silhouette drapes ──
            Three pure-black planes positioned just in front of the
            camera path, off-axis so they don't block the central
            view but DO add canopy darkness at the top of frame. */}
      <mesh
        material={silhouetteMat}
        position={[-10, 8.5, 4.5]}
        rotation={[0.3, 0.4, -0.6]}
      >
        <planeGeometry args={[12, 8]} />
      </mesh>
      <mesh
        material={silhouetteMat}
        position={[10, 8.5, 4.5]}
        rotation={[0.3, -0.4, 0.6]}
      >
        <planeGeometry args={[12, 8]} />
      </mesh>
      <mesh
        material={silhouetteMat}
        position={[0, 10.5, 5]}
        rotation={[0.35, 0, 0]}
      >
        <planeGeometry args={[18, 5]} />
      </mesh>
    </>
  );
}
