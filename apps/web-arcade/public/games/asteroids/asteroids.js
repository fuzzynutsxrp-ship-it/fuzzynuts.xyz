(function() {
  'use strict';

  // ── Constants ──
  const BG_COLOR = '#0a0614';
  const SHIP_COLOR = '#ffffff';
  const ASTEROID_COLOR = '#888888';
  const BULLET_COLOR = '#06b6d4';
  const ACCENT_RED = '#ef4444';
  const SHIP_SIZE = 18;
  const ROTATE_SPEED = 0.07;
  const THRUST_POWER = 0.12;
  const FRICTION = 0.99;
  const MAX_SPEED = 7;
  const BULLET_SPEED = 10;
  const BULLET_LIFETIME = 55;
  const FIRE_COOLDOWN = 8;
  const ASTEROID_SPEED_BASE = 1.0;
  const INVINCIBILITY_TIME = 180;
  const HYPERSPACE_EXPLODE_CHANCE = 0.15;

  const ASTEROID_SIZES = {
    large: { radius: 45, score: 20, children: 2, childSize: 'medium' },
    medium: { radius: 25, score: 50, children: 2, childSize: 'small' },
    small: { radius: 12, score: 100, children: 0 }
  };

  // ── State ──
  let canvas, ctx;
  let W, H;
  let ship, bullets, asteroids, particles;
  let score, lives, wave, invincibleTimer, gameOver, gameRunning;
  let startTime, fireCooldown;
  let keys = {};
  let touchJoy = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  let touchFire = false;
  let animFrame;
  let bestScore = parseInt(localStorage.getItem('asteroids_best')) || 0;

  // ── Helpers ──
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function wrap(obj) {
    if (obj.x < 0) obj.x += W;
    if (obj.x > W) obj.x -= W;
    if (obj.y < 0) obj.y += H;
    if (obj.y > H) obj.y -= H;
  }
  function dist(a, b) {
    let dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function updateHUD() {
    let se = document.getElementById('score-display');
    let le = document.getElementById('lives-display');
    if (se) se.textContent = 'Score: ' + score;
    if (le) le.textContent = 'Lives: ' + lives;
  }
  function showOverlay(id) {
    let el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }
  function hideOverlay(id) {
    let el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  // ── Particle System ──
  function spawnParticles(x, y, count, color, speedMult) {
    speedMult = speedMult || 1;
    for (let i = 0; i < count; i++) {
      let angle = rand(0, Math.PI * 2);
      let spd = rand(1, 4) * speedMult;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: rand(20, 50),
        maxLife: 50,
        color: color || '#ffffff',
        size: rand(1, 3)
      });
    }
  }

  function spawnExplosion(x, y) {
    spawnParticles(x, y, 30, '#ef4444', 1.5);
    spawnParticles(x, y, 15, '#ffaa00', 1);
    spawnParticles(x, y, 10, '#ffffff', 0.8);
  }

  // ── Ship ──
  function createShip() {
    return {
      x: W / 2, y: H / 2,
      vx: 0, vy: 0,
      angle: -Math.PI / 2,
      thrusting: false,
      alive: true
    };
  }

  function drawShip() {
    if (!ship.alive && invincibleTimer > 0) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = SHIP_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = SHIP_COLOR;
    ctx.shadowBlur = 4;

    // Invincibility flicker
    if (invincibleTimer > 0 && Math.floor(invincibleTimer / 6) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Ship triangle
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
    ctx.lineTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame
    if (ship.thrusting) {
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE * 0.45, -SHIP_SIZE * 0.25);
      ctx.lineTo(-SHIP_SIZE * (0.9 + Math.random() * 0.5), 0);
      ctx.lineTo(-SHIP_SIZE * 0.45, SHIP_SIZE * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateShip() {
    if (!ship.alive) return;

    let left = keys['ArrowLeft'] || keys['KeyA'];
    let right = keys['ArrowRight'] || keys['KeyD'];
    let up = keys['ArrowUp'] || keys['KeyW'];

    // Touch joystick override
    if (touchJoy.active) {
      let mag = Math.sqrt(touchJoy.dx * touchJoy.dx + touchJoy.dy * touchJoy.dy);
      if (mag > 15) {
        let joyAngle = Math.atan2(touchJoy.dy, touchJoy.dx);
        let diff = joyAngle - ship.angle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (diff > 0.15) right = true;
        else if (diff < -0.15) left = true;
        up = true;
      }
    }

    if (left) ship.angle -= ROTATE_SPEED;
    if (right) ship.angle += ROTATE_SPEED;
    ship.thrusting = up;
    if (up) {
      ship.vx += Math.cos(ship.angle) * THRUST_POWER;
      ship.vy += Math.sin(ship.angle) * THRUST_POWER;
    }
    let spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (spd > MAX_SPEED) {
      ship.vx = (ship.vx / spd) * MAX_SPEED;
      ship.vy = (ship.vy / spd) * MAX_SPEED;
    }
    ship.vx *= FRICTION;
    ship.vy *= FRICTION;
    ship.x += ship.vx;
    ship.y += ship.vy;
    wrap(ship);
  }

  // ── Asteroids ──
  function createAsteroid(x, y, size) {
    let angle = rand(0, Math.PI * 2);
    let speed = ASTEROID_SPEED_BASE * (1 + wave * 0.15) * rand(0.5, 1.5);
    let info = ASTEROID_SIZES[size];
    // Jagged shape
    let verts = [];
    let numVerts = Math.floor(rand(8, 14));
    for (let i = 0; i < numVerts; i++) {
      let a = (i / numVerts) * Math.PI * 2;
      let r = info.radius * rand(0.7, 1.3);
      verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return {
      x: x, y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: info.radius,
      size: size,
      score: info.score,
      children: info.children,
      childSize: info.childSize,
      verts: verts,
      rotAngle: 0,
      rotSpeed: rand(-0.02, 0.02)
    };
  }

  function spawnWave() {
    let count = 3 + wave;
    for (let i = 0; i < count; i++) {
      let x, y;
      let side = Math.floor(rand(0, 4));
      if (side === 0) { x = rand(0, W); y = -50; }
      else if (side === 1) { x = W + 50; y = rand(0, H); }
      else if (side === 2) { x = rand(0, W); y = H + 50; }
      else { x = -50; y = rand(0, H); }
      asteroids.push(createAsteroid(x, y, 'large'));
    }
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotAngle);
    ctx.strokeStyle = ASTEROID_COLOR;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = ASTEROID_COLOR;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(a.verts[0].x, a.verts[0].y);
    for (let i = 1; i < a.verts.length; i++) {
      ctx.lineTo(a.verts[i].x, a.verts[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function updateAsteroids() {
    for (let a of asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      a.rotAngle += a.rotSpeed;
      wrap(a);
    }
    // Check wave complete
    if (asteroids.length === 0) {
      wave++;
      spawnWave();
    }
  }

  // ── Bullets ──
  function fireBullet() {
    if (fireCooldown > 0 || !ship.alive) return;
    fireCooldown = FIRE_COOLDOWN;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
      y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
      vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.3,
      vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.3,
      life: BULLET_LIFETIME
    });
  }

  function drawBullet(b) {
    ctx.fillStyle = BULLET_COLOR;
    ctx.shadowColor = BULLET_COLOR;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      let b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      wrap(b);
      if (b.life <= 0) bullets.splice(i, 1);
    }
  }

  // ── Hyperspace ──
  function hyperspace() {
    if (!ship.alive) return;
    spawnParticles(ship.x, ship.y, 15, BULLET_COLOR, 1);
    ship.x = rand(50, W - 50);
    ship.y = rand(50, H - 50);
    ship.vx = 0;
    ship.vy = 0;
    if (Math.random() < HYPERSPACE_EXPLODE_CHANCE) {
      destroyShip();
    }
  }

  // ── Collision & Destruction ──
  function destroyAsteroid(index) {
    let a = asteroids[index];
    score += a.score;
    spawnParticles(a.x, a.y, 12 + a.radius / 3, ASTEROID_COLOR, 1);
    // Break into children
    if (a.children > 0) {
      for (let i = 0; i < a.children; i++) {
        let child = createAsteroid(
          a.x + rand(-10, 10),
          a.y + rand(-10, 10),
          a.childSize
        );
        asteroids.push(child);
      }
    }
    asteroids.splice(index, 1);
    updateHUD();
  }

  function destroyShip() {
    if (invincibleTimer > 0) return;
    spawnExplosion(ship.x, ship.y);
    ship.alive = false;
    lives--;
    updateHUD();
    if (lives <= 0) {
      endGame();
    } else {
      setTimeout(function() {
        ship = createShip();
        ship.x = W / 2;
        ship.y = H / 2;
        invincibleTimer = INVINCIBILITY_TIME;
      }, 1000);
    }
  }

  function checkCollisions() {
    // Bullets vs asteroids
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      let b = bullets[bi];
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        let a = asteroids[ai];
        if (dist(b, a) < a.radius) {
          bullets.splice(bi, 1);
          destroyAsteroid(ai);
          break;
        }
      }
    }
    // Ship vs asteroids
    if (ship.alive && invincibleTimer <= 0) {
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        let a = asteroids[ai];
        if (dist(ship, a) < a.radius + SHIP_SIZE * 0.5) {
          destroyShip();
          break;
        }
      }
    }
  }

  // ── Game Flow ──
  function endGame() {
    gameOver = true;
    gameRunning = false;
    let duration = Math.floor((Date.now() - startTime) / 1000);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('asteroids_best', bestScore);
    }
    window.__gameScore = score;
    if (typeof window.FuzzyScoreSubmit === 'function') {
      window.FuzzyScoreSubmit('asteroids', score, duration);
    }
    showOverlay('game-over');
  }

  function startGame() {
    hideOverlay('start-screen');
    hideOverlay('game-over');
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    ship = createShip();
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    lives = 3;
    wave = 1;
    invincibleTimer = INVINCIBILITY_TIME;
    gameOver = false;
    gameRunning = true;
    fireCooldown = 0;
    startTime = Date.now();
    window.__gameScore = 0;
    updateHUD();
    spawnWave();
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  // ── Main Loop ──
  function loop() {
    if (!gameRunning) return;
    animFrame = requestAnimationFrame(loop);
    update();
    draw();
  }

  function update() {
    if (fireCooldown > 0) fireCooldown--;
    if (invincibleTimer > 0) invincibleTimer--;
    updateShip();
    updateBullets();
    updateAsteroids();
    checkCollisions();

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Touch fire
    if (touchFire) fireBullet();

    // Keyboard fire
    if (keys['Space']) fireBullet();

    // Hyperspace
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      keys['ShiftLeft'] = false;
      keys['ShiftRight'] = false;
      hyperspace();
    }
  }

  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    ctx.shadowBlur = 0;

    // Stars (static background dots)
    drawStars();

    // Particles
    for (let p of particles) {
      let alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Asteroids
    for (let a of asteroids) drawAsteroid(a);

    // Bullets
    for (let b of bullets) drawBullet(b);

    // Ship
    if (ship.alive || invincibleTimer > 0) drawShip();
  }

  // ── Static Stars ──
  let starField = [];
  function generateStars() {
    starField = [];
    for (let i = 0; i < 120; i++) {
      starField.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.5 + 0.2
      });
    }
  }
  function drawStars() {
    for (let s of starField) {
      if (s.x > W || s.y > H) continue;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Resize ──
  function resize() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    let parent = canvas.parentElement || document.body;
    W = parent.clientWidth || window.innerWidth;
    H = parent.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }

  // ── Input ──
  function setupInput() {
    document.addEventListener('keydown', function(e) {
      keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].indexOf(e.code) !== -1) {
        e.preventDefault();
      }
      if (e.code === 'Enter' && gameOver) {
        startGame();
      }
    });
    document.addEventListener('keyup', function(e) {
      keys[e.code] = false;
    });

    // Touch: left half = joystick, right half = fire
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (t.clientX < W / 2) {
          touchJoy.active = true;
          touchJoy.startX = t.clientX;
          touchJoy.startY = t.clientY;
          touchJoy.id = t.identifier;
        } else {
          touchFire = true;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (touchJoy.active && t.identifier === touchJoy.id) {
          touchJoy.dx = t.clientX - touchJoy.startX;
          touchJoy.dy = t.clientY - touchJoy.startY;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      for (let t of e.changedTouches) {
        if (touchJoy.active && t.identifier === touchJoy.id) {
          touchJoy.active = false;
          touchJoy.dx = 0;
          touchJoy.dy = 0;
        }
        if (t.clientX >= W / 2) {
          touchFire = false;
        }
      }
    }, { passive: false });

    window.addEventListener('resize', resize);
  }

  // ── Init ──
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    generateStars();
    setupInput();
    gameOver = false;
    gameRunning = false;

    // Show start screen, draw preview
    showOverlay('start-screen');
    drawPreview();
  }

  function drawPreview() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    drawStars();
    // Draw a centered ship preview
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.strokeStyle = SHIP_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = SHIP_COLOR;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
    ctx.lineTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ── Expose to global scope for HTML integration ──
  window.AsteroidsGame = {
    init: init,
    start: startGame,
    restart: startGame,
    resize: resize
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
