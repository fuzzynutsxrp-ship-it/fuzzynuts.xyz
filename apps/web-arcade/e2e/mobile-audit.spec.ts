/**
 * ═══════════════════════════════════════════════════════════════
 * Mobile Responsiveness Audit — FuzzyNuts Arcade Games
 *
 * Tests every game page at iPhone 12 (390×844) and Pixel 5 (393×851)
 * viewports. Checks:
 *   1. Game containers do not overflow the screen
 *   2. Aspect ratios are maintained
 *   3. Touch controls are not blocked by overlapping UI
 *   4. Screenshots captured for any issues
 *
 * Run:
 *   npx playwright test e2e/mobile-audit.spec.ts
 *
 * Prerequisites:
 *   - `pnpm dev` running on localhost:3000
 * ═══════════════════════════════════════════════════════════════
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const REPORT_DIR = path.join(__dirname, "..", "docs", "mobile-audit-screenshots");
const FINDINGS_FILE = path.join(REPORT_DIR, "findings.json");

/** All game slugs from games.json */
const GAME_SLUGS = [
  "mario",
  "fuzzy-survivors",
  "minigolf",
  "nut-racer",
  "fuzzynuts-world",
  "rsc",
  "dragon-hoard",
  "cosmic-blaster",
  "snake",
  "breakout",
  "pong",
  "tetris",
  "asteroids",
  "flappy",
  "subway-runner",
  "jetpack",
  "ski-free",
  "helicopter",
  "space-invaders",
  "doodle-jump",
  "frogger",
  "bowling",
  "boxing",
  "archery",
  "bomberman",
  "capture-flag",
  "maze-escape",
  "memory",
  "minesweeper",
  "fruit-ninja",
  "sudoku",
  "surf-up",
  "2048",
  "tank-battle",
  "tower-defense",
  "tower-stack",
  "wordle",
  "rally",
];

interface Finding {
  slug: string;
  device: string;
  issue: string;
  severity: "critical" | "warning" | "info";
  screenshot?: string;
}

/** Append a finding to the shared JSON file (atomic append via read-modify-write) */
function appendFinding(finding: Finding) {
  try {
    const existing: Finding[] = fs.existsSync(FINDINGS_FILE)
      ? JSON.parse(fs.readFileSync(FINDINGS_FILE, "utf-8"))
      : [];
    existing.push(finding);
    fs.writeFileSync(FINDINGS_FILE, JSON.stringify(existing, null, 2));
  } catch {
    // If file is being written by another worker, retry once
    const existing: Finding[] = [];
    existing.push(finding);
    fs.writeFileSync(FINDINGS_FILE, JSON.stringify(existing, null, 2));
  }
}

/** Ensure screenshot directory exists */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Check if any element overflows the viewport horizontally.
 *  Walks up the DOM tree checking computed overflow on ancestors —
 *  if any ancestor clips the element, it's not a real overflow.
 *  Also skips transform-scaled elements (their DOM rects don't match visual size). */
async function checkHorizontalOverflow(page: Page): Promise<{
  overflows: boolean;
  details: Array<{ selector: string; width: number; viewportWidth: number }>;
}> {
  const result = await page.evaluate(() => {
    const vpWidth = window.innerWidth;
    const issues: Array<{ selector: string; width: number; viewportWidth: number }> = [];
    const allElements = document.querySelectorAll("*");

    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > vpWidth + 1 || rect.left < -1) {
        const style = window.getComputedStyle(el);
        // Skip hidden, fixed-position, and transform-scaled elements
        if (style.display === "none" || style.position === "fixed") continue;
        if (style.transform && style.transform !== "none") continue;

        // Walk up ancestors — if any clips this element, skip it
        let clipped = false;
        let ancestor = el.parentElement;
        while (ancestor && ancestor !== document.body) {
          const aStyle = window.getComputedStyle(ancestor);
          const overflow = aStyle.overflow + " " + aStyle.overflowX;
          if (
            overflow.includes("hidden") ||
            overflow.includes("auto") ||
            overflow.includes("scroll")
          ) {
            const aRect = ancestor.getBoundingClientRect();
            // If ancestor clip boundary covers this element's overflow, it's clipped
            if (rect.right <= aRect.right + 1 && rect.left >= aRect.left - 1) {
              clipped = true;
              break;
            }
          }
          ancestor = ancestor.parentElement;
        }
        if (clipped) continue;

        const tag = el.tagName.toLowerCase();
        const cls = el.className ? `.${String(el.className).split(" ").slice(0, 2).join(".")}` : "";
        const id = el.id ? `#${el.id}` : "";
        issues.push({
          selector: `${tag}${id}${cls}`,
          width: Math.round(rect.width),
          viewportWidth: vpWidth,
        });
      }
    }
    return issues;
  });

  return { overflows: result.length > 0, details: result.slice(0, 5) };
}

