# Deploy VPS Account Server

## Problem

The Railway API creates username mappings in MongoDB but never creates the actual game account in Open-RSC's SQLite database. When the auto-login tries to log in, the game server rejects with "Invalid username or password" (response code 3).

## Solution

A lightweight Express server on the VPS (port 3001) that:
- Receives username + password from Railway API
- Hashes the password with bcrypt (work factor 10, matching Open-RSC)
- Inserts the player into the Open-RSC SQLite database
- Returns success/failure to Railway

## Step 1: Deploy to VPS

SSH into the VPS or use the DigitalOcean web console, then run:

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/deploy-vps-account-server.sh | bash
```

This script:
- Installs Node.js if missing
- Creates `/opt/account-server/` with server.js and package.json
- Installs npm dependencies (express, bcrypt, better-sqlite3)
- Generates a random 64-char hex secret (saved at `/opt/account-server/.secret`)
- Creates a systemd service (`account-server.service`)
- Starts and enables the service
- Runs a health check
- Prints the `VPS_ACCOUNT_SECRET` value — copy this!

## Step 2: Add Railway Environment Variables

Go to Railway → fuzzynuts.xyz API service → Variables, and add:

```
VPS_ACCOUNT_URL=http://127.0.0.1:3001
VPS_ACCOUNT_SECRET=<paste the secret from Step 1>
```

Then redeploy Railway.

**Note:** `http://127.0.0.1:3001` only works if Railway and the VPS are on the same network. If not, use the VPS public IP: `http://67.205.132.6:3001`. You'll also need to open port 3001 in the VPS firewall:

```bash
ufw allow 3001/tcp
```

## Step 3: Apply Canvas Visibility Fix

The auto-login script was updated to show the canvas on both success and failure. Run on VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
```

## Step 4: Test

1. Go to `https://fuzzynuts.xyz/play/rsc`
2. Connect wallet (or set `fuzzy_wallet` in localStorage)
3. Click Play Now
4. If no username: claim modal appears → enter username → game launches
5. If username exists: game launches directly
6. Open DevTools → Console → look for `[autologin]` messages

## VPS Service Commands

```bash
# Check status
systemctl status account-server

# View logs
journalctl -u account-server -f

# Restart
systemctl restart account-server

# Check health
curl http://127.0.0.1:3001/health
```

## Architecture

```
Browser → fuzzynuts.xyz/play/rsc
  ↓ (click Play)
  → GET /api/rsc/credentials?address=r... (Railway)
  ← { username, gamePassword }
  ↓ (if no mapping)
  → POST /api/rsc/claim-username (Railway)
    → POST http://VPS:3001/create-account (VPS)
      → bcrypt hash + SQLite INSERT
    ← { success: true }
  → MongoDB INSERT (wallet mapping)
  ↓
  → iframe: game.fuzzynuts.xyz/#members,...,walletAddr
  ↓ (auto-login script)
  → GET /api/rsc/credentials?address=r... (Railway)
  ← { username, gamePassword }
  → Simulate keyboard: type username, tab, type password, enter
  → Game server validates against SQLite → success
  → Canvas becomes visible
```

## Files

| File | Purpose |
|------|---------|
| `tools/vps-account-server/server.js` | Express server source |
| `tools/vps-account-server/package.json` | npm dependencies |
| `tools/deploy-vps-account-server.sh` | VPS deployment script |
| `tools/fix-teavm-js-autologin.sh` | Canvas visibility fix (v8) |
| `apps/api/src/routes/rsc.ts` | Railway API (calls VPS endpoint) |
| `apps/api/src/server.ts` | Passes VPS env vars to RSC router |
