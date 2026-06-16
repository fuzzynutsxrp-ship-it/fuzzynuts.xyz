# Changelog

All notable changes to this project will be documented in this file.

Format: Decision-oriented entries (not raw git log). Focus on the "why" and "impact".

## Unreleased

### Added
- Docs: Baseline Alignment Audit v2 — root documentation scaffold (#baseline-audit-v2)
  - **Why:** The FuzzyNuts monorepo had no root-level operating documentation. `HERMES.md` and `README.md` existed but the 5-file documentation scaffold (`projectbrief.md`, `ARCHITECT_IMPLEMENTATION.md`, `AGENTS.md`, `FILE_STRUCTURE.md`, `CHANGELOG.md`) was missing entirely.
  - **Impact:** Created all 5 root docs grounded to the actual filesystem. Every path, package name, and Red Zone verified against the real `main` branch at commit `62d45ce`.
  - **What was created:**
    1. `projectbrief.md` — business context and strategic goals
    2. `ARCHITECT_IMPLEMENTATION.md` — technical architecture, 5 apps, 5 packages, Red Zones
    3. `AGENTS.md` — supplementary agent instructions (defers to `HERMES.md` as binding contract)
    4. `FILE_STRUCTURE.md` — complete directory tree with every folder that exists on disk
    5. `CHANGELOG.md` — this file
  - **Key facts verified:**
    - Apps: `web-arcade`, `api`, `games-build`, `desktop-tauri`, `mobile-capacitor` (5 total)
    - Packages: `arcade-core`, `xrpl-token-utils`, `shared-anticheat`, `wallet-client`, `tsconfig` (5 total)
    - Red Zones: `arcade-core/src/constants/`, `api/src/routes/{auth,session}.ts`, `xrpl-token-utils/src/payout.ts` (all exist)
    - `apps/api/src/routes/rewards.ts` — referenced in HERMES.md but does not yet exist (noted as anticipated)
    - Undocumented dirs noted: `tools/`, `prompts/`, `.changeset/`
  - **NOT touched:** source code, config files, dependencies, `.env*`, `.gitignore`, Red Zone files
  - **Pipeline:** `pnpm typecheck` ✅ · `pnpm lint` ✅ (0 errors) · `pnpm test` ✅

---

*Previous changelog entries are in git history. This file was created during the baseline alignment audit.*
