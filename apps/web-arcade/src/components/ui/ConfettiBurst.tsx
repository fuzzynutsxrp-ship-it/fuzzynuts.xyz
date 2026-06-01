"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * ConfettiBurst — shared degen confetti explosion
 *
 * Reuses the existing CSS engine (.confetti-particle / @keyframes
 * confetti-burst defined in globals.css). Pure CSS — no JS animation
 * loop, no canvas. Renders inside its parent (must be position:
 * relative). Reduced-motion gated by globals.css.
 *
 * Extracted from ClaimRewards.tsx so the same burst can fire on
 * every $NUT moment — claim success, score submission, etc.
 *
 * Degen palette: hot-pink / acid / cyan / gold / violet, plus a
 * pinch of 🥜 emoji particles for the FuzzyNuts moment.
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";

// Degen palette (hot-pink / acid / cyan / gold / violet)
const DEGEN_COLORS = [
  "#ff2e88",
  "#39ff14",
  "#22d3ee",
  "#FBBF24",
  "#7c3aed",
  "#ff5fa2",
  "#00ffa3",
  "#ffe066",
];

const NUT_EMOJIS = ["🥜", "🐿️", "💰", "✨"];

type Intensity = "low" | "medium" | "high" | "max";

const INTENSITY_COUNT: Record<Intensity, number> = {
  low: 24,
  medium: 36,
  high: 56,
  max: 80,
};

interface ConfettiBurstProps {
  /** Particle volume — "high" matches the original ClaimRewards burst; "max" is for huge wins. Default "high". */
  intensity?: Intensity;
  /** Fraction of particles rendered as 🥜/🐿️ emoji instead of color blobs. 0–1. Default 0.18. */
  emojiRatio?: number;
}

export function ConfettiBurst({
  intensity = "high",
  emojiRatio = 0.18,
}: ConfettiBurstProps) {
  // useMemo so re-renders of the parent don't reshuffle the burst.
  const particles = useMemo(() => {
    const n = INTENSITY_COUNT[intensity];
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 360 + (Math.random() - 0.5) * 18; // mostly radial w/ jitter
      const distance = 60 + Math.random() * 180;
      const isEmoji = Math.random() < emojiRatio;
      const size = isEmoji ? 12 + Math.random() * 14 : 3 + Math.random() * 9;
      return {
        id: i,
        angle,
        distance,
        size,
        color: DEGEN_COLORS[i % DEGEN_COLORS.length],
        emoji: isEmoji ? NUT_EMOJIS[i % NUT_EMOJIS.length] : null,
        delay: Math.random() * 0.4,
      };
    });
  }, [intensity, emojiRatio]);

  return (
    <div
      className="confetti-container confetti-degen absolute inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => {
        const x = Math.cos((p.angle * Math.PI) / 180) * p.distance;
        const y = Math.sin((p.angle * Math.PI) / 180) * p.distance - 40;
        const common: React.CSSProperties = {
          left: "50%",
          top: "50%",
          animationDelay: `${p.delay}s`,
          ["--confetti-x" as string]: `${x}px`,
          ["--confetti-y" as string]: `${y}px`,
        };
        if (p.emoji) {
          return (
            <span
              key={p.id}
              className="confetti-particle"
              style={{
                ...common,
                fontSize: `${p.size}px`,
                lineHeight: 1,
                filter: "drop-shadow(0 0 6px rgba(255,46,136,0.5))",
              }}
            >
              {p.emoji}
            </span>
          );
        }
        return (
          <div
            key={p.id}
            className="confetti-particle"
            style={{
              ...common,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.id % 3 === 0 ? "50%" : "2px",
              boxShadow: `0 0 8px ${p.color}80`,
            }}
          />
        );
      })}
    </div>
  );
}

export default ConfettiBurst;
