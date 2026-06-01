#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# scaffold-new-game.sh — Create a new game from the starter template
#
# Usage:
#   bash scripts/scaffold-new-game.sh <slug> <title>
#   npm run scaffold -- <slug> <title>
#
# Example:
#   bash scripts/scaffold-new-game.sh forest-quest "Forest Quest"
#
# This script:
#   1. Copies templates/game-starter/ → <slug>/
#   2. Replaces placeholder values (GAME_SLUG, GAME_TITLE)
#   3. Copies templates/INTEGRATION_CHECKLIST.md → <slug>/CHECKLIST.md
#   4. Prints next steps
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
TEMPLATE_DIR="$WORKSPACE/templates/game-starter"
CHECKLIST="$WORKSPACE/templates/INTEGRATION_CHECKLIST.md"

# ── Validate arguments ──
if [[ $# -lt 1 ]]; then
  echo "❌ Usage: $0 <slug> [<title>]"
  echo "   Example: $0 forest-quest \"Forest Quest\""
  exit 1
fi

SLUG="$1"
TITLE="${2:-$SLUG}"
DEST="$WORKSPACE/$SLUG"

# ── Validate slug format ──
if [[ ! "$SLUG" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "❌ Slug must be lowercase kebab-case: a-z, 0-9, hyphens only."
  echo "   Got: '$SLUG'"
  exit 1
fi

# ── Check destination doesn't exist ──
if [[ -d "$DEST" ]]; then
  echo "❌ Directory '$DEST' already exists."
  echo "   Delete it first or choose a different slug."
  exit 1
fi

# ── Check template exists ──
if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "❌ Template directory not found: $TEMPLATE_DIR"
  exit 1
fi

echo ""
echo "🐿️  Scaffolding new game..."
echo "   Slug:     $SLUG"
echo "   Title:    $TITLE"
echo "   Target:   $DEST"
echo ""

# ── Copy template ──
cp -r "$TEMPLATE_DIR" "$DEST"

# ── Replace placeholders in index.html ──
if command -v sed &> /dev/null; then
  sed -i "s/NEW_SLUG/$SLUG/g" "$DEST/index.html"
  sed -i "s/NEW_GAME_TITLE/$TITLE/g" "$DEST/index.html"
fi

# ── Copy integration checklist ──
if [[ -f "$CHECKLIST" ]]; then
  cp "$CHECKLIST" "$DEST/CHECKLIST.md"
  echo "✅ Created: $DEST/CHECKLIST.md"
fi

echo "✅ Created: $DEST/index.html"
echo ""
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  📋 Next Steps                                          │"
echo "├──────────────────────────────────────────────────────────┤"
echo "│  1. Edit $SLUG/index.html — replace the placeholder     │"
echo "│     canvas loop with your actual game engine             │"
echo "│                                                          │"
echo "│  2. Test locally:                                        │"
echo "│     npx -y serve $SLUG -p 3006 -s --cors                │"
echo "│                                                          │"
echo "│  3. When ready, follow the integration checklist:        │"
echo "│     cat $SLUG/CHECKLIST.md                               │"
echo "│                                                          │"
echo "│  4. Full guide:                                          │"
echo "│     ../fuzzynuts-optimized/docs/NEW_GAME_INTEGRATION_GUIDE.md │"
echo "└──────────────────────────────────────────────────────────┘"
echo ""
