# CLAUDE.md — FUZZYNUTS-CTX v0.1.3

> **Auto-loaded by Claude Code / Cowork every session.** This is the compressed,
> session-priming context. The **human-maintained source of truth is
> `docs/PROJECT_STATE.md` — read it FIRST** for anything volatile (accounts,
> env, deploy targets, open decisions). If this file and `PROJECT_STATE.md`
> disagree, `PROJECT_STATE.md` wins; fix this file in the same commit.
>
> Retrieval anchors (prepend to project-aware queries):
> `FUZZYNUTS-CTX` · `[XRPL-NOT-EVM]` · `[NUT-TEST-TOKEN-PRELAUNCH]` ·
> `[BACKEND=world.fuzzynuts.xyz/Railway+Mongo]` · `[FE=Next15-runtime-Vercel]` ·
> `[LOCKDOWN-FAIL-CLOSED]` · `[SSOT=docs/PROJECT_STATE.md]`

## PROJECT ANCHOR
Fuzzynuts | v0.1.0 (HEAD `d280c9e`, 2026-05-27) | XRPL play-to-earn arcade hub: marketing site + 6-game arcade, $NUT rewards by weekly USD-pegged snapshot.
Hard constraints: edge password lockdown is FAIL-CLOSED (no `SITE_LOCKDOWN_PASSWORD` ⇒ 503 all routes); $NUT is a TEST token pre-launch (do NOT flag liquidity/price/AMM depth as rug/mismatch risk); prize values frozen at TEST ($0.05/$0.03/$0.02) until launch day; secrets (distributor seed, `REWARDS_ADMIN_SECRET`) live ONLY in Railway; never `git stash pop` the May-24 frontend stash.

## INVARIANT RULES (hard constraints — reject suggestions that violate)
1. **[XRPL-NOT-EVM]** No EVM patterns (Foundry/Viem/Wagmi/gas/Solidity). XRPL native only.
2. Authoritative score validation is **server-side `SCORE_CAPS`** on `fuzzynuts-world`. Client caps + `scoreSchema.ts` are advisory; never the security boundary.
3. Rewards payouts use the **price-deviation guard** (on-chain AMM price only within ±`MAX_PRICE_DEVIATION` 0.25 of `NUT_USD_PRICE_FALLBACK` 0.000001, else fallback). Never price directly off the thin/sniped AMM pool.
4. Secrets (`COMMUNITY_NUT_JAR_SEED`, `REWARDS_ADMIN_SECRET`) live in Railway only. `NEXT_PUBLIC_*` are public, build-time, secret-free.
5. **[LOCKDOWN-FAIL-CLOSED]** Pre-launch lockdown stays fail-closed; do not weaken `src/middleware.ts` outside the `CHANGELOG.md` launch runbook.
6. **[NUT-TEST-TOKEN-PRELAUNCH]** Prize values stay TEST until launch day; do not propose real economics.

## ARCHITECTURE CANON
**FRONTEND** — Next.js `15.5.18` App Router (Turbopack dev), **runtime build on Vercel** (project `fuzzynuts-xyz`; confirmed: no `output:'export'`, build emits `ƒ Middleware`). React `19.1.0` / TS `5.x` / Tailwind `3.4.19`. Render: `/` Static, `/games/[slug]` SSG via `generateStaticParams()`, `/leaderboard`+`/profile` static shells + client hydrate. State: Zustand `5.0.13` single store `src/store/wallet.ts` (localStorage persist; AES-GCM layer is cosmetic, protects only a public address). Anim: Framer Motion `12.38.0`. 3D: three `0.184.0` + @react-three/fiber `9.6.1`, lazy `next/dynamic` (~96 kB chunk) for one decorative `RotatingNut`. Assets: `public/` raw, `images.unoptimized:true`; games are static builds under `public/games/{slug}/` via iframe; `src/lib/gameRegistry.ts` = metadata SSOT. Edge: `src/middleware.ts` (Basic-Auth lockdown + `no-store`/security headers, matcher `/((?!_vercel).*)`). Shared First Load JS 103 kB; WalletConnect/Joey isolated in lazy chunk `8434` (~1.2 MB raw, NOT initial).

**ON-CHAIN (XRPL mainnet — no VM/Solidity/gas)** — Issued currency `NUT`. Issuer `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7` (**blackholed**, fixed supply 321,000,000,000). Distributor/Community Jar `rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh`. NUT/XRP AMM `r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg` (thin/sniped — payouts do NOT depend on it). Tokenomics 80% AMM / 18% Jar / 2% Founder (`src/lib/utils.ts`). Price ref: on-chain XRP/RLUSD AMM (RLUSD issuer `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`). Upgradeability N/A (immutable issued token).

