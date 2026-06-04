# FuzzyNuts Project State
Last updated: 2026-06-04
Current focus: RSC auto-login + session guard fully working (v12 deployed)

## Done
- API routes: `POST /api/rsc/claim-username`, `GET /api/rsc/credentials` (MongoDB + AES-256-GCM)
- Wallet auth JWT middleware (`walletAuth.ts`)
- Server mounts RSC routes at `/api/rsc` gated by wallet JWT
- Vercel rewrite: `/api/rsc/*` → Railway Express API
- RSC landing page with wallet connect flow, claim modal, iframe launcher
- TeaVM auto-login: canvas hidden, keyboard simulation (keyCode/which/charCode), click at pixel coords
- Session ID detection: Proxy on window.console catches ALL output including classes.js (TeaVM)
- Session guard: monitors console for 17 logout patterns, hides canvas, notifies parent via postMessage
- Parent page handles `rsc-session-lost`: shows overlay, reloads iframe after 2s, 3-reload-in-60s loop protection
- VPS script: `tools/fix-teavm-js-autologin.sh` (v12, deployed to /var/www/rsc-client/index.html)

## In Progress
- Nothing actively being worked on — session guard is complete and tested

## Blocked / Next
- Railway Express API container crash (env vars not injecting into Docker) — not blocking RSC since auto-login works via direct VPS
- Account server on VPS (`/opt/account-server/` port 3001) — separate from this work
- Test logout detection in production (session guard monitors but hasn't been triggered yet)

## Manual Steps Pending (for me)
- None — v12 deployed and tested, working end-to-end

## Key File Map
- `tools/fix-teavm-js-autologin.sh` — VPS script (v12): Proxy console intercept, auto-login, session guard
- `apps/web-arcade/public/games/rsc/index.html` — Parent page: wallet flow, claim modal, session-lost handler
- `apps/api/src/routes/rsc.ts` — claim-username + credentials endpoints
- `apps/api/src/middleware/walletAuth.ts` — JWT cookie verification
- `apps/api/src/server.ts` — Express bootstrap, mounts RSC routes
- `/var/www/rsc-client/index.html` — Live on VPS (v12), game.fuzzynuts.xyz

## Technical Notes
- TeaVM captures console references at load time → must install Proxy BEFORE classes.js
- `Function.prototype.call.bind` pattern crashes in some browsers → use `.bind(console)` instead
- All shared state must be on `window` object (not `var` in IIFE) for cross-script-block access
- Session guard detects logout via console message patterns + canvas pixel sampling (backup)
- Parent page reload limit: 3 reloads in 60 seconds, then shows "Connection issues" error
