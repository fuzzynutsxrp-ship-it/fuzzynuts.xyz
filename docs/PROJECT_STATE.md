# Fuzzynuts — PROJECT STATE (START HERE)

> **Single source of truth.** Any new session (Cowork, Claude Code, Antigravity,
> any tool) should read this FIRST before changing anything. When you change
> something material — an account, an env var, a deploy target, a decision —
> update this file in the same commit. No secrets live here (only public IDs
> and where the secrets are stored).
>
> Last updated: 2026-05-27

---

## Repos & deploy targets

| Piece | Repo | Branch → Deploy | Local path |
|---|---|---|---|
| **Frontend** (marketing + arcade UI) | `github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz` | `main` → **Vercel** (auto) | `…/AI Tools/FuzzyNuts Optimized/fuzzynuts-optimized` |
| **Backend** (Fuzzynuts World server, Kaetram fork; also serves `/api/scores` + `/api/rewards`) | `github.com/fuzzynutsxrp-ship-it/fuzzynuts-world` (fork of `Kaetram/Kaetram-Open`, off `upstream/develop` @ base `4bdbd6d50` 2024-01-14, v0.5.5, ~45 ahead) | `develop` → **Railway** (auto) | `…/AI Tools/Fuzzynuts/kaetram` |
| Backend reference mirror (READ-ONLY, stale, NOT deployed) | — | — | `…/AI Tools/FuzzyNuts Optimized/backend-reference` |

- **API base:** `https://world.fuzzynuts.xyz` (hardcoded in the frontend).
- Railway project: **brilliant-nurturing** (`production` env, US West) — service **efficient-tenderness** (`world.fuzzynuts.xyz`) + MongoDB service (`mongo:8.3.1`, proxy `tramway.proxy.rlwy.net`).

## Accounts & services

- **Reown / WalletConnect Cloud:** Team `Shafster`, Project `Fuzzynuts`.
  Project ID = `238a1bd9e657a0efbe275e457e73c426` (PUBLIC client id; used as `NEXT_PUBLIC_PROJECT_ID`).
- **XRPL mainnet:** NUT issuer `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` (blackholed) ·
  distributor/Community Nut Jar `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh` ·
  NUT/XRP **AMM pool exists** (seeded ~12 XRP : 16.2M NUT, **thin — already sniped**; payouts do NOT rely on it, see guard).
- XRP→USD reference: on-chain **XRP/RLUSD** AMM (RLUSD issuer `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`).

> **$NUT is a TEST token pre-launch.** Liquidity %, AMM pool depth/address, the
> "80% In Liquidity" stat, and any on-chain price are **inconsequential right
> now** — do NOT flag them as rug risks or "claim vs on-chain mismatches."
> Real liquidity/economics get set at the real launch.

## Environment variables — where & status

**Frontend (Vercel, baked at build time — `NEXT_PUBLIC_*`):**
| Var | Value / status |
|---|---|
| `NEXT_PUBLIC_PROJECT_ID` | **`238a1bd9e657a0efbe275e457e73c426`** — set this in Vercel (Production) so Joey/WalletConnect works. |
| `NEXT_PUBLIC_ALLOW_INDEXING` | launch switch (`true` to allow indexing; default noindex). |
| `NEXT_PUBLIC_SITE_URL` | optional; defaults to `https://fuzzynuts.xyz`. |

**Backend (Railway → Variables):**
| Var | Value / status |
|---|---|
| `REWARDS_ADMIN_SECRET` | set (custom value). **Must match** the GitHub Actions secret of the same name. |
| `NUT_USD_PRICE_FALLBACK` | `0.000001` (price anchor; the deviation guard uses it). |
| `PRIZE_USD_1` / `_2` / `_3` | `0.05` / `0.03` / `0.02` — **TEST values**. |
| `MAX_WEEKLY_NUT_EMISSION` | default `1000000` (soft cap). |
| `MAX_PRICE_DEVIATION` | default `0.25` (AMM trusted only within 25% of fallback). |
| `COMMUNITY_NUT_JAR_SEED` | set (distributor wallet seed — Railway ONLY, never elsewhere). |
| `MONGO_URL`, game-server vars | set (see `PRODUCTION_ENV.md`). |

