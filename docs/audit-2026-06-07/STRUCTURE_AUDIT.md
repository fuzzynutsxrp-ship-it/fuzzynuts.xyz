# STRUCTURE_AUDIT.md — Project Structure Audit (Phase 2)

**Project:** FuzzyNuts monorepo (`fuzzynuts-optimized/`, pnpm + Turbo)
**Generated:** 2026-06-06 · **READ-ONLY — no files moved, modified, or deleted**
**On-disk:** 3.8 GB / ~204k files · **Git repo (`.git`):** 106 MB · **Tracked working tree:** see §6

> Context applied: Xaman key reclassified as test/low-risk (owner). `GAME_SESSION_SECRET` remains a critical leak. Six directives from your Phase-2 brief are answered in §A–§F; standard audit items follow in §1–§7.

---

## A. Directive 1 — Archive / docs bloat

| Directory | Size | Files | % of docs |
|-----------|------|-------|-----------|
| `docs/` (total) | 484 KB | 65 | 100% |
| `docs/_archive/` | 204 KB | 15 | **42%** |
| ↳ `docs/_archive/legacy-web-arcade/` | 132 KB | 9 | 27% |
| ↳ `docs/_archive/original-archive/` | 68 KB | 5 | 14% |

**Verdict:** ~42% of all documentation by size is frozen legacy handoff material. It is text-only (KB, not MB) so it is **not a disk/repo-size problem** — but it is a *navigation/signal* problem and it contains the `GAME_SESSION_SECRET` and the (test) Xaman key. The two `_archive` subfolders both contain a near-identical `fuzzynuts_handoff.md` (line-for-line matches at line 260) — i.e. the archive itself has duplicates.

**Also bloating `docs/` root:** 16 loose files sit at the top level outside the otherwise-clean Diátaxis layout (`how-to/ tutorials/ reference/ explanation/ adr/ runbooks/`). These are ad-hoc incident notes: `FIX_AUTOLOGIN.md`, `FIX_FAILED_FETCH.md`, `FIX_RAILWAY_CRASH.md`, `DEPLOY_AUTOLOGIN.md`, `DEPLOY_AUTOLOGIN_FIX.md`, `DEPLOY_ACCOUNT_SERVER.md`, `RAILWAY_DEPLOY_DEBUG.md`, `HANDOFF_VPS_SETUP.md`, `LIVE_SMOKE_TEST.md`, `SECURE_AUTH_DEPLOY.md`, two `railway/vercel-deploy-checklist.md`, etc. Candidates to fold into `how-to/` or `runbooks/` (Phase 3).

---

## B. Directive 2 — Duplicate & orphan: Dockerfiles + vps-account-server

**Dockerfiles — `Dockerfile.api` vs `apps/api/Dockerfile`:**
- The two files are **byte-identical** (`diff` empty).
- **Neither is referenced by anything.** Railway builds with **nixpacks**, not Docker: `railway.toml` → `builder = "nixpacks"`, `buildCommand = cd apps/api && pnpm install`, `startCommand = npx tsx apps/api/src/server.ts`. No CI workflow, compose file, or script invokes either API Dockerfile (only mention in source is a comment in `server.ts:20`).
- **Verdict: both API Dockerfiles are ORPHANED.** The only Docker actually used is `apps/games-build/Dockerfile`, consumed by `apps/games-build/docker-compose.yml` for optional local game-dev. → Phase 3: delete both API Dockerfiles, or keep exactly one and wire Railway to it (a decision for you).

**`tools/vps-account-server/`:**
- Real, referenced code. `server.js` (Express, port 3001, localhost-only) is deployed to the VPS by `tools/deploy-vps-account-server.sh` (→ `/opt/account-server/`, systemd `account-server.service`). Documented in `docs/DEPLOY_ACCOUNT_SERVER.md`, `PROJECT_STATE.md`, `.github/COMMIT_GUIDE.md`.
- It reads the Open-RSC game DB at `/opt/openrsc/server/inc/sqlite/preservation.db`.
- **Verdict: NOT orphaned in code**, but its *runtime home* (the VPS) is the teardown target in Directive 6. The package is named `rsc-account-server` and is a pnpm workspace member with a `start` script; it has its own `node_modules` (part of the 1.2 GB).

