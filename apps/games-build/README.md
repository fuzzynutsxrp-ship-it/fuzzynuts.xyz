# 🐿️ Fuzzynuts Games — Isolated Development Workspace

> **This workspace is physically separate from the main Next.js project.**
> Changes here NEVER auto-deploy. You must explicitly sync when ready.

---

## Architecture Overview

```
FuzzyNuts Optimized/                      # Parent directory
├── fuzzynuts-optimized/                   # 🚀 PRODUCTION — Next.js 15 site (fuzzynuts.xyz)
│   └── public/games/                     # READ-ONLY destination for finalized game builds
│       ├── mario/
│       ├── fuzzy-survivors/
│       ├── minigolf/
│       ├── nut-racer/
│       ├── fuzzynuts-world/
│       └── fuzzy-score.js                # Score bridge (postMessage → API)
│
└── fuzzynuts-games-dev/                   # 🔧 THIS WORKSPACE — Safe sandbox for game dev
    ├── mario/                            # Dev copy of Super Fuzzynuts
    ├── fuzzy-survivors/                  # Dev copy of Fuzzy Survivors
    ├── minigolf/                         # Dev copy of Fuzzy Putt (WASM)
    ├── nut-racer/                        # Dev copy of Nut Racer
    ├── fuzzynuts-world/                          # Dev copy of Fuzzynuts World (redirect stub)
    ├── shared/
    │   ├── fuzzy-score.js                # Score bridge — edit here, sync separately
    │   └── test-messages.html            # postMessage test harness
    ├── scripts/
    │   ├── sync-to-main.sh              # Push tested game → main project (with backup + verification)
    │   ├── pull-from-main.sh            # Pull current production version → dev workspace
    │   └── verify-build.sh              # Quick build check on main project
    └── package.json                      # Per-game dev servers on isolated ports
```

---

## Quick Start

### 1. Start a game dev server

Each game runs on its own port, completely isolated from the Next.js dev server:

```bash
cd fuzzynuts-games-dev/

npm run dev:mario       # http://localhost:3001
npm run dev:survivors   # http://localhost:3002
npm run dev:minigolf    # http://localhost:3003
npm run dev:racer       # http://localhost:3004
npm run dev:fuzzynuts-world     # http://localhost:3005
```

Edit files directly in the game folder. The `serve` static server picks up changes on page refresh.

### 2. Test postMessage communication

The test harness lets you debug the message contract between games and GameWrapper.tsx:

```bash
npm run test:messages   # http://localhost:3099/test-messages.html
```

This harness:
- Loads the real `fuzzy-score.js` bridge
- Simulates score submissions with configurable game/score/duration
- Captures all postMessage events with timestamps
- Tests the `gameReady`, `FUZZY_SCORE_SUBMITTED`, and `setMute` contracts

### 3. Sync a tested game to the main project

**Only after thorough local testing:**

```bash
npm run sync:mario       # Syncs mario/ → fuzzynuts-optimized/public/games/mario/
npm run sync:survivors   # Syncs fuzzy-survivors/ → ...
npm run sync:minigolf    # Syncs minigolf/ → ...
npm run sync:racer       # Syncs nut-racer/ → ...
npm run sync:fuzzynuts-world     # Syncs fuzzynuts-world/ → ...
npm run sync:score-bridge  # Syncs shared/fuzzy-score.js → ...
```

The sync script will:
1. ✅ Verify source has an `index.html`
2. 📋 Create a timestamped backup of the current production version
3. 📦 rsync files to the main project
4. 🔨 Run `npm run build` on the main project to verify
5. 🔄 **Auto-rollback** if the build fails

### 4. Pull latest from production

Start a new dev cycle by pulling the current live version:

```bash
npm run pull:mario       # Overwrites local dev copy with production version
npm run pull:survivors   # ...
```

---

## Message Contract Reference

### Game → GameWrapper (score submission)

The `fuzzy-score.js` bridge handles this automatically. After a score is submitted:

```javascript
// Sent by fuzzy-score.js to parent GameWrapper
window.parent.postMessage({
  type: 'FUZZY_SCORE_SUBMITTED',
  success: true   // or false
}, '*');
```

