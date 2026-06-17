(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────
  var GRID = 4;
  var BG = '#0a0614';
  var GRID_BG = '#1a1128';
  var CELL_BG = '#2a1f3d';
  var ACCENT = '#d4a843';

  var TILE_COLORS = {
    2: { bg: '#eeeeee', fg: '#1a1128', glow: '#eeeeee' },
    4: { bg: '#eeeeee', fg: '#1a1128', glow: '#eeeeee' },
    8: { bg: '#f97316', fg: '#ffffff', glow: '#f97316' },
    16: { bg: '#f97316', fg: '#ffffff', glow: '#f97316' },
    32: { bg: '#ef4444', fg: '#ffffff', glow: '#ef4444' },
    64: { bg: '#ef4444', fg: '#ffffff', glow: '#ef4444' },
    128: { bg: '#fbbf24', fg: '#1a1128', glow: '#fbbf24' },
    256: { bg: '#fbbf24', fg: '#1a1128', glow: '#fbbf24' },
    512: { bg: '#fbbf24', fg: '#1a1128', glow: '#fbbf24' },
    1024: { bg: '#fbbf24', fg: '#1a1128', glow: '#fbbf24' },
    2048: { bg: '#ff2e88', fg: '#ffffff', glow: '#ff2e88' }
  };

  // ── State ───────────────────────────────────────────────────────────
  var canvas, ctx, size, cellSize, pad, radius;
  var grid, score, bestScore, gameOver, gameWon, continueMode;
  var startTime, moveCount;
  var animating = false;
  var animations = []; // {r,c,fromX,fromY,toX,toY,value,merged}

  // ── Init ────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    bestScore = parseInt((function(){try{return localStorage.getItem('2048_best')}catch(e){return null}})() || '0', 10);
    score = 0;
    window.__gameScore = 0;
    gameOver = false;
    gameWon = false;
    continueMode = false;
    moveCount = 0;
    startTime = Date.now();
    initGrid();
    addRandomTile();
    addRandomTile();
    resize();
    bindInput();
    updateHUD();
    draw();
  }

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid[r] = [];
      for (var c = 0; c < GRID; c++) {
        grid[r][c] = 0;
      }
    }
  }

  // ── Grid helpers ────────────────────────────────────────────────────
  function emptyCells() {
    var cells = [];
    for (var r = 0; r < GRID; r++)
      for (var c = 0; c < GRID; c++)
        if (grid[r][c] === 0) cells.push({ r: r, c: c });
    return cells;
  }

  function addRandomTile() {
    var cells = emptyCells();
    if (cells.length === 0) return;
    var cell = cells[Math.floor(Math.random() * cells.length)];
    grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
  }

  function cloneGrid(g) {
    return g.map(function (row) { return row.slice(); });
  }

  function canMove() {
    for (var r = 0; r < GRID; r++)
      for (var c = 0; c < GRID; c++) {
        if (grid[r][c] === 0) return true;
        if (c < GRID - 1 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < GRID - 1 && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }

  function hasWon() {
    for (var r = 0; r < GRID; r++)
      for (var c = 0; c < GRID; c++)
        if (grid[r][c] >= 2048) return true;
    return false;
  }

  // ── Slide logic ─────────────────────────────────────────────────────
  function slideRow(row) {
    // remove zeros
    var arr = row.filter(function (v) { return v !== 0; });
    var merged = [];
    var pts = 0;
    for (var i = 0; i < arr.length; i++) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        var val = arr[i] * 2;
        merged.push(val);
        pts += val;
        i++; // skip next
      } else {
        merged.push(arr[i]);
      }
    }
    while (merged.length < GRID) merged.push(0);
    return { row: merged, points: pts };
  }

  function move(dir) {
    if (animating || gameOver) return;

    var oldGrid = cloneGrid(grid);
    var totalPts = 0;

    // Build the moved positions for animation tracking
    var moves = []; // {fromR,fromC,toR,toC,value,merged}

    if (dir === 'left') {
      for (var r = 0; r < GRID; r++) {
        var res = slideRow(grid[r]);
        grid[r] = res.row;
        totalPts += res.points;
      }
    } else if (dir === 'right') {
      for (var r = 0; r < GRID; r++) {
        var res = slideRow(grid[r].slice().reverse());
        grid[r] = res.row.reverse();
        totalPts += res.points;
      }
    } else if (dir === 'up') {
      for (var c = 0; c < GRID; c++) {
        var col = [];
        for (var r = 0; r < GRID; r++) col.push(grid[r][c]);
        var res = slideRow(col);
        for (var r = 0; r < GRID; r++) grid[r][c] = res.row[r];
        totalPts += res.points;
      }
    } else if (dir === 'down') {
      for (var c = 0; c < GRID; c++) {
        var col = [];
        for (var r = 0; r < GRID; r++) col.push(grid[r][c]);
        var res = slideRow(col.reverse());
        var newRow = res.row.reverse();
        for (var r = 0; r < GRID; r++) grid[r][c] = newRow[r];
        totalPts += res.points;
      }
    }

    // Check if anything changed
    var changed = false;
    for (var r = 0; r < GRID; r++)
      for (var c = 0; c < GRID; c++)
        if (grid[r][c] !== oldGrid[r][c]) { changed = true; break; }

    if (!changed) return;

    moveCount++;
    score += totalPts;
    window.__gameScore = score;
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('2048_best', bestScore.toString()) } catch(e) {}
    }
    updateHUD();

    // Add new tile with animation
    addRandomTile();

    // Check win
    if (!continueMode && hasWon()) {
      gameWon = true;
    }

    // Check game over
    if (!canMove()) {
      gameOver = true;
      var duration = Math.floor((Date.now() - startTime) / 1000);
      if (typeof FuzzyScoreSubmit === 'function') {
        FuzzyScoreSubmit('2048', score, duration);
      }
      setTimeout(function () { draw(); showGameOverOverlay(); }, 400);
    }

    // Simple animation pulse
    animateSlide(dir, oldGrid, totalPts);
  }

  // ── Animation ───────────────────────────────────────────────────────
  function animateSlide(dir, oldGrid, pts) {
    animating = true;
    var frames = 12;
    var frame = 0;

    function step() {
      frame++;
      draw();
      // Draw merge score popup
      if (pts > 0 && frame < frames) {
        ctx.save();
        ctx.globalAlpha = 1 - frame / frames;
        ctx.fillStyle = ACCENT;
        ctx.font = 'bold ' + Math.floor(size * 0.06) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+' + pts, size / 2, size * 0.12 - frame * 1.5);
        ctx.restore();
      }
      if (frame < frames) {
        requestAnimationFrame(step);
      } else {
        animating = false;
        if (gameWon && !continueMode) {
          showWinOverlay();
        }
        draw();
      }
    }
    requestAnimationFrame(step);
  }

  // ── Draw ────────────────────────────────────────────────────────────
  function resize() {
    var container = canvas.parentElement;
    var w = container ? container.clientWidth : 480;
    var h = container ? container.clientHeight : 480;
    size = Math.min(w, h);
    canvas.width = size;
    canvas.height = size;
    pad = size * 0.025;
    radius = size * 0.02;
    cellSize = (size - pad * (GRID + 1)) / GRID;
    draw();
  }

  function getTileColor(val) {
    if (val <= 0) return null;
    if (TILE_COLORS[val]) return TILE_COLORS[val];
    // Higher tiles: blend toward purple/gold
    return { bg: '#9b59b6', fg: '#ffffff', glow: '#bf7aed' };
  }

  function drawRoundRect(x, y, w, h, r) {
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

  function draw() {
    if (!ctx) return;

    // Background
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);

    // Grid background
    var gridPad = pad;
    drawRoundRect(gridPad, gridPad, size - gridPad * 2, size - gridPad * 2, radius * 2);
    ctx.fillStyle = GRID_BG;
    ctx.fill();

    // Cell backgrounds
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var x = pad + c * (cellSize + pad);
        var y = pad + r * (cellSize + pad);
        drawRoundRect(x, y, cellSize, cellSize, radius);
        ctx.fillStyle = CELL_BG;
        ctx.fill();
      }
    }

    // Tiles
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var val = grid[r][c];
        if (val === 0) continue;
        var tc = getTileColor(val);
        var x = pad + c * (cellSize + pad);
        var y = pad + r * (cellSize + pad);

        // Glow effect
        ctx.save();
        ctx.shadowColor = tc.glow;
        ctx.shadowBlur = val >= 128 ? 18 : val >= 32 ? 10 : 4;
        drawRoundRect(x, y, cellSize, cellSize, radius);
        ctx.fillStyle = tc.bg;
        ctx.fill();
        ctx.restore();

        // Number
        ctx.fillStyle = tc.fg;
        var fontSize = val < 100 ? 0.45 : val < 1000 ? 0.35 : 0.28;
        ctx.font = 'bold ' + Math.floor(cellSize * fontSize) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val.toString(), x + cellSize / 2, y + cellSize / 2 + 1);
      }
    }

    // Score bar at top (subtle)
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold ' + Math.floor(size * 0.035) + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SCORE: ' + score, pad, size + 4);
    ctx.textAlign = 'right';
    ctx.fillText('BEST: ' + bestScore, size - pad, size + 4);

    // Overlays
    if (gameOver) showGameOverOverlay();
  }

  function showGameOverOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 6, 20, 0.75)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold ' + Math.floor(size * 0.1) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', size / 2, size / 2 - size * 0.06);
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.floor(size * 0.05) + 'px sans-serif';
    ctx.fillText('Score: ' + score, size / 2, size / 2 + size * 0.04);
    ctx.fillStyle = ACCENT;
    ctx.font = Math.floor(size * 0.035) + 'px sans-serif';
    ctx.fillText('Press any key or tap to restart', size / 2, size / 2 + size * 0.12);
    ctx.restore();
  }

  function showWinOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 6, 20, 0.75)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ff2e88';
    ctx.font = 'bold ' + Math.floor(size * 0.1) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOU WIN!', size / 2, size / 2 - size * 0.06);
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.floor(size * 0.05) + 'px sans-serif';
    ctx.fillText('Score: ' + score, size / 2, size / 2 + size * 0.02);
    ctx.fillStyle = ACCENT;
    ctx.font = Math.floor(size * 0.035) + 'px sans-serif';
    ctx.fillText('Press any key to continue', size / 2, size / 2 + size * 0.1);
    ctx.restore();
  }

  // ── HUD ─────────────────────────────────────────────────────────────
  function updateHUD() {
    var el = document.getElementById('score-display');
    if (el) el.textContent = 'Score: ' + score;
  }

  // ── Input ───────────────────────────────────────────────────────────
  function bindInput() {
    document.addEventListener('keydown', function (e) {
      // Win continue
      if (gameWon && !continueMode) {
        continueMode = true;
        draw();
        return;
      }
      // Game over restart
      if (gameOver) {
        init();
        return;
      }

      var dir = null;
      switch (e.key) {
        case 'ArrowLeft': case 'a': dir = 'left'; break;
        case 'ArrowRight': case 'd': dir = 'right'; break;
        case 'ArrowUp': case 'w': dir = 'up'; break;
        case 'ArrowDown': case 's': dir = 'down'; break;
      }
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    });

    // Touch swipe
    var tx = 0, ty = 0;
    canvas.addEventListener('touchstart', function (e) {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', function (e) {
      if (gameWon && !continueMode) {
        continueMode = true;
        draw();
        return;
      }
      if (gameOver) {
        init();
        return;
      }
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }, { passive: true });

    // Mouse click for restart/continue
    canvas.addEventListener('click', function () {
      if (gameWon && !continueMode) {
        continueMode = true;
        draw();
        return;
      }
      if (gameOver) {
        init();
        return;
      }
    });

    window.addEventListener('resize', resize);
  }

  // ── Start ───────────────────────────────────────────────────────────
  init();
})();
