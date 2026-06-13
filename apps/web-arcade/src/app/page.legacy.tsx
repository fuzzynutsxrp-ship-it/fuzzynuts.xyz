// Poki-style Homepage — sectioned rows + coming soon density
"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { TopNav } from "@/components/layout/TopNav";
import { CategoryTabs } from "@/components/game/CategoryTabs";
import { PokiGameCard } from "@/components/game/PokiGameCard";
import { ComingSoonCard } from "@/components/game/ComingSoonCard";
import { GAMES } from "@/lib/utils";
import { GameModalSkeleton } from "@/components/game/GameModalSkeleton";

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

const GameModal = dynamic(() =>
  import("@/components/game/GameModal").then((m) => ({ default: m.GameModal })),
  { loading: () => <GameModalSkeleton />, ssr: false },
);

/* ═══════════════════════════════════════════════════════════════
   Curated sections — manually ordered for visual impact.
   Each section picks specific game IDs from the GAMES registry.
   ═══════════════════════════════════════════════════════════════ */

const TRENDING_IDS = ["fuzzynuts-world", "mario", "survivors"];
const NEW_IDS = ["minigolf", "racer", "rsc"];
const TOP_RATED_IDS = ["mario", "fuzzynuts-world", "minigolf", "rsc", "survivors", "racer"];

const COMING_SOON = [
  { title: "Fuzzy Kart", genre: "Racing" },
  { title: "Nut Royale", genre: "Battle Royale" },
  { title: "Squirrel Tycoon", genre: "Sim / Tycoon" },
  { title: "Dungeon Nuts", genre: "Roguelike" },
  { title: "Fuzzy Chess", genre: "Board Game" },
  { title: "Acorn Builder", genre: "Puzzle" },
  { title: "Nut Defense", genre: "Tower Defense" },
  { title: "Fuzzy Soccer", genre: "Sports" },
  { title: "Pixel Nuts", genre: "Platformer" },
  { title: "Fuzzy Poker", genre: "Card Game" },
  { title: "Sky Nuts", genre: "Endless Runner" },
  { title: "Fuzzy Farm", genre: "Farming Sim" },
];

/* ═══════════════════════════════════════════════════════════════
   Category → Game matching (for tab filtering)
   ═══════════════════════════════════════════════════════════════ */

function matchesCategory(game: (typeof GAMES)[number], category: string): boolean {
  if (category === "all") return true;
  const id = game.id;
  switch (category) {
    case "multiplayer": return id === "fuzzynuts-world" || id === "rsc";
    case "arcade": return id === "mario" || id === "survivors";
    case "racing": return id === "racer";
    case "chill": return id === "minigolf";
    case "classic": return id === "rsc" || id === "mario";
    default: return false;
  }
}

function gamesByIds(ids: string[]) {
  return ids.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as typeof GAMES;
}

/* ═══════════════════════════════════════════════════════════════
   Section row component — horizontal scroll on mobile, grid on desktop
   ═══════════════════════════════════════════════════════════════ */

function GameRow({
  title,
  emoji,
  games,
  onPlay,
  priorityStart = false,
  tileSize = "small",
}: {
  title: string;
  emoji: string;
  games: typeof GAMES;
  onPlay: (id: string) => void;
  priorityStart?: boolean;
  tileSize?: "large" | "small";
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-[var(--fluid-h2)] font-black text-cream mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      {/* Horizontal scroll on mobile, mosaic grid on desktop */}
      <div className="game-grid-mosaic flex overflow-x-auto scrollbar-none pb-2 md:grid md:overflow-visible md:pb-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {games.map((game, i) => (
          <div key={game.id} className={`shrink-0 w-[44vw] sm:w-[30vw] md:w-auto tile-${tileSize}`}>
            <PokiGameCard
              game={game}
              onPlay={onPlay}
              priority={priorityStart && i < 3}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // When searching or filtering, show flat filtered grid
  const isFiltering = activeCategory !== "all" || searchQuery.trim().length > 0;

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

  const trending = gamesByIds(TRENDING_IDS);
  const justAdded = gamesByIds(NEW_IDS);
  const topRated = gamesByIds(TOP_RATED_IDS);

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

      {/* Main content */}
      <main className="flex-1 px-3 md:px-5 py-4 pb-32">
        {isFiltering ? (
          /* ── Filtered / Search results: flat grid ── */
          filteredGames.length > 0 ? (
            <section>
              <h2 className="font-display text-[var(--fluid-h2)] font-black text-cream mb-3">
                {searchQuery.trim()
                  ? `Results for "${searchQuery}"`
                  : `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Games`}
              </h2>
              <div className="game-grid-fluid">
                {filteredGames.map((game, i) => (
                  <PokiGameCard key={game.id} game={game} onPlay={setActiveGameId} priority={i < 6} />
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-[var(--color-cream-dim)] text-sm">No games found.</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                className="mt-3 text-sm text-brand-gold hover:underline cursor-pointer"
              >
                Show all games
              </button>
            </div>
          )
        ) : (
          /* ── Default view: sectioned rows ── */
          <>
            <GameRow title="Trending Now" emoji="🔥" games={trending} onPlay={setActiveGameId} priorityStart tileSize="large" />
            <GameRow title="Just Added" emoji="🆕" games={justAdded} onPlay={setActiveGameId} tileSize="large" />
            <GameRow title="Top Rated" emoji="🏆" games={topRated} onPlay={setActiveGameId} tileSize="small" />

            {/* Coming Soon — density filler */}
            <section className="mb-8">
              <h2 className="font-display text-[var(--fluid-h2)] font-black text-cream/60 mb-3 flex items-center gap-2">
                <span>🔒</span> Coming Soon
              </h2>
              <div className="game-grid-mosaic">
                {COMING_SOON.map((item) => (
                  <div key={item.title} className="tile-small">
                    <ComingSoonCard title={item.title} genre={item.genre} />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Footer */}
        <div className="mt-12">
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
