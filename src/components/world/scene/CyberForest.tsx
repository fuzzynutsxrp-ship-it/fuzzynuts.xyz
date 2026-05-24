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
  /** Hue mix for vines — cycles cyan / electric-blue / neon-green /
   *  hot-magenta. Order is meaningful: vine i uses palette[i % 4]. */
  vineColors?: string[];
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
  // Default palette pulled directly from the reference plates: cyan,
  // electric blue, neon green, and the hot-magenta accent visible in
  // the dark cyber-forest image (herobackground2.jpg).
  vineColors = ["#22d3ee", "#3b82f6", "#10b981", "#d946ef"],
}: CyberForestProps) {
  // ── Generate tree data once (deterministic). Layout has two rings:
  //
  //   • Inner ring (radius 5..10)  — dense procedural forest right
  //     next to the camera path, providing the "trees pressing in"
  //     feel from the reference plates.
  //   • Outer ring (radius 13..22) — silhouettes fading into fog so
  //     the horizon doesn't look empty.
  //
  // Plus three explicit FRAME TREES at left/right/back close to the
  // camera — these are the huge ancient trunks that frame the view
  // like the foreground trees in herobackground.jpg.
  // ────────────────────────────────────────────────────────────── */
  const trees = useMemo<TreeData[]>(() => {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const out: TreeData[] = [];

    // ── Inner dense ring ──
    const inner = Math.floor(treeCount * 0.6);
    for (let i = 0; i < inner; i++) {
      const angle = (i / inner) * Math.PI * 2 + rand() * 0.4;
      const radius = 5 + rand() * 5;
      out.push({
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rotation: rand() * Math.PI * 2,
        scale: 1.1 + rand() * 0.8,
        trunkHeight: 4.5 + rand() * 2.5,
        trunkRadius: 0.38 + rand() * 0.18,
        canopyHue: 0.32 + rand() * 0.05,
        phase: rand() * Math.PI * 2,
        // Inner ring is closest to the camera — much higher vine chance.
        hasVines: rand() < 0.7,
        vineCount: 1 + Math.floor(rand() * 3),
      });
    }

    // ── Outer silhouette ring ──
    const outer = treeCount - inner;
    for (let i = 0; i < outer; i++) {
      const angle = (i / outer) * Math.PI * 2 + rand() * 0.4;
      const radius = 13 + rand() * 9;
      out.push({
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        rotation: rand() * Math.PI * 2,
        scale: 1.0 + rand() * 0.7,
        trunkHeight: 3.5 + rand() * 2.5,
        trunkRadius: 0.3 + rand() * 0.15,
        canopyHue: 0.28 + rand() * 0.06,
        phase: rand() * Math.PI * 2,
        hasVines: rand() < 0.25,
        vineCount: 1,
      });
    }

    // ── Three explicit FRAME TREES — huge ancient trunks close to
    //    the camera path that frame the view. Positions chosen to
    //    sit just outside the visible foreground of the hero camera
    //    while still flanking the games-station portals. ──
    // Frame trees: bigger but with FEWER (and thinner) vines, because
    // the close-camera ones were creating HDR-bright cyan/blue slashes
    // across the frame at the hero scroll position. The back-center
    // tree keeps its vines — it's far enough away to read as accent.
    const FRAME_TREES: TreeData[] = [
      {
        // Hard left foreground — huge, NO vines (silhouette only).
        position: [-6.5, 0, 4.5],
        rotation: 1.1,
        scale: 2.4,
        trunkHeight: 6.5,
        trunkRadius: 0.55,
        canopyHue: 0.3,
        phase: 0,
        hasVines: false,
        vineCount: 0,
      },
      {
        // Hard right foreground — huge, NO vines (silhouette only).
        position: [6.8, 0, 4.2],
        rotation: -0.9,
        scale: 2.6,
        trunkHeight: 7.0,
        trunkRadius: 0.58,
        canopyHue: 0.31,
        phase: 1.8,
        hasVines: false,
        vineCount: 0,
      },
      {
        // Back center — far enough that vines read as accent, not a wall.
        position: [2.5, 0, -10],
        rotation: 0.4,
        scale: 2.1,
        trunkHeight: 6.0,
        trunkRadius: 0.5,
        canopyHue: 0.29,
        phase: 3.0,
        hasVines: true,
        vineCount: 2,
      },
    ];
    out.push(...FRAME_TREES);

    return out;
  }, [treeCount]);

  // ── Shared geometries — slightly taller, wider canopies so the
  //    silhouette reads as "forest enclosing the camera" not
  //    "scattered cones". ──
  const trunkGeo = useMemo(
    () => new THREE.CylinderGeometry(0.85, 1.0, 1, 9, 1),
    [],
  );
  // Stacked from widest (base) to narrowest (top) — 4 layers for density.
  const canopyGeoA = useMemo(() => new THREE.ConeGeometry(2.1, 2.6, 8), []);
  const canopyGeoB = useMemo(() => new THREE.ConeGeometry(1.7, 2.4, 8), []);
  const canopyGeoC = useMemo(() => new THREE.ConeGeometry(1.3, 2.0, 8), []);
  const canopyGeoD = useMemo(() => new THREE.ConeGeometry(0.85, 1.4, 8), []);

  // Trunks are NEARLY BLACK in the reference plates — the deep dusk
  // light leaves only silhouettes against the neon. `#0c0805` reads
  // as "ancient wet bark" rather than "wood brown".
  const trunkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0c0805",
        roughness: 0.98,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );

  // Per-tree canopy material — darker base color, deeper green
  // emissive so trees read as silhouettes with faint internal glow.
  const canopyMats = useMemo(
    () =>
      trees.map(
        (t) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(t.canopyHue, 0.5, 0.09),
            roughness: 0.9,
            metalness: 0,
            flatShading: true,
            emissive: new THREE.Color("#04140a"),
            emissiveIntensity: 0.5,
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

      {/* ── Overhead canopy dome — a large half-sphere centered ABOVE
            the camera path, inside-facing, dark green with subtle
            emissive. Creates the "enclosed under treetops" feeling
            from the reference plates where leaves drape from above
            the framing. Camera at y≈2-5, dome at y=10, radius 22. ── */}
      <mesh position={[0, 10, -2]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#03100a"
          emissive="#021008"
          emissiveIntensity={0.4}
          roughness={1}
          side={THREE.BackSide}
          fog
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

            {/* Multi-tier canopy — 4 stacked cones from widest base to
                narrowest top for a denser silhouette than 3 layers. */}
            <mesh
              geometry={canopyGeoA}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 1.1, 0]}
            />
            <mesh
              geometry={canopyGeoB}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 2.3, 0]}
            />
            <mesh
              geometry={canopyGeoC}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 3.3, 0]}
            />
            <mesh
              geometry={canopyGeoD}
              material={canopyMats[i]}
              position={[0, t.trunkHeight + 4.2, 0]}
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
