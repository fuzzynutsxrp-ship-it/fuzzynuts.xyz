#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# FUZZYNUTS GAMES — Verify Main Project Build
#
# Quick check that the main project builds successfully.
# Run this after any sync to confirm nothing broke.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
MAIN_PROJECT="$(dirname "$DEV_ROOT")/fuzzynuts-optimized"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔨 Running Next.js build verification...${NC}"
echo ""

cd "$MAIN_PROJECT"

if npm run build 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Build passed — all clear!${NC}"

    # Quick asset verification
    echo ""
    echo -e "${CYAN}📋 Asset check:${NC}"
    for game in mario fuzzy-survivors minigolf nut-racer fuzzynuts-world; do
        if [ -f "public/games/$game/index.html" ]; then
            echo -e "  ${GREEN}✓${NC} $game/index.html"
        else
            echo -e "  ${RED}✗${NC} $game/index.html MISSING!"
        fi
    done

    if [ -f "public/games/fuzzy-score.js" ]; then
        echo -e "  ${GREEN}✓${NC} fuzzy-score.js"
    else
        echo -e "  ${RED}✗${NC} fuzzy-score.js MISSING!"
    fi
else
    echo ""
    echo -e "${RED}❌ Build FAILED!${NC}"
    echo "   Check the error output above and fix before deploying."
    exit 1
fi
