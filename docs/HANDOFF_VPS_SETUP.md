# FuzzyNuts RSC — VPS Setup Guide

This guide walks you through getting the RuneScape Classic game server running. No technical experience needed — just follow each step.

---

## What You Need

- A VPS (virtual server) running Ubuntu 22.04 or newer
- Your VPS IP address (the hosting company gives you this)
- SSH access to your VPS (the hosting company gives you a password or key)

Recommended VPS providers: Hetzner ($5/mo), DigitalOcean ($6/mo), or Vultr ($6/mo). Pick the cheapest Ubuntu option.

---

## Step 1: Rent a VPS

Go to one of these sites and create an account:

- **Hetzner**: https://hetzner.com/cloud → CX22 (€4.49/mo)
- **DigitalOcean**: https://digitalocean.com → Basic Droplet ($6/mo)
- **Vultr**: https://vultr.com → Cloud Compute ($6/mo)

Choose:
- **OS**: Ubuntu 22.04 LTS (or 24.04 LTS)
- **Location**: closest to your players
- **Size**: smallest/cheapest is fine

Save the **IP address** they give you. It looks like: `123.45.67.89`

---

## Step 2: Connect to Your VPS

Open a terminal (on Mac: Terminal app, on Windows: PowerShell) and type:

```
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with the actual IP address from Step 1.

It will ask for a password — paste the one your hosting company gave you.

---

## Step 3: Run the Setup Script

Once you're connected to the VPS, paste this entire command and press Enter:

```
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/deploy-openrsc-vps.sh | bash
```

This takes 5–10 minutes. It installs everything automatically. When it finishes, it shows you:

- **Database password** — save this somewhere safe
- **Next steps** — follow them in order

---

## Step 4: Start the Game Server

After the script finishes, run these two commands:

```
systemctl enable --now openrsc
systemctl status openrsc
```

If it says "active (running)" — the server is live.

---

## Step 5: Set Up Your Domain

Go to wherever you manage your domain (Cloudflare, Namecheap, GoDaddy, etc.) and add a DNS record:

| Field | Value |
|-------|-------|
| Type | A |
| Name | game |
| Value | your VPS IP address |
| Proxy | DNS only (grey cloud) |

**Important**: If you use Cloudflare, the proxy MUST be off (grey cloud, not orange). The game uses a raw TCP connection that Cloudflare's proxy doesn't support.

The final address will be: `game.fuzzynuts.xyz`

---

## Step 6: Turn On the Game in the App

Go to your Railway dashboard (where the API is deployed) and add this environment variable:

```
GAME_SERVER_READY=true
```

Then redeploy. The `/play/rsc` page will now let players connect their wallet and download the game client.

---

## That's It

The game server is running. Players can:
1. Go to fuzzynuts.xyz/play/rsc
2. Connect their XRP wallet
3. Download the game client
4. Play RuneScape Classic

---

## If Something Goes Wrong

**Server won't start?**
```
journalctl -u openrsc -n 50
```
This shows the last 50 lines of the server log. Look for error messages.

**Can't connect from the game client?**
- Check that port 43594 is open: `ufw status`
- Check the DNS record resolves: `dig game.fuzzynuts.xyz`

**Need to restart the server?**
```
systemctl restart openrsc
```

**Need to see live logs?**
```
journalctl -u openrsc -f
```
Press Ctrl+C to stop watching.

---

## Turning On the Game (After VPS Is Ready)

After the VPS script finishes and DNS propagates:

1. Go to https://railway.app → your **fuzzynuts-api** project → **Variables** tab
2. Find `GAME_SERVER_READY` and change it from `false` to `true`
3. Click **Redeploy** (top right)
4. Wait 1–2 minutes
5. Visit https://fuzzynuts.xyz/play/rsc
6. Click "Connect XRP Wallet" — it should now proceed past the provisioning screen to the JAR download

If you still see "Server Provisioning", make sure:
- The VPS is running (`systemctl status openrsc` should say "active")
- DNS has propagated (visit `game.fuzzynuts.xyz` in browser — should show something, even an error is fine)
- You saved the Railway variables after editing
