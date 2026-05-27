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

      {/* Subtle brushed-metal texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl opacity-25 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 2px, rgba(255,255,255,0.04) 2px 3px)",
        }}
      />

      {/* T-molding — accent-colored plastic edge trim around the cabinet */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl pointer-events-none z-20"
        style={{
          boxShadow: `inset 0 0 0 2px ${game.color}66, inset 0 0 0 3px rgba(0,0,0,0.6)`,
        }}
      />

      {/* Shine sweep on hover — hidden when reduced-motion is requested */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none motion-reduce:hidden z-20">
        <div className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.05] md:via-white/[0.09] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-cabinet-shine" />
      </div>

      {/* ── Inner panel (marquee + screen + control deck) ── */}
      <div className="relative m-2.5 rounded-2xl bg-[#08080a] overflow-hidden flex flex-col flex-1 [transform:translateZ(0)]">
        {/* ── MARQUEE — backlit header carrying the game name ── */}
        <div
          className="relative flex items-center justify-center px-8 py-2.5 text-center overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${game.color}33 0%, ${game.color}12 60%, transparent 100%)`,
            borderBottom: `1px solid ${game.color}55`,
          }}
        >
          {/* Speaker-grille dots flanking the marquee */}
          <span
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-7 opacity-50"
            style={{
              backgroundImage: `radial-gradient(${game.color}aa 0.9px, transparent 1.3px)`,
              backgroundSize: "4px 4px",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-7 opacity-50"
            style={{
              backgroundImage: `radial-gradient(${game.color}aa 0.9px, transparent 1.3px)`,
              backgroundSize: "4px 4px",
            }}
          />
          <div className="motion-safe:group-hover:animate-neon-flicker">
            <h3
              className="font-display text-base sm:text-lg font-black uppercase tracking-wide leading-none text-[var(--color-cream)]"
              style={{ textShadow: `0 0 12px ${game.color}aa` }}
            >
              {game.title}
            </h3>
            <span
              className="block mt-1 font-mono text-[9px] tracking-[0.28em] uppercase"
              style={{ color: `${game.color}dd` }}
            >
              {game.type}
            </span>
          </div>
        </div>

        {/* ── Screen — CRT inside a bezel ── */}
        <div className="relative px-3 pt-3 pb-1">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-lg"
            style={{
              background:
                "radial-gradient(ellipse at top, #1a1a1c, #050507 80%)",
              boxShadow: `inset 0 0 0 3px #0a0a0c, inset 0 0 0 4px ${game.color}22, inset 0 8px 22px rgba(0,0,0,0.85), inset 0 0 40px ${game.color}12`,
            }}
          >
            {/* Ambient accent glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 55%, ${game.color}26, transparent 70%)`,
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
              className="object-contain p-4 sm:p-5 drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            />

            {/* CRT scanlines */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 md:opacity-30 pointer-events-none z-10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.20) 0 1px, transparent 1px 3px)",
              }}
            />

            {/* Glass glare — diagonal highlight, top-left */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 16%, transparent 42%)",
              }}
            />

            {/* Vignette — fakes the CRT's curved-glass darkening at the edges */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </div>
        </div>

        {/* ── Control deck ── */}
        <div
          className="relative flex flex-col flex-1 px-5 pt-4 pb-5 gap-3"
          style={{
            background:
              "linear-gradient(180deg, #101013 0%, #0a0a0c 55%, #050506 100%)",
          }}
        >
          {/* Deck lip — the physical break between screen and control panel */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${game.color}55, transparent)`,
            }}
          />

          {/* Description */}
          <p className="font-body text-sm leading-relaxed text-[var(--color-cream-dim)] line-clamp-2">
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

          <div className="flex-1 min-h-1" />

          {/* Control row — decorative arcade buttons + PLAY */}
          <div className="flex items-center gap-3">
            {/* Two round buttons, like a real control panel */}
            <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), ${game.color})`,
                  boxShadow: `0 2px 3px rgba(0,0,0,0.6), 0 0 8px ${game.color}66`,
                }}
              />
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.5), #e2483b)",
                  boxShadow: "0 2px 3px rgba(0,0,0,0.6)",
                }}
              />
            </div>

            {/* PLAY — chunky domed arcade button (locked for Top Secret) */}
            <motion.a
              href={isComingSoon ? undefined : game.href}
              onClick={(e) => {
                if (!isComingSoon && game.href !== "#") {
                  e.preventDefault();
                  window.location.href = game.href;
                }
              }}
              whileTap={isComingSoon ? undefined : { scale: 0.96, y: 2 }}
              tabIndex={isComingSoon ? -1 : 0}
              role="button"
              aria-label={
                isComingSoon
                  ? `${game.title} — Coming Soon`
                  : `Play ${game.title}`
              }
              aria-disabled={isComingSoon}
              className={`${PLAY_BTN_BASE} flex-1 ${
                isComingSoon
                  ? "cursor-not-allowed text-[#666]"
                  : "cursor-pointer text-[#3a1d00]"
              }`}
              style={{
                background: isComingSoon
                  ? "linear-gradient(180deg, #26262a 0%, #131316 100%)"
                  : "radial-gradient(130% 130% at 50% 0%, #FFE7A3 0%, #FCD34D 32%, #f59e0b 70%, #d97706 100%)",
                boxShadow: isComingSoon
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 #0a0a0c, 0 6px 10px rgba(0,0,0,0.5)"
                  : "inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -3px 6px rgba(120,53,15,0.5), 0 4px 0 #92400e, 0 9px 16px rgba(0,0,0,0.5)",
                pointerEvents:
                  isComingSoon && game.href === "#" ? "none" : "auto",
              }}
            >
              {isComingSoon ? "🔒 Coming Soon" : "▶ PLAY"}
            </motion.a>
          </div>

          {/* Coin-slot caption */}
          <p
            className="text-center font-mono text-[9px] tracking-[0.3em] uppercase opacity-55"
            style={{ color: `${game.color}cc` }}
          >
            {isComingSoon ? "Coming soon" : "Insert coin · free to play"}
          </p>
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
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            Arcade
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Five games live, one more in the vault — real $NUT on the line every
            week. Pick a cabinet, climb the leaderboard, get paid.
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
