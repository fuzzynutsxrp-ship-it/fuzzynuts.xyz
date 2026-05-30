"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — DEGEN OVERHAUL (v4 — battle-tested density)

   Research from Pump.fun (live DOM), Stake, Roobet, Duelbits,
   Betpanda, Rollbit: game cards should be THUMBNAIL-DOMINANT
   with 2-3 lines of text max. No descriptions, no tags, no
   decorative bloat on cards. Maximum density, minimum cognitive
   load. Everything scannable at speed.

   What survived: thumbnail, title, type, PLAY button.
   What got killed: description, tags, decorative arcade buttons,
   "INSERT COIN" caption, CRT scanlines per card, speaker-grille
   dots, vignette per card, excessive padding.
   ───────────────────────────────────────────────────────────── */

// DEGEN OVERHAUL START — compact card shell
const CARD_CLASSES =
  "arcade-card group relative flex flex-col rounded-2xl " +
  "border-2 border-hot-pink neon-ring-pink " +
  "bg-[rgba(10,6,19,0.58)] " +
  "transition-all duration-300 ease-out " +
  "hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(255,46,136,0.5)] " +
  "focus-within:scale-[1.03] focus-within:shadow-[0_0_48px_rgba(255,46,136,0.5)]";
// DEGEN OVERHAUL END

// DEGEN OVERHAUL START — compact PLAY button
const PLAY_BTN_BASE =
  "relative inline-flex items-center justify-center w-full px-4 py-2 " +
  "rounded-lg font-display font-black text-xs tracking-widest uppercase select-none " +
  "transition-all duration-200 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-degen-950";
// DEGEN OVERHAUL END

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
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      style={{ "--accent": game.color } as React.CSSProperties}
      className={CARD_CLASSES}
      aria-label={`${game.title} — ${game.type}`}
    >
      {/* DEGEN OVERHAUL START — glossy plastic sheen over everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl pointer-events-none z-30"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl pointer-events-none z-30"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)",
        }}
      />
      {/* DEGEN OVERHAUL END */}

      {/* ── Thumbnail — square, dominant, 65%+ of card area ── */}
      {/* DEGEN OVERHAUL START — square aspect ratio, no CRT bloat */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${game.color}20, transparent 70%)`,
          }}
        />
        <Image
          src={artSrc}
          alt={`${game.title} — game art`}
          fill
          sizes="(min-width: 1024px) 220px, (min-width: 640px) 50vw, 100vw"
          loading="lazy"
          onError={handleArtError}
          className="object-contain p-5 drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-transform duration-400 ease-out group-hover:scale-110"
        />
      </div>
      {/* DEGEN OVERHAUL END */}

      {/* ── Info bar — title + type + PLAY, tight and dense ── */}
      {/* DEGEN OVERHAUL START — minimal info, no description/tags */}
      <div
        className="flex flex-col gap-2 px-3 py-3"
        style={{
          background:
            "linear-gradient(180deg, rgba(16,16,19,0.15) 0%, rgba(10,10,12,0.10) 100%)",
        }}
      >
        {/* Accent line */}
        <div
          aria-hidden="true"
          className="h-[2px] -mx-3 -mt-3 mb-1"
          style={{
            background: `linear-gradient(90deg, transparent, ${game.color}88, transparent)`,
          }}
        />

        {/* Title + type — 2 lines max */}
        <div className="text-center">
          <h3
            className="font-display text-sm font-black uppercase tracking-wide leading-tight text-[var(--color-cream)]"
            style={{ textShadow: `0 0 10px ${game.color}88` }}
          >
            {game.title}
          </h3>
          <span
            className="block mt-0.5 font-mono text-[8px] tracking-[0.25em] uppercase"
            style={{ color: `${game.color}cc` }}
          >
            {game.type}
          </span>
        </div>

        {/* PLAY button */}
        <motion.a
          href={isComingSoon ? undefined : game.href}
          onClick={(e) => {
            if (!isComingSoon && game.href !== "#") {
              e.preventDefault();
              window.location.href = game.href;
            }
          }}
          whileHover={
            isComingSoon
              ? undefined
              : {
                  scale: 1.04,
                  boxShadow: "0 0 30px rgba(255,46,136,0.5)",
                }
          }
          whileTap={isComingSoon ? undefined : { scale: 0.96 }}
          tabIndex={isComingSoon ? -1 : 0}
          role="button"
          aria-label={
            isComingSoon
              ? `${game.title} — Coming Soon`
              : `Play ${game.title}`
          }
          aria-disabled={isComingSoon}
          className={`${PLAY_BTN_BASE} ${
            isComingSoon
              ? "cursor-not-allowed text-[#555]"
              : "cursor-pointer text-[var(--color-degen-black)]"
          }`}
          style={{
            background: isComingSoon
              ? "linear-gradient(180deg, #26262a 0%, #131316 100%)"
              : "linear-gradient(135deg, var(--color-gold) 0%, var(--color-hot-pink) 100%)",
            boxShadow: isComingSoon
              ? "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 0 #0a0a0c"
              : "0 6px 20px rgba(255,46,136,0.3)",
            pointerEvents:
              isComingSoon && game.href === "#" ? "none" : "auto",
          }}
        >
          {isComingSoon ? "🔒 Soon" : "▶ PLAY"}
        </motion.a>
      </div>
      {/* DEGEN OVERHAUL END */}
    </motion.article>
  );
}

export function GamesShowcase() {
  return (
    <section id="games" className="py-10 relative overflow-hidden">
      {/* ── DEGEN OVERHAUL START — Retro Arcade Room Background ── */}
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
          backgroundRepeat: "no-repeat",
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
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[3] opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0 1px, transparent 1px 3px)",
        }}
      />
      {/* ── DEGEN OVERHAUL END ── */}

      <div className="container-main relative z-10">
        {/* Section header — shortened */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-10"
        >
          <span className="neon-chip mb-3 animate-glitch-skew">🎰 Pick your poison</span>
          <h2 className="font-display text-3xl md:text-4xl font-black gradient-text-gold mb-2">
            The Arcade
          </h2>
          <p className="text-[var(--color-cream-dim)] text-sm max-w-lg mx-auto">
            Five live, one locked. Real $NUT every week. Top the board, bag the bag.
          </p>
        </motion.div>

        {/* DEGEN OVERHAUL START — tighter grid matching battle-tested sites
            Pump.fun: 16px/24px gaps. Stake/Roobet: 10-16px gaps.
            3 cols desktop, 2 cols tablet, 1 col mobile. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {GAMES.map((game, i) => (
            <ArcadeCabinet key={game.id} game={game} index={i} />
          ))}
        </div>
        {/* DEGEN OVERHAUL END */}
      </div>
    </section>
  );
}
