# Fix: TeaVM Auto-Login Keyboard Simulation

## What Was Wrong

The patched `index.html` on the VPS simulates keyboard input to fill the RuneScape Classic login form. The simulation was failing because:

1. **Missing `keyCode`/`which`/`charCode`** — TeaVM is compiled Java. Java's `KeyEvent.getKeyCode()` reads from the browser's legacy `keyCode` property, NOT the modern `key` property. Without `keyCode`, Java sees 0 for every keypress and ignores all input.

2. **Missing `keypress` event** — Only `keydown`+`keyup` were dispatched. TeaVM may need all three event types.

3. **Missing `click` event** — `sendClick()` only dispatched `mousedown`+`mouseup`. Some event listeners need the `click` event too.

4. **No logging** — Zero console.log statements made debugging impossible.

## What the Fix Does

- Adds `keyCode`, `which`, and `charCode` to all KeyboardEvent dispatches
- Dispatches all three event types: `keydown`, `keypress`, `keyup`
- Adds `click` event to mouse clicks
- Adds console.log at every step for debugging
- Increases wait times (10 seconds after canvas, not 6)

## How to Apply

Copy-paste this into the DigitalOcean console (or SSH):

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
```

Or if the repo isn't accessible, paste the script content directly.

## How to Verify

1. Open `game.fuzzynuts.xyz` in a browser (without hash params — just the base URL)
2. Open DevTools → Console tab
3. You should see NO `[autologin]` messages (no credentials = skipped)
4. Now open with credentials: `game.fuzzynuts.xyz/#members,game.fuzzynuts.xyz,43494,65537,RSA_MOD,true,TestUser,testpass123`
5. Console should show:
   - `[autologin] Credentials parsed from hash, user=TestUser`
   - `[autologin] Canvas found: 512x346`
   - `[autologin] Step 1: Clicking center of canvas`
   - `[autologin] Step 2: Clicking "Existing User"`
   - `[autologin] Step 3: Typing username: TestUser`
   - `[autologin] Step 4: Tab to password field`
   - `[autologin] Step 5: Typing password (11 chars)`
   - `[autologin] Step 6: Pressing Enter to login`
6. The game should auto-login without manual input

## Rollback

```bash
cp /var/www/rsc-client/backup-autologin-*.html /var/www/rsc-client/index.html
```
