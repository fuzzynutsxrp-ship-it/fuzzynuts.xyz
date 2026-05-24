#!/usr/bin/env node
/**
 * optimize-hero-video.mjs — H.264 + WebP fallback in one pass.
 *
 * Usage:
 *   node scripts/optimize-hero-video.mjs <input-video-path>
 *
 * Examples:
 *   node scripts/optimize-hero-video.mjs public/videos/raw-input.mov
 *   node scripts/optimize-hero-video.mjs ~/Desktop/concept-art-loop.mp4
 *
 * What it does:
 *   1. Re-encodes the input to H.264, 1920x1080, 30fps, ~2 Mbps
 *      with a faststart moov atom so the browser can begin playback
 *      before the whole file finishes downloading.
 *   2. Strips audio entirely (the hero is muted-only).
 *   3. Extracts the first frame as a WebP at q=85 — used as the
 *      <video> poster and as the fallback <Image> when the video
 *      element fails.
 *   4. Prints before/after file sizes.
 *
 * Requirements:
 *   - ffmpeg installed and on PATH (`brew install ffmpeg` /
 *     `apt-get install ffmpeg` / etc.). The script intentionally
 *     uses the `fluent-ffmpeg` Node wrapper as specified in the
 *     brief; install it with `npm install --no-save fluent-ffmpeg`
 *     before running.
 */
import { existsSync, statSync, mkdirSync } from "node:fs";
import { dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = dirname(dirname(__filename));

const TARGET_VIDEO = join(REPO_ROOT, "public", "videos", "hero-background.mp4");
const TARGET_WEBP = join(REPO_ROOT, "public", "images", "hero-fallback.webp");

const VIDEO_BITRATE = "2M";
const VIDEO_MAX_BITRATE = "2.4M";
const VIDEO_BUF = "4M";
const TARGET_W = 1920;
const TARGET_H = 1080;
const TARGET_FPS = 30;

function bytesToMB(b) {
  return (b / (1024 * 1024)).toFixed(2);
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/optimize-hero-video.mjs <input>");
    process.exit(1);
  }
  if (!existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }

  let ffmpeg;
  try {
    ffmpeg = (await import("fluent-ffmpeg")).default;
  } catch {
    console.error(
      "fluent-ffmpeg not installed. Run:\n  npm install --no-save fluent-ffmpeg\nand make sure the `ffmpeg` binary is on your PATH.",
    );
    process.exit(1);
  }

  mkdirSync(dirname(TARGET_VIDEO), { recursive: true });
  mkdirSync(dirname(TARGET_WEBP), { recursive: true });

  const inputBytes = statSync(input).size;
  console.log(
    `\n→ input:  ${basename(input)}  (${bytesToMB(inputBytes)} MB)\n`,
  );

  // ── Pass 1: optimized MP4 ──
  await new Promise((resolve, reject) => {
    ffmpeg(input)
      .videoCodec("libx264")
      .outputOptions([
        "-profile:v high",
        "-level:v 4.1",
        "-preset slow",
        `-b:v ${VIDEO_BITRATE}`,
        `-maxrate ${VIDEO_MAX_BITRATE}`,
        `-bufsize ${VIDEO_BUF}`,
        "-pix_fmt yuv420p",
        "-movflags +faststart",
        "-an",
      ])
      .size(`${TARGET_W}x${TARGET_H}`)
      .fps(TARGET_FPS)
      .on("progress", (p) => {
        if (p.percent) process.stdout.write(`\r  encoding ${p.percent.toFixed(0)}%`);
      })
      .on("end", () => {
        process.stdout.write("\r  encoded.            \n");
        resolve();
      })
      .on("error", reject)
      .save(TARGET_VIDEO);
  });

  // ── Pass 2: WebP first frame for fallback / poster ──
  await new Promise((resolve, reject) => {
    ffmpeg(TARGET_VIDEO)
      .outputOptions(["-frames:v 1", "-c:v libwebp", "-quality 85"])
      .on("end", resolve)
      .on("error", reject)
      .save(TARGET_WEBP);
  });

  const outBytes = statSync(TARGET_VIDEO).size;
  const webpBytes = statSync(TARGET_WEBP).size;
  console.log(
    [
      `\n✓ done.`,
      `  video → ${TARGET_VIDEO.replace(REPO_ROOT + "/", "")}  ${bytesToMB(outBytes)} MB`,
      `  webp  → ${TARGET_WEBP.replace(REPO_ROOT + "/", "")}   ${bytesToMB(webpBytes)} MB`,
      `  reduction: ${((1 - outBytes / inputBytes) * 100).toFixed(1)}% (${bytesToMB(inputBytes - outBytes)} MB saved)`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error("\n✗ failed:", err.message ?? err);
  process.exit(1);
});
