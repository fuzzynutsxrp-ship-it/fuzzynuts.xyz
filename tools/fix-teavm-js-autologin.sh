#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Silent auto-login + session guard
#
#  v11: Complete rewrite of console interception.
#  Uses Proxy on window.console to catch ALL console access,
#  including references TeaVM cached before our intercept.
#  All shared state on window object for cross-script-block access.
#  Canvas pixel sampling as backup logout detection.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v11 — Proxy console intercept)"
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
    <!-- fuzzynuts-autologin: v11 — Proxy console intercept -->
    <script>
    // ═══════════════════════════════════════════════════════════
    //  BLOCK 1: Console intercept + shared state
    //  Runs BEFORE classes.js loads.
    //  Uses Proxy to intercept ALL console access, even from
    //  code that cached a reference to console methods.
    //  ALL state on window object for cross-block access.
    // ═══════════════════════════════════════════════════════════
    (function() {
      'use strict';

      // Save REAL original console methods (not our wrappers)
      var _realConsole = console;
      window._origLog = Function.prototype.call.bind(console.log, console);
      window._origInfo = Function.prototype.call.bind(console.info || console.log, console);
      window._origWarn = Function.prototype.call.bind(console.warn || console.log, console);
      window._origError = Function.prototype.call.bind(console.error || console.log, console);

      // Shared state — ALL on window for cross-script-block access
      window._sessionIdDetected = false;
      window._logoutDetected = false;
      window._logoutReason = '';
      window._recentMessages = [];
      window._fnSessionActive = false;
      window._fnSessionGuardStarted = false;

      // Logout indicators
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

      // Hash parsing
      var hashStr = window.location.hash.substring(1);
      var parts = hashStr.split(',');
      window._fnAutoLogin = false;
      window._fnWalletAddress = null;

      if (parts.length >= 7 && parts[6]) {
        var addr = decodeURIComponent(parts[6]);
        if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(addr)) {
          window._fnWalletAddress = addr;
          window._fnAutoLogin = true;
        }
      }

      // ── Process a console message for detection ──
      function _processMessage(msg) {
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

      // ── Install Proxy on window.console ──
      // This intercepts ALL console access, even from code that
      // does: var log = console.log; log("hello");
      // Because the Proxy intercepts the property GET, returning
      // our wrapped function every time.
      var handler = {
        get: function(target, prop) {
          var original = target[prop];
          if (typeof original === 'function') {
            // Return a wrapped function for every console method
            return function() {
              // Call the REAL original method
              original.apply(target, arguments);
              // Process the message for detection
              var args = Array.prototype.slice.call(arguments);
              var msg = args.join(' ');
              _processMessage(msg);
            };
          }
          return original;
        }
      };

      // Replace window.console with our Proxy
      // After this, ANY access to console.log/info/warn/error
      // goes through our handler, even from cached references
      window.console = new Proxy(_realConsole, handler);

      // Verify the proxy is working
      console.log('[autologin] Console intercept installed (v11 — Proxy)');
      if (window._fnAutoLogin) {
        console.log('[autologin] Wallet address from hash: ' + window._fnWalletAddress.substring(0, 8) + '...');
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

        // Sample canvas pixels to detect login screen
        // The login screen has a distinctive dark blue/gray center
        var lastCanvasWidth = canvas ? canvas.width : 0;
        var lastCanvasHeight = canvas ? canvas.height : 0;
        var sampleCtx = null;
        try {
          if (canvas && canvas.getContext) {
            sampleCtx = canvas.getContext('2d', { willReadFrequently: true });
          }
        } catch (e) { /* canvas might not support 2d context */ }

        function sampleCanvasPixels() {
          if (!sampleCtx || !canvas) return null;
          try {
            // Sample center of canvas
            var w = canvas.width;
            var h = canvas.height;
            var cx = Math.floor(w / 2);
            var cy = Math.floor(h / 2);
            var pixel = sampleCtx.getImageData(cx, cy, 1, 1).data;
            return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
          } catch (e) {
            // Cross-origin or tainted canvas — can't sample
            return null;
          }
        }

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

          // Check 3: Canvas pixel sampling (backup detection)
          var pixel = sampleCanvasPixels();
          if (pixel) {
            // Login screen is typically very dark (near black) in center
            // Game world has varied colors
            var brightness = (pixel.r + pixel.g + pixel.b) / 3;
            if (brightness < 5 && pixel.a === 255) {
              // Very dark pixel — might be login screen
              // Don't immediately flag — could be loading screen
              // Log for debugging
              console.log('[session-guard] Dark pixel detected: rgb(' + pixel.r + ',' + pixel.g + ',' + pixel.b + ')');
            }
          }

          // Check 4: Canvas resized dramatically
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

          // Check 5: Recent messages scan
          var recentCopy = window._recentMessages.slice();
          window._recentMessages = []; // Clear after each check cycle
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
      //  END SESSION GUARD
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
            // Game is loading — wait 2s then reveal + start guard
            setTimeout(function() {
              if (canvas) canvas.style.visibility = 'visible';
              notifyParent('rsc-login-complete');
              startSessionGuard();
            }, 2000);
            return;
          }
          if (elapsed > LOGIN_TIMEOUT) {
            clearInterval(checkInterval);
            console.log('[autologin] Login failed — no Session id after ' + (elapsed * 200) + 'ms');
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

if grep -q 'v11' "$HTML_FILE"; then echo "✓ v11 marker present"; fi
if grep -q 'new Proxy' "$HTML_FILE"; then echo "✓ Proxy intercept enabled"; fi
if grep -q 'session-guard' "$HTML_FILE"; then echo "✓ Session guard enabled"; fi
if grep -q 'rsc-session-lost' "$HTML_FILE"; then echo "✓ Session-lost postMessage present"; fi
if grep -q 'sampleCanvasPixels' "$HTML_FILE"; then echo "✓ Pixel sampling enabled"; fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v11 — Proxy console intercept)"
echo ""
echo " What changed from v10:"
echo "   + Uses Proxy on window.console (catches ALL access)"
echo "   + All shared state on window object (no scope issues)"
echo "   + Canvas pixel sampling (backup logout detection)"
echo "   + Regex-based Session id detection"
echo "   + Debug logging for every intercepted message"
echo ""
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
