# Fix: Railway Express API Crash

## What Was Wrong

The Railway service `fuzzynuts.xyz` crashed on every deploy with empty deploy logs. Two issues:

1. **`required()` throws on startup**: The `server.ts` called `required()` for 4 env vars at module level. If any were missing, the process crashed before `app.listen()` — producing zero output.

2. **Railway caches Docker images aggressively**: `serviceInstanceDeploy` (the API mutation) only RESTARTS the cached container — it does NOT pull new code or rebuild. All deploys used the same cached image `sha256:54a6ecd...`.

## What Was Fixed in Code

### apps/api/src/server.ts

- Replaced `required()` with `optionalEnv()` — warns instead of throwing
- Wrapped router imports in `try/catch` — broken dependency (e.g. `xrpl` native addon) doesn't kill the process
- Server starts even if env vars are missing; affected routes return 503
- Health endpoint shows which env vars are available

## Manual Steps: Force Railway Rebuild

The API cannot force a fresh build. You MUST use the Railway dashboard:

1. Go to [railway.com](https://railway.com) → **brilliant-nurturing** project
2. Click **fuzzynuts.xyz** service in the sidebar
3. Click the **Settings** tab (gear icon)
4. Find **Environment** section → click **Variables** tab
5. Verify these env vars are set (non-empty):
   - `WALLET_JWT_SECRET` — any random string
   - `GAME_SESSION_SECRET` — any random string
   - `MONGODB_URI` — set to `${{MongoDB.MONGO_URL}}`
   - `RSC_PASSWORD_SECRET` — any 64-char hex string
6. Click the **Deployments** tab
7. Click the **Redeploy** button (forces a FRESH build from latest git commit)
8. Wait 2-3 minutes for build + deploy
9. Check the deploy logs — you should now see output from the server

## Manual Steps: Delete Duplicate Service

The `cooperative-caring` service is a duplicate with wrong config:

1. In **brilliant-nurturing** project, click **cooperative-caring** in sidebar
2. Click **Settings** (gear icon)
3. Scroll to bottom → **Delete Service**
4. Type the service name to confirm → **Delete**

## How to Test

After a successful deploy:

```bash
# Health check (should show env status)
curl https://fuzzynutsxyz-production.up.railway.app/healthz

# RSC endpoint (should return 401, not 503)
curl https://fuzzynutsxyz-production.up.railway.app/api/rsc/credentials
```

If healthz shows `env: { WALLET_JWT_SECRET: false, ... }`, the env vars aren't reaching the container — check the Variables tab in Railway.
