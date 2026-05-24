"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   NutExplosions — A pool of particle bursts triggered on click.

   Implemented as a single InstancedMesh with N particles. Each
   particle has its own velocity, age, and lifetime kept in a
   plain TypedArray. When the pool is exhausted, the oldest
   particle is reused — no per-burst allocation, no GC churn.

   Parent calls `ref.burst(worldPos, color)` to spawn a wave of
   particles at a point — typically the click intersection or
   the position of a hovered portal.
   ───────────────────────────────────────────────────────────── */

export interface NutExplosionsHandle {
  burst: (position: THREE.Vector3, color?: THREE.Color | string) => void;
}

interface NutExplosionsProps {
  /** Maximum simultaneously-alive particles. */
  capacity?: number;
  /** Particles spawned per burst. */
  perBurst?: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const NutExplosions = forwardRef<
  NutExplosionsHandle,
  NutExplosionsProps
>(function NutExplosions({ capacity = 180, perBurst = 22 }, ref) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Particle state buffers.
  const state = useMemo(() => {
    return {
      // Position
      px: new Float32Array(capacity),
      py: new Float32Array(capacity),
      pz: new Float32Array(capacity),
      // Velocity
      vx: new Float32Array(capacity),
      vy: new Float32Array(capacity),
      vz: new Float32Array(capacity),
      // Age + lifetime + scale
      age: new Float32Array(capacity),
      life: new Float32Array(capacity).fill(0),
      scale: new Float32Array(capacity),
      cursor: 0,
    };
  }, [capacity]);

  // Shared geometry — a tiny low-poly nut shape (icosahedron is fine).
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.12, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#fbbf24",
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0.3,
      }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      burst(position, color) {
        if (color) _color.set(color);
        else _color.set("#fbbf24");

        for (let i = 0; i < perBurst; i++) {
          const idx = state.cursor;
          state.cursor = (state.cursor + 1) % capacity;

          state.px[idx] = position.x;
          state.py[idx] = position.y;
          state.pz[idx] = position.z;

          // Random spherical-ish velocity, biased upward.
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI - Math.PI / 2;
          const speed = 2.5 + Math.random() * 2.5;
          state.vx[idx] = Math.cos(theta) * Math.cos(phi) * speed;
          state.vy[idx] = Math.sin(phi) * speed + 1.5;
          state.vz[idx] = Math.sin(theta) * Math.cos(phi) * speed;

          state.age[idx] = 0;
          state.life[idx] = 0.9 + Math.random() * 0.6;
          state.scale[idx] = 0.6 + Math.random() * 0.7;

          // Per-instance color tint.
          meshRef.current?.setColorAt(idx, _color);
        }
        if (meshRef.current?.instanceColor) {
          meshRef.current.instanceColor.needsUpdate = true;
        }
      },
    }),
    [capacity, perBurst, state],
  );

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const gravity = 6.5;
    const drag = 0.86;
    let needsUpdate = false;

    for (let i = 0; i < capacity; i++) {
      if (state.life[i] <= 0) {
        // Park dead particles offscreen with zero scale.
        _dummy.position.set(0, -9999, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      state.age[i] += dt;
      if (state.age[i] >= state.life[i]) {
        state.life[i] = 0;
        needsUpdate = true;
        _dummy.position.set(0, -9999, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      // Integrate.
      state.vy[i] -= gravity * dt;
      state.vx[i] *= Math.pow(drag, dt * 60);
      state.vz[i] *= Math.pow(drag, dt * 60);

      state.px[i] += state.vx[i] * dt;
      state.py[i] += state.vy[i] * dt;
      state.pz[i] += state.vz[i] * dt;

      const lifeT = state.age[i] / state.life[i];
      const s = state.scale[i] * (1 - lifeT * 0.6);

      _dummy.position.set(state.px[i], state.py[i], state.pz[i]);
      _dummy.rotation.set(state.age[i] * 6, state.age[i] * 4, 0);
      _dummy.scale.setScalar(s);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
      needsUpdate = true;
    }

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, capacity]}
      frustumCulled={false}
    />
  );
});
