import { defineConfig } from "vitest/config";

/**
 * Vitest config for browser-game unit tests in public/games/.
 * Separate from the main web-arcade config (which covers src/).
 */
export default defineConfig({
  test: {
    include: [
      "public/games/**/*.test.{js,ts}",
    ],
    exclude: ["node_modules"],
  },
});
