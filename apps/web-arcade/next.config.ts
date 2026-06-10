import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  /**
   * ═══════════════════════════════════════════════════════════════
   *  REWRITES — Serve the static HTML arcade at the root route.
   *
   *  The Poki-parity arcade lives at public/index.html as a fully
   *  self-contained static build (HTML + CSS + JS + images + data).
   *  Next.js App Router's page.tsx would normally shadow this file,
   *  so we rewrite `/` → `/index.html` to bypass the React shell.
   *
   *  The legacy React dashboard is preserved at /legacy/.
   *  All other App Router routes (/leaderboard, /admin/*, etc.)
   *  continue to work normally.
   * ═══════════════════════════════════════════════════════════════
   */
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/index.html",
      },
      {
        source: "/index",
        destination: "/index.html",
      },
    ];
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
