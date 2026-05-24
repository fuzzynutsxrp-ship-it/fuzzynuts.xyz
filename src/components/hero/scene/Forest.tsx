"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   Forest — Low-poly dusk forest backdrop.

   • A circular ground disc with a soft glow ring.
   • A ring of stylized cone+cylinder trees around the camera.
   • Subtle wind sway on the canopies (single useFrame for all
     trees → one matrix update per frame, no per-mesh state).

   All geometries/materials are memoized + shared across instances
   so the entire forest costs ~1 draw of geometry × N matrices.
   ───────────────────────────────────────────────────────────── */

interface ForestProps {
  /** Lower count on mobile for perf. */
  treeCount?: number;
  /** Enable subtle wind sway. Disable on low-end devices. */
  wind?: boolean;
}

interface TreeData {
  position: [number, number, number];
  rotation: number;
  scale: number;
  hue: number;
  phase: number;
}

export function Forest({ treeCount = 28, wind = true }: ForestProps) {
  // Pre-compute deterministic tree placements (no per-frame allocation).
  const trees = useMemo<TreeData[]>(() => {
    const out: TreeData[] = [];
    // Seeded PRNG so SSR/CSR don't disagree on positions.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < treeCount; i++) {
      // Ring of trees with some radial jitter.
      const angle = (i / treeCount) * Math.PI * 2 + rand() * 0.25;
      const radius = 14 + rand() * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      out.push({
        position: [x, 0, z],
        rotation: rand() * Math.PI * 2,
        scale: 0.9 + rand() * 0.7,
        hue: 0.28 + rand() * 0.08, // varying forest green
        phase: rand() * Math.PI * 2,
      });
    }
    return out;
  }, [treeCount]);

  // Shared geometries — one allocation, reused by every tree.
  const trunkGeo = useMemo(
    () => new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6),
    [],
  );
  const canopyGeoA = useMemo(() => new THREE.ConeGeometry(1.3, 2.4, 7), []);
  const canopyGeoB = useMemo(() => new THREE.ConeGeometry(1.0, 2.0, 7), []);
  const canopyGeoC = useMemo(() => new THREE.ConeGeometry(0.7, 1.4, 7), []);

  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a2818",
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );

  // Per-tree canopy material (so we can vary hue) — small list, fine.
  const canopyMats = useMemo(() => {
    return trees.map(
      (t) =>
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(t.hue, 0.55, 0.18),
          roughness: 0.85,
          metalness: 0,
          flatShading: true,
          emissive: new THREE.Color("#0a1f0a"),
          emissiveIntensity: 0.25,
        }),
    );
  }, [trees]);

  const groupRef = useRef<THREE.Group>(null);

  // Wind sway: rotate each tree slightly on Z based on its phase.
  useFrame((state) => {
    if (!wind || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const tree = children[i];
      const data = trees[i];
      if (!data) continue;
      tree.rotation.z = Math.sin(t * 0.6 + data.phase) * 0.04;
    }
  });

  return (
    <>
      {/* ── Ground disc ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <circleGeometry args={[40, 48]} />
        <meshStandardMaterial
          color="#0a1a0a"
          roughness={1}
          metalness={0}
          emissive="#020503"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* ── Glow ring on the ground (mossy halo) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <ringGeometry args={[4.5, 11, 64]} />
        <meshBasicMaterial
          color="#0c3d28"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Trees ── */}
      <group ref={groupRef}>
        {trees.map((t, i) => (
          <group
            key={i}
            position={t.position}
            rotation={[0, t.rotation, 0]}
            scale={t.scale}
          >
            {/* Trunk */}
            <mesh
              geometry={trunkGeo}
              material={trunkMat}
              position={[0, 0.7, 0]}
            />
            {/* Stacked cone canopy */}
            <mesh
              geometry={canopyGeoA}
              material={canopyMats[i]}
              position={[0, 2.4, 0]}
            />
            <mesh
              geometry={canopyGeoB}
              material={canopyMats[i]}
              position={[0, 3.6, 0]}
            />
            <mesh
              geometry={canopyGeoC}
              material={canopyMats[i]}
              position={[0, 4.6, 0]}
            />
          </group>
        ))}
      </group>
    </>
  );
}
