#!/usr/bin/env node
/**
 * One-shot migration: rename game slug "mirage-realms" → "top-secret"
 * in the MongoDB arcade_scores collection on Railway.
 *
 * Usage (with mongosh on Railway):
 *   mongosh "$MONGODB_URL" --eval 'db.arcade_scores.updateMany({game:"mirage-realms"},{$set:{game:"top-secret"}})'
 *
 * Or via Railway CLI:
 *   railway run mongosh --eval 'db.arcade_scores.updateMany({game:"mirage-realms"},{$set:{game:"top-secret"}})'
 *
 * This script does the same via the MongoDB Node.js driver if you have
 * the connection string available as MONGODB_URL env var.
 */

const MONGODB_URL = process.env.MONGODB_URL;

if (!MONGODB_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════╗
║  MongoDB Score Migration: mirage-realms → top-secret     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  No MONGODB_URL env var found.                           ║
║                                                          ║
║  Run manually in Railway MongoDB console:                ║
║                                                          ║
║  db.arcade_scores.updateMany(                            ║
║    { game: "mirage-realms" },                            ║
║    { $set: { game: "top-secret" } }                      ║
║  )                                                       ║
║                                                          ║
║  Or via Railway CLI:                                     ║
║  railway run mongosh --eval \\                            ║
║    'db.arcade_scores.updateMany(                         ║
║      {game:"mirage-realms"},                             ║
║      {$set:{game:"top-secret"}}                          ║
║    )'                                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

async function migrate() {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(MONGODB_URL);

  try {
    await client.connect();
    const db = client.db(); // uses DB from connection string
    const result = await db.collection('arcade_scores').updateMany(
      { game: 'mirage-realms' },
      { $set: { game: 'top-secret' } }
    );
    console.log(`✅ Migration complete: ${result.modifiedCount} scores updated (mirage-realms → top-secret)`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
