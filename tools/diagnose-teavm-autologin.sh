#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  diagnose-teavm-autologin.sh — Diagnose auto-login issues
#
#  Checks:
#   1. Current patched index.html
#   2. Whether keyCode is set on KeyboardEvents
#   3. Canvas click coordinates
#   4. classes.js patch status
#
#  Run on VPS:
#    bash /tmp/diagnose-teavm-autologin.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

HTML_FILE="/var/www/rsc-client/index.html"
JS_FILE="/var/www/rsc-client/teavm/classes.js"
OUT="/tmp/teavm-diagnosis.txt"

echo "═══════════════════════════════════════════════════════"
echo " TeaVM Auto-Login Diagnosis"
echo "═══════════════════════════════════════════════════════"
echo ""

{
  echo "=== 1. PATCH STATUS ==="
  if grep -q 'fuzzynuts-autologin' "$HTML_FILE" 2>/dev/null; then
    echo "✓ Auto-login patch applied"
  else
    echo "✗ No auto-login patch found"
  fi

  echo ""
  echo "=== 2. KEYBOARD EVENT PROPERTIES ==="
  if grep -q 'keyCode' "$HTML_FILE" 2>/dev/null; then
    echo "✓ keyCode is set on events"
  else
    echo "✗ MISSING: keyCode not set — TeaVM will see keyCode=0"
  fi
  if grep -q 'which' "$HTML_FILE" 2>/dev/null; then
    echo "✓ which is set on events"
  else
    echo "✗ MISSING: which not set"
  fi
  if grep -q 'charCode' "$HTML_FILE" 2>/dev/null; then
    echo "✓ charCode is set on events"
  else
    echo "✗ MISSING: charCode not set"
  fi

  echo ""
  echo "=== 3. CLICK COORDINATES ==="
  grep -n 'h \* 0\.' "$HTML_FILE" 2>/dev/null || echo "No hardcoded click ratios found"
  grep -n 'sendClick' "$HTML_FILE" 2>/dev/null || echo "No sendClick calls found"

  echo ""
  echo "=== 4. CLASSES.JS PATCH STATUS ==="
  SEND_TOSEND=$(grep -c 'send("toSend")' "$JS_FILE" 2>/dev/null || echo "0")
  SEND_E=$(grep -c '\.send(e)' "$JS_FILE" 2>/dev/null || echo "0")
  DATA_SET=$(grep -c '\.data\.set(' "$JS_FILE" 2>/dev/null || echo "0")
  echo "  send(\"toSend\"): $SEND_TOSEND occurrences (should be 0)"
  echo "  send(e): $SEND_E occurrences (should be ≥1)"
  echo "  data.set(: $DATA_SET occurrences (should be ≥2)"

  echo ""
  echo "=== 5. CONSOLE LOGGING ==="
  if grep -q 'console\.log' "$HTML_FILE" 2>/dev/null; then
    echo "✓ Console logging present"
  else
    echo "✗ No console.log statements — cannot debug"
  fi

  echo ""
  echo "=== 6. TIMING ANALYSIS ==="
  echo "  Canvas poll interval: 200ms"
  echo "  Click center: pollCount=30 (6 seconds after canvas)"
  echo "  Click Existing User: pollCount=40 (8 seconds after canvas)"
  echo "  Type username: pollCount=50 (10 seconds after canvas)"
  echo "  Press Enter: pollCount=70 (14 seconds after canvas)"
  echo "  Total time: ~14 seconds from canvas appearance"

} | tee "$OUT"

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Diagnosis saved to: $OUT"
echo "═══════════════════════════════════════════════════════"
