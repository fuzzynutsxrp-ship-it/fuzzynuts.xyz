#!/usr/bin/env node
/**
 * new-game — scaffold a FuzzyNuts arcade game and register it everywhere.
 *
 *   pnpm new-game --slug space-race --title "Space Race" --genre Racing \
 *     --color "#22d3ee" --score-cap 99999 --description "Dodge and dash."
 *
 * It creates the game folder from apps/games-build/template/, copies it into
 * the web app's public/games/, and inserts the registration entries into the
 * files that previously had to be hand-edited (the drift source):
 *   - packages/arcade-core/src/constants/slugs.ts      (4 structures)  [PROTECTED]
 *   - packages/arcade-core/src/constants/score-caps.ts (SCORE_CAPS)    [PROTECTED]
 *   - apps/web-arcade/src/lib/gameRegistry.ts          (GAME_LIST)
 *   - apps/web-arcade/src/lib/utils.ts                 (GAMES)
 *
 * Idempotent: if the slug is already registered in a file, that file is skipped.
 * Safe: never overwrites an existing game folder.
 *
 * NOTE (HERMES.md §1.3/§2.4): edits to packages/arcade-core/src/constants/ are
 * money-adjacent and require an ADR + CODEOWNERS review before merge, plus a
 * `pnpm changeset`. This tool makes the edit but reminds you — it does not
 * bypass the PR review gate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(ROOT, ...x);

// ── parse args ──
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) { args[a.slice(2)] = process.argv[i + 1]?.startsWith("--") || process.argv[i + 1] === undefined ? true : process.argv[++i]; }
}
const slug = args.slug;
if (!slug || typeof slug !== "string") {
  console.error("Usage: pnpm new-game --slug <slug> [--title T] [--genre G] [--color #hex] [--score-cap N] [--description D] [--icon E] [--legacy-id ID]");
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) { console.error(`✗ slug must be lowercase letters/numbers/hyphens: "${slug}"`); process.exit(1); }

const title = args.title || slug.replace(/(^|-)([a-z0-9])/g, (_, d, c) => (d ? " " : "") + c.toUpperCase()).trim();
const genre = args.genre || "Arcade";
const color = args.color || "#FBBF24";
const scoreCap = parseInt(args["score-cap"] || "99999", 10);
const description = args.description || `${title} — a FuzzyNuts arcade game.`;
const icon = args.icon || "🎮";
const legacyId = args["legacy-id"] || slug;
const iconPath = args["icon-path"] || "/icons/icon-world-pop.webp";

// ── helpers ──
const log = (m) => console.log(m);
function injectOnce(file, label, slugToken, anchorRe, build) {
  const abs = p(file);
  if (!fs.existsSync(abs)) { log(`  • ${file} (${label}) — NOT FOUND, skipped`); return false; }
  const src = fs.readFileSync(abs, "utf8");
  const m = src.match(anchorRe);
  if (!m) { log(`  ✗ ${file} (${label}) — anchor not found, NOT edited (check the file format)`); return false; }
  // Presence check is scoped to THIS structure's captured body (m[1]), so the
  // four separate structures inside slugs.ts are each handled independently.
  if (m[1].includes(slugToken)) { log(`  • ${file} (${label}) — already has "${slug}", skipped`); return false; }
  fs.writeFileSync(abs, src.replace(anchorRe, build));
  log(`  ✓ ${file} (${label})`);
  return true;
}

// ── 1. scaffold the game folder from the template ──
const tplDir = p("apps/games-build/template");
const gameDir = p("apps/games-build/games", slug);
if (fs.existsSync(gameDir)) {
  log(`• game folder apps/games-build/games/${slug}/ already exists — leaving it as is`);
} else {
  fs.mkdirSync(gameDir, { recursive: true });
  let html = fs.readFileSync(path.join(tplDir, "index.html"), "utf8");
  html = html
    .replaceAll("Game Title", title)
    .replaceAll("game-slug", slug)
    .replaceAll("🎮", icon)
    .replaceAll("#ff2e88", color)
    .replaceAll("Game description here", description)
    .replaceAll("Game description", description)
    .replace('href="game.css"', `href="${slug}.css"`)
    .replace('src="game.js"', `src="${slug}.js"`);
  fs.writeFileSync(path.join(gameDir, "index.html"), html);
  let js = fs.readFileSync(path.join(tplDir, "game.js"), "utf8").replaceAll("game-slug", slug);
  fs.writeFileSync(path.join(gameDir, `${slug}.js`), js);
  fs.copyFileSync(path.join(tplDir, "game.css"), path.join(gameDir, `${slug}.css`));
  if (fs.existsSync(path.join(tplDir, "service-worker.js")))
    fs.copyFileSync(path.join(tplDir, "service-worker.js"), path.join(gameDir, "service-worker.js"));
  log(`✓ scaffolded apps/games-build/games/${slug}/ (index.html, ${slug}.js, ${slug}.css, service-worker.js)`);
}

// ── 2. deploy copy into the web app so it's actually served ──
const pubDir = p("apps/web-arcade/public/games", slug);
if (fs.existsSync(pubDir)) {
  log(`• public/games/${slug}/ already exists — leaving it as is`);
} else {
  fs.cpSync(gameDir, pubDir, { recursive: true });
  log(`✓ copied to apps/web-arcade/public/games/${slug}/`);
}

// ── 3. register across the chain ──
log("Registering:");
const q = `"${slug}"`;

// slugs.ts (PROTECTED) — 4 structures, each checked independently
injectOnce("packages/arcade-core/src/constants/slugs.ts", "GameSlug type", q,
  /(export type GameSlug =[\s\S]*?)(;)/, (_m, a, semi) => `${a}\n  | ${q}${semi}`);
injectOnce("packages/arcade-core/src/constants/slugs.ts", "GAME_SLUGS", q,
  /(export const GAME_SLUGS[\s\S]*?)(\n\] as const;)/, (_m, a, close) => `${a}\n  ${q},${close}`);
injectOnce("packages/arcade-core/src/constants/slugs.ts", "ID_TO_SLUG", q,
  /(export const ID_TO_SLUG[\s\S]*?)(\n\};)/, (_m, a, close) => `${a}\n  ${q}: ${q},${close}`);
injectOnce("packages/arcade-core/src/constants/slugs.ts", "SLUG_TO_LEGACY_ID", q,
  /(export const SLUG_TO_LEGACY_ID[\s\S]*?)(\n\};)/, (_m, a, close) => `${a}\n  ${q}: "${legacyId}",${close}`);

// score-caps.ts (PROTECTED)
injectOnce("packages/arcade-core/src/constants/score-caps.ts", "SCORE_CAPS", q,
  /(export const SCORE_CAPS[\s\S]*?)(\n\};)/, (_m, a, close) => `${a}\n  ${q}: ${scoreCap},${close}`);

// gameRegistry.ts (GAME_LIST) — compact one-line entry
const regEntry = `  { slug: ${q}, title: ${JSON.stringify(title)}, genre: ${JSON.stringify(genre)}, color: ${JSON.stringify(color)}, description: ${JSON.stringify(description)}, scoreCap: ${scoreCap}, minPlayTime: 15, controls: ["Arrow keys to move"], iconPath: ${JSON.stringify(iconPath)}, iframePath: "/games/${slug}/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: [${JSON.stringify(description)}], touchHint: "" },`;
injectOnce("apps/web-arcade/src/lib/gameRegistry.ts", "GAME_LIST", `slug: ${q}`,
  /(export const GAME_LIST: GameMetadata\[\] = \[[\s\S]*?)(\n\];)/, (_m, a, close) => `${a}\n${regEntry}${close}`);

// lib/utils.ts (GAMES) — keyed by legacy id
const gamesEntry = `  { id: "${legacyId}", title: ${JSON.stringify(title)}, type: ${JSON.stringify(genre)}, description: ${JSON.stringify(description)}, icon: ${JSON.stringify(iconPath)}, image: ${JSON.stringify(icon)}, color: ${JSON.stringify(color)}, tags: [${JSON.stringify(genre)}] },`;
injectOnce("apps/web-arcade/src/lib/utils.ts", "GAMES", `id: "${legacyId}"`,
  /(export const GAMES = \[[\s\S]*?)(\n\];)/, (_m, a, close) => `${a}\n${gamesEntry}${close}`);

// ── reminders ──
log("\nNext steps:");
log(`  1. Implement the game in apps/games-build/games/${slug}/${slug}.js`);
log(`     (re-run with the folder present is safe; it won't be overwritten)`);
log(`  2. ⚠️  You edited arcade-core constants (slugs.ts, score-caps.ts) — money-adjacent.`);
log(`     HERMES.md §1.3 requires an ADR in docs/adr/ + CODEOWNERS review, and §2.4 a changeset:`);
log(`         pnpm changeset`);
log(`  3. The server route apps/api/src/routes/scores.ts has its OWN VALID_GAMES list (a known`);
log(`     drift point) — if scores must post for "${slug}", add it there too until that's unified.`);
log(`  4. Verify:  pnpm typecheck && pnpm build:web && pnpm build:games`);
log(`\nDone: ${title} (${slug}).`);
