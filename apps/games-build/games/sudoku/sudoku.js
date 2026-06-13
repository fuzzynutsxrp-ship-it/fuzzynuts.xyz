(function(){
'use strict';

/* ── state ── */
let canvas, ctx, W, H, cellSize, gridOffsetX, gridOffsetY;
let puzzle, solution, notes, given;
let selected = -1, notesMode = false, hintsLeft = 3;
let timer = 0, timerInterval = null, gameActive = false, startTime = 0;
let score = 0, difficulty = 'easy';
const CLUES = { easy: 38, medium: 30, hard: 24 };
const SCORE_BASE = { easy: 500, medium: 1000, hard: 2000 };

/* ── colours ── */
const BG = '#0a0614';
const CYAN = '#06b6d4';
const WHITE = '#ffffff';
const RED = '#ef4444';
const DIM_CYAN = 'rgba(6,182,212,0.12)';
const DIM_BOX = 'rgba(6,182,212,0.06)';
const SELECTED_BG = 'rgba(6,182,212,0.25)';
const SAME_NUM_BG = 'rgba(6,182,212,0.18)';

/* ── Sudoku generator ── */
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.random()*i+1|0;[a[i],a[j]]=[a[j],a[i]];} return a; }

function validAt(board,r,c,n){
  for(let i=0;i<9;i++){if(board[r*9+i]===n||board[i*9+c]===n) return false;}
  const br=r/3*3|0, bc=c/3*3|0;
  for(let i=br;i<br+3;i++) for(let j=bc;j<bc+3;j++) if(board[i*9+j]===n) return false;
  return true;
}

function solveSudoku(board){
  const idx=board.indexOf(0);if(idx===-1) return true;
  const r=idx/9|0, c=idx%9;
  for(const n of shuffle([1,2,3,4,5,6,7,8,9])){
    if(validAt(board,r,c,n)){board[idx]=n;if(solveSudoku(board)) return true;board[idx]=0;}
  }
  return false;
}

function countSolutions(board,max){
  let count=0;
  function bt(){
    if(count>=max) return;
    const idx=board.indexOf(0);if(idx===-1){count++;return;}
    const r=idx/9|0, c=idx%9;
    for(let n=1;n<=9;n++){
      if(validAt(board,r,c,n)){board[idx]=n;bt();board[idx]=0;if(count>=max)return;}
    }
  }
  bt(); return count;
}

function generate(clueCount){
  const sol=new Array(81).fill(0);
  solveSudoku(sol);
  const puz=sol.slice();
  const indices=shuffle([...Array(81).keys()]);
  let removed=0;
  for(const idx of indices){
    if(81-removed<=clueCount) break;
    const backup=puz[idx]; puz[idx]=0;
    const test=puz.slice();
    if(countSolutions(test,2)===1){removed++;}else{puz[idx]=backup;}
  }
  return {puzzle:puz,solution:sol};
}

/* ── Helpers ── */
function getConflicts(board,idx,val){
  if(!val) return [];
  const r=idx/9|0, c=idx%9, conflicts=[];
  for(let i=0;i<9;i++){
    if(i!==c && board[r*9+i]===val) conflicts.push(r*9+i);
    if(i!==r && board[i*9+c]===val) conflicts.push(i*9+c);
  }
  const br=r/3*3|0, bc=c/3*3|0;
  for(let i=br;i<br+3;i++) for(let j=bc;j<bc+3;j++){
    const k=i*9+j; if(k!==idx && board[k]===val) conflicts.push(k);
  }
  return conflicts;
}

function isSolved(){
  for(let i=0;i<81;i++) if(puzzle[i]!==solution[i]) return false;
  return true;
}

/* ── Drawing ── */
function resize(){
  const parent=canvas.parentElement;
  const maxW=parent?parent.clientWidth:window.innerWidth;
  const maxH=parent?parent.clientHeight-60:window.innerHeight-60;
  const size=Math.min(maxW,maxH,540);
  W=H=size;
  canvas.width=W; canvas.height=H;
  cellSize=W/9;
  gridOffsetX=0; gridOffsetY=0;
  draw();
}

