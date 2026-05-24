#!/usr/bin/env node
/**
 * cleanup-three.mjs — Reports Three.js usage across the codebase.
 *
 * Safe / read-only. Tells you which files still import `three`,
 * `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`,
 * etc., and flags components that look orphaned (defined but never
 * imported anywhere).
 *
 * Usage:
 *   node scripts/cleanup-three.mjs
 *   node scripts/cleanup-three.mjs --json   # machine-readable
 *
 * No files are touched. Pipe the output into a TODO list and clean up
 * manually based on what's reported.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, "..", "..");

const SRC_DIRS = ["src", "scripts"];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".vercel", ".git"]);

// Three.js-family modules we want to track imports of.
const THREE_PATTERNS = [
  /from\s+["']three["']/, // import * as THREE from "three"
  /from\s+["']three\//, // three/examples/jsm/...
  /from\s+["']@react-three\/fiber["']/,
  /from\s+["']@react-three\/drei["']/,
  /from\s+["']@react-three\/postprocessing["']/,
];

const FILE_EXT = /\.(tsx?|jsx?|mjs|cjs)$/;

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (FILE_EXT.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

async function scan() {
  const all = [];
  for (const sub of SRC_DIRS) all.push(...(await walk(join(ROOT, sub))));

  // Pass 1: which files import three? Record per-file matched modules.
  const importers = new Map(); // file → string[]
  for (const file of all) {
    let src;
    try {
      src = await readFile(file, "utf8");
    } catch {
      continue;
    }
    const hits = THREE_PATTERNS.map((re) => {
      const m = src.match(re);
      return m ? m[0] : null;
    }).filter(Boolean);
    if (hits.length) importers.set(file, hits);
  }

  // Pass 2: orphan check — for each Three.js importer, search the rest
  // of the codebase for imports of THAT file's exported name(s).
  // Heuristic: filename without extension. If no other file in `all`
  // contains `from ".*<basename>"`, mark as ORPHANED.
  const orphans = [];
  for (const file of importers.keys()) {
    const name = basename(file).replace(FILE_EXT, "");
    // Skip page.tsx / layout.tsx etc. (entry points referenced by Next).
    if (["page", "layout", "route"].includes(name)) continue;
    const importerRe = new RegExp(`from\\s+["'][^"']*${name}["']`);
    let imported = false;
    for (const other of all) {
      if (other === file) continue;
      let src;
      try {
        src = await readFile(other, "utf8");
      } catch {
        continue;
      }
      if (importerRe.test(src)) {
        imported = true;
        break;
      }
    }
    if (!imported) orphans.push(file);
  }

  return { importers, orphans, allCount: all.length };
}

function relPath(p) {
  return relative(ROOT, p);
}

async function main() {
  const json = process.argv.includes("--json");
  const { importers, orphans, allCount } = await scan();

  const importerList = [...importers.entries()]
    .map(([file, hits]) => ({ file: relPath(file), uses: hits }))
    .sort((a, b) => a.file.localeCompare(b.file));

  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          scannedFiles: allCount,
          totalImporters: importerList.length,
          orphans: orphans.map(relPath).sort(),
          importers: importerList,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  // Human-readable report.
  console.log(`\n=== Three.js usage audit ===\n`);
  console.log(`Scanned ${allCount} source files.`);
  console.log(`Found ${importerList.length} importing a three.js module.\n`);

  if (orphans.length) {
    console.log(`── ORPHANS (importer not imported by anything else) ──`);
    for (const o of orphans) console.log(`  ${relPath(o)}`);
    console.log("");
    console.log(
      `  ↑ These look safe to delete IF they're truly unused. Double-check\n    by searching for the basename in case of indirect references.`,
    );
    console.log("");
  }

  console.log(`── ALL importers ──`);
  for (const { file, uses } of importerList) {
    console.log(`  ${file}`);
    for (const u of uses) console.log(`    ${u}`);
  }
  console.log("");
  console.log(
    `Tip: remove three.js dependencies from package.json ONLY if the\n` +
      `importer list above is empty. Otherwise leave \`three\`, \`@react-three/*\`\n` +
      `installed so the remaining components keep working.`,
  );
}

main().catch((err) => {
  console.error("cleanup-three.mjs failed:", err);
  process.exit(1);
});
