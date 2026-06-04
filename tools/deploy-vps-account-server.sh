#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  deploy-vps-account-server.sh
#
#  Deploys the RSC account creation server on the VPS.
#  Creates a systemd service that runs on port 3001 (localhost only).
#
#  RUN ON VPS (copy-paste into DigitalOcean console):
#    curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/deploy-vps-account-server.sh | bash
#
#  After running, copy the ACCOUNT_SECRET value and add it to Railway:
#    VPS_ACCOUNT_URL = http://127.0.0.1:3001
#    VPS_ACCOUNT_SECRET = <the secret printed by this script>
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

INSTALL_DIR="/opt/account-server"
DB_PATH="/opt/openrsc/server/inc/sqlite/preservation.db"
SERVICE_NAME="account-server"

echo "═══════════════════════════════════════════════════════"
echo " RSC Account Server Deployment"
echo "═══════════════════════════════════════════════════════"

# ── Check prerequisites ──
if [ ! -f "$DB_PATH" ]; then
  echo "✗ Database not found at $DB_PATH"
  echo "  Make sure Open-RSC is installed and the server has been started at least once."
  exit 1
fi

# ── Check if Node.js is installed ──
if ! command -v node &>/dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "✓ Node.js $(node -v)"

# ── Create install directory ──
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# ── Generate or read secret ──
SECRET_FILE="$INSTALL_DIR/.account_secret"
if [ -f "$SECRET_FILE" ]; then
  ACCOUNT_SECRET=$(cat "$SECRET_FILE")
  echo "✓ Using existing secret"
else
  ACCOUNT_SECRET=$(openssl rand -hex 32)
  echo "$ACCOUNT_SECRET" > "$SECRET_FILE"
  chmod 600 "$SECRET_FILE"
  echo "✓ Generated new secret"
fi

# ── Create package.json ──
cat > package.json << 'PKGEOF'
{
  "name": "rsc-account-server",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.7.0",
    "express": "^4.21.0"
  }
}
PKGEOF

# ── Create server.js ──
cat > server.js << 'SERVEREOF'
const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const PORT = parseInt(process.env.PORT || '3001', 10);
const ACCOUNT_SECRET = process.env.ACCOUNT_SECRET;
const DB_PATH = process.env.DB_PATH || '/opt/openrsc/server/openrsc.db';
const BCRYPT_ROUNDS = 10;

if (!ACCOUNT_SECRET) {
  console.error('FATAL: ACCOUNT_SECRET env var is required');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: false });
db.pragma('journal_mode = WAL');

const stmtCheck = db.prepare('SELECT id FROM players WHERE username = ?');
const stmtInsert = db.prepare(
  'INSERT INTO players (username, email, pass, salt, creation_date, creation_ip) VALUES (?, NULL, ?, ?, ?, ?)'
);
const stmtMaxStats = db.prepare(
  'INSERT INTO maxstats (playerId, statId, curLevel, baseLevel) VALUES (?, ?, ?, ?)'
);
const stmtCurStats = db.prepare(
  'INSERT INTO curstats (playerId, statId, curLevel, baseLevel) VALUES (?, ?, ?, ?)'
);
const stmtExp = db.prepare(
  'INSERT INTO experience (playerId, skillId, experience) VALUES (?, ?, ?)'
);

const SKILL_COUNT = 18;
const DEFAULT_LEVELS = [1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,1,1];

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/create-account', (req, res) => {
  if (req.headers['x-account-secret'] !== ACCOUNT_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  if (!/^[a-zA-Z0-9]{3,12}$/.test(username)) {
    return res.status(400).json({ success: false, error: 'Invalid username' });
  }

  if (stmtCheck.get(username)) {
    return res.status(409).json({ success: false, error: 'Username already taken' });
  }

  try {
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const now = Math.floor(Date.now() / 1000);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';
    const result = stmtInsert.run(username, hash, '', now, ip);
    const playerId = result.lastInsertRowid;

    const initAll = db.transaction(() => {
      for (let i = 0; i < SKILL_COUNT; i++) {
        const lvl = DEFAULT_LEVELS[i] || 1;
        stmtMaxStats.run(playerId, i, lvl, lvl);
        stmtCurStats.run(playerId, i, lvl, lvl);
        stmtExp.run(playerId, i, 0);
      }
    });
    initAll();

    console.log(`[account] Created: ${username} (id=${playerId})`);
    return res.json({ success: true, username });
  } catch (err) {
    console.error(`[account] Error:`, err.message);
    return res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[account] Listening on 127.0.0.1:${PORT}`);
  console.log(`[account] DB: ${DB_PATH}`);
});

process.on('SIGTERM', () => { db.close(); process.exit(0); });
process.on('SIGINT', () => { db.close(); process.exit(0); });
SERVEREOF

# ── Install dependencies ──
echo "Installing npm dependencies..."
npm install --production 2>&1 | tail -3

# ── Create systemd service ──
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=RSC Account Creation Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/node server.js
Environment=ACCOUNT_SECRET=${ACCOUNT_SECRET}
Environment=DB_PATH=${DB_PATH}
Environment=PORT=3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ── Start service ──
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

sleep 2

# ── Verify ──
if systemctl is-active --quiet ${SERVICE_NAME}; then
  echo "✓ Service running"
else
  echo "✗ Service failed to start. Check: journalctl -u ${SERVICE_NAME} -n 20"
  exit 1
fi

HEALTH=$(curl -s http://127.0.0.1:3001/health 2>/dev/null || echo "unreachable")
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "✓ Health check passed"
else
  echo "✗ Health check failed: $HEALTH"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✓ ACCOUNT SERVER DEPLOYED"
echo ""
echo " Add these env vars to Railway (fuzzynuts.xyz API service):"
echo ""
echo "   VPS_ACCOUNT_URL = http://127.0.0.1:3001"
echo "   VPS_ACCOUNT_SECRET = ${ACCOUNT_SECRET}"
echo ""
echo " Then redeploy Railway."
echo ""
echo " Service commands:"
echo "   systemctl status ${SERVICE_NAME}"
echo "   journalctl -u ${SERVICE_NAME} -f"
echo "   systemctl restart ${SERVICE_NAME}"
echo ""
echo " Secret saved at: ${SECRET_FILE}"
echo "═══════════════════════════════════════════════════════"
