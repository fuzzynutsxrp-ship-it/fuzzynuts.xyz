/* ============================================================
   Fruit Ninja  –  FuzzyNuts Arcade Engine
   Canvas 2D, vanilla JS, IIFE pattern
   ============================================================ */
(function () {
  "use strict";

  /* ---------- constants ---------- */
  const BG = "#0a0614";
  const ACCENT = "#ef4444";
  const GRAVITY = 0.38;
  const MAX_LIVES = 3;
  const SPAWN_INTERVAL_INITIAL = 1100; // ms
  const SPAWN_INTERVAL_MIN = 450;
  const FREEZE_DURATION = 5000;
  const FRENZY_DURATION = 6000;
  const COMBO_WINDOW = 600; // ms – slice window for combo

  /* fruit definitions */
  const FRUITS = [
    { name: "watermelon", radius: 38, points: 50, fill: "#22c55e", inner: "#dc2626", stroke: "#166534" },
    { name: "orange", radius: 28, points: 30, fill: "#fb923c", inner: "#fdba74", stroke: "#c2410c" },
    { name: "apple", radius: 30, points: 20, fill: "#ef4444", inner: "#fca5a5", stroke: "#991b1b" },
    { name: "banana", radius: 34, points: 15, fill: "#facc15", inner: "#fef08a", stroke: "#a16207", special: "freeze" },
    { name: "strawberry", radius: 24, points: 40, fill: "#e11d48", inner: "#fda4af", stroke: "#9f1239" },
  ];

  const BOMB_DEF = { name: "bomb", radius: 30, fill: "#7f1d1d", inner: "#450a0a", stroke: "#22c55e" };

  /* ---------- state ---------- */
  let canvas, ctx, W, H;
  let running = false;
  let score = 0;
  let lives = MAX_LIVES;
  let startTime = 0;
  let lastTime = 0;
  let gameTimeScale = 1; // for freeze effect
  let freezeTimer = 0;
  let frenzyTimer = 0;
  let spawnTimer = 0;
  let spawnInterval = SPAWN_INTERVAL_INITIAL;
  let difficultyTimer = 0;

  let fruits = [];       // active flying fruits
  let halves = [];       // sliced halves
  let particles = [];
  let bladeTrail = [];   // [{x,y,age}]

  let comboCount = 0;
  let comboTime = 0;

  let mouseX = -100, mouseY = -100;
  let pmouseX = -100, pmouseY = -100;
  let isSwiping = false;

  /* HUD elements (optional external) */
  let scoreEl, livesEl;

  /* animation id */
  let rafId = null;

  /* ---------- helpers ---------- */
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }

  function updateHUD() {
    window.__gameScore = score;
    if (scoreEl) scoreEl.textContent = score;
    if (livesEl) livesEl.textContent = "❤".repeat(Math.max(0, lives));
  }

  function saveBest() {
    const key = "fruit-ninja_best";
    const prev = parseInt(localStorage.getItem(key) || "0", 10);
    if (score > prev) localStorage.setItem(key, score);
  }

  function getBest() {
    return parseInt(localStorage.getItem("fruit-ninja_best") || "0", 10);
  }

  /* ---------- resize ---------- */
  function resize() {
    const parent = canvas.parentElement || document.body;
    W = canvas.width = parent.clientWidth || 800;
    H = canvas.height = parent.clientHeight || 600;
  }

  /* ---------- spawn ---------- */
  function spawnFruit() {
    const isBomb = Math.random() < 0.12 && !frenzyTimer;
    const def = isBomb ? BOMB_DEF : FRUITS[randInt(0, FRUITS.length - 1)];
    const x = rand(W * 0.12, W * 0.88);
    const speedY = rand(12, 20);
    const speedX = rand(-3.5, 3.5);
    const rotSpeed = rand(-0.12, 0.12);
    fruits.push({
      x, y: H + 50,
      vx: speedX, vy: -speedY,
      radius: def.radius * (W < 500 ? 0.75 : 1),
      rotation: 0, rotSpeed,
      fill: def.fill, inner: def.inner, stroke: def.stroke,
      name: def.name, points: def.points || 0,
      special: def.special || null,
      sliced: false, missed: false,
    });
  }

  function spawnWave() {
    const count = frenzyTimer ? randInt(5, 8) : randInt(1, 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => { if (running) spawnFruit(); }, i * 120);
    }
  }

  /* ---------- particles ---------- */
  function emitParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: rand(-4, 4), vy: rand(-6, 2),
        life: rand(0.4, 1.0),
        maxLife: 1,
        radius: rand(2, 5),
        color,
      });
    }
  }

  /* ---------- slice logic ---------- */
  function sliceFruitAt(fx, fy) {
    let sliced = false;
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (f.sliced) continue;
      const d = dist(fx, fy, f.x, f.y);
      if (d < f.radius + 12) {
        /* bomb check */
        if (f.name === "bomb") {
          emitParticles(f.x, f.y, ACCENT, 40);
          emitParticles(f.x, f.y, "#fbbf24", 25);
          endGame();
          return;
        }

        f.sliced = true;
        sliced = true;

        /* combo */
        comboCount++;
        comboTime = performance.now();
        const comboMul = Math.min(comboCount, 5);
        const pts = f.points * comboMul;
        score += pts;
        updateHUD();

        /* spawn halves */
        halves.push(
          { x: f.x - 10, y: f.y, vx: rand(-4, -1), vy: rand(-6, -2), rotation: f.rotation, rotSpeed: f.rotSpeed - 0.05, radius: f.radius, fill: f.fill, inner: f.inner, half: -1, life: 1 },
          { x: f.x + 10, y: f.y, vx: rand(1, 4), vy: rand(-6, -2), rotation: f.rotation, rotSpeed: f.rotSpeed + 0.05, radius: f.radius, fill: f.fill, inner: f.inner, half: 1, life: 1 }
        );

        /* blade particles */
        emitParticles(f.x, f.y, f.fill, 12);

        /* combo text */
        if (comboCount >= 2) {
          emitParticles(f.x, f.y - 30, "#fbbf24", 8);
        }

        /* special: freeze */
        if (f.special === "freeze") {
          freezeTimer = FREEZE_DURATION;
          gameTimeScale = 0.35;
        }

        /* special: frenzy (from strawberry as bonus) */
        if (f.special === "frenzy") {
          frenzyTimer = FRENZY_DURATION;
        }

        fruits.splice(i, 1);
      }
    }
    return sliced;
  }

  /* ---------- update ---------- */
  function update(dt) {
    if (!running) return;
    const scaledDt = dt * gameTimeScale;

    /* freeze timer */
    if (freezeTimer > 0) {
      freezeTimer -= dt;
      if (freezeTimer <= 0) {
        freezeTimer = 0;
        gameTimeScale = 1;
      }
    }

    /* frenzy timer */
    if (frenzyTimer > 0) {
      frenzyTimer -= dt;
    }

    /* difficulty ramp */
    difficultyTimer += dt;
    if (difficultyTimer > 8000) {
      difficultyTimer = 0;
      spawnInterval = Math.max(SPAWN_INTERVAL_MIN, spawnInterval - 60);
    }

    /* spawn */
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval / gameTimeScale) {
      spawnTimer = 0;
      spawnWave();
    }

    /* combo expiry */
    if (comboCount > 0 && performance.now() - comboTime > COMBO_WINDOW) {
      comboCount = 0;
    }

    /* update fruits */
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.vy += GRAVITY * scaledDt / 16;
      f.x += f.vx * scaledDt / 16;
      f.y += f.vy * scaledDt / 16;
      f.rotation += f.rotSpeed * scaledDt / 16;

      /* off screen bottom → miss */
      if (f.y > H + f.radius + 30 && !f.sliced && f.vy > 0) {
        if (f.name !== "bomb") {
          lives--;
          updateHUD();
          if (lives <= 0) {
            endGame();
            return;
          }
        }
        fruits.splice(i, 1);
      }
    }

    /* update halves */
    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.vy += GRAVITY * scaledDt / 16;
      h.x += h.vx * scaledDt / 16;
      h.y += h.vy * scaledDt / 16;
      h.rotation += h.rotSpeed * scaledDt / 16;
      h.life -= 0.008 * scaledDt / 16;
      if (h.life <= 0 || h.y > H + 100) halves.splice(i, 1);
    }

    /* update particles */
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * scaledDt / 16;
      p.y += p.vy * scaledDt / 16;
      p.vy += 0.12 * scaledDt / 16;
      p.life -= 0.015 * scaledDt / 16;
      if (p.life <= 0) particles.splice(i, 1);
    }

    /* blade trail aging */
    for (let i = bladeTrail.length - 1; i >= 0; i--) {
      bladeTrail[i].age -= dt;
      if (bladeTrail[i].age <= 0) bladeTrail.splice(i, 1);
    }

    /* continuous swipe collision */
    if (isSwiping) {
      const segments = 8;
      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const sx = pmouseX + (mouseX - pmouseX) * t;
        const sy = pmouseY + (mouseY - pmouseY) * t;
        sliceFruitAt(sx, sy);
      }
      /* blade trail points */
      bladeTrail.push({ x: mouseX, y: mouseY, age: 220 });
      if (bladeTrail.length > 60) bladeTrail.shift();
    }
  }

  /* ---------- draw ---------- */
  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    /* freeze overlay */
    if (freezeTimer > 0) {
      ctx.fillStyle = "rgba(56,189,248,0.06)";
      ctx.fillRect(0, 0, W, H);
    }

    /* blade trail */
    if (bladeTrail.length > 1) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < bladeTrail.length; i++) {
        const a = bladeTrail[i];
        const b = bladeTrail[i - 1];
        const alpha = clamp(a.age / 220, 0, 1);
        const width = 2 + alpha * 4;
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.stroke();
      }
      /* glow */
      if (bladeTrail.length > 0) {
        const last = bladeTrail[bladeTrail.length - 1];
        const glow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 20);
        glow.addColorStop(0, "rgba(255,255,255,0.35)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(last.x, last.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* draw fruits */
    fruits.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      /* body */
      const grad = ctx.createRadialGradient(-6, -6, 2, 0, 0, f.radius);
      grad.addColorStop(0, f.inner);
      grad.addColorStop(1, f.fill);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
      ctx.fill();
      /* outline */
      ctx.strokeStyle = f.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      /* bomb icon */
      if (f.name === "bomb") {
        ctx.fillStyle = "#22c55e";
        ctx.font = `bold ${f.radius}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💣", 0, 2);
      }

      /* freeze indicator */
      if (f.special === "freeze") {
        ctx.fillStyle = "rgba(147,197,253,0.4)";
        ctx.beginPath();
        ctx.arc(0, 0, f.radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${f.radius * 0.6}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("❄", 0, 1);
      }

      ctx.restore();
    });

    /* draw halves */
    halves.forEach(h => {
      ctx.save();
      ctx.globalAlpha = clamp(h.life, 0, 1);
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rotation);
      ctx.beginPath();
      if (h.half < 0) {
        ctx.rect(-h.radius, -h.radius, h.radius, h.radius * 2);
      } else {
        ctx.rect(0, -h.radius, h.radius, h.radius * 2);
      }
      ctx.clip();
      const grad = ctx.createRadialGradient(-4, -4, 1, 0, 0, h.radius);
      grad.addColorStop(0, h.inner);
      grad.addColorStop(1, h.fill);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* particles */
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* freeze effect shimmer */
    if (freezeTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(56,189,248,0.12)";
      ctx.fillRect(0, H * 0.85, W, H * 0.15);
      ctx.fillStyle = "#7dd3fc";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("❄ FREEZE " + (freezeTimer / 1000).toFixed(1) + "s ❄", W / 2, H * 0.92);
      ctx.restore();
    }

    /* frenzy effect */
    if (frenzyTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(251,191,36,0.1)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔥 FRENZY! 🔥", W / 2, 40);
      ctx.restore();
    }

    /* combo indicator */
    if (comboCount >= 2 && performance.now() - comboTime < COMBO_WINDOW) {
      ctx.save();
      ctx.fillStyle = "#fbbf24";
      ctx.font = `bold ${22 + comboCount * 3}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = clamp((COMBO_WINDOW - (performance.now() - comboTime)) / COMBO_WINDOW, 0.3, 1);
      ctx.fillText("COMBO x" + comboCount, W / 2, H / 2);
      ctx.restore();
    }
  }

  /* ---------- game loop ---------- */
  function loop(ts) {
    if (!running) return;
    const dt = ts - lastTime;
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- input ---------- */
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length) {
      return { x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width), y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height) };
    }
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  }

  function onPointerDown(e) {
    e.preventDefault();
    const p = getPos(e);
    mouseX = pmouseX = p.x;
    mouseY = pmouseY = p.y;
    isSwiping = true;
  }

  function onPointerMove(e) {
    e.preventDefault();
    if (!isSwiping) return;
    const p = getPos(e);
    pmouseX = mouseX;
    pmouseY = mouseY;
    mouseX = p.x;
    mouseY = p.y;
    bladeTrail.push({ x: mouseX, y: mouseY, age: 220 });
  }

  function onPointerUp(e) {
    e.preventDefault();
    isSwiping = false;
  }

  function bindInput() {
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    canvas.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp);
  }
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });

  function unbindInput() {
    canvas.removeEventListener("mousedown", onPointerDown);
    canvas.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    canvas.removeEventListener("touchstart", onPointerDown);
    canvas.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", onPointerUp);
  }

  /* ---------- start / end ---------- */
  function startGame() {
    score = 0;
    lives = MAX_LIVES;
    fruits = [];
    halves = [];
    particles = [];
    bladeTrail = [];
    comboCount = 0;
    comboTime = 0;
    freezeTimer = 0;
    frenzyTimer = 0;
    gameTimeScale = 1;
    spawnTimer = 0;
    spawnInterval = SPAWN_INTERVAL_INITIAL;
    difficultyTimer = 0;
    running = true;
    startTime = performance.now();
    lastTime = startTime;
    updateHUD();

    /* hide start overlay if present */
    const startEl = document.getElementById("start-screen");
    if (startEl) startEl.style.display = "none";
    const overEl = document.getElementById("game-over");
    if (overEl) overEl.style.display = "none";

    bindInput();
    rafId = requestAnimationFrame(loop);
  }

  function endGame() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    unbindInput();

    const duration = ((performance.now() - startTime) / 1000).toFixed(1);
    saveBest();

    /* external submit */
    if (typeof window.FuzzyScoreSubmit === "function") {
      try { window.FuzzyScoreSubmit("fruit-ninja", score, parseFloat(duration)); } catch (_) {}
    }

    /* game-over overlay */
    const overEl = document.getElementById("game-over");
    if (overEl) {
      overEl.innerHTML = `
        <div style="text-align:center;color:#fff;padding:40px 20px;">
          <h2 style="color:${ACCENT};font-size:2.2em;margin-bottom:8px;">Game Over</h2>
          <p style="font-size:1.4em;">Score: <b>${score}</b></p>
          <p style="font-size:1em;color:#aaa;">Best: ${getBest()}</p>
          <p style="font-size:0.9em;color:#888;">Duration: ${duration}s</p>
          <button id="btn-retry" style="margin-top:20px;padding:12px 36px;font-size:1.1em;
            background:${ACCENT};color:#fff;border:none;border-radius:8px;cursor:pointer;">Play Again</button>
        </div>`;
      overEl.style.display = "flex";
      const btn = document.getElementById("btn-retry");
      if (btn) btn.addEventListener("click", startGame);
    }
  }

  /* ---------- init (public entry) ---------- */
  function init() {
    canvas = document.getElementById("game-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "game-canvas";
      const container = document.getElementById("game-container") || document.body;
      container.appendChild(canvas);
    }
    ctx = canvas.getContext("2d");
    scoreEl = document.getElementById("score-display");
    livesEl = document.getElementById("lives-display");

    resize();
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); };

    /* initial draw */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    /* start screen */
    const startEl = document.getElementById("start-screen");
    if (startEl) {
      startEl.innerHTML = `
        <div style="text-align:center;color:#fff;padding:40px 20px;">
          <h1 style="font-size:2.6em;margin-bottom:6px;">🍉 Fruit Ninja 🍌</h1>
          <p style="color:#aaa;font-size:1.1em;margin-bottom:24px;">Swipe to slice fruits • Avoid bombs!</p>
          <p style="color:#666;font-size:0.85em;margin-bottom:8px;">Best: ${getBest()}</p>
          <button id="btn-start" style="padding:14px 44px;font-size:1.2em;
            background:${ACCENT};color:#fff;border:none;border-radius:8px;cursor:pointer;">Start</button>
        </div>`;
      startEl.style.display = "flex";
      document.getElementById("btn-start").addEventListener("click", startGame);
    } else {
      /* no start screen overlay – auto-start */
      startGame();
    }
  }

  /* expose API */
  window.FruitNinja = { init, startGame, endGame };

  /* auto-init when DOM ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
