/**
 * ═══════════════════════════════════════════════════════════════
 *  game-loader.js — Full-screen game overlay controller
 *
 *  Vanilla JS. No external dependencies.
 *  Intercepts game card clicks and opens a Poki-style play overlay.
 *
 *  Supports two engine types:
 *    - "inline"  → fetches game HTML, injects scripts/styles into viewport
 *    - "iframe"  → creates sandboxed <iframe> in viewport (for external games)
 *
 *  Lifecycle: open → load → play → close (teardown)
 *  Score bridge: postMessage ↔ fuzzy-score.js
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  'use strict';

  // ─── DOM refs ──────────────────────────────────────────────────
  let overlay, titleEl, loaderEl, loaderText, viewport;
  let btnBack, btnFs;
  let currentGame = null;
  let teardownFns = [];

  // ─── Game registry (slug → config) ────────────────────────────
  // Maps game slugs to their loading configuration.
  // "inline" games are loaded as scripts/styles injected into the viewport.
  // "iframe" games are loaded in a sandboxed iframe.
  const GAME_CONFIG = {
    // Existing live games
    'mario':             { engine: 'inline', path: '/games/mario/' },
    'fuzzy-survivors':   { engine: 'inline', path: '/games/fuzzy-survivors/' },
    'minigolf':          { engine: 'inline', path: '/games/minigolf/' },
    'nut-racer':         { engine: 'inline', path: '/games/nut-racer/' },
    'fuzzynuts-world':   { engine: 'iframe', url: 'https://world.fuzzynuts.xyz' },
    'rsc':               { engine: 'iframe', url: 'https://game.fuzzynuts.xyz' },
    // New factory games (added by game factory pipeline)
    'dragon-hoard':      { engine: 'inline', path: '/games/dragon-hoard/' },
    'cosmic-blaster':    { engine: 'inline', path: '/games/cosmic-blaster/' },
    'snake':            { engine: 'inline', path: '/games/snake/' },
    'breakout':            { engine: 'inline', path: '/games/breakout/' },
    'pong':            { engine: 'inline', path: '/games/pong/' },
    'tetris':            { engine: 'inline', path: '/games/tetris/' },
    'asteroids':            { engine: 'inline', path: '/games/asteroids/' },
  };

  // ─── Helpers ───────────────────────────────────────────────────
  function qs(sel) { return document.querySelector(sel); }

  /** Extract slug from a game card's href or data attribute */
  function slugFromCard(card) {
    // Try data-slug first
    if (card.dataset.slug) return card.dataset.slug;
    // Try href: /game/{slug} or /games/{slug}/
    const href = card.getAttribute('href') || '';
    const m = href.match(/\/(?:game|games)\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  /** Find game config by slug */
  function findGame(slug) {
    if (!slug) return null;
    return GAME_CONFIG[slug] || null;
  }

  /** Build the full game URL from config */
  function gameUrl(config) {
    if (config.url) return config.url;
    if (config.path) return config.path + 'index.html';
    return null;
  }

  // ─── Teardown: clean up previous game ──────────────────────────
  function teardown() {
    // Run all registered teardown functions
    teardownFns.forEach(fn => {
      try { fn(); } catch(e) { console.warn('[GameLoader] teardown error:', e); }
    });
    teardownFns = [];

    // Clear viewport content
    if (viewport) {
      viewport.innerHTML = '';
      viewport.style.display = 'none';
    }

    // Remove any injected styles
    document.querySelectorAll('[data-game-style]').forEach(el => el.remove());

    currentGame = null;
  }

  // ─── Load inline game (inject scripts + styles) ────────────────
  function loadInlineGame(config, slug) {
    const url = gameUrl(config);
    if (!url) {
      showError('No game URL configured');
      return;
    }

    loaderText.textContent = 'Loading ' + slug + '...';

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(html => {
        if (currentGame !== slug) return; // Race: user closed while loading

        // Parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract and inject stylesheets
        const styles = doc.querySelectorAll('link[rel="stylesheet"], style');
        styles.forEach(style => {
          const clone = style.cloneNode(true);
          clone.setAttribute('data-game-style', 'true');
          // Fix relative paths in href
          if (clone.tagName === 'LINK' && clone.href) {
            const origHref = clone.getAttribute('href');
            if (origHref && !origHref.startsWith('http') && !origHref.startsWith('/')) {
              clone.setAttribute('href', config.path + origHref);
            }
          }
          document.head.appendChild(clone);
        });

        // Clear viewport and prepare for game content
        viewport.innerHTML = '';
        viewport.style.display = '';
        viewport.style.width = '100%';
        viewport.style.height = '100%';
        viewport.style.overflow = 'hidden';

        // Move game body content into viewport
        const bodyContent = doc.body.innerHTML;
        viewport.innerHTML = bodyContent;

        // Fix relative paths in viewport content
        viewport.querySelectorAll('img[src]').forEach(img => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
            img.setAttribute('src', config.path + src);
          }
        });
        viewport.querySelectorAll('script[src]').forEach(script => {
          const src = script.getAttribute('src');
          if (src && !src.startsWith('http') && !src.startsWith('/')) {
            script.setAttribute('src', config.path + src);
          }
        });

        // Extract and execute scripts
        const scripts = doc.querySelectorAll('script');
        const scriptPromises = [];

        scripts.forEach(originalScript => {
          const newScript = document.createElement('script');
          newScript.setAttribute('data-game-script', 'true');

          if (originalScript.src) {
            // External script — fix path and load
            let src = originalScript.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('/')) {
              src = config.path + src;
            }
            newScript.src = src;
            scriptPromises.push(new Promise((resolve, reject) => {
              newScript.onload = resolve;
              newScript.onerror = reject;
            }));
          } else {
            // Inline script — rewrite relative references
            let code = originalScript.textContent;
            // Replace relative fetch/URL references
            code = code.replace(/(['"])(\.\/|\.\.\/)/g, '$1' + config.path + '$2');
            newScript.textContent = code;
          }

          // Copy attributes
          for (const attr of originalScript.attributes) {
            if (attr.name !== 'src' && attr.name !== 'type') {
              newScript.setAttribute(attr.name, attr.value);
            }
          }

          document.body.appendChild(newScript);
        });

        // Hide loader, show viewport
        loaderEl.style.display = 'none';

        // Set up score bridge
        setupScoreBridge(slug);

        // Set up close cleanup
        teardownFns.push(() => {
          // Remove injected scripts
          document.querySelectorAll('[data-game-script]').forEach(el => el.remove());
          // Remove injected styles
          document.querySelectorAll('[data-game-style]').forEach(el => el.remove());
          // Cancel any game animation frames
          if (window.__gameAnimFrame) cancelAnimationFrame(window.__gameAnimFrame);
          // Clear game intervals
          if (window.__gameIntervals) {
            window.__gameIntervals.forEach(id => clearInterval(id));
            window.__gameIntervals = [];
          }
        });

        console.log('[GameLoader] Inline game loaded:', slug);
      })
      .catch(err => {
        console.error('[GameLoader] Failed to load game:', err);
        if (currentGame === slug) {
          showError('Failed to load game: ' + err.message);
        }
      });
  }

  // ─── Load iframe game ──────────────────────────────────────────
  function loadIframeGame(config, slug) {
    const url = config.url;
    if (!url) {
      showError('No game URL configured');
      return;
    }

    loaderText.textContent = 'Connecting to ' + slug + '...';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    iframe.setAttribute('allow', 'autoplay; fullscreen; clipboard-write');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('data-game-iframe', 'true');

    // Hide loader when iframe loads
    iframe.onload = () => {
      if (currentGame !== slug) return;
      loaderEl.style.display = 'none';
      viewport.style.display = '';
      console.log('[GameLoader] Iframe game loaded:', slug);

      // Send config message to iframe
      try {
        iframe.contentWindow.postMessage({
          type: 'FUZZY_CONFIG',
          hideNav: true,
          slug: slug,
          origin: window.location.origin,
        }, '*');
      } catch(e) {}
    };

    // Clear viewport and add iframe
    viewport.innerHTML = '';
    viewport.style.width = '100%';
    viewport.style.height = '100%';
    viewport.appendChild(iframe);
    viewport.style.display = 'none'; // Show after load

    // Score bridge for iframe games
    setupScoreBridge(slug);

    // Cleanup
    teardownFns.push(() => {
      iframe.src = 'about:blank';
      setTimeout(() => iframe.remove(), 100);
    });
  }

  // ─── Score bridge (postMessage) ────────────────────────────────
  function setupScoreBridge(slug) {
    function onMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;

      // Listen for score submissions from the game
      if (event.data.type === 'FUZZY_SCORE_SUBMITTED') {
        console.log('[GameLoader] Score submitted:', event.data);
        // Forward to parent if we're in an iframe ourselves
        try {
          if (window.parent !== window) {
            window.parent.postMessage(event.data, '*');
          }
        } catch(e) {}
      }

      // Listen for game ready signal
      if (event.data.type === 'FN_GAME_READY') {
        console.log('[GameLoader] Game ready:', slug);
      }
    }

    window.addEventListener('message', onMessage);
    teardownFns.push(() => window.removeEventListener('message', onMessage));
  }

  // ─── Show error in viewport ────────────────────────────────────
  function showError(msg) {
    loaderEl.style.display = 'none';
    viewport.style.display = '';
    viewport.innerHTML = `
      <div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.7);">
        <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
        <div style="font-size:1rem;font-weight:600;">${msg}</div>
        <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;
          background:var(--fn-primary,#7c3aed);color:white;border:none;border-radius:0.5rem;
          cursor:pointer;font-weight:600;">Retry</button>
      </div>`;
  }

  // ─── Open overlay ──────────────────────────────────────────────
  function open(slug, gameConfig) {
    if (!overlay) return;

    // Teardown any previous game
    teardown();

    currentGame = slug;
    const config = gameConfig || findGame(slug);

    // Set title
    const displayName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    titleEl.textContent = displayName;

    // Reset state: show loader, hide viewport
    loaderEl.style.display = '';
    viewport.style.display = 'none';
    loaderText.textContent = 'Loading ' + displayName + '...';

    // Show overlay
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Update URL for deep linking
    try {
      history.pushState({ slug: slug }, '', '/game/' + slug);
    } catch(e) {}

    // Load game based on engine type
    if (config) {
      if (config.engine === 'iframe') {
        loadIframeGame(config, slug);
      } else {
        loadInlineGame(config, slug);
      }
    } else {
      // Fallback: try loading as inline game from /games/{slug}/
      loadInlineGame({ engine: 'inline', path: '/games/' + slug + '/' }, slug);
    }
  }

  // ─── Close overlay ─────────────────────────────────────────────
  function close() {
    if (!overlay) return;

    teardown();

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Clean URL
    try {
      if (!_closingFromPopstate) {
        history.replaceState(null, '', '/');
      }
    } catch(e) {}
    _closingFromPopstate = false;
  }

  let _closingFromPopstate = false;

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
    const card = e.target.closest('.fn-game-card, [data-game-card], a[href*="/game/"]');
    if (!card) return;

    e.preventDefault();
    const slug = slugFromCard(card);
    if (slug) {
      open(slug);
    }
  }

  // ─── Event: Escape key ────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
      close();
    }
  }

  // ─── Event: browser back/forward ──────────────────────────────
  function onPopState(e) {
    if (overlay && overlay.classList.contains('is-open')) {
      _closingFromPopstate = true;
      close();
    } else if (e.state && e.state.slug) {
      open(e.state.slug, null, true);
    }
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    overlay = qs('#game-overlay');
    titleEl = qs('#game-overlay-title');
    loaderEl = qs('#game-overlay-loader');
    loaderText = qs('#game-overlay-loader-text');
    viewport = qs('#game-overlay-viewport');

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

    // Browser back/forward
    window.addEventListener('popstate', onPopState);

    // Deep link: check if URL is /game/{slug}
    const pathMatch = window.location.pathname.match(/^\/game\/([^/?#]+)/);
    if (pathMatch && pathMatch[1]) {
      // Delay slightly so DOM is ready
      setTimeout(() => open(pathMatch[1]), 100);
    }
  }

  // ─── Public API ────────────────────────────────────────────────
  window.GameLoader = {
    open: open,
    close: close,
    register: function(slug, config) {
      GAME_CONFIG[slug] = config;
    },
    getConfig: function(slug) {
      return GAME_CONFIG[slug] || null;
    },
    isOverlayOpen: function() {
      return overlay && overlay.classList.contains('is-open');
    }
  };

  // ─── Bootstrap ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
