<!-- Thank you for contributing to Fuzzynuts. -->

## What & why
<!-- One paragraph: what this PR does and why. -->

## Linked issue
Closes #

## Type
- [ ] feat
- [ ] fix
- [ ] chore / docs / refactor / test

## Checklist
- [ ] My branch name matches `feat|fix|chore/<scope>-<short>`.
- [ ] My commits follow Conventional Commits.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` passes locally.
- [ ] If I touched `packages/**/src/**`, I added a changeset (`pnpm changeset`).
- [ ] If I touched money-handling code (`apps/api/src/routes/{rewards,session,auth}.ts`, `packages/xrpl-token-utils/`, `packages/shared-anticheat/`), I added tests and an ADR if behaviour changed.
- [ ] I did not modify `.env*` files (other than `.env.example`).
- [ ] I did not commit anything under `node_modules/`, `out/`, `.next/`, or `apps/desktop-tauri/src-tauri/target/`.

## Manual steps required by reviewer / on merge
<!-- e.g. "Set NEW_ENV_VAR on Railway after merge", or "None". -->

## Risk note
<!-- One line: what could go wrong if this merges today? -->
