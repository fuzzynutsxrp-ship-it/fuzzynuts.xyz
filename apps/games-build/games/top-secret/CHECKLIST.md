# New Game Integration Checklist

# Copy this file into your new game's dev folder and check off items as you go.

# Run: cp templates/INTEGRATION_CHECKLIST.md <your-slug>/CHECKLIST.md

## Game Metadata

- Game slug: **\*\***\_\_\_**\*\***
- Game title: **\*\***\_\_\_**\*\***
- Game type/genre: **\*\***\_\_\_**\*\***
- Brand color (hex): **\*\***\_\_\_**\*\***
- Score cap: **\*\***\_\_\_**\*\***
- Estimated bundle size: **\*\***\_\_\_**\*\***

---

## Phase 1: Scaffold & Develop

- [ ] Created dev folder: `fuzzynuts-games-dev/<slug>/`
- [ ] Copied starter template or built custom `index.html`
- [ ] Game renders correctly on `npm run dev:<slug>` (port 300X)
- [ ] Game is playable end-to-end (start → play → game over)

## Phase 2: Integrate Score Bridge

- [ ] `<script src="../fuzzy-score.js"></script>` included in HTML
- [ ] `FuzzyScoreSubmit('<slug>', score, durationSeconds)` called on game over
- [ ] Score cap added to `SCORE_CAPS` object in `fuzzy-score.js` (shared/ copy)
- [ ] Tested with postMessage harness: `npm run test:messages`
- [ ] `gameReady` postMessage sent after initialization
- [ ] `setMute` postMessage listener implemented

## Phase 3: Frontend Registration

- [ ] Entry added to `GAME_REGISTRY` in `src/app/games/[slug]/page.tsx`
- [ ] Entry added to `GAMES` array in `src/lib/utils.ts`
- [ ] Game icon created at `public/icons/icon-<slug>-pop.webp`
- [ ] Icon matches Cyber-Nature style (pop-art, dark background, gold accents)

## Phase 4: Sync & Build Verification

- [ ] `npm run sync:<slug>` executes successfully
- [ ] `npm run build` passes (12→13 pages, 0 errors)
- [ ] Game page loads at `http://localhost:3000/games/<slug>/`
- [ ] Loading overlay dismisses (via gameReady or 15s timeout)
- [ ] Score submission shows toast in GameWrapper
- [ ] Fullscreen toggle works
- [ ] Mute toggle sends setMute to iframe
- [ ] Mobile layout renders correctly (4:3 aspect ratio)

## Phase 5: Backend & Production

- [ ] Score cap added to backend validation (if server-side caps exist)
- [ ] Tested score POST: `curl -X POST https://world.fuzzynuts.xyz/api/scores -H 'Content-Type: application/json' -d '{"game":"<slug>","score":100,"wallet":"rTestAddress","duration":30}'`
- [ ] Leaderboard shows new game's scores
- [ ] Profile page displays new game stats
- [ ] `git commit` and `git push` to deploy
- [ ] Smoke test on fuzzynuts.xyz/games/<slug>/
