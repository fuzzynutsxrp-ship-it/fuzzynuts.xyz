"use client";

import { motion } from "framer-motion";
import { GAMES } from "@/lib/utils";
import { useState, useCallback } from "react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   GameCard — Cyber-Nature Premium Edition
   Clean, tight layout with ambient glow, gradient borders,
   and dynamic hover interactions.
   ───────────────────────────────────────────────────────────── */

function GameCard({
  game,
  index,
  featured = false,
}: {
  game: (typeof GAMES)[number];
  index: number;
  featured?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleHover = useCallback(() => setHovered(true), []);
  const handleLeave = useCallback(() => {
    setHovered(false);
    setPressed(false);
  }, []);

  const isComingSoon = game.id === "racer" || game.id === "top-secret";

  return (
    <motion.article
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
      aria-label={`${game.title} — ${game.type}`}
      className={`game-card group relative flex flex-col ${
        featured ? "game-card--featured sm:col-span-2 lg:col-span-2" : ""
      }`}
      style={{ "--gc-accent": game.color } as React.CSSProperties}
    >
      {/* ── Gradient border overlay ── */}
      <div className="game-card__border" aria-hidden="true" />

      {/* ── Inner highlight (top edge glow) ── */}
      <div className="game-card__highlight" aria-hidden="true" />

      {/* ════════════════════════════════════════════
          ICON ZONE — Tight framing, ambient glow
          ════════════════════════════════════════════ */}
      <div
        className={`relative flex items-center justify-center overflow-visible ${
          featured ? "py-6 px-6" : "py-5 px-4"
        }`}
      >
        {/* Ambient radial glow behind icon */}
        <div
          className="game-card__ambient absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${game.color}20, transparent 70%)`,
          }}
          aria-hidden="true"
        />

        {game.icon && (
          <div
            className={`relative z-10 ${
              featured
                ? "w-full max-w-[200px] aspect-square"
                : "w-full max-w-[160px] aspect-square"
            } mx-auto flex items-center justify-center`}
          >
            <Image
              src={game.icon}
              alt={`${game.title} icon`}
              width={featured ? 200 : 160}
              height={featured ? 200 : 160}
              loading="lazy"
              className="relative w-full h-full object-contain image-render-pixel
                drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]
                group-hover:scale-[1.08] transition-transform duration-300 ease-out"
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          CONTENT ZONE — Title, Genre, Description, Tags, Button
          ════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 px-4 pb-5 pt-1 gap-3">
        {/* Title + Genre Row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-display text-lg sm:text-xl font-bold leading-tight game-card__title"
            style={{
              "--gc-title-glow": hovered ? `0 0 18px ${game.color}40` : "none",
            } as React.CSSProperties}
          >
            {game.title}
          </h3>
          <span
            className="shrink-0 font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm mt-0.5 whitespace-nowrap"
            style={{
              borderColor: `${game.color}40`,
              color: `${game.color}cc`,
              background: `${game.color}08`,
              border: `1px solid ${game.color}25`,
            }}
          >
            {game.type}
          </span>
        </div>

        {/* Description */}
        <p className="font-body text-sm leading-relaxed text-[var(--color-cream-dim)] line-clamp-3">
          {game.description}
        </p>

        {/* Tags — slide up on hover */}
        <div className="flex flex-wrap gap-1.5">
          {game.tags.map((tag, ti) => (
            <span
              key={tag}
              className="game-card__tag font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
              style={{
                background: `${game.color}0c`,
                color: `${game.color}dd`,
                border: `1px solid ${game.color}1a`,
                transitionDelay: `${ti * 40}ms`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-1" />

        {/* Play Button — sleek pill */}
        <motion.a
          href={game.href}
          whileTap={{ scale: 0.95 }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          tabIndex={0}
          role="button"
          aria-label={
            isComingSoon
              ? `${game.title} — Coming Soon`
              : `Play ${game.title}`
          }
          className="game-card__play-btn flex items-center justify-center gap-2
            w-full px-5 py-2.5 rounded-full font-display font-bold text-sm
            transition-all duration-200 select-none"
          style={{
            background: isComingSoon
              ? "linear-gradient(180deg, #222 0%, #141414 100%)"
              : "linear-gradient(180deg, #FBBF24 0%, #f59e0b 60%, #d97706 100%)",
            color: isComingSoon ? "#555" : "#010508",
            boxShadow: pressed
              ? "inset 0 2px 8px rgba(0,0,0,0.6)"
              : hovered && !isComingSoon
                ? `0 4px 24px rgba(251, 191, 36, 0.45), 0 0 40px rgba(251, 191, 36, 0.15), inset 0 1px 0 var(--color-glass-border-strong)`
                : `0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 var(--color-glass-border-strong)`,
            border: isComingSoon ? "1px solid #333" : "1px solid #d97706",
            cursor: isComingSoon ? "not-allowed" : "pointer",
            pointerEvents:
              isComingSoon && game.href === "#" ? "none" : "auto",
          }}
        >
          {isComingSoon ? "🔒 Coming Soon" : "▶ PLAY"}
        </motion.a>
      </div>
    </motion.article>
  );
}

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — Section Container
   ───────────────────────────────────────────────────────────── */
export function GamesShowcase() {
  return (
    <section id="games" className="py-24 relative overflow-hidden">
      {/* ── Games Section Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/sections/games-bg.jpg"
          alt=""
          fill
          quality={72}
          className="object-cover object-center hidden sm:block"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
        <Image
          src="/images/sections/games-bg-mobile.jpg"
          alt=""
          fill
          quality={68}
          className="object-cover object-center sm:hidden"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
      </div>

      {/* ── Combined Overlay (merged 4 layers → 1) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: [
            "linear-gradient(to bottom, rgba(1,5,8,0.96) 0%, rgba(1,5,8,0.68) 15%, rgba(1,5,8,0.52) 40%, rgba(1,5,8,0.68) 75%, rgba(1,5,8,0.96) 100%)",
            "linear-gradient(to right, rgba(1,5,8,0.6) 0%, transparent 18%, transparent 82%, rgba(1,5,8,0.6) 100%)",
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(16,185,129,0.06) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 50% 40%, rgba(251,191,36,0.03) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

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
            6 hand-tuned games with real $NUT prizes. Play for free, compete on
            the weekly leaderboard, and earn tokens just for having fun.
          </p>
        </motion.div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {GAMES.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              index={i}
              featured={game.id === "fuzzynuts-world"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
