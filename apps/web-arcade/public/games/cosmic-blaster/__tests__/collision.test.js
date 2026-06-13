import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

/**
 * Extract collision helpers (circleRect, rectRect) from the cosmic-blaster IIFE.
 * These are pure functions — no DOM or state dependency — so we can safely
 * eval them in an isolated VM context.
 */

const srcPath = join(__dirname, '..', 'cosmic-blaster.js');
const src = readFileSync(srcPath, 'utf8');

/** Extract a top-level function definition by brace counting. */
function extractFunction(source, funcName) {
  const marker = `function ${funcName}(`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Function "${funcName}" not found in source`);

  let depth = 0;
  let begun = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') { depth++; begun = true; }
    if (source[i] === '}') depth--;
    if (begun && depth === 0) {
      return source.slice(start, i + 1);
    }
  }
  throw new Error(`Could not extract "${funcName}" — unbalanced braces`);
}

let circleRect, rectRect;

beforeAll(() => {
  // Extract and eval in a clean context
  const circleRectSrc = extractFunction(src, 'circleRect');
  const rectRectSrc = extractFunction(src, 'rectRect');

  const sandbox = {};
  runInNewContext(circleRectSrc + '\n' + rectRectSrc + '\n', sandbox);
  circleRect = sandbox.circleRect;
  rectRect = sandbox.rectRect;

  expect(circleRect).toBeTypeOf('function');
  expect(rectRect).toBeTypeOf('function');
});

/* ═══════════════════════════════════════════════════════════
   circleRect(cx, cy, cr, rx, ry, rw, rh)
   Circle center (cx,cy) with radius cr vs
   Rectangle top-left (rx,ry) size (rw,rh)
   Uses strict < — touching edge returns false.
   ═══════════════════════════════════════════════════════════ */
describe('circleRect', () => {
  it('circle fully inside rect → true', () => {
    // Circle at (50,50) r=5 inside rect (0,0,100,100)
    expect(circleRect(50, 50, 5, 0, 0, 100, 100)).toBe(true);
  });

  it('circle center at rect center, large radius → true', () => {
    expect(circleRect(50, 50, 30, 0, 0, 100, 100)).toBe(true);
  });

  it('circle touching rect edge (distance === radius) → false (strict <)', () => {
    // Circle at (0, 50) r=10, rect at (20,0,100,100)
    // Closest point on rect is (20, 50), distance = 20, radius = 10
    // 20*20 = 400, 10*10 = 100 → 400 < 100 is false
    expect(circleRect(0, 50, 10, 20, 0, 100, 100)).toBe(false);
  });

  it('circle just touching rect left edge exactly → false (strict <)', () => {
    // Circle at (10, 50) r=10, rect at (20,0,100,100)
    // Closest point is (20, 50), distance = 10, radius = 10
    // 10*10 = 100, 10*10 = 100 → 100 < 100 is false
    expect(circleRect(10, 50, 10, 20, 0, 100, 100)).toBe(false);
  });

  it('circle barely overlapping rect edge → true', () => {
    // Circle at (11, 50) r=10, rect at (20,0,100,100)
    // Closest point is (20, 50), distance = 9, radius = 10
    // 9*9 = 81, 10*10 = 100 → 81 < 100 is true
    expect(circleRect(11, 50, 10, 20, 0, 100, 100)).toBe(true);
  });

  it('circle just outside rect → false', () => {
    expect(circleRect(200, 200, 5, 0, 0, 100, 100)).toBe(false);
  });

  it('circle overlapping rect corner → true', () => {
    // Circle near top-left corner of rect
    // Circle at (95, 95) r=10, rect at (100,100,100,100)
    // Closest point on rect is (100, 100), distance = sqrt(25+25) ≈ 7.07
    // 7.07 < 10 → true
    expect(circleRect(95, 95, 10, 100, 100, 100, 100)).toBe(true);
  });

  it('zero radius circle → false', () => {
    // Circle with r=0 can never have d*d < 0
    expect(circleRect(50, 50, 0, 0, 0, 100, 100)).toBe(false);
  });

  it('zero radius circle on rect boundary → false', () => {
    expect(circleRect(50, 50, 0, 0, 0, 100, 100)).toBe(false);
  });

  it('circle far away → false', () => {
    expect(circleRect(500, 500, 1, 0, 0, 100, 100)).toBe(false);
  });

  it('circle at negative coordinates → works correctly', () => {
    // Circle at (-10, -10) r=5, rect at (0,0,100,100)
    // Closest point is (0, 0), distance = sqrt(200) ≈ 14.14
    expect(circleRect(-10, -10, 5, 0, 0, 100, 100)).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════
   rectRect(x1, y1, w1, h1, x2, y2, w2, h2)
   Two rectangles defined by top-left corner + size.
   Uses strict < and > — touching edges return false.
   ═══════════════════════════════════════════════════════════ */
describe('rectRect', () => {
  it('overlapping rectangles → true', () => {
    expect(rectRect(0, 0, 50, 50, 25, 25, 50, 50)).toBe(true);
  });

  it('identical rectangles → true', () => {
    expect(rectRect(10, 10, 30, 30, 10, 10, 30, 30)).toBe(true);
  });

  it('nested rectangle (one inside the other) → true', () => {
    expect(rectRect(0, 0, 100, 100, 20, 20, 30, 30)).toBe(true);
  });

  it('non-overlapping rectangles → false', () => {
    expect(rectRect(0, 0, 10, 10, 50, 50, 10, 10)).toBe(false);
  });

  it('adjacent rectangles sharing right edge → false (strict <)', () => {
    // Rect1: (0,0,50,50) → right edge at x=50
    // Rect2: (50,0,50,50) → left edge at x=50
    // x1 < x2+w2 → 0 < 100 ✓, x1+w1 > x2 → 50 > 50 ✗ (strict >)
    expect(rectRect(0, 0, 50, 50, 50, 0, 50, 50)).toBe(false);
  });

  it('adjacent rectangles sharing bottom edge → false (strict <)', () => {
    // Rect1: (0,0,50,50) → bottom at y=50
    // Rect2: (0,50,50,50) → top at y=50
    expect(rectRect(0, 0, 50, 50, 0, 50, 50, 50)).toBe(false);
  });

  it('barely overlapping (1px) → true', () => {
    // Rect1: (0,0,50,50), Rect2: (49,49,50,50)
    expect(rectRect(0, 0, 50, 50, 49, 49, 50, 50)).toBe(true);
  });

  it('rects separated horizontally → false', () => {
    expect(rectRect(0, 0, 10, 10, 20, 0, 10, 10)).toBe(false);
  });

  it('rects separated vertically → false', () => {
    expect(rectRect(0, 0, 10, 10, 0, 20, 10, 10)).toBe(false);
  });

  it('zero-size rect inside another rect → true (point is inside)', () => {
    // A zero-size rect at (50,50) is a point inside (0,0,100,100)
    // 50 < 100 && 50 > 0 && 50 < 100 && 50 > 0 → all true
    expect(rectRect(50, 50, 0, 0, 0, 0, 100, 100)).toBe(true);
  });

  it('zero-size rect outside another rect → false', () => {
    expect(rectRect(200, 200, 0, 0, 0, 0, 100, 100)).toBe(false);
  });

  it('both zero-size at same point → false', () => {
    // Two zero-size rects at same point: 0 < 0 is false
    expect(rectRect(0, 0, 0, 0, 0, 0, 0, 0)).toBe(false);
  });
});
