"use client";

import { useState } from "react";
import Image from "next/image";
import { GAMES } from "@/lib/utils";

interface PokiGameCardProps {
  game: (typeof GAMES)[number];
  onPlay: (gameId: string) => void;
  priority?: boolean;
}

export function PokiGameCard({ game, onPlay, priority = false }: PokiGameCardProps) {
  const [imgSrc, setImgSrc] = useState(`/images/games/${game.id}.png`);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgSrc(game.icon);
      setImgError(true);
    }
  };

  return (
    <button
      onClick={() => onPlay(game.id)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#0f0a00] border border-white/5 hover:border-brand-gold/20 transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:ring-offset-2 focus:ring-offset-[#0a0613]"
      aria-label={`Play ${game.title}`}
    >
      {/* Image wrapper — 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0a0613]">
        <Image
          src={imgSrc}
          alt={`${game.title} cover art`}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onError={handleImageError}
          className="object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:brightness-[0.4]"
        />

        {/* Hover overlay — fades in play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-gold text-[#0a0613] font-display font-black text-sm shadow-[0_0_30px_rgba(251,191,36,0.4)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </div>
        </div>

        {/* Category tag */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-brand-gold border border-brand-gold/20 z-20">
          {game.type}
        </span>
      </div>

      {/* Card footer — title only */}
      <div className="px-3 py-2.5">
        <h3 className="font-display text-sm font-bold text-cream truncate">
          {game.title}
        </h3>
      </div>
    </button>
  );
}
