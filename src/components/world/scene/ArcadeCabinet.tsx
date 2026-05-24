"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

/* ─────────────────────────────────────────────────────────────
   ArcadeCabinet — Low-poly retro arcade machine sitting in the
   forest, in the style of herobackground2.jpg: matte-black body,
   bright red/yellow marquee, glowing CRT with strong flicker,
   slight overgrowth at the base (ferns/vines clinging to it).

   Body parts (all simple boxes):
   • Base (deeper bottom box)
   • Body (vertical box)
   • Marquee (small box on top with strong emissive)
   • Screen (front-facing plane with bigger flicker amplitude)
   • Control panel (angled box at sit-down level)
   • Joystick + 3 buttons
   • Overgrowth: 4 cheap additive sprite "ferns" at the base

   Tris budget: ~80 per cabinet (still trivial).
   ───────────────────────────────────────────────────────────── */

export interface ArcadeCabinetProps {
  position?: [number, number, number];
  rotation?: number;
  /** Marquee / accent color (hex). Drives the marquee + ground glow
   *  + body rim. The CRT screen is a SEPARATE color (see `screenColor`)
   *  because reference image 1 shows every cabinet's CRT lit cyan/blue
   *  regardless of marquee hue. */
  accent?: string;
  /** CRT screen color. Defaults to the cyan/electric-blue look from
   *  herobackground2.jpg. Override per-cabinet for variety. */
  screenColor?: string;
  /** Multiplier from Leva for CRT + marquee brightness. */
  glow?: number;
  /** Optional overgrowth (small ferns clinging to the base). */
  overgrowth?: boolean;
  /** Static label (we don't render Text inside to keep it cheap). */
  label?: string;
}

