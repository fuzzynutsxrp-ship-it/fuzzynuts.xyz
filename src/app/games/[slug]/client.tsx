"use client";

import { GamePage } from "@/components/game/GamePage";
import type { GameMetadata } from "@/lib/gameRegistry";

interface GamePageClientProps {
  game: GameMetadata;
}

/**
 * Client-side wrapper for the game page.
 * Separates the server component (page.tsx) from
 * the client-side interactive logic (GamePage).
 */
export function GamePageClient({ game }: GamePageClientProps) {
  return <GamePage game={game} />;
}
