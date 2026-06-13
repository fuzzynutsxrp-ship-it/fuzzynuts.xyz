# STATE.md — the one source of truth for "where are we?"

> **Last verified:** 2026-06-13 (by Claude, against `main` @ `16cfbad`)
> **Current phase:** `pre-launch-hardening`
> **Update rule:** Whenever you finish a meaningful change, edit THIS file in the
> same PR. Re-verify the "Last verified" line against `git log -1` before trusting it.

This file supersedes `PROJECT_STATE.md`, `.hermes-state.json`, and
`.hermes-recovery.md` as the human-maintained "where are we" record. They are
deprecated and kept only for history.

Precedence when files disagree:

1. **`HERMES.md`** — the rules contract. Always wins.
2. **This file (`docs/STATE.md`)** — current state, phase, and launch blockers.
3. **`docs/STATUS.md`** — auto-generated audit table (`pnpm status`). Regenerate; never hand-edit.
4. Everything else (`docs/SCOPE-*.md`, `docs/audit-*/`) — point-in-time history.

---

## 0. Before you start ANY work (this is how drift died)

```bash
pnpm preflight     # fetches origin, REFUSES to proceed if your clone is behind main
```

The drift that wasted sessions was caused by working in clones that were silently
behind `origin/main`, then reporting commits that never reached the canonical repo.
`pnpm preflight` makes that impossible to miss. Run it first, every time.

Rules of the road (full version in `HERMES.md`):

- One feature branch per concern off an up-to-date `main`. Never commit on `main`.
- `git push` from a clone that has credentials; if a sandboxed agent can't push,
  it must say so and hand the human the exact push command — never pretend it pushed.
- Update the "Last verified" line and this file's checklists in the same PR.

---

## 1. What is live and verified

| Component | Status | Evidence (re-runnable) |
|---|---|---|
| Frontend (Vercel) | ✅ LIVE | `curl -sI https://www.fuzzynuts.xyz/` → 200, `server: Vercel` |
| API (Railway) | ✅ LIVE v2.1 | `curl .../healthz` → `{"ok":true,"version":"2.1",...}` all 6 env vars present |
| Games served | ✅ 38 game dirs under `apps/web-arcade/public/games/` | `ls` that dir |
| Security headers | ✅ | `frame-ancestors 'none'`, HSTS, `nosniff`, `no-store` on live responses |

**Cannot be verified from a sandbox** (human must check the dashboards): Vercel
project settings, Railway dashboard/secrets, VPS `67.205.132.6` (RSC TeaVM client),
on-chain XRPL distributor state, Porkbun DNS, Xaman/Joey key tier.

---

## 2. Launch blockers (must clear before public announcement)

Status legend: 🔴 open · 🟡 in progress · ✅ done · 🔒 needs ADR + CODEOWNERS review (HERMES.md §1.3/§4)

| # | Blocker | Status | Notes |
|---|---|---|---|
| P0-1 | `games.json` still lists 40 third-party MMOs (Game of Thrones, Elvenar…) | 🔴 | Live homepage shows competitor games linking to 404s. Real games = the 38 dirs. |
| P0-2 | `SCORE_CAPS` diverge across 3+ sources (10M ceiling vs 99M in `arcade-core` vs ~1B in `scores.ts`) | 🔴 🔒 | Touches `packages/arcade-core/src/constants/` → needs ADR. |
| P0-3 | Server `VALID_GAMES` accepts only 6 slugs (`scores.ts`); a 2nd validator uses a different source | 🔴 🔒 | Unify on one source (SCORE_CAPS keys). |
| P0-4 | Score submissions not HMAC-verified — leaderboard trivially spoofable | 🔴 🔒 | `shared-anticheat/hmac.ts` exists but isn't enforced in `scores.ts`. |
| P0-5 | Wallet auth is mocked (`MOCK_SIGNATURE_`, hardcoded address) | 🔴 🔒 | Touches `auth` route (HERMES.md §4). |
| P0-6 | No XRPL signature verification wired into auth/score flows | 🔴 🔒 | `xrpl-token-utils/src/verify.ts` exists, unused. |
| P1-7 | `apps/mobile-capacitor` typecheck fails (`TS6059: rootDir`) | 🔴 | Blocks `pnpm typecheck` green. Scaffold only, not launch-critical but blocks CI. |

## 3. Not launch-blocking (track, don't gate on)

- P2: dedupe game source trees (`games-build/games` vs `web-arcade/public/games`).
- P2: implement the games-build bundling pipeline (currently "deferred", serves raw static files).
- P2: `arcade-core` test fails — a cap of 99,000,000 exceeds the 10,000,000 sanity ceiling (same root cause as P0-2).
- P3: prune ~7 stale local + ~26 remote branches (dependabot + abandoned UI experiments).

## 4. Manual steps only the human can do (off-repo)

XRPL on-chain `SetRegularKey` / `SignerListSet` 2-of-3 / `AccountSet asfDisableMaster`
on the NUT distributor (ADR 0006); rotate/verify Railway secrets; obtain production
Xaman/Joey keys (current Xaman key is a test key); confirm Vercel Framework Preset =
Next.js + Root = `apps/web-arcade`; confirm Porkbun DNS; confirm VPS RSC client serving.

---

## 5. Where the bodies are buried (key file map)

| Concern | File |
|---|---|
| Game catalog (homepage carousels) | `apps/web-arcade/public/data/games.json` |
| Server score validation + caps | `apps/api/src/routes/scores.ts`, `apps/api/src/features/arcade/validation/scoreMiddleware.ts` |
| Canonical score caps | `packages/arcade-core/src/constants/score-caps.ts` |
| Client-side caps | `apps/web-arcade/public/games/fuzzy-score.js` |
| HMAC signing | `packages/shared-anticheat/src/hmac.ts` |
| Wallet auth middleware | `apps/api/src/middleware/walletAuth.ts` |
| XRPL signature verify | `packages/xrpl-token-utils/src/verify.ts` |
| RSC auto-login (VPS) | `tools/fix-teavm-js-autologin.sh` |
