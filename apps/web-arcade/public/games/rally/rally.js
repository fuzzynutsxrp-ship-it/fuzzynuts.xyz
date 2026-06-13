(function() {
  'use strict';

  /* ─── constants ─── */
  const BG_COLOR      = '#0a0614';
  const GOLD           = '#fbbf24';
  const ROAD_COLOR     = '#2a2a3e';
  const ROAD_EDGE      = '#1a1a2e';
  const GRASS_COLOR    = '#1a3a1a';
  const DIRT_COLOR     = '#3a2a1a';
  const CURB_COLOR     = '#cc3333';
  const FINISH_COLOR   = '#ffffff';
  const TREE_COLOR     = '#1a5a2a';
  const ROCK_COLOR     = '#4a4a5a';
  const DUST_COLOR     = '#8a7a5a';
  const TIRE_MARK      = 'rgba(40,40,40,0.5)';
  const AI_CAR_COLOR   = '#5566cc';

  const ROAD_WIDTH     = 120;
  const TOTAL_LAPS     = 3;
  const TRACK_POINTS   = 60;
  const TRACK_RADIUS   = 1800;

  const MAX_SPEED      = 8;
  const ACCEL          = 0.12;
  const BRAKE_FORCE    = 0.15;
  const FRICTION       = 0.02;
  const OFF_ROAD_FRIC  = 0.06;
  const STEER_SPEED    = 0.04;
  const DRIFT_FACTOR   = 0.92;
  const HANDBRAKE_DRIFT= 0.85;

  const MINIMAP_SIZE   = 160;
  const MINIMAP_PAD    = 12;

  /* ─── state ─── */
  let canvas, ctx, W, H;
  let gameActive = false, gameOver = false, countdown = 0, countdownTimer = 0;
  let raceStartTime = 0, raceDuration = 0;
  let score = 0, bestScore = parseInt(localStorage.getItem('rally_best') || '0');
  let currentLap = 1, lapStartTime = 0, lastLapTime = 0, bestLapTime = Infinity;
  let cleanLap = true;
  let trackPoints = [], trackPolyLeft = [], trackPolyRight = [];
  let obstacles = [], aiCars = [];
  let tireMarks = [], dustParticles = [];

  /* player */
  let car = { x:0, y:0, angle:0, speed:0, driftAngle:0, drifting:false, onTrack:true };

  /* input */
  let keys = {};
  let touchState = { left:false, right:false, up:false, down:false, handbrake:false };

  /* camera */
  let camX = 0, camY = 0;

  /* ─── procedural track ─── */
  function generateTrack() {
    trackPoints = [];
    let cx = 0, cy = 0;
    let angle = 0;
    const segLen = 120;
    for (let i = 0; i < TRACK_POINTS; i++) {
      trackPoints.push({ x: cx, y: cy });
      angle += (Math.sin(i * 0.3) * 0.6 + Math.cos(i * 0.17) * 0.4) * 0.15;
      cx += Math.cos(angle) * segLen;
      cy += Math.sin(angle) * segLen;
    }
    /* close the loop smoothly */
    const dx = trackPoints[0].x - cx;
    const dy = trackPoints[0].y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      trackPoints.push({
        x: cx + dx * t,
        y: cy + dy * t
      });
    }
    trackPoints.push({ x: trackPoints[0].x, y: trackPoints[0].y });

    /* build edge polygons */
    trackPolyLeft = [];
    trackPolyRight = [];
    for (let i = 0; i < trackPoints.length; i++) {
      const p = trackPoints[i];
      const next = trackPoints[(i + 1) % trackPoints.length];
      const prev = trackPoints[(i - 1 + trackPoints.length) % trackPoints.length];
      const dx2 = next.x - prev.x;
      const dy2 = next.y - prev.y;
      const len = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
      const nx = -dy2 / len;
      const ny = dx2 / len;
      trackPolyLeft.push({ x: p.x + nx * ROAD_WIDTH/2, y: p.y + ny * ROAD_WIDTH/2 });
      trackPolyRight.push({ x: p.x - nx * ROAD_WIDTH/2, y: p.y - ny * ROAD_WIDTH/2 });
    }
  }

  function getTrackNormal(i) {
    const n = trackPoints.length;
    const next = trackPoints[(i + 1) % n];
    const prev = trackPoints[(i - 1 + n) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    return { x: -dy/len, y: dx/len };
  }

  /* ─── obstacles ─── */
  function generateObstacles() {
    obstacles = [];
    const n = trackPoints.length;
    for (let i = 0; i < n; i += 3) {
      const p = trackPoints[i];
      const norm = getTrackNormal(i);
      const off = ROAD_WIDTH/2 + 30 + Math.random() * 200;
      if (Math.random() < 0.5) {
        obstacles.push({ type:'tree', x: p.x + norm.x * off, y: p.y + norm.y * off, r: 12 + Math.random()*8 });
      }
      if (Math.random() < 0.3) {
        obstacles.push({ type:'tree', x: p.x - norm.x * off, y: p.y - norm.y * off, r: 12 + Math.random()*8 });
      }
      if (Math.random() < 0.15) {
        obstacles.push({ type:'rock', x: p.x + norm.x * (off+40), y: p.y + norm.y * (off+40), r: 8 + Math.random()*6 });
      }
    }
  }

  function generateAICars() {
    aiCars = [];
    const n = trackPoints.length;
    for (let i = 0; i < 4; i++) {
      const startSeg = Math.floor(Math.random() * n);
      aiCars.push({
        segIndex: startSeg,
        t: Math.random(),
        speed: 0.4 + Math.random() * 0.3,
        offset: (Math.random() - 0.5) * ROAD_WIDTH * 0.5,
        x: 0, y: 0, angle: 0
      });
    }
  }

  /* ─── helpers ─── */
  function dist(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }

  function pointOnTrack(px, py) {
    let minD = Infinity, closest = 0;
    for (let i = 0; i < trackPoints.length; i++) {
      const d = dist({x:px,y:py}, trackPoints[i]);
      if (d < minD) { minD = d; closest = i; }
    }
    return { seg: closest, dist: minD };
  }

  function posOnTrack(seg, t, offset) {
    const n = trackPoints.length;
    const i0 = seg % n;
    const i1 = (seg + 1) % n;
    const p0 = trackPoints[i0];
    const p1 = trackPoints[i1];
    const x = p0.x + (p1.x - p0.x) * t;
    const y = p0.y + (p1.y - p0.y) * t;
    const norm = getTrackNormal(i0);
    return { x: x + norm.x * offset, y: y + norm.y * offset };
  }

  /* ─── HUD ─── */
  function updateHUD() {
    const scoreEl = document.getElementById('score-display');
    const levelEl = document.getElementById('level-display');
    if (scoreEl) scoreEl.textContent = score;
    if (levelEl) levelEl.textContent = 'Lap ' + currentLap + '/' + TOTAL_LAPS;
  }

  /* ─── init ─── */
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', e => { keys[e.key] = true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
    window.addEventListener('keyup', e => { keys[e.key] = false; });
    setupTouch();
    generateTrack();
    generateObstacles();
    generateAICars();
    resetCar();
    showStartScreen();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setupTouch() {
    /* expect touch buttons in DOM with ids: touch-left, touch-right, touch-up, touch-down, touch-brake */
    const map = { 'touch-left':'left','touch-right':'right','touch-up':'up','touch-down':'down','touch-brake':'handbrake' };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = () => { touchState[key] = true; };
      const off = () => { touchState[key] = false; };
      el.addEventListener('touchstart', e => { e.preventDefault(); on(); });
      el.addEventListener('touchend', e => { e.preventDefault(); off(); });
      el.addEventListener('touchcancel', off);
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    });
  }

  function resetCar() {
    const p = trackPoints[0];
    const next = trackPoints[1];
    car.x = p.x; car.y = p.y;
    car.angle = Math.atan2(next.y - p.y, next.x - p.x);
    car.speed = 0; car.driftAngle = 0; car.drifting = false; car.onTrack = true;
    car.segIndex = 0;
  }

  /* ─── start / game over screens ─── */
  function showStartScreen() {
    drawFrame();
    ctx.fillStyle = 'rgba(10,6,20,0.85)';
    ctx.fillRect(0,0,W,H);
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 48px monospace';
    ctx.fillText('🏁 RALLY RACE', W/2, H/2 - 60);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Arrow Keys to drive • Space for handbrake', W/2, H/2);
    ctx.fillText('3 Laps • Best Score: ' + bestScore, W/2, H/2 + 30);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 24px monospace';
    ctx.fillText('Press ENTER or Tap to Start', W/2, H/2 + 80);
    const startHandler = (e) => {
      if (e.key && e.key !== 'Enter') return;
      window.removeEventListener('keydown', startHandler);
      canvas.removeEventListener('click', startHandler);
      canvas.removeEventListener('touchstart', startHandler);
      startCountdown();
    };
    window.addEventListener('keydown', startHandler);
    canvas.addEventListener('click', startHandler);
    canvas.addEventListener('touchstart', startHandler);
  }

  function startCountdown() {
    countdown = 3;
    countdownTimer = Date.now();
    gameActive = false; gameOver = false;
    generateTrack();
    generateObstacles();
    generateAICars();
    resetCar();
    tireMarks = []; dustParticles = [];
    score = 0; currentLap = 1; bestLapTime = Infinity;
    lapStartTime = 0; lastLapTime = 0; cleanLap = true;
    raceStartTime = Date.now();
    updateHUD();
    requestAnimationFrame(gameLoop);
  }

  function showGameOver() {
    gameActive = false; gameOver = true;
    raceDuration = Date.now() - raceStartTime;
    const finalScore = score;
    window.__gameScore = finalScore;
    try { localStorage.setItem('rally_best', Math.max(bestScore, finalScore).toString()); } catch(e){}
    try { if (typeof FuzzyScoreSubmit === 'function') FuzzyScoreSubmit('rally', finalScore, raceDuration); } catch(e){}

    setTimeout(() => {
      ctx.fillStyle = 'rgba(10,6,20,0.88)';
      ctx.fillRect(0,0,W,H);
      ctx.textAlign = 'center';
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 42px monospace';
      ctx.fillText('🏁 RACE COMPLETE', W/2, H/2 - 80);
      ctx.font = '22px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText('Score: ' + finalScore, W/2, H/2 - 30);
      ctx.fillText('Best Lap: ' + (bestLapTime < Infinity ? (bestLapTime/1000).toFixed(2)+'s' : '--'), W/2, H/2);
      ctx.fillText('Best Ever: ' + Math.max(bestScore, finalScore), W/2, H/2 + 30);
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 22px monospace';
      ctx.fillText('Press ENTER or Tap to Restart', W/2, H/2 + 80);
      const restartHandler = (e) => {
        if (e.key && e.key !== 'Enter') return;
        window.removeEventListener('keydown', restartHandler);
        canvas.removeEventListener('click', restartHandler);
        canvas.removeEventListener('touchstart', restartHandler);
        startCountdown();
      };
      window.addEventListener('keydown', restartHandler);
      canvas.addEventListener('click', restartHandler);
      canvas.addEventListener('touchstart', restartHandler);
    }, 100);
  }

  /* ─── update ─── */
  function update(dt) {
    if (!gameActive) return;
    const accelInput = (keys['ArrowUp'] || touchState.up) ? 1 : 0;
    const brakeInput = (keys['ArrowDown'] || touchState.down) ? 1 : 0;
    const steerLeft  = (keys['ArrowLeft'] || touchState.left) ? 1 : 0;
    const steerRight = (keys['ArrowRight'] || touchState.right) ? 1 : 0;
    const handbrake  = (keys[' '] || touchState.handbrake) ? 1 : 0;
    const steer = steerRight - steerLeft;

    /* acceleration & braking */
    if (accelInput) car.speed += ACCEL;
    if (brakeInput) car.speed -= BRAKE_FORCE;

    /* friction */
    const fric = car.onTrack ? FRICTION : OFF_ROAD_FRIC;
    car.speed *= (1 - fric);
    car.speed = Math.max(-2, Math.min(MAX_SPEED, car.speed));

    /* steering — reduced at high speed */
    const speedFactor = 1 - Math.abs(car.speed) / MAX_SPEED * 0.5;
    car.angle += steer * STEER_SPEED * speedFactor * Math.sign(car.speed || 1);

    /* drift */
    if (handbrake && Math.abs(car.speed) > 1 && steer !== 0) {
      car.drifting = true;
      car.driftAngle += steer * 0.06;
      car.driftAngle *= HANDBRAKE_DRIFT;
      car.speed *= 0.98;
    } else if (car.drifting) {
      car.driftAngle *= DRIFT_FACTOR;
      if (Math.abs(car.driftAngle) < 0.01) { car.driftAngle = 0; car.drifting = false; }
    }

    /* move */
    const moveAngle = car.angle + car.driftAngle * 0.3;
    car.x += Math.cos(moveAngle) * car.speed;
    car.y += Math.sin(moveAngle) * car.speed;

    /* on-track check */
    const pt = pointOnTrack(car.x, car.y);
    car.onTrack = pt.dist < ROAD_WIDTH / 2;
    car.segIndex = pt.seg;

    /* tire marks */
    if (car.drifting && Math.abs(car.speed) > 1) {
      tireMarks.push({ x: car.x, y: car.y, age: 0 });
      if (tireMarks.length > 800) tireMarks.shift();
    }

    /* dust when off track */
    if (!car.onTrack && Math.abs(car.speed) > 0.5) {
      for (let i = 0; i < 3; i++) {
        dustParticles.push({
          x: car.x + (Math.random()-0.5)*10,
          y: car.y + (Math.random()-0.5)*10,
          vx: (Math.random()-0.5)*2 - Math.cos(moveAngle)*car.speed*0.3,
          vy: (Math.random()-0.5)*2 - Math.sin(moveAngle)*car.speed*0.3,
          life: 1, r: 2 + Math.random()*3
        });
      }
      if (!cleanLap === undefined) {} else { cleanLap = false; }
      cleanLap = false;
    }

    /* dust update */
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.02;
      if (p.life <= 0) dustParticles.splice(i, 1);
    }

    /* obstacle collision */
    for (const obs of obstacles) {
      if (obs.type === 'rock' && dist(car, obs) < obs.r + 8) {
        car.speed *= -0.3;
        cleanLap = false;
      }
    }

    /* AI car update */
    for (const ai of aiCars) {
      ai.segIndex = (ai.segIndex + ai.speed * 0.02) % trackPoints.length;
      const si = Math.floor(ai.segIndex);
      const st = ai.segIndex - si;
      const p = posOnTrack(si, st, ai.offset);
      const np = posOnTrack((si+1) % trackPoints.length, 0, ai.offset);
      ai.x = p.x; ai.y = p.y;
      ai.angle = Math.atan2(np.y - p.y, np.x - p.x);

      if (dist(car, ai) < 20) {
        car.speed *= 0.5;
        cleanLap = false;
      }
    }

    /* lap detection */
    const startPt = trackPoints[0];
    const startDist = dist(car, startPt);
    if (startDist < ROAD_WIDTH && car.segIndex > trackPoints.length - 5 && currentLap >= 1) {
      /* crossed finish */
      const now = Date.now();
      if (lapStartTime > 0) {
        lastLapTime = now - lapStartTime;
        const lapScore = Math.max(100, Math.floor(30000 / Math.max(lastLapTime/1000, 1)));
        const cleanBonus = cleanLap ? 200 : 0;
        score += lapScore + cleanBonus;
        if (lastLapTime < bestLapTime) bestLapTime = lastLapTime;
      }
      if (currentLap >= TOTAL_LAPS) {
        showGameOver();
        return;
      }
      currentLap++;
      lapStartTime = now;
      cleanLap = true;
      updateHUD();
    }
    if (currentLap === 1 && lapStartTime === 0 && car.segIndex > 2) {
      lapStartTime = Date.now();
    }

    /* camera follow */
    camX += (car.x - camX) * 0.08;
    camY += (car.y - camY) * 0.08;

    /* window score */
    window.__gameScore = score;
    updateHUD();
  }

  /* ─── draw ─── */
  function drawFrame() {
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W/2 - camX, H/2 - camY);

    drawTrack();
    drawTireMarks();
    drawObstacles();
    drawAICars();
    drawDust();
    drawCar();
    drawFinishLine();

    ctx.restore();

    drawMinimap();
    drawSpeedometer();
  }

  function drawTrack() {
    /* road surface */
    ctx.fillStyle = ROAD_COLOR;
    ctx.beginPath();
    for (let i = 0; i < trackPolyLeft.length; i++) {
      const p = trackPolyLeft[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    for (let i = trackPolyRight.length - 1; i >= 0; i--) {
      const p = trackPolyRight[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();

    /* center line dashes */
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    for (let i = 0; i < trackPoints.length; i++) {
      const p = trackPoints[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    /* curbs (alternating red/white) */
    for (let side = 0; side < 2; side++) {
      const poly = side === 0 ? trackPolyLeft : trackPolyRight;
      for (let i = 0; i < poly.length - 1; i++) {
        ctx.strokeStyle = (Math.floor(i/4) % 2 === 0) ? '#cc3333' : '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(poly[i].x, poly[i].y);
        ctx.lineTo(poly[i+1].x, poly[i+1].y);
        ctx.stroke();
      }
    }
  }

  function drawTireMarks() {
    for (let i = 0; i < tireMarks.length; i++) {
      const m = tireMarks[i];
      m.age++;
      const alpha = Math.max(0, 1 - m.age / 600);
      ctx.fillStyle = 'rgba(40,40,40,' + alpha * 0.5 + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawObstacles() {
    for (const obs of obstacles) {
      const dx = obs.x - camX, dy = obs.y - camY;
      if (Math.abs(dx) > W/2 + 200 || Math.abs(dy) > H/2 + 200) continue;
      if (obs.type === 'tree') {
        /* trunk */
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(obs.x - 3, obs.y - 3, 6, 6);
        /* canopy */
        ctx.fillStyle = TREE_COLOR;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#0f4020';
        ctx.beginPath();
        ctx.arc(obs.x - 2, obs.y - 2, obs.r * 0.6, 0, Math.PI*2);
        ctx.fill();
      } else if (obs.type === 'rock') {
        ctx.fillStyle = ROCK_COLOR;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#5a5a6a';
        ctx.beginPath();
        ctx.arc(obs.x - 1, obs.y - 1, obs.r * 0.5, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  function drawAICars() {
    for (const ai of aiCars) {
      ctx.save();
      ctx.translate(ai.x, ai.y);
      ctx.rotate(ai.angle);
      ctx.fillStyle = AI_CAR_COLOR;
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = '#334499';
      ctx.fillRect(-8, -4, 6, 8);
      ctx.restore();
    }
  }

  function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    const drawAngle = car.angle + car.driftAngle * 0.3;
    ctx.rotate(drawAngle);

    /* shadow */
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-11, -7, 24, 16);

    /* body */
    ctx.fillStyle = GOLD;
    ctx.fillRect(-12, -7, 24, 14);

    /* windshield */
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(2, -5, 6, 10);

    /* headlights */
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, -6, 3, 3);
    ctx.fillRect(10, 3, 3, 3);

    /* tail lights */
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-12, -6, 2, 3);
    ctx.fillRect(-12, 3, 2, 3);

    /* drift smoke indicator */
    if (car.drifting) {
      ctx.fillStyle = 'rgba(255,200,50,0.6)';
      ctx.beginPath();
      ctx.arc(-14, 0, 4 + Math.random()*2, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawDust() {
    for (const p of dustParticles) {
      ctx.fillStyle = 'rgba(138,122,90,' + (p.life * 0.6) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function drawFinishLine() {
    const p = trackPoints[0];
    const norm = getTrackNormal(0);
    const x1 = p.x + norm.x * ROAD_WIDTH/2;
    const y1 = p.y + norm.y * ROAD_WIDTH/2;
    const x2 = p.x - norm.x * ROAD_WIDTH/2;
    const y2 = p.y - norm.y * ROAD_WIDTH/2;

    ctx.strokeStyle = FINISH_COLOR;
    ctx.lineWidth = 6;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    /* checkered pattern */
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const segs = 10;
    for (let i = 0; i < segs; i++) {
      if (i % 2 === 0) {
        const sx = x1 + dx * (i/segs);
        const sy = y1 + dy * (i/segs);
        const ex = x1 + dx * ((i+1)/segs);
        const ey = y1 + dy * ((i+1)/segs);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
  }

  function drawMinimap() {
    const mx = W - MINIMAP_SIZE - MINIMAP_PAD;
    const my = MINIMAP_PAD;
    const s = MINIMAP_SIZE;

    /* find bounds */
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of trackPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((s-20)/rangeX, (s-20)/rangeY);
    const offX = mx + s/2 - (minX + rangeX/2) * scale;
    const offY = my + s/2 - (minY + rangeY/2) * scale;

    /* bg */
    ctx.fillStyle = 'rgba(10,6,20,0.7)';
    ctx.fillRect(mx, my, s, s);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, s, s);

    /* track */
    ctx.strokeStyle = 'rgba(100,100,140,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < trackPoints.length; i++) {
      const px = trackPoints[i].x * scale + offX;
      const py = trackPoints[i].y * scale + offY;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    /* AI cars on minimap */
    ctx.fillStyle = AI_CAR_COLOR;
    for (const ai of aiCars) {
      const ax = ai.x * scale + offX;
      const ay = ai.y * scale + offY;
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI*2);
      ctx.fill();
    }

    /* player */
    const px = car.x * scale + offX;
    const py = car.y * scale + offY;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI*2);
    ctx.fill();
    /* direction indicator */
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(car.angle)*8, py + Math.sin(car.angle)*8);
    ctx.stroke();
  }

  function drawSpeedometer() {
    const speedPct = Math.abs(car.speed) / MAX_SPEED;
    const barW = 120, barH = 8;
    const bx = MINIMAP_PAD, by = H - barH - MINIMAP_PAD;

    ctx.fillStyle = 'rgba(10,6,20,0.7)';
    ctx.fillRect(bx - 2, by - 18, barW + 4, barH + 24);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 2, by - 18, barW + 4, barH + 24);

    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);

    const col = car.drifting ? '#ff6600' : GOLD;
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, barW * speedPct, barH);

    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SPD ' + Math.floor(speedPct * 200) + ' km/h', bx, by - 4);

    if (car.drifting) {
      ctx.fillStyle = '#ff6600';
      ctx.fillText('DRIFT!', bx + barW - 40, by - 4);
    }
  }

  /* ─── game loop ─── */
  let lastTime = 0;
  function gameLoop(ts) {
    const dt = Math.min(ts - (lastTime || ts), 33);
    lastTime = ts;

    if (!gameActive && !gameOver) {
      /* countdown */
      const elapsed = Date.now() - countdownTimer;
      const remaining = 3 - Math.floor(elapsed / 1000);
      if (remaining !== countdown && remaining >= 0) countdown = remaining;

      drawFrame();

      /* draw countdown */
      ctx.fillStyle = 'rgba(10,6,20,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 80px monospace';
      ctx.fillText(countdown > 0 ? countdown.toString() : 'GO!', W/2, H/2 + 20);

      if (elapsed >= 3500) {
        gameActive = true;
        raceStartTime = Date.now();
        lapStartTime = Date.now();
      }
      if (!gameOver) requestAnimationFrame(gameLoop);
      return;
    }

    if (gameActive) {
      update(dt);
    }
    if (!gameOver) {
      drawFrame();
      requestAnimationFrame(gameLoop);
    }
  }

  /* ─── boot ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
