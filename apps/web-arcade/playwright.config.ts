import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright smoke test config for FuzzyNuts Arcade
 * Tests the top 10 games from the registry audit.
 *
 * Target: https://www.fuzzynuts.xyz (production)
 * Tests: page load, canvas render, no console errors
 */
export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "https://www.fuzzynuts.xyz",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
