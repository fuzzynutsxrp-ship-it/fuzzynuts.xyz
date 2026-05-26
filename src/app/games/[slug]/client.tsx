"use client";

import { GamePage } from "@/components/game/GamePage";
import { ComingSoonGamePage } from "@/components/game/ComingSoonGamePage";
import type { GameMetadata } from "@/lib/gameRegistry";

interface GamePageClientProps {
  game: GameMetadata;
}

/**
 * Client-side wrapper for the game page.
 * Separates the server component (page.tsx) from
 * the client-side interactive logic (GamePage).
 *
 * Unlaunched games (status === "coming-soon") render a stub instead
 * of the live iframe, so deep links / share cards stay reachable
 * without loading an empty game.
 */
export function GamePageClient({ game }: GamePageClientProps) {
  if (game.status === "coming-soon") {
    return <ComingSoonGamePage game={game} />;
  }
  return <GamePage game={game} />;
}
