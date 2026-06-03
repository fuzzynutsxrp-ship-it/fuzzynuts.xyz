#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Secure auto-login via wallet address
#
#  v6: Fetches credentials using wallet address (public, not a secret).
#  The wallet address is passed via URL hash (7th param).
#  The password is ONLY in the iframe, never in the parent page.
#  Canvas hidden during auto-login, revealed after login completes.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v6 — wallet address in hash)"
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
    <!-- fuzzynuts-autologin: v6 — wallet address in hash, password from API -->
    <script>
    (function() {
      'use strict';

      // Hash format: #members,host,port,rsa_exp,rsa_mod,useSSL,WALLET_ADDRESS
      // The wallet address is public (not a secret). The game password is
      // fetched from the API and never appears in the URL or parent page.
      var hashStr = window.location.hash.substring(1);
      var parts = hashStr.split(',');

      window._fnAutoLogin = false;
      window._fnWalletAddress = null;

      if (parts.length >= 7 && parts[6]) {
        var addr = decodeURIComponent(parts[6]);
        // Validate XRPL address format
        if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr)) {
          window._fnWalletAddress = addr;
          window._fnAutoLogin = true;
          console.log('[autologin] Wallet address from hash: ' + addr.substring(0, 8) + '...');
        }
      }
    })();
    </script>

    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>
    <script>
    main();

    (function() {
      if (!window._fnAutoLogin || !window._fnWalletAddress) {
        console.log('[autologin] No wallet address, skipping auto-login');
        return;
      }

      var walletAddress = window._fnWalletAddress;
      // Clear wallet address from memory (we only need it for the fetch)
      window._fnWalletAddress = null;

      console.log('[autologin] Starting credential fetch...');
      var MAX_WAIT = 900;
      var pollCount = 0;
      var canvas = null;
      var loginComplete = false;
      var credentials = null;

      // ── Fetch credentials from API using wallet address ──
      function fetchCredentials() {
        var url = 'https://fuzzynutsxyz-production.up.railway.app/api/rsc/credentials?address=' + encodeURIComponent(walletAddress);
        return fetch(url, {
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

          fetchCredentials()
            .then(function(creds) {
              credentials = creds;
              console.log('[autologin] Credentials received for user: ' + creds.username);
            })
            .catch(function(err) {
              console.warn('[autologin] Credential fetch failed: ' + err.message);
              clearInterval(checkInterval);
              canvas.style.visibility = 'visible';
              notifyParent();
            });
          return;
        }

        if (!credentials) return;

        // ── Phase 2: Auto-login sequence ──

        if (pollCount === 50) {
          console.log('[autologin] Step 1: Clicking center');
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 345;
          sendClick(w / 2, h / 2);
          return;
        }

        if (pollCount < 70) return;

        if (pollCount === 70) {
          console.log('[autologin] Step 2: Clicking Existing User');
          canvas.focus();
          sendClick(EXISTING_USER_X, EXISTING_USER_Y);
          return;
        }

        if (pollCount < 90) return;

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

        if (pollCount === 100) {
          console.log('[autologin] Step 4: Tab to password');
          sendTab();
          return;
        }

        if (pollCount < 105) return;

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

        if (pollCount === 125) {
          console.log('[autologin] Step 6: Pressing Enter');
          sendEnter();
          setTimeout(function() {
            console.log('[autologin] Step 6b: Clicking Ok button');
            sendClick(OK_BUTTON_X, OK_BUTTON_Y);
          }, 500);

          credentials = null;

          setTimeout(function() {
            console.log('[autologin] Revealing canvas');
            if (canvas) canvas.style.visibility = 'visible';
            notifyParent();
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

if grep -q 'walletAddress' "$HTML_FILE"; then
  echo "✓ Wallet address fetch enabled"
fi
if grep -q 'v6' "$HTML_FILE"; then
  echo "✓ v6 marker present"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v6)"
echo ""
echo " Wallet address passed via URL hash (public, not secret)."
echo " Game password fetched from API by iframe (never in parent)."
echo " Canvas hidden during auto-login sequence."
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
