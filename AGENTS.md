# Agent Operating Instructions

> **⚠️ `HERMES.md` is the binding agent contract for this repo and supersedes this file.**
> This file provides supplementary guidance. When in doubt, `HERMES.md` wins.

## Startup Protocol

Before starting any task:
1. Read `HERMES.md` — the rules contract (always wins).
2. Read `projectbrief.md` — what we're building and why.
3. Read `ARCHITECT_IMPLEMENTATION.md` — how the system is structured.
4. Read `FILE_STRUCTURE.md` — where things live.
5. Check `docs/STATE.md` — current phase, launch blockers, what's live.

## Hard Rules (from HERMES.md §1)

These are non-negotiable. See `HERMES.md` for the full list.

- Never read/write/commit `.env*` files (only `.env.example`).
- Never weaken `.gitignore`.
- Never modify Red Zones without ADR + tests + CODEOWNERS review.
- Never hand-edit `apps/web-arcade/public/games/` — edit `apps/games-build/games/<slug>/` and run `pnpm build:games`.
- Never force-push to `main` or protected branches.
- Never bypass the two-tier auth flow (shared-anticheat + wallet-client).

## Branching & Commits

- All work on feature branches off `main`.
- Naming: `feat/<scope>-<short>`, `fix/<scope>-<short>`, `chore/<scope>-<short>`.
- Conventional Commits, one concern per commit.
- Run `pnpm typecheck && pnpm lint && pnpm test` before proposing a commit.
- Changeset required if any `packages/**/src/**` changed.

## Documentation Protocol

When you make changes:
1. **Code changes** → Update `ARCHITECT_IMPLEMENTATION.md` if structure changes.
2. **New folders** → Update `FILE_STRUCTURE.md` immediately.
3. **All changes** → Add entry to `CHANGELOG.md` under "Unreleased".

## Definition of Done

- [ ] Code works as specified
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass
- [ ] Documentation updated (if behavior changed)
- [ ] `CHANGELOG.md` updated
- [ ] Changeset added (if `packages/**/src/**` changed)
- [ ] Commit message follows Conventional Commits
- [ ] Agent report block included (see HERMES.md §7)

## Reporting Back

Every non-trivial task ends with the agent report block (HERMES.md §7):
```
=== AGENT REPORT ===
Branch:        <branch>
Files changed: +N created, ~N modified, -N deleted
Tests run:     <commands and PASS/FAIL>
Commits made:  <count and one-line subjects>
Push status:   pushed / unpushed-because-<reason>
Manual steps:  <list or "none">
Risk note:     <one line>
```

## When to Stop and Ask

Halt and message the human for:
- Changes to `HERMES.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, or `docs/adr/`.
- Anything that would issue an on-chain XRPL transaction.
- Anything that would push to `main`.
- Anything that would publish to npm, GitHub Releases, App Store, or Play Store.
- Test failures in money-adjacent packages (`arcade-core`, `shared-anticheat`, `xrpl-token-utils`).
