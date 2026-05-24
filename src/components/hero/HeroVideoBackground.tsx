"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { HERO_CONFIG } from "@/lib/config/heroConfig";

/* ─────────────────────────────────────────────────────────────
   HeroVideoBackground — Pre-rendered video as the hero's base
   layer. Replaces the procedural CyberForest/FuzzyWorld stack.

   • Autoplay, loop, muted, playsInline — required for mobile
     autoplay across iOS/Android.
   • preload="metadata" — defer the heavy bytes until the user
     is on the page; we still get dimensions for the layout.
   • If the <video> element errors (codec missing, asset 404),
     we fall back to the WebP still configured in HERO_CONFIG.
   • A radial gradient backdrop renders behind the video so the
     first paint is never bare black.
   • A soft vignette overlay keeps HUD text readable on top.
   ───────────────────────────────────────────────────────────── */

export function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleLoaded = () => setLoaded(true);
    const handleError = () => setFailed(true);

    v.addEventListener("loadeddata", handleLoaded);
    v.addEventListener("error", handleError);

    // Some browsers (Safari) fire `loadeddata` before the listener
    // is attached on fast networks — check current state.
    if (v.readyState >= 2) setLoaded(true);

    return () => {
      v.removeEventListener("loadeddata", handleLoaded);
      v.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden bg-[var(--color-forest-dark)]"
      aria-hidden="true"
    >
      {/* Loading backdrop — visible until first frame paints, then fades */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{
          opacity: loaded ? 0 : 1,
          transition: "opacity 500ms ease",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 60%), linear-gradient(to bottom, #03110a 0%, #010508 100%)",
        }}
      />

      {failed ? (
        <Image
          src={HERO_CONFIG.video.fallback}
          alt=""
          fill
          priority
          quality={75}
          className="bg-video-cover"
          sizes="100vw"
        />
      ) : (
        <video
          ref={videoRef}
          src={HERO_CONFIG.video.src}
          autoPlay={HERO_CONFIG.video.autoplay}
          loop={HERO_CONFIG.video.loop}
          muted={HERO_CONFIG.video.muted}
          playsInline
          preload="metadata"
          poster={HERO_CONFIG.video.fallback}
          className="absolute inset-0 w-full h-full bg-video-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity 600ms ease",
          }}
        />
      )}

      {/* Vignette so HTML overlays stay legible across any frame */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "linear-gradient(to bottom, rgba(1,5,8,0.55) 0%, rgba(1,5,8,0.10) 30%, rgba(1,5,8,0.10) 65%, rgba(1,5,8,0.85) 100%)",
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,0,0,0) 0%, rgba(1,5,8,0.35) 100%)",
          ].join(", "),
        }}
      />
    </div>
  );
}

export default HeroVideoBackground;
