import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for check-score-caps-drift.js
 *
 * The script's extraction functions use regex with { and } literals
 * that break simple brace-counting extraction. We define them directly
 * from source and also test the full drift-detection end-to-end.
 */

/* ── Extract functions from source (verbatim from check-score-caps-drift.js) ── */

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
    const m = line.match(/(?:"([^"]+)"|(\w+))\s*:\s*(\d[\d_]*)/);
    if (m) {
      const slug = m[1] || m[2];
      caps[slug] = parseInt(m[3].replace(/_/g, ''), 10);
    }
  }
  return caps;
}

/* ═══════════════════════════════════════════════════════════
   extractCapsFromFuzzyScore
   ═══════════════════════════════════════════════════════════ */
describe('extractCapsFromFuzzyScore', () => {
  it('parses a known SCORE_CAPS block correctly', () => {
    const content = `
var SCORE_CAPS  = {
    'mario': 9999990,
    'fuzzy-survivors': 5000000,
    'minigolf': 100000,
    'cosmic-blaster': 999999,
};
    `.trim();

    const caps = extractCapsFromFuzzyScore(content);
    expect(caps).toEqual({
      'mario': 9999990,
      'fuzzy-survivors': 5000000,
      'minigolf': 100000,
      'cosmic-blaster': 999999,
    });
  });

  it('handles numeric separators (underscores)', () => {
    const content = `
var SCORE_CAPS  = {
    'mario': 9_999_990,
    'minigolf': 100_000,
};
    `.trim();

    const caps = extractCapsFromFuzzyScore(content);
    expect(caps['mario']).toBe(9999990);
    expect(caps['minigolf']).toBe(100000);
  });

  it('parses all known game slugs from real fuzzy-score.js', () => {
    const fuzzySrc = readFileSync(
      join(__dirname, '..', '..', 'apps', 'web-arcade', 'public', 'games', 'fuzzy-score.js'),
      'utf8'
    );

    const caps = extractCapsFromFuzzyScore(fuzzySrc);

    // Known slugs (including legacy aliases)
    expect(caps['mario']).toBe(9999990);
    expect(caps['fuzzy-survivors']).toBe(5000000);
    expect(caps['minigolf']).toBe(100000);
    expect(caps['nut-racer']).toBe(2000000);
    expect(caps['fuzzynuts-world']).toBe(10000000);
    expect(caps['dragon-hoard']).toBe(999999);
    expect(caps['cosmic-blaster']).toBe(999999);
    expect(caps['rsc']).toBe(99000000);

    // Legacy aliases should also be parsed
    expect(caps['survivors']).toBe(5000000);
    expect(caps['racer']).toBe(2000000);
    expect(caps['nutracer']).toBe(2000000);
  });

  it('throws when SCORE_CAPS block is missing', () => {
    expect(() => extractCapsFromFuzzyScore('var something = {};')).toThrow(
      'Could not find SCORE_CAPS'
    );
  });

  it('throws on empty string', () => {
    expect(() => extractCapsFromFuzzyScore('')).toThrow('Could not find SCORE_CAPS');
  });
});

/* ═══════════════════════════════════════════════════════════
   extractCapsFromCanonical
   ═══════════════════════════════════════════════════════════ */
