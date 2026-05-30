"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — DEGEN OVERHAUL (v5 — maximum density)

   Battle-tested from Pump.fun (live DOM), Stake, Roobet,
   Duelbits, Betpanda, Rollbit:

   WHAT TOP SITES SHOW ON CARDS:
     • Thumbnail (65-70% of card)
     • Name (1 line)
     • That's it. Nothing else.

   WHAT THEY DON'T SHOW:
     • Genre/type labels
     • Descriptions
     • Tags
     • Separate play buttons (whole card is clickable)
     • Decorative elements

   v5: Thumbnail + title. Whole card clickable. Nothing else.
   ───────────────────────────────────────────────────────────── */

// Card = clickable link, no separate button needed
const CARD_CLASSES =
  "arcade-card group relative flex flex-col rounded-2xl cursor-pointer " +
  "border-2 border-hot-pink neon-ring-pink " +
  "bg-[rgba(10,6,19,0.58)] " +
  "transition-all duration-300 ease-out " +
  "hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(255,46,136,0.5)]";

function ArcadeCabinet({
  game,
  index,
}: {
  game: (typeof GAMES)[number];
  index: number;
}) {
  const isComingSoon = game.id === "top-secret";

  const [artSrc, setArtSrc] = useState(`/images/games/${game.id}.png`);
  const handleArtError = () => {
    if (artSrc !== game.icon) setArtSrc(game.icon);
  };

  return (
    <motion.a
      href={isComingSoon ? undefined : game.href}
      onClick={(e) => {
        if (!isComingSoon && game.href !== "#") {
          e.preventDefault();
          window.location.href = game.href;
        }
      }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
      style={{ "--accent": game.color } as React.CSSProperties}
      className={CARD_CLASSES}
      aria-label={isComingSoon ? `${game.title} — Coming Soon` : `Play ${game.title}`}
      aria-disabled={isComingSoon}
      tabIndex={isComingSoon ? -1 : 0}
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

      {/* ── Title — 1 line, that's it ── */}
      <div className="px-3 py-2 text-center">
        <h3
          className="font-display text-sm font-black uppercase tracking-wide leading-none text-[var(--color-cream)]"
          style={{ textShadow: `0 0 8px ${game.color}66` }}
        >
          {isComingSoon ? "🔒 " : ""}{game.title}
        </h3>
      </div>
    </motion.a>
  );
}

export function GamesShowcase() {
  return (
    <section id="games" className="py-10 relative overflow-hidden">
      {/* Background layers */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 bg-degen-mesh" />
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
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-8"
        >
          <span className="neon-chip mb-3 animate-glitch-skew">🎰 Pick your poison</span>
          <h2 className="font-display text-3xl md:text-4xl font-black gradient-text-gold">
            The Arcade
          </h2>
        </motion.div>

        {/* Grid — tight 16px gaps like Pump.fun */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {GAMES.map((game, i) => (
            <ArcadeCabinet key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
