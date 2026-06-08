"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { CategoryFilters } from "@/components/game/CategoryFilters";
import { GameCard } from "@/components/game/GameCard";
import { GameModal } from "@/components/game/GameModal";
import { GAMES } from "@/lib/utils";

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

/* ═══════════════════════════════════════════════════════════════
   Homepage — Poki-style layout

   Clean, minimal, game-card-first design. No hero section,
   no marketing fluff — games start immediately below the nav.
   ChatWidget is rendered in layout.tsx and is not touched here.
   ═══════════════════════════════════════════════════════════════ */

// Category mapping: filter tab → matching game type or tags
function matchesCategory(game: (typeof GAMES)[number], category: string): boolean {
  if (category === "All Games") return true;
  // Check type field
  if (game.type.toLowerCase().includes(category.toLowerCase())) return true;
  // Check tags
  if (game.tags?.some((t) => t.toLowerCase().includes(category.toLowerCase()))) return true;
  // Special mappings
  if (category === "Roguelite" && game.id === "survivors") return true;
  if (category === "Mini Golf" && game.id === "minigolf") return true;
  if (category === "Racing" && game.id === "racer") return true;
  if (category === "Platformer" && game.id === "mario") return true;
  return false;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All Games");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const filteredGames = useMemo(
    () => GAMES.filter((g) => matchesCategory(g, activeCategory)),
    [activeCategory],
  );

  return (
    <>
      <Navbar />

      <main
        id="main-content"
        className="relative z-10 min-h-screen bg-[#0a0613]"
      >
        {/* Spacer for fixed navbar */}
        <div className="h-14 md:h-16" />

        {/* Category filters */}
        <div className="sticky top-14 md:top-16 z-30 bg-[#0a0613]/95 backdrop-blur-md border-b border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
            <CategoryFilters
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </div>
        </div>

        {/* Game grid */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 pb-32">
          {/* Responsive grid: 5 cols desktop, 3 tablet, 2 mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {filteredGames.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                onPlay={setActiveGameId}
                priority={i < 5}
              />
            ))}
          </div>

          {/* Empty state */}
          {filteredGames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-2xl mb-2">🥜</p>
              <p className="text-[var(--color-cream-dim)] text-sm">
                No games in this category yet.
              </p>
              <button
                onClick={() => setActiveCategory("All Games")}
                className="mt-3 text-sm text-brand-gold hover:underline cursor-pointer"
              >
                Show all games
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </main>

      {/* Game modal — CrazyGames-style lightbox */}
      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onGameSwitch={setActiveGameId}
      />
    </>
  );
}