**INFRA/SYNC** — Backend `fuzzynuts-world` (Kaetram MMORPG fork), repo `github.com/fuzzynutsxrp-ship-it/fuzzynuts-world`, `develop` → Railway (project `brilliant-nurturing` / `production` env; service `efficient-tenderness`, US-West) + MongoDB server `mongo:8.3.1` (proxy `tramway.proxy.rlwy.net`, 1 replica). API base **hardcoded** `https://world.fuzzynuts.xyz` (`src/features/arcade/constants/index.ts` `API_SCORES`/`API_REWARDS`; also inline in `Navbar.tsx`, `UserProfile.tsx`). Leaderboard: `EventSource('/api/scores/stream')` → `vercel.json` rewrite → backend SSE; poll fallback. Balance: direct XRPL **WebSocket** `wss://xrplcluster.com` (`NEXT_PUBLIC_XRPL_NODE`) via `src/hooks/useBalanceStream.ts`, HTTP `account_info`/`account_lines` fallback @30 s. Cache: `vercel.json` immutable 1-yr on assets — **nullified by middleware `no-store` until launch**. Mongo (driver `mongodb` ^6.0.0, no mongoose; `packages/server/src/api/{scores,rewards}.ts`): `arcade_scores` [idx `{wallet:1,game:1,weekKey:1}` uniq · `{weekKey:1,game:1,score:-1}` · `{weekKey:1,score:-1}`], `weekly_prize_tiers` [idx `{weekKey:1}` uniq], `prize_distributions` [idx `{weekKey:1,wallet:1,type:1}` uniq, partial `type='individual_claim'`], plus `reward_queue`, `achievement_rewards` (no explicit idx). Frontend repo `github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz`, `main` → Vercel auto.

**DATA FLOW**
- Scores: game iframe → `public/games/fuzzy-score.js` (client cap) → `POST /api/scores` (server `SCORE_CAPS` authoritative). Read: `GET /api/scores` (s-maxage 10 / SWR 30) + SSE `/api/scores/stream` (no-store). ⚠ minigolf cap mismatch: client 10,500 vs server 100,000 — unresolved.
- Rewards: Mon 00:00 UTC GH Action `weekly-prize-snapshot.yml` (cron + `workflow_dispatch force`) → price-deviation guard → writes `weekly_prize_tiers`. UI: `GET /api/rewards/tiers` (homepage Prizes + leaderboard + profile), `GET /eligibility`, `POST /claim`, admin `POST /snapshot`.
- Balance: XRPL ledger → `useBalanceStream` WS subscribe → Zustand `balance`/`nutBalance` → UI (debounce 500 ms). Read-only; no signing here.
- Wallet connect: UI → `store/wallet.ts connect()` → Xaman (CDN `xumm.min.js` OAuth) OR Joey (`JoeyProvider` → WalletConnect, requires `NEXT_PUBLIC_PROJECT_ID=238a1bd9e657a0efbe275e457e73c426`).

