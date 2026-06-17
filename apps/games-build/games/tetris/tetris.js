(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────
  const COLS = 10, ROWS = 20, BLOCK = 28;
  const BG = '#0a0614';
  const COLORS = ['#06b6d4', '#fbbf24', '#7c3aed', '#10b981', '#ef4444', '#f97316', '#3b82f6'];
  const SCORE_TABLE = [0, 100, 300, 500, 800];
  const LOCK_DELAY = 500;

  // Tetromino shapes (row,col offsets) in 4 rotations
  const SHAPES = {
    I: [[ [0,0],[0,1],[0,2],[0,3] ], [ [0,0],[1,0],[2,0],[3,0] ], [ [0,0],[0,1],[0,2],[0,3] ], [ [0,0],[1,0],[2,0],[3,0] ]],
    O: [[ [0,0],[0,1],[1,0],[1,1] ], [ [0,0],[0,1],[1,0],[1,1] ], [ [0,0],[0,1],[1,0],[1,1] ], [ [0,0],[0,1],[1,0],[1,1] ]],
    T: [[ [0,0],[0,1],[0,2],[1,1] ], [ [0,0],[1,0],[2,0],[1,1] ], [ [1,0],[1,1],[1,2],[0,1] ], [ [0,0],[1,0],[2,0],[1,-1] ]],
    S: [[ [0,1],[0,2],[1,0],[1,1] ], [ [0,0],[1,0],[1,1],[2,1] ], [ [0,1],[0,2],[1,0],[1,1] ], [ [0,0],[1,0],[1,1],[2,1] ]],
    Z: [[ [0,0],[0,1],[1,1],[1,2] ], [ [0,1],[1,0],[1,1],[2,0] ], [ [0,0],[0,1],[1,1],[1,2] ], [ [0,1],[1,0],[1,1],[2,0] ]],
    J: [[ [0,0],[1,0],[1,1],[1,2] ], [ [0,0],[0,1],[1,0],[2,0] ], [ [0,0],[0,1],[0,2],[1,2] ], [ [0,0],[1,0],[2,0],[2,-1] ]],
    L: [[ [0,2],[1,0],[1,1],[1,2] ], [ [0,0],[1,0],[2,0],[2,1] ], [ [0,0],[0,1],[0,2],[1,0] ], [ [0,0],[0,1],[1,1],[2,1] ]]
  };

  // SRS wall kick data (JLSTZ)
  const KICKS_JLSTZ = [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], // 0->1
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],       // 1->2
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],       // 2->3
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]     // 3->0
  ];
  const KICKS_I = [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
  ];

  // ── State ──────────────────────────────────────────────────────────────
  let canvas, ctx, overlayStart, overlayOver;
  let grid, bag, nextBag, current, next, curType, curRot;
  let score, lines, level, best, startTime;
  let dropTimer, lockTimer, locked;
  let running, gameOver, paused;
  let cellSize;
  let touchStartX, touchStartY, touchStartTime;

  // ── Helpers ────────────────────────────────────────────────────────────
  function makeBag() {
    const a = [0,1,2,3,4,5,6];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i+1) | 0; [a[i],a[j]] = [a[j],a[i]]; }
    return a;
  }

  function nextPiece() {
    if (!bag.length) bag = nextBag.slice();
    nextBag = makeBag();
    const idx = bag.pop();
    return { type: idx, rot: 0, cells: SHAPES[Object.keys(SHAPES)[idx]][0], color: COLORS[idx], row: 0, col: 3 };
  }

  function rotate(cells, rot) {
    // rotate 90° CW around center
    const n = (rot + 1) % 4;
    return SHAPES[Object.keys(SHAPES)[current.type]][n].map(c => [c[0], c[1]]);
  }

  function getCells(type, rot) { return SHAPES[Object.keys(SHAPES)[type]][rot % 4]; }

  function fits(cells, row, col) {
    for (const [r, c] of cells) {
      const nr = row + r, nc = col + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc]) return false;
    }
    return true;
  }

  function lock() {
    for (const [r, c] of current.cells) {
      const nr = current.row + r, nc = current.col + c;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) grid[nr][nc] = current.color;
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(c => c)) {
        grid.splice(r, 1);
        grid.unshift(new Array(COLS).fill(null));
        cleared++; r++;
      }
    }
    if (cleared) {
      score += SCORE_TABLE[cleared] * level;
      lines += cleared;
      level = (lines / 10 | 0) + 1;
      updateHUD();
      window.__gameScore = score;
    }
  }

  function ghostRow() {
    let r = current.row;
    while (fits(current.cells, r + 1, current.col)) r++;
    return r;
  }

  function spawn() {
    current = next;
    next = nextPiece();
    curRot = 0;
    if (!fits(current.cells, current.row, current.col)) {
      running = false; gameOver = true;
      endGame();
    }
    locked = false; lockTimer = null;
  }

  function endGame() {
    const dur = ((Date.now() - startTime) / 1000) | 0;
    best = Math.max(best, score);
    localStorage.setItem('tetris_best', best);
    window.__gameScore = score;
    if (overlayOver) { overlayOver.style.display = 'flex'; }
    try { FuzzyScoreSubmit('tetris', score, dur); } catch(e) {}
  }

  function updateHUD() {
    const se = document.getElementById('score-display');
    const le = document.getElementById('level-display');
    if (se) se.textContent = score;
    if (le) le.textContent = level;
  }

  function dropSpeed() { return Math.max(50, 800 - (level - 1) * 70); }

  // ── Input ──────────────────────────────────────────────────────────────
  function moveLeft() { if (fits(current.cells, current.row, current.col - 1)) { current.col--; resetLock(); } }
  function moveRight() { if (fits(current.cells, current.row, current.col + 1)) { current.col++; resetLock(); } }
  function softDrop() { if (fits(current.cells, current.row + 1, current.col)) { current.row++; score += 1; window.__gameScore = score; } }
  function hardDrop() {
    let dropped = 0;
    while (fits(current.cells, current.row + 1, current.col)) { current.row++; dropped++; }
    score += dropped * 2; window.__gameScore = score;
    lock();
  }

  function rotateCW() {
    const newRot = (curRot + 1) % 4;
    const newCells = getCells(current.type, newRot);
    const kicks = current.type === 0 ? KICKS_I : KICKS_JLSTZ;
    const kickSet = kicks[curRot];
    for (const [kc, kr] of kickSet) {
      if (fits(newCells, current.row + kr, current.col + kc)) {
        current.cells = newCells; current.rot = newRot; curRot = newRot;
        current.row += kr; current.col += kc;
        resetLock(); return;
      }
    }
  }

  function resetLock() {
    if (lockTimer !== null) { lockTimer = Date.now(); locked = false; }
  }

  function onKeyDown(e) {
    if (!running) return;
    switch (e.code) {
      case 'ArrowLeft': moveLeft(); e.preventDefault(); break;
      case 'ArrowRight': moveRight(); e.preventDefault(); break;
      case 'ArrowDown': softDrop(); e.preventDefault(); break;
      case 'ArrowUp': case 'KeyX': rotateCW(); e.preventDefault(); break;
      case 'Space': hardDrop(); e.preventDefault(); break;
    }
  }

  // ── Touch ──────────────────────────────────────────────────────────────
  function onTouchStart(e) {
    if (!running) return;
    const t = e.touches[0]; touchStartX = t.clientX; touchStartY = t.clientY; touchStartTime = Date.now();
  }
  function onTouchEnd(e) {
    if (!running) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < 15 && ady < 15 && dt < 300) { rotateCW(); }
    else if (adx > ady) { dx < 0 ? moveLeft() : moveRight(); }
    else if (dy > 30) { hardDrop(); }
  }

  // ── Draw ───────────────────────────────────────────────────────────────
  function drawBlock(x, y, color, alpha) {
    ctx.globalAlpha = alpha || 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    ctx.globalAlpha = 1;
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);

    // Grid border
    ctx.strokeStyle = '#1e1b3a'; ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r*cellSize); ctx.lineTo(COLS*cellSize, r*cellSize); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*cellSize, 0); ctx.lineTo(c*cellSize, ROWS*cellSize); ctx.stroke(); }

    // Locked blocks
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) drawBlock(c*cellSize, r*cellSize, grid[r][c]);

    if (!current || !running) return;

    // Ghost
    const gr = ghostRow();
    for (const [r, c] of current.cells) drawBlock((current.col+c)*cellSize, (gr+r)*cellSize, current.color, 0.2);

    // Current piece
    for (const [r, c] of current.cells) {
      const nr = current.row + r, nc = current.col + c;
      if (nr >= 0) drawBlock(nc*cellSize, nr*cellSize, current.color);
    }

    // Next piece preview
    const previewSize = cellSize * 0.7;
    const px = COLS * cellSize + 16, py = 10;
    ctx.fillStyle = '#c4b5fd'; ctx.font = '14px monospace'; ctx.fillText('NEXT', px, py + 12);
    const nc2 = getCells(next.type, 0);
    for (const [r, c] of nc2) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = next.color;
      ctx.fillRect(px + c*previewSize + 1, py + 16 + r*previewSize + 1, previewSize - 2, previewSize - 2);
    }
  }

  // ── Game Loop ──────────────────────────────────────────────────────────
  let lastDrop = 0;
  function loop(ts) {
    if (!running) { draw(); return; }

    // Auto drop
    if (ts - lastDrop > dropSpeed()) {
      if (fits(current.cells, current.row + 1, current.col)) {
        current.row++; locked = false; lockTimer = null;
      } else {
        if (lockTimer === null) lockTimer = Date.now();
        else if (Date.now() - lockTimer > LOCK_DELAY) lock();
      }
      lastDrop = ts;
    }

    draw();
    requestAnimationFrame(loop);
  }

  // ── Resize ─────────────────────────────────────────────────────────────
  function resize() {
    const maxH = (window.visualViewport?.height || window.innerHeight) || 600;
    const maxW = window.innerWidth || 800;
    const sidebar = 90;
    cellSize = Math.min(Math.floor((maxW - sidebar) / COLS), Math.floor(maxH / ROWS), 32);
    cellSize = Math.max(cellSize, 14);
    canvas.width = COLS * cellSize + sidebar;
    canvas.height = ROWS * cellSize;
  }

  // ── Init / Start / Reset ───────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    overlayStart = document.getElementById('start-screen');
    overlayOver = document.getElementById('game-over');
    best = parseInt(localStorage.getItem('tetris_best')) || 0;
    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    if (window.ResizeObserver) {
      new ResizeObserver(() => { resize(); if (!running) draw(); }).observe(document.body);
    } else {
      window.addEventListener('resize', () => { resize(); if (!running) draw(); });
    }
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
    resize();
    if (overlayStart) overlayStart.style.display = 'flex';
    if (overlayOver) overlayOver.style.display = 'none';
    // Bind start buttons
    document.getElementById('start-btn')?.addEventListener('click', startGame);
    document.getElementById('restart-btn')?.addEventListener('click', startGame);
  }

  function startGame() {
    grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    bag = makeBag(); nextBag = makeBag();
    score = 0; lines = 0; level = 1; gameOver = false; running = true;
    startTime = Date.now(); lastDrop = 0;
    window.__gameScore = 0;
    next = nextPiece(); spawn();
    updateHUD();
    if (overlayStart) overlayStart.style.display = 'none';
    if (overlayOver) overlayOver.style.display = 'none';
    resize();
    requestAnimationFrame(loop);
  }

  // Expose for external callers
  window.TetrisGame = { init: init, start: startGame };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
