#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Silent auto-login, no login screen
#
#  v8: Canvas visible on BOTH success and failure.
#  Detects success via "Session id:" console message from the game.
#  On failure: sends postMessage with error, canvas becomes visible so user can see what happened.
#  The traditional login screen is completely inaccessible.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v7 — silent, no login screen)"
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
    <!-- fuzzynuts-autologin: v8 — canvas visible on success AND failure -->
    <script>
    (function() {
      'use strict';

      // Hash format: #members,host,port,rsa_exp,rsa_mod,useSSL,WALLET_ADDRESS
      var hashStr = window.location.hash.substring(1);
      var parts = hashStr.split(',');

      window._fnAutoLogin = false;
      window._fnWalletAddress = null;

      if (parts.length >= 7 && parts[6]) {
        var addr = decodeURIComponent(parts[6]);
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
    // ── Override console.log BEFORE main() to capture "Session id:" ──
    var _origConsoleLog = console.log.bind(console);
    var _sessionIdDetected = false;

    console.log = function() {
      var args = Array.prototype.slice.call(arguments);
      _origConsoleLog.apply(console, args);
      var msg = args.join(' ');
      if (msg.indexOf('Session id:') !== -1 || msg.indexOf('Login response:') !== -1) {
        _sessionIdDetected = true;
      }
    };

    main();

    (function() {
      if (!window._fnAutoLogin || !window._fnWalletAddress) {
        _origConsoleLog('[autologin] No wallet address, skipping');
        return;
      }

      var walletAddress = window._fnWalletAddress;
      window._fnWalletAddress = null;

      _origConsoleLog('[autologin] Starting secure credential fetch...');

      var MAX_WAIT = 900;
      var LOGIN_TIMEOUT = 180; // 36 seconds after submit
      var pollCount = 0;
      var canvas = null;
      var loginComplete = false;
      var credentials = null;
      var loginSubmitted = false;
      var loginSubmitTime = 0;

      function fetchCredentials() {
        var url = 'https://fuzzynutsxyz-production.up.railway.app/api/rsc/credentials?address=' + encodeURIComponent(walletAddress);
        return fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
          .then(function(res) {
            if (res.ok) return res.json();
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

      function notifyParent(type, detail) {
        if (loginComplete) return;
        loginComplete = true;
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: type, detail: detail || '' }, '*');
            _origConsoleLog('[autologin] Notified parent: ' + type);
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
        _origConsoleLog('[autologin] Click at canvas(' + Math.round(x) + ',' + Math.round(y) + ')');
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

      var checkInterval = setInterval(function() {
        pollCount++;
        if (pollCount > MAX_WAIT) {
          clearInterval(checkInterval);
          _origConsoleLog('[autologin] TIMEOUT');
          if (canvas) canvas.style.visibility = 'visible';
          notifyParent('rsc-login-error', 'Login timed out. Please try again.');
          return;
        }

        // ── After login submitted: wait for success signal ──
        if (loginSubmitted) {
          var elapsed = pollCount - loginSubmitTime;
          if (_sessionIdDetected) {
            clearInterval(checkInterval);
            _origConsoleLog('[autologin] Login success detected!');
            // Game is loading — wait 2s then reveal
            setTimeout(function() {
              if (canvas) canvas.style.visibility = 'visible';
              notifyParent('rsc-login-complete');
            }, 2000);
            return;
          }
          if (elapsed > LOGIN_TIMEOUT) {
            clearInterval(checkInterval);
            _origConsoleLog('[autologin] Login failed — no Session id after ' + (elapsed * 200) + 'ms');
            if (canvas) canvas.style.visibility = 'visible';
            notifyParent('rsc-login-error', 'Login failed. Invalid credentials or server error.');
            return;
          }
          return;
        }

        // ── Phase 1: Wait for canvas, fetch credentials ──
        if (!canvas) {
          canvas = document.querySelector('canvas');
          if (!canvas) return;
          canvas.style.visibility = 'hidden';
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
          _origConsoleLog('[autologin] Canvas found (hidden)');

          fetchCredentials()
            .then(function(creds) {
              credentials = creds;
              _origConsoleLog('[autologin] Credentials for: ' + creds.username);
            })
            .catch(function(err) {
              _origConsoleLog('[autologin] Fetch failed: ' + err.message);
              clearInterval(checkInterval);
              if (canvas) canvas.style.visibility = 'visible';
              notifyParent('rsc-login-error', 'Could not retrieve credentials. Please reconnect wallet.');
            });
          return;
        }

        if (!credentials) return;

        // ── Phase 2: Auto-login sequence ──

        if (pollCount === 50) {
          _origConsoleLog('[autologin] Step 1: Click center');
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 345;
          sendClick(w / 2, h / 2);
          return;
        }

        if (pollCount < 70) return;

        if (pollCount === 70) {
          _origConsoleLog('[autologin] Step 2: Click Existing User');
          canvas.focus();
          sendClick(EXISTING_USER_X, EXISTING_USER_Y);
          return;
        }

        if (pollCount < 90) return;

        if (pollCount === 90) {
          _origConsoleLog('[autologin] Step 3: Type username');
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
          _origConsoleLog('[autologin] Step 4: Tab');
          sendTab();
          return;
        }

        if (pollCount < 105) return;

        if (pollCount === 105) {
          _origConsoleLog('[autologin] Step 5: Type password');
          for (var j = 0; j < credentials.password.length; j++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(credentials.password[j], 100 * j);
          }
          return;
        }

        if (pollCount < 125) return;

        if (pollCount === 125) {
          _origConsoleLog('[autologin] Step 6: Submit login');
          sendEnter();
          setTimeout(function() { sendClick(OK_BUTTON_X, OK_BUTTON_Y); }, 500);

          credentials = null;
          loginSubmitted = true;
          loginSubmitTime = pollCount;
          _sessionIdDetected = false;
          _origConsoleLog('[autologin] Waiting for login response...');
          return;
        }
      }, 200);
    })();
    </script>
  </body>
</html>
HTMLEOF

echo "✓ Patched index.html written"

if grep -q 'v8' "$HTML_FILE"; then echo "✓ v8 marker present"; fi
if grep -q '_sessionIdDetected' "$HTML_FILE"; then echo "✓ Login success detection enabled"; fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v8 — canvas visible on success AND failure)"
echo ""
echo " Canvas becomes visible on both login success and failure."
echo " On failure: error message sent to parent page for retry UI."
echo " Traditional login screen is never visible."
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
