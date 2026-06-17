(function() {
  'use strict';

  const BG = '#0a0614';
  const GOLD = '#fbbf24';
  const PERFECT_THRESHOLD = 5;
  const MIN_BLOCK_WIDTH = 10;
  const BASE_SPEED = 120; // pixels per second (was 2 per frame at 60fps)
  const BLOCK_HEIGHT = 30;
  const BASE_BLOCK_WIDTH = 200;
  const PARTICLE_COUNT = 20;
  const TARGET_DT = 16.667; // 60fps reference frame time

  let canvas, ctx;
  let state = 'start'; // start | playing | over
  let stack = [];
  let currentBlock = null;
  let direction = 1;
  let speed = BASE_SPEED;
  let score = 0;
  let combo = 0;
  let bestScore = parseInt(localStorage.getItem('tower-stack_best') || '0');
  let cameraY = 0;
  let targetCameraY = 0;
  let startTime = 0;
  let particles = [];
  let bounceStack = []; // per-block bounce offset
  let animFrame = null;
  let lastTime = 0;

  // Stored references for cleanup
  let _onKeydown = null;
  let _onClick = null;
  let _onTouchstart = null;
  let _onGameStart = null;
  let _onGameRestart = null;
  let _onCleanup = null;
  let _onResize = null;

  function getColor(layer) {
    const hue = (layer * 25 + 200) % 360;
    return `hsl(${hue}, 80%, 55%)`;
  }

  function getColorDark(layer) {
    const hue = (layer * 25 + 200) % 360;
    return `hsl(${hue}, 80%, 35%)`;
  }

  function initCanvas() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resizeCanvas();
    _onResize = resizeCanvas;
    window.addEventListener('resize', _onResize);
  }

  function resizeCanvas() {
    const parent = canvas.parentElement || document.body;
    canvas.width = parent.clientWidth || window.innerWidth;
    canvas.height = parent.clientHeight || window.innerHeight;
  }

  function spawnBlock(y, width) {
    return {
      x: -width,
      y: y,
      width: width,
      height: BLOCK_HEIGHT,
      moving: true
    };
  }

  function startGame() {
    state = 'playing';
    stack = [];
    combo = 0;
    score = 0;
    speed = BASE_SPEED;
    cameraY = 0;
    targetCameraY = 0;
    particles = [];
    bounceStack = [];
    startTime = Date.now();
    direction = 1;
    lastTime = performance.now();

    // Base block
    const baseX = (canvas.width - BASE_BLOCK_WIDTH) / 2;
    const baseY = canvas.height - BLOCK_HEIGHT;
    stack.push({ x: baseX, y: baseY, width: BASE_BLOCK_WIDTH, height: BLOCK_HEIGHT });
    bounceStack.push(0);

    currentBlock = spawnBlock(baseY - BLOCK_HEIGHT, BASE_BLOCK_WIDTH);
    updateHUD();

    // Start the game loop if not running
    if (!animFrame) {
      lastTime = performance.now();
      animFrame = requestAnimationFrame(gameLoop);
    }
  }

  function updateHUD() {
    window.__gameScore = score;
    const el = document.getElementById('score-display');
    if (el) el.textContent = 'Score: ' + score;
  }

  function spawnParticles(x, y, w, color) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: x + Math.random() * w,
        y: y,
        vx: (Math.random() - 0.5) * 480, // pixels/sec (was 8 per frame)
        vy: -Math.random() * 360 - 120,   // pixels/sec
        life: 1,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  }

  function dropBlock() {
    if (state !== 'playing' || !currentBlock || !currentBlock.moving) return;

    currentBlock.moving = false;
    const top = stack[stack.length - 1];
    const overlapLeft = Math.max(currentBlock.x, top.x);
    const overlapRight = Math.min(currentBlock.x + currentBlock.width, top.x + top.width);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 0) {
      // Missed completely
      gameOver();
      return;
    }

    const isPerfect = Math.abs(currentBlock.x - top.x) <= PERFECT_THRESHOLD;
    const placedWidth = isPerfect ? top.width : overlapWidth;
    const placedX = isPerfect ? top.x : overlapLeft;

    const newY = currentBlock.y;
    stack.push({ x: placedX, y: newY, width: placedWidth, height: BLOCK_HEIGHT });
    bounceStack.push(6); // initial bounce

    if (isPerfect) {
      combo++;
      score += 10 + combo * 5;
      spawnParticles(placedX, newY, placedWidth, getColor(stack.length - 1));
    } else {
      combo = 0;
      score += 10;
    }

    // Check game over
    if (placedWidth < MIN_BLOCK_WIDTH) {
      gameOver();
      return;
    }

    updateHUD();

    // Camera shift
    if (newY - targetCameraY < canvas.height * 0.4) {
      targetCameraY -= BLOCK_HEIGHT;
    }

    // Next block
    speed = BASE_SPEED + stack.length * 1.8; // scaled for per-second units
    currentBlock = spawnBlock(newY - BLOCK_HEIGHT, placedWidth);
  }

  function gameOver() {
    state = 'over';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('tower-stack_best', bestScore.toString());
    }
    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('tower-stack', score, duration);
    }
    // Dispatch event for arcade integration
    window.dispatchEvent(new CustomEvent('game-over', { detail: { score: score, game: 'tower-stack' } }));

    // H4: Stop the animation loop on game over
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 720 * dt; // gravity scaled per-second (was 0.2 per frame)
      p.life -= 1.2 * dt; // decay per-second (was 0.02 per frame)
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function update(dt) {
    if (state !== 'playing') return;

    // Move current block (frame-rate independent)
    if (currentBlock && currentBlock.moving) {
      currentBlock.x += speed * direction * dt;
      if (currentBlock.x + currentBlock.width > canvas.width) {
        direction = -1;
      } else if (currentBlock.x < 0) {
        direction = 1;
      }
    }

    // Camera lerp (frame-rate independent: exponential decay)
    const lerpFactor = 1 - Math.pow(1 - 0.08, dt * 60);
    cameraY += (targetCameraY - cameraY) * lerpFactor;

    // Bounce decay (frame-rate independent)
    for (let i = 0; i < bounceStack.length; i++) {
      if (bounceStack[i] > 0) bounceStack[i] *= Math.pow(0.75, dt * 60);
      if (bounceStack[i] < 0.5) bounceStack[i] = 0;
    }

    updateParticles(dt);
  }

  function drawBlock(b, layer, bounce) {
    const screenY = b.y + cameraY + (bounce || 0);
    const grad = ctx.createLinearGradient(b.x, screenY, b.x, screenY + b.height);
    grad.addColorStop(0, getColor(layer));
    grad.addColorStop(1, getColorDark(layer));
    ctx.fillStyle = grad;

    // Rounded corners
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(b.x + r, screenY);
    ctx.lineTo(b.x + b.width - r, screenY);
    ctx.quadraticCurveTo(b.x + b.width, screenY, b.x + b.width, screenY + r);
    ctx.lineTo(b.x + b.width, screenY + b.height - r);
    ctx.quadraticCurveTo(b.x + b.width, screenY + b.height, b.x + b.width - r, screenY + b.height);
    ctx.lineTo(b.x + r, screenY + b.height);
    ctx.quadraticCurveTo(b.x, screenY + b.height, b.x, screenY + b.height - r);
    ctx.lineTo(b.x, screenY + r);
    ctx.quadraticCurveTo(b.x, screenY, b.x + r, screenY);
    ctx.closePath();
    ctx.fill();

    // Subtle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(b.x + 2, screenY + 1, b.width - 4, b.height / 3);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines for depth
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let y = (cameraY % 40); y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Stack
    for (let i = 0; i < stack.length; i++) {
      drawBlock(stack[i], i, bounceStack[i]);
    }

    // Current block
    if (currentBlock && state === 'playing') {
      drawBlock(currentBlock, stack.length, 0);
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y + cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Combo display
    if (combo > 1 && state === 'playing') {
      ctx.save();
      ctx.font = 'bold ' + Math.min(48, 24 + combo * 4) + 'px sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 20;
      const txt = combo + 'x COMBO!';
      ctx.fillText(txt, canvas.width / 2, 80);
      ctx.restore();
    }

    // Start screen
    if (state === 'start') {
      ctx.fillStyle = 'rgba(10,6,20,0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.textAlign = 'center';

      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = GOLD;
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 30;
      ctx.fillText('TOWER STACK', canvas.width / 2, canvas.height / 2 - 80);

      ctx.shadowBlur = 0;
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Tap, click, or press SPACE to drop blocks', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillText('Stack perfectly for combo bonuses!', canvas.width / 2, canvas.height / 2 + 15);

      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('TAP TO START', canvas.width / 2, canvas.height / 2 + 80);

      if (bestScore > 0) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Best: ' + bestScore, canvas.width / 2, canvas.height / 2 + 120);
      }

      ctx.restore();
    }

    // Game over screen
    if (state === 'over') {
      ctx.fillStyle = 'rgba(10,6,20,0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.textAlign = 'center';

      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);

      ctx.shadowBlur = 0;
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = GOLD;
      ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2);

      if (score >= bestScore) {
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('NEW BEST!', canvas.width / 2, canvas.height / 2 + 35);
      } else {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Best: ' + bestScore, canvas.width / 2, canvas.height / 2 + 35);
      }

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('TAP TO PLAY AGAIN', canvas.width / 2, canvas.height / 2 + 90);

      ctx.restore();
    }
  }

  function gameLoop(now) {
    // C1: Compute delta time, clamped to avoid spiral of death
    const dt = Math.min((now - lastTime) / TARGET_DT, 3);
    lastTime = now;

    update(dt);
    draw();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function handleInput() {
    if (state === 'start') {
      startGame();
    } else if (state === 'over') {
      startGame();
    } else if (state === 'playing') {
      dropBlock();
    }
  }

  // H5: destroy() to remove all event listeners
  function destroy() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    if (_onKeydown) window.removeEventListener('keydown', _onKeydown);
    if (_onClick) canvas.removeEventListener('click', _onClick);
    if (_onTouchstart) canvas.removeEventListener('touchstart', _onTouchstart);
    if (_onGameStart) window.removeEventListener('game-start', _onGameStart);
    if (_onGameRestart) window.removeEventListener('game-restart', _onGameRestart);
    if (_onResize) window.removeEventListener('resize', _onResize);
    if (_onCleanup) window.removeEventListener('game-cleanup', _onCleanup);
    _onKeydown = _onClick = _onTouchstart = _onGameStart = _onGameRestart = _onResize = _onCleanup = null;
  }

  function init() {
    initCanvas();

    // Keyboard
    _onKeydown = function(e) {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleInput();
      }
    };
    window.addEventListener('keydown', _onKeydown);

    // Mouse
    _onClick = function(e) {
      e.preventDefault();
      handleInput();
    };
    canvas.addEventListener('click', _onClick);

    // Touch
    _onTouchstart = function(e) {
      e.preventDefault();
      handleInput();
    };
    canvas.addEventListener('touchstart', _onTouchstart, { passive: false });

    // Listen for external start
    _onGameStart = function() { startGame(); };
    window.addEventListener('game-start', _onGameStart);

    // Listen for external restart
    _onGameRestart = function() { startGame(); };
    window.addEventListener('game-restart', _onGameRestart);

    // H4/H5: Cleanup handler calls destroy()
    _onCleanup = function() { destroy(); };
    window.addEventListener('game-cleanup', _onCleanup);

    // Draw initial start screen (no loop until game starts)
    lastTime = performance.now();
    draw();
  }

  // Expose destroy for external callers
  window.__towerStackDestroy = destroy;

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
