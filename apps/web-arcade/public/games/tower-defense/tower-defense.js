(function(){
'use strict';

// ─── Constants ───
const BG = '#0a0614';
const ACCENT = '#7c3aed';
const GRID_SIZE = 40;
const MAX_WAVES = 50;
const START_LIVES = 20;
const START_GOLD = 100;

// ─── Path waypoints (grid coords) ───
const PATH_WAYPOINTS = [
  {x:0,y:3},{x:4,y:3},{x:4,y:7},{x:10,y:7},{x:10,y:2},{x:16,y:2},
  {x:16,y:10},{x:8,y:10},{x:8,y:13},{x:19,y:13}
];

// ─── Tower definitions ───
const TOWER_DEFS = {
  basic:  {name:'Basic',  cost:50,  damage:20, range:100, fireRate:1.0, color:'#3b82f6', projColor:'#60a5fa', splash:0, slow:0},
  rapid:  {name:'Rapid',  cost:75,  damage:10, range:80,  fireRate:3.0, color:'#10b981', projColor:'#34d399', splash:0, slow:0},
  splash: {name:'Splash', cost:120, damage:30, range:90,  fireRate:0.6, color:'#f59e0b', projColor:'#fbbf24', splash:50, slow:0},
  slow:   {name:'Slow',   cost:80,  damage:8,  range:100, fireRate:1.2, color:'#8b5cf6', projColor:'#a78bfa', splash:0, slow:0.5}
};

// ─── Enemy definitions ───
const ENEMY_TYPES = {
  fast: {hp:40,  speed:2.5, radius:8,  color:'#ef4444', reward:10, scoreVal:10},
  tank: {hp:200, speed:1.0, radius:12, color:'#06b6d4', reward:25, scoreVal:25},
  boss: {hp:1000,speed:0.8, radius:16, color:'#f43f5e', reward:100,scoreVal:100}
};

let canvas, ctx, cols, rows, pathPixels;
let state, animId, startTime;

function init(){
  canvas = document.getElementById('game-canvas');
  if(!canvas){ canvas = document.createElement('canvas'); canvas.id='game-canvas'; document.body.appendChild(canvas); }
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleTouch, {passive:false});
  resetState();
  startTime = Date.now();
  loop();
}

function resize(){
  const w = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
  const h = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
  canvas.width = w; canvas.height = h;
  cols = Math.floor(w / GRID_SIZE);
  rows = Math.floor(h / GRID_SIZE);
  buildPathPixels();
}

function buildPathPixels(){
  pathPixels = [];
  for(let i=0;i<PATH_WAYPOINTS.length-1;i++){
    const a=PATH_WAYPOINTS[i], b=PATH_WAYPOINTS[i+1];
    const dx=Math.sign(b.x-a.x), dy=Math.sign(b.y-a.y);
    let cx=a.x, cy=a.y;
    while(cx!==b.x || cy!==b.y){
      pathPixels.push({x:cx,y:cy});
      if(cx!==b.x) cx+=dx; else cy+=dy;
    }
  }
  pathPixels.push(PATH_WAYPOINTS[PATH_WAYPOINTS.length-1]);
}

const pathSet = new Set(pathPixels.map(p => p.x + "," + p.y));
function isOnPath(gx,gy){
  return pathSet.has(gx + "," + gy);
}

function resetState(){
  state = {
    lives: START_LIVES,
    gold: START_GOLD,
    score: 0,
    wave: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    selectedTower: null,
    gameOver: false,
    paused: false,
    waveComplete: false
  };
  window.__gameScore = 0;
  updateHUD();
}

// ─── Wave generation ───
function startWave(){
  state.wave++;
  if(state.wave > MAX_WAVES){ victory(); return; }
  state.waveActive = true;
  state.waveComplete = false;
  const q = [];
  const base = 3 + state.wave * 2;
  for(let i=0;i<base;i++) q.push('fast');
  if(state.wave>=3){
    const tanks = Math.floor(state.wave/3);
    for(let i=0;i<tanks;i++) q.push('tank');
  }
  if(state.wave%5===0) q.push('boss');
  // shuffle
  for(let i=q.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[q[i],q[j]]=[q[j],q[i]];}
  state.spawnQueue = q;
  state.spawnTimer = 0;
  updateHUD();
}

function spawnEnemy(type){
  const def = ENEMY_TYPES[type];
  const hpMult = 1 + (state.wave-1)*0.15;
  const wp = PATH_WAYPOINTS[0];
  state.enemies.push({
    type, x:wp.x*GRID_SIZE+GRID_SIZE/2, y:wp.y*GRID_SIZE+GRID_SIZE/2,
    hp:def.hp*hpMult, maxHp:def.hp*hpMult, speed:def.speed,
    radius:def.radius, color:def.color, reward:def.reward, scoreVal:def.scoreVal,
    waypointIdx:1, slowTimer:0, slowAmount:0
  });
}

// ─── Game loop ───
function loop(){
  if(!state.gameOver && !state.paused){
    update();
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function update(){
  // spawn
  if(state.waveActive && state.spawnQueue.length>0){
    state.spawnTimer += 1/60;
    if(state.spawnTimer >= 0.6){
      state.spawnTimer=0;
      spawnEnemy(state.spawnQueue.shift());
    }
  }
  // enemies
  for(let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    if(e.slowTimer>0) e.slowTimer-=1/60;
    const spd = e.speed * (e.slowTimer>0 ? (1-e.slowAmount) : 1);
    const target = PATH_WAYPOINTS[e.waypointIdx];
    if(!target){ enemyReachedEnd(i); continue; }
    const tx=target.x*GRID_SIZE+GRID_SIZE/2, ty=target.y*GRID_SIZE+GRID_SIZE/2;
    const dx=tx-e.x, dy=ty-e.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<spd*2){ e.x=tx; e.y=ty; e.waypointIdx++; }
    else { e.x+=dx/dist*spd*2; e.y+=dy/dist*spd*2; }
  }
  // towers fire
  for(const t of state.towers){
    t.cooldown = (t.cooldown||0) - 1/60;
    if(t.cooldown<=0){
      const target = findTarget(t);
      if(target){
        fireProjectile(t,target);
        t.cooldown = 1/t.fireRate;
      }
    }
  }
  // projectiles
  for(let i=state.projectiles.length-1;i>=0;i--){
    const p=state.projectiles[i];
    const dx=p.tx-p.x, dy=p.ty-p.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<5){
      applyDamage(p);
      state.projectiles.splice(i,1);
    } else {
      p.x+=dx/dist*6; p.y+=dy/dist*6;
    }
  }
  // particles
  for(let i=state.particles.length-1;i>=0;i--){
    const p=state.particles[i];
    p.life-=1/60; p.x+=p.vx; p.y+=p.vy;
    if(p.life<=0) state.particles.splice(i,1);
  }
  // wave complete?
  if(state.waveActive && state.spawnQueue.length===0 && state.enemies.length===0){
    state.waveActive=false;
    state.waveComplete=true;
    const bonus = state.wave*20;
    state.score += bonus;
    state.gold += bonus;
    window.__gameScore = state.score;
    updateHUD();
    // auto-start next wave after delay
    setTimeout(()=>{ if(!state.gameOver) startWave(); }, 2000);
  }
}

function findTarget(tower){
  let best=null, bestDist=tower.range+1;
  for(const e of state.enemies){
    const dx=e.x-tower.x, dy=e.y-tower.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<=tower.range && d<bestDist){ best=e; bestDist=d; }
  }
  return best;
}