---

## C. Directive 3 — Monorepo hygiene (pre-monorepo artifacts)

**Stray lockfile (pre-monorepo npm artifact):**
- `apps/web-arcade/package-lock.json` exists alongside the root `pnpm-lock.yaml`. The repo enforces pnpm (`preinstall: npx only-allow pnpm`), so this npm lockfile is a **leftover from the single-app era and is misleading**. → Phase 3 delete. (Only one stray lockfile; no `yarn.lock`/`bun.lockb`.)

**Empty stub workspaces (matched by `packages/*` / `tools/*` globs but contain 0 files):**
- `packages/eslint-config/`, `packages/shared-ui/`, `packages/testing/`, `tools/codemod/` — all empty directories. They are caught by the workspace globs but have no `package.json`. → Phase 3: remove, or scaffold if intended.

**turbo.json vs workspace scripts:**
- `turbo.json` tasks: `build, dev, lint, typecheck, test, test:e2e, clean`. These align with the root `package.json` orchestration scripts and the per-workspace scripts (turbo simply skips workspaces lacking a given script, which is fine).
- One soft gap: **`test:e2e`** is a turbo task and a root script, but **no workspace defines a `test:e2e` script** — the cross-app E2E lives in `tests/e2e-cross-app/` (outside any workspace package). So `turbo run test:e2e` currently matches nothing. → Phase 3: either make `tests/` a workspace or drop the task. Low priority.
- `packages/tsconfig` has no scripts — correct (config-only package).

**Other monorepo notes:**
- `pnpm-workspace.yaml` globs `apps/*`, `packages/*`, `tools/*` — clean.
- Root config files (`turbo.json`, `tsconfig`, `.prettier*`, `eslint`) are legitimately root-level for a monorepo; no obvious config that *must* move into a workspace.

---

## D. Directive 4 — `.env.example` vs actual `process.env` usage

Cross-referenced both `.env.example` templates against every `process.env.X` **and** every `optionalEnv()/requireEnv()` string key in the code.

**Confirmed broken / stale:**
1. **`MONGO_URL` (and `MONGODB_URL`) → code reads `MONGODB_URI`.** Documented in `.env.example`; the API (`apps/api/src/server.ts:33`) reads `MONGODB_URI`. Copying the example yields a non-working DB. **(Confirmed, as flagged in Phase 1.)**
2. **`XUMM_API_KEY` — declared but unused.** Present in root `.env.example` and `turbo.json` env list, but **no code reads it**. Wallet auth uses `NEXT_PUBLIC_XAMAN_API_KEY` instead. → prune.

