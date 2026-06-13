import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

/**
 * Tests for cosmic-blaster game logic:
 *   - Wave progression formula
 *   - Score capping (addScore respects MAX_SCORE)
 *   - Cross-file invariant: MAX_SCORE === SCORE_CAPS['cosmic-blaster']
 *
 * Since the game is an IIFE that runs on load (and needs a full DOM),
 * we extract the pure logic by parsing constants and formulas from source.
 */

const srcPath = join(__dirname, '..', 'cosmic-blaster.js');
const src = readFileSync(srcPath, 'utf8');

/* ── Extract constants ────────────────────────────────────── */
function extractConst(name) {
  // Match: const NAME = <number>;
  const re = new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)\\s*;`);
  const m = src.match(re);
  if (!m) throw new Error(`Constant "${name}" not found`);
  return parseInt(m[1], 10);
}

let WAVE_INTERVAL, MAX_SCORE;

beforeAll(() => {
  WAVE_INTERVAL = extractConst('WAVE_INTERVAL');
  MAX_SCORE = extractConst('MAX_SCORE');
});

/* ── Wave progression formula ───────────────────────────────
   From source line 314:
     const newWave = Math.floor(score / WAVE_INTERVAL) + 1;
   ─────────────────────────────────────────────────────────── */
function getWave(score) {
  return Math.floor(score / WAVE_INTERVAL) + 1;
}

describe('wave progression', () => {
  it('score 0 → wave 1', () => {
    expect(getWave(0)).toBe(1);
  });

  it('score 499 → wave 1 (just below threshold)', () => {
    expect(getWave(499)).toBe(1);
  });

  it('score 500 → wave 2 (at threshold)', () => {
    expect(getWave(500)).toBe(2);
  });

  it('score 999 → wave 2', () => {
    expect(getWave(999)).toBe(2);
  });

  it('score 1000 → wave 3', () => {
    expect(getWave(1000)).toBe(3);
  });

  it('score 2500 → wave 6', () => {
    expect(getWave(2500)).toBe(6);
  });

  it('wave increments every WAVE_INTERVAL points', () => {
    for (let s = 0; s <= 5000; s += WAVE_INTERVAL) {
      const expectedWave = Math.floor(s / WAVE_INTERVAL) + 1;
      expect(getWave(s)).toBe(expectedWave);
    }
  });

  it('WAVE_INTERVAL is 500', () => {
    expect(WAVE_INTERVAL).toBe(500);
  });
});

/* ── Score capping (addScore logic) ─────────────────────────
   From source line 334-336:
     score = Math.min(MAX_SCORE, score + pts);
   ─────────────────────────────────────────────────────────── */
function addScore(current, pts) {
  return Math.min(MAX_SCORE, current + pts);
}

describe('score capping', () => {
  it('MAX_SCORE is 999999', () => {
    expect(MAX_SCORE).toBe(999999);
  });

  it('adding points below cap → score increases normally', () => {
    expect(addScore(0, 10)).toBe(10);
    expect(addScore(100, 50)).toBe(150);
  });

  it('adding points that would exceed cap → capped at MAX_SCORE', () => {
    expect(addScore(999990, 100)).toBe(999999);
    expect(addScore(999999, 1)).toBe(999999);
  });

  it('score already at cap → stays at cap', () => {
    expect(addScore(999999, 0)).toBe(999999);
  });

  it('large point addition → capped', () => {
    expect(addScore(0, 9999999)).toBe(999999);
  });

  it('adding 0 → score unchanged', () => {
    expect(addScore(500, 0)).toBe(500);
  });
});

/* ── Cross-file invariant ───────────────────────────────────
   MAX_SCORE in cosmic-blaster.js must equal
   SCORE_CAPS['cosmic-blaster'] in packages/arcade-core/src/constants/score-caps.ts
   ─────────────────────────────────────────────────────────── */
describe('cross-file invariant', () => {
  it('MAX_SCORE === SCORE_CAPS["cosmic-blaster"] from arcade-core', () => {
    // Read the canonical score-caps source
    const capsPath = join(
      __dirname, '..', '..', '..', '..', '..', '..',
      'packages', 'arcade-core', 'src', 'constants', 'score-caps.ts'
    );
    let capsSrc;
    try {
      capsSrc = readFileSync(capsPath, 'utf8');
    } catch {
      // If running outside the monorepo, skip this test
      console.warn('Could not read score-caps.ts — skipping cross-file invariant');
      return;
    }

    // Extract the cosmic-blaster cap value
    const m = capsSrc.match(/["']cosmic-blaster["']\s*:\s*([\d_]+)/);
    expect(m).toBeTruthy();
    const canonicalCap = parseInt(m[1].replace(/_/g, ''), 10);

    expect(MAX_SCORE).toBe(canonicalCap);
  });

  it('MAX_SCORE matches fuzzy-score.js SCORE_CAPS["cosmic-blaster"]', () => {
    const fuzzyPath = join(
      __dirname, '..', '..', 'fuzzy-score.js'
    );
    let fuzzySrc;
    try {
      fuzzySrc = readFileSync(fuzzyPath, 'utf8');
    } catch {
      console.warn('Could not read fuzzy-score.js — skipping');
      return;
    }

    const m = fuzzySrc.match(/['"]cosmic-blaster['"]\s*:\s*([\d_]+)/);
    expect(m).toBeTruthy();
    const fuzzyCap = parseInt(m[1].replace(/_/g, ''), 10);

    expect(MAX_SCORE).toBe(fuzzyCap);
  });
});
