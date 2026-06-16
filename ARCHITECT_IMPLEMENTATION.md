# Architecture & Implementation Guide

This document defines the technical structure, data flow, and strict boundaries of the FuzzyNuts monorepo. AI agents must read this to understand *how* to build within the system without breaking core functionality.

## 1. Technology Stack

- **Monorepo Tooling:** pnpm workspaces + Turborepo
- **Frontend (`apps/web-arcade`):** Next.js 15 (App Router), React 19, TypeScript
- **Backend (`apps/api`):** Express.js, Node.js, TypeScript
- **Desktop (`apps/desktop-tauri`):** Tauri-based desktop app
- **Mobile (`apps/mobile-capacitor`):** Capacitor-based mobile wrapper
- **Game Builds (`apps/games-build`):** Standalone game build pipeline
- **Database:** MongoDB (Mongoose/ODM)
- **Blockchain:** XRP Ledger (xrpl.js), $NUT token
- **CI/CD & Auditing:** Hermes Agent Desktop (Mimo Pro API) 6-agent pipeline
- **Environment:** Hardened Linux (Host OS)

## 2. Monorepo Topology

This is a Turborepo monorepo. Each workspace has its own `src/`, `tests/`, and `package.json`.

### `apps/` (Deployable Applications)
- **`apps/web-arcade`**: The Next.js 15 browser arcade frontend. Handles UI, game rendering, and wallet connection.
- **`apps/api`**: The Express/Node backend. Handles session management, game state, anti-cheat logic, and database operations.
- **`apps/desktop-tauri`**: Tauri-based desktop application wrapper.
- **`apps/mobile-capacitor`**: Capacitor-based mobile application wrapper.
- **`apps/games-build`**: Standalone game build pipeline and asset compilation.

### `packages/` (Shared Libraries)
- **`packages/arcade-core`**: Shared game logic, state machines, validation schemas (Zod), and global constants.
- **`packages/xrpl-token-utils`**: All XRP Ledger interactions. Wallet generation, transaction signing, $NUT token logic, and payout execution.
- **`packages/shared-anticheat`**: Shared anti-cheat logic and validation utilities used across apps.
- **`packages/wallet-client`**: Client-side wallet connection and transaction management utilities.
- **`packages/tsconfig`**: Shared TypeScript configurations.

## 3. Strict Boundaries (The "Red Zones")

**WARNING:** The following directories handle money, authentication, and core ledger state.
**Agents must NOT casually modify these files.**

- `packages/arcade-core/src/constants`
- `apps/api/src/routes/rewards`
- `apps/api/src/routes/session`
- `apps/api/src/routes/auth`
- `packages/xrpl-token-utils/src/payout`

### Protocol for Modifying Red Zones:
1. Open a PR specifically for this change.
2. Include comprehensive unit and integration tests.
3. Write an Architecture Decision Record (ADR) in `docs/adr/`.
4. Explicitly flag the PR for Fuzzynuts' manual review via Telegram.

## 4. Development & CI/CD Flow

### Branching Strategy
Never push to `main`. All work must happen on feature branches following Conventional Commits:
- `feat/<scope>-<short-description>`
- `fix/<scope>-<short-description>`
- `chore/<scope>-<short-description>`

### Pre-Commit / Pre-PR Checklist
Before opening a PR, the agent *must* run and pass:
```bash
pnpm typecheck && pnpm lint && pnpm test
```

Note: The Hermes 6-agent DevOps team will automatically audit the PR upon creation. If these commands fail locally, the PR will be rejected by the pipeline.

### Environment Variables
- NEVER read, write, or commit `.env` files.
- Only interact with `.env.example`.
- If a new environment variable is needed, add it to `.env.example` with a descriptive comment, and document it in `CHANGELOG.md`.

## 5. Data Flow & Integration Patterns

### Frontend to Backend (web-arcade -> api)
- Use Next.js Server Actions for secure, direct backend mutations where applicable.
- Use standard fetch with typed interfaces (defined in arcade-core) for client-side data fetching.
- All API responses must follow a standardized envelope: `{ success: boolean, data?: T, error?: string }`.

### Backend to Database (api -> database)
- Never write raw MongoDB queries in `apps/api` route handlers.
- All database logic must be encapsulated in Data Access Layer (DAL) functions inside `packages/database` (when created) or `apps/api/src/lib/`.

### Backend to XRPL (api -> xrpl-token-utils)
- The API should never import `xrpl.js` directly. It must call abstracted functions from `packages/xrpl-token-utils`.
- All XRPL transactions must be idempotent and handle ledger network failures gracefully (retry logic with exponential backoff).

## 6. Security & Hardening Context

This codebase runs on a heavily hardened Linux host. Agents must respect the host environment:
- Do not attempt to spawn unauthorized child processes or use `eval()`.
- Do not attempt to write to directories outside the monorepo workspace.
- Assume the host firewall (nftables) blocks all unauthorized outbound/inbound traffic. Network requests must only go to approved domains (XRPL nodes, MongoDB URI, approved APIs).

## 7. Definition of Technical Done

A technical implementation is only complete when:
- It adheres to the monorepo topology (code is in the correct app or package).
- It respects the Red Zone boundaries.
- Types are strict (no `any` unless explicitly justified in an ADR).
- `pnpm typecheck`, `lint`, and `test` pass locally.
- The implementation is documented in `CHANGELOG.md` and `ARCHITECT_IMPLEMENTATION.md` (if structural).
