// Poki-style Homepage — TopNav + Sidebar + Game Grid
"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { FeaturedBanner } from "@/components/game/FeaturedBanner";
import { PokiGameCard } from "@/components/game/PokiGameCard";
import { GameModal } from "@/components/game/GameModal";
import { GAMES } from "@/lib/utils";

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

/* ═══════════════════════════════════════════════════════════════
   Category → Game matching
   Maps sidebar category values to game IDs / types / tags.
   ═══════════════════════════════════════════════════════════════ */

function matchesCategory(game: (typeof GAMES)[number], category: string): boolean {
  if (category === "popular") return true; // "Popular" shows all
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
    default:
      // Fallback: check type and tags
      return type.includes(category) || tags.some((t) => t.includes(category));
  }
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Filter by category first, then by search query
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

  // Split: featured (fuzzynuts-world) + the rest
  const featuredGame = GAMES.find((g) => g.id === "fuzzynuts-world");
  const gridGames = filteredGames.filter((g) => g.id !== "fuzzynuts-world");

  return (
    <div className="min-h-screen bg-[#0a0613] flex flex-col">
      {/* Top Navigation Bar */}
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Main Content Area */}
        <main
          id="main-content"
          className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-6 pb-32"
        >
          {/* Featured Game Banner — only show when not searching and on "popular" */}
          {activeCategory === "popular" && !searchQuery.trim() && featuredGame && (
            <section className="mb-8">
              <FeaturedBanner onPlay={setActiveGameId} />
            </section>
          )}

          {/* Section heading */}
          <section>
            <h2 className="font-display text-xl sm:text-2xl font-black text-cream mb-4">
              {activeCategory === "popular" && !searchQuery.trim()
                ? "Popular Right Now"
                : searchQuery.trim()
                  ? `Results for "${searchQuery}"`
                  : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Games`}
            </h2>

            {/* Game grid — responsive: 2 cols mobile, 3 tablet, 4 desktop, 5 wide */}
            {gridGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {gridGames.map((game, i) => (
                  <PokiGameCard
                    key={game.id}
                    game={game}
                    onPlay={setActiveGameId}
                    priority={i < 4}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-[var(--color-cream-dim)] text-sm">
                  No games found.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("popular");
                  }}
                  className="mt-3 text-sm text-brand-gold hover:underline cursor-pointer"
                >
                  Show all games
                </button>
              </div>
            )}
          </section>

          {/* Recently Played / Newest Additions */}
          {activeCategory === "popular" && !searchQuery.trim() && (
            <section className="mt-10">
              <h2 className="font-display text-xl sm:text-2xl font-black text-cream mb-4">
                Newest Additions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                {[...GAMES].reverse().slice(0, 3).map((game, i) => (
                  <PokiGameCard
                    key={game.id}
                    game={game}
                    onPlay={setActiveGameId}
                    priority={false}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="mt-12">
            <Footer />
          </div>
        </main>
      </div>

      {/* Game modal — lightbox overlay for playing games */}
      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onGameSwitch={setActiveGameId}
      />
    </div>
  );
}
