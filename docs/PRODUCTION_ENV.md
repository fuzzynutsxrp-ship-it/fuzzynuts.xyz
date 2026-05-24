# 🔐 Production Environment Variables

> **Last Updated:** May 18, 2026
> **Project:** Fuzzynuts Arcade — Full Stack Deployment

---

## Frontend — Vercel

The frontend is a **static export** (`output: "export"`). It has **no server-side runtime**, so environment variables are baked in at build time.

| Variable | Required | Value | Notes |
|----------|----------|-------|-------|
| `NEXT_PUBLIC_XAMAN_API_KEY` | **✅** | UUID from xaman.dev | Xaman (Xumm) OAuth2 PKCE API key. Without it, the Xaman connect button surfaces a "not configured" error. |
| `NEXT_PUBLIC_PROJECT_ID` | **✅** | Reown Cloud project ID | WalletConnect v2 project ID for Joey Wallet. Free signup at `https://cloud.reown.com`. Without it, the JoeyProvider silently no-ops and Joey connect surfaces an "initializing" error. |
| `NEXT_PUBLIC_SITE_URL` | optional | `https://fuzzynuts.xyz` | Used for WalletConnect `metadata.url` + iOS `redirect.universal` deep-link return. Defaults to the production URL. |
| `SITE_LOCKDOWN_PASSWORD` | **✅** (staging) | any string | HTTP Basic Auth password enforced by `src/middleware.ts`. Without it the site returns 503 fail-closed. Remove on public launch. |

> [!NOTE]
> If you later want to make the API URL configurable, add `NEXT_PUBLIC_API_URL` to Vercel's project settings. Then update `ClaimRewards.tsx`, `UserProfile.tsx`, and `Leaderboard.tsx` to use `process.env.NEXT_PUBLIC_API_URL` instead of the hardcoded base URL. The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

> [!IMPORTANT]
> **Wallet support is intentionally limited to Xaman + Joey.** GemWallet and Crossmark were removed during the wallet rewrite. Re-adding either is a deliberate scope change, not a config flip.

### Vercel Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `out` |
| **Node.js Version** | 20.x |
| **Root Directory** | `.` (project root) |

---

## Backend — Railway (Fuzzynuts World Server)

These are set in the Railway dashboard under **Fuzzynuts World service → Variables tab**.

### Existing Variables (already configured)

| Variable | Value | Purpose |
|----------|-------|---------|
| `ACCEPT_LICENSE` | `true` | Fuzzynuts World license acceptance |
| `NAME` | `Fuzzynuts World` | Server display name |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `9001` | Game WebSocket port |
| `SSL` | `true` | TLS enabled |
| `CLIENT_REMOTE_HOST` | `world.fuzzynuts.xyz` | Client connection target |
| `MAX_PLAYERS` | `100` | Max concurrent players |
| `SKIP_DATABASE` | `false` | Database required |
| `DATABASE` | `mongodb` | Database type |
| `MONGO_URL` | `${{MongoDB.MONGO_URL}}` | Railway reference syntax (auto-resolves) |
| `MONGODB_DATABASE` | `fuzzynuts_world` | Database name |
| `API_ENABLED` | `true` | REST API active |
| `API_PORT` | `9002` | REST API port |
| `HUB_ENABLED` | `false` | Multi-server hub |
| `DISCORD_ENABLED` | `false` | Discord bot |
| `TUTORIAL_ENABLED` | `false` | In-game tutorial |
| `DEBUGGING` | `false` | Debug logs |
| `GVER` | `1.0.0-fuzzynuts` | Game version |
| `NODE_OPTIONS` | `--max-old-space-size=1024` | Memory limit |

### 🆕 New Variable Required for Rewards API

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `COMMUNITY_NUT_JAR_SEED` | **✅ CRITICAL** | `sEdV...` (XRPL family seed) | Distributor wallet secret for prize payouts |

> [!CAUTION]
> **`COMMUNITY_NUT_JAR_SEED` is the XRPL secret key for the Community Nut Jar wallet.**
> - This wallet holds the 18% community allocation (~57.78B $NUT).
> - **NEVER** commit this seed to source code, `.env` files, or logs.
> - Set it **exclusively** in Railway's encrypted Variables tab.
> - The Rewards API will return `503 Service Unavailable` if this variable is missing, preventing any prize distribution.
> - This is the **Distributor/Community wallet**, NOT the Issuer wallet (which is blackholed and has no seed).

### How to Set on Railway

```
1. Go to https://railway.app
2. Open project "efficient-tenderness"
3. Click the "Fuzzynuts World" service
4. Go to "Variables" tab
5. Click "+ New Variable"
6. Name:  COMMUNITY_NUT_JAR_SEED
7. Value: <paste the family seed from your secure vault>
8. Click "Add" → Railway will trigger a redeploy
```

---

## MongoDB Collections

These collections are used by the rewards system (auto-created on first write):

| Collection | Purpose | Created By |
|------------|---------|------------|
| `arcade_scores` | Weekly game scores (wallet, game, score, weekKey) | `scores.ts` (POST /api/scores) |
| `prize_distributions` | Claim records (prevents double-claiming) | `rewards-api` (POST /api/rewards/claim) |
| `reward_queue` | Achievement reward queue | `distribute-achievements.js` |

---

## XRPL Network Configuration

| Setting | Value |
|---------|-------|
| **Network** | XRPL Mainnet |
| **WebSocket** | `wss://xrplcluster.com` |
| **Token** | `NUT` |
| **Issuer** | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` (blackholed) |
| **Explorer** | `https://xrpscan.com/tx/<hash>` |

---

## Security Checklist

- [ ] `COMMUNITY_NUT_JAR_SEED` is set on Railway (never in code)
- [x] CORS allows all origins (`*`) for API endpoints
- [x] Rate limiting is active on `/api/scores` POST (1 req/min per wallet+game)
- [x] Rate limiting is active on `/api/rewards/claim` POST (30s between attempts)
- [x] Anti-cheat score caps are enforced server-side
- [ ] MongoDB is accessible only via Railway's internal network
- [ ] `MONGO_URL` uses Railway reference syntax (`${{MongoDB.MONGO_URL}}`)

---

## API Endpoint Reference

### Scores API (port 9001 — µWebSockets)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scores` | GET | Fetch leaderboard (query: `?week=2026-W20&game=mario`) |
| `/api/scores` | POST | Submit a score (body: `{ game, score, wallet, timestamp }`) |

### Rewards API (port 9001 — µWebSockets)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rewards/eligibility` | GET | Check top-3 eligibility (query: `?wallet=rXXX&week=2026-W20`) |
| `/api/rewards/claim` | POST | Execute prize claim (body: `{ wallet, week }`) |
| `/api/rewards/claim/status` | GET | Poll claim transaction status (query: `?wallet=rXXX&week=2026-W20`) |
| `/api/rewards/health` | GET | Service health check (MongoDB + XRPL connectivity) |
| `/api/rewards` | GET | Achievement rewards for a wallet (query: `?wallet=rXXX`) |

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://world.fuzzynuts.xyz` |
| Railway Internal | `efficient-tenderness-production.up.railway.app` |
