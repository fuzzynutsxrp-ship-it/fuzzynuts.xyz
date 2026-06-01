---
title: Run the Arcade Locally
diataxis: tutorial
audience: contributor
prerequisites:
  - Node.js 20+
  - pnpm 9+ (via corepack)
  - Optional — a Xaman developer API key (test mode)
time: 15 minutes
last_verified: 2026-05-31
---

# Run the Arcade Locally

By the end of this tutorial you will have the web arcade running on
`http://localhost:3000`, the API on `http://localhost:4000`, and one
round of Fuzzy Survivors submitted to your local leaderboard.

## 1. Install

```bash
git clone https://github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz.git
cd fuzzynuts.xyz
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
```

## 2. Configure

```bash
cp apps/web-arcade/.env.example apps/web-arcade/.env.local
cp apps/api/.env.example         apps/api/.env.local
```

In `apps/api/.env.local`, set `WALLET_JWT_SECRET` and
`GAME_SESSION_SECRET` to **any** 32+ character random strings (this is
local dev — do not reuse production values).

## 3. Boot

In one terminal:

```bash
pnpm dev:api    # http://localhost:4000
```

In another:

```bash
pnpm dev:web    # http://localhost:3000
```

## 4. Verify

Open <http://localhost:3000>. Click PLAY on **Fuzzy Survivors**, finish a
quick run, then visit <http://localhost:3000/leaderboard>. Your score
should appear within ~5 seconds.

## Troubleshooting

- `Workspace still starting` from `pnpm dev:api`: missing `WALLET_JWT_SECRET`.
- Score does not appear: open the browser console, look for `[FuzzyScore]`
  log lines. A 401 means the session token is malformed; a 422 means the
  HMAC didn't match.

## Next

- [Connect an XRPL testnet wallet](./02-connect-an-xrpl-testnet-wallet.md)
