# FuzzyNuts Project State
Last updated: 2026-06-04
Current focus: Redirect to arcade on logout (v13 + parent page update)

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
- v13: WebGL context interceptor forces preserveDrawingBuffer=true for pixel reading
- v13: Canvas pixel sampling (6×5 grid, avg brightness detection) catches login screen
- v13: Stale canvas detection (unchanged pixel hash = static login screen)
- v13: Bright→dark transition detection (game world → login screen)
- v13: WebSocket connection monitor (close/error events trigger logout)
- v13: Session guard interval reduced from 3s to 2s
- Parent page: on logout, shows "Session ended — returning to arcade..." then redirects to /play/rsc

## In Progress
- Deploy v13 to VPS and test logout detection in production

## Blocked / Next
- Railway Express API container crash (env vars not injecting into Docker) — not blocking RSC since auto-login works via direct VPS
- Account server on VPS (`/opt/account-server/` port 3001) — separate from this work
- Verify v13 pixel sampling works with Open-RSC's WebGL canvas (may need threshold tuning)

## Manual Steps Pending (for me)
- Deploy v13 to VPS: `curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash`
- Test logout detection: log in → log out in-game → verify session-guard triggers → verify auto-reconnect

## Key File Map
- `tools/fix-teavm-js-autologin.sh` — VPS script (v13): WebGL intercept, pixel sampling, WS monitor, session guard
- `apps/web-arcade/public/games/rsc/index.html` — Parent page: wallet flow, claim modal, session-lost handler
- `apps/api/src/routes/rsc.ts` — claim-username + credentials endpoints
- `apps/api/src/middleware/walletAuth.ts` — JWT cookie verification
- `apps/api/src/server.ts` — Express bootstrap, mounts RSC routes
- `/var/www/rsc-client/index.html` — Live on VPS (needs v13 deploy), game.fuzzynuts.xyz

## Technical Notes
- TeaVM captures console references at load time → must install Proxy BEFORE classes.js
- WebGL context must be intercepted BEFORE classes.js to set preserveDrawingBuffer=true
- Canvas pixel sampling uses offscreen 2D canvas + drawImage from WebGL canvas
- Login screen is very dark (avg brightness < 20) vs game world (avg > 40)
- Stale canvas = pixel hash unchanged for 3+ checks (6s) = static login screen
- Bright-to-dark transition = was playing (avg > 40), now dark (avg < 20) for 2+ checks
- WebSocket monitor tracks all WS instances; close event sets _wsDisconnected flag
- All shared state must be on `window` object (not `var` in IIFE) for cross-script-block access
- Parent page reload limit: 3 reloads in 60 seconds, then shows "Connection issues" error