function draw(){
  if(!ctx) return;
  ctx.fillStyle=BG; ctx.fillRect(0,0,W,H);

  /* cells */
  for(let r=0;r<9;r++) for(let c=0;c<9;c++){
    const idx=r*9+c;
    const x=gridOffsetX+c*cellSize, y=gridOffsetY+r*cellSize;

    /* highlight bg */
    if(selected>=0){
      const sr=selected/9|0, sc=selected%9;
      const sameRow=r===sr, sameCol=c===sc;
      const sameBox=(r/3|0)===(sr/3|0)&&(c/3|0)===(sc/3|0);
      if(idx===selected) ctx.fillStyle=SELECTED_BG;
      else if(sameRow||sameCol||sameBox) ctx.fillStyle=DIM_BOX;
      else ctx.fillStyle=BG;
    } else ctx.fillStyle=BG;

    /* same number highlight */
    if(selected>=0 && puzzle[selected] && puzzle[idx]===puzzle[selected] && idx!==selected){
      ctx.fillStyle=SAME_NUM_BG;
    }
    if(idx===selected) ctx.fillStyle=SELECTED_BG;
    ctx.fillRect(x,y,cellSize,cellSize);

    /* value */
    const val=puzzle[idx];
    if(val){
      const isGiven=given[idx];
      const hasConflict=!isGiven && getConflicts(puzzle,idx,val).length>0;
      ctx.fillStyle=isGiven?WHITE:(hasConflict?RED:CYAN);
      ctx.font=`bold ${cellSize*0.55}px monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(val, x+cellSize/2, y+cellSize/2);
    } else if(notes[idx] && notes[idx].size){
      ctx.fillStyle='rgba(6,182,212,0.6)';
      ctx.font=`${cellSize*0.22}px monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      for(const n of notes[idx]){
        const nx=((n-1)%3)/3, ny=((n-1)/3|0)/3;
        ctx.fillText(n, x+cellSize*(nx+1/6)+cellSize/6, y+cellSize*(ny+1/6)+cellSize/6);
      }
    }
  }

  /* grid lines */
  ctx.strokeStyle=CYAN; ctx.lineWidth=1;
  for(let i=0;i<=9;i++){
    ctx.globalAlpha=i%3===0?0.8:0.3;
    ctx.beginPath();ctx.moveTo(gridOffsetX+i*cellSize,gridOffsetY);ctx.lineTo(gridOffsetX+i*cellSize,gridOffsetY+9*cellSize);ctx.stroke();
    ctx.beginPath();ctx.moveTo(gridOffsetX,gridOffsetY+i*cellSize);ctx.lineTo(gridOffsetX+9*cellSize,gridOffsetY+i*cellSize);ctx.stroke();
  }
  ctx.globalAlpha=1;

  /* numpad */
  drawNumpad();
}

