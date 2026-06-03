#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Secure auto-login via HttpOnly cookie
#
#  v5: Fetches credentials from API using HttpOnly cookie.
#  No passwords in URL hash. No passwords in parent page JS.
#  The iframe fetches credentials directly from the API using
#  credentials: 'include' which sends the fuzzy_wallet_session cookie.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v5 — secure cookie auth)"
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
    <!-- fuzzynuts-autologin: v5 — secure cookie auth, no hash passwords -->
    <script>
    (function() {
      'use strict';

      // Read connection params from hash (standard TeaVM format)
      // These are NOT credentials — just server address, RSA keys, etc.
      var hashStr = window.location.hash.substring(1);
      var parts = hashStr.split(',');

      // Parse standard connection params (first 6 only)
      // Format: #members,host,port,rsa_exp,rsa_mod,useSSL
      if (parts.length >= 6) {
        window._fnServerHost = parts[1];
        window._fnServerPort = parts[2];
      }

      // Check if we should attempt auto-login
      // This flag is set by the parent page via URL param
      window._fnAutoLogin = parts.length >= 6;
    })();
    </script>

    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>
    <script>
    main();

    (function() {
      if (!window._fnAutoLogin) {
        console.log('[autologin] No auto-login requested, skipping');
        return;
      }

      console.log('[autologin] Starting secure credential fetch...');
      var MAX_WAIT = 900;
      var pollCount = 0;
      var canvas = null;
      var loginComplete = false;
      var credentials = null;

      // ── Fetch credentials securely from API using HttpOnly cookie ──
      function fetchCredentials() {
        return fetch('https://fuzzynutsxyz-production.up.railway.app/api/rsc/credentials', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
          .then(function(res) {
            if (res.ok) return res.json();
            if (res.status === 401) throw new Error('E_NOT_AUTHENTICATED');
            if (res.status === 404) throw new Error('E_NO_MAPPING');
            throw new Error('E_API_ERROR_' + res.status);
          })
          .then(function(data) {
            if (data && data.username && data.gamePassword) {
              return { username: data.username, password: data.gamePassword };
            }
            throw new Error('E_INVALID_RESPONSE');
          });
      }

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

      // ── Phase 1: Wait for canvas, then fetch credentials ──
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

          // Fetch credentials from API using HttpOnly cookie
          fetchCredentials()
            .then(function(creds) {
              credentials = creds;
              console.log('[autologin] Credentials received for user: ' + creds.username);
              // Clear password from memory after storing
              // (it will be used in the keyboard simulation below)
            })
            .catch(function(err) {
              console.warn('[autologin] Credential fetch failed: ' + err.message);
              // Show canvas without auto-login
              clearInterval(checkInterval);
              canvas.style.visibility = 'visible';
              notifyParent();
            });
          return;
        }

        // Wait for credentials to be fetched
        if (!credentials) return;

        // ── Phase 2: Auto-login sequence ──

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
          console.log('[autologin] Step 3: Typing username: ' + credentials.username);
          canvas.focus();
          for (var i = 0; i < credentials.username.length; i++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(credentials.username[i], 100 * i);
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
          console.log('[autologin] Step 5: Typing password (' + credentials.password.length + ' chars)');
          for (var j = 0; j < credentials.password.length; j++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(credentials.password[j], 100 * j);
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

          // Clear credentials from memory immediately
          var username = credentials.username;
          credentials = null;

          // Wait 3s then show canvas and notify parent
          setTimeout(function() {
            console.log('[autologin] Revealing canvas');
            if (canvas) canvas.style.visibility = 'visible';
            notifyParent();
            console.log('[autologin] Done — credentials cleared from memory');
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

if grep -q 'credentials.*include' "$HTML_FILE"; then
  echo "✓ Secure cookie fetch enabled"
fi
if grep -q 'postMessage' "$HTML_FILE"; then
  echo "✓ postMessage to parent enabled"
fi
if grep -q 'v5' "$HTML_FILE"; then
  echo "✓ v5 marker present"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v5 — secure cookie auth)"
echo ""
echo " Credentials fetched from API using HttpOnly cookie."
echo " No passwords in URL hash or parent page JS."
echo " Canvas hidden during auto-login sequence."
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
