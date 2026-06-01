# Contributing

## Before you start
- Open or comment on an Issue first. Big PRs without a tracked Issue may be closed.
- Read [docs/explanation/architecture.md](./docs/explanation/architecture.md).
- Read [HERMES.md](./HERMES.md) if you are using an AI agent.

## Local setup
See [docs/tutorials/01-run-the-arcade-locally.md](./docs/tutorials/01-run-the-arcade-locally.md).

## Branches
- `main` — protected. Squash-merge only.
- `feat/<scope>-<short>` — features.
- `fix/<scope>-<short>` — bug fixes.
- `chore/<scope>-<short>` — tooling, docs.

`<scope>` is one of: `web`, `api`, `games`, `desktop`, `mobile`, `core`,
`xrpl`, `wallet`, `anticheat`, `docs`, `ci`.

## Commit messages
Conventional Commits: `type(scope): subject`.
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.

## Required checks (enforced by CI)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e` (web + api integration; runs against XRPL altnet)
- `pnpm format:check`
- Changeset present if any `packages/*` source changed: `pnpm changeset`

## Touching money-handling code
Anything in `apps/api/src/routes/{rewards,session,auth}.ts`,
`packages/xrpl-token-utils/`, or `packages/shared-anticheat/` requires:
- a corresponding test under the same package,
- an ADR in `docs/adr/` if behaviour changes,
- review from a `CODEOWNERS`-listed maintainer.

## Adding a game
Follow [docs/tutorials/03-add-a-new-game.md](./docs/tutorials/03-add-a-new-game.md).
You must register the slug in `packages/arcade-core/src/constants/slugs.ts`
and add a `SCORE_CAPS` entry — there is no second copy anywhere.

## Reporting security issues
**Do not open a public Issue.** See [SECURITY.md](./SECURITY.md).
