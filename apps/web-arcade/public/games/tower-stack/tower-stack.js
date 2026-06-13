(function() {
  'use strict';

  const BG = '#0a0614';
  const GOLD = '#fbbf24';
  const PERFECT_THRESHOLD = 5;
  const MIN_BLOCK_WIDTH = 10;
  const BASE_SPEED = 2;
  const BLOCK_HEIGHT = 30;
  const BASE_BLOCK_WIDTH = 200;
  const PARTICLE_COUNT = 20;

  let canvas, ctx;
  let state = 'start'; // start | playing | over
  let stack = [];
  let currentBlock = null;
  let direction = 1;
  let speed = BASE_SPEED;
  let score = 0;
  let combo = 0;
  let bestScore;
  try { bestScore = parseInt(localStorage.getItem('tower-stack_best') || '0'); } catch (e) { bestScore = 0; }
  let cameraY = 0;
  let targetCameraY = 0;
  let startTime = 0;
  let particles = [];
  let bounceStack = []; // per-block bounce offset
  let animFrame = null;

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
    window.addEventListener('resize', resizeCanvas);
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

    // Base block
    const baseX = (canvas.width - BASE_BLOCK_WIDTH) / 2;
    const baseY = canvas.height - BLOCK_HEIGHT;
    stack.push({ x: baseX, y: baseY, width: BASE_BLOCK_WIDTH, height: BLOCK_HEIGHT });
    bounceStack.push(0);

    currentBlock = spawnBlock(baseY - BLOCK_HEIGHT, BASE_BLOCK_WIDTH);
    updateHUD();
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
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
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
    speed = BASE_SPEED + stack.length * 0.3;
    currentBlock = spawnBlock(newY - BLOCK_HEIGHT, placedWidth);
  }

  function gameOver() {
    state = 'over';
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('tower-stack_best', bestScore.toString()); } catch (e) { /* Safari private */ }
    }
    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (typeof FuzzyScoreSubmit === 'function') {
      FuzzyScoreSubmit('tower-stack', score, duration);
    }
    // Dispatch event for arcade integration
    window.dispatchEvent(new CustomEvent('game-over', { detail: { score: score, game: 'tower-stack' } }));
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.02;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function update() {
    if (state !== 'playing') return;

    // Move current block
    if (currentBlock && currentBlock.moving) {
      currentBlock.x += speed * direction;
      if (currentBlock.x + currentBlock.width > canvas.width) {
        direction = -1;
      } else if (currentBlock.x < 0) {
        direction = 1;
      }
    }

    // Camera lerp
    cameraY += (targetCameraY - cameraY) * 0.08;

    // Bounce decay
    for (let i = 0; i < bounceStack.length; i++) {
      if (bounceStack[i] > 0) bounceStack[i] *= 0.75;
      if (bounceStack[i] < 0.5) bounceStack[i] = 0;
    }

    updateParticles(1);
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

  function gameLoop() {
    update();
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

  function init() {
    initCanvas();

    // Keyboard
    window.addEventListener('keydown', function(e) {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleInput();
      }
    });

    // Mouse
    canvas.addEventListener('click', function(e) {
      e.preventDefault();
      handleInput();
    });

    // Touch
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      handleInput();
    }, { passive: false });

    // Listen for external start
    window.addEventListener('game-start', function() {
      startGame();
    });

    // Listen for external restart
    window.addEventListener('game-restart', function() {
      startGame();
    });

    gameLoop();
  }

  // Cleanup
  window.addEventListener('game-cleanup', function() {
    if (animFrame) cancelAnimationFrame(animFrame);
    window.removeEventListener('resize', resizeCanvas);
  });

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
