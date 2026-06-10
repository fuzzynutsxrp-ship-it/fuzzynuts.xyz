#!/usr/bin/env node
/**
 * fetch-assets.js
 * Downloads game thumbnails from FreeToGame API and generates a local manifest.
 * Usage: node scripts/fetch-assets.js
 * No external dependencies — uses native fetch (Node 18+) and fs/promises.
 */

const fs = require('fs/promises');
const path = require('path');
const { Readable } = require('stream');

const API_URL = 'https://www.freetogame.com/api/games?platform=browser';
const LIMIT = 40;

const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'apps', 'web-arcade', 'public', 'preview', 'images', 'thumbnails');
const DATA_DIR = path.join(ROOT, 'apps', 'web-arcade', 'public', 'preview', 'data');
const MANIFEST = path.join(DATA_DIR, 'games.json');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.warn(`  SKIP ${path.basename(destPath)} — HTTP ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.warn(`  FAIL ${path.basename(destPath)} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Fetching game list from FreeToGame API...');
  const res = await fetch(API_URL, { redirect: 'follow' });
  if (!res.ok) {
    console.error(`API request failed: HTTP ${res.status}`);
    process.exit(1);
  }

  const games = await res.json();
  const subset = games.slice(0, LIMIT);
  console.log(`Processing ${subset.length} games...\n`);

  await ensureDir(IMG_DIR);
  await ensureDir(DATA_DIR);

  const manifest = [];
  let downloaded = 0;
  let skipped = 0;

  for (const game of subset) {
    const filename = `game-${game.id}.jpg`;
    const destPath = path.join(IMG_DIR, filename);
    const relThumb = `/preview/images/thumbnails/${filename}`;

    process.stdout.write(`[${game.id}] ${game.title}... `);
    const ok = await downloadImage(game.thumbnail, destPath);

    if (ok) {
      downloaded++;
      manifest.push({
        id: game.id,
        title: game.title,
        thumbnail: relThumb,
        category: game.genre || 'Unknown',
      });
      console.log('OK');
    } else {
      skipped++;
    }

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 150));
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\nDone.`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped:    ${skipped}`);
  console.log(`  Manifest:   ${MANIFEST}`);
  console.log(`  Images:     ${IMG_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
