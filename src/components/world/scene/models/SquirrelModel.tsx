"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Model } from "./Model";

/* ─────────────────────────────────────────────────────────────
   SquirrelModel — Replacement for the procedural Squirrels
   component. Each squirrel is a GLB instance that inherits the
   same behavior the old one had:

   • Orbits a deterministic radius around the camera path
   • Hops in a sinusoidal bob
   • Faces direction of travel
   • Lead squirrel detours toward `target` (hovered portal)
   • `animSpeed` Leva-driven multiplier still applies

   We don't run any embedded skeletal animation here — keeping
   the behavior identical to the old procedural component means
   no surprises for the rest of the scene's interactivity.
   ───────────────────────────────────────────────────────────── */

const MODEL_URL = "/models/low_poly_squirrel.glb";

export interface SquirrelModelProps {
  count?: number;
  /** Hovered portal position — lead squirrel detours toward it. */
  target?: THREE.Vector3 | null;
  /** Leva-driven scamper speed multiplier. */
  animSpeed?: number;
}

interface SquirrelDatum {
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  scale: number;
}

export function SquirrelModel({
  count = 6,
  target = null,
  animSpeed = 1,
}: SquirrelModelProps) {
  const squirrels = useMemo<SquirrelDatum[]>(() => {
    let seed = 909;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => ({
      orbitRadius: 4.5 + rand() * 4,
      orbitSpeed: 0.18 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      // GLB is small (62 KB, low-poly). Scale tuned visually to
      // sit at the same silhouette size as the old procedural one.
      scale: 0.35 + rand() * 0.18,
    }));
  }, [count]);

  return (
    <>
      {squirrels.map((d, i) => (
        <SquirrelInstance
          key={i}
          data={d}
          target={target}
          isLead={i === 0}
          animSpeed={animSpeed}
        />
      ))}
    </>
  );
}

interface InstanceProps {
  data: SquirrelDatum;
  target: THREE.Vector3 | null;
  isLead: boolean;
  animSpeed: number;
}

function SquirrelInstance({ data, target, isLead, animSpeed }: InstanceProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * animSpeed;

    // Orbit around origin, with lead-squirrel detour to `target`.
    const angle = t * data.orbitSpeed + data.phase;
    let x = Math.cos(angle) * data.orbitRadius;
    let z = Math.sin(angle) * data.orbitRadius;
    if (isLead && target) {
      const lerp = 0.5 + Math.sin(t * 2) * 0.05;
      x = THREE.MathUtils.lerp(x, target.x, lerp);
      z = THREE.MathUtils.lerp(z, target.z, lerp);
    }

    // Hop pattern.
    const hop = Math.abs(Math.sin(t * 5 + data.phase));
    const y = -0.4 + hop * 0.18;

    groupRef.current.position.set(x, y, z);

    // Face direction of travel.
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

export default SquirrelModel;
