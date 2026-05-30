"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { GAMES } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   GamesShowcase — DEGEN OVERHAUL (v3 — clear plastic shells)

   The 6 game card backgrounds are now semi-transparent dark
   purple/black (rgba 10,6,19 @ 0.75) with backdrop-blur so the
   bg-degen-mesh section background shines through — like looking
   inside a clear N64 controller / transparent iMac G3 shell.

   A subtle glossy plastic sheen (linear-gradient 135deg) and
   inner edge highlights sell the "see-through plastic" depth
   without bringing back the old soft glassmorphic style.

   Everything else is sacred and untouched:
     • Thick 2px border-hot-pink + neon-ring-pink glow
     • Sharp rounded-2xl corners
     • gold→hot-pink gradient PLAY button
     • Per-game accent preserved on marquee + CRT bezel
     • CRT scanlines, vignette, all game data
   ───────────────────────────────────────────────────────────── */

// DEGEN OVERHAUL START — clear N64 transparent plastic shell
// Semi-translucent dark purple/black so bg-degen-mesh shines through.
// backdrop-blur sells the "looking through plastic" depth.
// neon-ring-pink + border-hot-pink = colored plastic edge trim.
const CARD_CLASSES =
  "arcade-card group relative flex flex-col rounded-2xl " +
  "border-2 border-hot-pink neon-ring-pink " +
  "bg-[rgba(10,6,19,0.65)] backdrop-blur-[8px] " +
  "transition-all duration-300 ease-out " +
  "hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(255,46,136,0.5)] " +
  "focus-within:scale-[1.03] focus-within:shadow-[0_0_48px_rgba(255,46,136,0.5)]";
// DEGEN OVERHAUL END

// DEGEN OVERHAUL START — PLAY button: gold→hot-pink gradient (matches Hero CTAs)
const PLAY_BTN_BASE =
  "relative inline-flex items-center justify-center gap-2 w-full px-5 py-3 " +
  "rounded-xl font-display font-black text-sm tracking-widest uppercase select-none " +
  "transition-all duration-200 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-degen-950";
// DEGEN OVERHAUL END

