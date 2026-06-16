"use client";

import { useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { GAMES } from "@/lib/utils";

interface GameCardProps {
  game: (typeof GAMES)[number];
  onPlay: (gameId: string) => void;
  priority?: boolean;
}

export function GameCard({ game, onPlay, priority = false }: GameCardProps) {
  const [imgSrc, setImgSrc] = useState(`/images/games/${game.id}.png`);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgSrc(game.icon);
      setImgError(true);
    }
  };

  // Static rating for now
  const rating = 4.5;
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <button
      onClick={() => onPlay(game.id)}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-[#0f0a00] border border-brand-gold/10 hover:border-brand-gold/30 hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(251,191,36,0.12),0_4px_15px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all duration-300 ease-out cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:ring-offset-2 focus:ring-offset-[#0a0613]"
      aria-label={`Play ${game.title}`}
    >
      {/* Image wrapper */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0a0613]">
        <Image
          src={imgSrc}
          alt={`${game.title} cover art`}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          onError={handleImageError}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
        />
        {/* Category badge overlay */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-brand-gold border border-brand-gold/20">
          {game.type}
        </span>
      </div>

      {/* Card content — below image, clean whitespace */}
      <div className="flex flex-col gap-1 p-3">
        {/* Title */}
        <h3 className="font-display text-sm font-bold text-cream truncate">{game.title}</h3>

        {/* Star rating */}
        <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={
                i < fullStars
                  ? "text-brand-gold fill-brand-gold"
                  : i === fullStars && hasHalf
                    ? "text-brand-gold fill-brand-gold/50"
                    : "text-brand-gold/20"
              }
            />
          ))}
          <span className="text-[10px] text-[var(--color-cream-dim)] ml-0.5">{rating}</span>
        </div>
      </div>
    </button>
  );
}
