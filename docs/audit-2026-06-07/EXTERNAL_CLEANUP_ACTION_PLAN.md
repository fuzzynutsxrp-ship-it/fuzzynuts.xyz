# EXTERNAL_CLEANUP_ACTION_PLAN.md — Phase 5

**Generated:** 2026-06-06 · Based on a **live read-only dashboard audit** (Railway, Vercel, DigitalOcean, GitHub, Porkbun, Reown).
**Nothing was changed in any dashboard.** Every action below is for **you** to execute; I stopped at every state-changing control.
Secrets are redacted. The Xaman key is a test token (excluded). 

---

## 0. Live audit results (what's actually true right now)

### Railway — project `brilliant-nurturing` (production, Hobby)
Three services (the project card mislabels it "No services" — it actually has three):
- **`efficient-tenderness`** → `world.fuzzynuts.xyz` — Online. **37 variables.** Latest deploy (4 days ago) **FAILED at build**; it's serving a 2-week-old successful deploy. Shows a "40" issues badge.
- **`fuzzynuts.xyz`** → `fuzzynutsxyz-production.up.railway.app` — Online. **14 variables.** This is the Node API (`apps/api`).
- **`MongoDB`** → self-hosted on Railway (mongo 8.3.1), Online, `mongodb-volume` attached.

Variable findings:
- **`MONGODB_URI` IS set** on the `fuzzynuts.xyz` API service ✅. It is **absent** on `efficient-tenderness` (that one has `MONGO_URL` + discrete `MONGODB_HOST/PORT/USER/PASSWORD/DATABASE/SRV/TLS`).
- **Both** app services still carry a now-redundant **`MONGO_URL`** (stale; code uses `MONGODB_URI`).
- **Leaked `GAME_SESSION_SECRET` is NOT active anywhere.** `fuzzynuts.xyz` = a real base64 secret (redacted, ≠ the git value). `efficient-tenderness` = the literal string **`placeholder-set-real-value-in-dashboard`** — i.e. an *insecure placeholder*, not a real secret.
- **`RSC_PASSWORD_SECRET`** is a shared variable **not added** to `efficient-tenderness` (shows "ADD"); it is present on `fuzzynuts.xyz`.
- Present on the API (`fuzzynuts.xyz`): `ADMIN_WALLET_ADDRESS`, `DISCORD_WEBHOOK_URL`, `OPENAI_API_KEY`, `VPS_ACCOUNT_SECRET`, `VPS_ACCOUNT_URL`, `WALLET_JWT_SECRET`, `OPENRSC_GAME_ENDPOINT`, `NEXT_PUBLIC_ADMIN_WALLET`, `XRPL_NETWORK`.
- Not seen on the API vs new `.env.example`: `SCORE_HMAC_SECRET`, `SERVER_SECRET`, `NUT_ISSUER`, `NUT_DISTRIBUTOR` (may rely on code defaults or live on the other service).

### Vercel — project `fuzzynuts-optimized` (Hobby, team "Shafster's projects")
- **Environment Variables: NONE.** Zero set (Project + Shared + All all empty). The site currently relies entirely on code-baked `NEXT_PUBLIC_*` defaults. There is **no `NEXT_PUBLIC_PROJECT_ID`** (Reown), **no `NEXT_PUBLIC_XAMAN_API_KEY`**, **no `SITE_LOCKDOWN_PASSWORD`**.
- **Domains:** only `fuzzynuts-optimized.vercel.app`. The custom **`fuzzynuts.xyz` is NOT attached** to this project.

### DigitalOcean — one droplet
- **`fuzzynuts-game`**, public IP **`67.205.132.6`** (private `10.116.0.2`), 2 GB / 60 GB, **NYC1**, Ubuntu 24.04 LTS, project "first-project". **Active.** **$18.00/month** ($0.027/hr). CPU ~4.5%, **Memory ~41%** (services are running). Created ~4 days ago.
- ⚠️ **The repo's `137.184.194.158` is STALE** — no droplet with that IP exists. Only `67.205.132.6` does. All teardown steps below target `67.205.132.6`.
- **No snapshots exist. Automated backups are OFF.** There is currently *no* restore point — a snapshot is mandatory before destroy.
- A **Web Console** is available (Droplet → Web Console).

