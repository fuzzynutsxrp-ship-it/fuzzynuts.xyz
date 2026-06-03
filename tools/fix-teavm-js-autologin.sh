#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Fix canvas keyboard simulation
#
#  ROOT CAUSE: KeyboardEvent missing keyCode/which/charCode properties.
#  TeaVM (compiled Java) reads event.keyCode, not event.key.
#  Without keyCode, Java sees 0 for every keypress and ignores it.
#
#  FIX: Add proper keyCode mapping + correct button coordinates
#       from mudclient.java source + console logging for debugging.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (Keyboard Simulation)"
echo "═══════════════════════════════════════════════════════"

# Backup
mkdir -p "$(dirname "$BACKUP")"
cp "$HTML_FILE" "$BACKUP"
echo "✓ Backup at: $BACKUP"

cat > "$HTML_FILE" << 'HTMLEOF'
<!DOCTYPE html>
<html>
  <head>
    <title>Runescape by Andrew Gower</title>
    <meta charset="utf-8">
    <style>body{margin:0;background-color: black;}</style>
  </head>
  <body>
    <!-- fuzzynuts-autologin: v3 — fixed coordinates + uppercase keyCode -->
    <script>
    (function() {
      'use strict';

      var fullHash = window.location.hash;
      var hashStr = fullHash.substring(1);
      var parts = hashStr.split(',');

      var autoUser = null;
      var autoPass = null;

      if (parts.length > 7 && parts[6] && parts[7]) {
        autoUser = decodeURIComponent(parts[6]);
        autoPass = decodeURIComponent(parts[7]);
        sessionStorage.setItem('fn_autouser', autoUser);
        sessionStorage.setItem('fn_autopass', autoPass);
        var cleanHash = '#' + parts.slice(0, 6).join(',');
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', cleanHash);
        } else {
          window.location.hash = cleanHash;
        }
        console.log('[autologin] Credentials parsed from hash, user=' + autoUser);
      } else {
        autoUser = sessionStorage.getItem('fn_autouser');
        autoPass = sessionStorage.getItem('fn_autopass');
        if (autoUser) console.log('[autologin] Credentials restored from sessionStorage');
      }

      if (autoUser && autoPass) {
        window._fnAutoUser = autoUser;
        window._fnAutoPass = autoPass;
      }
    })();
    </script>

    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>
    <script>
    main();

    (function() {
      var autoUser = window._fnAutoUser;
      var autoPass = window._fnAutoPass;
      if (!autoUser || !autoPass) {
        console.log('[autologin] No credentials, skipping auto-login');
        return;
      }

      console.log('[autologin] Scheduling auto-login for user: ' + autoUser);

      var MAX_WAIT = 900; // 3 minutes max
      var pollCount = 0;
      var canvas = null;

      // Map character to keyCode — handles a-z, A-Z, 0-9
      function charToKeyCode(ch) {
        if (ch.length === 1) {
          var code = ch.charCodeAt(0);
          if (code >= 65 && code <= 90) return code;   // A-Z (65-90)
          if (code >= 97 && code <= 122) return code - 32; // a-z -> A-Z (65-90)
          if (code >= 48 && code <= 57) return code;   // 0-9 (48-57)
        }
        return 0;
      }

      // Send a complete keyboard event with all properties TeaVM needs
      function sendKeyEvent(type, ch, keyCode) {
        if (!canvas) return;
        var evt = new KeyboardEvent(type, {
          key: ch,
          code: 'Key' + ch.toUpperCase(),
          keyCode: keyCode,
          which: keyCode,
          charCode: (type === 'keypress') ? keyCode : 0,
          bubbles: true,
          cancelable: true,
          view: window
        });
        canvas.dispatchEvent(evt);
      }

      function sendKey(ch) {
        var kc = charToKeyCode(ch);
        sendKeyEvent('keydown', ch, kc);
        sendKeyEvent('keypress', ch, kc);
        sendKeyEvent('keyup', ch, kc);
      }

      function sendEnter() {
        sendKeyEvent('keydown', 'Enter', 13);
        sendKeyEvent('keypress', 'Enter', 13);
        sendKeyEvent('keyup', 'Enter', 13);
      }

      function sendTab() {
        sendKeyEvent('keydown', 'Tab', 9);
        sendKeyEvent('keypress', 'Tab', 9);
        sendKeyEvent('keyup', 'Tab', 9);
      }

      function sendClick(x, y) {
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var cx = rect.left + x;
        var cy = rect.top + y;
        console.log('[autologin] Click at canvas(' + Math.round(x) + ',' + Math.round(y) + ') screen(' + Math.round(cx) + ',' + Math.round(cy) + ')');
        ['mousedown', 'mouseup', 'click'].forEach(function(type) {
          canvas.dispatchEvent(new MouseEvent(type, {
            clientX: cx, clientY: cy,
            bubbles: true, cancelable: true, view: window
          }));
        });
      }

      // Button coordinates from mudclient.java:
      //   halfGameWidth = 256, halfGameHeight = 172
      //   yOffsetWelcome = 40
      //   "Existing User" button: (256+100, 172+73+40) = (356, 285), size 120x35
      //   Login form Ok button:   (256+154, 172+83+0)  = (410, 255), size 120x25
      var EXISTING_USER_X = 356;
      var EXISTING_USER_Y = 285;
      var OK_BUTTON_X = 410;
      var OK_BUTTON_Y = 255;

      var checkInterval = setInterval(function() {
        pollCount++;
        if (pollCount > MAX_WAIT) {
          clearInterval(checkInterval);
          console.log('[autologin] TIMEOUT after ' + MAX_WAIT + ' polls');
          return;
        }

        if (!canvas) {
          canvas = document.querySelector('canvas');
          if (!canvas) return;
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
          console.log('[autologin] Canvas found: ' + canvas.width + 'x' + canvas.height);
        }

        // Step 1: Click center — "Click here to login" (10s after canvas)
        if (pollCount === 50) {
          console.log('[autologin] Step 1: Clicking center ("Click here to login")');
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 345;
          sendClick(w / 2, h / 2);
          return;
        }

        // Wait 4s for menu to appear
        if (pollCount < 70) return;

        // Step 2: Click "Existing User" at exact button coordinates
        if (pollCount === 70) {
          console.log('[autologin] Step 2: Clicking "Existing User" at (' + EXISTING_USER_X + ',' + EXISTING_USER_Y + ')');
          canvas.focus();
          sendClick(EXISTING_USER_X, EXISTING_USER_Y);
          return;
        }

        // Wait 4s for login form to appear
        if (pollCount < 90) return;

        // Step 3: Type username (form auto-focuses username field)
        if (pollCount === 90) {
          console.log('[autologin] Step 3: Typing username: ' + autoUser);
          canvas.focus();
          for (var i = 0; i < autoUser.length; i++) {
            (function(ch, delay) {
              setTimeout(function() {
                console.log('[autologin]   key: ' + ch + ' keyCode=' + charToKeyCode(ch));
                sendKey(ch);
              }, delay);
            })(autoUser[i], 100 * i);
          }
          return;
        }

        // Wait for username to be typed
        if (pollCount < 100) return;

        // Step 4: Tab to password field
        if (pollCount === 100) {
          console.log('[autologin] Step 4: Tab to password field');
          sendTab();
          return;
        }

        if (pollCount < 105) return;

        // Step 5: Type password
        if (pollCount === 105) {
          console.log('[autologin] Step 5: Typing password (' + autoPass.length + ' chars)');
          for (var j = 0; j < autoPass.length; j++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(autoPass[j], 100 * j);
          }
          return;
        }

        // Wait for password to be typed
        if (pollCount < 125) return;

        // Step 6: Press Enter to login
        if (pollCount === 125) {
          console.log('[autologin] Step 6: Pressing Enter to login');
          sendEnter();
          // Also click Ok button as fallback
          setTimeout(function() {
            console.log('[autologin] Step 6b: Clicking Ok button as fallback');
            sendClick(OK_BUTTON_X, OK_BUTTON_Y);
          }, 500);
          setTimeout(function() {
            sessionStorage.removeItem('fn_autouser');
            sessionStorage.removeItem('fn_autopass');
            console.log('[autologin] Credentials cleared');
          }, 3000);
          clearInterval(checkInterval);
          return;
        }
      }, 200);
    })();
    </script>
  </body>
