/**
 * Snake Game – FuzzyNuts Arcade
 * Canvas 2D, vanilla JS, IIFE pattern
 */
(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const GRID         = 20;
  const BG_COLOR     = '#0a0614';
  const SNAKE_COLOR  = '#10b981';
  const FOOD_COLOR   = '#d4a843';
  const SPEED_COLOR  = '#06b6d4';  // cyan
  const MULTI_COLOR  = '#d4a843';  // gold
  const SHIELD_COLOR = '#ec4899';  // pink
  const FOOD_PTS     = 10;
  const POWERUP_PTS  = 5;
  const BASE_INTERVAL = 120;       // ms per tick at normal speed
  const BOOST_INTERVAL = 70;       // ms per tick when speed-boosted
  const POWERUP_CHANCE = 0.12;     // chance to spawn power-up instead of food
  const POWERUP_DURATION = 6000;   // ms

  // ── DOM refs ───────────────────────────────────────────────
  const canvas       = document.getElementById('game-canvas');
  const ctx          = canvas.getContext('2d');
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

  // ── State ──────────────────────────────────────────────────
  let cols, rows, snake, dir, nextDir, food, paused, score, combo;
  let lastTick, tickInterval, animId, gameRunning;
  let startTime, duration;
  let speedBoostEnd, shieldEnd, multiplierEnd, multiplier;
  let touchStartX, touchStartY, touchStartTime;

  // ── Helpers ────────────────────────────────────────────────
  function randInt(max) { return Math.floor(Math.random() * max); }

  function saveBest(s) {
    const prev = parseInt((function(){try{return localStorage.getItem('snake_best')}catch(e){return null}})() || '0', 10);
    if (s > prev) {
      try { localStorage.setItem('snake_best', String(s)) } catch(e) {}
      return true;
    }
    return false;
  }

  function loadBest() {
    return parseInt((function(){try{return localStorage.getItem('snake_best')}catch(e){return null}})() || '0', 10);
  }

  function showBest() {
    if (bestStart) bestStart.textContent = 'Best: ' + loadBest();
  }

  function resize() {
    const container = canvas.parentElement || document.getElementById('game-container');
    canvas.width  = container.clientWidth;
    canvas.height = container.clientHeight;
    cols = Math.floor(canvas.width  / GRID);
    rows = Math.floor(canvas.height / GRID);
  }

  function emptyCell() {
    let tries = 0;
    while (tries++ < 1000) {
      const c = { x: randInt(cols), y: randInt(rows) };
      const onSnake = snake.some(s => s.x === c.x && s.y === c.y);
      const onFood  = food && food.x === c.x && food.y === c.y;
      if (!onSnake && !onFood) return c;
    }
    return { x: 0, y: 0 };
  }

  // ── Power-ups ──────────────────────────────────────────────
  function maybeSpawnPowerup() {
    if (Math.random() < POWERUP_CHANCE) {
      const types = ['speed', 'multiplier', 'shield'];
      const type  = types[randInt(types.length)];
      const cell  = emptyCell();
      return { x: cell.x, y: cell.y, type: type };
    }
    return null;
  }

  let activePowerup = null;

  function applyPowerup(type) {
    const now = performance.now();
    if (type === 'speed') {
      speedBoostEnd = now + POWERUP_DURATION;
    } else if (type === 'multiplier') {
      multiplierEnd = now + POWERUP_DURATION;
      multiplier = 2;
    } else if (type === 'shield') {
      shieldEnd = now + POWERUP_DURATION;
    }
  }

  function updatePowerupTimers(now) {
    if (speedBoostEnd && now > speedBoostEnd) speedBoostEnd = 0;
    if (multiplierEnd && now > multiplierEnd) { multiplierEnd = 0; multiplier = 1; }
    if (shieldEnd && now > shieldEnd) shieldEnd = 0;
  }

  // ── Init / Reset ───────────────────────────────────────────
  function initGame() {
    resize();
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    combo = 0;
    multiplier = 1;
    speedBoostEnd = 0;
    shieldEnd = 0;
    multiplierEnd = 0;
    activePowerup = null;
    paused = true;
    gameRunning = true;
    tickInterval = BASE_INTERVAL;
    lastTick = 0;
    startTime = Date.now();
    duration = 0;
    food = emptyCell();
    window.__gameScore = 0;
    updateHUD();
  }

  // ── HUD ────────────────────────────────────────────────────
  function updateHUD() {
    if (scoreDisplay) scoreDisplay.textContent = 'Score: ' + score;
    if (livesDisplay) livesDisplay.textContent = '';
    if (levelDisplay) levelDisplay.textContent = speedBoostEnd > performance.now() ? '⚡FAST' : (multiplier > 1 ? '×' + multiplier : '');
  }

  // ── Input ──────────────────────────────────────────────────
  const DIR_MAP = {
    ArrowUp:    { x:  0, y: -1 }, KeyW: { x:  0, y: -1 },
    ArrowDown:  { x:  0, y:  1 }, KeyS: { x:  0, y:  1 },
    ArrowLeft:  { x: -1, y:  0 }, KeyA: { x: -1, y:  0 },
    ArrowRight: { x:  1, y:  0 }, KeyD: { x:  1, y:  0 },
  };

  function setDirection(nd) {
    // prevent 180° turn
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
  }

  document.addEventListener('keydown', function (e) {
    const nd = DIR_MAP[e.code];
    if (nd) {
      e.preventDefault();
      if (paused) { paused = false; }
      setDirection(nd);
    }
  });

  // ── Touch / Swipe ──────────────────────────────────────────
  canvas.addEventListener('touchstart', function (e) {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  canvas.addEventListener('touchend', function (e) {
    if (!touchStartTime) return;
    const dt = Date.now() - touchStartTime;
    if (dt > 300) return; // too slow
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) { // tap – unpause
      if (paused) paused = false;
      return;
    }
    if (paused) paused = false;
    if (absDx > absDy) {
      setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
    } else {
      setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
    }
  }, { passive: true });

  // ── Game Over ──────────────────────────────────────────────
  function gameOver() {
    gameRunning = false;
    duration = Math.round((Date.now() - startTime) / 1000);
    window.__gameScore = score;
    const isNew = saveBest(score);
    if (finalScoreEl) finalScoreEl.textContent = 'Score: ' + score;
    if (newBestEl) newBestEl.style.display = isNew ? 'block' : 'none';
    if (gameOverEl) gameOverEl.classList.add('visible');
    if (canvas) canvas.style.display = 'none';
    try {
      if (typeof FuzzyScoreSubmit === 'function') {
        FuzzyScoreSubmit('snake', score, duration);
      }
    } catch (_) {}
  }

  // ── Tick ───────────────────────────────────────────────────
  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wall collision
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      if (shieldEnd > performance.now()) {
        // wrap around with shield
        head.x = (head.x + cols) % cols;
        head.y = (head.y + rows) % rows;
      } else {
        gameOver();
        return;
      }
    }

    // self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      if (shieldEnd > performance.now()) {
        // ignore collision – shield active
      } else {
        gameOver();
        return;
      }
    }

    snake.unshift(head);

    let ate = false;

    // eat food
    if (food && head.x === food.x && head.y === food.y) {
      combo++;
      const comboBonus = Math.min(combo, 5) * 2;
      score += (FOOD_PTS + comboBonus) * multiplier;
      ate = true;
      food = emptyCell();
      activePowerup = maybeSpawnPowerup();
    }

    // eat powerup
    if (activePowerup && head.x === activePowerup.x && head.y === activePowerup.y) {
      score += POWERUP_PTS * multiplier;
      applyPowerup(activePowerup.type);
      activePowerup = null;
      ate = true;
    }

    if (!ate) {
      snake.pop();
      combo = 0; // reset combo on non-eat tick
    }

    window.__gameScore = score;
    updateHUD();
  }

  // ── Draw ───────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * GRID, 0); ctx.lineTo(x * GRID, rows * GRID); ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * GRID); ctx.lineTo(cols * GRID, y * GRID); ctx.stroke();
    }

    // snake
    snake.forEach(function (seg, i) {
      const isHead = i === 0;
      const alpha  = isHead ? 1 : Math.max(0.4, 1 - i / snake.length * 0.6);
      ctx.fillStyle = SNAKE_COLOR;
      ctx.globalAlpha = alpha;
      const pad = isHead ? 1 : 2;
      ctx.fillRect(seg.x * GRID + pad, seg.y * GRID + pad, GRID - pad * 2, GRID - pad * 2);
      if (shieldEnd > performance.now()) {
        ctx.strokeStyle = SHIELD_COLOR;
        ctx.lineWidth = 2;
        ctx.strokeRect(seg.x * GRID + pad, seg.y * GRID + pad, GRID - pad * 2, GRID - pad * 2);
      }
    });
    ctx.globalAlpha = 1;

    // food
    if (food) {
      ctx.fillStyle = FOOD_COLOR;
      ctx.beginPath();
      ctx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // power-up
    if (activePowerup) {
      const color = activePowerup.type === 'speed' ? SPEED_COLOR :
                    activePowerup.type === 'multiplier' ? MULTI_COLOR : SHIELD_COLOR;
      ctx.fillStyle = color;
      const px = activePowerup.x * GRID + GRID / 2;
      const py = activePowerup.y * GRID + GRID / 2;
      ctx.beginPath();
      // diamond shape
      ctx.moveTo(px, py - GRID / 2 + 2);
      ctx.lineTo(px + GRID / 2 - 2, py);
      ctx.lineTo(px, py + GRID / 2 - 2);
      ctx.lineTo(px - GRID / 2 + 2, py);
      ctx.closePath();
      ctx.fill();
    }

    // pause overlay
    if (paused && gameRunning) {
      ctx.fillStyle = 'rgba(10,6,20,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS ANY KEY TO START', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'start';
    }
  }

  // ── Loop ───────────────────────────────────────────────────
  function loop(ts) {
    if (!gameRunning) return;
    animId = requestAnimationFrame(loop);

    updatePowerupTimers(ts);
    tickInterval = (speedBoostEnd > ts) ? BOOST_INTERVAL : BASE_INTERVAL;

    if (!paused && ts - lastTick >= tickInterval) {
      lastTick = ts;
      tick();
      if (!gameRunning) return; // gameOver called inside tick
    }

    draw();
  }

  // ── Start / Restart ────────────────────────────────────────
  function startGame() {
    if (animId) cancelAnimationFrame(animId);
    initGame();
    if (startScreen)  startScreen.style.display  = 'none';
    if (gameOverEl)   gameOverEl.classList.remove('visible');
    if (canvas)       canvas.style.display = 'block';
    draw();
    lastTick = performance.now();
    animId = requestAnimationFrame(loop);
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
