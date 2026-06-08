// Poki-style Homepage — compact top bar + category tabs + dense game grid
"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { TopNav } from "@/components/layout/TopNav";
import { CategoryTabs } from "@/components/game/CategoryTabs";
import { PokiGameCard } from "@/components/game/PokiGameCard";
import { GameModal } from "@/components/game/GameModal";
import { GAMES } from "@/lib/utils";

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

/* ═══════════════════════════════════════════════════════════════
   Category → Game matching
   ═══════════════════════════════════════════════════════════════ */

function matchesCategory(game: (typeof GAMES)[number], category: string): boolean {
  if (category === "all") return true;
  const id = game.id;
  const type = game.type.toLowerCase();
  const tags = game.tags?.map((t) => t.toLowerCase()) ?? [];

  switch (category) {
    case "multiplayer":
      return id === "fuzzynuts-world" || id === "rsc";
    case "arcade":
      return id === "mario" || id === "survivors";
    case "racing":
      return id === "racer";
    case "chill":
      return id === "minigolf";
    case "classic":
      return id === "rsc" || id === "mario";
    default:
      return type.includes(category) || tags.some((t) => t.includes(category));
  }
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Filter by category then search
  const filteredGames = useMemo(() => {
    let games = GAMES.filter((g) => matchesCategory(g, activeCategory));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      games = games.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.type.toLowerCase().includes(q) ||
          g.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return games;
  }, [activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0613] flex flex-col">
      {/* Compact Top Bar */}
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setMenuOpen((o) => !o)}
      />

      {/* Category Tabs */}
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Game Grid — starts immediately, no hero, no marketing */}
      <main className="flex-1 px-3 md:px-5 py-4 pb-32">
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {filteredGames.map((game, i) => (
              <PokiGameCard
                key={game.id}
                game={game}
                onPlay={setActiveGameId}
                priority={i < 6}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-[var(--color-cream-dim)] text-sm">No games found.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-3 text-sm text-brand-gold hover:underline cursor-pointer"
            >
              Show all games
            </button>
          </div>
        )}

        {/* Minimal footer */}
        <div className="mt-16">
          <Footer />
        </div>
      </main>

      {/* Game modal */}
      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onGameSwitch={setActiveGameId}
      />
    </div>
  );
}
