# 🐿️ Fuzzynuts — Project Handoff Document

> **Date:** May 13, 2026 (Updated)
> **Project:** Fuzzynuts Arcade & MMORPG
> **Website:** https://fuzzynuts.xyz
> **Optimized Site:** Next.js 15 — `FuzzyNuts Optimized/fuzzynuts-optimized/`
> **MMORPG:** https://world.fuzzynuts.xyz
> **Token:** $NUT on XRPL (321B supply, blackholed issuer)

---

## 📁 Repository Map

There are **2 GitHub repos** and **1 local-only** directory:

| Repo | GitHub URL / Location | Branch | Deploy Target |
|------|-----------|--------|---------------|
| **Website + Arcade** | `fuzzynutsxrp-ship-it/fuzzynuts.xyz` | `main` | GitHub Pages → `fuzzynuts.xyz` |
| **Fuzzynuts World (Kaetram)** | `fuzzynutsxrp-ship-it/fuzzynuts-world` | `develop` | Railway → `world.fuzzynuts.xyz` |
| **Website Optimized (Next.js 15)** | Local (`FuzzyNuts Optimized/fuzzynuts-optimized/`) | — | Ready for Vercel deploy |

### Local Folder Structure

```
/home/jeetmachine/Documents/AI Tools/Fuzzynuts/
├── website/              ← LIVE website (GitHub Pages, React + Vite + Tailwind)
│   ├── src/              ← React components, pages, hooks
│   ├── public/           ← Static assets, 404.html, robots.txt, sitemap.xml
│   ├── dist/             ← Built output (deployed to GitHub Pages)
│   │   └── games/        ← SOURCE of all standalone game files
│   ├── legacy/           ← Old static HTML site files + litepaper.html
│   └── scripts/          ← Build/optimization scripts
├── website-v2/           ← IN-PROGRESS redesign (not live)
├── kaetram/              ← Fuzzynuts World MMORPG (Railway deployment)
│   ├── packages/         ← Monorepo: client, server, common, hub, admin, tools, e2e
│   ├── railway.json      ← Railway build/deploy config
│   └── .env              ← Local dev config (Railway vars override in prod)
├── scripts/              ← Operational scripts
│   ├── distribute-prizes.js         ← Weekly leaderboard $NUT payouts
│   ├── distribute-achievements.js   ← Achievement-based $NUT payouts
│   └── seed-achievement-rewards.js  ← One-time MongoDB seeder
├── ProjectBrief.md       ← Project status & phase tracker
├── RAILWAY_DEPLOYMENT_GUIDE.md  ← Step-by-step Railway setup
├── buy_nut.js            ← Script for purchasing NUT via XRPL
├── setup_nutfund.js      ← Community fund setup
├── xrp-ledger.toml       ← XRPL domain verification
└── guerrilla_memo.js     ← Marketing memo campaign script

/home/jeetmachine/Documents/AI Tools/FuzzyNuts Optimized/
├── fuzzynuts-optimized/   ← Next.js 15 optimized site (ready for deploy)
│   ├── src/               ← Next.js app + components
│   ├── public/
│   │   ├── games/         ← ALL 5 game subdirectories (copied from website/dist/games/)
│   │   │   ├── mario/     ← Super Fuzzynuts (11MB, 32-level platformer)
│   │   │   ├── kaetram/   ← Fuzzynuts World launcher (links to world.fuzzynuts.xyz)
│   │   │   ├── fuzzy-survivors/  ← Roguelite survival (2.1MB)
│   │   │   ├── minigolf/  ← Nut Golf WASM game (18MB)
│   │   │   ├── nut-racer/ ← Nut Racer arcade (288KB)
│   │   │   └── fuzzy-score.js  ← Shared score bridge
│   │   ├── css/           ← design-tokens.css + game-wrapper.css (shared by games)
│   │   ├── litepaper.html ← Static litepaper page
│   │   ├── icons/         ← WebP game icons
│   │   └── videos/        ← Hero background video
│   ├── out/               ← Static export output (npx next build)
│   └── tsconfig.json      ← Excludes public/games from TS compilation
└── fuzzynuts_handoff.md   ← THIS FILE
```

