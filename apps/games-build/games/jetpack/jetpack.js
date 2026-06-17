(function() {
  'use strict';

  // --- Constants ---
  const BG_COLOR = '#0a0614';
  const ORANGE = '#f97316';
  const PLAYER_COLOR = '#38bdf8';
  const COIN_COLOR = '#facc15';
  const GROUND_HEIGHT = 60;
  const GRAVITY = 0.55;
  const THRUST_FORCE = -0.95;
  const PLAYER_SIZE = 32;
  const MAX_VY = 10;
  const BASE_SPEED = 4;
  const SPEED_INCREMENT = 0.0008;
  const MAX_SPEED = 12;
  const OBSTACLE_INTERVAL_MIN = 80;
  const OBSTACLE_INTERVAL_MAX = 160;
  const COIN_INTERVAL_MIN = 50;
  const COIN_INTERVAL_MAX = 120;
  const POWERUP_DURATION = 300; // frames (~5s at 60fps)
  const POWERUP_INTERVAL = 2500; // frames between powerup spawns

  let canvas, ctx, W, H;
  let gameState; // 'menu','playing','gameover'
  let player, obstacles, coins, particles, powerups;
  let distance, coinScore, totalScore, bestScore;
  let scrollSpeed, frameCount, nextObstacleFrame, nextCoinFrame, nextPowerupFrame;
  let thrusting;
  let gameStartTime;
  let animId;

  // --- FuzzyScoreSubmit bridge ---
  function FuzzyScoreSubmit(game, score, duration) {
    if (typeof window.FuzzyScoreSubmit === 'function') {
      window.FuzzyScoreSubmit(game, score, duration);
    }
  }

  // --- Canvas setup ---
  function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); };
  }

  function resize() {
    const parent = canvas.parentElement || document.body;
    const rect = parent.getBoundingClientRect();
    W = canvas.width = rect.width || window.innerWidth;
    H = canvas.height = rect.height || window.innerHeight;
  }

  // --- Player ---
  function createPlayer() {
    return {
      x: W * 0.2,
      y: H * 0.5,
      w: PLAYER_SIZE,
      h: PLAYER_SIZE,
      vy: 0,
      vehicleTimer: 0
    };
  }

  function updatePlayer() {
    if (thrusting && !player.vehicleTimer) {
      player.vy += THRUST_FORCE;
    }
    player.vy += GRAVITY;
    if (player.vy > MAX_VY) player.vy = MAX_VY;
    if (player.vy < -MAX_VY) player.vy = -MAX_VY;

    if (player.vehicleTimer > 0) {
      // Vehicle mode: ride along ground
      player.vehicleTimer--;
      player.y = H - GROUND_HEIGHT - player.h;
      player.vy = 0;
    } else {
      player.y += player.vy;
      // Clamp
      if (player.y < 0) { player.y = 0; player.vy = 0; }
      if (player.y + player.h > H - GROUND_HEIGHT) {
        player.y = H - GROUND_HEIGHT - player.h;
        player.vy = 0;
      }
    }

    // Flame particles
    if (thrusting && !player.vehicleTimer) {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: player.x + player.w * 0.3 + Math.random() * player.w * 0.4,
          y: player.y + player.h,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 3 + 1,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          size: 3 + Math.random() * 4,
          color: Math.random() > 0.5 ? ORANGE : '#fbbf24'
        });
      }
    }
    // Vehicle exhaust
    if (player.vehicleTimer > 0 && frameCount % 2 === 0) {
      particles.push({
        x: player.x - 5,
        y: H - GROUND_HEIGHT - 5,
        vx: -scrollSpeed + (Math.random() - 0.5),
        vy: -Math.random() * 2,
        life: 15,
        maxLife: 15,
        size: 3 + Math.random() * 3,
        color: '#818cf8'
      });
    }
  }

  function drawPlayer() {
    ctx.save();
    if (player.vehicleTimer > 0) {
      // Vehicle mode
      ctx.fillStyle = '#818cf8';
      const vw = player.w * 1.6, vh = player.h * 0.7;
      const vx = player.x - 5, vy = H - GROUND_HEIGHT - vh;
      ctx.beginPath();
      ctx.roundRect(vx, vy, vw, vh, 6);
      ctx.fill();
      // Wheels
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.arc(vx + 10, H - GROUND_HEIGHT + 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(vx + vw - 10, H - GROUND_HEIGHT + 2, 6, 0, Math.PI * 2); ctx.fill();
      // Shield glow
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + Math.sin(frameCount * 0.15) * 0.2;
      ctx.beginPath();
      ctx.roundRect(vx - 4, vy - 4, vw + 8, vh + 8, 10);
      ctx.stroke();
    } else {
      // Jetpack body
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      // Jetpack tank
      ctx.fillStyle = '#475569';
      ctx.fillRect(player.x + player.w - 8, player.y + 4, 8, player.h - 8);
      // Visor
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(player.x + 4, player.y + 6, 12, 8);
    }
    ctx.restore();
  }

  // --- Obstacles ---
  function spawnObstacle() {
    const types = ['laser', 'missile', 'zapper'];
    const type = types[Math.floor(Math.random() * types.length)];
    const baseY = H - GROUND_HEIGHT;

    if (type === 'laser') {
      // Horizontal beam - can be at various heights
      const lane = Math.random();
      let y;
      if (lane < 0.33) y = baseY - 40; // low - must fly over
      else if (lane < 0.66) y = baseY * 0.5; // mid
      else y = 60; // high - must stay low
      obstacles.push({ type: 'laser', x: W + 50, y: y, w: 100 + Math.random() * 80, h: 8, passed: false });
    } else if (type === 'missile') {
      const y = Math.random() * (baseY - 100) + 30;
      obstacles.push({ type: 'missile', x: W + 30, y: y, w: 30, h: 12, vx: -scrollSpeed * 1.3, tracking: true, passed: false });
    } else { // zapper
      const x = W + 40;
      const h = 120 + Math.random() * 100;
      const y = baseY - h;
      obstacles.push({ type: 'zapper', x: x, y: y, w: 16, h: h, passed: false });
    }
  }

  function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.type === 'missile' && o.tracking) {
        o.vx = -scrollSpeed * 1.2;
        // Mild tracking toward player Y
        const dy = player.y + player.h / 2 - (o.y + o.h / 2);
        o.y += Math.sign(dy) * 1.5;
        o.x += o.vx;
      } else {
        o.x -= scrollSpeed;
      }
      if (o.x + o.w < -50) obstacles.splice(i, 1);
    }
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.type === 'laser') {
        // Glow effect
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.restore();
        // Core beam
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(o.x, o.y + 2, o.w, o.h - 4);
      } else if (o.type === 'missile') {
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.moveTo(o.x + o.w, o.y + o.h / 2);
        ctx.lineTo(o.x, o.y);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        // Trail
        ctx.fillStyle = '#f97316';
        ctx.fillRect(o.x - 8, o.y + 2, 8, o.h - 4);
      } else if (o.type === 'zapper') {
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Electricity flicker
        if (Math.random() > 0.4) {
          ctx.save();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          let zx = o.x + o.w / 2, zy = o.y;
          ctx.moveTo(zx, zy);
          while (zy < o.y + o.h) {
            zx += (Math.random() - 0.5) * 16;
            zy += 10 + Math.random() * 10;
            ctx.lineTo(zx, Math.min(zy, o.y + o.h));
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // --- Coins ---
  function spawnCoin() {
    const y = 30 + Math.random() * (H - GROUND_HEIGHT - 100);
    coins.push({ x: W + 20, y: y, r: 10, collected: false, angle: 0 });
  }

  function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.x -= scrollSpeed;
      c.angle += 0.05;
      if (c.x + c.r < -20) { coins.splice(i, 1); continue; }
      // Collision with player
      const px = player.x + player.w / 2, py = player.y + player.h / 2;
      const dist = Math.hypot(px - c.x, py - c.y);
      if (dist < c.r + player.w * 0.4) {
        coinScore += 10;
        c.collected = true;
        // Sparkle
        for (let s = 0; s < 6; s++) {
          const ang = (Math.PI * 2 / 6) * s;
          particles.push({
            x: c.x, y: c.y,
            vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3,
            life: 15, maxLife: 15, size: 3, color: COIN_COLOR
          });
        }
        coins.splice(i, 1);
      }
    }
  }

  function drawCoins() {
    for (const c of coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = COIN_COLOR;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.r, c.r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
      ctx.restore();
    }
  }

  // --- Power-ups ---
  function spawnPowerup() {
    const y = 50 + Math.random() * (H - GROUND_HEIGHT - 150);
    powerups.push({ x: W + 20, y: y, w: 28, h: 28, type: 'vehicle', angle: 0 });
  }

  function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= scrollSpeed;
      p.angle += 0.03;
      if (p.x + p.w < -20) { powerups.splice(i, 1); continue; }
      // Collision
      if (rectsOverlap(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
        if (p.type === 'vehicle') {
          player.vehicleTimer = POWERUP_DURATION;
        }
        // Pickup sparkle
        for (let s = 0; s < 10; s++) {
          particles.push({
            x: p.x + p.w / 2, y: p.y + p.h / 2,
            vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
            life: 20, maxLife: 20, size: 4, color: '#818cf8'
          });
        }
        powerups.splice(i, 1);
      }
    }
  }

  function drawPowerups() {
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      // Outer glow
      ctx.fillStyle = 'rgba(129,140,248,0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, p.w * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Box
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = '#c7d2fe';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('V', 0, 1);
      ctx.restore();
    }
  }

  // --- Particles ---
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Collision ---
  function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  function checkCollisions() {
    if (player.vehicleTimer > 0) return; // Invincible in vehicle
    for (const o of obstacles) {
      if (rectsOverlap(player.x + 4, player.y + 4, player.w - 8, player.h - 8, o.x, o.y, o.w, o.h)) {
        gameOver();
        return;
      }
    }
  }

  // --- Background ---
  let bgStars = [];
  function initBg() {
    bgStars = [];
    for (let i = 0; i < 80; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * (H - GROUND_HEIGHT), s: Math.random() * 2 + 0.5, speed: Math.random() * 0.5 + 0.2 });
    }
  }

  function drawBg() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (const star of bgStars) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.fillRect(star.x, star.y, star.s, star.s);
      star.x -= star.speed * scrollSpeed * 0.3;
      if (star.x < 0) { star.x = W; star.y = Math.random() * (H - GROUND_HEIGHT); }
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = '#1e1b2e';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, GROUND_HEIGHT);
    ctx.fillStyle = '#2d2544';
    ctx.fillRect(0, H - GROUND_HEIGHT, W, 3);

    // Ground detail lines
    ctx.strokeStyle = '#3b3355';
    ctx.lineWidth = 1;
    const offset = (frameCount * scrollSpeed * 0.5) % 40;
    for (let gx = -offset; gx < W; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, H - GROUND_HEIGHT + 15);
      ctx.lineTo(gx + 20, H - GROUND_HEIGHT + 15);
      ctx.stroke();
    }
  }

  // --- HUD ---
  function drawHUD() {
    const scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.textContent = 'Score: ' + totalScore;
  }

  function updateScore() {
    distance = Math.floor(frameCount * scrollSpeed * 0.1);
    totalScore = distance + coinScore;
    window.__gameScore = totalScore;
  }

  // --- Game lifecycle ---
  function init() {
    setupCanvas();
    bestScore = parseInt(localStorage.getItem('jetpack_best') || '0', 10);
    resetGame();
    gameState = 'menu';
    drawMenu();
    bindInput();
    loop();
  }

  function resetGame() {
    player = createPlayer();
    obstacles = [];
    coins = [];
    particles = [];
    powerups = [];
    distance = 0;
    coinScore = 0;
    totalScore = 0;
    scrollSpeed = BASE_SPEED;
    frameCount = 0;
    nextObstacleFrame = 50;
    nextCoinFrame = 30;
    nextPowerupFrame = POWERUP_INTERVAL;
    thrusting = false;
    window.__gameScore = 0;
    initBg();
  }

  function startGame() {
    resetGame();
    gameState = 'playing';
    gameStartTime = Date.now();
    const menuEl = document.getElementById('start-screen');
    if (menuEl) menuEl.style.display = 'none';
    const overEl = document.getElementById('game-over');
    if (overEl) overEl.style.display = 'none';
  }

  function gameOver() {
    gameState = 'gameover';
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);

    if (totalScore > bestScore) {
      bestScore = totalScore;
      localStorage.setItem('jetpack_best', String(bestScore));
    }

    FuzzyScoreSubmit('jetpack', totalScore, duration);
    window.__gameScore = totalScore;

    const overEl = document.getElementById('game-over');
    if (overEl) {
      overEl.style.display = 'flex';
      const scoreSpan = overEl.querySelector('.final-score') || overEl.querySelector('#final-score');
      if (scoreSpan) scoreSpan.textContent = totalScore;
    }
    drawGameOver();
  }

  // --- Input ---
  function bindInput() {
    window.addEventListener('keydown', function(e) {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleDown();
      }
    });
    window.addEventListener('keyup', function(e) {
      if (e.code === 'Space' || e.key === ' ') {
        handleUp();
      }
    });
    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); handleDown(); }, { passive: false });
    canvas.addEventListener('touchend', function(e) { e.preventDefault(); handleUp(); }, { passive: false });

    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
    // Start/restart on click when in menu/gameover
    canvas.addEventListener('click', function() {
      if (gameState === 'menu') startGame();
      else if (gameState === 'gameover') startGame();
    });
    window.addEventListener('keydown', function(e) {
      if ((e.code === 'Space' || e.key === ' ') && (gameState === 'menu' || gameState === 'gameover')) {
        e.preventDefault();
        startGame();
      }
    });

    // Hook external start button
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', startGame);
  }

  function handleDown() {
    if (gameState !== 'playing') return;
    thrusting = true;
  }

  function handleUp() {
    thrusting = false;
  }

  // --- Draw screens ---
  function drawMenu() {
    drawBg();
    ctx.fillStyle = BG_COLOR;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('JETPACK', W / 2, H * 0.35);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px sans-serif';
    ctx.fillText('Hold SPACE or TOUCH to fly', W / 2, H * 0.48);
    ctx.fillText('Dodge obstacles, collect coins', W / 2, H * 0.54);

    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 18px sans-serif';
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ TAP OR PRESS SPACE TO START ]', W / 2, H * 0.68);
    ctx.globalAlpha = 1;

    if (bestScore > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('Best: ' + bestScore, W / 2, H * 0.78);
    }
  }

  function drawGameOver() {
    ctx.fillStyle = BG_COLOR;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('GAME OVER', W / 2, H * 0.35);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '24px sans-serif';
    ctx.fillText('Score: ' + totalScore, W / 2, H * 0.47);
    ctx.fillText('Distance: ' + distance + 'm  |  Coins: ' + coinScore, W / 2, H * 0.54);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px sans-serif';
    ctx.fillText('Best: ' + bestScore, W / 2, H * 0.62);

    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 18px sans-serif';
    const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillText('[ TAP OR PRESS SPACE TO RETRY ]', W / 2, H * 0.74);
    ctx.globalAlpha = 1;
  }

  // --- Main loop ---
  function loop() {
    animId = requestAnimationFrame(loop);

    if (gameState === 'menu') {
      drawMenu();
      return;
    }
    if (gameState === 'gameover') {
      // Keep drawing particles fading
      drawBg();
      drawObstacles();
      drawCoins();
      drawPowerups();
      updateParticles();
      drawParticles();
      drawGameOver();
      return;
    }

    // --- Playing ---
    frameCount++;

    // Speed ramp
    scrollSpeed = Math.min(MAX_SPEED, BASE_SPEED + frameCount * SPEED_INCREMENT);

    // Spawn obstacles
    if (frameCount >= nextObstacleFrame) {
      spawnObstacle();
      nextObstacleFrame = frameCount + OBSTACLE_INTERVAL_MIN + Math.random() * (OBSTACLE_INTERVAL_MAX - OBSTACLE_INTERVAL_MIN);
      // Faster spawning as speed increases
      nextObstacleFrame -= scrollSpeed * 3;
    }

    // Spawn coins
    if (frameCount >= nextCoinFrame) {
      spawnCoin();
      nextCoinFrame = frameCount + COIN_INTERVAL_MIN + Math.random() * (COIN_INTERVAL_MAX - COIN_INTERVAL_MIN);
    }

    // Spawn powerups
    if (frameCount >= nextPowerupFrame) {
      spawnPowerup();
      nextPowerupFrame = frameCount + POWERUP_INTERVAL + Math.random() * 500;
    }

    updatePlayer();
    updateObstacles();
    updateCoins();
    updatePowerups();
    updateParticles();
    checkCollisions();
    updateScore();

    // Draw
    drawBg();
    drawCoins();
    drawPowerups();
    drawObstacles();
    drawParticles();
    drawPlayer();
    drawHUD();
  }

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
