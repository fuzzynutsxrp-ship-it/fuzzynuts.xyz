"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Float, Html, Text } from "@react-three/drei";
import { useScrollState, stationProgress, STATIONS } from "../ScrollContext";
import { XRPL_CONFIG } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   MoonStation — Close-up of the $NUT moon at the end of the
   scroll, with floating tokenomics stats orbiting it.

   The moon itself lives in <NutMoon /> at scene level so it's
   visible from all stations. This component only adds:
   • A trio of orbiting stats (supply / liquidity / live games)
   • Heading text
   • A Drei <Html> panel pinning the contract addresses /
     verification info (functional content preserved from the
     old OnChainVerification section).

   All on-chain addresses come from `XRPL_CONFIG` so they stay
   in sync with the rest of the site (Footer, HowToGet, etc.).
   ───────────────────────────────────────────────────────────── */

const STATION_DEF = STATIONS.find((s) => s.id === "moon")!;

interface MoonStationProps {
  /** Live game count for the stats column. */
  gameCount: number;
}

const STATS = (gameCount: number) => [
  {
    label: "Total Supply",
    value: "321B",
    accent: "#fbbf24",
    angle: 0,
  },
  {
    label: "In Liquidity",
    value: "80%",
    accent: "#10b981",
    angle: (Math.PI * 2) / 3,
  },
  {
    label: "Games Live",
    value: String(gameCount),
    accent: "#a855f7",
    angle: (Math.PI * 4) / 3,
  },
];

export function MoonStation({ gameCount }: MoonStationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const scroll = useScrollState();
  const stats = STATS(gameCount);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = stationProgress(scroll.offset, STATION_DEF);
    const opacity = THREE.MathUtils.smoothstep(p, 0.05, 0.45);
    groupRef.current.visible = opacity > 0.01;
    groupRef.current.scale.setScalar(0.6 + opacity * 0.4);
    if (orbitRef.current) {
      orbitRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    // Anchored near the $NUT moon (defined in src/components/hero/scene/NutMoon).
    <group ref={groupRef} position={[-8, 4.2, -22]}>
      {/* ── Heading off to the side of the moon ── */}
      <Billboard position={[6, 4, 6]}>
        <Text
          fontSize={0.7}
          color="#fbbf24"
          outlineColor="#0a0500"
          outlineWidth={0.025}
          anchorX="center"
          anchorY="middle"
        >
          $NUT
        </Text>
        <Text
          fontSize={0.22}
          color="#f0ede6"
          outlineColor="#0a0500"
          outlineWidth={0.01}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.65, 0]}
        >
          The nuttiest meme coin on XRPL
        </Text>
      </Billboard>

      {/* ── Orbiting stat cards ── */}
      <group ref={orbitRef}>
        {stats.map((s) => {
          const r = 9;
          const x = Math.cos(s.angle) * r;
          const z = Math.sin(s.angle) * r;
          return (
            <Float
              key={s.label}
              speed={1.5}
              rotationIntensity={0.2}
              floatIntensity={0.5}
              position={[x, 0, z]}
            >
              <Billboard>
                <Text
                  fontSize={0.85}
                  color={s.accent}
                  outlineColor="#0a0500"
                  outlineWidth={0.03}
                  anchorX="center"
                  anchorY="middle"
                >
                  {s.value}
                </Text>
                <Text
                  fontSize={0.22}
                  color="#f0ede6"
                  outlineColor="#0a0500"
                  outlineWidth={0.01}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, -0.7, 0]}
                >
                  {s.label}
                </Text>
              </Billboard>
            </Float>
          );
        })}
      </group>

      {/* ── Functional content (contract addresses) via Html overlay.
            Visible only in the final part of the scroll so it doesn't
            clutter earlier stations. ── */}
      <Html
        position={[6, -3.5, 6]}
        center
        distanceFactor={14}
        transform={false}
        style={{
          pointerEvents: "auto",
          userSelect: "text",
        }}
      >
        <div
          className="rounded-xl border border-[var(--color-glass-border-strong)] bg-[rgba(1,5,8,0.75)] backdrop-blur-md p-3 sm:p-4 shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
          style={{
            width: "min(86vw, 460px)",
            color: "var(--color-cream)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-neon-green)] animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.18em] uppercase text-[var(--color-gold)]">
              On-Chain Verification
            </span>
          </div>
          <AddressRow label="Issuer" value={XRPL_CONFIG.issuer} />
          <AddressRow label="Distributor" value={XRPL_CONFIG.distributor} />
          <AddressRow label="AMM Pool" value={XRPL_CONFIG.ammPool} />
          <a
            href={`https://xrpscan.com/account/${XRPL_CONFIG.issuer}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm text-[var(--color-gold)] hover:underline"
          >
            View on XRPScan →
          </a>
        </div>
      </Html>
    </group>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 border-t border-[var(--color-glass-border-faint)] first-of-type:border-t-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">
        {label}
      </span>
      <code
        className="text-[11px] sm:text-xs break-all text-[var(--color-cream)]"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {value}
      </code>
    </div>
  );
}
