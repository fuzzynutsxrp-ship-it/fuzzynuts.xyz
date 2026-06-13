(function() {
  'use strict';

  // ── Canvas & Context ──────────────────────────────────────────────
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('score-display');

  // ── Constants ─────────────────────────────────────────────────────
  const BG_COLOR = '#0a0614';
  const PLAYER_COLOR = '#06b6d4';
  const COIN_COLOR = '#facc15';
  const MAGNET_COLOR = '#a855f7';
  const SHIELD_COLOR = '#22c55e';
  const DOUBLE_SCORE_COLOR = '#f97316';

  const LANE_COUNT = 3;
  const LANE_WIDTH_RATIO = 0.28; // fraction of canvas width per lane
  const PLAYER_W_RATIO = 0.08;
  const PLAYER_H_RATIO = 0.14;
  const SLIDE_H_RATIO = 0.06;

  const JUMP_DURATION = 600;   // ms
  const JUMP_HEIGHT = 160;     // px at reference height
  const SLIDE_DURATION = 500;  // ms

  const OBSTACLE_TYPES = ['train', 'barrier', 'sign'];
  const POWERUP_TYPES = ['magnet', 'shield', 'double'];

  const MAGNET_DURATION = 5000;
  const SHIELD_DURATION = 8000;
  const DOUBLE_DURATION = 6000;

  // ── State ─────────────────────────────────────────────────────────
  let W, H, laneW, laneXs, playerW, playerH, slideH;
  let state = 'start'; // start | playing | over
  let score = 0;
  let coins = 0;
  let bestScore = parseInt(localStorage.getItem('subway-runner_best') || '0', 10);
  let speed = 4;
  let elapsed = 0;
  let startTime = 0;
  let animId = null;

  // Player
  let playerLane = 1; // 0=left,1=center,2=right
  let playerTargetX = 0;
  let playerX = 0;
  let playerBaseY = 0;
  let playerY = 0;
  let isJumping = false;
  let jumpStart = 0;
  let isSliding = false;
  let slideStart = 0;

  // Entities
  let obstacles = [];
  let coinEntities = [];
  let powerups = [];

  // Power-up timers
  let magnetTimer = 0;
  let shieldTimer = 0;
  let doubleTimer = 0;

  // Parallax
  let bgOffset = 0;
  let buildings = [];
  let stars = [];

  // Spawn timers
  let obstacleTimer = 0;
  let coinTimer = 0;
  let powerupTimer = 0;

  // Touch
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  // ── Resize ────────────────────────────────────────────────────────
  function resize() {
    const parent = canvas.parentElement || document.body;
    W = parent.clientWidth || window.innerWidth;
    H = parent.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    laneW = W * LANE_WIDTH_RATIO;
    const totalLaneW = laneW * LANE_COUNT;
    const startX = (W - totalLaneW) / 2;
    laneXs = [startX, startX + laneW, startX + laneW * 2];

    playerW = W * PLAYER_W_RATIO;
    playerH = H * PLAYER_H_RATIO;
    slideH = H * SLIDE_H_RATIO;
    playerBaseY = H * 0.7;

    // Rebuild parallax buildings
    generateBuildings();
  }

  function generateBuildings() {
    buildings = [];
    let x = 0;
    while (x < W * 2) {
      const w = 30 + Math.random() * 60;
      const h = 80 + Math.random() * 180;
      const shade = 15 + Math.random() * 20;
      buildings.push({ x, w, h, color: `rgb(${shade},${shade},${shade + 10})` });
      x += w + 5 + Math.random() * 15;
    }
    stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({ x: Math.random() * W * 2, y: Math.random() * H * 0.4, r: 0.5 + Math.random() * 1.5, alpha: 0.3 + Math.random() * 0.7 });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function currentSpeed() {
    return speed + elapsed * 0.00015; // gradually increase
  }

  function jumpOffset() {
    if (!isJumping) return 0;
    const t = (performance.now() - jumpStart) / JUMP_DURATION;
    if (t >= 1) { isJumping = false; return 0; }
    // parabolic: 4h*t*(1-t)
    return -JUMP_HEIGHT * (H / 800) * 4 * t * (1 - t);
  }

  function slideActive() {
    if (!isSliding) return false;
    if (performance.now() - slideStart >= SLIDE_DURATION) { isSliding = false; return false; }
    return true;
  }

  function laneCenter(lane) {
    return laneXs[lane] + laneW / 2;
  }

  // ── Spawning ──────────────────────────────────────────────────────
  function spawnObstacle() {
    const type = OBSTACLE_TYPES[randInt(0, OBSTACLE_TYPES.length - 1)];
    const lane = randInt(0, 2);
    let w, h, color;
    if (type === 'train') {
      w = laneW * 0.7;
      h = H * 0.28;
      color = '#dc2626';
    } else if (type === 'barrier') {
      w = laneW * 0.65;
      h = H * 0.08;
      color = '#f97316';
    } else { // sign
      w = laneW * 0.6;
      h = H * 0.06;
      color = '#eab308';
    }
    obstacles.push({ type, lane, y: -h, w, h, color });
  }

  function spawnCoinRow() {
    const lane = randInt(0, 2);
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      coinEntities.push({ lane, y: -(i * 40), r: Math.min(laneW * 0.08, 14) });
    }
  }

  function spawnPowerup() {
    const type = POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];
    const lane = randInt(0, 2);
    let color;
    if (type === 'magnet') color = MAGNET_COLOR;
    else if (type === 'shield') color = SHIELD_COLOR;
    else color = DOUBLE_SCORE_COLOR;
    powerups.push({ type, lane, y: -30, r: Math.min(laneW * 0.1, 18), color });
  }

  // ── Collision ─────────────────────────────────────────────────────
  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function checkCollisions() {
    const px = playerX - playerW / 2;
    const py = playerY;
    const pw = playerW;
    const ph = slideActive() ? slideH : playerH;

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      const ox = laneCenter(o.lane) - o.w / 2;
      const oy = o.y;

      if (!rectOverlap(px, py, pw, ph, ox, oy, o.w, o.h)) continue;

      // Sign: can slide under (sign is at top, player must be sliding)
      if (o.type === 'sign') {
        if (slideActive()) continue; // sliding under
        // if player normal height hits sign top part
        if (py + ph < oy + o.h * 0.3) continue;
      }

      // Barrier: can jump over
      if (o.type === 'barrier') {
        if (isJumping && py + ph < oy + o.h * 0.5) continue;
      }

      // Hit!
      if (shieldTimer > 0) {
        shieldTimer = 0;
        obstacles.splice(i, 1);
        continue;
      }
      gameOver();
      return;
    }

    // Coins
    const magnetRange = magnetTimer > 0 ? laneW * 2.5 : 0;
    for (let i = coinEntities.length - 1; i >= 0; i--) {
      const c = coinEntities[i];
      const cx = laneCenter(c.lane);
      // Magnet attraction
      if (magnetTimer > 0) {
        const dist = Math.abs(cx - (playerX));
        if (dist < magnetRange) {
          c.lane = playerLane;
          // also move Y towards player
          if (c.y < playerY - 20) c.y += 3;
        }
      }
      const ccx = laneCenter(c.lane);
      const coinRect = { x: ccx - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 };
      if (rectOverlap(px, py, pw, ph, coinRect.x, coinRect.y, coinRect.w, coinRect.h)) {
        coins += 1;
        score += 10;
        coinEntities.splice(i, 1);
      }
    }

    // Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      const ppx = laneCenter(p.lane);
      const pr = { x: ppx - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
      if (rectOverlap(px, py, pw, ph, pr.x, pr.y, pr.w, pr.h)) {
        if (p.type === 'magnet') magnetTimer = MAGNET_DURATION;
        else if (p.type === 'shield') shieldTimer = SHIELD_DURATION;
        else doubleTimer = DOUBLE_DURATION;
        powerups.splice(i, 1);
      }
    }
  }

  // ── Update ────────────────────────────────────────────────────────
  function update(dt) {
    const spd = currentSpeed();

    // Distance score
    const multiplier = doubleTimer > 0 ? 2 : 1;
    score += spd * dt * 0.02 * multiplier;

    // Timers
    elapsed += dt;
    if (magnetTimer > 0) magnetTimer -= dt;
    if (shieldTimer > 0) shieldTimer -= dt;
    if (doubleTimer > 0) doubleTimer -= dt;

    // Player position (smooth lane transition)
    const targetX = laneCenter(playerLane);
    playerX += (targetX - playerX) * 0.18;
    playerY = playerBaseY + jumpOffset();

    // Parallax
    bgOffset += spd * dt * 0.03;

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].y += spd * dt * 0.25;
      if (obstacles[i].y > H + 50) obstacles.splice(i, 1);
    }

    // Move coins
    for (let i = coinEntities.length - 1; i >= 0; i--) {
      coinEntities[i].y += spd * dt * 0.25;
      if (coinEntities[i].y > H + 50) coinEntities.splice(i, 1);
    }

    // Move powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      powerups[i].y += spd * dt * 0.25;
      if (powerups[i].y > H + 50) powerups.splice(i, 1);
    }

    // Spawn
    obstacleTimer -= dt;
    if (obstacleTimer <= 0) {
      spawnObstacle();
      // Sometimes spawn in two lanes
      if (Math.random() < 0.3 + elapsed * 0.00003) spawnObstacle();
      obstacleTimer = rand(800, 1600) - Math.min(elapsed * 0.05, 400);
    }

    coinTimer -= dt;
    if (coinTimer <= 0) {
      spawnCoinRow();
      coinTimer = rand(1200, 2500);
    }

    powerupTimer -= dt;
    if (powerupTimer <= 0) {
      spawnPowerup();
      powerupTimer = rand(8000, 15000);
    }

    // Collision
    checkCollisions();

    // HUD
    window.__gameScore = Math.floor(score);
    if (scoreDisplay) scoreDisplay.textContent = Math.floor(score);
  }

  // ── Draw ──────────────────────────────────────────────────────────
  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0614');
    grad.addColorStop(0.6, '#110d1f');
    grad.addColorStop(1, '#1a1030');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.save();
    for (const s of stars) {
      const sx = ((s.x - bgOffset * 0.2) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
      ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(performance.now() * 0.001 + s.x));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Buildings (parallax back layer)
    ctx.save();
    for (const b of buildings) {
      const bx = ((b.x - bgOffset * 0.5) % (W * 2) + W * 2) % (W * 2) - W * 0.3;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, H - b.h, b.w, b.h);
      // windows
      ctx.fillStyle = 'rgba(6,182,212,0.08)';
      for (let wy = H - b.h + 10; wy < H - 10; wy += 18) {
        for (let wx = bx + 5; wx < bx + b.w - 5; wx += 14) {
          if (Math.random() > 0.4) {
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
    }
    ctx.restore();

    // Ground
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    // Ground lines (scrolling)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    const lineSpacing = 40;
    const scrollY = (bgOffset * 2) % lineSpacing;
    for (let y = H * 0.82 + scrollY; y < H; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Lane markers
    ctx.strokeStyle = 'rgba(6,182,212,0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    for (let i = 0; i <= LANE_COUNT; i++) {
      const lx = laneXs[0] + i * laneW;
      ctx.beginPath();
      ctx.moveTo(lx, H * 0.1);
      ctx.lineTo(lx, H * 0.82);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawObstacles() {
    for (const o of obstacles) {
      const ox = laneCenter(o.lane) - o.w / 2;

      if (o.type === 'train') {
        // Train body
        const tGrad = ctx.createLinearGradient(ox, o.y, ox + o.w, o.y);
        tGrad.addColorStop(0, '#991b1b');
        tGrad.addColorStop(0.5, o.color);
        tGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = tGrad;
        ctx.fillRect(ox, o.y, o.w, o.h);
        // Windows
        ctx.fillStyle = 'rgba(255,200,50,0.6)';
        const winH = o.h * 0.12;
        const winY = o.y + o.h * 0.15;
        for (let wx = ox + 8; wx < ox + o.w - 8; wx += o.w * 0.25) {
          ctx.fillRect(wx, winY, o.w * 0.15, winH);
        }
        // Stripe
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(ox, o.y + o.h * 0.55, o.w, 4);
      } else if (o.type === 'barrier') {
        ctx.fillStyle = o.color;
        ctx.fillRect(ox, o.y, o.w, o.h);
        // Stripes
        ctx.fillStyle = '#000';
        const stripeW = o.w * 0.12;
        for (let sx = ox; sx < ox + o.w; sx += stripeW * 2) {
          ctx.fillRect(sx, o.y, stripeW, o.h);
        }
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, o.y, o.w, o.h);
      } else { // sign
        // Post
        ctx.fillStyle = '#71717a';
        const postW = 4;
        ctx.fillRect(ox + o.w / 2 - postW / 2, o.y + o.h, postW, H * 0.15);
        // Sign board
        ctx.fillStyle = o.color;
        ctx.fillRect(ox, o.y, o.w, o.h);
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.floor(o.h * 0.5)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('⚠', ox + o.w / 2, o.y + o.h * 0.7);
      }
    }
  }

  function drawCoins() {
    const now = performance.now();
    for (const c of coinEntities) {
      const cx = laneCenter(c.lane);
      const bob = Math.sin(now * 0.004 + c.y * 0.1) * 3;
      // Glow
      ctx.save();
      ctx.shadowColor = COIN_COLOR;
      ctx.shadowBlur = 10;
      ctx.fillStyle = COIN_COLOR;
      ctx.beginPath();
      ctx.arc(cx, c.y + bob, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Inner
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx, c.y + bob, c.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COIN_COLOR;
      ctx.font = `bold ${Math.floor(c.r)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cx, c.y + bob + 1);
    }
  }

  function drawPowerups() {
    const now = performance.now();
    for (const p of powerups) {
      const px = laneCenter(p.lane);
      const bob = Math.sin(now * 0.003 + p.y * 0.05) * 4;
      const pulse = 1 + Math.sin(now * 0.005) * 0.15;

      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, p.y + bob, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(p.r)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let icon = '?';
      if (p.type === 'magnet') icon = 'M';
      else if (p.type === 'shield') icon = 'S';
      else icon = '2x';
      ctx.fillText(icon, px, p.y + bob + 1);
    }
  }

  function drawPlayer() {
    const px = playerX;
    const py = playerY;
    const h = slideActive() ? slideH : playerH;
    const w = playerW;

    // Shield aura
    if (shieldTimer > 0) {
      ctx.save();
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(performance.now() * 0.006);
      ctx.beginPath();
      ctx.arc(px, py + h / 2, Math.max(w, h) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Magnet aura
    if (magnetTimer > 0) {
      ctx.save();
      ctx.strokeStyle = MAGNET_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() * 0.008);
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(px, py + h / 2, laneW * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Double score indicator
    if (doubleTimer > 0) {
      ctx.save();
      ctx.fillStyle = DOUBLE_SCORE_COLOR;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() * 0.007);
      ctx.font = `bold ${Math.floor(h * 0.3)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('2x', px, py - 10);
      ctx.restore();
    }

    // Player body (rounded rect)
    const bx = px - w / 2;
    ctx.save();
    ctx.shadowColor = PLAYER_COLOR;
    ctx.shadowBlur = 12;
    const pGrad = ctx.createLinearGradient(bx, py, bx + w, py + h);
    pGrad.addColorStop(0, '#06b6d4');
    pGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = pGrad;
    roundRect(ctx, bx, py, w, h, 6);
    ctx.fill();
    ctx.restore();

    // Head (if not sliding)
    if (!slideActive()) {
      const headR = w * 0.3;
      ctx.fillStyle = PLAYER_COLOR;
      ctx.beginPath();
      ctx.arc(px, py - headR * 0.3, headR, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(px - headR * 0.6, py - headR * 0.4, headR * 1.2, headR * 0.35);
    }

    // Trail particles (simple)
    if (isJumping) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(6,182,212,${0.3 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(px + rand(-w * 0.3, w * 0.3), py + h + i * 8, 2 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

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

  function drawStartScreen() {
    drawBackground();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = `bold ${Math.floor(H * 0.06)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SUBWAY RUNNER', W / 2, H * 0.3);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${Math.floor(H * 0.025)}px monospace`;
    ctx.fillText('Arrow Keys / WASD / Swipe to move', W / 2, H * 0.42);
    ctx.fillText('↑ = Jump  |  ↓ = Slide', W / 2, H * 0.47);
    ctx.fillText('← → = Switch Lanes', W / 2, H * 0.52);

    ctx.fillStyle = COIN_COLOR;
    ctx.fillText('$ = Coins (+10)', W / 2, H * 0.59);
    ctx.fillStyle = MAGNET_COLOR;
    ctx.fillText('M = Magnet', W / 2, H * 0.63);
    ctx.fillStyle = SHIELD_COLOR;
    ctx.fillText('S = Shield', W / 2, H * 0.67);
    ctx.fillStyle = DOUBLE_SCORE_COLOR;
    ctx.fillText('2x = Double Score', W / 2, H * 0.71);

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(H * 0.035)}px monospace`;
    ctx.fillText('TAP / PRESS SPACE TO START', W / 2, H * 0.82);
    ctx.globalAlpha = 1;

    if (bestScore > 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.floor(H * 0.022)}px monospace`;
      ctx.fillText(`Best: ${bestScore}`, W / 2, H * 0.88);
    }
  }

  function drawGameOverScreen() {
    drawBackground();
    // Draw frozen entities
    drawObstacles();
    drawCoins();
    drawPowerups();

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ef4444';
    ctx.font = `bold ${Math.floor(H * 0.06)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H * 0.3);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${Math.floor(H * 0.03)}px monospace`;
    ctx.fillText(`Score: ${Math.floor(score)}`, W / 2, H * 0.42);
    ctx.fillText(`Coins: ${coins}`, W / 2, H * 0.47);
    ctx.fillText(`Distance: ${Math.floor(elapsed / 100)}m`, W / 2, H * 0.52);

    if (Math.floor(score) >= bestScore) {
      ctx.fillStyle = COIN_COLOR;
      ctx.font = `bold ${Math.floor(H * 0.028)}px monospace`;
      ctx.fillText('★ NEW BEST! ★', W / 2, H * 0.59);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.floor(H * 0.022)}px monospace`;
      ctx.fillText(`Best: ${bestScore}`, W / 2, H * 0.59);
    }

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(H * 0.03)}px monospace`;
    ctx.fillText('TAP / PRESS SPACE TO RESTART', W / 2, H * 0.72);
    ctx.globalAlpha = 1;
  }

  // ── Game Loop ─────────────────────────────────────────────────────
  let lastTime = 0;

  function loop(ts) {
    animId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 50); // cap dt
    lastTime = ts;

    if (state === 'start') {
      drawStartScreen();
    } else if (state === 'playing') {
      update(dt);
      drawBackground();
      drawCoins();
      drawPowerups();
      drawObstacles();
      drawPlayer();
    } else if (state === 'over') {
      drawGameOverScreen();
    }
  }

  // ── Game Control ──────────────────────────────────────────────────
  function startGame() {
    state = 'playing';
    score = 0;
    coins = 0;
    speed = 4;
    elapsed = 0;
    startTime = performance.now();
    playerLane = 1;
    playerX = laneCenter(1);
    playerY = playerBaseY;
    isJumping = false;
    isSliding = false;
    obstacles = [];
    coinEntities = [];
    powerups = [];
    magnetTimer = 0;
    shieldTimer = 0;
    doubleTimer = 0;
    obstacleTimer = 1000;
    coinTimer = 500;
    powerupTimer = 5000;
    window.__gameScore = 0;
    if (scoreDisplay) scoreDisplay.textContent = '0';
  }

  function gameOver() {
    state = 'over';
    const finalScore = Math.floor(score);
    window.__gameScore = finalScore;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      localStorage.setItem('subway-runner_best', String(bestScore));
    }
    const duration = Math.floor((performance.now() - startTime) / 1000);
    if (typeof FuzzyScoreSubmit === 'function') {
      try { FuzzyScoreSubmit('subway-runner', finalScore, duration); } catch(e) {}
    }
  }

  // ── Input ─────────────────────────────────────────────────────────
  function handleAction(action) {
    if (state === 'start') {
      startGame();
      return;
    }
    if (state === 'over') {
      startGame();
      return;
    }
    if (state !== 'playing') return;

    if (action === 'left') {
      playerLane = Math.max(0, playerLane - 1);
    } else if (action === 'right') {
      playerLane = Math.min(LANE_COUNT - 1, playerLane + 1);
    } else if (action === 'up') {
      if (!isJumping && !isSliding) {
        isJumping = true;
        jumpStart = performance.now();
      }
    } else if (action === 'down') {
      if (!isSliding && !isJumping) {
        isSliding = true;
        slideStart = performance.now();
      }
    }
  }

  document.addEventListener('keydown', function(e) {
    const key = e.key;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') { e.preventDefault(); handleAction('left'); }
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') { e.preventDefault(); handleAction('right'); }
    else if (key === 'ArrowUp' || key === 'w' || key === 'W') { e.preventDefault(); handleAction('up'); }
    else if (key === 'ArrowDown' || key === 's' || key === 'S') { e.preventDefault(); handleAction('down'); }
    else if (key === ' ' || key === 'Enter') { e.preventDefault(); handleAction('start'); }
  });

  // Touch / swipe
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
  }, { passive: false });

  canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (state !== 'playing') {
      handleAction('start');
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const minSwipe = 30;

    if (adx < minSwipe && ady < minSwipe) {
      // Tap — treat as start/restart
      return;
    }

    if (adx > ady) {
      handleAction(dx < 0 ? 'left' : 'right');
    } else {
      handleAction(dy < 0 ? 'up' : 'down');
    }
  }, { passive: false });

  // Mouse click for desktop start
  canvas.addEventListener('click', function() {
    if (state !== 'playing') handleAction('start');
  });

  // ── Init ──────────────────────────────────────────────────────────
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(loop);

})();
