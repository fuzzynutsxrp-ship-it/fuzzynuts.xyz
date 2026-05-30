/**
 * ═══════════════════════════════════════════════════════════════
 * Tiny format helpers — extracted from @/lib/utils so consumers can
 * import these without pulling the big const arrays (TOKENOMICS,
 * GAMES, HOW_TO_STEPS) along for the ride.
 *
 * Hot path: GameModal imports formatNumber from here to keep the
 * main bundle lean.
 *
 * @/lib/utils still re-exports these for backward compatibility, so
 * existing call sites work unchanged. New code should import from
 * @/lib/format directly.
 * ═══════════════════════════════════════════════════════════════
 */

/** Format a USD amount as proper currency: "$0.10", "$30.00", "$1,234.56". */
export function formatUsd(num: number): string {
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Truncate a long address for compact display: "rXxx...Yyyy". */
export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/** Compact-format a number with K/M/B suffix. "1234" → "1.2K", "50000" → "50K". */
export function formatNumber(num: number): string {
  // Number(...) strips a trailing ".0" so round values read "50K", not "50.0K",
  // while keeping a real decimal when it matters (e.g. "1.5K", "124.9K").
  if (num >= 1_000_000_000) return `${Number((num / 1_000_000_000).toFixed(1))}B`;
  if (num >= 1_000_000) return `${Number((num / 1_000_000).toFixed(1))}M`;
  if (num >= 1_000) return `${Number((num / 1_000).toFixed(1))}K`;
  return num.toString();
}
