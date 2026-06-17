# 🐿️ Fuzzynuts — Play. Earn. Own.

> The nuttiest meme coin on the XRP Ledger. Play arcade games, earn real $NUT tokens, and join a community that refuses to take crypto seriously.

![Fuzzynuts](.github/og-image.png)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fuzzynuts/fuzzynuts-optimized&env=NEXT_PUBLIC_XAMAN_API_KEY,NEXT_PUBLIC_SITE_URL&envDescription=Xaman%20API%20key%20and%20site%20URL&project-name=fuzzynuts&repository-name=fuzzynuts-optimized)

---

## ✨ Features

- **6 Play-to-Earn Games** — MMORPG, Platformer, Survivors, Mini Golf, Racing (live) + Top Secret (coming soon)
- **XRPL Wallet Integration** — Xaman (Xumm), GemWallet, Crossmark, Joey/WalletConnect
- **321 Billion Fixed Supply** — Blackholed issuer, 80% in AMM liquidity
- **Buttery Smooth Animations** — Framer Motion 12, arcade-cabinet cards, particle system (all reduced-motion aware)
- **Falling Nuts Background** — Canvas-based particle system with golden acorns
- **Mobile-First Design** — Fully responsive, touch-optimized
- **Deployed on Vercel** — App Router runtime with an edge lockdown + security headers (see `docs/`)

## 🛠 Tech Stack

| Technology                                      | Version | Purpose                   |
| ----------------------------------------------- | ------- | ------------------------- |
| [Next.js](https://nextjs.org)                   | 15.5    | App Router, static export |
| [React](https://react.dev)                      | 19.1    | UI framework              |
| [TypeScript](https://typescriptlang.org)        | 5.x     | Type safety               |
| [Tailwind CSS](https://tailwindcss.com)         | 3.4     | Utility-first styling     |
| [Framer Motion](https://www.framer.com/motion/) | 12.x    | Animations                |
| [Zustand](https://zustand-demo.pmnd.rs/)        | 5.x     | State management          |
| [Lucide React](https://lucide.dev)              | Latest  | Icon library              |
| [Xumm SDK](https://www.npmjs.com/package/xumm)  | 1.8     | Xaman wallet integration  |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm 9+

### Install & Run Locally

```bash
# Clone the repository
git clone https://github.com/fuzzynuts/fuzzynuts-optimized.git
cd fuzzynuts-optimized

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys (see below)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the dev server uses Turbopack for instant HMR.

### Production Build

```bash
# Build static export
npm run build

# Output is in /out directory — ready for deployment
```

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Xaman (Xumm) API key — get one at https://apps.xaman.dev
NEXT_PUBLIC_XAMAN_API_KEY=your_api_key_here

# Required: Your production URL
NEXT_PUBLIC_SITE_URL=https://fuzzynuts.xyz

# Optional: XRPL node (defaults to wss://xrplcluster.com)
NEXT_PUBLIC_XRPL_NODE=wss://xrplcluster.com

# Optional: Override token addresses (defaults are production addresses)
NEXT_PUBLIC_NUT_ISSUER=rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7
NEXT_PUBLIC_NUT_DISTRIBUTOR=rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh
NEXT_PUBLIC_NUT_AMM_POOL=r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg
```

## ▲ Deploy to Vercel

### One-Click Deploy

Click the button at the top of this README, or:

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_XAMAN_API_KEY
# - NEXT_PUBLIC_SITE_URL
```

### Custom Domain

1. Go to **Vercel Dashboard → Project → Settings → Domains**
2. Add your domain (e.g., `fuzzynuts.xyz`)
3. Update your DNS:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com` (for `www`)
4. Vercel auto-provisions HTTPS via Let's Encrypt

## 📂 Project Organization

```
fuzzynuts-optimized/
├── src/
│   ├── app/                 # Next.js App Router (pages, layout, CSS)
│   ├── components/
│   │   ├── layout/          # Navbar, Footer
│   │   ├── sections/        # Hero, GamesShowcase, Tokenomics, etc.
│   │   ├── game/            # GameWrapper, LoadingOverlay, ErrorBoundary
│   │   └── ui/              # CyberCard, reusable primitives
│   ├── lib/                 # Utilities, config, constants
│   ├── store/               # Zustand state management
│   ├── hooks/               # Custom React hooks
│   └── types/               # Shared TypeScript types
├── public/
│   ├── images/              # Organized by: hero/, sections/, branding/, features/, og/
│   ├── icons/               # Game icons (pop-art WebP)
│   ├── videos/              # Hero background video
│   └── games/               # Static game bundles (mario, survivors, minigolf, etc.)
├── docs/                    # Deployment guides, handoff docs, archived files
├── scripts/                 # Build & optimization utilities
└── [configs]                # next.config.ts, tailwind.config.ts, vercel.json, etc.
```

> 📖 **Full structure docs with conventions and rules:** [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)

## 🔐 XRPL Wallet Setup

### Getting a Xaman API Key

1. Go to [apps.xaman.dev](https://apps.xaman.dev)
2. Create a new application
3. Copy the API Key to your `.env.local`

### Supported Wallets

| Wallet                             | Type              | Support |
| ---------------------------------- | ----------------- | ------- |
| [Xaman (Xumm)](https://xaman.app)  | Mobile + Desktop  | ✅ Full |
| [GemWallet](https://gemwallet.app) | Browser Extension | ✅ Full |
| [Crossmark](https://crossmark.io)  | Browser Extension | ✅ Full |

### On-Chain Addresses

| Purpose             | Address                              |
| ------------------- | ------------------------------------ |
| Issuer (Blackholed) | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` |
| Distributor         | `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh` |
| AMM Pool            | `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg` |

## 🎮 Games

| Game            | Type           | Status         |
| --------------- | -------------- | -------------- |
| Fuzzynuts World | MMORPG         | 🟢 Live        |
| Super Fuzzynuts | Platformer     | 🟢 Live        |
| Fuzzy Survivors | Horde Survival | 🟢 Live        |
| Fuzzy Putt      | Mini Golf      | 🟢 Live        |
| Nut Racer       | Racing         | 🟡 Coming Soon |

## 📜 Scripts

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build → /out
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📄 License

MIT © Fuzzynuts

---

<div align="center">

**Built with 🐿️ energy and zero financial advice.**

[Website](https://fuzzynuts.xyz) · [X/Twitter](https://x.com/fuzzynutsxrp) · [Telegram](https://t.me/FuzzynutsXRP) · [XRPScan](https://xrpscan.com/account/rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7)

</div>
