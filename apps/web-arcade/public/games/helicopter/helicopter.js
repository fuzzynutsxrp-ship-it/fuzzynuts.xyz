/* helicopter.js – FuzzyNuts Helicopter Game Engine */
(function () {
  'use strict';

  const BG_COLOR = '#0a0614';
  const HELI_COLOR = '#f97316';
  const CAVE_WALL_COLOR = '#1a1025';
  const CAVE_EDGE_COLOR = '#2d1f3d';
  const STAR_COLOR = '#facc15';
  const MINE_COLOR = '#ef4444';
  const GRAVITY = 0.35;
  const LIFT_FORCE = -0.55;
  const BASE_SPEED = 3;
  const SPEED_INCREMENT = 0.0003;
  const MIN_GAP = 160;
  const HELI_W = 48;
  const HELI_H = 28;
  const ROTOR_W = 44;
  const SEGMENT_W = 320;

  let canvas, ctx, W, H;
  let state, heli, segments, obstacles, stars, score, bestScore;
  let startTime, elapsed, speed, frameId;
  let rotorAngle = 0;
  let parallaxLayers = [];
  let keys = {};
  let holding = false;
  let flashTimer = 0;

  /* ── helpers ── */
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ── parallax background layers ── */
  function initParallax() {
    parallaxLayers = [];
    // layer 0: distant stars
    let stars0 = [];
    for (let i = 0; i < 60; i++) stars0.push({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.5), a: rand(0.2, 0.6) });
    parallaxLayers.push({ stars: stars0, speed: 0.15 });
    // layer 1: mid distant
    let stars1 = [];
    for (let i = 0; i < 40; i++) stars1.push({ x: rand(0, W), y: rand(0, H), r: rand(1, 2.5), a: rand(0.15, 0.35) });
    parallaxLayers.push({ stars: stars1, speed: 0.35 });
    // layer 2: near
    let stars2 = [];
    for (let i = 0; i < 20; i++) stars2.push({ x: rand(0, W), y: rand(0, H), r: rand(2, 4), a: rand(0.08, 0.18) });
    parallaxLayers.push({ stars: stars2, speed: 0.6 });
  }

  function drawParallax(scrollX) {
    parallaxLayers.forEach(function (layer) {
      layer.stars.forEach(function (s) {
        var sx = ((s.x - scrollX * layer.speed) % W + W) % W;
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
  }

  /* ── cave segment ── */
  function makeSegment(startX) {
    var gapY = rand(H * 0.2, H * 0.65);
    var gap = MIN_GAP - speed * 1.5;
    if (gap < 100) gap = 100;
    return { x: startX, gapY: gapY, gap: gap, passed: false };
  }

  /* ── obstacle types ── */
  function makeObstacle(x, type) {
    if (type === 'stalactite') {
      var h = rand(50, 120);
      return { type: type, x: x, y: 0, w: rand(20, 40), h: h };
    } else if (type === 'stalagmite') {
      var h2 = rand(50, 120);
      return { type: type, x: x, y: H - h2, w: rand(20, 40), h: h2 };
    } else if (type === 'barrier') {
      var by = rand(H * 0.2, H * 0.6);
      return { type: type, x: x, y: by, w: 30, h: rand(50, 90), vy: rand(0.5, 1.5) * (Math.random() < 0.5 ? 1 : -1) };
    } else { // mine
      return { type: 'mine', x: x, y: rand(H * 0.15, H * 0.75), r: rand(10, 16), pulse: 0 };
    }
  }

  function makeStar(x) {
    return { x: x, y: rand(H * 0.1, H * 0.8), collected: false, twinkle: rand(0, Math.PI * 2) };
  }

  /* ── init / reset ── */
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
    ctx = canvas.getContext('2d');
    resize();
    bestScore = parseInt((function(){try{return localStorage.getItem('helicopter_best')}catch(e){return null}})() || '0', 10);
    window.addEventListener('resize', resize);
    bindInputs();
    showStart();
  }

  function resize() {
    var parent = canvas.parentElement || document.body;
    W = parent.clientWidth || window.innerWidth;
    H = parent.clientHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }

  function reset() {
    heli = { x: 120, y: H / 2, vy: 0 };
    segments = [];
    obstacles = [];
    stars = [];
    score = 0;
    speed = BASE_SPEED;
    elapsed = 0;
    startTime = performance.now();
    window.__gameScore = 0;
    flashTimer = 0;
    // build initial segments
    for (var sx = 0; sx < W + SEGMENT_W; sx += SEGMENT_W) {
      segments.push(makeSegment(sx));
    }
    // seed obstacles
    for (var ox = 500; ox < W + 400; ox += randInt(200, 400)) {
      var types = ['stalactite', 'stalagmite', 'mine', 'barrier'];
      obstacles.push(makeObstacle(ox, types[randInt(0, 3)]));
    }
    // seed stars
    for (var stx = 600; stx < W + 400; stx += randInt(150, 350)) {
      stars.push(makeStar(stx));
    }
    initParallax();
    state = 'playing';
    if (frameId) cancelAnimationFrame(frameId);
    loop();
  }

  /* ── input ── */
  function bindInputs() {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); holding = true; keys.space = true; }
      if (state === 'start' && (e.code === 'Space' || e.key === ' ')) { reset(); }
      if (state === 'over' && (e.code === 'Space' || e.key === ' ')) { reset(); }
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'Space' || e.key === ' ') { holding = false; keys.space = false; }
    });
    canvas.addEventListener('mousedown', function (e) { e.preventDefault(); holding = true; if (state !== 'playing') reset(); });
    canvas.addEventListener('mouseup', function () { holding = false; });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); holding = true; if (state !== 'playing') reset(); }, { passive: false });
    canvas.addEventListener('touchend', function () { holding = false; });
  }

  /* ── game loop ── */
  function loop() {
    if (state !== 'playing') return;
    update();
    draw();
    frameId = requestAnimationFrame(loop);
  }

  function update() {
    elapsed = (performance.now() - startTime) / 1000;
    speed = BASE_SPEED + elapsed * SPEED_INCREMENT * 60;

    // helicopter physics
    heli.vy += GRAVITY;
    if (holding) heli.vy += LIFT_FORCE;
    heli.vy = clamp(heli.vy, -7, 7);
    heli.y += heli.vy;

    // rotor
    rotorAngle += 0.4 + speed * 0.08;

    // scroll everything left
    var scrollAmt = speed;
    segments.forEach(function (s) { s.x -= scrollAmt; });
    obstacles.forEach(function (o) { o.x -= scrollAmt; });
    stars.forEach(function (s) { s.x -= scrollAmt; });

    // recycle segments
    if (segments.length && segments[0].x + SEGMENT_W < 0) segments.shift();
    var last = segments[segments.length - 1];
    if (last && last.x + SEGMENT_W < W + SEGMENT_W) {
      segments.push(makeSegment(last.x + SEGMENT_W));
    }

    // recycle / spawn obstacles
    obstacles = obstacles.filter(function (o) { return o.x + (o.w || o.r || 30) > -50; });
    var rightMost = 0;
    obstacles.forEach(function (o) { if (o.x > rightMost) rightMost = o.x; });
    if (rightMost < W + 200) {
      var types = ['stalactite', 'stalagmite', 'mine', 'barrier'];
      obstacles.push(makeObstacle(W + rand(100, 300), types[randInt(0, 3)]));
    }

    // move barriers
    obstacles.forEach(function (o) {
      if (o.type === 'barrier') {
        o.y += o.vy;
        if (o.y < 20 || o.y + o.h > H - 20) o.vy *= -1;
      }
      if (o.type === 'mine') { o.pulse += 0.06; }
    });

    // recycle / spawn stars
    stars = stars.filter(function (s) { return s.x > -30; });
    var starRight = 0;
    stars.forEach(function (s) { if (s.x > starRight) starRight = s.x; });
    if (starRight < W + 200) {
      stars.push(makeStar(W + rand(100, 400)));
    }

    // score
    score = Math.floor(elapsed * 10);
    window.__gameScore = score;
    var scoreEl = document.getElementById('score-display');
    if (scoreEl) scoreEl.textContent = score;

    // collision: cave walls
    var heliRect = { x: heli.x, y: heli.y, w: HELI_W, h: HELI_H };
    // check each segment
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (heli.x + HELI_W > s.x && heli.x < s.x + SEGMENT_W) {
        // top wall
        if (heli.y < s.gapY - s.gap / 2) { gameOver(); return; }
        // bottom wall
        if (heli.y + HELI_H > s.gapY + s.gap / 2) { gameOver(); return; }
      }
    }

    // collision: obstacles
    for (var j = 0; j < obstacles.length; j++) {
      var o = obstacles[j];
      var oRect;
      if (o.type === 'mine') {
        oRect = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
      } else {
        oRect = { x: o.x, y: o.y, w: o.w, h: o.h };
      }
      if (rectOverlap(heliRect, oRect)) { gameOver(); return; }
    }

    // collect stars
    for (var k = 0; k < stars.length; k++) {
      var st = stars[k];
      if (st.collected) continue;
      var dx = heli.x + HELI_W / 2 - st.x;
      var dy = heli.y + HELI_H / 2 - st.y;
      if (dx * dx + dy * dy < 600) {
        st.collected = true;
        score += 50;
        flashTimer = 8;
      }
    }

    // top/bottom bounds
    if (heli.y < 0 || heli.y + HELI_H > H) { gameOver(); return; }

    if (flashTimer > 0) flashTimer--;
  }

  function gameOver() {
    state = 'over';
    if (frameId) cancelAnimationFrame(frameId);
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('helicopter_best', bestScore) } catch(e) {};
    }
    window.__gameScore = score;
    var dur = Math.floor(elapsed);
    try { if (typeof FuzzyScoreSubmit === 'function') FuzzyScoreSubmit('helicopter', score, dur); } catch (e) {}
    drawOver();
  }

  /* ── drawing ── */
  function draw() {
    // bg
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    drawParallax(elapsed * speed * 3);

    // cave walls
    segments.forEach(function (s) {
      var topH = s.gapY - s.gap / 2;
      var botY = s.gapY + s.gap / 2;
      var botH = H - botY;
      // top wall
      ctx.fillStyle = CAVE_WALL_COLOR;
      ctx.fillRect(s.x, 0, SEGMENT_W + 1, topH);
      // top edge
      ctx.fillStyle = CAVE_EDGE_COLOR;
      ctx.fillRect(s.x, topH - 6, SEGMENT_W + 1, 6);
      // bottom wall
      ctx.fillStyle = CAVE_WALL_COLOR;
      ctx.fillRect(s.x, botY, SEGMENT_W + 1, botH);
      // bottom edge
      ctx.fillStyle = CAVE_EDGE_COLOR;
      ctx.fillRect(s.x, botY, SEGMENT_W + 1, 6);
      // drip details
      for (var dx = 0; dx < SEGMENT_W; dx += 40) {
        var dripH = 8 + Math.sin((s.x + dx) * 0.05) * 6;
        ctx.fillStyle = CAVE_EDGE_COLOR;
        ctx.fillRect(s.x + dx, topH - 6 - dripH, 4, dripH);
        var dripH2 = 8 + Math.cos((s.x + dx) * 0.07) * 6;
        ctx.fillRect(s.x + dx + 10, botY, 4, dripH2);
      }
    });

    // obstacles
    obstacles.forEach(function (o) {
      if (o.type === 'stalactite') {
        ctx.fillStyle = '#2a1840';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.lineTo(o.x + o.w, o.y);
        ctx.lineTo(o.x + o.w / 2, o.y + o.h);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'stalagmite') {
        ctx.fillStyle = '#2a1840';
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.h);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.lineTo(o.x + o.w / 2, o.y);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'barrier') {
        ctx.fillStyle = '#7c3aed';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
      } else if (o.type === 'mine') {
        var pr = o.r + Math.sin(o.pulse) * 3;
        ctx.fillStyle = MINE_COLOR;
        ctx.beginPath();
        ctx.arc(o.x, o.y, pr, 0, Math.PI * 2);
        ctx.fill();
        // spikes
        for (var a = 0; a < 6; a++) {
          var angle = a * Math.PI / 3 + o.pulse * 0.3;
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(o.x + Math.cos(angle) * pr, o.y + Math.sin(angle) * pr);
          ctx.lineTo(o.x + Math.cos(angle) * (pr + 8), o.y + Math.sin(angle) * (pr + 8));
          ctx.stroke();
        }
        // glow
        ctx.globalAlpha = 0.2 + Math.sin(o.pulse) * 0.1;
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(o.x, o.y, pr + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // stars
    stars.forEach(function (st) {
      if (st.collected) return;
      st.twinkle += 0.08;
      var sa = 0.7 + Math.sin(st.twinkle) * 0.3;
      ctx.globalAlpha = sa;
      drawStar(st.x, st.y, 5, 10, 5);
      ctx.globalAlpha = 1;
    });

    // helicopter
    drawHeli();

    // flash
    if (flashTimer > 0) {
      ctx.globalAlpha = flashTimer / 8 * 0.25;
      ctx.fillStyle = STAR_COLOR;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 16, 32);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Best: ' + bestScore, 16, 54);
    ctx.fillText('Speed: ' + speed.toFixed(1) + 'x', 16, 72);
  }

  function drawHeli() {
    ctx.save();
    ctx.translate(heli.x + HELI_W / 2, heli.y + HELI_H / 2);
    // slight tilt based on vy
    var tilt = clamp(heli.vy * 2, -15, 15);
    ctx.rotate(tilt * Math.PI / 180);

    // body
    ctx.fillStyle = HELI_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, HELI_W / 2, HELI_H / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // cockpit
    ctx.fillStyle = '#fdba74';
    ctx.beginPath();
    ctx.ellipse(10, -2, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // tail
    ctx.fillStyle = HELI_COLOR;
    ctx.fillRect(-HELI_W / 2 - 14, -3, 16, 6);
    // tail rotor
    ctx.fillStyle = '#fb923c';
    ctx.save();
    ctx.translate(-HELI_W / 2 - 14, 0);
    ctx.rotate(rotorAngle * 2);
    ctx.fillRect(-1, -10, 2, 20);
    ctx.restore();

    // skids
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, HELI_H / 2 + 2);
    ctx.lineTo(16, HELI_H / 2 + 2);
    ctx.stroke();

    // main rotor
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 3;
    ctx.save();
    ctx.translate(0, -HELI_H / 2);
    ctx.rotate(rotorAngle);
    ctx.beginPath();
    ctx.moveTo(-ROTOR_W / 2, 0);
    ctx.lineTo(ROTOR_W / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -ROTOR_W / 2);
    ctx.lineTo(0, ROTOR_W / 2);
    ctx.stroke();
    ctx.restore();

    // exhaust particles
    ctx.globalAlpha = 0.3;
    for (var p = 0; p < 3; p++) {
      var px = -HELI_W / 2 - 10 - rand(0, 15);
      var py = rand(-4, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(px, py, rand(2, 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawStar(cx, cy, spikes, outerR, innerR) {
    ctx.fillStyle = STAR_COLOR;
    ctx.beginPath();
    var rot = -Math.PI / 2;
    for (var i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += Math.PI / spikes;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += Math.PI / spikes;
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawOver() {
    draw();
    ctx.fillStyle = 'rgba(10,6,20,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
    ctx.font = '24px monospace';
    ctx.fillStyle = HELI_COLOR;
    ctx.fillText('Score: ' + score, W / 2, H / 2 + 10);
    ctx.fillStyle = '#aaa';
    ctx.font = '18px monospace';
    ctx.fillText('Best: ' + bestScore, W / 2, H / 2 + 45);
    ctx.fillStyle = '#888';
    ctx.font = '16px monospace';
    ctx.fillText('Press SPACE or tap to restart', W / 2, H / 2 + 85);
    ctx.textAlign = 'left';
  }

  function showStart() {
    state = 'start';
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    initParallax();
    drawParallax(0);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HELI', W / 2, H / 2 - 60);
    ctx.fillStyle = HELI_COLOR;
    ctx.font = 'bold 28px monospace';
    ctx.fillText('FuzzyNuts', W / 2, H / 2 - 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '18px monospace';
    ctx.fillText('Hold SPACE or tap to fly', W / 2, H / 2 + 30);
    ctx.fillText('Release to drop', W / 2, H / 2 + 55);
    ctx.fillStyle = STAR_COLOR;
    ctx.fillText('★ Collect stars for bonus points', W / 2, H / 2 + 85);
    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Press SPACE or tap to start', W / 2, H / 2 + 130);
    ctx.textAlign = 'left';
  }

  /* ── bootstrap ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
