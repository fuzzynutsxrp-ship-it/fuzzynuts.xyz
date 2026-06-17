# Railway Deploy — Browser-Only Steps

The API runs on Railway. Set two environment variables, then redeploy.

---

## Step 1: Open Railway

Go to https://railway.app and sign in.

Find the project called **fuzzynuts-api** (or similar).

---

## Step 2: Add Environment Variables

Click on your API service, then click the **"Variables"** tab.

Add these two variables (click "New Variable" for each):

| Name                  | Value       |
| --------------------- | ----------- |
| `GAME_SERVER_READY`   | `false`     |
| `GAME_SESSION_SECRET` | (see below) |

### For GAME_SESSION_SECRET

Copy this value and paste it exactly:

```
a3f8c1d2e4b59607182f3a4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80
```

This is a random 256-bit hex string. It's safe to use as-is. You can change it later if you want.

(If you want to generate your own, go to https://generate-random.org/encryption-key?count=1&bytes=32&string=cHex and copy the result.)

---

## Step 3: Add the Third Variable

Add one more variable:

| Name                    | Value                 |
| ----------------------- | --------------------- |
| `OPENRSC_GAME_ENDPOINT` | `fuzzynuts.xyz:43594` |

This is a placeholder. You'll update it later when the game server VPS is set up.

---

## Step 4: Redeploy

Click the **"Redeploy"** button (top right of the deployment panel).

Wait about 1–2 minutes for it to finish.

---

## Step 5: Confirm It Worked

After the redeploy finishes:

1. Open a new browser tab
2. Go to: `https://world.fuzzynuts.xyz/api/auth/game-session`
3. You should see a JSON response like:

```json
{ "status": "provisioning", "message": "Game server is being deployed. Check back shortly." }
```

If you see that — the API is live and correctly showing the provisioning state.

---

## Summary of All Variables

After this setup, your Railway variables should include:

| Name                    | Value                 | Notes                                         |
| ----------------------- | --------------------- | --------------------------------------------- |
| `GAME_SERVER_READY`     | `false`               | Change to `true` later when game VPS is ready |
| `GAME_SESSION_SECRET`   | `a3f8c1d...`          | Used to sign game session tokens              |
| `OPENRSC_GAME_ENDPOINT` | `fuzzynuts.xyz:43594` | Game server address (placeholder)             |

Plus any existing variables you already have (MONGO_URL, XRPL_NETWORK, etc.) — don't touch those.
