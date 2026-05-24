"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { HERO_CONFIG } from "@/lib/config/heroConfig";

/* ─────────────────────────────────────────────────────────────
   ParticleOverlay — Lightweight Three.js particle field that
   floats on top of the video background.

   • Single InstancedMesh: one draw call for all particles.
   • Per-particle position is computed each frame from a base
     point + sinusoidal amplitudes (cheap "perlin-ish" motion).
   • Mouse parallax: normalized cursor offset pushed into the
     instance position, scaled by depth so deeper particles
     parallax more (creates 3D-feel without a stereo camera).
   • Additive blending + emissive colors → bright glowing motes
     against the dark video backdrop.
   • Mobile: count halved + DPR capped + antialias off.

   This whole module is dynamic-imported with ssr:false from
   Hero.tsx, so the R3F bundle lands in its own chunk and does
   not bloat the initial page download.
   ───────────────────────────────────────────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(
      "(max-width: 768px), (pointer: coarse) and (max-width: 900px)",
    );
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

interface ParticleDatum {
  bx: number;
  by: number;
  bz: number;
  ax: number;
  ay: number;
  az: number;
  phase: number;
  speed: number;
  size: number;
  colorIdx: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function ParticleField({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Deterministic per-particle data (seeded RNG → SSR/CSR agree).
  const data = useMemo<ParticleDatum[]>(() => {
    let seed = 7777;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const sMin = HERO_CONFIG.particles.size.min;
    const sMax = HERO_CONFIG.particles.size.max;
    const spMin = HERO_CONFIG.particles.speed.min;
    const spMax = HERO_CONFIG.particles.speed.max;
    return Array.from({ length: count }, () => ({
      bx: (rand() - 0.5) * 14,
      by: (rand() - 0.5) * 9,
      bz: (rand() - 0.5) * 6 - 1,
      ax: 0.3 + rand() * 0.4,
      ay: 0.5 + rand() * 0.6,
      az: 0.2 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      speed: spMin + rand() * (spMax - spMin),
      size: sMin + rand() * (sMax - sMin),
      colorIdx: Math.floor(rand() * HERO_CONFIG.particles.colors.length),
    }));
  }, [count]);

  const colors = useMemo(
    () => HERO_CONFIG.particles.colors.map((c) => new THREE.Color(c)),
    [],
  );

  // Icosahedron is the cheapest decent "round nut" silhouette.
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  // Mouse tracking — normalized -1..1 in client coords.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // One-time per-instance color assignment.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      _color.copy(colors[data[i].colorIdx]);
      mesh.setColorAt(i, _color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, data, colors]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const parallax = HERO_CONFIG.particles.parallaxStrength;
    const mx = mouseRef.current.x * parallax;
    const my = mouseRef.current.y * parallax;

    for (let i = 0; i < count; i++) {
      const d = data[i];
      // Depth-weighted parallax: particles closer to camera
      // (higher bz) shift more with the cursor → 3D feel.
      const depth = 1 + d.bz * 0.2;
      const x = d.bx + Math.sin(t * d.speed + d.phase) * d.ax + mx * depth;
      const y =
        d.by + Math.cos(t * d.speed * 0.7 + d.phase) * d.ay + my * depth;
      const z = d.bz + Math.sin(t * d.speed * 0.5 + d.phase) * d.az;

      _dummy.position.set(x, y, z);
      _dummy.scale.setScalar(d.size);
      _dummy.rotation.x = t * d.speed * 0.6;
      _dummy.rotation.y = t * d.speed * 0.8;
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, count]} frustumCulled />;
}

export function ParticleOverlay() {
  const isMobile = useIsMobile();
  const count = isMobile
    ? HERO_CONFIG.particles.mobileCount
    : HERO_CONFIG.particles.count;

  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{
          antialias: !isMobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <ParticleField count={count} />
      </Canvas>
    </div>
  );
}

export default ParticleOverlay;
