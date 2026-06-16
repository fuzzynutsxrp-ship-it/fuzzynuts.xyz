import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { DataStream } from "./DataStream";

/* Lazy-load Three.js RotatingNut — prevents ~150KB bundle from blocking initial render */
const RotatingNut = dynamic(() => import("./RotatingNut").then((mod) => mod.RotatingNut), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-3 h-3 rounded-full animate-pulse"
        style={{ background: "rgba(251,191,36,0.3)" }}
      />
    </div>
  ),
});

/* ─────────────────────────────────────────────────────────────
   HologramProjector — Futuristic prize display

   Think Iron Man's holographic UI: rotating rings, hexagonal
   inner frame, 3D nut model, orbiting data fragments, and
   holographic scan lines. Each projector represents a prize tier.

   Design:
   - Outer ring: dashed, slowly rotating, colored glow
   - Middle ring: solid, counter-rotating
   - Inner hexagon: clipped container for the RotatingNut
   - Data streams: orbiting text fragments
   - Scan lines: subtle horizontal interference pattern
   ───────────────────────────────────────────────────────────── */

const RANK_THEME = {
  "1st": {
    primary: "#FBBF24",
    secondary: "#F59E0B",
    glow: "rgba(251, 191, 36, 0.5)",
  },
  "2nd": {
    primary: "#C0C0C0",
    secondary: "#9CA3AF",
    glow: "rgba(192, 192, 192, 0.4)",
  },
  "3rd": {
    primary: "#CD7F32",
    secondary: "#B45309",
    glow: "rgba(205, 127, 50, 0.4)",
  },
} as const;

interface HologramProjectorProps {
  amount: number;
  rank: "1st" | "2nd" | "3rd";
  label: string;
  /** sm=176px, md=224px, lg=272px */
  size?: "sm" | "md" | "lg";
  /** Data fragments orbiting the projector */
  dataStream?: string[];
  /** Stagger delay for entrance */
  delay?: number;
}

const SIZE_MAP = { sm: 176, md: 224, lg: 272 };

export function HologramProjector({
  amount,
  rank,
  label,
  size = "md",
  dataStream = [],
  delay = 0,
}: HologramProjectorProps) {
  const px = SIZE_MAP[size];
  const theme = RANK_THEME[rank];

  return (
    <motion.div
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay, duration: 0.7, ease: "easeOut" }}
    >
      {/* Hologram container */}
      <div className="relative flex items-center justify-center" style={{ width: px, height: px }}>
        {/* ── Outer ring — dashed, rotating ── */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px dashed ${theme.primary}30`,
            boxShadow: `0 0 40px ${theme.glow}30, inset 0 0 30px ${theme.glow}10`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* ── Middle ring — solid, counter-rotating ── */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: px * 0.08,
            border: `1px solid ${theme.secondary}40`,
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        {/* ── Inner hexagonal frame ── */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            inset: px * 0.18,
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            background: `linear-gradient(135deg, ${theme.primary}08, ${theme.secondary}15)`,
          }}
        >
          <RotatingNut color={theme.primary} size={px * 0.55} />
        </div>

        {/* ── Corner tick marks (HUD detail) ── */}
        {[0, 90, 180, 270].map((deg) => (
          <div
            key={deg}
            className="absolute"
            style={{
              width: 2,
              height: px * 0.06,
              background: theme.primary,
              opacity: 0.25,
              top: "50%",
              left: "50%",
              transformOrigin: `0 ${px * 0.48}px`,
              transform: `rotate(${deg}deg) translateY(-${px * 0.48}px)`,
            }}
          />
        ))}

        {/* ── Hologram scan lines overlay + flicker ── */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden hologram-flicker"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
          }}
        />

        {/* ── Data stream particles ── */}
        {/* First 4 labels use directional mode (flowing outward from edges) */}
        {dataStream.slice(0, 4).map((text, i) => {
          const directions = ["top", "right", "bottom", "left"] as const;
          return (
            <DataStream
              key={`dir-${i}`}
              label={text}
              color={theme.primary}
              delay={delay + 0.8 + i * 0.7}
              position={directions[i]}
              duration={3 + i * 0.5}
            />
          );
        })}
        {/* Extra labels use orbit mode (drifting in elliptical paths) */}
        {dataStream.slice(4).map((text, i) => (
          <DataStream
            key={`orb-${i}`}
            label={text}
            color={theme.primary}
            delay={delay + 1.5 + i * 0.6}
            orbit={px * 0.55}
            angle={45 + i * 90}
          />
        ))}
      </div>

      {/* ── Prize info below projector ── */}
      <motion.div
        className="text-center mt-5"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.3, duration: 0.5 }}
      >
        <p
          className="font-display text-3xl sm:text-4xl font-black leading-none"
          style={{
            color: theme.primary,
            textShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}60`,
          }}
        >
          {amount.toLocaleString()}
        </p>
        <p className="text-[10px] sm:text-xs font-mono tracking-wider text-[var(--color-cream-dim)] mt-1 opacity-50">
          $NUT / week
        </p>
        <p
          className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] mt-1"
          style={{ color: theme.primary, opacity: 0.7 }}
        >
          {label}
        </p>
      </motion.div>
    </motion.div>
  );
}
