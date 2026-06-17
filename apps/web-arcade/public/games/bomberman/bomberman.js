(function() {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const COLS = 13;
  const ROWS = 11;
  const TILE_EMPTY = 0;
  const TILE_WALL = 1;       // indestructible
  const TILE_DESTRUCT = 2;   // destructible
  const BG_COLOR = '#0a0614';
  const PLAYER_COLOR = '#f97316';
  const ENEMY_COLOR = '#ef4444';
  const WALL_COLOR = '#6b7280';
  const DESTRUCT_COLOR = '#92400e';
  const BOMB_COLOR = '#1e1b4b';
  const BOMB_FUSE_COLOR = '#f97316';
  const EXPLOSION_COLOR = '#f59e0b';
  const POWERUP_COLORS = {
    bomb: '#3b82f6',
    flame: '#ef4444',
    speed: '#22c55e',
    shield: '#a855f7'
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let canvas, ctx, tileW, tileH;
  let grid = [];
  let player, enemies, bombs, explosions, powerups;
  let score, lives, level, bestScore;
  let gameRunning = false;
  let gamePaused = false;
  let animFrame = null;
  let lastTime = 0;
  let startTime = 0;
  let shieldTimer = 0;
  let touchStart = null;
  let touchMoved = false;
  let waitStartRef = null;  // stored for destroy() cleanup

  // ── Grid helpers ───────────────────────────────────────────────────────────
  function isFixedWall(c, r) {
    if (c <= 0 || c >= COLS - 1 || r <= 0 || r >= ROWS - 1) return true;
    return c % 2 === 0 && r % 2 === 0;
  }

  function buildGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        if (isFixedWall(c, r)) {
          grid[r][c] = TILE_WALL;
        } else {
          grid[r][c] = TILE_EMPTY;
        }
      }
    }
  }

  function placeDestructibleWalls() {
    // Leave safe zone around player start (top-left)
    const safe = [[1,1],[2,1],[1,2]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== TILE_EMPTY) continue;
        if (safe.some(s => s[0] === c && s[1] === r)) continue;
        if (Math.random() < 0.55) {
          grid[r][c] = TILE_DESTRUCT;
        }
      }
    }
  }

  function cellPassable(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    return grid[r][c] === TILE_EMPTY;
  }

  function hasBomb(c, r) {
    return bombs.some(b => b.col === c && b.row === r);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    const container = canvas.parentElement || document.body;
    let maxW = container.clientWidth || 800;
    if (maxW < 100) maxW = (window.innerWidth || 800) - 16;
    let maxH = container.clientHeight || 600;
    if (maxH < 100) maxH = (window.innerHeight || 600) - 16;
    tileW = Math.floor(maxW / COLS);
    tileH = Math.floor(maxH / ROWS);
    const t = Math.min(tileW, tileH);
    tileW = tileH = t;
    canvas.width = tileW * COLS;
    canvas.height = tileH * ROWS;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  function updateHUD() {
    window.__gameScore = score;
    const se = document.getElementById('score-display');
    if (se) se.textContent = 'Score: ' + score;
    const le = document.getElementById('lives-display');
    if (le) le.textContent = 'Lives: ' + lives;
    const lv = document.getElementById('level-display');
    if (lv) lv.textContent = 'Level: ' + level;
  }

  // ── Entity constructors ────────────────────────────────────────────────────
  function makePlayer() {
    return {
      col: 1, row: 1,
      x: 1, y: 1,   // smooth position (tile units)
      maxBombs: 1,
      activeBombs: 0,
      flameSize: 1,
      speed: 4,      // tiles per second
      moveTimer: 0,
      alive: true
    };
  }

  function makeEnemy(c, r) {
    return {
      col: c, row: r,
      x: c, y: r,
      speed: 1.5 + level * 0.2,
      dir: Math.floor(Math.random() * 4),
      moveTimer: 0,
      alive: true
    };
  }

  // ── Level setup ────────────────────────────────────────────────────────────
  function spawnEnemies() {
    enemies = [];
    const count = Math.min(3 + level, 12);
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < 500) {
      attempts++;
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      const r = 1 + Math.floor(Math.random() * (ROWS - 2));
      if (grid[r][c] !== TILE_EMPTY) continue;
      if (c <= 2 && r <= 2) continue; // keep away from player start
      if (enemies.some(e => e.col === c && e.row === r)) continue;
      enemies.push(makeEnemy(c, r));
      placed++;
    }
  }

  function initLevel() {
    buildGrid();
    placeDestructibleWalls();
    player = makePlayer();
    bombs = [];
    explosions = [];
    powerups = [];
    shieldTimer = 0;
    spawnEnemies();
    updateHUD();
  }

  // ── Bomb logic ─────────────────────────────────────────────────────────────
  function placeBomb() {
    if (player.activeBombs >= player.maxBombs) return;
    const bc = Math.round(player.x);
    const br = Math.round(player.y);
    if (hasBomb(bc, br)) return;
    bombs.push({
      col: bc, row: br,
      timer: 3,
      flameSize: player.flameSize,
      owner: 'player'
    });
    player.activeBombs++;
  }

  function explodeBomb(bomb) {
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    // Center cell
    addExplosion(bomb.col, bomb.row);

    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= bomb.flameSize; i++) {
        const nc = bomb.col + dx * i;
        const nr = bomb.row + dy * i;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
        if (grid[nr][nc] === TILE_WALL) break;
        if (grid[nr][nc] === TILE_DESTRUCT) {
          grid[nr][nc] = TILE_EMPTY;
          addExplosion(nc, nr);
          score += 10;
          maybeDropPowerup(nc, nr);
          break;
        }
        addExplosion(nc, nr);
        // Chain reaction: trigger other bombs
        const chained = bombs.find(b => b.col === nc && b.row === nr && b !== bomb);
        if (chained) {
          chained.timer = 0;
        }
      }
    }

    // Remove bomb (use findIndex to avoid stale reference after chaining)
    const idx = bombs.indexOf(bomb);
    if (idx !== -1) bombs.splice(idx, 1);
    player.activeBombs = Math.max(0, player.activeBombs - 1);
  }

  function addExplosion(c, r) {
    explosions.push({ col: c, row: r, timer: 0.4 });
  }

  function maybeDropPowerup(c, r) {
    if (Math.random() > 0.25) return;
    const types = ['bomb', 'flame', 'speed', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({ col: c, row: r, type: type });
  }

  // ── Explosion check (kills player/enemies) ─────────────────────────────────
  function isExplosionAt(c, r) {
    return explosions.some(e => e.col === c && e.row === r);
  }

  function checkExplosionHits() {
    const pc = Math.round(player.x);
    const pr = Math.round(player.y);
    if (isExplosionAt(pc, pr)) {
      if (shieldTimer > 0) {
        shieldTimer = 0;
      } else {
        playerDie();
      }
    }
    for (const en of enemies) {
      if (!en.alive) continue;
      const ec = Math.round(en.x);
      const er = Math.round(en.y);
      if (isExplosionAt(ec, er)) {
        en.alive = false;
        score += 100;
      }
    }
  }

  // ── Player death ───────────────────────────────────────────────────────────
  function playerDie() {
    if (!player.alive) return;
    player.alive = false;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      // Respawn after short delay
      setTimeout(() => {
        if (!gameRunning) return;
        player = makePlayer();
        shieldTimer = 2; // brief invulnerability
      }, 800);
    }
    updateHUD();
  }

  // ── Enemy AI ───────────────────────────────────────────────────────────────
  const DIRS = [[0,-1],[0,1],[-1,0],[1,0]];

  function updateEnemies(dt) {
    for (const en of enemies) {
      if (!en.alive) continue;
      en.moveTimer -= dt;
      if (en.moveTimer <= 0) {
        en.moveTimer = 1 / en.speed;
        // Try current dir, else random new dir
        let moved = false;
        const tryDir = (d) => {
          const [dx, dy] = DIRS[d];
          const nc = en.col + dx;
          const nr = en.row + dy;
          if (cellPassable(nc, nr) && !hasBomb(nc, nr)) {
            en.col = nc;
            en.row = nr;
            return true;
          }
          return false;
        };
        moved = tryDir(en.dir);
        if (!moved) {
          // Try random directions
          const order = [0,1,2,3].sort(() => Math.random() - 0.5);
          for (const d of order) {
            if (tryDir(d)) { en.dir = d; moved = true; break; }
          }
        }
      }
      // Smooth movement
      en.x += (en.col - en.x) * Math.min(1, dt * en.speed * 3);
      en.y += (en.row - en.y) * Math.min(1, dt * en.speed * 3);

      // Check collision with player
      if (player.alive) {
        const dx = Math.abs(en.x - player.x);
        const dy = Math.abs(en.y - player.y);
        if (dx < 0.6 && dy < 0.6) {
          if (shieldTimer > 0) {
            en.alive = false;
            score += 100;
          } else {
            playerDie();
          }
        }
      }
    }
    enemies = enemies.filter(e => e.alive);
  }

  // ── Power-up collection ────────────────────────────────────────────────────
  function checkPowerups() {
    const pc = Math.round(player.x);
    const pr = Math.round(player.y);
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      if (p.col === pc && p.row === pr) {
        switch (p.type) {
          case 'bomb': player.maxBombs = Math.min(player.maxBombs + 1, 6); break;
          case 'flame': player.flameSize = Math.min(player.flameSize + 1, 8); break;
          case 'speed': player.speed = Math.min(player.speed + 1, 10); break;
          case 'shield': shieldTimer = 8; break;
        }
        powerups.splice(i, 1);
      }
    }
  }

  // ── Level completion ───────────────────────────────────────────────────────
  function checkLevelClear() {
    if (enemies.length === 0 && player.alive) {
      score += level * 200; // level completion bonus
      level++;
      initLevel();
    }
  }

  // ── Game over ──────────────────────────────────────────────────────────────
  function gameOver() {
    gameRunning = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    animFrame = null;

    // Best score
    const prev = parseInt((function(){try{return localStorage.getItem('bomberman_best')}catch(e){return null}})() || '0', 10);
    if (score > prev) try { localStorage.setItem('bomberman_best', score.toString()) } catch(e) {}
    bestScore = Math.max(score, prev);

    const duration = Math.floor((Date.now() - startTime) / 1000);
    window.__gameScore = score;

    // Submit score
    if (typeof window.FuzzyScoreSubmit === 'function') {
      try { window.FuzzyScoreSubmit('bomberman', score, duration); } catch(e) {}
    }

    updateHUD();

    // Show game-over overlay
    const finalScoreEl = document.getElementById('final-score');
    if (finalScoreEl) finalScoreEl.textContent = score;
    const newBestEl = document.getElementById('new-best');
    if (newBestEl) {
      if (score > prev) newBestEl.classList.remove('hidden');
      else newBestEl.classList.add('hidden');
    }
    const gameOverEl = document.getElementById('game-over');
    if (gameOverEl) gameOverEl.classList.remove('hidden');

    drawGameOverScreen();

    // Notify listeners (replaces monkey-patching)
    window.dispatchEvent(new Event('bomberman-game-over'));
  }

  // ── Player movement ────────────────────────────────────────────────────────
  function movePlayer(dx, dy) {
    if (!player.alive) return;
    const nc = Math.round(player.x) + dx;
    const nr = Math.round(player.y) + dy;
    if (cellPassable(nc, nr) && !hasBomb(nc, nr)) {
      player.col = nc;
      player.row = nr;
    } else if (cellPassable(nc, Math.round(player.y))) {
      player.col = nc;
    } else if (cellPassable(Math.round(player.x), nr)) {
      player.row = nr;
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!gameRunning) return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': movePlayer(0, -1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': movePlayer(0, 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': movePlayer(-1, 0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': movePlayer(1, 0); e.preventDefault(); break;
      case ' ': placeBomb(); e.preventDefault(); break;
    }
  }

  function onTouchStart(e) {
    if (!gameRunning) return;
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchMoved = false;
  }

  function onTouchMove(e) {
    if (!touchStart || !gameRunning) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 30) {
      touchMoved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        movePlayer(dx > 0 ? 1 : -1, 0);
      } else {
        movePlayer(0, dy > 0 ? 1 : -1);
      }
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
      e.preventDefault();
    }
  }

  function onTouchEnd(e) {
    if (!gameRunning) return;
    if (!touchMoved && touchStart) {
      placeBomb();
    }
    touchStart = null;
    touchMoved = false;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * tileW;
        const y = r * tileH;
        if (grid[r][c] === TILE_WALL) {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
          // highlight
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(x + 2, y + 2, tileW - 6, 2);
        } else if (grid[r][c] === TILE_DESTRUCT) {
          ctx.fillStyle = DESTRUCT_COLOR;
          ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 4, y + 4, tileW - 8, tileH - 8);
        }
      }
    }

    // Power-ups
    for (const p of powerups) {
      const s = tileW * 0.6;
      ctx.fillStyle = POWERUP_COLORS[p.type] || '#fff';
      ctx.beginPath();
      ctx.arc(p.col * tileW + tileW / 2, p.row * tileH + tileH / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = Math.floor(tileH * 0.35) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.type === 'bomb' ? 'B' : p.type === 'flame' ? 'F' : p.type === 'speed' ? 'S' : 'H';
      ctx.fillText(label, p.col * tileW + tileW / 2, p.row * tileH + tileH / 2);
    }

    // Bombs
    for (const b of bombs) {
      const cx = b.col * tileW + tileW / 2;
      const cy = b.row * tileH + tileH / 2;
      const rad = tileW * 0.35 * (1 + 0.1 * Math.sin(Date.now() / 100));
      ctx.fillStyle = BOMB_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      // Fuse glow
      ctx.fillStyle = b.timer < 1 ? '#f00' : BOMB_FUSE_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy - rad * 0.4, rad * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Explosions
    for (const ex of explosions) {
      const alpha = ex.timer / 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = EXPLOSION_COLOR;
      ctx.fillRect(ex.col * tileW + 2, ex.row * tileH + 2, tileW - 4, tileH - 4);
      ctx.globalAlpha = 1;
    }

    // Enemies
    for (const en of enemies) {
      if (!en.alive) continue;
      const x = en.x * tileW;
      const y = en.y * tileH;
      ctx.fillStyle = ENEMY_COLOR;
      ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6);
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + tileW * 0.25, y + tileH * 0.3, tileW * 0.15, tileH * 0.15);
      ctx.fillRect(x + tileW * 0.6, y + tileH * 0.3, tileW * 0.15, tileH * 0.15);
    }

    // Player
    if (player.alive) {
      const px = player.x * tileW;
      const py = player.y * tileH;
      // Shield glow
      if (shieldTimer > 0) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + tileW / 2, py + tileH / 2, tileW * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fillRect(px + 3, py + 3, tileW - 6, tileH - 6);
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(px + tileW * 0.25, py + tileH * 0.25, tileW * 0.15, tileH * 0.15);
      ctx.fillRect(px + tileW * 0.6, py + tileH * 0.25, tileW * 0.15, tileH * 0.15);
      ctx.fillStyle = '#000';
      ctx.fillRect(px + tileW * 0.3, py + tileH * 0.3, tileW * 0.08, tileH * 0.08);
      ctx.fillRect(px + tileW * 0.65, py + tileH * 0.3, tileW * 0.08, tileH * 0.08);
    }
  }

  function drawStartScreen() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = 'bold ' + Math.floor(tileH * 1.2) + 'px monospace';
    ctx.fillText('BOMBERMAN', canvas.width / 2, canvas.height * 0.3);

    ctx.fillStyle = '#fff';
    ctx.font = Math.floor(tileH * 0.5) + 'px monospace';
    ctx.fillText('Arrow keys / WASD to move', canvas.width / 2, canvas.height * 0.5);
    ctx.fillText('Space / Tap to place bomb', canvas.width / 2, canvas.height * 0.58);
    ctx.fillText('Destroy all enemies to advance!', canvas.width / 2, canvas.height * 0.66);

    const bs = (function(){try{return localStorage.getItem('bomberman_best') || '0'}catch(e){return '0'}})();
    ctx.fillStyle = '#888';
    ctx.font = Math.floor(tileH * 0.4) + 'px monospace';
    ctx.fillText('Best: ' + bs, canvas.width / 2, canvas.height * 0.78);

    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = Math.floor(tileH * 0.5) + 'px monospace';
    ctx.fillText('Press SPACE or TAP to start', canvas.width / 2, canvas.height * 0.88);
  }

  function drawGameOverScreen() {
    draw();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = ENEMY_COLOR;
    ctx.font = 'bold ' + Math.floor(tileH * 1) + 'px monospace';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height * 0.35);

    ctx.fillStyle = '#fff';
    ctx.font = Math.floor(tileH * 0.5) + 'px monospace';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height * 0.5);
    ctx.fillText('Level: ' + level, canvas.width / 2, canvas.height * 0.58);

    const bs = parseInt((function(){try{return localStorage.getItem('bomberman_best')}catch(e){return null}})() || '0', 10);
    ctx.fillStyle = '#888';
    ctx.font = Math.floor(tileH * 0.4) + 'px monospace';
    ctx.fillText('Best: ' + bs, canvas.width / 2, canvas.height * 0.68);

    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = Math.floor(tileH * 0.5) + 'px monospace';
    ctx.fillText('Press SPACE or TAP to restart', canvas.width / 2, canvas.height * 0.82);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  function gameLoop(timestamp) {
    if (!gameRunning) return;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (!gamePaused) {
      // Smooth player movement
      player.x += (player.col - player.x) * Math.min(1, dt * player.speed * 3);
      player.y += (player.row - player.y) * Math.min(1, dt * player.speed * 3);

      // Update bombs — use while-loop so chain reactions (timer set to 0)
      // explode in the same frame instead of surviving 1 extra tick
      let bombExploded = true;
      while (bombExploded) {
        bombExploded = false;
        for (let i = bombs.length - 1; i >= 0; i--) {
          if (bombs[i].timer <= 0) {
            explodeBomb(bombs[i]);
            bombExploded = true;
          }
        }
      }
      // Tick remaining bomb timers
      for (const b of bombs) {
        b.timer -= dt;
      }

      // Update explosions
      for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].timer -= dt;
        if (explosions[i].timer <= 0) explosions.splice(i, 1);
      }

      // Update enemies
      updateEnemies(dt);

      // Shield timer
      if (shieldTimer > 0) shieldTimer -= dt;

      // Check hits
      checkExplosionHits();
      checkPowerups();
      checkLevelClear();
    }

    draw();
    updateHUD();
    if (gameRunning) animFrame = requestAnimationFrame(gameLoop);
  }

  // ── Start / Restart ────────────────────────────────────────────────────────
  function startGame() {
    // Cancel any existing game loop to prevent duplicate stacking (H4/H5)
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }

    score = 0;
    lives = 3;
    level = 1;
    gameRunning = true;
    gamePaused = false;
    startTime = Date.now();
    bestScore = parseInt((function(){try{return localStorage.getItem('bomberman_best')}catch(e){return null}})() || '0', 10);

    // Hide start screen and game-over overlays
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.add('hidden');
    const gameOverEl = document.getElementById('game-over');
    if (gameOverEl) gameOverEl.classList.add('hidden');

    initLevel();
    lastTime = performance.now();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function onRestartKey(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      startGame();
      document.removeEventListener('keydown', onRestartKey);
    }
  }

  function onRestartTouch(e) {
    startGame();
    canvas.removeEventListener('touchstart', onRestartTouch);
  }

  // Hook restart on game-over via event (replaces monkey-patching)
  window.addEventListener('bomberman-game-over', function _onGameOver() {
    setTimeout(() => {
      document.addEventListener('keydown', onRestartKey);
      canvas.addEventListener('touchstart', onRestartTouch, { passive: true });
    }, 300);
  });

  // ── Initialization ─────────────────────────────────────────────────────────
  function _onResize() { resize(); if (!gameRunning) drawStartScreen(); }

  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');

    bestScore = parseInt((function(){try{return localStorage.getItem('bomberman_best')}catch(e){return null}})() || '0', 10);
    resize();
    window.addEventListener('resize', _onResize);
    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    // Start screen wait
    drawStartScreen();

    waitStartRef = function waitStart(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        document.removeEventListener('keydown', waitStart);
        startGame();
      }
    };
    document.addEventListener('keydown', waitStartRef);
    canvas.addEventListener('touchstart', function ts(e) {
      canvas.removeEventListener('touchstart', ts);
      startGame();
    }, { once: true });

    // Wire start button click (C3 fix)
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', startGame);

    // Wire restart button click
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', startGame);

    // Expose for external control
    window.__bombermanEngine = {
      start: startGame,
      pause: () => { gamePaused = true; },
      resume: () => { gamePaused = false; },
      isRunning: () => gameRunning,
      destroy: destroy
    };
  }

  // ── Cleanup (H5) ─────────────────────────────────────────────────────────
  function destroy() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    gameRunning = false;
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keydown', onRestartKey);
    document.removeEventListener('keydown', waitStartRef);
    window.removeEventListener('resize', _onResize);
    if (canvas) {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchstart', onRestartTouch);
    }
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.removeEventListener('click', startGame);
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.removeEventListener('click', startGame);
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
