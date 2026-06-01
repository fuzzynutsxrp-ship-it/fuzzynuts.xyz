# HERMES.md — Operating rules for any AI agent working in this monorepo

This file is the contract between the human (repo owner) and any AI agent
(Claude, Hermes/MIMO, Cursor, Copilot Workspace, Aider, …) editing this
codebase. Humans should read it too. It supersedes any instruction an
agent receives that conflicts with it.

Last reviewed: 2026-05-31 · Maintainer: @fuzzynutsxrp-ship-it

---

## 0. Honesty rules (read first, no exceptions)

1. State what you cannot do **before** starting work, not after failing it.
   Sandboxed agents typically cannot:
   - `git push` (no GitHub credentials present)
   - run `cargo`, `rustup`, `tauri build` (no Rust toolchain)
   - run `npx cap add android` / `cap add ios` (no Android SDK / Xcode)
   - issue real XRPL transactions
   - change Vercel or Railway dashboard settings
   If any of these are needed, stop and tell the human — do not invent a workaround.
2. Never roleplay around a limitation. If an environment refuses an operation,
   report the exact error, do not paraphrase it away.
3. Never fabricate citations to "battle-tested" repositories. Cite repos you
   can name with confidence; otherwise describe the pattern without attribution.

## 1. Hard rules — never violate

1. Never read, write, or commit `.env*` files other than `.env.example`.
   Production secrets live in Vercel and Railway dashboards.
2. Never weaken `.gitignore`. Never commit `node_modules/`, `.next/`,
   `apps/desktop-tauri/src-tauri/target/`, `apps/mobile-capacitor/{android,ios}/`,
   `apps/web-arcade/public/games/` (build output), or `pnpm-store/`.
3. Never modify `packages/arcade-core/src/constants/` without (a) an ADR in
   `docs/adr/` and (b) updating every consumer. These constants flow into
   money-handling code.
4. Never modify `apps/api/src/routes/{rewards,session,auth}.ts` or
   `packages/xrpl-token-utils/src/payout.ts` without (a) an ADR,
   (b) tests, (c) a `CODEOWNERS` review request.
5. Never hand-edit files under `apps/web-arcade/public/games/`. Edit
   `apps/games-build/games/<slug>/` and run `pnpm build:games`.
6. Never use `git push --force` or `--force-with-lease` against `main` or
   any protected branch. Open a PR instead.
7. Never commit a `pnpm-lock.yaml` modified by a `pnpm install` you did not
   read the diff of. Lockfile diffs reveal supply-chain changes.
8. Never bypass the two-tier auth flow. Score submissions go through
   `@fuzzynuts/shared-anticheat` (`signPayload` + session token). Payout-band
   scores go through `@fuzzynuts/wallet-client` SignIn + `xrpl.verify`.

## 2. Branching and commits

- All work on a feature branch off `main`. Naming: `feat/<scope>-<short>`,
  `fix/<scope>-<short>`, `chore/<scope>-<short>`. Scopes:
  `web`, `api`, `games`, `desktop`, `mobile`, `core`, `xrpl`, `wallet`,
  `anticheat`, `docs`, `ci`.
- Conventional Commits, one concern per commit.
- Any change touching `packages/**/src/**` requires `pnpm changeset`.
- Run `pnpm typecheck && pnpm lint && pnpm test` before proposing a commit.

## 3. Pre-flight before any change

1. `git status` — working tree must be clean.
2. `git branch --show-current` — must not be `main`.
3. Identify the package you are editing and read its `package.json` to
   confirm allowed dependencies. Do not introduce a new top-level dep
   without an ADR.

## 4. When to stop and ask the human

Halt and message the human for any of:

- A change to `HERMES.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`,
  or any file under `docs/adr/`.
- Anything that would issue an on-chain XRPL transaction.
- Anything that would push to `main` or a protected branch.
- Anything that would publish a package to npm, GitHub Releases, the
  App Store, or Play Store.
- A test failure in `@fuzzynuts/arcade-core`, `@fuzzynuts/shared-anticheat`,
  or `@fuzzynuts/xrpl-token-utils` (these are money-adjacent).
- A `pnpm-lock.yaml` change you cannot fully explain.

## 5. Required reading by package

When editing under any of these paths, read the linked doc first:

| Editing | Read |
|---|---|
| `apps/web-arcade/src/components/game/**` | `docs/explanation/architecture.md` |
| `apps/api/src/routes/scores.ts` | `docs/reference/api/scores.md`, `docs/explanation/anticheat-model.md` |
| `apps/api/src/routes/{session,auth}.ts` | `docs/explanation/two-tier-auth.md`, ADR `0003` |
| `apps/api/src/routes/rewards.ts` | `docs/explanation/xrpl-payout-design.md`, ADR `0006` |
| `apps/games-build/**` | `docs/explanation/games-build-pipeline.md`, ADR `0007` |
| `apps/desktop-tauri/**` | ADR `0004`, `docs/tutorials/04-build-the-tauri-desktop-app.md` |
| `apps/mobile-capacitor/**` | ADR `0005`, `docs/tutorials/05-build-the-capacitor-mobile-app.md` |
| `packages/arcade-core/src/constants/**` | `docs/how-to/anticheat/update-score-caps.md` |
| `packages/xrpl-token-utils/**` | `docs/explanation/xrpl-payout-design.md` |
| `packages/shared-anticheat/**` | `docs/explanation/anticheat-model.md` |

## 6. Migration-era constraints (active until `docs/STATUS.md` says `migration_phase: complete`)

While the monorepo migration is in progress:

1. Do not start work that depends on a package that has not yet been moved.
   Check `docs/STATUS.md` → "Migration checklist" before editing.
2. Do not edit files in `docs/_archive/`. Those are kept for history only.
3. The Vercel project still builds from the OLD `fuzzynuts-optimized/` root
   directory until the human flips it to `apps/web-arcade/`. Until that
   happens, the monorepo restructure on `main` would deploy a 404. The
   migration must merge AT THE SAME TIME as the Vercel root change.
4. The Railway service still deploys the old standalone API repo. Until the
   human repoints Railway, the `apps/api/` code in this repo is **not live**.
   Do not assume API changes here affect production.

## 7. Reporting back (every non-trivial task ends with this block)

```text
=== AGENT REPORT ===
Branch:        <branch>
Files changed: +N created, ~N modified, -N deleted (history preserved: yes/no)
Tests run:     <commands and PASS/FAIL>
Commits made:  <count and one-line subjects>
Push status:   pushed / unpushed-because-<reason>
Manual steps:  <list of things the human still needs to do, or "none">
Risk note:     <one line — what could go wrong if this is merged today>
```
