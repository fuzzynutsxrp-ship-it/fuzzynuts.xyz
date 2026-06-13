# Fuzzynuts.xyz — Project Structure

> Last updated: 2026-05-25 (post front-page overhaul)

## Architecture

- **Framework**: Next.js 15 (App Router) on **Vercel runtime** — _not_ a static export anymore (custom security headers + an edge middleware lockdown rule that out).
- **Edge middleware**: `src/middleware.ts` — fail-closed HTTP Basic Auth gate for the pre-launch lockdown (see `PRODUCTION_ENV.md`).
- **Styling**: Tailwind CSS v3 + vanilla CSS design tokens in `globals.css`
- **Animation**: Framer Motion, wrapped globally by `providers/MotionProvider.tsx` (`<MotionConfig reducedMotion="user">`)
- **State**: Zustand wallet store (`src/store/wallet.ts`)
- **Wallets**: Xaman (`lib/wallet/xamanService.ts`), GemWallet, Crossmark, and Joey/WalletConnect (`providers/JoeyProvider.tsx` + `lib/wallet/joey*`)
- **Deploy**: Vercel + Railway (API backend at `world.fuzzynuts.xyz`)
- **Brand**: Dark enchanted-forest theme, glowing gold `#FBBF24` accents, "Fuzz" the red-squirrel mascot

### Front-page composition (`src/app/page.tsx`)

`Hero → GamesShowcase → Prizes → Trust → HowToGet → Footer`, over a fixed
`HeroBackground` and the `FallingNuts` canvas, with a `FloatingMascot` in the
corner. The May-2026 overhaul merged the old `PrizeTiers` + `WalletCTA` into
**`Prizes`**, merged `Tokenomics` + `OnChainVerification` (+ two rescued
feature chips) into **`Trust`**, and cut the standalone `Features` section.

---

## Directory Layout

