"use client";

import { cn } from "@/lib/utils";

type AccentColor = "green" | "red" | "purple" | "blue" | "cyan" | "orange" | "gold";

interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: AccentColor;
  /** Adds a subtle circuit-grid pattern to the background */
  circuit?: boolean;
}

/**
 * CyberCard — "Neon Forest" glass card wrapper
 *
 * A reusable card with deep dark glass (0.85+ opacity), neon vine accent
 * line at top (brand-gold → neon-green gradient), and accent-color-aware
 * hover glow. The vine line glows on hover.
 *
 * @param accentColor - Color variant for the accent line and hover glow
 * @param circuit - Whether to show subtle circuit-board pattern
 */
export function CyberCard({
  children,
  className,
  accentColor = "green",
  circuit = false,
}: CyberCardProps) {
  return (
    <div
      className={cn("cyber-card", circuit && "cyber-card-circuit", className)}
      data-accent={accentColor}
    >
      {children}
    </div>
  );
}
