/* ── FuzzyNuts Pong ── Canvas 2D, vanilla JS (IIFE) ── */
;(function(){
  'use strict';

  /* ── constants ── */
  const WIN_SCORE   = 11;
  const BG_COLOR    = '#0a0614';
  const PADDLE_W    = 14;
  const PADDLE_H    = 100;
  const BALL_R      = 8;
  const NET_DASH    = 10;
  const NET_GAP     = 12;
  const INIT_SPEED  = 5;
  const SPEED_INC   = 0.3;   // per rally hit
  const AI_BASE_DELAY = 0.08; // 0-1 lerp factor (lower = slower reaction)
  const AI_SPEED_CAP  = 0.25;

  /* ── DOM refs ── */
  const canvas  = document.getElementById('game-canvas');
  const ctx     = canvas.getContext('2d');
  const levelEl = document.getElementById('level-display');
  const scoreEl = document.getElementById('score-display');

  /* ── state ── */
  let W, H;
  let player, ai, ball;
  let playerScore, aiScore, rallyHits;
  let startTime, gameOver, paused, started;
  let keys = {};
  let touchY = null;
  let bestScore = parseInt((function(){try{return localStorage.getItem('pong_best')}catch(e){return null}})() || '0', 10);
  let animId = null;

  /* ── resize ── */
  function resize(){
    
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight || 600;
    // reposition paddles on resize
    if(player){
      player.x = 20;
      player.h = PADDLE_H * (H / 600);
      ai.x = W - 20 - PADDLE_W;
      ai.h = player.h;
    }
  }
  if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); }

  /* ── helpers ── */
  function clamp(v, lo, hi){ return v < lo ? lo : v > hi ? hi : v; }

  function resetBall(dir){
    const speed = INIT_SPEED * (W / 800);
    const angle = (Math.random() * 0.8 - 0.4); // slight vertical bias
    ball = {
      x: W / 2,
      y: H / 2,
      vx: speed * dir * (1 + rallyHits * 0.02),
      vy: speed * angle,
      r: BALL_R * (Math.min(W, H) / 600 || 1),
      speed: speed
    };
    rallyHits = 0;
  }

  function init(){
    resize();
    const paddleScale = H / 600 || 1;
    playerScore = 0;
    aiScore     = 0;
    rallyHits   = 0;
    gameOver    = false;
    paused      = false;
    started     = true;
    startTime   = Date.now();
    window.__gameScore = 0;

    player = { x: 20, y: H/2 - PADDLE_H*paddleScale/2, w: PADDLE_W, h: PADDLE_H*paddleScale, color: '#22d3ee' };
    ai     = { x: W - 20 - PADDLE_W, y: H/2 - PADDLE_H*paddleScale/2, w: PADDLE_W, h: PADDLE_H*paddleScale, color: '#ef4444', targetY: H/2 };

    resetBall(Math.random() < 0.5 ? 1 : -1);
    updateUI();
    if(animId) cancelAnimationFrame(animId);
    loop();
  }

  function updateUI(){
    if(levelEl) levelEl.textContent = playerScore + ' - ' + aiScore;
    if(scoreEl) scoreEl.textContent = playerScore;
    window.__gameScore = playerScore;
  }

  /* ── input ── */
  window.addEventListener('keydown', function(e){
    keys[e.key] = true;
    if(!started && (e.key === ' ' || e.key === 'Enter')) init();
    if(gameOver && (e.key === ' ' || e.key === 'Enter')) init();
  });
  window.addEventListener('keyup', function(e){ keys[e.key] = false; });

  /* touch */
  canvas.addEventListener('touchstart', function(e){
    e.preventDefault();
    if(!started || gameOver){ init(); return; }
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchY = t.clientY - rect.top;
  }, {passive:false});
  canvas.addEventListener('touchmove', function(e){
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const ty = t.clientY - rect.top;
    const tx = (t.clientX - rect.left) * (canvas.width / rect.width);
    if(tx < W / 2) touchY = ty; // only left half controls player
  }, {passive:false});
  canvas.addEventListener('touchend', function(){ touchY = null; });

    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });
  /* ── paddle movement ── */
  function movePlayer(){
    const speed = 8 * (H / 600);
    if(keys['ArrowUp']   || keys['w'] || keys['W']) player.y -= speed;
    if(keys['ArrowDown'] || keys['s'] || keys['S']) player.y += speed;
    // touch
    if(touchY !== null){
      const center = player.y + player.h / 2;
      const diff = touchY - center;
      player.y += clamp(diff, -speed * 1.5, speed * 1.5);
    }
    player.y = clamp(player.y, 0, H - player.h);
  }

  function moveAI(){
    // difficulty ramp: AI reacts faster as total score rises
    const totalScore = playerScore + aiScore;
    const difficultyFactor = Math.min(AI_SPEED_CAP, AI_BASE_DELAY + totalScore * 0.008);

    // AI tracks ball with delay
    ai.targetY += (ball.y - ai.targetY) * difficultyFactor;
    ai.y = clamp(ai.targetY - ai.h / 2, 0, H - ai.h);
  }

  /* ── collision ── */
  function paddleBounce(paddle, isLeft){
    const bTop = ball.y - ball.r;
    const bBot = ball.y + ball.r;
    const pTop = paddle.y;
    const pBot = paddle.y + paddle.h;

    if(bBot < pTop || bTop > pBot) return false;

    if(isLeft){
      if(ball.x - ball.r <= paddle.x + paddle.w && ball.x + ball.r >= paddle.x){
        ball.x = paddle.x + paddle.w + ball.r;
        return true;
      }
    } else {
      if(ball.x + ball.r >= paddle.x && ball.x - ball.r <= paddle.x + paddle.w){
        ball.x = paddle.x - ball.r;
        return true;
      }
    }
    return false;
  }

  function reflectAngle(paddle){
    // -1 at top edge, 0 at center, +1 at bottom edge
    const hitPos = ((ball.y - paddle.y) / paddle.h) * 2 - 1;
    const maxAngle = Math.PI / 3.6; // ~50 degrees
    const angle = hitPos * maxAngle;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const dir = ball.vx > 0 ? 1 : -1;
    // after hitting, reverse horizontal direction
    const newDir = -dir;
    ball.vx = newDir * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    rallyHits++;
    // speed up slightly
    const speedMult = 1 + SPEED_INC * 0.05;
    ball.vx *= speedMult;
    ball.vy *= speedMult;
  }

  /* ── update ── */
  function update(){
    if(gameOver || paused) return;

    movePlayer();
    moveAI();

    // move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // top/bottom wall bounce
    if(ball.y - ball.r <= 0){ ball.y = ball.r; ball.vy *= -1; }
    if(ball.y + ball.r >= H){ ball.y = H - ball.r; ball.vy *= -1; }

    // paddle collisions
    if(paddleBounce(player, true)){
      reflectAngle(player);
    }
    if(paddleBounce(ai, false)){
      reflectAngle(ai);
    }

    // scoring
    if(ball.x + ball.r < 0){
      // AI scores
      aiScore++;
      updateUI();
      if(aiScore >= WIN_SCORE){
        endGame(false);
        return;
      }
      resetBall(1); // serve toward player
    }
    if(ball.x - ball.r > W){
      // Player scores
      playerScore++;
      updateUI();
      if(playerScore >= WIN_SCORE){
        endGame(true);
        return;
      }
      resetBall(-1); // serve toward AI
    }
  }

  /* ── draw ── */
  function draw(){
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // center net
    ctx.setLineDash([NET_DASH, NET_GAP]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W/2, 0);
    ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // paddles
    drawPaddle(player);
    drawPaddle(ai);

    // ball glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // score labels on canvas
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = 'bold ' + Math.floor(H * 0.18) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(playerScore, W * 0.25, H * 0.55);
    ctx.fillText(aiScore,     W * 0.75, H * 0.55);
  }

  function drawPaddle(p){
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    // rounded rect
    const r = p.w / 2;
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y);
    ctx.lineTo(p.x + p.w - r, p.y);
    ctx.arcTo(p.x + p.w, p.y, p.x + p.w, p.y + r, r);
    ctx.lineTo(p.x + p.w, p.y + p.h - r);
    ctx.arcTo(p.x + p.w, p.y + p.h, p.x + p.w - r, p.y + p.h, r);
    ctx.lineTo(p.x + r, p.y + p.h);
    ctx.arcTo(p.x, p.y + p.h, p.x, p.y + p.h - r, r);
    ctx.lineTo(p.x, p.y + r);
    ctx.arcTo(p.x, p.y, p.x + r, p.y, r);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  /* ── game over ── */
  function endGame(won){
    gameOver = true;
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = playerScore;
    window.__gameScore = finalScore;
    if(scoreEl) scoreEl.textContent = finalScore;

    // best score
    if(finalScore > bestScore){
      bestScore = finalScore;
      try{ localStorage.setItem('pong_best', String(bestScore)); }catch(e){}
    }

    // show game over overlay via custom event / class
    const overlay = document.getElementById('game-over-screen');
    if(overlay){
      const msg = overlay.querySelector('.game-over-message, h2, .title');
      if(msg) msg.textContent = won ? 'YOU WIN!' : 'GAME OVER';
      const final = overlay.querySelector('.final-score, #final-score');
      if(final) final.textContent = finalScore + ' pts';
      overlay.classList.add('active');
      overlay.style.display = '';
    }

    // FuzzyNuts score submit
    if(typeof FuzzyScoreSubmit === 'function'){
      try{ FuzzyScoreSubmit('pong', finalScore, duration); }catch(e){}
    }
  }

  /* ── loop ── */
  function loop(){
    update();
    draw();
    if(!gameOver) animId = requestAnimationFrame(loop);
    else {
      // one last draw to show final state
      draw();
    }
  }

  /* ── public API ── */
  window.startGame = function(){ init(); };
  window.pauseGame = function(){ paused = !paused; };
  window.resumeGame = function(){ paused = false; };

  /* ── auto-start on DOMContentLoaded if canvas exists ── */
  if(canvas){
    // show start screen first, wait for keypress/click
    started = false;
    resize();

    // draw initial idle state
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('PONG', W/2, H/2 - 30);
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Press SPACE or tap to start', W/2, H/2 + 10);
    ctx.font = '14px monospace';
    ctx.fillText('Arrow Keys / W S to move', W/2, H/2 + 40);
    ctx.fillText('First to ' + WIN_SCORE + ' wins', W/2, H/2 + 62);
    ctx.fillText('Best: ' + bestScore, W/2, H/2 + 84);

    // also allow click to start
    canvas.addEventListener('click', function(){
      if(!started || gameOver) init();
    });
  }

})();
