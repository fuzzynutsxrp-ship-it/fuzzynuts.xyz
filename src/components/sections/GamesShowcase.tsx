"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — Retro 3D Arcade Cabinet Edition

   Per-card branding tokens (all defined in src/app/globals.css):
     --color-cream      = #f0ede6   (primary text on dark surfaces)
     --color-cream-dim  = #b0a890   (secondary / description text)
     --color-gold       = #FBBF24   (FuzzyNuts brand gold — PLAY button)
     --accent           = game.color (set per-card inline, e.g.
                                      #4ade80 neon-green, #ef4444 red,
                                      #a855f7 purple, #22d3ee cyan,
                                      #f97316 orange, #8B5CF6 secret-purple)

   Mobile / reduced-motion strategy:
     • Heavy 3D rotateX hover + cabinet-hover shadow gated behind
       `motion-safe:md:hover:` — on phones or when the user has
       prefers-reduced-motion set, cards stay flat with the base
       `shadow-cabinet` only.
     • Shine sweep is hidden entirely under `prefers-reduced-motion`.
     • CRT scanlines dim from opacity-15 → md:opacity-30.
   ───────────────────────────────────────────────────────────── */

const CABINET_CLASSES =
  "arcade-cabinet group relative flex flex-col rounded-3xl " +
  "[transform-style:preserve-3d] will-change-transform " +
  "transition-[transform,box-shadow] duration-500 ease-out shadow-cabinet " +
  "motion-safe:md:hover:shadow-cabinet-hover " +
  "motion-safe:md:focus-within:shadow-cabinet-hover " +
  "motion-safe:md:hover:[transform:perspective(1200px)_rotateX(-3deg)_translateY(-8px)_scale(1.03)] " +
  "motion-safe:md:focus-within:[transform:perspective(1200px)_rotateX(-3deg)_translateY(-8px)_scale(1.03)]";

const PLAY_BTN_BASE =
  "relative inline-flex items-center justify-center gap-2 w-full px-5 py-3 " +
  "rounded-full font-display font-black text-sm tracking-widest uppercase select-none " +
  "transition-all duration-200 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507]";

function ArcadeCabinet({
  game,
  index,
}: {
  game: (typeof GAMES)[number];
  index: number;
}) {
  const isComingSoon = game.id === "top-secret";

  // Graceful fallback: try new /images/games/<id>.jpg cabinet art,
  // fall back to the existing /icons/icon-*-pop.webp on error.
  const [artSrc, setArtSrc] = useState(`/images/games/${game.id}.jpg`);
  const handleArtError = () => {
    if (artSrc !== game.icon) setArtSrc(game.icon);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
      style={{ "--accent": game.color } as React.CSSProperties}
      className={CABINET_CLASSES}
      aria-label={`${game.title} — ${game.type}`}
    >
      {/* Cabinet body — beveled metal/wood gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, #2c2c30 0%, #1a1a1d 18%, #0d0d10 75%, #050507 100%)",
        }}
      />

      {/* Hairline highlight on top edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px rounded-full pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
        }}
      />

      {/* Subtle brushed-metal texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl opacity-25 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, rgba(255,255,255,0.04) 2px 3px)",
        }}
      />

      {/* Shine sweep on hover — hidden when reduced-motion is requested */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none motion-reduce:hidden">
        <div className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.05] md:via-white/[0.09] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-cabinet-shine" />
      </div>

      {/* ── Inner panel (screen + control deck) ── */}
      <div className="relative m-3 rounded-2xl bg-[#08080a] overflow-hidden flex flex-col flex-1 [transform:translateZ(0)]">
        {/* Neon inset border — gently flickers on hover (motion-safe only) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl pointer-events-none motion-safe:group-hover:animate-neon-flicker"
          style={{
            boxShadow: `inset 0 0 0 1px ${game.color}33, inset 0 0 24px ${game.color}1f`,
          }}
        />

        {/* ── Screen / hero art ── */}
        <div
          className="relative aspect-[4/3] overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at top, #1a1a1c, #050507 80%)",
            boxShadow: `inset 0 6px 16px rgba(0,0,0,0.7), inset 0 0 40px ${game.color}14`,
          }}
        >
          {/* Ambient accent glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 55%, ${game.color}28, transparent 70%)`,
            }}
          />

          {/* Cabinet art with onError → existing icon fallback */}
          <Image
            src={artSrc}
            alt={`${game.title} — cabinet art`}
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            loading="lazy"
            onError={handleArtError}
            className="object-contain p-5 sm:p-6 drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] transition-transform duration-500 ease-out group-hover:scale-[1.07]"
          />

          {/* Marquee glow strip — also picks up neon-flicker on hover */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-6 pointer-events-none motion-safe:group-hover:animate-neon-flicker"
            style={{
              background: `linear-gradient(180deg, ${game.color}22, transparent)`,
            }}
          />

          {/* CRT scanlines — dimmed on mobile, full intensity on md+ */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-15 md:opacity-30 pointer-events-none z-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)",
            }}
          />
        </div>

        {/* ── Control panel: title, meta, button ── */}
        <div className="relative flex flex-col flex-1 px-5 pt-4 pb-5 gap-3 bg-gradient-to-b from-[#0c0c0e] via-[#08080a] to-[#040406]">
          {/* Title + type pill */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg sm:text-xl font-extrabold leading-tight tracking-tight text-[var(--color-cream)] transition-colors duration-300 group-hover:text-[color:var(--accent)]">
              {game.title}
            </h3>
            <span
              className="shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-sm mt-0.5 whitespace-nowrap border"
              style={{
                borderColor: `${game.color}40`,
                color: `${game.color}dd`,
                background: `${game.color}0e`,
              }}
            >
              {game.type}
            </span>
          </div>

          {/* Description */}
          <p className="font-body text-sm leading-relaxed text-[var(--color-cream-dim)] line-clamp-3">
            {game.description}
          </p>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border"
                style={{
                  background: `${game.color}0c`,
                  color: `${game.color}dd`,
                  borderColor: `${game.color}1f`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex-1 min-h-2" />

          {/* PLAY — beveled orange arcade button (locked variant for Top Secret) */}
          <motion.a
            href={isComingSoon ? undefined : game.href}
            onClick={(e) => {
              if (!isComingSoon && game.href !== "#") {
                e.preventDefault();
                window.location.href = game.href;
              }
            }}
            whileTap={isComingSoon ? undefined : { scale: 0.96 }}
            tabIndex={isComingSoon ? -1 : 0}
            role="button"
            aria-label={
              isComingSoon
                ? `${game.title} — Coming Soon`
                : `Play ${game.title}`
            }
            aria-disabled={isComingSoon}
            className={
              isComingSoon
                ? `${PLAY_BTN_BASE} cursor-not-allowed text-[#555]`
                : `${PLAY_BTN_BASE} cursor-pointer text-[#0a0500] shadow-play-arcade hover:shadow-play-arcade-hover`
            }
            style={{
              background: isComingSoon
                ? "linear-gradient(180deg, #2a2a2a 0%, #141414 100%)"
                : "linear-gradient(180deg, #FCD34D 0%, #FBBF24 35%, #f59e0b 70%, #d97706 100%)",
              border: isComingSoon ? "1px solid #2e2e2e" : "1px solid #b45309",
              pointerEvents:
                isComingSoon && game.href === "#" ? "none" : "auto",
            }}
          >
            {isComingSoon ? "🔒 Coming Soon" : "▶ PLAY"}
          </motion.a>
        </div>
      </div>
    </motion.article>
  );
}

export function GamesShowcase() {
  return (
    <section id="games" className="py-12 relative overflow-hidden">
      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-16"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="section-badge mb-4"
          >
            🎮 Play-to-Earn Arcade
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            The Games
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Six hand-tuned games, one weekly leaderboard, real $NUT on the line.
            Pick a cabinet and start climbing.
          </p>
        </motion.div>

        {/* 3×2 grid — shared perspective so hover tilts feel coordinated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 [perspective:1400px]">
          {GAMES.map((game, i) => (
            <ArcadeCabinet key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
