"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   FloatingAcorns — Glowing acorns drifting through the scene.

   Each acorn:
   • A tiny low-poly group (body + cap) — cheap to instance.
   • Bobs along a per-particle orbit.
   • Optional Trail (drei) for a subtle glow streak.

   Geometries + materials are shared. We keep the total count low
   (<~14 desktop, <~6 mobile) because Trail uses a custom line
   buffer per acorn — that's the dominant cost.
   ───────────────────────────────────────────────────────────── */

interface FloatingAcornsProps {
  count?: number;
  /** Render trails (desktop only — costly on mobile). */
  trails?: boolean;
}

interface AcornData {
  orbitRadius: number;
  orbitHeight: number;
  speed: number;
  phase: number;
  scale: number;
  drift: number;
}

const ACORN_BODY_COLOR = new THREE.Color("#6b3a1c");
const ACORN_CAP_COLOR = new THREE.Color("#fbbf24");
const ACORN_EMISSIVE = new THREE.Color("#fbbf24");

export function FloatingAcorns({
  count = 12,
  trails = true,
}: FloatingAcornsProps) {
  // Shared geometries.
  const bodyGeo = useMemo(() => new THREE.SphereGeometry(0.22, 12, 10), []);
  const capGeo = useMemo(
    () => new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    [],
  );
  const stemGeo = useMemo(
    () => new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6),
    [],
  );

  // Shared materials.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ACORN_BODY_COLOR,
        roughness: 0.5,
        metalness: 0.1,
        emissive: ACORN_EMISSIVE,
        emissiveIntensity: 0.4,
      }),
    [],
  );
  const capMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ACORN_CAP_COLOR,
        roughness: 0.3,
        metalness: 0.25,
        emissive: ACORN_EMISSIVE,
        emissiveIntensity: 0.55,
      }),
    [],
  );
  const stemMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a2818",
        roughness: 0.7,
        metalness: 0,
      }),
    [],
  );

  // Deterministic per-acorn orbit data.
  const acorns = useMemo<AcornData[]>(() => {
    let seed = 4242;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => ({
      orbitRadius: 3 + rand() * 5,
      orbitHeight: 1.5 + rand() * 3.5,
      speed: 0.15 + rand() * 0.35,
      phase: rand() * Math.PI * 2,
      scale: 0.75 + rand() * 0.65,
      drift: 0.2 + rand() * 0.4,
    }));
  }, [count]);

  return (
    <group>
      {acorns.map((a, i) => (
        <AcornOrbiter
          key={i}
          data={a}
          bodyGeo={bodyGeo}
          capGeo={capGeo}
          stemGeo={stemGeo}
          bodyMat={bodyMat}
          capMat={capMat}
          stemMat={stemMat}
          trail={trails}
        />
      ))}
    </group>
  );
}

interface AcornOrbiterProps {
  data: AcornData;
  bodyGeo: THREE.BufferGeometry;
  capGeo: THREE.BufferGeometry;
  stemGeo: THREE.BufferGeometry;
  bodyMat: THREE.Material;
  capMat: THREE.Material;
  stemMat: THREE.Material;
  trail: boolean;
}

function AcornOrbiter({
  data,
  bodyGeo,
  capGeo,
  stemGeo,
  bodyMat,
  capMat,
  stemMat,
  trail,
}: AcornOrbiterProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const angle = t * data.speed + data.phase;
    const x = Math.cos(angle) * data.orbitRadius;
    const z = Math.sin(angle) * data.orbitRadius;
    const y = data.orbitHeight + Math.sin(t * 1.3 + data.phase) * data.drift;
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y = angle * 0.5;
    groupRef.current.rotation.x = Math.sin(t * 0.8 + data.phase) * 0.2;
  });

  const acornBody = (
    <group ref={groupRef} scale={data.scale}>
      {/* Body */}
      <mesh geometry={bodyGeo} material={bodyMat} />
      {/* Cap (rotated dome on top) */}
      <mesh geometry={capGeo} material={capMat} position={[0, 0.12, 0]} />
      {/* Stem */}
      <mesh geometry={stemGeo} material={stemMat} position={[0, 0.28, 0]} />
    </group>
  );

  if (!trail) return acornBody;

  return (
    <Trail
      width={0.5}
      length={4}
      decay={3}
      color={"#fbbf24"}
      attenuation={(t) => t * t}
    >
      {acornBody}
    </Trail>
  );
}
