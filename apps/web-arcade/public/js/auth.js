/**
 * auth.js — FuzzyNuts Wallet & Session Bridge
 * Vanilla JS module. No external dependencies.
 * All API calls use credentials: 'include' for HttpOnly cookie auth.
 */
(() => {
  'use strict';

  const API_BASE = '';  // same-origin; Railway Express is proxied via Vercel rewrites

  // ─── DOM refs (resolved on init) ───────────────────────────────
  let avatarBtn, avatarIcon, dropdown, logoutLink, connectLinks;

  // ─── State ─────────────────────────────────────────────────────
  let currentUser = null;
  let checking = false;

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

  // ─── UI Updates ────────────────────────────────────────────────
  function setAuthenticated(user) {
    currentUser = user;
    const initials = getInitials(user.username || user.address || 'U');

    // Replace avatar icon SVG with initials circle
    if (avatarBtn) {
      avatarBtn.innerHTML =
        '<span class="fn-avatar-initials">' + initials + '</span>';
      avatarBtn.setAttribute('aria-label', user.username || 'Profile');
    }

    // Show Profile + Logout in dropdown, hide Connect Wallet
    if (dropdown) {
      const profileLink = qs('.fn-dropdown__item[href="/profile"]', dropdown);
      if (profileLink) profileLink.closest('li').style.display = '';
      if (logoutLink) logoutLink.closest('li').style.display = '';
    }

    // Hide all Connect Wallet triggers
    connectLinks.forEach(el => { el.style.display = 'none'; });
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
      const profileLink = qs('.fn-dropdown__item[href="/profile"]', dropdown);
      if (profileLink) profileLink.closest('li').style.display = 'none';
      if (logoutLink) logoutLink.closest('li').style.display = 'none';
    }

    connectLinks.forEach(el => { el.style.display = ''; });
  }

  function setConnectLoading(loading) {
    connectLinks.forEach(el => {
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
      const res = await fetch(API_BASE + '/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
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

  // ─── API: handleConnect (mock wallet flow) ────────────────────
  async function handleConnect(e) {
    if (e) e.preventDefault();
    if (connectLinks.some(el => el.classList.contains('is-loading'))) return;

    setConnectLoading(true);

    try {
      // Simulate wallet SDK delay (replace with real Xaman/Joey flow)
      await new Promise(r => setTimeout(r, 1200));

      // Mock payload — real flow would sign a challenge with the wallet
      const mockPayload = {
        address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        signature: 'MOCK_SIGNATURE_' + Date.now(),
        challenge: 'FuzzyNuts-Auth-' + crypto.randomUUID(),
      };

      const res = await fetch(API_BASE + '/api/auth/wallet-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPayload),
      });

      if (res.ok) {
        await checkSession();
      } else {
        console.warn('[auth] Wallet login failed:', res.status);
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
    connectLinks.forEach(el => {
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
