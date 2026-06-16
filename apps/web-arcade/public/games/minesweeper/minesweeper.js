1|(function () {
2|  'use strict';
3|
4|  const BG = '#0a0614';
5|  const CELL_HIDDEN = '#3a3a4a';
6|  const CELL_REVEALED = '#1a1625';
7|  const CELL_HOVER = '#4a4a5a';
8|  const BORDER = '#2a2a3a';
9|  const FLAG_COLOR = '#ef4444';
10|  const MINE_COLOR = '#ef4444';
11|  const NUMBER_COLORS = [null, '#3b82f6', '#22c55e', '#ef4444', '#1e3a8a', '#7f1d1d', '#0d9488', '#000000', '#6b7280'];
12|  const NUMBER_STROKE = [null, null, null, null, null, null, null, '#ffffff', null];
13|
14|  const DIFFICULTIES = {
15|    beginner: { cols: 9, rows: 9, mines: 10 },
16|    intermediate: { cols: 16, rows: 16, mines: 40 },
17|    expert: { cols: 30, rows: 16, mines: 99 }
18|  };
19|
20|  let canvas, ctx;
21|  let difficulty = 'beginner';
22|  let grid, rows, cols, totalMines;
23|  let cellSize, offsetX, offsetY;
24|  let revealed, flagged, mines, numbers;
25|  let gameState; // 'idle', 'playing', 'won', 'lost'
26|  let firstClick;
27|  let timer, startTime, elapsed;
28|  let score;
29|  let hoverCell = null;
30|  let touchTimer = null;
31|  let touchStartPos = null;
32|  let longPressTriggered = false;
33|
34|  function init() {
35|    canvas = document.getElementById('game-canvas');
36|    if (!canvas) {
37|      canvas = document.createElement('canvas');
38|      canvas.id = 'game-canvas';
39|      document.body.appendChild(canvas);
40|    }
41|    ctx = canvas.getContext('2d');
42|
43|    canvas.addEventListener('click', onClick);
44|    canvas.addEventListener('contextmenu', onRightClick);
45|    canvas.addEventListener('mousemove', onMouseMove);
46|    canvas.addEventListener('mouseleave', () => { hoverCell = null; draw(); });
47|
48|    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
49|    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
50|    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
51|
52|    window.addEventListener('resize', resize);
53|
54|    // Listen for START_GAME message from arcade-shell
55|    window.addEventListener('message', onMessage);
56|
57|    // Show idle state (blank canvas) until difficulty is selected
58|    gameState = 'idle';
59|    resize();
60|    draw();
61|
62|    // Signal ready to parent GameModal
63|    try {
64|      window.parent.postMessage({ type: 'FUZZY_GAME_READY' }, '*');
65|    } catch (e) { /* noop */ }
66|  }
67|
68|  function onMessage(e) {
69|    if (!e.data || typeof e.data !== 'object') return;
70|    if (e.data.action === 'START_GAME' && e.data.difficulty) {
71|      if (DIFFICULTIES[e.data.difficulty]) {
72|        difficulty = e.data.difficulty;
73|        startNewGame();
74|      }
75|    }
76|  }
77|
78|  function startNewGame() {
79|    resetGame();
80|    resize();
81|    gameState = 'playing';
82|    draw();
83|  }
84|
85|  function resetGame() {
86|    const d = DIFFICULTIES[difficulty];
87|    rows = d.rows;
88|    cols = d.cols;
89|    totalMines = d.mines;
90|    grid = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
91|    revealed = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
92|    flagged = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
93|    mines = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
94|    numbers = new Array(rows).fill(null).map(() => new Array(cols).fill(0));
95|    gameState = 'playing';
96|    firstClick = true;
97|    timer = null;
98|    startTime = 0;
99|    elapsed = 0;
100|    score = 0;
101|    window.__gameScore = 0;
102|  }
103|
104|  function resize() {
105|    const container = canvas.parentElement || document.body;
106|    const style = getComputedStyle(container);
107|    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
108|    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
109|    const maxW = (container.clientWidth || window.innerWidth || 800) - padX - 16;
110|    const maxH = (container.clientHeight || window.innerHeight || 600) - padY - 16;
111|
112|    if (gameState === 'idle') {
113|      // Just size canvas to fill container
114|      canvas.width = maxW;
115|      canvas.height = maxH;
116|      cellSize = 32;
117|      offsetX = 1;
118|      offsetY = 1;
119|      draw();
120|      return;
121|    }
122|
123|    // Compute cellSize from viewport, clamped to touch-friendly range
124|    cellSize = Math.floor(Math.min(maxW / cols, maxH / rows, 40));
125|    cellSize = Math.max(cellSize, 24);
126|
127|    const w = cols * cellSize + 2;
128|    const h = rows * cellSize + 2;
129|    canvas.width = w;
130|    canvas.height = h;
131|    canvas.style.width = w + 'px';
132|    canvas.style.height = h + 'px';
133|    offsetX = 1;
134|    offsetY = 1;
135|    draw();
136|  }
137|
138|  function placeMines(safeRow, safeCol) {
139|    let placed = 0;
140|    while (placed < totalMines) {
141|      const r = Math.floor(Math.random() * rows);
142|      const c = Math.floor(Math.random() * cols);
143|      if (mines[r][c]) continue;
144|      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
145|      mines[r][c] = true;
146|      placed++;
147|    }
148|    // If total cells near safe click cover most of grid, relax constraint
149|    if (totalMines > rows * cols * 0.5) {
150|      mines = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
151|      placed = 0;
152|      while (placed < totalMines) {
153|        const r = Math.floor(Math.random() * rows);
154|        const c = Math.floor(Math.random() * cols);
155|        if (r === safeRow && c === safeCol) continue;
156|        if (mines[r][c]) continue;
157|        mines[r][c] = true;
158|        placed++;
159|      }
160|    }
161|    // Compute numbers
162|    for (let r = 0; r < rows; r++) {
163|      for (let c = 0; c < cols; c++) {
164|        if (mines[r][c]) { numbers[r][c] = -1; continue; }
165|        let count = 0;
166|        forNeighbors(r, c, (nr, nc) => { if (mines[nr][nc]) count++; });
167|        numbers[r][c] = count;
168|      }
169|    }
170|  }
171|
172|  function forNeighbors(r, c, fn) {
173|    for (let dr = -1; dr <= 1; dr++) {
174|      for (let dc = -1; dc <= 1; dc++) {
175|        if (dr === 0 && dc === 0) continue;
176|        const nr = r + dr, nc = c + dc;
177|        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
178|      }
179|    }
180|  }
181|
182|  function revealCell(r, c) {
183|    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
184|    if (revealed[r][c] || flagged[r][c]) return;
185|    revealed[r][c] = true;
186|    if (numbers[r][c] === 0) {
187|      forNeighbors(r, c, (nr, nc) => revealCell(nr, nc));
188|    }
189|  }
190|
191|  function checkWin() {
192|    for (let r = 0; r < rows; r++) {
193|      for (let c = 0; c < cols; c++) {
194|        if (!mines[r][c] && !revealed[r][c]) return false;
195|      }
196|    }
197|    return true;
198|  }
199|
200|  function gameOver(won) {
201|    gameState = won ? 'won' : 'lost';
202|    clearInterval(timer);
203|    elapsed = Math.floor((Date.now() - startTime) / 1000);
204|
205|    if (won) {
206|      // Reveal all mines as flagged
207|      for (let r = 0; r < rows; r++)
208|        for (let c = 0; c < cols; c++)
209|          if (mines[r][c]) flagged[r][c] = true;
210|
211|      const timeBonus = Math.max(0, 10000 - elapsed * 50);
212|      const mineBonus = totalMines * 100;
213|      score = timeBonus + mineBonus;
214|    } else {
215|      // Reveal all mines
216|      for (let r = 0; r < rows; r++)
217|        for (let c = 0; c < cols; c++)
218|          if (mines[r][c]) revealed[r][c] = true;
219|      score = 0;
220|    }
221|
222|    window.__gameScore = score;
223|    updateScoreDisplay();
224|
225|    const bestKey = 'minesweeper_best';
226|    const best = parseInt(localStorage.getItem(bestKey) || '0');
227|    if (score > best) localStorage.setItem(bestKey, score.toString());
228|
229|    draw();
230|
231|    setTimeout(() => {
232|      if (typeof FuzzyScoreSubmit === 'function') {
233|        FuzzyScoreSubmit('minesweeper', score, elapsed);
234|      }
235|      showGameOverScreen(won);
236|    }, won ? 500 : 1000);
237|  }
238|
239|  function updateScoreDisplay() {
240|    const el = document.getElementById('score-display');
241|    if (el) el.textContent = score;
242|  }
243|
244|  // --- Input ---
245|
246|  function getCell(e) {
247|    const rect = canvas.getBoundingClientRect();
248|    const x = (e.clientX - rect.left) - offsetX;
249|    const y = (e.clientY - rect.top) - offsetY;
250|    const c = Math.floor(x / cellSize);
251|    const r = Math.floor(y / cellSize);
252|    if (r >= 0 && r < rows && c >= 0 && c < cols) return { r, c };
253|    return null;
254|  }
255|
256|  function onClick(e) {
257|    if (gameState !== 'playing') return;
258|    const cell = getCell(e);
259|    if (!cell) return;
260|    if (flagged[cell.r][cell.c]) return;
261|    if (revealed[cell.r][cell.c]) return;
262|
263|    if (firstClick) {
264|      firstClick = false;
265|      placeMines(cell.r, cell.c);
266|      startTime = Date.now();
267|      timer = setInterval(() => {
268|        elapsed = Math.floor((Date.now() - startTime) / 1000);
269|        draw();
270|      }, 200);
271|    }
272|
273|    if (mines[cell.r][cell.c]) {
274|      gameOver(false);
275|      return;
276|    }
277|
278|    revealCell(cell.r, cell.c);
279|    if (checkWin()) gameOver(true);
280|    draw();
281|  }
282|
283|  function onRightClick(e) {
284|    e.preventDefault();
285|    if (gameState !== 'playing') return;
286|    const cell = getCell(e);
287|    if (!cell) return;
288|    if (revealed[cell.r][cell.c]) return;
289|    flagged[cell.r][cell.c] = !flagged[cell.r][cell.c];
290|    draw();
291|  }
292|
293|  function onMouseMove(e) {
294|    const cell = getCell(e);
295|    hoverCell = cell;
296|    draw();
297|  }
298|
299|  // --- Touch ---
300|
301|  function onTouchStart(e) {
302|    e.preventDefault();
303|    if (e.touches.length !== 1) return;
304|    const touch = e.touches[0];
305|    touchStartPos = { x: touch.clientX, y: touch.clientY };
306|    longPressTriggered = false;
307|    const cell = getCell(touch);
308|    if (!cell) return;
309|
310|    touchTimer = setTimeout(() => {
311|      longPressTriggered = true;
312|      if (gameState === 'playing' && !revealed[cell.r][cell.c]) {
313|        flagged[cell.r][cell.c] = !flagged[cell.r][cell.c];
314|        draw();
315|      }
316|    }, 500);
317|  }
318|
319|  function onTouchMove(e) {
320|    e.preventDefault();
321|    if (touchStartPos && e.touches.length === 1) {
322|      const touch = e.touches[0];
323|      const dx = touch.clientX - touchStartPos.x;
324|      const dy = touch.clientY - touchStartPos.y;
325|      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
326|        clearTimeout(touchTimer);
327|      }
328|    }
329|  }
330|
331|  function onTouchEnd(e) {
332|    e.preventDefault();
333|    clearTimeout(touchTimer);
334|    if (longPressTriggered) return;
335|    if (e.changedTouches.length !== 1) return;
336|    const touch = e.changedTouches[0];
337|    // Simulate click
338|    onClick({ clientX: touch.clientX, clientY: touch.clientY });
339|  }
340|
341|  // --- Drawing ---
342|
343|  function draw() {
344|    ctx.fillStyle = BG;
345|    ctx.fillRect(0, 0, canvas.width, canvas.height);
346|
347|    if (gameState === 'idle') {
348|      // Show waiting message
349|      ctx.fillStyle = '#6b7280';
350|      ctx.font = '16px sans-serif';
351|      ctx.textAlign = 'center';
352|      ctx.textBaseline = 'middle';
353|      ctx.fillText('Select a difficulty to begin', canvas.width / 2, canvas.height / 2);
354|      return;
355|    }
356|
357|    for (let r = 0; r < rows; r++) {
358|      for (let c = 0; c < cols; c++) {
359|        const x = offsetX + c * cellSize;
360|        const y = offsetY + r * cellSize;
361|        const s = cellSize - 1;
362|
363|        if (revealed[r][c]) {
364|          ctx.fillStyle = CELL_REVEALED;
365|          ctx.fillRect(x, y, s, s);
366|
367|          if (mines[r][c]) {
368|            // Draw mine
369|            ctx.fillStyle = MINE_COLOR;
370|            ctx.beginPath();
371|            ctx.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
372|            ctx.fill();
373|            // Spikes
374|            ctx.strokeStyle = MINE_COLOR;
375|            ctx.lineWidth = 2;
376|            for (let a = 0; a < 4; a++) {
377|              const angle = (a * Math.PI) / 4;
378|              ctx.beginPath();
379|              ctx.moveTo(x + s / 2 + Math.cos(angle) * s * 0.15, y + s / 2 + Math.sin(angle) * s * 0.15);
380|              ctx.lineTo(x + s / 2 + Math.cos(angle) * s * 0.4, y + s / 2 + Math.sin(angle) * s * 0.4);
381|              ctx.stroke();
382|            }
383|          } else if (numbers[r][c] > 0) {
384|            const num = numbers[r][c];
385|            ctx.fillStyle = NUMBER_COLORS[num] || '#ffffff';
386|            ctx.font = `bold ${Math.floor(cellSize * 0.6)}px monospace`;
387|            ctx.textAlign = 'center';
388|            ctx.textBaseline = 'middle';
389|            if (NUMBER_STROKE[num]) {
390|              ctx.strokeStyle = NUMBER_STROKE[num];
391|              ctx.lineWidth = 1;
392|              ctx.strokeText(num, x + s / 2, y + s / 2);
393|            }
394|            ctx.fillText(num, x + s / 2, y + s / 2 + 1);
395|          }
396|        } else {
397|          const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;
398|          ctx.fillStyle = isHover ? CELL_HOVER : CELL_HIDDEN;
399|          ctx.fillRect(x, y, s, s);
400|
401|          // 3D effect
402|          ctx.fillStyle = 'rgba(255,255,255,0.08)';
403|          ctx.fillRect(x, y, s, 2);
404|          ctx.fillRect(x, y, 2, s);
405|          ctx.fillStyle = 'rgba(0,0,0,0.2)';
406|          ctx.fillRect(x + s - 2, y, 2, s);
407|          ctx.fillRect(x, y + s - 2, s, 2);
408|
409|          if (flagged[r][c]) {
410|            ctx.fillStyle = FLAG_COLOR;
411|            ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
412|            ctx.textAlign = 'center';
413|            ctx.textBaseline = 'middle';
414|            ctx.fillText('🚩', x + s / 2, y + s / 2 + 1);
415|          }
416|        }
417|      }
418|    }
419|
420|    // HUD info drawn on canvas top bar if space allows
421|    if (gameState === 'playing' && !firstClick) {
422|      ctx.fillStyle = 'rgba(10,6,20,0.7)';
423|      ctx.fillRect(0, 0, canvas.width, 20);
424|      ctx.fillStyle = '#ffffff';
425|      ctx.font = '12px monospace';
426|      ctx.textAlign = 'left';
427|      ctx.fillText(`⏱ ${elapsed}s`, 8, 14);
428|      const flagCount = flagged.flat().filter(Boolean).length;
429|      ctx.textAlign = 'right';
430|      ctx.fillText(`💣 ${totalMines - flagCount}`, canvas.width - 8, 14);
431|    }
432|  }
433|
434|  // --- Game Over Screen ---
435|
436|  function showGameOverScreen(won) {
437|    let best = 0;
    try { best = parseInt(localStorage.getItem('minesweeper_best') || '0'); } catch (e) { /* storage blocked */ }
438|
439|    ctx.fillStyle = 'rgba(10,6,20,0.85)';
440|    ctx.fillRect(0, 0, canvas.width, canvas.height);
441|
442|    ctx.fillStyle = won ? '#22c55e' : '#ef4444';
443|    ctx.font = `bold ${Math.floor(cellSize * 0.9)}px sans-serif`;
444|    ctx.textAlign = 'center';
445|    ctx.fillText(won ? '🎉 YOU WIN!' : '💥 GAME OVER', canvas.width / 2, canvas.height / 2 - 70);
446|
447|    ctx.fillStyle = '#ffffff';
448|    ctx.font = '16px monospace';
449|    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 20);
450|    ctx.fillText(`Time: ${elapsed}s`, canvas.width / 2, canvas.height / 2 + 10);
451|    ctx.fillText(`Best: ${best}`, canvas.width / 2, canvas.height / 2 + 40);
452|
453|    // Play again button
454|    const bx = canvas.width / 2 - 80;
455|    const by = canvas.height / 2 + 70;
456|    const bw = 160, bh = 36;
457|    ctx.fillStyle = '#ef4444';
458|    ctx.fillRect(bx, by, bw, bh);
459|    ctx.fillStyle = '#ffffff';
460|    ctx.font = 'bold 16px sans-serif';
461|    ctx.fillText('Play Again', canvas.width / 2, by + bh / 2);
462|
463|    // Overlay the game-over HTML div
464|    const goOverlay = document.getElementById('game-over');
465|    const finalScoreEl = document.getElementById('final-score');
466|    const newBestEl = document.getElementById('new-best');
467|    if (goOverlay) {
468|      if (finalScoreEl) finalScoreEl.textContent = score;
469|      if (newBestEl) {
470|        if (score > best && score > 0) {
471|          newBestEl.classList.remove('hidden');
472|        } else {
473|          newBestEl.classList.add('hidden');
474|        }
475|      }
476|      goOverlay.classList.remove('hidden');
477|    }
478|
479|    // Wire restart button
480|    const restartBtn = document.getElementById('restart-btn');
481|    if (restartBtn) {
482|      restartBtn.addEventListener('pointerdown', function onRestart() {
483|        restartBtn.removeEventListener('pointerdown', onRestart);
484|        if (goOverlay) goOverlay.classList.add('hidden');
485|        // Show start screen again (go back to idle, user picks difficulty)
486|        gameState = 'idle';
487|        resize();
488|        draw();
489|        // Show the start screen overlay again
490|        const startScreen = document.getElementById('start-screen');
491|        if (startScreen) {
492|          startScreen.classList.remove('hidden');
493|          startScreen.style.display = '';
494|        }
495|      }, { once: true });
496|    }
497|  }
498|
499|  // --- Bootstrap ---
500|  if (document.readyState === 'loading') {
501|