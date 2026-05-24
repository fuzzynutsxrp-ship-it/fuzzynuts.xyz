"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Model } from "./Model";

/* ─────────────────────────────────────────────────────────────
   SquirrelModel — Two populations of squirrels:

   ── Orbiters ──
   Scamper around the camera path, hop in a sinusoidal bob, face
   direction of travel. Lead orbiter detours toward `target`
   (hovered portal) — preserved from the procedural Squirrels
   component for interactivity.

   ── Perchers ──
   Static placements on imaginary branches / logs around the
   foreground, matching the reference photos. Each percher has
   a slight idle-breathing animation so they don't look pasted.
   ───────────────────────────────────────────────────────────── */

const MODEL_URL = "/models/low_poly_squirrel.glb";

export interface SquirrelModelProps {
  /** Total squirrel count split across orbiters + perchers. */
  count?: number;
  /** Hovered portal position — lead orbiter detours toward it. */
  target?: THREE.Vector3 | null;
  /** Leva-driven scamper speed multiplier. */
  animSpeed?: number;
}

interface OrbitDatum {
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  scale: number;
}

interface PerchDatum {
  position: [number, number, number];
  rotationY: number;
  scale: number;
  phase: number;
}

// Hand-placed perch spots on imaginary branches around the foreground
// trees. Y positions chosen to feel "on a thick branch ~3-5 units up".
const PERCH_SPOTS: PerchDatum[] = [
  // Foreground left tree, mid-height branch — visible in hero view.
  { position: [-5.8, 3.2, 3.5], rotationY: 0.8, scale: 0.45, phase: 0 },
  // Foreground right tree, lower branch.
  { position: [5.5, 2.6, 3.0], rotationY: -1.0, scale: 0.5, phase: 1.4 },
  // Back-center tree branch, peeking down toward the camera.
  { position: [2.0, 4.5, -8.5], rotationY: 0.2, scale: 0.4, phase: 2.7 },
];

export function SquirrelModel({
  count = 6,
  target = null,
  animSpeed = 1,
}: SquirrelModelProps) {
  // Split: roughly half of `count` are perchers (capped by PERCH_SPOTS
  // length), the rest orbit. Always keep at least 1 orbiter so the
  // portal-detour interaction still has someone to drive.
  const perchCount = Math.min(
    PERCH_SPOTS.length,
    Math.max(0, Math.floor(count / 2)),
  );
  const orbitCount = Math.max(1, count - perchCount);

  const orbiters = useMemo<OrbitDatum[]>(() => {
    let seed = 909;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: orbitCount }, () => ({
      orbitRadius: 4.5 + rand() * 4,
      orbitSpeed: 0.18 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      scale: 0.35 + rand() * 0.18,
    }));
  }, [orbitCount]);

  const perchers = PERCH_SPOTS.slice(0, perchCount);

  return (
    <>
      {orbiters.map((d, i) => (
        <OrbitingSquirrel
          key={`o${i}`}
          data={d}
          target={target}
          isLead={i === 0}
          animSpeed={animSpeed}
        />
      ))}
      {perchers.map((p, i) => (
        <PerchedSquirrel key={`p${i}`} data={p} animSpeed={animSpeed} />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   OrbitingSquirrel — Active scampering instance.
   ───────────────────────────────────────────────────────────── */

interface OrbitProps {
  data: OrbitDatum;
  target: THREE.Vector3 | null;
  isLead: boolean;
  animSpeed: number;
}

function OrbitingSquirrel({ data, target, isLead, animSpeed }: OrbitProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * animSpeed;

    const angle = t * data.orbitSpeed + data.phase;
    let x = Math.cos(angle) * data.orbitRadius;
    let z = Math.sin(angle) * data.orbitRadius;
    if (isLead && target) {
      const lerp = 0.5 + Math.sin(t * 2) * 0.05;
      x = THREE.MathUtils.lerp(x, target.x, lerp);
      z = THREE.MathUtils.lerp(z, target.z, lerp);
    }

    const hop = Math.abs(Math.sin(t * 5 + data.phase));
    const y = -0.4 + hop * 0.18;
    groupRef.current.position.set(x, y, z);

    const facing =
      isLead && target
        ? Math.atan2(target.x - x, target.z - z)
        : angle + Math.PI / 2;
    groupRef.current.rotation.y = facing;
    groupRef.current.rotation.x = -0.12 + hop * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Model url={MODEL_URL} scale={data.scale} />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   PerchedSquirrel — Stationary, with subtle idle breathing.
   Reference: the squirrel sitting on a branch in
   herobackground.jpg.
   ───────────────────────────────────────────────────────────── */

interface PerchProps {
  data: PerchDatum;
  animSpeed: number;
}

function PerchedSquirrel({ data, animSpeed }: PerchProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * animSpeed;
    // Idle breathing: tiny Y bob + micro head-look sway.
    groupRef.current.position.y =
      data.position[1] + Math.sin(t * 1.5 + data.phase) * 0.025;
    groupRef.current.rotation.y =
      data.rotationY + Math.sin(t * 0.6 + data.phase) * 0.08;
  });

  return (
    <group
      ref={groupRef}
      position={data.position}
      rotation={[0, data.rotationY, 0]}
    >
      <Model url={MODEL_URL} scale={data.scale} />
    </group>
  );
}

export default SquirrelModel;
