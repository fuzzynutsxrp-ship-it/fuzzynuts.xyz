"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, Billboard } from "@react-three/drei";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ─────────────────────────────────────────────────────────────
   GamePortals — Floating nut-shell rings that act as 3D entry
   points to each game.

   • Each portal is a torus ring + inner glow disc, colored with
     the game's accent color.
   • Hover scales the ring up, pumps emissive intensity, and
     reports its world position to the parent (so a curious
     squirrel can scamper toward it, and so the click handler
     can spawn an explosion at the same point).
   • Click triggers `onActivate(game, worldPos)` — the parent
     animates an explosion, then navigates after ~600ms.

   Portals are arranged in a wide arc in front of the camera.
   ───────────────────────────────────────────────────────────── */

export interface GamePortalsProps {
  games: GameMetadata[];
  onHover?: (worldPos: THREE.Vector3 | null) => void;
  onActivate?: (game: GameMetadata, worldPos: THREE.Vector3) => void;
  /** Disable HTML labels on tiny screens for perf. */
  showLabels?: boolean;
}

export function GamePortals({
  games,
  onHover,
  onActivate,
  showLabels = true,
}: GamePortalsProps) {
  // Compute arc positions once.
  const layout = useMemo(() => {
    const radius = 8.5;
    const arc = Math.PI * 0.85; // ~150° spread
    const start = -arc / 2;
    return games.map((g, i) => {
      const t = games.length === 1 ? 0.5 : i / (games.length - 1);
      const angle = start + t * arc;
      // Z negative = in front of the camera. Lift y slightly.
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius - 2;
      const y = 1.6 + Math.sin(t * Math.PI) * 0.6;
      return { game: g, position: [x, y, z] as [number, number, number] };
    });
  }, [games]);

  return (
    <group>
      {layout.map(({ game, position }) => (
        <Portal
          key={game.slug}
          game={game}
          position={position}
          onHover={onHover}
          onActivate={onActivate}
          showLabel={showLabels}
        />
      ))}
    </group>
  );
}

interface PortalProps {
  game: GameMetadata;
  position: [number, number, number];
  onHover?: (worldPos: THREE.Vector3 | null) => void;
  onActivate?: (game: GameMetadata, worldPos: THREE.Vector3) => void;
  showLabel: boolean;
}

const _world = new THREE.Vector3();

function Portal({
  game,
  position,
  onHover,
  onActivate,
  showLabel,
}: PortalProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [activating, setActivating] = useState(false);

  // Shared per-portal materials.
  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: game.color,
        emissive: game.color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.6,
      }),
    [game.color],
  );
  const innerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: game.color,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [game.color],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Gentle bob + slow spin.
    groupRef.current.position.y =
      position[1] + Math.sin(t * 0.9 + position[0]) * 0.18;
    groupRef.current.rotation.y = t * 0.25;

    // Hover/activate scaling and emissive pulse.
    const targetScale = activating ? 1.8 : hovered ? 1.25 : 1;
    const cur = groupRef.current.scale.x;
    const next = THREE.MathUtils.lerp(cur, targetScale, 0.18);
    groupRef.current.scale.setScalar(next);

    if (ringMat) {
      const targetEmissive = hovered ? 1.4 : 0.6;
      ringMat.emissiveIntensity = THREE.MathUtils.lerp(
        ringMat.emissiveIntensity,
        targetEmissive,
        0.15,
      );
    }
    if (innerMat) {
      const pulse = 0.35 + Math.sin(t * 2 + position[0]) * 0.1;
      innerMat.opacity = hovered ? 0.6 : pulse;
    }
  });

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
    if (groupRef.current && onHover) {
      groupRef.current.getWorldPosition(_world);
      onHover(_world.clone());
    }
  };
  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "";
    onHover?.(null);
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (activating) return;
    setActivating(true);
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_world);
      onActivate?.(game, _world.clone());
    }
    // Reset so a re-hover after navigation cancel looks right.
    setTimeout(() => setActivating(false), 800);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Outer ring (nut-shell torus) */}
      <mesh
        ref={ringRef}
        material={ringMat}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <torusGeometry args={[0.95, 0.18, 16, 40]} />
      </mesh>

      {/* Inner glowing disc — also the click target (bigger hit area) */}
      <mesh
        ref={innerRef}
        material={innerMat}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <circleGeometry args={[0.85, 32]} />
      </mesh>

      {/* Optional HTML label — Billboard keeps it facing the camera */}
      {showLabel && (
        <Billboard position={[0, 1.4, 0]}>
          <Html
            center
            distanceFactor={9}
            style={{
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div
              className="text-center"
              style={{
                color: game.color,
                fontFamily: "var(--font-display), sans-serif",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textShadow:
                  "0 0 8px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.7)",
                whiteSpace: "nowrap",
                transform: hovered ? "scale(1.1)" : "scale(1)",
                transition: "transform 200ms ease-out",
              }}
            >
              {game.title}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}
