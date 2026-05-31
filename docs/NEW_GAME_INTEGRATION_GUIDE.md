# 🐿️ New Game Integration Guide

> **Audience:** Any developer adding a new game to the Fuzzynuts Arcade.
> **Time estimate:** 1–2 hours for integration (assuming the game already exists as an HTML5 game).

This guide walks through every step to integrate a new game into the FuzzyNuts arcade — from the game page with arcade shell, through front page registration, to production deployment.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Phase 1: Create the Game Page](#2-phase-1-create-the-game-page)
3. [Phase 2: Register in the Frontend](#3-phase-2-register-in-the-frontend)
4. [Phase 3: Wire Up Score Integration](#4-phase-3-wire-up-score-integration)
5. [Phase 4: Build, Test, Deploy](#5-phase-4-build-test-deploy)
6. [File Change Summary](#6-file-change-summary)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Architecture

A new game touches the **frontend tier only**. The backend and blockchain tiers require zero code changes — scores are keyed by game slug and auto-contribute to weekly ranking.

```
┌─ FRONTEND ─────────────────────────────────────────────────────┐
│                                                                  │
│  src/lib/gameRegistry.ts         ← SINGLE SOURCE OF TRUTH       │
│    - Front page game card (GamesShowcase reads GAME_LIST)        │
│    - GameModal config (title, icon, color, sandbox)              │
│    - Leaderboard filtering                                       │
│    - Score validation (scoreCap)                                 │
│    - Route generation                                            │
│                                                                  │
│  public/games/{slug}/            ← Game files                    │
│    - index.html                    (arcade shell + game engine)  │
│    - service-worker.js             (cache-first offline)         │
│    - *.js, *.css, images, sounds  (game assets)                  │
│                                                                  │
│  public/games/fuzzy-score.js     ← Client score bridge           │
│    - SCORE_CAPS object             (anti-cheat ceiling)          │
│                                                                  │
│  src/features/arcade/constants/  ← Server score caps             │
│    - index.ts → SCORE_CAPS         (authoritative)               │
│                                                                  │
│  public/icons/icon-{slug}-pop.webp  ← Game icon (512×512 WebP)  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

> **Key insight:** `gameRegistry.ts` is the single source of truth. Adding an entry there automatically creates the front page card, GameModal config, leaderboard filtering, and score validation. No other front page files need changes.

---

## 2. Phase 1: Create the Game Page

### Directory structure

```
public/games/{slug}/
  index.html          ← Game page (loads shared arcade shell)
  {game}.js           ← Game engine
  {game}.css          ← Game styles
  service-worker.js   ← Cache-first offline support
  images/             ← Game assets (if any)
```

### index.html template

Every game page MUST follow this exact structure. The arcade shell provides nav bar, loading screen, mobile base styles, and score integration.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>{Title} — Fuzzynuts Arcade</title>
  <meta name="description" content="{description}">
  <link rel="icon" href="../../logo_512.png" type="image/png">

  <!-- Open Graph -->
  <meta property="og:title" content="{Title} — Fuzzynuts Arcade">
  <meta property="og:description" content="{description}">
  <meta property="og:type" content="website">

  <!-- Fonts (non-blocking pattern) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit&display=swap"
        rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Outfit&display=swap" rel="stylesheet"></noscript>

  <!-- Shared arcade shell -->
  <link rel="stylesheet" href="../../css/design-tokens.css">
  <link rel="stylesheet" href="../../css/arcade-shell.css?v=mobile-fix">
  <!-- Game-specific CSS -->
  <link rel="stylesheet" href="{game}.css">
</head>
<body>
  <!-- Nav injected by arcade-shell.js -->

  <!-- Game canvas/container -->
  <div id="gameContainer">
    <!-- Your game renders here -->
  </div>

  <!-- Overlays (pause, game-over, settings, etc.) -->
  <div id="pauseMenu" class="overlay" style="display: none">
    <!-- Pause UI -->
  </div>
  <div id="gameOver" class="overlay" style="display: none">
    <!-- Game over UI -->
  </div>

  <!-- Shared arcade shell -->
  <script src="../../js/arcade-shell.js?v=mobile-fix"></script>
  <script>
    // ⚠️ MUST be in regular <script>, NOT <script type="module">
    // Module scripts are deferred — ArcadeShell will be undefined
    ArcadeShell.init({
      slug: '{slug}',
      title: '{Title}',
      icon: '{emoji}',
      accentColor: '#{hex}',
      hideNavOnPlay: true,
      showLoader: false, // Set to false if game has its own start/loading screen
    });
  </script>

  <!-- Score bridge -->
  <script src="../fuzzy-score.js"></script>

  <!-- Game engine (AFTER arcade shell) -->
  <script src="{game}.js"></script>

  <!-- Score submission + service worker -->
  <script>
    // Read score from game engine or DOM
    function getScore() {
      try { return /* your score reading logic */ || 0; }
      catch(e) { return 0; }
    }

    // Auto-save on tab blur + page exit
    ArcadeShell.autoSave(getScore);

    // Periodic save every 15 seconds
    setInterval(function() { ArcadeShell.submit(getScore()); }, 15000);

    // Reset dedup on game restart
    // if (score === 0 && lastScore > 0) ArcadeShell.resetScore();

    // Register service worker for offline caching
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('./service-worker.js').catch(function() {});
      });
    }
  </script>
</body>
</html>
```

### Critical rules

| Rule | Why |
|------|-----|
| `ArcadeShell.init()` in regular `<script>`, NOT `<script type="module">` | Module scripts are deferred. ArcadeShell will be undefined. Shell nav/score completely broken. |
| `showLoader: false` if game has own start screen | Otherwise "Booting cabinet..." stays visible forever |
| `showLoader: false` if game has own loading screen (like minigolf's `#loadingScreen`) | Otherwise you get double loaders |
| `?v=mobile-fix` on arcade-shell.css and arcade-shell.js | Mobile browsers aggressively cache. Without this, users see old version for hours. |
| Overlay elements get class `overlay` | arcade-shell.css applies `touch-action: pan-y` so they scroll on mobile |
| Nav ID is `arcadeNav` | Any game-specific auto-hide code must use `getElementById('arcadeNav')`, NOT `fuzzyNav` |

### Canvas scaling (for fixed-dimension games)

If your game has a fixed pixel canvas (e.g., 1265×464), add CSS transform scaling. Use `min()` to constrain BOTH axes so landscape phones don't crop:

```css
@media (max-width: 1300px) {
  body { overflow: hidden !important; }
  #gameContainer {
    width: 100vw;
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #gameContainer .game-engine-wrapper {
    transform-origin: center center;  /* NOT top center */
    transform: scale(min(calc(100vw / CANVAS_WIDTH), calc(100dvh / CANVAS_HEIGHT)));
    margin: 0;
  }
}
```

### Touch control patterns

| Game Type | Touch Approach |
|-----------|---------------|
| Canvas 2D with custom engine | Engine's built-in touch API |
| Vanilla JS Canvas | Virtual joystick + tap buttons (Fuzzy Survivors pattern) |
| WASM/Emscripten | Touch-to-mouse event proxy (touchstart→mousedown, etc.) |
| Pseudo-3D Canvas | D-pad buttons with `@media (pointer: coarse)` visibility |

### Service worker template

```js
// service-worker.js
const CACHE = '{slug}-v1.0.0';
const ASSETS = [
    './',
    './index.html',
    './{game}.css',
    './{game}.js',
    // ... list ALL static assets (images, sounds, WASM, fonts, etc.)
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    event.respondWith(
        caches.match(req).then((hit) =>
            hit ||
            fetch(req).then((res) => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                }
                return res;
            }).catch(() => caches.match('./index.html'))
        )
    );
});
```

---

## 3. Phase 2: Register in the Frontend

### A. gameRegistry.ts (SINGLE SOURCE OF TRUTH)

**File:** `src/lib/gameRegistry.ts`

Add an entry to the `GAME_LIST` array. This automatically handles:
- Front page game card (GamesShowcase reads GAME_LIST)
- GameModal config (title, icon, color, sandbox)
- Leaderboard filtering
- Score validation (scoreCap)
- Route generation

```ts
{
  slug: "{slug}",                    // URL-safe kebab-case
  title: "{Title}",                  // Display name
  genre: "{Genre}",                  // Genre badge text
  color: "#{hex}",                   // Theme color for accents/badges
  description: "2-3 sentence description for SEO and game cards.",
  scoreCap: 99_999,                  // Anti-cheat ceiling (1.5× max achievable score)
  minPlayTime: 15,                   // Seconds before a score is valid
  controls: [                        // Control hints shown in sidebar
    "Arrow keys to move",
    "Space to jump",
  ],
  iconPath: "/icons/icon-{slug}-pop.webp",
  iframePath: "/games/{slug}/",
  sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  leaderboardEnabled: true,
  achievementsEnabled: false,
  status: "live",                    // "live" | "coming-soon" | "maintenance"
  scoreType: "high-score",           // "high-score" | "cumulative"
  loadingTips: [                     // Shown during loading screen
    "Tip 1 — controls or strategy",
    "Tip 2 — controls or strategy",
    "Tip 3 — controls or strategy",
    "Tip 4 — controls or strategy",
  ],
  touchHint: "Describe touch controls for mobile devices",
},
```

> **To make it the #1 featured game:** Place the entry at index 0 of the array (before Fuzzynuts World). GamesShowcase renders in array order.

### B. Game icon

**File:** `public/icons/icon-{slug}-pop.webp`

- Format: WebP, ~16KB target (use `cwebp -q 80`)
- Size: 512×512px
- Style: Pop-art illustration matching the Cyber-Nature aesthetic
- Background: Dark (#0A0A14) or transparent
- Subject: The game's primary visual motif

### C. Score caps

**Client — File:** `public/games/fuzzy-score.js` → `SCORE_CAPS` object

```js
var SCORE_CAPS = {
  // ... existing games ...
  '{slug}': XXXXX,  // ← ADD THIS
};
```

**Server — File:** `src/features/arcade/constants/index.ts` → `SCORE_CAPS`

```ts
export const SCORE_CAPS: Record<string, number> = {
  // ... existing games ...
  '{slug}': XXXXX,  // ← ADD THIS
};
```

**How to choose a score cap:**
- Play the game at maximum skill for 30 minutes
- Multiply the highest achievable score by 1.5×
- Round to a clean number
- This prevents bots from submitting absurd scores while allowing legitimate top players

---

## 4. Phase 3: Build, Test, Deploy

### Build

```bash
cd fuzzynuts-optimized/
npm run build
```

Expected: new game route appears in build output, zero errors.

### Integration test

```bash
npm run dev
```

| Test | Action | Expected |
|------|--------|----------|
| Route exists | Visit `http://localhost:3000/games/{slug}/` | Page loads, no 404 |
| Arcade shell nav | Visit game page directly (not in modal) | Nav bar visible with back button |
| GameModal | Click game card on homepage | Modal opens with game iframe |
| Nav suppressed in iframe | Observe game inside modal | No duplicate nav (arcade shell nav hidden) |
| Score submission | Play → game over | Score submits, leaderboard updates |
| Mobile layout | Resize to <640px | Touch controls visible, overlays scrollable |
| Service worker | DevTools → Application → Service Workers | Registered, assets cached |
| Homepage card | Navigate to `/` | New game card appears in arcade section |
| Loader | Open game | No stuck "Booting cabinet..." screen |

### Deploy

```bash
git add -A
git commit -m "feat: add {Title} as game #{N} in the arcade"
git push origin main
```

GitHub Pages auto-deploys in ~2 minutes.

### Post-deploy smoke test

```bash
# Game page loads
curl -s -o /dev/null -w "%{http_code}" https://fuzzynuts.xyz/games/{slug}/
# Expected: 200
```

---

## 5. File Change Summary

Every new game touches exactly these files:

| File | Change |
|------|--------|
| `public/games/{slug}/index.html` | New — game page with arcade shell |
| `public/games/{slug}/{game}.js` | New — game engine |
| `public/games/{slug}/{game}.css` | New — game styles |
| `public/games/{slug}/service-worker.js` | New — cache-first offline |
| `src/lib/gameRegistry.ts` | Add entry to `GAME_LIST` |
| `public/games/fuzzy-score.js` | Add slug to `SCORE_CAPS` |
| `src/features/arcade/constants/index.ts` | Add slug to `SCORE_CAPS` |
| `public/icons/icon-{slug}-pop.webp` | New — game icon |

**Files that do NOT change:**
- `arcade-shell.js` / `arcade-shell.css` — generic, handles any game
- `GameModal.tsx` — reads from gameRegistry automatically
- `GamesShowcase` — reads from gameRegistry automatically
- Backend API — scores are keyed by slug, auto-includes new games
- XRPL layer — rewards are slug-agnostic

---

## 6. Troubleshooting

### "Game page returns 404"

Slug missing from `gameRegistry.ts`. Check:
```bash
grep -n "{slug}" src/lib/gameRegistry.ts
```

### "Arcade shell nav doesn't appear"

`ArcadeShell.init()` is in `<script type="module">`. Move it to a regular `<script>` block AFTER `arcade-shell.js` loads.

### "Stuck on 'Booting cabinet...'"

Game has its own start/loading screen but `showLoader` defaults to `true`. Set `showLoader: false` in `ArcadeShell.init()`.

### "Score not appearing on leaderboard"

1. Check browser console for `[FuzzyScore]` messages
2. Verify `SCORE_CAPS` includes your slug in both `fuzzy-score.js` and `constants/index.ts`
3. Verify the `game` field in the POST body matches the slug exactly
4. Score exceeds cap → increase cap
5. Duration < 15 seconds → scores rejected

### "Overlays can't scroll on mobile"

Overlay elements need class `overlay`. arcade-shell.css applies `touch-action: pan-y` to `.overlay` elements. If you set `touch-action: none` on body (for game input), the overlay class override is required.

### "Canvas crops on landscape phone"

Using `transform-origin: top center` with only width-based scaling. Fix: use `center center` and constrain both axes with `min(calc(100vw/W), calc(100dvh/H))`.

### "Nav auto-hide code doesn't work"

Wrong element ID. The arcade shell injects `<nav id="arcadeNav">`. Use `getElementById('arcadeNav')`, NOT `fuzzyNav`.

### "Double loader visible"

Game has its own loading screen AND the arcade shell loader. Set `showLoader: false`.

### "Sticky hover on iOS"

Bare `:hover` rules cause elements to stay in hover state after tapping. Wrap in `@media (hover: hover) and (pointer: fine) { ... }`.

### "Content clipped by notch/dynamic island"

Missing `viewport-fit=cover` in viewport meta. Without it, `env(safe-area-inset-*)` values are 0.

---

## Mobile Optimization Checklist

Per-game checklist for mobile readiness:

- [ ] Viewport meta: `viewport-fit=cover`, `maximum-scale=1`, `user-scalable=no`
- [ ] Touch controls present and working for the engine type
- [ ] Canvas scaling: `min()` constrains both axes, `transform-origin: center`
- [ ] `showLoader: false` if game has own start/loading screen
- [ ] Overlays have class `overlay` (for scroll fix)
- [ ] Score wired: `ArcadeShell.autoSave()` + periodic `ArcadeShell.submit()`
- [ ] Service worker created with complete asset list
- [ ] Cache-bust `?v=mobile-fix` on arcade-shell.css and arcade-shell.js
- [ ] All interactive elements ≥ 44×44px touch targets
- [ ] No bare `:hover` rules (wrap in `@media (hover: hover)`)
