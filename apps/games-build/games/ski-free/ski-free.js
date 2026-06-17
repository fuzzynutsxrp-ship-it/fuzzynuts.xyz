(function () {
  'use strict';

  /* ── constants ── */
  const BG       = '#0a0614';
  const CYAN     = '#22d3ee';
  const TREE_CLR = '#22c55e';
  const ROCK_CLR = '#6b7280';
  const JUMP_CLR = '#d946ef';
  const YETI_CLR = '#f5f5f5';
  const MOGUL_CLR = '#1e1b3a';
  const TRAIL_CLR = 'rgba(255,255,255,0.08)';
  const SNOW_CLR  = 'rgba(255,255,255,0.7)';

  const START_SPEED   = 3;
  const MAX_SPEED     = 12;
  const BRAKE_FACTOR  = 0.35;
  const STEER_SPEED   = 5;
  const SKIER_W       = 14;
  const SKIER_H       = 22;
  const TREE_R        = 16;
  const ROCK_R        = 12;
  const JUMP_W        = 30;
  const JUMP_H        = 8;
  const YETI_W        = 28;
  const YETI_H        = 40;
  const SNOW_COUNT    = 80;
  const TRAIL_MAX     = 120;
  const YETI_DELAY    = 120000; // 2 minutes
  const TRICK_BONUS   = 150;

  /* ── canvas ── */
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); }

  /* ── state ── */
  let running = false, gameOver = false, started = false;
  let skierX, skierY, speed, score, braking, airborne, airTimer, trickDone;
  let obstacles, snowParticles, trailMarks, mogulBumps;
  let yeti, yetiActive, startTime;
  let bestScore = parseInt(localStorage.getItem('ski-free_best') || '0', 10);
  let lastTs = 0;

  /* ── input ── */
  const keys = {};
  let touchStartX = 0, touchStartY = 0, touching = false;

  document.addEventListener('keydown', e => { keys[e.key] = true;  e.preventDefault(); });
  document.addEventListener('keyup',   e => { keys[e.key] = false; });

  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY; touching = true;
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
    if (!touching) return; touching = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -30) keys.ArrowLeft = true;
      else if (dx > 30) keys.ArrowRight = true;
      setTimeout(() => { keys.ArrowLeft = false; keys.ArrowRight = false; }, 150);
    } else if (dy > 30) {
      keys.ArrowDown = true;
      setTimeout(() => { keys.ArrowDown = false; }, 300);
    } else if (dy < -30 && airborne) {
      doTrick();
    }
  });

  /* ── helpers ── */
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }

  function spawnObstacle() {
    const r = Math.random();
    let type;
    if (r < 0.55) type = 'tree';
    else if (r < 0.80) type = 'rock';
    else if (r < 0.92) type = 'jump';
    else type = 'mogul';

    const x = rand(30, canvas.width - 30);
    const y = -40;
    obstacles.push({ type, x, y });
  }

  function spawnSnow() {
    return { x: rand(0, canvas.width), y: rand(-canvas.height, 0), r: rand(1, 3), drift: rand(-0.3, 0.3) };
  }

  function doTrick() {
    if (airborne && !trickDone) {
      trickDone = true;
      score += TRICK_BONUS;
    }
  }

  /* ── init / reset ── */
  function init() {
    skierX = canvas.width / 2;
    skierY = canvas.height * 0.7;
    speed = START_SPEED;
    score = 0;
    braking = false;
    airborne = false;
    airTimer = 0;
    trickDone = false;
    obstacles = [];
    trailMarks = [];
    mogulBumps = [];
    yeti = { x: canvas.width / 2, y: canvas.height + 100, active: false };
    yetiActive = false;
    startTime = Date.now();
    gameOver = false;
    started = false;
    running = false;

    snowParticles = [];
    for (let i = 0; i < SNOW_COUNT; i++) snowParticles.push(spawnSnow());

    window.__gameScore = 0;
    updateHUD();
  }

  function startGame() {
    init();
    started = true;
    running = true;
    lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    gameOver = true;
    const duration = (Date.now() - startTime) / 1000;
    window.__gameScore = score;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('ski-free_best', bestScore);
    }
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('ski-free', score, duration);
    }
    drawGameOver();
  }

  function updateHUD() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = score;
  }

  /* ── update ── */
  function update(dt) {
    if (!running) return;

    // steering
    if (keys.ArrowLeft)  skierX -= STEER_SPEED;
    if (keys.ArrowRight) skierX += STEER_SPEED;
    skierX = Math.max(SKIER_W, Math.min(canvas.width - SKIER_W, skierX));

    braking = !!keys.ArrowDown;

    // jump trick
    if (keys.ArrowUp && airborne) doTrick();
    keys.ArrowUp = false;

    // speed ramps up
    speed = Math.min(MAX_SPEED, START_SPEED + (Date.now() - startTime) / 30000);
    const effectiveSpeed = braking ? speed * BRAKE_FACTOR : speed;

    // airborne
    if (airborne) {
      airTimer -= dt;
      if (airTimer <= 0) { airborne = false; airTimer = 0; }
    }

    // trail
    if (trailMarks.length === 0 || Math.abs(skierY - trailMarks[trailMarks.length - 1].y) > 6) {
      trailMarks.push({ x: skierX, y: skierY, age: 0 });
      if (trailMarks.length > TRAIL_MAX) trailMarks.shift();
    }

    // scroll
    skierY -= effectiveSpeed * dt * 0.06;

    // score
    score += Math.floor(effectiveSpeed * dt * 0.015);
    updateHUD();

    // obstacles scroll + spawn
    const spawnRate = Math.max(8, 30 - (speed - START_SPEED) * 2);
    if (Math.random() * 100 < spawnRate * dt * 0.06) spawnObstacle();

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += effectiveSpeed * dt * 0.06;
      if (o.y > canvas.height + 50) { obstacles.splice(i, 1); continue; }

      // collision
      if (o.type === 'tree') {
        if (dist(skierX, skierY, o.x, o.y) < TREE_R + SKIER_W * 0.5) {
          endGame(); return;
        }
      } else if (o.type === 'rock') {
        if (!airborne && dist(skierX, skierY, o.x, o.y) < ROCK_R + SKIER_W * 0.5) {
          speed = Math.max(START_SPEED, speed - 2);
        }
      } else if (o.type === 'jump') {
        if (!airborne && skierX > o.x - JUMP_W / 2 && skierX < o.x + JUMP_W / 2 &&
            Math.abs(skierY - o.y) < JUMP_H + 10) {
          airborne = true;
          airTimer = 1200;
          trickDone = false;
        }
      }
    }

    // moguls (visual only, scroll with obstacles)
    // already in obstacles array as type 'mogul'

    // yeti
    const elapsed = Date.now() - startTime;
    if (elapsed > YETI_DELAY && !yetiActive) {
      yetiActive = true;
      yeti.active = true;
      yeti.x = Math.random() < 0.5 ? -40 : canvas.width + 40;
      yeti.y = skierY + 200;
    }
    if (yeti.active) {
      const dx = skierX - yeti.x, dy = skierY - yeti.y;
      const d = Math.hypot(dx, dy);
      const yetiSpeed = speed * 1.15;
      if (d > 1) {
        yeti.x += (dx / d) * yetiSpeed;
        yeti.y += (dy / d) * yetiSpeed;
      }
      if (d < YETI_W) { endGame(); return; }
    }

    // snow
    snowParticles.forEach(p => {
      p.y += (effectiveSpeed + p.r * 0.8) * dt * 0.06;
      p.x += p.drift;
      if (p.y > canvas.height) { p.y = -5; p.x = rand(0, canvas.width); }
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
    });

    // trail age
    trailMarks.forEach(t => t.age += dt);
  }

  /* ── draw ── */
  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // moguls first (background bumps)
    obstacles.filter(o => o.type === 'mogul').forEach(o => {
      ctx.fillStyle = MOGUL_CLR;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // trail
    trailMarks.forEach(t => {
      const alpha = Math.max(0, 0.12 - t.age * 0.00005);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(t.x - 2, t.y - 1, 4, 3);
    });

    // obstacles
    obstacles.forEach(o => {
      if (o.type === 'tree') {
        // trunk
        ctx.fillStyle = '#654321';
        ctx.fillRect(o.x - 3, o.y, 6, 12);
        // foliage
        ctx.fillStyle = TREE_CLR;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y - TREE_R);
        ctx.lineTo(o.x - TREE_R * 0.7, o.y + 4);
        ctx.lineTo(o.x + TREE_R * 0.7, o.y + 4);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'rock') {
        ctx.fillStyle = ROCK_CLR;
        ctx.beginPath();
        ctx.ellipse(o.x, o.y, ROCK_R, ROCK_R * 0.6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b95a0';
        ctx.beginPath();
        ctx.ellipse(o.x - 3, o.y - 3, ROCK_R * 0.4, ROCK_R * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.type === 'jump') {
        ctx.fillStyle = JUMP_CLR;
        ctx.beginPath();
        ctx.moveTo(o.x - JUMP_W / 2, o.y + JUMP_H);
        ctx.lineTo(o.x + JUMP_W / 2, o.y + JUMP_H);
        ctx.lineTo(o.x + JUMP_W / 2, o.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(o.x - JUMP_W / 2, o.y + JUMP_H, JUMP_W, 2);
      }
    });

    // skier
    const sy = airborne ? skierY - 30 : skierY;
    ctx.save();
    ctx.translate(skierX, sy);
    if (airborne) ctx.rotate(Math.sin(Date.now() / 100) * 0.3);
    // body
    ctx.fillStyle = CYAN;
    ctx.fillRect(-SKIER_W / 2, -SKIER_H / 2, SKIER_W, SKIER_H);
    // head
    ctx.beginPath();
    ctx.arc(0, -SKIER_H / 2 - 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
    // skis
    ctx.fillStyle = '#0e7490';
    const skiSpread = braking ? 10 : 6;
    ctx.fillRect(-skiSpread - 3, SKIER_H / 2, 6, 14);
    ctx.fillRect(skiSpread - 3, SKIER_H / 2, 6, 14);
    ctx.restore();

    // trick indicator
    if (airborne && trickDone) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TRICK +' + TRICK_BONUS, skierX, sy - 40);
    }

    // yeti
    if (yeti.active) {
      ctx.fillStyle = YETI_CLR;
      // body
      ctx.beginPath();
      ctx.ellipse(yeti.x, yeti.y, YETI_W / 2, YETI_H / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // arms
      const armSwing = Math.sin(Date.now() / 100) * 8;
      ctx.fillRect(yeti.x - YETI_W / 2 - 10, yeti.y - 10 + armSwing, 12, 6);
      ctx.fillRect(yeti.x + YETI_W / 2 - 2, yeti.y - 10 - armSwing, 12, 6);
      // eyes
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(yeti.x - 6, yeti.y - 10, 3, 0, Math.PI * 2);
      ctx.arc(yeti.x + 6, yeti.y - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      // warning
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ YETI!', yeti.x, yeti.y - YETI_H / 2 - 12);
    }

    // snow
    snowParticles.forEach(p => {
      ctx.fillStyle = SNOW_CLR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // speed indicator
    if (braking) {
      ctx.fillStyle = 'rgba(239,68,68,0.5)';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('BRAKING', 10, 24);
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // snow on start screen
    ctx.fillStyle = SNOW_CLR;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(rand(0, canvas.width), rand(0, canvas.height), rand(1, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = CYAN;
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⛷ SKI-FREE', canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px monospace';
    ctx.fillText('Arrow keys or swipe to play', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('← → Steer   ↓ Brake   ↑ Trick (in air)', canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Beware the Abominable Snow Monster...', canvas.width / 2, canvas.height / 2 + 55);
    ctx.fillStyle = CYAN;
    ctx.font = '22px monospace';
    ctx.fillText('Press SPACE or Tap to Start', canvas.width / 2, canvas.height / 2 + 100);
    if (bestScore > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText('Best: ' + bestScore, canvas.width / 2, canvas.height / 2 + 135);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 38px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '22px monospace';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText('Best: ' + bestScore, canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillStyle = CYAN;
    ctx.font = '20px monospace';
    ctx.fillText('Press SPACE or Tap to Restart', canvas.width / 2, canvas.height / 2 + 80);
  }

  /* ── loop ── */
  function loop(ts) {
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;
    if (running) {
      update(dt);
      draw();
    }
    if (running) requestAnimationFrame(loop);
  }

  /* ── start/restart handler ── */
  function handleStart() {
    if (!started || gameOver) {
      startGame();
    }
  }

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); handleStart(); }
  });
  canvas.addEventListener('click', handleStart);
  canvas.addEventListener('touchstart', e => {
    if (!started || gameOver) { e.preventDefault(); handleStart(); }
  }, { passive: false });

  /* ── initial render ── */
  init();
  drawStartScreen();
})();
