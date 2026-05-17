# 🐿️ Fuzzynuts Arcade — Foundation Complete

> **Date:** May 16, 2026
> **Version:** 1.0 (Arcade Foundation)
> **Build Status:** ✅ 12/12 pages, zero errors (Next.js 15.5.18)
> **Live URL:** https://fuzzynuts.xyz
> **API:** https://world.fuzzynuts.xyz

This document is the canonical reference for the Fuzzynuts Arcade platform. It covers the full-stack architecture, game development workflow, deployment procedures, environment configuration, and future roadmap.

**Related docs:**
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — file layout, conventions, and component map
- [fuzzynuts_handoff.md](./fuzzynuts_handoff.md) — historical context, credentials, and legacy system reference
- [DEPLOY_STEPS.md](./DEPLOY_STEPS.md) — step-by-step deployment playbook
- [PRODUCTION_ENV.md](./PRODUCTION_ENV.md) — full environment variable reference with security notes
- [fuzzynuts-games-dev/README.md](../../fuzzynuts-games-dev/README.md) — isolated game development workspace

---

## 1. Architecture Overview

The Fuzzynuts Arcade is a **3-tier system** designed for maximum separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: PRESENTATION (Vercel — Static)                        │
│                                                                 │
│  fuzzynuts.xyz — Next.js 15 (App Router, static export)        │
│  ┌──────────┬──────────────┬──────────────┬──────────────┐     │
│  │ Homepage │ /games/[slug]│ /leaderboard │  /profile    │     │
│  │  (SSG)   │  (SSG + CSR) │   (CSR)      │   (CSR)      │     │
│  └──────────┴──────┬───────┴──────┬───────┴──────┬───────┘     │
│                    │              │              │               │
│     iframe loads   │   GET/POST   │   GET/POST   │               │
│  /games/*/index.html  /api/scores    /api/rewards                │
│                    │              │              │               │
├────────────────────┼──────────────┼──────────────┼───────────────┤
│  TIER 2: BUSINESS LOGIC (Railway — Node.js)                    │
│                                                                 │
│  world.fuzzynuts.xyz — Fuzzynuts World Server (uws + Express)          │
│  ┌──────────────────┬─────────────────┬──────────────────┐     │
│  │ WebSocket :9001  │ REST API :9002  │ XRPL Dispatch    │     │
│  │ (game world)     │ (scores/rewards)│ (xrpl.js)        │     │
│  └────────┬─────────┴────────┬────────┴────────┬─────────┘     │
│           │                  │                 │                │
├───────────┼──────────────────┼─────────────────┼────────────────┤
│  TIER 3: DATA + LEDGER                                         │
│                                                                 │
│  ┌────────┴─────────┐   ┌───┴─────────────────┴──────────┐    │
│  │ MongoDB (Railway) │   │ XRPL Mainnet                   │    │
│  │ fuzzynuts_world   │   │ wss://xrplcluster.com          │    │
│  │ ├ arcade_scores   │   │ Token: NUT                     │    │
│  │ ├ prize_distrib.  │   │ Issuer: rpL6Hfo...            │    │
│  │ └ reward_queue    │   │ (blackholed — 321B fixed)      │    │
│  └───────────────────┘   └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | Next.js 15, Tailwind CSS 3, Framer Motion, Zustand | Static export, Vercel hosting |
| **Backend** | Node.js + µWebSockets + Express | Railway hosting (`efficient-tenderness`) |
| **Database** | MongoDB (Railway plugin) | Collections: `arcade_scores`, `prize_distributions`, `reward_queue` |
| **Blockchain** | XRPL Mainnet via `xrpl.js` | $NUT token, blackholed issuer, 321B supply |
| **Auth** | Xaman (Xumm), GemWallet, Crossmark | Client-side wallet connect, no server sessions |
| **DNS** | Porkbun | `fuzzynuts.xyz` → Vercel, `world.fuzzynuts.xyz` → Railway |

---

## 2. Game Registry

All 5 games are standalone HTML/JS/CSS apps served from `public/games/` as static files inside iframes:

| # | Slug | Title | Type | Engine | Size | Score Cap |
|---|------|-------|------|--------|------|-----------|
| 1 | `fuzzynuts-world` | Fuzzynuts World | MMORPG | Fuzzynuts World/uws | 8 KB (redirect stub) | 9,999,999 |
| 2 | `mario` | Super Fuzzynuts | Platformer | FullScreenMario | 11 MB | 99,999 |
| 3 | `fuzzy-survivors` | Fuzzy Survivors | Horde Survival | Canvas + JS modules | 464 KB | 999,999 |
| 4 | `minigolf` | Fuzzy Putt | Mini Golf | Emscripten WASM | 18 MB | 10,500 |
| 5 | `nut-racer` | Nut Racer | Racing | Canvas + JS | 288 KB | 99,999 |

### Score Pipeline

```
Game Page (iframe)
  └─ FuzzyScoreSubmit(game, score, duration)         [fuzzy-score.js]
       ├─ Client validation: cap, duration ≥ 15s, wallet connected
       ├─ POST world.fuzzynuts.xyz/api/scores         [Railway]
       │     └─ Server validation: caps, rate limit (5 min), ISO week key
       │     └─ MongoDB insert → arcade_scores
       ├─ postMessage → parent: { type: 'FUZZY_SCORE_SUBMITTED', success }
       │     └─ GameWrapper.tsx → toast notification
       └─ localStorage fallback if backend unreachable
```

### Communication Protocol (postMessage)

| Message | Direction | Purpose |
|---------|-----------|---------|
| `{ type: 'FUZZY_SCORE_SUBMITTED', success: bool }` | Game → Wrapper | Score submission result toast |
| `{ type: 'gameReady' }` | Game → Wrapper | Dismiss loading overlay (or 15s timeout) |
| `{ type: 'setMute', muted: bool }` | Wrapper → Game | Mute/unmute game audio |

---

## 3. Game Development Workflow

All game development happens in the **isolated parallel workspace** at `fuzzynuts-games-dev/`, never in the main Next.js project.

### Directory Relationship

```
FuzzyNuts Optimized/
├── fuzzynuts-optimized/                  ← PRODUCTION (read-only games)
│   └── public/games/<slug>/             ← Only populated via sync script
│
└── fuzzynuts-games-dev/                  ← DEVELOPMENT (edit here)
    ├── <slug>/                          ← Dev copy of each game
    ├── scripts/sync-to-main.sh          ← Safe sync (backup → rsync → build → rollback)
    ├── scripts/pull-from-main.sh        ← Reset from production baseline
    ├── shared/test-messages.html         ← postMessage debugger
    ├── Dockerfile + docker-compose.yml   ← Optional containerized dev
    └── package.json                     ← Per-game dev servers
```

### Workflow Commands

| Stage | Command | Details |
|-------|---------|---------|
| **1. Reset** | `npm run pull:mario` | Copy production → dev workspace |
| **2. Develop** | `npm run dev:mario` | Serve on `localhost:3001` |
| **3. Debug** | `npm run test:messages` | postMessage harness on `:3099` |
| **4. Sync** | `npm run sync:mario` | Backup → rsync → `npm run build` → auto-rollback |
| **5. Integrate** | `cd ../fuzzynuts-optimized && npm run dev` | Test in Next.js on `:3000` |
| **6. Deploy** | `git add -A && git commit && git push` | Vercel auto-deploys |

### Port Map

| Port | Service |
|------|---------|
| 3000 | Next.js dev server |
| 3001 | Mario |
| 3002 | Fuzzy Survivors |
| 3003 | Minigolf |
| 3004 | Nut Racer |
| 3005 | Fuzzynuts World |
| 3099 | postMessage test harness |

### Docker (Optional)

```bash
cd fuzzynuts-games-dev/
docker compose up --build       # All games, ports 3001-3005 + 3099
docker compose run --service-ports app npm run dev:mario   # Single game
```

---

## 4. Deployment Checklist

### Order of Operations

> **Always deploy backend changes BEFORE frontend changes** that depend on them.

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│  1. BACKEND FIRST   │ ──→ │  2. FRONTEND SECOND │ ──→ │  3. SMOKE TEST  │
│  (Railway)          │     │  (Vercel)           │     │  (curl + browser)│
└─────────────────────┘     └─────────────────────┘     └─────────────────┘
```

### Backend (Railway)

```bash
cd "/home/jeetmachine/Documents/AI Tools/Fuzzynuts/fuzzynuts-world"
git add -A
git commit -m "feat: description"
git push origin develop
# Railway auto-detects → rebuilds in ~4 min
```

### Frontend (Vercel)

```bash
cd "/home/jeetmachine/Documents/AI Tools/FuzzyNuts Optimized/fuzzynuts-optimized"
npm run build                    # Verify 12/12 pages, 0 errors
git add -A
git commit -m "feat: description"
git push origin main
# Vercel auto-deploys
```

### Smoke Tests (Post-Deploy)

| Category | Test | Expected |
|----------|------|----------|
| **Frontend** | `curl -s -o /dev/null -w "%{http_code}" https://fuzzynuts.xyz` | `200` |
| **Frontend** | `curl -s -o /dev/null -w "%{http_code}" https://fuzzynuts.xyz/games/mario/` | `200` |
| **Frontend** | `curl -s -o /dev/null -w "%{http_code}" https://fuzzynuts.xyz/leaderboard/` | `200` |
| **Backend** | `curl https://world.fuzzynuts.xyz/` | `{"name":"Fuzzynuts World",...}` |
| **Backend** | `curl https://world.fuzzynuts.xyz/api/scores` | JSON array |
| **Integration** | Browser → `/games/mario/` → play → score submit | Toast: "Score saved!" |
| **Integration** | Browser → `/profile/` with wallet | Stats + ClaimRewards card |

### Rollback

| Layer | Method |
|-------|--------|
| **Frontend** | Vercel → Deployments → Promote previous build |
| **Backend** | `git revert HEAD && git push origin develop` or Railway → Redeploy previous |
| **Game assets** | Sync script auto-creates timestamped backups in `.backups/` |

---

## 5. Environment Variables

### Frontend (Vercel — baked at build time)

| Variable | Required | Default | Source |
|----------|----------|---------|--------|
| `NEXT_PUBLIC_XAMAN_API_KEY` | ✅ | — | [apps.xaman.dev](https://apps.xaman.dev) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://fuzzynuts.xyz` | — |
| `NEXT_PUBLIC_XRPL_NODE` | Optional | `wss://xrplcluster.com` | — |
| `NEXT_PUBLIC_NUT_ISSUER` | Optional | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` | Blackholed issuer |
| `NEXT_PUBLIC_NUT_DISTRIBUTOR` | Optional | `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh` | LP provider |
| `NEXT_PUBLIC_NUT_AMM_POOL` | Optional | `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg` | NUT/XRP pool |

> **Note:** The API URL (`world.fuzzynuts.xyz`) is currently hardcoded in components, not via env var. See `PRODUCTION_ENV.md` for migration notes.

### Backend (Railway — runtime)

| Variable | Required | Purpose |
|----------|----------|---------|
| `COMMUNITY_NUT_JAR_SEED` | **⚠️ CRITICAL** | XRPL family seed for prize payouts |
| `ACCEPT_LICENSE` | ✅ | Fuzzynuts World license (`true`) |
| `NAME` | ✅ | Server display name (`Fuzzynuts World`) |
| `HOST` | ✅ | Bind address (`0.0.0.0`) |
| `PORT` | ✅ | WebSocket port (`9001`) |
| `API_PORT` | ✅ | REST API port (`9002`) |
| `API_ENABLED` | ✅ | Enable REST endpoints (`true`) |
| `MONGO_URL` | ✅ | `${{MongoDB.MONGO_URL}}` (Railway reference) |
| `MONGODB_DATABASE` | ✅ | Database name (`fuzzynuts_world`) |
| `SSL` | ✅ | TLS enabled (`true`) |
| `CLIENT_REMOTE_HOST` | ✅ | Client target (`world.fuzzynuts.xyz`) |
| `MAX_PLAYERS` | Optional | Default `100` |
| `NODE_OPTIONS` | Optional | Memory (`--max-old-space-size=1024`) |

> **⚠️ COMMUNITY_NUT_JAR_SEED** is the XRPL secret key for the Community Nut Jar wallet. Set ONLY in Railway's encrypted Variables tab. Never commit to code. The Rewards API returns `503` if missing.

---

## 6. XRPL Token Details

| Property | Value |
|----------|-------|
| **Currency** | `NUT` |
| **Network** | XRPL Mainnet |
| **Total Supply** | 321,000,000,000 (321B) |
| **Supply Status** | PERMANENTLY LOCKED (blackholed issuer) |
| **Trading Fee** | 1% |
| **Tokenomics** | 80% AMM / 18% Community Nut Jar / 2% Founder |

### Wallet Architecture

| Role | Address | Status |
|------|---------|--------|
| **Issuer** | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` | 💀 Blackholed — no key exists |
| **Distributor** | `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh` | Active — LP provider |
| **AMM Pool** | `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg` | NUT/XRP liquidity |
| **Community Nut Jar** | *(seed in Railway vault)* | Prize payouts — 18% allocation (~57.78B NUT) |

### Prize Distribution

- **500K $NUT/week** to top 3 combined leaderboard scores
- 1st: 250K | 2nd: 150K | 3rd: 100K
- Distributed via CLI: `node scripts/distribute-prizes.js --live`
- Week cycle: ISO 8601, resets Monday 00:00 UTC

---

## 7. Security Posture

| Control | Implementation |
|---------|---------------|
| **XRPL seed isolation** | `COMMUNITY_NUT_JAR_SEED` only in Railway encrypted vars |
| **Score anti-cheat** | Per-game caps, 15s minimum play, 5-min rate limit, wallet binding |
| **CORS** | `fuzzynuts.xyz` and `world.fuzzynuts.xyz` allowed |
| **HTTP headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` via `vercel.json` |
| **Cache policy** | Static assets: `max-age=31536000, immutable` |
| **Iframe sandbox** | `allow-scripts allow-same-origin allow-popups allow-forms` |
| **MongoDB access** | Railway internal network only |
| **Double-claim prevention** | Atomic `prize_distributions` collection with unique wallet+weekKey |

### Known Limitations

1. Scores are client-submitted — no server-side replay validation
2. Prize distribution is manual CLI — cron automation deferred
3. No wallet signature verification on score POST
4. Anti-cheat is deterrent-level, not cryptographic
5. XRPL Meta domain issue — Issuer blackholed before Domain field set

---

## 8. Current Build Output

```
Next.js 15.5.18 — Build verified May 16, 2026

Route (app)                                 Size  First Load JS
┌ ○ /                                    27.1 kB         180 kB
├ ○ /_not-found                             1 kB         104 kB
├ ● /games/[slug]                        6.94 kB         151 kB
├   ├ /games/fuzzynuts-world
├   ├ /games/mario
├   ├ /games/fuzzy-survivors
├   └ [+2 more paths]
├ ○ /leaderboard                         1.43 kB         154 kB
└ ○ /profile                             1.43 kB         154 kB
+ First Load JS shared by all             103 kB

○  (Static)  prerendered as static content
●  (SSG)     prerendered as static HTML (uses generateStaticParams)
```

---

## 9. Future Roadmap

Prioritized by impact and dependency order:

### Phase 1: Analytics & Observability (Next)

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Vercel Analytics integration | 🔴 High | 1 hour | `@vercel/analytics` — page views, Web Vitals |
| Score submission logging | 🔴 High | 2 hours | Server-side structured logs for debugging |
| Uptime monitoring | 🟡 Medium | 30 min | Railway health checks, external pinger |
| Error tracking (Sentry/LogRocket) | 🟡 Medium | 2 hours | Client-side error capture |

### Phase 2: Social & Community

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Score sharing (X/Twitter cards) | 🔴 High | 3 hours | OG images with dynamic score data |
| Referral system | 🟡 Medium | 1 day | Invite link → bonus NUT on first score |
| Telegram bot notifications | 🟡 Medium | 4 hours | Weekly leaderboard announcement |
| Discord bot integration | 🟢 Low | 1 day | Fuzzynuts World `DISCORD_ENABLED=true` |

### Phase 3: Achievements & Rewards

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Automated weekly prize distribution | 🔴 High | 4 hours | Cron job or Railway scheduled task |
| Achievement system (Fuzzynuts World server) | 🟡 Medium | 1 week | `queueNutReward()` hooks for quests/skills |
| Achievement badges UI | 🟡 Medium | 2 days | Profile page achievement cards |
| Wallet signature on score POST | 🟡 Medium | 1 day | Xaman sign-in-to-submit flow |

### Phase 4: New Games & Platform Growth

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Nut Racer launch (currently "Coming Soon") | 🔴 High | 2 days | Game is built, needs integration testing |
| New game: puzzle/match-3 genre | 🟢 Low | 2 weeks | Broadens audience beyond action games |
| Multi-game tournaments | 🟢 Low | 1 week | Combined score events across all games |
| Mobile PWA improvements | 🟡 Medium | 3 days | Install prompt, offline caching |

### Deferred Items

| Item | Reason | Ref |
|------|--------|-----|
| $NUT V2 token reissue | V1 used as testbed first | `fuzzynuts-v2-reissue-plan` KI |
| XRPL Meta domain fix | Requires @xrplmeta manual intervention | `fuzzynuts-xrpl-meta-issue` KI |
| Server-side replay validation | Requires game engine instrumentation | Security known limitation |
| `NEXT_PUBLIC_API_URL` env var | Currently hardcoded, works fine | `PRODUCTION_ENV.md` |

---

## 10. Documentation Map

| Document | Location | Purpose |
|----------|----------|---------|
| **ARCADE_FOUNDATION_COMPLETE** | `docs/` (this file) | Canonical architecture and status reference |
| **NEW_GAME_INTEGRATION_GUIDE** | `docs/NEW_GAME_INTEGRATION_GUIDE.md` | Step-by-step playbook for adding game #6+ |
| **PROJECT_STRUCTURE** | `docs/PROJECT_STRUCTURE.md` | File layout, conventions, component registry |
| **DEPLOY_STEPS** | `docs/DEPLOY_STEPS.md` | Step-by-step deployment playbook |
| **PRODUCTION_ENV** | `docs/PRODUCTION_ENV.md` | All environment variables with security notes |
| **fuzzynuts_handoff** | `docs/fuzzynuts_handoff.md` | Full project context, credentials, history |
| **Game Dev README** | `../fuzzynuts-games-dev/README.md` | Isolated workspace workflow, postMessage contract |

---

*Foundation complete. Ship the nuts.* 🐿️🥜
