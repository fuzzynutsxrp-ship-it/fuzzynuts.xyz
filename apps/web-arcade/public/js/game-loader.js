/**
 * game-loader.js — Full-screen game overlay controller
 * Vanilla JS. No external dependencies.
 * Intercepts game card clicks and opens a Poki-style play overlay.
 */
(() => {
  'use strict';

  // ─── DOM refs ──────────────────────────────────────────────────
  let overlay, titleEl, loaderEl, loaderText, viewport, viewportTitle;
  let btnBack, btnFs;
  let currentGame = null;

  // ─── Helpers ───────────────────────────────────────────────────
  function qs(sel) { return document.querySelector(sel); }

  // ─── Open overlay ─────────────────────────────────────────────
  function open(gameTitle) {
    if (!overlay) return;
    currentGame = gameTitle;

    // Set title
    titleEl.textContent = gameTitle;
    viewportTitle.textContent = gameTitle;

    // Reset state: show loader, hide viewport
    loaderEl.style.display = '';
    viewport.style.display = 'none';
    loaderText.textContent = 'Connecting to ' + gameTitle + '...';

    // Show overlay
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Mock handshake: 1.5s then show viewport
    setTimeout(() => {
      loaderEl.style.display = 'none';
      viewport.style.display = '';
    }, 1500);
  }

  // ─── Close overlay ────────────────────────────────────────────
  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentGame = null;

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ─── Fullscreen toggle ────────────────────────────────────────
  function toggleFullscreen() {
    if (!overlay) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      overlay.requestFullscreen().catch(() => {});
    }
  }

  // ─── Event: game card click (delegation) ──────────────────────
  function onDocumentClick(e) {
    const card = e.target.closest('.fn-game-card');
    if (!card) return;

    e.preventDefault();
    const title = card.querySelector('.fn-game-card__title');
    open(title ? title.textContent.trim() : 'Game');
  }

  // ─── Event: Escape key ────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
      close();
    }
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    overlay = qs('#game-overlay');
    titleEl = qs('#game-overlay-title');
    loaderEl = qs('#game-overlay-loader');
    loaderText = qs('#game-overlay-loader-text');
    viewport = qs('#game-overlay-viewport');
    viewportTitle = qs('#game-overlay-viewport-title');
    btnBack = qs('#game-overlay-back');
    btnFs = qs('#game-overlay-fs');

    if (!overlay) return;

    // Wire controls
    if (btnBack) btnBack.addEventListener('click', close);
    if (btnFs) btnFs.addEventListener('click', toggleFullscreen);

    // Game card click delegation
    document.addEventListener('click', onDocumentClick);

    // Escape key
    document.addEventListener('keydown', onKeyDown);
  }

  // ─── Bootstrap ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
