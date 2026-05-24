"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   Squirrels — Low-poly cartoon squirrels that scamper around the
   forest clearing and occasionally glance at the camera.

   Each squirrel:
   • Body + head + bushy tail (sphere primitives).
   • Pivots its head toward the camera periodically.
   • Hops in a small wandering loop with a sine bob.
   • When `target` is provided (a hovered game portal), the closest
     squirrel detours toward it for extra cuteness.

   All geometries/materials are shared. ~6 squirrels × ~8 meshes
   each = ~48 meshes total, ~2k tris. Cheap.
   ───────────────────────────────────────────────────────────── */

export interface SquirrelsProps {
  count?: number;
  /** Optional world-space point a curious squirrel will run toward. */
  target?: THREE.Vector3 | null;
}

interface SquirrelData {
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  scale: number;
  bodyHue: number;
  glanceOffset: number;
}

export function Squirrels({ count = 5, target = null }: SquirrelsProps) {
  // Deterministic per-squirrel parameters.
  const squirrels = useMemo<SquirrelData[]>(() => {
    let seed = 909;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => ({
      orbitRadius: 4.5 + rand() * 4,
      orbitSpeed: 0.18 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      scale: 0.55 + rand() * 0.25,
      bodyHue: 0.06 + rand() * 0.04, // warm rust/brown
      glanceOffset: rand() * 6,
    }));
  }, [count]);

  // Shared geometries.
  const bodyGeo = useMemo(() => new THREE.SphereGeometry(0.32, 12, 10), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.22, 12, 10), []);
  const earGeo = useMemo(() => new THREE.ConeGeometry(0.06, 0.14, 5), []);
  const tailGeo = useMemo(() => new THREE.SphereGeometry(0.28, 10, 8), []);
  const limbGeo = useMemo(() => new THREE.SphereGeometry(0.08, 8, 6), []);
  const eyeGeo = useMemo(() => new THREE.SphereGeometry(0.025, 8, 6), []);

  // Shared per-squirrel materials.
  const mats = useMemo(() => {
    return squirrels.map((s) => {
      const body = new THREE.Color().setHSL(s.bodyHue, 0.55, 0.32);
      const belly = new THREE.Color().setHSL(0.1, 0.4, 0.78);
      return {
        body: new THREE.MeshStandardMaterial({
          color: body,
          roughness: 0.85,
          flatShading: true,
        }),
        belly: new THREE.MeshStandardMaterial({
          color: belly,
          roughness: 0.9,
          flatShading: true,
        }),
        eye: new THREE.MeshStandardMaterial({
          color: "#0a0a0a",
          roughness: 0.3,
          emissive: "#ffffff",
          emissiveIntensity: 0.15,
        }),
      };
    });
  }, [squirrels]);

  return (
    <group>
      {squirrels.map((s, i) => (
        <Squirrel
          key={i}
          data={s}
          target={target}
          isLead={i === 0}
          bodyGeo={bodyGeo}
          headGeo={headGeo}
          earGeo={earGeo}
          tailGeo={tailGeo}
          limbGeo={limbGeo}
          eyeGeo={eyeGeo}
          mats={mats[i]}
        />
      ))}
    </group>
  );
}

interface SquirrelProps {
  data: SquirrelData;
  target: THREE.Vector3 | null;
  isLead: boolean;
  bodyGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  earGeo: THREE.BufferGeometry;
  tailGeo: THREE.BufferGeometry;
  limbGeo: THREE.BufferGeometry;
  eyeGeo: THREE.BufferGeometry;
  mats: {
    body: THREE.Material;
    belly: THREE.Material;
    eye: THREE.Material;
  };
}

// Reusable scratch vector (avoid per-frame allocation).
const _scratch = new THREE.Vector3();

