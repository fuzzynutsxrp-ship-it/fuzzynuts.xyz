#!/usr/bin/env node
/**
 * apps/games-build/scripts/build.mjs
 *
 * Bundles each game in ./games/<slug>/ with Vite and emits content-hashed
 * output into ../web-arcade/public/games/<slug>/.
 *
 * STATUS: scaffold. The per-game vite configs and entry conventions land
 *         in the games-bundling PR. For now this script:
 *           - asserts every games/* dir has an index.html
 *           - emits a stub log so the wiring is observable in CI
 *         until the real bundle step is enabled.
 *
 * Once enabled, each game's index.html is rewritten to load:
 *   <script type="module" src="./assets/index-<hash>.js"></script>
 *   <link rel="stylesheet" href="./assets/index-<hash>.css">
 * where the hash makes the long-lived immutable Cache-Control safe again.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GAMES_DIR = join(ROOT, "games");
const OUT_BASE = join(ROOT, "..", "web-arcade", "public", "games");

const games = readdirSync(GAMES_DIR).filter((name) => {
  const p = join(GAMES_DIR, name);
  return statSync(p).isDirectory() && existsSync(join(p, "index.html"));
});

console.log(`[games-build] discovered ${games.length} game(s): ${games.join(", ")}`);
for (const g of games) {
  // TODO(games-bundling): replace this stub with a real vite build:
  //   const result = await build({ root: join(GAMES_DIR, g), build: { outDir: join(OUT_BASE, g), emptyOutDir: true } });
  console.log(`[games-build] would bundle ${g} → ${join(OUT_BASE, g)}`);
}

console.log(`[games-build] OK — ${games.length} game(s) discovered, bundling deferred to games-bundling PR.`);
