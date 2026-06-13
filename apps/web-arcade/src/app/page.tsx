// FuzzyNuts Arcade — React homepage (served at /).
// Single source of games: GAMES (in sync with lib/gameRegistry, 38 games).
// Every card opens the shared GameModal shell, so all games look uniform.
"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { TopNav } from "@/components/layout/TopNav";
import { CategoryTabs } from "@/components/game/CategoryTabs";
import { PokiGameCard } from "@/components/game/PokiGameCard";
import { ComingSoonCard } from "@/components/game/ComingSoonCard";
import { GAMES } from "@/lib/utils";

const GameModal = dynamic(() =>
  import("@/components/game/GameModal").then((m) => ({ default: m.GameModal })),
);

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

/* ═══════════════════════════════════════════════════════════════
   Curated sections — manually ordered for visual impact.
   These pick specific game IDs to feature at the top; the full
   catalog renders below in the "All Games" grid.
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
];

/* ═══════════════════════════════════════════════════════════════
   Category → Game matching (for tab filtering)
   ═══════════════════════════════════════════════════════════════ */

function matchesCategory(game: (typeof GAMES)[number], category: string): boolean {
  if (category === "all") return true;
  const type = game.type.toLowerCase();
  const tags = (game.tags ?? []).map((t) => t.toLowerCase());
  const hay = [type, ...tags];
  switch (category) {
    case "multiplayer": return hay.some((h) => h.includes("multiplayer"));
    case "arcade": return hay.some((h) => h.includes("arcade") || h.includes("action"));
    case "racing": return hay.some((h) => h.includes("racing") || h.includes("runner"));
    case "chill": return hay.some((h) => h.includes("casual") || h.includes("puzzle") || h.includes("physics"));
    case "classic": return hay.some((h) => h.includes("classic"));
    case "sports": return hay.some((h) => h.includes("sports"));
    case "puzzle": return hay.some((h) => h.includes("puzzle"));
    default: return hay.some((h) => h.includes(category));
  }
}

function gamesByIds(ids: string[]) {
  return ids.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as typeof GAMES;
}

/* Pre-computed curated rows — static IDs + static GAMES = no need to recompute per render */
const TRENDING_GAMES = gamesByIds(TRENDING_IDS);
const NEW_GAMES = gamesByIds(NEW_IDS);
const TOP_RATED_GAMES = gamesByIds(TOP_RATED_IDS);

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
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

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

  const trending = TRENDING_GAMES;
  const justAdded = NEW_GAMES;
  const topRated = TOP_RATED_GAMES;

  return (
    <div className="min-h-screen bg-[#0a0613] flex flex-col">
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="flex-1 px-3 md:px-5 py-4 pb-32">
        {isFiltering ? (
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
          <>
            <GameRow title="Trending Now" emoji="🔥" games={trending} onPlay={setActiveGameId} priorityStart tileSize="large" />
            <GameRow title="Just Added" emoji="🆕" games={justAdded} onPlay={setActiveGameId} tileSize="large" />
            <GameRow title="Top Rated" emoji="🏆" games={topRated} onPlay={setActiveGameId} tileSize="small" />

            {/* All Games — the full catalog (every game in GAMES) */}
            <section className="mb-8">
              <h2 className="font-display text-[var(--fluid-h2)] font-black text-cream mb-3 flex items-center gap-2">
                <span>🎮</span> All Games
                <span className="text-[var(--color-cream-dim)] text-sm font-normal">({GAMES.length})</span>
              </h2>
              <div className="game-grid-fluid">
                {GAMES.map((game, i) => (
                  <PokiGameCard key={game.id} game={game} onPlay={setActiveGameId} priority={i < 6} />
                ))}
              </div>
            </section>

            {/* Coming Soon — labelled teasers (no links, no 404s) */}
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

        <div className="mt-12">
          <Footer />
        </div>
      </main>

      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onGameSwitch={setActiveGameId}
      />
    </div>
  );
}
