"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import Image from "next/image";
import { STATIONS, type StationId } from "./ScrollContext";

/* ─────────────────────────────────────────────────────────────
   WorldHUD — Sparse 2D chrome layered on top of the 3D canvas.

   What we keep:
   • Opening hero plate: logo + "Fuzzynuts ($NUT)" + tagline +
     scroll cue. Fades out as the user leaves the hero station.
   • Right-edge station progress dots. Clicking a dot scrolls
     smoothly to that station.

   What we don't keep (intentional):
   • Wallet connect button — already lives in <Navbar/>, which
     stays mounted at z-50.
   • Game cards, prizes, tokenomics — all converted to 3D in
     the canvas.
   ───────────────────────────────────────────────────────────── */

interface WorldHUDProps {
  isMobile: boolean;
}

export function WorldHUD({ isMobile }: WorldHUDProps) {
  // Local scroll state for fading hero plate + station progress dots.
  // Cheap: only updates on scroll, but throttled to rAF.
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? window.scrollY / max : 0;
      setOffset(next);
      raf = 0;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Hero plate is fully opaque at top, gone by 12% scroll.
  const heroOpacity = Math.max(0, 1 - offset / 0.12);

  const scrollToStation = (id: StationId) => {
    const station = STATIONS.find((s) => s.id === id);
    if (!station) return;
    const target =
      station.from *
      (document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  const stationLabels: Record<StationId, string> = {
    hero: "Welcome",
    games: "Games",
    vault: "Vault",
    leaderboard: "Top 5",
    moon: "$NUT",
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          OPENING HERO PLATE — fades out as user scrolls down.
          ═══════════════════════════════════════════════════════ */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col items-center text-center"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 5rem)",
          opacity: heroOpacity,
          transform: `translateY(${-offset * 120}px)`,
          transition: "opacity 120ms linear",
        }}
        aria-hidden={heroOpacity < 0.05}
      >
        {/* Soft radial wash so HTML text stays readable over the scene */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 38%, rgba(1,5,8,0.6) 0%, rgba(1,5,8,0.0) 70%)",
          }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.15,
          }}
          className="mb-3"
        >
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="inline-block drop-shadow-[0_0_30px_rgba(245,196,66,0.5)]"
          >
            <Image
              src="/images/branding/logo.webp"
              alt="Fuzzynuts mascot"
              width={160}
              height={107}
              className="w-24 h-auto sm:w-32 md:w-36"
              priority
            />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight"
        >
          <span className="gradient-text-gold text-glow-gold">Fuzzynuts</span>
          <br />
          <span className="text-[var(--color-cream)] text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            ($NUT)
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-2 text-lg sm:text-2xl md:text-3xl font-display font-semibold text-[var(--color-gold)]"
        >
          Play. Earn. Own.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-2 text-sm sm:text-base md:text-lg text-[var(--color-cream)] max-w-2xl px-6 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
        >
          Scroll into the enchanted forest. Hover the glowing portals to play.
        </motion.p>

        <motion.button
          type="button"
          onClick={() => scrollToStation("games")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="pointer-events-auto mt-8 inline-flex flex-col items-center text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors"
          aria-label="Scroll to games"
        >
          <span className="text-[10px] sm:text-xs mb-1.5 tracking-widest uppercase">
            Enter the Forest
          </span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
          >
            <ArrowDown size={20} />
          </motion.span>
        </motion.button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          STATION PROGRESS DOTS — right edge, all stations.
          ═══════════════════════════════════════════════════════ */}
      {!isMobile && (
        <nav
          aria-label="Page sections"
          className="pointer-events-auto fixed right-5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3"
        >
          {STATIONS.map((s) => {
            const active = offset >= s.from && offset <= s.to;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToStation(s.id)}
                aria-label={`Scroll to ${stationLabels[s.id]} section`}
                aria-current={active ? "true" : undefined}
                className="group flex items-center gap-2"
              >
                <span
                  className={`text-[10px] uppercase tracking-widest transition-opacity ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                  } text-[var(--color-gold)]`}
                  style={{ minWidth: 48, textAlign: "right" }}
                >
                  {stationLabels[s.id]}
                </span>
                <span
                  className="block rounded-full transition-all"
                  style={{
                    width: active ? 12 : 8,
                    height: active ? 12 : 8,
                    background: active
                      ? "var(--color-gold)"
                      : "rgba(251,191,36,0.35)",
                    boxShadow: active
                      ? "0 0 14px rgba(251,191,36,0.65)"
                      : "none",
                  }}
                />
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
