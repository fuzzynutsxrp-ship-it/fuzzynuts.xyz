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
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#0f0a00] border border-white/5 hover:border-brand-gold/20 hover:shadow-[0_4px_24px_rgba(251,191,36,0.08)] transition-all duration-200 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:ring-offset-2 focus:ring-offset-[#0a0613]"
      aria-label={`Play ${game.title}`}
    >
      {/* Square thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-[#0a0613]">
        <Image
          src={imgSrc}
          alt={`${game.title} cover art`}
          fill
          sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onError={handleImageError}
          className="object-cover transition-all duration-200 ease-out group-hover:scale-105"
        />

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-gold text-[#0a0613] font-display font-black text-sm shadow-[0_0_24px_rgba(251,191,36,0.35)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </div>
        </div>
      </div>

      {/* Title only — no category tag, no description */}
      <div className="px-2.5 py-2">
        <h3 className="font-display text-xs sm:text-sm font-bold text-cream truncate">
          {game.title}
        </h3>
      </div>
    </button>
  );
}
