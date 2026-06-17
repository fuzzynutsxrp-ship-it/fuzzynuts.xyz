/**
 * Tank Battle - Canvas 2D Top-Down Tank Shooter
 * Part of FuzzyNuts Arcade
 * Vanilla JS, IIFE pattern, no modules
 */
(function() {
  'use strict';

  // === CONSTANTS ===
  const BG_COLOR = '#0a0614';
  const PLAYER_COLOR = '#22c55e';
  const ENEMY_COLORS = ['#ef4444', '#f97316', '#dc2626', '#ea580c'];
  const WALL_COLOR = '#3b3b5c';
  const BARRIER_COLOR = '#8b6914';
  const WATER_COLOR = '#1e3a5f';
  const POWERUP_COLORS = {
    rapidFire: '#f59e0b',
    tripleShot: '#a855f7',
    shield: '#3b82f6',
    speedBoost: '#06b6d4'
  };
  const TILE_SIZE = 32;
  const PLAYER_SPEED = 3;
  const ENEMY_BASE_SPEED = 1.2;
  const BULLET_SPEED = 6;
  const ENEMY_BULLET_SPEED = 4;
  const SHOOT_COOLDOWN = 300;
  const ENEMY_SHOOT_INTERVAL = 2000;
  const INVINCIBILITY_DURATION = 2000;
  const COMBO_WINDOW = 2000;
  const POWERUP_DURATION = 8000;
  const POWERUP_SPAWN_INTERVAL = 15000;

  // Terrain types
  const EMPTY = 0, WALL = 1, BARRIER = 2, WATER = 3;

  // === GAME STATE ===
  let canvas, ctx;
  let gameWidth, gameHeight;
  let cols, rows;
  let running = false;
  let paused = false;
  let gameOver = false;
  let score = 0;
  let lives = 3;
  let wave = 1;
  let bestScore = parseInt((function(){try{return localStorage.getItem('tank-battle_best')}catch(e){return null}})()) || 0;
  let startTime = 0;
  let lastComboTime = 0;
  let comboCount = 0;
  let lastPowerupSpawn = 0;
  let animFrame = null;

  // Map
  let terrain = [];

  // Entities
  let player = null;
  let enemies = [];
  let bullets = [];
  let particles = [];
  let powerups = [];

  // Input
  let keys = {};
  let touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  let touchFire = false;
  let touchFireCooldown = 0;

  // HUD elements (cached)
  let scoreDisplay, livesDisplay, levelDisplay;

  // === TANK CLASS ===
  function Tank(x, y, color, isPlayer) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.color = color;
    this.angle = isPlayer ? -Math.PI / 2 : Math.PI / 2; // face up or down
    this.speed = isPlayer ? PLAYER_SPEED : ENEMY_BASE_SPEED;
    this.isPlayer = isPlayer;
    this.alive = true;
    this.lastShot = 0;
    this.shootCooldown = isPlayer ? SHOOT_COOLDOWN : ENEMY_SHOOT_INTERVAL;
    this.invincible = false;
    this.invincibleUntil = 0;
    this.health = isPlayer ? 1 : 1;

    // Power-up state
    this.rapidFire = false;
    this.tripleShot = false;
    this.hasShield = false;
    this.speedBoost = false;
    this.powerupTimers = {};
  }

  Tank.prototype.getSpeed = function() {
    var s = this.speed;
    if (this.speedBoost && this.isPlayer) s *= 1.6;
    return s;
  };

  Tank.prototype.getCooldown = function() {
    if (this.rapidFire && this.isPlayer) return this.shootCooldown * 0.35;
    return this.shootCooldown;
  };

  Tank.prototype.shoot = function(now) {
    if (now - this.lastShot < this.getCooldown()) return;
    this.lastShot = now;
    var cos = Math.cos(this.angle);
    var sin = Math.sin(this.angle);
    var bSpeed = this.isPlayer ? BULLET_SPEED : ENEMY_BULLET_SPEED;
    var bx = this.x + cos * 18;
    var by = this.y + sin * 18;

    bullets.push({
      x: bx, y: by,
      vx: cos * bSpeed, vy: sin * bSpeed,
      isPlayer: this.isPlayer,
      alive: true
    });

    if (this.tripleShot && this.isPlayer) {
      var spread = 0.3;
      bullets.push({
        x: bx, y: by,
        vx: Math.cos(this.angle - spread) * bSpeed,
        vy: Math.sin(this.angle - spread) * bSpeed,
        isPlayer: true, alive: true
      });
      bullets.push({
        x: bx, y: by,
        vx: Math.cos(this.angle + spread) * bSpeed,
        vy: Math.sin(this.angle + spread) * bSpeed,
        isPlayer: true, alive: true
      });
    }
  };

  Tank.prototype.update = function(dt, now) {
    if (this.isPlayer) {
      if (now > this.invincibleUntil) this.invincible = false;
      // Update powerup timers
      for (var pk in this.powerupTimers) {
        if (now > this.powerupTimers[pk]) {
          this[pk] = false;
          delete this.powerupTimers[pk];
        }
      }
    }
  };

  Tank.prototype.draw = function() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Invincibility flash
    if (this.invincible && Date.now() % 200 < 100) {
      ctx.globalAlpha = 0.4;
    }

    // Tank body
    ctx.fillStyle = this.color;
    ctx.fillRect(-12, -14, 24, 28);

    // Treads
    ctx.fillStyle = this.isPlayer ? '#166534' : '#7c2d12';
    ctx.fillRect(-14, -14, 5, 28);
    ctx.fillRect(9, -14, 5, 28);

    // Tread detail
    for (var i = 0; i < 4; i++) {
      var ty = -12 + i * 8;
      ctx.fillStyle = this.isPlayer ? '#15803d' : '#9a3412';
      ctx.fillRect(-14, ty, 5, 3);
      ctx.fillRect(9, ty, 5, 3);
    }

    // Turret dome
    ctx.fillStyle = this.isPlayer ? '#4ade80' : '#fca5a5';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    ctx.fillStyle = this.isPlayer ? '#dcfce7' : '#fee2e2';
    ctx.fillRect(-2, -18, 4, 14);

    ctx.globalAlpha = 1;

    // Shield visual
    if (this.hasShield) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() * 0.005);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };

  // === MAP GENERATION ===
  function generateMap() {
    terrain = [];
    for (var r = 0; r < rows; r++) {
      terrain[r] = [];
      for (var c = 0; c < cols; c++) {
        terrain[r][c] = EMPTY;
      }
    }

    // Border walls
    for (var c = 0; c < cols; c++) {
      terrain[0][c] = WALL;
      terrain[rows - 1][c] = WALL;
    }
    for (var r = 0; r < rows; r++) {
      terrain[r][0] = WALL;
      terrain[r][cols - 1] = WALL;
    }

    // Interior walls - symmetric pattern
    var wallPatterns = [
      // Horizontal walls
      [3, 4, 8], [3, 14, 8],
      [rows - 4, 4, 8], [rows - 4, 14, 8],
      // Vertical walls
      [4, 6, 6], [4, cols - 7, 6],
      // Center pillars
      [Math.floor(rows / 2) - 1, Math.floor(cols / 2) - 1, 3],
      // Corner blocks
      [5, 3, 2, 2], [5, cols - 5, 2, 2],
      [rows - 7, 3, 2, 2], [rows - 7, cols - 5, 2, 2]
    ];

    wallPatterns.forEach(function(p) {
      if (p.length === 3) {
        var startR = p[0], startC = p[1], len = p[2];
        for (var i = 0; i < len; i++) {
          if (startR >= 0 && startR < rows && startC + i >= 0 && startC + i < cols) {
            if (terrain[startR][startC + i] === EMPTY)
              terrain[startR][startC + i] = WALL;
          }
        }
      } else if (p.length === 4) {
        var sr = p[0], sc = p[1], w = p[2], h = p[3];
        for (var dr = 0; dr < h; dr++) {
          for (var dc = 0; dc < w; dc++) {
            if (sr + dr >= 0 && sr + dr < rows && sc + dc >= 0 && sc + dc < cols) {
              if (terrain[sr + dr][sc + dc] === EMPTY)
                terrain[sr + dr][sc + dc] = WALL;
            }
          }
        }
      }
    });

    // Destructible barriers
    var barrierPositions = [
      [6, 10], [6, cols - 11],
      [rows - 7, 10], [rows - 7, cols - 11],
      [Math.floor(rows / 2), 4], [Math.floor(rows / 2), cols - 5],
      [Math.floor(rows / 2), Math.floor(cols / 2)]
    ];
    barrierPositions.forEach(function(p) {
      if (terrain[p[0]][p[1]] === EMPTY) terrain[p[0]][p[1]] = BARRIER;
      if (p[1] + 1 < cols && terrain[p[0]][p[1] + 1] === EMPTY) terrain[p[0]][p[1] + 1] = BARRIER;
    });

    // Water patches
    var waterPositions = [
      [Math.floor(rows / 2) - 2, Math.floor(cols / 2) - 3, 2, 1],
      [Math.floor(rows / 2) + 2, Math.floor(cols / 2) + 2, 1, 2]
    ];
    waterPositions.forEach(function(p) {
      for (var dr = 0; dr < p[3]; dr++) {
        for (var dc = 0; dc < p[2]; dc++) {
          var wr = p[0] + dr, wc = p[1] + dc;
          if (wr >= 1 && wr < rows - 1 && wc >= 1 && wc < cols - 1 && terrain[wr][wc] === EMPTY) {
            terrain[wr][wc] = WATER;
          }
        }
      }
    });

    // Add more walls for larger maps
    if (wave > 3) {
      for (var i = 0; i < wave; i++) {
        var wr = 2 + Math.floor(Math.random() * (rows - 4));
        var wc = 2 + Math.floor(Math.random() * (cols - 4));
        if (terrain[wr][wc] === EMPTY) terrain[wr][wc] = WALL;
      }
    }
  }

  // === COLLISION HELPERS ===
  function isWalkable(x, y, w, h) {
    var left = Math.floor((x - w / 2) / TILE_SIZE);
    var right = Math.floor((x + w / 2) / TILE_SIZE);
    var top = Math.floor((y - h / 2) / TILE_SIZE);
    var bottom = Math.floor((y + h / 2) / TILE_SIZE);

    for (var r = top; r <= bottom; r++) {
      for (var c = left; c <= right; c++) {
        if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
        var t = terrain[r][c];
        if (t === WALL || t === WATER) return false;
      }
    }
    return true;
  }

  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }

  // === PARTICLES ===
  function spawnExplosion(x, y, color, count) {
    for (var i = 0; i < (count || 12); i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 3;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color: color || '#f97316',
        size: 2 + Math.random() * 4
      });
    }
  }

  // === WAVE SPAWNING ===
  function spawnWave() {
    var count = Math.min(2 + wave, 10);
    var speedMult = 1 + (wave - 1) * 0.1;

    for (var i = 0; i < count; i++) {
      var edge = Math.floor(Math.random() * 4);
      var x, y;
      var attempts = 0;

      do {
        switch (edge) {
          case 0: x = TILE_SIZE * 1.5; y = TILE_SIZE * (1.5 + Math.random() * (rows - 3)); break;
          case 1: x = TILE_SIZE * (cols - 1.5); y = TILE_SIZE * (1.5 + Math.random() * (rows - 3)); break;
          case 2: x = TILE_SIZE * (1.5 + Math.random() * (cols - 3)); y = TILE_SIZE * 1.5; break;
          case 3: x = TILE_SIZE * (1.5 + Math.random() * (cols - 3)); y = TILE_SIZE * (rows - 1.5); break;
        }
        attempts++;
      } while (!isWalkable(x, y, 28, 28) && attempts < 20);

      if (attempts >= 20) continue;

      var colorIdx = Math.min(Math.floor(wave / 2), ENEMY_COLORS.length - 1);
      var tank = new Tank(x, y, ENEMY_COLORS[colorIdx], false);
      tank.speed = ENEMY_BASE_SPEED * speedMult;
      tank.shootCooldown = Math.max(800, ENEMY_SHOOT_INTERVAL - wave * 150);
      tank.health = wave > 5 ? 2 : 1;

      // Elite enemies in later waves
      if (wave > 3 && Math.random() < 0.3) {
        tank.speed *= 1.3;
        tank.shootCooldown *= 0.7;
      }

      enemies.push(tank);
    }
  }

  // === POWERUP MANAGEMENT ===
  function spawnPowerup() {
    var types = ['rapidFire', 'tripleShot', 'shield', 'speedBoost'];
    var type = types[Math.floor(Math.random() * types.length)];
    var x, y, attempts = 0;

    do {
      x = TILE_SIZE * (2 + Math.random() * (cols - 4));
      y = TILE_SIZE * (2 + Math.random() * (rows - 4));
      attempts++;
    } while (!isWalkable(x, y, 24, 24) && attempts < 30);

    if (attempts < 30) {
      powerups.push({
        x: x, y: y,
        type: type,
        alive: true,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function applyPowerup(type) {
    player[type] = true;
    player.powerupTimers[type] = Date.now() + POWERUP_DURATION;
  }

  // === ENEMY AI ===
  function updateEnemy(enemy, now) {
    if (!player || !player.alive) return;

    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var d = dist(enemy.x, enemy.y, player.x, player.y);

    // Face toward player
    enemy.angle = Math.atan2(dy, dx);

    // Move toward player but keep distance
    var desiredDist = 100 + Math.random() * 50;
    var moveAngle = enemy.angle;

    // Slight random wander
    if (Math.random() < 0.02) {
      moveAngle += (Math.random() - 0.5) * 1.5;
    }

    // Avoid obstacles - try to path around
    var nextX = enemy.x + Math.cos(moveAngle) * enemy.getSpeed();
    var nextY = enemy.y + Math.sin(moveAngle) * enemy.getSpeed();

    if (isWalkable(nextX, enemy.y, 28, 28) && isWalkable(enemy.x, nextY, 28, 28)) {
      enemy.x = nextX;
      enemy.y = nextY;
    } else if (isWalkable(nextX, enemy.y, 28, 28)) {
      enemy.x = nextX;
    } else if (isWalkable(enemy.x, nextY, 28, 28)) {
      enemy.y = nextY;
    } else {
      // Try perpendicular directions
      var perpAngle = moveAngle + Math.PI / 2;
      var px = enemy.x + Math.cos(perpAngle) * enemy.getSpeed();
      var py = enemy.y + Math.sin(perpAngle) * enemy.getSpeed();
      if (isWalkable(px, py, 28, 28)) {
        enemy.x = px;
        enemy.y = py;
      }
    }

    // Keep in bounds
    enemy.x = Math.max(TILE_SIZE, Math.min((cols - 1) * TILE_SIZE, enemy.x));
    enemy.y = Math.max(TILE_SIZE, Math.min((rows - 1) * TILE_SIZE, enemy.y));

    // Shoot if player is in range and roughly aligned
    if (d < 300 && now - enemy.lastShot > enemy.shootCooldown) {
      // Only shoot if there's a clear-ish line
      enemy.shoot(now);
    }
  }

  // === PLAYER MOVEMENT ===
  function updatePlayer(now) {
    if (!player || !player.alive) return;
    player.update(0, now);

    var dx = 0, dy = 0;

    // Keyboard input
    if (keys['w'] || keys['arrowup']) dy = -1;
    if (keys['s'] || keys['arrowdown']) dy = 1;
    if (keys['a'] || keys['arrowleft']) dx = -1;
    if (keys['d'] || keys['arrowright']) dx = 1;

    // Touch joystick override
    if (touchJoystick.active) {
      dx = touchJoystick.dx;
      dy = touchJoystick.dy;
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      var len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Face movement direction
    if (dx !== 0 || dy !== 0) {
      player.angle = Math.atan2(dy, dx);
    }

    var speed = player.getSpeed();
    var newX = player.x + dx * speed;
    var newY = player.y + dy * speed;

    // Wall collision
    if (isWalkable(newX, player.y, 28, 28)) player.x = newX;
    if (isWalkable(player.x, newY, 28, 28)) player.y = newY;

    // Keep in bounds
    player.x = Math.max(TILE_SIZE, Math.min((cols - 1) * TILE_SIZE, player.x));
    player.y = Math.max(TILE_SIZE, Math.min((rows - 1) * TILE_SIZE, player.y));

    // Shooting
    if (keys[' '] || keys['enter']) {
      player.shoot(now);
    }

    // Touch fire
    if (touchFire && now > touchFireCooldown) {
      player.shoot(now);
      touchFireCooldown = now + 150;
    }
  }

  // === BULLET UPDATE ===
  function updateBullets(now) {
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      if (!b.alive) { bullets.splice(i, 1); continue; }

      b.x += b.vx;
      b.y += b.vy;

      // Out of bounds
      if (b.x < 0 || b.x > cols * TILE_SIZE || b.y < 0 || b.y > rows * TILE_SIZE) {
        b.alive = false;
        continue;
      }

      // Terrain collision
      var tc = Math.floor(b.x / TILE_SIZE);
      var tr = Math.floor(b.y / TILE_SIZE);
      if (tr >= 0 && tr < rows && tc >= 0 && tc < cols) {
        var tile = terrain[tr][tc];
        if (tile === WALL) {
          b.alive = false;
          spawnExplosion(b.x, b.y, '#9ca3af', 5);
          continue;
        }
        if (tile === BARRIER) {
          b.alive = false;
          terrain[tr][tc] = EMPTY;
          spawnExplosion(b.x, b.y, '#8b6914', 8);
          continue;
        }
      }

      // Player bullet vs enemies
      if (b.isPlayer) {
        for (var j = enemies.length - 1; j >= 0; j--) {
          var e = enemies[j];
          if (!e.alive) continue;
          if (rectOverlap(b.x, b.y, 4, 4, e.x, e.y, 28, 28)) {
            b.alive = false;
            e.health--;
            if (e.health <= 0) {
              e.alive = false;
              spawnExplosion(e.x, e.y, '#f97316', 20);

              // Combo scoring
              if (now - lastComboTime < COMBO_WINDOW) {
                comboCount++;
              } else {
                comboCount = 1;
              }
              lastComboTime = now;
              var points = 100 + (comboCount - 1) * 50;
              score += points;

              updateHUD();
            } else {
              spawnExplosion(b.x, b.y, '#fbbf24', 5);
            }
            break;
          }
        }
      } else {
        // Enemy bullet vs player
        if (player && player.alive) {
          if (rectOverlap(b.x, b.y, 4, 4, player.x, player.y, 28, 28)) {
            b.alive = false;
            if (!player.invincible && !player.hasShield) {
              playerHit();
            } else if (player.hasShield) {
              player.hasShield = false;
              delete player.powerupTimers.shield;
              spawnExplosion(player.x, player.y, '#3b82f6', 10);
            }
          }
        }
      }

      // Bullet vs bullet
      for (var k = i + 1; k < bullets.length; k++) {
        var b2 = bullets[k];
        if (b2.alive && b.isPlayer !== b2.isPlayer) {
          if (rectOverlap(b.x, b.y, 4, 4, b2.x, b2.y, 4, 4)) {
            b.alive = false;
            b2.alive = false;
            spawnExplosion(b.x, b.y, '#e5e7eb', 4);
            break;
          }
        }
      }
    }
  }

  // === PLAYER HIT ===
  function playerHit() {
    if (!player || !player.alive) return;
    lives--;
    spawnExplosion(player.x, player.y, PLAYER_COLOR, 25);
    updateHUD();

    if (lives <= 0) {
      player.alive = false;
      endGame();
    } else {
      // Respawn with invincibility
      player.x = (cols / 2) * TILE_SIZE;
      player.y = (rows - 2) * TILE_SIZE;
      player.invincible = true;
      player.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;
    }
  }

  // === PARTICLES UPDATE ===
  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // === POWERUP PICKUP CHECK ===
  function checkPowerups() {
    if (!player || !player.alive) return;
    for (var i = powerups.length - 1; i >= 0; i--) {
      var pu = powerups[i];
      if (!pu.alive) continue;
      if (dist(player.x, player.y, pu.x, pu.y) < 24) {
        pu.alive = false;
        applyPowerup(pu.type);
        spawnExplosion(pu.x, pu.y, POWERUP_COLORS[pu.type], 15);
        score += 25;
        updateHUD();
        powerups.splice(i, 1);
      }
    }
  }

  // === DRAWING ===
  function drawTerrain() {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = terrain[r][c];
        if (t === EMPTY) continue;
        var x = c * TILE_SIZE, y = r * TILE_SIZE;
        switch (t) {
          case WALL:
            ctx.fillStyle = WALL_COLOR;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#4a4a6a';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 2);
            ctx.fillRect(x + 2, y + 2, 2, TILE_SIZE - 4);
            break;
          case BARRIER:
            ctx.fillStyle = BARRIER_COLOR;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#a07818';
            ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
            // Crack pattern
            ctx.strokeStyle = '#6b5410';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 4);
            ctx.lineTo(x + 16, y + 16);
            ctx.lineTo(x + 24, y + 20);
            ctx.stroke();
            break;
          case WATER:
            ctx.fillStyle = WATER_COLOR;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            // Wave pattern
            ctx.strokeStyle = '#2a5080';
            ctx.lineWidth = 1;
            var waveOffset = Math.sin(Date.now() * 0.002 + c * 0.5) * 3;
            ctx.beginPath();
            ctx.moveTo(x, y + 10 + waveOffset);
            ctx.quadraticCurveTo(x + 16, y + 16 + waveOffset, x + 32, y + 10 + waveOffset);
            ctx.stroke();
            waveOffset = Math.sin(Date.now() * 0.002 + c * 0.5 + 1) * 3;
            ctx.beginPath();
            ctx.moveTo(x, y + 20 + waveOffset);
            ctx.quadraticCurveTo(x + 16, y + 26 + waveOffset, x + 32, y + 20 + waveOffset);
            ctx.stroke();
            break;
        }
      }
    }
  }

  function drawBullets() {
    bullets.forEach(function(b) {
      if (!b.alive) return;
      ctx.fillStyle = b.isPlayer ? '#bbf7d0' : '#fca5a5';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Bullet glow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = b.isPlayer ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawPowerups() {
    var now = Date.now();
    powerups.forEach(function(pu) {
      if (!pu.alive) return;
      pu.pulse += 0.05;
      var size = 10 + Math.sin(pu.pulse) * 3;
      var color = POWERUP_COLORS[pu.type];

      // Glow
      ctx.globalAlpha = 0.3 + Math.sin(pu.pulse) * 0.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, size + 6, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var icons = { rapidFire: 'R', tripleShot: '3', shield: 'S', speedBoost: '⚡' };
      ctx.fillText(icons[pu.type], pu.x, pu.y);
    });
  }

  function drawParticles() {
    particles.forEach(function(p) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // Top-left: wave announcement (brief)
    if (Date.now() - startTime < 3000) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, 1 - (Date.now() - startTime) / 3000);
      ctx.fillText('WAVE ' + wave, gameWidth / 2, gameHeight / 2 - 60);
      ctx.globalAlpha = 1;
    }

    // Combo display
    if (comboCount > 1 && Date.now() - lastComboTime < COMBO_WINDOW) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, 1 - (Date.now() - lastComboTime) / COMBO_WINDOW);
      ctx.fillText('COMBO x' + comboCount + '!', gameWidth / 2, 40);
      ctx.globalAlpha = 1;
    }

    // Active powerup indicators
    if (player && player.alive) {
      var px = 10, py = gameHeight - 30;
      ['rapidFire', 'tripleShot', 'shield', 'speedBoost'].forEach(function(type) {
        if (player[type]) {
          var remaining = (player.powerupTimers[type] - Date.now()) / POWERUP_DURATION;
          ctx.fillStyle = POWERUP_COLORS[type];
          ctx.globalAlpha = 0.6;
          ctx.fillRect(px, py, 50 * remaining, 10);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = POWERUP_COLORS[type];
          ctx.strokeRect(px, py, 50, 10);
          px += 60;
        }
      });
    }
  }

  // === HUD UPDATE ===
  function updateHUD() {
    scoreDisplay = document.getElementById('score-display');
    livesDisplay = document.getElementById('lives-display');
    levelDisplay = document.getElementById('level-display');

    if (scoreDisplay) scoreDisplay.textContent = score;
    if (livesDisplay) livesDisplay.textContent = lives;
    if (levelDisplay) levelDisplay.textContent = wave;

    window.__gameScore = score;
  }

  // === GAME FLOW ===
  function initGame() {
    score = 0;
    lives = 3;
    wave = 1;
    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];
    comboCount = 0;
    lastComboTime = 0;
    lastPowerupSpawn = Date.now();
    gameOver = false;
    startTime = Date.now();

    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    cols = Math.floor(gameWidth / TILE_SIZE);
    rows = Math.floor(gameHeight / TILE_SIZE);

    generateMap();

    // Spawn player at bottom center
    player = new Tank(
      Math.floor(cols / 2) * TILE_SIZE,
      (rows - 2) * TILE_SIZE,
      PLAYER_COLOR, true
    );
    player.invincible = true;
    player.invincibleUntil = Date.now() + INVINCIBILITY_DURATION;

    spawnWave();
    updateHUD();

    running = true;
    if (animFrame) cancelAnimationFrame(animFrame);
    gameLoop(performance.now());
  }

  function nextWave() {
    wave++;
    generateMap();
    spawnWave();
    lastPowerupSpawn = Date.now();
    updateHUD();
    startTime = Date.now();
  }

  function endGame() {
    gameOver = true;
    running = false;

    // Update best score
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('tank-battle_best', bestScore.toString()); } catch(e) {}
    }

    window.__gameScore = score;
    updateHUD();

    // Submit score
    var duration = Math.floor((Date.now() - startTime) / 1000);
    if (typeof window.FuzzyScoreSubmit === 'function') {
      window.FuzzyScoreSubmit('tank-battle', score, duration);
    }

    // Show game over screen after brief delay
    setTimeout(function() {
      drawGameOver();
    }, 500);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('GAME OVER', gameWidth / 2, gameHeight / 2 - 60);

    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText('Score: ' + score, gameWidth / 2, gameHeight / 2 - 10);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '18px monospace';
    ctx.fillText('Best: ' + bestScore, gameWidth / 2, gameHeight / 2 + 25);

    ctx.fillStyle = '#22c55e';
    ctx.font = '16px monospace';
    ctx.fillText('Wave Reached: ' + wave, gameWidth / 2, gameHeight / 2 + 55);

    ctx.fillStyle = '#a3a3a3';
    ctx.font = '14px monospace';
    ctx.fillText('Press ENTER or Tap to Restart', gameWidth / 2, gameHeight / 2 + 90);
  }

  // === MAIN GAME LOOP ===
  function gameLoop(timestamp) {
    if (!running) return;

    var now = Date.now();
    var dt = 0.016; // ~60fps

    // Update player
    updatePlayer(now);

    // Update enemies
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (!e.alive) {
        enemies.splice(i, 1);
        continue;
      }
      e.update(dt, now);
      updateEnemy(e, now);
    }

    // Update bullets
    updateBullets(now);

    // Check powerup pickups
    checkPowerups();

    // Update particles
    updateParticles(dt);

    // Spawn powerups periodically
    if (now - lastPowerupSpawn > POWERUP_SPAWN_INTERVAL) {
      spawnPowerup();
      lastPowerupSpawn = now;
    }

    // Remove dead powerups
    powerups = powerups.filter(function(p) { return p.alive; });

    // Next wave check
    if (enemies.length === 0 && !gameOver) {
      nextWave();
    }

    // === DRAW ===
    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (var c = 0; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE_SIZE, 0);
      ctx.lineTo(c * TILE_SIZE, gameHeight);
      ctx.stroke();
    }
    for (var r = 0; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(gameWidth, r * TILE_SIZE);
      ctx.stroke();
    }

    drawTerrain();
    drawPowerups();

    // Draw enemies
    enemies.forEach(function(e) { if (e.alive) e.draw(); });

    // Draw player
    if (player && player.alive) player.draw();

    drawBullets();
    drawParticles();
    drawHUD();

    animFrame = requestAnimationFrame(gameLoop);
  }

  // === RESIZE ===
  function resizeCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    var container = canvas.parentElement;
    if (container) {
      gameWidth = container.clientWidth;
      gameHeight = container.clientHeight;
    } else {
      gameWidth = window.innerWidth;
      gameHeight = window.innerHeight - 60;
    }
    canvas.width = gameWidth;
    canvas.height = gameHeight;
    cols = Math.floor(gameWidth / TILE_SIZE);
    rows = Math.floor(gameHeight / TILE_SIZE);
  }

  // === INPUT HANDLERS ===
  function onKeyDown(e) {
    keys[e.key.toLowerCase()] = true;

    // Restart on Enter if game over
    if (gameOver && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      initGame();
    }
  }

  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  function onTouchStart(e) {
    e.preventDefault();
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      var t = touches[i];
      if (t.clientX < gameWidth / 2) {
        // Left side - joystick
        touchJoystick.active = true;
        touchJoystick.startX = t.clientX;
        touchJoystick.startY = t.clientY;
        touchJoystick.id = t.identifier;
      } else {
        // Right side - fire
        touchFire = true;
      }
    }

    if (gameOver) {
      initGame();
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      var t = touches[i];
      if (touchJoystick.active && t.identifier === touchJoystick.id) {
        var dx = t.clientX - touchJoystick.startX;
        var dy = t.clientY - touchJoystick.startY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 50;
        if (dist > maxDist) {
          dx = dx / dist * maxDist;
          dy = dy / dist * maxDist;
          dist = maxDist;
        }
        if (dist > 10) {
          touchJoystick.dx = dx / maxDist;
          touchJoystick.dy = dy / maxDist;
        } else {
          touchJoystick.dx = 0;
          touchJoystick.dy = 0;
        }
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      var t = touches[i];
      if (touchJoystick.active && t.identifier === touchJoystick.id) {
        touchJoystick.active = false;
        touchJoystick.dx = 0;
        touchJoystick.dy = 0;
      }
      if (t.clientX >= gameWidth / 2) {
        touchFire = false;
      }
    }
  }

  // === INITIALIZATION ===
  function setup() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      console.error('[TankBattle] Canvas element #game-canvas not found');
      return;
    }
    ctx = canvas.getContext('2d');

    resizeCanvas();

    // Event listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('resize', function() {
      resizeCanvas();
      if (running) {
        cols = Math.floor(gameWidth / TILE_SIZE);
        rows = Math.floor(gameHeight / TILE_SIZE);
      }
    });
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });

    // Draw start screen
    drawStartScreen();
  }

  function drawStartScreen() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold 44px monospace';
    ctx.fillText('TANK BATTLE', gameWidth / 2, gameHeight / 2 - 80);

    // Subtitle
    ctx.fillStyle = '#a3a3a3';
    ctx.font = '16px monospace';
    ctx.fillText('Destroy enemy tanks. Survive the waves.', gameWidth / 2, gameHeight / 2 - 40);

    // Controls
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '14px monospace';
    var startY = gameHeight / 2;
    ctx.fillText('WASD / Arrows — Move', gameWidth / 2, startY);
    ctx.fillText('SPACE / ENTER — Shoot', gameWidth / 2, startY + 25);
    ctx.fillText('Touch: Left joystick + Right tap', gameWidth / 2, startY + 50);

    // Best score
    if (bestScore > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px monospace';
      ctx.fillText('Best Score: ' + bestScore, gameWidth / 2, startY + 90);
    }

    // Start prompt
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold 18px monospace';
    var blink = Math.sin(Date.now() * 0.004) > 0;
    if (blink) {
      ctx.fillText('Press ENTER or Tap to Start', gameWidth / 2, startY + 130);
    }

    requestAnimationFrame(function() {
      if (!running && !gameOver) drawStartScreen();
    });
  }

  // === START ON ENTER ===
  function startListener(e) {
    if (!running && !gameOver && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      window.removeEventListener('keydown', startListener);
      initGame();
    }
  }

  // Touch start from start screen
  function startTouchListener(e) {
    if (!running && !gameOver) {
      e.preventDefault();
      canvas.removeEventListener('touchstart', startTouchListener);
      initGame();
    }
  }

  // === BOOTSTRAP ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setup();
      window.addEventListener('keydown', startListener);
      canvas.addEventListener('touchstart', startTouchListener, { passive: false });
    });
  } else {
    setup();
    window.addEventListener('keydown', startListener);
    canvas.addEventListener('touchstart', startTouchListener, { passive: false });
  }

  // Expose for external control
  window.TankBattle = {
    restart: initGame,
    pause: function() { paused = !paused; },
    getState: function() {
      return { score: score, lives: lives, wave: wave, gameOver: gameOver };
    }
  };

})();
