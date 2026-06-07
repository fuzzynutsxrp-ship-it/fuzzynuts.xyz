"use client";

import { motion } from "framer-motion";
import { Users, MessageCircle, Trophy, Gamepad2, ExternalLink } from "lucide-react";

/**
 * Community section — replaces the old "How to Get $NUT" crypto onboarding flow.
 * Focuses on Discord, leaderboards, and the gaming community.
 */

const COMMUNITY_LINKS = [
  {
    icon: MessageCircle,
    title: "Discord Community",
    desc: "Chat with players, share strategies, and get notified about new games and events.",
    href: "https://discord.gg/fuzzynuts",
    color: "#5865F2",
    cta: "Join Discord",
  },
  {
    icon: Trophy,
    title: "Weekly Leaderboards",
    desc: "Compete in weekly score challenges across all games. Climb the ranks and prove your skill.",
    href: "/leaderboard/",
    color: "#FBBF24",
    cta: "View Leaderboard",
  },
  {
    icon: Gamepad2,
    title: "New Games Monthly",
    desc: "Fresh arcade games added regularly. Each one is free, browser-based, and ready to play instantly.",
    href: "/#games",
    color: "#10B981",
    cta: "Browse Games",
  },
];

export function Community() {
  return (
    <section id="community" className="py-16 md:py-20 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(88,101,242,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="container-main relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="neon-chip text-degen-crisp mb-4 animate-glitch-skew">
            🐿️ Join the Community
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
            More Than Just Games
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto leading-relaxed">
            Compete, connect, and climb. FuzzyNuts is a gaming community where
            skill is the only currency that matters.
          </p>
        </motion.div>

        {/* Community cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          {COMMUNITY_LINKS.map((link, i) => (
            <motion.a
              key={link.title}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="flex flex-col items-center text-center p-6 rounded-xl group"
              style={{
                background: "#0a0613",
                border: `1.5px solid color-mix(in srgb, ${link.color} 30%, transparent)`,
                boxShadow: `0 0 10px color-mix(in srgb, ${link.color} 10%, transparent), inset 0 0 12px rgba(124,58,237,0.06)`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: `color-mix(in srgb, ${link.color} 15%, transparent)`,
                }}
              >
                <link.icon size={22} style={{ color: link.color }} strokeWidth={2} />
              </div>
              <h3
                className="font-display font-bold text-base mb-2 group-hover:opacity-100 transition-opacity"
                style={{ color: link.color }}
              >
                {link.title}
              </h3>
              <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed mb-4 flex-1">
                {link.desc}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: link.color }}>
                {link.cta}
                <ExternalLink size={11} />
              </span>
            </motion.a>
          ))}
        </div>

        {/* Web3 integration note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <p className="text-xs text-[var(--color-cream-dim)] opacity-40 max-w-lg mx-auto leading-relaxed">
            🦊 Web3 integrations: Connect your XRPL wallet to unlock exclusive
            on-chain rewards and token-gated features.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
