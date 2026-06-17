/**
 * ═══════════════════════════════════════════════════════════════
 *  Dragon's Hoard — Game Logic
 *
 *  A collect coins, avoid fire arcade game.
 *  - Player controls a thief collecting treasure from a dragon's lair
 *  - Dodge fireballs while collecting coins, gems, and treasure chests
 *  - Combo system: collect items quickly for score multiplier
 *  - Difficulty increases over time (more fireballs, faster speed)
 *  - Score cap: 999,999 (endless game, cap for anti-cheat)
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────
  const GAME_SLUG = 'dragon-hoard';
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PLAYER_SIZE = 32;
  const BASE_SPEED = 4;
  const FIREBALL_SIZE = 24;
  const COIN_SIZE = 20;
  const GEM_SIZE = 24;
  const CHEST_SIZE = 32;
  const MAX_LIVES = 3;
  const INVINCIBILITY_MS = 2000;
  const COMBO_TIMEOUT_MS = 2000;

  // Score values
  const SCORE_COIN = 10;
  const SCORE_GEM = 50;
  const SCORE_CHEST = 200;

  // ─── State ─────────────────────────────────────────────────────
  let canvas, ctx;
  let score = 0;
  let lives = MAX_LIVES;
  let combo = 1;
  let lastCollectTime = 0;
  let isPlaying = false;
  let isPaused = false;
  let animFrame;
  let gameStartTime;
  let lastFireballTime = 0;
  let difficulty = 1;
  let bestScore = parseInt((function(){try{return localStorage.getItem('dragon-hoard-best')}catch(e){return null}})() || '0', 10);

  // ─── Player ────────────────────────────────────────────────────
  const player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: BASE_SPEED,
    isInvincible: false,
    invincibleUntil: 0,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
  };

  // ─── Game objects ──────────────────────────────────────────────
  let fireballs = [];
  let coins = [];
  let gems = [];
  let chests = [];
  let particles = [];

  // ─── Touch controls ────────────────────────────────────────────
  let touchTarget = null;

  // ─── DOM refs ──────────────────────────────────────────────────
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over');
  const hud = document.getElementById('hud');
  const scoreValue = document.getElementById('score-value');
  const comboValue = document.getElementById('combo-value');
  const livesValue = document.getElementById('lives-value');
  const finalScore = document.getElementById('final-score');
  const bestScoreEl = document.getElementById('best-score');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // ─── Init ──────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();

    // Event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    window.addEventListener('resize', resizeCanvas);

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Touch controls
    setupTouchControls();

    // Update best score display
    if (bestScoreEl) bestScoreEl.textContent = bestScore;

    console.log('[DragonHoard] Initialized');
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Scale canvas to fit container while maintaining aspect ratio
    const scale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
  }

  // ─── Game lifecycle ────────────────────────────────────────────
  function startGame() {
    score = 0;
    lives = MAX_LIVES;
    combo = 1;
    lastCollectTime = 0;
    difficulty = 1;
    fireballs = [];
    coins = [];
    gems = [];
    chests = [];
    particles = [];
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT - 80;
    player.isInvincible = false;
    player.invincibleUntil = 0;
    isPlaying = true;
    isPaused = false;
    gameStartTime = Date.now();
    lastFireballTime = Date.now();

    // Update UI
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    hud.style.display = '';
    updateHUD();

    // Spawn initial items
    for (let i = 0; i < 5; i++) spawnCoin();
    for (let i = 0; i < 2; i++) spawnGem();

    // Start game loop
    gameLoop();
  }

  function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animFrame);

    // Calculate duration
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);

    // Update best score
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('dragon-hoard-best', bestScore.toString()); } catch(e) {}
    }

    // Show game over screen
    finalScore.textContent = score;
    if (bestScoreEl) bestScoreEl.textContent = bestScore;
    gameOverScreen.style.display = '';

    // Submit score
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit(GAME_SLUG, score, duration);
    }
  }

  function updateHUD() {
    scoreValue.textContent = score;
    comboValue.textContent = 'x' + combo;
    livesValue.textContent = lives;
  }

  // ─── Game loop ─────────────────────────────────────────────────
  function gameLoop() {
    if (!isPlaying || isPaused) return;

    update();
    render();

    animFrame = requestAnimationFrame(gameLoop);
  }

  function update() {
    const now = Date.now();

    // Update difficulty over time
    const elapsed = (now - gameStartTime) / 1000;
    difficulty = 1 + Math.floor(elapsed / 30) * 0.5;

    // Update combo timeout
    if (now - lastCollectTime > COMBO_TIMEOUT_MS) {
      combo = 1;
    }

    // Update invincibility
    if (player.isInvincible && now > player.invincibleUntil) {
      player.isInvincible = false;
    }

    // Move player
    movePlayer();

    // Spawn fireballs
    if (now - lastFireballTime > (2000 / difficulty)) {
      spawnFireball();
      lastFireballTime = now;
    }

    // Update fireballs
    updateFireballs();

    // Update collectibles
    updateCollectibles();

    // Update particles
    updateParticles();

    // Check collisions
    checkCollisions();

    // Spawn new collectibles if needed
    if (coins.length < 3 + Math.floor(difficulty)) spawnCoin();
    if (gems.length < 1 + Math.floor(difficulty / 2)) spawnGem();
    if (chests.length < 1 && Math.random() < 0.002 * difficulty) spawnChest();
  }

  function render() {
    // Clear canvas
    ctx.fillStyle = '#1a0f2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background pattern (cave floor)
    drawBackground();

    // Draw collectibles
    drawCoins();
    drawGems();
    drawChests();

    // Draw fireballs
    drawFireballs();

    // Draw player
    drawPlayer();

    // Draw particles
    drawParticles();
  }

  // ─── Player movement ───────────────────────────────────────────
  function movePlayer() {
    let dx = 0;
    let dy = 0;

    if (player.moveLeft) dx -= 1;
    if (player.moveRight) dx += 1;
    if (player.moveUp) dy -= 1;
    if (player.moveDown) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    // Bounds checking
    player.x = Math.max(player.width / 2, Math.min(CANVAS_WIDTH - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(CANVAS_HEIGHT - player.height / 2, player.y));

    // Touch target movement
    if (touchTarget) {
      const tx = touchTarget.x - player.x;
      const ty = touchTarget.y - player.y;
      const dist = Math.sqrt(tx * tx + ty * ty);

      if (dist > 5) {
        player.x += (tx / dist) * player.speed;
        player.y += (ty / dist) * player.speed;
      } else {
        touchTarget = null;
      }
    }
  }

  // ─── Spawn functions ───────────────────────────────────────────
  function spawnFireball() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const speed = (2 + Math.random() * 2) * difficulty;

    fireballs.push({
      x: side === 'left' ? -FIREBALL_SIZE : CANVAS_WIDTH + FIREBALL_SIZE,
      y: Math.random() * CANVAS_HEIGHT,
      vx: side === 'left' ? speed : -speed,
      vy: (Math.random() - 0.5) * 2,
      size: FIREBALL_SIZE,
      rotation: 0,
    });
  }

  function spawnCoin() {
    coins.push({
      x: Math.random() * (CANVAS_WIDTH - 40) + 20,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 20,
      size: COIN_SIZE,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  function spawnGem() {
    gems.push({
      x: Math.random() * (CANVAS_WIDTH - 40) + 20,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 20,
      size: GEM_SIZE,
      bobOffset: Math.random() * Math.PI * 2,
      type: Math.floor(Math.random() * 3), // 0=red, 1=blue, 2=green
    });
  }

  function spawnChest() {
    chests.push({
      x: Math.random() * (CANVAS_WIDTH - 60) + 30,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 30,
      size: CHEST_SIZE,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  // ─── Update functions ──────────────────────────────────────────
  function updateFireballs() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const fb = fireballs[i];
      fb.x += fb.vx;
      fb.y += fb.vy;
      fb.rotation += 0.1;

      // Remove off-screen fireballs
      if (fb.x < -fb.size * 2 || fb.x > CANVAS_WIDTH + fb.size * 2) {
        fireballs.splice(i, 1);
      }
    }
  }

  function updateCollectibles() {
    const now = Date.now();

    // Bob animation
    coins.forEach(c => c.bobOffset += 0.05);
    gems.forEach(g => g.bobOffset += 0.03);
    chests.forEach(c => c.bobOffset += 0.02);
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // ─── Collision detection ───────────────────────────────────────
  function checkCollisions() {
    const now = Date.now();

    // Player vs fireballs
    if (!player.isInvincible) {
      for (let i = 0; i < fireballs.length; i++) {
        const fb = fireballs[i];
        if (circleRectCollision(fb.x, fb.y, fb.size / 2, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height)) {
          // Hit!
          lives--;
          player.isInvincible = true;
          player.invincibleUntil = now + INVINCIBILITY_MS;
          combo = 1;

          // Spawn hit particles
          for (let j = 0; j < 10; j++) {
            particles.push({
              x: player.x,
              y: player.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 1,
              decay: 0.03,
              color: '#ef4444',
              size: 4,
            });
          }

          updateHUD();

          if (lives <= 0) {
            gameOver();
            return;
          }

          break;
        }
      }
    }

    // Player vs coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (circleCollision(player.x, player.y, player.width / 2, c.x, c.y + Math.sin(c.bobOffset) * 5, c.size / 2)) {
        collectItem(SCORE_COIN, c.x, c.y, '#FBBF24');
        coins.splice(i, 1);
      }
    }

    // Player vs gems
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      if (circleCollision(player.x, player.y, player.width / 2, g.x, g.y + Math.sin(g.bobOffset) * 5, g.size / 2)) {
        collectItem(SCORE_GEM, g.x, g.y, g.type === 0 ? '#ef4444' : g.type === 1 ? '#3b82f6' : '#22c55e');
        gems.splice(i, 1);
      }
    }

    // Player vs chests
    for (let i = chests.length - 1; i >= 0; i--) {
      const ch = chests[i];
      if (circleCollision(player.x, player.y, player.width / 2, ch.x, ch.y + Math.sin(ch.bobOffset) * 5, ch.size / 2)) {
        collectItem(SCORE_CHEST, ch.x, ch.y, '#f97316');
        chests.splice(i, 1);
      }
    }
  }

  function collectItem(baseScore, x, y, color) {
    const now = Date.now();

    // Update combo
    if (now - lastCollectTime < COMBO_TIMEOUT_MS) {
      combo = Math.min(combo + 1, 10);
    } else {
      combo = 1;
    }
    lastCollectTime = now;

    // Add score
    const points = baseScore * combo;
    score += points;
    updateHUD();

    // Spawn collect particles
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        decay: 0.02,
        color: color,
        size: 3,
      });
    }
  }

  // ─── Drawing functions ─────────────────────────────────────────
  function drawBackground() {
    // Cave floor pattern
    ctx.fillStyle = '#120826';
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        if ((x + y) % 80 === 0) {
          ctx.fillRect(x, y, 40, 40);
        }
      }
    }
  }

  function drawPlayer() {
    ctx.save();

    // Invincibility flash
    if (player.isInvincible) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
    }

    // Draw thief character
    const x = player.x;
    const y = player.y;
    const s = player.width / 2;

    // Body
    ctx.fillStyle = '#4a2c82';
    ctx.fillRect(x - s * 0.6, y - s * 0.3, s * 1.2, s * 0.8);

    // Head
    ctx.fillStyle = '#6b3fa0';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.5, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Mask
    ctx.fillStyle = '#1a0f2e';
    ctx.fillRect(x - s * 0.4, y - s * 0.6, s * 0.8, s * 0.2);

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - s * 0.25, y - s * 0.55, s * 0.15, s * 0.1);
    ctx.fillRect(x + s * 0.1, y - s * 0.55, s * 0.15, s * 0.1);

    // Cape
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.3);
    ctx.lineTo(x - s * 0.8, y + s * 0.4);
    ctx.lineTo(x - s * 0.2, y + s * 0.3);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + s * 0.6, y - s * 0.3);
    ctx.lineTo(x + s * 0.8, y + s * 0.4);
    ctx.lineTo(x + s * 0.2, y + s * 0.3);
    ctx.fill();

    ctx.restore();
  }

  function drawFireballs() {
    fireballs.forEach(fb => {
      ctx.save();
      ctx.translate(fb.x, fb.y);
      ctx.rotate(fb.rotation);

      // Fireball glow
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fb.size);
      gradient.addColorStop(0, '#ff6b35');
      gradient.addColorStop(0.5, '#ff4444');
      gradient.addColorStop(1, 'rgba(255, 68, 68, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, fb.size, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(0, 0, fb.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  function drawCoins() {
    coins.forEach(c => {
      const bobY = Math.sin(c.bobOffset) * 5;

      // Coin glow
      ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.beginPath();
      ctx.arc(c.x, c.y + bobY, c.size, 0, Math.PI * 2);
      ctx.fill();

      // Coin body
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(c.x, c.y + bobY, c.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Coin highlight
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y + bobY - 2, c.size / 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawGems() {
    const colors = ['#ef4444', '#3b82f6', '#22c55e'];

    gems.forEach(g => {
      const bobY = Math.sin(g.bobOffset) * 5;
      const color = colors[g.type];

      // Gem glow
      ctx.fillStyle = color + '33';
      ctx.beginPath();
      ctx.arc(g.x, g.y + bobY, g.size, 0, Math.PI * 2);
      ctx.fill();

      // Diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bobY - g.size / 2);
      ctx.lineTo(g.x + g.size / 2, g.y + bobY);
      ctx.lineTo(g.x, g.y + bobY + g.size / 2);
      ctx.lineTo(g.x - g.size / 2, g.y + bobY);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + bobY - g.size / 3);
      ctx.lineTo(g.x + g.size / 4, g.y + bobY);
      ctx.lineTo(g.x, g.y + bobY + g.size / 3);
      ctx.lineTo(g.x - g.size / 4, g.y + bobY);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawChests() {
    chests.forEach(ch => {
      const bobY = Math.sin(ch.bobOffset) * 5;

      // Chest glow
      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.beginPath();
      ctx.arc(ch.x, ch.y + bobY, ch.size, 0, Math.PI * 2);
      ctx.fill();

      // Chest body
      ctx.fillStyle = '#92400e';
      ctx.fillRect(ch.x - ch.size / 2, ch.y + bobY - ch.size / 3, ch.size, ch.size * 0.7);

      // Chest lid
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(ch.x, ch.y + bobY - ch.size / 3, ch.size / 2, Math.PI, 0);
      ctx.fill();

      // Gold trim
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(ch.x - ch.size / 2, ch.y + bobY - ch.size / 3, ch.size, 3);
      ctx.fillRect(ch.x - ch.size / 2, ch.y + bobY + ch.size / 6, ch.size, 3);

      // Lock
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(ch.x, ch.y + bobY, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ─── Collision helpers ─────────────────────────────────────────
  function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < r1 + r2;
  }

  function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  // ─── Input handlers ────────────────────────────────────────────
  function onKeyDown(e) {
    if (!isPlaying) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        player.moveLeft = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        player.moveRight = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        player.moveUp = true;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        player.moveDown = true;
        e.preventDefault();
        break;
    }
  }

  function onKeyUp(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        player.moveLeft = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        player.moveRight = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        player.moveUp = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        player.moveDown = false;
        break;
    }
  }

  function setupTouchControls() {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!isPlaying) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      touchTarget = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!isPlaying || !touchTarget) return;

      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      touchTarget.x = (touch.clientX - rect.left) * scaleX;
      touchTarget.y = (touch.clientY - rect.top) * scaleY;
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchTarget = null;
    }, { passive: false });
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
  }

  // ─── Bootstrap ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
