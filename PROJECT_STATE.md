# FuzzyNuts Project State
Last updated: 2026-06-02
Current focus: Get RSC wallet auto-login working end-to-end (Express API crashing on Railway)

## Done
- API routes: `POST /api/rsc/claim-username`, `GET /api/rsc/credentials` (MongoDB + AES-256-GCM)
- Wallet auth JWT middleware (`walletAuth.ts`)
- Server mounts RSC routes at `/api/rsc` gated by wallet JWT
- Vercel rewrite: `/api/rsc/*` → Railway Express API
- TeaVM patch script (`tools/patch-rsc-teavm-client.sh`) — JS injection, no Java rebuild
- RSC landing page with wallet connect flow, claim modal, iframe launcher

## In Progress
- Fix Railway Express API container crash (env vars not injecting into Docker build)

## Blocked / Next
- Railway `fuzzynuts.xyz` service: build succeeds, deploy crashes — likely `required()` throws on missing env vars inside Docker container
- `cooperative-caring` service: duplicate Express API, RAILPACK + Dockerfile mismatch — should delete after main service works
- Run TeaVM patch on VPS (curl one-liner)
- End-to-end test: wallet connect → claim username → auto-login into game

## Manual Steps Pending (for me)
- None yet — Railway fix is agent-side

## Key File Map
- `apps/api/src/server.ts` — Express bootstrap, mounts all routes
- `apps/api/src/routes/rsc.ts` — wallet-to-username mapping + credential endpoints
- `apps/api/src/middleware/walletAuth.ts` — JWT cookie verification
- `apps/api/Dockerfile` — Docker build for Railway (runs tsx from source)
- `apps/web-arcade/public/games/rsc/index.html` — RSC landing + wallet flow + iframe
- `apps/web-arcade/vercel.json` — rewrites /api/rsc/* to Railway
- `tools/patch-rsc-teavm-client.sh` — VPS script for TeaVM auto-login injection
- `.hermes-state.json` — old state file (superseded by this file)
