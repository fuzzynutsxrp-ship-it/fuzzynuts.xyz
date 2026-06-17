# 🔐 Production Environment Variables

> **Last Updated:** May 26, 2026
> **Project:** Fuzzynuts Arcade — Full Stack Deployment

---

## Frontend — Vercel

The frontend is a **runtime build on Vercel** (`.next`), with **edge middleware active** (`src/middleware.ts` — the pre-launch Basic-Auth lockdown) — it is **NOT a static export**. `NEXT_PUBLIC_*` env vars are still baked in at build time (client-side), while server/edge vars (e.g. `SITE_LOCKDOWN_PASSWORD`) are read at request time by the middleware.

| Variable                     | Required  | Value  | Notes                                                                                                                                                       |
| ---------------------------- | --------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ALLOW_INDEXING` | At launch | `true` | **Launch switch.** Unset/`false` = `noindex` (pre-launch default). Set to `true` and redeploy to let search engines index the site. Baked in at build time. |
| _(others)_                   | —         | —      | API URL is hardcoded to `https://world.fuzzynuts.xyz` in components                                                                                         |

> [!NOTE]
> If you later want to make the API URL configurable, add `NEXT_PUBLIC_API_URL` to Vercel's project settings. Then update `ClaimRewards.tsx`, `UserProfile.tsx`, and `Leaderboard.tsx` to use `process.env.NEXT_PUBLIC_API_URL` instead of the hardcoded base URL. The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

### Vercel Project Settings

