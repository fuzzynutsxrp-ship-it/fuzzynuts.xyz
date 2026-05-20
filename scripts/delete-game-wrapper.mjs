#!/usr/bin/env node

/**
 * Safe deletion script for the orphaned GameWrapper.tsx component.
 * Checks for any imports before deleting.
 */

import { execSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = "src/components/game/GameWrapper.tsx";
const FULL_PATH = resolve(process.cwd(), TARGET);

console.log("🔍 Checking for imports of GameWrapper...\n");

try {
  // Search for actual import/require statements (not comments)
  const result = execSync(
    `grep -rn "from.*GameWrapper\\|import.*GameWrapper\\|require.*GameWrapper" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
    { encoding: "utf-8" }
  ).trim();

  // Filter out the file itself and comment-only references
  const lines = result
    .split("\n")
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith(TARGET))
    .filter((l) => !l.includes("//") && !l.includes("*"));

  if (lines.length > 0) {
    console.error("❌ Found active imports of GameWrapper:\n");
    lines.forEach((l) => console.error(`   ${l}`));
    console.error("\n⚠️  Cannot safely delete. Remove these imports first.");
    process.exit(1);
  }

  if (!existsSync(FULL_PATH)) {
    console.log("ℹ️  GameWrapper.tsx does not exist (already deleted?).");
    process.exit(0);
  }

  unlinkSync(FULL_PATH);
  console.log(`✅ Deleted: ${TARGET}`);
  console.log("   No active imports found — safe removal confirmed.");
  process.exit(0);
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
}
