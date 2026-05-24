"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   ArcadeCabinet — Low-poly retro arcade machine sitting in the
   forest. Black body, glowing marquee, flickering CRT screen.

   Body parts (all simple boxes):
   • Base (deeper bottom box)
   • Body (vertical box)
   • Marquee (small box on top with emissive color)
   • Screen (front-facing plane with animated emissive)
   • Control panel (angled box at sit-down level)
   • Joystick + 2 buttons (cylinder + spheres)

   Tris budget: ~70 per cabinet. Cheap.
   ───────────────────────────────────────────────────────────── */

export interface ArcadeCabinetProps {
  position?: [number, number, number];
  rotation?: number;
  /** Marquee / accent color (hex). */
  accent?: string;
  /** Multiplier from Leva for CRT + marquee brightness. */
  glow?: number;
  /** Static label (we don't render Text inside to keep it cheap). */
  label?: string;
}

export function ArcadeCabinet({
  position = [0, 0, 0],
  rotation = 0,
  accent = "#fbbf24",
  glow = 1,
  label,
}: ArcadeCabinetProps) {
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const marqueeMat = useRef<THREE.MeshBasicMaterial>(null);
  // Avoid label warning when not provided.
  void label;

  // Shared materials per cabinet.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0c0c10",
        roughness: 0.4,
        metalness: 0.5,
        flatShading: true,
      }),
    [],
  );
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2030",
        roughness: 0.6,
        metalness: 0.3,
        flatShading: true,
      }),
    [],
  );

  useFrame((state) => {
    // CRT scanline flicker — modulate emissive intensity by a noisy sine.
    const t = state.clock.elapsedTime;
    const flicker = 0.85 + Math.sin(t * 17.3) * 0.05 + Math.sin(t * 41) * 0.03;
    if (screenMat.current) {
      screenMat.current.color.set(accent).multiplyScalar(2.5 * glow * flicker);
    }
    if (marqueeMat.current) {
      const breath = 0.95 + Math.sin(t * 1.7) * 0.05;
      marqueeMat.current.color.set(accent).multiplyScalar(3.5 * glow * breath);
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Base (slightly wider than body) ── */}
      <mesh material={trimMat} position={[0, 0.08, 0]}>
        <boxGeometry args={[1.05, 0.16, 0.85]} />
      </mesh>

      {/* ── Body ── */}
      <mesh material={bodyMat} position={[0, 1.0, 0]}>
        <boxGeometry args={[0.95, 1.7, 0.75]} />
      </mesh>

      {/* ── Top-rear stand (angled silhouette in profile) ── */}
      <mesh material={bodyMat} position={[0, 2.0, -0.25]}>
        <boxGeometry args={[0.95, 0.35, 0.25]} />
      </mesh>

      {/* ── Marquee (glowing top sign) ── */}
      <mesh position={[0, 2.0, 0.05]}>
        <boxGeometry args={[0.92, 0.32, 0.42]} />
        <meshBasicMaterial ref={marqueeMat} color={accent} toneMapped={false} />
      </mesh>

      {/* ── CRT screen (recessed slightly into the body) ── */}
      <mesh position={[0, 1.35, 0.38]} rotation={[-0.05, 0, 0]}>
        <planeGeometry args={[0.76, 0.6]} />
        <meshBasicMaterial ref={screenMat} color={accent} toneMapped={false} />
      </mesh>

      {/* Screen bezel */}
      <mesh
        material={trimMat}
        position={[0, 1.35, 0.37]}
        rotation={[-0.05, 0, 0]}
      >
        <planeGeometry args={[0.86, 0.7]} />
      </mesh>

      {/* ── Control panel (angled forward at sit-down height) ── */}
      <mesh
        material={trimMat}
        position={[0, 0.88, 0.42]}
        rotation={[-0.5, 0, 0]}
      >
        <boxGeometry args={[0.95, 0.4, 0.06]} />
      </mesh>

      {/* Joystick */}
      <mesh position={[-0.15, 0.97, 0.45]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.18, 8]} />
        <meshStandardMaterial color="#222" roughness={0.7} />
      </mesh>
      <mesh position={[-0.15, 1.06, 0.5]}>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>

      {/* Buttons */}
      {[0.05, 0.18, 0.31].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0.46]} rotation={[-0.5, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 12]} />
          <meshStandardMaterial
            color={i === 0 ? "#fbbf24" : i === 1 ? "#22d3ee" : "#10b981"}
            roughness={0.4}
            metalness={0.2}
            emissive={i === 0 ? "#fbbf24" : i === 1 ? "#22d3ee" : "#10b981"}
            emissiveIntensity={0.5 * glow}
          />
        </mesh>
      ))}

      {/* ── Coin slot (tiny dark strip) ── */}
      <mesh material={trimMat} position={[0, 0.55, 0.38]}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
      </mesh>
    </group>
  );
}
