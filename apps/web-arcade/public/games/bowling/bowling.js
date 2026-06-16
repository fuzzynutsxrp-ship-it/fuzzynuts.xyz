/* ============================================================
   Bowling  –  FuzzyNuts Arcade Engine
   Canvas 2D, vanilla JS, IIFE pattern
   ============================================================ */
(function () {
  "use strict";

  /* ---------- constants ---------- */
  const BG = "#0a0614";
  const ACCENT = "#f97316";
  const ACCENT2 = "#fb923c";
  const LANE_COLOR = "#c8924a";
  const LANE_DARK = "#a0722e";
  const LANE_GUTTER = "#2a2035";
  const PIN_COLOR = "#f0f0f0";
  const PIN_STROKE = "#cccccc";
  const PIN_SHADOW = "rgba(0,0,0,0.35)";
  const BALL_RADIUS_BASE = 18;
  const PIN_RADIUS = 10;
  const PIN_MASS = 1.0;
  const BALL_MASS = 5.0;
  const GRAVITY = 0.15;
  const FRICTION = 0.985;
  const PIN_FRICTION = 0.97;
  const PIN_BOUNCE = 0.65;
  const ROLL_SPEED_MAX = 18;
  const ROLL_SPEED_MIN = 6;
  const SPIN_FACTOR = 0.35;
  const MAX_FRAMES = 10;

  /* pin triangle layout (rows from front to back) */
  const PIN_ROWS = [
    [0],        // pin 1
    [-1, 1],    // pins 2-3
    [-2, 0, 2], // pins 4-5-6
    [-3, -1, 1, 3] // pins 7-8-9-10
  ];

  /* ---------- state ---------- */
  let canvas, ctx, W, H;
  let running = false;
  let score = 0;
  let frameScores = []; // {rolls:[], cumulative, isStrike, isSpare}
  let currentFrame = 0;
  let currentRoll = 0; // 0 or 1 (or 2 in 10th frame)
  let pinsDown = [];    // which pins are down (by index)
  let standingPins = []; // all 10 pins, true if standing
  let startTime = 0;
  let lastTime = 0;

  /* ball state */
  let ball = null;
  let ballRolling = false;
  let ballSpin = 0;
  let ballTrail = [];

  /* pin state */
  let pins = [];
  let pinAnimating = false;
  let settleTimer = 0;

  /* aiming state */
  let aiming = false;
  let aimStartX = 0, aimStartY = 0;
  let aimEndX = 0, aimEndY = 0;
  let aimAngle = 0;
  let aimPower = 0;
  let spinPreview = 0;

  /* interaction */
  let mouseX = 0, mouseY = 0;
  let pointerDown = false;

  /* animations */
  let particles = [];
  let flashTimer = 0;
  let flashType = ""; // "strike" | "spare"
  let perfectBanner = false;

  /* HUD */
  let scoreEl;

  /* raf */
  let rafId = null;

  /* ---------- helpers ---------- */
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function getLaneMetrics() {
    const laneW = Math.min(W * 0.3, 220);
    const laneH = H * 0.72;
    const laneX = (W - laneW) / 2;
    const laneY = H * 0.06;
    return { laneX, laneY, laneW, laneH };
  }

  function getPinPositions() {
    const { laneX, laneY, laneW, laneH } = getLaneMetrics();
    const cx = laneX + laneW / 2;
    const startY = laneY + laneH * 0.12;
    const rowSpacing = PIN_RADIUS * 4.2;
    const colSpacing = PIN_RADIUS * 2.6;
    const positions = [];
    PIN_ROWS.forEach((row, ri) => {
      row.forEach(offset => {
        positions.push({
          x: cx + offset * colSpacing,
          y: startY + ri * rowSpacing,
          origX: cx + offset * colSpacing,
          origY: startY + ri * rowSpacing
        });
      });
    });
    return positions;
  }

  function getBallStartPos() {
    const { laneX, laneY, laneW, laneH } = getLaneMetrics();
    return {
      x: laneX + laneW / 2,
      y: laneY + laneH * 0.88
    };
  }

  /* ---------- score computation ---------- */
  function computeScores() {
    frameScores = [];
    let rollIndex = 0;
    const allRolls = [];

    /* flatten all rolls */
    for (let f = 0; f < MAX_FRAMES; f++) {
      const fr = rawFrames[f];
      if (!fr) break;
      fr.rolls.forEach(r => allRolls.push(r));
    }

    rollIndex = 0;
    let cumulative = 0;
    for (let f = 0; f < MAX_FRAMES; f++) {
      if (rollIndex >= allRolls.length) break;
      const entry = { rolls: [], cumulative: 0, isStrike: false, isSpare: false };

      if (f < 9) {
        if (allRolls[rollIndex] === 10) {
          /* strike */
          entry.isStrike = true;
          entry.rolls.push(10);
          let bonus = 0;
          if (rollIndex + 1 < allRolls.length) bonus += allRolls[rollIndex + 1];
          if (rollIndex + 2 < allRolls.length) bonus += allRolls[rollIndex + 2];
          cumulative += 10 + bonus;
          entry.cumulative = cumulative;
          rollIndex += 1;
        } else if (rollIndex + 1 < allRolls.length) {
          const sum = allRolls[rollIndex] + allRolls[rollIndex + 1];
          entry.rolls.push(allRolls[rollIndex], allRolls[rollIndex + 1]);
          if (sum === 10) {
            entry.isSpare = true;
            let bonus = 0;
            if (rollIndex + 2 < allRolls.length) bonus = allRolls[rollIndex + 2];
            cumulative += 10 + bonus;
          } else {
            cumulative += sum;
          }
          entry.cumulative = cumulative;
          rollIndex += 2;
        } else {
          entry.rolls.push(allRolls[rollIndex]);
          cumulative += allRolls[rollIndex];
          entry.cumulative = cumulative;
          rollIndex += 1;
        }
      } else {
        /* 10th frame: up to 3 rolls */
        const tenthRolls = allRolls.slice(rollIndex);
        tenthRolls.forEach(r => entry.rolls.push(r));
        const tenthSum = tenthRolls.reduce((a, b) => a + b, 0);
        if (tenthRolls.length >= 2) {
          const first = tenthRolls[0];
          const second = tenthRolls[1];
          if (first === 10) {
            entry.isStrike = true;
            if (second === 10) {} // possible
          } else if (first + second === 10) {
            entry.isSpare = true;
          }
        }
        cumulative += tenthSum;
        entry.cumulative = cumulative;
      }
      frameScores.push(entry);
    }
  }

  /* raw frames data */
  let rawFrames = [];

  function resetScoring() {
    rawFrames = [];
    frameScores = [];
    for (let i = 0; i < MAX_FRAMES; i++) {
      rawFrames.push({ rolls: [], pinsDown: [] });
    }
    currentFrame = 0;
    currentRoll = 0;
    score = 0;
  }

  function updateHUD() {
    computeScores();
    score = frameScores.length > 0 ? frameScores[frameScores.length - 1].cumulative : 0;
    window.__gameScore = score;
    if (scoreEl) scoreEl.textContent = score;
  }

  function saveBest() {
    const key = "bowling_best";
    const prev = parseInt((function(){try{return localStorage.getItem(key)}catch(e){return null}})() || "0", 10);
    if (score > prev) try { localStorage.setItem(key, score) } catch(e) {};
  }

  function getBest() {
    return parseInt((function(){try{return localStorage.getItem("bowling_best")}catch(e){return null}})() || "0", 10);
  }

  /* ---------- resize ---------- */
  function resize() {
    const parent = canvas.parentElement || document.body;
    W = canvas.width = parent.clientWidth || 800;
    H = canvas.height = parent.clientHeight || 700;
  }

  /* ---------- pin setup ---------- */
  function setupPins() {
    const positions = getPinPositions();
    pins = positions.map((pos, i) => ({
      x: pos.x, y: pos.y,
      origX: pos.origX, origY: pos.origY,
      vx: 0, vy: 0,
      standing: true,
      falling: false,
      fallAngle: 0,
      fallDir: 0,
      radius: PIN_RADIUS,
      index: i
    }));
    standingPins = new Array(10).fill(true);
  }

  function setupBall() {
    const start = getBallStartPos();
    ball = {
      x: start.x, y: start.y,
      vx: 0, vy: 0,
      radius: BALL_RADIUS_BASE,
      rolling: false,
      spin: 0,
      rotation: 0,
      hue: randInt(0, 360)
    };
    ballTrail = [];
    ballRolling = false;
  }

  /* ---------- particles ---------- */
  function emitParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: rand(-3, 3), vy: rand(-5, 1),
        life: rand(0.3, 0.9),
        maxLife: 1,
        radius: rand(2, 4),
        color
      });
    }
  }

  /* ---------- pin physics ---------- */
  function updatePins(dt) {
    let anyMoving = false;

    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (!p.standing && !p.falling) continue;

      if (p.falling) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= PIN_FRICTION;
        p.vy *= PIN_FRICTION;
        p.fallAngle += p.fallDir * 0.12;
        if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) anyMoving = true;
        continue;
      }

      if (p.standing) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= PIN_FRICTION;
        p.vy *= PIN_FRICTION;
        if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) anyMoving = true;
      }
    }

    /* pin-pin collisions */
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i], b = pins[j];
        if (!a.standing && !a.falling) continue;
        if (!b.standing && !b.falling) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const minDist = a.radius + b.radius;
        if (d < minDist && d > 0.01) {
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          const overlap = minDist - d;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          /* transfer momentum */
          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVn = relVx * nx + relVy * ny;
          if (relVn > 0) {
            const impulse = relVn * PIN_BOUNCE;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }

          /* check if either should fall */
          const speedA = Math.hypot(a.vx, a.vy);
          const speedB = Math.hypot(b.vx, b.vy);
          if (a.standing && speedA > 1.8) {
            a.standing = false;
            a.falling = true;
            a.fallDir = a.vx > 0 ? 1 : -1;
          }
          if (b.standing && speedB > 1.8) {
            b.standing = false;
            b.falling = true;
            b.fallDir = b.vx > 0 ? 1 : -1;
          }
        }
      }
    }

    return anyMoving;
  }

  function updateBall(dt) {
    if (!ball || !ball.rolling) return;

    /* spin causes curve */
    ball.vx += ball.spin * SPIN_FACTOR * 0.05;
    ball.rotation += ball.spin * 0.15;

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vy *= FRICTION;

    /* trail */
    if (ball.rolling) {
      ballTrail.push({ x: ball.x, y: ball.y, age: 1.0 });
    }

    /* check pin collisions */
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (!p.standing) continue;
      const d = dist(ball.x, ball.y, p.x, p.y);
      if (d < ball.radius + p.radius) {
        const nx = (p.x - ball.x) / d;
        const ny = (p.y - ball.y) / d;
        const overlap = (ball.radius + p.radius) - d;
        p.x += nx * overlap;
        p.y += ny * overlap;

        /* transfer ball momentum to pin */
        const speed = Math.hypot(ball.vx, ball.vy);
        const impulse = speed * 0.7 * (BALL_MASS / PIN_MASS);
        p.vx = nx * impulse + ball.vx * 0.2;
        p.vy = ny * impulse + ball.vy * 0.15;

        /* ball deflects slightly */
        ball.vx *= 0.85;
        ball.vy *= 0.9;

        /* pin falls if hit hard enough */
        if (impulse > 2.0) {
          p.standing = false;
          p.falling = true;
          p.fallDir = p.vx > 0 ? 1 : -1;
          standingPins[p.index] = false;
          emitParticles(p.x, p.y, "#ffffff", 6);
        }
      }
    }

    /* ball gutter check */
    const { laneX, laneW } = getLaneMetrics();
    if (ball.x < laneX - ball.radius || ball.x > laneX + laneW + ball.radius) {
      ball.vx *= 0.5; // slow down in gutter
    }

    /* check if ball went past pins */
    const { laneY, laneH } = getLaneMetrics();
    if (ball.y < laneY - 30) {
      ball.rolling = false;
      ballRolling = false;
      beginSettle();
    }
  }

  /* ---------- settle and advance frame ---------- */
  function beginSettle() {
    pinAnimating = true;
    settleTimer = 0;
  }

  function checkSettle() {
    if (!pinAnimating) return;

    const anyMoving = updatePins(1);
    settleTimer++;

    /* timeout safety */
    if (!anyMoving || settleTimer > 120) {
      pinAnimating = false;
      settleTimer = 0;
      recordRoll();
    }
  }

  function countPinsDown() {
    let count = 0;
    for (let i = 0; i < pins.length; i++) {
      if (!pins[i].standing) count++;
    }
    return count;
  }

  function recordRoll() {
    const totalDown = countPinsDown();
    const prevDown = rawFrames[currentFrame].pinsDown.length > 0 ?
      rawFrames[currentFrame].pinsDown[rawFrames[currentFrame].pinsDown.length - 1] : 0;
    const thisRollPins = totalDown - prevDown;

    rawFrames[currentFrame].rolls.push(thisRollPins);
    rawFrames[currentFrame].pinsDown.push(totalDown);

    updateHUD();

    /* check for strike/spare animation */
    if (currentFrame < 9) {
      if (currentRoll === 0 && totalDown === 10) {
        /* strike */
        flashType = "strike";
        flashTimer = 90;
        emitParticles(W / 2, H / 2, ACCENT, 60);
        emitParticles(W / 2, H / 2, "#fbbf24", 40);
        currentFrame++;
        currentRoll = 0;
        resetForNextFrame();
        return;
      } else if (currentRoll === 0) {
        currentRoll = 1;
        setupBall();
        return;
      } else {
        /* second roll done */
        if (totalDown === 10) {
          flashType = "spare";
          flashTimer = 70;
          emitParticles(W / 2, H / 2, ACCENT2, 40);
        }
        currentFrame++;
        currentRoll = 0;
        resetForNextFrame();
        return;
      }
    } else {
      /* 10th frame */
      const tenthRolls = rawFrames[9].rolls;
      const tenthDown = rawFrames[9].pinsDown;
      const numRolls = tenthRolls.length;

      if (numRolls === 1) {
        if (totalDown === 10) {
          flashType = "strike";
          flashTimer = 90;
          /* reset pins for next roll in 10th */
          setupPins();
          for (let i = 0; i < 10; i++) pins[i].standing = true;
          standingPins = new Array(10).fill(true);
        }
        currentRoll = 1;
        setupBall();
        return;
      }

      if (numRolls === 2) {
        const first = tenthRolls[0];
        const second = tenthRolls[1];
        const needThird = (first === 10 || first + second >= 10);

        if (first === 10 && second === 10) {
          flashType = "strike";
          flashTimer = 90;
          setupPins();
          standingPins = new Array(10).fill(true);
          currentRoll = 2;
          setupBall();
          return;
        } else if (first === 10 && second < 10) {
          currentRoll = 2;
          setupBall();
          return;
        } else if (first + second === 10) {
          flashType = "spare";
          flashTimer = 70;
          /* reset pins for bonus roll */
          setupPins();
          standingPins = new Array(10).fill(true);
          currentRoll = 2;
          setupBall();
          return;
        }
        /* open frame in 10th, game over */
        endGame();
        return;
      }

      if (numRolls === 3) {
        if (tenthRolls[2] === 10 || totalDown === 30) {
          flashType = "strike";
          flashTimer = 90;
        }
        endGame();
        return;
      }
    }
  }

  function resetForNextFrame() {
    if (currentFrame >= MAX_FRAMES) {
      endGame();
      return;
    }
    setupPins();
    setupBall();
  }

  /* ---------- aim & launch ---------- */
  function launchBall() {
    if (ballRolling || pinAnimating) return;

    /* calculate angle and power from drag */
    const dx = aimEndX - aimStartX;
    const dy = aimEndY - aimStartY;
    const dragDist = Math.hypot(dx, dy);

    if (dragDist < 10) return; // too short drag

    aimAngle = Math.atan2(dy, dx);
    aimPower = clamp(dragDist / 150, 0, 1);

    const speed = lerp(ROLL_SPEED_MIN, ROLL_SPEED_MAX, aimPower);
    ball.vx = Math.cos(aimAngle) * speed * 0.15;
    ball.vy = -speed;
    ball.spin = spinPreview;
    ball.rolling = true;
    ballRolling = true;
    aiming = false;
  }

  /* ---------- input ---------- */
  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  function onPointerDown(e) {
    if (!running) return;
    if (ballRolling || pinAnimating) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    pointerDown = true;
    aiming = true;
    aimStartX = pos.x;
    aimStartY = pos.y;
    aimEndX = pos.x;
    aimEndY = pos.y;
    spinPreview = 0;
  }

  function onPointerMove(e) {
    if (!running) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    mouseX = pos.x;
    mouseY = pos.y;
    if (aiming && pointerDown) {
      aimEndX = pos.x;
      aimEndY = pos.y;
      /* calculate spin from horizontal drag */
      const dx = aimEndX - aimStartX;
      spinPreview = clamp(dx / 80, -1, 1);
    }
  }

  function onPointerUp(e) {
    if (!running) return;
    e.preventDefault();
    if (aiming) {
      launchBall();
    }
    pointerDown = false;
  }

  function bindInput() {
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    canvas.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });
  }

  function unbindInput() {
    canvas.removeEventListener("mousedown", onPointerDown);
    canvas.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    canvas.removeEventListener("touchstart", onPointerDown);
    canvas.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("touchend", onPointerUp);
  }

  /* ---------- drawing ---------- */
  function drawLane() {
    const { laneX, laneY, laneW, laneH } = getLaneMetrics();
    const gW = laneW * 0.12;

    /* gutters */
    ctx.fillStyle = LANE_GUTTER;
    ctx.fillRect(laneX - gW, laneY, gW, laneH);
    ctx.fillRect(laneX + laneW, laneY, gW, laneH);

    /* lane surface */
    const gradient = ctx.createLinearGradient(laneX, laneY, laneX + laneW, laneY);
    gradient.addColorStop(0, LANE_DARK);
    gradient.addColorStop(0.3, LANE_COLOR);
    gradient.addColorStop(0.5, "#d4a055");
    gradient.addColorStop(0.7, LANE_COLOR);
    gradient.addColorStop(1, LANE_DARK);
    ctx.fillStyle = gradient;
    ctx.fillRect(laneX, laneY, laneW, laneH);

    /* wood grain lines */
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    for (let x = laneX + 8; x < laneX + laneW; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, laneY);
      ctx.lineTo(x, laneY + laneH);
      ctx.stroke();
    }

    /* foul line */
    const foulY = laneY + laneH * 0.82;
    ctx.strokeStyle = "#ffffff88";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laneX, foulY);
    ctx.lineTo(laneX + laneW, foulY);
    ctx.stroke();

    /* arrows (decorative) */
    const arrowY = laneY + laneH * 0.55;
    const arrowSpacing = laneW / 7;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 1; i <= 5; i++) {
      const ax = laneX + arrowSpacing * i + arrowSpacing * 0.5;
      ctx.beginPath();
      ctx.moveTo(ax, arrowY);
      ctx.lineTo(ax - 5, arrowY + 14);
      ctx.lineTo(ax + 5, arrowY + 14);
      ctx.closePath();
      ctx.fill();
    }

    /* lane borders */
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.strokeRect(laneX, laneY, laneW, laneH);
  }

  function drawPins() {
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.falling) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.fallAngle);
        /* shadow */
        ctx.fillStyle = PIN_SHADOW;
        ctx.beginPath();
        ctx.ellipse(2, 2, p.radius, p.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        /* pin body */
        ctx.fillStyle = PIN_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PIN_STROKE;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        /* red stripe */
        ctx.strokeStyle = "#cc3333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.55, -0.3, 0.3);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (!p.standing) continue;

      /* pin shadow */
      ctx.fillStyle = PIN_SHADOW;
      ctx.beginPath();
      ctx.ellipse(p.x + 2, p.y + 2, p.radius, p.radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      /* pin body */
      ctx.fillStyle = PIN_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PIN_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* neck (smaller circle on top) */
      ctx.fillStyle = PIN_COLOR;
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.radius * 0.55, p.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PIN_STROKE;
      ctx.lineWidth = 1;
      ctx.stroke();

      /* red stripe */
      ctx.strokeStyle = "#cc3333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.radius * 0.2, p.radius * 0.55, -0.5, 0.5);
      ctx.stroke();
    }
  }

  function drawBall() {
    if (!ball) return;

    /* trail */
    for (let i = 0; i < ballTrail.length; i++) {
      const t = ballTrail[i];
      ctx.globalAlpha = t.age * 0.3;
      ctx.fillStyle = "#f9731655";
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * 0.6 * t.age, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* ball shadow */
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(ball.x + 3, ball.y + 3, ball.radius, ball.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    /* ball body */
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    /* main sphere */
    const bGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ball.radius);
    const hue = ball.hue;
    bGrad.addColorStop(0, `hsl(${hue}, 70%, 65%)`);
    bGrad.addColorStop(0.7, `hsl(${hue}, 60%, 45%)`);
    bGrad.addColorStop(1, `hsl(${hue}, 50%, 25%)`);
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    /* finger holes */
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(-4, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    /* spin indicator */
    if (ball.rolling && Math.abs(ball.spin) > 0.05) {
      const spinDir = ball.spin > 0 ? 1 : -1;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius + 5, -0.5 * spinDir, 1.2 * spinDir);
      ctx.stroke();

      /* small arrow for spin direction */
      const arrowAngle = 0.8 * spinDir;
      const arrowR = ball.radius + 8;
      const ax = Math.cos(arrowAngle) * arrowR;
      const ay = Math.sin(arrowAngle) * arrowR;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 5 * spinDir, ay - 4);
      ctx.lineTo(ax + 5 * spinDir, ay + 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function drawAimLine() {
    if (!aiming || !pointerDown) return;

    const dx = aimEndX - aimStartX;
    const dy = aimEndY - aimStartY;
    const dragDist = Math.hypot(dx, dy);
    if (dragDist < 10) return;

    const angle = Math.atan2(dy, dx);
    const power = clamp(dragDist / 150, 0, 1);

    /* aim guide line */
    ctx.strokeStyle = `rgba(249,115,22,${0.3 + power * 0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);

    /* curved trajectory preview */
    let cx = ball.x;
    let cy = ball.y;
    const spin = clamp(dx / 80, -1, 1);
    for (let t = 0; t < 40; t++) {
      const speed = lerp(ROLL_SPEED_MIN, ROLL_SPEED_MAX, power);
      cx += Math.cos(angle) * speed * 0.15 * 0.4 + spin * SPIN_FACTOR * 0.05 * t * 0.4;
      cy += -speed * 0.4;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    /* power meter */
    const pmX = aimStartX + 30;
    const pmY = aimStartY;
    const pmH = 100;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(pmX, pmY - pmH, 12, pmH);
    const fillH = pmH * power;
    const pColor = power < 0.4 ? "#22c55e" : power < 0.7 ? "#fbbf24" : "#ef4444";
    ctx.fillStyle = pColor;
    ctx.fillRect(pmX, pmY - fillH, 12, fillH);
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 1;
    ctx.strokeRect(pmX, pmY - pmH, 12, pmH);

    /* power label */
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(power * 100)}%`, pmX + 6, pmY - pmH - 6);

    /* spin indicator */
    const spinLabel = spin < -0.1 ? "◄ Spin" : spin > 0.1 ? "Spin ►" : "No Spin";
    ctx.fillStyle = ACCENT;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(spinLabel, aimStartX, aimStartY + 25);
  }

  function drawScoreboard() {
    const frameW = Math.min(W * 0.075, 62);
    const frameH = 70;
    const startX = (W - frameW * 10 - 8 * 9) / 2;
    const startY = H - frameH - 12;

    ctx.fillStyle = "rgba(10,6,20,0.85)";
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1;
    roundRect(startX - 6, startY - 6, frameW * 10 + 8 * 9 + 12, frameH + 12, 6, true, true);

    for (let f = 0; f < MAX_FRAMES; f++) {
      const fx = startX + f * (frameW + 8);
      const fy = startY;
      const entry = frameScores[f];
      const isActive = (f === currentFrame && running);

      /* frame background */
      ctx.fillStyle = isActive ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(fx, fy, frameW, frameH);
      ctx.strokeStyle = isActive ? ACCENT : "rgba(255,255,255,0.15)";
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(fx, fy, frameW, frameH);

      /* frame number */
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(f + 1, fx + 3, fy + 12);

      /* roll boxes */
      if (entry) {
        const boxH = 22;
        const boxW = frameW < 50 ? 18 : 22;

        if (f < 9) {
          /* frame 1-9: two small boxes at top right */
          const bx1 = fx + frameW - boxW * 2;
          const bx2 = fx + frameW - boxW;
          const by = fy;

          ctx.strokeStyle = "rgba(255,255,255,0.1)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bx1, by, boxW, boxH);
          ctx.strokeRect(bx2, by, boxW, boxH);

          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";

          if (entry.rolls.length >= 1) {
            if (entry.isStrike) {
              ctx.fillStyle = ACCENT;
              ctx.fillText("X", bx1 + boxW, by + boxH - 6);
            } else {
              ctx.fillStyle = "#fff";
              ctx.fillText(entry.rolls[0] === 0 ? "-" : entry.rolls[0], bx1 + boxW / 2, by + boxH - 6);
            }
          }

          if (entry.rolls.length >= 2 && !entry.isStrike) {
            if (entry.isSpare) {
              ctx.fillStyle = ACCENT2;
              ctx.fillText("/", bx2 + boxW / 2, by + boxH - 6);
            } else {
              ctx.fillStyle = "#fff";
              ctx.fillText(entry.rolls[1] === 0 ? "-" : entry.rolls[1], bx2 + boxW / 2, by + boxH - 6);
            }
          }
        } else {
          /* 10th frame: three small boxes */
          const box10W = Math.min(boxW, frameW / 3);
          for (let r = 0; r < 3; r++) {
            const bx = fx + r * box10W;
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(bx, fy, box10W, boxH);

            if (entry.rolls.length > r) {
              ctx.font = "bold 12px sans-serif";
              ctx.textAlign = "center";
              const rv = entry.rolls[r];
              if (rv === 10) {
                ctx.fillStyle = ACCENT;
                ctx.fillText("X", bx + box10W / 2, fy + boxH - 6);
              } else if (r > 0 && entry.rolls[r - 1] + rv === 10 && entry.rolls[r - 1] !== 10) {
                ctx.fillStyle = ACCENT2;
                ctx.fillText("/", bx + box10W / 2, fy + boxH - 6);
              } else {
                ctx.fillStyle = "#fff";
                ctx.fillText(rv === 0 ? "-" : rv, bx + box10W / 2, fy + boxH - 6);
              }
            }
          }
        }

        /* cumulative score */
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        if (entry.cumulative > 0) {
          ctx.fillText(entry.cumulative, fx + frameW / 2, fy + frameH - 10);
        }
      }
    }
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
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
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 0.02;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFlash() {
    if (flashTimer <= 0) return;
    flashTimer--;

    const alpha = flashTimer / 90;
    ctx.globalAlpha = alpha;

    if (flashType === "strike") {
      /* big X flash */
      ctx.fillStyle = ACCENT;
      ctx.font = `bold ${60 + (90 - flashTimer)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("STRIKE!", W / 2, H / 2 - 40);
      /* decorative lines */
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      const spread = (90 - flashTimer) * 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - spread, H / 2 + 10);
      ctx.lineTo(W / 2 + spread, H / 2 + 10);
      ctx.stroke();
    } else if (flashType === "spare") {
      ctx.fillStyle = ACCENT2;
      ctx.font = `bold ${50 + (70 - flashTimer)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SPARE!", W / 2, H / 2 - 40);
    }

    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
  }

  function drawPerfectBanner() {
    if (!perfectBanner) return;
    const t = (performance.now() % 3000) / 3000;
    const hue = Math.round(t * 360);
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    ctx.font = `bold ${Math.min(W * 0.08, 56)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎳 PERFECT GAME! 300! 🎳", W / 2, H / 2 - 80);
    ctx.textBaseline = "alphabetic";
  }

  function drawHUD() {
    /* current frame/roll info */
    if (running) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Frame ${currentFrame + 1}  Roll ${currentRoll + 1}`, 16, 28);

      /* best score */
      ctx.textAlign = "right";
      ctx.fillText(`Best: ${getBest()}`, W - 16, 28);
    }
  }

  /* ---------- game loop ---------- */
  function loop(timestamp) {
    if (!running) return;

    const dt = Math.min((timestamp - lastTime) / 16.67, 3);
    lastTime = timestamp;

    /* update */
    if (ball && ball.rolling) {
      updateBall(dt);
    }

    if (pinAnimating) {
      checkSettle();
    } else {
      updatePins(dt);
    }

    /* update trail */
    for (let i = ballTrail.length - 1; i >= 0; i--) {
      ballTrail[i].age -= 0.03;
      if (ballTrail[i].age <= 0) ballTrail.splice(i, 1);
    }

    /* draw */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    drawLane();
    drawPins();
    drawBall();
    drawAimLine();
    drawParticles();
    drawFlash();
    drawPerfectBanner();
    drawScoreboard();
    drawHUD();

    rafId = requestAnimationFrame(loop);
  }

  /* ---------- start / end ---------- */
  function startGame() {
    score = 0;
    currentFrame = 0;
    currentRoll = 0;
    flashTimer = 0;
    flashType = "";
    perfectBanner = false;
    particles = [];
    resetScoring();
    setupPins();
    setupBall();
    running = true;
    startTime = performance.now();
    lastTime = startTime;
    updateHUD();

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

    /* perfect game check */
    if (score === 300) {
      perfectBanner = true;
    }

    /* external submit */
    if (typeof window.FuzzyScoreSubmit === "function") {
      try { window.FuzzyScoreSubmit("bowling", score, parseFloat(duration)); } catch (_) {}
    }

    /* game-over overlay */
    const overEl = document.getElementById("game-over");
    if (overEl) {
      const isPerfect = score === 300;
      const headerColor = isPerfect ? "#fbbf24" : ACCENT;
      const headerText = isPerfect ? "🎳 PERFECT GAME! 🎳" : "Game Over";
      const perfectMsg = isPerfect ? `<p style="color:#fbbf24;font-size:1.2em;margin:8px 0;">✨ 300 — Flawless Victory! ✨</p>` : "";

      overEl.innerHTML = `
        <div style="text-align:center;color:#fff;padding:40px 20px;">
          <h2 style="color:${headerColor};font-size:2.2em;margin-bottom:8px;">${headerText}</h2>
          ${perfectMsg}
          <p style="font-size:1.4em;">Score: <b>${score}</b></p>
          <p style="font-size:1em;color:#aaa;">Best: ${getBest()}</p>
          <p style="font-size:0.9em;color:#888;">Duration: ${duration}s</p>
          <p style="font-size:0.8em;color:#666;margin-top:8px;">Frames: ${formatFrameSummary()}</p>
          <button id="btn-retry" style="margin-top:20px;padding:12px 36px;font-size:1.1em;
            background:${ACCENT};color:#fff;border:none;border-radius:8px;cursor:pointer;">Play Again</button>
        </div>`;
      overEl.style.display = "flex";
      const btn = document.getElementById("btn-retry");
      if (btn) btn.addEventListener("click", startGame);
    }
  }

  function formatFrameSummary() {
    const parts = [];
    for (let f = 0; f < frameScores.length; f++) {
      const entry = frameScores[f];
      if (!entry) break;
      if (entry.isStrike) parts.push("X");
      else if (entry.isSpare) parts.push("/");
      else parts.push(entry.rolls.reduce((a, b) => a + b, 0));
    }
    return parts.join(" | ");
  }

  /* ---------- init ---------- */
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

    resize();
    window.addEventListener("resize", resize);

    /* initial draw */
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    /* start screen */
    const startEl = document.getElementById("start-screen");
    if (startEl) {
      startEl.innerHTML = `
        <div style="text-align:center;color:#fff;padding:40px 20px;">
          <h1 style="font-size:2.6em;margin-bottom:6px;">🎳 Bowling</h1>
          <p style="color:#aaa;font-size:1.1em;margin-bottom:10px;">FuzzyNuts Arcade</p>
          <p style="color:#888;font-size:0.9em;margin-bottom:20px;line-height:1.6;">
            Drag to aim • Release to throw<br>
            Swipe sideways for spin
          </p>
          <p style="color:#666;font-size:0.85em;margin-bottom:8px;">Best: ${getBest()}</p>
          <button id="btn-start" style="padding:14px 44px;font-size:1.2em;
            background:${ACCENT};color:#fff;border:none;border-radius:8px;cursor:pointer;">Start</button>
        </div>`;
      startEl.style.display = "flex";
      document.getElementById("btn-start").addEventListener("click", startGame);
    } else {
      startGame();
    }
  }

  /* expose API */
  window.Bowling = { init, startGame, endGame };

  /* auto-init when DOM ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
