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
   *  The React App Router arcade (src/app/page.tsx) is now served at
   *  the root route `/`. We previously rewrote `/` → `/index.html` to
   *  serve a static placeholder page; that bypassed the React arcade
   *  and only surfaced ~8 games, so it has been removed.
   *
   *  The old static page still exists at public/index.html for
   *  reference but is no longer routed (slated for deletion).
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
