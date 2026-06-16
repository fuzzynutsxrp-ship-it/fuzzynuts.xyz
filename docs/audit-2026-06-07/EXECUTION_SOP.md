# EXECUTION_SOP.md — Dummy-Proof Standard Operating Procedure

### FuzzyNuts infrastructure cleanup · prepared 2026-06-06 · execute top-to-bottom

**You** do all clicking/typing. This is the exact map, built from the live read-only audit. Work through the phases **in order** — Phase A generates two secrets you'll paste in Phase C.

**Reference values (from the live audit — don't substitute):**

- DigitalOcean droplet: **`fuzzynuts-game`**, public IP **`67.205.132.6`**, region **NYC1**, project **first-project**, **$18.00/mo**
- Railway project: **`brilliant-nurturing`** (environment **production**) · services **`efficient-tenderness`** (= `world.fuzzynuts.xyz`), **`fuzzynuts.xyz`** (= the API, `fuzzynutsxyz-production.up.railway.app`), **`MongoDB`**
- Vercel: team **Shafster's projects**, project **`fuzzynuts-optimized`** (Hobby)
- Reown: team **Shafster**, project **`Fuzzynuts`**, Project ID **`238a1bd9e657a0efbe275e457e73c426`**
- GitHub repo: **`fuzzynutsxrp-ship-it/fuzzynuts.xyz`**
- DNS host: **Porkbun** (NOT Cloudflare)

> ⚠️ The repo IP `137.184.194.158` is **stale** — it does not exist anywhere live. The only real droplet is **`67.205.132.6`**. Use that everywhere.

---

# PHASE A — VPS backup (KEEP THE DROPLET — do NOT tear down)

```
╔══════════════════════════════════════════════════════════════════════╗
║  🛑🛑🛑 ABORT TEARDOWN 🛑🛑🛑                                          ║
║  UPDATE 2026-06-06: 67.205.132.6 is CONFIRMED ACTIVELY IN USE for     ║
║  LIVE GAMEPLAY. KEEP THE DROPLET RUNNING. KEEP DNS RECORDS INTACT.    ║
║                                                                      ║
║  DO ONLY the backup + snapshot steps (A0–A6) — they're good hygiene  ║
║  since no snapshot/backup currently exists.                          ║
║  DO NOT do A5 Power Off, A7, or A8 Destroy. SKIP THEM ENTIRELY.      ║
╚══════════════════════════════════════════════════════════════════════╝
```

Goal (REVISED): back up the game data to your computer and take a DigitalOcean snapshot **as a safety net** — the droplet stays **live**. Also generate the two secrets you'll need in Phase C. **Stop after A6.**

### A0. Generate the secrets you'll need later (do this first, save the output)

Run locally and **paste the two outputs into a scratch note** — you'll use them in Phase C.

```bash
echo "GAME_SESSION_SECRET=$(openssl rand -hex 32)"
echo "SCORE_HMAC_SECRET=$(openssl rand -hex 32)"
echo "SERVER_SECRET=$(openssl rand -hex 32)"
```

- [ ] I copied all three values somewhere safe.

### A1. SSH into the droplet

> The droplet uses **root + password** auth. If you don't have the password: DigitalOcean → **Droplets → `fuzzynuts-game` → Access → Reset Root Password** (password emailed to you).

```bash
ssh root@67.205.132.6
```

- [ ] I'm now at a `root@fuzzynuts-game:~#` prompt.

### A2. Stop the services (so the database files are consistent)

```bash
systemctl stop account-server openrsc 2>/dev/null
systemctl disable account-server openrsc 2>/dev/null
```

- [ ] No errors (it's fine if it says "not found" for one of them).

### A3. Dump the data **on the droplet**

```bash
mysqldump -u root fuzzynuts_rsc > /root/fuzzynuts_rsc-$(date +%F).sql
tar czf /root/openrsc-sqlite-$(date +%F).tar.gz /opt/openrsc/server/inc/sqlite/*.db
cp /opt/account-server/.account_secret /root/account_secret.bak 2>/dev/null || true
ls -lh /root/*.sql /root/*.tar.gz /root/account_secret.bak
```

**Sanity check:** the `ls -lh` output shows a `.sql` file and a `.tar.gz` file that are **NOT 0 bytes**. If the `.sql` is empty, stop and tell me (the DB name may differ).

- [ ] Both backup files exist and have a real size.

### A4. Leave the droplet, copy the backups **to your computer**

```bash
exit
mkdir -p ~/project-backups/vps-fuzzynuts-game
scp root@67.205.132.6:'/root/fuzzynuts_rsc-*.sql' ~/project-backups/vps-fuzzynuts-game/
scp root@67.205.132.6:'/root/openrsc-sqlite-*.tar.gz' ~/project-backups/vps-fuzzynuts-game/
scp root@67.205.132.6:'/root/account_secret.bak' ~/project-backups/vps-fuzzynuts-game/
ls -lh ~/project-backups/vps-fuzzynuts-game/
```

> **Windows (PowerShell)?** Same `scp` works if OpenSSH is installed; replace `~` with `$HOME`.

**Sanity check:** the final `ls -lh` lists all three files **on your local machine** with real sizes.

- [ ] The backups are on MY computer (not just the droplet).

### ⛔ A5–A8 CANCELLED — the droplet is live; do NOT power off, snapshot-then-destroy, or destroy. After A6 (snapshot for safety), you are DONE with Phase A. The steps below are struck through and retained only for record.

### A5. ~~DigitalOcean — Power Off~~ ⛔ SKIP (keep it running)

1. Go to **cloud.digitalocean.com** → left sidebar **Manage → Droplets** → click **`fuzzynuts-game`**.
2. **Sanity check:** the page header shows **`fuzzynuts-game`** and **Public IPv4 `67.205.132.6`**. If the IP is anything else, **stop**.
3. Top-right: click the **Power** control (the on/off toggle) **or** **Actions ▾ → Power Off**. Confirm.
4. Wait until the status pill reads **Off** (grey).

- [ ] Status shows **Off**.

### A6. DigitalOcean — Snapshot (on the LIVE droplet — do NOT power off first)

1. On the droplet page, click the **Backups & Snapshots** tab.
2. Under **"About to make a change? Take a snapshot!"** click **Take Snapshot**.
3. Name it: `fuzzynuts-game-safety-2026-06-06` → confirm.
4. Wait for it to finish (a few minutes; you'll see it listed under Snapshots). A live snapshot is fine; gameplay continues.

- [ ] The snapshot appears in the Snapshots list and shows a size.

### ✅ Phase A complete — STOP HERE. The droplet stays running. Skip A7 and A8 below.

### A7. ⛔ CANCELLED — DO NOT DESTROY (droplet is live). Section retained for record only. 🛑🛑🛑 ~~POINT OF NO RETURN~~

```
╔══════════════════════════════════════════════════════════════════╗
║  STOP. DESTROYING THE DROPLET IS PERMANENT AND CANNOT BE UNDONE.  ║
║                                                                  ║
║  Before you click Destroy, CONFIRM ALL THREE:                    ║
║   [ ] A4 finished: the .sql AND .tar.gz are on YOUR computer     ║
║       at ~/project-backups/vps-fuzzynuts-game/ (non-zero size).  ║
║   [ ] A6 finished: snapshot 'fuzzynuts-game-final-2026-06-06'    ║
║       is listed and shows a size (not "in progress").            ║
║   [ ] The droplet IP is 67.205.132.6 (NOT 137.x).               ║
║                                                                  ║
║  If ANY box is unchecked, DO NOT PROCEED.                        ║
╚══════════════════════════════════════════════════════════════════╝
```

### A8. ⛔ CANCELLED — DO NOT DESTROY. The droplet must keep running for live gameplay. ~~DigitalOcean — Destroy~~

1. On the **`fuzzynuts-game`** droplet page, click **Actions ▾** (top-right) → **Destroy**.
2. In the left menu of the Destroy page, click **Destroy** (the big red section).
3. **Sanity check:** the confirmation dialog names the droplet **`fuzzynuts-game`**. If it names anything else, cancel.
4. Type the droplet name if prompted, then click **Destroy** / **Confirm**.
5. **Sanity check:** you're returned to the Droplets list and **`fuzzynuts-game` is gone**. (Billing for the droplet stops now; the snapshot keeps a tiny ~$0.06/GB/mo charge.)

- [ ] Droplet destroyed. **$18/mo charge stopped.**

> Leave `game.fuzzynuts.xyz` DNS for now — you'll delete that dangling record in **Phase E**.

---

# PHASE B — Make the Site Launch-Ready (Reown + Vercel)

### B1. Reown — allowlist the apex domain

1. Go to **dashboard.reown.com**. Top-left confirm Team **Shafster**, Project **Fuzzynuts**.
2. **Sanity check:** the **Project ID** reads **`238a1bd9e657a0efbe275e457e73c426`**.
3. Click the **Configuration** tab (top nav).
4. Scroll to the **Domain** section (it currently lists only **`https://www.fuzzynuts.xyz`**, "Allowlisted").
5. Click **+ Domain** (right side of the Domain header).
6. Enter exactly: `https://fuzzynuts.xyz` → **Add / Save**.
7. _(Optional but recommended)_ repeat **+ Domain** and add your Vercel preview URL `https://fuzzynuts-optimized.vercel.app` so previews can connect wallets.

- [ ] The Domain list now shows **both** `https://fuzzynuts.xyz` **and** `https://www.fuzzynuts.xyz`.

### B2. Vercel — add the missing Environment Variables

1. Go to **vercel.com** → team **Shafster's projects** → project **`fuzzynuts-optimized`**.
2. Top nav **Settings** → left sidebar **Environment Variables**.
3. **Sanity check:** the list currently says **"No Environment Variables Added."**
4. For **each** variable below: type the **Key**, type the **Value**, ensure **Environment** has **Production** checked (also check **Preview** if you want previews to work), then click **Save**.

   | Key                              | Value                                                         |
   | -------------------------------- | ------------------------------------------------------------- |
   | `NEXT_PUBLIC_PROJECT_ID`         | `238a1bd9e657a0efbe275e457e73c426`                            |
   | `NEXT_PUBLIC_XAMAN_API_KEY`      | _(your Xaman key — the test key is fine for now)_             |
   | `SITE_LOCKDOWN_PASSWORD`         | _(choose a strong password; the edge fail-closes without it)_ |
   | `NEXT_PUBLIC_SITE_URL`           | `https://fuzzynuts.xyz`                                       |
   | `NEXT_PUBLIC_API_BASE`           | `https://world.fuzzynuts.xyz/api`                             |
   | `NEXT_PUBLIC_SECURE_SITE_ORIGIN` | `https://fuzzynuts.xyz`                                       |

- [ ] All six rows now appear in the Environment Variables list.

### B3. Vercel — figure out which project owns `fuzzynuts.xyz`, then attach it

> The live DNS already points the apex+www at Vercel, but project **`fuzzynuts-optimized`** only has **`fuzzynuts-optimized.vercel.app`**. The custom domain is bound to a **different/older Vercel project**. Find it first.

1. Click your avatar/team → **Account/Team Settings → Domains** (team-level domain list). Find **`fuzzynuts.xyz`** and note which **project** it's assigned to.
2. **If it's on an old project you no longer use:** open that project → **Settings → Domains → `fuzzynuts.xyz` → Remove**. Then go to **`fuzzynuts-optimized` → Settings → Domains → Add → `fuzzynuts.xyz`** (and `www.fuzzynuts.xyz`) → follow Vercel's prompts. Vercel will say "Valid Configuration" if DNS already matches (it does: `216.198.79.1`).
3. **Sanity check:** under **`fuzzynuts-optimized` → Settings → Domains**, `fuzzynuts.xyz` shows **Valid Configuration** (green).
4. Go to **Deployments → latest → ⋯ → Redeploy** so the new env vars + domain take effect.

- [ ] `fuzzynuts.xyz` is attached to `fuzzynuts-optimized` and shows Valid Configuration.

---

# PHASE C — Railway Hygiene

All paths: **railway.com → project `brilliant-nurturing`** (top-left should read `brilliant-nurturing`, environment **production**).

### C1. Delete the stale `MONGO_URL` from the API service

1. In the canvas, click the **`fuzzynuts.xyz`** service tile (subtitle `fuzzynutsxyz-production.up.railway.app`).
2. Click the **Variables** tab.
3. **Sanity check:** you can see **both** `MONGO_URL` **and** `MONGODB_URI` in the list. (Keep `MONGODB_URI` — the code uses it.)
4. Hover the **`MONGO_URL`** row → click the **⋯** (kebab) at the right → **Delete** → confirm.
5. **Sanity check:** `MONGODB_URI` is still present; only `MONGO_URL` is gone. Railway will redeploy.

- [ ] `MONGO_URL` deleted from `fuzzynuts.xyz`; `MONGODB_URI` remains.

> Leave `efficient-tenderness`'s `MONGO_URL`/`MONGODB_*` alone — that service builds its connection from parts and has no `MONGODB_URI`. Don't touch it.

### C2. Replace the insecure placeholder `GAME_SESSION_SECRET` on `efficient-tenderness`

1. Click the **`efficient-tenderness`** service tile (subtitle `world.fuzzynuts.xyz`).
2. Click the **Variables** tab → find **`GAME_SESSION_SECRET`**.
3. Click its **Show value** (eye) icon. **Sanity check:** the current value is the literal string **`placeholder-set-real-value-in-dashboard`** (i.e. NOT a real secret). That confirms you're fixing the right one.
4. Click the **⋯** on that row → **Edit** → clear the field → paste the **`GAME_SESSION_SECRET`** value you generated in **A0** → **Update Variable**.
5. **Sanity check:** the value is now a 64-character hex string (re-click Show value to confirm). Railway redeploys.

- [ ] `GAME_SESSION_SECRET` on `efficient-tenderness` is now a real generated secret.

### C3. _(Optional)_ add the missing API secrets

On the **`fuzzynuts.xyz`** service → **Variables** → **New Variable**, add (using your A0 outputs), then **Add**:

- `SCORE_HMAC_SECRET` = _(your A0 value)_
- `SERVER_SECRET` = _(your A0 value)_
- [ ] Added (or consciously skipped).

---

# PHASE D — GitHub Cleanup

Repo: **github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz**

### D1. Disable GitHub Pages

1. Repo → **Settings** (top nav) → left sidebar **Pages**.
2. **Sanity check:** it says "Your site is live at `https://fuzzynutsxrp-ship-it.github.io/fuzzynuts.xyz/`" and Source = **Deploy from a branch → gh-pages**.
3. Under **Build and deployment → Source**, change the dropdown to **None**. _(If you see an **Unpublish site** button, click it too.)_

- [ ] Pages source is now **None** / site unpublished.

### D2. Delete the `gh-pages` branch

1. Repo → **Code** tab → click the branch dropdown → **View all branches** (or go to `/branches`).
2. In the search box type `gh-pages`.
3. **Sanity check:** the row reads **`gh-pages`** (it's ~320 behind `main`).
4. Click the **🗑 trash icon** on that row → confirm.

- [ ] `gh-pages` branch deleted.

### D3. Close the 5 Dependabot PRs

Repo → **Pull requests**. For each below, open it → scroll to bottom → **Close pull request**:

- [ ] **#14** chore(deps): bump the **react** group
- [ ] **#13** chore(deps): bump **@capacitor/ios** 7.6.5 → 8.3.4 _(major — only needed for iOS app)_
- [ ] **#11** chore(deps): bump the **next** group
- [ ] **#10** chore(deps-dev): bump **eslint** 9 → 10 _(major)_
- [ ] **#9** chore(deps-dev): bump **@types/node** 20 → 25 _(major)_
  > _(Optional: review #11/#14 first — minor dependency bumps are sometimes worth merging instead of closing.)_

### D4. Delete the stale remote feature branches

Repo → **Branches** (`/branches/all`). Click the **🗑 trash icon** on each (closing their PRs #5–#8 automatically):

- [ ] `ui-token-fixes`
- [ ] `migration/monorepo`
- [ ] `kill-glassmorphism`
- [ ] `headers-crisp-v2`
- [ ] `headers-crisp-v3`
- [ ] _(and any remaining `headers-crisp-_`, `degen-overhaul`, `hero-bg-degen-crush`, `fuzzybear-mobile-degen`)\*
  > Keep `main`. (These were already deleted locally; this removes the origin copies.)

### D5. ⛔ REVISED — KEEP the VPS GitHub Actions secrets

> The VPS is live and the `deploy-openrsc.yml` workflow still deploys to it, so these secrets are **needed**. **Do NOT delete `VPS_PASSWORD`.**

1. Repo → **Settings** → **Secrets and variables → Actions**.
2. **`VPS_HOST`**: it previously held the **stale** IP. **Update it** (don't delete): click `VPS_HOST` → **Update secret** → set value to **`67.205.132.6`** → Save. _(If it's already `67.205.132.6`, leave it.)_
3. Leave **`VPS_PASSWORD`** in place. _(Optional good practice: rotate it — reset the droplet root password in DigitalOcean, then update this secret to match. Not required.)_

- [ ] `VPS_HOST` = `67.205.132.6`; `VPS_PASSWORD` kept.

### D6. Protect `main`

1. Repo → **Settings** → left sidebar **Branches** → **Add branch ruleset** (or **Add classic branch protection rule**).
2. Branch name pattern: `main`.
3. Enable: **Restrict deletions** and **Block force pushes** (and optionally **Require status checks** → select the **CI** check).
4. **Create / Save**.

- [ ] `main` is protected (no force-push, no deletion).

---

# PHASE E — DNS (PORKBUN) — VERIFY ONLY, CHANGE NOTHING

```
╔══════════════════════════════════════════════════════════════════════╗
║  🛑 ABORT DNS TEARDOWN 🛑                                              ║
║  UPDATE 2026-06-06: VPS is live for gameplay, so                      ║
║  game.fuzzynuts.xyz → 67.205.132.6 is a REQUIRED record. KEEP IT.     ║
║  DO NOT delete any DNS record. This phase is now VERIFY-ONLY.         ║
╚══════════════════════════════════════════════════════════════════════╝
```

> ⚠️ **Correction:** your live DNS is hosted at **Porkbun** (nameservers `*.ns.porkbun.com`). There is **no Cloudflare zone** for this domain — don't go to Cloudflare.

### E1. ⛔ CANCELLED — do NOT delete the `game` record (it's live and required).

### E2. Verify all records are present and correct (read-only — change nothing)

Porkbun → **Account ▾ → Domain Management → `fuzzynuts.xyz` → DNS** (`porkbun.com/account/dns/fuzzynuts.xyz`). Confirm these exist:

- [ ] `game` **A → `67.205.132.6`** (live VPS) — **KEEP**
- [ ] apex `fuzzynuts.xyz` **A → `216.198.79.1`** (Vercel) — keep
- [ ] `www` **CNAME → `…vercel-dns-017.com`** (Vercel) — keep
- [ ] `world` **CNAME → `efficient-tenderness-production.up.railway.app`** (Railway) — keep

### E3. _(Optional)_ confirm the game host resolves to the live VPS

```bash
nslookup game.fuzzynuts.xyz 8.8.8.8
```

Expect the answer **`67.205.132.6`**.

- [ ] `game` resolves to `67.205.132.6` (live).

---

## Final checklist

- [ ] **Phase A:** backups on my computer + safety snapshot saved — **droplet KEPT RUNNING** (live gameplay)
- [ ] **Phase B:** Reown allowlists apex, Vercel env vars added, domain attached + redeployed
- [ ] **Phase C:** stale `MONGO_URL` gone, real `GAME_SESSION_SECRET` set
- [ ] **Phase D:** Pages off, `gh-pages` + remote branches deleted, 5 PRs closed, `main` protected, **VPS secrets KEPT** (`VPS_HOST` updated to `67.205.132.6`)
- [ ] **Phase E:** DNS verified, **all records kept** (`game` → `67.205.132.6` intact)

_Built from the 2026-06-06 live read-only audit. If any sanity check doesn't match what you see, stop and ask before clicking._
