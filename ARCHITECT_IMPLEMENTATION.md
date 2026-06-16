# Architecture & Implementation Guide

This document defines the technical structure, data flow, and strict boundaries of the FuzzyNuts monorepo. Read this after `projectbrief.md` and `HERMES.md`.

## 1. Technology Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm 9 workspaces + Turborepo |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Backend | Express.js, Node.js, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Blockchain | XRP Ledger (xrpl.js), $NUT token |
| Desktop | Tauri 2.x |
| Mobile | Capacitor 7 |
| Game builds | Vite per game, content-hashed bundles |
| CI/CD | GitHub Actions + Hermes 6-agent DevOps pipeline |
| Hosting | Vercel (frontend), Railway (API), VPS 67.205.132.6 (RSC game server) |
| Node | >= 20 (`.nvmrc`) |
| Package manager | pnpm >= 9 (`corepack enable`) |

## 2. Monorepo Topology

Each workspace has its own `src/`, `tests/` (where applicable), and `package.json`.

### `apps/` — Deployable Applications

| Workspace | Purpose |
|-----------|---------|
| `apps/web-arcade` | Next.js 15 static arcade frontend. Vercel deployment. |
| `apps/api` | Express + MongoDB backend. Railway deployment. |
| `apps/games-build` | Vite pipeline for every iframe game. Output → `apps/web-arcade/public/games/`. |
| `apps/desktop-tauri` | Tauri 2.x desktop shell. |
| `apps/mobile-capacitor` | Capacitor 7 iOS + Android wrapper. |

### `packages/` — Shared Libraries

| Package | Purpose |
|---------|---------|
| `packages/arcade-core` | Single source of truth: `SCORE_CAPS`, game slugs, Zod schemas, types. |
| `packages/xrpl-token-utils` | XRPL client, signature verify, AMM price, payout execution. |
| `packages/shared-anticheat` | HMAC + nonce + session-token signing/verification. Shared by web + api. |
| `packages/wallet-client` | Xaman + Joey wallet adapters. |
| `packages/tsconfig` | Shared TypeScript configurations. |

### Other Top-Level Directories

| Directory | Purpose |
|-----------|---------|
| `docs/` | Diátaxis-structured documentation (tutorials, how-to, reference, explanation, ADRs, runbooks). |
| `scripts/` | Repo-level automation (`preflight.sh`, `verify-prod.sh`, score-cap drift check, etc.). |
| `tools/` | Internal dev tools (VPS scripts, thumbnail generator, account server). |
| `prompts/` | AI agent prompt templates. |
| `.changeset/` | Changeset versioning config. |
| `.github/` | CI workflows, CODEOWNERS, PR/issue templates. |

## 3. Strict Boundaries (Red Zones)

**These paths handle money, authentication, and core ledger state. Do NOT modify without an ADR, tests, and CODEOWNERS review.**

| Red Zone Path | Status |
|---------------|--------|
| `packages/arcade-core/src/constants/` | ✅ EXISTS — `score-caps.ts`, `slugs.ts`, `prize-tiers.ts`, `index.ts` |
| `apps/api/src/routes/auth.ts` | ✅ EXISTS |
| `apps/api/src/routes/session.ts` | ✅ EXISTS |
| `apps/api/src/routes/rewards.ts` | ⚠️ ANTICIPATED — referenced in HERMES.md but file does not yet exist |
| `packages/xrpl-token-utils/src/payout.ts` | ✅ EXISTS |

**Protocol for modifying any Red Zone:**
1. Write an ADR in `docs/adr/`.
2. Include comprehensive tests.
3. Request CODEOWNERS review.
4. Flag for human review via Telegram.

## 4. Development Flow

### Branching
- Never commit to `main`. All work on feature branches.
- Naming: `feat/<scope>-<short>`, `fix/<scope>-<short>`, `chore/<scope>-<short>`.
- Scopes: `web`, `api`, `games`, `desktop`, `mobile`, `core`, `xrpl`, `wallet`, `anticheat`, `docs`, `ci`.

### Pre-PR Checklist
```bash
pnpm typecheck && pnpm lint && pnpm test
```
Additional checks enforced by CI:
- `pnpm format:check`
- Changeset present if any `packages/**/src/**` changed.

### Environment Variables
- Never read, write, or commit `.env*` files (only `.env.example`).
- Secrets live in Vercel and Railway dashboards.

## 5. Data Flow

### Frontend → Backend (`web-arcade` → `api`)
- Standard `fetch` with typed interfaces from `arcade-core`.
- API responses: `{ success: boolean, data?: T, error?: string }`.
- Score submissions go through `shared-anticheat` (`signPayload` + session token).

### Backend → Database (`api` → MongoDB)
- All database logic in `apps/api/src/` (models, DAL patterns).
- Mongoose ODM.

### Backend → XRPL (`api` → `xrpl-token-utils`)
- API never imports `xrpl.js` directly — uses `packages/xrpl-token-utils` abstractions.
- All XRPL transactions must be idempotent with retry + exponential backoff.

## 6. Security Context

- Runs on a hardened Linux host (nftables, restricted outbound traffic).
- No `eval()`, no unauthorized child processes.
- Score submissions require HMAC verification via `shared-anticheat`.
- Payout-band scores require wallet signature via `wallet-client` + `xrpl.verify`.

## 7. Definition of Technical Done

- [ ] Code in correct workspace (adheres to monorepo topology)
- [ ] Red Zone boundaries respected
- [ ] No `any` types without ADR justification
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
- [ ] Changeset added if `packages/**/src/**` changed
- [ ] CHANGELOG.md updated