function fireProjectile(tower,target){
  state.projectiles.push({
    x:tower.x, y:tower.y, tx:target.x, ty:target.y,
    target, damage:tower.damage, splash:tower.splash, slow:tower.slow,
    color:tower.projColor
  });
}

function applyDamage(proj){
  if(proj.splash>0){
    for(const e of state.enemies){
      const dx=e.x-proj.tx, dy=e.y-proj.ty;
      if(Math.sqrt(dx*dx+dy*dy)<=proj.splash){
        e.hp-=proj.damage;
        spawnHitParticles(e.x,e.y,proj.color);
      }
    }
  } else {
    const t=proj.target;
    if(state.enemies.includes(t)){
      t.hp-=proj.damage;
      if(proj.slow>0){ t.slowTimer=1.5; t.slowAmount=proj.slow; }
      spawnHitParticles(t.x,t.y,proj.color);
    }
  }
  // kill check
  for(let i=state.enemies.length-1;i>=0;i--){
    if(state.enemies[i].hp<=0){
      const e=state.enemies[i];
      state.gold+=e.reward;
      state.score+=e.scoreVal;
      window.__gameScore=state.score;
      spawnKillParticles(e.x,e.y,e.color);
      state.enemies.splice(i,1);
      updateHUD();
    }
  }
}