function ArcadeCabinet({
  game,
  index,
}: {
  game: (typeof GAMES)[number];
  index: number;
}) {
  const isComingSoon = game.id === "top-secret";

  // Graceful fallback: try new /images/games/<id>.png cabinet art,
  // fall back to the existing /icons/icon-*-pop.webp on error.
  const [artSrc, setArtSrc] = useState(`/images/games/${game.id}.png`);
  const handleArtError = () => {
    if (artSrc !== game.icon) setArtSrc(game.icon);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: "easeOut" }}
      style={{ "--accent": game.color } as React.CSSProperties}
      className={CARD_CLASSES}
      aria-label={`${game.title} — ${game.type}`}
    >
      {/* ── Inner panel (marquee + screen + control deck) ── */}
      {/* DEGEN OVERHAUL START — clear plastic inner panel
          Semi-transparent so the mesh background bleeds through.
          Glossy plastic sheen overlay adds the N64 controller shine. */}
      <div className="relative rounded-xl overflow-hidden flex flex-col flex-1 bg-[rgba(8,8,10,0.45)]">
        {/* Glossy plastic highlight — strong N64 controller sheen */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-xl pointer-events-none z-30"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 25%, transparent 50%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.08) 100%)",
          }}
        />
        {/* Inner glow — subtle light edge to sell the plastic depth */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-xl pointer-events-none z-30"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)",
          }}
        />
        {/* DEGEN OVERHAUL END */}

        {/* ── MARQUEE — backlit header carrying the game name ── */}
        {/* DEGEN OVERHAUL START — accent line uses per-game color,
            thicker 2px bottom border for raw neon energy */}
        <div
          className="relative flex items-center justify-center px-8 py-2.5 text-center overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${game.color}33 0%, ${game.color}12 60%, transparent 100%)`,
            borderBottom: `2px solid ${game.color}88`,
          }}
        >
          {/* DEGEN OVERHAUL END */}
          {/* Speaker-grille dots flanking the marquee */}
          <span
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-7 opacity-50"
            style={{
              backgroundImage: `radial-gradient(${game.color}aa 0.9px, transparent 1.3px)`,
              backgroundSize: "4px 4px",
            }}
          />
          <span
            aria-hidden="true"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-7 opacity-50"
            style={{
              backgroundImage: `radial-gradient(${game.color}aa 0.9px, transparent 1.3px)`,
              backgroundSize: "4px 4px",
            }}
          />
          <div className="motion-safe:group-hover:animate-neon-flicker">
            <h3
              className="font-display text-base sm:text-lg font-black uppercase tracking-wide leading-none text-[var(--color-cream)]"
              style={{ textShadow: `0 0 12px ${game.color}aa` }}
            >
              {game.title}
            </h3>
            <span
              className="block mt-1 font-mono text-[9px] tracking-[0.28em] uppercase"
              style={{ color: `${game.color}dd` }}
            >
              {game.type}
            </span>
          </div>
        </div>

        {/* ── Screen — CRT inside a bezel ── */}
        <div className="relative px-3 pt-3 pb-1">
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-lg"
            style={{
              background:
                "radial-gradient(ellipse at top, #1a1a1c, #050507 80%)",
              // DEGEN OVERHAUL START — thicker 2px accent bezel (was 3px inner + 4px accent)
              boxShadow: `inset 0 0 0 2px #0a0a0c, inset 0 0 0 4px ${game.color}44, inset 0 8px 22px rgba(0,0,0,0.85), inset 0 0 40px ${game.color}12`,
              // DEGEN OVERHAUL END
            }}
          >
            {/* Ambient accent glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 55%, ${game.color}26, transparent 70%)`,
              }}
            />

            {/* Cabinet art with onError → existing icon fallback */}
            <Image
              src={artSrc}
              alt={`${game.title} — cabinet art`}
              fill
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
              loading="lazy"
              onError={handleArtError}
              className="object-contain p-4 sm:p-5 drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] transition-transform duration-500 ease-out group-hover:scale-[1.07]"
            />

            {/* CRT scanlines */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20 md:opacity-30 pointer-events-none z-10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.20) 0 1px, transparent 1px 3px)",
              }}
            />

            {/* Vignette — fakes the CRT's curved-glass darkening at the edges */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          </div>
        </div>

        {/* ── Control deck ── */}
        {/* DEGEN OVERHAUL START — semi-transparent dark gradient for plastic shell continuity */}
        <div
          className="relative flex flex-col flex-1 px-5 pt-4 pb-5 gap-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,16,19,0.55) 0%, rgba(10,10,12,0.50) 55%, rgba(5,5,6,0.45) 100%)",
          }}
        >
          {/* DEGEN OVERHAUL END */}

          {/* Deck lip — the physical break between screen and control panel */}
          {/* DEGEN OVERHAUL START — thicker 2px accent line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${game.color}88, transparent)`,
            }}
          />
          {/* DEGEN OVERHAUL END */}

          {/* Description */}
          <p className="font-body text-sm leading-relaxed text-[var(--color-cream-dim)] line-clamp-2">
            {game.description}
          </p>

          {/* Tag pills */}
          {/* DEGEN OVERHAUL START — tags use per-game accent with stronger border */}
          <div className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border-2"
                style={{
                  background: `${game.color}0c`,
                  color: `${game.color}dd`,
                  borderColor: `${game.color}44`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          {/* DEGEN OVERHAUL END */}

          <div className="flex-1 min-h-1" />

          {/* Control row — decorative arcade buttons + PLAY */}
          <div className="flex items-center gap-3">
            {/* Two round buttons, like a real control panel */}
            <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), ${game.color})`,
                  boxShadow: `0 2px 3px rgba(0,0,0,0.6), 0 0 8px ${game.color}66`,
                }}
              />
              <span
                aria-hidden="true"
                className="w-4 h-4 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.5), #e2483b)",
                  boxShadow: "0 2px 3px rgba(0,0,0,0.6)",
                }}
              />
            </div>

            {/* DEGEN OVERHAUL START — PLAY button: gold→hot-pink gradient
                Matches Hero "Enter World", Prizes "Bag the Bag", Connect Wallet.
                Sharp rounded-xl corners, strong hover bloom, neon-ring-pink glow. */}
            <motion.a
              href={isComingSoon ? undefined : game.href}
              onClick={(e) => {
                if (!isComingSoon && game.href !== "#") {
                  e.preventDefault();
                  window.location.href = game.href;
                }
              }}
              whileHover={
                isComingSoon
                  ? undefined
                  : {
                      scale: 1.04,
                      boxShadow: "0 0 38px rgba(255,46,136,0.6)",
                    }
              }
              whileTap={isComingSoon ? undefined : { scale: 0.96, y: 2 }}
              tabIndex={isComingSoon ? -1 : 0}
              role="button"
              aria-label={
                isComingSoon
                  ? `${game.title} — Coming Soon`
                  : `Play ${game.title}`
              }
              aria-disabled={isComingSoon}
              className={`${PLAY_BTN_BASE} flex-1 ${
                isComingSoon
                  ? "cursor-not-allowed text-[#666]"
                  : "cursor-pointer text-[var(--color-degen-black)]"
              }`}
              style={{
                background: isComingSoon
                  ? "linear-gradient(180deg, #26262a 0%, #131316 100%)"
                  : "linear-gradient(135deg, var(--color-gold) 0%, var(--color-hot-pink) 100%)",
                boxShadow: isComingSoon
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 #0a0a0c, 0 6px 10px rgba(0,0,0,0.5)"
                  : "0 8px 30px rgba(255,46,136,0.35)",
                pointerEvents:
                  isComingSoon && game.href === "#" ? "none" : "auto",
              }}
            >
              {isComingSoon ? "🔒 Coming Soon" : "▶ PLAY"}
            </motion.a>
            {/* DEGEN OVERHAUL END */}
          </div>

          {/* Coin-slot caption */}
          <p
            className="text-center font-mono text-[9px] tracking-[0.3em] uppercase opacity-55"
            style={{ color: `${game.color}cc` }}
          >
            {isComingSoon ? "Coming soon" : "Insert coin · free to play"}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export function GamesShowcase() {
  return (
    <section id="games" className="py-12 relative overflow-hidden">
      {/* ── DEGEN OVERHAUL START — Retro Arcade Room Background ──
          Deep moody atmosphere with vintage game posters, CRT scanlines,
          vignette, and film grain. The transparent N64 plastic cards sit
          on top like you're looking through clear controller shells into
          a dimly-lit 90s arcade. */}

      {/* Layer 1: Deep dark arcade room base */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 30%, rgba(45,27,78,0.4) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(255,46,136,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(124,58,237,0.1) 0%, transparent 60%),
            linear-gradient(180deg, #050309 0%, #0a0613 40%, #120a22 100%)
          `,
        }}
      />

      {/* Layer 2: Retro game posters — faded arcade wall art */}
      {/* Poster 1: Fuzzynuts World — Zelda-style adventure (top-left) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none"
        style={{
          top: "8%", left: "2%", width: "220px", height: "300px",
          transform: "rotate(-6deg)",
          background: "linear-gradient(160deg, #1a0f2e 0%, #0d0820 40%, #2d1b4e 100%)",
          border: "2px solid rgba(251,191,36,0.2)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(251,191,36,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.35,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#FBBF24] mb-2 opacity-60">Nintendo 64 · RPG Adventure</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#FBBF24", textShadow: "0 0 20px rgba(251,191,36,0.5)" }}>
            FUZZYNUTS<br/>WORLD
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Explore the Kingdom · Collect $NUT · Defeat the Boss</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)", border: "1px solid rgba(251,191,36,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#FBBF24] opacity-50">★ LEGENDARY ★</div>
        </div>
      </div>

      {/* Poster 2: Super FuzzyNuts — Mario-style platformer (top-center-right) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none"
        style={{
          top: "5%", right: "8%", width: "200px", height: "280px",
          transform: "rotate(4deg)",
          background: "linear-gradient(160deg, #1a2e0f 0%, #0d2008 40%, #1b4e2d 100%)",
          border: "2px solid rgba(74,222,128,0.25)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(74,222,128,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.3,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#4ade80] mb-2 opacity-60">Platformer · 2D Action</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#4ade80", textShadow: "0 0 20px rgba(74,222,128,0.5)" }}>
            SUPER<br/>FUZZYNUTS
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Jump · Run · Collect Nuts · Save the Forest</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.3) 0%, transparent 70%)", border: "1px solid rgba(74,222,128,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#4ade80] opacity-50">★ POWER UP ★</div>
        </div>
      </div>

      {/* Poster 3: Fuzzy Survivors — action/shooter (bottom-left) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none"
        style={{
          bottom: "12%", left: "5%", width: "210px", height: "290px",
          transform: "rotate(3deg)",
          background: "linear-gradient(160deg, #2e0f0f 0%, #200808 40%, #4e1b1b 100%)",
          border: "2px solid rgba(239,68,68,0.25)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(239,68,68,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.3,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#ef4444] mb-2 opacity-60">Action · Survival Shooter</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.5)" }}>
            FUZZY<br/>SURVIVORS
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Survive the Horde · Loot the Nuts · Last One Standing</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)", border: "1px solid rgba(239,68,68,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#ef4444] opacity-50">★ SURVIVE ★</div>
        </div>
      </div>

      {/* Poster 4: Nut Racer — classic racing (bottom-center-right) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none"
        style={{
          bottom: "8%", right: "3%", width: "195px", height: "270px",
          transform: "rotate(-5deg)",
          background: "linear-gradient(160deg, #0f2e2e 0%, #082020 40%, #1b4e4e 100%)",
          border: "2px solid rgba(34,211,238,0.25)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(34,211,238,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.28,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#22d3ee] mb-2 opacity-60">Racing · Arcade Speed</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>
            NUT<br/>RACER
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Burn Rubber · Drift Corners · First to the Finish</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)", border: "1px solid rgba(34,211,238,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#22d3ee] opacity-50">★ TURBO ★</div>
        </div>
      </div>

      {/* Poster 5: Fuzzy Putt — retro mini-golf (mid-right, partially behind cards) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none hidden lg:block"
        style={{
          top: "45%", right: "-2%", width: "180px", height: "250px",
          transform: "rotate(7deg)",
          background: "linear-gradient(160deg, #2e1a0f 0%, #201208 40%, #4e2d1b 100%)",
          border: "2px solid rgba(249,115,22,0.25)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(249,115,22,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.25,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#f97316] mb-2 opacity-60">Sports · Mini Golf</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#f97316", textShadow: "0 0 20px rgba(249,115,22,0.5)" }}>
            FUZZY<br/>PUTT
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Putt the Nut · Sink the Hole · Ace the Course</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)", border: "1px solid rgba(249,115,22,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#f97316] opacity-50">★ HOLE IN ONE ★</div>
        </div>
      </div>

      {/* Poster 6: Top Secret — mysterious classified teaser (mid-left) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none z-[1] select-none hidden lg:block"
        style={{
          top: "50%", left: "-1%", width: "175px", height: "245px",
          transform: "rotate(-3deg)",
          background: "linear-gradient(160deg, #1a1a2e 0%, #0d0d20 40%, #2d2d4e 100%)",
          border: "2px solid rgba(168,85,247,0.25)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(168,85,247,0.08), inset 0 0 60px rgba(0,0,0,0.6)",
          opacity: 0.22,
        }}
      >
        <div className="p-4 text-center">
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase text-[#a855f7] mb-2 opacity-60">??? · CLASSIFIED</div>
          <div className="font-display text-2xl font-black uppercase leading-tight" style={{ color: "#a855f7", textShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
            TOP<br/>SECRET
          </div>
          <div className="mt-3 font-mono text-[7px] tracking-[0.2em] uppercase text-[#b0a890]">Clearance Level: NUT · Contents Unknown · Coming Soon</div>
          <div className="mt-4 mx-auto w-16 h-16 rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)", border: "1px solid rgba(168,85,247,0.15)" }} />
          <div className="mt-2 font-display text-xs font-bold text-[#a855f7] opacity-50">🔒 CLASSIFIED 🔒</div>
        </div>
      </div>

      {/* Layer 3: Animated degen mesh — the purple/pink/cyan glow that moves */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[2] bg-degen-mesh opacity-50"
      />

      {/* Layer 4: CRT scanlines over everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[3] opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* Layer 5: Deep vignette — darkens edges like a CRT / arcade room */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[3]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, transparent 40%, rgba(5,3,9,0.7) 100%)",
        }}
      />

      {/* Layer 6: Film grain noise (desktop only for perf) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[3] opacity-[0.03] hidden sm:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── DEGEN OVERHAUL END — Retro Arcade Room Background ── */}

      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-16"
        >
          {/* DEGEN OVERHAUL START — neon badge + edgier copy */}
          <span className="neon-chip mb-4 animate-glitch-skew">🎰 Pick your poison</span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            The Arcade
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Five cabinets live, one locked in the vault — real $NUT on the line
            every single week. Slam a coin, top the board, bag the bag. No house,
            no croupier, just you vs. the leaderboard.
          </p>
          {/* DEGEN OVERHAUL END */}
        </motion.div>

        {/* 3×2 grid — shared perspective so hover tilts feel coordinated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 [perspective:1400px]">
          {GAMES.map((game, i) => (
            <ArcadeCabinet key={game.id} game={game} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