export function ArcadeCabinet({
  position = [0, 0, 0],
  rotation = 0,
  accent = "#ef4444",
  screenColor = "#22d3ee",
  glow = 1,
  overgrowth = true,
  label,
}: ArcadeCabinetProps) {
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const marqueeMat = useRef<THREE.MeshBasicMaterial>(null);
  const groundGlowMat = useRef<THREE.MeshBasicMaterial>(null);
  // Shared rim material — used on BOTH side strips so they pulse in sync.
  const rimMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }),
    [accent],
  );
  // Avoid label warning when not provided.
  void label;

  // Shared materials per cabinet — matte black body matching the dark
  // cabinets in herobackground2.jpg.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#06060a",
        roughness: 0.55,
        metalness: 0.45,
        flatShading: true,
      }),
    [],
  );
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1622",
        roughness: 0.65,
        metalness: 0.35,
        flatShading: true,
      }),
    [],
  );
  // A few cheap glowing overgrowth sprites.
  const fernMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#10b981",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state) => {
    // CRT scanline flicker — stronger amplitude to match the dramatic CRTs
    // in herobackground2.jpg. Two noise sources at different frequencies.
    const t = state.clock.elapsedTime;
    const flicker = 0.78 + Math.sin(t * 17.3) * 0.12 + Math.sin(t * 41) * 0.06;
    if (screenMat.current) {
      // CRT uses its own (typically cyan/blue) color, not the marquee accent.
      screenMat.current.color
        .set(screenColor)
        .multiplyScalar(3.4 * glow * flicker);
    }
    if (marqueeMat.current) {
      // Marquees breathe slower than CRT, but punch harder (5.4×).
      const breath = 0.9 + Math.sin(t * 1.5) * 0.1;
      marqueeMat.current.color.set(accent).multiplyScalar(5.4 * glow * breath);
    }
    // Ground glow + rim accent — both sync to marquee breath so the spill
    // light reads as coming from the machine's marquee specifically.
    if (groundGlowMat.current) {
      const breath = 0.6 + Math.sin(t * 1.5 + 0.3) * 0.15;
      groundGlowMat.current.opacity = 0.42 * glow * breath;
    }
    {
      const breath = 0.85 + Math.sin(t * 1.5 + 0.4) * 0.08;
      rimMat.color.set(accent).multiplyScalar(0.9 * glow * breath);
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* ── Base (slightly wider than body) ── */}
      <mesh material={trimMat} position={[0, 0.08, 0]}>
        <boxGeometry args={[1.05, 0.16, 0.85]} />
      </mesh>

      {/* ── Body ── */}
      <mesh material={bodyMat} position={[0, 1.0, 0]}>
        <boxGeometry args={[0.95, 1.7, 0.75]} />
      </mesh>

      {/* ── Side rim-glow strips — thin vertical LED rails on either
            edge of the body. Reference: the dark cyber-forest plate
            (herobackground2.jpg) shows cabinets with subtle accent-color
            light running down their flanks. Shared `rimMat` so they
            pulse in sync (mutated each frame in useFrame). ── */}
      <mesh material={rimMat} position={[-0.485, 1.0, 0.0]}>
        <boxGeometry args={[0.02, 1.55, 0.72]} />
      </mesh>
      <mesh material={rimMat} position={[0.485, 1.0, 0.0]}>
        <boxGeometry args={[0.02, 1.55, 0.72]} />
      </mesh>

      {/* ── Top-rear stand (angled silhouette in profile) ── */}
      <mesh material={bodyMat} position={[0, 2.0, -0.25]}>
        <boxGeometry args={[0.95, 0.35, 0.25]} />
      </mesh>

      {/* ── Marquee (glowing top sign) ── */}
      <mesh position={[0, 2.0, 0.05]}>
        <boxGeometry args={[0.92, 0.32, 0.42]} />
        <meshBasicMaterial ref={marqueeMat} color={accent} toneMapped={false} />
      </mesh>

      {/* ── CRT screen (recessed slightly into the body) ── */}
      <mesh position={[0, 1.35, 0.38]} rotation={[-0.05, 0, 0]}>
        <planeGeometry args={[0.76, 0.6]} />
        <meshBasicMaterial ref={screenMat} color={accent} toneMapped={false} />
      </mesh>

      {/* Screen bezel */}
      <mesh
        material={trimMat}
        position={[0, 1.35, 0.37]}
        rotation={[-0.05, 0, 0]}
      >
        <planeGeometry args={[0.86, 0.7]} />
      </mesh>

      {/* ── Control panel (angled forward at sit-down height) ── */}
      <mesh
        material={trimMat}
        position={[0, 0.88, 0.42]}
        rotation={[-0.5, 0, 0]}
      >
        <boxGeometry args={[0.95, 0.4, 0.06]} />
      </mesh>

      {/* Joystick */}
      <mesh position={[-0.15, 0.97, 0.45]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.18, 8]} />
        <meshStandardMaterial color="#222" roughness={0.7} />
      </mesh>
      <mesh position={[-0.15, 1.06, 0.5]}>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>

      {/* Buttons */}
      {[0.05, 0.18, 0.31].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0.46]} rotation={[-0.5, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.04, 12]} />
          <meshStandardMaterial
            color={i === 0 ? "#fbbf24" : i === 1 ? "#22d3ee" : "#10b981"}
            roughness={0.4}
            metalness={0.2}
            emissive={i === 0 ? "#fbbf24" : i === 1 ? "#22d3ee" : "#10b981"}
            emissiveIntensity={0.5 * glow}
          />
        </mesh>
      ))}

      {/* ── Coin slot (tiny dark strip) ── */}
      <mesh material={trimMat} position={[0, 0.55, 0.38]}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
      </mesh>

      {/* ── Ground glow plate — additive disc on the forest floor right
            under the cabinet. Synced to the marquee breath in useFrame so
            it reads as colored spill light from the machine itself. ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.2]}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial
          ref={groundGlowMat}
          color={accent}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── Overgrowth: a handful of tiny glowing "fern" sprites clinging
            to the base. Four crossed planes each so they read from any
            angle. Skipped when `overgrowth=false` for perf. ── */}
      {overgrowth &&
        [
          { x: -0.55, z: 0.2, r: 0.6, s: 0.55 },
          { x: 0.6, z: 0.25, r: -0.4, s: 0.5 },
          { x: -0.4, z: -0.35, r: 1.2, s: 0.45 },
          { x: 0.45, z: -0.3, r: -0.9, s: 0.4 },
        ].map((f, i) => (
          <group key={i} position={[f.x, 0.08, f.z]} rotation={[0, f.r, 0]}>
            <mesh material={fernMat}>
              <planeGeometry args={[0.55 * f.s, 0.7 * f.s]} />
            </mesh>
            <mesh material={fernMat} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.55 * f.s, 0.7 * f.s]} />
            </mesh>
          </group>
        ))}
    </group>
  );
}