### ⚠️ Game Pages — Critical Dev Server Caveat

The 5 game pages are **standalone HTML/JS/CSS apps** copied into `public/games/`. They are NOT React components — they're served as raw static files.

**Production hosting** (GitHub Pages, Vercel, Netlify) automatically resolves `/games/mario/` → `/games/mario/index.html`. This works out of the box.

**The Next.js dev server (`npm run dev`) does NOT resolve `index.html` inside `public/` subdirectories.** Game links will 404 in dev mode.

**To test locally with working game links:**
```bash
# Option 1: Build + serve with proper static server
npm run serve:static

# Option 2: Manual
npx next build && npx serve out
```

**Why not use rewrites?** The site uses `output: "export"` (static HTML export), which is incompatible with Next.js `rewrites()`. The rewrites would only work with a Node.js server, not static hosting.

**tsconfig.json note:** `public/games` is excluded from TypeScript compilation because the Mario game contains legacy `.ts` files with triple-slash references that conflict with the Next.js compiler.

---

## 🎮 Games Inventory

### 1. Super Fuzzynuts (Mario Platformer)

| Property | Value |
|----------|-------|
| **Engine** | FullScreenMario (umaim/Mario fork) |
| **Tech** | HTML5 Canvas, vanilla JS (compiled from TypeScript) |
| **Location** | `website/games/mario/` |
| **Hosting** | Static files on GitHub Pages |
| **Features** | All 32 original SMB levels, Random Map Generator, Level Editor, 12+ mods, full sound system |
| **Score Bridge** | `postMessage` → parent iframe, polls every 2s |
| **Score Cap** | 99,999 |
| **Entry Point** | `/games/mario/index.html` |

### 2. Fuzzy Survivors (Roguelite Survival)

| Property | Value |
|----------|-------|
| **Tech** | HTML5 Canvas, vanilla JS modules |
| **Location** | `website/games/fuzzy-survivors/` |
| **Hosting** | Static files on GitHub Pages |
| **Score Cap** | 999,999 |
| **Entry Point** | `/games/fuzzy-survivors/index.html` |

### 3. Nut Golf (3D Mini-Golf)

| Property | Value |
|----------|-------|
| **Tech** | Emscripten WASM + HTML5 |
| **Location** | `website/games/minigolf/` |
| **Hosting** | Static files on GitHub Pages |
| **Files** | `index.html`, `index.js`, `index.wasm`, `index.data` |
| **Score Cap** | 10,500 |
| **Entry Point** | `/games/minigolf/index.html` |

### 4. Nut Racer