function enemyReachedEnd(idx){
  state.enemies.splice(idx,1);
  state.lives--;
  updateHUD();
  if(state.lives<=0) gameOver();
}

function spawnHitParticles(x,y,color){
  for(let i=0;i<4;i++){
    state.particles.push({x,y,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,life:0.3,color,radius:2});
  }
}
function spawnKillParticles(x,y,color){
  for(let i=0;i<10;i++){
    state.particles.push({x,y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:0.5,color,radius:3});
  }
}

// ─── Drawing ───
function draw(){
  ctx.fillStyle=BG; ctx.fillRect(0,0,canvas.width,canvas.height);
  drawPath();
  drawTowers();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawRange();
  if(!state.waveActive && state.wave===0) drawStartPrompt();
  if(state.gameOver) drawGameOver();
}

function drawPath(){
  ctx.fillStyle='#1a1030';
  for(const p of pathPixels){
    ctx.fillRect(p.x*GRID_SIZE,p.y*GRID_SIZE,GRID_SIZE,GRID_SIZE);
  }
  // path border glow
  ctx.strokeStyle='rgba(124,58,237,0.15)'; ctx.lineWidth=1;
  for(const p of pathPixels){
    ctx.strokeRect(p.x*GRID_SIZE,p.y*GRID_SIZE,GRID_SIZE,GRID_SIZE);
  }
}

function drawTowers(){
  for(const t of state.towers){
    ctx.fillStyle=t.color;
    ctx.beginPath(); ctx.arc(t.x,t.y,14,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2; ctx.stroke();
    // level indicator
    if(t.level>1){
      ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
      ctx.fillText('Lv'+t.level,t.x,t.y+4);
    }
  }
}

function drawEnemies(){
  for(const e of state.enemies){
    ctx.fillStyle=e.color;
    ctx.beginPath(); ctx.arc(e.x,e.y,e.radius,0,Math.PI*2); ctx.fill();
    // HP bar
    const bw=e.radius*2, bh=3;
    ctx.fillStyle='#333'; ctx.fillRect(e.x-e.radius,e.y-e.radius-6,bw,bh);
    ctx.fillStyle='#22c55e'; ctx.fillRect(e.x-e.radius,e.y-e.radius-6,bw*(e.hp/e.maxHp),bh);
    if(e.slowTimer>0){
      ctx.strokeStyle='#8b5cf6'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.radius+2,0,Math.PI*2); ctx.stroke();
    }
  }
}

function drawProjectiles(){
  for(const p of state.projectiles){
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill();
  }
}

