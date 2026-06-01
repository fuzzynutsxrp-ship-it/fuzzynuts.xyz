#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# FUZZYNUTS GAMES — Safe Sync to Main Project
#
# Usage:  ./scripts/sync-to-main.sh <game-slug>
# Example: ./scripts/sync-to-main.sh mario
#          ./scripts/sync-to-main.sh fuzzy-score   (syncs score bridge)
#
# This script copies the TESTED game files from the dev workspace
# into fuzzynuts-optimized/public/games/<slug>/
#
# It will:
#   1. Verify the source directory exists and has an index.html
#   2. Create a timestamped backup of the current production version
#   3. Copy the new version into place
#   4. Trigger a Next.js build to verify nothing broke
#   5. Report success or rollback on failure
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
MAIN_PROJECT="$(dirname "$DEV_ROOT")/fuzzynuts-optimized"
BACKUP_DIR="$DEV_ROOT/.backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SLUG="${1:-}"

if [ -z "$SLUG" ]; then
    echo -e "${RED}❌ Usage: $0 <game-slug>${NC}"
    echo "   Available: mario, fuzzy-survivors, minigolf, nut-racer, fuzzynuts-world, fuzzy-score"
    exit 1
fi

# Special case: syncing the score bridge (single file)
if [ "$SLUG" = "fuzzy-score" ]; then
    SRC="$DEV_ROOT/shared/fuzzy-score.js"
    DEST="$MAIN_PROJECT/public/games/fuzzy-score.js"

    if [ ! -f "$SRC" ]; then
        echo -e "${RED}❌ Source file not found: $SRC${NC}"
        exit 1
    fi

    echo -e "${CYAN}📦 Syncing fuzzy-score.js → main project...${NC}"

    # Backup current
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp "$DEST" "$BACKUP_DIR/fuzzy-score_${TIMESTAMP}.js" 2>/dev/null || true

    # Copy
    cp "$SRC" "$DEST"
    echo -e "${GREEN}✅ fuzzy-score.js synced successfully!${NC}"
    echo -e "${YELLOW}⚠️  Now verify: cd $MAIN_PROJECT && npm run build${NC}"
    exit 0
fi

# Normal game sync
SRC_DIR="$DEV_ROOT/$SLUG"
DEST_DIR="$MAIN_PROJECT/public/games/$SLUG"

# ── Pre-flight checks ──
if [ ! -d "$SRC_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $SRC_DIR${NC}"
    echo "   Available games: mario, fuzzy-survivors, minigolf, nut-racer, fuzzynuts-world"
    exit 1
fi

if [ ! -f "$SRC_DIR/index.html" ]; then
    echo -e "${RED}❌ No index.html found in $SRC_DIR${NC}"
    echo "   Every game MUST have an index.html entry point."
    exit 1
fi

if [ ! -d "$DEST_DIR" ]; then
    echo -e "${RED}❌ Destination directory not found: $DEST_DIR${NC}"
    echo "   The main project doesn't have a games/$SLUG/ folder."
    exit 1
fi

# ── Show what will change ──
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🐿️  FUZZYNUTS GAME SYNC — $SLUG${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Source:      ${GREEN}$SRC_DIR${NC}"
echo -e "  Destination: ${YELLOW}$DEST_DIR${NC}"
echo ""

# File count comparison
SRC_COUNT=$(find "$SRC_DIR" -type f | wc -l)
DEST_COUNT=$(find "$DEST_DIR" -type f | wc -l)
echo -e "  Source files:      $SRC_COUNT"
echo -e "  Destination files: $DEST_COUNT"
echo ""

# ── Confirmation ──
read -p "  Proceed with sync? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  Sync cancelled.${NC}"
    exit 0
fi

# ── Create backup ──
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/${SLUG}_${TIMESTAMP}"
echo -e "\n${CYAN}📋 Creating backup → ${BACKUP_PATH}${NC}"
cp -r "$DEST_DIR" "$BACKUP_PATH"

# ── Sync files ──
echo -e "${CYAN}📦 Syncing $SLUG → main project...${NC}"
rsync -av --delete \
    --exclude='.DS_Store' \
    --exclude='node_modules' \
    --exclude='.git' \
    "$SRC_DIR/" "$DEST_DIR/"

echo -e "${GREEN}✅ Files synced successfully!${NC}"
echo ""

# ── Post-sync verification ──
echo -e "${CYAN}🔨 Running Next.js build to verify...${NC}"
cd "$MAIN_PROJECT"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build passed — $SLUG is safe to deploy!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Start dev server:  cd $MAIN_PROJECT && npm run dev"
    echo "  2. Test game:         http://localhost:3000/games/$SLUG/"
    echo "  3. Commit & deploy:   git add -A && git commit -m 'feat: update $SLUG game'"
else
    echo -e "${RED}❌ Build FAILED after sync!${NC}"
    echo -e "${YELLOW}🔄 Rolling back to backup...${NC}"

    # Rollback
    rm -rf "$DEST_DIR"
    cp -r "$BACKUP_PATH" "$DEST_DIR"

    echo -e "${GREEN}✅ Rolled back to previous version.${NC}"
    echo -e "${RED}Fix the issue in your dev workspace and try again.${NC}"
    exit 1
fi
