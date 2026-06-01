# Live Smoke Test — Browser Only

After deploying to Vercel and Railway, follow these steps to confirm everything is working.

No terminal. No CLI. Just your browser.

---

## Test 1: The Page Loads

1. Open https://fuzzynuts.xyz/play/rsc in your browser
2. You should see:
   - "RuneScape Classic" as the page title
   - "Powered by Open-RSC" subtitle
   - A "Connect XRP Wallet" button

If the page shows a 404 or blank screen — the Vercel deploy may not have finished. Wait 2 minutes and try again.

---

## Test 2: The Provisioning Banner Shows

1. Click the **"Connect XRP Wallet"** button
2. Your wallet app (Xaman or Joey) should pop up asking you to connect
3. After connecting, the page should show an **amber/yellow banner** that says:
   - "Server Provisioning"
   - "The game server is being set up. This usually takes about 15 minutes after deployment."

If you see a red error instead — the API might not be deployed yet. Check the Railway deploy.

---

## Test 3: The API Responds (Optional — Advanced)

If you want to double-check the API is working:

1. Open the page https://fuzzynuts.xyz/play/rsc
2. Right-click anywhere → "Inspect" (or press F12)
3. Click the **"Network"** tab at the top of the panel
4. Click **"Connect XRP Wallet"** on the page
5. Look for a row that says `game-session` in the Network tab
6. Click on it → look at the **"Response"** tab on the right
7. You should see: `{"status":"provisioning","message":"Game server is being deployed. Check back shortly."}`

If you see that JSON — the API is live and correctly in provisioning mode.

---

## What "Provisioning" Means

The game server (where RuneScape Classic actually runs) isn't set up yet. That's expected. The website and API are live — they're just waiting for the game server to be deployed on a separate VPS.

When you're ready to set up the game server, follow the guide in docs/HANDOFF_VPS_SETUP.md.

---

## If Something Is Wrong

| Problem | What to do |
|---------|------------|
| Page shows 404 | Wait 2 min, check Vercel deploy status |
| Red error on page | Check Railway deploy status |
| "Connect Wallet" does nothing | Make sure you have Xaman or Joey wallet installed |
| Amber banner doesn't appear | Check that GAME_SERVER_READY=false is set in Railway |
| White/blank page | Clear browser cache, try incognito mode |
