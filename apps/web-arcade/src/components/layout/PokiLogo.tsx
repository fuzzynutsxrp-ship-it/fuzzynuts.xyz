"use client";

import { motion } from "framer-motion";

/**
 * Poki-style wordmark logo: "fuzzynuts" in lowercase where the first "u"
 * has two dot-eyes (like Poki's "o"), making it a playful character face.
 * As a dark tile — rounded on left only so it's flush with search tile.
 */
export function PokiLogo() {
  return (
    <motion.a
      href="/"
      className="poki-logo flex items-center shrink-0 group"
      aria-label="FuzzyNuts Home"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Dark tile — rounded-left only for flush fit with adjacent tiles */}
      <div className="relative flex items-center justify-center bg-[#1a1030] hover:bg-[#241846] border border-white/10 border-r-0 rounded-l-2xl px-3.5 py-2 md:px-4 md:py-2.5 transition-colors duration-200">
        {/* Wordmark — uses Outfit (already loaded as --font-display) */}
        <span className="poki-wordmark font-display font-black text-[1.2rem] md:text-[1.35rem] leading-none tracking-tight text-cream group-hover:text-brand-gold transition-colors duration-200 select-none whitespace-nowrap">
          f<span className="poki-eyed-letter">u</span>zzy·nuts
        </span>
      </div>
    </motion.a>
  );
}
