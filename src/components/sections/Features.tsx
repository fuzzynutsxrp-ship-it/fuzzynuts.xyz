"use client";

import { motion } from "framer-motion";
import { FEATURES } from "@/lib/utils";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   Features — Holographic Feature Grid

   Replaces uniform CyberCard glass panels with:
   - Icon in a hexagonal clip with soft radial glow
   - No card borders — just subtle background fills
   - Holographic scan-line overlay on hover
   - Staggered entrance with slight rotation
   ───────────────────────────────────────────────────────────── */

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Section background removed — page-level herobackground3.jpg
          shows through. */}
      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-16"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="section-badge mb-4"
          >
            🛡️ Why Fuzzynuts
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            Built Different
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Not your average meme coin. Every feature is designed for fairness,
            transparency, and real fun.
          </p>
        </motion.div>

        {/* Features grid — no CyberCard, no borders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08 }}
              whileHover={{
                y: -3,
                transition: { type: "spring", stiffness: 300 },
              }}
              className="feature-tile group relative p-6 rounded-2xl cursor-default h-full"
            >
              {/* Icon in hexagonal clip */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className="relative w-12 h-12 flex items-center justify-center mb-4"
              >
                {/* Hex clip background */}
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath:
                      "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    background: "rgba(59,130,246,0.08)",
                  }}
                />
                {/* Soft radial glow behind icon */}
                <div
                  className="absolute inset-[-6px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
                  }}
                />
                {feature.featIcon ? (
                  <Image
                    src={feature.featIcon}
                    alt={feature.title}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain relative z-10 image-render-pixel drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-neon-blue/30 relative z-10" />
                )}
              </motion.div>

              <h3 className="font-display text-lg font-bold text-[var(--color-cream)] mb-2 group-hover:text-neon-blue transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed">
                {feature.description}
              </p>

              {/* Scan-line overlay on hover */}
              <div className="feature-tile__scanlines" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
