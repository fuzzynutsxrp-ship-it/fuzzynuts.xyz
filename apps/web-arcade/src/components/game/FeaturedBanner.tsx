"use client";

import Image from "next/image";

interface FeaturedBannerProps {
  onPlay: (gameId: string) => void;
}

export function FeaturedBanner({ onPlay }: FeaturedBannerProps) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f1a0f] via-[#0a0613] to-[#0a1a0f] border border-neon-green/15">
      {/* Background image with overlay */}
      <div className="relative h-48 sm:h-56 md:h-64">
        <Image
          src="/images/games/fuzzynuts-world.png"
          alt="Fuzzynuts World"
          fill
          priority
          className="object-cover opacity-40"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0613]/95 via-[#0a0613]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0613] via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 md:p-8">
        <div className="max-w-lg">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neon-green/15 text-neon-green border border-neon-green/20 mb-3">
            Featured Game
          </span>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-cream mb-2">
            Fuzzynuts World
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-cream-dim)] mb-4 max-w-md leading-relaxed">
            Explore a massive open world, complete quests, craft items, and compete with players
            worldwide.
          </p>
          <button
            onClick={() => onPlay("fuzzynuts-world")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-[#0a0613] font-display font-black text-sm hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Play Now
          </button>
        </div>
      </div>
    </div>
  );
}