**GitHub Actions secret (fuzzynuts-world repo):** `REWARDS_ADMIN_SECRET` (= the Railway value).

## Rewards system (how it works now)

- Prizes are **announced in USD**; NUT amount is computed at a **Monday 00:00 UTC snapshot** and locked for the week.
- Snapshot trigger: GitHub Action `weekly-prize-snapshot.yml` (cron + manual `workflow_dispatch`, with a `force` input to overwrite a locked week).
- **Price deviation guard:** the snapshot uses the on-chain AMM price only if within `MAX_PRICE_DEVIATION` of `NUT_USD_PRICE_FALLBACK`; otherwise it uses the fallback (protects payouts from the thin/sniped pool).
- Endpoints: `GET /api/rewards/tiers` (public, drives homepage Prizes + leaderboard + profile), `GET /eligibility`, `POST /claim`, `POST /snapshot` (admin), `GET /claim/status`, `GET /health`.
- Mongo (driver `mongodb` ^6.0.0, no mongoose; defined in `packages/server/src/api/{scores,rewards}.ts`):
  - `weekly_prize_tiers` — one doc/week, unique idx `{weekKey:1}`.
  - `prize_distributions` — unique idx `{weekKey:1, wallet:1, type:1}`, partial on `type='individual_claim'`.
  - `arcade_scores` — unique idx `{wallet:1, game:1, weekKey:1}`; leaderboard idx `{weekKey:1, game:1, score:-1}` and `{weekKey:1, score:-1}`.
  - also: `reward_queue`, `achievement_rewards` (no explicit indexes).
  - Running server: **MongoDB 8.3.1** (Railway Docker `mongo:8.3.1`, US-West, 1 replica). ⚠ Code's driver is `mongodb` 6.0.0 — predates server 8.x; bump driver to ≥6.12 (or 7.x) before launch.
  - **Token audit ($NUT):** none on file — no third-party security review. Revisit at launch (test token pre-launch).

## Wallet connect

- **Joey + Xaman only** (GemWallet/Crossmark removed from the UI; store still supports them as dead paths).
- Joey runs over WalletConnect → **requires `NEXT_PUBLIC_PROJECT_ID`** (above). Plumbing: `store/wallet.ts`, `providers/JoeyProvider.tsx`, `lib/wallet/joey*`.

## ⚠️ Critical warnings

- **DO NOT `git stash pop`** the May-24 stash in the frontend repo (`"in-flight wallet/registry refactor — auto-stashed by claude before removing PasswordGate"`). It is a stale fossil that would DELETE `scripts/rewards-api.js`, `scoreMiddleware.ts`, `PasswordGate.tsx`, tests, and clobber the front-page overhaul + all rewards work. Drop it, don't apply it.
- Backend commits were made with `--no-verify` (husky/`yarn` unavailable in the assistant sandbox) — they are typechecked (`tsc`) but not Prettier-formatted. Run `yarn lint-staged` locally if you want the format pass.
- The frontend is still behind the **pre-launch password lockdown** (`middleware.ts`); it is **fail-closed** — see the launch runbook in `CHANGELOG.md` before touching it.

## Open decisions / launch checklist

- [ ] Set `NEXT_PUBLIC_PROJECT_ID` in Vercel + redeploy, then test the Joey button.
- **Prize values: stay on TEST amounts ($0.05/$0.03/$0.02). DO NOT set real values** — this is a live *test* wallet (owner's decision). Real values + `MAX_WEEKLY_NUT_EMISSION` sizing are a **launch-day-only** task; don't propose them before then. No need to test higher amounts: display, XRPL precision, and the claim path all work identically at small amounts (the cap-scale-down path is tested by lowering the cap, not raising prizes).
- [ ] AMM pool: deepen or retire (currently thin & getting sniped).
- [ ] Reconcile minigolf score cap (client/registry 10,500 vs server 100,000).
- [x] Clean up: stale stash dropped + stray `create-nut-amm.cjs` removed (2026-05-27).
- [ ] Launch: drop the password lockdown + set `NEXT_PUBLIC_ALLOW_INDEXING=true` (runbook in `CHANGELOG.md`).
