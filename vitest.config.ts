import { defineConfig } from "vitest/config";

/* ═══════════════════════════════════════════════════════════════
   Vitest config

   Scopes unit-test discovery to the application source under src/.
   Without this, `vitest run` auto-discovers every *.test.* file in
   the repo — including orphaned tests in docs/archive/ that import
   long-deleted source files, plus the Playwright specs in e2e/
   (which run under @playwright/test, not Vitest).
   ═══════════════════════════════════════════════════════════════ */

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "docs", "e2e", ".next", "out"],
  },
});
