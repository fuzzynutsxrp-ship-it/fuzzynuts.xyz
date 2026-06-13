# Fuzzynuts Arcade — Game Development & Filing System

> **Last Updated:** May 17, 2026
> **Status:** Production (fuzzynuts.xyz)

---

## Directory Structure

```
FuzzyNuts Optimized/
├── ARCHITECTURE_GAMES.md          ← This document
├── ARCHITECTURE.md                ← Full system architecture
├── QUEST_GUIDE.md                 ← Fuzzynuts World quest walkthrough
│
├── fuzzynuts-optimized/            ← WEBSITE (Next.js 15, Vercel)
│   ├── src/
│   │   ├── app/
│   │   │   └── games/
│   │   │       └── [slug]/
│   │   │           ├── page.tsx           ← Server component (metadata + routing)
│   │   │           └── client.tsx         ← Client boundary → GamePage
│   │   ├── components/
│   │   │   └── game/
│   │   │       ├── GamePage.tsx           ← Unified template (orchestrator)
│   │   │       ├── GameHeader.tsx         ← Navigation + wallet + week selector
│   │   │       ├── GameSidebar.tsx        ← Leaderboard + rewards + game info
│   │   │       ├── ScoreSubmissionPanel.tsx ← Score history + status
│   │   │       ├── GameWrapper.tsx        ← Legacy wrapper (preserved)
│   │   │       ├── LoadingOverlay.tsx     ← Game loading screen
│   │   │       └── ErrorBoundary.tsx      ← Crash recovery
│   │   ├── hooks/
│   │   │   └── useArcadeState.ts         ← Leaderboard, submission, payout hooks
│   │   ├── store/
│   │   │   └── wallet.ts                 ← Zustand: Xaman wallet state
│   │   └── lib/
│   │       └── gameRegistry.ts           ← Centralized game metadata
│   └── public/
│       ├── games/                         ← Game build artifacts (static)
│       │   ├── mario/
│       │   ├── fuzzy-survivors/
│       │   ├── minigolf/
│       │   ├── nut-racer/
│       │   ├── top-secret/
│       │   └── fuzzynuts-world/
│       └── icons/
│           └── icon-{slug}-pop.webp      ← Game icons
│
└── fuzzynuts-games-dev/            ← GAME DEVELOPMENT WORKSPACE
    ├── shared/
    │   └── fuzzy-score.js                ← Universal score bridge
    ├── mario/                            ← Super Fuzzynuts source
    ├── fuzzy-survivors/                  ← Fuzzy Survivors source
    ├── minigolf/                         ← Fuzzy Putt source
    ├── nut-racer/                        ← Nut Racer source
    ├── top-secret/                       ← Top Secret source
    ├── fuzzynuts-world/                  ← Kaetram reference
    ├── templates/                        ← New game boilerplate
    └── scripts/                          ← Build/deploy automation
```

---

## Game Page Architecture

All 6 game pages share a unified component structure:

```
┌──────────────────────────────────────────────────────────────┐
│ GameHeader (64px, sticky)                                     │
│ ← Arcade │ PLATFORMER │ Super Fuzzynuts │ W21 │ Wallet │ ⟲F │
├──────────────────────────────────────────┬───────────────────┤
│                                          │                   │
│                                          │ GameSidebar       │
│           Game iframe                    │ ┌───────────────┐ │
│           (fullscreen, no borders)       │ │ Leaderboard   │ │
│                                          │ │ 🥇 rfqA… 45K │ │
│                                          │ │ 🥈 rPx3… 32K │ │
│                                          │ │ 🥉 rJk2… 28K │ │
│                                          │ ├───────────────┤ │
│                                          │ │ Rewards       │ │
│                                          │ │ 500K $NUT/wk  │ │
│                                          │ │ Not eligible  │ │
│                                          │ ├───────────────┤ │
│                                          │ │ Game Info     │ │
│                                          │ │ Controls, cap │ │
│                                          │ └───────────────┘ │
├──────────────────────────────────────────┴───────────────────┤
│ ScoreSubmissionPanel                                         │
│ ✅ 45,230 (2m ago) │ 🏆 Best: 45,230 #1 │ History (3) ▾    │
└──────────────────────────────────────────────────────────────┘
```

### Components

| Component                | File                                       | Purpose                                                  |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------- |
| **GamePage**             | `components/game/GamePage.tsx`             | Orchestrator — manages state, keyboard shortcuts, layout |
| **GameHeader**           | `components/game/GameHeader.tsx`           | Navigation, wallet, week selector, quick stats           |
| **GameSidebar**          | `components/game/GameSidebar.tsx`          | Live leaderboard, reward tracker, game info              |
| **ScoreSubmissionPanel** | `components/game/ScoreSubmissionPanel.tsx` | Score history, status badges, rank progress              |
| **LoadingOverlay**       | `components/game/LoadingOverlay.tsx`       | Animated loading screen while game initializes           |
| **ErrorBoundary**        | `components/game/ErrorBoundary.tsx`        | Crash recovery with retry button                         |

### Responsive Breakpoints

| Breakpoint              | Layout                                                       |
| ----------------------- | ------------------------------------------------------------ |
| **Mobile** (<768px)     | Header condensed, sidebar = overlay drawer, panel simplified |
| **Tablet** (768-1023px) | Sidebar = toggle drawer (button in corner)                   |
| **Desktop** (≥1024px)   | Full layout with fixed 280px sidebar                         |

### Keyboard Shortcuts

