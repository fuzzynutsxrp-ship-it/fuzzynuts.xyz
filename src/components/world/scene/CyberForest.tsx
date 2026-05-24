"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { NeonVine } from "./NeonVine";

/* ─────────────────────────────────────────────────────────────
   CyberForest — Lush, ancient forest backdrop matching the
   reference plate (lush greens + thick neon biomechanical vines
   wrapping massive trunks; faint cyberpunk skyline visible
   through the trees in MoonStation's distance).

   Layers:
   • Thick gnarled trunks (multi-segment, jittered radius)
   • Multi-tier leafy canopy (3 stacked low-poly cones)
   • Neon vines spiraling around a subset of trunks (NeonVine)
   • Bioluminescent ground halo

   Trees are deterministic (seeded RNG) so SSR/CSR agree.
   ───────────────────────────────────────────────────────────── */

export interface CyberForestProps {
  /** Lower count on mobile for perf. */
  treeCount?: number;
  /** Subtle wind sway on canopies (skip on low-end devices). */
  wind?: boolean;
  /** Live-tweaked vine glow strength from Leva (default 1). */
  vineIntensity?: number;
  /** Hue mix for vines — cycles between cyan/electric-blue/neon-green. */
  vineColors?: [string, string, string];
}

interface TreeData {
  position: [number, number, number];
  rotation: number;
  scale: number;
  trunkHeight: number;
  trunkRadius: number;
  canopyHue: number;
  phase: number;
  // Vine config — only some trees get vines (perf).
  hasVines: boolean;
  vineCount: number;
}

export function CyberForest({
  treeCount = 28,
  wind = true,
  vineIntensity = 1,
  vineColors = ["#22d3ee", "#3b82f6", "#10b981"],
}: CyberForestProps) {
  // ── Generate tree data once (deterministic) ──
  const trees = useMemo<TreeData[]>(() => {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const out: TreeData[] = [];
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + rand() * 0.35;
      const radius = 13 + rand() * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Front-facing trees (camera-side) are slightly closer and bigger to
      // feel "ancient" — they're what the player sees most.
      const front = Math.abs(angle - Math.PI / 2) < Math.PI / 2 ? 1 : 0.85;
      out.push({
        position: [x, 0, z],
        rotation: rand() * Math.PI * 2,
        scale: front * (1.1 + rand() * 0.9),
        trunkHeight: 3.5 + rand() * 2.5,
        trunkRadius: 0.32 + rand() * 0.18,
        canopyHue: 0.28 + rand() * 0.06,
        phase: rand() * Math.PI * 2,
        // ~40% of trees carry vines; biased toward foreground trees.
        hasVines: rand() < (front > 0.95 ? 0.55 : 0.25),
        vineCount: 1 + Math.floor(rand() * 2),
      });
    }
    return out;
  }, [treeCount]);

  // ── Shared geometries ──
  const trunkGeo = useMemo(
    () => new THREE.CylinderGeometry(0.85, 1.0, 1, 9, 1),
    [],
  );
  const canopyGeoA = useMemo(() => new THREE.ConeGeometry(1.7, 2.6, 8), []);
  const canopyGeoB = useMemo(() => new THREE.ConeGeometry(1.35, 2.2, 8), []);
  const canopyGeoC = useMemo(() => new THREE.ConeGeometry(0.95, 1.6, 8), []);

  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a1d12",
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );

  // Per-tree canopy material (so we can vary hue).
  const canopyMats = useMemo(
    () =>
      trees.map(
        (t) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(t.canopyHue, 0.6, 0.22),
            roughness: 0.85,
            metalness: 0,
            flatShading: true,
            emissive: new THREE.Color("#0a1f0a"),
            emissiveIntensity: 0.3,
          }),
      ),
    [trees],
  );

  // ── Ground halo (bioluminescent forest floor) ──
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!wind || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const tree = children[i];
      const data = trees[i];
      if (!data) continue;
      tree.rotation.z = Math.sin(t * 0.5 + data.phase) * 0.03;
    }
  });

  return (
    <>
      {/* ── Dark mossy ground ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <circleGeometry args={[44, 64]} />
        <meshStandardMaterial
          color="#06140a"
          roughness={1}
          metalness={0}
          emissive="#021006"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Inner bioluminescent ring on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <ringGeometry args={[3.5, 12, 64]} />
        <meshBasicMaterial
          color="#0c5a3b"
          transparent
          opacity={0.42}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
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
            {/* Trunk: cylinder scaled to height × radius. We reuse a single
                shared CylinderGeometry and scale per-tree (cheap GPU op). */}
            <mesh
              geometry={trunkGeo}
              material={trunkMat}
              position={[0, t.trunkHeight / 2, 0]}
              scale={[t.trunkRadius, t.trunkHeight, t.trunkRadius]}
            />

            {/* Multi-tier canopy */}
            <mesh
              geometry={canopyGeoA}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 1.3, 0]}
            />
            <mesh
              geometry={canopyGeoB}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 2.5, 0]}
            />
            <mesh
              geometry={canopyGeoC}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 3.4, 0]}
            />

            {/* Neon vines (only on a subset of trees, foreground-biased) */}
            {t.hasVines &&
              Array.from({ length: t.vineCount }).map((_, vi) => (
                <NeonVine
                  key={vi}
                  trunkHeight={t.trunkHeight}
                  trunkRadius={t.trunkRadius * 1.05}
                  startAngle={(vi / t.vineCount) * Math.PI * 2 + t.phase}
                  color={vineColors[(i + vi) % vineColors.length]}
                  intensity={vineIntensity}
                  turns={2.4 + (i % 3) * 0.4}
                />
              ))}
          </group>
        ))}
      </group>
    </>
  );
}
