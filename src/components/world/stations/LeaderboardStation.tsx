"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { NamedAcorn } from "../objects/NamedAcorn";
import { useScrollState, stationProgress, STATIONS } from "../ScrollContext";

/* ─────────────────────────────────────────────────────────────
   LeaderboardStation — Glowing named acorns bobbing in a small
   constellation off to the left of the path.

   Names + scores here are placeholders. When live leaderboard
   data is plumbed in later, this becomes a prop and stays
   identical shape-wise.
   ───────────────────────────────────────────────────────────── */

const STATION_DEF = STATIONS.find((s) => s.id === "leaderboard")!;

// Placeholder podium until live data is wired in. Intentionally
// fake-looking r-addresses (truncated) so no real wallets leak.
const ENTRIES: { rank: number; name: string; score: string }[] = [
  { rank: 1, name: "rNutKing…42x", score: "184,920" },
  { rank: 2, name: "FuzzyPro", score: "171,403" },
  { rank: 3, name: "AcornChad", score: "159,887" },
  { rank: 4, name: "rL3aD…8q", score: "142,210" },
  { rank: 5, name: "SquirrelGod", score: "131,506" },
];

export function LeaderboardStation() {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScrollState();

  useFrame(() => {
    if (!groupRef.current) return;
    const p = stationProgress(scroll.offset, STATION_DEF);
    const opacity = THREE.MathUtils.smoothstep(p, 0.05, 0.4);
    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(0.55 + opacity * 0.45);
  });

  // Podium-ish arrangement — 1st highest in the middle, 2/3 flanking, 4/5 in back.
  const layout: Array<{
    pos: [number, number, number];
    phase: number;
    feature: boolean;
  }> = [
    { pos: [0, 3.4, 0], phase: 0, feature: true }, // 1st
    { pos: [-1.6, 2.8, 0.3], phase: 1.0, feature: true }, // 2nd
    { pos: [1.6, 2.6, 0.3], phase: 2.1, feature: true }, // 3rd
    { pos: [-2.6, 2.2, -0.7], phase: 3.0, feature: false }, // 4th
    { pos: [2.6, 2.0, -0.7], phase: 4.2, feature: false }, // 5th
  ];

  return (
    <group ref={groupRef} position={[-6, 0, -1]}>
      {/* ── Station heading ── */}
      <Billboard position={[0, 4.6, 0]}>
        <Text
          fontSize={0.4}
          color="#fbbf24"
          outlineColor="#0a0500"
          outlineWidth={0.018}
          anchorX="center"
          anchorY="middle"
        >
          THIS WEEK&apos;S TOP 5
        </Text>
        <Text
          fontSize={0.14}
          color="#f0ede6"
          outlineColor="#0a0500"
          outlineWidth={0.006}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.42, 0]}
        >
          Connect your wallet to claim your rank
        </Text>
      </Billboard>

      {ENTRIES.map((e, i) => (
        <NamedAcorn
          key={e.rank}
          position={layout[i].pos}
          rank={e.rank}
          name={e.name}
          score={e.score}
          phase={layout[i].phase}
          feature={layout[i].feature}
        />
      ))}

      {/* ── Soft glow plate under the group ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.3, 0]}>
        <ringGeometry args={[1.6, 3.2, 48]} />
        <meshBasicMaterial
          color="#10b981"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
