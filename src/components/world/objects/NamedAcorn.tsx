"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   NamedAcorn — A glowing acorn with a player rank/name/score
   label that bobs gently. Used by LeaderboardStation.

   The acorn body reuses the same primitive shapes as
   src/components/hero/scene/FloatingAcorns, but each instance
   here is its own little group because we attach 3D <Text>.
   ───────────────────────────────────────────────────────────── */

export interface NamedAcornProps {
  position: [number, number, number];
  rank: number;
  name: string;
  score: string;
  /** Phase offset so the bob doesn't sync across all acorns. */
  phase?: number;
  /** Bigger + brighter for top ranks. */
  feature?: boolean;
}

const RANK_COLORS = [
  "#fbbf24", // 1st — gold
  "#c0c0c0", // 2nd — silver
  "#cd7f32", // 3rd — bronze
  "#a0a0a0", // 4th
  "#a0a0a0", // 5th
];

export function NamedAcorn({
  position,
  rank,
  name,
  score,
  phase = 0,
  feature = false,
}: NamedAcornProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = RANK_COLORS[rank - 1] ?? "#a0a0a0";

  // Per-instance materials so each acorn can carry its rank tint.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#6b3a1c",
        roughness: 0.55,
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: feature ? 0.55 : 0.35,
      }),
    [color, feature],
  );
  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.3,
        emissive: color,
        emissiveIntensity: feature ? 0.9 : 0.6,
      }),
    [color, feature],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y =
      position[1] + Math.sin(t * 1.2 + phase) * 0.18;
    groupRef.current.rotation.y = t * 0.3 + phase;
  });

  const scale = feature ? 1.25 : 1;

  return (
    <group ref={groupRef} position={position}>
      {/* ── Acorn body ── */}
      <group scale={scale}>
        <mesh material={bodyMat}>
          <sphereGeometry args={[0.28, 14, 12]} />
        </mesh>
        <mesh material={capMat} position={[0, 0.16, 0]}>
          <sphereGeometry
            args={[0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
        </mesh>
        <mesh position={[0, 0.36, 0]} material={bodyMat}>
          <cylinderGeometry args={[0.025, 0.03, 0.1, 6]} />
        </mesh>
      </group>

      {/* ── Floating label that always faces the camera ── */}
      <Billboard position={[0, 0.85, 0]}>
        <Text
          fontSize={feature ? 0.18 : 0.14}
          color={color}
          outlineColor="#0a0500"
          outlineWidth={0.008}
          anchorX="center"
          anchorY="middle"
        >
          {`#${rank}  ${name}`}
        </Text>
        <Text
          fontSize={feature ? 0.13 : 0.1}
          color="#f0ede6"
          outlineColor="#0a0500"
          outlineWidth={0.005}
          anchorX="center"
          anchorY="middle"
          position={[0, feature ? -0.22 : -0.18, 0]}
        >
          {score}
        </Text>
      </Billboard>
    </group>
  );
}