| Key   | Action                   |
| ----- | ------------------------ |
| `ESC` | Back to arcade (/#games) |
| `F1`  | Toggle sidebar           |
| `F`   | Toggle fullscreen        |
| `M`   | Toggle mute              |

---

## Game Registry

All game metadata is centralized in `src/lib/gameRegistry.ts`:

| #   | Slug              | Title           | Genre          | Score Cap  | Score Type | Status |
| --- | ----------------- | --------------- | -------------- | ---------- | ---------- | ------ |
| 1   | `mario`           | Super Fuzzynuts | Platformer     | 99,999     | High score | Live   |
| 2   | `fuzzy-survivors` | Fuzzy Survivors | Horde Survival | 999,999    | High score | Live   |
| 3   | `minigolf`        | Fuzzy Putt      | Mini Golf      | 10,500     | High score | Live   |
| 4   | `nut-racer`       | Nut Racer       | Racing         | 99,999     | High score | Live   |
| 5   | `top-secret`      | Top Secret      | ??? Classified | 999,999    | High score | Live   |
| 6   | `fuzzynuts-world` | Fuzzynuts World | MMORPG         | 10,000,000 | Cumulative | Live   |

---

## Scoring Integration

### Arcade Games (iframe-based)

All iframe games use the `fuzzy-score.js` bridge:

```javascript
// In your game's game-over handler:
FuzzyScoreSubmit("mario", score, durationSeconds);
```

This triggers:

1. **Client-side validation** — cap, duration, debounce
2. **localStorage write** — instant, offline-first
3. **POST to /api/scores** — async, fire-and-forget
4. **postMessage** to GameWrapper for toast notification
5. **Sidebar refresh** — leaderboard updates after 2s delay

### Fuzzynuts World (server-side)

World uses direct MongoDB writes via `achievements.ts`:

```typescript
// Server-side, on achievement completion:
submitArcadeScore("warriorcrab"); // atomic $inc to arcade_scores
```

---

## Wallet Integration

Games detect wallet connection via the Zustand store (`wallet.ts`):

- **Connected**: Shows truncated address in header, scores save to wallet
- **Not connected**: Shows "Connect" button, scores are guest-only (not saved to leaderboard)
- **Provider**: Xaman (Xumm) via OAuth2 PKCE

---

## Adding a New Game

### Checklist

```
1. [ ] Create game in fuzzynuts-games-dev/{slug}/
2. [ ] Add <script src="../shared/fuzzy-score.js"></script>
3. [ ] Call FuzzyScoreSubmit("{slug}", score, duration) on game over
4. [ ] Add entry to src/lib/gameRegistry.ts
5. [ ] Register slug in server: scores.ts → SCORE_CAPS
6. [ ] Register slug in: fuzzy-score.js → SCORE_CAPS
7. [ ] Build game → copy to public/games/{slug}/
8. [ ] Add icon: public/icons/icon-{slug}-pop.webp
9. [ ] Test at /games/{slug}
10. [ ] Verify leaderboard integration
11. [ ] Deploy to Vercel
```

### Step-by-Step

**Step 1: Create Game Directory**

```bash
cd fuzzynuts-games-dev
cp -r templates/new-game {slug}/
```

**Step 2: Add Score Bridge**

In your game's HTML:

```html
<script src="../shared/fuzzy-score.js"></script>
```

**Step 3: Integrate Score Submission**

In your game's JavaScript:

```javascript
// When the game ends:
const result = FuzzyScoreSubmit("your-slug", playerScore, secondsPlayed);
if (result.success) {
  console.log("Personal best:", result.personalBest);
}
```

**Step 4: Register in gameRegistry.ts**

```typescript
{
  slug: "your-slug",
  title: "Your Game Name",
  genre: "Your Genre",
  color: "#HEX",
  description: "2-3 sentences about your game.",
  scoreCap: 999_999,
  minPlayTime: 15,
  controls: ["WASD to move", "Space to jump"],
  iconPath: "/icons/icon-your-slug-pop.webp",
  iframePath: "/games/your-slug/index.html",
  sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
  leaderboardEnabled: true,
  achievementsEnabled: false,
  status: "live",
  scoreType: "high-score",
},
```

**Step 5: Register Score Cap on Server**

In `packages/server/src/api/scores.ts`:

```typescript
const SCORE_CAPS: Record<string, number> = {
  // ... existing games
  "your-slug": 999_999,
};
```

In `shared/fuzzy-score.js`:

```javascript
var SCORE_CAPS = {
  // ... existing games
  "your-slug": 999999,
};
```

**Step 6: Deploy**

```bash
# Build the game
cd fuzzynuts-games-dev/your-slug
npm run build

# Copy to public
cp -r dist/* ../fuzzynuts-optimized/public/games/your-slug/

# Deploy
cd ../fuzzynuts-optimized
npx vercel --prod
```

---

## Achievement Tracking

Currently only **Fuzzynuts World** has achievements:

- Achievements are server-side (Kaetram `achievements.ts`)
- Each achievement adds points via atomic `$inc` to `arcade_scores`
- Achievement $NUT rewards are queued in MongoDB `reward_queue`
- A background processor is needed to send XRPL payments (pending)

Future: Individual game achievements can be added by:

1. Setting `achievementsEnabled: true` in gameRegistry
2. Implementing achievement logic in the game
3. Posting achievement events via postMessage to the GameWrapper

---

## Dependencies

| Package       | Version | Purpose          |
| ------------- | ------- | ---------------- |
| Next.js       | 15.5.18 | Framework        |
| React         | 19.1.0  | UI library       |
| Tailwind CSS  | 3.4.19  | Styling          |
| Framer Motion | 12.38.0 | Animations       |
| Lucide React  | 1.14.0  | Icons            |
| Zustand       | 5.0.13  | State management |
