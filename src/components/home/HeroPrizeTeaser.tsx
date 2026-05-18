"use client";

import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   HeroPrizeTeaser v3 — Refined for visual weight + restraint

   Changes from v2:
   - Wider max-width (2xl) for better hero integration
   - Removed floating animation (was competing with hero float)
   - Removed sparkle particles (too busy with hero background)
   - Kept shimmer + border spin but slower, subtler
   - Larger prize text remains the focal point
   - Cleaner, more confident design language
   ───────────────────────────────────────────────────────────── */
export function HeroPrizeTeaser() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.6, ease: "easeOut" }}
      className="mt-10 w-full flex justify-center px-4"
    >
      <motion.a
        href="#prizes"
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="hero-prize-teaser-v3 relative flex items-center gap-3 sm:gap-5 md:gap-6 px-4 py-3 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-2xl cursor-pointer group overflow-hidden max-w-2xl w-full"
        aria-label="View weekly prizes — Win up to 250,000 $NUT"
      >
        {/* ── Subtle border accent ── */}
        <div className="hero-prize-border-v3" />

        {/* ── Shimmer sweep (slower, calmer) ── */}
        <div className="hero-prize-shimmer-v3" />

        {/* ── Content ── */}
        <div className="relative z-10 flex items-center gap-3 sm:gap-5 md:gap-6 w-full">
          {/* Trophy icon */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,196,66,0.08) 100%)",
                boxShadow: "0 0 16px rgba(251,191,36,0.1)",
              }}
            >
              <Trophy
                size={20}
                className="text-[var(--color-gold)] sm:[&]:w-6 sm:[&]:h-6"
                strokeWidth={2.5}
              />
            </div>
          </div>

          {/* Prize copy */}
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em] text-[var(--color-gold)] opacity-80 mb-0.5">
              Weekly Prize Pool
            </span>
            <p className="font-display font-black leading-none">
              <span className="text-xs sm:text-sm md:text-base text-[var(--color-cream)]">
                Win up to{" "}
              </span>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl gradient-text-gold">
                250K $NUT
              </span>
            </p>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-[var(--color-gold)] opacity-40 group-hover:opacity-90 transition-opacity flex-shrink-0 hidden sm:flex items-center"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </motion.div>
        </div>
      </motion.a>
    </motion.div>
  );
}
