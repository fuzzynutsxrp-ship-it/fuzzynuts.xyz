/**
 * Memory Match – FuzzyNuts Arcade
 * Canvas 2D card matching game, vanilla JS, IIFE pattern
 */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const BG_COLOR      = '#0a0614';
  const CARD_BACK     = '#a855f7';
  const CARD_FACE     = '#1a1025';
  const CARD_MATCHED  = 'rgba(168, 85, 247, 0.15)';
  const CARD_GLOW     = '#a855f7';
  const CARD_BORDER   = '#7c3aed';
  const TEXT_COLOR     = '#e5e7eb';
  const ACCENT        = '#a855f7';
  const GOLD          = '#d4a843';
  const CARD_RADIUS   = 10;
  const CARD_PADDING  = 8;
  const FLIP_SPEED    = 0.08;       // progress per frame (0→1 in ~12 frames)
  const MISMATCH_DELAY = 1000;      // ms before mismatched cards flip back
  const MATCH_GLOW_DUR = 600;       // ms match glow lasts
  const BASE_MATCH_PTS = 100;
  const TIME_BONUS_MAX = 50;        // max bonus per match for speed
  const COMBO_MULT_MAX = 5;         // max combo multiplier
  const MISMATCH_PENALTY = 5;       // moves penalty already enough

  const LEVELS = [
    { cols: 4, rows: 3, pairs: 6 },
    { cols: 4, rows: 4, pairs: 8 },
    { cols: 5, rows: 4, pairs: 10 },
    { cols: 6, rows: 5, pairs: 15 }
  ];

  const EMOJIS = [
    '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🥝',
    '🍍', '🥭', '🫐', '🍌', '🍉', '🍐', '🥥', '🍅',
    '🌽', '🥕', '🥑', '🫒', '🍄', '🌶️', '🥒', '🧅',
    '🌻', '🌹', '🌺', '🌸', '💐', '🌷'
  ];

  // ── DOM refs ───────────────────────────────────────────────
  const canvas       = document.getElementById('game-canvas');
  const ctx          = canvas ? canvas.getContext('2d') : null;
  const startScreen  = document.getElementById('start-screen');
  const gameOverEl   = document.getElementById('game-over');
  const finalScoreEl = document.getElementById('final-score');
  const newBestEl    = document.getElementById('new-best');
  const restartBtn   = document.getElementById('restart-btn');
  const startBtn     = document.getElementById('start-btn');
  const scoreDisplay = document.getElementById('score-display');
  const bestStart    = document.getElementById('best-score-start');
  const livesDisplay = document.getElementById('lives-display');
  const levelDisplay = document.getElementById('level-display');
  const movesDisplay = document.getElementById('moves-display');
  const timerDisplay = document.getElementById('timer-display');

  // ── State ──────────────────────────────────────────────────
  let cards = [];
  let gridCols, gridRows, numPairs;
  let level, score, moves, combo, comboMultiplier;
  let flippedIndices = [];
  let locked = false;
  let animId, gameRunning;
  let startTime, elapsed, duration;
  let matchAnimations = [];   // { cardIdx, startTime }
  let cardWidth, cardHeight, gridOffsetX, gridOffsetY;
  let bestScore;
  let timerInterval;

  // ── Helpers ────────────────────────────────────────────────
  function randInt(max) { return Math.floor(Math.random() * max); }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function loadBest() {
    return parseInt(localStorage.getItem('memory_best') || '0', 10);
  }

  function saveBest(s) {
    const prev = loadBest();
    if (s > prev) {
      localStorage.setItem('memory_best', String(s));
      return true;
    }
    return false;
  }

  function showBest() {
    if (bestStart) bestStart.textContent = 'Best: ' + loadBest();
  }

  function updateHUD() {
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (levelDisplay) levelDisplay.textContent = 'Lv ' + (level + 1);
    if (movesDisplay) movesDisplay.textContent = moves + ' moves';
    if (timerDisplay) {
      const sec = Math.floor(elapsed / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      timerDisplay.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
  }

  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ── Resize / Grid Calculation ──────────────────────────────
  function resize() {
    if (!canvas) return;
    const container = canvas.parentElement || document.getElementById('game-container');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    calculateGrid();
  }

  function calculateGrid() {
    if (!canvas) return;
    const hudHeight = 48;
    const availW = canvas.width - 20;
    const availH = canvas.height - hudHeight - 20;

    cardWidth  = Math.floor((availW - (gridCols + 1) * CARD_PADDING) / gridCols);
    cardHeight = Math.floor((availH - (gridRows + 1) * CARD_PADDING) / gridRows);

    // keep cards roughly square, max ~120px
    const maxDim = Math.min(cardWidth, cardHeight, 120);
    cardWidth  = maxDim;
    cardHeight = Math.floor(maxDim * 1.25); // slightly taller than wide

    const totalGridW = gridCols * (cardWidth + CARD_PADDING) + CARD_PADDING;
    const totalGridH = gridRows * (cardHeight + CARD_PADDING) + CARD_PADDING;

    gridOffsetX = Math.floor((canvas.width - totalGridW) / 2);
    gridOffsetY = Math.floor((canvas.height - totalGridH) / 2) + 10;
  }

  // ── Card Creation ──────────────────────────────────────────
  function createCards() {
    const lvl = LEVELS[Math.min(level, LEVELS.length - 1)];
    gridCols = lvl.cols;
    gridRows = lvl.rows;
    numPairs = lvl.pairs;

    const chosen = shuffle(EMOJIS.slice()).slice(0, numPairs);
    const deck = shuffle(chosen.concat(chosen));

    cards = [];
    for (let i = 0; i < deck.length; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      cards.push({
        emoji: deck[i],
        col: col,
        row: row,
        faceUp: false,
        matched: false,
        flipProgress: 0,   // 0 = face down, 1 = face up
        flipDirection: 0,  // 0 = none, 1 = flipping up, -1 = flipping down
        glowStart: 0       // timestamp when match glow began, 0 = no glow
      });
    }
    calculateGrid();
  }

  // ── Card Geometry ──────────────────────────────────────────
  function cardX(c) { return gridOffsetX + c.col * (cardWidth + CARD_PADDING) + CARD_PADDING; }
  function cardY(c) { return gridOffsetY + c.row * (cardHeight + CARD_PADDING) + CARD_PADDING; }

  function hitTest(mx, my) {
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.matched) continue;
      const x = cardX(c), y = cardY(c);
      if (mx >= x && mx <= x + cardWidth && my >= y && my <= y + cardHeight) return i;
    }
    return -1;
  }

  // ── Flip Logic ─────────────────────────────────────────────
  function flipCard(idx) {
    const c = cards[idx];
    if (c.faceUp || c.matched || locked) return;
    if (flippedIndices.length >= 2) return;

    c.faceUp = true;
    c.flipDirection = 1;
    flippedIndices.push(idx);

    if (flippedIndices.length === 2) {
      moves++;
      checkMatch();
    }
  }

  function checkMatch() {
    const a = cards[flippedIndices[0]];
    const b = cards[flippedIndices[1]];

    if (a.emoji === b.emoji) {
      // Match!
      locked = true;
      setTimeout(function () {
        a.matched = true;
        b.matched = true;
        a.glowStart = performance.now();
        b.glowStart = performance.now();
        matchAnimations.push({ idx: flippedIndices[0], startTime: a.glowStart });
        matchAnimations.push({ idx: flippedIndices[1], startTime: b.glowStart });

        // Scoring
        combo++;
        comboMultiplier = Math.min(1 + Math.floor(combo / 2), COMBO_MULT_MAX);
        const timeBonus = Math.max(0, TIME_BONUS_MAX - Math.floor(elapsed / 1000));
        const pts = (BASE_MATCH_PTS + timeBonus) * comboMultiplier;
        score += pts;

        window.__gameScore = score;
        updateHUD();

        flippedIndices = [];
        locked = false;

        // Check win
        if (cards.every(function (c) { return c.matched; })) {
          levelComplete();
        }
      }, 200);
    } else {
      // Mismatch
      combo = 0;
      comboMultiplier = 1;
      locked = true;
      setTimeout(function () {
        a.faceUp = false;
        a.flipDirection = -1;
        b.faceUp = false;
        b.flipDirection = -1;
        flippedIndices = [];
        locked = false;
      }, MISMATCH_DELAY);
    }
  }

  // ── Level Complete ─────────────────────────────────────────
  function levelComplete() {
    if (level < LEVELS.length - 1) {
      // Advance level
      level++;
      // Time bonus for completing level quickly
      const levelBonus = Math.max(0, 500 - Math.floor(elapsed / 1000) * 5);
      score += levelBonus;
      window.__gameScore = score;
      updateHUD();

      setTimeout(function () {
        flippedIndices = [];
        matchAnimations = [];
        createCards();
      }, 800);
    } else {
      // All levels complete – game over (win)
      gameOver(true);
    }
  }

  // ── Game Over ──────────────────────────────────────────────
  function gameOver(won) {
    gameRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    duration = Math.round((Date.now() - startTime) / 1000);
    window.__gameScore = score;
    bestScore = loadBest();
    const isNew = saveBest(score);

    if (finalScoreEl) {
      finalScoreEl.textContent = (won ? '🎉 You Win! ' : '') + 'Score: ' + score;
    }
    if (newBestEl) newBestEl.style.display = isNew ? 'block' : 'none';
    if (gameOverEl) gameOverEl.classList.add('visible');
    if (canvas) canvas.style.display = 'none';

    try {
      if (typeof FuzzyScoreSubmit === 'function') {
        FuzzyScoreSubmit('memory', score, duration);
      }
    } catch (_) {}
  }

  // ── Update (animations) ────────────────────────────────────
  function update() {
    const now = performance.now();

    // Update flip animations
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (c.flipDirection === 1) {
        c.flipProgress += FLIP_SPEED;
        if (c.flipProgress >= 1) {
          c.flipProgress = 1;
          c.flipDirection = 0;
        }
      } else if (c.flipDirection === -1) {
        c.flipProgress -= FLIP_SPEED;
        if (c.flipProgress <= 0) {
          c.flipProgress = 0;
          c.flipDirection = 0;
        }
      }
    }

    // Clean expired match animations
    matchAnimations = matchAnimations.filter(function (a) {
      return now - a.startTime < MATCH_GLOW_DUR;
    });
  }

  // ── Draw ───────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Draw subtle grid pattern
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Draw cards
    for (let i = 0; i < cards.length; i++) {
      drawCard(cards[i], i);
    }
  }

  function drawCard(c, idx) {
    const x = cardX(c);
    const y = cardY(c);
    const cx = x + cardWidth / 2;
    const cy = y + cardHeight / 2;
    const now = performance.now();

    // Flip animation: scale X from 1 → 0 → 1
    let scaleX;
    let showingFace;

    if (c.flipProgress <= 0.5) {
      scaleX = 1 - c.flipProgress * 2;       // 1 → 0
      showingFace = false;
    } else {
      scaleX = (c.flipProgress - 0.5) * 2;   // 0 → 1
      showingFace = true;
    }

    // Match glow
    let glowAlpha = 0;
    if (c.glowStart > 0) {
      const elapsed = now - c.glowStart;
      if (elapsed < MATCH_GLOW_DUR) {
        glowAlpha = Math.sin((elapsed / MATCH_GLOW_DUR) * Math.PI);
      }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.max(scaleX, 0.01), 1);

    const hw = cardWidth / 2;
    const hh = cardHeight / 2;

    // Glow effect behind card
    if (glowAlpha > 0) {
      ctx.shadowColor = CARD_GLOW;
      ctx.shadowBlur = 20 * glowAlpha;
      ctx.fillStyle = 'rgba(168, 85, 247, ' + (glowAlpha * 0.4) + ')';
      roundRect(ctx, -hw, -hh, cardWidth, cardHeight, CARD_RADIUS);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Card body
    if (showingFace || c.matched) {
      // Face (emoji side)
      ctx.fillStyle = c.matched ? CARD_MATCHED : CARD_FACE;
      roundRect(ctx, -hw, -hh, cardWidth, cardHeight, CARD_RADIUS);
      ctx.fill();

      // Border
      ctx.strokeStyle = c.matched ? CARD_GLOW : CARD_BORDER;
      ctx.lineWidth = c.matched ? 2 : 1;
      roundRect(ctx, -hw, -hh, cardWidth, cardHeight, CARD_RADIUS);
      ctx.stroke();

      // Emoji
      const fontSize = Math.min(cardWidth, cardHeight) * 0.5;
      ctx.font = fontSize + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(c.emoji, 0, 2);

    } else {
      // Back side
      ctx.fillStyle = CARD_BACK;
      roundRect(ctx, -hw, -hh, cardWidth, cardHeight, CARD_RADIUS);
      ctx.fill();

      // Border
      ctx.strokeStyle = CARD_BORDER;
      ctx.lineWidth = 1;
      roundRect(ctx, -hw, -hh, cardWidth, cardHeight, CARD_RADIUS);
      ctx.stroke();

      // Decorative pattern on back
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      const innerPad = 8;
      roundRect(ctx, -hw + innerPad, -hh + innerPad, cardWidth - innerPad * 2, cardHeight - innerPad * 2, CARD_RADIUS - 3);
      ctx.fill();

      // Question mark or fuzzy icon
      const iconSize = Math.min(cardWidth, cardHeight) * 0.3;
      ctx.font = 'bold ' + iconSize + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('?', 0, 2);
    }

    ctx.restore();
  }

  // Rounded rectangle helper
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Game Loop ──────────────────────────────────────────────
  function loop() {
    if (!gameRunning) return;
    animId = requestAnimationFrame(loop);

    elapsed = Date.now() - startTime;
    updateHUD();
    update();
    draw();
  }

  // ── Init ───────────────────────────────────────────────────
  function initGame() {
    level = 0;
    score = 0;
    moves = 0;
    combo = 0;
    comboMultiplier = 1;
    elapsed = 0;
    flippedIndices = [];
    matchAnimations = [];
    locked = false;
    window.__gameScore = 0;
    createCards();
  }

  // ── Start / Restart ────────────────────────────────────────
  function startGame() {
    if (animId) cancelAnimationFrame(animId);
    if (timerInterval) clearInterval(timerInterval);

    initGame();

    if (startScreen)  startScreen.style.display  = 'none';
    if (gameOverEl)   gameOverEl.classList.remove('visible');
    if (canvas)       canvas.style.display = 'block';

    startTime = Date.now();
    gameRunning = true;
    updateHUD();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ── Input ──────────────────────────────────────────────────
  function handleClick(e) {
    if (!gameRunning || locked) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const idx = hitTest(mx, my);
    if (idx >= 0) flipCard(idx);
  }

  function handleTouch(e) {
    if (!gameRunning || locked) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (touch.clientX - rect.left) * scaleX;
    const my = (touch.clientY - rect.top) * scaleY;

    const idx = hitTest(mx, my);
    if (idx >= 0) flipCard(idx);
  }

  if (canvas) {
    canvas.addEventListener('click', handleClick, { passive: true });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', function(e) { e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchstart', handleTouch, { passive: false });
  canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
  }

  // ── Wire buttons ───────────────────────────────────────────
  if (startBtn)   startBtn.addEventListener('click', startGame);
  if (restartBtn) restartBtn.addEventListener('click', startGame);

  // ── Resize ─────────────────────────────────────────────────
  window.addEventListener('resize', function () {
    resize();
    if (gameRunning) draw();
  });

  // ── Boot ───────────────────────────────────────────────────
  resize();
  showBest();
})();
