# Changelog

All notable changes to this project will be documented in this file.

Format: Decision-oriented entries (not raw git log). Focus on the "why" and "impact".

## Unreleased

### Added
- Docs: Baseline Alignment Audit — root documentation scaffold + structural corrections (#baseline-audit)
  - **Why:** The repository had no root-level operating documentation (`projectbrief.md`, `ARCHITECT_IMPLEMENTATION.md`, `AGENTS.md`, `FILE_STRUCTURE.md`, `CHANGELOG.md`). The original FILE_STRUCTURE.md template described a generic `src/`/`tests/`/`config/` layout and incorrect app/package names that didn't match the actual monorepo.
  - **Impact:** Created all 5 root documentation files aligned to the real repository structure. Updated all paths to match actual directories (`apps/web-arcade` not `apps/web`, `docs/adr/` not `docs/decisions/`, etc.).
  - **Discrepancies resolved:**
    1. `projectbrief.md` — created (was missing from repo)
    2. `ARCHITECT_IMPLEMENTATION.md` — created with accurate Red Zone paths (`apps/api/src/routes/{rewards,session,auth}`, `packages/xrpl-token-utils/src/payout`)
    3. `AGENTS.md` — created (was missing from repo)
    4. `FILE_STRUCTURE.md` — created with real monorepo topology (5 apps, 5 packages, 10 docs subdirs, `tools/`, `prompts/`, `.changeset/`)
    5. `CHANGELOG.md` — created (this file)
  - **Key corrections vs. original templates:**
    - `apps/web` → `apps/web-arcade` (actual app name)
    - `packages/database` and `packages/ui` → removed (don't exist); added `shared-anticheat`, `wallet-client`
    - `docs/decisions/` → `docs/adr/` (actual ADR directory)
    - `config/` → removed (doesn't exist in repo)
    - Added undocumented dirs: `tools/`, `prompts/`, `.changeset/`
    - Red Zone paths corrected to include `src/` subdirectory
  - **Red Zones:** Noted but untouched — paths updated in docs only
  - **Source code / config / deps:** Zero changes

---

*Previous changelog entries are in git history. This file was created during the baseline alignment audit.*
