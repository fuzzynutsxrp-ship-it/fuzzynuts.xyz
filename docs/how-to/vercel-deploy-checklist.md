# Vercel Deploy — Browser-Only Steps

The frontend is a static site. No code changes needed — just click Deploy.

---

## Step 1: Open Vercel

Go to https://vercel.com and sign in.

Find the project called **fuzzynuts** (or **fuzzynuts.xyz**).

---

## Step 2: Deploy

Click the **"Deploy"** button (or "Redeploy" if it's already deployed).

No configuration changes are needed. The build settings are already set in `vercel.json`.

---

## Step 3: Confirm It Worked

After the deploy finishes (about 1–2 minutes):

1. Visit https://fuzzynuts.xyz/play/rsc in your browser
2. You should see the "RuneScape Classic" page
3. It should say "Server Provisioning" in an amber/yellow banner

If you see that banner — the frontend is live and correctly waiting for the game server.

---

## What's Already Configured

These are set in the code and don't need changes:

- Static export (no server needed)
- Trailing slashes (for clean URLs)
- Security headers (XSS protection, frame blocking)
- Cache rules for videos, images, and game assets

---

## If Something Looks Wrong

- Make sure the build succeeded (green checkmark on Vercel dashboard)
- Check the deploy logs on Vercel for any red error messages
- The `/play/rsc` page will only work after the API is also deployed (see Railway checklist)
