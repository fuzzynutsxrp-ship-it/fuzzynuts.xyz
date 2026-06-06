# Fix "Failed to fetch" on Game Connect

## What Was Wrong (Two Bugs)

### Bug 1: Game session route never mounted
`server.ts` mounted `buildAuthRouter` (handles `/challenge` and `/verify`) but
never imported or mounted `buildGameSessionRouter` (handles `/game-session`).
Hitting `/api/auth/game-session` returned 404.

### Bug 2: No CORS middleware
The frontend at `fuzzynuts.xyz` makes a cross-origin POST to
`world.fuzzynuts.xyz`. Without CORS headers on the API, the browser blocks
the response entirely — showing "Failed to fetch" instead of the actual 404.

## What Changed

| File | Change |
|------|--------|
| `apps/api/src/server.ts` | Added `cors` middleware (allows `fuzzynuts.xyz` + `www.fuzzynuts.xyz` with credentials). Mounted `buildGameSessionRouter` at `/api/auth`. Created shared `challengeStore` so auth and game-session routers share challenge state. |
| `apps/api/package.json` | Added `cors` + `@types/cors` dependencies |
| `.env.example` | Documented `NEXT_PUBLIC_API_URL` (commented, defaults to `https://world.fuzzynuts.xyz`) |

## How to Deploy (Railway)

The API auto-deploys from the repo. After pushing these changes:

1. Go to [Railway dashboard](https://railway.app) → your API service
2. Confirm these env vars are set:
   - `GAME_SERVER_READY` = `true`
   - `GAME_SESSION_SECRET` = (your hex secret)
   - `WALLET_JWT_SECRET` = (your hex secret)
   - `OPENRSC_GAME_ENDPOINT` = `fuzzynuts.xyz:43594`
3. Railway will auto-deploy the new code with CORS + game-session route
4. Check the deploy logs — look for `@fuzzynuts/api listening on :XXXX`

## How to Verify

1. Open <https://fuzzynuts.xyz/play/rsc/>
2. Connect your XRP wallet (Xaman/Joey)
3. You should see "Creating game session..." then a download card with `Open_RSC_Client.jar`
4. No more "Failed to fetch"

## If It Still Fails

Open browser DevTools (F12) → Network tab → click "Connect XRP Wallet" →
find the `game-session` request:

- **Status 0 / CORS error**: CORS still not working. Check Railway logs.
- **Status 503**: `GAME_SERVER_READY` is not `true` in Railway env vars.
- **Status 404**: Route not mounted. Check the deploy used the new `server.ts`.
- **Status 400**: Request body doesn't match schema. Check console for details.
