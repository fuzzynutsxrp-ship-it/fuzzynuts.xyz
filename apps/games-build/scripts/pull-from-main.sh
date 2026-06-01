#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# FUZZYNUTS GAMES — Pull Latest from Main Project
#
# Usage:  ./scripts/pull-from-main.sh <game-slug>
# Example: ./scripts/pull-from-main.sh mario
#
# Copies the current production version of a game from
# fuzzynuts-optimized/public/games/<slug>/ into the dev workspace.
# Use this to start a new development cycle from a known-good baseline.
#
# WARNING: This OVERWRITES your local dev copy!
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
MAIN_PROJECT="$(dirname "$DEV_ROOT")/fuzzynuts-optimized"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SLUG="${1:-}"

if [ -z "$SLUG" ]; then
    echo -e "${RED}❌ Usage: $0 <game-slug>${NC}"
    echo "   Available: mario, fuzzy-survivors, minigolf, nut-racer, fuzzynuts-world"
    exit 1
fi

SRC_DIR="$MAIN_PROJECT/public/games/$SLUG"
DEST_DIR="$DEV_ROOT/$SLUG"

if [ ! -d "$SRC_DIR" ]; then
    echo -e "${RED}❌ Source not found: $SRC_DIR${NC}"
    exit 1
fi

echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔄 PULL FROM MAIN — $SLUG${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Source:      ${GREEN}$SRC_DIR${NC}"
echo -e "  Destination: ${YELLOW}$DEST_DIR${NC}"
echo ""
echo -e "${YELLOW}⚠️  This will OVERWRITE your local dev copy of $SLUG!${NC}"
echo ""

read -p "  Proceed? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  Pull cancelled.${NC}"
    exit 0
fi

# Clear and copy
rm -rf "$DEST_DIR"
mkdir -p "$DEST_DIR"
cp -r "$SRC_DIR"/* "$DEST_DIR/"

FILE_COUNT=$(find "$DEST_DIR" -type f | wc -l)
SIZE=$(du -sh "$DEST_DIR" | cut -f1)

echo -e "${GREEN}✅ Pulled $FILE_COUNT files ($SIZE) from main project.${NC}"
echo ""
echo -e "${CYAN}Start developing:${NC}"
echo "  npm run dev:${SLUG/fuzzy-/}" 
echo "  → http://localhost:300X"