| Setting              | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| **Framework Preset** | Next.js                                                                      |
| **Build Command**    | `npm run build`                                                              |
| **Output Directory** | _(framework default — `.next`; do NOT set `out`, that's static-export only)_ |
| **Node.js Version**  | 20.x                                                                         |
| **Root Directory**   | `.` (project root)                                                           |

---

## Backend — Railway (Fuzzynuts World Server)

These are set in the Railway dashboard under **Fuzzynuts World service → Variables tab**.

### Existing Variables (already configured)

| Variable             | Value                       | Purpose                                  |
| -------------------- | --------------------------- | ---------------------------------------- |
| `ACCEPT_LICENSE`     | `true`                      | Fuzzynuts World license acceptance       |
| `NAME`               | `Fuzzynuts World`           | Server display name                      |
| `HOST`               | `0.0.0.0`                   | Bind address                             |
| `PORT`               | `9001`                      | Game WebSocket port                      |
| `SSL`                | `true`                      | TLS enabled                              |
| `CLIENT_REMOTE_HOST` | `world.fuzzynuts.xyz`       | Client connection target                 |
| `MAX_PLAYERS`        | `100`                       | Max concurrent players                   |
| `SKIP_DATABASE`      | `false`                     | Database required                        |
| `DATABASE`           | `mongodb`                   | Database type                            |
| `MONGO_URL`          | `${{MongoDB.MONGO_URL}}`    | Railway reference syntax (auto-resolves) |
| `MONGODB_DATABASE`   | `fuzzynuts_world`           | Database name                            |
| `API_ENABLED`        | `true`                      | REST API active                          |
| `API_PORT`           | `9002`                      | REST API port                            |
| `HUB_ENABLED`        | `false`                     | Multi-server hub                         |
| `DISCORD_ENABLED`    | `false`                     | Discord bot                              |
| `TUTORIAL_ENABLED`   | `false`                     | In-game tutorial                         |
| `DEBUGGING`          | `false`                     | Debug logs                               |
| `GVER`               | `1.0.0-fuzzynuts`           | Game version                             |
| `NODE_OPTIONS`       | `--max-old-space-size=1024` | Memory limit                             |

### 🆕 New Variable Required for Rewards API

| Variable                 | Required        | Example                      | Purpose                                     |
| ------------------------ | --------------- | ---------------------------- | ------------------------------------------- |
| `COMMUNITY_NUT_JAR_SEED` | **✅ CRITICAL** | `sEdV...` (XRPL family seed) | Distributor wallet secret for prize payouts |

> [!CAUTION]
> **`COMMUNITY_NUT_JAR_SEED` is the XRPL secret key for the Community Nut Jar wallet.**
>
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

## 🆕 Dynamic USD-Valued Rewards (May 2026)

Weekly prizes are announced in **USD** (1st $250 / 2nd $150 / 3rd $100). At the
Monday-UTC announcement the NUT/USD price is snapshotted **once** and the exact
NUT amounts for that week are stored. Eligibility and claims read those
pre-calculated amounts — **price is never fetched at claim time**.

### New Railway env vars (Rewards API)

| Variable                                              | Required                  | Default                                        | Purpose                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REWARDS_ADMIN_SECRET`                                | **✅ CRITICAL**           | _(none)_                                       | Shared secret for `POST /api/rewards/snapshot`. If unset, the snapshot endpoint returns 401 and no week can be announced.                                          |
| `PRIZE_USD_1` / `PRIZE_USD_2` / `PRIZE_USD_3`         | Optional                  | `250` / `150` / `100`                          | Announced USD value per tier.                                                                                                                                      |
| `MAX_WEEKLY_NUT_EMISSION`                             | Optional                  | `1000000`                                      | Soft cap on total NUT emitted per week (2× the legacy 500k). If USD tiers would exceed it, all tiers scale down proportionally and `cap_applied:true` is recorded. |
| `NUT_AMM_COUNTER_IS_XRP`                              | Optional                  | `true`                                         | `true` = NUT pool is paired with XRP (price = NUT/XRP × XRP/USD). `false` = NUT paired directly with a USD stable.                                                 |
| `NUT_AMM_COUNTER_CURRENCY` / `NUT_AMM_COUNTER_ISSUER` | If `…IS_XRP=false`        | _(none)_                                       | The USD-stable counter asset when NUT is not XRP-paired.                                                                                                           |
| `USD_REF_CURRENCY` / `USD_REF_ISSUER`                 | Optional                  | `RLUSD` / `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De` | On-chain XRP→USD reference AMM (only used when NUT is XRP-paired). Human codes like `RLUSD` are auto-encoded to their 160-bit hex form.                            |
| `NUT_USD_PRICE_FALLBACK`                              | **Recommended at launch** | _(none)_                                       | USD-per-NUT fallback used **only** if the on-chain AMM query fails. Without it, a failed snapshot throws.                                                          |
| `NUT_ISSUER` / `XRPL_SERVER`                          | Optional                  | `rpL6…xMP7` / `wss://xrplcluster.com`          | Overridable; defaults match production.                                                                                                                            |

### Announcement cron (every Monday 00:00 UTC)

A scheduler must call the snapshot endpoint once at each weekly reset:

```
curl -X POST https://world.fuzzynuts.xyz/api/rewards/snapshot \
  -H "x-admin-secret: $REWARDS_ADMIN_SECRET" \
  -H "content-type: application/json" -d '{}'
```

Run it once immediately at cutover to backfill the current week (otherwise
eligibility shows `announced:false` and claims return 409 "not announced yet").
Recommended: a Railway cron service or a scheduled GitHub Action.

> [!CAUTION]
> **On-chain price source not yet present (verified 2026-05-26 against mainnet).**
> `$NUT` is live and issued (~320B), but **no AMM pool was found for `NUT/XRP` or
> `NUT/RLUSD`**, and the configured AMM pool address `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg`
> returns `actNotFound`. Until the real NUT AMM (pair **and** pool account) is
> confirmed and `NUT_AMM_COUNTER_*` is set to match, the Monday snapshot's primary
> on-chain query will fail — so **set `NUT_USD_PRICE_FALLBACK` before announcing any
> week**, or the snapshot throws. (RLUSD currency-code encoding is already handled in code.)

---

## MongoDB Collections

These collections are used by the rewards system (auto-created on first write):

| Collection            | Purpose                                                                                                    | Created By                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `arcade_scores`       | Weekly game scores (wallet, game, score, weekKey)                                                          | `scores.ts` (POST /api/scores)             |
| `prize_distributions` | Claim records (prevents double-claiming)                                                                   | `rewards-api` (POST /api/rewards/claim)    |
| `weekly_prize_tiers`  | Per-week USD tiers + NUT/USD snapshot + calculated NUT amounts. Unique index on `weekKey` is auto-created. | `rewards-api` (POST /api/rewards/snapshot) |
| `reward_queue`        | Achievement reward queue                                                                                   | `distribute-achievements.js`               |

---

## XRPL Network Configuration

| Setting       | Value                                             |
| ------------- | ------------------------------------------------- |
| **Network**   | XRPL Mainnet                                      |
| **WebSocket** | `wss://xrplcluster.com`                           |
| **Token**     | `NUT`                                             |
| **Issuer**    | `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` (blackholed) |
| **Explorer**  | `https://xrpscan.com/tx/<hash>`                   |

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

| Endpoint      | Method | Purpose                                                     |
| ------------- | ------ | ----------------------------------------------------------- |
| `/api/scores` | GET    | Fetch leaderboard (query: `?week=2026-W20&game=mario`)      |
| `/api/scores` | POST   | Submit a score (body: `{ game, score, wallet, timestamp }`) |

### Rewards API (port 9001 — µWebSockets)

| Endpoint                    | Method | Purpose                                                                                          |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `/api/rewards/eligibility`  | GET    | Check top-3 eligibility (query: `?wallet=rXXX&week=2026-W20`)                                    |
| `/api/rewards/claim`        | POST   | Execute prize claim (body: `{ wallet, week }`)                                                   |
| `/api/rewards/claim/status` | GET    | Poll claim transaction status (query: `?wallet=rXXX&week=2026-W20`)                              |
| `/api/rewards/snapshot`     | POST   | **Admin** (`x-admin-secret`). Lock the week's NUT/USD price + amounts. Body: `{ week?, force? }` |
| `/api/rewards/tiers`        | GET    | Public weekly prize tiers (query: `?week=2026-W20`) — USD value + calculated NUT                 |
| `/api/rewards/health`       | GET    | Service health check (MongoDB + XRPL connectivity)                                               |
| `/api/rewards`              | GET    | Achievement rewards for a wallet (query: `?wallet=rXXX`)                                         |

### Base URLs

| Environment      | URL                                              |
| ---------------- | ------------------------------------------------ |
| Production       | `https://world.fuzzynuts.xyz`                    |
| Railway Internal | `efficient-tenderness-production.up.railway.app` |