/** Check if game iframe/canvas exists and has reasonable dimensions */
async function checkGameContainer(page: Page): Promise<{
  found: boolean;
  type: "iframe" | "canvas" | "none";
  width: number;
  height: number;
  aspectRatio: string;
  overflowsViewport: boolean;
}> {
  return page.evaluate(() => {
    const vpWidth = window.innerWidth;
    const vpHeight = window.innerHeight;

    const iframe = document.querySelector("iframe");
    if (iframe) {
      const rect = iframe.getBoundingClientRect();
      const ratio = rect.width / rect.height;
      return {
        found: true as const,
        type: "iframe" as const,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        aspectRatio: ratio.toFixed(2),
        overflowsViewport: rect.width > vpWidth + 2 || rect.height > vpHeight * 1.5,
      };
    }

    const canvas = document.querySelector("canvas");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ratio = rect.width / rect.height;
      return {
        found: true as const,
        type: "canvas" as const,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        aspectRatio: ratio.toFixed(2),
        overflowsViewport: rect.width > vpWidth + 2 || rect.height > vpHeight * 1.5,
      };
    }

    return {
      found: false as const,
      type: "none" as const,
      width: 0,
      height: 0,
      aspectRatio: "0",
      overflowsViewport: false,
    };
  });
}

/** Check for overlapping UI elements blocking touch targets */
async function checkTouchBlocking(page: Page): Promise<{
  blocked: boolean;
  details: string[];
}> {
  return page.evaluate(() => {
    const issues: string[] = [];

    const fixedElements = document.querySelectorAll(
      '[style*="position: fixed"], [style*="position:fixed"], nav, header, [class*="fixed"], [class*="sticky"]',
    );

    const gameArea = document.querySelector("iframe, canvas, [class*='game']");
    if (gameArea) {
      const gameRect = gameArea.getBoundingClientRect();
      for (const el of fixedElements) {
        const elRect = el.getBoundingClientRect();
        const overlapX = Math.max(
          0,
          Math.min(gameRect.right, elRect.right) - Math.max(gameRect.left, elRect.left),
        );
        const overlapY = Math.max(
          0,
          Math.min(gameRect.bottom, elRect.bottom) - Math.max(gameRect.top, elRect.top),
        );
        const overlapArea = overlapX * overlapY;
        const gameAreaPx = gameRect.width * gameRect.height;

        if (overlapArea > gameAreaPx * 0.15 && overlapArea > 5000) {
          const tag = el.tagName.toLowerCase();
          const cls = el.className
            ? `.${String(el.className).split(" ").slice(0, 2).join(".")}`
            : "";
          issues.push(`${tag}${cls} overlaps ${(overlapArea / 1000).toFixed(0)}k px² of game area`);
        }
      }
    }

    const overlays = document.querySelectorAll(
      '[class*="modal"], [class*="drawer"], [class*="overlay"], [class*="chat"]',
    );
    for (const overlay of overlays) {
      const style = window.getComputedStyle(overlay);
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseInt(style.zIndex) > 50
      ) {
        const rect = overlay.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          issues.push(
            `High z-index overlay visible: ${overlay.tagName.toLowerCase()}.${String(overlay.className).split(" ")[0]} (z:${style.zIndex})`,
          );
        }
      }
    }

    return { blocked: issues.length > 0, details: issues };
  });
}

/* ═══════════════════════════════════════════════════════════════
   Test Suite
   ═══════════════════════════════════════════════════════════════ */

