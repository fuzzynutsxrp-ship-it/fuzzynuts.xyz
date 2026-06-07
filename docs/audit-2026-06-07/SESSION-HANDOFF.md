# SESSION HANDOFF — Infra Audit & Deploy Stabilization (2026-06-06 → 07)

> For any AI agent (Hermes/MIMO, Claude, etc.) resuming work. Read with `.hermes-state.json`, `.hermes-recovery.md`, and `HERMES.md`.

**Repo:** `github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz` (pnpm + Turbo monorepo, dir `fuzzynuts-optimized/`)
**Branch:** `main` · **HEAD at handoff = `029a9ef`** (this commit adds further state updates on top) · local == origin
**Headline:** `https://fuzzynuts.xyz` was returning a Vercel `404: NOT_FOUND`; **now LIVE** after setting the Vercel Framework Preset to Next.js + a clean redeploy. Repo cleaned/reorganized. The Open-RSC VPS is **kept alive** (owner actively playing).

## Commits this session (all on `main`, all pushed)
- `9adab3c` pre-reorg-checkpoint (rollback anchor)
- `b0dc1e6` chore(repo): de-track generated `apps/web-arcade/public/games` (~30MB; kept `.gitkeep` + `rsc/index.html`)
- `174103d` chore(repo): delete orphaned `Dockerfile.api` + `apps/api/Dockerfile`, stray `apps/web-arcade/package-lock.json`, dead `deploy-gh-pages.yml`; remove empty stub dirs `packages/{eslint-config,shared-ui,testing}`, `tools/codemod`
- `462a842` docs(env): rewrite `.env.example` (root + web-arcade) to match code
- `95c0fca` docs: relocate 12 loose notes into `docs/how-to/` + `docs/runbooks/`; de-dup `_archive`
- `716930f` docs: fix 5 internal links
- `146600a` chore(turbo): drop dangling `test:e2e` task; delete empty `tests/e2e-cross-app/`
- `85b27b0` chore(turbo): prune stale `MONGO_URL`/`XUMM_API_KEY` from `turbo.json` build.env
- `638bb19` + `4bad84e` fix(infra): VPS IP `137.184.194.158`→`67.205.132.6`; document live `GAME_SERVER_READY`
- `60bc906` **fix(deploy): TS deploy-blocker fixes + build scripts** (see below)
- `6f3df7e` / `8e4c843` docs(audit): CHANGELOG + follow-ups
- `029a9ef` docs: archive audit files into `docs/audit-2026-06-07/`

## Deploy-blocker code fixes (`60bc906`)
- `apps/api/src/routes/rsc.ts`: `jwtVerify` null-guard `const token = match?.[1]; if (!token) return null;`
- `apps/api/src/routes/chat.ts`: `(parts[0] ?? '').toLowerCase()`; mute echo uses raw `content` (was using `finalContent` before declaration); same `jwtVerify` token guard
- `apps/api/src/routes/kanban.ts`: `if (!id || !ObjectId.isValid(id))` in both handlers
- `package.json`: added `build:vercel` = `turbo run build --filter=@fuzzynuts/web-arcade...`
- `railway.toml`: `buildCommand` = `pnpm install --frozen-lockfile && cd apps/api && pnpm build` (nixpacks; no Dockerfile)
- Verified: `npx tsc -p tsconfig.json` and `pnpm build:api` exit 0.

## THE site fix (Vercel)
- **Root cause:** Vercel project **Framework Preset was `Other`** → Vercel served `.next` as static files → 404 on every route (apex, www, and `*.vercel.app`). DNS/domains were fine (all "Valid Configuration").
- **Fix (done in dashboard):** Framework Preset `Other` → **Next.js** + **Redeploy of `8e4c843` with build cache UNCHECKED** → deployment `GKe5sYakM` Ready/Production. Site live.
- Root Directory already correct: `apps/web-arcade`.
- ⚠️ If the preset ever reverts to `Other`, the 404 returns.

## Dashboard / external changes done
- GitHub Pages **unpublished**, `gh-pages` branch **deleted** (workflow file removed in repo).
- **5 Dependabot PRs closed:** #9 @types/node, #10 eslint, #11 next, #13 @capacitor/ios, #14 react.
- **9 remote feature branches deleted** (ui-token-fixes, migration/monorepo, kill-glassmorphism, headers-crisp-{fix,v2,v3}, fuzzybear-mobile-degen, hero-bg-degen-crush, degen-overhaul). Recovery SHAs in CHANGELOG.
- GitHub Actions secret **`VPS_HOST` → `67.205.132.6`**; **`VPS_PASSWORD` kept** (VPS live).
- **`main` branch protection** added (block force-push + deletion).

