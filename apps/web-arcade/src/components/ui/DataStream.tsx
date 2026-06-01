"use client";

import { motion } from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   DataStream — Animated data particles flowing around elements.

   Two modes:
   1. Directional (default): Particles float away from the
      parent in a specific direction (top/bottom/left/right),
      fading in and out like a live data feed.
   2. Orbit: Particles drift in a slow elliptical path at a
      fixed radius & angle from center (original behavior).

   Used by HologramProjector to create sci-fi "data exhaust"
   around the rotating rings.
   ───────────────────────────────────────────────────────────── */

/* ── Direction-based position map (Tailwind classes) ── */
const POSITION_CLASSES: Record<DataStreamPosition, string> = {
  top: "-top-6 left-1/2 -translate-x-1/2",
  bottom: "-bottom-6 left-1/2 -translate-x-1/2",
  left: "-left-12 top-1/2 -translate-y-1/2",
  right: "-right-12 top-1/2 -translate-y-1/2",
};

type DataStreamPosition = "top" | "bottom" | "left" | "right";

interface DataStreamProps {
  /** Text fragment to display (e.g. "0x3f…a1", "VERIFIED") */
  label: string;
  /** Accent color */
  color: string;
  /** Stagger delay in seconds */
  delay?: number;
  /** Directional mode: particle drifts away in this direction */
  position?: DataStreamPosition;
  /** Orbit mode: radius from center (px) */
  orbit?: number;
  /** Orbit mode: starting angle in degrees */
  angle?: number;
  /** Animation duration in seconds (default 3 for directional, 8 for orbit) */
  duration?: number;
}

export function DataStream({
  label,
  color,
  delay = 0,
  position,
  orbit,
  angle,
  duration,
}: DataStreamProps) {
  /* ────────────────────────────────────────
     Orbit mode — when orbit + angle are set
     ──────────────────────────────────────── */
  if (orbit != null && angle != null) {
    const rad = (angle * Math.PI) / 180;
    const cx = Math.cos(rad) * orbit;
    const cy = Math.sin(rad) * orbit;
    const dur = duration ?? 8 + Math.random() * 4;

    return (
      <motion.span
        className="absolute font-mono text-[9px] tracking-wider pointer-events-none select-none whitespace-nowrap"
        style={{
          color,
          textShadow: `0 0 8px ${color}50`,
          left: "50%",
          top: "50%",
        }}
        initial={{ opacity: 0, x: cx, y: cy, scale: 0.8 }}
        animate={{
          opacity: [0, 0.45, 0.2, 0.45, 0],
          x: [cx, cx + 15, cx - 10, cx + 5, cx],
          y: [cy - 10, cy + 8, cy - 5, cy + 12, cy - 10],
          scale: [0.8, 1, 0.9, 1, 0.8],
        }}
        transition={{
          delay,
          duration: dur,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {label}
      </motion.span>
    );
  }

  /* ──────────────────────────────────────────────────
     Directional mode — particle drifts away from edge
     ────────────────────────────────────────────────── */
  const dir = position ?? "top";
  const isVertical = dir === "top" || dir === "bottom";
  const sign = dir === "top" || dir === "left" ? -1 : 1;
  const dur = duration ?? 3;

  // Drift keyframes: start near the parent, float outward, fade out
  const driftAxis = isVertical ? "y" : "x";
  const driftValues = [sign * 8, sign * 28, sign * 52];

  return (
    <motion.span
      className={`absolute font-mono text-[10px] tracking-wider pointer-events-none select-none whitespace-nowrap ${POSITION_CLASSES[dir]}`}
      style={{
        color,
        textShadow: `0 0 10px ${color}`,
      }}
      initial={{
        opacity: 0,
        [driftAxis]: sign * -5,
      }}
      animate={{
        opacity: [0, 0.7, 0],
        [driftAxis]: driftValues,
      }}
      transition={{
        duration: dur,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {label}
    </motion.span>
  );
}
