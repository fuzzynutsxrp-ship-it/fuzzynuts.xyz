# iOS Safari Touch & Audio Verification

## Purpose

Validate that iframe-hosted HTML5 games receive touch events, unlock audio, and respect scroll/overscroll locks on iOS Safari after the `dialog` + CSS overlay fixes.

## ⚠️ Critical Note

**Do not use iOS simulators.** Only real devices accurately reproduce touch propagation, gesture locks, and `AudioContext` resume policies.

## Test Matrix

| iOS Version | Safari Engine | Key Constraint                                       | Priority            |
| ----------- | ------------- | ---------------------------------------------------- | ------------------- |
| 15.x        | WebKit ~15    | No `overscroll-behavior`; strict audio gesture rules | 🔴 High             |
| 16.x        | WebKit ~16    | Full CSS spec support                                | 🟡 Medium           |
| 17.x / 18.x | WebKit ~17/18 | Current baseline                                     | 🟢 Low (regression) |

## Game Coverage

Test at least one from each category:

- **Vanilla Canvas** (e.g., `snake`, `pong`, `2048`)
- **Phaser 3** (e.g., `space-invaders`, `tank-battle`)
- **PixiJS / WebGL** (e.g., `minigolf`, `flappy`)
- **Custom Start** (Game with `data-custom-start="true"`)

## Step-by-Step Protocol

1. Open `fuzzynuts.xyz` on iOS Safari
2. Tap a game tile → verify `GameModal` opens via `<dialog>`
3. **Touch Propagation:** Tap the game canvas immediately. Verify:
   - No parent scroll/zoom occurs
   - Game responds to single tap/swipe within 100ms
   - Backdrop tap does NOT intercept game touch
4. **Audio Unlock:** Verify `#start-btn` tap resumes `AudioContext`
   - Game plays sound/music immediately after start
   - No silent gameplay on first run
5. **Scroll/Overscroll Lock:**
   - Swipe up/down at canvas edges
   - iOS 15: Accept minor rubber-banding if gameplay isn't broken
   - iOS 16+: Page must not bounce or scroll behind dialog
6. **Start Screen Handling:** Verify `#start-screen` hides and canvas regains focus

## Pass Criteria

- ✅ Game accepts touch input inside `<iframe>`
- ✅ Audio plays on first tap
- ✅ No parent page scroll/zoom during gameplay
- ✅ Start overlay hides cleanly, no duplicate handlers
- ✅ `data-custom-start` games bypass universal handler without error

## How to Report Findings

Use this template in Telegram:

```
[iOS Touch Test]
Device: iPhone [Model], iOS [Version]
Game: [Name] ([Engine])
Result: PASS / FAIL
Issue: [Brief description]
Console: [Safari DevTools logs if available]
Media: [Screen recording/GIF link]
```

## Notes for QA

- **Safari DevTools:** Connect device to Mac → Safari > Develop > [Device] > Enable Web Inspector
- If touch fails on iOS 15 only, note whether it's a `pointerdown` vs `touchstart` discrepancy
- Do not report "slight rubber-banding" on iOS 15 as a blocker unless it breaks input mapping
