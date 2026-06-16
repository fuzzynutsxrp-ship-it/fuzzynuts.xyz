(function() {
  'use strict';

  // ── Constants ──
  const BG = '#0a0614';
  const WALL = '#a855f7';
  const PLAYER = '#ffffff';
  const EXIT_COLOR = '#22c55e';
  const GEM_COLOR = '#eab308';
  const EXPLORED = 'rgba(168,85,247,0.15)';
  const FOG_COLOR = '#0a0614';
  const LEVEL_SIZES = [10, 15, 20, 25];
  const LEVEL_TIMERS = [120, 180, 240, 300]; // seconds per level
  const GEM_COUNT = [5, 8, 12, 15];
  const VIS_RADIUS = 3; // fog of war radius
  const GEM_POINTS = 50;
  const TIME_BONUS_PER_SEC = 10;
  const LEVEL_BONUS_BASE = 200;

  // ── State ──
  let canvas, ctx, w, h;
  let maze, cols, rows, cellSize;
  let player, exitCell, gems;
  let score = 0, level = 0, totalDuration = 0;
  let timeLeft, timerInterval;
  let fogOfWar = true;
  let explored; // Set of "r,c"
  let gameState = 'start'; // start | playing | levelComplete | gameover
  let animFrame;
  let miniCanvas, miniCtx;
  let playerTrail = [];
  let cellVisited;
  let levelStartTime;

  // ── Maze generation (recursive backtracker / growing tree) ──
  function generateMaze(c, r) {
    const grid = [];
    for (let row = 0; row < r; row++) {
      grid[row] = [];
      for (let col = 0; col < c; col++) {
        grid[row][col] = { top: true, right: true, bottom: true, left: true, visited: false };
      }
    }
    const stack = [];
    const start = grid[0][0];
    start.visited = true;
    stack.push([0, 0]);

    const dirs = [[0,-1],[1,0],[0,1],[-1,0]]; // top, right, bottom, left
    const wallOpp = [2,3,0,1]; // opposite wall indices

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];
      for (let d = 0; d < 4; d++) {
        const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
        if (nx >= 0 && nx < c && ny >= 0 && ny < r && !grid[ny][nx].visited) {
          neighbors.push([nx, ny, d]);
        }
      }
      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const [nx, ny, d] = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Remove walls between current and neighbor
        const wallIdx = d; // wall in direction d from current
        const cell = grid[cy][cx];
        const wallNames = ['top','right','bottom','left'];
        cell[wallNames[wallIdx]] = false;
        grid[ny][nx][wallNames[wallOpp[d]]] = false;
        grid[ny][nx].visited = true;
        stack.push([nx, ny]);
      }
    }
    return grid;
  }

  // ── Place gems in random empty cells ──
  function placeGems(c, r, count, playerStart, exitPos) {
    const placed = new Set();
    placed.add('0,0');
    placed.add(`${r-1},${c-1}`);
    const gemsArr = [];
    let attempts = 0;
    while (gemsArr.length < count && attempts < 1000) {
      const gr = Math.floor(Math.random() * r);
      const gc = Math.floor(Math.random() * c);
      const key = `${gr},${gc}`;
      if (!placed.has(key)) {
        placed.add(key);
        gemsArr.push({ row: gr, col: gc, collected: false });
      }
      attempts++;
    }
    return gemsArr;
  }

  // ── Canvas setup ──
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
    const container = canvas.parentElement || document.body;
    const cw = container.clientWidth || window.innerWidth;
    const ch = container.clientHeight || window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    w = cw;
    h = ch;
    if (gameState === 'playing') {
      const sz = Math.min(w * 0.7, h * 0.85);
      cellSize = Math.floor(sz / Math.max(cols, rows));
    }
  }

  // ── HUD helpers ──
  function updateHUD() {
    const sEl = document.getElementById('score-display');
    const lEl = document.getElementById('level-display');
    if (sEl) sEl.textContent = score;
    if (lEl) lEl.textContent = level + 1;
    window.__gameScore = score;
  }

  // ── Mini-map ──
  function initMiniMap() {
    miniCanvas = document.createElement('canvas');
    miniCanvas.width = cols * 3;
    miniCanvas.height = rows * 3;
    miniCtx = miniCanvas.getContext('2d');
  }

  function drawMiniMap() {
    const mw = miniCanvas.width, mh = miniCanvas.height;
    miniCtx.fillStyle = 'rgba(10,6,20,0.85)';
    miniCtx.fillRect(0, 0, mw, mh);
    const cs = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        const x = c * cs, y = r * cs;
        if (explored.has(key)) {
          miniCtx.fillStyle = 'rgba(168,85,247,0.3)';
          miniCtx.fillRect(x, y, cs, cs);
        }
      }
    }
    // Player dot
    miniCtx.fillStyle = PLAYER;
    miniCtx.fillRect(player.col * cs, player.row * cs, cs, cs);
    // Exit dot
    miniCtx.fillStyle = EXIT_COLOR;
    miniCtx.fillRect(exitCell.col * cs, exitCell.row * cs, cs, cs);
    // Gems
    gems.forEach(g => {
      if (!g.collected) {
        miniCtx.fillStyle = GEM_COLOR;
        miniCtx.fillRect(g.col * cs + 1, g.row * cs + 1, 1, 1);
      }
    });

    const boxW = Math.min(150, w * 0.2);
    const boxH = boxW * (rows / cols);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(miniCanvas, w - boxW - 10, 10, boxW, boxH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = WALL;
    ctx.lineWidth = 1;
    ctx.strokeRect(w - boxW - 10, 10, boxW, boxH);
    ctx.restore();
  }

  // ── Fog of war helpers ──
  function markExplored() {
    const pr = player.row, pc = player.col;
    for (let dr = -VIS_RADIUS; dr <= VIS_RADIUS; dr++) {
      for (let dc = -VIS_RADIUS; dc <= VIS_RADIUS; dc++) {
        const r2 = pr + dr, c2 = pc + dc;
        if (r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols) {
          if (Math.abs(dr) + Math.abs(dc) <= VIS_RADIUS) {
            explored.add(`${r2},${c2}`);
          }
        }
      }
    }
  }

  function isInFog(r, c) {
    if (!fogOfWar) return false;
    const pr = player.row, pc = player.col;
    return Math.abs(r - pr) + Math.abs(c - pc) > VIS_RADIUS;
  }

  // ── Drawing ──
  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    const offsetX = (w - cols * cellSize) / 2;
    const offsetY = (h - rows * cellSize) / 2 + 20;

    // Draw maze cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = maze[r][c];

        if (fogOfWar && !explored.has(`${r},${c}`)) {
          ctx.fillStyle = FOG_COLOR;
          ctx.fillRect(x, y, cellSize, cellSize);
          continue;
        }

        // Cell background
        ctx.fillStyle = isInFog(r, c) ? 'rgba(10,6,20,0.85)' : BG;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Walls
        ctx.strokeStyle = WALL;
        ctx.lineWidth = 2;
        if (cell.top) { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+cellSize,y); ctx.stroke(); }
        if (cell.right) { ctx.beginPath(); ctx.moveTo(x+cellSize,y); ctx.lineTo(x+cellSize,y+cellSize); ctx.stroke(); }
        if (cell.bottom) { ctx.beginPath(); ctx.moveTo(x,y+cellSize); ctx.lineTo(x+cellSize,y+cellSize); ctx.stroke(); }
        if (cell.left) { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+cellSize); ctx.stroke(); }
      }
    }

    // Gems
    gems.forEach(g => {
      if (g.collected) return;
      if (fogOfWar && !explored.has(`${g.row},${g.col}`)) return;
      if (isInFog(g.row, g.col)) return;
      const gx = offsetX + g.col * cellSize + cellSize / 2;
      const gy = offsetY + g.row * cellSize + cellSize / 2;
      const sz = cellSize * 0.25;
      ctx.fillStyle = GEM_COLOR;
      ctx.beginPath();
      ctx.moveTo(gx, gy - sz);
      ctx.lineTo(gx + sz, gy);
      ctx.lineTo(gx, gy + sz);
      ctx.lineTo(gx - sz, gy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Exit
    if (!fogOfWar || explored.has(`${exitCell.row},${exitCell.col}`)) {
      const ex = offsetX + exitCell.col * cellSize;
      const ey = offsetY + exitCell.row * cellSize;
      ctx.fillStyle = EXIT_COLOR;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Date.now() / 300);
      ctx.fillRect(ex + 3, ey + 3, cellSize - 6, cellSize - 6);
      ctx.globalAlpha = 1;
    }

    // Player
    const px = offsetX + player.col * cellSize + cellSize / 2;
    const py = offsetY + player.row * cellSize + cellSize / 2;
    ctx.fillStyle = PLAYER;
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Timer bar
    const maxTime = LEVEL_TIMERS[level] || 120;
    const barW = w * 0.6;
    const barH = 8;
    const barX = (w - barW) / 2;
    const barY = 8;
    ctx.fillStyle = 'rgba(168,85,247,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    const pct = Math.max(0, timeLeft / maxTime);
    ctx.fillStyle = pct > 0.3 ? EXIT_COLOR : '#ef4444';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = WALL;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Time text
    ctx.fillStyle = PLAYER;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${Math.ceil(timeLeft)}s`, w / 2, barY + barH + 16);

    // Mini-map
    drawMiniMap();
  }

  // ── Overlay screens ──
  function drawOverlay(title, subtitle, instructions) {
    ctx.fillStyle = 'rgba(10,6,20,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = WALL;
    ctx.font = `bold ${Math.min(48, w/12)}px monospace`;
    ctx.fillText(title, w/2, h/2 - 60);
    ctx.fillStyle = PLAYER;
    ctx.font = `${Math.min(24, w/20)}px monospace`;
    ctx.fillText(subtitle, w/2, h/2 - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.min(18, w/25)}px monospace`;
    if (instructions) {
      instructions.forEach((line, i) => {
        ctx.fillText(line, w/2, h/2 + 30 + i * 26);
      });
    }
  }

  // ── Game logic ──
  function initLevel() {
    const sz = LEVEL_SIZES[Math.min(level, LEVEL_SIZES.length - 1)];
    cols = sz;
    rows = sz;
    maze = generateMaze(cols, rows);
    player = { row: 0, col: 0 };
    exitCell = { row: rows - 1, col: cols - 1 };
    gems = placeGems(cols, rows, GEM_COUNT[Math.min(level, GEM_COUNT.length - 1)], player, exitCell);
    explored = new Set();
    cellVisited = new Set();
    playerTrail = [];
    markExplored();
    const sz2 = Math.min(w * 0.7, h * 0.85);
    cellSize = Math.floor(sz2 / Math.max(cols, rows));
    initMiniMap();
    timeLeft = LEVEL_TIMERS[Math.min(level, LEVEL_TIMERS.length - 1)];
    levelStartTime = Date.now();
  }

  function startGame() {
    score = 0;
    level = 0;
    totalDuration = 0;
    initLevel();
    gameState = 'playing';
    updateHUD();
    startTimer();
    if (typeof window.__gameOnStart === 'function') window.__gameOnStart();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (gameState !== 'playing') return;
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        gameOver();
      }
    }, 1000);
  }

  function movePlayer(dr, dc) {
    if (gameState !== 'playing') return;
    const cell = maze[player.row][player.col];
    const wallNames = ['top','right','bottom','left'];
    // 0=top(dr=-1), 1=right(dc=1), 2=bottom(dr=1), 3=left(dc=-1)
    let dir = -1;
    if (dr === -1 && dc === 0) dir = 0;
    if (dr === 0 && dc === 1) dir = 1;
    if (dr === 1 && dc === 0) dir = 2;
    if (dr === 0 && dc === -1) dir = 3;
    if (dir === -1) return;

    if (!cell[wallNames[dir]]) {
      player.row += dr;
      player.col += dc;
      markExplored();
      playerTrail.push({ row: player.row, col: player.col });

      // Check gem
      gems.forEach(g => {
        if (!g.collected && g.row === player.row && g.col === player.col) {
          g.collected = true;
          score += GEM_POINTS;
          updateHUD();
        }
      });

      // Check exit
      if (player.row === exitCell.row && player.col === exitCell.col) {
        levelComplete();
      }
    }
  }

  function levelComplete() {
    const elapsed = (Date.now() - levelStartTime) / 1000;
    totalDuration += elapsed;
    const timeBonus = Math.floor(timeLeft * TIME_BONUS_PER_SEC);
    const lvlBonus = LEVEL_BONUS_BASE * (level + 1);
    score += timeBonus + lvlBonus;
    updateHUD();
    gameState = 'levelComplete';
    clearInterval(timerInterval);

    level++;
    if (level >= LEVEL_SIZES.length) {
      // All levels done
      gameOver(true);
    } else {
      setTimeout(() => {
        initLevel();
        gameState = 'playing';
        startTimer();
      }, 1500);
    }
  }

  function gameOver(won) {
    gameState = 'gameover';
    clearInterval(timerInterval);
    const elapsed = (Date.now() - levelStartTime) / 1000;
    totalDuration += elapsed;

    // Save best score
    const bestKey = 'maze-escape_best';
    const prev = parseInt(localStorage.getItem(bestKey)) || 0;
    if (score > prev) try { localStorage.setItem(bestKey, score) } catch(e) {};

    window.__gameScore = score;
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('maze-escape', score, Math.floor(totalDuration));
    }
    if (typeof window.__gameOnGameOver === 'function') {
      window.__gameOnGameOver(score);
    }
  }

  // ── Input ──
  let _touchSwipeStart = null;

  function _onKeyDown(e) {
    if (gameState === 'start') { startGame(); return; }
    if (gameState === 'gameover') {
      if (e.key === 'Enter' || e.key === ' ') { startGame(); }
      return;
    }
    if (gameState !== 'playing') return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': movePlayer(-1, 0); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': movePlayer(1, 0); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': movePlayer(0, -1); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': movePlayer(0, 1); e.preventDefault(); break;
    }
  }

  function _onTouchStart(e) {
    if (gameState === 'start') { startGame(); return; }
    if (gameState === 'gameover') { startGame(); return; }
    const t = e.touches[0];
    _touchSwipeStart = { x: t.clientX, y: t.clientY };
  }

  function _onTouchEnd(e) {
    if (!_touchSwipeStart || gameState !== 'playing') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - _touchSwipeStart.x;
    const dy = t.clientY - _touchSwipeStart.y;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) {
      movePlayer(0, dx > 0 ? 1 : -1);
    } else {
      movePlayer(dy > 0 ? 1 : -1, 0);
    }
    _touchSwipeStart = null;
  }

  function setupInput() {
    document.addEventListener('keydown', _onKeyDown);

    // Touch swipe
    canvas.addEventListener('touchstart', _onTouchStart, { passive: true });
    canvas.addEventListener('touchend', _onTouchEnd, { passive: true });
  }

  // Cleanup
  window.addEventListener('game-cleanup', function () {
    if (animFrame) cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', _onKeyDown);
    canvas.removeEventListener('touchstart', _onTouchStart);
    canvas.removeEventListener('touchend', _onTouchEnd);
    window.removeEventListener('resize', resizeCanvas);
  });

  // ── Game loop ──
  function loop() {
    animFrame = requestAnimationFrame(loop);
    if (gameState === 'playing') {
      draw();
    } else if (gameState === 'start') {
      drawOverlay('MAZE ESCAPE', 'Find the exit!', ['Arrow keys or swipe to move', 'Collect gems for bonus points', 'Press any key to start', '', `Best: ${localStorage.getItem('maze-escape_best') || 0}`]);
    } else if (gameState === 'levelComplete') {
      drawOverlay('LEVEL COMPLETE!', `Score: ${score}`, ['Generating next maze...']);
    } else if (gameState === 'gameover') {
      const won = level >= LEVEL_SIZES.length;
      drawOverlay(won ? 'YOU WIN!' : 'GAME OVER', `Final Score: ${score}`, [`Levels completed: ${level}`, 'Press Enter to play again']);
    }
  }

  // ── Init ──
  function init() {
    initCanvas();
    setupInput();
    gameState = 'start';
    loop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
