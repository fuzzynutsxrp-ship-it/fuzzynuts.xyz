/**
 * RSC Account Creation Server
 *
 * Minimal Express server that creates Open-RSC game accounts in SQLite.
 * Called by the Railway API when a user claims a username.
 *
 * POST /create-account
 *   Headers: x-account-secret: <shared secret>
 *   Body: { username: string, password: string }
 *   Response: { success: true, username } or { success: false, error: string }
 *
 * Env vars:
 *   ACCOUNT_SECRET — shared secret header (required)
 *   DB_PATH        — path to openrsc.db (default: /opt/openrsc/server/openrsc.db)
 *   PORT           — listen port (default: 3001)
 */

const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
const ACCOUNT_SECRET = process.env.ACCOUNT_SECRET;
const DB_PATH = process.env.DB_PATH || '/opt/openrsc/server/openrsc.db';
const BCRYPT_ROUNDS = 10; // must match Open-RSC's bcryptWorkFactor

if (!ACCOUNT_SECRET) {
  console.error('FATAL: ACCOUNT_SECRET env var is required');
  process.exit(1);
}

// ── Database ───────────────────────────────────────────────────
const db = new Database(DB_PATH, { readonly: false });
db.pragma('journal_mode = WAL');

// Prepared statements
const stmtCheckExists = db.prepare('SELECT id FROM players WHERE username = ?');
const stmtInsert = db.prepare(`
  INSERT INTO players (username, email, pass, salt, creation_date, creation_ip)
  VALUES (?, NULL, ?, '', ?, ?)
`);
const stmtInitMaxStats = db.prepare(`
  INSERT INTO maxstats (playerId, statId, curLevel, baseLevel)
  VALUES (?, ?, ?, ?)
`);
const stmtInitStats = db.prepare(`
  INSERT INTO curstats (playerId, statId, curLevel, baseLevel)
  VALUES (?, ?, ?, ?)
`);
const stmtInitExp = db.prepare(`
  INSERT INTO experience (playerId, skillId, experience)
  VALUES (?, ?, ?)
`);

// Skill count — Open-RSC typically has 18 skills (0-17)
// Skill IDs: 0=Attack, 1=Defence, 2=Strength, 3=Hitpoints, 4=Ranged, 5=Prayer,
// 6=Magic, 7=Cooking, 8=Woodcutting, 9=Fletching, 10=Fishing, 11=Firemaking,
// 12=Crafting, 13=Smithing, 14=Mining, 15=Herblaw, 16=Agility, 17=Thieving
const SKILL_COUNT = 18;
const DEFAULT_LEVELS = [1, 1, 1, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // Hitpoints starts at 10

// ── Express ────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'rsc-account-server' });
});

// Create account
app.post('/create-account', (req, res) => {
  // Validate shared secret
  const secret = req.headers['x-account-secret'];
  if (secret !== ACCOUNT_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing username' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing password' });
  }
  if (!/^[a-zA-Z0-9]{3,12}$/.test(username)) {
    return res.status(400).json({ success: false, error: 'Invalid username format' });
  }

  // Check if username already exists
  const existing = stmtCheckExists.get(username);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Username already taken' });
  }

  try {
    // Hash password with bcrypt (matches Open-RSC's hashPassword(password, null))
    const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    // Insert player
    const creationDate = Math.floor(Date.now() / 1000);
    const creationIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
    const result = stmtInsert.run(username, hashedPassword, creationDate, creationIp);

    const playerId = result.lastInsertRowid;

    // Initialize maxstats, curstats, experience
    const initMaxStats = db.transaction(() => {
      for (let i = 0; i < SKILL_COUNT; i++) {
        const level = DEFAULT_LEVELS[i] || 1;
        stmtInitMaxStats.run(playerId, i, level, level);
        stmtInitStats.run(playerId, i, level, level);
        stmtInitExp.run(playerId, i, 0);
      }
    });
    initMaxStats();

    console.log(`[account] Created player: ${username} (id=${playerId})`);
    return res.json({ success: true, username });

  } catch (err) {
    console.error(`[account] Error creating ${username}:`, err.message);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[account] Server listening on 127.0.0.1:${PORT}`);
  console.log(`[account] Database: ${DB_PATH}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[account] Shutting down...');
  db.close();
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[account] Shutting down...');
  db.close();
  process.exit(0);
});
