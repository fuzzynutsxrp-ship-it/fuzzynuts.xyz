/*  ═══════════════════════════════════════════════════════════════
 *  FuzzyNuts Arcade — Server Security Headers
 *  Deliverable 1a: Express.js middleware (Railway / Kaetram)
 *  Deliverable 1b: Nginx config (VPS / Open-RSC)
 *  Deliverable 4:  Child-side postMessage listener
 *  ═══════════════════════════════════════════════════════════════ */

// ─── 1a. Express.js Middleware (Railway / world.fuzzynuts.xyz) ─────
// Install: npm i helmet
// Apply BEFORE all route handlers.

const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "https://world.fuzzynuts.xyz"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss://world.fuzzynuts.xyz"],
        frameAncestors: [
          "https://www.fuzzynuts.xyz",
          "http://localhost:3000",
        ],
        // Disallow framing from everything else
        frameSrc: ["'self'"],
      },
    },
    // Prevent MIME sniffing
    crossOriginEmbedderPolicy: false,  // disable if TeaVM assets are cross-origin
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Additional manual header (belt-and-suspenders for older proxies)
app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors https://www.fuzzynuts.xyz http://localhost:3000"
  );
  res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.fuzzynuts.xyz');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});


// ─── 1b. Nginx Config (VPS / game.fuzzynuts.xyz) ─────────────────
// Add inside the `server { }` block for game.fuzzynuts.xyz.
// Place AFTER any existing `add_header` directives (Nginx inheritance
// quirk: add_header in a block discards parent-level add_headers).

/*
server {
    listen 443 ssl http2;
    server_name game.fuzzynuts.xyz;

    # ... ssl_certificate, proxy_pass, etc. ...

    # ── Security headers ──────────────────────────────────────
    # frame-ancestors: ONLY the lobby and localhost may embed this
    add_header Content-Security-Policy
        "frame-ancestors https://www.fuzzynuts.xyz http://localhost:3000"
        always;

    # Modern replacement for X-Frame-Options (CSP takes precedence)
    add_header X-Frame-Options "ALLOW-FROM https://www.fuzzynuts.xyz" always;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "fullscreen=(self)" always;

    # ── WebSocket upgrade for TeaVM / Kaetram ─────────────────
    # (if not already configured)
    location /ws {
        proxy_pass http://127.0.0.1:43494;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
*/


// ─── 4. Child-Side postMessage Listener ──────────────────────────
// Inject this into Kaetram (world.fuzzynuts.xyz) and
// TeaVM/Open-RSC (game.fuzzynuts.xyz) game clients.
// Call ONCE during client bootstrap, BEFORE the game loop starts.

/*
(function() {
  'use strict';

  const TRUSTED_PARENT_ORIGINS = new Set([
    'https://www.fuzzynuts.xyz',
    'http://localhost:3000',
  ]);

  // Track auth state
  let authenticated = false;

  window.addEventListener('message', function(event) {
    // ── Origin verification (CRITICAL — never skip) ──
    if (!TRUSTED_PARENT_ORIGINS.has(event.origin)) {
      console.warn('[FN-Child] Rejected message from untrusted origin:', event.origin);
      return;
    }

    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {

      case 'FN_AUTH_HANDSHAKE':
        // Parent is sending us the XRP wallet session token
        if (authenticated) return; // ignore duplicates
        if (!msg.token || typeof msg.token !== 'string') {
          console.warn('[FN-Child] Handshake missing token');
          return;
        }

        // Store in memory ONLY — never localStorage
        window.__FN_AUTH_TOKEN__ = msg.token;
        window.__FN_AUTH_GAME_ID__ = msg.gameId;
        authenticated = true;

        // ACK back to parent so it knows we received the token
        event.source.postMessage({
          type: 'FN_AUTH_ACK',
          gameId: msg.gameId,
          timestamp: Date.now()
        }, event.origin);

        console.info('[FN-Child] Auth handshake complete for game:', msg.gameId);

        // ── Trigger auto-login here ──
        // Example for Kaetram:
        //   connection.loginWithToken(window.__FN_AUTH_TOKEN__);
        // Example for TeaVM:
        //   teavmInterop.call("org.openrsc.client.Auth.setToken", msg.token);
        break;

      case 'FN_AUTH_REVOKE':
        // Parent is revoking the session (e.g. user logged out)
        window.__FN_AUTH_TOKEN__ = null;
        authenticated = false;
        console.info('[FN-Child] Auth revoked by parent');
        // Disconnect the player / return to login screen
        break;

      default:
        // Unknown message type — ignore silently
        break;
    }
  });

  // Signal to parent that we're ready to receive auth
  // (only works if parent is same-origin or we know the origin)
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'FN_GAME_READY',
      timestamp: Date.now()
    }, '*'); // broad target — parent will verify our origin
  }
})();
*/
