"use client";

import { Lock } from "lucide-react";

interface ComingSoonCardProps {
  title: string;
  genre: string;
}

export function ComingSoonCard({ title, genre }: ComingSoonCardProps) {
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden bg-[#0f0a00]/60 border border-white/[0.04] cursor-default select-none">
      {/* Square thumbnail — greyed out with lock */}
      <div className="relative aspect-square overflow-hidden bg-[#0a0613]">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }} />

        {/* Lock icon center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Lock size={18} className="text-white/20" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/15">
            Soon
          </span>
        </div>
      </div>

      {/* Title + genre */}
      <div className="px-2.5 py-2">
        <h3 className="font-display text-xs sm:text-sm font-bold text-white/25 truncate">
          {title}
        </h3>
        <p className="text-[10px] text-white/10 mt-0.5">{genre}</p>
      </div>
    </div>
  );
}
