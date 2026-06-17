(function () {
  'use strict';

  // ── Canvas Setup ──
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('game-overlay');
  const scoreDisplay = document.getElementById('score-display');

  const BG_COLOR = '#0a0614';
  const BIRD_COLOR = '#fbbf24';
  const PIPE_COLORS = ['#10b981', '#059669', '#047857', '#065f46'];
  const GROUND_COLOR = '#1e1145';
  const GROUND_LINE = '#3b1d8e';

  // ── State ──
  let W, H;
  let bird, pipes, stars, groundX;
  let score, best, gameRunning, gameOver, startTime;
  let frameId;

  // ── Constants ──
  const GRAVITY = 0.45;
  const FLAP_VEL = -7.5;
  const BIRD_SIZE = 20;
  const PIPE_WIDTH = 52;
  const PIPE_GAP_BASE = 150;
  const PIPE_GAP_MIN = 90;
  const PIPE_SPEED_BASE = 2.5;
  const PIPE_INTERVAL = 95; // frames between pipe spawns
  const GROUND_H = 50;

  best = parseInt((function(){try{return localStorage.getItem('flappy_best')}catch(e){return null}})() || '0', 10);

  function resize() {
    const parent = canvas.parentElement || document.body;
    W = canvas.width = parent.clientWidth || 480;
    H = canvas.height = parent.clientHeight || 640;
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H - GROUND_H),
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.5 + 0.15,
        alpha: Math.random() * 0.6 + 0.4
      });
    }
  }

  function reset() {
    bird = { x: W * 0.28, y: H * 0.42, vy: 0, rotation: 0 };
    pipes = [];
    groundX = 0;
    score = 0;
    gameOver = false;
    startTime = Date.now();
    window.__gameScore = 0;
    updateHUD();
  }

  function startGame() {
    resize();
    initStars();
    reset();
    gameRunning = true;
    if (overlay) overlay.classList.add('hidden');
    if (frameId) cancelAnimationFrame(frameId);
    loop();
  }

  function updateHUD() {
    if (scoreDisplay) scoreDisplay.textContent = score;
    window.__gameScore = score;
  }

  function getMedal(s) {
    if (s >= 50) return { name: 'Platinum', color: '#e5e7eb', emoji: '💎' };
    if (s >= 30) return { name: 'Gold', color: '#fbbf24', emoji: '🥇' };
    if (s >= 20) return { name: 'Silver', color: '#9ca3af', emoji: '🥈' };
    if (s >= 10) return { name: 'Bronze', color: '#d97706', emoji: '🥉' };
    return null;
  }

  function currentGap() {
    return Math.max(PIPE_GAP_MIN, PIPE_GAP_BASE - score * 1.5);
  }

  function currentSpeed() {
    return PIPE_SPEED_BASE + score * 0.06;
  }

  function spawnPipe() {
    const gap = currentGap();
    const minY = 80;
    const maxY = H - GROUND_H - gap - 80;
    const topH = Math.random() * (maxY - minY) + minY;
    const colorIdx = pipes.length % PIPE_COLORS.length;
    pipes.push({
      x: W + 10,
      topH: topH,
      gap: gap,
      color: PIPE_COLORS[colorIdx],
      passed: false
    });
  }

  // ── Update ──
  function update() {
    // Bird
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Rotation
    const targetRot = bird.vy < 0 ? -0.45 : Math.min(bird.vy * 0.06, 1.2);
    bird.rotation += (targetRot - bird.rotation) * 0.15;

    // Ground collision
    if (bird.y + BIRD_SIZE > H - GROUND_H) {
      bird.y = H - GROUND_H - BIRD_SIZE;
      endGame();
      return;
    }
    // Ceiling
    if (bird.y < -BIRD_SIZE) {
      bird.y = -BIRD_SIZE;
      bird.vy = 0;
    }

    // Pipes
    const spd = currentSpeed();
    if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 160) {
      spawnPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= spd;

      // Scoring
      if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
        p.passed = true;
        score++;
        updateHUD();
      }

      // Collision
      if (
        bird.x + BIRD_SIZE > p.x &&
        bird.x - BIRD_SIZE < p.x + PIPE_WIDTH &&
        (bird.y - BIRD_SIZE < p.topH || bird.y + BIRD_SIZE > p.topH + p.gap)
      ) {
        endGame();
        return;
      }

      // Off screen
      if (p.x + PIPE_WIDTH < -10) pipes.splice(i, 1);
    }

    // Ground scroll
    groundX = (groundX - spd) % 40;

    // Stars
    for (const s of stars) {
      s.x -= s.speed;
      if (s.x < 0) { s.x = W; s.y = Math.random() * (H - GROUND_H); }
    }
  }

  // ── Draw ──
  function draw() {
    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pipes
    for (const p of pipes) {
      ctx.fillStyle = p.color;
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
      // Pipe cap top
      ctx.fillStyle = lighten(p.color, 20);
      ctx.fillRect(p.x - 4, p.topH - 16, PIPE_WIDTH + 8, 16);
      // Bottom pipe
      const botY = p.topH + p.gap;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, botY, PIPE_WIDTH, H - GROUND_H - botY);
      // Pipe cap bottom
      ctx.fillStyle = lighten(p.color, 20);
      ctx.fillRect(p.x - 4, botY, PIPE_WIDTH + 8, 16);
    }

    // Ground
    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
    ctx.strokeStyle = GROUND_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - GROUND_H);
    ctx.lineTo(W, H - GROUND_H);
    ctx.stroke();
    // Ground stripes
    ctx.strokeStyle = 'rgba(59,29,142,0.3)';
    ctx.lineWidth = 1;
    for (let gx = groundX; gx < W + 40; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, H - GROUND_H + 8);
      ctx.lineTo(gx + 20, H - GROUND_H + 8);
      ctx.stroke();
    }

    // Bird
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    // Body
    ctx.fillStyle = BIRD_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE, BIRD_SIZE * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(BIRD_SIZE * 0.45, -BIRD_SIZE * 0.25, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(BIRD_SIZE * 0.55, -BIRD_SIZE * 0.25, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE * 0.7, -3);
    ctx.lineTo(BIRD_SIZE * 1.2, 0);
    ctx.lineTo(BIRD_SIZE * 0.7, 4);
    ctx.closePath();
    ctx.fill();
    // Wing
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Score on canvas (large)
    if (gameRunning && !gameOver) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(score, W / 2, 60);
    }
  }

  function lighten(hex, amt) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amt);
    g = Math.min(255, g + amt);
    b = Math.min(255, b + amt);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  function loop() {
    if (!gameRunning) return;
    if (!gameOver) update();
    draw();
    if (gameRunning) frameId = requestAnimationFrame(loop);
  }

  function endGame() {
    gameOver = true;
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (score > best) {
      best = score;
      try { localStorage.setItem('flappy_best', String(best)) } catch(e) {}
    }
    window.__gameScore = score;

    // Show overlay with results
    if (overlay) {
      const medal = getMedal(score);
      overlay.classList.remove('hidden');
      overlay.innerHTML =
        '<div style="text-align:center;padding:30px;">' +
        '<h2 style="color:#fbbf24;font-family:monospace;font-size:28px;">Game Over</h2>' +
        '<p style="color:#fff;font-size:20px;margin:10px 0;">Score: ' + score + '</p>' +
        '<p style="color:#a78bfa;font-size:16px;">Best: ' + best + '</p>' +
        (medal ? '<p style="color:' + medal.color + ';font-size:22px;margin:8px 0;">' + medal.emoji + ' ' + medal.name + ' Medal!</p>' : '') +
        '<button onclick="window.__restartFlappy && window.__restartFlappy()" ' +
        'style="margin-top:16px;padding:10px 28px;font-size:16px;background:#fbbf24;color:#0a0614;' +
        'border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Play Again</button>' +
        '</div>';
    }

    if (typeof FuzzyScoreSubmit === 'function') {
      try { FuzzyScoreSubmit('flappy', score, duration); } catch (e) { /* ignore */ }
    }
  }

  function flap() {
    if (gameOver) return;
    if (!gameRunning) {
      startGame();
      bird.vy = FLAP_VEL;
      return;
    }
    bird.vy = FLAP_VEL;
  }

  // ── Input ──
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      flap();
    }
  });

  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    flap();
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    flap();
  }, { passive: false });

  // ── Restart hook ──
  window.__restartFlappy = function () {
    if (overlay) overlay.classList.add('hidden');
    startGame();
  };

  // ── Resize ──
  window.addEventListener('resize', function () {
    resize();
    if (!gameRunning) {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);
    }
  });

  // ── Init: show start screen ──
  resize();
  initStars();
  reset();
  gameRunning = false;

  // Draw initial frame
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Show start overlay
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.innerHTML =
      '<div style="text-align:center;padding:30px;">' +
      '<h2 style="color:#fbbf24;font-family:monospace;font-size:32px;">🐦 Flappy</h2>' +
      '<p style="color:#a78bfa;font-size:16px;margin:12px 0;">Press Space or Tap to play</p>' +
      (best > 0 ? '<p style="color:#6d28d9;font-size:14px;">Best: ' + best + '</p>' : '') +
      '</div>';
  }

})();