function drawNumpad(){
  const padY=gridOffsetY+9*cellSize+8;
  const padSize=Math.min(cellSize*0.7,(W-8)/9);
  for(let n=1;n<=9;n++){
    const x=gridOffsetX+(n-1)*padSize+4;
    ctx.fillStyle='rgba(6,182,212,0.15)';
    ctx.fillRect(x,padY,padSize-4,padSize);
    ctx.fillStyle=CYAN; ctx.font=`bold ${padSize*0.5}px monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(n, x+(padSize-4)/2, padY+padSize/2);
  }
  /* notes toggle & hint buttons */
  const btnW=padSize*1.5;
  ctx.fillStyle=notesMode?'rgba(6,182,212,0.4)':'rgba(6,182,212,0.15)';
  ctx.fillRect(gridOffsetX,padY+padSize+6,btnW,padSize*0.7);
  ctx.fillStyle=WHITE; ctx.font=`${padSize*0.28}px monospace`;
  ctx.fillText('Notes '+(notesMode?'ON':'OFF'),gridOffsetX+btnW/2,padY+padSize+6+padSize*0.35);

  ctx.fillStyle='rgba(6,182,212,0.15)';
  ctx.fillRect(gridOffsetX+btnW+8,padY+padSize+6,btnW,padSize*0.7);
  ctx.fillStyle=WHITE;
  ctx.fillText('Hint ('+hintsLeft+')',gridOffsetX+btnW+8+btnW/2,padY+padSize+6+padSize*0.35);
}

/* ── Interaction ── */
function cellAt(px,py){
  const c=Math.floor((px-gridOffsetX)/cellSize);
  const r=Math.floor((py-gridOffsetY)/cellSize);
  if(r>=0&&r<9&&c>=0&&c<9) return r*9+c;
  return -1;
}

function numpadAt(px,py){
  const padY=gridOffsetY+9*cellSize+8;
  const padSize=Math.min(cellSize*0.7,(W-8)/9);
  if(py>=padY && py<padY+padSize){
    for(let n=1;n<=9;n++){
      const x=gridOffsetX+(n-1)*padSize+4;
      if(px>=x && px<x+padSize-4) return n;
    }
  }
  /* notes button */
  const btnW=padSize*1.5;
  if(py>=padY+padSize+6 && py<padY+padSize+6+padSize*0.7){
    if(px>=gridOffsetX && px<gridOffsetX+btnW) return -1; // notes
    if(px>=gridOffsetX+btnW+8 && px<gridOffsetX+btnW+8+btnW) return -2; // hint
  }
  return 0;
}

function placeNumber(n){
  if(!gameActive || selected<0 || given[selected]) return;
  if(notesMode){
    if(!notes[selected]) notes[selected]=new Set();
    if(notes[selected].has(n)) notes[selected].delete(n); else notes[selected].add(n);
    puzzle[selected]=0;
  } else {
    notes[selected]=null;
    puzzle[selected]=n;
  }
  if(isSolved()) gameWon();
  draw();
}

function eraseCell(){
  if(!gameActive || selected<0 || given[selected]) return;
  puzzle[selected]=0; notes[selected]=null; draw();
}

function useHint(){
  if(!gameActive||hintsLeft<=0) return;
  /* find empty/wrong cell */
  const empties=[];
  for(let i=0;i<81;i++) if(!given[i] && puzzle[i]!==solution[i]) empties.push(i);
  if(!empties.length) return;
  const idx=empties[Math.random()*empties.length|0];
  puzzle[idx]=solution[idx]; notes[idx]=null; given[idx]=true; hintsLeft--;
  draw();
}

function handleClick(px,py){
  const n=numpadAt(px,py);
  if(n===-1){notesMode=!notesMode;draw();return;}
  if(n===-2){useHint();return;}
  if(n>0){placeNumber(n);return;}
  const idx=cellAt(px,py);
  if(idx<0) return;
  if(idx===selected && !given[idx] && puzzle[idx]){eraseCell();return;}
  selected=idx; draw();
}

function handleKey(e){
  if(!gameActive) return;
  const n=parseInt(e.key);
  if(n>=1&&n<=9) placeNumber(n);
  else if(e.key==='0'||e.key==='Backspace'||e.key==='Delete') eraseCell();
  else if(e.key==='n'||e.key==='N'){notesMode=!notesMode;draw();}
}

/* ── Timer & Score ── */
function updateHUD(){
  const el=document.getElementById('score-display');
  if(el) el.textContent='Score: '+score+' | Hints: '+hintsLeft+' | '+formatTime(timer);
}

function formatTime(s){return (s/60|0)+':'+(s%60<10?'0':'')+(s%60);}

function tick(){timer++;updateHUD();}

function gameWon(){
  gameActive=false;
  clearInterval(timerInterval);
  const timeBonus=Math.max(0, 600-timer)*2;
  score=SCORE_BASE[difficulty]+timeBonus;
  window.__gameScore=score;
  updateHUD();

  /* best time */
  const key='sudoku_best_'+difficulty;
  const prev=parseInt(localStorage.getItem(key))||99999;
  if(timer<prev) localStorage.setItem(key,timer);

  if(typeof FuzzyScoreSubmit==='function') FuzzyScoreSubmit('sudoku',score,timer);
  /* signal game over */
  const ev=new CustomEvent('game-over',{detail:{score,time:timer,difficulty}});
  document.dispatchEvent(ev);
}

/* ── Start / Reset ── */
function startGame(diff){
  difficulty=diff||'easy';
  const clueCount=CLUES[difficulty];
  const g=generate(clueCount);
  puzzle=g.puzzle; solution=g.solution;
  given=puzzle.map(v=>v!==0);
  notes=new Array(81).fill(null);
  selected=-1; notesMode=false; hintsLeft=3;
  timer=0; score=0; window.__gameScore=0;
  gameActive=true;
  clearInterval(timerInterval);
  timerInterval=setInterval(tick,1000);
  updateHUD(); resize();
}

function init(canvasEl){
  canvas=canvasEl;
  ctx=canvas.getContext('2d');

  canvas.addEventListener('click',e=>{
    const r=canvas.getBoundingClientRect();
    handleClick(e.clientX-r.left, e.clientY-r.top);
  });
  canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    const t=e.touches[0], r=canvas.getBoundingClientRect();
    handleClick(t.clientX-r.left, t.clientY-r.top);
  },{passive:false});
  window.addEventListener('keydown',handleKey);
  window.addEventListener('resize',resize);

  /* listen for start event */
  document.addEventListener('game-start',e=>startGame(e.detail&&e.detail.difficulty));

  resize();
}

/* ── Expose ── */
window.SudokuGame={init,startGame};

})();
