"use client";

import { motion } from "framer-motion";
import { Wallet, Coins, Link, Zap, Copy, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HOW_TO_STEPS, XRPL_CONFIG } from "@/lib/utils";
import { useState, useCallback } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Coins,
  Link,
  Zap,
};

export function HowToGet() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(XRPL_CONFIG.issuer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <section id="how-to-get" className="py-12 relative">
      <div className="container-main relative z-10">
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
            🌰 Get Started
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            How to Get $NUT
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            4 simple steps to join the nuttiest community on XRPL.
          </p>
        </motion.div>

        {/* Steps with neon vine connector */}
        <div className="max-w-2xl mx-auto space-y-8">
          {HOW_TO_STEPS.map((step, i) => {
            const Icon = ICON_MAP[step.icon] || Wallet;

            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-5 items-start group neon-vine-connector"
              >
                {/* Step number — neon gradient circle (Gold → Green) */}
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-lg text-forest-dark"
                  style={{
                    background: `linear-gradient(135deg, #FBBF24 0%, #10B981 100%)`,
                    boxShadow: `0 0 20px rgba(16, 185, 129, 0.25), 0 0 40px rgba(251, 191, 36, 0.10)`,
                  }}
                >
                  {step.step}
                </motion.div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-display font-bold text-lg text-[var(--color-cream)] mb-1 flex items-center gap-2 group-hover:text-neon-green transition-colors">
                    <Icon
                      size={18}
                      className="text-neon-green"
                      strokeWidth={2}
                    />
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed">
                    {step.description}
                  </p>

                  {/* Trustline CTA for step 3 */}
                  {step.step === 3 && (
                    <div className="mt-3 space-y-3">
                      <motion.a
                        href={`https://xpmarket.com/token/NUT-${XRPL_CONFIG.issuer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{
                          scale: 1.05,
                          boxShadow: "0 0 25px rgba(251,191,36,0.4)",
                        }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-primary"
                        style={{
                          animation: "pulse-gold 3s ease-in-out infinite",
                        }}
                      >
                        <Link size={16} />
                        Set Trustline Instantly
                      </motion.a>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--color-cream-dim)]">
                          Or add manually:
                        </span>
                        <motion.button
                          onClick={handleCopy}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(16,185,129,0.08)] font-mono text-[var(--color-cream)] hover:bg-[rgba(16,185,129,0.15)] transition-colors cursor-pointer"
                        >
                          {XRPL_CONFIG.issuer.slice(0, 6)}...
                          {XRPL_CONFIG.issuer.slice(-5)}
                          {copied ? (
                            <Check size={12} className="text-neon-green" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Buy/Earn CTAs for step 4 */}
                  {step.step === 4 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <motion.a
                        href={`https://xpmarket.com/dex/NUT-${XRPL_CONFIG.issuer}/XRP`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-secondary"
                      >
                        Buy on DEX
                      </motion.a>
                      <motion.a
                        href="#games"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-brand-gold)] text-[var(--color-brand-gold)] text-sm font-bold hover:bg-[rgba(251,191,36,0.1)] transition-all"
                      >
                        Play to Earn
                      </motion.a>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
