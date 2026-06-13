#!/usr/bin/env node
/**
 * check-score-caps-drift.js
 *
 * Validates that SCORE_CAPS in fuzzy-score.js matches the canonical
 * source in packages/arcade-core/src/constants/score-caps.ts.
 *
 * Exit code 0 = match, 1 = drift detected.
 * Run in CI to prevent silent divergence.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FUZZY_SCORE_PATH = path.join(ROOT, 'apps/web-arcade/public/games/fuzzy-score.js');
const CANONICAL_PATH = path.join(ROOT, 'packages/arcade-core/src/constants/score-caps.ts');

function extractCapsFromFuzzyScore(content) {
  const match = content.match(/var\s+SCORE_CAPS\s*=\s*\{([^}]+)\}/s);
  if (!match) throw new Error('Could not find SCORE_CAPS in fuzzy-score.js');

  const caps = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*'([^']+)'\s*:\s*(\d[\d_]*)/);
    if (m) caps[m[1]] = parseInt(m[2].replace(/_/g, ''), 10);
  }
  return caps;
}

function extractCapsFromCanonical(content) {
  const match = content.match(/SCORE_CAPS:\s*Record<[^>]+>\s*=\s*\{([^}]+)\}/s);
  if (!match) throw new Error('Could not find SCORE_CAPS in score-caps.ts');

  const caps = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    // Match: key: number (with or without quotes, with optional comment)
    const m = line.match(/(?:"([^"]+)"|(\w+))\s*:\s*(\d[\d_]*)/);
    if (m) {
      const slug = m[1] || m[2];
      caps[slug] = parseInt(m[3].replace(/_/g, ''), 10);
    }
  }
  return caps;
}

try {
  const fuzzyContent = fs.readFileSync(FUZZY_SCORE_PATH, 'utf8');
  const canonicalContent = fs.readFileSync(CANONICAL_PATH, 'utf8');

  const fuzzyCaps = extractCapsFromFuzzyScore(fuzzyContent);
  const canonicalCaps = extractCapsFromCanonical(canonicalContent);

  // Remove legacy aliases from fuzzy-score for comparison
  const LEGACY_ALIASES = ['survivors', 'racer', 'nutracer'];
  const fuzzyCanonical = {};
  for (const [k, v] of Object.entries(fuzzyCaps)) {
    if (!LEGACY_ALIASES.includes(k)) fuzzyCanonical[k] = v;
  }

  let drifted = false;

  for (const [slug, cap] of Object.entries(canonicalCaps)) {
    if (!(slug in fuzzyCanonical)) {
      console.error(`DRIFT: '${slug}' exists in canonical but MISSING from fuzzy-score.js`);
      drifted = true;
    } else if (fuzzyCanonical[slug] !== cap) {
      console.error(`DRIFT: '${slug}' cap mismatch — canonical=${cap}, fuzzy-score=${fuzzyCanonical[slug]}`);
      drifted = true;
    }
  }

  for (const slug of Object.keys(fuzzyCanonical)) {
    if (!(slug in canonicalCaps)) {
      console.error(`DRIFT: '${slug}' exists in fuzzy-score.js but MISSING from canonical`);
      drifted = true;
    }
  }

  if (drifted) {
    console.error('\n❌ SCORE_CAPS drift detected between fuzzy-score.js and score-caps.ts');
    console.error('   Fix: update fuzzy-score.js SCORE_CAPS to match packages/arcade-core/src/constants/score-caps.ts');
    process.exit(1);
  } else {
    console.log('✅ SCORE_CAPS in sync (fuzzy-score.js matches score-caps.ts)');
    process.exit(0);
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
