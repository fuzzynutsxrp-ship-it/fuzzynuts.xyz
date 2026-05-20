#!/usr/bin/env node

/**
 * verify-ui-fixes.mjs — Post-fix validation for design token drift
 *
 * Scans all .tsx files for:
 * 1. Hardcoded hex colors in Tailwind arbitrary brackets [#...]
 * 2. Hardcoded rgba(255,255,255,...) that should use glass-border tokens
 * 3. Hardcoded rgba(245,196,66,...) old gold that should use brand-gold tokens
 *
 * Exit code 0 = clean, 1 = drift detected
 *
 * Usage: node scripts/verify-ui-fixes.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const SRC_DIR = join(process.cwd(), "src");

const PATTERNS = [
  {
    name: "Arbitrary hex in Tailwind",
    regex: /\[#[0-9a-fA-F]{3,8}\]/g,
    severity: "error",
    suggestion: "Use a Tailwind color token from tailwind.config.ts",
    // Allow in CSS var references and comments
    exclude: /var\(--/,
  },
  {
    name: "Hardcoded rgba(255,255,255,...) border",
    regex: /rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[\d.]+\)/g,
    severity: "error",
    suggestion:
      "Use --color-glass-border, --color-glass-border-strong, or --color-glass-border-faint",
  },
  {
    name: "Old gold hex #f5c442",
    regex: /#f5c442/gi,
    severity: "warning",
    suggestion: "Use canonical gold #FBBF24 via brand-gold token",
  },
  {
    name: "Hardcoded silver #C0C0C0",
    regex: /#C0C0C0/gi,
    severity: "info",
    suggestion: "Use text-silver / bg-silver Tailwind token (OK in inline styles/SVG)",
    exclude: /RANK_|PODIUM_|THEME/,
  },
  {
    name: "Hardcoded bronze #CD7F32",
    regex: /#CD7F32/gi,
    severity: "info",
    suggestion: "Use text-bronze / bg-bronze Tailwind token (OK in inline styles/SVG)",
    exclude: /RANK_|PODIUM_|THEME/,
  },
];

/** Recursively get all .tsx files */
async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...(await getFiles(full)));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const files = await getFiles(SRC_DIR);
  let totalViolations = 0;
  let totalWarnings = 0;
  let totalInfos = 0;
  const violations = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const rel = relative(process.cwd(), filePath);

    for (const pattern of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip CSS-in-JS keyframes, comments, and CSS var references
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
        if (pattern.exclude && pattern.exclude.test(line)) continue;

        let match;
        pattern.regex.lastIndex = 0;
        while ((match = pattern.regex.exec(line)) !== null) {
          // Skip if inside a CSS var() call
          const before = line.substring(0, match.index);
          if (before.includes("var(--")) continue;

          violations.push({
            file: rel,
            line: i + 1,
            match: match[0],
            pattern: pattern.name,
            severity: pattern.severity,
            suggestion: pattern.suggestion,
          });

          if (pattern.severity === "error") {
            totalViolations++;
          } else if (pattern.severity === "warning") {
            totalWarnings++;
          } else {
            totalInfos++;
          }
        }
      }
    }
  }

  // Report
  console.log("\n🔍 UI Token Drift Verification");
  console.log("─".repeat(50));

  if (violations.length === 0) {
    console.log("✅ No design token drift detected!");
    console.log(`   Scanned ${files.length} files.`);
    process.exit(0);
  }

  // Group by file
  const grouped = {};
  for (const v of violations) {
    if (!grouped[v.file]) grouped[v.file] = [];
    grouped[v.file].push(v);
  }

  for (const [file, items] of Object.entries(grouped)) {
    console.log(`\n📄 ${file}`);
    for (const item of items) {
      const icon = item.severity === "error" ? "🔴" : item.severity === "warning" ? "🟡" : "ℹ️";
      console.log(
        `   ${icon} L${item.line}: ${item.pattern} → \`${item.match}\``
      );
      console.log(`      💡 ${item.suggestion}`);
    }
  }

  console.log("\n─".repeat(50));
  console.log(
    `${totalViolations} error(s), ${totalWarnings} warning(s), ${totalInfos} info(s) in ${Object.keys(grouped).length} file(s)`
  );

  if (totalViolations > 0) {
    console.log("\n❌ FAILED — fix errors before committing.");
    process.exit(1);
  } else {
    console.log(
      "\n⚠️  Warnings only — commit is OK but consider fixing these."
    );
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
