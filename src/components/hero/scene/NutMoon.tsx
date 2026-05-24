"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   NutMoon — A huge glowing $NUT token slowly rotating far behind
   the forest like a harvest moon. Layered:
   • A thick coin disc (cylinder) with raised rim.
   • A "$NUT" face built from very simple primitives — readable
     as a silhouette even without a texture.
   • A soft glow halo (additive sprite) so it pops through fog.

   It lives ~40 units behind the camera focus, so it appears huge
   but parallaxes slowly.
   ───────────────────────────────────────────────────────────── */

export function NutMoon() {
  const groupRef = useRef<THREE.Group>(null);
  const coinGeo = useMemo(() => new THREE.CylinderGeometry(5, 5, 0.4, 64), []);
  const rimGeo = useMemo(() => new THREE.TorusGeometry(5, 0.18, 12, 64), []);

  const coinMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#f59e0b",
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0.6,
      }),
    [],
  );
  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff3b0",
        emissive: "#fbbf24",
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.8,
      }),
    [],
  );
  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        color: "#fbbf24",
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // "$NUT" face — three carved letter-blocks raised above the coin face.
  // Built from BoxGeometry so we don't need an SDF font on this budget.
  const faceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7a4a0a",
        emissive: "#fbbf24",
        emissiveIntensity: 0.4,
        roughness: 0.5,
        metalness: 0.3,
      }),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    // Very slow Y spin — moon-like.
    groupRef.current.rotation.y += 0.0025;
    // Subtle vertical drift.
    groupRef.current.position.y =
      4.2 + Math.sin(state.clock.elapsedTime * 0.15) * 0.3;
  });

  return (
    <group ref={groupRef} position={[-8, 4.2, -28]} rotation={[0, 0.3, 0]}>
      {/* ── Outer glow halo (always faces camera) ── */}
      <sprite scale={[18, 18, 1]} material={haloMat} />

      {/* ── Coin disc (edge-on, tilted slightly toward camera) ── */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={coinGeo} material={coinMat} />
        {/* Raised rim — top */}
        <mesh geometry={rimGeo} material={rimMat} position={[0, 0.22, 0]} />
        {/* Raised rim — bottom */}
        <mesh geometry={rimGeo} material={rimMat} position={[0, -0.22, 0]} />
      </group>

      {/* ── "$NUT" face (raised blocks on the front face) ── */}
      <group position={[0, 0, 0.25]}>
        {/* $ */}
        <mesh material={faceMat} position={[-2.4, 0, 0]}>
          <boxGeometry args={[0.9, 1.6, 0.2]} />
        </mesh>
        {/* N */}
        <mesh material={faceMat} position={[-1.0, 0, 0]}>
          <boxGeometry args={[0.9, 1.6, 0.2]} />
        </mesh>
        {/* U */}
        <mesh material={faceMat} position={[0.4, 0, 0]}>
          <boxGeometry args={[0.9, 1.6, 0.2]} />
        </mesh>
        {/* T */}
        <mesh material={faceMat} position={[1.8, 0, 0]}>
          <boxGeometry args={[0.9, 1.6, 0.2]} />
        </mesh>
        {/* Top bar above letters — helps "T" read */}
        <mesh material={faceMat} position={[1.8, 0.6, 0.05]}>
          <boxGeometry args={[1.6, 0.25, 0.18]} />
        </mesh>
      </group>
    </group>
  );
}
