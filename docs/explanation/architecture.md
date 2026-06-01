---
title: Architecture
diataxis: explanation
last_verified: 2026-05-31
---

# Architecture

Five deploy targets, three shared packages, one git repo. See the
diagram in the [root README](../../README.md).

## Deploy topology

| Target | Where | Built from |
|---|---|---|
| Web | Vercel | `apps/web-arcade` (Next 15 static export) |
| API | Railway | `apps/api` (Node 20 + Express) |
| Game iframes | served by web target | `apps/games-build` → `apps/web-arcade/public/games/<slug>/` |
| Desktop | GitHub Releases | `apps/desktop-tauri` (Tauri 2.x) |
| Mobile (Android) | Play Store | `apps/mobile-capacitor` (Capacitor 7) |

## Why each shared package exists

- `@fuzzynuts/arcade-core` — `SCORE_CAPS`, slug aliases, score-payload
  zod schema. Imported by web, api, games-build. Eliminates the
  divergent-constants class of bug we hit pre-migration (see
  [docs/_archive/](../_archive/) for context).
- `@fuzzynuts/shared-anticheat` — HMAC + nonce + session-token primitives.
  Same code in browser and server because Web Crypto works in both.
- `@fuzzynuts/xrpl-token-utils` — every XRPL operation. Server-side only.
  Holds the multisig-aware payout path.
- `@fuzzynuts/wallet-client` — Xaman + Joey adapters. Browser only.

## What lives outside this repo

- The deployed Railway API code currently runs from a separate repo; the
  monorepo migration introduces `apps/api/` to receive that code. Cutover
  is a manual Railway settings change.
- XRPL on-chain state (NUT token, AMM pool, distributor). Operations
  against it are documented under [docs/how-to/xrpl/](../how-to/xrpl/).
