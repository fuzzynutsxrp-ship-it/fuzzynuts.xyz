"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import type { GameMetadata } from "@/lib/gameRegistry";

/* ═══════════════════════════════════════════════════════════════
   ComingSoonGamePage — stub for unlaunched games

   Rendered in place of the live GamePage iframe when a game's
   registry entry has status === "coming-soon". Keeps the route
   reachable (so deep links / mobile share cards don't 404) while
   making it unambiguous that the game isn't playable yet.
   ═══════════════════════════════════════════════════════════════ */

export function ComingSoonGamePage({ game }: { game: GameMetadata }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[var(--color-forest-dark)] text-center">
      <Link
        href="/#games"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-cream-dim hover:text-cream hover:bg-white/[0.06] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Arcade
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md"
      >
        <div
          className="relative mx-auto w-28 h-28 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `${game.color}10`,
            border: `1px solid ${game.color}30`,
            boxShadow: `0 0 40px ${game.color}15`,
          }}
        >
          <Image
            src={game.iconPath}
            alt={`${game.title} icon`}
            width={112}
            height={112}
            className="w-24 h-24 object-contain image-render-pixel"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold uppercase tracking-widest text-cream-dim mb-4">
          <Clock size={11} />
          Coming Soon
        </div>

        <h1
          className="font-display text-3xl sm:text-4xl font-black mb-3"
          style={{ color: game.color }}
        >
          {game.title}
        </h1>

        <p className="text-sm sm:text-base text-cream-dim leading-relaxed mb-8">
          {game.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#games"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-500 text-forest-dark font-bold text-sm hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-shadow"
          >
            Explore other games
          </Link>
          <Link
            href="/leaderboard/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-cream-dim hover:text-cream hover:bg-white/[0.04] border border-white/[0.08] transition-colors"
          >
            See the leaderboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
