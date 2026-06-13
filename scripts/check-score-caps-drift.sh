#!/usr/bin/env bash
# Verifies that SCORE_CAPS in fuzzy-score.js and score-caps.ts stay in sync.
# Exit 0 = all match, exit 1 = drift detected.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

# Extract caps from score-caps.ts — handles both quoted and unquoted keys, strips TS numeric underscores
TS_CAPS=$(grep -oP '["\x27]?[a-z0-9-]+["\x27]?:\s*[\d_]+' "$REPO_ROOT/packages/arcade-core/src/constants/score-caps.ts" \
  | sed 's/_//g; s/"//g; s/\x27//g' | sort)

# Extract caps from fuzzy-score.js
JS_CAPS=$(grep -oP "'[a-z0-9-]+':\s*\d+" "$REPO_ROOT/apps/web-arcade/public/games/fuzzy-score.js" \
  | sed "s/'//g" | sort)

# Compare (ignoring legacy aliases)
TS_NORMALIZED=$(echo "$TS_CAPS" | grep -v '^survivors:\|^racer:\|^nutracer:')
JS_NORMALIZED=$(echo "$JS_CAPS" | grep -v '^survivors:\|^racer:\|^nutracer:')

if [ "$TS_NORMALIZED" != "$JS_NORMALIZED" ]; then
  echo "❌ SCORE_CAPS drift between score-caps.ts and fuzzy-score.js"
  diff <(echo "$TS_NORMALIZED") <(echo "$JS_NORMALIZED") || true
  ERRORS=$((ERRORS + 1))
else
  echo "✅ score-caps.ts ↔ fuzzy-score.js: in sync"
fi

exit $ERRORS
