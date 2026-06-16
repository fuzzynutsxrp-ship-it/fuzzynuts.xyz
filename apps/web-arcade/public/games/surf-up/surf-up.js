/* ── Surf-Up! – FuzzyNuts Arcade ────────────────────────────────── */
;(function(){
'use strict';

/* ── constants ──────────────────────────────────────────────────── */
const BG         = '#0a0614';
const CYAN       = '#06b6d4';
const DARK_CYAN  = '#0891b2';
const WHITE      = '#ffffff';
const SPRAY_COL  = 'rgba(6,182,212,0.45)';
const WAVE_DEEP  = '#0c1a2e';
const WAVE_MID   = '#0e2240';
const WAVE_LIGHT = '#11305a';
const SURFER_W   = 22;
const SURFER_H   = 36;
const OBSTACLE_TYPES = ['rock','buoy','surfer','shark'];
const TRICK_NAMES    = ['Air','Spin','Flip','Barrel Roll','Cutback'];

/* ── canvas / ctx ───────────────────────────────────────────────── */
const canvas = document.getElementById('game-canvas') || document.createElement('canvas');
if (!canvas.id) { canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
const ctx = canvas.getContext('2d');

function resize(){
  const wrap = canvas.parentElement || document.body;
  canvas.width  = wrap.clientWidth  || window.innerWidth;
  canvas.height = wrap.clientHeight || window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

/* ── HUD helper ─────────────────────────────────────────────────── */
function updateHUD(){
  const el = document.getElementById('score-display');
  if (el) el.textContent = Math.floor(state.score);
}

/* ── state ──────────────────────────────────────────────────────── */
let state, animId, lastTime;

function freshState(){
  return {
    phase: 'start',          // start | play | over
    t: 0,                    // elapsed seconds
    scrollX: 0,              // world X offset
    speed: 180,              // px / s base scroll
    score: 0,                // distance + tricks
    trickPts: 0,
    distance: 0,
    best: +((function(){try{return localStorage.getItem('surf-up_best')}catch(e){return null}})()||0),

    /* player */
    px: 0, py: 0,            // screen position (set each frame)
    waveOffset: 0,           // vertical offset on wave (-1…1)
    vy: 0,                   // vertical velocity for jump
    jumping: false,
    jumpTimer: 0,
    spinAngle: 0,
    trickActive: false,
    trickName: '',
    trickTimer: 0,
    alive: true,

    /* wave params */
    wavePhase: 0,
    waveAmp: 90,
    waveFreq: 0.0025,

    /* obstacles */
    obstacles: [],
    nextObstacle: 400,

    /* particles */
    particles: [],

    /* input */
    keys: {},
    touchY: null,
    touchStartY: null,
    touchTapping: false,
  };
}

state = freshState();

/* ── input ──────────────────────────────────────────────────────── */
window.addEventListener('keydown', e=>{
  state.keys[e.code] = true;
  if (state.phase==='start') startGame();
  if (state.phase==='over' && e.code==='Space') startGame();
});
window.addEventListener('keyup',   e=>{ state.keys[e.code]=false; });

canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  if (state.phase==='start') startGame();
  if (state.phase==='over')  { startGame(); return; }
  const t = e.touches[0];
  state.touchStartY = t.clientY;
  state.touchY = t.clientY;
  state.touchTapping = true;
  setTimeout(()=>{ state.touchTapping=false; }, 220);
},{passive:false});

canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  const t = e.touches[0];
  state.touchY = t.clientY;
},{passive:false});

canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  if (state.touchTapping) doTrick();
  state.touchY = null;
  state.touchStartY = null;
},{passive:false});

