# Games Build Pipeline

Source directory for all FuzzyNuts arcade games. Each game is a self-contained folder with HTML, JS, CSS, and assets.

## Structure

```
apps/games-build/
├── README.md              ← This file
├── template/              ← Starter template for new games
│   ├── index.html
│   ├── game.js
│   ├── game.css
│   └── service-worker.js
├── games/                 ← Individual game folders
│   ├── dragon-hoard/
│   ├── nebula-drift/
│   └── ...
└── scripts/               ← Build and deploy scripts
    └── deploy-game.sh     ← Copy game to public/games/
```

## Creating a New Game

1. Copy the `template/` folder to `games/<slug>/`
2. Rename files: `game.js` → `<slug>.js`, `game.css` → `<slug>.css`
3. Update `index.html` with game title, slug, and references
4. Implement game logic in `<slug>.js`
5. Register the game (see Registration Chain below)
6. Deploy: copy to `apps/web-arcade/public/games/<slug>/`

## Registration Chain (4 files)

Every game must be registered in exactly 4 locations:

1. **`packages/arcade-core/src/constants/slugs.ts`**
   - Add to `GameSlug` type union
   - Add to `GAME_SLUGS` array
   - Add to `ID_TO_SLUG` map
   - Add to `SLUG_TO_LEGACY_ID` map

2. **`packages/arcade-core/src/constants/score-caps.ts`**
   - Add score cap to `SCORE_CAPS` record

3. **`apps/games-build/games/<slug>/`**
   - Game source files (HTML, JS, CSS, assets)

4. **`apps/web-arcade/src/lib/gameRegistry.ts`**
   - Add `GameMetadata` entry to `GAME_LIST`

## Game Architecture

Each game uses the shared arcade shell:

```html
<!-- Shared shell -->
<link rel="stylesheet" href="../../css/design-tokens.css" />
<link rel="stylesheet" href="../../css/arcade-shell.css?v=mobile-fix" />
<script src="../../js/arcade-shell.js?v=mobile-fix"></script>
<script>
  ArcadeShell.init({
    slug: "my-game",
    title: "My Game",
    icon: "🎮",
    accentColor: "#ff2e88",
    hideNavOnPlay: true,
    showLoader: false,
  });
</script>

<!-- Score bridge -->
<script src="../fuzzy-score.js"></script>
```

## Score Integration

Games submit scores via `FuzzyScoreSubmit(slug, score, duration)`:

```javascript
// On game over
FuzzyScoreSubmit("my-game", finalScore, playDurationSeconds);
```

The score bridge:

- Writes to localStorage (instant, works offline)
- POSTs to backend API (async, fire-and-forget)
- Validates against SCORE_CAPS anti-cheat ceiling
- Requires minimum 5-second play duration

## Engine Options

| Engine            | Use Case                   | Example         |
| ----------------- | -------------------------- | --------------- |
| Vanilla Canvas 2D | Simple arcade games        | Dragon's Hoard  |
| Kaboom.js         | Platformers, complex games | Super Fuzzynuts |
| Three.js          | 3D games                   | Fuzzy Putt      |
| Custom            | Specialized engines        | Nut Racer       |

## Mobile Requirements

- Viewport meta: `viewport-fit=cover, maximum-scale=1, user-scalable=no`
- Touch controls: auto-detect with `'ontouchstart' in window`
- Canvas scaling: `min(calc(100vw/W), calc(100dvh/H))`
- Safe area insets: `env(safe-area-inset-*)`
- `showLoader: false` if game has own start screen

## Deployment

```bash
# Copy game to public directory
cp -r apps/games-build/games/<slug> apps/web-arcade/public/games/<slug>

# Force add (public/games/* is in .gitignore)
git add -f apps/web-arcade/public/games/<slug>/

# Or add exception to .gitignore
echo '!apps/web-arcade/public/games/<slug>/' >> .gitignore
git add apps/web-arcade/public/games/<slug>/
```
