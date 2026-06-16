/**
 * Lightweight Plausible Analytics helper.
 *
 * Plausible is privacy-friendly, GDPR-compliant, and needs no cookie banner.
 * The main script is loaded in layout.tsx. This helper provides typed
 * wrappers for custom events (game_start, score_submitted).
 *
 * Custom events show up in the Plausible dashboard under "Custom Events".
 * No PII is collected — just game slug and score range.
 */

/** Plausible global function (injected by the script tag) */
type PlausibleFn = (event: string, opts?: { props?: Record<string, string | number> }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

/**
 * Track a custom event. No-op if Plausible script hasn't loaded yet
 * (SSR, ad-blocker, slow connection).
 */
function track(event: string, props?: Record<string, string | number>): void {
  try {
    if (typeof window !== "undefined" && window.plausible) {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Silent — analytics should never break the app
  }
}

/**
 * Track when a user starts playing a game.
 * Called when the GameModal iframe loads.
 */
export function trackGameStart(gameSlug: string): void {
  track("game_start", { game: gameSlug });
}

/**
 * Track when a score is submitted.
 * Buckets the score into ranges to avoid sending exact values.
 */
export function trackScoreSubmitted(gameSlug: string, score: number): void {
  // Bucket score into ranges for privacy
  const bucket =
    score < 1000
      ? "< 1k"
      : score < 10_000
        ? "1k-10k"
        : score < 100_000
          ? "10k-100k"
          : score < 1_000_000
            ? "100k-1M"
            : "> 1M";

  track("score_submitted", { game: gameSlug, score_range: bucket });
}

/**
 * Track when a user signs in (Google or wallet).
 */
export function trackSignIn(method: "google" | "wallet"): void {
  track("sign_in", { method });
}

/**
 * Track when a user joins Discord from the sidebar CTA.
 */
export function trackDiscordClick(source: "sidebar" | "footer" | "victory"): void {
  track("discord_click", { source });
}
