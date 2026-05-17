"use client";

import { motion } from "framer-motion";
import { GAMES } from "@/lib/utils";
import { useState, useCallback } from "react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   Arcade Cabinet — Cyber-Nature Edition
   Each game rendered as a retro arcade cabinet with three zones:
   Marquee (title) → Screen (icon) → Control Panel (play button)
   ───────────────────────────────────────────────────────────── */

function ArcadeCabinet({
  game,
  index,
}: {
  game: (typeof GAMES)[number];
  index: number;
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
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
      aria-label={`${game.title} — ${game.type}`}
      className="arcade-cabinet group relative flex flex-col overflow-visible"
      style={{ "--cab-color": game.color } as React.CSSProperties}
    >
      {/* ── Corner Accents (pixel acorn motifs) ── */}
      <div className="absolute -top-1 -left-1 z-30 text-[10px] leading-none opacity-40 group-hover:opacity-80 transition-opacity select-none pointer-events-none" aria-hidden="true">
        🌰
      </div>
      <div className="absolute -bottom-1 -right-1 z-30 text-[10px] leading-none opacity-40 group-hover:opacity-80 transition-opacity select-none pointer-events-none" aria-hidden="true">
        🍃
      </div>

      {/* ════════════════════════════════════════════
          ZONE 1: MARQUEE — Game Title & Genre Badge
          ════════════════════════════════════════════ */}
      <div className="arcade-marquee relative px-4 pt-4 pb-3 overflow-visible">
        {/* Marquee neon glow bar */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-sm"
          style={{
            background: `linear-gradient(90deg, transparent, ${game.color}, transparent)`,
            boxShadow: hovered ? `0 0 12px ${game.color}60` : "none",
            transition: "box-shadow 0.3s",
          }}
          aria-hidden="true"
        />

        {/* Genre coin-slot badge */}
        <div className="flex justify-end mb-1">
          <span className="arcade-badge font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-sm border select-none"
            style={{
              borderColor: `${game.color}50`,
              color: game.color,
              background: "rgba(0,0,0,0.6)",
              textShadow: `0 0 6px ${game.color}40`,
            }}
          >
            {game.type}
          </span>
        </div>

        {/* Title */}
        <h3
          className="font-display text-xl sm:text-2xl font-black leading-tight transition-colors duration-200"
          style={{
            color: hovered ? game.color : "var(--color-cream)",
            textShadow: hovered ? `0 0 20px ${game.color}50, 0 0 4px ${game.color}30` : "none",
          }}
        >
          {game.title}
        </h3>
      </div>

      {/* ════════════════════════════════════════════
          ZONE 2: SCREEN — CRT Display + Game Icon
          ════════════════════════════════════════════ */}
      <div className="arcade-screen relative mx-3 overflow-visible">
        {/* CRT screen container */}
        <div
          className="relative w-full overflow-visible rounded-sm"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* Screen background + curvature */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: `radial-gradient(ellipse 120% 120% at 50% 50%, #0d140d 0%, #050a05 60%, #020502 100%)`,
              boxShadow: `inset 0 2px 15px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4), 0 0 1px ${game.color}15`,
            }}
            aria-hidden="true"
          />

          {/* CRT Scanlines overlay */}
          <div className="arcade-scanlines absolute inset-0 rounded-sm pointer-events-none z-10" aria-hidden="true" />

          {/* Screen vignette */}
          <div
            className="absolute inset-0 rounded-sm pointer-events-none z-10"
            style={{
              background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)",
            }}
            aria-hidden="true"
          />

          {/* Screen ambient glow on hover */}
          {hovered && (
            <div
              className="absolute inset-0 rounded-sm pointer-events-none z-[5] transition-opacity"
              style={{
                background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${game.color}08, transparent)`,
              }}
              aria-hidden="true"
            />
          )}

          {/* Game Icon — centered, with "pop" overflow */}
          {game.icon && (
            <div className="absolute inset-0 flex items-center justify-center z-20 overflow-visible">
              {/* Icon glow */}
              <div
                className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${game.color}50, transparent)` }}
                aria-hidden="true"
              />
              <Image
                src={game.icon}
                alt={`${game.title} icon`}
                width={128}
                height={128}
                loading="lazy"
                className="relative w-20 h-20 sm:w-24 sm:h-24 object-contain image-render-pixel
                  drop-shadow-[0_6px_12px_rgba(0,0,0,0.7)]
                  group-hover:scale-110 transition-transform duration-300 ease-out"
              />
            </div>
          )}

          {/* "INSERT COIN" flicker for coming-soon games */}
          {isComingSoon && (
            <div className="absolute bottom-2 left-0 right-0 z-20 text-center">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse"
                style={{ color: game.color, textShadow: `0 0 8px ${game.color}` }}
              >
                Insert Coin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ZONE 3: CONTROL PANEL — Description + Play Button
          ════════════════════════════════════════════ */}
      <div className="arcade-controls flex flex-col flex-1 px-4 pt-3 pb-4">
        {/* Description */}
        <p className="text-xs sm:text-sm text-[var(--color-cream-dim)] leading-relaxed mb-3 flex-1 line-clamp-3">
          {game.description}
        </p>

        {/* Tag LEDs */}
        <div className="flex flex-wrap gap-1 mb-3">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider"
              style={{
                background: `${game.color}0a`,
                color: `${game.color}cc`,
                border: `1px solid ${game.color}18`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* ── Decorative Joystick Row + Play Button ── */}
        <div className="flex items-center gap-2">
          {/* Left joystick accent */}
          <div className="hidden sm:flex items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity" aria-hidden="true">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>

          {/* PLAY BUTTON — big arcade button */}
          <motion.a
            href={game.href}
            whileTap={{ scale: 0.93 }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            tabIndex={0}
            role="button"
            aria-label={isComingSoon ? `${game.title} — Coming Soon` : `Play ${game.title}`}
            className="arcade-play-btn flex-1 flex items-center justify-center gap-2
              px-4 py-2.5 rounded-full font-display font-bold text-sm
              transition-all duration-150 select-none"
            style={{
              background: isComingSoon
                ? "linear-gradient(180deg, #333 0%, #1a1a1a 100%)"
                : "linear-gradient(180deg, #FBBF24 0%, #f59e0b 60%, #d97706 100%)",
              color: isComingSoon ? "#666" : "#010508",
              boxShadow: pressed
                ? "inset 0 2px 6px rgba(0,0,0,0.5)"
                : hovered && !isComingSoon
                  ? `0 4px 20px rgba(251, 191, 36, 0.5), 0 0 30px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255,255,255,0.3)`
                  : `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`,
              transform: pressed ? "translateY(2px)" : "translateY(0)",
              border: isComingSoon ? "2px solid #333" : "2px solid #d97706",
              cursor: isComingSoon ? "not-allowed" : "pointer",
              pointerEvents: isComingSoon && game.href === "#" ? "none" : "auto",
            }}
          >
            {isComingSoon ? "🔒 Coming Soon" : "▶ PLAY"}
          </motion.a>

          {/* Right button accents */}
          <div className="hidden sm:flex items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity" aria-hidden="true">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          </div>
        </div>
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
            6 hand-tuned games with real $NUT prizes. Play for free, compete on the weekly leaderboard,
            and earn tokens just for having fun.
          </p>
        </motion.div>

        {/* Arcade Cabinets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {GAMES.map((game, i) => (
            <ArcadeCabinet key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
