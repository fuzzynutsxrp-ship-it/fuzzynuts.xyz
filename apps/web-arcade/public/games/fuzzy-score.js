/* ═══════════════════════════════════════════════════════════════
   FUZZYNUTS ARCADE — Score Submitter (standalone game pages)
   
   Drop this into any game page. When a game finishes, call:
     FuzzyScoreSubmit(gameSlug, score, durationSeconds)
   
   Writes to localStorage (instant) AND POSTs to the backend
   API (async, fire-and-forget). Scores appear on the arcade
   leaderboard whether online or offline.
   ═══════════════════════════════════════════════════════════════ */

/* ── Inner-game nav suppression ──
   When loaded inside the Fuzzynuts arcade iframe, listens for
   FUZZY_CONFIG messages and hides internal navigation elements
   to prevent duplicate nav bars. */
(function() {
  'use strict';
  if (window.parent === window) return; // Not in iframe, skip

  var NAV_SELECTORS = [
    '.game-nav',
    '.inner-header',
    '[data-nav]',
    'header.game-ui',
    '.game-header',
    '.game-breadcrumb',
    '.back-to-arcade',
  ];

  function hideNavElements() {
    var hidden = 0;
    NAV_SELECTORS.forEach(function(sel) {
      var elements = document.querySelectorAll(sel);
      for (var i = 0; i < elements.length; i++) {
        elements[i].style.setProperty('display', 'none', 'important');
        hidden++;
      }
    });
    if (hidden > 0) {
      console.log('[FuzzyScore] Hidden', hidden, 'inner-game nav element(s)');
    }
  }

  var ALLOWED_ORIGINS = [
    'https://fuzzynuts.xyz',
    'https://www.fuzzynuts.xyz',
    'https://world.fuzzynuts.xyz',
    'http://localhost:3000'
  ];

  window.addEventListener('message', function(event) {
    // Validate origin — only accept config from known arcade origins
    if (ALLOWED_ORIGINS.indexOf(event.origin) === -1) return;

    if (event.data && event.data.type === 'FUZZY_CONFIG') {
      if (event.data.hideNav) {
        hideNavElements();
        // Also try after a brief delay in case of lazy rendering
        setTimeout(hideNavElements, 500);
        setTimeout(hideNavElements, 2000);
      }
    }
  });
})();

