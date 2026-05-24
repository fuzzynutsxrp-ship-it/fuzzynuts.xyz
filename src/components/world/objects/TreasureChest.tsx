"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   TreasureChest — Low-poly cartoon chest sitting on a tree stump.

   • Body + lid as two boxes, lid hinged at the back edge.
   • Iron bands (thin boxes) wrap the body for a stylized look.
   • On hover/click the lid swings open and a column of glowing
     gold particles + 3D prize text rises out of it.
   ───────────────────────────────────────────────────────────── */

export interface TreasureChestProps {
  position?: [number, number, number];
  /** Display label that pops out when opened ("500,000 $NUT" etc). */
  prizeLabel?: string;
  /** Subtitle below the prize label. */
  prizeSubtitle?: string;
  /** Fired on click (parent can spawn particles, navigate, etc). */
  onOpen?: (worldPos: THREE.Vector3) => void;
}

const _world = new THREE.Vector3();

export function TreasureChest({
  position = [0, 0, 0],
  prizeLabel = "500,000 $NUT",
  prizeSubtitle = "Weekly Prize Pool",
  onOpen,
}: TreasureChestProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Shared materials.
  const woodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5b3216",
        roughness: 0.85,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );
  const woodLightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7a4720",
        roughness: 0.8,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );
  const ironMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1c1410",
        roughness: 0.6,
        metalness: 0.7,
        flatShading: true,
      }),
    [],
  );
  const goldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fbbf24",
        emissive: "#fbbf24",
        emissiveIntensity: 1.2,
        roughness: 0.3,
        metalness: 0.6,
      }),
    [],
  );
  const stumpMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a2616",
        roughness: 0.95,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );
  const stumpTopMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a26a35",
        roughness: 0.9,
        metalness: 0,
        flatShading: true,
      }),
    [],
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#fbbf24",
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // Lid swing — eased toward target angle.
    if (lidRef.current) {
      const target = open ? -Math.PI * 0.55 : 0;
      const k = 1 - Math.pow(0.0005, dt);
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        target,
        k,
      );
    }
    // Hover bob.
    if (groupRef.current) {
      const bob = hovered ? Math.sin(t * 4) * 0.04 : Math.sin(t * 1.2) * 0.02;
      groupRef.current.position.y = position[1] + bob;
    }
    // Inner glow ramps with open state.
    const glowTarget = open ? 0.85 : hovered ? 0.25 : 0;
    glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, glowTarget, 0.08);
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next && groupRef.current && onOpen) {
      groupRef.current.getWorldPosition(_world);
      _world.y += 0.8;
      onOpen(_world.clone());
    }
  };

  const handleOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handleOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group ref={groupRef} position={position}>
      {/* ── Stump ── */}
      <mesh material={stumpMat} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.95, 1.1, 1.0, 14]} />
      </mesh>
      <mesh material={stumpTopMat} position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.06, 14]} />
      </mesh>

      {/* ── Chest body ── */}
      <group
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <mesh material={woodMat} position={[0, 0.35, 0]}>
          <boxGeometry args={[1.4, 0.7, 0.9]} />
        </mesh>
        {/* Wood plank highlights on the sides */}
        <mesh material={woodLightMat} position={[0, 0.35, 0.46]}>
          <boxGeometry args={[1.35, 0.66, 0.005]} />
        </mesh>
        <mesh material={woodLightMat} position={[0, 0.35, -0.46]}>
          <boxGeometry args={[1.35, 0.66, 0.005]} />
        </mesh>
        {/* Iron straps */}
        <mesh material={ironMat} position={[-0.5, 0.35, 0]}>
          <boxGeometry args={[0.08, 0.74, 0.94]} />
        </mesh>
        <mesh material={ironMat} position={[0.5, 0.35, 0]}>
          <boxGeometry args={[0.08, 0.74, 0.94]} />
        </mesh>
        {/* Lock plate */}
        <mesh material={goldMat} position={[0, 0.35, 0.46]}>
          <boxGeometry args={[0.2, 0.22, 0.04]} />
        </mesh>

        {/* ── Lid (hinged at back edge) ── */}
        <group ref={lidRef} position={[0, 0.7, -0.45]}>
          <mesh material={woodMat} position={[0, 0.15, 0.45]}>
            <boxGeometry args={[1.4, 0.3, 0.9]} />
          </mesh>
          <mesh material={ironMat} position={[-0.5, 0.15, 0.45]}>
            <boxGeometry args={[0.08, 0.34, 0.94]} />
          </mesh>
          <mesh material={ironMat} position={[0.5, 0.15, 0.45]}>
            <boxGeometry args={[0.08, 0.34, 0.94]} />
          </mesh>
        </group>

        {/* ── Inner glow (visible when open) ── */}
        <mesh material={glowMat} position={[0, 0.55, 0]}>
          <boxGeometry args={[1.2, 0.5, 0.7]} />
        </mesh>
      </group>

      {/* ── Floating prize label (3D text, only when open) ── */}
      {open && (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
          <group position={[0, 1.9, 0]}>
            <Text
              fontSize={0.32}
              color="#fbbf24"
              outlineColor="#0a0500"
              outlineWidth={0.012}
              anchorX="center"
              anchorY="middle"
            >
              {prizeLabel}
            </Text>
            <Text
              fontSize={0.13}
              color="#f0ede6"
              outlineColor="#0a0500"
              outlineWidth={0.006}
              anchorX="center"
              anchorY="middle"
              position={[0, -0.32, 0]}
            >
              {prizeSubtitle}
            </Text>
          </group>
        </Float>
      )}
    </group>
  );
}
