# FuzzyNuts Project State
Last updated: 2026-06-03
Current focus: End-to-end testing of RSC wallet auto-login flow

## Done
- API routes: `POST /api/rsc/claim-username`, `GET /api/rsc/credentials` (MongoDB + AES-256-GCM)
- RSC endpoints accept wallet address from request body (no JWT required for standalone page)
- XRPL address regex fixed (`a-km-z` not `a-k-z`)
- `server.ts` resilient to missing env vars, lazy-loaded routers with try/catch
- Railway Express API deployed and healthy (all 4 env vars present)
- Vercel rewrite: `/api/rsc/*` → Railway Express API
- RSC landing page reads wallet from localStorage (fallback from cookie)
- RSC landing page passes wallet address in API requests
- TeaVM classes.js patched on VPS (3 critical fixes: send(e), data.set)
- nginx reloaded on VPS to serve patched client
- VPS host key updated after rebuild

## In Progress
- User testing: wallet connect → claim username → auto-login into game

## Blocked / Next
- Delete `cooperative-caring` Railway service (duplicate, wrong config)
- Set real values for WALLET_JWT_SECRET and GAME_SESSION_SECRET (currently placeholders)
- Clean up test data in MongoDB (TestUser mapping)

## Manual Steps Pending (for me)
1. Railway dashboard → cooperative-caring → Settings → Delete Service
2. Set real WALLET_JWT_SECRET and GAME_SESSION_SECRET in Railway Variables

## Key File Map
- `apps/api/src/server.ts` — Express bootstrap, lazy-loaded routers, graceful degradation
- `apps/api/src/routes/rsc.ts` — wallet-to-username mapping + credential endpoints (accepts body address)
- `apps/web-arcade/public/games/rsc/index.html` — RSC landing + wallet flow + iframe
- `apps/web-arcade/vercel.json` — rewrites /api/rsc/* to Railway
- `Dockerfile.api` — Docker build for Railway (WORKDIR /app, tsx from source)
- `railway.toml` — Railway config (nixpacks builder, startCommand without cd)
- `tools/patch-rsc-teavm-client.sh` — VPS script for TeaVM auto-login injection
- `docs/FIX_RAILWAY_CRASH.md` — Railway crash diagnosis and fix