| Property | Value |
|----------|-------|
| **Tech** | HTML5 Canvas |
| **Location** | `website/games/nut-racer/` (arcade card #5) |
| **Hosting** | Static files on GitHub Pages |
| **Status** | Added in Phase 2C with full leaderboard integration |

### 5. Fuzzynuts World (Kaetram MMORPG) ⭐ Flagship

| Property | Value |
|----------|-------|
| **Engine** | [Kaetram-Open v2.5.1](https://github.com/Kaetram/Kaetram-Open) |
| **Tech** | Node.js + µWebSockets + MongoDB + Astro (client) + esbuild |
| **Repo** | `fuzzynutsxrp-ship-it/fuzzynuts-world` |
| **Branch** | `develop` (auto-deploys to Railway) |
| **Hosting** | Railway (`efficient-tenderness` project) |
| **Live URL** | `https://world.fuzzynuts.xyz` |
| **Railway URL** | `efficient-tenderness-production.up.railway.app` |
| **Protocol** | WSS (TLS-encrypted WebSocket) |
| **Database** | MongoDB (Railway plugin) — `fuzzynuts_world` DB |
| **Max Players** | 100 |
| **Features** | Persistent characters, quests, crafting, combat, multiplayer, wallet-linked accounts |
| **Wallet Auth** | Xaman, GemWallet, Crossmark (Joey removed for security) |
| **Reward System** | Server-side `queueNutReward()` hooks for achievements, quests, skills, daily logins |

---

## 🚂 Railway Deployment — Complete Reference

### Access

| Property | Value |
|----------|-------|
| **Railway Dashboard** | https://railway.app |
| **GitHub Login** | `fuzzynutsxrp@gmail.com` (the `fuzzynutsxrp-ship-it` org) |
| **Project Name** | `efficient-tenderness` |
| **Plan** | Hobby ($5/mo base + usage) |
| **Estimated Cost** | $9–13/month total |

### Services on Railway Canvas

| Service | Type | Purpose |
|---------|------|---------|
| **Kaetram** | GitHub Deploy | Game server (Node.js + uws) |
| **MongoDB** | Database Plugin | Player data, scores, rewards |

### Build & Deploy Pipeline

```
Push to `develop` branch on GitHub
  → Railway auto-detects via webhook
  → Nixpacks reads `railway.json`
  → Build: `corepack enable && yarn install && yarn build`
  → Deploy: `yarn workspace @kaetram/server start`
  → ~4 minutes total
```

**`railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "corepack enable && yarn install && yarn build"
  },
  "deploy": {
    "startCommand": "yarn workspace @kaetram/server start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Environment Variables (Railway → Kaetram Service)

These are set in the Railway dashboard under the Kaetram service → Variables tab:

```env
ACCEPT_LICENSE=true
NAME=Fuzzynuts World
HOST=0.0.0.0
PORT=9001
SSL=true
CLIENT_REMOTE_HOST=world.fuzzynuts.xyz
MAX_PLAYERS=100
SKIP_DATABASE=false
DATABASE=mongodb
MONGO_URL=${{MongoDB.MONGO_URL}}
MONGODB_DATABASE=fuzzynuts_world
TUTORIAL_ENABLED=false
API_ENABLED=true
API_PORT=9002
HUB_ENABLED=false
DISCORD_ENABLED=false
DEBUGGING=false
GVER=1.0.0-fuzzynuts
NODE_OPTIONS=--max-old-space-size=1024
```

> [!IMPORTANT]
> `MONGO_URL=${{MongoDB.MONGO_URL}}` uses Railway's native reference syntax — it auto-resolves to the full MongoDB connection string. If the MongoDB service is renamed on the canvas, update accordingly (e.g., `${{MongoDB-1.MONGO_URL}}`).

### Custom Domain Setup

| Component | Value |
|-----------|-------|
| **Domain** | `world.fuzzynuts.xyz` |
| **DNS Provider** | Porkbun |
| **Record Type** | CNAME |
| **Host** | `world` |
| **Target** | CNAME target from Railway Settings → Networking |
| **SSL** | Auto (Let's Encrypt via Railway) |

### REST API Endpoints (on Railway)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scores` | GET/POST | Leaderboard scores (anti-cheat: caps, rate limits, duration) |
| `/api/rewards?wallet=rXXX` | GET | Achievement rewards for a wallet |

---

## 🔑 Credentials & Secrets

### Xaman (Xumm) API — Wallet Auth

| Property | Value |
|----------|-------|
| **App Name** | Fuzzynuts Arcade |
| **Console** | [apps.xaman.dev](https://apps.xaman.dev) |
| **API Key** | `f4f734d6-c1d6-484a-84c1-70322602a7f5` |
| **API Secret** | `16e25c3e-a268-439a-8e23-19f334d2f314` |
| **Usage** | API Key → client-side in `wallet.js`; API Secret → server-side ONLY |
| **Whitelisted Origin** | `https://fuzzynuts.xyz`, `https://world.fuzzynuts.xyz` |

### XRPL Wallet Architecture (4-wallet model)

| Role | Address | Status |
|------|---------|--------|
| **Issuer** | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` | 💀 BLACKHOLED |
| **Distributor** | `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh` | Active — LP provider |
| **AMM Pool** | `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg` | NUT/XRP liquidity |
| **Community (Nut Jar)** | *(see project docs)* | Airdrops/rewards |

### $NUT Token

| Property | Value |
|----------|-------|
| **Currency Code** | `NUT` |
| **Network** | XRP Ledger |
| **Total Supply** | 321,000,000,000 (321B) |
| **Supply Status** | PERMANENTLY LOCKED (blackholed issuer) |
| **Trading Fee** | 1% |
| **Tokenomics** | 80% AMM / 18% Community / 2% Founder |
| **DEX** | [XPMarket](https://xpmarket.com/dex/NUT-rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7/XRP) |

---

## 🚀 Deployment Procedures

### Deploying Website Changes (GitHub Pages)

```bash
cd /home/jeetmachine/Documents/AI\ Tools/Fuzzynuts/website

# Build
npm run build

# Commit and push
git add -A
git commit -m "feat: description of changes"
git push origin main

# Auto-deploys via GitHub Pages → fuzzynuts.xyz
```

### Deploying Fuzzynuts World (Railway)

```bash
cd /home/jeetmachine/Documents/AI\ Tools/Fuzzynuts/kaetram

# Make changes, then:
git add -A
git commit -m "feat: description of changes"
git push origin develop

# Railway auto-detects push → rebuilds in ~4 min
# Monitor: Railway dashboard → Kaetram service → Deployments
```

> [!TIP]
> You can also push to a separate remote. The `shafic` remote is configured at `shafic-bit/fuzzynuts-world.git` for collaboration.

### Running Prize Distribution

```bash
cd /home/jeetmachine/Documents/AI\ Tools/Fuzzynuts

# Dry run (default — no real payouts)
node scripts/distribute-prizes.js

# Live run (real XRPL payouts)
node scripts/distribute-prizes.js --live

# Testnet run
node scripts/distribute-prizes.js --testnet
```

### Running Achievement Rewards

```bash
# Dry run
node scripts/distribute-achievements.js

# Live with safety cap
node scripts/distribute-achievements.js --live --max-total-payout 50000

# Batch control
node scripts/distribute-achievements.js --live --batch 10
```

---

## 📊 Score System

### Anti-Cheat Guardrails

| Rule | Value |
|------|-------|
| Mario score cap | 99,999 |
| Survivors score cap | 999,999 |
| Minigolf score cap | 10,500 |
| Minimum play duration | 15 seconds |
| Rate limit | 5 min between submissions per game |
| Week cycle | ISO 8601, resets Monday 00:00 UTC |

### Score Pipeline

```
Game Page → FuzzyScoreSubmit(game, score, duration) [fuzzy-score.js]
  → Validates: cap, duration, wallet
  → POST /api/scores (Railway backend)
  → MongoDB (arcade_scores collection)
  → Leaderboard UI reads via GET /api/scores
  → localStorage fallback if backend unreachable
```

### Prize Pool

- **500K $NUT/week** distributed to top 3 combined scores
- 1st: 250K | 2nd: 150K | 3rd: 100K

---

## 🏗️ Design System

| Token | Value |
|-------|-------|
| Primary BG | `#0A0A0F` |
| Card BG | `rgba(26, 26, 36, 0.85)` |
| Gold Accent | `#DAA520` |
| Cream Text | `#F0EDE6` |
| Body Font | Outfit |
| Heading Font | Press Start 2P |
| Theme | Dark forest + gold + squirrel/nut aesthetic |

---

## ⚡ Performance Optimization Audit (May 13, 2026)

The Next.js 15 optimized site (`fuzzynuts-optimized/`) received a comprehensive performance pass:

### Asset Compression

| Asset | Before | After | Savings |
|-------|--------|-------|--------|
| Game icons (5×) | ~300KB PNG each | ~16KB WebP each | **-95%** |
| Logo (hero) | 364KB PNG | 16KB WebP | **-96%** |
| Logo (nav/footer) | 12KB PNG | 8KB WebP | **-33%** |
| Original video backup | 10.6MB MP4 | Deleted | **-100%** |
| Icon duplicates (root) | 1.6MB total | Deleted | **-100%** |
| **Total asset reduction** | | | **~3.1MB saved** |

### Code Splitting & SSR

| Change | Impact |
|--------|--------|
| Removed `"use client"` from `page.tsx` | Enables SSR for initial HTML — faster FCP |
| Dynamic-imported 6 below-fold sections | Smaller initial JS bundle — only Hero/Navbar load eagerly |
| `ClientFallingNuts` wrapper | Decorative canvas deferred to client-only, no SSR penalty |
| `content-visibility: auto` on all sections | Browser skips layout/paint for off-screen sections |
| `contain-intrinsic-size: auto 800px` | Prevents CLS from lazy-rendered sections |

### Rendering Optimizations

| Change | DOM nodes saved | GPU impact |
|--------|----------------|------------|
| Merged 4 overlay `<div>`s → 1 (per section, ×6) | **~18 nodes** | Fewer compositing layers |
| Film-grain `::after` disabled on mobile | — | Major GPU relief on mobile |
| FallingNuts: 22→18 (desktop), 12→8 (mobile) | — | Fewer canvas draws per frame |
| FallingNuts: Page Visibility API pause | — | Zero CPU when tab hidden |
| `prefers-reduced-motion` support | — | Kills all animation for a11y users |

### Network Optimizations

| Change | Effect |
|--------|--------|
| `preconnect` to Google Fonts & `dns-prefetch` to XRPScan/XPMarket | Faster 3rd-party resolution |
| `preload` hero mobile image + video | LCP resource fetched earlier |
| `loading="lazy"` on all non-hero images | Defers ~2.5MB of below-fold images |
| Image quality reduced: 82→72 (desktop), 78→68 (mobile) | ~15% smaller per image |
| Video `poster` attribute added | Frame visible before video decode |
| Vercel `Cache-Control: immutable` extended to `.mp4`, `.woff` | Aggressive CDN caching |

### Build Output

```
Route (app)                   Size  First Load JS
┌ ○ /                       72.9 kB         175 kB
└ ○ /_not-found               999 B         104 kB
+ First Load JS shared       103 kB
```

---

## ⚠️ Known Limitations

1. **Scores are client-submitted** — no server-side replay validation
2. **Prize distribution is manual CLI** — cron automation deferred
3. **No wallet signature verification** on score submission
4. **Anti-cheat is deterrent-level**, not cryptographic
5. **XRPL Meta domain issue** — Issuer was blackholed before Domain field was set; manual intervention from @xrplmeta needed
6. **V2 token reissue deferred** — V1 used as testbed; see `fuzzynuts-v2-reissue-plan` knowledge item
7. **Optimized site not yet deployed** — `fuzzynuts-optimized/` is built and validated but awaiting deployment to Vercel or GitHub Pages
8. **`npm run dev` doesn't serve game pages** — use `npm run serve:static` for full local testing with game links

---

## 🧪 Verification Checklist

After any deployment, run through:

| Test | Expected |
|------|----------|
| `fuzzynuts.xyz` loads | Landing page with hero, tokenomics, games |
| `fuzzynuts.xyz/#games` | Game cards visible |
| `world.fuzzynuts.xyz` | Kaetram login screen |
| Create test account in Kaetram | Game world loads, character persists |
| Railway dashboard → Deployments | Latest shows "Success" ✅ |
| Railway dashboard → MongoDB → Metrics | Shows read/write activity |

---

## 📬 Socials & Links

| Platform | URL |
|----------|-----|
| Website | https://fuzzynuts.xyz |
| MMORPG | https://world.fuzzynuts.xyz |
| X/Twitter | [@fuzzynutsxrp](https://x.com/fuzzynutsxrp) |
| Telegram | [t.me/FuzzynutsXRP](https://t.me/FuzzynutsXRP) |
| DEX | [XPMarket](https://xpmarket.com/dex/NUT-rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7/XRP) |
| Explorer | [XRPScan](https://xrpscan.com/account/rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7) |
| DNS | Porkbun (fuzzynuts.xyz) |