function drawParticles(){
  for(const p of state.particles){
    ctx.globalAlpha=Math.max(0,p.life*2);
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawRange(){
  const t=state.selectedTower;
  if(!t) return;
  ctx.strokeStyle='rgba(124,58,237,0.4)'; ctx.lineWidth=1;
  ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.arc(t.x,t.y,t.range,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
}

function drawStartPrompt(){
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff'; ctx.font='bold 28px monospace'; ctx.textAlign='center';
  ctx.fillText('TOWER DEFENSE',canvas.width/2,canvas.height/2-30);
  ctx.font='16px monospace'; ctx.fillStyle=ACCENT;
  ctx.fillText('Click anywhere to start',canvas.width/2,canvas.height/2+10);
  ctx.fillStyle='#aaa'; ctx.font='13px monospace';
  ctx.fillText('Click near path to place towers • Click towers to upgrade',canvas.width/2,canvas.height/2+40);
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#ef4444'; ctx.font='bold 32px monospace'; ctx.textAlign='center';
  ctx.fillText('GAME OVER',canvas.width/2,canvas.height/2-30);
  ctx.fillStyle='#fff'; ctx.font='18px monospace';
  ctx.fillText('Score: '+state.score,canvas.width/2,canvas.height/2+10);
  const best=parseInt(localStorage.getItem('tower-defense_best')||'0');
  ctx.fillText('Best: '+Math.max(best,state.score),canvas.width/2,canvas.height/2+35);
  ctx.fillStyle=ACCENT; ctx.font='14px monospace';
  ctx.fillText('Click to restart',canvas.width/2,canvas.height/2+60);
}

// ─── Input ───
function handleClick(e){
  if(state.gameOver){ restart(); return; }
  if(state.wave===0 && !state.waveActive){ startWave(); return; }
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const gx=Math.floor(mx/GRID_SIZE), gy=Math.floor(my/GRID_SIZE);
  // check if clicked on existing tower
  for(const t of state.towers){
    const dx=mx-t.x, dy=my-t.y;
    if(Math.sqrt(dx*dx+dy*dy)<18){
      upgradeTower(t);
      return;
    }
  }
  // place tower if not on path
  if(!isOnPath(gx,gy) && !towerAt(gx,gy)){
    placeTower(gx,gy);
  }
}

function handleTouch(e){
  e.preventDefault();
  const t=e.touches[0];
  handleClick({clientX:t.clientX, clientY:t.clientY});
}

function towerAt(gx,gy){
  return state.towers.find(t=>t.gx===gx&&t.gy===gy);
}

function placeTower(gx,gy){
  // show selection via simple cost check — place basic by default, cycle with repeated clicks
  const types=['basic','rapid','splash','slow'];
  // find cheapest affordable
  let placed=false;
  for(const type of types){
    const def=TOWER_DEFS[type];
    if(state.gold>=def.cost){
      state.gold-=def.cost;
      const x=gx*GRID_SIZE+GRID_SIZE/2, y=gy*GRID_SIZE+GRID_SIZE/2;
      const tower={gx,gy,x,y,type,...def,level:1,cooldown:0};
      state.towers.push(tower);
      state.selectedTower=tower;
      placed=true;
      updateHUD();
      break;
    }
  }
  if(!placed){
    // flash gold display
    const el=document.getElementById('lives-display');
    if(el){ el.style.color='#ef4444'; setTimeout(()=>el.style.color='',300); }
  }
}

function upgradeTower(tower){
  const cost = Math.floor(TOWER_DEFS[tower.type].cost * 0.6 * tower.level);
  if(state.gold>=cost){
    state.gold-=cost;
    tower.level++;
    tower.damage *= 1.35;
    tower.range *= 1.1;
    tower.fireRate *= 1.15;
    state.selectedTower=tower;
    updateHUD();
  }
}

// ─── Game flow ───
function gameOver(){
  state.gameOver=true;
  const best=parseInt(localStorage.getItem('tower-defense_best')||'0');
  if(state.score>best) localStorage.setItem('tower-defense_best',state.score);
  const duration=Math.floor((Date.now()-startTime)/1000);
  window.__gameScore=state.score;
  if(typeof FuzzyScoreSubmit==='function') FuzzyScoreSubmit('tower-defense',state.score,duration);
  updateHUD();
}

function victory(){
  state.gameOver=true;
  state.score+=500;
  window.__gameScore=state.score;
  const best=parseInt(localStorage.getItem('tower-defense_best')||'0');
  if(state.score>best) localStorage.setItem('tower-defense_best',state.score);
  const duration=Math.floor((Date.now()-startTime)/1000);
  if(typeof FuzzyScoreSubmit==='function') FuzzyScoreSubmit('tower-defense',state.score,duration);
  updateHUD();
}

function restart(){
  cancelAnimationFrame(animId);
  resetState();
  startTime=Date.now();
  loop();
}

function updateHUD(){
  const sd=document.getElementById('score-display');
  const ld=document.getElementById('lives-display');
  const lv=document.getElementById('level-display');
  if(sd) sd.textContent='Score: '+state.score;
  if(ld) ld.textContent='Lives: '+state.lives;
  if(lv) lv.textContent='Wave: '+state.wave+'/'+MAX_WAVES;
}

// ─── Public API ───
window.TowerDefense = { init, restart, getState:()=>state };

// Auto-init when canvas exists
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
