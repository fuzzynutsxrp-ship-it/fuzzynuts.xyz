/* ============================================================
   Space Invaders – FuzzyNuts Arcade
   Canvas 2D · Vanilla JS · IIFE
   ============================================================ */
(function () {
  "use strict";

  /* ── palette ── */
  const BG        = "#0a0614";
  const CYAN      = "#06b6d4";
  const GREEN     = "#22c55e";
  const RED       = "#ef4444";
  const PURPLE    = "#a855f7";
  const WHITE     = "#f0f0f0";
  const SHIELDCLR = "#22c55e";
  const ALIENSHOT = "#ff6b6b";

  /* ── canvas ── */
  const canvas = document.getElementById("game-canvas");
  const ctx    = canvas.getContext("2d");

  function resize() {
    const parent = canvas.parentElement || document.body;
    canvas.width  = Math.min(parent.clientWidth  || 800, 960);
    canvas.height = Math.min(parent.clientHeight || 600, 720);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ── helpers ── */
  const W = () => canvas.width;
  const H = () => canvas.height;

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function text(str, x, y, size, color, align) {
    ctx.fillStyle   = color || WHITE;
    ctx.font        = (size || 16) + "px monospace";
    ctx.textAlign   = align || "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
  }

  /* ── HUD helpers ── */
  function updateHUD() {
    const se = document.getElementById("score-display");
    const le = document.getElementById("lives-display");
    const lv = document.getElementById("level-display");
    if (se) se.textContent = "SCORE " + score;
    if (le) le.textContent = "LIVES " + lives;
    if (lv) lv.textContent = "WAVE " + wave;
  }

  /* ── state ── */
  let score, lives, wave, state, startTime, best;
  let player, bullets, alienBullets, aliens, shields, mystery;
  let alienDir, alienDropNext, alienSpeed, alienAnimFrame, alienMoveTimer;
  let mysteryTimer, shootCooldown, invincibleTimer, gameOverTimer;

  best = parseInt((function(){try{return localStorage.getItem("space-invaders_best")}catch(e){return null}})() || "0", 10);

  function resetAliens() {
    aliens = [];
    const cols = 11, rows = 5;
    const aw = W() * 0.045;
    const ah = aw;
    const gapX = aw * 1.5;
    const gapY = ah * 1.4;
    const totalW = cols * gapX;
    const ox = (W() - totalW) / 2 + gapX / 2 - aw / 2;
    const oy = H() * 0.08;
    const points = [30, 20, 20, 10, 10];
    const colors = [PURPLE, RED, RED, GREEN, GREEN];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({
          x: ox + c * gapX,
          y: oy + r * gapY,
          w: aw,
          h: ah,
          row: r,
          points: points[r],
          color: colors[r],
          alive: true,
        });
      }
    }
    alienDir = 1;
    alienDropNext = false;
    alienAnimFrame = 0;
    alienMoveTimer = 0;
    const aliveCount = aliens.filter(a => a.alive).length;
    alienSpeed = Math.max(60, 600 - wave * 40) * (aliveCount / 55);
  }

  function resetShields() {
    shields = [];
    const sw = W() * 0.1, sh = H() * 0.06;
    const spacing = W() / 5;
    for (let i = 0; i < 4; i++) {
      const sx = spacing * (i + 1) - sw / 2;
      const sy = H() * 0.75;
      const cols = 12, rows = 6;
      const cw = sw / cols, ch = sh / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          shields.push({ x: sx + c * cw, y: sy + r * ch, w: cw, h: ch, hp: 1 });
        }
      }
    }
  }

  function spawnMystery() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const mw = W() * 0.08, mh = H() * 0.035;
    mystery = {
      x: dir === 1 ? -mw : W(),
      y: H() * 0.04,
      w: mw,
      h: mh,
      dir: dir,
      points: [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)],
      speed: 120,
    };
  }

  function initGame() {
    score = 0;
    lives = 3;
    wave  = 1;
    state = "playing";
    startTime = performance.now();
    window.__gameScore = 0;
    gameOverTimer = 0;

    const pw = W() * 0.06, ph = H() * 0.035;
    player = { x: W() / 2 - pw / 2, y: H() * 0.9, w: pw, h: ph, speed: 300 };
    bullets = [];
    alienBullets = [];
    mystery = null;
    mysteryTimer = 5 + Math.random() * 8;
    shootCooldown = 0;
    invincibleTimer = 0;

    resetAliens();
    resetShields();
    updateHUD();
  }

  /* ── input ── */
  const keys = {};
  window.addEventListener("keydown", e => { keys[e.code] = true;  if (e.code === "Space") e.preventDefault(); });
  window.addEventListener("keyup",   e => { keys[e.code] = false; });

  let touchActive = false, touchX = 0, touchY = 0;
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    touchActive = true;
    touchX = t.clientX - r.left;
    touchY = t.clientY - r.top;
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    touchX = t.clientX - r.left;
    touchY = t.clientY - r.top;
  }, { passive: false });
  canvas.addEventListener("touchend", e => { e.preventDefault(); touchActive = false; }, { passive: false });

  /* ── collision ── */
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ── update ── */
  function update(dt) {
    if (state !== "playing") {
      if (state === "gameover") {
        gameOverTimer += dt;
        if (gameOverTimer > 3) {
          canvas.addEventListener("click", restartOnce, { once: true });
          canvas.addEventListener("touchstart", restartOnce, { once: true });
        }
      }
      return;
    }

    /* player movement */
    let dx = 0;
    if (keys["ArrowLeft"] || keys["KeyA"]) dx -= 1;
    if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;

    if (touchActive) {
      const centerX = W() / 2;
      if (touchX < centerX) dx = -1;
      else dx = 1;
    }

    player.x += dx * player.speed * dt;
    player.x = Math.max(0, Math.min(W() - player.w, player.x));

    /* player shoot */
    shootCooldown -= dt;
    const wantShoot = keys["Space"] || touchActive;
    if (wantShoot && shootCooldown <= 0 && bullets.length < 3) {
      bullets.push({ x: player.x + player.w / 2 - 2, y: player.y - 8, w: 4, h: 10, speed: 500 });
      shootCooldown = 0.25;
    }

    /* invincibility */
    if (invincibleTimer > 0) invincibleTimer -= dt;

    /* bullets move */
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= bullets[i].speed * dt;
      if (bullets[i].y + bullets[i].h < 0) bullets.splice(i, 1);
    }
    for (let i = alienBullets.length - 1; i >= 0; i--) {
      alienBullets[i].y += alienBullets[i].speed * dt;
      if (alienBullets[i].y > H()) alienBullets.splice(i, 1);
    }

    /* alien movement */
    const aliveAliens = aliens.filter(a => a.alive);
    const aliveCount = aliveAliens.length;
    if (aliveCount === 0) {
      wave++;
      resetAliens();
      updateHUD();
      return;
    }

    alienSpeed = Math.max(40, 600 - wave * 40) * (aliveCount / 55);
    alienMoveTimer += dt;
    const moveInterval = 1 / (alienSpeed / 30);

    if (alienMoveTimer >= moveInterval) {
      alienMoveTimer = 0;
      alienAnimFrame = 1 - alienAnimFrame;

      if (alienDropNext) {
        for (const a of aliveAliens) a.y += H() * 0.025;
        alienDir *= -1;
        alienDropNext = false;
      } else {
        let hitEdge = false;
        for (const a of aliveAliens) {
          a.x += alienDir * W() * 0.012;
          if (a.x < 0 || a.x + a.w > W()) hitEdge = true;
        }
        if (hitEdge) alienDropNext = true;
      }
    }

    /* alien shoot */
    const shootChance = 0.003 + wave * 0.001;
    for (const a of aliveAliens) {
      if (Math.random() < shootChance * dt * 60) {
        alienBullets.push({ x: a.x + a.w / 2 - 2, y: a.y + a.h, w: 4, h: 10, speed: 200 + wave * 15 });
      }
    }

    /* mystery ship */
    mysteryTimer -= dt;
    if (!mystery && mysteryTimer <= 0) {
      spawnMystery();
      mysteryTimer = 10 + Math.random() * 10;
    }
    if (mystery) {
      mystery.x += mystery.dir * mystery.speed * dt;
      if (mystery.x > W() + mystery.w || mystery.x < -mystery.w * 2) mystery = null;
    }

    /* ── collisions ── */
    /* bullets vs aliens */
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      let hit = false;
      for (const a of aliens) {
        if (a.alive && overlap(b, a)) {
          a.alive = false;
          score += a.points;
          window.__gameScore = score;
          bullets.splice(bi, 1);
          hit = true;
          updateHUD();
          break;
        }
      }
      if (hit) continue;
      /* bullets vs mystery */
      if (mystery && overlap(b, mystery)) {
        score += mystery.points;
        window.__gameScore = score;
        mystery = null;
        bullets.splice(bi, 1);
        updateHUD();
        continue;
      }
      /* bullets vs shields */
      for (let si = shields.length - 1; si >= 0; si--) {
        if (overlap(b, shields[si])) {
          shields[si].hp = 0;
          bullets.splice(bi, 1);
          shields.splice(si, 1);
          break;
        }
      }
    }

    /* alien bullets vs player */
    if (invincibleTimer <= 0) {
      for (let i = alienBullets.length - 1; i >= 0; i--) {
        if (overlap(alienBullets[i], player)) {
          alienBullets.splice(i, 1);
          lives--;
          updateHUD();
          if (lives <= 0) {
            endGame();
            return;
          }
          invincibleTimer = 2;
          player.x = W() / 2 - player.w / 2;
          break;
        }
      }
    }

    /* alien bullets vs shields */
    for (let bi = alienBullets.length - 1; bi >= 0; bi--) {
      for (let si = shields.length - 1; si >= 0; si--) {
        if (overlap(alienBullets[bi], shields[si])) {
          shields[si].hp = 0;
          alienBullets.splice(bi, 1);
          shields.splice(si, 1);
          break;
        }
      }
    }

    /* aliens reach player → game over */
    for (const a of aliveAliens) {
      if (a.y + a.h >= player.y) { endGame(); return; }
    }
  }

  function endGame() {
    state = "gameover";
    gameOverTimer = 0;
    if (score > best) {
      best = score;
      try { localStorage.setItem("space-invaders_best", String(best) } catch(e) {});
    }
    const duration = Math.round((performance.now() - startTime) / 1000);
    if (typeof FuzzyScoreSubmit === "function") {
      try { FuzzyScoreSubmit("space-invaders", score, duration); } catch (_) {}
    }
    window.__gameScore = score;
  }

  function restartOnce() {
    canvas.removeEventListener("click", restartOnce);
    canvas.removeEventListener("touchstart", restartOnce);
    initGame();
  }

  /* ── alien sprite drawing ── */
  function drawAlien(a) {
    const x = Math.round(a.x), y = Math.round(a.y);
    const w = Math.round(a.w), h = Math.round(a.h);
    const c = a.color;
    ctx.fillStyle = c;

    if (a.row === 0) {
      /* top row: small diamond / bug */
      ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.2);
      ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.2);
      ctx.fillRect(x, y + h * 0.4, w, h * 0.2);
      if (alienAnimFrame === 0) {
        ctx.fillRect(x, y + h * 0.6, w * 0.2, h * 0.2);
        ctx.fillRect(x + w * 0.8, y + h * 0.6, w * 0.2, h * 0.2);
      } else {
        ctx.fillRect(x + w * 0.15, y + h * 0.6, w * 0.2, h * 0.2);
        ctx.fillRect(x + w * 0.65, y + h * 0.6, w * 0.2, h * 0.2);
      }
      ctx.fillRect(x + w * 0.3, y + h * 0.6, w * 0.4, h * 0.2);
    } else if (a.row <= 2) {
      /* mid rows: crab */
      ctx.fillRect(x + w * 0.15, y, w * 0.7, h * 0.2);
      ctx.fillRect(x + w * 0.05, y + h * 0.2, w * 0.9, h * 0.2);
      ctx.fillRect(x, y + h * 0.4, w, h * 0.2);
      if (alienAnimFrame === 0) {
        ctx.fillRect(x, y + h * 0.6, w * 0.25, h * 0.2);
        ctx.fillRect(x + w * 0.75, y + h * 0.6, w * 0.25, h * 0.2);
      } else {
        ctx.fillRect(x + w * 0.25, y + h * 0.6, w * 0.15, h * 0.2);
        ctx.fillRect(x + w * 0.6, y + h * 0.6, w * 0.15, h * 0.2);
      }
      ctx.fillRect(x + w * 0.15, y + h * 0.6, w * 0.25, h * 0.2);
      ctx.fillRect(x + w * 0.6, y + h * 0.6, w * 0.25, h * 0.2);
      /* eyes */
      ctx.fillStyle = BG;
      ctx.fillRect(x + w * 0.2, y + h * 0.25, w * 0.15, h * 0.1);
      ctx.fillRect(x + w * 0.65, y + h * 0.25, w * 0.15, h * 0.1);
    } else {
      /* bottom rows: squid */
      ctx.fillRect(x + w * 0.3, y, w * 0.4, h * 0.2);
      ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.7, h * 0.2);
      ctx.fillRect(x, y + h * 0.4, w, h * 0.25);
      if (alienAnimFrame === 0) {
        ctx.fillRect(x, y + h * 0.65, w * 0.2, h * 0.15);
        ctx.fillRect(x + w * 0.8, y + h * 0.65, w * 0.2, h * 0.15);
      } else {
        ctx.fillRect(x + w * 0.1, y + h * 0.65, w * 0.2, h * 0.15);
        ctx.fillRect(x + w * 0.7, y + h * 0.65, w * 0.2, h * 0.15);
      }
      ctx.fillRect(x + w * 0.3, y + h * 0.65, w * 0.4, h * 0.15);
      /* eyes */
      ctx.fillStyle = BG;
      ctx.fillRect(x + w * 0.25, y + h * 0.3, w * 0.12, h * 0.08);
      ctx.fillRect(x + w * 0.63, y + h * 0.3, w * 0.12, h * 0.08);
    }
  }

  /* ── draw ── */
  function draw() {
    /* bg */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W(), H());

    if (state === "start") {
      text("SPACE INVADERS", W() / 2, H() * 0.35, Math.round(W() * 0.06), CYAN);
      text("Press SPACE or tap to start", W() / 2, H() * 0.55, Math.round(W() * 0.025), WHITE);
      text("Best: " + best, W() / 2, H() * 0.65, Math.round(W() * 0.02), GREEN);
      return;
    }

    /* shields */
    ctx.fillStyle = SHIELDCLR;
    for (const s of shields) {
      ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h));
    }

    /* player */
    const flickerOn = invincibleTimer <= 0 || Math.sin(invincibleTimer * 20) > 0;
    if (flickerOn) {
      const px = Math.round(player.x), py = Math.round(player.y);
      const pw = Math.round(player.w), ph = Math.round(player.h);
      ctx.fillStyle = CYAN;
      ctx.fillRect(px + pw * 0.4, py, pw * 0.2, ph * 0.3);
      ctx.fillRect(px + pw * 0.2, py + ph * 0.3, pw * 0.6, ph * 0.3);
      ctx.fillRect(px, py + ph * 0.5, pw, ph * 0.5);
    }

    /* aliens */
    for (const a of aliens) {
      if (a.alive) drawAlien(a);
    }

    /* mystery ship */
    if (mystery) {
      ctx.fillStyle = RED;
      const mx = Math.round(mystery.x), my = Math.round(mystery.y);
      const mw = Math.round(mystery.w), mh = Math.round(mystery.h);
      ctx.fillRect(mx + mw * 0.2, my, mw * 0.6, mh * 0.3);
      ctx.fillRect(mx, my + mh * 0.3, mw, mh * 0.4);
      ctx.fillRect(mx + mw * 0.1, my + mh * 0.7, mw * 0.3, mh * 0.3);
      ctx.fillRect(mx + mw * 0.6, my + mh * 0.7, mw * 0.3, mh * 0.3);
    }

    /* bullets */
    ctx.fillStyle = CYAN;
    for (const b of bullets) {
      ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h));
    }
    ctx.fillStyle = ALIENSHOT;
    for (const b of alienBullets) {
      ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h));
    }

    /* game over overlay */
    if (state === "gameover") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W(), H());
      text("GAME OVER", W() / 2, H() * 0.4, Math.round(W() * 0.06), RED);
      text("Score: " + score, W() / 2, H() * 0.52, Math.round(W() * 0.03), WHITE);
      text("Best: " + best, W() / 2, H() * 0.6, Math.round(W() * 0.025), GREEN);
      if (gameOverTimer > 3) {
        text("Tap or click to restart", W() / 2, H() * 0.72, Math.round(W() * 0.022), CYAN);
      }
    }
  }

  /* ── game loop ── */
  let lastTime = 0;
  function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    resize();
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  /* ── public API ── */
  window.SpaceInvaders = {
    start() {
      initGame();
      state = "playing";
    },
    stop() {
      state = "gameover";
    },
    reset() {
      initGame();
    },
  };

  /* ── auto-start in start screen mode, listen for initial input ── */
  state = "start";
  function startFromIdle() {
    if (state === "start") initGame();
  }
  window.addEventListener("keydown", function onKey(e) {
    if (state === "start" && (e.code === "Space" || e.code === "Enter")) {
      initGame();
    }
  });
  canvas.addEventListener("click", () => { if (state === "start") initGame(); });
  canvas.addEventListener("touchstart", () => { if (state === "start") initGame(); }, { passive: true });

  /* kick off */
  requestAnimationFrame(loop);

})();
