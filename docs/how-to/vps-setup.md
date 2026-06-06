# VPS Setup — RSC Wallet Auto-Login

> **Live production game server: `67.205.132.6`** (DigitalOcean droplet `fuzzynuts-game`, NYC1, Open-RSC on port `43594`). This droplet is **actively in use for live gameplay** — do not decommission it. (An older IP `137.184.194.158` appears in some historical notes and is **stale/retired**; always use `67.205.132.6`.)

## What Changed

The RSC game page now supports automatic login via XRP wallet. When a user
connects their wallet on fuzzynuts.xyz and clicks "Play Now":

1. The page reads the wallet address from the `fuzzy_session_meta` cookie
2. It calls `GET /api/rsc/credentials` to look up the wallet-to-username mapping
3. If found, credentials are injected into the TeaVM iframe URL hash → auto-login
4. If not found, a "Claim Username" modal appears → user picks a name → account created

The TeaVM client on the VPS needs a one-time patch to read the new hash parameters.

## One-Time VPS Setup (YOU MUST DO THIS)

### Step 1: Copy the patch script to the VPS

Open the DigitalOcean web console for droplet `67.205.132.6` and run:

```bash
# Copy the script content from tools/patch-rsc-teavm-client.sh in this repo
# Paste it into a new file on the VPS:
cat > /root/patch-rsc-teavm-client.sh << 'SCRIPTEOF'
# (paste the entire contents of tools/patch-rsc-teavm-client.sh here)
SCRIPTEOF

chmod +x /root/patch-rsc-teavm-client.sh
```

### Step 2: Run the script

```bash
bash /root/patch-rsc-teavm-client.sh
```

This will:
- Back up the original `mudclient.java` and `classes.js`
- Patch the Java source to accept username/password from URL hash params 6 and 7
- Rebuild the TeaVM JavaScript via Maven
- Deploy the new `classes.js` to `/var/www/rsc-client/teavm/`

The script is idempotent — safe to run twice.

### Step 3: Verify

Load the game page at `https://fuzzynuts.xyz/games/rsc/` and click Play Now.
If you have a wallet connected with a claimed username, it should auto-login.

## Railway Environment Variables

Add these to the Railway API service (brilliant-nurturing):

```
MONGODB_URI=mongodb+srv://...       # Your existing Railway MongoDB connection string
RSC_PASSWORD_SECRET=<64-char-hex>   # Generate with: openssl rand -hex 32
GAME_SERVER_READY=true              # Enables the game-session endpoint
```

## Architecture Summary

```
Browser (fuzzynuts.xyz)
  ├── Reads fuzzy_session_meta cookie → wallet address
  ├── GET /api/rsc/credentials (proxied via Vercel → Railway)
  │     └── MongoDB wallet_mappings → { username, encryptedPassword }
  ├── Builds iframe URL: game.fuzzynuts.xyz/#...,,username,password
  └── history.replaceState → clears hash from URL bar

TeaVM Client (game.fuzzynuts.xyz)
  ├── main() reads window.location.hash
  ├── Parses params [6]=username, [7]=password
  ├── Sets loginScreen=2, fills panel fields
  └── Calls login(username, password, false) → auto-login

Open-RSC Server (67.205.132.6:43594)
  └── Validates username + password via DataConversions.checkPassword()
```

## Rolling Back

If something goes wrong on the VPS:

```bash
# Restore original classes.js
cp /var/www/rsc-client/teavm/backup-*/classes.js.orig /var/www/rsc-client/teavm/classes.js
```

The web frontend changes (cookie reading, modal, API calls) work independently
of the VPS patch — users will just see the manual login screen if the TeaVM
client isn't patched yet.
