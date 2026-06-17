(function () {
  'use strict';

  const BG = '#0a0614';
  const FROG_COLOR = '#10b981';
  const ROAD_COLOR = '#1a1a2e';
  const RIVER_COLOR = '#0c1445';
  const SAFE_COLOR = '#0d2818';
  const LOG_COLOR = '#6b3a1f';
  const TURTLE_COLOR = '#2d6a4f';
  const TURTLE_DIVE = '#0c1445';
  const LILY_COLOR = '#10b981';
  const LANE_LINE = '#333355';

  const GRID = 40;
  const COLS = 13;
  const ROWS = 15;
  const W = COLS * GRID;
  const H = ROWS * GRID;

  // Row layout (top to bottom):
  // 0: goal row (lily pads)
  // 1: safe median
  // 2-6: river lanes (5 lanes)
  // 7: safe median
  // 8-12: road lanes (5 lanes)
  // 13: safe start
  // 14: (unused / bottom safe)

  const LANE_DEFS = [
    // River lanes (rows 2-6): logs and turtles
    { row: 2, type: 'log', items: [{ x: 0, w: 3 }, { x: 5, w: 3 }, { x: 9, w: 3 }], speed: 1.2, dir: 1 },
    { row: 3, type: 'turtle', items: [{ x: 1, w: 2, count: 3 }, { x: 7, w: 2, count: 3 }], speed: -1, dir: -1, diveInterval: 4000, diveDuration: 2000 },
    { row: 4, type: 'log', items: [{ x: 0, w: 4 }, { x: 6, w: 4 }], speed: 1.5, dir: 1 },
    { row: 5, type: 'turtle', items: [{ x: 2, w: 2, count: 2 }, { x: 7, w: 2, count: 2 }], speed: -1.8, dir: -1, diveInterval: 5000, diveDuration: 1500 },
    { row: 6, type: 'log', items: [{ x: 0, w: 2 }, { x: 4, w: 3 }, { x: 9, w: 2 }], speed: 1, dir: 1 },
    // Road lanes (rows 8-12)
    { row: 8, type: 'vehicle', items: [{ x: 0, w: 1 }, { x: 3, w: 1 }, { x: 7, w: 1 }, { x: 10, w: 1 }], speed: 1.5, dir: 1, color: '#e63946' },
    { row: 9, type: 'vehicle', items: [{ x: 1, w: 2 }, { x: 6, w: 2 }], speed: -2, dir: -1, color: '#f4a261' },
    { row: 10, type: 'vehicle', items: [{ x: 0, w: 1 }, { x: 4, w: 1 }, { x: 8, w: 1 }], speed: 1, dir: 1, color: '#e63946' },
    { row: 11, type: 'vehicle', items: [{ x: 2, w: 2 }, { x: 7, w: 2 }, { x: 11, w: 2 }], speed: -2.5, dir: -1, color: '#f4a261' },
    { row: 12, type: 'vehicle', items: [{ x: 1, w: 1 }, { x: 5, w: 1 }, { x: 9, w: 1 }], speed: 1.8, dir: 1, color: '#e63946' },
  ];

  // Goal lily pad positions (5 slots)
  const GOAL_SLOTS = [1, 4, 6, 9, 12];

  let canvas, ctx;
  let frog, lanes, score, lives, level, timer, gameActive, paused;
  let startTime, gameDuration;
  let filledGoals;
  let lastTime;
  let animFrame;

  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
    ctx = canvas.getContext('2d');
    resize();
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); }

    document.addEventListener('keydown', handleKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
    resetGame();
    showStartScreen();
  }

  function resize() {
    
    const maxW = window.innerWidth || 800;
    const maxH = window.innerHeight || 600;
    const scale = Math.min(maxW / W, maxH / H, 2);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W * scale) + 'px';
    canvas.style.height = (H * scale) + 'px';
  }

  function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    filledGoals = [];
    gameDuration = 0;
    resetLevel();
    updateHUD();
  }

  function resetLevel() {
    frog = { col: 6, row: 13, riding: null };
    lanes = LANE_DEFS.map(ld => {
      const lane = {
        row: ld.row, type: ld.type, speed: ld.speed * (1 + (level - 1) * 0.15),
        dir: ld.dir, diveInterval: ld.diveInterval || 0, diveDuration: ld.diveDuration || 0,
        entities: []
      };
      ld.items.forEach(item => {
        if (ld.type === 'turtle') {
          const group = [];
          for (let i = 0; i < item.count; i++) {
            group.push({ x: item.x + i * item.w, w: item.w, diving: false, diveTimer: Math.random() * (ld.diveInterval || 4000) });
          }
          lane.entities.push({ type: 'turtleGroup', group, baseX: item.x });
        } else {
          lane.entities.push({ x: item.x, w: item.w });
        }
      });
      return lane;
    });
    timer = 30;
    lastTime = performance.now();
  }

  function showStartScreen() {
    drawBG();
    ctx.fillStyle = FROG_COLOR;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🐸 FROGGER', W / 2, H / 2 - 40);
    ctx.fillStyle = '#ccc';
    ctx.font = '16px monospace';
    ctx.fillText('Arrow keys or swipe to move', W / 2, H / 2);
    ctx.fillText('Reach the lily pads!', W / 2, H / 2 + 25);
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText('Press any key or tap to start', W / 2, H / 2 + 70);

    const startHandler = () => {
      document.removeEventListener('keydown', startHandler);
      canvas.removeEventListener('touchstart', startHandler);
      resetGame();
      gameActive = true;
      startTime = performance.now();
      lastTime = startTime;
      animFrame = requestAnimationFrame(loop);
    };
    document.addEventListener('keydown', startHandler);
    canvas.addEventListener('touchstart', startHandler, { once: true });
  }

  function showGameOver() {
    gameActive = false;
    cancelAnimationFrame(animFrame);

    const best = parseInt(localStorage.getItem('frogger_best') || '0', 10);
    if (score > best) localStorage.setItem('frogger_best', score);

    if (typeof FuzzyScoreSubmit === 'function') {
      try { FuzzyScoreSubmit('frogger', score, gameDuration); } catch (e) { /* */ }
    }
    window.__gameScore = score;

    drawBG();
    drawEntities();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    ctx.fillText('Score: ' + score + '  Best: ' + Math.max(score, best), W / 2, H / 2);
    ctx.fillText('Press any key or tap to restart', W / 2, H / 2 + 40);

    const restartHandler = () => {
      document.removeEventListener('keydown', restartHandler);
      canvas.removeEventListener('touchstart', restartHandler);
      showStartScreen();
    };
    setTimeout(() => {
      document.addEventListener('keydown', restartHandler);
      canvas.addEventListener('touchstart', restartHandler, { once: true });
    }, 500);
  }

  function handleKey(e) {
    if (!gameActive) return;
    e.preventDefault();
    const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (map[e.key]) moveFrog(map[e.key][0], map[e.key][1]);
  }

  let touchStart = null;
  function onTouchStart(e) { if (!gameActive) return; e.preventDefault(); touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function onTouchEnd(e) {
    if (!gameActive || !touchStart) return;
    e.preventDefault();
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) moveFrog(dx > 0 ? 1 : -1, 0);
    else moveFrog(0, dy > 0 ? 1 : -1);
    touchStart = null;
  }

  function moveFrog(dc, dr) {
    const nc = frog.col + dc;
    const nr = frog.row + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return;
    if (dr < 0) score += 10;
    frog.col = nc;
    frog.row = nr;
    frog.riding = null;
    updateHUD();
  }

  function loop(now) {
    if (!gameActive) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    gameDuration += dt;
    timer -= dt;

    if (timer <= 0) {
      loseLife();
      if (lives <= 0) { showGameOver(); return; }
      resetLevel();
      animFrame = requestAnimationFrame(loop);
      return;
    }

    updateLanes(dt);
    updateFrogPosition();
    checkCollisions();
    checkGoal();

    drawBG();
    drawEntities();
    drawFrog();
    drawHUD();
    animFrame = requestAnimationFrame(loop);
  }

  function updateLanes(dt) {
    lanes.forEach(lane => {
      const speed = lane.speed * GRID * dt;
      if (lane.type === 'turtleGroup') {
        lane.entities.forEach(ent => {
          ent.group.forEach(t => {
            t.x += speed;
            t.diveTimer -= dt * 1000;
            if (t.diveTimer <= 0) {
              t.diving = !t.diving;
              t.diveTimer = t.diving ? lane.diveDuration : lane.diveInterval;
            }
          });
        });
      } else {
        lane.entities.forEach(e => { e.x += speed; });
      }
      // Wrap
      lane.entities.forEach(e => {
        if (lane.type === 'turtleGroup') {
          e.group.forEach(t => {
            if (t.x > COLS + 2) t.x -= COLS + 6;
            if (t.x < -4) t.x += COLS + 6;
          });
        } else {
          if (e.x > COLS + 2) e.x -= COLS + e.w + 4;
          if (e.x < -(e.w + 2)) e.x += COLS + e.w + 4;
        }
      });
    });
  }

  function updateFrogPosition() {
    if (frog.row >= 2 && frog.row <= 6) {
      const lane = lanes.find(l => l.row === frog.row);
      if (!lane) return;
      frog.riding = null;
      const fx = frog.col;
      if (lane.type === 'turtleGroup') {
        for (const ent of lane.entities) {
          for (const t of ent.group) {
            if (fx >= t.x && fx < t.x + t.w && !t.diving) {
              frog.riding = { speed: lane.speed };
              break;
            }
          }
        }
      } else {
        for (const ent of lane.entities) {
          if (fx >= ent.x && fx < ent.x + ent.w) {
            frog.riding = { speed: lane.speed };
            break;
          }
        }
      }
      if (frog.riding) {
        frog.col += frog.riding.speed * GRID * (1 / 60) / GRID;
      }
    }
  }

  function checkCollisions() {
    const fx = frog.col;
    // Road collision
    if (frog.row >= 8 && frog.row <= 12) {
      const lane = lanes.find(l => l.row === frog.row);
      if (lane) {
        for (const e of lane.entities) {
          if (fx >= e.x - 0.2 && fx < e.x + e.w + 0.2) {
            loseLife();
            if (lives <= 0) { showGameOver(); return; }
            resetLevel();
            return;
          }
        }
      }
    }
    // River drowning
    if (frog.row >= 2 && frog.row <= 6) {
      if (!frog.riding) {
        loseLife();
        if (lives <= 0) { showGameOver(); return; }
        resetLevel();
        return;
      }
    }
    // Off screen
    if (frog.col < -0.5 || frog.col >= COLS + 0.5) {
      loseLife();
      if (lives <= 0) { showGameOver(); return; }
      resetLevel();
    }
  }

  function checkGoal() {
    if (frog.row !== 0) return;
    let landed = false;
    for (const g of GOAL_SLOTS) {
      if (Math.abs(frog.col - g) < 0.8 && !filledGoals.includes(g)) {
        filledGoals.push(g);
        score += 50;
        landed = true;
        break;
      }
    }
    if (!landed) {
      loseLife();
      if (lives <= 0) { showGameOver(); return; }
      resetLevel();
      return;
    }
    if (filledGoals.length >= 5) {
      score += 200 + Math.floor(timer) * 10;
      level++;
      filledGoals = [];
      resetLevel();
      updateHUD();
    } else {
      resetLevel();
      updateHUD();
    }
  }

  function loseLife() {
    lives--;
    updateHUD();
  }

  function updateHUD() {
    const se = document.getElementById('score-display');
    const le = document.getElementById('lives-display');
    if (se) se.textContent = 'Score: ' + score;
    if (le) le.textContent = 'Lives: ' + lives;
    window.__gameScore = score;
  }

  // --- Drawing ---

  function drawBG() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Goal row
    ctx.fillStyle = '#0d2818';
    ctx.fillRect(0, 0, W, GRID);
    // Safe median top
    ctx.fillStyle = SAFE_COLOR;
    ctx.fillRect(0, GRID, W, GRID);
    // River
    ctx.fillStyle = RIVER_COLOR;
    ctx.fillRect(0, GRID * 2, W, GRID * 5);
    // Safe median
    ctx.fillStyle = SAFE_COLOR;
    ctx.fillRect(0, GRID * 7, W, GRID);
    // Road
    ctx.fillStyle = ROAD_COLOR;
    ctx.fillRect(0, GRID * 8, W, GRID * 5);
    // Start safe
    ctx.fillStyle = SAFE_COLOR;
    ctx.fillRect(0, GRID * 13, W, GRID);

    // Road lane lines
    for (let r = 9; r <= 12; r++) {
      ctx.strokeStyle = LANE_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, r * GRID);
      ctx.lineTo(W, r * GRID);
      ctx.stroke();
    }

    // Goal lily pads
    GOAL_SLOTS.forEach(g => {
      const filled = filledGoals.includes(g);
      ctx.fillStyle = filled ? '#059669' : '#064e3b';
      ctx.beginPath();
      ctx.arc(g * GRID + GRID / 2, GRID / 2, GRID * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (filled) {
        ctx.fillStyle = FROG_COLOR;
        ctx.beginPath();
        ctx.arc(g * GRID + GRID / 2, GRID / 2, GRID * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawEntities() {
    lanes.forEach(lane => {
      const y = lane.row * GRID;
      if (lane.type === 'turtleGroup') {
        lane.entities.forEach(ent => {
          ent.group.forEach(t => {
            ctx.fillStyle = t.diving ? TURTLE_DIVE : TURTLE_COLOR;
            ctx.globalAlpha = t.diving ? 0.3 : 1;
            roundRect(t.x * GRID + 2, y + 4, t.w * GRID - 4, GRID - 8, 6);
            ctx.fill();
            ctx.globalAlpha = 1;
          });
        });
      } else if (lane.type === 'log') {
        ctx.fillStyle = LOG_COLOR;
        lane.entities.forEach(e => {
          roundRect(e.x * GRID + 1, y + 6, e.w * GRID - 2, GRID - 12, 5);
          ctx.fill();
          ctx.strokeStyle = '#8b5e3c';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      } else if (lane.type === 'vehicle') {
        lane.entities.forEach(e => {
          ctx.fillStyle = lane.color || '#e63946';
          roundRect(e.x * GRID + 2, y + 6, e.w * GRID - 4, GRID - 12, 4);
          ctx.fill();
          // Headlights
          ctx.fillStyle = '#ffd166';
          const hx = lane.dir > 0 ? (e.x + e.w) * GRID - 6 : e.x * GRID + 3;
          ctx.fillRect(hx, y + 10, 3, 4);
          ctx.fillRect(hx, y + GRID - 14, 3, 4);
        });
      }
    });
  }

  function drawFrog() {
    const x = frog.col * GRID + GRID / 2;
    const y = frog.row * GRID + GRID / 2;
    ctx.fillStyle = FROG_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, GRID * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 8, H - 6);
    ctx.textAlign = 'center';
    ctx.fillText('Lives: ' + lives, W / 2, H - 6);
    ctx.textAlign = 'right';
    ctx.fillText('Time: ' + Math.ceil(Math.max(0, timer)), W - 8, H - 6);
    ctx.textAlign = 'left';
    ctx.fillText('Lv ' + level, 8, GRID * 13 - 6);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
