"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   RotatingNut — Cartoon 3D Acorn

   A detailed, stylized acorn built from Three.js primitives:
     • LatheGeometry body — smooth teardrop/egg profile
     • Wider dome cap with horizontal ridge rings
     • Tiny stem on top
     • Glossy toon-style materials with emissive glow
     • 3-point lighting for studio-quality rendering
     • Smooth Y-rotation + gentle bobbing float

   The model fills most of its canvas for maximum visual impact.
   Camera is positioned to show the acorn at a slight angle.
   ───────────────────────────────────────────────────────────── */

/* ─── Color helpers ─── */

/** Darken a hex color by mixing toward black */
function darkenHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(1 - amount);
  return `#${c.getHexString()}`;
}

/** Lighten a hex color by mixing toward white */
function lightenHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color("#ffffff"), amount);
  return `#${c.getHexString()}`;
}

/* ─── Acorn body profile (LatheGeometry) ─── */

function useAcornBodyGeometry() {
  return useMemo(() => {
    // Teardrop profile: pointed bottom, fat middle, slight taper at top
    const points = [
      new THREE.Vector2(0, -0.72),    // bottom tip (pointed)
      new THREE.Vector2(0.08, -0.68),
      new THREE.Vector2(0.18, -0.58),
      new THREE.Vector2(0.28, -0.42),
      new THREE.Vector2(0.36, -0.22),
      new THREE.Vector2(0.40, 0.0),   // widest point
      new THREE.Vector2(0.38, 0.15),
      new THREE.Vector2(0.34, 0.28),
      new THREE.Vector2(0.30, 0.35),  // top edge where cap meets
      new THREE.Vector2(0.28, 0.38),
    ];
    return new THREE.LatheGeometry(points, 32);
  }, []);
}

/* ─── Acorn cap profile (LatheGeometry) ─── */

function useAcornCapGeometry() {
  return useMemo(() => {
    // Wider dome that sits on top of body — classic acorn cap shape
    const points = [
      new THREE.Vector2(0, 0.68),     // top of cap
      new THREE.Vector2(0.10, 0.66),
      new THREE.Vector2(0.18, 0.62),
      new THREE.Vector2(0.26, 0.56),
      new THREE.Vector2(0.32, 0.49),
      new THREE.Vector2(0.36, 0.42),
      new THREE.Vector2(0.38, 0.38),  // cap rim (matches body top)
      new THREE.Vector2(0.30, 0.35),  // underside tuck
    ];
    return new THREE.LatheGeometry(points, 32);
  }, []);
}

/* ─── The 3D Acorn Scene ─── */

interface AcornModelProps {
  accentColor: string;
}

function AcornModel({ accentColor }: AcornModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGeo = useAcornBodyGeometry();
  const capGeo = useAcornCapGeometry();

  // Derive palette from accent color
  const bodyColor = darkenHex(accentColor, 0.45);      // warm dark brown
  const bodyColorLight = darkenHex(accentColor, 0.25);  // lighter brown for body
  const capColor = accentColor;                          // gold/silver/bronze
  const capColorDark = darkenHex(accentColor, 0.2);     // slightly darker cap
  const stemColor = darkenHex(accentColor, 0.55);       // dark stem
  const emissiveColor = darkenHex(accentColor, 0.6);    // subtle inner glow

  // Ridge positions on the cap (Y coordinates)
  const ridgePositions = useMemo(() => [0.42, 0.48, 0.54, 0.60], []);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Smooth Y rotation
      groupRef.current.rotation.y += 0.008;
      // Gentle X oscillation (tilt)
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.12;
      // Subtle bobbing float
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.06;
    }
  });

  return (
    <group ref={groupRef} scale={1.8}>
      {/* ── Acorn Body — glossy cartoon teardrop ── */}
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial
          color={bodyColorLight}
          roughness={0.35}
          metalness={0.05}
          emissive={emissiveColor}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* ── Body highlight stripe (slightly lighter band) ── */}
      <mesh position={[0, -0.1, 0]} scale={[0.92, 0.5, 0.92]}>
        <sphereGeometry args={[0.4, 24, 16]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.4}
          metalness={0.05}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* ── Acorn Cap — textured dome ── */}
      <mesh geometry={capGeo}>
        <meshStandardMaterial
          color={capColor}
          roughness={0.3}
          metalness={0.15}
          emissive={emissiveColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* ── Cap ridges — horizontal torus rings for texture ── */}
      {ridgePositions.map((y, i) => {
        // Ridge radius decreases as we go up the cap
        const r = 0.37 - i * 0.05;
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.012, 8, 32]} />
            <meshStandardMaterial
              color={capColorDark}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>
        );
      })}

      {/* ── Cap cross-hatch detail (diagonal lines) ── */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rotZ, i) => (
        <mesh
          key={`cross-${i}`}
          position={[0, 0.52, 0]}
          rotation={[0.3, 0, rotZ]}
        >
          <torusGeometry args={[0.28, 0.008, 6, 32, Math.PI]} />
          <meshStandardMaterial
            color={capColorDark}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* ── Stem — tiny cylinder on top ── */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.1, 8]} />
        <meshStandardMaterial
          color={stemColor}
          roughness={0.6}
          metalness={0.0}
        />
      </mesh>

      {/* ── Stem knob ── */}
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          color={stemColor}
          roughness={0.5}
          metalness={0.0}
        />
      </mesh>
    </group>
  );
}

/* ─── Lighting Rig ─── */

function StudioLights({ accentColor }: { accentColor: string }) {
  const rimColor = lightenHex(accentColor, 0.4);

  return (
    <>
      {/* Ambient fill — soft base illumination */}
      <ambientLight intensity={0.6} color="#fef3c7" />

      {/* Key light — main illumination from upper-right */}
      <directionalLight
        position={[3, 4, 5]}
        intensity={1.8}
        color="#fff8e7"
      />

      {/* Fill light — softer from the left to reduce shadows */}
      <directionalLight
        position={[-3, 2, 3]}
        intensity={0.6}
        color="#e8d5b0"
      />

      {/* Rim/back light — creates the edge glow silhouette */}
      <pointLight
        position={[0, -1, -3]}
        intensity={1.5}
        color={rimColor}
        distance={8}
      />

      {/* Top accent — subtle overhead highlight */}
      <pointLight
        position={[0, 3, 0]}
        intensity={0.8}
        color={accentColor}
        distance={6}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════════════════════ */

interface RotatingNutProps {
  /** Accent color for the acorn (gold/silver/bronze) */
  color?: string;
  /** Container size in pixels */
  size?: number;
}

export function RotatingNut({
  color = "#FBBF24",
  size = 120,
}: RotatingNutProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className="pointer-events-none"
    >
      <Canvas
        camera={{ position: [0, 0.15, 2.8], fov: 40 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <StudioLights accentColor={color} />
        <AcornModel accentColor={color} />
      </Canvas>
    </div>
  );
}
