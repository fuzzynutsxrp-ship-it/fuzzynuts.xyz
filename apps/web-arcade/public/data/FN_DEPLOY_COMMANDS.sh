# FuzzyNuts Phase 11 — Deployment Guide
# Copy-paste the commands below. No edits needed.

═══════════════════════════════════════════════════════════

## TASK 2 — Railway Deployment (Kaetram Express Server)

# 1. Clone the Kaetram backend repo (skip if already cloned)
cd ~
git clone https://github.com/fuzzynutsxrp-ship-it/kaetram-server.git
cd kaetram-server

# 2. Install helmet
npm install helmet

# 3. Create the CSP middleware file
cat > src/middleware/fn-csp.ts << 'MIDDLEWARE_EOF'
import helmet from 'helmet';
import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

// Helmet with strict frame-ancestors — only the lobby may embed us
router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:"],
        frameAncestors: [
          'https://www.fuzzynuts.xyz',
          'http://localhost:3000',
        ],
        frameSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Belt-and-suspenders for proxies that strip helmet headers
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://www.fuzzynuts.xyz http://localhost:3000"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

export default router;
MIDDLEWARE_EOF

# 4. Wire it into the main Express app (append before first app.listen or route)
#    If your entry is src/index.ts or src/app.ts, add this line near the top:
#
#    import fnCSP from './middleware/fn-csp';
#    app.use(fnCSP);
#
#    The exact insertion point depends on your file. Use this sed to add it
#    right after the express() call:

APP_FILE=$(grep -rl "express()" src/ --include="*.ts" --include="*.js" | head -1)
if [ -n "$APP_FILE" ]; then
  sed -i "/const app = express()/a\\import fnCSP from './middleware/fn-csp';\napp.use(fnCSP);" "$APP_FILE"
  echo "Injected into $APP_FILE"
else
  echo "MANUAL: Add these two lines to your Express entry file after the express() call:"
  echo "  import fnCSP from './middleware/fn-csp';"
  echo "  app.use(fnCSP);"
fi

# 5. Commit and push (triggers Railway auto-deploy)
git add -A
git commit -m "feat: CSP frame-ancestors + helmet security headers"
git push origin main

# 6. Verify Railway deployed (check logs)
#    railway logs --service kaetram


═══════════════════════════════════════════════════════════

## TASK 3 — VPS Deployment (Nginx CSP for game.fuzzynuts.xyz)

# 1. SSH into the VPS
ssh root@67.205.132.6

# 2. Find the Nginx server block for game.fuzzynuts.xyz
NGINX_CONF=$(grep -rl "game.fuzzynuts.xyz" /etc/nginx/ | head -1)
echo "Found: $NGINX_CONF"

# 3. Backup the config
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%s)"

# 4. Inject the CSP frame-ancestors header BEFORE the first location block
#    This uses sed to insert the add_header directives right after the server_name line.
sed -i '/server_name.*game.fuzzynuts.xyz/a\
\
    # FuzzyNuts Arcade — CSP frame-ancestors (Phase 11)\
    add_header Content-Security-Policy "frame-ancestors https://www.fuzzynuts.xyz http://localhost:3000" always;\
    add_header X-Frame-Options "ALLOW-FROM https://www.fuzzynuts.xyz" always;\
    add_header X-Content-Type-Options "nosniff" always;\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' "$NGINX_CONF"

# 5. Test the config
nginx -t
# Expected output: "syntax is ok" / "test is successful"

# 6. Reload Nginx (zero-downtime)
systemctl reload nginx

# 7. Verify the header is live
curl -sI https://game.fuzzynuts.xyz | grep -i "content-security-policy"
# Expected: Content-Security-Policy: frame-ancestors https://www.fuzzynuts.xyz http://localhost:3000

# 8. Done — exit VPS
exit


═══════════════════════════════════════════════════════════

## TASK 4 — Client-Side Injection (FN_AUTH_HANDSHAKE Listener)

# ── 4A. Kaetram Client (world.fuzzynuts.xyz) ──────────────
# File: client/src/game.ts  (or whichever file initializes the game loop)
# Injection point: AFTER the connection/socket module is imported,
# BEFORE the game loop starts.
#
# If Kaetram uses Vite/webpack, add this as a new file:
#   client/src/network/fn-auth-bridge.ts

