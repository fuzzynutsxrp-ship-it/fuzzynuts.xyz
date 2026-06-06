# Fix: TeaVM Auto-Login — Canvas Keyboard Simulation Failing

## Diagnosis Summary

**Root Cause:** The patched `index.html` dispatches `KeyboardEvent` objects to the canvas, but is **missing the `keyCode` property**. TeaVM (compiled Java) reads `event.key` for single characters but falls back to `event.keyCode` for multi-character key names (Enter, Tab, Backspace). Without `keyCode`, these keys get code `0` and are silently dropped.

## Deep Analysis

### How TeaVM Handles Keyboard Events

I reverse-engineered the compiled `classes.js` (684KB, minified Java→JS). Here's the exact chain:

**1. Event Listeners (on canvas element):**
```
canvas.addEventListener("keydown", handleKeyDown)
canvas.addEventListener("keyup", handleKeyUp)
```

**2. Keydown Handler (`Lp` function):**
```javascript
function Lp(a, b) {
  c = b.keyCode;                                    // ← reads event.keyCode
  d = (b.key.length != 1) ? c & 65535 : b.key.charCodeAt(0);  // ← uses key for single chars, keyCode for multi-char
  if (c==8 || c==13 || c==10 || c==9) d = c & 65535;  // ← Enter/Tab/Backspace override to keyCode
  EL(a.mM, d);  // → dispatches to game logic
}
```

**3. Key Processing (`EL` → `Si` → `D6` = Panel.keyPress):**
```java
public final void keyPress(int key) {
    if (key != 0) {           // ← FILTERS OUT keyCode 0!
        if (key == '\b') ...  // Backspace: delete char
        if (key == 10 || key == 13) ...  // Enter: mark clicked
        if (key in inputFilterChars) ...  // Regular char: append
        if (key == '\t') ...  // Tab: next field
    }
}
```

### What Happens With Current Patch (No keyCode)

| Key | event.key | event.keyCode | TeaVM reads | Result |
|-----|-----------|---------------|-------------|--------|
| 'a' | "a" | 0 (default) | charCodeAt(0) = 97 | ✅ Works |
| '1' | "1" | 0 (default) | charCodeAt(0) = 49 | ✅ Works |
| Enter | "Enter" | 0 (default) | keyCode = 0 | ❌ FILTERED (key != 0 fails) |
| Tab | "Tab" | 0 (default) | keyCode = 0 | ❌ FILTERED |
| Backspace | "Backspace" | 0 (default) | keyCode = 0 | ❌ FILTERED |

**This is why "key events aren't reaching the canvas" — they reach it, but Enter/Tab/Backspace are silently dropped because keyCode=0.**

### Why Regular Characters Work But Login Still Fails

The script can type letters into the username field, but:
1. **Tab doesn't work** → can't move focus to password field
2. **Enter doesn't work** → can't submit the login form
3. **Backspace doesn't work** → can't correct typos

### Additional Issues in Original Patch

1. **Missing `click` event** — only dispatches `mousedown` + `mouseup`, not `click`
2. **No `view: window`** on mouse events — may affect event processing
3. **No console logging** — impossible to debug which step fails
4. **Timing too aggressive** — 6 seconds after canvas may not be enough

## The Fix

The fix script (`tools/fix-teavm-js-autologin.sh`) already exists and addresses ALL issues:

1. ✅ Adds `keyCode`, `which`, `charCode` to all KeyboardEvent objects
2. ✅ Proper keyCode mapping: a-z→65-90, 0-9→48-57, Enter→13, Tab→9, Backspace→8
3. ✅ Dispatches all three event types: keydown, keypress, keyup
4. ✅ Adds `click` event to mouse clicks
5. ✅ Adds `view: window` to all events
6. ✅ Console logging at every step for debugging
7. ✅ Increased wait times (10s after canvas, not 6s)

## How to Apply

**Single copy-paste command (run on VPS via SSH or DigitalOcean console):**

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
```

**Or if curl doesn't work, paste this directly:**

```bash
bash /opt/openrsc/fix-teavm-js-autologin.sh
```

(First upload the script to the VPS, then run it.)

## How to Verify

1. Open browser DevTools → Console tab
2. Navigate to: `https://game.fuzzynuts.xyz/#members,game.fuzzynuts.xyz,43494,65537,RSA_MODULUS,true,TestUser,testpass123`
3. Watch for `[autologin]` messages in console:
   - `[autologin] Credentials parsed from hash, user=TestUser`
   - `[autologin] Canvas found: 512x346`
   - `[autologin] Step 1: Clicking center of canvas`
   - `[autologin] Step 2: Clicking "Existing User"`
   - `[autologin] Step 3: Typing username: TestUser`
   - `[autologin] Step 4: Tab to password field`
   - `[autologin] Step 5: Typing password (11 chars)`
   - `[autologin] Step 6: Pressing Enter to login`
4. Game should auto-login without manual input

## Why Not Option A (Java-Level Auto-Login)?

Option A (modifying `mudclient.java` to read hash params and call `login()` directly) would be more reliable, BUT:

1. **No TeaVM build toolchain on VPS** — the `build.xml` only compiles the PC client JAR, not the TeaVM web client
2. **TeaVM compilation requires specific setup** — TeaVM compiler, correct Java version, web-specific build config
3. **Risk of breaking the working client** — any Java change requires full rebuild
4. **The JS fix is sufficient** — once keyCode is set correctly, the existing Java UI code handles everything

If the JS fix doesn't work, the fallback would be to:
1. Set up TeaVM build environment (locally or on VPS)
2. Modify `mudclient.java` line ~12409 to read URL hash params
3. Set `this.username` and `this.password` directly
4. Call `this.login(-12, this.password, this.getUsername(), false)`
5. Rebuild and deploy

## Rollback

```bash
# Restore from backup
cp /var/www/rsc-client/backup-autologin-*.html /var/www/rsc-client/index.html
# Or re-run the original patch
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/patch-rsc-teavm-client.sh | bash
```

## Key File Map

| File | Location | Purpose |
|------|----------|---------|
| `index.html` | `/var/www/rsc-client/index.html` | Patched TeaVM wrapper (VPS) |
| `classes.js` | `/var/www/rsc-client/teavm/classes.js` | TeaVM compiled Java→JS (VPS) |
| `mudclient.java` | `/opt/openrsc/Client_Base/src/orsc/mudclient.java` | Game client source (VPS) |
| `Panel.java` | `/opt/openrsc/Client_Base/src/orsc/graphics/gui/Panel.java` | UI panel with keyPress handler |
| `patch-rsc-teavm-client.sh` | `tools/` | Original patch script |
| `fix-teavm-js-autologin.sh` | `tools/` | Fix script (adds keyCode) |
| `diagnose-teavm-autologin.sh` | `tools/` | Diagnostic script |
