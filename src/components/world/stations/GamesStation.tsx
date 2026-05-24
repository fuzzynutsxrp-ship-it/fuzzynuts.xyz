"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Float, Text } from "@react-three/drei";
import { gameRegistry, type GameMetadata } from "@/lib/gameRegistry";
import { useScrollState, stationProgress, STATIONS } from "../ScrollContext";

/* ─────────────────────────────────────────────────────────────
   GamesStation — 5 nut-shell portals arranged in a circle.

   • Filters out the classified `top-secret` slot per the brief
     (5 portals total: mario, fuzzy-survivors, minigolf, nut-racer,
     fuzzynuts-world).
   • Hover → ring brightens, scales up, reports world position
     so the parent can steer a squirrel toward it.
   • Click → calls onActivate(game, worldPos). Parent triggers
     a camera zoom + particle burst, then navigates.
   • The entire group fades in as scroll enters the games range.
   ───────────────────────────────────────────────────────────── */

export interface GamesStationProps {
  onHover: (worldPos: THREE.Vector3 | null) => void;
  onActivate: (game: GameMetadata, worldPos: THREE.Vector3) => void;
}

const STATION_DEF = STATIONS.find((s) => s.id === "games")!;
const HIDDEN_SLUGS = new Set(["top-secret"]);

export function GamesStation({ onHover, onActivate }: GamesStationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScrollState();

  const games = useMemo<GameMetadata[]>(
    () => gameRegistry.getAllLive().filter((g) => !HIDDEN_SLUGS.has(g.slug)),
    [],
  );

  // Circle layout — portals around a center point on the path.
  const layout = useMemo(() => {
    const radius = 3.6;
    return games.map((g, i) => {
      const angle = (i / games.length) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = -3 + Math.sin(angle) * radius;
      return {
        game: g,
        position: [x, 2.3, z] as [number, number, number],
        angle,
      };
    });
  }, [games]);

  useFrame(() => {
    if (!groupRef.current) return;
    // Fade in across the games scroll range, slow spin for theater.
    const p = stationProgress(scroll.offset, STATION_DEF);
    const opacity = THREE.MathUtils.smoothstep(p, 0.05, 0.35);
    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(0.4 + opacity * 0.6);
    // Gentle carousel spin only while the station is active.
    if (p > 0 && p < 1) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* ── Station 3D heading ── */}
      <Billboard position={[0, 5.0, -3]}>
        <Text
          fontSize={0.55}
          color="#fbbf24"
          outlineColor="#0a0500"
          outlineWidth={0.02}
          anchorX="center"
          anchorY="middle"
        >
          THE GAMES
        </Text>
        <Text
          fontSize={0.18}
          color="#f0ede6"
          outlineColor="#0a0500"
          outlineWidth={0.008}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.5, 0]}
        >
          Hover a portal · Click to play
        </Text>
      </Billboard>

      {/* ── Portals ── */}
      {layout.map(({ game, position }) => (
        <Portal
          key={game.slug}
          game={game}
          position={position}
          onHover={onHover}
          onActivate={onActivate}
        />
      ))}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────
   Portal — single nut-ring portal with hover/click handlers.
   ───────────────────────────────────────────────────────────── */

interface PortalProps {
  game: GameMetadata;
  position: [number, number, number];
  onHover: (worldPos: THREE.Vector3 | null) => void;
  onActivate: (game: GameMetadata, worldPos: THREE.Vector3) => void;
}

const _world = new THREE.Vector3();

function Portal({ game, position, onHover, onActivate }: PortalProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [activating, setActivating] = useState(false);

  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: game.color,
        emissive: game.color,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.6,
      }),
    [game.color],
  );
  const discMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: game.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [game.color],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const targetScale = activating ? 1.85 : hovered ? 1.32 : 1;
    const cur = groupRef.current.scale.x;
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(cur, targetScale, 0.16),
    );
    groupRef.current.rotation.y = t * 0.4 + position[0];
    groupRef.current.position.y =
      position[1] + Math.sin(t * 1.1 + position[0]) * 0.16;

    const targetEmissive = hovered ? 1.6 : 0.7;
    ringMat.emissiveIntensity = THREE.MathUtils.lerp(
      ringMat.emissiveIntensity,
      targetEmissive,
      0.15,
    );
    discMat.opacity = hovered
      ? 0.65
      : 0.4 + Math.sin(t * 2 + position[0]) * 0.08;
  });

  const handleOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_world);
      onHover(_world.clone());
    }
  };
  const handleOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "";
    onHover(null);
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (activating) return;
    setActivating(true);
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_world);
      onActivate(game, _world.clone());
    }
    setTimeout(() => setActivating(false), 900);
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh
        material={ringMat}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <torusGeometry args={[0.95, 0.18, 14, 36]} />
      </mesh>
      <mesh
        material={discMat}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <circleGeometry args={[0.85, 32]} />
      </mesh>

      {/* Title label always facing the camera */}
      <Billboard position={[0, 1.35, 0]}>
        <Float speed={hovered ? 3 : 1.5} floatIntensity={hovered ? 0.5 : 0.2}>
          <Text
            fontSize={0.18}
            color={game.color}
            outlineColor="#0a0500"
            outlineWidth={0.008}
            anchorX="center"
            anchorY="middle"
          >
            {game.title.toUpperCase()}
          </Text>
        </Float>
      </Billboard>
    </group>
  );
}