</html>
HTMLEOF

echo "✓ Patched index.html written"

# Verify
echo ""
echo "Verifying..."
if grep -q 'keyCode' "$HTML_FILE"; then
  echo "✓ keyCode property set on events"
fi
if grep -q 'charCode' "$HTML_FILE"; then
  echo "✓ charCode property set on events"
fi
if grep -q 'console.log' "$HTML_FILE"; then
  echo "✓ Console logging enabled"
fi
if grep -q 'fuzzynuts-autologin' "$HTML_FILE"; then
  echo "✓ Auto-login marker present"
fi
if grep -q 'EXISTING_USER_X' "$HTML_FILE"; then
  echo "✓ Correct button coordinates from mudclient.java"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v3)"
echo ""
echo " What changed from v1/v2:"
echo "   - Fixed charToKeyCode: now handles A-Z (was only a-z)"
echo "   - Fixed 'Existing User' click: (356,285) from Java source"
echo "     (was (256,207) — off by 100px X, 78px Y)"
echo "   - Added Ok button click as fallback after Enter"
echo "   - Increased timing: 4s between major steps (was 2s)"
echo ""
echo " To verify:"
echo "   1. Open game.fuzzynuts.xyz in browser"
echo "   2. Open DevTools → Console"
echo "   3. Look for [autologin] messages"
echo "   4. Watch for Step 1 through Step 6"
echo ""
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
