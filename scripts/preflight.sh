#!/usr/bin/env bash
#
# preflight.sh — run this BEFORE starting any work.
#
# Why this exists: sessions were wasted working in clones that were silently
# behind origin/main, then "committing" work that never reached the canonical
# repo. This script makes clone drift impossible to miss.
#
#   pnpm preflight
#
set -euo pipefail

RED=$'\033[0;31m'; YEL=$'\033[0;33m'; GRN=$'\033[0;32m'; CYA=$'\033[0;36m'; NC=$'\033[0m'

echo "${CYA}── FuzzyNuts preflight ─────────────────────────────${NC}"

# 1. Fetch the truth from origin (prune deleted remote branches).
echo "Fetching origin..."
git fetch --all --prune --quiet

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Current branch: ${CYA}${BRANCH}${NC}"

# 2. How far is this clone behind origin/main?
BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"

if [ "$BEHIND" -gt 0 ]; then
  echo "${RED}✗ This clone is ${BEHIND} commit(s) BEHIND origin/main.${NC}"
  echo "${RED}  You are about to work on a stale tree. Sync first:${NC}"
  if [ "$BRANCH" = "main" ]; then
    echo "      git merge --ff-only origin/main"
  else
    echo "      git checkout main && git merge --ff-only origin/main && git checkout - && git rebase main"
  fi
  exit 1
fi
echo "${GRN}✓ Up to date with origin/main${NC} (ahead ${AHEAD}, behind ${BEHIND})."

# 3. On main? Warn — work belongs on a feature branch (HERMES.md §2).
if [ "$BRANCH" = "main" ]; then
  echo "${YEL}! You are on main. Create a feature branch before editing:${NC}"
  echo "      git checkout -b <feat|fix|chore>/<scope>-<short>"
fi

# 4. Working-tree status.
if [ -n "$(git status --porcelain)" ]; then
  echo "${YEL}! Working tree is dirty:${NC}"
  git status --short
else
  echo "${GRN}✓ Working tree clean.${NC}"
fi

# 5. Score-cap drift guard (the recurring money-adjacent bug).
if [ -f scripts/check-score-caps-drift.js ]; then
  echo "${CYA}Checking SCORE_CAPS drift...${NC}"
  node scripts/check-score-caps-drift.js || echo "${YEL}! SCORE_CAPS drift detected — see docs/STATE.md P0-2.${NC}"
fi

# 6. Show the source of truth header so you start from current state.
echo "${CYA}── docs/STATE.md (top) ─────────────────────────────${NC}"
sed -n '1,6p' docs/STATE.md 2>/dev/null || echo "${YEL}! docs/STATE.md missing.${NC}"
echo "${CYA}────────────────────────────────────────────────────${NC}"
echo "${GRN}Preflight passed. Read docs/STATE.md §2 (launch blockers) before picking work.${NC}"