## DEPENDENCY & RISK MAP
`[Component] | [Version] | [Status] | [Bottleneck + mitigation]`
- Next.js | 15.5.18 | PROVEN | `images.unoptimized:true` defeats opt → drop flag + `<Image>` or pre-convert WebP/AVIF
- React/ReactDOM | 19.1.0 | PROVEN | keep App Router runtime, not export
- TypeScript | 5.x | PROVEN | `target ES2017` dated → bump ES2020+
- Tailwind | 3.4.19 | PROVEN | `globals.css` 1,291 lines — verify content purge
- Framer Motion | 12.38.0 | PROVEN | reduced-motion gated; fine
- Zustand | 5.0.13 | PROVEN | bespoke AES-GCM persist = needless cost → `persist` middleware plaintext
- Zod | 4.4.3 | PROVEN | live via `scoreSchema.ts` only
- @walletconnect/universal-provider | 2.23.9 | PROVEN | ~1.2 MB lazy chunk `8434`; load only on user-initiated Joey connect
- @joey-wallet/wc-client + wc-react | 1.0.4 | EXPERIMENTAL | niche XRPL wallet, single-vendor; isolate behind `lib/wallet/joey*`; needs `NEXT_PUBLIC_PROJECT_ID`
- Xaman via CDN `https://xumm.app/assets/cdn/xumm.min.js` | UNVERSIONED (always-latest, no SRI) | PROVEN (XRPL Labs) | supply-chain risk → self-host pinned copy or add SRI
- three + @react-three/fiber | 0.184.0 / 9.6.1 | PROVEN (lib) | ~96 kB for decorative nut → replace w/ CSS/SVG/Lottie
- lucide-react | 1.16.0 (decl `^1.14.0`) | PROVEN | tree-shaken; fine
- XRPL node `xrplcluster.com` | n/a | PROVEN (public cluster) | rate-limit risk at scale → dedicated node provider
- MongoDB | driver `mongodb` ^6.0.0 (installed 6.0.0, no mongoose) · **server `mongo:8.3.1`** (Railway) | PROVEN | ⚠ **version gap**: driver 6.0.0 predates server 8.x — bump driver to ≥6.12 (or 7.x) before launch for supported compat. Indexes locked (see Infra).
- Kaetram backend fork | base `4bdbd6d50` (2024-01-14), v0.5.5, 45 ahead, HEAD `bd6445fd0` | EXPERIMENTAL (fork) | fork of `Kaetram/Kaetram-Open` off `upstream/develop`; app submodule `Kaetram/Kaetram-App`. Drift mgmt: re-base/cherry-pick from upstream/develop
- GemWallet / Crossmark | n/a | LEGACY | dead in UI, live in `store/wallet.ts` switch → remove dead `case` arms

## DECISION LOG (shipped patterns only)
- Next App Router runtime on Vercel → enables edge middleware + headers + SSE rewrite static export can't → deprecate only if all server features removed.
- Static game builds in `public/games/{slug}/` + iframe, registry-driven → decouples engines from React shell → deprecate if a game needs SSR/secure server state.
- Server-authoritative `SCORE_CAPS`, client advisory → can't trust client for DB/payout integrity → NEVER deprecate (security invariant).
- USD-pegged weekly prize + Monday-UTC snapshot + deviation guard → protects payouts from thin AMM → deprecate at deep/liquid AMM launch.
- Edge HTTP Basic-Auth lockdown, fail-closed → strongest pre-launch gate, no client bypass → deprecate at launch (drop lockdown + `NEXT_PUBLIC_ALLOW_INDEXING=true`).
- Joey + Xaman only via Reown project ID → only XRPL wallets with reach → GemWallet/Crossmark already dropped (LEGACY).
- Direct XRPL WS balance stream + HTTP fallback (no xrpl.js) → avoids ~200 kB SDK on hot path → lazy-load xrpl.js on `/profile` if parsing grows.

## INVALIDATION TRIGGERS (refresh + version-bump this file)
- `docs/PROJECT_STATE.md` "Last updated" changes → re-read; it is SSOT.
- Launch executed (lockdown dropped + `NEXT_PUBLIC_ALLOW_INDEXING=true`) → bump to v1.0.0, flip TEST-token & lockdown invariants.
- Any change to `package.json` versions, `XRPL_CONFIG`, API base, or Mongo schema → refresh Dependency Map + Data Flow.
- Versioning: `FUZZYNUTS-CTX vMAJOR.MINOR.PATCH` — PATCH = dep/version, MINOR = data-flow/infra, MAJOR = chain/launch state.

## OPEN UNVERIFIED (locked items removed)
- ~~#1 static-export vs runtime~~ → RESOLVED v0.1.1: runtime build.
- ~~#5 Xaman CDN version~~ → RESOLVED v0.1.1: unversioned always-latest, no SRI (see Risk Map).
- ~~#3 Mongo declared surface~~ → RESOLVED v0.1.2: `mongodb` ^6.0.0 + index inventory (see Infra/Risk Map).
- ~~#3 residual runtime Mongo~~ → RESOLVED v0.1.3: server **MongoDB 8.3.1** (Railway, `mongo:8.3.1`). ⚠ driver 6.0.0 ≪ server 8.3.1 — bump driver before launch.
- ~~#4 Kaetram fork base~~ → RESOLVED v0.1.2: `upstream/develop`@`4bdbd6d50`, v0.5.5, 45 ahead (see Risk Map).
- ~~#2 Token audit status~~ → RESOLVED v0.1.3: **none** (no third-party review on file; revisit at launch).
- **All anchor blockers closed.** Pre-launch checklist lives in `docs/PROJECT_STATE.md`.
