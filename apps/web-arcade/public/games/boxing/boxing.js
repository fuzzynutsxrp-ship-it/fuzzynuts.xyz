(function(){
'use strict';

/* ── helpers ── */
const $ = s => document.querySelector(s);
const BEST_KEY = 'boxing_best';

/* ── canvas setup ── */
const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
const ctx = canvas.getContext('2d');
const host = $('#game-area') || document.body;
host.innerHTML = '';
host.appendChild(canvas);

let W, H;
function resize(){
  const r = host.getBoundingClientRect();
  W = canvas.width  = r.width  || 800;
  H = canvas.height = r.height || 600;
}
resize();
window.addEventListener('resize', resize);

/* ── colours / constants ── */
const BG        = '#0a0614';
const RED       = '#ef4444';
const BLUE      = '#3b82f6';
const WHITE     = '#f8fafc';
const GRAY      = '#475569';
const YELLOW    = '#eab308';
const GREEN     = '#22c55e';
const MAX_ROUNDS = 3;
const ROUND_SEC  = 60;

/* ── punch definitions ── */
const PUNCHES = {
  jab:      { key:'j', damage:8,  speed:120,  cost:8,  range:110, wind:0,   recovery:180,  name:'JAB' },
  hook:     { key:'k', damage:15, speed:200,  cost:15, range:100, wind:150, recovery:300,  name:'HOOK' },
  uppercut: { key:'l', damage:24, speed:280,  cost:25, range:95,  wind:250, recovery:420,  name:'UPPERCUT' }
};
const PUNCH_LIST = ['jab','hook','uppercut'];

/* ── state ── */
let state = 'start'; // start | playing | roundEnd | gameOver
let score, bestScore, combo, comboMult, maxCombo;
let round, roundTimer, roundStartTime;
let gameStartTime;
let player, opponent;
let particles, screenShake;
let aiTimer, aiAction; // null | {type, phase, elapsed, duration}
let touchStart;
let keys = {};
let lastTime, dt;
let animFrame;

/* ── fighter factory ── */
function makeFighter(x,isPlayer){
  return {
    x, y:0, // y set in draw
    hp:100, maxHp:100, stamina:100, maxStamina:100,
    isPlayer,
    punching:null,    // {type, elapsed, phase:'wind'|'active'|'recover'}
    dodging:null,     // {dir:'left'|'right', elapsed}
    blocking:false,
    hitFlash:0,
    knockdown:0,      // >0 = on canvas, counting down
    stance:'idle'     // idle | punching | dodging | blocking | knockdown
  };
}

/* ── particles ── */
function spawnParticles(x,y,color,count){
  for(let i=0;i<count;i++){
    particles.push({
      x, y,
      vx:(Math.random()-0.5)*6,
      vy:(Math.random()-0.5)*6 - 2,
      life:0.4+Math.random()*0.3,
      color,
      r:2+Math.random()*3
    });
  }
}

/* ── combo / score helpers ── */
function addHitScore(dmg){
  combo++;
  if(combo>maxCombo) maxCombo=combo;
  comboMult = 1 + Math.floor(combo/3)*0.5;
  comboMult = Math.min(comboMult, 5);
  const pts = Math.round(dmg * 10 * comboMult);
  score += pts;
  updateHUD();
  return pts;
}
function breakCombo(){ combo=0; comboMult=1; }

/* ── HUD ── */
function updateHUD(){
  const el = $('#score-display');
  if(el) el.textContent = 'Score: ' + score;
}

/* ── init / reset ── */
function initGame(){
  score = 0; combo = 0; comboMult = 1; maxCombo = 0;
  round = 1;
  bestScore = parseInt(localStorage.getItem(BEST_KEY)||'0',10);
  particles = [];
  screenShake = 0;
  aiTimer = 1000 + Math.random()*1500;
  aiAction = null;
  gameStartTime = performance.now();
  initRound();
  updateHUD();
}

function initRound(){
  player   = makeFighter(0.3, true);
  opponent = makeFighter(0.7, false);
  roundTimer = ROUND_SEC;
  roundStartTime = performance.now();
  particles = [];
  screenShake = 0;
  aiTimer = 1200 + Math.random()*1000;
  aiAction = null;
}

/* ── punch logic ── */
function startPunch(fighter, type){
  if(fighter.punching || fighter.knockdown>0) return false;
  const p = PUNCHES[type];
  if(fighter.isPlayer && fighter.stamina < p.cost) return false;
  fighter.punching = { type, elapsed:0, phase: fighter.isPlayer?'active':'wind' };
  fighter.stamina = Math.max(0, fighter.stamina - p.cost);
  fighter.stance = 'punching';
  return true;
}

function tryHit(attacker, defender, type){
  const p = PUNCHES[type];
  // check dodge
  if(defender.dodging){
    const dodgedir = defender.dodging.dir;
    // jab can be dodged either way, hook/uppercut directional
    if(type==='hook' && dodgedir==='right') return false;
    if(type==='uppercut' && dodgedir==='left') return false;
    if(type==='jab') return false; // jab always dodged
  }
  // check block
  if(defender.blocking){
    const reduced = Math.round(p.damage * 0.25);
    defender.hp = Math.max(0, defender.hp - reduced);
    defender.hitFlash = 0.2;
    spawnParticles(defender.x*W, H*0.45, '#888', 4);
    screenShake = 3;
    if(defender.isPlayer) breakCombo();
    return false;
  }
  // hit!
  const dmg = p.damage + Math.floor(Math.random()*4);
  defender.hp = Math.max(0, defender.hp - dmg);
  defender.hitFlash = 0.3;
  screenShake = 6;
  spawnParticles(defender.x*W, H*0.42, defender.isPlayer?'#fca5a5':'#93c5fd', 8);
  if(attacker.isPlayer){
    addHitScore(dmg);
  } else {
    breakCombo();
  }
  // knockdown check
  if(defender.hp <= 0){
    defender.knockdown = 3;
    defender.stance = 'knockdown';
  }
  return true;
}

/* ── AI ── */
function updateAI(dt){
  if(opponent.knockdown>0) return;
  if(opponent.punching) return;

  aiTimer -= dt;
  if(aiTimer <= 0){
    // decide action
    const r = Math.random();
    if(r < 0.15 && !opponent.dodging){
      opponent.dodging = { dir: Math.random()<0.5?'left':'right', elapsed:0 };
      opponent.stance = 'dodging';
      aiTimer = 400 + Math.random()*400;
    } else if(r < 0.25){
      opponent.blocking = true;
      opponent.stance = 'blocking';
      aiTimer = 600 + Math.random()*600;
    } else {
      // telegraph then punch
      const type = PUNCH_LIST[Math.floor(Math.random()*3)];
      startPunch(opponent, type);
      // opponent punches start in 'wind' phase
    }
    aiTimer += 800 + Math.random()*1200;
  }
}

/* ── update fighter ── */
function updateFighter(f, dt){
  // stamina regen
  if(!f.punching && f.stamina < f.maxStamina){
    f.stamina = Math.min(f.maxStamina, f.stamina + dt*0.03);
  }
  // hit flash
  if(f.hitFlash > 0) f.hitFlash -= dt*0.003;
  // knockdown
  if(f.knockdown > 0){
    f.knockdown -= dt*0.001;
    if(f.knockdown <= 0){
      f.knockdown = 0;
      f.stance = 'idle';
      // revive with some hp for next round or keep going
      if(f.hp <= 0){
        // fight over
        endFight(f);
        return;
      }
    }
  }
  // punching
  if(f.punching){
    f.punching.elapsed += dt;
    const p = PUNCHES[f.punching.type];
    if(f.punching.phase==='wind'){
      if(f.punching.elapsed >= p.wind){
        f.punching.phase = 'active';
        f.punching.elapsed = 0;
      }
    }
    if(f.punching.phase==='active'){
      if(f.punching.elapsed >= p.speed){
        // attempt hit
        const defender = f.isPlayer ? opponent : player;
        tryHit(f, defender, f.punching.type);
        f.punching.phase = 'recover';
        f.punching.elapsed = 0;
      }
    }
    if(f.punching.phase==='recover'){
      if(f.punching.elapsed >= p.recovery){
        f.punching = null;
        f.stance = 'idle';
      }
    }
  }
  // dodging
  if(f.dodging){
    f.dodging.elapsed += dt;
    if(f.dodging.elapsed > 350){
      f.dodging = null;
      if(f.stance==='dodging') f.stance='idle';
    }
  }
  // blocking (player uses key held, AI uses timer)
  if(!f.isPlayer && f.blocking){
    // AI block duration managed by aiTimer
  }
}

/* ── end fight / round ── */
function endFight(loser){
  if(loser === opponent){
    // player KO
    score += 500; // KO bonus
    updateHUD();
  }
  state = 'roundEnd';
  setTimeout(()=>{
    if(round < MAX_ROUNDS && player.hp > 0 && opponent.hp > 0){
      round++;
      initRound();
      state = 'playing';
    } else {
      endGame(loser === opponent);
    }
  }, 2000);
}

function endGame(playerWon){
  state = 'gameOver';
  const duration = Math.round((performance.now() - gameStartTime)/1000);
  if(round >= MAX_ROUNDS && player.hp > opponent.hp){
    score += 300; // round decision bonus
  }
  if(playerWon) score += 200;
  updateHUD();
  // best score
  if(score > bestScore){
    bestScore = score;
    try{ localStorage.setItem(BEST_KEY, ''+bestScore); }catch(e){}
  }
  // global score
  window.__gameScore = score;
  // submit
  if(typeof FuzzyScoreSubmit === 'function'){
    try{ FuzzyScoreSubmit('boxing', score, duration); }catch(e){}
  }
}

/* ── input ── */
window.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()] = true;
  if(state==='start'){ state='playing'; initGame(); return; }
  if(state!=='playing') return;
  const k = e.key.toLowerCase();
  if(k==='j') startPunch(player,'jab');
  if(k==='k') startPunch(player,'hook');
  if(k==='l') startPunch(player,'uppercut');
  if(e.key==='ArrowDown'){ player.blocking=true; player.stance='blocking'; }
  if(e.key==='ArrowLeft'  && !player.dodging){ player.dodging={dir:'left',elapsed:0}; player.stance='dodging'; }
  if(e.key==='ArrowRight' && !player.dodging){ player.dodging={dir:'right',elapsed:0}; player.stance='dodging'; }
});
window.addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()] = false;
  if(e.key==='ArrowDown'){ player.blocking=false; if(player.stance==='blocking') player.stance='idle'; }
});

