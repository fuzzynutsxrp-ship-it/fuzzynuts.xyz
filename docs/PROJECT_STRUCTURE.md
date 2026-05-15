# Fuzzynuts.xyz — Project Structure

> Last updated: 2026-05-14

## Architecture

- **Framework**: Next.js 15 (App Router, `output: "export"`, static site)
- **Styling**: Tailwind CSS v4 + Vanilla CSS design tokens in `globals.css`
- **Animation**: Framer Motion
- **State**: Zustand (wallet store)
- **Deploy**: Vercel (static) + Railway (API backend at `world.fuzzynuts.xyz`)

---

## Directory Layout

```
fuzzynuts-optimized/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout, metadata, fonts, JSON-LD
│   │   ├── page.tsx                # Home page (assembles all sections)
│   │   ├── globals.css             # Design tokens, utilities, animations
│   │   ├── favicon.ico             # Auto-served by Next.js
│   │   ├── games/[slug]/           # Dynamic game routes
│   │   │   ├── page.tsx            # SSG page (generateStaticParams)
│   │   │   └── client.tsx          # Client wrapper for GameWrapper
│   │   └── leaderboard/           
│   │       ├── page.tsx            # Server Component (metadata export)
│   │       └── client.tsx          # Client boundary (ssr: false)
│   │
│   ├── components/
│   │   ├── layout/                 # App shell components
│   │   │   ├── Navbar.tsx          # Top navigation + wallet connection
│   │   │   └── Footer.tsx          # Footer with quick links + social
│   │   ├── sections/               # Homepage sections (one per scroll block)
│   │   │   ├── Hero.tsx            # Hero with video background
│   │   │   ├── GamesShowcase.tsx   # Arcade game cards
│   │   │   ├── Features.tsx        # 6-feature grid with icons
│   │   │   ├── Tokenomics.tsx      # Pie chart + supply breakdown
│   │   │   ├── OnChainVerification.tsx  # Live XRPL data verification
│   │   │   ├── HowToGet.tsx        # Step-by-step $NUT guide
│   │   │   └── Leaderboard.tsx     # Client-side global leaderboard
│   │   ├── game/                   # Game wrapper infrastructure
│   │   │   ├── GameWrapper.tsx     # Iframe sandbox + fullscreen + mute
│   │   │   ├── LoadingOverlay.tsx  # Branded loading animation
│   │   │   └── ErrorBoundary.tsx   # Game error recovery UI
│   │   ├── ui/                     # Reusable design primitives
│   │   │   └── CyberCard.tsx       # Glassmorphism card component
│   │   ├── ClientFallingNuts.tsx   # Dynamic import wrapper (ssr: false)
│   │   └── FallingNuts.tsx         # Canvas particle effect
│   │
│   ├── lib/
│   │   └── utils.ts                # XRPL config, GAMES registry, FEATURES data
│   │
│   └── store/
│       └── wallet.ts               # Zustand wallet connection state
│
├── public/
│   ├── images/
│   │   ├── hero/                   # Hero section backgrounds
│   │   │   ├── hero-bg.jpg         # Desktop (480K)
│   │   │   └── hero-bg-mobile.jpg  # Mobile (112K)
│   │   ├── sections/               # All section backgrounds (desktop + mobile pairs)
│   │   │   ├── games-bg.jpg / games-bg-mobile.jpg
│   │   │   ├── features-bg.jpg / features-bg-mobile.jpg
│   │   │   ├── tokenomics-bg.jpg / tokenomics-bg-mobile.jpg
│   │   │   ├── verify-bg.jpg / verify-bg-mobile.jpg
│   │   │   └── howto-bg.jpg / howto-bg-mobile.jpg
│   │   ├── branding/               # Logo assets
│   │   │   ├── logo.webp           # Main logo (WebP, 16K)
│   │   │   ├── logo-nav.webp       # Navigation bar logo (8K)
│   │   │   └── logo.png            # PNG fallback for schema.org JSON-LD
│   │   ├── features/               # Feature section icons
│   │   │   └── feat-*.webp         # 6 WebP feature icons
│   │   └── og/
│   │       └── og-image.png        # OpenGraph / Twitter card image (516K)
│   ├── icons/                      # Game icons (pop-art style)
│   │   └── icon-*-pop.webp         # 5 game icons used in GamesShowcase
│   ├── videos/
│   │   └── herobackgroundvideo.mp4 # Hero background loop (1.8M)
│   ├── games/                      # ⚠️ LEGACY — do not restructure
│   │   ├── kaetram/                # MMORPG (redirect to world.fuzzynuts.xyz)
│   │   ├── mario/                  # Super Fuzzynuts (11M, FullScreenMario)
│   │   ├── fuzzy-survivors/        # Vampire Survivors clone (2.1M)
│   │   ├── minigolf/               # Nut Golf WebAssembly (18M)
│   │   ├── nut-racer/              # Pseudo-3D racer (288K)
│   │   └── fuzzy-score.js          # Score bridge (postMessage → API)
│   ├── litepaper.html              # Static litepaper document
│   ├── robots.txt
│   └── sitemap.xml
│
├── docs/                           # Project documentation
│   └── fuzzynuts_handoff.md        # Full project handoff document
│
├── _archive/                       # Dead/superseded assets (safe to delete)
│   └── dead-assets/                # Removed in 2026-05-14 cleanup
│
├── next.config.ts                  # Static export config
├── tailwind.config.ts              # Theme extensions
├── tsconfig.json                   # TypeScript config with @/ alias
├── vercel.json                     # Deployment rules + headers
├── package.json
└── README.md
```

---

## Where to Put New Files

| Type | Location | Example |
|------|----------|---------|
| New page section | `src/components/sections/` | `Roadmap.tsx` |
| New UI primitive | `src/components/ui/` | `Modal.tsx`, `Badge.tsx` |
| New game component | `src/components/game/` | `ScoreSubmitter.tsx` |
| Section background | `public/images/sections/` | `roadmap-bg.jpg` + `roadmap-bg-mobile.jpg` |
| Brand asset | `public/images/branding/` | `logo-dark.webp` |
| OG / social image | `public/images/og/` | `og-arcade.png` |
| Feature icon | `public/images/features/` | `feat-roadmap.webp` |
| Game icon | `public/icons/` | `icon-newgame-pop.webp` |
| Documentation | `docs/` | `deployment-guide.md` |
| Utility function | `src/lib/` | `api.ts`, `constants.ts` |
| Custom hook | `src/hooks/` (create if needed) | `useAutoRefresh.ts` |
| Type definitions | `src/types/` (create if needed) | `game.types.ts` |

---

## Key Conventions

1. **Images**: Always provide desktop + mobile variants for section backgrounds. Use WebP for UI, PNG only for OG/schema.
2. **Components**: Named exports (`export function Hero()`), not default exports.
3. **Dynamic imports**: Use `dynamic()` with `.then(m => ({ default: m.ComponentName }))` for named exports.
4. **Static export**: No API routes, no SSR, no middleware. All data fetching is client-side.
5. **Games**: Legacy games in `public/games/` are untouchable static assets served as-is.