```
fuzzynuts-optimized/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout, metadata, fonts, JSON-LD
│   │   ├── page.tsx                # Home page (assembles all sections)
│   │   ├── globals.css             # Design tokens, utilities, animations
│   │   ├── favicon.ico             # Auto-served by Next.js (do NOT move)
│   │   ├── games/[slug]/           # Dynamic game routes
│   │   │   ├── page.tsx            # SSG page (generateStaticParams)
│   │   │   └── client.tsx          # Client wrapper for GameWrapper
│   │   ├── leaderboard/
│   │   │   ├── page.tsx            # Server Component (metadata export)
│   │   │   └── client.tsx          # Client boundary (ssr: false)
│   │   └── profile/
│   │       ├── page.tsx            # Server Component (metadata export)
│   │       └── client.tsx          # Client boundary (ssr: false)
│   │
│   ├── components/
│   │   ├── layout/                 # App shell
│   │   │   ├── Navbar.tsx          # Top nav + wallet-connect dropdown
│   │   │   └── Footer.tsx          # Footer links + social
│   │   ├── hero/
│   │   │   ├── Hero.tsx            # Mascot, CTAs, stats, compact prize teaser → #prizes
│   │   │   └── HeroBackground.tsx # Fixed page-level forest backdrop
│   │   ├── sections/               # Homepage body sections
│   │   │   ├── GamesShowcase.tsx   # Arcade-cabinet cards (marquee/bezel/CRT/control deck)
│   │   │   ├── Prizes.tsx          # MERGED: prize tiers + single connect CTA
│   │   │   ├── Trust.tsx           # MERGED: tokenomics donut + on-chain ledger + trust chips
│   │   │   ├── HowToGet.tsx        # 4-step "get $NUT" guide
│   │   │   ├── Leaderboard.tsx     # /leaderboard board
│   │   │   ├── ClaimRewards.tsx    # /profile rewards claim
│   │   │   └── UserProfile.tsx     # /profile stats
│   │   │   #  Removed in the overhaul: Features, Tokenomics,
│   │   │   #  OnChainVerification, PrizeTiers, WalletCTA
│   │   ├── home/                   # Hero-adjacent
│   │   │   ├── FloatingMascot.tsx  # Looping corner squirrel (hidden < 640px)
│   │   │   ├── HeroPrizeTeaser.tsx # (currently unused)
│   │   │   ├── WeeklyPrizes.tsx
│   │   │   └── SectionTransition.tsx
│   │   ├── providers/
│   │   │   ├── MotionProvider.tsx  # Global reduced-motion gate
│   │   │   ├── JoeyProvider.tsx    # WalletConnect/Joey bridge → wallet store
│   │   │   └── AppMount.tsx        # mount hooks (wallet autoReconnect)
│   │   ├── game/                   # /games/[slug] runtime
│   │   │   ├── GamePage.tsx        # Iframe host + leaderboard + sidebar
│   │   │   ├── ComingSoonGamePage.tsx # Rendered when game.status === "coming-soon"
│   │   │   ├── GameViewport / GameMenu / GameSidebar / GameControls / GameHeader
│   │   │   ├── ScoreSubmissionPanel.tsx / GameScoreHistory.tsx / TouchControlsHint.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── ui/                     # Primitives (CyberCard, etc.)
│   │   ├── errors/                 # Route error boundaries
│   │   ├── ClientFallingNuts.tsx   # ssr:false wrapper
│   │   └── FallingNuts.tsx         # Canvas particle effect (reduced-motion aware)
│   │
│   ├── features/arcade/            # Arcade domain (leaderboard + scoring)
│   │   ├── hooks/                  # useLeaderboard, useLeaderboardSSE
│   │   ├── utils/                  # scoreHelpers (mergeScores), week-key calc
│   │   ├── validation/             # Zod score schema + middleware
│   │   ├── constants/ types/ components/ __tests__/
│   │   └── slugAliases.ts          # canonical ↔ backend game-slug translation
│   │
│   ├── lib/
│   │   ├── utils.ts                # XRPL_CONFIG, GAMES, TOKENOMICS, HOW_TO_STEPS
│   │   ├── gameRegistry.ts         # Per-game metadata (status, scoreCap, iframe path…)
│   │   └── wallet/                 # joeyAdapter, joeyConfig, xamanService, verifySignature
│   │
│   ├── middleware.ts               # Edge lockdown (HTTP Basic Auth, fail-closed)
│   ├── store/
│   │   └── wallet.ts               # Zustand wallet state + connect/disconnect/autoReconnect
│   ├── hooks/                      # Shared React hooks
│   └── types/                      # Shared TS types
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
│   │   ├── branding/               # All brand assets (logos, mascots, wordmarks)
│   │   │   ├── logo.webp           # Main squirrel logo (WebP, 16K)
│   │   │   ├── logo-nav.webp       # Navigation bar squirrel logo (8K)
│   │   │   ├── logo.png            # ⚠️ Schema-only (JSON-LD). Do NOT use in UI.
│   │   │   ├── logo_512.png        # 512px squirrel logo (used by litepaper.html)
│   │   │   ├── FuzzyBear.png       # Floating mascot art (FloatingMascot.tsx)
│   │   │   └── wordmarks/          # Gold 3D-textured text wordmarks (section headers)
│   │   │       ├── text_logo.png   # "FUZZYNUTS" — Hero, Navbar, Footer
│   │   │       ├── tokenomics.png  # "TOKENOMICS" — Tokenomics section header
│   │   │       └── highlights.png  # "HIGHLIGHTS" — Features section header
│   │   ├── features/               # Feature section icons
│   │   │   └── feat-*.webp         # 6 WebP feature icons
│   │   └── og/
│   │       └── og-image.png        # OpenGraph / Twitter card image (516K)
│   ├── icons/                      # Game icons (pop-art style)
│   │   └── icon-*-pop.webp         # 5 game icons used in GamesShowcase
│   ├── videos/
│   │   └── herobackgroundvideo.mp4 # Hero background loop (1.8M)
│   ├── games/                      # ⚠️ STATIC GAME BUNDLES — careful here
│   │   ├── fuzzynuts-world/        # MMORPG (redirect stub → world.fuzzynuts.xyz)
│   │   ├── mario/                  # Super Fuzzynuts (11M, FullScreenMario fork)
│   │   ├── fuzzy-survivors/        # Vampire Survivors clone (runtime only)
│   │   ├── minigolf/               # Nut Golf WebAssembly (18M)
│   │   ├── nut-racer/              # Pseudo-3D racer (288K)
│   │   └── fuzzy-score.js          # Score bridge (postMessage → API)
│   ├── css/                        # Static CSS shared with game iframes
│   │   ├── design-tokens.css       # CSS custom properties for games
│   │   └── game-wrapper.css        # Iframe wrapper styles
│   ├── litepaper.html              # Static litepaper document
│   ├── robots.txt
│   └── sitemap.xml
│
├── docs/                           # Project documentation
│   ├── PROJECT_STRUCTURE.md        # ← You are here
│   ├── DEPLOY_STEPS.md             # Full deployment guide (Vercel + Railway)
│   ├── PRODUCTION_ENV.md           # Environment variables & security
│   ├── fuzzynuts_handoff.md        # Complete project handoff document
│   └── archive/                    # Archived/superseded files (safe to delete)
│       ├── dead-assets/            # Removed icons, old PNGs, dead CSS
│       └── fuzzy-survivors-dev/    # Dev artifacts stripped from game bundle
│
├── scripts/
│   └── rewards-api.js              # Reference implementation for backend rewards
│
├── next.config.ts                  # Static export, unoptimized images
├── tailwind.config.ts              # Theme: dark forest + gold accent
├── tsconfig.json                   # TypeScript config with @/ alias
├── vercel.json                     # Security headers, cache rules, redirects
├── package.json
└── README.md
```

