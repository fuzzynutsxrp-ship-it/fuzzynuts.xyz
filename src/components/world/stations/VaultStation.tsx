"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import { TreasureChest } from "../objects/TreasureChest";
import { useScrollState, stationProgress, STATIONS } from "../ScrollContext";

/* ─────────────────────────────────────────────────────────────
   VaultStation — Glowing treasure chest sitting on a tree stump
   off to the right of the path. Opens on click to reveal the
   weekly prize pool.
   ───────────────────────────────────────────────────────────── */

export interface VaultStationProps {
  onChestOpen: (worldPos: THREE.Vector3) => void;
}

const STATION_DEF = STATIONS.find((s) => s.id === "vault")!;

export function VaultStation({ onChestOpen }: VaultStationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScrollState();

  useFrame(() => {
    if (!groupRef.current) return;
    const p = stationProgress(scroll.offset, STATION_DEF);
    const opacity = THREE.MathUtils.smoothstep(p, 0.05, 0.4);
    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(0.5 + opacity * 0.5);
  });

  return (
    <group ref={groupRef} position={[6, 0, -1]}>
      {/* ── Station heading ── */}
      <Billboard position={[0, 3.6, 0]}>
        <Text
          fontSize={0.42}
          color="#fbbf24"
          outlineColor="#0a0500"
          outlineWidth={0.018}
          anchorX="center"
          anchorY="middle"
        >
          TREASURE VAULT
        </Text>
        <Text
          fontSize={0.14}
          color="#f0ede6"
          outlineColor="#0a0500"
          outlineWidth={0.006}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.4, 0]}
        >
          Click the chest to peek inside
        </Text>
      </Billboard>

      {/* ── The chest itself ── */}
      <TreasureChest
        position={[0, 0, 0]}
        prizeLabel="500,000 $NUT"
        prizeSubtitle="Weekly Prize Pool · Top 3 Win"
        onOpen={onChestOpen}
      />

      {/* ── Glowing magic-circle ring underneath ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, 0]}>
        <ringGeometry args={[1.4, 1.6, 48]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