/* ── game control ───────────────────────────────────────────────── */
function startGame(){
  const keep = state.best;
  state = freshState();
  state.best = keep;
  state.phase = 'play';
  state.px = canvas.width * 0.22;
  lastTime = performance.now();
  updateHUD();
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function gameOver(){
  state.phase = 'over';
  state.alive = false;
  const finalScore = Math.floor(state.score);
  if (finalScore > state.best){
    state.best = finalScore;
    try{localStorage.setItem('surf-up_best', String(finalScore)}catch(e){});
  }
  window.__gameScore = finalScore;
  updateHUD();
  try { FuzzyScoreSubmit('surf-up', finalScore, Math.floor(state.t)); } catch(_){}
}

/* ── wave height at world-x ─────────────────────────────────────── */
function waveY(wx, layer){
  const l = layer||0;
  const base = canvas.height * (0.52 + l*0.12);
  const amp  = state.waveAmp * (1 - l*0.3);
  const freq = state.waveFreq * (1 + l*0.4);
  const phase = state.wavePhase + l*1.8;
  return base
    + Math.sin(wx*freq + phase) * amp
    + Math.sin(wx*freq*2.3 + phase*0.7) * amp*0.3
    + Math.sin(wx*freq*0.5 + phase*1.4) * amp*0.2;
}

/* ── obstacles ──────────────────────────────────────────────────── */
function spawnObstacle(wx){
  const type = OBSTACLE_TYPES[Math.floor(Math.random()*OBSTACLE_TYPES.length)];
  const wy = waveY(wx, 0);
  let offY = 0, w = 30, h = 30;
  switch(type){
    case 'rock':   offY = -20; w=36; h=28; break;
    case 'buoy':   offY = -40 - Math.random()*30; w=20; h=44; break;
    case 'surfer': offY = -30; w=22; h=36; break;
    case 'shark':  offY = 10 + Math.random()*20; w=50; h=22; break;
  }
  state.obstacles.push({ wx, type, offY, w, h, hit: false });
}

/* ── tricks ─────────────────────────────────────────────────────── */
function doTrick(){
  if (state.phase!=='play' || state.jumping) return;
  state.jumping = true;
  state.vy = -380;
  state.jumpTimer = 0;
  state.trickActive = true;
  state.trickName = TRICK_NAMES[Math.floor(Math.random()*TRICK_NAMES.length)];
  state.spinAngle = 0;
  spawnSpray(state.px, state.py, 12);
}

/* ── particles ──────────────────────────────────────────────────── */
function spawnSpray(x,y,n){
  for(let i=0;i<n;i++){
    const angle = -Math.PI*0.1 + Math.random()*Math.PI*1.3;
    const spd   = 60 + Math.random()*180;
    state.particles.push({
      x, y,
      vx: Math.cos(angle)*spd,
      vy: Math.sin(angle)*spd - 60,
      life: 0.4 + Math.random()*0.6,
      maxLife: 0.4 + Math.random()*0.6,
      r: 2 + Math.random()*3,
    });
  }
}

function spawnWake(x,y){
  state.particles.push({
    x, y: y+4,
    vx: -40 - Math.random()*30,
    vy: -10 - Math.random()*15,
    life: 0.3+Math.random()*0.3,
    maxLife: 0.5,
    r: 2+Math.random()*2,
  });
}

/* ── collision ──────────────────────────────────────────────────── */
function checkCollisions(){
  for (const o of state.obstacles){
    if (o.hit) continue;
    const ox = o.wx - state.scrollX;
    if (ox < -60 || ox > canvas.width+60) continue;
    const oy = waveY(o.wx,0) + o.offY;
    const hw = o.w/2, hh = o.h/2;
    const pw = SURFER_W/2, ph = SURFER_H/2;
    if (state.px+pw > ox-hw && state.px-pw < ox+hw &&
        state.py+ph > oy-hh && state.py-ph < oy+hh){
      if (!state.jumping){
        gameOver(); return;
      }
      /* jumped over it */
      o.hit = true;
      state.trickPts += 150;
      state.trickName = 'Jump Clear!';
      state.trickActive = true;
      state.trickTimer = 0;
      spawnSpray(ox,oy,8);
    }
  }
}

/* ── update ─────────────────────────────────────────────────────── */
function update(dt){
  if (state.phase!=='play') return;

  state.t += dt;

  /* speed ramp */
  state.speed = 180 + state.t * 2.5;

  /* scroll */
  state.scrollX += state.speed * dt;
  state.distance += state.speed * dt;

  /* wave phase */
  state.wavePhase += dt * 0.6;

  /* wave parameters evolve */
  state.waveAmp = 80 + Math.sin(state.t*0.08)*30 + state.t*0.5;
  state.waveFreq = 0.0025 + Math.sin(state.t*0.05)*0.0008;

  /* input → wave offset */
  const touchDy = (state.touchY!==null && state.touchStartY!==null)
    ? (state.touchY - state.touchStartY) / 80 : 0;

  if (state.keys['ArrowUp'])    state.waveOffset -= 1.8*dt;
  if (state.keys['ArrowDown'])  state.waveOffset += 1.8*dt;
  if (state.touchY!==null)      state.waveOffset = Math.max(-1,Math.min(1, touchDy));
  state.waveOffset = Math.max(-1, Math.min(1, state.waveOffset));

  /* tricks via left/right */
  if (state.keys['ArrowLeft'] || state.keys['ArrowRight']){
    doTrick();
    state.keys['ArrowLeft'] = state.keys['ArrowRight'] = false;
  }

  /* player world-x on screen */
  const wx = state.scrollX + state.px;

  /* jumping physics */
  if (state.jumping){
    state.vy += 900 * dt;       // gravity
    state.py += state.vy * dt;
    state.jumpTimer += dt;
    if (state.trickActive){
      state.spinAngle += 720 * dt;
    }
    const surfY = waveY(wx, 0);
    const topEdge = surfY - 20;
    if (state.py >= topEdge && state.jumpTimer > 0.15){
      state.py = topEdge;
      state.jumping = false;
      state.vy = 0;
      if (state.trickActive){
        const fullSpins = Math.floor(state.spinAngle / 360);
        const pts = 100 + fullSpins * 200;
        state.trickPts += pts;
        state.trickTimer = 1.2;
        spawnSpray(state.px, state.py, 16);
      }
      state.trickActive = false;
      state.spinAngle = 0;
    }
  } else {
    /* follow wave */
    const surfY = waveY(wx, 0);
    const range = 50;
    state.py = surfY + state.waveOffset * range;
    spawnWake(state.px, state.py);
  }

  /* fall off bottom = game over */
  if (state.py > canvas.height + 40){
    gameOver(); return;
  }

  /* trick display timer */
  if (state.trickTimer > 0) state.trickTimer -= dt;

  /* score */
  state.score = state.distance * 0.05 + state.trickPts;
  updateHUD();

  /* obstacles */
  while (state.nextObstacle < state.scrollX + canvas.width + 200){
    spawnObstacle(state.nextObstacle);
    state.nextObstacle += 350 + Math.random()*350 - Math.min(state.t*0.8, 120);
    if (state.nextObstacle < state.scrollX + canvas.width) state.nextObstacle = state.scrollX + canvas.width + 200;
  }
  /* cleanup old obstacles */
  state.obstacles = state.obstacles.filter(o => o.wx > state.scrollX - 200);

  /* collisions */
  checkCollisions();

  /* particles */
  for (const p of state.particles){
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

/* ── draw ───────────────────────────────────────────────────────── */
function drawWaveLayer(layer, color){
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let sx = 0; sx <= canvas.width; sx += 4){
    const wx = state.scrollX * (0.5 + layer*0.3) + sx;
    const y = waveY(wx, layer);
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawObstacles(){
  for (const o of state.obstacles){
    const sx = o.wx - state.scrollX;
    if (sx < -60 || sx > canvas.width+60) continue;
    const sy = waveY(o.wx,0) + o.offY;
    ctx.save();
    ctx.translate(sx, sy);
    switch(o.type){
      case 'rock':
        ctx.fillStyle = '#3a2e2e';
        ctx.beginPath();
        ctx.moveTo(-18,12); ctx.lineTo(-14,-10); ctx.lineTo(4,-16);
        ctx.lineTo(18,-6); ctx.lineTo(16,12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4d3d3d';
        ctx.beginPath(); ctx.arc(-2,-4,6,0,Math.PI*2); ctx.fill();
        break;
      case 'buoy':
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0,-12,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(-2,-14,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#71717a';
        ctx.fillRect(-2, -2, 4, 18);
        break;
      case 'surfer':
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-4,-28,8,28);           // board
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath(); ctx.arc(0,-34,6,0,Math.PI*2); ctx.fill(); // head
        ctx.fillRect(-5,-28,10,14);           // torso
        break;
      case 'shark':
        ctx.fillStyle = '#52525b';
        ctx.beginPath();
        ctx.moveTo(-25,0); ctx.lineTo(20,-8); ctx.lineTo(25,0);
        ctx.lineTo(20,6); ctx.lineTo(-25,0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.moveTo(0,-8); ctx.lineTo(6,-18); ctx.lineTo(8,-6);
        ctx.closePath(); ctx.fill();
        // eye
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(14,-3,2,0,Math.PI*2); ctx.fill();
        break;
    }
    ctx.restore();
  }
}

function drawPlayer(){
  ctx.save();
  ctx.translate(state.px, state.py);
  if (state.jumping) ctx.rotate(state.spinAngle * Math.PI/180);

  /* surfboard */
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(0, 10, 14, 4, 0, 0, Math.PI*2);
  ctx.fill();

  /* body */
  ctx.fillStyle = CYAN;
  ctx.fillRect(-5, -16, 10, 22);
  /* head */
  ctx.beginPath(); ctx.arc(0,-22,7,0,Math.PI*2); ctx.fill();
  /* arms */
  if (state.trickActive){
    ctx.strokeStyle = CYAN; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-5,-10); ctx.lineTo(-16,-18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-10);  ctx.lineTo(16,-18);  ctx.stroke();
  } else {
    ctx.strokeStyle = CYAN; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-5,-10); ctx.lineTo(-12,-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-10);  ctx.lineTo(12,-4);  ctx.stroke();
  }

  ctx.restore();

  /* trick label */
  if (state.trickTimer > 0){
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.trickTimer);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    const pts = state.trickActive ? '' : ` +${state.trickPts|0}`;
    ctx.fillText(state.trickName + '!', state.px, state.py - 50);
    ctx.restore();
  }
}

function drawParticles(){
  for (const p of state.particles){
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a * 0.7;
    ctx.fillStyle = SPRAY_COL;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * a, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHUD(){
  if (state.trickTimer > 0 && !state.trickActive){
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.trickTimer);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.trickName + '!', canvas.width/2, 60);
    ctx.restore();
  }

  /* speed indicator */
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SPD ' + Math.floor(state.speed), canvas.width-16, 20);
}

function drawStartScreen(){
  ctx.fillStyle = BG;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawWaveLayer(2, WAVE_DEEP);
  drawWaveLayer(1, WAVE_MID);
  drawWaveLayer(0, WAVE_LIGHT);

  ctx.fillStyle = CYAN;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏄 Surf-Up!', canvas.width/2, canvas.height*0.32);

  ctx.fillStyle = '#a5b4fc';
  ctx.font = '18px sans-serif';
  ctx.fillText('Ride the wave — dodge obstacles — pull tricks!', canvas.width/2, canvas.height*0.42);

  ctx.fillStyle = WHITE;
  ctx.font = '16px sans-serif';
  ctx.fillText('↑/↓  Balance on wave', canvas.width/2, canvas.height*0.54);
  ctx.fillText('←/→  Tricks / Jump', canvas.width/2, canvas.height*0.59);
  ctx.fillText('Touch: tilt to balance, tap to trick', canvas.width/2, canvas.height*0.64);

  ctx.fillStyle = CYAN;
  ctx.font = 'bold 22px sans-serif';
  const blink = Math.sin(performance.now()/300) > 0;
  if (blink) ctx.fillText('Press any key or tap to start', canvas.width/2, canvas.height*0.76);

  if (state.best > 0){
    ctx.fillStyle = '#fbbf24';
    ctx.font = '15px sans-serif';
    ctx.fillText('Best: ' + state.best, canvas.width/2, canvas.height*0.84);
  }
}

function drawGameOver(){
  ctx.fillStyle = 'rgba(10,6,20,0.75)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WIPEOUT!', canvas.width/2, canvas.height*0.35);

  ctx.fillStyle = WHITE;
  ctx.font = '22px sans-serif';
  ctx.fillText('Score: ' + Math.floor(state.score), canvas.width/2, canvas.height*0.47);
  ctx.fillText('Distance: ' + Math.floor(state.distance) + 'm', canvas.width/2, canvas.height*0.53);
  ctx.fillText('Time: ' + Math.floor(state.t) + 's', canvas.width/2, canvas.height*0.59);

  if (state.best > 0){
    ctx.fillStyle = '#fbbf24';
    ctx.font = '17px sans-serif';
    ctx.fillText('Best: ' + state.best, canvas.width/2, canvas.height*0.67);
  }

  ctx.fillStyle = CYAN;
  ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(performance.now()/300) > 0;
  if (blink) ctx.fillText('Press SPACE or tap to surf again', canvas.width/2, canvas.height*0.78);
}

function draw(){
  ctx.fillStyle = BG;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  /* stars */
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i=0;i<40;i++){
    const sx = (i*137.5 + state.scrollX*0.02) % canvas.width;
    const sy = (i*97.3) % (canvas.height*0.45);
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  if (state.phase==='start'){
    drawStartScreen(); return;
  }

  /* wave layers back to front */
  drawWaveLayer(2, WAVE_DEEP);
  drawWaveLayer(1, WAVE_MID);

  /* obstacles behind player wave */
  drawWaveLayer(0, WAVE_LIGHT);

  /* foam line on main wave */
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let sx=0; sx<=canvas.width; sx+=4){
    const wx = state.scrollX + sx;
    const y = waveY(wx, 0) - 4;
    sx===0 ? ctx.moveTo(sx,y) : ctx.lineTo(sx,y);
  }
  ctx.stroke();

  drawObstacles();
  drawParticles();
  drawPlayer();
  drawHUD();

  if (state.phase==='over') drawGameOver();
}

/* ── main loop ──────────────────────────────────────────────────── */
function loop(ts){
  const dt = Math.min((ts - (lastTime||ts)) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  animId = requestAnimationFrame(loop);
}

/* ── init ───────────────────────────────────────────────────────── */
state.phase = 'start';
draw();
animId = requestAnimationFrame(loop);

/* expose for parent framework */
window.__gameStart = startGame;

})();