/* touch */
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  if(state==='start'){ state='playing'; initGame(); return; }
  if(state!=='playing') return;
  touchStart = { x:e.touches[0].clientX, y:e.touches[0].clientY, t:performance.now() };
});
canvas.addEventListener('touchend', e=>{
  e.preventDefault();
  if(state!=='playing' || !touchStart) return;
  const ex = e.changedTouches[0].clientX;
  const ey = e.changedTouches[0].clientY;
  const dx = ex - touchStart.x;
  const dy = ey - touchStart.y;
  const elapsed = performance.now() - touchStart.t;
  if(Math.abs(dx)>50 && elapsed<400){
    // swipe
    if(dx < -50){ if(!player.dodging){ player.dodging={dir:'left',elapsed:0}; player.stance='dodging'; } }
    else if(dx > 50){ if(!player.dodging){ player.dodging={dir:'right',elapsed:0}; player.stance='dodging'; } }
  } else if(dy > 40 && elapsed<400){
    player.blocking=true; player.stance='blocking';
    setTimeout(()=>{ player.blocking=false; if(player.stance==='blocking') player.stance='idle'; }, 500);
  } else {
    // tap position determines punch
    const third = W/3;
    const tx = ex - canvas.getBoundingClientRect().left;
    if(tx < third) startPunch(player,'jab');
    else if(tx < third*2) startPunch(player,'hook');
    else startPunch(player,'uppercut');
  }
  touchStart = null;
});
canvas.addEventListener('click', e=>{
  if(state==='start'){ state='playing'; initGame(); }
});

