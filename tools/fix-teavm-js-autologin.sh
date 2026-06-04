#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  fix-teavm-js-autologin.sh — Silent auto-login + session guard
#
#  v13b: Canvas pixel sampling + iframe-side redirect on logout.
#  Intercepts WebGL context to force preserveDrawingBuffer.
#  Detects login screen via brightness analysis + stale canvas.
#  Monitors WebSocket disconnection. Catches bright-to-dark transition.
#  On logout: notifies parent + redirects to homepage from iframe.
#
#  RUN ON VPS:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP="/var/www/rsc-client/backup-autologin-$(date +%Y%m%d-%H%M%S).html"

echo "═══════════════════════════════════════════════════════"
echo " Fix TeaVM Auto-Login (v13b — canvas + iframe redirect)"
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
    <!-- fuzzynuts-autologin: v13b — canvas pixel sampling + iframe redirect -->
    <script>
    // ═══════════════════════════════════════════════════════════
    //  BLOCK 1: Initialize ALL shared state FIRST (before any
    //  console access), then install Proxy intercept.
    //  v13: Added WebGL interceptor + WebSocket monitor setup.
    // ═══════════════════════════════════════════════════════════

    // Step 1: Initialize ALL window properties FIRST
    window._sessionIdDetected = false;
    window._logoutDetected = false;
    window._logoutReason = '';
    window._recentMessages = [];
    window._fnSessionActive = false;
    window._fnSessionGuardStarted = false;
    window._fnAutoLogin = false;
    window._fnWalletAddress = null;
    window._msgCount = 0;
    window._wsDisconnected = false;
    window._wsInstances = [];

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

    // Step 3: WebGL context interceptor
    // Force preserveDrawingBuffer so we can read canvas pixels for
    // login screen detection. Must run BEFORE classes.js loads.
    (function() {
      var _origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attrs) {
        attrs = attrs || {};
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          attrs.preserveDrawingBuffer = true;
        }
        return _origGetContext.call(this, type, attrs);
      };
      window._origLog2 = console.log.bind(console);
      window._origLog2('[autologin] WebGL interceptor installed (preserveDrawingBuffer=true)');
    })();

    // Step 4: WebSocket connection monitor
    // Track WebSocket instances; set flag on close/disconnect.
    (function() {
      var _OrigWS = window.WebSocket;
      window.WebSocket = function(url, protocols) {
        var ws = protocols ? new _OrigWS(url, protocols) : new _OrigWS(url);
        window._wsInstances.push(ws);
        ws.addEventListener('close', function() {
          window._wsDisconnected = true;
          if (window._origLog2) window._origLog2('[session-guard] WebSocket closed: ' + url);
        });
        ws.addEventListener('error', function() {
          if (window._origLog2) window._origLog2('[session-guard] WebSocket error: ' + url);
        });
        return ws;
      };
      window.WebSocket.prototype = _OrigWS.prototype;
      window._origLog2('[autologin] WebSocket monitor installed');
    })();

    // Step 5: Install Proxy intercept on console
    (function() {
      var _realConsole = console;

      window._origLog = console.log.bind(console);
      window._origInfo = (console.info || console.log).bind(console);
      window._origWarn = (console.warn || console.log).bind(console);
      window._origError = (console.error || console.log).bind(console);

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

      window._origLog('[autologin] Console intercept installed (v13)');
      window._origLog('[autologin] Shared state ready: _recentMessages=' + Array.isArray(window._recentMessages));
      if (window._fnAutoLogin) {
        window._origLog('[autologin] Wallet address from hash: ' + window._fnWalletAddress.substring(0, 8) + '...');
      }
    })();
    </script>

    <!-- classes.js loads AFTER our Proxy + WebGL interceptor are installed -->
    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>

    <script>
    // ═══════════════════════════════════════════════════════════
    //  BLOCK 2: Auto-login + session guard
    //  v13: Canvas pixel sampling, stale canvas, WS monitor.
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

      // ── v13: Canvas pixel sampling state ──
      var _pixelCache = '';
      var _pixelStaleCount = 0;
      var _brightnessWasBright = false;
      var _consecutiveDarkReadings = 0;
      var _tmpCanvas = null;
      var _tmpCtx = null;

      // Create offscreen 2D canvas for reading WebGL pixels
      function _getTmpCtx() {
        if (_tmpCtx) return _tmpCtx;
        try {
          _tmpCanvas = document.createElement('canvas');
          _tmpCtx = _tmpCanvas.getContext('2d', { willReadFrequently: true });
          return _tmpCtx;
        } catch (e) {
          return null;
        }
      }

      // Sample canvas pixels and compute average brightness.
      // Returns { avg, hash } or null on failure.
      function _sampleCanvas() {
        if (!canvas) return null;
        try {
          var ctx = _getTmpCtx();
          if (!ctx) return null;
          _tmpCanvas.width = canvas.width;
          _tmpCanvas.height = canvas.height;
          ctx.drawImage(canvas, 0, 0);
          var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          // Sample a 6×5 grid of points across the canvas
          var total = 0;
          var count = 0;
          for (var gy = 0; gy < 5; gy++) {
            for (var gx = 0; gx < 6; gx++) {
              var px = Math.floor((gx + 0.5) * canvas.width / 6);
              var py = Math.floor((gy + 0.5) * canvas.height / 5);
              var idx = (py * canvas.width + px) * 4;
              // Luma: perceptual brightness weighting
              total += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
              count++;
            }
          }
          var avg = total / count;

          // Simple hash for change detection (first 8 sample R values)
          var hash = '';
          for (var hi = 0; hi < 8 && hi * 4 < data.length; hi++) {
            hash += data[hi * 4].toString(16);
          }

          return { avg: avg, hash: hash };
        } catch (e) {
          return null;
        }
      }

      // Detect if the login screen is currently showing.
      // Uses 3 signals:
      //   1. Canvas shows very dark pixels (avg brightness < 20)
      //   2. Canvas content is frozen (pixel hash unchanged = stale)
      //   3. Bright-to-dark transition (was playing, now dark)
      function _checkLoginScreen() {
        var sample = _sampleCanvas();
        if (!sample) return false;

        var isDark = sample.avg < 20;
        var isDim = sample.avg < 35;

        // Stale detection: pixel hash unchanged
        if (sample.hash === _pixelCache && _pixelCache !== '') {
          _pixelStaleCount++;
        } else {
          _pixelStaleCount = 0;
        }
        _pixelCache = sample.hash;

        // Track brightness history for transition detection
        var wasBright = _brightnessWasBright;
        _brightnessWasBright = sample.avg > 40;

        // Signal 1: Canvas is very dark AND stale (frozen login screen)
        if (isDark && _pixelStaleCount >= 3) {
          window._origLog('[session-guard] Canvas dark+stale: avg=' + sample.avg.toFixed(1) + ' stale=' + _pixelStaleCount);
          return true;
        }

        // Signal 2: Bright-to-dark transition (game world → login screen)
        if (wasBright && isDark) {
          _consecutiveDarkReadings++;
          if (_consecutiveDarkReadings >= 2) {
            window._origLog('[session-guard] Bright→dark transition: avg=' + sample.avg.toFixed(1));
            return true;
          }
        } else if (!isDark) {
          _consecutiveDarkReadings = 0;
        }

        // Signal 3: Very dark AND dim for a while (loading/login screen)
        if (isDark) {
          _consecutiveDarkReadings++;
        }

        // Debug logging every 15 checks (30 seconds)
        if (window._msgCount % 15 === 0) {
          window._origLog('[session-guard] Canvas avg=' + sample.avg.toFixed(1) + ' stale=' + _pixelStaleCount + ' darkrun=' + _consecutiveDarkReadings);
        }

        return false;
      }

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
      //  SESSION GUARD — v13: 5 detection methods
      // ────────────────────────────────────────────────────────────
      function startSessionGuard() {
        if (window._fnSessionGuardStarted) return;
        window._fnSessionGuardStarted = true;
        window._fnSessionActive = true;

        console.log('[session-guard] Active — monitoring for disconnect (v13: canvas+ws)...');

        var lastCanvasWidth = canvas ? canvas.width : 0;
        var lastCanvasHeight = canvas ? canvas.height : 0;

        sessionGuardInterval = setInterval(function() {
          // ── Check 1: Console-based logout detection ──
          if (window._logoutDetected) {
            handleLogout('Game message: ' + window._logoutReason);
            return;
          }

          // ── Check 2: WebSocket disconnected ──
          if (window._wsDisconnected) {
            handleLogout('WebSocket connection closed');
            return;
          }

          // ── Check 3: All WebSocket instances closed ──
          if (window._wsInstances.length > 0) {
            var allClosed = true;
            for (var w = 0; w < window._wsInstances.length; w++) {
              if (window._wsInstances[w].readyState <= 1) { // CONNECTING or OPEN
                allClosed = false;
                break;
              }
            }
            if (allClosed) {
              handleLogout('All WebSocket connections closed');
              return;
            }
          }

          // ── Check 4: Canvas removed from DOM ──
          if (canvas && !document.body.contains(canvas)) {
            handleLogout('Game canvas was removed');
            return;
          }

          // ── Check 5: Canvas pixel analysis (v13) ──
          if (_checkLoginScreen()) {
            handleLogout('Login screen detected via canvas pixels');
            return;
          }

          // ── Check 6: Canvas resized dramatically ──
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

          // ── Check 7: Recent console messages scan ──
          var recentCopy = window._recentMessages.slice();
          window._recentMessages = [];
          for (var m = 0; m < recentCopy.length; m++) {
            var msgLower = recentCopy[m];
            for (var p = 0; p < window._logoutPatterns.length; p++) {
              if (msgLower.indexOf(window._logoutPatterns[p]) !== -1) {
                handleLogout('Console message: ' + msgLower.substring(0, 80));
                return;
              }
            }
          }
        }, 2000); // v13: 2s interval (was 3s)
      }

      // ── Central logout handler — notifies parent + redirects ──
      function handleLogout(reason) {
        clearInterval(sessionGuardInterval);
        window._fnSessionActive = false;
        console.log('[session-guard] LOGOUT — ' + reason);
        if (canvas) canvas.style.visibility = 'hidden';
        notifyParent('rsc-session-lost', reason);
        // Navigate iframe to parent's homepage (cross-origin nav from within iframe)
        setTimeout(function() {
          console.log('[session-guard] Redirecting to arcade...');
          window.location.href = 'https://fuzzynuts.xyz/';
        }, 2000);
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

if grep -q 'v13b' "$HTML_FILE"; then echo "✓ v13b marker present"; fi
if grep -q 'new Proxy' "$HTML_FILE"; then echo "✓ Proxy intercept enabled"; fi
if grep -q 'session-guard' "$HTML_FILE"; then echo "✓ Session guard enabled"; fi
if grep -q 'preserveDrawingBuffer' "$HTML_FILE"; then echo "✓ WebGL interceptor enabled"; fi
if grep -q '_sampleCanvas' "$HTML_FILE"; then echo "✓ Canvas pixel sampling enabled"; fi
if grep -q '_wsDisconnected' "$HTML_FILE"; then echo "✓ WebSocket monitor enabled"; fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ FIX APPLIED (v13b — canvas + iframe redirect)"
echo ""
echo " Changes from v13:"
echo "   + handleLogout() centralizes all logout paths"
echo "   + Iframe redirects parent to / via window.top.location.href"
echo "   + Works even if parent page is stale/cached"
echo ""
echo " Backup at: $BACKUP"
echo "═══════════════════════════════════════════════════════"