var FuzzyScoreSubmit = (function() {
  'use strict';

  var STORAGE_KEY = 'fuzzy_arcade_scores';
  var WALLET_KEY  = 'fuzzy_wallet';
  var API_BASE    = 'https://world.fuzzynuts.xyz/api/scores';
  /* ─────────────────────────────────────────────────────────────
     TEMPORARY copy of SCORE_CAPS. Stays in sync manually until
     the games-build pipeline (Phase D) bundles this file from
     @fuzzynuts/arcade-core. After that, this object is generated.

     CHANGED in monorepo migration:
       - `nutracer` (typo) → `nut-racer` (canonical)
       - `survivors`       → `fuzzy-survivors` (canonical)
       - cap values aligned with packages/arcade-core/src/constants/score-caps.ts
     The old keys are kept as aliases so already-shipped clients
     don't break mid-deploy; remove the aliases in a follow-up.
     ───────────────────────────────────────────────────────────── */
  var SCORE_CAPS  = {
    'mario': 9999990,
    'fuzzy-survivors': 5000000,
    'minigolf': 100000,
    'nut-racer': 2000000,
    'fuzzynuts-world': 10000000,
    'dragon-hoard': 999999,
    'cosmic-blaster': 999999,
    'rsc': 99000000,
    // legacy aliases (DO NOT add to canonical list)
    'survivors': 5000000,
    'racer': 2000000,
    'nutracer': 2000000
  };
  var MIN_DURATION = 5; // seconds — aligns with MIN_PLAY_DURATION_SECONDS in arcade-core

  function getCurrentWeekKey() {
    var now = new Date();
    var d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
  }

  function truncateAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  }

  function getWalletState() {
    try {
      var saved = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
      if (saved.connected && saved.address) return saved;
    } catch(e) { console.warn('[FuzzyScore] getWalletState error:', e); }
    return null;
  }

  function loadData() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      var currentWeek = getCurrentWeekKey();
      if (data.weekKey !== currentWeek) {
        return { weekKey: currentWeek, scores: {}, personalBests: {}, lastSubmitTime: {} };
      }
      return {
        weekKey: currentWeek,
        scores: data.scores || {},
        personalBests: data.personalBests || {},
        lastSubmitTime: data.lastSubmitTime || {}
      };
    } catch(e) {
      console.warn('[FuzzyScore] loadData error:', e);
      return { weekKey: getCurrentWeekKey(), scores: {}, personalBests: {}, lastSubmitTime: {} };
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) { console.warn('[FuzzyScore] saveData error:', e); }
  }

  /**
   * POST score to backend (fire-and-forget).
   * Called after localStorage is already saved.
   */
  function syncToBackend(game, score, duration, walletAddress) {
    if (!walletAddress) return; // Can't sync without wallet

    var payload = {
      game: game,
      score: Math.floor(score),
      wallet: walletAddress,
      timestamp: Date.now(),
      duration: typeof duration === 'number' ? Math.floor(duration) : undefined
    };

    fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(response) {
      return response.json();
    }).then(function(result) {
      if (result.ok) {
        console.log('[FuzzyScore] Backend synced:', game, Math.floor(score),
                    result.action === 'no_update' ? '(existing higher)' : '');
        // Notify parent GameWrapper of successful submission
        try { window.parent.postMessage({ type: 'FUZZY_SCORE_SUBMITTED', success: true }, 'https://fuzzynuts.xyz'); } catch(e) {}
      } else {
        console.warn('[FuzzyScore] Backend rejected:', result.error);
        // Notify parent GameWrapper of failed submission
        try { window.parent.postMessage({ type: 'FUZZY_SCORE_SUBMITTED', success: false }, 'https://fuzzynuts.xyz'); } catch(e) {}
      }
    }).catch(function(err) {
      console.warn('[FuzzyScore] Backend sync failed (offline?):', err.message);
      // Notify parent GameWrapper of network failure
      try { window.parent.postMessage({ type: 'FUZZY_SCORE_SUBMITTED', success: false }, 'https://fuzzynuts.xyz'); } catch(e) {}
    });
  }

  /**
   * Submit a score from a game page.
   * @param {string} game      - Game slug ('mario', 'survivors', 'minigolf', 'nutracer')
   * @param {number} score     - The player's score
   * @param {number} duration  - Seconds played (for anti-cheat)
   * @returns {{ success: boolean, reason?: string }}
   */
  function submit(game, score, duration) {
    if (!game || typeof score !== 'number' || score <= 0 || !isFinite(score)) {
      console.warn('[FuzzyScore] Invalid score:', game, score);
      return { success: false, reason: 'invalid' };
    }

    // Cap check
    var cap = SCORE_CAPS[game] || 999999;
    if (score > cap) {
      console.warn('[FuzzyScore] Score exceeds cap:', score, '>', cap);
      return { success: false, reason: 'exceeds_cap' };
    }

    // Duration check
    if (typeof duration === 'number' && duration < MIN_DURATION) {
      console.warn('[FuzzyScore] Duration too short:', duration);
      return { success: false, reason: 'too_short' };
    }

    var data = loadData();
    var wallet = getWalletState();
    var playerAddress = wallet ? wallet.address : null;
    var playerName = playerAddress ? truncateAddress(playerAddress) : 'Guest';
    var sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

    // Init game array
    if (!data.scores[game]) data.scores[game] = [];

    var entry = {
      address: playerAddress,
      name: playerName,
      score: Math.floor(score),
      ts: Date.now(),
      session: sessionId,
      hasTrustline: false,
      eligible: false
    };

    // If wallet connected, only keep best score per address
    if (playerAddress) {
      var existingIdx = -1;
      for (var i = 0; i < data.scores[game].length; i++) {
        if (data.scores[game][i].address === playerAddress) {
          existingIdx = i;
          break;
        }
      }
      if (existingIdx >= 0) {
        if (score > data.scores[game][existingIdx].score) {
          data.scores[game][existingIdx] = entry;
        }
      } else {
        data.scores[game].push(entry);
      }
    } else {
      // Guest: add if under 50
      var guestCount = 0;
      for (var j = 0; j < data.scores[game].length; j++) {
        if (!data.scores[game][j].address) guestCount++;
      }
      if (guestCount < 50) {
        data.scores[game].push(entry);
      }
    }

    // Sort and cap
    data.scores[game].sort(function(a, b) { return b.score - a.score; });
    data.scores[game] = data.scores[game].slice(0, 100);

    // Personal best
    if (!data.personalBests[game] || score > data.personalBests[game]) {
      data.personalBests[game] = Math.floor(score);
    }

    // Save to localStorage (instant)
    saveData(data);
    console.log('[FuzzyScore] Saved:', game, 'score:', Math.floor(score),
                'player:', playerName, 'best:', data.personalBests[game]);

    // Sync to backend (async, fire-and-forget)
    syncToBackend(game, score, duration, playerAddress);

    return {
      success: true,
      personalBest: data.personalBests[game],
      isNewBest: score > data.personalBests[game]
    };
  }

  return submit;
})();
