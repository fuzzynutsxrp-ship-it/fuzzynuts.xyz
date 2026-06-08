"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * LiveWinsTicker — DEGEN OVERHAUL (new component)
 *
 * A scrolling "live wins" marquee in the degen house style. It does
 * NOT add any new backend call — it taps the SAME leaderboard SSE
 * stream the <Leaderboard/> already consumes (useLeaderboardSSE →
 * GET /api/scores/stream). Real recent scores are framed as wins.
 *
 * When the stream is empty / quiet (common pre-launch) it falls back
 * to rotating hype copy — never fabricated wins or fake numbers
 * (that would be misleading on a TEST-token, pre-launch site and is
 * against the project's own invariants in CLAUDE.md).
 *
 * Pure presentational. Zero changes to wallet flow, scoring, routing
 * or any backend contract.
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { useLeaderboardSSE } from "@/features/arcade";
import { GAMES, truncateAddress, formatNumber } from "@/lib/utils";

/** Flagship game whose live SSE feed powers the ticker. */
const TICKER_GAME = "fuzzynuts-world";

/** Hype lines shown when the live feed has nothing yet. */
const HYPE: string[] = [
  "🥜 Jump in and play",
  "🚀 Top 3 split the pool every Monday",
  "🎰 Free to play · real prizes on the line",
  "🔥 Play responsibly… or don't",
  "🐿️ The nuttiest games online",
  "⚡ Climb the board · win prizes",
];

export function LiveWinsTicker({ game = TICKER_GAME }: { game?: string }) {
  // Same hook the leaderboard uses — one shared SSE, no new endpoint.
  const { scores } = useLeaderboardSSE(game);
  const gameTitle = GAMES.find((g) => g.id === game)?.title ?? "FuzzyNuts";

  const items = useMemo(() => {
    const wins = (scores ?? []).slice(0, 12).map((s, i) => {
      const who = s.name || (s.wallet ? truncateAddress(s.wallet) : "Anonymous player");
      return (
        <span key={`${s.wallet ?? s.session ?? i}-${s.score}`} className="neon-chip">
          🥜 <span className="text-[var(--color-cream)]">{who}</span>
          <span className="text-[var(--color-cream-dim)]">just scored</span>
          <span className="text-[var(--color-gold)]">{formatNumber(s.score)}</span>
          <span className="text-[var(--color-cream-dim)]">on {gameTitle}</span>
        </span>
      );
    });
    if (wins.length > 0) return wins;
    // Fallback — hype copy, never fake wins.
    return HYPE.map((line, i) => (
      <span key={`hype-${i}`} className="neon-chip">
        {line}
      </span>
    ));
  }, [scores, gameTitle]);

  // Render the set twice so the CSS -50% loop is seamless.
  const doubled = [...items, ...items];

  return (
    <div
      // DEGEN OVERHAUL — kill glass on the ticker strip: solid degen-950
      // (no backdrop-blur), thick 2 px hot-pink top/bottom borders,
      // outer pink glow so the strip reads as a hard neon band, not a
      // frosted overlay.
      className="relative z-20 w-full border-y-2 border-hot-pink bg-degen-950 py-2 shadow-[0_0_24px_rgba(255,46,136,0.28)]"
      role="marquee"
      aria-label="Live wins ticker"
    >
      <div className="container-main flex items-center gap-3">
        {/* LIVE label */}
        <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-hot-pink)] text-pink-glow">
          <span className="w-2 h-2 rounded-full bg-[var(--color-hot-pink)] live-pulse-dot" />
          Live Wins
        </span>

        {/* Marquee */}
        <div className="degen-marquee flex-1">
          <div className="degen-marquee__track">{doubled}</div>
        </div>
      </div>
    </div>
  );
}

export default LiveWinsTicker;
