(function () {
  'use strict';

  const BG = '#0a0614';
  const P1_COLOR = '#ef4444';
  const P2_COLOR = '#3b82f6';
  const WALL_COLOR = '#2a1f3d';
  const BUSH_COLOR = '#1a3a1a';
  const FLAG_W = 10, FLAG_H = 20;
  const PLAYER_R = 14;
  const BASE_W = 60, BASE_H = 60;
  const CAPTURES_TO_WIN = 5;
  const FLAG_CARRIER_SPEED_MULT = 0.78;
  const BOOST_DURATION = 5000;
  const BOOST_MULT = 1.5;
  const INVIS_DURATION = 4000;
  const SHIELD_DURATION = 4000;
  const POWERUP_SPAWN_INTERVAL = 12000;
  const TAG_RANGE = 30;

  let canvas, ctx, W, H;
  let keys = {};
  let gameState = 'start'; // start, playing, paused, gameover
  let startTime = 0;
  let gameTime = 0;
  let p1Captures = 0, p2Captures = 0;
  let bestScore = parseInt(localStorage.getItem('capture-flag_best') || '0', 10);
  let animFrame;
  let lastPowerupSpawn = 0;

  // Touch state
  let touchActive = false;
  let p1Touch = { active: false, dx: 0, dy: 0, originX: 0, originY: 0, id: null };
  let p2Touch = { active: false, dx: 0, dy: 0, originX: 0, originY: 0, id: null };

  // Map objects
  let walls = [];
  let bushes = [];
  let powerups = [];
  let p1Base, p2Base;
  let p1Flag, p2Flag;
  let players = [];

  function initCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    const parent = canvas.parentElement || document.body;
    W = canvas.width = parent.clientWidth || 960;
    H = canvas.height = parent.clientHeight || 600;
  }

  function generateMap() {
    walls = [];
    bushes = [];
    // Center cross walls
    walls.push({ x: W / 2 - 5, y: H / 2 - 80, w: 10, h: 60 });
    walls.push({ x: W / 2 - 5, y: H / 2 + 20, w: 10, h: 60 });
    // Side walls
    walls.push({ x: W * 0.25, y: H * 0.2, w: 80, h: 10 });
    walls.push({ x: W * 0.75 - 80, y: H * 0.2, w: 80, h: 10 });
    walls.push({ x: W * 0.25, y: H * 0.75, w: 80, h: 10 });
    walls.push({ x: W * 0.75 - 80, y: H * 0.75, w: 80, h: 10 });
    // Corners
    walls.push({ x: W * 0.15, y: H * 0.45, w: 60, h: 10 });
    walls.push({ x: W * 0.85 - 60, y: H * 0.45, w: 60, h: 10 });
    // Extra barriers
    walls.push({ x: W * 0.35, y: H * 0.1, w: 10, h: 50 });
    walls.push({ x: W * 0.65, y: H * 0.85, w: 10, h: 50 });

    bushes = [
      { x: W * 0.2, y: H * 0.3, w: 50, h: 50 },
      { x: W * 0.75, y: H * 0.6, w: 50, h: 50 },
      { x: W * 0.45, y: H * 0.15, w: 40, h: 40 },
      { x: W * 0.5, y: H * 0.75, w: 40, h: 40 },
      { x: W * 0.1, y: H * 0.6, w: 45, h: 45 },
      { x: W * 0.85, y: H * 0.3, w: 45, h: 45 },
    ];

    p1Base = { x: 30, y: H / 2 - BASE_H / 2, w: BASE_W, h: BASE_H };
    p2Base = { x: W - 30 - BASE_W, y: H / 2 - BASE_H / 2, w: BASE_W, h: BASE_H };

    p1Flag = { x: p1Base.x + BASE_W / 2 - FLAG_W / 2, y: p1Base.y + BASE_H / 2 - FLAG_H / 2, atBase: true, carrier: null, dropped: false };
    p2Flag = { x: p2Base.x + BASE_W / 2 - FLAG_W / 2, y: p2Base.y + BASE_H / 2 - FLAG_H / 2, atBase: true, carrier: null, dropped: false };
  }

  function createPlayers() {
    players = [
      {
        id: 1, color: P1_COLOR, x: p1Base.x + BASE_W + 20, y: H / 2, vx: 0, vy: 0,
        speed: 3, hasFlag: false, flag: null,
        boost: 0, invis: 0, shield: 0, inBush: false, radius: PLAYER_R
      },
      {
        id: 2, color: P2_COLOR, x: p2Base.x - 20, y: H / 2, vx: 0, vy: 0,
        speed: 3, hasFlag: false, flag: null,
        boost: 0, invis: 0, shield: 0, inBush: false, radius: PLAYER_R
      }
    ];
  }

  function resetRound() {
    createPlayers();
    p1Flag = { x: p1Base.x + BASE_W / 2 - FLAG_W / 2, y: p1Base.y + BASE_H / 2 - FLAG_H / 2, atBase: true, carrier: null, dropped: false };
    p2Flag = { x: p2Base.x + BASE_W / 2 - FLAG_W / 2, y: p2Base.y + BASE_H / 2 - FLAG_H / 2, atBase: true, carrier: null, dropped: false };
    powerups = [];
    lastPowerupSpawn = Date.now();
    updateHUD();
  }

  function startGame() {
    p1Captures = 0;
    p2Captures = 0;
    window.__gameScore = 0;
    gameState = 'playing';
    startTime = Date.now();
    generateMap();
    resetRound();
    if (typeof window.__gameStart === 'function') window.__gameStart();
    updateHUD();
  }

  function updateHUD() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = 'P1: ' + p1Captures + '  |  P2: ' + p2Captures;
    window.__gameScore = p1Captures * 100 + p2Captures * 100;
  }

  function collidesRect(ax, ay, ar, rect) {
    const cx = Math.max(rect.x, Math.min(ax, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(ay, rect.y + rect.h));
    const dx = ax - cx, dy = ay - cy;
    return dx * dx + dy * dy < ar * ar;
  }

  function collidesWalls(x, y, r) {
    for (const w of walls) {
      if (collidesRect(x, y, r, w)) return true;
    }
    return false;
  }

  function movePlayer(p, dt) {
    let dx = 0, dy = 0;
    if (p.id === 1) {
      if (keys['w'] || keys['W']) dy = -1;
      if (keys['s'] || keys['S']) dy = 1;
      if (keys['a'] || keys['A']) dx = -1;
      if (keys['d'] || keys['D']) dx = 1;
      if (p1Touch.active) { dx = p1Touch.dx; dy = p1Touch.dy; }
    } else {
      if (keys['ArrowUp']) dy = -1;
      if (keys['ArrowDown']) dy = 1;
      if (keys['ArrowLeft']) dx = -1;
      if (keys['ArrowRight']) dx = 1;
      if (p2Touch.active) { dx = p2Touch.dx; dy = p2Touch.dy; }
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.1) {
      dx /= len; dy /= len;
    } else { dx = 0; dy = 0; }

    let spd = p.speed;
    if (p.boost > 0) spd *= BOOST_MULT;
    if (p.hasFlag) spd *= FLAG_CARRIER_SPEED_MULT;

    const nx = p.x + dx * spd * dt * 60;
    const ny = p.y + dy * spd * dt * 60;

    if (!collidesWalls(nx, p.y, p.radius) && nx > p.radius && nx < W - p.radius) p.x = nx;
    if (!collidesWalls(p.x, ny, p.radius) && ny > p.radius && ny < H - p.radius) p.y = ny;

    // Check bush
    p.inBush = false;
    for (const b of bushes) {
      if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) {
        p.inBush = true;
        break;
      }
    }
  }

  function updatePowerups(dt) {
    const now = Date.now();
    if (now - lastPowerupSpawn > POWERUP_SPAWN_INTERVAL && powerups.length < 4) {
      const types = ['speed', 'invis', 'shield'];
      const type = types[Math.floor(Math.random() * types.length)];
      let px, py, tries = 0;
      do {
        px = 80 + Math.random() * (W - 160);
        py = 80 + Math.random() * (H - 160);
        tries++;
      } while (collidesWalls(px, py, 15) && tries < 20);
      powerups.push({ x: px, y: py, type: type, r: 12 });
      lastPowerupSpawn = now;
    }

    for (const p of players) {
      if (p.boost > 0) p.boost -= dt * 1000;
      if (p.invis > 0) p.invis -= dt * 1000;
      if (p.shield > 0) p.shield -= dt * 1000;

      for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        const dx = p.x - pu.x, dy = p.y - pu.y;
        if (dx * dx + dy * dy < (p.radius + pu.r) * (p.radius + pu.r)) {
          if (pu.type === 'speed') p.boost = BOOST_DURATION;
          else if (pu.type === 'invis') p.invis = INVIS_DURATION;
          else if (pu.type === 'shield') p.shield = SHIELD_DURATION;
          powerups.splice(i, 1);
        }
      }
    }
  }

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function updateFlags() {
    for (const p of players) {
      const enemyFlag = p.id === 1 ? p2Flag : p1Flag;
      const ownFlag = p.id === 1 ? p1Flag : p2Flag;
      const ownBase = p.id === 1 ? p1Base : p2Base;
      const enemyBase = p.id === 1 ? p2Base : p1Base;

      // Pick up enemy flag
      if (!p.hasFlag && !enemyFlag.carrier) {
        const fd = { x: enemyFlag.x + FLAG_W / 2, y: enemyFlag.y + FLAG_H / 2 };
        if (dist(p, fd) < TAG_RANGE) {
          p.hasFlag = true;
          enemyFlag.carrier = p;
          enemyFlag.atBase = false;
          enemyFlag.dropped = false;
          p.flag = enemyFlag;
        }
      }

      // Carry flag with player
      if (p.hasFlag && p.flag) {
        p.flag.x = p.x - FLAG_W / 2;
        p.flag.y = p.y - FLAG_H / 2 - PLAYER_R - 5;
      }

      // Capture: return to own base with enemy flag
      if (p.hasFlag && pointInRect(p.x, p.y, ownBase)) {
        p.hasFlag = false;
        p.flag.carrier = null;
        p.flag.atBase = true;
        p.flag.x = enemyBase.x + BASE_W / 2 - FLAG_W / 2;
        p.flag.y = enemyBase.y + BASE_H / 2 - FLAG_H / 2;
        p.flag.dropped = false;
        p.flag = null;
        if (p.id === 1) p1Captures++; else p2Captures++;
        updateHUD();

        if (p1Captures >= CAPTURES_TO_WIN || p2Captures >= CAPTURES_TO_WIN) {
          endGame();
          return;
        }
        resetRound();
        return;
      }
    }

    // Tagging: if opponent touches you and you have their flag, return it
    const p1 = players[0], p2 = players[1];
    if (dist(p1, p2) < TAG_RANGE * 2) {
      // P2 tags P1 (P1 has P2's flag)
      if (p1.hasFlag && p2.shield <= 0) {
        if (!(p1.inBush && p1.invis > 0)) {
          dropFlag(p1);
        }
      }
      // P1 tags P2 (P2 has P1's flag)
      if (p2.hasFlag && p1.shield <= 0) {
        if (!(p2.inBush && p2.invis > 0)) {
          dropFlag(p2);
        }
      }
    }
  }

  function dropFlag(p) {
    if (!p.hasFlag || !p.flag) return;
    p.flag.carrier = null;
    p.flag.dropped = true;
    p.flag.atBase = false;
    p.hasFlag = false;
    p.flag = null;
  }

  function handleDropKeys() {
    // Space drops P1's flag
    if (keys[' '] && players[0].hasFlag) {
      dropFlag(players[0]);
      keys[' '] = false;
    }
    // Enter drops P2's flag
    if (keys['Enter'] && players[1].hasFlag) {
      dropFlag(players[1]);
      keys['Enter'] = false;
    }
  }

  function endGame() {
    gameTime = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = p1Captures * 100 + p2Captures * 100;
    window.__gameScore = finalScore;
    if (finalScore > bestScore) {
      bestScore = finalScore;
      localStorage.setItem('capture-flag_best', bestScore.toString());
    }
    gameState = 'gameover';
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('capture-flag', finalScore, gameTime);
    }
    if (typeof window.__gameOver === 'function') {
      window.__gameOver({ score: finalScore, duration: gameTime, p1Captures, p2Captures, winner: p1Captures > p2Captures ? 1 : 2 });
    }
  }

  // ── Drawing ──
  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    if (gameState === 'start') { drawStartScreen(); return; }
    if (gameState === 'gameover') { drawGameOver(); return; }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Bases
    drawBase(p1Base, P1_COLOR, 'P1');
    drawBase(p2Base, P2_COLOR, 'P2');

    // Walls
    ctx.fillStyle = WALL_COLOR;
    for (const w of walls) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = '#3d2f5a';
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }

    // Bushes
    for (const b of bushes) {
      ctx.fillStyle = BUSH_COLOR;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
      // bush pattern
      ctx.fillStyle = '#2a5a2a';
      for (let i = 0; i < 5; i++) {
        const bx = b.x + 5 + Math.random() * (b.w - 10);
        const by = b.y + 5 + Math.random() * (b.h - 10);
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Powerups
    for (const pu of powerups) {
      drawPowerup(pu);
    }

    // Flags
    drawFlag(p1Flag, P1_COLOR);
    drawFlag(p2Flag, P2_COLOR);

    // Players
    for (const p of players) {
      drawPlayer(p);
    }

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P1: ' + p1Captures + ' caps', W * 0.25, 25);
    ctx.fillText('P2: ' + p2Captures + ' caps', W * 0.75, 25);
    ctx.fillText('First to ' + CAPTURES_TO_WIN + ' captures wins', W / 2, 25);

    // Best score
    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Best: ' + bestScore, W / 2, H - 10);
  }

  function drawBase(b, color, label) {
    ctx.fillStyle = color + '22';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = 1;
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 5);
  }

  function drawFlag(f, color) {
    ctx.fillStyle = color;
    // Pole
    ctx.fillRect(f.x + FLAG_W / 2 - 1, f.y, 2, FLAG_H);
    // Flag triangle
    ctx.beginPath();
    ctx.moveTo(f.x + FLAG_W / 2 + 1, f.y);
    ctx.lineTo(f.x + FLAG_W, f.y + 8);
    ctx.lineTo(f.x + FLAG_W / 2 + 1, f.y + 12);
    ctx.closePath();
    ctx.fill();
    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawPowerup(pu) {
    const colors = { speed: '#facc15', invis: '#a78bfa', shield: '#34d399' };
    const c = colors[pu.type] || '#fff';
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 300) * 0.3;
    ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = { speed: 'S', invis: 'I', shield: 'D' };
    ctx.fillText(labels[pu.type] || '?', pu.x, pu.y);
    ctx.textBaseline = 'alphabetic';
  }

  function drawPlayer(p) {
    const visible = p.invis <= 0 || p.inBush === false;
    ctx.globalAlpha = visible ? 1 : 0.25;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + p.radius + 2, p.radius * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Body
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();

    // Shield glow
    if (p.shield > 0) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Speed glow
    if (p.boost > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Player label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P' + p.id, p.x, p.y);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  function drawStartScreen() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = P1_COLOR;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAPTURE', W / 2, H / 2 - 60);
    ctx.fillStyle = P2_COLOR;
    ctx.fillText('THE FLAG', W / 2, H / 2 - 10);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('P1: WASD + Space | P2: Arrows + Enter', W / 2, H / 2 + 40);
    ctx.fillText('Grab enemy flag, return to your base!', W / 2, H / 2 + 65);
    ctx.fillText('First to ' + CAPTURES_TO_WIN + ' captures wins', W / 2, H / 2 + 90);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('Press SPACE or TAP to start', W / 2, H / 2 + 140);

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Best: ' + bestScore, W / 2, H - 20);
  }

  function drawGameOver() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const winner = p1Captures > p2Captures ? 1 : 2;
    const wColor = winner === 1 ? P1_COLOR : P2_COLOR;

    ctx.fillStyle = wColor;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PLAYER ' + winner + ' WINS!', W / 2, H / 2 - 50);

    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText('P1: ' + p1Captures + '  |  P2: ' + p2Captures, W / 2, H / 2);

    ctx.fillStyle = '#aaa';
    ctx.font = '16px monospace';
    ctx.fillText('Score: ' + window.__gameScore + '  |  Time: ' + gameTime + 's', W / 2, H / 2 + 35);
    ctx.fillText('Best: ' + bestScore, W / 2, H / 2 + 60);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('Press SPACE or TAP to restart', W / 2, H / 2 + 110);
  }

  // ── Game Loop ──
  let lastTime = 0;

  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (gameState === 'playing') {
      for (const p of players) movePlayer(p, dt);
      handleDropKeys();
      updateFlags();
      updatePowerups(dt);
    }

    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // ── Input ──
  function _onKeyDown(e) {
    keys[e.key] = true;
    if (gameState === 'start' && (e.key === ' ')) {
      e.preventDefault();
      startGame();
    } else if (gameState === 'gameover' && e.key === ' ') {
      e.preventDefault();
      startGame();
    }
  }
  function _onKeyUp(e) { keys[e.key] = false; }
  function _onClick() {
    if (gameState === 'start' || gameState === 'gameover') startGame();
  }

  function setupInput() {
    window.addEventListener('keydown', _onKeyDown);
    window.addEventListener('keyup', _onKeyUp);

    // Touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Click for start/restart
    canvas.addEventListener('click', _onClick);
  }

  // Cleanup
  window.addEventListener('game-cleanup', function () {
    if (animFrame) cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown', _onKeyDown);
    window.removeEventListener('keyup', _onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('touchcancel', handleTouchEnd);
    canvas.removeEventListener('click', _onClick);
  });

  function getTouchPos(touch) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  function handleTouchStart(e) {
    e.preventDefault();
    if (gameState === 'start' || gameState === 'gameover') { startGame(); return; }
    touchActive = true;
    for (const touch of e.changedTouches) {
      const pos = getTouchPos(touch);
      if (pos.x < W / 2) {
        p1Touch.active = true;
        p1Touch.id = touch.identifier;
        p1Touch.originX = pos.x;
        p1Touch.originY = pos.y;
        p1Touch.dx = 0;
        p1Touch.dy = 0;
      } else {
        p2Touch.active = true;
        p2Touch.id = touch.identifier;
        p2Touch.originX = pos.x;
        p2Touch.originY = pos.y;
        p2Touch.dx = 0;
        p2Touch.dy = 0;
      }
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const pos = getTouchPos(touch);
      if (touch.identifier === p1Touch.id && p1Touch.active) {
        const dx = pos.x - p1Touch.originX;
        const dy = pos.y - p1Touch.originY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const dead = 15;
        if (len > dead) {
          p1Touch.dx = dx / len;
          p1Touch.dy = dy / len;
        } else {
          p1Touch.dx = 0; p1Touch.dy = 0;
        }
      }
      if (touch.identifier === p2Touch.id && p2Touch.active) {
        const dx = pos.x - p2Touch.originX;
        const dy = pos.y - p2Touch.originY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const dead = 15;
        if (len > dead) {
          p2Touch.dx = dx / len;
          p2Touch.dy = dy / len;
        } else {
          p2Touch.dx = 0; p2Touch.dy = 0;
        }
      }
    }
  }

  function handleTouchEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === p1Touch.id) { p1Touch.active = false; p1Touch.dx = 0; p1Touch.dy = 0; }
      if (touch.identifier === p2Touch.id) { p2Touch.active = false; p2Touch.dx = 0; p2Touch.dy = 0; }
    }
  }

  // ── Init ──
  function init() {
    initCanvas();
    setupInput();
    generateMap();
    createPlayers();
    lastTime = performance.now();
    animFrame = requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