### GitHub — `fuzzynutsxrp-ship-it/fuzzynuts.xyz`
- **`gh-pages` branch exists** (320 behind main). **GitHub Pages IS published** at `https://fuzzynutsxrp-ship-it.github.io/fuzzynuts.xyz/` from `gh-pages` → root, **no custom domain** (so it does NOT serve the real `fuzzynuts.xyz`; that's Vercel). Live-but-orphan.
- **5 open Dependabot PRs:** **#9** `@types/node` 20→25 (major), **#10** `eslint` 9→10 (major), **#11** `next` group, **#13** `@capacitor/ios` 7→8 (major), **#14** `react` group.
- **`deploy-openrsc.yml`**: `workflow_dispatch` (manual only), 2 manual runs total.
- Remote copies of the branches you deleted locally still exist on origin (PRs **#5** headers-crisp-v2, **#6** headers-crisp-v3, **#7** kill-glassmorphism, **#8** migration/monorepo, plus `ui-token-fixes`).
- `main` is **not protected**.

### Porkbun — `fuzzynuts.xyz`  (UPDATED after live DNS check — see §6)
- **Porkbun IS the authoritative DNS host** (NS = `*.ns.porkbun.com`). The domain is **not on Cloudflare** ("Powered by Cloudflare" is just Porkbun's backend label). My first pass misread the editor as empty (UI load glitch) — **records do exist** and are managed in Porkbun.
- Live records resolve: apex+www → **Vercel**, `world` → **Railway**, **`game.fuzzynuts.xyz` → A `67.205.132.6` (the live VPS)**. Nothing points to the stale `137.184.194.158`. Full table + actions in **§6**.

### Reown — team "Shafster", project "Fuzzynuts"
- **Project ID `238a1bd9e657a0efbe275e457e73c426`** — matches the repo exactly ✅.
- **Allowed domains: only `https://www.fuzzynuts.xyz`** (added 10 days ago). The **apex `https://fuzzynuts.xyz`** (which is `NEXT_PUBLIC_SITE_URL` in code) and the `*.vercel.app` preview domain are **NOT allowlisted** → Joey/WalletConnect will be rejected on the real production origin.
- No App IDs, no Secrets stored. 0 users / 0 wallets (pre-launch).

---

## 1. Secrets — what to rotate (revised by live data)

**Good news:** the leaked git `GAME_SESSION_SECRET` (`a3f8c1d2…`) is **not in production**, so the leak never exposed a live secret. **No urgent rotation is required.** Two related fixes remain:

**1a. (Recommended) Replace the insecure placeholder on `efficient-tenderness`.**
That service has `GAME_SESSION_SECRET = placeholder-set-real-value-in-dashboard` — a publicly-guessable value. If that service ever signs/validates game-session tokens, set a real secret.
- Generate locally: `openssl rand -hex 32`
- Railway click-path: **railway.com → project `brilliant-nurturing` → service `efficient-tenderness` → Variables → find `GAME_SESSION_SECRET` → row "⋯" menu → Edit → paste value → Update Variables** (Railway will redeploy). *Only do this if that service actually uses it; if it should match the API, copy the value from `fuzzynuts.xyz`'s `GAME_SESSION_SECRET`.*

**1b. (Optional, low priority) Rotate the real API `GAME_SESSION_SECRET` anyway** if you want a clean slate post-audit. Path: **service `fuzzynuts.xyz` → Variables → `GAME_SESSION_SECRET` → ⋯ → Edit → paste `openssl rand -hex 32` → Update.** Note: this invalidates any in-flight game-session tokens (fine pre-launch).

> The Xaman test key needs no action (your call, accepted).

---

## 2. Railway — variable hygiene (exact click-paths)

All paths start at **railway.com → project `brilliant-nurturing` → [service] → Variables**.

**2a. Remove the stale `MONGO_URL` from BOTH services** (code uses `MONGODB_URI`).
- `fuzzynuts.xyz` → Variables → `MONGO_URL` row → **⋯ → Delete** → confirm. (`MONGODB_URI` is already present, so the API keeps working.)
- `efficient-tenderness` → Variables → `MONGO_URL` row → ⋯ → Delete — **ONLY IF** that service reads `MONGODB_URI`. ⚠️ It currently has `MONGO_URL` + discrete `MONGODB_*` parts and **no `MONGODB_URI`**. **Before deleting**, confirm what that service's code reads. If it relies on `MONGO_URL`/the parts, **leave it**. (Safer: skip this one unless you know.)

**2b. Add `MONGODB_URI` to `efficient-tenderness` only if its code needs it** (it builds from parts today). Likely **no action**.

**2c. `RSC_PASSWORD_SECRET` on `efficient-tenderness`** shows "ADD" (shared var not applied). If that service needs RSC auth, click **Add**; otherwise ignore.

**2d. Add genuinely-missing API vars** if features are meant to be live (on `fuzzynuts.xyz` → Variables → **New Variable**): `SCORE_HMAC_SECRET`, `SERVER_SECRET` (each `openssl rand -hex 32`), and `NUT_ISSUER` / `NUT_DISTRIBUTOR` if the API does on-chain ops. Confirm against code before adding.

**2e. Investigate the failed build** on `efficient-tenderness` (Deployments → the FAILED run → View logs). It's been serving a 2-week-old build; the last 4 pushes haven't shipped. Not a cleanup item, but worth knowing.

---

## 3. Vercel — make the site launch-ready (exact click-paths)

The project has **no env vars**, so anything not code-defaulted is missing. Path: **vercel.com → Shafster's projects → fuzzynuts-optimized → Settings → Environment Variables → Add New** (set Environment = Production, and Preview if needed).

Add at minimum (values you hold):
- `NEXT_PUBLIC_PROJECT_ID` = `238a1bd9e657a0efbe275e457e73c426` (Reown — without it, Joey/mobile connect can't init)
- `NEXT_PUBLIC_XAMAN_API_KEY` = your Xaman key (test key fine for now)
- `SITE_LOCKDOWN_PASSWORD` = a strong value (the edge is **fail-closed** — unset can 503 the whole site)
- Optionally `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_ADMIN_WALLET`, `NEXT_PUBLIC_SECURE_SITE_ORIGIN` (match the Batch-3 `.env.example`).

Then **Deployments → ⋯ → Redeploy** to apply.

**Domain:** if the apex should serve from this project, **Settings → Domains → Add** `fuzzynuts.xyz` and follow Vercel's DNS instructions (done in Cloudflare — see §6). Today only `fuzzynuts-optimized.vercel.app` is attached.

---

## 4. DigitalOcean VPS — `fuzzynuts-game` @ `67.205.132.6`

```
╔══════════════════════════════════════════════════════════════════════╗
║  🛑 ABORT TEARDOWN — DO NOT DESTROY THIS DROPLET 🛑                    ║
║  UPDATE 2026-06-06: The owner confirms 67.205.132.6 is ACTIVELY IN    ║
║  USE for LIVE GAMEPLAY. It is NOT stale. KEEP THE DROPLET RUNNING.    ║
║  • Do NOT Power Off, do NOT Destroy, do NOT delete the snapshot.      ║
║  • Only the BACKUP/SNAPSHOT steps below are appropriate (good hygiene ║
║    since no snapshot/automated backup currently exists).              ║
║  • Skip every Power-off / Destroy instruction in §4c.                 ║
╚══════════════════════════════════════════════════════════════════════╝
```

Goal (REVISED): take a **safety snapshot/backup only** — the droplet stays live. (Memory is ~41% — services are running real gameplay.) Do **A1–A6 / steps 1–2 below for backup**, then **STOP** before any power-off/destroy.

### 4a. Local terminal — SSH in and dump the data
You authenticate as **root** with the droplet password (the `VPS_PASSWORD` you set; or reset it at DigitalOcean → Droplet → Access → Reset Root Password). Run from **your** machine:

```bash
# 1) SSH in (use the CURRENT IP, not the stale repo one)
ssh root@67.205.132.6

# 2) On the VPS: stop services so data is consistent
systemctl stop account-server openrsc 2>/dev/null
systemctl disable account-server openrsc 2>/dev/null

# 3) Dump the game data
mysqldump -u root fuzzynuts_rsc > /root/fuzzynuts_rsc-$(date +%F).sql        # MariaDB game DB
tar czf /root/openrsc-sqlite-$(date +%F).tar.gz /opt/openrsc/server/inc/sqlite/*.db   # SQLite (incl. preservation.db)
cp /opt/account-server/.account_secret /root/account_secret.bak 2>/dev/null || true   # account-server secret
ls -lh /root/*.sql /root/*.tar.gz /root/account_secret.bak                    # confirm files exist
exit
```

### 4b. Local terminal — copy the backups OFF the droplet
```bash
mkdir -p ~/project-backups/vps-fuzzynuts-game
scp root@67.205.132.6:/root/fuzzynuts_rsc-*.sql ~/project-backups/vps-fuzzynuts-game/
scp root@67.205.132.6:/root/openrsc-sqlite-*.tar.gz ~/project-backups/vps-fuzzynuts-game/
scp root@67.205.132.6:/root/account_secret.bak ~/project-backups/vps-fuzzynuts-game/
ls -lh ~/project-backups/vps-fuzzynuts-game/    # verify the transfer locally BEFORE destroying
```
**Do not proceed until you've confirmed the files are on your machine and non-empty.**

### 4c. DigitalOcean dashboard — power off, snapshot, destroy
Path: **cloud.digitalocean.com → Droplets → `fuzzynuts-game`**.
1. **Power off:** top-right **Power** toggle (or **Actions → Power Off**). Wait until status = Off. *(A snapshot of a powered-off droplet is consistent.)*
2. **Snapshot:** **Backups & Snapshots → Take Snapshot** → name e.g. `fuzzynuts-game-final-2026-06-06` → wait for it to finish (a few minutes). This is your full restore image.
3. **Destroy:** **Actions → Destroy → Destroy this Droplet** → confirm by typing the droplet name. *(Powered-off droplets still bill — only Destroy stops the $18/mo. Snapshot storage costs a small amount, ~$0.06/GB/mo.)*

### 4d. Repo follow-ups (local, optional)
- Keep `GAME_SERVER_READY=false` everywhere (the `/play/rsc` page already degrades gracefully).
- The deploy scripts/workflow can stay (they're how you'd rebuild from the snapshot), but **update the stale IP** `137.184.194.158` → new IP if you ever re-provision, and consider disabling the workflow trigger (§5d).

---

## 5. GitHub cleanup (exact UI steps)

### 5a. Retire GitHub Pages + delete `gh-pages`
1. **Disable Pages:** repo → **Settings → Pages → Build and deployment → Source → select "None"** (stops publishing the orphan github.io site). *(There's no Unpublish for branch-source; setting Source to None is the equivalent. An "Unpublish site" button is also present — either works.)*
2. **Delete the branch:** repo → **Branches** (or `/branches/all?query=gh-pages`) → `gh-pages` row → **trash icon** → confirm.
3. The remote `deploy-gh-pages.yml` still exists on origin (your local delete isn't pushed). Remove it when you push `main`, or delete via **Code → `.github/workflows/deploy-gh-pages.yml` → trash → commit**.

### 5b. Close the 5 Dependabot PRs you don't want
Path: repo → **Pull requests → [PR] → Close pull request** (bottom). Decide per PR — the majors are riskier:
- **#9** `@types/node` 20→25 — **major**, only matters if you move to Node ≥20 (you should; Railway/engines want it). Consider merging *with* a Node-version bump, else close.
- **#10** `eslint` 9→10 — **major**, may need config migration. Close unless you want to tackle it.
- **#11** `next` group — review changelog; usually safe to merge.
- **#13** `@capacitor/ios` 7→8 — **major**; only relevant if you ship the iOS app. Close if mobile is on hold.
- **#14** `react` group — review; merge if it's a patch/minor.
To stop future noise: **Settings → Code security → Dependabot → disable version updates**, or add a `.github/dependabot.yml` schedule.

### 5c. Delete the stale remote feature branches
You deleted them locally; remove the origin copies via **Branches** → trash icon on each: `ui-token-fixes`, `migration/monorepo`, `kill-glassmorphism`, `headers-crisp-v2`, `headers-crisp-v3` (and any other `headers-crisp-*`, `degen-overhaul`, `hero-bg-degen-crush`, `fuzzybear-mobile-degen`). Closing their PRs (#5–#8) happens automatically when the branch is deleted, or close them first.

### 5d. OpenRSC workflow
It's manual-only, so it won't fire on its own. After teardown, either leave it (for future re-provision, but **fix the stale IP** in `deploy-openrsc.yml`) or delete the workflow file. Also rotate/remove the `VPS_PASSWORD`, `VPS_HOST` Actions secrets once the droplet is destroyed: **Settings → Secrets and variables → Actions → [secret] → Remove/Update**.

### 5e. (Recommended) Protect `main`
**Settings → Branches → Add branch ruleset/Protect** `main` — block force-push & deletion, optionally require the CI check.

---

## 6. DNS — LIVE-VERIFIED (authoritative NS = **Porkbun**, not Cloudflare)

```
╔══════════════════════════════════════════════════════════════════════╗
║  🛑 ABORT DNS TEARDOWN — KEEP ALL RECORDS INTACT 🛑                    ║
║  UPDATE 2026-06-06: The VPS is live for gameplay, so                  ║
║  game.fuzzynuts.xyz → 67.205.132.6 is a REQUIRED record, NOT          ║
║  dangling. DO NOT delete the `game` A-record. Leave all DNS as-is.    ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Correction from §0:** the domain is **NOT on Cloudflare.** Authoritative nameservers are Porkbun (`maceio/curitiba/fortaleza/salvador.ns.porkbun.com`). The Cloudflare dashboard has no zone for this domain (the dash SPA hung because there's nothing to show); the Porkbun "Powered by Cloudflare" label is just Porkbun's DNS backend. The earlier "no records in the Porkbun editor" was a UI load glitch — **records do exist at Porkbun.** Manage all DNS in **porkbun.com → Account → Domain Management → fuzzynuts.xyz → DNS** (the editor I opened in tab 5).

**Live records (resolved 2026-06-06 via DNS-over-HTTPS — ground truth):**

| Host | Type | Value | Points to |
|------|------|-------|-----------|
| `fuzzynuts.xyz` (apex) | A | `216.198.79.1` | **Vercel** anycast |
| `www.fuzzynuts.xyz` | CNAME | `3bd0f2457dd48d4c.vercel-dns-017.com` (→ `216.198.79.1`, `64.29.17.1`) | **Vercel** |
| `world.fuzzynuts.xyz` | CNAME | `efficient-tenderness-production.up.railway.app` (→ `69.46.46.38`) | **Railway** API ✅ |
| `game.fuzzynuts.xyz` | A | **`67.205.132.6`** | **the live VPS** ⚠️ |
| `api.fuzzynuts.xyz` | — | NXDOMAIN (does not exist) | — |
| no `_dmarc`, no MX | — | — | — |

**Answers to your three questions:**
1. **Records pointing to the VPS IPs:** `game.fuzzynuts.xyz → A → 67.205.132.6` points at the **live droplet**. **Nothing points to the stale `137.184.194.158`** (confirmed absent from DNS). ✅ **UPDATE 2026-06-06: the droplet is live for gameplay — this `game` record is REQUIRED. KEEP it. Do not delete.**
2. **GitHub Pages records:** **none.** The apex and `www` resolve to Vercel, not `github.io`. GitHub Pages only serves its `*.github.io` URL — no DNS cleanup needed for it (just disable Pages per §5a).
3. **Apex / www (for the Vercel attach):**
   - apex `fuzzynuts.xyz` → A `216.198.79.1` (Vercel); `www` → CNAME to `…vercel-dns-017.com`.
   - ⚠️ **Inconsistency to resolve:** apex+www already resolve to **Vercel**, yet the `fuzzynuts-optimized` project only has `fuzzynuts-optimized.vercel.app` attached (§0 Vercel). So `fuzzynuts.xyz` is currently bound to a **different/older Vercel project** (or is pointed at Vercel but unclaimed → would serve a Vercel error page). **Before changing DNS:** in Vercel, check which project owns `fuzzynuts.xyz` (Account → Domains, or each project's Settings → Domains). Then either move the domain to `fuzzynuts-optimized` (Vercel will keep the same `216.198.79.1` / vercel-dns target — likely **no Porkbun change needed**) or repoint as Vercel instructs.
   - `world` correctly points to Railway — **leave as is.**

**Net DNS to-do (all in Porkbun):** ~~delete the `game` A record~~ **KEEP the `game` A record (VPS is live)**; reconcile which Vercel project owns the apex/www. No `137.x` record exists. No Cloudflare action (no zone there).

---

## 7. Secrets-management recommendation going forward
- Stop shipping real-looking secrets as `.env.example` "examples" (already fixed in Batch 3 — values are now `__GENERATE_WITH_…__`).
- Adopt one source of truth: **Doppler** or **1Password CLI** (`op run`) to inject env into local/dev, and keep Railway/Vercel dashboards as the prod store. This avoids the current drift (placeholder on one service, real on another, none on Vercel).
- Turn on **DigitalOcean automated backups** (or scheduled snapshots) for any future always-on droplet — today there were none.
- Enable **2FA on Porkbun** (the dashboard is actively warning it's off) and confirm 2FA on Railway/Vercel/DO/Cloudflare/Reown.

---

## Priority order (suggested)
1. ~~Stop the money: VPS snapshot + destroy~~ **REVISED: VPS is live for gameplay — KEEP it running. Take a safety snapshot only (§4); do not destroy. Optionally downsize later if usage allows.**
2. **Make the site actually work at launch:** §3 Vercel env vars (esp. Reown ID, lockdown pw) + §0 Reown allowlist fix below.
3. **Reown allowlist:** add `https://fuzzynuts.xyz` (and the vercel.app preview) at dashboard.reown.com → Fuzzynuts → Configuration → Domain → **+ Domain**. Today only `www.` is allowed, so wallet connect fails on the real origin.
4. **GitHub tidy:** §5 (Pages off, gh-pages delete, close Dependabot PRs, delete remote branches, protect main).
5. **Railway hygiene:** §2 (drop stale `MONGO_URL`), §1 (placeholder secret).
6. **DNS:** §6 Cloudflare record cleanup after the droplet is gone.

---

## ✅ Audit concluded (2026-06-06)
All five phases complete. Live read-only inspection covered Railway, Vercel, DigitalOcean, GitHub, Porkbun, Reown, and DNS (via DoH) — **no dashboard state was changed anywhere.** Deliverables in `_audit/`: `EXTERNAL_RESOURCES.md`, `STRUCTURE_AUDIT.md`, `REORGANIZATION_PLAN.md`, this file; plus `CHANGELOG-audit-2026-06-06.md` in the repo. Repo cleanup committed locally on `main` (checkpoint `9adab3c`); nothing pushed. Full restore tarball at `~/project-backups/project-audit-backup-2026-06-06-1612.tar.gz`.

**Top 3 things to do, in order:** (1) take a **safety snapshot only** of the **live** droplet `67.205.132.6` — **KEEP it running**, keep the `game` DNS record (§4, §6); (2) add Vercel env vars + add apex `fuzzynuts.xyz` to the Reown allowlist so the site works at launch (§3, §7); (3) GitHub tidy — disable Pages, delete `gh-pages`, close the 5 Dependabot PRs, delete remote feature branches, protect `main` (do **not** remove the `VPS_*` Actions secrets — they're needed to deploy to the live VPS) (§5).
