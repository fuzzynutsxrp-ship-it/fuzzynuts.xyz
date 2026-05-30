"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";
import { GameModal } from "@/components/game/GameModal";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — DEGEN OVERHAUL (v6 — modal launch)

   v5: Thumbnail + title. Whole card clickable. Nothing else.
   v6: Cards open a CrazyGames-style lightbox modal instead of
       navigating to /games/[slug]. Preserves scroll position,
       instant game switching, no full-page reload.

   /games/[slug] routes still work for SEO + deep links.
   ───────────────────────────────────────────────────────────── */

// Card = clickable button, no navigation
const CARD_CLASSES =
  "arcade-card group relative flex flex-col rounded-2xl cursor-pointer " +
  "border-2 border-hot-pink neon-ring-pink " +
  "bg-[rgba(10,6,19,0.58)] " +
  "transition-all duration-300 ease-out " +
  "hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(255,46,136,0.5)]";

function ArcadeCabinet({
  game,
  index,
  onPlay,
}: {
  game: (typeof GAMES)[number];
  index: number;
  onPlay: (gameId: string) => void;
}) {
  const isComingSoon = game.id === "top-secret";

  // Try PNG first, fall back to webp for top-secret, then icon
  const [artSrc, setArtSrc] = useState(
    game.id === "top-secret"
      ? `/images/games/top-secret.webp`
      : `/images/games/${game.id}.png`
  );
  const handleArtError = () => {
    if (artSrc !== game.icon) setArtSrc(game.icon);
  };

  return (
    <motion.div
      onClick={() => {
        if (!isComingSoon) {
          onPlay(game.id);
        }
      }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      whileHover={isComingSoon ? {} : { scale: 1.03 }}
      whileTap={isComingSoon ? {} : { scale: 0.97 }}
      style={{ "--accent": game.color } as React.CSSProperties}
      className={CARD_CLASSES}
      role="button"
      aria-label={
        isComingSoon ? `${game.title} — Coming Soon` : `Play ${game.title}`
      }
      aria-disabled={isComingSoon}
      tabIndex={isComingSoon ? -1 : 0}
      onKeyDown={(e) => {
        if (!isComingSoon && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPlay(game.id);
        }
      }}
    >
      {/* Glossy plastic sheen */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl pointer-events-none z-30"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)",
        }}
      />

      {/* ── Thumbnail — square, dominant, 80% of card ── */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        <Image
          src={artSrc}
          alt={game.title}
          fill
          sizes="(min-width: 1024px) 220px, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
          onError={handleArtError}
          className="object-contain p-4 transition-transform duration-300 ease-out group-hover:scale-110"
        />
      </div>
    </motion.div>
  );
}

export function GamesShowcase() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  return (
    <section id="games" className="py-10 relative overflow-hidden">
      {/* Background layers */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-degen-mesh"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          backgroundImage: "url('/images/arcade-background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,6,19,0.72) 0%, rgba(10,6,19,0.50) 40%, rgba(10,6,19,0.55) 70%, rgba(10,6,19,0.75) 100%)",
        }}
      />

      <div className="container-main relative z-10">
        {/* Header — minimal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="neon-chip text-degen-crisp mb-4 animate-glitch-skew">
            🎰 Pick your poison
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
            The Arcade
          </h2>
        </motion.div>

        {/* Grid — tight 16px gaps like Pump.fun */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {GAMES.map((game, i) => (
            <ArcadeCabinet
              key={game.id}
              game={game}
              index={i}
              onPlay={setActiveGameId}
            />
          ))}
        </div>
      </div>

      {/* DEGEN OVERHAUL — CrazyGames-style lightbox modal */}
      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
      />
    </section>
  );
}
