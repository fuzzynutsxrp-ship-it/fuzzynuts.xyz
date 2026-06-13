# 🚀 Deployment Steps — Fuzzynuts Arcade

> **Last Updated:** May 18, 2026
> **Frontend:** Next.js 15 Static Export → Vercel
> **Backend:** Fuzzynuts World Server (Node.js + µWebSockets + MongoDB) → Railway

---

## Pre-Flight Checklist

- [x] Frontend build passes: `npm run build` → 0 errors, 13 pages generated
- [x] Backend `rewards.ts` is committed to the Fuzzynuts World repo at `packages/server/src/api/rewards.ts`
- [x] Routes registered in `packages/server/src/network/sockets/uws.ts` (eligibility, claim, claim/status, health)
- [x] `COMMUNITY_NUT_JAR_SEED` is set on Railway (confirmed via health check: `seedConfigured: true`)
- [x] `xrpl` package is in the backend's dependencies (`^4.6.0`)
- [x] CORS headers allow `*` origins
- [x] Health check endpoint: `GET /api/rewards/health`
- [x] Claim status polling: `GET /api/rewards/claim/status`

---

## Phase 1: Backend — Deploy Rewards API to Railway

### Step 1: Copy the Rewards API to the Backend Repo

The rewards route file (`scripts/rewards-api.js`) was built against the Express pattern.
**However**, the Fuzzynuts World backend uses **µWebSockets (uws)**, not Express.

The file must be adapted to the uws handler pattern used by `scores.ts`:

```bash
# The backend repo is at:
cd "/home/jeetmachine/Documents/AI Tools/Fuzzynuts/fuzzynuts-world"

# The rewards API should be created at:
# packages/server/src/api/rewards.ts
#
# It should follow the same class pattern as:
# packages/server/src/api/scores.ts
#
# Use scripts/rewards-api.js as the LOGIC REFERENCE
# but adapt the HTTP handling to uws (HttpResponse, HttpRequest)
```

### Step 2: Register Routes in µWebSockets

Edit `packages/server/src/network/sockets/uws.ts`:

```typescript
// Add import at the top (next to ScoresAPI import):
import RewardsAPI from '../../api/rewards';

// In the constructor, after ScoresAPI initialization:
private rewardsAPI?: RewardsAPI;

// In constructor body, after scoresAPI init:
if (db) {
    this.rewardsAPI = new RewardsAPI(db);
    log.info('[UWS] Rewards API routes registered at /api/rewards');
}

// Register routes (after /api/scores routes):
app.get('/api/rewards/eligibility', (res, req) => {
    if (this.rewardsAPI) this.rewardsAPI.handleEligibility(res, req);
    else { /* 503 response */ }
});

app.post('/api/rewards/claim', (res, req) => {
    if (this.rewardsAPI) this.rewardsAPI.handleClaim(res, req);
    else { /* 503 response */ }
});

app.options('/api/rewards/*', (res) => {
    res.writeHeader('Access-Control-Allow-Origin', '*');
    res.writeHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.writeHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
});
```

### Step 3: Install xrpl Dependency

```bash
cd "/home/jeetmachine/Documents/AI Tools/Fuzzynuts/fuzzynuts-world"

# Add xrpl to the server package
yarn workspace @kaetram/server add xrpl
```

### Step 4: Set Environment Variable on Railway

```
Railway Dashboard → "efficient-tenderness" → Fuzzynuts World service → Variables

Add:  COMMUNITY_NUT_JAR_SEED = <your distributor wallet seed>
```

> [!CAUTION]
> Do NOT skip this step. The claim endpoint returns `503` without this variable.

### Step 5: Push to Railway

```bash
cd "/home/jeetmachine/Documents/AI Tools/Fuzzynuts/fuzzynuts-world"

git add -A
git commit -m "feat: add rewards eligibility and claim API endpoints"
git push origin develop

# Railway auto-detects push → rebuilds in ~4 minutes
# Monitor: Railway dashboard → Fuzzynuts World service → Deployments
```

---

## Phase 2: Frontend — Deploy to Vercel

### Step 1: Verify Build

```bash
cd "/home/jeetmachine/Documents/AI Tools/FuzzyNuts Optimized/fuzzynuts-optimized"

npm run build
# Expected: 0 errors, "✓ Exporting (2/2)"
# Generates out/ directory (~39MB with games)
```

**Current Build Output (verified May 14, 2026):**

```
Route (app)                         Size  First Load JS
┌ ○ /                            37.1 kB         193 kB
├ ○ /_not-found                      0 B         115 kB
├ ● /games/[slug]                7.45 kB         163 kB
├   ├ /games/fuzzynuts-world
├   ├ /games/mario
├   ├ /games/fuzzy-survivors
├   └ [+2 more paths]
├ ○ /leaderboard                 2.47 kB         167 kB
└ ○ /profile                     2.46 kB         167 kB
+ First Load JS shared by all     124 kB

Exit code: 0
```

### Step 2: Push to GitHub

```bash
cd "/home/jeetmachine/Documents/AI Tools/FuzzyNuts Optimized/fuzzynuts-optimized"

git init  # (if not already a git repo)
git remote add origin git@github.com:fuzzynutsxrp-ship-it/fuzzynuts-optimized.git
git add -A
git commit -m "feat: complete arcade with profile, rewards, leaderboard"
git push -u origin main
```

### Step 3: Connect to Vercel