function Squirrel({
  data,
  target,
  isLead,
  bodyGeo,
  headGeo,
  earGeo,
  tailGeo,
  limbGeo,
  eyeGeo,
  mats,
}: SquirrelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Base orbit position.
    const angle = t * data.orbitSpeed + data.phase;
    let x = Math.cos(angle) * data.orbitRadius;
    let z = Math.sin(angle) * data.orbitRadius;

    // If lead squirrel and we have a target, detour toward it.
    if (isLead && target) {
      const lerp = 0.5 + Math.sin(t * 2) * 0.05;
      x = THREE.MathUtils.lerp(x, target.x, lerp);
      z = THREE.MathUtils.lerp(z, target.z, lerp);
    }

    // Hop pattern (faster scamper + bob).
    const hop = Math.abs(Math.sin(t * 5 + data.phase));
    const y = -0.2 + hop * 0.18;

    groupRef.current.position.set(x, y, z);

    // Face direction of travel (tangent to orbit).
    const facing =
      isLead && target
        ? Math.atan2(target.x - x, target.z - z)
        : angle + Math.PI / 2;
    groupRef.current.rotation.y = facing;

    // Slight forward lean while running.
    groupRef.current.rotation.x = -0.12 + hop * 0.08;

    // Head occasionally glances at camera. We compute the head's world
    // position, get the angle from head→camera in world space, then
    // subtract the parent's facing to get a local Y rotation.
    if (headRef.current) {
      const glance = Math.sin(t * 0.6 + data.glanceOffset) > 0.7;
      if (glance) {
        const worldHead = headRef.current.getWorldPosition(_scratch);
        const camPos = state.camera.position;
        const headWorldAngle = Math.atan2(
          camPos.x - worldHead.x,
          camPos.z - worldHead.z,
        );
        headRef.current.rotation.y = headWorldAngle - facing;
      } else {
        headRef.current.rotation.y *= 0.92;
      }
    }

    // Tail wag.
    if (tailRef.current) {
      tailRef.current.rotation.z = Math.sin(t * 6 + data.phase) * 0.3;
    }
  });

  return (
    <group ref={groupRef} scale={data.scale}>
      {/* ── Body ── */}
      <mesh
        geometry={bodyGeo}
        material={mats.body}
        position={[0, 0.35, 0]}
        scale={[1, 0.9, 1.3]}
      />
      {/* Belly accent */}
      <mesh
        geometry={bodyGeo}
        material={mats.belly}
        position={[0, 0.28, 0.08]}
        scale={[0.7, 0.5, 0.9]}
      />

      {/* ── Tail (bushy, behind) ── */}
      <mesh
        ref={tailRef}
        geometry={tailGeo}
        material={mats.body}
        position={[0, 0.6, -0.45]}
        scale={[0.9, 1.4, 0.6]}
      />

      {/* ── Head (front) ── */}
      <group ref={headRef} position={[0, 0.55, 0.4]}>
        <mesh geometry={headGeo} material={mats.body} />
        {/* Ears */}
        <mesh
          geometry={earGeo}
          material={mats.body}
          position={[0.12, 0.2, -0.05]}
        />
        <mesh
          geometry={earGeo}
          material={mats.body}
          position={[-0.12, 0.2, -0.05]}
        />
        {/* Snout */}
        <mesh
          geometry={headGeo}
          material={mats.belly}
          position={[0, -0.05, 0.18]}
          scale={[0.55, 0.4, 0.5]}
        />
        {/* Eyes */}
        <mesh
          geometry={eyeGeo}
          material={mats.eye}
          position={[0.08, 0.05, 0.18]}
        />
        <mesh
          geometry={eyeGeo}
          material={mats.eye}
          position={[-0.08, 0.05, 0.18]}
        />
      </group>

      {/* ── Front paws ── */}
      <mesh
        geometry={limbGeo}
        material={mats.body}
        position={[0.12, 0.12, 0.25]}
      />
      <mesh
        geometry={limbGeo}
        material={mats.body}
        position={[-0.12, 0.12, 0.25]}
      />
      {/* Back paws */}
      <mesh
        geometry={limbGeo}
        material={mats.body}
        position={[0.18, 0.1, -0.2]}
      />
      <mesh
        geometry={limbGeo}
        material={mats.body}
        position={[-0.18, 0.1, -0.2]}
      />
    </group>
  );
}
