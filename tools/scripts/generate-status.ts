#!/usr/bin/env tsx
/**
 * tools/scripts/generate-status.ts
 *
 * Regenerates docs/STATUS.md from observable repo state + the hand-
 * curated docs/_status-state.yml. No external network calls except
 * GitHub Actions API (skipped if GH_TOKEN absent).
 *
 *   pnpm status            regenerate
 *   pnpm status:check      exit 1 if regeneration would change the file
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const TEMPLATE = join(ROOT, "docs/STATUS.md.tmpl");
const OUT = join(ROOT, "docs/STATUS.md");
const STATE_FILE = join(ROOT, "docs/_status-state.yml");
const CHECK = process.argv.includes("--check");

type Flag = "fixed" | "partial" | "open" | "blocked";
type Phase = "todo" | "in-progress" | "scaffolded" | "done";
type Manual = "todo" | "done" | "n/a";

interface State {
  migrationPhase: "not-started" | "in-progress" | "complete";
  redFlags: Record<string, Flag>;
  phases: Record<string, Phase>;
  manualSteps: Record<string, Manual>;
}

const FLAG_ICON: Record<Flag, string> = {
  fixed: "✅ fixed",
  partial: "🟡 partial",
  open: "🔴 open",
  blocked: "⏸️ blocked",
};

const PHASE_ICON: Record<Phase, string> = {
  todo: "🔴 todo",
  "in-progress": "🟡 in progress",
  scaffolded: "🟡 scaffolded (real impl pending)",
  done: "✅ done",
};

const MANUAL_ICON: Record<Manual, string> = {
  todo: "🔴 todo",
  done: "✅ done",
  "n/a": "—",
};

function sh(cmd: string, fallback = ""): string {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) {
    throw new Error(`Missing ${STATE_FILE}`);
  }
  return parseYaml(readFileSync(STATE_FILE, "utf8")) as State;
}

function fill(tmpl: string, key: string, value: string): string {
  return tmpl.split(`{{${key}}}`).join(value);
}

function rootVersion(): string {
  try {
    return (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string) ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function recentCommits(n = 10): string {
  const SEP = "\x1F"; // ASCII unit separator — safe from shell interpretation
  const formatStr = `%h${SEP}%s${SEP}%an${SEP}%ar`;
  const raw = sh(`git log -n ${n} --pretty=format:'${formatStr}'`);
  if (!raw) return "";
  const lines = raw.split("\n").filter(Boolean);
  return lines.map((l) => {
    const [sha, subject, author, when] = l.split(SEP);
    return `- \`${sha}\` ${subject} — _${author}, ${when}_`;
  }).join("\n");
}

function main(): void {
  const state = loadState();
  let out = readFileSync(TEMPLATE, "utf8");

  out = fill(out, "generatedAt", new Date().toISOString());
  out = fill(out, "commitSha", sh("git rev-parse --short HEAD"));
  out = fill(out, "branch", sh("git rev-parse --abbrev-ref HEAD"));
  out = fill(out, "rootVersion", rootVersion());
  out = fill(out, "migrationPhase", state.migrationPhase);

  for (const [k, v] of Object.entries(state.redFlags)) {
    out = fill(out, `red.${k}`, FLAG_ICON[v] ?? v);
  }
  for (const [k, v] of Object.entries(state.phases)) {
    out = fill(out, `phase.${k}`, PHASE_ICON[v] ?? v);
  }
  for (const [k, v] of Object.entries(state.manualSteps)) {
    out = fill(out, `manual.${k}`, MANUAL_ICON[v] ?? v);
  }
  out = fill(out, "recentCommits", recentCommits());

  if (CHECK) {
    const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    if (cur !== out) {
      console.error("docs/STATUS.md is stale — run `pnpm status` and commit.");
      process.exit(1);
    }
    process.exit(0);
  }
  writeFileSync(OUT, out);
  console.log(`Wrote docs/STATUS.md (${out.length} bytes)`);
}

main();
