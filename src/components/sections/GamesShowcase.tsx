"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { GAMES } from "@/lib/utils";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { CyberCard } from "@/components/ui/CyberCard";

/** Map game colors to CyberCard accent names */
const ACCENT_MAP: Record<string, "green" | "red" | "purple" | "cyan" | "orange"> = {
  kaetram: "green",
  mario: "red",
  survivors: "purple",
  minigolf: "cyan",
  racer: "orange",
};

const NUT_EMOJIS = ["🌰", "🥜", "🐿️", "✨", "⭐"];

function NutExplosion({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{
            x: "50%",
            y: "50%",
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 140}%`,
            y: `${50 + (Math.random() - 0.5) * 140}%`,
            scale: [0, 1 + Math.random() * 0.5, 0],
            opacity: [1, 0.9, 0],
            rotate: [0, Math.random() * 360],
          }}
          transition={{ duration: 0.7, delay: i * 0.025 }}
          className="absolute text-base md:text-lg"
          style={{ left: 0, top: 0 }}
        >
          {NUT_EMOJIS[i % NUT_EMOJIS.length]}
        </motion.span>
      ))}
    </div>
  );
}

function GameCard({ game, index }: { game: typeof GAMES[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [exploding, setExploding] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleHover = useCallback(() => {
    setHovered(true);
    setExploding(true);
    setTimeout(() => setExploding(false), 800);
  }, []);

  const accent = ACCENT_MAP[game.id] || "green";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseEnter={handleHover}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: hovered ? rotateX : 0,
        rotateY: hovered ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 800,
      }}
      className="relative group overflow-visible"
    >
      <NutExplosion isActive={exploding} />

      <CyberCard accentColor={accent} className="h-full overflow-visible">
        <motion.div
          whileHover={{ y: -8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="p-6 h-full flex flex-col relative cursor-pointer overflow-visible"
        >
          {/* Hover glow */}
          {hovered && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
              style={{
                background: `radial-gradient(ellipse 60% 60% at 50% 0%, ${game.color}08, transparent)`,
              }}
            />
          )}

          {/* ── Top-Left Popping Icon ── */}
          {game.icon && (
            <div className="absolute -top-6 -left-6 z-20 rotate-[-6deg] group-hover:rotate-0 transition-transform duration-300 ease-out">
              {/* Glow behind icon */}
              <div
                className="absolute inset-0 blur-lg rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle, ${game.color}40, ${game.color}15)`,
                }}
              />
              {/* Icon image */}
              <Image
                src={game.icon}
                alt={`${game.title} icon`}
                width={112}
                height={112}
                loading="lazy"
                className="relative w-24 h-24 sm:w-28 sm:h-28 object-contain image-render-pixel
                           drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]
                           group-hover:scale-110 transition-transform duration-300 ease-out"
              />
            </div>
          )}

          {/* Genre badge — top right */}
          <div className="flex justify-end mb-3 pt-10 sm:pt-12">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{
                background: `${game.color}15`,
                color: game.color,
                border: `1px solid ${game.color}25`,
              }}
            >
              {game.type}
            </span>
          </div>

          {/* Title */}
          <h3
            className="text-xl font-display font-bold mb-2 transition-colors duration-200"
            style={{ color: hovered ? game.color : "var(--color-cream)" }}
          >
            {game.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed flex-1 mb-4">
            {game.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-md bg-[rgba(16,185,129,0.05)] text-[var(--color-cream-dim)] border border-[rgba(16,185,129,0.08)]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Play button — uses accent color for hover glow */}
          <motion.a
            href={game.href}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: hovered ? game.color : `${game.color}15`,
              color: hovered ? "var(--color-forest-dark)" : game.color,
              border: `1px solid ${game.color}30`,
              boxShadow: hovered ? `0 0 20px ${game.color}40` : "none",
            }}
          >
            {game.id === "racer" ? "Coming Soon" : "Play Now"}
            {game.id !== "racer" && <ExternalLink size={14} />}
          </motion.a>
        </motion.div>
      </CyberCard>
    </motion.div>
  );
}

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
            5 hand-tuned games with real $NUT prizes. Play for free, compete on the weekly leaderboard,
            and earn tokens just for having fun.
          </p>
        </motion.div>

        {/* Games grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