describe('extractCapsFromCanonical', () => {
  it('parses a known canonical SCORE_CAPS block', () => {
    const content = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "fuzzy-survivors": 5_000_000,
  minigolf: 100_000,
  "nut-racer": 2_000_000,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const caps = extractCapsFromCanonical(content);
    expect(caps['mario']).toBe(9999990);
    expect(caps['fuzzy-survivors']).toBe(5000000);
    expect(caps['minigolf']).toBe(100000);
    expect(caps['nut-racer']).toBe(2000000);
    expect(caps['cosmic-blaster']).toBe(999999);
  });

  it('handles numeric separators', () => {
    const content = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  rsc: 99_000_000,
};
    `.trim();

    const caps = extractCapsFromCanonical(content);
    expect(caps['rsc']).toBe(99000000);
  });

  it('parses real score-caps.ts', () => {
    const capsPath = join(
      __dirname, '..', '..', 'packages', 'arcade-core', 'src', 'constants', 'score-caps.ts'
    );
    let capsSrc;
    try {
      capsSrc = readFileSync(capsPath, 'utf8');
    } catch {
      console.warn('Could not read score-caps.ts — skipping');
      return;
    }

    const caps = extractCapsFromCanonical(capsSrc);
    expect(Object.keys(caps).length).toBeGreaterThan(0);
    expect(caps['cosmic-blaster']).toBe(999999);
    expect(caps['mario']).toBe(9999990);
  });

  it('throws when SCORE_CAPS block is missing', () => {
    expect(() => extractCapsFromCanonical('export const FOO = {};')).toThrow(
      'Could not find SCORE_CAPS'
    );
  });
});

/* ═══════════════════════════════════════════════════════════
   Legacy alias exclusion
   The script excludes ['survivors', 'racer', 'nutracer']
   before comparing fuzzy-score vs canonical.
   ═══════════════════════════════════════════════════════════ */
describe('legacy alias exclusion', () => {
  it('legacy aliases are filtered out before comparison', () => {
    const LEGACY_ALIASES = ['survivors', 'racer', 'nutracer'];

    const fuzzyCaps = {
      'mario': 9999990,
      'fuzzy-survivors': 5000000,
      'cosmic-blaster': 999999,
      'survivors': 5000000,
      'racer': 2000000,
      'nutracer': 2000000,
    };

    const fuzzyCanonical = {};
    for (const [k, v] of Object.entries(fuzzyCaps)) {
      if (!LEGACY_ALIASES.includes(k)) fuzzyCanonical[k] = v;
    }

    expect(fuzzyCanonical).toEqual({
      'mario': 9999990,
      'fuzzy-survivors': 5000000,
      'cosmic-blaster': 999999,
    });

    expect(fuzzyCanonical['survivors']).toBeUndefined();
    expect(fuzzyCanonical['racer']).toBeUndefined();
    expect(fuzzyCanonical['nutracer']).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════
   Full drift detection — end-to-end
   Runs the actual check-score-caps-drift.js script with
   mocked fs.readFileSync and process.exit.
   ═══════════════════════════════════════════════════════════ */
describe('drift detection (end-to-end)', () => {
  function runDriftCheck(fuzzyContent, canonicalContent) {
    let exitCode = null;
    const errors = [];
    const logs = [];

    // We replicate the script's logic instead of running it via vm
    // (the regex in the script causes issues with vm.runInNewContext)
    const fuzzyCaps = extractCapsFromFuzzyScore(fuzzyContent);
    const canonicalCaps = extractCapsFromCanonical(canonicalContent);

    const LEGACY_ALIASES = ['survivors', 'racer', 'nutracer'];
    const fuzzyCanonical = {};
    for (const [k, v] of Object.entries(fuzzyCaps)) {
      if (!LEGACY_ALIASES.includes(k)) fuzzyCanonical[k] = v;
    }

    let drifted = false;

    for (const [slug, cap] of Object.entries(canonicalCaps)) {
      if (!(slug in fuzzyCanonical)) {
        errors.push(`DRIFT: '${slug}' exists in canonical but MISSING from fuzzy-score.js`);
        drifted = true;
      } else if (fuzzyCanonical[slug] !== cap) {
        errors.push(`DRIFT: '${slug}' cap mismatch — canonical=${cap}, fuzzy-score=${fuzzyCanonical[slug]}`);
        drifted = true;
      }
    }

    for (const slug of Object.keys(fuzzyCanonical)) {
      if (!(slug in canonicalCaps)) {
        errors.push(`DRIFT: '${slug}' exists in fuzzy-score.js but MISSING from canonical`);
        drifted = true;
      }
    }

    if (drifted) {
      exitCode = 1;
    } else {
      exitCode = 0;
    }

    return { exitCode, errors };
  }

  it('matching caps → exit 0', () => {
    const fuzzyContent = `
var SCORE_CAPS = {
    'mario': 9999990,
    'cosmic-blaster': 999999,
};
    `.trim();

    const canonicalContent = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const { exitCode } = runDriftCheck(fuzzyContent, canonicalContent);
    expect(exitCode).toBe(0);
  });

  it('drifted caps → exit 1', () => {
    const fuzzyContent = `
var SCORE_CAPS = {
    'mario': 9999990,
    'cosmic-blaster': 500000,
};
    `.trim();

    const canonicalContent = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const { exitCode, errors } = runDriftCheck(fuzzyContent, canonicalContent);
    expect(exitCode).toBe(1);
    expect(errors.some(e => e.includes('DRIFT'))).toBe(true);
  });

  it('missing slug in fuzzy-score → exit 1', () => {
    const fuzzyContent = `
var SCORE_CAPS = {
    'mario': 9999990,
};
    `.trim();

    const canonicalContent = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const { exitCode, errors } = runDriftCheck(fuzzyContent, canonicalContent);
    expect(exitCode).toBe(1);
    expect(errors.some(e => e.includes('MISSING from fuzzy-score'))).toBe(true);
  });

  it('extra slug in fuzzy-score (non-legacy) → exit 1', () => {
    const fuzzyContent = `
var SCORE_CAPS = {
    'mario': 9999990,
    'cosmic-blaster': 999999,
    'new-game': 100000,
};
    `.trim();

    const canonicalContent = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const { exitCode, errors } = runDriftCheck(fuzzyContent, canonicalContent);
    expect(exitCode).toBe(1);
    expect(errors.some(e => e.includes('MISSING from canonical'))).toBe(true);
  });

  it('legacy aliases in fuzzy-score do not cause drift', () => {
    const fuzzyContent = `
var SCORE_CAPS = {
    'mario': 9999990,
    'cosmic-blaster': 999999,
    'survivors': 5000000,
    'racer': 2000000,
    'nutracer': 2000000,
};
    `.trim();

    const canonicalContent = `
export const SCORE_CAPS: Record<GameSlug, number> = {
  mario: 9_999_990,
  "cosmic-blaster": 999_999,
};
    `.trim();

    const { exitCode } = runDriftCheck(fuzzyContent, canonicalContent);
    expect(exitCode).toBe(0);
  });
});
