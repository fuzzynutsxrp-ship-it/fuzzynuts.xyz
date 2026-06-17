# 0001 — Adopt Turborepo + pnpm workspaces

- **Status**: accepted
- **Date**: 2026-05-31
- **Deciders**: @fuzzynutsxrp-ship-it

## Context

Pre-migration we had four sibling folders (`fuzzynuts-optimized/`,
`fuzzynuts-games-dev/`, `backend-reference/`, `archive/`) with no
package-manager linking. Game CSS drifted between two trees
silently — the fuzzy-survivors fix shipped earlier this week had to
be applied to three copies of the file. There was no shared type,
no shared lint config, no shared CI.

## Decision

One monorepo using **pnpm workspaces** and **Turborepo 2.x** for the
task graph and remote cache. Workspaces under `apps/*`, `packages/*`,
`tools/*`. Versioning of shared `packages/*` via **changesets**.

## Consequences

- Positive: single source of truth for `SCORE_CAPS`, slug map, score
  schema; cross-package refactors land atomically; one CI matrix.
- Negative: every contributor must use pnpm (enforced via `preinstall`
  - `packageManager` field).
- Follow-ups: Vercel + Railway dashboards must point to new sub-paths
  (`apps/web-arcade`, `apps/api`); see migration plan for the exact UI clicks.

## Alternatives considered

- npm workspaces — no remote build cache, slower installs at this size.
- Nx — heavier, more opinionated; we don't need its generators.
- Multi-repo + git submodules — keeps the drift problem we're solving.
