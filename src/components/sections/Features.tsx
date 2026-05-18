"use client";

import { motion } from "framer-motion";
import { FEATURES } from "@/lib/utils";
import Image from "next/image";
import { CyberCard } from "@/components/ui/CyberCard";

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* ── Features Section Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/sections/features-bg.jpg"
          alt=""
          fill
          quality={72}
          className="object-cover object-center hidden sm:block"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
        <Image
          src="/images/sections/features-bg-mobile.jpg"
          alt=""
          fill
          quality={68}
          className="object-cover object-center sm:hidden"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
      </div>

      {/* ── Combined Overlay (merged 4 layers → 1) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: [
            "linear-gradient(to bottom, rgba(1,5,8,0.96) 0%, rgba(1,5,8,0.68) 18%, rgba(1,5,8,0.52) 50%, rgba(1,5,8,0.68) 82%, rgba(1,5,8,0.96) 100%)",
            "linear-gradient(to right, rgba(1,5,8,0.6) 0%, transparent 18%, transparent 82%, rgba(1,5,8,0.6) 100%)",
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,0.07) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 40% at 30% 70%, rgba(16,185,129,0.04) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

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
            Not your average meme coin. Every feature is designed for fairness, transparency, and real fun.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -3, transition: { type: "spring", stiffness: 300 } }}
            >
              <CyberCard accentColor="blue" className="p-6 group cursor-default h-full">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center mb-4 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] group-hover:bg-[rgba(59,130,246,0.14)] group-hover:border-[rgba(59,130,246,0.35)] transition-all p-1.5"
                >
                  {feature.featIcon ? (
                    <Image
                      src={feature.featIcon}
                      alt={feature.title}
                      width={40}
                      height={40}
                      loading="lazy"
                      className="w-10 h-10 object-contain image-render-pixel drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-neon-blue/30" />
                  )}
                </motion.div>
                <h3 className="font-display text-lg font-bold text-[var(--color-cream)] mb-2 group-hover:text-neon-blue transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed">
                  {feature.description}
                </p>
              </CyberCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