## Verified live infrastructure (ground truth)
- **DNS = Porkbun** (`*.ns.porkbun.com`), NOT Cloudflare. apex `fuzzynuts.xyz` A→`216.198.79.1` (Vercel); `www`→vercel-dns CNAME; `world`→Railway CNAME; **`game.fuzzynuts.xyz` A→`67.205.132.6`** (live VPS — KEEP).
- **Railway** project `brilliant-nurturing` (production): `efficient-tenderness` (= `world.fuzzynuts.xyz`, Kaetram/Open-RSC world+game frontend), `fuzzynuts.xyz` (= the API @ `fuzzynutsxyz-production.up.railway.app`), `MongoDB` (self-hosted + volume). **API IS LIVE** — `/healthz` → `{ok:true, rsc:true, version:"2.1", env all present incl MONGODB_URI}`.
- **DigitalOcean** droplet `fuzzynuts-game` = **`67.205.132.6`** (2GB/60GB, NYC1, Ubuntu 24.04, $18/mo, LIVE). Old `137.184.194.158` is **retired/non-existent**.
- **Reown** project Fuzzynuts, Project ID `238a1bd9e657a0efbe275e457e73c426`.
- Git-committed `GAME_SESSION_SECRET` hex is **NOT** the prod value (no real leak). Xaman key `f4f7****a7f5` is a **TEST key** (accepted, not rotated).

## OPEN KNOWN ISSUES (KI) — prioritized
1. **Reown allowlist missing apex.** Only `https://www.fuzzynuts.xyz` allowlisted; app uses apex `https://fuzzynuts.xyz`. Add apex (+ `*.vercel.app` preview) at dashboard.reown.com → Fuzzynuts → Configuration → Domain, else Joey/WalletConnect rejected on live origin. **(highest priority)**
2. **`efficient-tenderness` `GAME_SESSION_SECRET` is a literal placeholder** (`placeholder-set-real-value-in-dashboard`). Set a real `openssl rand -hex 32` if that service signs sessions.
3. **`efficient-tenderness` last build (~4 days ago) FAILED**; serving an older deploy — investigate.
4. **Vercel build: 1 error / 19 warnings** from `better-sqlite3` native compile (full-workspace install; `vps-account-server` dep, unused by web-arcade). Non-fatal; could scope install to web-arcade.
5. **Pre-existing build failures (NOT fixed):** `mobile-capacitor` typecheck `TS6059` (`capacitor.config.ts` outside `rootDir: src`); `desktop-tauri` needs Rust/cargo.
6. **Node ≥20 required** (pnpm@9.15.0). Keep CI/Vercel/Railway on Node 20+.
7. **DigitalOcean: no snapshots, backups OFF.** Droplet stays live; take a one-off safety snapshot.
8. **Env var naming:** code reads `MONGODB_URI` (API has it). `efficient-tenderness` uses `MONGO_URL` + discrete `MONGODB_*` parts (no `MONGODB_URI`) — confirm intentional before removing `MONGO_URL` there.
9. **Git history still holds the ~30MB de-tracked game binaries** (de-track only stops future bloat; no history rewrite done).
10. **VPS deploy uses SSH password auth** + `curl|bash` of `tools/deploy-openrsc-vps.sh` — consider SSH keys + pinning.

## Wallet-autologin phase (prior `.hermes-state.json`) — status NOT re-verified this session
Prior pending items (`run-teavm-patch-on-vps`, `end-to-end-test`, vercel rewrite, railway env) were **not** explicitly validated end-to-end here. Observations: `vercel.json` has the `/api/rsc/:path*` rewrite to Railway; API `/healthz` reports `rsc:true` + `RSC_PASSWORD_SECRET` set. The TeaVM patch on the VPS and full e2e autologin remain to be confirmed (see `docs/how-to/vps-setup.md`).

## Deliverables
`docs/audit-2026-06-07/`: this file + `CHANGELOG-audit-2026-06-06.md`, `EXTERNAL_RESOURCES.md`, `STRUCTURE_AUDIT.md`, `REORGANIZATION_PLAN.md`, `EXTERNAL_CLEANUP_ACTION_PLAN.md`, `EXECUTION_SOP.md`. Local tarball: `~/Desktop/fuzzynuts-audit-2026-06-07.tar.gz`.
