"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";
import { GameModal } from "@/components/game/GameModal";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — DEGEN OVERHAUL (v6 — modal launch)

   v5: Thumbnail + title. Whole card clickable. Nothing else.
   v6: Cards open a CrazyGames-style lightbox modal. Preserves scroll
       position, instant game switching, no full-page reload.
   ───────────────────────────────────────────────────────────── */

// Card = clickable button, no navigation
// DEGEN FLUID SCALING START — Production-reviewed architecture
const CARD_CLASSES =
  "arcade-card group relative cursor-pointer " +
  "transition-all duration-300 ease-out";
// DEGEN FLUID SCALING END

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
      {/* DEGEN CARD FIX START — Production-reviewed flex column structure */}
      {/* ── Image wrapper — flex:1 absorbs extra space, min-height:0 prevents overflow ── */}
      {/* ── Glossy sheen is now a ::after pseudo-element (GPU-accelerated) ── */}
      <div className="arcade-card__image-wrapper">
        <Image
          src={artSrc}
          alt={game.title}
          fill
          sizes="(min-width: 1280px) 380px, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
          onError={handleArtError}
          className="object-cover p-4 transition-transform duration-300 ease-out group-hover:scale-110"
        />
        {/* Coming Soon overlay */}
        {isComingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-t-xl z-10">
            <span className="text-cream/80 font-display text-sm font-bold tracking-wider uppercase">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {/* ── Card content — fixed height area, never gets squished ── */}
      <div className="arcade-card__content flex flex-col flex-1 min-h-0 pt-2">
        {/* Genre tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {game.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-hot-pink/30 text-hot-pink/80 bg-hot-pink/5"
            >
              {tag}
            </span>
          ))}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent-purple/30 text-accent-purple/80 bg-accent-purple/5"
          >
            {game.type}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-black text-cream truncate mb-1">
          {game.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-cream-dim/70 line-clamp-2 leading-relaxed mb-3 flex-1">
          {game.description}
        </p>

        {/* PLAY button */}
        <button
          type="button"
          tabIndex={-1}
          className={`
            w-full py-2 rounded-lg font-display text-xs font-black uppercase tracking-widest
            transition-all duration-200
            ${
              isComingSoon
                ? "bg-degen-900 text-cream/30 cursor-not-allowed border border-cream/5"
                : "bg-hot-pink/90 text-white hover:bg-hot-pink hover:shadow-[0_0_24px_rgba(255,46,136,0.5)] active:scale-95 border border-hot-pink/50"
            }
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (!isComingSoon) onPlay(game.id);
          }}
          disabled={isComingSoon}
        >
          {isComingSoon ? "🔒 Locked" : "🕹️ PLAY"}
        </button>

        {/* Insert coin footer */}
        {!isComingSoon && (
          <p className="text-center text-[9px] font-mono text-acid/50 uppercase tracking-[0.2em] mt-1.5 animate-pulse">
            Insert Coin — Free to Play
          </p>
        )}
      </div>
      {/* DEGEN CARD FIX END — Production-reviewed flex column structure */}
    </motion.div>
  );
}

export function GamesShowcase() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  return (
    <section id="games" className="relative overflow-hidden">
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

      {/* DEGEN FLUID SCALING — arcade-section owns its own max-width */}
      <div className="arcade-section relative z-10">
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

        {/* DEGEN FLUID SCALING START */}
        <div className="arcade-grid">
        {/* DEGEN FLUID SCALING END */}
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

      {/* DEGEN OVERHAUL — CrazyGames-style lightbox modal + Play Next sidebar */}
      <GameModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onGameSwitch={setActiveGameId}
      />
    </section>
  );
}
