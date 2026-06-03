#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Fix canvas keyboard simulation
#
#  v4: Hidden canvas during auto-login + postMessage to parent.
#  The canvas is invisible during the login sequence and only
#  revealed after the game connects. Parent window receives
#  { type: 'rsc-login-complete' } via postMessage.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v4 — hidden canvas)"
echo "═══════════════════════════════════════════════════════"

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
    <!-- fuzzynuts-autologin: v4 — hidden canvas + postMessage to parent -->
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

      var MAX_WAIT = 900;
      var pollCount = 0;
      var canvas = null;
      var loginComplete = false;

      function notifyParent() {
        if (loginComplete) return;
        loginComplete = true;
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'rsc-login-complete' }, '*');
            console.log('[autologin] Notified parent: login complete');
          }
        } catch (e) { /* cross-origin, ignore */ }
      }

      function charToKeyCode(ch) {
        if (ch.length === 1) {
          var code = ch.charCodeAt(0);
          if (code >= 65 && code <= 90) return code;
          if (code >= 97 && code <= 122) return code - 32;
          if (code >= 48 && code <= 57) return code;
        }
        return 0;
      }

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
        console.log('[autologin] Click at canvas(' + Math.round(x) + ',' + Math.round(y) + ')');
        ['mousedown', 'mouseup', 'click'].forEach(function(type) {
          canvas.dispatchEvent(new MouseEvent(type, {
            clientX: cx, clientY: cy,
            bubbles: true, cancelable: true, view: window
          }));
        });
      }

      // Button coordinates from mudclient.java
      var EXISTING_USER_X = 356;
      var EXISTING_USER_Y = 285;
      var OK_BUTTON_X = 410;
      var OK_BUTTON_Y = 255;

      var checkInterval = setInterval(function() {
        pollCount++;
        if (pollCount > MAX_WAIT) {
          clearInterval(checkInterval);
          console.log('[autologin] TIMEOUT after ' + MAX_WAIT + ' polls');
          if (canvas) canvas.style.visibility = 'visible';
          notifyParent();
          return;
        }

        if (!canvas) {
          canvas = document.querySelector('canvas');
          if (!canvas) return;
          canvas.style.visibility = 'hidden';
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
          console.log('[autologin] Canvas found: ' + canvas.width + 'x' + canvas.height + ' (hidden)');
        }

        // Step 1: Click center (10s after canvas)
        if (pollCount === 50) {
          console.log('[autologin] Step 1: Clicking center');
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 345;
          sendClick(w / 2, h / 2);
          return;
        }

        if (pollCount < 70) return;

        // Step 2: Click "Existing User"
        if (pollCount === 70) {
          console.log('[autologin] Step 2: Clicking Existing User');
          canvas.focus();
          sendClick(EXISTING_USER_X, EXISTING_USER_Y);
          return;
        }

        if (pollCount < 90) return;

        // Step 3: Type username
        if (pollCount === 90) {
          console.log('[autologin] Step 3: Typing username: ' + autoUser);
          canvas.focus();
          for (var i = 0; i < autoUser.length; i++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(autoUser[i], 100 * i);
          }
          return;
        }

        if (pollCount < 100) return;

        // Step 4: Tab to password
        if (pollCount === 100) {
          console.log('[autologin] Step 4: Tab to password');
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

        if (pollCount < 125) return;

        // Step 6: Press Enter + click Ok
        if (pollCount === 125) {
          console.log('[autologin] Step 6: Pressing Enter');
          sendEnter();
          setTimeout(function() {
            console.log('[autologin] Step 6b: Clicking Ok button');
            sendClick(OK_BUTTON_X, OK_BUTTON_Y);
          }, 500);
          setTimeout(function() {
            console.log('[autologin] Revealing canvas');
            if (canvas) canvas.style.visibility = 'visible';
            notifyParent();
            sessionStorage.removeItem('fn_autouser');
            sessionStorage.removeItem('fn_autopass');
            console.log('[autologin] Done');
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

if grep -q 'visibility' "$HTML_FILE"; then
  echo "✓ Canvas hiding enabled"
fi
if grep -q 'postMessage' "$HTML_FILE"; then
  echo "✓ postMessage to parent enabled"
fi
if grep -q 'v4' "$HTML_FILE"; then
  echo "✓ v4 marker present"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v4)"
echo ""
echo " Canvas is hidden during auto-login sequence."
echo " Parent window receives postMessage on login complete."
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
