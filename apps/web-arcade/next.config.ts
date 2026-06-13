import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  /**
   * ═══════════════════════════════════════════════════════════════
   *  REWRITES — none.
   *
   *  The React App Router arcade (src/app/page.tsx) is served at the
   *  root route `/`. We previously rewrote `/` → `/index.html` to serve
   *  a static placeholder page that only surfaced ~8 games; that page
   *  (public/index.html) and its third-party games.json have since been
   *  deleted. If you ever need them back, they're in git history.
   * ═══════════════════════════════════════════════════════════════
   */
  async rewrites() {
    return [];
  },

  /* ─────────────────────────────────────────────────────────────
     headers() — long-cache video + fallback image used by the
     hero. The hero MP4 is content-hashed by filename (we ship one
     stable `hero-background.mp4`), so a year-long cache + immutable
     is safe; bust by renaming when a new cut is delivered.

     We can't ship custom headers from a static export, so this
     applies only to runtime / serverless deployments (Vercel).
     ───────────────────────────────────────────────────────────── */
  async headers() {
    return [
      /* ── Minigolf: Cross-Origin Isolation for SharedArrayBuffer / WASM ──
         The minigolf game uses WebAssembly threads which require
         SharedArrayBuffer. Browsers gate SAB behind cross-origin
         isolation: the page must serve COOP + COEP headers.

         We scope these narrowly to /games/minigolf/* so other routes
         (and third-party embeds) are unaffected.

         COEP: credentialless is more permissive than require-corp — it
         allows cross-origin subresources (Google Fonts, CDN assets)
         without requiring them to send CORP/CORS headers, as long as
         no credentials are attached. Same-origin resources are
         unaffected.
         ───────────────────────────────────────────────────────────── */
      {
        source: "/games/minigolf/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
      {
        source: "/videos/:path*.mp4",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/videos/:path*.webm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/hero-fallback.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
