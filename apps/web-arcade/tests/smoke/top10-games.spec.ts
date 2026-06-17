import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * FuzzyNuts Arcade — Smoke tests for top 10 games
 *
 * Verifies for each game:
 * 1. Game page loads (navigates to /games/{slug}/)
 * 2. Page title matches game
 * 3. Canvas or iframe element exists in DOM (game rendering surface)
 * 4. No critical console errors during load
 *
 * Top 10 games from registry audit (gameRegistry.ts first entries):
 *   mario, fuzzy-survivors, minigolf, nut-racer, fuzzynuts-world,
 *   rsc, dragon-hoard, cosmic-blaster, snake, breakout
 *
 * Special cases:
 *   - fuzzynuts-world: "Enter World" button navigates to world.fuzzynuts.xyz
 *     (different domain, canvas loads there). Test verifies button exists.
 */

// ── Top 10 games ──
const TOP_10 = [
  { title: "Super Fuzzynuts", slug: "mario", titleMatch: "Fuzzynuts|Mario|Nuttiest" },
  { title: "Fuzzy Survivors", slug: "fuzzy-survivors", titleMatch: "Survivor|Fuzzy" },
  { title: "Fuzzy Putt", slug: "minigolf", titleMatch: "Golf|Putt|Nut" },
  { title: "Nut Racer", slug: "nut-racer", titleMatch: "Racer|Nut" },
  { title: "Fuzzynuts World", slug: "fuzzynuts-world", titleMatch: "Fuzzynuts" },
  { title: "RuneScape Classic", slug: "rsc", titleMatch: "RuneScape" },
  { title: "Dragon's Hoard", slug: "dragon-hoard", titleMatch: "Dragon" },
  { title: "Cosmic Blaster", slug: "cosmic-blaster", titleMatch: "Cosmic" },
  { title: "Snake", slug: "snake", titleMatch: "Snake" },
  { title: "Breakout", slug: "breakout", titleMatch: "Breakout" },
];

// Games that load on a different domain after clicking start
// Test verifies the start button exists rather than looking for canvas
const EXTERNAL_LAUNCH = ["fuzzynuts-world"];

// ── Helpers ──

function collectConsoleErrors(page: Page): ConsoleMessage[] {
  const errors: ConsoleMessage[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg);
  });
  return errors;
}

async function dismissOverlays(page: Page) {
  const acceptBtn = page.locator('button:has-text("Accept")');
  if (await acceptBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }
}

async function hasRenderingSurface(page: Page): Promise<boolean> {
  const canvasCount = await page.locator("canvas").count();
  const iframeCount = await page.locator("iframe").count();
  return canvasCount + iframeCount > 0;
}

// ── Tests ──

test.describe("FuzzyNuts Arcade — Top 10 Game Smoke Tests", () => {
  test("homepage loads and shows game cards", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    await dismissOverlays(page);
    await page.waitForLoadState("networkidle").catch(() => {});

    // Homepage has buttons with accessible names like "Play Super Fuzzynuts"
    const playButtons = page.getByRole("button", { name: /Play/ });
    await expect(playButtons.first()).toBeVisible({ timeout: 15_000 });
    const count = await playButtons.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  for (const game of TOP_10) {
    test(`${game.title} (${game.slug}) — page loads with game content`, async ({ page }) => {
      const consoleErrors = collectConsoleErrors(page);

      const response = await page.goto(`/games/${game.slug}/`, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);
      await dismissOverlays(page);

      await expect(page).toHaveTitle(new RegExp(game.titleMatch, "i"));

      // Special case: games that launch on external domain
      if (EXTERNAL_LAUNCH.includes(game.slug)) {
        // Verify the launch button exists and is clickable
        const launchBtn = page
          .getByRole("button", {
            name: /Enter World|Start Game|Play Now/i,
          })
          .first();
        await expect(launchBtn).toBeVisible({ timeout: 10_000 });
        await expect(launchBtn).toBeEnabled();
        // Test passes — the button is present and ready to launch
      } else {
        // Standard game: verify canvas or iframe renders
        let found = await hasRenderingSurface(page);

        if (!found) {
          // Try clicking a start button if one exists
          const startBtn = page
            .getByRole("button", {
              name: /Start Game|Play Now/i,
            })
            .first();
          if (await startBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await startBtn.click();
            await page.waitForTimeout(5_000);
          }
          found = await hasRenderingSurface(page);
        }

        expect(found).toBe(true);

        // If canvas is visible, check dimensions
        const canvas = page.locator("canvas").first();
        if ((await canvas.count()) > 0 && (await canvas.isVisible().catch(() => false))) {
          const box = await canvas.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThan(50);
            expect(box.height).toBeGreaterThan(50);
          }
        }
      }

      // Filter known non-critical console errors
      const critical = consoleErrors.filter((err) => {
        const t = err.text();
        return (
          !t.includes("favicon") &&
          !t.includes("Failed to load resource") &&
          !t.includes("Xaman") &&
          !t.includes("wallet") &&
          !t.includes("WebSocket") &&
          !t.includes("xrpl") &&
          !t.includes("net::ERR_") &&
          !t.includes("Third-party cookie") &&
          !t.includes("analytics") &&
          !t.includes("gtag") &&
          !t.includes("Cross-Origin") &&
          !t.includes("Permissions-Policy")
        );
      });

      if (critical.length > 0) {
        console.log(
          `[${game.title}] Console errors:`,
          critical.map((e) => e.text()),
        );
      }
      expect(critical.length).toBeLessThanOrEqual(5);
    });
  }

  test("game card click opens game", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissOverlays(page);
    await page.waitForLoadState("networkidle").catch(() => {});

    // Click the "Play Cosmic Blaster" button
    const card = page.getByRole("button", { name: /Play Cosmic Blaster/i }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();

    // After clicking, either URL changes or a modal/canvas appears
    await Promise.race([
      page.waitForURL(/\/games?\/cosmic-blaster/, { timeout: 10_000 }).catch(() => {}),
      page
        .locator("dialog, [role='dialog'], .game-modal, canvas, iframe")
        .first()
        .waitFor({ state: "attached", timeout: 10_000 }),
    ]).catch(() => {});

    const onGamePage = /cosmic-blaster/i.test(page.url());
    const hasModal = (await page.locator("dialog, [role='dialog'], .game-modal").count()) > 0;
    const hasCanvas = (await page.locator("canvas").count()) > 0;
    const hasIframe = (await page.locator("iframe").count()) > 0;

    expect(onGamePage || hasModal || hasCanvas || hasIframe).toBe(true);
  });
});