---

## Where to Put New Files

| Type                       | Location                            | Example                                    |
| -------------------------- | ----------------------------------- | ------------------------------------------ |
| New page route             | `src/app/<route>/page.tsx`          | `src/app/roadmap/page.tsx`                 |
| New page section           | `src/components/sections/`          | `Roadmap.tsx`                              |
| New UI primitive           | `src/components/ui/`                | `Modal.tsx`, `Badge.tsx`                   |
| New game component         | `src/components/game/`              | `ScoreSubmitter.tsx`                       |
| Wallet integration         | `src/components/wallet/` (create)   | `XamanConnect.tsx`                         |
| Section background         | `public/images/sections/`           | `roadmap-bg.jpg` + `roadmap-bg-mobile.jpg` |
| Brand asset (logo, mascot) | `public/images/branding/`           | `fuzz-pose-2.webp`                         |
| Text wordmark (PNG header) | `public/images/branding/wordmarks/` | `roadmap.png`                              |
| OG / social image          | `public/images/og/`                 | `og-arcade.png`                            |
| Feature icon               | `public/images/features/`           | `feat-roadmap.webp`                        |
| Game icon                  | `public/icons/`                     | `icon-newgame-pop.webp`                    |
| Documentation              | `docs/`                             | `API_REFERENCE.md`                         |
| Archived/old files         | `docs/archive/`                     | anything superseded                        |
| Utility function           | `src/lib/`                          | `api.ts`, `constants.ts`                   |
| Custom hook                | `src/hooks/`                        | `useAutoRefresh.ts`                        |
| Type definitions           | `src/types/`                        | `game.types.ts`                            |
| Build/optimization scripts | `scripts/`                          | `optimize-images.sh`                       |

---

## Key Conventions

1. **Images**: Always provide desktop + mobile variants for section backgrounds. Use WebP for UI elements, PNG only for OG/schema references.
2. **Components**: Named exports (`export function Hero()`), not default exports.
3. **Dynamic imports**: Use `dynamic()` with `.then(m => ({ default: m.ComponentName }))` for named exports.
4. **Rendering**: Client-heavy App Router on the Vercel runtime (no longer a static export). One edge middleware exists — `src/middleware.ts`, the pre-launch lockdown. Leaderboard/rewards data is fetched client-side from `world.fuzzynuts.xyz`.
5. **Games**: `public/games/` is a **read-only artifact repository**. Never edit game files directly here — use the isolated dev workspace instead (see below).
6. **Naming**: Components use PascalCase (`Hero.tsx`). Assets use kebab-case (`hero-bg.jpg`). Documentation uses UPPER_SNAKE_CASE (`DEPLOY_STEPS.md`).
7. **Brand colors**: Primary gold `#f5c442`, dark forest backgrounds, glassmorphism cards. See `tailwind.config.ts` for full palette.
8. **Favicon**: Lives at `src/app/favicon.ico` — Next.js App Router auto-serves this. Do NOT move it to `public/`.

---

## Game Development Workflow

All game modifications happen in a **parallel, isolated workspace** at `../fuzzynuts-games-dev/`.

```
fuzzynuts-games-dev/       ← Edit games here (isolated sandbox)
│
│   npm run dev:mario      → http://localhost:3001 (test locally)
│   npm run sync:mario     → copies to public/games/mario/ (with backup + build verification)
│
fuzzynuts-optimized/
└── public/games/mario/    ← READ-ONLY destination (only populated by sync script)
```

### Key rules:

- **Never edit files in `public/games/` directly** — always edit in `fuzzynuts-games-dev/` and sync
- Each game has its own dev server on an isolated port (3001-3005)
- The sync script creates timestamped backups and **auto-rolls back** if the build fails
- See `../fuzzynuts-games-dev/README.md` for full workflow documentation

### postMessage Contract (games ↔ GameWrapper):

| Message                                            | Direction      | Purpose                       |
| -------------------------------------------------- | -------------- | ----------------------------- |
| `{ type: 'FUZZY_SCORE_SUBMITTED', success: bool }` | Game → Wrapper | Score submission result toast |
| `{ type: 'gameReady' }`                            | Game → Wrapper | Dismiss loading overlay early |
| `{ type: 'setMute', muted: bool }`                 | Wrapper → Game | Mute/unmute audio             |

---

## Keeping Things Clean

- **Never commit `out/`** — it's gitignored and regenerated by `npm run build`.
- **Never commit `.next/`** — ephemeral build cache.
- **Archive before deleting** — when removing assets, move to `docs/archive/` first.
- **One section per file** — each homepage section is its own component in `sections/`.
- **Game dev artifacts stay out of `public/`** — tests, scripts, and docs for individual games belong in `docs/archive/`, not shipped to production.
