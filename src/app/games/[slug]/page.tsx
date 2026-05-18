import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePageClient } from "./client";
import { gameRegistry } from "@/lib/gameRegistry";

/* ── Static export: enumerate all valid game slugs ── */

export function generateStaticParams() {
  return gameRegistry.getAllSlugs().map((slug) => ({ slug }));
}

/* ── Per-page metadata ── */

type PageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = gameRegistry.getBySlug(slug);
  if (!game) return {};

  return {
    title: `${game.title} — Play Now | Fuzzynuts Arcade`,
    description: game.description,
    openGraph: {
      title: `${game.title} | Fuzzynuts Arcade`,
      description: game.description,
      type: "website",
    },
  };
}

/* ── Page Component ── */

export default async function GameRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const game = gameRegistry.getBySlug(slug);

  if (!game) {
    notFound();
  }

  return <GamePageClient game={game} />;
}
