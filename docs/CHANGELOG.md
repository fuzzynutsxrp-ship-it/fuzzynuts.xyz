# Changelog & Handoff Notes

Running log of significant changes, plus the launch runbook and known
gotchas. Newest first. For the current layout see `PROJECT_STRUCTURE.md`;
for env/security see `PRODUCTION_ENV.md`.

---

## 2026-05-25 — Pre-launch hardening + front-page overhaul

A large pass covering accessibility/perf hardening, a critical-customer
front-page redesign, the game-card cabinet redesign, and several real bug
fixes. All shipped to `main` → Vercel production (site is still behind the
pre-launch password lockdown).

### Accessibility & performance
- **Global reduced-motion**: added `providers/MotionProvider.tsx`
  (`<MotionConfig reducedMotion="user">`) at the root so every Framer Motion
  animation respects the OS "reduce motion" setting. A CSS `@media` query
  alone can't stop JS-driven Framer loops.
- **FallingNuts canvas** now gates its `requestAnimationFrame` loop on
  `matchMedia('(prefers-reduced-motion: reduce)')` — renders one static frame
  for reduced-motion users (a CSS media query can't stop a rAF loop).

### Front-page overhaul (skeptical-first-visitor restructure)
- Merged `PrizeTiers` + `WalletCTA` → **`sections/Prizes.tsx`** (one prize
  promise + a single connect CTA; killed a back-to-back duplicate pitch and
  the old sci-fi maximalism).
- Merged `Tokenomics` + `OnChainVerification` (+ two rescued feature chips:
  Anti-Bot, Community-Governed) → **`sections/Trust.tsx`** ("Don't Trust.
  Verify."), moved up so the rug-pull objection is answered early.
- **Cut** the standalone `Features` section (4 of 6 items duplicated other
  sections); deleted `Features.tsx`, `Tokenomics.tsx`, `OnChainVerification.tsx`,
  `PrizeTiers.tsx`, `WalletCTA.tsx`.
- Replaced image-wordmark headings with real text `<h2>`s (consistent type
  scale + selectable/SEO text). New order:
  `Hero → GamesShowcase → Prizes → Trust → HowToGet → Footer`.
- Hero: sharpened copy; later replaced the heavy "Are You in the Top 3?"
  card with a compact teaser pill linking to `#prizes` (Prizes owns the pitch).
- Navbar: dropped the dead `#features` link, added `#prizes`.

### Trust section donut
- Replaced three independent progress bars (the 2% slice read as a broken
  empty rail) with a **donut hero + clean legend** (dot · label · % · amount).
- Recolored the 2% founder slice `#8B6914` → **`#a855f7`** (purple) for
  contrast; added segment separators; enlarged the donut and centered the
  **Fuzz squirrel mascot** in the hole above "321B / Fixed Supply".
- Hover ties a slice to its legend row. Added a subtle scrim behind the
  section so text reads over the bright forest backdrop.

### Game cards → full arcade cabinets (`GamesShowcase.tsx`)
- Backlit **marquee** header (title + genre) on top, screen in a **bezel**
  with CRT glass (diagonal glare, edge vignette, scanlines ~0.2–0.3),
  **control deck** with two round buttons + a chunky domed PLAY button +
  "INSERT COIN" caption, and accent **T-molding** edge trim.
- CSS-layer effects only (no shaders); existing `motion-safe`/reduced-motion
  gating preserved.

### Wallet & backend
- **Joey/WalletConnect**: added `"joey"` to the `WalletProvider` union and
  `setConnectedFromAdapter` / `setDisconnectedFromAdapter` to the store; wired
  `connect()`/`disconnect()` through the Joey adapter. (Fixed the type errors
  that were breaking `next build`.)
- Adopted **`lib/wallet/xamanService.ts`** in the store (replaced inline Xaman
  PKCE code + the `window._XummPkce` logout hack); `autoReconnect` now silently
  re-validates a returning Xaman session via the cached JWT.
- **`middleware.ts`** edge lockdown shipped: HTTP Basic Auth, fail-closed,
  rate-limited, with noindex/no-cache headers. Username `admin`, password from
  `SITE_LOCKDOWN_PASSWORD`.

### Bug fixes
- **Survivors/Racer leaderboards were silently empty.** The backend (via
  `fuzzy-score.js`) stores legacy slugs `survivors` / `racer`, but the frontend
  queried with canonical `fuzzy-survivors` / `nut-racer`. Wired
  `features/arcade/slugAliases.ts` (`toBackendSlug`) into `useLeaderboard` and
  `useLeaderboardSSE` (API query + localStorage lookup). Identity for aligned
  slugs, so other games are unaffected.
- **`mergeScores`** had an early-return that skipped its sort+cap when there
  were no local scores → the leaderboard could render unsorted or >50 rows.
  Removed the shortcut. Surfaced by wiring up the unit tests.
- **Top Secret** deep links loaded an empty iframe; set its registry status to
  `"coming-soon"` and the `/games/[slug]` route now renders
  `ComingSoonGamePage` for any coming-soon game.
- Committed the missing **Nut Racer** assets (`nut-racer.js`, `sprites.png`);
  the game's `index.html` was loading a 404'd script in production.

### Tooling
- Installed **vitest** (pinned `^2` for Node 18/20 compatibility) + `test`
  scripts + `vitest.config.ts` scoped to `src/` (avoids the orphaned tests
  under `docs/archive/`). `npm test` → 19/19 pass.

---

## Launch runbook (going public)

The site currently runs **locked + noindexed**. To go live:

1. **Drop the password gate** — remove (or blank) `SITE_LOCKDOWN_PASSWORD` in
   the Vercel project env. ⚠️ The middleware is **fail-closed**: if the var is
   simply unset while `middleware.ts` is deployed, the whole site returns 503.
   To truly open it, either remove the middleware or have it short-circuit when
   indexing is enabled (decide before launch).
2. **Allow indexing** — set `NEXT_PUBLIC_ALLOW_INDEXING=true` in Vercel
   (Production scope). Defaults to `noindex`.
3. **Redeploy** and verify: a fresh private-window load shows the site (no 503,
   no password prompt) and the page source shows `<meta name="robots"
   content="index, follow">`.
4. Confirm the OG image unfurls (Twitter/Discord) and run a Lighthouse mobile
   pass.

See `PRODUCTION_ENV.md` for the full env table.

---

## Known gotchas & deferred items

- **Fail-closed lockdown** — see runbook step 1. Don't just clear the password.
- **Backend slug mismatch** — leaderboard reads/writes go through
  `slugAliases`. If the Mongo data is ever migrated to canonical slugs, update
  (or delete) that module.
- **vitest pinned to v2** — v4 needs Node 20.12+. Bump only when CI/Node is
  standardized on 20.12+.
- **Mobile not yet verified on a real device** — responsive code is in place
  (breakpoints, FloatingMascot hidden < 640px, reduced particles), but do a
  phone pass on the Trust section density and hero teaser wrap.
- **`docs/archive/`** (~2 MB, an old game's dev journal + screenshots) is
  orphaned clutter and a candidate for removal.
- **Unused leftovers**: `lib/utils.ts` still exports `FEATURES` (the cut
  section's data); `components/home/HeroPrizeTeaser.tsx` and `WeeklyPrizes.tsx`
  are not currently rendered.
