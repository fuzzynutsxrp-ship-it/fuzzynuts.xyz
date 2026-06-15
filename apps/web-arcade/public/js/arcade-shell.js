/**
 * ═══════════════════════════════════════════════════════════════
 * FUZZYNUTS ARCADE — Unified Shell
 *
 * Single source of truth for nav injection, loading screen,
 * nav auto-hide, and score integration shared by ALL games.
 *
 * Usage:
 *   <script src="../../js/arcade-shell.js"></script>
 *   <script>
 *     ArcadeShell.init({ slug: 'mario', title: 'Super Fuzzynuts', icon: '🍄' });
 *   </script>
 *
 * API:
 *   ArcadeShell.init(config)   — inject nav + show loader
 *   ArcadeShell.hideLoader()   — dismiss loading screen
 *   ArcadeShell.showLoader(msg) — show loader with custom message
 *   ArcadeShell.submit(score)  — submit score via fuzzy-score.js
 *   ArcadeShell.onReady(fn)    — register callback when shell is ready
 * ═══════════════════════════════════════════════════════════════
 */

/* global FuzzyScoreSubmit */
(function () {
  'use strict';

  // ── Resolve relative paths from the game's location ──
  function resolveBase() {
    // Check for explicit data-base attribute on the script tag
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('arcade-shell.js') !== -1) {
        var explicitBase = scripts[i].getAttribute('data-base');
        if (explicitBase) return explicitBase;
        // Fallback: walk up from js/ to public root
        // src = "../../js/arcade-shell.js" → dir = "../../js/" → base = "../../"
        var dir = src.replace(/[^/]*$/, '');
        return dir.replace(/js\/$/, '');
      }
    }
    return '../../';
  }

  var BASE = '';
  var initialized = false;
  var config = {
    slug: '',
    title: '',
    icon: '🐿️',
    accentColor: null,     // override --arcade-accent
    hideNavOnPlay: true,   // auto-hide nav during gameplay
    showLoader: true,      // show branded loading screen
    fullBleed: false,      // game fills entire viewport (nav overlays)
  };
  var loaderEl = null;
  var navEl = null;
  var readyCallbacks = [];
  var gameStartTime = 0;
  var lastSubmittedScore = 0;

  // ═══════════════════════════════════════════════════════════
  // NAV BAR
  // ═══════════════════════════════════════════════════════════

  function injectNav() {
    navEl = document.createElement('nav');
    navEl.className = 'arcade-nav';
    navEl.id = 'arcadeNav';
    navEl.innerHTML =
      '<div class="arcade-nav__left">' +
        '<a class="arcade-nav__back" href="/" title="Back to Arcade">' +
          '<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>' +
          'Arcade' +
        '</a>' +
        '<span class="arcade-nav__dot"></span>' +
        '<span class="arcade-nav__title">' + escHtml(config.icon + ' ' + config.title) + '</span>' +
      '</div>' +
      '<div class="arcade-nav__right">' +
        '<button class="arcade-nav__fullscreen" id="arcadeFullscreenBtn" title="Fullscreen (F)" aria-label="Toggle fullscreen">' +
          '<svg class="arcade-nav__fs-expand" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>' +
          '<svg class="arcade-nav__fs-compress" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>' +
        '</button>' +
        '<a class="arcade-nav__link" href="' + BASE + '">fuzzynuts.xyz</a>' +
        '<a class="arcade-nav__brand" href="/" title="Fuzzynuts Arcade">🕹️ ARCADE</a>' +
      '</div>';

    document.body.insertBefore(navEl, document.body.firstChild);

    // Wire up fullscreen toggle
    setupFullscreen();
  }

  // ═══════════════════════════════════════════════════════════
  // FULLSCREEN — targets game canvas/container, not whole page
  // ═══════════════════════════════════════════════════════════

  function setupFullscreen() {
    var fsBtn = document.getElementById('arcadeFullscreenBtn');
    if (!fsBtn) return;

    // Find the game element to fullscreen (canvas, #game-container, or body)
    function getGameElement() {
      return document.getElementById('game-container')
        || document.getElementById('game-canvas')
        || document.querySelector('canvas')
        || document.getElementById('gameContainer')
        || document.body;
    }

    function updateFsState() {
      var isFs = !!document.fullscreenElement;
      document.body.classList.toggle('arcade-fullscreen', isFs);
      if (fsBtn) {
        fsBtn.setAttribute('aria-label', isFs ? 'Exit fullscreen' : 'Toggle fullscreen');
        fsBtn.title = isFs ? 'Exit Fullscreen (F)' : 'Fullscreen (F)';
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
        console.warn('[ArcadeShell] Fullscreen API not supported');
        return;
      }
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var el = getGameElement();
        var req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) req.call(el);
      }
    }

    fsBtn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);

    // Keyboard shortcut: F key (when not typing in an input)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'f' || e.key === 'F') {
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        e.preventDefault();
        toggleFullscreen();
      }
    });
  }

  function setupNavAutoHide() {
    if (!config.hideNavOnPlay || !navEl) return;

    // Listen for common overlay elements to toggle nav visibility
    var overlayIds = [
      'pauseMenu', 'gameOver', 'startScreen', 'levelUpMenu',
      'settingsMenu', 'achievementsScreen', 'leaderboardScreen',
      'stagePickerScreen', 'streakScreen', 'helpScreen',
      'howToPlayScreen', 'race-complete'
    ];

    function checkOverlays() {
      var anyVisible = false;
      for (var i = 0; i < overlayIds.length; i++) {
        var el = document.getElementById(overlayIds[i]);
        if (el && el.style.display !== 'none' && el.offsetParent !== null && !el.classList.contains('hidden')) {
          anyVisible = true;
          break;
        }
      }
      // Also check for native <dialog> elements
      if (!anyVisible) {
        var dialogs = document.querySelectorAll('dialog[open]');
        anyVisible = dialogs.length > 0;
      }
      // Only toggle class if state actually changed (avoid layout thrash)
      var shouldHide = !anyVisible;
      if (navEl.classList.contains('hidden') !== shouldHide) {
        navEl.classList.toggle('hidden', shouldHide);
      }
    }

    // Poll at 500ms — lightweight and catches all state transitions
    setInterval(checkOverlays, 500);
    checkOverlays();
  }

  // ═══════════════════════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════════════════════

  function injectLoader(message) {
    loaderEl = document.createElement('div');
    loaderEl.className = 'arcade-loader';
    loaderEl.id = 'arcadeLoader';
    loaderEl.innerHTML =
      '<div class="arcade-loader__icon">' + escHtml(config.icon) + '</div>' +
      '<div class="arcade-loader__title">' + escHtml(config.title) + '</div>' +
      '<div class="arcade-loader__bar"><div class="arcade-loader__fill"></div></div>' +
      '<div class="arcade-loader__status">' + escHtml(message || 'Loading…') + '</div>';

    document.body.appendChild(loaderEl);
  }

  function hideLoader() {
    if (!loaderEl) return;
    loaderEl.classList.add('hide');
    setTimeout(function () {
      if (loaderEl && loaderEl.parentNode) {
        loaderEl.parentNode.removeChild(loaderEl);
        loaderEl = null;
      }
    }, 500);
  }

  function showLoaderMessage(msg) {
    if (!loaderEl) return;
    var status = loaderEl.querySelector('.arcade-loader__status');
    if (status) status.textContent = msg;
  }

  // ═══════════════════════════════════════════════════════════
  // SCORE INTEGRATION
  // ═══════════════════════════════════════════════════════════

  function submitScore(score) {
    score = Math.floor(score);
    if (score <= 0 || score <= lastSubmittedScore) return;
    if (!config.slug) return;

    var duration = Math.floor((Date.now() - gameStartTime) / 1000);

    try {
      if (typeof FuzzyScoreSubmit === 'function') {
        FuzzyScoreSubmit(config.slug, score, duration);
        lastSubmittedScore = score;
      }
    } catch (e) {
      console.warn('[ArcadeShell] Score submit failed:', e);
    }
  }

  function resetScoreTracking() {
    lastSubmittedScore = 0;
    gameStartTime = Date.now();
  }

  // Auto-submit on page exit
  function setupAutoSave(getScoreFn) {
    window.addEventListener('beforeunload', function () {
      if (typeof getScoreFn === 'function') {
        submitScore(getScoreFn());
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && typeof getScoreFn === 'function') {
        submitScore(getScoreFn());
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UNIVERSAL START SCREEN HANDLER
  // ═══════════════════════════════════════════════════════════

  function setupStartScreen() {
    // Respect games that handle their own start logic
    if (document.body.dataset.customStart === 'true') return;

    var overlay = document.getElementById('start-screen');
    var btn = document.getElementById('start-btn');
    var restartBtn = document.getElementById('restart-btn');
    var canvas = document.getElementById('game-canvas') || document.querySelector('canvas');

    // Bail gracefully for non-standard games (RSC, Kaetram, etc.)
    if (!overlay) return;

    function startGame() {
      // Unlock AudioContext (required for iOS Safari autoplay policy)
      try {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && window.audioContext && window.audioContext.state === 'suspended') {
          window.audioContext.resume();
        }
      } catch (err) { console.warn('[ArcadeShell] Audio unlock failed:', err); }

      // Dismiss overlay
      overlay.style.display = 'none';
      overlay.classList.add('hidden');

      // Restore keyboard focus to canvas so keyboard controls work immediately
      if (canvas) {
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
      }

      // Reset score tracking when game actually starts
      resetScoreTracking();
    }

    // Wire up start button (pointerdown for better mobile responsiveness)
    if (btn) {
      btn.addEventListener('pointerdown', startGame, { once: true });
    }

    // Wire up restart button
    if (restartBtn) {
      restartBtn.addEventListener('pointerdown', function () {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
        if (canvas) {
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
        }
      });
    }

    // Canvas fallback — dismiss overlay on first canvas interaction
    // (for games like pong/boxing that start on canvas click)
    if (canvas) {
      canvas.addEventListener('pointerdown', function onFirstTouch() {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
        canvas.removeEventListener('pointerdown', onFirstTouch);
      }, { once: true });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACCENT COLOR OVERRIDE
  // ═══════════════════════════════════════════════════════════

  function applyAccentColor(color) {
    if (!color) return;
    var root = document.documentElement;
    root.style.setProperty('--arcade-accent', color);
    // Derive darker hover variant
    root.style.setProperty('--arcade-accent-hover', color + 'cc');
    root.style.setProperty('--arcade-accent-glow', color + '66');
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════

  function init(userConfig) {
    if (initialized) return;
    initialized = true;

    // Merge config
    for (var key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        config[key] = userConfig[key];
      }
    }

    // Resolve base path from script location
    BASE = resolveBase();

    // Detect iframe — suppress nav when embedded in GameModal
    var inIframe = (function() {
      try { return window.self !== window.top; } catch (e) { return true; }
    })();

    // Apply accent color override
    applyAccentColor(config.accentColor);

    // Only inject nav when running as a standalone page (not in an iframe)
    if (!inIframe) {
      injectNav();
      setupNavAutoHide();

      // Chat button — floating element, always visible (not inside nav)
      var chatBtn = document.createElement('button');
      chatBtn.id = 'arcadeChatBtn';
      chatBtn.className = 'arcade-chat-float';
      chatBtn.title = 'Community Chat';
      chatBtn.textContent = '💬 Chat';
      chatBtn.addEventListener('click', function () {
        var chatUrl = window.location.origin + '/';
        var popup = window.open(
          chatUrl,
          'fuzzynuts-chat',
          'width=420,height=600,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no'
        );
        if (popup) popup.focus();
      });
      document.body.appendChild(chatBtn);
    } else {
      document.body.classList.add('in-iframe');
    }

    // Inject loader if configured
    if (config.showLoader) {
      injectLoader('Booting cabinet…');
    }

    // Track game start time
    gameStartTime = Date.now();

    // ── Universal start-btn handler ──
    // Most games have #start-screen + #start-btn in HTML but many never wire
    // a click handler in their own JS.  This catches all of them.
    // Safe for games that DO wire their own handler — hiding an already-hidden
    // overlay is a no-op, and both listeners fire without conflict.
    // Uses data-custom-start="true" on <body> to opt out.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupStartScreen);
    } else {
      setupStartScreen();
    }

    // Fire ready callbacks
    for (var i = 0; i < readyCallbacks.length; i++) {
      try { readyCallbacks[i](); } catch (e) { console.error(e); }
    }

    console.log('[ArcadeShell] Initialized for ' + config.slug + (inIframe ? ' (iframe mode)' : ''));
  }

  function onReady(fn) {
    if (initialized) {
      try { fn(); } catch (e) { console.error(e); }
    } else {
      readyCallbacks.push(fn);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  function escHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ═══════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════

  window.ArcadeShell = {
    init: init,
    hideLoader: hideLoader,
    showLoader: function (msg) {
      if (!loaderEl) injectLoader(msg || 'Loading…');
      else showLoaderMessage(msg || 'Loading…');
    },
    submit: submitScore,
    resetScore: resetScoreTracking,
    autoSave: setupAutoSave,
    onReady: onReady,
    getConfig: function () { return Object.assign({}, config); },
  };

})();
