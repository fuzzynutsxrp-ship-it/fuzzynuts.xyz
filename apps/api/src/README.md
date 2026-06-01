# backend-reference/

Reference implementations for the **Railway backend** at `world.fuzzynuts.xyz`. These files were previously living inside `fuzzynuts-optimized/src/` but never imported — the frontend is a static export with no API routes, so this code couldn't run there.

Treat this folder as a **read-only specification** of what the backend service does. The actual deployed code lives in the Railway service.

| Path | Purpose |
|---|---|
| `scripts/rewards-api.js` | Reference for `/api/rewards/*` endpoints (eligibility, claim, status) |
| `lib/middleware/validateScoreSubmission.ts` | Server-side score validation entry point |
| `lib/wallet/verifySignature.ts` | XRPL signature verification helper (used by validator) |
| `features/arcade/validation/scoreMiddleware.ts` | Zod-backed score submission middleware |
| `middleware/walletAuth.ts` | Wallet-auth check for protected endpoints |

If the Railway code is updated, mirror the change here so future audits stay accurate.
