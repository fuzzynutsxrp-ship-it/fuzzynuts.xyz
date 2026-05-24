"use client";

import { GamePage } from "@/components/game/GamePage";
import { ComingSoonGamePage } from "@/components/game/ComingSoonGamePage";
import type { GameMetadata } from "@/lib/gameRegistry";

interface GamePageClientProps {
  game: GameMetadata;
}

/**
 * Client-side wrapper for the game page.
 * Routes to the playable GamePage for live games, or a stub for
 * games whose engine isn't ready yet (`status: "coming-soon"`).
 */
export function GamePageClient({ game }: GamePageClientProps) {
  if (game.status === "coming-soon") {
    return <ComingSoonGamePage game={game} />;
  }
  return <GamePage game={game} />;
}
