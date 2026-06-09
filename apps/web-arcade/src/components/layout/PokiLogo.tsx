"use client";

import { motion } from "framer-motion";

/**
 * Poki-style wordmark logo: "fuzzynuts" in lowercase where the first "u"
 * has two dot-eyes (like Poki's "o"), making it a playful character face.
 * Wrapped in a rounded dark badge.
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
      {/* Badge — dark rounded pill like Poki's teal circle */}
      <div className="relative flex items-center justify-center rounded-2xl bg-[#1a1030] border border-white/10 px-3.5 py-1.5 md:px-4 md:py-2 group-hover:border-brand-gold/30 transition-all duration-200">
        {/* Wordmark — uses Outfit (already loaded as --font-display) */}
        <span className="poki-wordmark font-display font-black text-[1.4rem] md:text-[1.55rem] leading-none tracking-tight text-cream group-hover:text-brand-gold transition-colors duration-200 select-none">
          f<span className="poki-eyed-letter">u</span>zzy·nuts
        </span>

        {/* Subtle glow on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-gold/5 pointer-events-none" />
      </div>
    </motion.a>
  );
}
