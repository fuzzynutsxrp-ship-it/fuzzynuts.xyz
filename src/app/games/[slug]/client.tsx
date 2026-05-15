"use client";

import { GameWrapper, type GameConfig } from "@/components/game/GameWrapper";

interface GamePageClientProps {
  game: GameConfig;
}

/**
 * Client-side wrapper for the game page.
 * Separates the server component (page.tsx) from
 * the client-side interactive logic (GameWrapper).
 */
export function GamePageClient({ game }: GamePageClientProps) {
  return <GameWrapper game={game} />;
}