cat > /tmp/fn-auth-bridge.ts << 'BRIDGE_EOF'
/**
 * FuzzyNuts Auth Bridge — inject into Kaetram client.
 * Listens for FN_AUTH_HANDSHAKE from the lobby parent frame.
 */
const TRUSTED_PARENT_ORIGINS = new Set([
  'https://www.fuzzynuts.xyz',
  'http://localhost:3000',
]);

let authenticated = false;

window.addEventListener('message', (event: MessageEvent) => {
  if (!TRUSTED_PARENT_ORIGINS.has(event.origin)) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'FN_AUTH_HANDSHAKE') {
    if (authenticated) return;
    if (!msg.token || typeof msg.token !== 'string') return;

    // Store in memory ONLY — never localStorage
    (window as any).__FN_AUTH_TOKEN__ = msg.token;
    (window as any).__FN_AUTH_GAME_ID__ = msg.gameId;
    authenticated = true;

    // ACK back to parent
    event.source?.postMessage(
      { type: 'FN_AUTH_ACK', gameId: msg.gameId, timestamp: Date.now() },
      event.origin
    );

    // ── Auto-login: call Kaetram's connection module ──
    // Uncomment when ready:
    // app.game.connection.loginWithToken(msg.token);
    console.info('[FN-Auth] Handshake complete for', msg.gameId);
  }

  if (msg.type === 'FN_AUTH_REVOKE') {
    (window as any).__FN_AUTH_TOKEN__ = null;
    authenticated = false;
  }
});

// Signal readiness to parent
if (window.parent !== window) {
  window.parent.postMessage(
    { type: 'FN_GAME_READY', timestamp: Date.now() },
    '*'
  );
}
BRIDGE_EOF

# To apply to Kaetram:
#   cp /tmp/fn-auth-bridge.ts ~/kaetram-server/client/src/network/fn-auth-bridge.ts
#   # Then in client/src/app.ts or game.ts, add at the top:
#   import './network/fn-auth-bridge';


# ── 4B. Open-RSC / TeaVM Client (game.fuzzynuts.xyz) ─────
# File: /var/www/rsc-client/teavm-bootstrap.js  (the entry script served to browsers)
# Injection point: AFTER the TeaVM runtime loads, BEFORE the game main() is called.
#
# The TeaVM bootstrap file is already served from the VPS. Add this block at the end:

ssh root@67.205.132.6 << 'VPS_EOF'
cat >> /var/www/rsc-client/teavm-bootstrap.js << 'TEAVM_BRIDGE_EOF'

// ── FuzzyNuts Auth Bridge (Phase 11) ──────────────────────
(function() {
  'use strict';
  var TRUSTED = {'https://www.fuzzynuts.xyz':1, 'http://localhost:3000':1};
  var authed = false;

  window.addEventListener('message', function(event) {
    if (!TRUSTED[event.origin]) return;
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'FN_AUTH_HANDSHAKE' && !authed) {
      if (!msg.token || typeof msg.token !== 'string') return;
      window.__FN_AUTH_TOKEN__ = msg.token;
      window.__FN_AUTH_GAME_ID__ = msg.gameId;
      authed = true;

      event.source.postMessage(
        {type:'FN_AUTH_ACK', gameId:msg.gameId, timestamp:Date.now()},
        event.origin
      );

      // ── Auto-login: pass token to TeaVM Java layer ──
      // Uncomment when Open-RSC client exposes this:
      // teavmInterop.call('org.openrsc.client.Auth.setToken', msg.token);
      console.info('[FN-Auth] Handshake complete for', msg.gameId);
    }

    if (msg.type === 'FN_AUTH_REVOKE') {
      window.__FN_AUTH_TOKEN__ = null;
      authed = false;
    }
  });

  if (window.parent !== window) {
    window.parent.postMessage({type:'FN_GAME_READY', timestamp:Date.now()}, '*');
  }
})();
TEAVM_BRIDGE_EOF

echo "TeaVM auth bridge injected."
VPS_EOF
