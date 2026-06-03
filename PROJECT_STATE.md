# FuzzyNuts Project State
Last updated: 2026-06-03
Current focus: Get Railway Express API running (requires dashboard rebuild)

## Done
- API routes: `POST /api/rsc/claim-username`, `GET /api/rsc/credentials` (MongoDB + AES-256-GCM)
- Wallet auth JWT middleware (`walletAuth.ts`)
- Server mounts RSC routes at `/api/rsc` gated by wallet JWT
- Vercel rewrite: `/api/rsc/*` → Railway Express API
- TeaVM patch script (`tools/patch-rsc-teavm-client.sh`)
- RSC landing page with wallet connect flow, claim modal, iframe launcher
- `server.ts` resilient to missing env vars (no crash on startup)
- Router imports wrapped in try/catch (broken deps don't kill process)

## In Progress
- Railway deploy needs fresh build via dashboard (API can't force rebuild)

## Blocked / Next
- Railway `fuzzynuts.xyz`: click Redeploy in dashboard to pick up latest code
- `cooperative-caring` service: delete via dashboard (duplicate, wrong config)
- Run TeaVM patch on VPS (curl one-liner)
- End-to-end test: wallet connect → claim username → auto-login

## Manual Steps Pending (for me)
1. Railway dashboard → fuzzynuts.xyz → Deployments → Redeploy button
2. Railway dashboard → cooperative-caring → Settings → Delete Service
3. Verify env vars: WALLET_JWT_SECRET, GAME_SESSION_SECRET, MONGODB_URI, RSC_PASSWORD_SECRET

## Key File Map
- `apps/api/src/server.ts` — Express bootstrap, lazy-loaded routers, graceful degradation
- `apps/api/src/routes/rsc.ts` — wallet-to-username mapping + credential endpoints
- `apps/api/src/middleware/walletAuth.ts` — JWT cookie verification
- `apps/api/Dockerfile` — Docker build for Railway
- `apps/web-arcade/public/games/rsc/index.html` — RSC landing + wallet flow + iframe
- `apps/web-arcade/vercel.json` — rewrites /api/rsc/* to Railway
- `tools/patch-rsc-teavm-client.sh` — VPS script for TeaVM auto-login injection
- `docs/FIX_RAILWAY_CRASH.md` — diagnosis and fix instructions
