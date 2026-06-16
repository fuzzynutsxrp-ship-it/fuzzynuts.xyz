(function() {
  'use strict';

  // --- Config ---
  const BG_COLOR = '#0a0614';
  const PADDLE_COLOR = '#f59e0b';
  const BALL_COLOR = '#ffffff';
  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_PADDING = 4;
  const BRICK_TOP_OFFSET = 60;
  const PADDLE_HEIGHT = 14;
  const PADDLE_WIDTH_DEFAULT = 100;
  const PADDLE_WIDTH_WIDE = 160;
  const BALL_RADIUS = 6;
  const INITIAL_LIVES = 3;
  const POWERUP_CHANCE = 0.15;
  const POWERUP_SIZE = 18;
  const POWERUP_SPEED = 2.5;
  const BASE_BALL_SPEED = 4;
  const SPEED_INCREMENT = 0.4;

  const ROW_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
  const ROW_POINTS =  [50,        40,        30,        20,        10,        10];

  // --- State ---
  let canvas, ctx, W, H;
  let paddle, balls, bricks, powerups, particles;
  let score, lives, level, bestScore, gameStartTime;
  let running, gameOver, waitingForServe;
  let keys = {};
  let mouseX = null;
  let paddleWidth = PADDLE_WIDTH_DEFAULT;
  let wideTimer = 0;
  let slowTimer = 0;

  // --- DOM refs ---
  function el(id) { return document.getElementById(id); }

  // --- Init ---
  function init() {
    canvas = el('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    bestScore = parseInt((function(){try{return localStorage.getItem('breakout_best')}catch(e){return null}})() || '0', 10);
    resize();
    bindEvents();
    resetGame();
    loop();
  }

  function resize() {
    const parent = canvas.parentElement || document.body;
    W = parent.clientWidth || 800;
    H = parent.clientHeight || 600;
    canvas.width = W;
    canvas.height = H;
  }

  function resetGame() {
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    gameStartTime = Date.now();
    paddleWidth = PADDLE_WIDTH_DEFAULT;
    wideTimer = 0;
    slowTimer = 0;
    window.__gameScore = 0;
    paddle = { x: W / 2 - paddleWidth / 2, y: H - 40, w: paddleWidth, h: PADDLE_HEIGHT };
    balls = [];
    powerups = [];
    particles = [];
    buildBricks();
    updateHUD();
    waitingForServe = true;
    gameOver = false;
    running = true;
  }

  function buildBricks() {
    bricks = [];
    const brickW = (W - (BRICK_COLS + 1) * BRICK_PADDING) / BRICK_COLS;
    const brickH = 22;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_PADDING + c * (brickW + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + r * (brickH + BRICK_PADDING),
          w: brickW,
          h: brickH,
          color: ROW_COLORS[r],
          points: ROW_POINTS[r],
          alive: true,
          row: r
        });
      }
    }
  }

  function serveBall() {
    const speed = BASE_BALL_SPEED + (level - 1) * SPEED_INCREMENT;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    balls.push({
      x: paddle.x + paddle.w / 2,
      y: paddle.y - BALL_RADIUS - 1,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: BALL_RADIUS
    });
    waitingForServe = false;
  }

  // --- Input ---
  function bindEvents() {
    window.addEventListener('keydown', function(e) {
      keys[e.key] = true;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
      if (waitingForServe && (e.key === ' ' || e.key === 'Enter')) { serveBall(); hideOverlay('start-overlay'); }
      if (gameOver && (e.key === ' ' || e.key === 'Enter')) { hideOverlay('gameover-overlay'); resetGame(); }
    });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });
    canvas.addEventListener('mousemove', function(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * (W / rect.width);
    });
    canvas.addEventListener('click', function() {
      if (waitingForServe) { serveBall(); hideOverlay('start-overlay'); }
      if (gameOver) { hideOverlay('gameover-overlay'); resetGame(); }
    });
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handleTouch(e); }, { passive: false });
    canvas.addEventListener('touchmove', function(e) { e.preventDefault(); handleTouch(e); }, { passive: false });
    canvas.addEventListener('touchend', function(e) {
      if (waitingForServe) { serveBall(); hideOverlay('start-overlay'); }
      if (gameOver) { hideOverlay('gameover-overlay'); resetGame(); }
    });
    window.addEventListener('resize', resize);
  }

  function handleTouch(e) {
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (touch.clientX - rect.left) * (W / rect.width);
  }

  // --- Overlays ---
  function hideOverlay(id) { const o = el(id); if (o) o.style.display = 'none'; }
  function showOverlay(id) { const o = el(id); if (o) o.style.display = 'flex'; }

  // --- HUD ---
  function updateHUD() {
    const sd = el('score-display');
    if (sd) sd.textContent = 'Score: ' + score + '  Level: ' + level + '  Best: ' + bestScore;
    const ld = el('lives-display');
    if (ld) ld.textContent = 'Lives: ' + '❤'.repeat(Math.max(0, lives));
  }

  // --- Particles ---
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color: color,
        r: 2 + Math.random() * 2
      });
    }
  }

  // --- Update ---
  function update() {
    if (!running || gameOver) return;

    // Paddle movement
    const speed = 8;
    if (keys['ArrowLeft']) paddle.x -= speed;
    if (keys['ArrowRight']) paddle.x += speed;
    if (mouseX !== null) {
      paddle.x = mouseX - paddle.w / 2;
    }
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    // Wide paddle timer
    if (wideTimer > 0) {
      wideTimer--;
      paddle.w = PADDLE_WIDTH_WIDE;
      if (wideTimer === 0) paddle.w = PADDLE_WIDTH_DEFAULT;
    }

    // Slow ball timer
    if (slowTimer > 0) slowTimer--;

    // Balls
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      let speedMult = slowTimer > 0 ? 0.6 : 1;
      b.x += b.vx * speedMult;
      b.y += b.vy * speedMult;

      // Wall bounces
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

      // Fall off bottom
      if (b.y + b.r > H) {
        balls.splice(i, 1);
        continue;
      }

      // Paddle collision
      if (b.vy > 0 &&
          b.y + b.r >= paddle.y && b.y + b.r <= paddle.y + paddle.h &&
          b.x >= paddle.x && b.x <= paddle.x + paddle.w) {
        const hitPos = (b.x - paddle.x) / paddle.w; // 0..1
        const angle = -Math.PI * (0.15 + 0.7 * (1 - hitPos)); // left=steep, right=shallow
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = Math.cos(angle) * spd;
        b.vy = Math.sin(angle) * spd;
        b.y = paddle.y - b.r;
      }

      // Brick collision
      for (let j = 0; j < bricks.length; j++) {
        const br = bricks[j];
        if (!br.alive) continue;
        if (ballRect(b, br)) {
          br.alive = false;
          score += br.points;
          window.__gameScore = score;
          spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 8);
          // Reflect
          const cx = br.x + br.w / 2;
          const cy = br.y + br.h / 2;
          const dx = b.x - cx;
          const dy = b.y - cy;
          if (Math.abs(dx / br.w) > Math.abs(dy / br.h)) {
            b.vx = -b.vx;
          } else {
            b.vy = -b.vy;
          }
          // Powerup chance
          if (Math.random() < POWERUP_CHANCE) {
            spawnPowerup(br.x + br.w / 2, br.y + br.h / 2);
          }
          break;
        }
      }
    }

    // Check no balls
    if (balls.length === 0 && !waitingForServe) {
      lives--;
      updateHUD();
      if (lives <= 0) {
        endGame();
        return;
      }
      waitingForServe = true;
      paddle.w = PADDLE_WIDTH_DEFAULT;
      wideTimer = 0;
      slowTimer = 0;
    }

    // Level clear
    if (bricks.every(b => !b.alive)) {
      score += level * 100;
      window.__gameScore = score;
      level++;
      buildBricks();
      balls = [];
      powerups = [];
      waitingForServe = true;
      paddle.w = PADDLE_WIDTH_DEFAULT;
      wideTimer = 0;
      slowTimer = 0;
    }

    // Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += POWERUP_SPEED;
      if (p.y > H) { powerups.splice(i, 1); continue; }
      if (p.y + POWERUP_SIZE >= paddle.y && p.y <= paddle.y + paddle.h &&
          p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
        applyPowerup(p.type);
        spawnParticles(p.x, p.y, p.color, 12);
        powerups.splice(i, 1);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateHUD();
  }

  function ballRect(ball, rect) {
    const cx = Math.max(rect.x, Math.min(rect.x + rect.w, ball.x));
    const cy = Math.max(rect.y, Math.min(rect.y + rect.h, ball.y));
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  function spawnPowerup(x, y) {
    const types = [
      { type: 'wide', color: '#22c55e', label: 'W' },
      { type: 'multi', color: '#06b6d4', label: 'M' },
      { type: 'slow', color: '#a855f7', label: 'S' }
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    powerups.push({ x: x, y: y, type: t.type, color: t.color, label: t.label });
  }

  function applyPowerup(type) {
    if (type === 'wide') {
      wideTimer = 600; // ~10s at 60fps
    } else if (type === 'multi') {
      const newBalls = [];
      balls.forEach(b => {
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        for (let k = -1; k <= 1; k += 2) {
          const a = Math.atan2(b.vy, b.vx) + k * 0.4;
          newBalls.push({ x: b.x, y: b.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: BALL_RADIUS });
        }
      });
      balls = balls.concat(newBalls);
    } else if (type === 'slow') {
      slowTimer = 360; // ~6s
    }
  }

  function endGame() {
    gameOver = true;
    running = false;
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('breakout_best', bestScore) } catch(e) {};
    }
    window.__gameScore = score;
    updateHUD();
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('breakout', score, duration);
    }
    const go = el('gameover-overlay');
    if (go) {
      const msg = el('final-score');
      if (msg) msg.textContent = 'Score: ' + score + ' | Level: ' + level;
      showOverlay('gameover-overlay');
    }
  }

  // --- Draw ---
  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Paddle
    ctx.fillStyle = PADDLE_COLOR;
    ctx.shadowColor = PADDLE_COLOR;
    ctx.shadowBlur = 10;
    roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Balls
    balls.forEach(b => {
      ctx.fillStyle = BALL_COLOR;
      ctx.shadowColor = BALL_COLOR;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Powerups
    powerups.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y);
    });

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / 50;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Waiting text
    if (waitingForServe && !gameOver) {
      ctx.fillStyle = '#ffffff88';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Click / Tap / Space to launch', W / 2, H / 2 + 40);
    }
  }

  function roundRect(x, y, w, h, r) {
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

  // --- Loop ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
