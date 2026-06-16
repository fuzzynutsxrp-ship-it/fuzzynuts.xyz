# Project File Structure

This document defines the actual folder hierarchy of the FuzzyNuts monorepo.
Agents must read this before creating folders or moving files.

> **Source of truth for agent rules:** `HERMES.md`
> **Source of truth for current state:** `docs/STATE.md`

## Root-Level Files

| File | Purpose |
|------|---------|
| `projectbrief.md` | Business context, goals, the "why" |
| `ARCHITECT_IMPLEMENTATION.md` | Technical architecture and Red Zones |
| `AGENTS.md` | Supplementary agent operating instructions |
| `FILE_STRUCTURE.md` | This file — folder hierarchy |
| `CHANGELOG.md` | Decision-oriented change log |
| `HERMES.md` | **Binding** agent operating contract (supersedes AGENTS.md) |
| `README.md` | Quick start for humans |
| `CONTRIBUTING.md` | Contribution guidelines, branching, commit conventions |
| `SECURITY.md` | Security policy and vulnerability reporting |
| `CODE_OF_CONDUCT.md` | Community standards |
| `PROJECT_STATE.md` | ⚠️ DEPRECATED → use `docs/STATE.md` |
| `LICENSE` | MIT license |
| `.env.example` | Environment variable template (never commit `.env`) |
| `package.json` | Root workspace dependencies and scripts |
| `pnpm-workspace.yaml` | pnpm monorepo workspace config |
| `turbo.json` | Turborepo pipeline config |
| `railway.toml` | Railway deployment config |
| `.nvmrc` | Node.js version pinning (>= 20) |
| `.gitignore` | Git exclusions |
| `.dockerignore` | Docker build exclusions |
| `.editorconfig` | Editor formatting rules |
| `.prettierrc` | Prettier config |
| `.prettierignore` | Prettier ignore rules |
| `.hermes-recovery.md` | Hermes session recovery (deprecated) |
| `.hermes-state.json` | Hermes state tracking (deprecated) |
| `pnpm-lock.yaml` | Lockfile (never edit without reading the diff) |

## Directory Structure

