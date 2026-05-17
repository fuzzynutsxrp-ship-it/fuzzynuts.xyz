# 🐿️ New Game Integration Guide

> **Audience:** Any developer adding a new game to the Fuzzynuts Arcade.
> **Prerequisite:** Familiarity with `fuzzynuts-games-dev/README.md` and `ARCADE_FOUNDATION_COMPLETE.md`.
> **Time estimate:** 2–4 hours for integration (assuming the game already exists).

This guide walks through every step required to integrate a new game into the Fuzzynuts three-tier architecture: from initial scaffolding in the isolated dev workspace, through the postMessage contract implementation, to frontend registration, and finally production deployment.

---

## Table of Contents

1. [Architecture Recap](#1-architecture-recap)
2. [Phase 1: Scaffold the Game](#2-phase-1-scaffold-the-game)
3. [Phase 2: Implement the Score Bridge](#3-phase-2-implement-the-score-bridge)
4. [Phase 3: Register in the Frontend](#4-phase-3-register-in-the-frontend)
5. [Phase 4: Sync, Build, and Integration Test](#5-phase-4-sync-build-and-integration-test)
6. [Phase 5: Deploy to Production](#6-phase-5-deploy-to-production)
7. [File Change Summary](#7-file-change-summary)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Recap

A new game touches **all three tiers**. Understanding this prevents blind spots:

```
┌─ TIER 1: FRONTEND (Vercel) ──────────────────────────────────┐
│                                                               │
│  src/app/games/[slug]/page.tsx   ← Add to GAME_REGISTRY      │
│  src/lib/utils.ts                ← Add to GAMES array        │
│  public/games/<slug>/            ← Game files (via sync)      │
│  public/icons/icon-<slug>-pop.webp  ← Game icon              │
│  public/games/fuzzy-score.js     ← Add slug to SCORE_CAPS    │
│                                                               │
│  GameWrapper.tsx ←── postMessage ──→ Game iframe              │
│                                                               │
├─ TIER 2: BACKEND (Railway) ──────────────────────────────────┤
│                                                               │
│  POST /api/scores  ← Receives scores for new game slug       │
│  GET  /api/scores  ← Returns scores (auto-includes new game) │
│  No code changes needed — scores are keyed by game slug       │
│                                                               │
├─ TIER 3: BLOCKCHAIN (XRPL) ─────────────────────────────────┤
│                                                               │
│  No changes needed — rewards are based on combined score      │
│  The new game's scores auto-contribute to weekly ranking      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

> **Key insight:** The backend and blockchain tiers require **zero code changes** to support a new game. The `arcade_scores` collection and the rewards API both operate on generic `game` slug fields. All integration work happens in the frontend tier and the dev workspace.

---

## 2. Phase 1: Scaffold the Game

### Option A: Use the starter template (recommended for new games)

```bash
cd fuzzynuts-games-dev/

# Copy the starter template
cp -r templates/game-starter/ <your-slug>/

# Copy the integration checklist
cp templates/INTEGRATION_CHECKLIST.md <your-slug>/CHECKLIST.md
```

The starter template includes:
- `index.html` with all postMessage contracts pre-wired
- Cyber-Nature design tokens (colors, fonts, glassmorphism HUD)
- Placeholder canvas game loop with `🔌` markers at integration points
- `fuzzy-score.js` bridge script inclusion
- `gameReady` signal on initialization
- `setMute` listener for parent mute control

**Edit the template:**
1. Change `GAME_SLUG` and `GAME_TITLE` constants in the `<script>` block
2. Replace the placeholder game loop with your actual game engine
3. Call `gameOver()` (which calls `FuzzyScoreSubmit()`) when the game ends

### Option B: Integrate an existing game

If you have an existing HTML5 game, add these three things:

**1. Include the score bridge:**
```html
<script src="../fuzzy-score.js"></script>
```

**2. Submit scores on game over:**
```javascript
// Call when the game ends
var result = FuzzyScoreSubmit('your-slug', playerScore, secondsPlayed);
// result = { success: true, personalBest: 1234, isNewBest: true }
```

**3. Signal readiness and handle mute:**
```javascript
// After all assets loaded — dismisses LoadingOverlay
window.parent.postMessage({ type: 'gameReady' }, '*');

// Listen for mute commands from GameWrapper
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'setMute') {
    myAudio.muted = event.data.muted;
  }
});
```

### Start the dev server

Add a script to `package.json` (or use npx directly):

```bash
# Direct:
npx -y serve <your-slug> -p 3006 -s --cors

# Or add to package.json scripts:
# "dev:<name>": "npx -y serve <your-slug> -p 3006 -s --cors"
```

Visit `http://localhost:3006` and verify the game loads, plays, and submits scores.

---

## 3. Phase 2: Implement the Score Bridge

### Add the score cap

Edit `fuzzynuts-games-dev/shared/fuzzy-score.js` — add your game's slug and cap to the `SCORE_CAPS` object:

```javascript
// Line 18 in fuzzy-score.js
var SCORE_CAPS = {
  mario: 99999,
  survivors: 999999,
  minigolf: 10500,
  fuzzynuts-world: 9999999,
  nutracer: 99999,
  'your-slug': XXXXX     // ← ADD THIS LINE
};
```

**How to choose a score cap:**
- Play your game at maximum skill for 30 minutes
- Multiply the highest achievable score by 1.5×
- Round to a clean number
- This prevents bots from submitting absurd scores while allowing legitimate top players

### Test with the postMessage harness

```bash
npm run test:messages   # Opens http://localhost:3099/test-messages.html
```

In the harness:
1. Set the game slug to your new game's slug
2. Click "Simulate Score Submit"
3. Verify the event log shows `FUZZY_SCORE_SUBMITTED` with `success: true`
4. Check the browser console for `[FuzzyScore]` log messages

### Sync the updated score bridge

After adding the new cap, sync `fuzzy-score.js` to the main project:

```bash
npm run sync:score-bridge
```

---

## 4. Phase 3: Register in the Frontend

Three files need updates in `fuzzynuts-optimized/`:

### A. Add to `GAME_REGISTRY` (page.tsx)

**File:** `src/app/games/[slug]/page.tsx`

Add a new entry to the `GAME_REGISTRY` object (around line 24):

```typescript
const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  // ... existing 5 games ...

  "your-slug": {
    title: "Your Game Title",
    type: "Genre",
    color: "#HEXCOLOR",         // Pick from the Cyber-Nature palette
    description: "One-line description of the game for SEO and OG cards.",
    iframeSrc: "/games/your-slug/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  },
};
```

This automatically:
- Creates the route `/games/your-slug/` via `generateStaticParams()`
- Generates per-page metadata for SEO
- Passes the config to `GameWrapper` via `GamePageClient`

### B. Add to `GAMES` array (utils.ts)

**File:** `src/lib/utils.ts`

Add a new entry to the `GAMES` array (around line 25). This controls the GamesShowcase grid on the homepage:

```typescript
export const GAMES = [
  // ... existing 5 games ...

  {
    id: "your-slug",
    title: "Your Game Title",
    type: "Genre",
    description: "Two-line marketing description for the game card.",
    href: "/games/your-slug/",
    icon: "/icons/icon-yourslug-pop.webp",
    image: "🎮",                // Fallback emoji
    color: "#HEXCOLOR",
    tags: ["Tag1", "Tag2", "Tag3"],
  },
];
```

> **To make it the #1 featured game:** Place the entry at `index 0` of the array (before `fuzzynuts-world`). The GamesShowcase renders in array order.

### C. Create the game icon

**File:** `public/icons/icon-<slug>-pop.webp`

Requirements:
- **Format:** WebP, ~16KB target (use `cwebp -q 80`)
- **Size:** 512×512px
- **Style:** Pop-art illustration matching the Cyber-Nature aesthetic
- **Background:** Dark (#0A0A14) or transparent
- **Subject:** The game's primary visual motif
- **Mask:** The GamesShowcase applies a radial gradient mask — the icon should look good with slight edge fading

---

## 5. Phase 4: Sync, Build, and Integration Test

### Sync the game

```bash
cd fuzzynuts-games-dev/

# Sync game files to main project
npm run sync:<slug>

# If you updated fuzzy-score.js (for the score cap), also sync it:
npm run sync:score-bridge
```

### Verify the build

```bash
cd ../fuzzynuts-optimized/

npm run build
```

**Expected output changes:**
```
Route (app)                                 Size  First Load JS
├ ● /games/[slug]                        6.94 kB         151 kB
├   ├ /games/fuzzynuts-world
├   ├ /games/mario
├   ├ /games/fuzzy-survivors
├   ├ /games/your-slug              ← NEW! Must appear here
├   └ [+N more paths]
```

The build should show **13 pages** (was 12) and **zero errors**.

### Integration test

```bash
npm run dev
```

| Test | URL / Action | Expected |
|------|-------------|----------|
| Route exists | `http://localhost:3000/games/<slug>/` | Page loads, no 404 |
| Loading overlay | Wait on game page | Overlay appears, dismisses when game sends `gameReady` |
| Game renders | Observe iframe | Game canvas is visible and interactive |
| Score submission | Play → game over | Toast: "Score Saved to Leaderboard! 🏆" |
| Fullscreen | Click expand button | Game fills viewport |
| Mute | Click mute button | `setMute` message sent to game |
| Mobile layout | Resize to <640px | Aspect ratio switches to 4:3 |
| Homepage card | Navigate to `/` | New game card appears in GamesShowcase grid |
| Back navigation | Click back arrow in wrapper | Returns to homepage |

---

## 6. Phase 5: Deploy to Production

### Pre-deploy checklist

- [ ] `npm run build` passes with 0 errors
- [ ] New game route appears in build output
- [ ] All integration tests pass locally
- [ ] Score cap is set in `fuzzy-score.js`
- [ ] Game icon exists in `public/icons/`

### Deploy

```bash
cd fuzzynuts-optimized/

git add -A
git commit -m "feat: add <game-title> as game #6 in the arcade"
git push origin main

# Vercel auto-deploys in ~60 seconds
```

### Post-deploy smoke tests

```bash
# Game page loads
curl -s -o /dev/null -w "%{http_code}" https://fuzzynuts.xyz/games/<slug>/
# Expected: 200

# Score submission works (with a test wallet)
curl -X POST https://world.fuzzynuts.xyz/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"game":"<slug>","score":100,"wallet":"rTestAddress123","duration":30}'
# Expected: {"ok":true,...}
```

---

## 7. File Change Summary

Every new game integration touches exactly these files:

| File | Change | Tier |
|------|--------|------|
| `fuzzynuts-games-dev/<slug>/index.html` | New game source | Dev workspace |
| `fuzzynuts-games-dev/<slug>/*.js, *.css` | Game assets | Dev workspace |
| `fuzzynuts-games-dev/shared/fuzzy-score.js` | Add slug to `SCORE_CAPS` | Dev workspace |
| `fuzzynuts-games-dev/package.json` | Add `dev:<name>`, `sync:<slug>`, `pull:<slug>` scripts | Dev workspace |
| `fuzzynuts-optimized/src/app/games/[slug]/page.tsx` | Add entry to `GAME_REGISTRY` | Frontend |
| `fuzzynuts-optimized/src/lib/utils.ts` | Add entry to `GAMES` array | Frontend |
| `fuzzynuts-optimized/public/icons/icon-<slug>-pop.webp` | New game icon | Frontend |
| `fuzzynuts-optimized/public/games/<slug>/` | Synced game files (via script) | Frontend |
| `fuzzynuts-optimized/public/games/fuzzy-score.js` | Synced score bridge (via script) | Frontend |

**Files that do NOT change:**
- `GameWrapper.tsx` — generic, handles any slug
- `LoadingOverlay.tsx` — generic postMessage listener
- Backend API — game slug is a free-form field
- XRPL layer — rewards are slug-agnostic
- `docker-compose.yml` / `Dockerfile` — only if adding the port

---

## 8. Troubleshooting

### "Game page returns 404"

The slug is missing from `GAME_REGISTRY`. Run:
```bash
grep -n "your-slug" src/app/games/\[slug\]/page.tsx
```
If empty, add the entry and rebuild.

### "Score not appearing on leaderboard"

1. Check browser console for `[FuzzyScore]` messages
2. Verify `SCORE_CAPS` includes your slug (otherwise cap defaults to 999,999)
3. Verify the `game` field in the POST body matches the slug exactly
4. Test directly: `curl https://world.fuzzynuts.xyz/api/scores?game=your-slug`

### "Loading overlay never dismisses"

Your game isn't sending `gameReady`. Add this after initialization:
```javascript
window.parent.postMessage({ type: 'gameReady' }, '*');
```
The overlay auto-dismisses after 15s as a fallback, but explicit signaling is preferred.

### "Toast says 'Submission Failed'"

The backend rejected the score. Common causes:
- Score exceeds cap → increase cap in `SCORE_CAPS`
- Duration < 15 seconds → ensure the `duration` parameter is accurate
- Rate limit (5 min between submissions per game per wallet)

### "Game icon looks wrong in GamesShowcase"

The component applies a radial gradient mask. Ensure:
- Icon is 512×512px WebP
- Dark background (not white/transparent with artifacts)
- Test by viewing `http://localhost:3000/` and scrolling to the games section

### "Build fails after adding to GAME_REGISTRY"

Check for TypeScript errors:
- Missing comma after the previous entry
- Mismatched quotes in the slug (use `"kebab-case"` for slugs with hyphens)
- Missing required fields (`title`, `type`, `color`, `description`, `iframeSrc`)
