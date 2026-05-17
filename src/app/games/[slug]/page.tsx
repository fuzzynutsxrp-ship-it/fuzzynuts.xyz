import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePageClient } from "./client";

/* ──────────────────────────────────────────
   Game Registry — Maps URL slugs to game configs.

   This is the single source of truth for which slugs are valid.
   Each entry maps a URL slug (e.g., /games/mario/) to:
   - title, type, color: branding for the wrapper chrome
   - iframeSrc: the path to the legacy index.html in public/games/
   - sandbox: iframe sandbox permissions (optional override)
   ────────────────────────────────────────── */

interface GameRegistryEntry {
  title: string;
  type: string;
  color: string;
  description: string;
  iframeSrc: string;
  sandbox?: string;
}

const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  "top-secret": {
    title: "Top Secret",
    type: "??? Classified",
    color: "#8B5CF6",
    description:
      "🔒 A brand-new game is being built behind closed doors. Stay tuned — details dropping soon.",
    iframeSrc: "/games/top-secret/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-pointer-lock",
  },
  "fuzzynuts-world": {
    title: "Fuzzynuts World",
    type: "MMORPG",
    color: "#4ade80",
    description:
      "Explore a massive open world, complete quests, craft items, and compete with players worldwide.",
    iframeSrc: "/games/fuzzynuts-world/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
  mario: {
    title: "Super Fuzzynuts",
    type: "Platformer",
    color: "#ef4444",
    description:
      "Classic side-scrolling action with all 32 original levels, random map generator, and level editor.",
    iframeSrc: "/games/mario/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
  "fuzzy-survivors": {
    title: "Fuzzy Survivors",
    type: "Horde Survival",
    color: "#a855f7",
    description:
      "Survive endless waves of enemies with auto-attack combat. Upgrade weapons and see how long you last.",
    iframeSrc: "/games/fuzzy-survivors/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
  minigolf: {
    title: "Fuzzy Putt",
    type: "Mini Golf",
    color: "#22d3ee",
    description:
      "3D mini-golf with physics-based putting. Navigate tricky courses and aim for hole-in-one.",
    iframeSrc: "/games/minigolf/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
  "nut-racer": {
    title: "Nut Racer",
    type: "Racing",
    color: "#f97316",
    description:
      "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish!",
    iframeSrc: "/games/nut-racer/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
};

/* ── Static export: enumerate all valid game slugs ── */

export function generateStaticParams() {
  return Object.keys(GAME_REGISTRY).map((slug) => ({ slug }));
}

/* ── Per-page metadata ── */

type PageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = GAME_REGISTRY[slug];
  if (!game) return {};

  return {
    title: `${game.title} — Play Now`,
    description: game.description,
    openGraph: {
      title: `${game.title} | Fuzzynuts Arcade`,
      description: game.description,
      type: "website",
    },
  };
}

/* ── Page Component ── */

export default async function GamePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const entry = GAME_REGISTRY[slug];

  if (!entry) {
    notFound();
  }

  const gameConfig = {
    slug,
    title: entry.title,
    type: entry.type,
    color: entry.color,
    iframeSrc: entry.iframeSrc,
    sandbox: entry.sandbox,
  };

  return <GamePageClient game={gameConfig} />;
}
