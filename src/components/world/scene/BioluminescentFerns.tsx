"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   BioluminescentFerns — Glowing ground cover. Reference plate
   shows scattered low-emissive plants and LED-strip arcs lying
   on the forest floor.

   Implementation: an InstancedMesh of tiny upward-pointing
   plane sprites, scattered in a ring around the playable area
   (avoiding the camera path so they don't stab the camera).
   We tint per-instance using `instanceColor` between cyan and
   neon-green to match the reference.

   ~80 instances × ~2 tris = ~160 tris.
   ───────────────────────────────────────────────────────────── */

export interface BioluminescentFernsProps {
  count?: number;
  /** Live tint multiplier from Leva (brightens or dims). */
  brightness?: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const CYAN = new THREE.Color("#22d3ee");
const GREEN = new THREE.Color("#10b981");

export function BioluminescentFerns({
  count = 80,
  brightness = 1,
}: BioluminescentFernsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Per-fern data (deterministic placement).
  const data = useMemo(() => {
    let seed = 313;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, () => {
      // Place in an annulus 4–14 units from origin, skewed forward.
      const angle = rand() * Math.PI * 2;
      const r = 4 + rand() * 10;
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r - 1,
        rotY: rand() * Math.PI * 2,
        scale: 0.4 + rand() * 0.6,
        mix: rand(), // 0..1 cyan↔green lerp
        phase: rand() * Math.PI * 2,
      };
    });
  }, [count]);

  // A tiny "fern blade" — two crossed planes form an X-shaped sprite.
  // Cheaper than modeling actual leaves.
  const geo = useMemo(() => {
    const plane = new THREE.PlaneGeometry(0.4, 0.6);
    plane.translate(0, 0.3, 0);
    return plane;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // Per-instance colors — only need to be set when `brightness` changes
  // (Leva drives this), so a small `useEffect` is correct here. Matrices
  // are written every frame in `useFrame` below.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      _color.copy(CYAN).lerp(GREEN, data[i].mix).multiplyScalar(brightness);
      mesh.setColorAt(i, _color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, count, brightness]);

  // Gentle sway — modulate scale Y so the ferns "breathe".
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      _dummy.position.set(d.x, -0.4, d.z);
      _dummy.rotation.set(0, d.rotY, 0);
      const breathe = d.scale * (1 + Math.sin(t * 1.2 + d.phase) * 0.05);
      _dummy.scale.set(d.scale, breathe, d.scale);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, count]}
      frustumCulled={false}
    />
  );
}
