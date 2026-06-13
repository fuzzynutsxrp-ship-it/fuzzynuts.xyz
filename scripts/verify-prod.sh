#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  verify-prod.sh — FuzzyNuts Arcade Production Readiness Checks
# ═══════════════════════════════════════════════════════════════
#
#  Usage: bash scripts/verify-prod.sh
#
#  Runs curl checks against the live production environment
#  and reports PASS/FAIL for each gate.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

PASS=0
FAIL=0
WARN=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "  ${GREEN}✓ PASS${NC} — $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗ FAIL${NC} — $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${YELLOW}⚠ WARN${NC} — $1"; WARN=$((WARN + 1)); }

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  FuzzyNuts Arcade — Production Readiness Report"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── 1. Vercel Root ──────────────────────────────────────────
echo "[1/5] Vercel Root (https://www.fuzzynuts.xyz/)"

ROOT_STATUS=$(curl -s --connect-timeout 5 --max-time 10 -o /dev/null -w "%{http_code}" "https://www.fuzzynuts.xyz/" 2>/dev/null || echo "000")
if [[ "$ROOT_STATUS" == "200" ]]; then
  pass "HTTP $ROOT_STATUS"
else
  fail "HTTP $ROOT_STATUS (expected 200)"
fi

ROOT_BODY=$(curl -s --connect-timeout 5 --max-time 10 "https://www.fuzzynuts.xyz/" 2>/dev/null || echo "")
if echo "$ROOT_BODY" | grep -q 'meta name="description"'; then
  pass "Contains description meta tag"
else
  fail "Missing description meta tag"
fi

echo ""

# ── 2. Vercel Edge SEO — Kaetram ────────────────────────────
echo "[2/5] Vercel Edge SEO (https://www.fuzzynuts.xyz/game/kaetram)"

GAME_STATUS=$(curl -sL --connect-timeout 5 --max-time 10 -o /dev/null -w "%{http_code}" "https://www.fuzzynuts.xyz/game/kaetram" 2>/dev/null || echo "000")
if [[ "$GAME_STATUS" == "200" ]]; then
  pass "HTTP $GAME_STATUS"
else
  fail "HTTP $GAME_STATUS (expected 200)"
fi

GAME_BODY=$(curl -sL --connect-timeout 5 --max-time 10 "https://www.fuzzynuts.xyz/game/kaetram" 2>/dev/null || echo "")

if echo "$GAME_BODY" | grep -q 'og:title.*Kaetram'; then
  pass "OG title contains 'Kaetram' (edge middleware active)"
elif echo "$GAME_BODY" | grep -q 'og:title'; then
  warn "OG title present but not game-specific (middleware may not be deployed)"
else
  fail "OG title missing entirely"
fi

if echo "$GAME_BODY" | grep -q 'og:image.*game-kaetram'; then
  pass "OG image references kaetram thumbnail"
else
  fail "OG image missing kaetram thumbnail"
fi

if echo "$GAME_BODY" | grep -q 'twitter:card'; then
  pass "Twitter Card meta tag present"
else
  warn "Twitter Card meta tag missing"
fi

echo ""

# ── 3. Railway CSP — world.fuzzynuts.xyz ────────────────────
echo "[3/5] Railway CSP (https://world.fuzzynuts.xyz/)"

RAILWAY_CSP=$(curl -sI "https://world.fuzzynuts.xyz/" 2>/dev/null | grep -i "content-security-policy" || echo "")

RAILWAY_STATUS=$(curl -s --connect-timeout 5 --max-time 10 -o /dev/null -w "%{http_code}" "https://world.fuzzynuts.xyz/" 2>/dev/null || echo "000")
if [[ "$RAILWAY_STATUS" == "502" || "$RAILWAY_STATUS" == "503" ]]; then
  warn "Railway service returned HTTP $RAILWAY_STATUS (service down)"
elif echo "$RAILWAY_CSP" | grep -q "frame-ancestors"; then
  pass "frame-ancestors header present"

  if echo "$RAILWAY_CSP" | grep -q "www.fuzzynuts.xyz"; then
    pass "Allows www.fuzzynuts.xyz"
  else
    fail "Missing www.fuzzynuts.xyz in frame-ancestors"
  fi
else
  fail "No Content-Security-Policy header found (HTTP $RAILWAY_STATUS)"
fi

echo ""

# ── 4. VPS CSP — game.fuzzynuts.xyz ────────────────────────
echo "[4/5] VPS CSP (https://game.fuzzynuts.xyz/)"

VPS_CSP=$(curl -sI "https://game.fuzzynuts.xyz/" 2>/dev/null | grep -i "content-security-policy" || echo "")

if echo "$VPS_CSP" | grep -q "frame-ancestors"; then
  pass "frame-ancestors header present"

  if echo "$VPS_CSP" | grep -q "www.fuzzynuts.xyz"; then
    pass "Allows www.fuzzynuts.xyz"
  else
    fail "Missing www.fuzzynuts.xyz in frame-ancestors"
  fi

  if echo "$VPS_CSP" | grep -q "localhost:3000"; then
    pass "Allows localhost:3000 (dev)"
  else
    warn "Missing localhost:3000 in frame-ancestors"
  fi
else
  fail "No Content-Security-Policy header found"
fi

echo ""

# ── 5. Xaman Payload Endpoint ──────────────────────────────
echo "[5/5] Xaman Payload Endpoint (POST /api/auth/xaman/payload)"

XAMAN_STATUS=$(curl -sL --connect-timeout 5 --max-time 10 -o /dev/null -w "%{http_code}" -X POST "https://www.fuzzynuts.xyz/api/auth/xaman/payload" 2>/dev/null || echo "000")

if [[ "$XAMAN_STATUS" == "200" ]]; then
  pass "HTTP $XAMAN_STATUS (route exists, payload created)"

  XAMAN_BODY=$(curl -sL --connect-timeout 5 --max-time 10 -X POST "https://www.fuzzynuts.xyz/api/auth/xaman/payload" 2>/dev/null || echo "{}")
  if echo "$XAMAN_BODY" | grep -q '"uuid"'; then
    pass "Response contains uuid field"
  else
    warn "Response missing uuid (may need XAMAN_API_KEY on Railway)"
  fi
elif [[ "$XAMAN_STATUS" == "401" || "$XAMAN_STATUS" == "403" ]]; then
  pass "HTTP $XAMAN_STATUS (route exists, auth required)"
elif [[ "$XAMAN_STATUS" == "503" ]]; then
  warn "HTTP $XAMAN_STATUS (route loaded but XAMAN_API_KEY missing)"
else
  fail "HTTP $XAMAN_STATUS (expected 200/401/403/503)"
fi

echo ""

# ── Summary ─────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${WARN} warnings${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Production readiness: BLOCKED${NC}"
  exit 1
else
  echo -e "${GREEN}Production readiness: PASSED${NC}"
  exit 0
fi
