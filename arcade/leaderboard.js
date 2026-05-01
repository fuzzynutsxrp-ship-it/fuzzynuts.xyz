/* ═══════════════════════════════════════════════════════════════
   FUZZYNUTS ARCADE — Leaderboard System
   Per-game scoring, weekly cycle, anti-cheat guardrails
   Storage: localStorage (personal) + jsonbin.io (public)
   ═══════════════════════════════════════════════════════════════ */

const FuzzyLeaderboard = (() => {
  // ── Config ──
  const STORAGE_KEY = 'fuzzy_arcade_scores';
  const JSONBIN_READ_URL = null; // Set when jsonbin.io bin is created
  const SCORE_CAPS = {
    mario: 99999,
    survivors: 999999
  };
  const MIN_DURATION_SEC = 15;       // Must play at least 15s
  const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 min between submissions per game
  const WEEK_START_DAY = 1;           // Monday

  // ── State ──
  let scores = {};      // { gameSlug: [ { address, name, score, ts, session } ] }
  let personalBests = {}; // { gameSlug: bestScore }
  let lastSubmitTime = {}; // { gameSlug: timestamp }
  const listeners = [];

  // ── Helpers ──
  function getCurrentWeekKey() {
    const now = new Date();
    const year = now.getUTCFullYear();
    // ISO week number
    const jan1 = new Date(Date.UTC(year, 0, 1));
    const dayNum = Math.floor((now - jan1) / 86400000);
    const weekNum = Math.ceil((dayNum + jan1.getUTCDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  function getWeekEndDate() {
    const now = new Date();
    const day = now.getUTCDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    const endDate = new Date(now);
    endDate.setUTCDate(endDate.getUTCDate() + daysUntilSunday);
    endDate.setUTCHours(23, 59, 59, 999);
    return endDate;
  }

  function getTimeUntilReset() {
    const end = getWeekEndDate();
    const diff = end - new Date();
    if (diff <= 0) return 'Resetting now...';

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  }

  // ── Storage ──
  function save() {
    try {
      const weekKey = getCurrentWeekKey();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        weekKey,
        scores,
        personalBests,
        lastSubmitTime
      }));
    } catch (e) { console.warn('[Leaderboard] Save failed:', e); }
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const currentWeek = getCurrentWeekKey();

      // If stored data is from a different week, reset
      if (data.weekKey !== currentWeek) {
        scores = {};
        personalBests = {};
        lastSubmitTime = {};
        save();
        return;
      }

      scores = data.scores || {};
      personalBests = data.personalBests || {};
      lastSubmitTime = data.lastSubmitTime || {};
    } catch (e) {
      scores = {};
      personalBests = {};
      lastSubmitTime = {};
    }
  }

  // ── Listeners ──
  function onChange(fn) {
    listeners.push(fn);
  }

  function notify() {
    listeners.forEach(fn => fn(getLeaderboard()));
  }

  // ═══════════════════════════════════════════
  // SCORE SUBMISSION
  // ═══════════════════════════════════════════
  function submitScore(data) {
    /*
     * data = {
     *   game: 'mario',
     *   score: 12500,
     *   sessionId: 'uuid',
     *   duration: 187  // seconds
     * }
     */

    const { game, score, sessionId, duration } = data;

    // Validate game
    if (!game || typeof game !== 'string') {
      console.warn('[Leaderboard] Invalid game slug');
      return { success: false, reason: 'invalid_game' };
    }

    // Validate score
    if (typeof score !== 'number' || score <= 0 || !isFinite(score)) {
      console.warn('[Leaderboard] Invalid score');
      return { success: false, reason: 'invalid_score' };
    }

    // Anti-cheat: score cap
    const cap = SCORE_CAPS[game] || 999999;
    if (score > cap) {
      console.warn(`[Leaderboard] Score ${score} exceeds cap ${cap} for ${game}`);
      return { success: false, reason: 'score_exceeds_cap' };
    }

    // Anti-cheat: minimum duration
    if (typeof duration === 'number' && duration < MIN_DURATION_SEC) {
      console.warn(`[Leaderboard] Duration ${duration}s below minimum ${MIN_DURATION_SEC}s`);
      return { success: false, reason: 'too_short' };
    }

    // Anti-cheat: rate limiting
    const now = Date.now();
    if (lastSubmitTime[game] && (now - lastSubmitTime[game]) < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastSubmitTime[game])) / 1000);
      console.warn(`[Leaderboard] Rate limited. Wait ${waitSec}s`);
      return { success: false, reason: 'rate_limited', waitSeconds: waitSec };
    }

    // Anti-cheat: session token required
    if (!sessionId) {
      console.warn('[Leaderboard] Missing session ID');
      return { success: false, reason: 'no_session' };
    }

    // Get wallet state
    const wallet = typeof FuzzyWallet !== 'undefined' ? FuzzyWallet.state : null;
    const playerAddress = wallet && wallet.connected ? wallet.address : null;
    const playerName = playerAddress
      ? FuzzyWallet.truncateAddress(playerAddress)
      : 'Guest';

    // Update rate limit
    lastSubmitTime[game] = now;

    // Initialize game array if needed
    if (!scores[game]) scores[game] = [];

    // Create score entry
    const entry = {
      address: playerAddress,
      name: playerName,
      score: Math.floor(score),
      ts: now,
      session: sessionId,
      hasTrustline: wallet ? wallet.hasTrustline : false,
      eligible: !!(playerAddress && wallet && wallet.hasTrustline)
    };

    // If wallet connected, replace previous score if new one is higher
    if (playerAddress) {
      const existingIdx = scores[game].findIndex(s => s.address === playerAddress);
      if (existingIdx >= 0) {
        if (score > scores[game][existingIdx].score) {
          scores[game][existingIdx] = entry;
        }
        // Even if not higher, update the rate limit
      } else {
        scores[game].push(entry);
      }
    } else {
      // Guests: just add (capped at 50 guest entries per game)
      const guestEntries = scores[game].filter(s => !s.address);
      if (guestEntries.length < 50) {
        scores[game].push(entry);
      }
    }

    // Sort by score descending
    scores[game].sort((a, b) => b.score - a.score);

    // Keep only top 100 per game
    scores[game] = scores[game].slice(0, 100);

    // Update personal best
    if (!personalBests[game] || score > personalBests[game]) {
      personalBests[game] = Math.floor(score);
    }

    save();
    notify();

    return {
      success: true,
      rank: scores[game].findIndex(s =>
        s.address === playerAddress || (!s.address && s.session === sessionId)
      ) + 1,
      personalBest: personalBests[game],
      isNewBest: score >= personalBests[game]
    };
  }

  // ═══════════════════════════════════════════
  // LEADERBOARD DATA
  // ═══════════════════════════════════════════

  function getGameScores(gameSlug) {
    return (scores[gameSlug] || []).slice(0, 20);
  }

  function getPersonalBest(gameSlug) {
    return personalBests[gameSlug] || 0;
  }

  function getLeaderboard() {
    // Combined leaderboard: sum of best scores across all games
    const playerMap = {};

    for (const game of Object.keys(scores)) {
      for (const entry of scores[game]) {
        if (!entry.address) continue; // Skip guests

        if (!playerMap[entry.address]) {
          playerMap[entry.address] = {
            address: entry.address,
            name: entry.name,
            hasTrustline: entry.hasTrustline,
            eligible: entry.eligible,
            games: {},
            total: 0
          };
        }

        const existing = playerMap[entry.address].games[game] || 0;
        if (entry.score > existing) {
          playerMap[entry.address].games[game] = entry.score;
        }

        // Update trustline status (use latest)
        playerMap[entry.address].hasTrustline = entry.hasTrustline;
        playerMap[entry.address].eligible = entry.eligible;
      }
    }

    // Calculate totals
    for (const addr of Object.keys(playerMap)) {
      playerMap[addr].total = Object.values(playerMap[addr].games)
        .reduce((sum, s) => sum + s, 0);
    }

    // Sort by total descending
    const leaderboard = Object.values(playerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    return leaderboard;
  }

  function getGameSlugs() {
    return Object.keys(scores);
  }

  // ═══════════════════════════════════════════
  // POSTMESSAGE LISTENER
  // ═══════════════════════════════════════════
  function initMessageListener() {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'fuzzynuts_arcade') return;

      if (data.event === 'game_over' || data.event === 'game_win') {
        const result = submitScore({
          game: data.game,
          score: data.score,
          sessionId: data.sessionId,
          duration: data.duration
        });
        console.log('[Leaderboard] Score submitted:', result);
      }
    });
  }

  // ═══════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════
  function init() {
    load();
    initMessageListener();
  }

  // ═══════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════
  return {
    init,
    submitScore,
    getGameScores,
    getPersonalBest,
    getLeaderboard,
    getGameSlugs,
    getCurrentWeekKey,
    getTimeUntilReset,
    getWeekEndDate,
    onChange
  };
})();