**Used by code but UNDOCUMENTED in any `.env.example` (devs won't know to set them):**
- `OPENAI_API_KEY` (chat feature) · `DISCORD_WEBHOOK_URL` (monitoring alerts) · `RSC_PASSWORD_SECRET` · `VPS_ACCOUNT_SECRET` · `VPS_ACCOUNT_URL` · `ADMIN_WALLET_ADDRESS` / `NEXT_PUBLIC_ADMIN_WALLET` · `SCORE_HMAC_SECRET` · `SERVER_SECRET` · `NEXT_PUBLIC_CHAT_API` · `NEXT_PUBLIC_SECURE_SITE_ORIGIN` · `NUT_USD_PRICE_FALLBACK` · plus several `NUT_AMM_*`, `PRIZE_USD_*`, `MAX_WEEKLY_NUT_EMISSION`, `COMMUNITY_NUT_JAR_SEED`, `ALLOW_SINGLE_SIG_PAYOUT`.

**Verdict:** the env templates have drifted significantly from the code. → Phase 3: rewrite both `.env.example` files to match reality (fix `MONGODB_URI`, drop `XUMM_API_KEY`, add the documented-but-missing vars with safe placeholders). Note: `OPENAI_API_KEY`, `DISCORD_WEBHOOK_URL`, `RSC_PASSWORD_SECRET`, `VPS_ACCOUNT_SECRET`, `SCORE_HMAC_SECRET`, `SERVER_SECRET` are **real secrets the code expects** — confirm they're set in Railway/Vercel (Phase 5).

---

## E. Directive 5 — GitHub Pages: live or dead legacy?

**Conclusion: DEAD LEGACY (and almost certainly failing on every run).** Evidence:

1. **The workflow is incompatible with the monorepo.** `deploy-gh-pages.yml` runs `npm ci` then `npm run build`. The repo's root `package.json` has `"preinstall": "npx only-allow pnpm"`, which **aborts any npm/yarn install**. So `npm ci` fails at preinstall → the job has been **failing on every push to `main`** since the monorepo migration. It also assumes a static `out/` export that the monorepo root build does not produce.
2. **No custom-domain binding.** There is **no `CNAME` file** anywhere in the repo or on the `gh-pages` branch. A working Pages custom domain requires a committed `CNAME`. Without it, Pages could only serve at `fuzzynutsxrp-ship-it.github.io/...`.
3. **The production domain points elsewhere.** `fuzzynuts.xyz` (apex) is served by **Vercel**, and `world.fuzzynuts.xyz` by **Railway** (Phase 1). Nothing routes to GitHub Pages.
4. **`gh-pages` branch is stale.** Last commit `0e96802 deploy: …` on **2026-06-01**, an orphan deploy commit (`force_orphan: true`) — a snapshot, not an active site.

**Verdict:** `gh-pages` branch + `deploy-gh-pages.yml` are safe to retire. They serve no live traffic and the workflow is broken. → Phase 3 proposes deleting the workflow; the remote `gh-pages` branch deletion is a manual GitHub action (Phase 5, since we never push).

---

## F. Directive 6 — VPS teardown recon (DigitalOcean `137.184.194.158`)

You're being billed but `GAME_SERVER_READY=false`. Here's exactly what's on the box and how to shut it down gracefully **with a data snapshot first**. Reconstructed from `tools/deploy-openrsc-vps.sh`, `tools/deploy-vps-account-server.sh`, `.github/workflows/deploy-openrsc.yml`, and `tools/vps-account-server/server.js`.

**What's running on the droplet:**

| Component | systemd unit | Port | Install path | Data |
|-----------|--------------|------|--------------|------|
| Open-RSC game server (Java 17/Ant) | `openrsc.service` | 43594 (ufw-opened) | `/opt/openrsc` | MariaDB DB `fuzzynuts_rsc` + SQLite at `/opt/openrsc/server/inc/sqlite/*.db` |
| Account API (Node/Express) | `account-server.service` | 3001 (localhost only) | `/opt/account-server` | reads `/opt/openrsc/server/inc/sqlite/preservation.db`; secret at `/opt/account-server/.account_secret` |
| Database | `mariadb.service` | 3306 (localhost) | apt package | `fuzzynuts_rsc` (user `openrsc`) |

**How deploy accesses it:** GitHub Action `deploy-openrsc.yml` (manual `workflow_dispatch`) → `appleboy/ssh-action` → SSH as **root** using **`secrets.VPS_PASSWORD`** (password auth) → `curl | bash` of `tools/deploy-openrsc-vps.sh` from raw GitHub → `systemctl enable --now openrsc`. (A `VPS_SSH_KEY` secret is mentioned in comments but the job uses the password.)

**Graceful shutdown + snapshot — commands to run (you execute these; I won't touch the VPS):**

1. **Stop services (preserve data):**
   ```
   systemctl stop account-server openrsc
   systemctl disable account-server openrsc
   ```
2. **Snapshot the valuable data before destroying the droplet:**
   ```
   # MariaDB game database
   mysqldump -u root fuzzynuts_rsc > /root/fuzzynuts_rsc-$(date +%F).sql
   # SQLite preservation + game DBs
   tar czf /root/openrsc-sqlite-$(date +%F).tar.gz /opt/openrsc/server/inc/sqlite/*.db
   # Account-server secret (so a redeploy can reuse it, optional)
   cp /opt/account-server/.account_secret /root/account_secret.bak
   ```
   Then `scp` those three files off the box to local storage.
3. **Take a full DigitalOcean snapshot** (browser, you must do this): Droplets → the droplet → **Power off** → Snapshots → **Take Snapshot**. Powering off first guarantees a consistent image. A snapshot lets you fully restore later and is far cheaper than a running droplet.
4. **Stop billing:** after the snapshot completes, **Destroy** the droplet (Droplets → … → Destroy). *A powered-off droplet still bills* — only Destroy stops compute charges (snapshot storage bills a small amount).
5. **DNS:** if `game.fuzzynuts.xyz` was ever pointed at `137.184.194.158` (Porkbun), remove/replace that A record so it doesn't dangle.

**Repo-side flags after teardown:** keep `GAME_SERVER_READY=false`; the `/play/rsc` page already shows the provisioning message, so the public site degrades gracefully. The deploy workflow + scripts can stay in the repo (they're how you'd re-provision from the snapshot) — see Phase 3 for whether to disable the workflow trigger.

---

## 1. Directory tree (depth 2, build/vendor dirs collapsed)

```
fuzzynuts-optimized/
├── apps/
│   ├── api/              @fuzzynuts/api      (Railway, Express)   [dist/ on disk]
│   ├── web-arcade/       @fuzzynuts/web-arcade (Vercel, Next.js) [.next/ out/ on disk]
│   ├── games-build/      @fuzzynuts/games-build (game source + Docker dev)
│   ├── desktop-tauri/    @fuzzynuts/desktop-tauri
│   └── mobile-capacitor/ @fuzzynuts/mobile-capacitor
├── packages/
│   ├── arcade-core/      [dist/ on disk]
│   ├── shared-anticheat/ [dist/ on disk]
│   ├── wallet-client/
│   ├── xrpl-token-utils/
│   ├── tsconfig/
│   ├── eslint-config/    ← EMPTY (0 files)
│   ├── shared-ui/        ← EMPTY (0 files)
│   └── testing/          ← EMPTY (0 files)
├── tools/
│   ├── scripts/          @fuzzynuts/tools-scripts
│   ├── vps-account-server/ rsc-account-server
│   ├── codemod/          ← EMPTY (0 files)
│   └── *.sh              (5 deploy/fix shell scripts)
├── docs/                 (65 files; _archive/ = 42% by size)
├── tests/e2e-cross-app/
├── prompts/
├── .changeset/  .github/  .turbo/(disk)  .vercel/(gitignored)
└── railway.toml  turbo.json  Dockerfile.api(orphan)  package.json  pnpm-lock.yaml …
```

## 2. Redundant / duplicate directories & files
- **`apps/web-arcade/public/games/` (30 MB, 209 files) duplicates `apps/games-build/games/` (30 MB, 204 files).** `public/games` is **generated build output** (`pnpm build:games`) but is **committed to git** — and `.gitignore` *intends* to exclude it (`apps/web-arcade/public/games/*`). The files were committed **before** the ignore rule, so they remain tracked (verified: `golf.wasm` is ignored-by-rule yet still tracked). This double-commits ~30 MB of binaries (incl. `golf.wasm` 18 MB ×2 = 36 MB total in git) and is a major contributor to the 106 MB `.git`. → Phase 3: `git rm --cached` the generated tree, let it regenerate.
- **`Dockerfile.api` == `apps/api/Dockerfile`** (identical, both orphaned — §B).
- **`docs/_archive/legacy-web-arcade/fuzzynuts_handoff.md` ≈ `docs/_archive/original-archive/fuzzynuts_handoff.md`** (duplicate handoff docs).

## 3. Orphaned / stale files
- `apps/web-arcade/package-lock.json` (npm leftover; repo is pnpm-only).
- 4 empty workspace dirs: `packages/eslint-config`, `packages/shared-ui`, `packages/testing`, `tools/codemod`.
- `Dockerfile.api` + `apps/api/Dockerfile` (unreferenced).
- `deploy-gh-pages.yml` + `gh-pages` branch (dead legacy — §E).

## 4. Build artifacts present on disk (correctly gitignored, NOT tracked — safe to clean)
`apps/web-arcade/.next`, `apps/web-arcade/out`, `apps/api/dist`, `packages/arcade-core/dist`, `packages/shared-anticheat/dist`, `.turbo/`, and `node_modules` (1.2 GB+). These plus `out/`-tracked copies inflate the 3.8 GB working tree. `pnpm clean` + a fresh install reclaims most of it. **None are committed.**

## 5. Misplaced files
- `tests/e2e-cross-app/` lives outside any workspace (not in `pnpm-workspace.yaml`) → `turbo run test:e2e` matches nothing (§C).
- Top-level `docs/*.md` incident notes belong under `docs/how-to/` or `docs/runbooks/` (§A).
- `.github/og-image.png` (516 KB) duplicates `apps/web-arcade/public/images/og/og-image.png` (516 KB).

## 6. Large binaries in git (consider git-lfs or de-tracking generated copies)
| File | Size | Note |
|------|------|------|
| `golf.wasm` | 18 MB ×2 | once in `games-build` (source), once in `web-arcade/public/games` (generated, should be de-tracked) |
| `FullScreenMario.bundle.js` | 2.3 MB ×2 | same source/generated duplication |
| `herobackgroundvideo.mp4` | 1.8 MB | hero video |
| Mario `Sounds/Themes/*.ogg/.mp3` | ~0.5–0.7 MB each, ×2 | duplicated source/output |

De-tracking the generated `web-arcade/public/games` copies removes ~30 MB from the tree; the true source assets in `games-build` are the git-lfs candidates if you want a leaner repo.

## 7. Dependency health & git state
- **Lockfiles:** single valid `pnpm-lock.yaml` (391 KB). One stray `package-lock.json` (§C).
- **Dependabot active:** open remote branches bumping `@capacitor/ios`, `eslint`, `next`, `react`, `@types/node` — corresponding PRs likely open on GitHub. Worth merging/closing (manual, GitHub).
- **Branches:** `main` plus 8 local feature branches (`degen-overhaul`, `kill-glassmorphism`, `hero-bg-degen-crush`, `headers-crisp-fix/-v2/-v3`, `fuzzybear-mobile-degen`, `ui-token-fixes`) and `migration/monorepo`. Several look like merged/superseded UI experiments (the three `headers-crisp-*` iterations especially). Last `main` commit `539bdee` (2026-06-06). → Phase 3 lists branch cleanup (local only; never pushed).
- **TODO/FIXME:** 23 total matches, but only **7 are in real source** (the rest are in vendored/build bundles under `out/`, `dist/`, `public/games`):
  - `packages/xrpl-token-utils/src/payout.ts:75` — TODO(xrpl-multisig-rollout)
  - `packages/xrpl-token-utils/src/amm-price.ts:43` — TODO(xrpl-pricing): real amm_info calls
  - `apps/api/src/server.ts:236` — TODO(auth-rollout): mount migrated /api/scores, /api/rewards
  - `apps/api/src/routes/session.ts:51` — TODO(auth-rollout): persist jti to Mongo TTL
  - `apps/api/src/routes/auth.ts:30` — TODO(auth-rollout): replace with real store (Mongo/Redis)
  - (2 more are duplicated into `apps/api/dist/` build output)
- **No committed secrets beyond Phase 1 findings** (`GAME_SESSION_SECRET` critical; Xaman key = test, accepted).

---

## Top cleanup opportunities (preview of Phase 3 — nothing executed yet)
1. **De-track generated `apps/web-arcade/public/games/`** (~30 MB, already meant to be ignored) — biggest repo-size win.
2. Delete the two orphaned API Dockerfiles (or keep one + wire Railway).
3. Delete stray `apps/web-arcade/package-lock.json` and the 4 empty stub dirs.
4. Retire `deploy-gh-pages.yml` (broken/dead) + plan `gh-pages` branch deletion (manual).
5. Fix both `.env.example` files (MONGODB_URI, drop XUMM_API_KEY, add missing vars).
6. Tidy `docs/` — fold loose incident notes into `how-to/`/`runbooks/`; collapse duplicate archive handoffs.
7. Prune merged local feature branches (esp. `headers-crisp-v1/2/3`).
8. VPS: snapshot + destroy per §F to stop billing.

---
*End of Phase 2. No changes made. Awaiting your review before I draft Phase 3 (REORGANIZATION_PLAN.md, dry-run only).*