test.describe("Mobile Responsiveness Audit", () => {
  test.beforeAll(() => {
    ensureDir(REPORT_DIR);
    // Initialize findings file
    if (!fs.existsSync(FINDINGS_FILE)) {
      fs.writeFileSync(FINDINGS_FILE, "[]");
    }
  });

  test("homepage loads at mobile viewport", async ({ page }) => {
    const deviceName = test.info().project.name;
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(400);

    // Check no horizontal overflow on homepage
    const overflow = await checkHorizontalOverflow(page);
    if (overflow.overflows) {
      appendFinding({
        slug: "homepage",
        device: deviceName,
        issue: `Horizontal overflow: ${overflow.details.map((d) => `${d.selector} (${d.width}px > ${d.viewportWidth}px)`).join(", ")}`,
        severity: "critical",
        screenshot: `homepage-overflow-${deviceName}.png`,
      });
      await page.screenshot({
        path: path.join(REPORT_DIR, `homepage-overflow-${deviceName}.png`),
      });
    }

    await page.screenshot({
      path: path.join(REPORT_DIR, `homepage-${deviceName}.png`),
    });
  });

  for (const slug of GAME_SLUGS) {
    test(`game: ${slug} — mobile viewport audit`, async ({ page }) => {
      const deviceName = test.info().project.name;
      const gameUrl = `${BASE_URL}/games/${slug}/index.html`;

      const response = await page.goto(gameUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

      if (!response || response.status() >= 400) {
        appendFinding({
          slug,
          device: deviceName,
          issue: `Game page returned HTTP ${response?.status() || "no response"}`,
          severity: "warning",
        });
        return;
      }

      await page.waitForTimeout(2000);

      // 1. Horizontal overflow check
      const hOverflow = await checkHorizontalOverflow(page);
      if (hOverflow.overflows) {
        appendFinding({
          slug,
          device: deviceName,
          issue: `Horizontal overflow: ${hOverflow.details.map((d) => `${d.selector} (${d.width}px > ${d.viewportWidth}px)`).join("; ")}`,
          severity: "critical",
          screenshot: `${slug}-overflow-${deviceName}.png`,
        });
        await page.screenshot({
          path: path.join(REPORT_DIR, `${slug}-overflow-${deviceName}.png`),
        });
      }

      // 2. Game container check
      const container = await checkGameContainer(page);
      if (container.found && container.overflowsViewport) {
        appendFinding({
          slug,
          device: deviceName,
          issue: `Game ${container.type} overflows viewport: ${container.width}×${container.height} (aspect ${container.aspectRatio})`,
          severity: "critical",
        });
      } else if (!container.found) {
        appendFinding({
          slug,
          device: deviceName,
          issue: `No game container (iframe/canvas) found on page`,
          severity: "warning",
        });
      }

      // 3. Touch blocking check
      const touchBlock = await checkTouchBlocking(page);
      if (touchBlock.blocked) {
        appendFinding({
          slug,
          device: deviceName,
          issue: `Touch controls blocked: ${touchBlock.details.join("; ")}`,
          severity: "warning",
          screenshot: `${slug}-touch-blocked-${deviceName}.png`,
        });
        await page.screenshot({
          path: path.join(REPORT_DIR, `${slug}-touch-blocked-${deviceName}.png`),
        });
      }

      // Always capture a screenshot for the report
      await page.screenshot({
        path: path.join(REPORT_DIR, `${slug}-${deviceName}.png`),
      });
    });
  }

  test.afterAll(() => {
    // Deduplicate findings
    if (fs.existsSync(FINDINGS_FILE)) {
      const findings: Finding[] = JSON.parse(fs.readFileSync(FINDINGS_FILE, "utf-8"));
      const seen = new Set<string>();
      const deduped = findings.filter((f) => {
        const key = `${f.slug}|${f.device}|${f.issue}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      fs.writeFileSync(FINDINGS_FILE, JSON.stringify(deduped, null, 2));
      console.log(
        `\n📊 Mobile audit complete. ${deduped.length} findings written to ${FINDINGS_FILE}`,
      );
    }
  });
});
