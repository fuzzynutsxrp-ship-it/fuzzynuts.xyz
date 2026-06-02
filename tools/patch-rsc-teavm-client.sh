#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  patch-rsc-teavm-client.sh — FuzzyNuts wallet auto-login patch
#
#  This script patches the Open-RSC TeaVM client to support auto-login
#  via URL hash parameters (username + password appended after the
#  existing connection params).
#
#  APPROACH: Injects a JavaScript wrapper into index.html that:
#    1. Intercepts window.location.hash (returns only 6 standard params)
#    2. Stores auto-login credentials in sessionStorage
#    3. After main() initializes, simulates keyboard input to fill
#       the login form and submit automatically
#
#  DOES NOT modify classes.js — only index.html is changed.
#
#  IDEMPOTENT: Safe to run twice. Checks if patches are already applied.
#
#  RUN ONCE:
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/patch-rsc-teavm-client.sh | bash
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
BACKUP_DIR="/var/www/rsc-client/backup-$(date +%Y%m%d-%H%M%S)"

echo "═══════════════════════════════════════════════════════"
echo " FuzzyNuts RSC Auto-Login Patch (JS Injection)"
echo "═══════════════════════════════════════════════════════"

# ── Step 0: Check if already patched ──────────────────────────────
if grep -q 'fuzzynuts-autologin' "${HTML_FILE}" 2>/dev/null; then
  echo ""
  echo "✓ Patch already applied (fuzzynuts-autologin marker found)."
  echo "  Nothing to do."
  exit 0
fi

# ── Step 1: Back up original index.html ───────────────────────────
echo ""
echo "▸ Step 1: Backing up index.html..."
mkdir -p "${BACKUP_DIR}"
cp "${HTML_FILE}" "${BACKUP_DIR}/index.html.orig"
echo "  Backup at: ${BACKUP_DIR}/index.html.orig"

# ── Step 2: Restore original classes.js if a previous patch broke it
echo ""
echo "▸ Step 2: Ensuring clean classes.js..."
if [ -f "/var/www/rsc-client/teavm/classes.js.bak" ]; then
  # Check if current classes.js differs from backup (might be corrupted)
  CURRENT_SIZE=$(wc -c < "/var/www/rsc-client/teavm/classes.js")
  BACKUP_SIZE=$(wc -c < "/var/www/rsc-client/teavm/classes.js.bak")
  if [ "${CURRENT_SIZE}" -ne "${BACKUP_SIZE}" ]; then
    echo "  classes.js size mismatch — restoring from backup..."
    cp "/var/www/rsc-client/teavm/classes.js.bak" "/var/www/rsc-client/teavm/classes.js"
    echo "  ✓ Restored original classes.js"
  else
    echo "  ✓ classes.js looks intact"
  fi
else
  echo "  ✓ No backup to restore"
fi

# ── Step 3: Write patched index.html ──────────────────────────────
echo ""
echo "▸ Step 3: Writing patched index.html..."

