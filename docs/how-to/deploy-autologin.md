# RSC Auto-Login Deployment Guide

Generated: 2026-06-02

This guide covers the 2 manual steps needed to activate wallet auto-login for
RuneScape Classic on fuzzynuts.xyz. All code changes have already been pushed to main.

---

## STEP 1: Set Railway Environment Variables

1. Go to https://railway.app → your API service (brilliant-nurturing) → **Variables** tab
2. Check if `MONGODB_URI` is already set. If it is, skip it. If not, add it:
   - **MONGODB_URI**: Your MongoDB connection string (from the shared MongoDB service on Railway)
   - To find it: click the MongoDB service in Railway → Variables → copy the `MONGO_URL` or `MONGODB_URI` value
3. Add this new variable:
   - **RSC_PASSWORD_SECRET**:
   ```
   da128cd617189e09086c5549434ae5eb5599b13a9b5717fc946a6e8293c854a2
   ```
4. Click **Deploy** (or Railway will auto-redeploy after variable changes)

Wait for the deploy to finish (check the Deployments tab for a green checkmark).

---

## STEP 2: Run TeaVM Patch on VPS

This patches the RuneScape Classic browser client to support auto-login via URL hash parameters.

1. Go to https://cloud.digitalocean.com → your droplet (67.205.132.6) → **Console** (or SSH in)
2. Copy and paste this EXACT command:

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/patch-rsc-teavm-client.sh | bash
```

3. Wait for it to complete. You should see:

   ```
   ✓ PATCH COMPLETE
   New hash format:
     #members,host,port,rsa_exp,rsa_mod,true,USERNAME,PASSWORD
   ```

4. If it fails, copy the error output and show it to Hermes.

---

## STEP 3: Test the Flow

1. Open an incognito/private browser window
2. Go to https://fuzzynuts.xyz/games/rsc
3. Connect your Xaman wallet
4. You should see a **"Claim Your Name"** modal
5. Enter a username (3-12 letters/numbers) and click **"Claim & Play"**
6. The game should load and auto-login (no manual username/password entry)
7. Close the tab, reopen https://fuzzynuts.xyz/games/rsc
8. Click **"Play Now"** — it should auto-login again without showing the modal

If anything goes wrong, copy the error message and show it to Hermes.

---

## What Was Changed (for reference)

- **apps/api/src/routes/auth.ts**: Wired up real XRPL signature verification (removed 501 scaffold)
- **apps/api/src/routes/rsc.ts**: New file — wallet-to-username mapping with AES-256-GCM encryption
- **apps/api/src/middleware/walletAuth.ts**: JWT cookie verification middleware
- **apps/api/src/server.ts**: Mounted RSC router at /api/rsc with walletAuth gate
- **apps/web-arcade/public/games/rsc/index.html**: Auto-login flow with claim modal
- **apps/web-arcade/vercel.json**: Rewrite rule for /api/rsc/\* → Railway API (already existed)
- **tools/patch-rsc-teavm-client.sh**: TeaVM client patch script for auto-login support
- **apps/api/tsconfig.json**: Added DOM lib for CryptoKey types
- **packages/shared-anticheat/src/hmac.ts**: Fixed Uint8Array type compatibility