```
1. Go to https://vercel.com/dashboard
2. Click "Add New → Project"
3. Import from GitHub: fuzzynutsxrp-ship-it/fuzzynuts-optimized
4. Settings:
   - Framework: Next.js
   - Build Command: npm run build
   - Output Directory: out
   - Node.js: 20.x
5. Click "Deploy"
```

### Step 4: Configure Custom Domain

```
Vercel → Project Settings → Domains

Add: fuzzynuts.xyz
Add: www.fuzzynuts.xyz

DNS (Porkbun):
  Type: CNAME
  Host: @  (or www)
  Target: cname.vercel-dns.com
```

---

## Phase 3: Smoke Tests

Run these checks after both deploys complete:

### Frontend Tests

| Test                | URL                                    | Expected                   |
| ------------------- | -------------------------------------- | -------------------------- |
| Homepage            | `https://fuzzynuts.xyz`                | Hero + games section loads |
| Leaderboard         | `https://fuzzynuts.xyz/leaderboard/`   | Tab UI with scores         |
| Profile (no wallet) | `https://fuzzynuts.xyz/profile/`       | "Connect Wallet" prompt    |
| Game page           | `https://fuzzynuts.xyz/games/mario/`   | Mario iframe loads         |
| Litepaper           | `https://fuzzynuts.xyz/litepaper.html` | Static HTML renders        |
| 404 page            | `https://fuzzynuts.xyz/nonexistent/`   | Custom 404                 |
| Robots.txt          | `https://fuzzynuts.xyz/robots.txt`     | Sitemap reference          |

### Backend Tests

| Test                | Command                                                                                  | Expected                                |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| Health check        | `curl https://world.fuzzynuts.xyz/`                                                      | `{"name":"Fuzzynuts World",...}`        |
| Scores GET          | `curl "https://world.fuzzynuts.xyz/api/scores"`                                          | JSON array of scores                    |
| Rewards eligibility | `curl "https://world.fuzzynuts.xyz/api/rewards/eligibility?wallet=rTestAddress123"`      | `{"eligible":false,...}`                |
| Rewards health      | `curl "https://world.fuzzynuts.xyz/api/rewards/health"`                                  | `{"ok":true,"mongoConnected":true,...}` |
| Claim status        | `curl "https://world.fuzzynuts.xyz/api/rewards/claim/status?wallet=rTest&week=2026-W20"` | `{"status":"not_found",...}`            |
| CORS preflight      | `curl -X OPTIONS https://world.fuzzynuts.xyz/api/rewards/eligibility -I`                 | `Access-Control-Allow-Origin: *`        |

### Integration Tests

| Test               | Steps                              | Expected                            |
| ------------------ | ---------------------------------- | ----------------------------------- |
| Wallet connect     | Click Xaman → approve              | Navbar shows truncated address      |
| Profile loads      | Navigate to /profile/              | Stats cards + ClaimRewards card     |
| Score submission   | Play Mario → score > 0             | Toast: "Score saved to leaderboard" |
| Leaderboard update | Submit score → check /leaderboard/ | New score appears                   |

---

## Rollback Procedures

### Frontend Rollback

```
Vercel Dashboard → Deployments → Click previous deployment → "Promote to Production"
```

### Backend Rollback

```bash
# Option A: Revert commit and push
cd "/home/jeetmachine/Documents/AI Tools/Fuzzynuts/fuzzynuts-world"
git revert HEAD
git push origin develop

# Option B: Railway dashboard → Deployments → Redeploy previous
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    USERS                             │
│              fuzzynuts.xyz (Vercel)                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Homepage │  │ Leaderboard │  │   Profile    │  │
│  │  (SSG)   │  │   (Client)  │  │  (Client)    │  │
│  └──────────┘  └──────┬──────┘  └──────┬───────┘  │
│                       │                │           │
│                       │   GET /api/scores          │
│                       │   GET /api/rewards/elig.   │
│                       │   POST /api/rewards/claim  │
│                       ▼                ▼           │
├─────────────────────────────────────────────────────┤
│          world.fuzzynuts.xyz (Railway)               │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Fuzzynuts World Server (Node.js + uws)       │  │
│  │                                              │  │
│  │  Port 9001: Game WebSocket (WSS)            │  │
│  │  Port 9002: REST API (Express)              │  │
│  │    ├── GET/POST /api/scores                 │  │
│  │    ├── GET /api/rewards/eligibility         │  │
│  │    ├── POST /api/rewards/claim              │  │
│  │    ├── GET /api/rewards/claim/status        │  │
│  │    └── GET /api/rewards/health              │  │
│  │              │                   │          │  │
│  │              ▼                   ▼          │  │
│  │    ┌──────────────┐    ┌──────────────┐    │  │
│  │    │   MongoDB    │    │  XRPL Mainnet │    │  │
│  │    │ (Railway DB) │    │  (xrpl.js)   │    │  │
│  │    └──────────────┘    └──────────────┘    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Post-Deploy Monitoring

| What              | Where                                                          |
| ----------------- | -------------------------------------------------------------- |
| Frontend errors   | Vercel → Analytics / Functions                                 |
| Backend logs      | Railway → Fuzzynuts World → Logs                               |
| MongoDB metrics   | Railway → MongoDB → Metrics                                    |
| XRPL transactions | https://xrpscan.com/account/rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh |
| Uptime            | Railway Dashboard → Service health                             |
