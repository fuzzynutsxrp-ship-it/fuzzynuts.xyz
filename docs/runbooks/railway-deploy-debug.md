# Railway Deploy Debug Guide

## Git Status (Verified)

- Branch: `main`
- Remote: `origin` → `https://github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz.git`
- Latest commit: `793539e` — "fix: add railway.toml to point Railway to apps/api directory (start: pnpm start)"
- Working tree: clean, all commits pushed

Railway should be watching the `main` branch of `fuzzynutsxrp-ship-it/fuzzynuts.xyz`.

## Why Railway Might Not Auto-Deploy

Railway only auto-deploys when:
1. It's connected to the correct repo AND branch
2. Auto-deploy is enabled in project settings
3. The push event reaches Railway (GitHub webhook)

If any of those are broken, no deployment starts.

## Step 1: Check Railway Source Connection

1. Go to [railway.app](https://railway.app) → your project
2. Click the **Settings** tab
3. Scroll to **Source** section
4. Confirm it says: **Connected to fuzzynutsxrp-ship-it/fuzzynuts.xyz**
5. Check the **Branch** field — it MUST say `main`
6. If it says a different branch (like `master` or `develop`):
   - Click **Connect Branch** → select `main` → save

## Step 2: Check Auto-Deploy Is On

1. Same Settings → Source section
2. Look for a toggle called **Auto Deploy** — make sure it's ON
3. If it's off, turn it on and save

## Step 3: Manually Trigger a Deploy

If the connection looks correct but no deploy started:

1. Go to **Deployments** tab
2. Click the **⋮** (three dots) menu in the top right
3. Select **Deploy** → **Deploy Latest Commit**
4. A new deployment should appear within seconds

## Step 4: If Railway Shows "No Source Connected"

1. Go to Settings → Source
2. Click **Connect** next to your GitHub account
3. Select `fuzzynutsxrp-ship-it/fuzzynuts.xyz`
4. Select branch `main`
5. Save — Railway will auto-deploy

## Step 5: Watch the Deploy

Once a deployment starts:

1. Click on the deployment to see build logs
2. Look for: `@fuzzynuts/api listening on :XXXX`
3. If the build fails, the logs will show why (usually missing env vars)

## Required Railway Env Vars

Make sure these are set in Railway → Variables:

| Variable | Value |
|----------|-------|
| `GAME_SERVER_READY` | `true` |
| `GAME_SESSION_SECRET` | (your hex secret) |
| `WALLET_JWT_SECRET` | (your hex secret) |
| `OPENRSC_GAME_ENDPOINT` | `fuzzynuts.xyz:43594` |
| `XRPL_NETWORK` | `mainnet` |
| `MONGO_URL` | (your MongoDB connection string) |

## After Deploy Succeeds

Test the health check:
- Open `https://world.fuzzynuts.xyz/healthz` in your browser
- Should show: `{"ok":true}`

Then test the game flow:
- Go to `https://fuzzynuts.xyz/play/rsc/`
- Connect wallet → should see download card (no more "Failed to fetch")
