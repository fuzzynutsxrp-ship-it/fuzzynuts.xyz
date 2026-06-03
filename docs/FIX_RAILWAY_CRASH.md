# Fix: Railway Express API Crash

## What Was Wrong

The Railway service `fuzzynuts.xyz` was crashing on every deploy with empty deploy logs. Two issues:

1. **Dockerfile builder + env vars**: When Railway uses a Dockerfile, env vars set in the Railway dashboard are NOT injected into the container at runtime. The `required()` function in `server.ts` threw immediately on missing vars, crashing the process before any output.

2. **Empty startCommand override**: The service had `startCommand: ""` set via the API, which overrides the Dockerfile's CMD. An empty command causes the container to exit immediately.

## What Was Fixed

### Code Change (apps/api/src/server.ts)
- Replaced `required()` with `optionalEnv()` — logs a warning instead of throwing
- Server starts even if env vars are missing
- Routes return 503 if their required vars are absent
- Health endpoint shows which env vars are available

### Railway Config Change
- Set `startCommand` to `npx tsx apps/api/src/server.ts` via API

## Manual Steps: Verify Env Vars in Railway Dashboard

1. Go to [railway.com](https://railway.com) → **brilliant-nurturing** project
2. Click **fuzzynuts.xyz** service
3. Click **Variables** tab
4. Verify these are set (non-empty):
   - `WALLET_JWT_SECRET` — any random string (e.g. `openssl rand -hex 32`)
   - `GAME_SESSION_SECRET` — any random string
   - `MONGODB_URI` — should be `${{MongoDB.MONGO_URL}}` (auto-resolves)
   - `RSC_PASSWORD_SECRET` — any 64-char hex string (e.g. `openssl rand -hex 32`)
5. If any are missing, click **+ New Variable** and add them

## Manual Steps: Delete Duplicate Service

The `cooperative-caring` service is a duplicate Express API with wrong config (RAILPACK + Dockerfile.api). Delete it:

1. Go to **brilliant-nurturing** project
2. Click **cooperative-caring** in the sidebar
3. Click **Settings** (gear icon)
4. Scroll to bottom → **Delete Service**
5. Type the service name to confirm → click **Delete**

## How to Test

After deploy succeeds:
```bash
# Health check (should return ok:true with env status)
curl https://fuzzynutsxyz-production.up.railway.app/healthz

# Test RSC credentials endpoint (should return 401, not 503)
curl https://fuzzynutsxyz-production.up.railway.app/api/rsc/credentials
```

If healthz shows `env: { WALLET_JWT_SECRET: false, ... }`, the env vars aren't reaching the container — check Railway dashboard Variables tab.
