# Deploy: Auto-Login Overlay Fix

## What Changed

The auto-login flow now hides the game canvas during the login sequence.
Users see a "Connecting to game server..." overlay instead of jarring
screen flicker. The canvas is only revealed after login completes.

## Architecture

```
FuzzyNuts Landing Page          VPS (game.fuzzynuts.xyz)
┌─────────────────────┐         ┌─────────────────────────┐
│  Loading Overlay    │         │  index.html (patched)   │
│  ┌───────────────┐  │         │  ┌───────────────────┐  │
│  │  "Connecting..."│  │  ◄──── │  │ canvas (hidden)   │  │
│  │  spinner       │  │  post  │  │ login sequence    │  │
│  └───────────────┘  │  Message│  │ runs invisibly    │  │
│                     │         │  └───────────────────┘  │
│  <iframe>           │         │  When done:             │
│    game.fuzzynuts.xyz│         │  canvas.visible=true    │
│  </iframe>          │         │  postMessage('done')    │
└─────────────────────┘         └─────────────────────────┘
```

## Deploy Steps

### 1. Update VPS (copy-paste into SSH or DigitalOcean console)

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
```

### 2. Deploy FuzzyNuts Landing Page

The landing page changes are in `apps/web-arcade/public/games/rsc/index.html`.
Push to main and Vercel auto-deploys:

```bash
cd ~/Documents/AI\ Tools/FuzzyNuts\ Optimized/fuzzynuts-optimized
git push origin main
```

## Verify

1. Connect wallet on fuzzynuts.xyz
2. Click "Play Now" on RSC
3. Should see: "Connecting to game server..." overlay with spinner
4. After ~25s: overlay fades, game canvas appears
5. No jarring screen flicker during login sequence

## Rollback

```bash
# Restore previous version on VPS
cp /var/www/rsc-client/backup-autologin-*.html /var/www/rsc-client/index.html
```
