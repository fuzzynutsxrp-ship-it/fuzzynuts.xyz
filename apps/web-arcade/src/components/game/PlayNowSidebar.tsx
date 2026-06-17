"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { gameRegistry } from "@/lib/gameRegistry";
import { GAMES } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   PlayNowSidebar — CrazyGames-style game sidebar

   Same template as the GameModal "Play Next" sidebar but with
   "PLAY NOW" label since these modals aren't in-game contexts.
   ═══════════════════════════════════════════════════════════════ */

// slug → GAMES[].id mapping (same as GameModal)
const SLUG_TO_ID: Record<string, string> = {
  "fuzzy-survivors": "survivors",
  "nut-racer": "racer",
};

function slugToGamesId(slug: string): string {
  return SLUG_TO_ID[slug] || slug;
}

interface PlayNowSidebarProps {
  /** Called when user clicks a game card — receives GAMES[].id */
  onGameSelect?: (gamesId: string) => void;
}

export function PlayNowSidebar({ onGameSelect }: PlayNowSidebarProps) {
  const games = useMemo(() => {
    return gameRegistry.getAllLive().map((g) => ({
      ...g,
      gamesId: slugToGamesId(g.slug),
    }));
  }, []);

  return (
    <aside className="game-modal__sidebar" aria-label="Games">
      <div className="game-modal__sidebar-header">
        <Gamepad2 size={14} className="game-modal__sidebar-icon" />
        <span className="game-modal__sidebar-title">Play Now</span>
      </div>
      <div className="game-modal__sidebar-list">
        {games.map((game, i) => (
          <motion.button
            key={game.slug}
            className="play-next-card"
            onClick={() => onGameSelect?.(game.gamesId)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            aria-label={`Play ${game.title}`}
          >
            {/* Thumbnail */}
            <div className="play-next-card__thumb">
              <img src={game.iconPath} alt="" aria-hidden="true" loading="lazy" draggable={false} />
            </div>
            {/* Info */}
            <div className="play-next-card__info">
              <span className="play-next-card__title">{game.title}</span>
              <span className="play-next-card__genre" style={{ color: game.color }}>
                {game.genre}
              </span>
            </div>
            {/* Play button */}
            <span
              className="play-next-card__play"
              style={{
                background: `linear-gradient(135deg, ${game.color}, ${game.color}cc)`,
              }}
            >
              PLAY
            </span>
          </motion.button>
        ))}
      </div>
    </aside>
  );
}
