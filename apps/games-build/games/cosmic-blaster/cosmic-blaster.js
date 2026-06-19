(() => {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────── */
  const GAME_SLUG = 'cosmic-blaster';
  const CANVAS_W = 800;
  const CANVAS_H = 600;
  const MAX_LIVES = 3;
  const PLAYER_SPEED = 5;
  const BULLET_SPEED = 8;
  const BULLET_COOLDOWN = 180;
  const INVINCIBLE_MS = 2000;
  const WAVE_INTERVAL = 500;
  const MAX_SCORE = 999999;

  /* ── State ─────────────────────────────────────────────────── */
  let canvas, ctx, score, lives, wave, isPlaying, animFrame;
  let bestScore = parseInt((function(){try{return localStorage.getItem(GAME_SLUG + '-best')}catch(e){return null}})() || '0');
  let lastShot = 0;
  let touchActive = false;
  let touchX = 0, touchY = 0;
  let screenShake = 0;

  const keys = {};
  const bullets = [];
  const asteroids = [];
  const enemies = [];
  const enemyBullets = [];
  const particles = [];
  const stars = [];
  let powerUps = [];

  const player = {
    x: CANVAS_W / 2, y: CANVAS_H - 80,
    w: 36, h: 40,
    invincible: false, invincibleUntil: 0,
    tripleShot: false, tripleShotUntil: 0
  };

  /* ── Stars ─────────────────────────────────────────────────── */
  function generateStars() {
    stars.length = 0;
    for (let i = 0; i < 120; i++) {
      const layer = Math.random();
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: layer < 0.5 ? 1 : layer < 0.85 ? 1.5 : 2.5,
        speed: layer < 0.5 ? 0.3 : layer < 0.85 ? 0.7 : 1.2,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
  }

  /* ── Particles ─────────────────────────────────────────────── */
  function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.025,
        size: 1.5 + Math.random() * 3,
        color
      });
    }
  }

  /* ── Spawning ──────────────────────────────────────────────── */
  function spawnAsteroid() {
    const size = 20 + Math.random() * 40;
    asteroids.push({
      x: size + Math.random() * (CANVAS_W - size * 2),
      y: -size,
      size,
      speed: 1.5 + wave * 0.2 + Math.random() * 1.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      vertices: 7 + Math.floor(Math.random() * 4)
    });
  }

  function spawnEnemy() {
    enemies.push({
      x: 50 + Math.random() * (CANVAS_W - 100),
      y: -40,
      w: 30, h: 30,
      speed: 1 + wave * 0.15,
      phase: Math.random() * Math.PI * 2,
      shootTimer: 0,
      shootInterval: Math.max(60, 180 - wave * 15)
    });
  }

  function spawnPowerUp(x, y) {
    if (Math.random() > 0.15) return;
    const types = ['triple', 'life'];
    powerUps.push({
      x, y,
      type: types[Math.floor(Math.random() * types.length)],
      size: 12,
      speed: 1.5,
      pulse: 0
    });
  }

  /* ── Input ─────────────────────────────────────────────────── */
  function setupInput() {
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      touchActive = true;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      touchX = (t.clientX - rect.left) / rect.width * CANVAS_W;
      touchY = (t.clientY - rect.top) / rect.height * CANVAS_H;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      touchX = (t.clientX - rect.left) / rect.width * CANVAS_W;
      touchY = (t.clientY - rect.top) / rect.height * CANVAS_H;
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      touchActive = false;
    }, { passive: false });
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
  }

  /* ── Update ────────────────────────────────────────────────── */
  function update(now) {
    // Player movement
    if (touchActive) {
      player.x += (touchX - player.x) * 0.12;
      player.y += (touchY - player.y) * 0.12;
    } else {
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= PLAYER_SPEED;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += PLAYER_SPEED;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= PLAYER_SPEED;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += PLAYER_SPEED;
    }
    player.x = Math.max(player.w / 2, Math.min(CANVAS_W - player.w / 2, player.x));
    player.y = Math.max(player.h / 2, Math.min(CANVAS_H - player.h / 2, player.y));

    // Invincibility
    if (player.invincible && now > player.invincibleUntil) player.invincible = false;
    if (player.tripleShot && now > player.tripleShotUntil) player.tripleShot = false;

    // Shooting
    const wantShoot = keys[' '] || touchActive;
    if (wantShoot && now - lastShot > BULLET_COOLDOWN) {
      lastShot = now;
      bullets.push({ x: player.x, y: player.y - player.h / 2, w: 4, h: 12 });
      if (player.tripleShot) {
        bullets.push({ x: player.x - 15, y: player.y - player.h / 2 + 5, w: 4, h: 12, vx: -1.5 });
        bullets.push({ x: player.x + 15, y: player.y - player.h / 2 + 5, w: 4, h: 12, vx: 1.5 });
      }
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y -= BULLET_SPEED;
      if (b.vx) b.x += b.vx;
      if (b.y < -20 || b.x < -20 || b.x > CANVAS_W + 20) bullets.splice(i, 1);
    }

    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > CANVAS_H + 20 || b.y < -20) enemyBullets.splice(i, 1);
    }

    // Spawn asteroids
    const asteroidRate = Math.max(0.008, 0.025 + wave * 0.003);
    if (Math.random() < asteroidRate) spawnAsteroid();

    // Spawn enemies (wave 2+)
    if (wave >= 2 && Math.random() < Math.min(0.012, 0.004 + wave * 0.001)) spawnEnemy();

    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.y += a.speed;
      a.rotation += a.rotSpeed;
      if (a.y > CANVAS_H + a.size) { asteroids.splice(i, 1); continue; }

      // Player collision
      if (!player.invincible && circleRect(a.x, a.y, a.size, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
        hitPlayer(now);
        asteroids.splice(i, 1);
        continue;
      }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      e.x += Math.sin(e.phase + e.y * 0.02) * 2;
      e.phase += 0.02;
      e.shootTimer++;
      if (e.shootTimer >= e.shootInterval && e.y > 30 && e.y < CANVAS_H * 0.6) {
        e.shootTimer = 0;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        enemyBullets.push({ x: e.x, y: e.y + e.h / 2, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, size: 4 });
      }
      if (e.y > CANVAS_H + 50) { enemies.splice(i, 1); continue; }

      // Player collision
      if (!player.invincible && rectRect(player.x - player.w / 2, player.y - player.h / 2, player.w, player.h, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
        hitPlayer(now);
        spawnExplosion(e.x, e.y, '#ef4444', 25);
        enemies.splice(i, 1);
      }
    }

    // Enemy bullet vs player
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (!player.invincible && circleRect(b.x, b.y, b.size, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
        hitPlayer(now);
        enemyBullets.splice(i, 1);
      }
    }

    // Bullet vs asteroid
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (circleRect(a.x, a.y, a.size, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)) {
          spawnExplosion(a.x, a.y, '#94a3b8', 20);
          spawnPowerUp(a.x, a.y);
          addScore(10);
          asteroids.splice(ai, 1);
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // Bullet vs enemy
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (rectRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
          spawnExplosion(e.x, e.y, '#ef4444', 30);
          spawnPowerUp(e.x, e.y);
          addScore(25);
          enemies.splice(ei, 1);
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      p.y += p.speed;
      p.pulse += 0.08;
      if (p.y > CANVAS_H + 20) { powerUps.splice(i, 1); continue; }
      const dist = Math.hypot(player.x - p.x, player.y - p.y);
      if (dist < p.size + 18) {
        if (p.type === 'triple') {
          player.tripleShot = true;
          player.tripleShotUntil = Date.now() + 8000;
        } else if (p.type === 'life' && lives < MAX_LIVES) {
          lives++;
          updateLivesHUD();
        }
        spawnExplosion(p.x, p.y, '#06b6d4', 15);
        powerUps.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.vx *= 0.97;
      p.vy *= 0.97;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update stars
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
    }

    // Screen shake decay
    if (screenShake > 0) screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;

    // Wave check
    const newWave = Math.floor(score / WAVE_INTERVAL) + 1;
    if (newWave !== wave) {
      wave = newWave;
      document.getElementById('wave-display').textContent = 'Wave ' + wave;
    }
  }

  function hitPlayer(now) {
    lives--;
    screenShake = 12;
    updateLivesHUD();
    spawnExplosion(player.x, player.y, '#06b6d4', 25);
    if (lives <= 0) {
      gameOver();
    } else {
      player.invincible = true;
      player.invincibleUntil = now + INVINCIBLE_MS;
    }
  }

  function addScore(pts) {
    score = Math.min(MAX_SCORE, score + pts);
    document.getElementById('score-display').textContent = 'Score: ' + score;
  }

  function updateLivesHUD() {
    document.getElementById('lives-display').textContent = '❤️'.repeat(Math.max(0, lives));
  }

  /* ── Collision helpers ─────────────────────────────────────── */
  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX, dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  function rectRect(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  /* ── Draw ──────────────────────────────────────────────────── */
  function draw() {
    ctx.save();
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

    // Stars
    for (const s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Asteroids
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      ctx.beginPath();
      for (let i = 0; i < a.vertices; i++) {
        const angle = (i / a.vertices) * Math.PI * 2;
        const r = a.size * (0.8 + Math.sin(i * 2.7) * 0.2);
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Enemies
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.moveTo(0, -e.h / 2);
      ctx.lineTo(-e.w / 2, e.h / 2);
      ctx.lineTo(e.w / 2, e.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Cockpit
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.restore();
    }

    // Enemy bullets
    ctx.fillStyle = '#f87171';
    for (const b of enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bullets
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    for (const b of bullets) {
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
    ctx.shadowBlur = 0;

    // Player
    if (!player.invincible || Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Engine glow
      ctx.beginPath();
      ctx.moveTo(-8, player.h / 2);
      ctx.lineTo(0, player.h / 2 + 10 + Math.random() * 6);
      ctx.lineTo(8, player.h / 2);
      ctx.fillStyle = '#f97316';
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Ship body
      ctx.beginPath();
      ctx.moveTo(0, -player.h / 2);
      ctx.lineTo(-player.w / 2, player.h / 2);
      ctx.lineTo(-player.w / 4, player.h / 3);
      ctx.lineTo(player.w / 4, player.h / 3);
      ctx.lineTo(player.w / 2, player.h / 2);
      ctx.closePath();
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cockpit
      ctx.beginPath();
      ctx.moveTo(0, -player.h / 4);
      ctx.lineTo(-6, player.h / 6);
      ctx.lineTo(6, player.h / 6);
      ctx.closePath();
      ctx.fillStyle = '#164e63';
      ctx.fill();

      // Triple-shot indicator
      if (player.tripleShot) {
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.3;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, player.w, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    // Power-ups
    for (const p of powerUps) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const glow = 0.6 + Math.sin(p.pulse) * 0.4;
      ctx.globalAlpha = glow;
      if (p.type === 'triple') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(-p.size * 0.8, p.size * 0.5);
        ctx.lineTo(p.size * 0.8, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('3', 0, 4);
      } else {
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❤', 0, 5);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  /* ── Game flow ─────────────────────────────────────────────── */
  function resetGame() {
    score = 0;
    lives = MAX_LIVES;
    wave = 1;
    lastShot = 0;
    screenShake = 0;
    player.x = CANVAS_W / 2;
    player.y = CANVAS_H - 80;
    player.invincible = false;
    player.tripleShot = false;
    bullets.length = 0;
    asteroids.length = 0;
    enemies.length = 0;
    enemyBullets.length = 0;
    particles.length = 0;
    powerUps.length = 0;
    updateLivesHUD();
    document.getElementById('score-display').textContent = 'Score: 0';
    document.getElementById('wave-display').textContent = 'Wave 1';
  }

  function startGame() {
    resetGame();
    isPlaying = true;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    loop();
  }

  function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animFrame);
    spawnExplosion(player.x, player.y, '#06b6d4', 40);
    // Final particle render
    for (let i = 0; i < 30; i++) {
      for (let j = particles.length - 1; j >= 0; j--) {
        const p = particles[j];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        p.vx *= 0.97; p.vy *= 0.97;
        if (p.life <= 0) particles.splice(j, 1);
      }
    }

    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      try { localStorage.setItem(GAME_SLUG + '-best', String(bestScore)); } catch {}
    }

    document.getElementById('final-score').textContent = 'Score: ' + score;
    document.getElementById('best-score-start').textContent = bestScore;
    const newBestEl = document.getElementById('new-best');
    if (isNewBest && score > 0) newBestEl.classList.remove('hidden');
    else newBestEl.classList.add('hidden');
    document.getElementById('game-over').classList.remove('hidden');

    // Submit score
    submitScore(score);
  }

  function submitScore(s) {
    try {
      if (typeof ArcadeShell !== 'undefined') ArcadeShell.submit(s);
    } catch {}
    try {
      if (typeof FuzzyScoreSubmit === 'function') FuzzyScoreSubmit(s);
    } catch {}
  }

  function getScore() { return score || 0; }
  window.getScore = getScore;

  /* ── Loop ──────────────────────────────────────────────────── */
  function loop() {
    if (!isPlaying) return;
    const now = Date.now();
    update(now);
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  /* ── Resize ────────────────────────────────────────────────── */
  function resize() {
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ratio = CANVAS_W / CANVAS_H;
    let w, h;
    if (cw / ch > ratio) { h = ch; w = h * ratio; }
    else { w = cw; h = w / ratio; }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); }
    generateStars();
    setupInput();

    document.getElementById('best-score-start').textContent = bestScore;
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    // Draw initial frame
    draw();
  }

  /* ── Teardown ──────────────────────────────────────────────── */
  window.__gameTeardown = window.__gameTeardown || [];
  window.__gameTeardown.push(() => {
    cancelAnimationFrame(animFrame);
    isPlaying = false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