**GameWrapper response:** Shows a toast notification — green "Score Saved to Leaderboard! 🏆" on success, red "Submission Failed — Try Again!" on error. Auto-dismisses after 4 seconds.

### Game → LoadingOverlay (ready signal)

Games can dismiss the loading overlay early by sending:

```javascript
// Sent by game when fully initialized
window.parent.postMessage({ type: 'gameReady' }, '*');
```

If not sent, the overlay auto-dismisses after 15 seconds via timeout.

### GameWrapper → Game (mute command)

When the user clicks the mute button, the wrapper sends:

```javascript
// Sent by GameWrapper to iframe
iframe.contentWindow.postMessage({
  type: 'setMute',
  muted: true  // or false
}, '*');
```

Games should listen for this and mute/unmute their audio accordingly.

### Score Submission API

Use the `FuzzyScoreSubmit()` function from `fuzzy-score.js`:

```javascript
// Include the bridge script
<script src="../fuzzy-score.js"></script>

// Submit a score
const result = FuzzyScoreSubmit('mario', 42069, 120);
// result = { success: true, personalBest: 42069, isNewBest: true }
```

Parameters:
| Param | Type | Description |
|-------|------|-------------|
| `game` | string | Game slug: `mario`, `survivors`, `minigolf`, `nutracer`, `fuzzynuts-world` |
| `score` | number | Player's score (positive, finite, under cap) |
| `duration` | number | Seconds played (minimum 15 for anti-cheat) |

Score caps: `mario: 99999`, `survivors: 999999`, `minigolf: 10500`, `fuzzynuts-world: 9999999`, `nutracer: 99999`

---

## Development Rules

### ⚠️ Golden Rule
> `fuzzynuts-optimized/public/games/` is a **read-only artifact repository**.
> NEVER edit files there directly. Always edit here, test, then sync.

### Workflow Cycle

```
┌──────────────────────┐
│  1. Pull from main   │  npm run pull:mario
│  (known-good base)   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  2. Edit & iterate   │  Edit files in mario/
│  (local dev server)  │  npm run dev:mario → localhost:3001
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  3. Test thoroughly   │  Browser testing, postMessage harness
│  (isolated sandbox)  │  npm run test:messages → localhost:3099
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  4. Sync to main     │  npm run sync:mario
│  (backup + verify)   │  Auto-runs npm run build, rolls back on failure
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  5. Integration test │  cd ../fuzzynuts-optimized && npm run dev
│  (in Next.js context)│  Open http://localhost:3000/games/mario/
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  6. Commit & deploy  │  git add -A && git commit && git push
│  (to Vercel)         │  Vercel auto-deploys to fuzzynuts.xyz
└──────────────────────┘
```

### What lives where

| Item | Location | Reason |
|------|----------|--------|
| Game source code edits | `fuzzynuts-games-dev/<slug>/` | Isolated sandbox |
| Score bridge edits | `fuzzynuts-games-dev/shared/fuzzy-score.js` | Shared across all games |
| GameWrapper.tsx changes | `fuzzynuts-optimized/src/components/game/` | Part of the Next.js app |
| Game page routing | `fuzzynuts-optimized/src/app/games/[slug]/` | Part of the Next.js app |
| Production game assets | `fuzzynuts-optimized/public/games/` | READ-ONLY destination |
| Sync backups | `fuzzynuts-games-dev/.backups/` | Auto-created, gitignored |

---

## Port Map

| Port | Service | Command |
|------|---------|---------|
| 3000 | Next.js dev server | `cd fuzzynuts-optimized && npm run dev` |
| 3001 | Mario dev server | `npm run dev:mario` |
| 3002 | Fuzzy Survivors dev server | `npm run dev:survivors` |
| 3003 | Minigolf dev server | `npm run dev:minigolf` |
| 3004 | Nut Racer dev server | `npm run dev:racer` |
| 3005 | Fuzzynuts World dev server | `npm run dev:fuzzynuts-world` |
| 3099 | postMessage test harness | `npm run test:messages` |

---

## 🐳 Docker (Optional)

> **Docker is optional.** The native `npm run dev:*` workflow works identically and is the primary method.
> Use Docker when you need consistent environments across machines or want to avoid installing Node.js locally.

