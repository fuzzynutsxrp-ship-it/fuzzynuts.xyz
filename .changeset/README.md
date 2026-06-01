# Changesets

This folder is consumed by [`@changesets/cli`](https://github.com/changesets/changesets) to manage
versioning and changelogs across the `packages/*` workspaces.

## Workflow

1. After any change to a `packages/**/src/**` file in a PR, run `pnpm changeset`.
2. Pick the affected packages and the semver bump (patch / minor / major).
3. Write a one-line summary — it becomes the changelog entry.
4. Commit the generated `.md` file in `.changeset/`.

Apps (`apps/*`) are intentionally listed under `"ignore"` in `config.json` — they are deployed,
not published. Only the shared packages get changesets and versioning.

CI rejects PRs that change `packages/**/src/**` without a changeset (see `.github/workflows/ci.yml`,
`changeset-check` job).