/* ── draw helpers ── */
function drawBar(x,y,w,h,ratio,color){
  ctx.fillStyle = '#1e1b2e';
  roundRect(x,y,w,h,4); ctx.fill();
  ctx.fillStyle = color;
  roundRect(x,y,Math.max(0,w*ratio),h,4); ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  roundRect(x,y,w,h,4); ctx.stroke();
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ── draw fighter ── */
function drawFighter(f){
  const bx = f.x * W;
  const by = H * 0.45;
  const bodyW = 60;
  const bodyH = 100;
  const color = f.isPlayer ? RED : BLUE;

  ctx.save();

  // dodge offset
  let offX = 0;
  if(f.dodging){
    const t = Math.min(f.dodging.elapsed/150, 1);
    const amt = 30 * Math.sin(t * Math.PI);
    offX = f.dodging.dir==='left' ? -amt : amt;
  }

  // knockdown
  if(f.knockdown > 0){
    ctx.translate(bx+offX, by+40);
    ctx.rotate(Math.PI/2 * (1 - f.knockdown/3));
    ctx.translate(-(bx+offX), -by-40);
  }

  // flash
  if(f.hitFlash > 0){
    ctx.globalAlpha = 0.5 + 0.5*Math.sin(f.hitFlash*30);
  }

  const cx = bx + offX;
  const cy = by;

  // body
  ctx.fillStyle = color;
  roundRect(cx-bodyW/2, cy-bodyH/2, bodyW, bodyH, 12);
  ctx.fill();

  // head
  ctx.fillStyle = f.hitFlash>0 ? '#fff' : (f.isPlayer?'#fca5a5':'#93c5f6');
  ctx.beginPath();
  ctx.arc(cx, cy-bodyH/2-22, 22, 0, Math.PI*2);
  ctx.fill();

  // gloves
  ctx.fillStyle = f.isPlayer ? '#dc2626' : '#2563eb';
  const gloveR = 14;

  let lx = cx - 45, ly = cy - 10;
  let rx = cx + 45, ry = cy - 10;

  if(f.punching){
    const p = PUNCHES[f.punching.type];
    const dir = f.isPlayer ? 1 : -1;
    if(f.punching.phase==='wind'){
      // wind-up: pull back
      const t = f.punching.elapsed / Math.max(1,p.wind);
      if(f.isPlayer){ rx = cx + 45 - t*20; ry = cy - 10 - t*15; }
      else { lx = cx - 45 + t*20; ly = cy - 10 - t*15; }
    }
    if(f.punching.phase==='active'){
      const t = Math.min(f.punching.elapsed / p.speed, 1);
      const reach = p.range * t;
      if(f.isPlayer){ rx = cx + 20 + reach; ry = cy - 15; }
      else { lx = cx - 20 - reach; ly = cy - 15; }
    }
    if(f.punching.phase==='recover'){
      const t = f.punching.elapsed / p.recovery;
      // return to idle
      if(f.isPlayer){ rx = cx + 20 + p.range*(1-t); ry = cy - 15 + t*5; }
      else { lx = cx - 20 - p.range*(1-t); ly = cy - 15 + t*5; }
    }
  }

  // block pose
  if(f.blocking){
    lx = cx - 20; ly = cy - 35;
    rx = cx + 20; ry = cy - 35;
  }

  ctx.beginPath(); ctx.arc(lx,ly,gloveR,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(rx,ry,gloveR,0,Math.PI*2); ctx.fill();

  // legs
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx-12, cy+bodyH/2); ctx.lineTo(cx-20, cy+bodyH/2+40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+12, cy+bodyH/2); ctx.lineTo(cx+20, cy+bodyH/2+40); ctx.stroke();

  ctx.restore();
}

/* ── draw ring ── */
function drawRing(){
  // floor
  ctx.fillStyle = '#161228';
  ctx.fillRect(0, H*0.65, W, H*0.35);
  // ropes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  for(let i=0;i<3;i++){
    const ry = H*0.12 + i*30;
    ctx.beginPath();
    ctx.moveTo(W*0.05, ry);
    ctx.lineTo(W*0.95, ry);
    ctx.stroke();
  }
  // posts
  ctx.fillStyle = '#475569';
  for(const px of [W*0.05, W*0.95]){
    ctx.fillRect(px-4, H*0.1, 8, H*0.58);
  }
}

