"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   ForestBackdrop — Large textured planes far behind the playable
   area providing the "real" forest atmosphere at distance.

   Two reference photos in play:
   • herobackground2.jpg — DARK cyber-forest with arcade cabinets,
     neon vines and god rays. This is the dominant mood and is
     placed CENTER + RIGHT (where the camera looks forward most).
   • herobackground.jpg — lush green vines + city. Used on the
     LEFT panel for visual variety and to provide the city-skyline
     hint that's part of the brief.

   The procedural CyberForest sits in the foreground; these planes
   handle the infinite distance. Fog fades them into each other.

   All use plain MeshBasicMaterial so they're unaffected by the
   scene lights (the photos have their own lighting baked in), but
   they DO participate in fog so they blend with the procedural
   foreground.
   ───────────────────────────────────────────────────────────── */

export interface ForestBackdropProps {
  /** Live tint multiplier from Leva — `1` is the original photo,
   *  `<1` darkens it to harmonize with mood. */
  tint?: number;
}

export function ForestBackdrop({ tint = 0.7 }: ForestBackdropProps) {
  // Load BOTH reference photos. Drei `useTexture` supports an array
  // input and returns an array in the same order.
  const [darkTex, lushTex] = useTexture([
    "/images/hero/herobackground2.jpg",
    "/images/hero/herobackground.jpg",
  ]);

  // Premultiplied tint so the plane sits naturally in dark scenes
  // (the reference photo is bright dusk — without darkening it
  // fights the procedural foreground).
  const tintColor = useMemo(() => {
    return new THREE.Color(tint, tint, tint);
  }, [tint]);

  // Pure-black silhouette material for foreground branch / leaf
  // sprites. Reference image 2 has a heavy dark vignette of leaves
  // draping into the top of the frame — these planes simulate that.
  const silhouetteMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#020405",
        transparent: true,
        opacity: 0.92,
        fog: false, // foreground silhouettes stay solid — they're "right here"
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  return (
    <>
      {/* ── FAR backdrop (CENTER): the dark cyber-forest plate — this
            is the dominant view when looking forward and is what
            sells the "arcade cabinets in a neon forest" mood. ── */}
      <mesh position={[0, 6, -55]} rotation={[0, 0, 0]}>
        <planeGeometry args={[80, 50]} />
        <meshBasicMaterial
          map={darkTex}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── LEFT WIDE backdrop: the lush green / city plate. Visible
            when the camera swings left toward the leaderboard /
            moon, providing the faint cyber-skyline hint from the
            brief. ── */}
      <mesh position={[-30, 6, -35]} rotation={[0, Math.PI * 0.32, 0]}>
        <planeGeometry args={[55, 40]} />
        <meshBasicMaterial
          map={lushTex}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── RIGHT WIDE backdrop: the dark plate mirrored. Visible
            when the camera swings right toward the vault. Keeps the
            mood consistent on that side. ── */}
      <mesh position={[30, 6, -35]} rotation={[0, -Math.PI * 0.32, 0]}>
        <planeGeometry args={[55, 40]} />
        <meshBasicMaterial
          map={darkTex}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Foreground silhouette frame — pure-black "branches"
            draping in from above-left, above-right, and the bottom.
            Reference: the dark cabinet plate (herobackground2.jpg)
            has heavy leaf / vine darkness encroaching from every
            edge. These are large flat planes positioned just in
            front of the camera, off-axis so they don't block the
            scene but DO create the framed-by-foliage feel. ── */}
      {/* Top-left drape */}
      <mesh
        material={silhouetteMat}
        position={[-9, 7.5, 4.5]}
        rotation={[0.3, 0.4, -0.6]}
      >
        <planeGeometry args={[10, 7]} />
      </mesh>
      {/* Top-right drape */}
      <mesh
        material={silhouetteMat}
        position={[9, 7.5, 4.5]}
        rotation={[0.3, -0.4, 0.6]}
      >
        <planeGeometry args={[10, 7]} />
      </mesh>
      {/* Top-center light drape — sits higher so the player still sees
          through, but the leading edge encroaches on the top of frame. */}
      <mesh
        material={silhouetteMat}
        position={[0, 9.5, 5]}
        rotation={[0.35, 0, 0]}
      >
        <planeGeometry args={[14, 4.5]} />
      </mesh>
    </>
  );
}
