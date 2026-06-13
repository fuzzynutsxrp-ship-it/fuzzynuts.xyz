#!/usr/bin/env node
/**
 * patch-auth-routes.js
 *
 * Replaces the mock wallet flow in public/js/auth.js with the real
 * Xaman SDK sign-in flow:
 *   POST /api/auth/xaman/payload   → get QR + deeplink
 *   GET  /api/auth/xaman/status/:uuid → poll until signed
 *   POST /api/auth/wallet-login     → exchange for JWT cookie
 *
 * Idempotent: re-running on an already-patched file is a no-op.
 *
 * Usage:
 *   node scripts/patch-auth-routes.js
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_JS = resolve(__dirname, '..', 'apps', 'web-arcade', 'public', 'js', 'auth.js');

const MARKER = '// ─── XAMAN REAL FLOW (auto-patched)';

const NEW_HANDLE_CONNECT = `${MARKER} ──────────────
  async function handleConnect(e) {
    if (e) e.preventDefault();
    if (connectLinks.some(el => el.classList.contains('is-loading'))) return;

    setConnectLoading(true);

    // ── Inject QR overlay styles (once) ──
    if (!document.getElementById('fn-xaman-styles')) {
      const style = document.createElement('style');
      style.id = 'fn-xaman-styles';
      style.textContent = [
        '.fn-xaman-overlay{position:fixed;inset:0;z-index:99999;',
        'background:rgba(0,0,0,.85);display:flex;align-items:center;',
        'justify-content:center;}',
        '.fn-xaman-modal{background:#120a22;border:1px solid #7c3aed;',
        'border-radius:1rem;padding:2rem;text-align:center;max-width:360px;',
        'width:90%;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;}',
        '.fn-xaman-modal h3{margin:0 0 .75rem;font-size:1.125rem;color:#FBBF24;}',
        '.fn-xaman-modal img{width:200px;height:200px;border-radius:.5rem;',
        'margin:0 1rem;background:#fff;padding:.5rem;}',
        '.fn-xaman-modal p{margin:.75rem 0 .5rem;font-size:.8rem;color:#94a3b8;}',
        '.fn-xaman-deeplink{display:inline-block;margin-top:.5rem;padding:.5rem 1.5rem;',
        'background:#7c3aed;color:#fff;border-radius:.5rem;text-decoration:none;',
        'font-weight:600;font-size:.875rem;transition:background .15s;}',
        '.fn-xaman-deeplink:hover{background:#6d28d9;}',
        '.fn-xaman-cancel{display:block;margin-top:.75rem;background:none;',
        'border:none;color:#94a3b8;cursor:pointer;font-size:.75rem;}',
        '.fn-xaman-status{margin-top:.5rem;font-size:.75rem;color:#10B981;}',
      ].join('');
      document.head.appendChild(style);
    }

    try {
      // ── Step 1: Create Xaman payload ──
      const payloadRes = await fetch(API_BASE + '/api/auth/xaman/payload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (!payloadRes.ok) {
        console.warn('[auth] Xaman payload creation failed:', payloadRes.status);
        setConnectLoading(false);
        return;
      }

      const { uuid, qr_png, deeplink } = await payloadRes.json();

      // ── Step 2: Show QR overlay ──
      const overlay = document.createElement('div');
      overlay.className = 'fn-xaman-overlay';
      overlay.innerHTML =
        '<div class="fn-xaman-modal">' +
          '<h3>Sign in to FuzzyNuts</h3>' +
          '<img src="' + qr_png + '" alt="Scan with Xaman" />' +
          '<p>Scan with Xaman or tap below on mobile</p>' +
          '<a class="fn-xaman-deeplink" href="' + deeplink + '" ' +
            'target="_blank" rel="noopener">Open in Xaman</a>' +
          '<button class="fn-xaman-cancel">Cancel</button>' +
          '<div class="fn-xaman-status">Waiting for signature…</div>' +
        '</div>';
      document.body.appendChild(overlay);

      const statusEl = overlay.querySelector('.fn-xaman-status');
      const cancelBtn = overlay.querySelector('.fn-xaman-cancel');

      let cancelled = false;
      let pollTimer = null;

      function cleanup() {
        cancelled = true;
        if (pollTimer) clearInterval(pollTimer);
        overlay.remove();
        setConnectLoading(false);
      }

      cancelBtn.addEventListener('click', cleanup);
      overlay.addEventListener('click', function(ev) {
        if (ev.target === overlay) cleanup();
      });

      // ── Step 3: Poll for signature ──
      pollTimer = setInterval(async () => {
        if (cancelled) return;
        try {
          const statusRes = await fetch(
            API_BASE + '/api/auth/xaman/status/' + uuid,
            { credentials: 'include', headers: { 'Accept': 'application/json' } }
          );
          if (!statusRes.ok) return;
          const status = await statusRes.json();

          if (status.resolved && status.signed) {
            // ── Step 4: Exchange for JWT ──
            clearInterval(pollTimer);
            if (statusEl) statusEl.textContent = 'Signed! Logging in…';

            const loginRes = await fetch(API_BASE + '/api/auth/wallet-login', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uuid: uuid, address: status.address }),
            });

            cleanup();
            if (loginRes.ok) {
              await checkSession();
            } else {
              console.warn('[auth] Wallet login exchange failed:', loginRes.status);
            }
          } else if (status.resolved && !status.signed) {
            clearInterval(pollTimer);
            if (statusEl) statusEl.textContent = 'Signature rejected or expired.';
            setTimeout(cleanup, 2000);
          }
          // else still pending — keep polling
        } catch (pollErr) {
          console.warn('[auth] Poll error:', pollErr.message);
        }
      }, 2000);

      // Auto-expire after 2 minutes
      setTimeout(function() {
        if (!cancelled) {
          if (statusEl) statusEl.textContent = 'Request expired.';
          setTimeout(cleanup, 1500);
        }
      }, 120000);

    } catch (err) {
      console.warn('[auth] Xaman connect error:', err.message);
      setConnectLoading(false);
    }
  }`;

// ── Main ────────────────────────────────────────────────────────

const original = readFileSync(AUTH_JS, 'utf-8');

// Idempotency check
if (original.includes(MARKER)) {
  console.log('✅ auth.js already patched — skipping.');
  process.exit(0);
}

// Find the old handleConnect function boundaries
// Match: "  async function handleConnect(e) {" ... up to the next function-level declaration
const funcStart = original.indexOf('  async function handleConnect');
if (funcStart === -1) {
  console.error('❌ Could not locate handleConnect function in auth.js');
  process.exit(1);
}

// Find the closing of handleConnect by tracking braces from the function start
let braceDepth = 0;
let funcEnd = -1;
let inFunc = false;
for (let i = funcStart; i < original.length; i++) {
  if (original[i] === '{') {
    braceDepth++;
    inFunc = true;
  } else if (original[i] === '}') {
    braceDepth--;
    if (inFunc && braceDepth === 0) {
      funcEnd = i + 1;
      break;
    }
  }
}

if (funcEnd === -1) {
  console.error('❌ Could not find end of handleConnect function');
  process.exit(1);
}

// Replace the old function with the new one
const patched = original.slice(0, funcStart) + NEW_HANDLE_CONNECT + original.slice(funcEnd);

writeFileSync(AUTH_JS, patched, 'utf-8');
console.log('✅ auth.js patched with real Xaman SDK flow.');
console.log('   Routes: POST /api/auth/xaman/payload');
console.log('           GET  /api/auth/xaman/status/:uuid');
console.log('           POST /api/auth/wallet-login');