/* ── draw UI ── */
function drawHUD(){
  // health bars
  const barW = W*0.35;
  const barH = 18;
  const barY = 30;

  drawBar(20, barY, barW, barH, player.hp/player.maxHp, RED);
  drawBar(W-20-barW, barY, barW, barH, opponent.hp/opponent.maxHp, BLUE);

  // labels
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('YOU', 22, barY-6);
  ctx.textAlign = 'right';
  ctx.fillText('CPU', W-22, barY-6);

  // stamina
  drawBar(20, barY+24, barW*0.6, 10, player.stamina/player.maxStamina, GREEN);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('STA', 22, barY+22);

  // round / timer
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Round ' + round + '/' + MAX_ROUNDS, W/2, 28);

  const secs = Math.max(0, Math.ceil(roundTimer));
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = secs<=10 ? '#ef4444' : WHITE;
  ctx.fillText(''+secs, W/2, 58);

  // combo
  if(combo >= 3){
    ctx.fillStyle = YELLOW;
    ctx.font = 'bold 22px monospace';
    ctx.fillText('COMBO x' + combo + '  (' + comboMult.toFixed(1) + 'x)', W/2, H*0.72);
  }

  // score
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + score, W-20, H-15);

  // best
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('Best: ' + bestScore, 20, H-15);
}

