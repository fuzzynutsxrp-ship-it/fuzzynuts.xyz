(function () {
  'use strict';

  const BG = '#0a0614';
  const CELL_HIDDEN = '#3a3a4a';
  const CELL_REVEALED = '#1a1625';
  const CELL_HOVER = '#4a4a5a';
  const BORDER = '#2a2a3a';
  const FLAG_COLOR = '#ef4444';
  const MINE_COLOR = '#ef4444';
  const NUMBER_COLORS = [null, '#3b82f6', '#22c55e', '#ef4444', '#1e3a8a', '#7f1d1d', '#0d9488', '#000000', '#6b7280'];
  const NUMBER_STROKE = [null, null, null, null, null, null, null, '#ffffff', null];

  const DIFFICULTIES = {
    beginner: { cols: 9, rows: 9, mines: 10 },
    intermediate: { cols: 16, rows: 16, mines: 40 },
    expert: { cols: 30, rows: 16, mines: 99 }
  };

  let canvas, ctx;
  let difficulty = 'beginner';
  let grid, rows, cols, totalMines;
  let cellSize, offsetX, offsetY;
  let revealed, flagged, mines, numbers;
  let gameState; // 'start', 'playing', 'won', 'lost'
  let firstClick;
  let timer, startTime, elapsed;
  let score;
  let hoverCell = null;
  let touchTimer = null;
  let touchStartPos = null;
  let longPressTriggered = false;

  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onRightClick);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', () => { hoverCell = null; draw(); });

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

  canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); }

    resetGame();
    resize();
    showStartScreen();
  }

  function resetGame() {
    const d = DIFFICULTIES[difficulty];
    rows = d.rows;
    cols = d.cols;
    totalMines = d.mines;
    grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
    revealed = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
    flagged = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
    mines = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
    numbers = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
    gameState = 'start';
    firstClick = true;
    timer = null;
    startTime = 0;
    elapsed = 0;
    score = 0;
    window.__gameScore = 0;
  }

  function resize() {
    const maxW = Math.min(window.innerWidth || 800, 1200);
    const maxH = Math.min(window.innerHeight || 600, 800) - 60;

    cellSize = Math.floor(Math.min(maxW / cols, maxH / rows, 40));
    cellSize = Math.max(cellSize, 16);

    const w = cols * cellSize + 2;
    const h = rows * cellSize + 2;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    offsetX = 1;
    offsetY = 1;
    draw();
  }

  function placeMines(safeRow, safeCol) {
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (mines[r][c]) continue;
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      mines[r][c] = true;
      placed++;
    }
    // If total cells near safe click cover most of grid, relax constraint
    if (totalMines > rows * cols * 0.5) {
      mines = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
      placed = 0;
      while (placed < totalMines) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (r === safeRow && c === safeCol) continue;
        if (mines[r][c]) continue;
        mines[r][c] = true;
        placed++;
      }
    }
    // Compute numbers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mines[r][c]) { numbers[r][c] = -1; continue; }
        let count = 0;
        forNeighbors(r, c, (nr, nc) => { if (mines[nr][nc]) count++; });
        numbers[r][c] = count;
      }
    }
  }

  function forNeighbors(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
      }
    }
  }

  function revealCell(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (numbers[r][c] === 0) {
      forNeighbors(r, c, (nr, nc) => revealCell(nr, nc));
    }
  }

  function checkWin() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!mines[r][c] && !revealed[r][c]) return false;
      }
    }
    return true;
  }

  function gameOver(won) {
    gameState = won ? 'won' : 'lost';
    clearInterval(timer);
    elapsed = Math.floor((Date.now() - startTime) / 1000);

    if (won) {
      // Reveal all mines as flagged
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (mines[r][c]) flagged[r][c] = true;

      const timeBonus = Math.max(0, 10000 - elapsed * 50);
      const mineBonus = totalMines * 100;
      score = timeBonus + mineBonus;
    } else {
      // Reveal all mines
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (mines[r][c]) revealed[r][c] = true;
      score = 0;
    }

    window.__gameScore = score;
    updateScoreDisplay();

    const bestKey = 'minesweeper_best';
    const best = parseInt(localStorage.getItem(bestKey) || '0');
    if (score > best) localStorage.setItem(bestKey, score.toString());

    draw();

    setTimeout(() => {
      if (typeof FuzzyScoreSubmit === 'function') {
        FuzzyScoreSubmit('minesweeper', score, elapsed);
      }
      showGameOverScreen(won);
    }, won ? 500 : 1000);
  }

  function updateScoreDisplay() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = score;
  }

  // --- Input ---

  function getCell(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) - offsetX;
    const y = (e.clientY - rect.top) - offsetY;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) return { r, c };
    return null;
  }

  function onClick(e) {
    const cell = getCell(e);
    if (!cell) return;
    if (gameState === 'start') {
      startGame(cell.r, cell.c);
    }
    if (gameState !== 'playing') return;
    if (flagged[cell.r][cell.c]) return;
    if (revealed[cell.r][cell.c]) return;

    if (firstClick) {
      firstClick = false;
      placeMines(cell.r, cell.c);
      startTime = Date.now();
      timer = setInterval(() => {
        elapsed = Math.floor((Date.now() - startTime) / 1000);
        draw();
      }, 200);
    }

    if (mines[cell.r][cell.c]) {
      gameOver(false);
      return;
    }

    revealCell(cell.r, cell.c);
    if (checkWin()) gameOver(true);
    draw();
  }

  function onRightClick(e) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const cell = getCell(e);
    if (!cell) return;
    if (revealed[cell.r][cell.c]) return;
    flagged[cell.r][cell.c] = !flagged[cell.r][cell.c];
    draw();
  }

  function onMouseMove(e) {
    const cell = getCell(e);
    hoverCell = cell;
    draw();
  }

  // --- Touch ---

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPos = { x: touch.clientX, y: touch.clientY };
    longPressTriggered = false;
    const cell = getCell(touch);
    if (!cell) return;

    touchTimer = setTimeout(() => {
      longPressTriggered = true;
      if (gameState === 'playing' && !revealed[cell.r][cell.c]) {
        flagged[cell.r][cell.c] = !flagged[cell.r][cell.c];
        draw();
      }
    }, 500);
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (touchStartPos && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(touchTimer);
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    clearTimeout(touchTimer);
    if (longPressTriggered) return;
    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    // Simulate click
    onClick({ clientX: touch.clientX, clientY: touch.clientY });
  }

  // --- Drawing ---

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'start') return; // start screen overlay handles it

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const s = cellSize - 1;

        if (revealed[r][c]) {
          ctx.fillStyle = CELL_REVEALED;
          ctx.fillRect(x, y, s, s);

          if (mines[r][c]) {
            // Draw mine
            ctx.fillStyle = MINE_COLOR;
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Spikes
            ctx.strokeStyle = MINE_COLOR;
            ctx.lineWidth = 2;
            for (let a = 0; a < 4; a++) {
              const angle = (a * Math.PI) / 4;
              ctx.beginPath();
              ctx.moveTo(x + s / 2 + Math.cos(angle) * s * 0.15, y + s / 2 + Math.sin(angle) * s * 0.15);
              ctx.lineTo(x + s / 2 + Math.cos(angle) * s * 0.4, y + s / 2 + Math.sin(angle) * s * 0.4);
              ctx.stroke();
            }
          } else if (numbers[r][c] > 0) {
            const num = numbers[r][c];
            ctx.fillStyle = NUMBER_COLORS[num] || '#ffffff';
            ctx.font = `bold ${Math.floor(cellSize * 0.6)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (NUMBER_STROKE[num]) {
              ctx.strokeStyle = NUMBER_STROKE[num];
              ctx.lineWidth = 1;
              ctx.strokeText(num, x + s / 2, y + s / 2);
            }
            ctx.fillText(num, x + s / 2, y + s / 2 + 1);
          }
        } else {
          const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;
          ctx.fillStyle = isHover ? CELL_HOVER : CELL_HIDDEN;
          ctx.fillRect(x, y, s, s);

          // 3D effect
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, s, 2);
          ctx.fillRect(x, y, 2, s);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + s - 2, y, 2, s);
          ctx.fillRect(x, y + s - 2, s, 2);

          if (flagged[r][c]) {
            ctx.fillStyle = FLAG_COLOR;
            ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚩', x + s / 2, y + s / 2 + 1);
          }
        }
      }
    }

    // HUD info drawn on canvas top bar if space allows
    if (gameState === 'playing' && !firstClick) {
      ctx.fillStyle = 'rgba(10,6,20,0.7)';
      ctx.fillRect(0, 0, canvas.width, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`⏱ ${elapsed}s`, 8, 14);
      const flagCount = flagged.flat().filter(Boolean).length;
      ctx.textAlign = 'right';
      ctx.fillText(`💣 ${totalMines - flagCount}`, canvas.width - 8, 14);
    }
  }

  // --- Screens ---

  function showStartScreen() {
    gameState = 'start';
    draw();
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(cellSize * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣 MINESWEEPER', canvas.width / 2, canvas.height / 2 - 60);

    const btns = [
      { label: 'Beginner 9×9', key: 'beginner' },
      { label: 'Intermediate 16×16', key: 'intermediate' },
      { label: 'Expert 30×16', key: 'expert' }
    ];

    btns.forEach((btn, i) => {
      const bx = canvas.width / 2 - 90;
      const by = canvas.height / 2 - 10 + i * 40;
      const bw = 180, bh = 32;

      const isHover = hoverCell && hoverCell._btn === i;
      ctx.fillStyle = isHover ? '#ef4444' : '#3a3a4a';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(btn.label, canvas.width / 2, by + bh / 2);

      // Store button bounds for click detection
      btn._x = bx; btn._y = by; btn._w = bw; btn._h = bh;
    });

    // Override click for start screen
    canvas.onclick = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = e.clientY - rect.top;
      for (const btn of btns) {
        if (mx >= btn._x && mx <= btn._x + btn._w && my >= btn._y && my <= btn._y + btn._h) {
          difficulty = btn.key;
          canvas.onclick = null; // restore normal handler
          resetGame();
          resize();
          gameState = 'playing';
          draw();
          // Re-attach normal listeners
          canvas.addEventListener('click', onClick);
          return;
        }
      }
    };
  }

  function showGameOverScreen(won) {
    const best = parseInt(localStorage.getItem('minesweeper_best') || '0');

    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = won ? '#22c55e' : '#ef4444';
    ctx.font = `bold ${Math.floor(cellSize * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(won ? '🎉 YOU WIN!' : '💥 GAME OVER', canvas.width / 2, canvas.height / 2 - 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`Time: ${elapsed}s`, canvas.width / 2, canvas.height / 2 + 10);
    ctx.fillText(`Best: ${best}`, canvas.width / 2, canvas.height / 2 + 40);

    // Play again button
    const bx = canvas.width / 2 - 80;
    const by = canvas.height / 2 + 70;
    const bw = 160, bh = 36;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Play Again', canvas.width / 2, by + bh / 2);

    canvas.onclick = function (e) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = e.clientY - rect.top;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        canvas.onclick = null;
        resetGame();
        resize();
        showStartScreen();
      }
    };
  }

  // --- Bootstrap ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
