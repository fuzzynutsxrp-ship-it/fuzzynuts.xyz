"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   ForestBackdrop — A large textured plane placed far behind the
   playable area, using `herobackground.jpg` as a matte-painting
   that provides the "real" forest atmosphere at distance.

   The procedural CyberForest sits in the foreground; this plane
   handles the infinite distance. Fog fades them into each other.

   Two planes:
   • A FAR plane (z=-55) for the deep distance — the dominant
     view when looking forward through trees.
   • A WIDE plane (z=-25) angled slightly inward on the moon
     station side, so the user sees the photo through gaps in
     the canopy as the camera scrolls left toward $NUT.

   Both use plain MeshBasicMaterial so they're unaffected by the
   scene lights (the photo already has its own lighting baked
   in), but they DO participate in fog so they blend with the
   procedural foreground.
   ───────────────────────────────────────────────────────────── */

export interface ForestBackdropProps {
  /** Live tint multiplier from Leva — `1` is the original photo,
   *  `<1` darkens it to harmonize with mood. */
  tint?: number;
}

export function ForestBackdrop({ tint = 0.7 }: ForestBackdropProps) {
  const texture = useTexture("/images/hero/herobackground.jpg");

  // Premultiplied tint so the plane sits naturally in dark scenes
  // (the reference photo is bright dusk — without darkening it
  // fights the procedural foreground).
  const tintColor = useMemo(() => {
    return new THREE.Color(tint, tint, tint);
  }, [tint]);

  return (
    <>
      {/* ── FAR backdrop: dominates the forward view at distance ── */}
      <mesh position={[0, 6, -55]} rotation={[0, 0, 0]}>
        <planeGeometry args={[80, 50]} />
        <meshBasicMaterial
          map={texture}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── WIDE backdrop: angled inward so it's visible when the
            camera swings left toward the leaderboard / moon. ── */}
      <mesh position={[-30, 6, -35]} rotation={[0, Math.PI * 0.32, 0]}>
        <planeGeometry args={[55, 40]} />
        <meshBasicMaterial
          map={texture}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── Right-side mirror: visible when camera swings right
            toward the vault. Mirror the texture horizontally so
            adjacent backdrops don't look identical. ── */}
      <mesh position={[30, 6, -35]} rotation={[0, -Math.PI * 0.32, 0]}>
        <planeGeometry args={[55, 40]} />
        <meshBasicMaterial
          map={texture}
          color={tintColor}
          fog={true}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}