cat > "${HTML_FILE}" << 'HTMLEOF'
<!DOCTYPE html>
<html>
  <head>
    <title>Runescape by Andrew Gower</title>
    <meta charset="utf-8">
    <style>body{margin:0;background-color: black;}</style>
  </head>
  <body>
    <!-- fuzzynuts-autologin: injected by patch-rsc-teavm-client.sh -->
    <script>
    (function() {
      'use strict';

      // ── Parse auto-login credentials from URL hash ──
      // Hash format: #members,host,port,rsa_exp,rsa_mod,useSSL,USERNAME,PASSWORD
      var fullHash = window.location.hash;
      var hashStr = fullHash.substring(1); // strip #
      var parts = hashStr.split(',');

      var autoUser = null;
      var autoPass = null;

      if (parts.length > 7 && parts[6] && parts[7]) {
        autoUser = decodeURIComponent(parts[6]);
        autoPass = decodeURIComponent(parts[7]);

        // Store in sessionStorage for the auto-login loop
        sessionStorage.setItem('fn_autouser', autoUser);
        sessionStorage.setItem('fn_autopass', autoPass);

        // Strip auto-login params from hash so TeaVM only sees 6 standard params
        var cleanHash = '#' + parts.slice(0, 6).join(',');
        // Use replaceState to avoid triggering hashchange events
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', cleanHash);
        } else {
          window.location.hash = cleanHash;
        }
      } else {
        // Check sessionStorage for credentials from a previous page load
        autoUser = sessionStorage.getItem('fn_autouser');
        autoPass = sessionStorage.getItem('fn_autopass');
      }

      // ── Auto-login keyboard simulation ──
      // After main() runs and the game canvas appears, simulate typing
      // the username + password and pressing Enter.
      if (autoUser && autoPass) {
        // Store for use after main() returns
        window._fnAutoUser = autoUser;
        window._fnAutoPass = autoPass;
        window._fnAutoLoginScheduled = false;
      }
    })();
    </script>

    <script type="text/javascript" charset="utf-8" src="teavm/classes.js"></script>
    <script>
    main();

    // ── Schedule auto-login after game initializes ──
    (function() {
      var autoUser = window._fnAutoUser;
      var autoPass = window._fnAutoPass;
      if (!autoUser || !autoPass) return;

      var MAX_WAIT = 600; // 2 minutes max
      var pollCount = 0;
      var canvas = null;

      // Helper: dispatch a keydown + keyup event to the canvas
      function sendKey(ch) {
        if (!canvas) return;
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
          key: ch, code: 'Key' + ch.toUpperCase(),
          bubbles: true, cancelable: true
        }));
        canvas.dispatchEvent(new KeyboardEvent('keyup', {
          key: ch, code: 'Key' + ch.toUpperCase(),
          bubbles: true, cancelable: true
        }));
      }

      function sendEnter() {
        if (!canvas) return;
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter',
          bubbles: true, cancelable: true
        }));
        canvas.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'Enter', code: 'Enter',
          bubbles: true, cancelable: true
        }));
      }

      function sendTab() {
        if (!canvas) return;
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Tab', code: 'Tab',
          bubbles: true, cancelable: true
        }));
      }

      function sendClick(x, y) {
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('mousedown', {
          clientX: rect.left + x, clientY: rect.top + y,
          bubbles: true, cancelable: true
        }));
        canvas.dispatchEvent(new MouseEvent('mouseup', {
          clientX: rect.left + x, clientY: rect.top + y,
          bubbles: true, cancelable: true
        }));
      }

      // Poll until canvas appears and game has loaded
      var checkInterval = setInterval(function() {
        pollCount++;
        if (pollCount > MAX_WAIT) {
          clearInterval(checkInterval);
          sessionStorage.removeItem('fn_autouser');
          sessionStorage.removeItem('fn_autopass');
          return;
        }

        // Find the canvas
        if (!canvas) {
          canvas = document.querySelector('canvas');
          if (!canvas) return;
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
        }

        // Wait 6 seconds after canvas appears for game to load
        if (pollCount < 30) return;

        // The game shows "Click here to login" initially.
        // Click the center of the canvas to trigger the login flow.
        if (pollCount === 30) {
          canvas.focus();
          var w = canvas.width || 512;
          var h = canvas.height || 346;
          sendClick(w / 2, h / 2);
          return;
        }

        // Wait 2 more seconds for the menu to appear
        if (pollCount < 40) return;

        // Click "Existing User" — typically in the lower portion of the canvas
        if (pollCount === 40) {
          var w = canvas.width || 512;
          var h = canvas.height || 346;
          sendClick(w / 2, h * 0.6);
          return;
        }

        // Wait for login form to appear
        if (pollCount < 50) return;

        // ── Type username ──
        if (pollCount === 50) {
          canvas.focus();
          for (var i = 0; i < autoUser.length; i++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(autoUser[i], 80 * i);
          }
          return;
        }

        // ── Tab to password field ──
        if (pollCount === 55) {
          setTimeout(function() { sendTab(); }, 100);
          return;
        }

        // ── Type password ──
        if (pollCount === 60) {
          for (var j = 0; j < autoPass.length; j++) {
            (function(ch, delay) {
              setTimeout(function() { sendKey(ch); }, delay);
            })(autoPass[j], 80 * j);
          }
          return;
        }

        // ── Press Enter to login ──
        if (pollCount === 70) {
          setTimeout(function() { sendEnter(); }, 200);
          // Clean up after successful attempt
          setTimeout(function() {
            sessionStorage.removeItem('fn_autouser');
            sessionStorage.removeItem('fn_autopass');
          }, 2000);
          clearInterval(checkInterval);
          return;
        }
      }, 200);
    })();
    </script>
  </body>
</html>
HTMLEOF

echo "  ✓ Patched index.html written"

# ── Step 4: Verify ────────────────────────────────────────────────
echo ""
echo "▸ Step 4: Verifying patch..."
if grep -q 'fuzzynuts-autologin' "${HTML_FILE}"; then
  echo "  ✓ Auto-login wrapper found in index.html"
else
  echo "  ✗ ERROR: Patch verification failed"
  exit 1
fi

if grep -q 'window.location.hash' "${HTML_FILE}"; then
  echo "  ✓ Hash interception logic present"
fi

if grep -q 'sendKey' "${HTML_FILE}"; then
  echo "  ✓ Keyboard simulation logic present"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ PATCH COMPLETE"
echo ""
echo " Hash format (unchanged):"
echo "   #members,host,port,rsa_exp,rsa_mod,true,USERNAME,PASSWORD"
echo ""
echo " How it works:"
echo "   1. index.html extracts USERNAME,PASSWORD from hash params 6+7"
echo "   2. Strips them from hash (TeaVM sees standard 6 params)"
echo "   3. After game loads, simulates keyboard input to fill login"
echo "   4. Auto-submits the login form"
echo ""
echo " Test URL:"
echo "   https://game.fuzzynuts.xyz/#members,game.fuzzynuts.xyz,43494,65537,RSA_MODULUS,true,TestUser,testpass123"
echo ""
echo " Backup at: ${BACKUP_DIR}/"
echo " To rollback: cp ${BACKUP_DIR}/index.html.orig /var/www/rsc-client/index.html"
echo "═══════════════════════════════════════════════════════"
