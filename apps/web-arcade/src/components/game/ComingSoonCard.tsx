"use client";

import { Lock } from "lucide-react";

interface ComingSoonCardProps {
  title: string;
  genre: string;
}

export function ComingSoonCard({ title, genre }: ComingSoonCardProps) {
  return (
    <div className="relative flex flex-col aspect-square w-full rounded-2xl overflow-hidden bg-[#0f0a00]/60 border border-white/[0.04] shadow-[0_7px_10px_4px_rgba(93,107,132,0.15)] cursor-default select-none">
      {/* Thumbnail — flexes to fill remaining space above title bar */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-[#0a0613]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Lock icon center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Lock size={18} className="text-white/20" />
          </div>
          <span className="text-[var(--fluid-label)] font-bold uppercase tracking-widest text-white/15">
            Soon
          </span>
        </div>
      </div>

      {/* Title + genre */}
      <div className="px-[var(--fluid-card-pad)] py-[var(--fluid-card-pad)]">
        <h3 className="font-display text-[var(--fluid-card-h)] font-bold text-white/25 truncate">
          {title}
        </h3>
        <p className="text-[var(--fluid-card-p)] text-white/10 mt-0.5">{genre}</p>
      </div>
    </div>
  );
}