### Quick start

```bash
# Build and start ALL game servers (ports 3001-3005 + 3099)
docker compose up --build

# Start in background (detached)
docker compose up -d --build

# Stop everything
docker compose down
```

After startup, access games at the same URLs as native dev:
- Mario: http://localhost:3001
- Fuzzy Survivors: http://localhost:3002
- Minigolf: http://localhost:3003
- Nut Racer: http://localhost:3004
- Fuzzynuts World: http://localhost:3005
- Test harness: http://localhost:3099/test-messages.html

### Run a single game

```bash
# Start ONLY Mario on port 3001
docker compose run --service-ports app npm run dev:mario

# Start ONLY Fuzzy Survivors on port 3002
docker compose run --service-ports app npm run dev:survivors
```

> **Important:** Use `--service-ports` to map ports to the host. Without it, ports are randomized.

### Live editing with bind mounts

The `docker-compose.yml` bind-mounts each game directory from the host into the container.
Edit files on your host machine → refresh the browser → changes are reflected instantly.

```
Host machine                     Container
./mario/         ──bind-mount──→ /app/mario/
./fuzzy-survivors/ ─────────────→ /app/fuzzy-survivors/
./shared/        ──────────────→ /app/shared/
./scripts/       ──────────────→ /app/scripts/
```

### Sync from inside the container

By default, the sync scripts **will not work** inside the container because the main Next.js project is not mounted.

To enable in-container sync:

1. **Edit `docker-compose.yml`** — uncomment the main project volume:
   ```yaml
   volumes:
     # ...
     - ../fuzzynuts-optimized:/fuzzynuts-optimized
   ```

2. **Run the sync:**
   ```bash
   docker compose run app ./scripts/sync-to-main.sh mario
   ```

3. **Or just sync from the host** (recommended — no config change needed):
   ```bash
   ./scripts/sync-to-main.sh mario
   ```

### Architecture: Native vs Docker

```
┌─ Native (npm run dev:*) ──────────────────────────────────┐
│  Host machine runs serve directly                         │
│  ✅ Zero overhead, instant startup                        │
│  ✅ Sync scripts work out of the box                      │
│  ⚠️  Requires Node.js 20+ installed locally               │
└───────────────────────────────────────────────────────────┘

┌─ Docker (docker compose up) ──────────────────────────────┐
│  Container runs serve, bind-mounts map to host files      │
│  ✅ Consistent environment (Node 20 Alpine, pinned tools) │
│  ✅ No local Node.js required                             │
│  ⚠️  Sync requires mounting main project (optional)        │
│  ⚠️  ~5 second startup overhead vs native                  │
└───────────────────────────────────────────────────────────┘
```

### Docker commands reference

| Command | Description |
|---------|-------------|
| `docker compose up` | Start all 6 servers |
| `docker compose up -d` | Start in background |
| `docker compose up --build` | Rebuild image and start |
| `docker compose down` | Stop and remove containers |
| `docker compose run --service-ports app npm run dev:mario` | Single game |
| `docker compose run app ./scripts/sync-to-main.sh mario` | Sync (needs volume) |
| `docker compose logs -f` | Tail logs from all servers |
| `docker compose exec app sh` | Shell into running container |
| `docker image ls \| grep fuzzynuts` | Check image size |

---

## Troubleshooting

### "Build failed after sync"
The sync script auto-rolls back. Check the build error in the terminal, fix the issue in your dev copy, and sync again.

### "index.html not found in dev folder"
You need to pull the latest from main first: `npm run pull:<slug>`

### "Score not appearing on leaderboard"
1. Check the browser console for `[FuzzyScore]` log messages
2. Verify `fuzzy-score.js` is included in the game's HTML: `<script src="../fuzzy-score.js"></script>`
3. Test with the harness: `npm run test:messages`
4. Confirm the backend is live: `curl https://world.fuzzynuts.xyz/api/scores`

### "Game loads but no mute control"
Games must listen for the `setMute` postMessage. Add this to your game:
```javascript
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'setMute') {
    // Mute or unmute your audio system
    myAudioSystem.setMuted(event.data.muted);
  }
});
```