```
fuzzynuts.xyz/
├── apps/                          # Deployable applications
│   ├── web-arcade/                #   Next.js 15 static arcade frontend
│   │   ├── src/                   #     App source (components, features, lib)
│   │   ├── e2e/                   #     Playwright end-to-end tests
│   │   ├── tests/                 #     Unit tests
│   │   ├── public/                #     Static assets + game bundles
│   │   ├── scripts/               #     Build/dev scripts
│   │   └── docs/                  #     App-specific docs
│   ├── api/                       #   Express + MongoDB backend
│   │   └── src/
│   │       ├── routes/            #     auth.ts, session.ts, scores.ts, chat.ts, ...
│   │       ├── middleware/        #     walletAuth.ts, ...
│   │       ├── models/            #     Mongoose models
│   │       ├── features/          #     Feature modules (arcade/)
│   │       ├── lib/               #     Utilities (middleware/, wallet/)
│   │       ├── cron/              #     Scheduled jobs
│   │       └── scripts/           #     One-off scripts
│   ├── games-build/               #   Vite pipeline for every iframe game
│   │   ├── games/                 #     Per-game source (slug directories)
│   │   ├── auth/                  #     Game auth helpers
│   │   ├── client-dist/           #     Build output
│   │   ├── openrsc/               #     Open-RSC integration
│   │   ├── scripts/               #     Build scripts
│   │   ├── shared/                #     Shared game utilities
│   │   ├── template/              #     Game template
│   │   └── templates/             #     Additional templates
│   ├── desktop-tauri/             #   Tauri 2.x desktop shell
│   │   ├── src/                   #     Frontend source
│   │   └── src-tauri/             #     Rust backend
│   └── mobile-capacitor/          #   Capacitor 7 mobile wrapper
│       └── src/                   #     Frontend source
├── packages/                      # Shared libraries
│   ├── arcade-core/               #   SCORE_CAPS, slugs, Zod schemas, types
│   │   └── src/
│   │       ├── constants/         #     🔴 RED ZONE — score-caps.ts, slugs.ts, prize-tiers.ts
│   │       ├── schema/            #     Zod validation schemas
│   │       └── types/             #     TypeScript type definitions
│   ├── xrpl-token-utils/          #   XRPL client, verify, AMM price, payout
│   │   └── src/
│   │       └── payout.ts          #     🔴 RED ZONE
│   ├── shared-anticheat/          #   HMAC + nonce + session-token
│   │   └── src/
│   ├── wallet-client/             #   Xaman + Joey wallet adapters
│   │   └── src/
│   └── tsconfig/                  #   Shared TS configs
├── docs/                          # Diátaxis-structured documentation
│   ├── adr/                       #   Architecture Decision Records (0001–0010)
│   ├── tutorials/                 #   Learning-oriented guides
│   ├── how-to/                    #   Task-oriented guides
│   │   └── xrpl/                  #     XRPL-specific how-tos
│   ├── reference/                 #   Information-oriented reference
│   ├── explanation/               #   Understanding-oriented docs
│   ├── runbooks/                  #   Operational runbooks
│   ├── components/                #   Component documentation
│   ├── marketing/                 #   Marketing materials
│   ├── audit-2026-06-07/          #   June 2026 audit artifacts
│   ├── _archive/                  #   Archived/deprecated docs
│   │   ├── legacy-web-arcade/
│   │   └── original-archive/
│   ├── STATE.md                   #   Current state (supersedes PROJECT_STATE.md)
│   ├── STATUS.md                  #   Auto-generated audit table
│   ├── SCOPE-2026-06-13.md        #   Scope definition
│   └── (various security audit .md files)
├── scripts/                       # Repo-level automation
│   ├── preflight.sh               #   Pre-flight checks (fetch + behind-main guard)
│   ├── verify-prod.sh             #   Production verification
│   ├── check-score-caps-drift.js  #   Score cap drift detection
│   ├── fetch-assets.js            #   Asset fetching
│   ├── patch-auth-routes.js       #   Auth route patching
│   └── __tests__/                 #   Script tests
├── tools/                         # Internal dev tools
│   ├── scripts/                   #   Misc dev scripts
│   ├── thumbnails/                #   Thumbnail generation
│   └── vps-account-server/        #   VPS account management server
├── prompts/                       # AI agent prompt templates
│   └── resume-work.txt            #   Session resume prompt
├── .changeset/                    # Changeset versioning
│   ├── config.json
│   └── README.md
└── .github/                       # GitHub config
    ├── workflows/                 #   CI, release, docs-status, deploy-openrsc
    ├── CODEOWNERS                 #   Code ownership rules
    ├── COMMIT_GUIDE.md            #   Commit message guide
    ├── PULL_REQUEST_TEMPLATE.md   #   PR template
    └── ISSUE_TEMPLATE/            #   Issue templates (bug, feature, config)
```

## Red Zone Summary

| Path | Files | Rule |
|------|-------|------|
| `packages/arcade-core/src/constants/` | `score-caps.ts`, `slugs.ts`, `prize-tiers.ts`, `index.ts` | ADR + tests + CODEOWNERS |
| `apps/api/src/routes/auth.ts` | Single file | ADR + tests + CODEOWNERS |
| `apps/api/src/routes/session.ts` | Single file | ADR + tests + CODEOWNERS |
| `apps/api/src/routes/rewards.ts` | ⚠️ Not yet created | Will be Red Zone when created |
| `packages/xrpl-token-utils/src/payout.ts` | Single file | ADR + tests + CODEOWNERS |

## Structure Rules

### Do:
- Follow the existing hierarchy
- Create subdirectories within defined folders
- Update this file when adding new top-level items
- Keep related files together

### Don't:
- Create new top-level folders without approval
- Scatter related files across multiple folders
- Add files to root unless they're project-wide docs
- Create deeply nested structures (max 3 levels)
