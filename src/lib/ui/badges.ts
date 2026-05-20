/**
 * Shared status badge class definitions — single source of truth.
 *
 * Use these across GamePage and any future toast/badge UIs
 * to prevent cross-route style drift.
 *
 * @example
 * ```tsx
 * import { getToastClasses } from "@/lib/ui/badges";
 * <div className={getToastClasses("success")} />
 * ```
 */

/** Available toast/badge style variants */
export type BadgeVariant =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "gold"
  | "silver"
  | "bronze";

/** Badge size presets */
export type BadgeSize = "sm" | "md" | "lg";

/**
 * Toast-style class strings for each status variant.
 * Uses Tailwind token classes — no hardcoded rgba.
 */
export const TOAST_CLASSES: Record<BadgeVariant, string> = {
  info: "bg-neon-blue/15 border-neon-blue/40 text-blue-400",
  success: "bg-neon-green/15 border-neon-green/40 text-emerald-400",
  warning: "bg-brand-gold/15 border-brand-gold/40 text-brand-gold",
  error: "bg-red-500/15 border-red-500/40 text-red-400",
  gold: "bg-brand-gold/[0.18] border-brand-gold/50 text-brand-gold",
  silver: "bg-silver/10 border-silver/30 text-silver",
  bronze: "bg-bronze/10 border-bronze/30 text-bronze",
} as const;

/**
 * Prize badge class strings for leaderboard rank indicators.
 */
export const PRIZE_BADGE_CLASSES: Record<1 | 2 | 3, string> = {
  1: "bg-brand-gold/10 border-brand-gold/30 text-brand-gold",
  2: "bg-silver/10 border-silver/30 text-silver",
  3: "bg-bronze/10 border-bronze/30 text-bronze",
} as const;

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3.5 py-1.5",
};

/**
 * Get combined toast/badge classes for a given variant + optional size.
 *
 * @param variant - The semantic color variant
 * @param size - Size preset (default: "md")
 * @returns Tailwind class string
 */
export function getToastClasses(
  variant: BadgeVariant,
  size: BadgeSize = "md"
): string {
  return `${TOAST_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
}

/**
 * Get prize badge classes for leaderboard rank 1/2/3.
 *
 * @param rank - Player rank (1, 2, or 3)
 * @param size - Size preset (default: "sm")
 * @returns Tailwind class string
 */
export function getPrizeBadgeClasses(
  rank: 1 | 2 | 3,
  size: BadgeSize = "sm"
): string {
  return `${PRIZE_BADGE_CLASSES[rank]} ${SIZE_CLASSES[size]}`;
}
