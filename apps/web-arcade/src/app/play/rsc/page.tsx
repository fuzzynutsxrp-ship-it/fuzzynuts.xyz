/**
 * ═══════════════════════════════════════════════════════════════
 *  /play/rsc — RuneScape Classic (Open-RSC) game page
 *
 *  Embeds the TeaVM browser client directly — no wallet gate.
 *  Players can register in-game. Modeled after rsc.vet.
 * ═══════════════════════════════════════════════════════════════
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Globe, Users } from "lucide-react";
import Link from "next/link";

/** Web client URL — TeaVM RSC client hosted on the game VPS */
const RSC_CLIENT_BASE = "https://game.fuzzynuts.xyz";

/** RSA parameters for the FuzzyNuts Open-RSC server */
const RSA_EXPONENT = "65537";
const RSA_MODULUS =
  "9115015542438186018327044408313987277889783174239809826491015549573028356381739563861028029945657804756198333660503635469704152602063914154601665525357981";

/** Build the web client URL with server connection params */
const CLIENT_URL = `${RSC_CLIENT_BASE}/#members,game.fuzzynuts.xyz,43494,${RSA_EXPONENT},${RSA_MODULUS},true`;

export default function RscPlayPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-dvh bg-degen-950 relative overflow-hidden">
      {/* Background mesh */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 bg-degen-mesh"
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Back to Arcade */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       active:scale-95 transition-all min-h-[44px]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to Arcade
          </Link>
        </motion.div>

        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <span className="neon-chip text-degen-crisp mb-4">
            ⚔️ Browser MMORPG
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-2">
            RuneScape Classic
          </h1>
          <p className="text-cream-dim text-sm max-w-md mx-auto leading-relaxed">
            The original 2001 RuneScape — playable in your browser via
            Open-RSC. No downloads, no Java installs. Click and play.
          </p>
        </motion.div>

        {/* Game Client Container */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border-2 border-hot-pink neon-ring-pink
                     bg-degen-950
                     shadow-[0_0_24px_rgba(255,46,136,0.25),0_8px_40px_rgba(0,0,0,0.5)]
                     overflow-hidden"
        >
          {/* Loading state */}
          {!loaded && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-hot-pink/30 border-t-hot-pink rounded-full animate-spin mx-auto mb-4" />
                <p className="text-neon-green animate-pulse font-display text-sm">
                  Loading RuneScape Classic…
                </p>
              </div>
            </div>
          )}

          {/* iframe */}
          <div
            className="flex justify-center bg-black"
            style={{ display: loaded ? "flex" : "none" }}
          >
            <iframe
              src={CLIENT_URL}
              title="RuneScape Classic — FuzzyNuts"
              width="765"
              height="503"
              className="block border-0 max-w-full"
              style={{ aspectRatio: "765 / 503" }}
              allow="autoplay; fullscreen"
              onLoad={() => setLoaded(true)}
            />
          </div>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6"
        >
          {[
            {
              icon: <Globe size={18} className="text-neon-green" />,
              label: "Browser-Based",
              desc: "No downloads or Java needed",
              borderColor: "border-neon-green/40",
              glow: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
            },
            {
              icon: <Users size={18} className="text-brand-gold" />,
              label: "In-Game Registration",
              desc: "Create your character on first login",
              borderColor: "border-brand-gold/40",
              glow: "shadow-[0_0_20px_rgba(251,191,36,0.12)]",
            },
            {
              icon: <Shield size={18} className="text-hot-pink" />,
              label: "Open-RSC Server",
              desc: "Community-powered classic RS",
              borderColor: "border-hot-pink/40",
              glow: "shadow-[0_0_20px_rgba(255,46,136,0.12)]",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`bg-degen-950 border-2 ${card.borderColor} rounded-xl ${card.glow} p-4 text-center`}
            >
              <div className="flex justify-center mb-2">{card.icon}</div>
              <p className="font-display text-sm font-bold text-cream">
                {card.label}
              </p>
              <p className="text-[11px] text-cream-dim mt-1">{card.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[11px] text-cream-dim/50">
          FuzzyNuts is not affiliated with the original RuneScape Classic nor
          its publisher. Powered by the Open-RSC community project.
        </p>
      </div>
    </div>
  );
}
