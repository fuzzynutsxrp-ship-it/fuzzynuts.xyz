"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   AtmosphericMotes — Floating dust particles drifting through
   the volume of the forest. The whole point of these motes is
   to MAKE THE GOD RAYS VISIBLE — without particles in the air,
   light shafts look like flat additive cones. With them, the
   eye reads volumetric depth.

   Implementation:
   • <points> with a procedural circle texture so each particle
     is a soft glowing disc, not a hard square.
   • ~600 motes desktop, 200 mobile. Cheap (one draw call).
   • Drift slowly upward + a sinusoidal X/Z sway so they don't
     all rise in a column.
   • Brightness scales with `brightness` from Leva (mood +
     atmosphere coupling done in WorldCanvas).
   ───────────────────────────────────────────────────────────── */

export interface AtmosphericMotesProps {
  /** Number of motes (kept low — they're all one draw call but each
   *  particle still costs a fragment). */
  count?: number;
  /** Brightness multiplier from Leva. */
  brightness?: number;
  /** Tint — usually a pale blue to match the moonlight cast. */
  color?: string;
}

export function AtmosphericMotes({
  count = 600,
  brightness = 1,
  color = "#cfe3ff",
}: AtmosphericMotesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Build deterministic positions + per-mote phase / speed so each
  // particle has its own drift cadence.
  const { positions, phases, speeds } = useMemo(() => {
    let seed = 9090;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Scatter within the playable volume — same footprint as the
      // god rays so motes light up wherever a ray passes through.
      positions[i * 3 + 0] = (rand() - 0.5) * 28; // x
      positions[i * 3 + 1] = rand() * 10 - 1; // y (-1 .. 9)
      positions[i * 3 + 2] = -rand() * 16 + 4; // z (-12 .. 4)
      phases[i] = rand() * Math.PI * 2;
      speeds[i] = 0.06 + rand() * 0.18; // upward drift speed
    }
    return { positions, phases, speeds };
  }, [count]);

  // Soft circular sprite — generated procedurally so we don't ship a
  // texture file. Radial gradient: white center → transparent edge.
  const spriteTexture = useMemo(() => {
    const SIZE = 64;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      SIZE / 2,
      SIZE / 2,
      0,
      SIZE / 2,
      SIZE / 2,
      SIZE / 2,
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.22,
        map: spriteTexture,
        color: new THREE.Color(color).multiplyScalar(brightness),
        transparent: true,
        opacity: 0.55 * brightness,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        sizeAttenuation: true,
      }),
    [spriteTexture, color, brightness],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  // Slow upward drift + horizontal sway. We write directly to the
  // position buffer each frame; one needsUpdate per frame.
  useFrame((state, dt) => {
    if (!pointsRef.current) return;
    const arr = positions; // alias — we mutate the buffer in-place
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Drift up.
      arr[i3 + 1] += speeds[i] * dt;
      // Recycle when above the canopy.
      if (arr[i3 + 1] > 9) {
        arr[i3 + 1] = -1;
        // Re-randomize x/z slightly so recycled motes don't streak.
        arr[i3 + 0] += (Math.sin(t * 0.4 + phases[i]) - 0.5) * 0.4;
      }
      // Gentle horizontal sway.
      const sway = Math.sin(t * 0.5 + phases[i]) * 0.0015;
      arr[i3 + 0] += sway;
      arr[i3 + 2] += sway * 0.6;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}
