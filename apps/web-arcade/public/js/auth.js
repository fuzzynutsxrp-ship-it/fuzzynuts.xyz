/**
 * auth.js — FuzzyNuts Wallet & Session Bridge
 * Vanilla JS module. No external dependencies.
 * All API calls use credentials: 'include' for HttpOnly cookie auth.
 *
 * Wallet connection uses the Xaman (Xumm) SDK OAuth2 PKCE flow.
 * The SDK is loaded dynamically from CDN on first connect.
 *
 * Configuration:
 *   The Xaman API key is read from (in order):
 *     1. window.__XAMAN_API_KEY__ global
 *     2. <meta name="xaman-api-key" content="..."> tag
 *     3. <script data-xaman-key="..."> attribute on this script tag
 */
(() => {
  'use strict';

  const API_BASE = '';  // same-origin; Railway Express is proxied via Vercel rewrites
  const XUMM_CDN = 'https://xumm.app/assets/cdn/xumm.min.js';
  const CONNECT_TIMEOUT_MS = 90_000;

  // ─── DOM refs (resolved on init) ───────────────────────────────
  let avatarBtn, avatarIcon, dropdown, logoutLink, connectLinks;

  // ─── State ─────────────────────────────────────────────────────
  let currentUser = null;
  let checking = false;
  let xummInstance = null;

  // ─── Helpers ───────────────────────────────────────────────────
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr || '?';
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  /**
   * Resolve the Xaman API key from available sources.
   * Returns null if not configured.
   */
  function getXamanApiKey() {
    // 1. Global variable
    if (typeof window.__XAMAN_API_KEY__ === 'string' && window.__XAMAN_API_KEY__) {
      return window.__XAMAN_API_KEY__;
    }
    // 2. Meta tag
    const meta = qs('meta[name="xaman-api-key"]');
    if (meta && meta.getAttribute('content')) {
      return meta.getAttribute('content');
    }
    // 3. Script data attribute
    const script = qs('script[src*="auth.js"]');
    if (script && script.getAttribute('data-xaman-key')) {
      return script.getAttribute('data-xaman-key');
    }
    return null;
  }

  // ─── Xaman SDK Loader ──────────────────────────────────────────
  function loadXummScript() {
    return new Promise(function(resolve, reject) {
      if (window.Xumm) { resolve(); return; }

      var existing = qs('script[src*="xumm.min.js"]');
      if (existing) {
        existing.addEventListener('load', function() { resolve(); });
        existing.addEventListener('error', function() {
          reject(new Error('Failed to load Xaman SDK'));
        });
        return;
      }

      var script = document.createElement('script');
      script.src = XUMM_CDN;
      script.async = true;
      script.onload = function() {
        // Global registration can lag by a tick
        setTimeout(function() {
          if (window.Xumm) resolve();
          else reject(new Error('Xaman SDK loaded but Xumm class not found'));
        }, 100);
      };
      script.onerror = function() {
        reject(new Error('Failed to load Xaman SDK — check your internet connection'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Get or create the Xumm SDK instance.
   * Requires an API key from configuration.
   */
  async function ensureXumm() {
    if (xummInstance) return xummInstance;

    var apiKey = getXamanApiKey();
    if (!apiKey) {
      throw new Error('Xaman API key not configured. Please set window.__XAMAN_API_KEY__ or add a <meta name="xaman-api-key"> tag.');
    }

    await loadXummScript();
    if (!window.Xumm) throw new Error('Xaman SDK failed to initialize');

    xummInstance = new window.Xumm(apiKey);
    return xummInstance;
  }

  /**
   * Read the wallet address from the Xumm instance.
   * The SDK exposes user.account as either a Promise or a primitive.
   */
  async function readXummAccount(xumm) {
    try {
      var fromUser = await xumm.user.account;
      var account = fromUser || (xumm.state && xumm.state.account);
      // Exactly 34 chars: r + 33 base58 chars (matches tightened server regex)
      if (typeof account === 'string' && /^r[1-9A-HJ-NP-Za-km-z]{33}$/.test(account)) {
        return account;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ─── UI Updates ────────────────────────────────────────────────
  function setAuthenticated(user) {
    currentUser = user;
    var display = user.address || user.username || 'User';
    var initials = getInitials(display);

    // Replace avatar icon SVG with initials circle
    if (avatarBtn) {
      avatarBtn.innerHTML =
        '<span class="fn-avatar-initials">' + initials + '</span>';
      avatarBtn.setAttribute('aria-label', shortenAddress(display));
    }

    // Show Profile + Logout in dropdown, hide Connect Wallet
    if (dropdown) {
      var profileLink = qs('.fn-dropdown__item[href="/profile"]', dropdown);
      if (profileLink) profileLink.closest('li').style.display = '';
      if (logoutLink) logoutLink.closest('li').style.display = '';
    }

    // Hide all Connect Wallet triggers
    connectLinks.forEach(function(el) { el.style.display = 'none'; });
  }

  function setUnauthenticated() {
    currentUser = null;

    // Restore default avatar icon
    if (avatarBtn) {
      avatarBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
        '<circle cx="12" cy="7" r="4"/></svg>';
      avatarBtn.setAttribute('aria-label', 'Profile menu');
    }

    // Hide Profile + Logout, show Connect Wallet
    if (dropdown) {
      var profileLink = qs('.fn-dropdown__item[href="/profile"]', dropdown);
      if (profileLink) profileLink.closest('li').style.display = 'none';
      if (logoutLink) logoutLink.closest('li').style.display = 'none';
    }

    connectLinks.forEach(function(el) { el.style.display = ''; });
  }

  function setConnectLoading(loading) {
    connectLinks.forEach(function(el) {
      if (loading) {
        el.classList.add('is-loading');
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.classList.remove('is-loading');
        el.removeAttribute('aria-disabled');
      }
    });
  }

  // ─── API: checkSession ────────────────────────────────────────
  async function checkSession() {
    if (checking) return;
    checking = true;
    try {
      var res = await fetch(API_BASE + '/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        var data = await res.json();
        setAuthenticated(data.user || data);
      } else {
        setUnauthenticated();
      }
    } catch (err) {
      console.warn('[auth] Session check failed:', err.message);
      setUnauthenticated();
    } finally {
      checking = false;
    }
  }

  // ─── API: handleConnect (real Xaman OAuth flow) ───────────────
  async function handleConnect(e) {
    if (e) e.preventDefault();
    if (connectLinks.some(function(el) { return el.classList.contains('is-loading'); })) return;

    setConnectLoading(true);

    try {
      // 1. Initialize Xaman SDK + start OAuth2 PKCE flow
      var xumm = await ensureXumm();

      var address = await new Promise(function(resolve, reject) {
        var timeout = setTimeout(function() {
          cleanup();
          reject(new Error('Connection timed out. Complete sign-in in the Xaman popup, or allow pop-ups for this site.'));
        }, CONNECT_TIMEOUT_MS);

        function cleanup() {
          clearTimeout(timeout);
          try { xumm.off('success', onSuccess); } catch (e) {}
          try { xumm.off('retrieved', onSuccess); } catch (e) {}
          try { xumm.off('error', onError); } catch (e) {}
        }

        function onSuccess() {
          readXummAccount(xumm).then(function(account) {
            if (account) {
              cleanup();
              resolve(account);
            } else {
              cleanup();
              reject(new Error('Xaman returned no wallet address. Please try again.'));
            }
          });
        }

        function onError(err) {
          cleanup();
          var message = (err instanceof Error) ? err.message : String(err || 'Unknown error');
          if (message.indexOf('closed') !== -1 || message.indexOf('rejected') !== -1) {
            reject(new Error('Sign-in was cancelled. Click Connect to try again.'));
          } else if (message.indexOf('popup') !== -1) {
            reject(new Error('Pop-up was blocked. Allow pop-ups for this site and try again.'));
          } else {
            reject(new Error('Xaman error: ' + message));
          }
        }

        xumm.on('retrieved', onSuccess);
        xumm.on('success', onSuccess);
        xumm.on('error', onError);

        var p = xumm.authorize();
        if (p && typeof p.catch === 'function') {
          p.catch(function() { /* events drive resolution */ });
        }
      });

      // 2. Get the OAuth token from the Xaman SDK
      //    The SDK stores the token after successful authorize()
      var oauthToken = null;
      try {
        // Xaman SDK exposes the token via .token after authorize
        oauthToken = (xumm.token && typeof xumm.token === 'string')
          ? xumm.token
          : (xumm.state && xumm.state.token) || null;
      } catch (e) {
        console.warn('[auth] Could not read Xaman OAuth token:', e);
      }

      if (!oauthToken) {
        throw new Error('Xaman OAuth token not available. Please try connecting again.');
      }

      // 3. Send both the address AND the OAuth token to our API
      //    Server validates the token via Xaman userinfo endpoint
      var res = await fetch(API_BASE + '/api/auth/wallet-login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',  // CSRF protection
        },
        body: JSON.stringify({ address: address, token: oauthToken }),
      });

      if (res.ok) {
        await checkSession();
      } else {
        var errData = await res.json().catch(function() { return {}; });
        console.warn('[auth] Wallet login failed:', res.status, errData.error || '');
        throw new Error('Server rejected wallet login. Please try again.');
      }
    } catch (err) {
      console.warn('[auth] Wallet connect error:', err.message);
    } finally {
      setConnectLoading(false);
    }
  }

  // ─── API: handleLogout ────────────────────────────────────────
  async function handleLogout(e) {
    if (e) e.preventDefault();
    try {
      await fetch(API_BASE + '/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // Logout is best-effort; clear UI regardless
      console.warn('[auth] Logout request failed:', err.message);
    }

    // Clear Xaman SDK session
    if (xummInstance && typeof xummInstance.logout === 'function') {
      try { await xummInstance.logout(); } catch (e) {}
    }

    setUnauthenticated();

    // Soft-reload to reset all state
    window.location.reload();
  }

  // ─── Tab Visibility: silent re-check ──────────────────────────
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkSession();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    avatarBtn = qs('.fn-avatar-btn');
    dropdown = qs('.fn-dropdown');
    logoutLink = qs('.fn-dropdown__item--logout');
    connectLinks = qsa('.fn-drawer-cta, .fn-dropdown__item[href="/wallet"]');

    // Wire logout
    if (logoutLink) {
      logoutLink.addEventListener('click', handleLogout);
    }

    // Wire all connect wallet triggers
    connectLinks.forEach(function(el) {
      el.addEventListener('click', handleConnect);
    });

    // Tab visibility listener
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial session check
    checkSession();
  }

  // ─── Bootstrap ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
