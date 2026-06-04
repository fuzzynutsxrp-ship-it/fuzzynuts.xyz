#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Silent auto-login + session guard
#
#  v12: Fixed initialization crash. Uses safe .bind() pattern.
#  All window properties initialized BEFORE any console access.
#  Proxy intercept on console for TeaVM output detection.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v12 — safe init)"
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
    <!-- fuzzynuts-autologin: v12 — safe init, Proxy intercept -->
    <script>
    // ═══════════════════════════════════════════════════════════
    //  BLOCK 1: Initialize ALL shared state FIRST (before any
    //  console access), then install Proxy intercept.
    // ═══════════════════════════════════════════════════════════

    // Step 1: Initialize ALL window properties FIRST
    // This happens at global scope, before ANY function calls
    window._sessionIdDetected = false;
    window._logoutDetected = false;
    window._logoutReason = '';
    window._recentMessages = [];
    window._fnSessionActive = false;
    window._fnSessionGuardStarted = false;
    window._fnAutoLogin = false;
    window._fnWalletAddress = null;
    window._msgCount = 0;

    window._logoutPatterns = [
      'disconnected',
      'connection lost',
      'session expired',
      'connection closed',
      'server closed',
      'timed out',
      'kicked',
      'banned',
      'enter your username',
      'enter your details',
      'welcome to runescape',
      'please enter your',
      'login screen',
      'error connecting',
      'failed to connect',
      'unable to connect',
      'no response from server'
    ];

    // Step 2: Parse hash params
    (function() {
      var hashStr = window.location.hash.substring(1);
      var parts = hashStr.split(',');
      if (parts.length >= 7 && parts[6]) {
        var addr = decodeURIComponent(parts[6]);
        if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr)) {
          window._fnWalletAddress = addr;
          window._fnAutoLogin = true;
        }
      }
    })();

    // Step 3: Install Proxy intercept on console
    // Uses .bind() which is safe and well-supported
    (function() {
      var _realConsole = console;

      // Save originals using safe .bind() pattern
      window._origLog = console.log.bind(console);
      window._origInfo = (console.info || console.log).bind(console);
      window._origWarn = (console.warn || console.log).bind(console);
      window._origError = (console.error || console.log).bind(console);

      // Process a console message for detection
      function _processMessage(msg) {
        window._msgCount++;

        // Track login success
        if (/Session id:\s*\d+/.test(msg) || /Login response:\s*\d+/.test(msg)) {
          window._sessionIdDetected = true;
          window._origLog('[autologin] ✓ SESSION ID DETECTED: ' + msg.substring(0, 60));
        }

        // Track recent messages
        window._recentMessages.push(msg.toLowerCase());
        if (window._recentMessages.length > 20) {
          window._recentMessages.shift();
        }

        // Check for logout indicators (only after session is active)
        if (window._fnSessionActive) {
          var msgLower = msg.toLowerCase();
          for (var i = 0; i < window._logoutPatterns.length; i++) {
            if (msgLower.indexOf(window._logoutPatterns[i]) !== -1) {
              window._logoutDetected = true;
              window._logoutReason = 'Game message: ' + msg.substring(0, 80);
              window._origLog('[session-guard] Logout detected: ' + window._logoutReason);
              break;
            }
          }
        }
      }

      // Install Proxy on window.console
      var handler = {
        get: function(target, prop) {
          var original = target[prop];
          if (typeof original === 'function') {
            return function() {
              original.apply(target, arguments);
              var args = Array.prototype.slice.call(arguments);
              var msg = args.join(' ');
              _processMessage(msg);
            };
          }
          return original;
        }
      };

      window.console = new Proxy(_realConsole, handler);

      // Verify
      window._origLog('[autologin] Console intercept installed (v12)');
      window._origLog('[autologin] Shared state ready: _recentMessages=' + Array.isArray(window._recentMessages));
      if (window._fnAutoLogin) {
        window._origLog('[autologin] Wallet address from hash: ' + window._fnWalletAddress.substring(0, 8) + '...');
      }
    })();
    </script>

    <!-- classes.js loads AFTER our Proxy is installed -->
    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>

    <script>
    // ═══════════════════════════════════════════════════════════
    //  BLOCK 2: Auto-login + session guard
    //  Runs AFTER classes.js loads and main() is called.
    //  Reads all state from window object.
    // ═══════════════════════════════════════════════════════════
    main();

    (function() {
      if (!window._fnAutoLogin || !window._fnWalletAddress) {
        console.log('[autologin] No wallet address, skipping');
        return;
      }

      var walletAddress = window._fnWalletAddress;
      window._fnWalletAddress = null;

      console.log('[autologin] Starting secure credential fetch...');

      var MAX_WAIT = 900;
      var LOGIN_TIMEOUT = 180; // 36 seconds after submit
      var pollCount = 0;
      var canvas = null;
      var loginComplete = false;
      var credentials = null;
      var loginSubmitted = false;
      var loginSubmitTime = 0;
      var sessionGuardInterval = null;

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
        if (loginComplete && type === 'rsc-login-complete') return;
        if (type === 'rsc-login-complete') loginComplete = true;
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: type, detail: detail || '' }, '*');
            console.log('[autologin] Notified parent: ' + type);
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

      // ────────────────────────────────────────────────────────────
      //  SESSION GUARD — runs after login succeeds
      // ────────────────────────────────────────────────────────────
      function startSessionGuard() {
        if (window._fnSessionGuardStarted) return;
        window._fnSessionGuardStarted = true;
        window._fnSessionActive = true;

        console.log('[session-guard] Active — monitoring for disconnect...');

        var lastCanvasWidth = canvas ? canvas.width : 0;
        var lastCanvasHeight = canvas ? canvas.height : 0;

        sessionGuardInterval = setInterval(function() {
          // Check 1: Console-based logout detection
          if (window._logoutDetected) {
            clearInterval(sessionGuardInterval);
            window._fnSessionActive = false;
            console.log('[session-guard] LOGOUT — hiding canvas. Reason: ' + window._logoutReason);
            if (canvas) canvas.style.visibility = 'hidden';
            notifyParent('rsc-session-lost', window._logoutReason);
            return;
          }

          // Check 2: Canvas removed from DOM
          if (canvas && !document.body.contains(canvas)) {
            clearInterval(sessionGuardInterval);
            window._fnSessionActive = false;
            console.log('[session-guard] LOGOUT — canvas removed from DOM');
            notifyParent('rsc-session-lost', 'Game canvas was removed');
            return;
          }

          // Check 3: Canvas resized dramatically
          if (canvas) {
            var w = canvas.width;
            var h = canvas.height;
            if (lastCanvasWidth > 0 && lastCanvasHeight > 0) {
              if (w < lastCanvasWidth * 0.5 || h < lastCanvasHeight * 0.5) {
                console.log('[session-guard] Canvas shrunk: ' + w + 'x' + h + ' (was ' + lastCanvasWidth + 'x' + lastCanvasHeight + ')');
              }
            }
            lastCanvasWidth = w;
            lastCanvasHeight = h;
          }

          // Check 4: Recent messages scan
          var recentCopy = window._recentMessages.slice();
          window._recentMessages = [];
          for (var m = 0; m < recentCopy.length; m++) {
            var msgLower = recentCopy[m];
            for (var p = 0; p < window._logoutPatterns.length; p++) {
              if (msgLower.indexOf(window._logoutPatterns[p]) !== -1) {
                clearInterval(sessionGuardInterval);
                window._fnSessionActive = false;
                window._logoutReason = 'Console message: ' + msgLower.substring(0, 80);
                console.log('[session-guard] LOGOUT — ' + window._logoutReason);
                if (canvas) canvas.style.visibility = 'hidden';
                notifyParent('rsc-session-lost', window._logoutReason);
                return;
              }
            }
          }
        }, 3000);
      }

      // ────────────────────────────────────────────────────────────

      var EXISTING_USER_X = 356;
      var EXISTING_USER_Y = 285;
      var OK_BUTTON_X = 410;
      var OK_BUTTON_Y = 255;

      var checkInterval = setInterval(function() {
        pollCount++;
        if (pollCount > MAX_WAIT) {
          clearInterval(checkInterval);
          console.log('[autologin] TIMEOUT');
          if (canvas) canvas.style.visibility = 'visible';
          notifyParent('rsc-login-error', 'Login timed out. Please try again.');
          return;
        }

        // ── After login submitted: wait for success signal ──
        if (loginSubmitted) {
          var elapsed = pollCount - loginSubmitTime;
          if (window._sessionIdDetected) {
            clearInterval(checkInterval);
            console.log('[autologin] Login success detected!');
            setTimeout(function() {
              if (canvas) canvas.style.visibility = 'visible';
              notifyParent('rsc-login-complete');
              startSessionGuard();
            }, 2000);
            return;
          }
          if (elapsed > LOGIN_TIMEOUT) {
            clearInterval(checkInterval);
            console.log('[autologin] Login failed — no Session id after ' + (elapsed * 200) + 'ms. Messages caught: ' + window._msgCount);
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
          console.log('[autologin] Canvas found (hidden)');

          fetchCredentials()
            .then(function(creds) {
              credentials = creds;
              console.log('[autologin] Credentials for: ' + creds.username);
            })
            .catch(function(err) {
              console.log('[autologin] Fetch failed: ' + err.message);
              clearInterval(checkInterval);
              if (canvas) canvas.style.visibility = 'visible';
              notifyParent('rsc-login-error', 'Could not retrieve credentials. Please reconnect wallet.');
            });
          return;
        }

        if (!credentials) return;

        // ── Phase 2: Auto-login sequence ──

        if (pollCount === 50) {
          console.log('[autologin] Step 1: Click center');
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 345;
          sendClick(w / 2, h / 2);
          return;
        }

        if (pollCount < 70) return;

        if (pollCount === 70) {
          console.log('[autologin] Step 2: Click Existing User');
          canvas.focus();
          sendClick(EXISTING_USER_X, EXISTING_USER_Y);
          return;
        }

        if (pollCount < 90) return;

        if (pollCount === 90) {
          console.log('[autologin] Step 3: Type username');
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
          console.log('[autologin] Step 4: Tab');
          sendTab();
          return;
        }

        if (pollCount < 105) return;

        if (pollCount === 105) {
          console.log('[autologin] Step 5: Type password');
          for (var j = 0; j < credentials.password.length; j++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(credentials.password[j], 100 * j);
          }
          return;
        }

        if (pollCount < 125) return;

        if (pollCount === 125) {
          console.log('[autologin] Step 6: Submit login');
          sendEnter();
          setTimeout(function() { sendClick(OK_BUTTON_X, OK_BUTTON_Y); }, 500);

          credentials = null;
          loginSubmitted = true;
          loginSubmitTime = pollCount;
          window._sessionIdDetected = false;
          console.log('[autologin] Waiting for login response...');
          return;
        }
      }, 200);
    })();
    </script>
  </body>
</html>
HTMLEOF

echo "✓ Patched index.html written"

if grep -q 'v12' "$HTML_FILE"; then echo "✓ v12 marker present"; fi
if grep -q 'new Proxy' "$HTML_FILE"; then echo "✓ Proxy intercept enabled"; fi
if grep -q 'session-guard' "$HTML_FILE"; then echo "✓ Session guard enabled"; fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v12 — safe init)"
echo ""
echo " Changes from v11:"
echo "   + ALL window properties initialized at global scope FIRST"
echo "   + Safe .bind() pattern instead of Function.prototype.call.bind"
echo "   + No IIFE wrapping the property initialization"
echo "   + _msgCount counter for debugging"
echo "   + Message count shown on timeout for diagnostics"
echo ""
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
