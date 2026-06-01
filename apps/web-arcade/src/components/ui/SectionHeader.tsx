"use client";

import { motion } from "framer-motion";

/**
 * Canonical section header — every page section uses this so chip + h2 + subcopy
 * styling can never drift apart. Change the classes here and every header updates.
 *
 * Usage:
 *   <SectionHeader chip="🐿️ Zero to degen" title="How to Get $NUT" subcopy="4 steps. ..." />
 */
export function SectionHeader({
  chip,
  title,
  subcopy,
  className = "",
}: {
  chip: string;
  title: string;
  subcopy: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      className={`text-center mb-12 md:mb-16 ${className}`}
    >
      <span className="neon-chip text-degen-crisp mb-4 animate-glitch-skew">
        {chip}
      </span>
      <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
        {title}
      </h2>
      <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto leading-relaxed">
        {subcopy}
      </p>
    </motion.div>
  );
}