/* ── screens ── */
function drawStart(){
  ctx.fillStyle = BG;
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = RED;
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BOXING', W/2, H*0.3);

  ctx.fillStyle = WHITE;
  ctx.font = '18px monospace';
  ctx.fillText('J=Jab  K=Hook  L=Uppercut', W/2, H*0.45);
  ctx.fillText('← → = Dodge  ↓ = Block', W/2, H*0.52);
  ctx.fillText('Touch: tap L/M/R, swipe to dodge', W/2, H*0.59);

  ctx.fillStyle = YELLOW;
  ctx.font = 'bold 22px monospace';
  const blink = Math.sin(performance.now()*0.004) > 0;
  if(blink) ctx.fillText('[ Click or Press Any Key ]', W/2, H*0.75);

  if(bestScore > 0){
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px monospace';
    ctx.fillText('Best: ' + bestScore, W/2, H*0.88);
  }
}

function drawRoundEnd(){
  ctx.fillStyle = 'rgba(10,6,20,0.7)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = YELLOW;
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  if(player.hp <= 0) ctx.fillText('KNOCKDOWN!', W/2, H*0.4);
  else if(opponent.hp <= 0) ctx.fillText('KNOCKDOWN!', W/2, H*0.4);
  else ctx.fillText('Round Over', W/2, H*0.4);

  ctx.fillStyle = WHITE;
  ctx.font = '20px monospace';
  ctx.fillText('Score: ' + score, W/2, H*0.55);
}

function drawGameOver(){
  ctx.fillStyle = 'rgba(10,6,20,0.85)';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = RED;
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';

  const playerWon = player.hp > opponent.hp || opponent.hp <= 0;
  ctx.fillText(playerWon ? 'YOU WIN!' : 'KNOCKED OUT', W/2, H*0.3);

  ctx.fillStyle = WHITE;
  ctx.font = '22px monospace';
  ctx.fillText('Score: ' + score, W/2, H*0.45);
  ctx.fillText('Max Combo: ' + maxCombo, W/2, H*0.52);

  if(score >= bestScore && score > 0){
    ctx.fillStyle = YELLOW;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('★ NEW BEST! ★', W/2, H*0.62);
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText('Click or press any key to restart', W/2, H*0.78);
}

/* ── main loop ── */
function update(timestamp){
  if(!lastTime) lastTime = timestamp;
  dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  if(state==='playing'){
    roundTimer -= dt*0.001;
    if(roundTimer <= 0){
      roundTimer = 0;
      // round decision
      if(round < MAX_ROUNDS){
        round++;
        score += 100; // round completion bonus
        updateHUD();
        initRound();
      } else {
        endGame(player.hp >= opponent.hp);
      }
    }

    updateFighter(player, dt);
    updateFighter(opponent, dt);
    updateAI(dt);

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15;
      p.life -= dt*0.001;
      if(p.life<=0) particles.splice(i,1);
    }

    if(screenShake>0) screenShake -= dt*0.02;
  }

  draw(timestamp);
  animFrame = requestAnimationFrame(update);
}

function draw(ts){
  ctx.save();

  // screen shake
  if(screenShake > 0){
    ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
  }

  ctx.fillStyle = BG;
  ctx.fillRect(-10,-10,W+20,H+20);

  if(state==='start'){
    drawStart();
    ctx.restore();
    return;
  }

  drawRing();
  drawFighter(player);
  drawFighter(opponent);

  // particles
  for(const p of particles){
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawHUD();

  if(state==='roundEnd') drawRoundEnd();
  if(state==='gameOver') drawGameOver();

  ctx.restore();
}

/* ── restart hook ── */
function restart(){
  if(animFrame) cancelAnimationFrame(animFrame);
  state = 'start';
  lastTime = null;
  animFrame = requestAnimationFrame(update);
}

// allow restart from gameOver
window.addEventListener('keydown', e=>{
  if(state==='gameOver'){ restart(); }
});
canvas.addEventListener('click', ()=>{
  if(state==='gameOver'){ restart(); }
});

/* ── boot ── */
bestScore = parseInt(localStorage.getItem(BEST_KEY)||'0',10);
state = 'start';
animFrame = requestAnimationFrame(update);

// expose for external integration
window.BoxingGame = { restart, getState:()=>state, getScore:()=>score };

})();
