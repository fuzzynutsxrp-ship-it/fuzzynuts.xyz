(function () {
  'use strict';

  // --- Constants ---
  const BG = '#0a0614';
  const PLAYER_COLOR = '#10b981';
  const PLAT_NORMAL = '#10b981';
  const PLAT_MOVING = '#3b82f6';
  const PLAT_FRAGILE = '#ef4444';
  const PLAT_SPRING = '#eab308';
  const JETPACK_COLOR = '#f97316';
  const SHOOT_COLOR = '#a78bfa';

  const GRAVITY = 0.5;
  const BOUNCE_VEL = -12;
  const SPRING_VEL = -20;
  const JETPACK_VEL = -4;
  const MOVE_SPEED = 5;
  const SHOOT_VEL = -18;
  const SHOOT_MAX = 5;
  const SPRING_SHOES_DURATION = 300; // frames (~5s at 60fps)

  let canvas, ctx, W, H;
  let state; // 'start', 'playing', 'over'
  let player, platforms, camera, score, bestScore, startTime;
  let keys, touchX;
  let projectiles;
  let particles;
  let animFrame;

  // --- Resize ---
  function resize() {
    W = canvas.width = canvas.clientWidth;
    H = canvas.height = canvas.clientHeight;
  }

  // --- Init ---
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
    ctx = canvas.getContext('2d');
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(document.body); } else { window.addEventListener('resize', resize); };
    resize();

    bestScore = parseInt((function(){try{return localStorage.getItem('doodle-jump_best')}catch(e){return null}})() || '0');
    keys = {};
    window.addEventListener('keydown', e => { keys[e.key] = true; if (['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key)) e.preventDefault(); });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Touch
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchcancel', function(e) { e.preventDefault(); }, { passive: false });

    showStart();
    loop();
  }

  // --- Touch ---
  function onTouchStart(e) { e.preventDefault(); handleTouch(e.touches[0].clientX); }
  function onTouchMove(e) { e.preventDefault(); handleTouch(e.touches[0].clientX); }
  function onTouchEnd(e) { touchX = null; }

  function handleTouch(cx) {
    const rect = canvas.getBoundingClientRect();
    const x = cx - rect.left;
    touchX = x < W / 2 ? -1 : 1;
    if (state === 'start') startGame();
    if (state === 'over') startGame();
  }

  function onMouseDown(e) {
    if (state === 'start') { startGame(); return; }
    if (state === 'over') { startGame(); return; }
    // Shoot
    shoot();
  }

  // --- Game State ---
  function showStart() {
    state = 'start';
    if (window.__gameScore !== undefined) window.__gameScore = 0;
    updateHUD(0);
  }

  function startGame() {
    state = 'playing';
    score = 0;
    startTime = Date.now();
    camera = 0;
    projectiles = [];
    particles = [];

    player = {
      x: W / 2, y: H - 80,
      vx: 0, vy: 0,
      w: 30, h: 30,
      ammo: SHOOT_MAX,
      hasJetpack: false, jetpackTimer: 0,
      springShoes: false, springShoesTimer: 0,
      facing: 1
    };

    platforms = [];
    // Ground platform
    platforms.push({ x: W / 2 - 40, y: H - 40, w: 80, h: 12, type: 'normal' });
    generatePlatforms(H - 40, -2000);

    updateHUD(0);
  }

  function gameOver() {
    state = 'over';
    const elapsed = (Date.now() - startTime) / 1000;
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem('doodle-jump_best', bestScore); } catch(e) {}
    }
    window.__gameScore = score;
    updateHUD(score);
    if (typeof FuzzyScoreSubmit === 'function') {
      try { FuzzyScoreSubmit('doodle-jump', score, elapsed); } catch (e) {}
    }
  }

  function updateHUD(s) {
    const el = document.getElementById('score-display');
    if (el) el.textContent = s;
  }

  // --- Platform Generation ---
  function generatePlatforms(fromY, toY) {
    let y = fromY;
    const difficulty = Math.min(score / 5000, 1);
    while (y > toY) {
      const gap = 50 + Math.random() * (60 + difficulty * 40);
      y -= gap;
      const pw = 70 + Math.random() * 30;
      const px = Math.random() * (W - pw);
      let type = 'normal';
      const r = Math.random();
      if (r < 0.1 + difficulty * 0.25) type = 'fragile';
      else if (r < 0.2 + difficulty * 0.2) type = 'moving';
      else if (r < 0.25 + difficulty * 0.05) type = 'spring';

      const plat = { x: px, y: y, w: pw, h: 12, type: type };
      if (type === 'moving') {
        plat.origX = px;
        plat.speed = 1 + Math.random() * 2 * (0.5 + difficulty);
        plat.range = 50 + Math.random() * 80;
        plat.phase = Math.random() * Math.PI * 2;
      }
      if (type === 'spring') {
        plat.springW = 16;
        plat.springH = 10;
      }

      platforms.push(plat);

      // Chance for power-up above platform
      if (Math.random() < 0.03 + difficulty * 0.02) {
        const puType = Math.random() < 0.5 ? 'jetpack' : 'springShoes';
        platforms.push({ x: px + pw / 2 - 10, y: y - 40, w: 20, h: 20, type: 'powerup', puType: puType, collected: false });
      }
    }
  }

  // --- Shoot ---
  function shoot() {
    if (player.ammo <= 0) return;
    player.ammo--;
    projectiles.push({ x: player.x, y: player.y - player.h / 2, vy: SHOOT_VEL, w: 4, h: 10 });
  }

  // --- Particles ---
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  // --- Update ---
  function update() {
    if (state !== 'playing') return;

    const p = player;

    // Input
    let mx = 0;
    if (keys['ArrowLeft'] || keys['a']) mx = -1;
    if (keys['ArrowRight'] || keys['d']) mx = 1;
    if (touchX !== null) mx = touchX;
    if (mx !== 0) p.facing = mx;

    p.vx = mx * MOVE_SPEED;

    // Jetpack
    if (p.hasJetpack && p.jetpackTimer > 0) {
      p.vy = JETPACK_VEL;
      p.jetpackTimer--;
      if (p.jetpackTimer <= 0) p.hasJetpack = false;
      spawnParticles(p.x, p.y + p.h / 2, JETPACK_COLOR, 2);
    } else {
      p.vy += GRAVITY;
    }

    p.x += p.vx;
    p.y += p.vy;

    // Wrap
    if (p.x < -p.w / 2) p.x = W + p.w / 2;
    if (p.x > W + p.w / 2) p.x = -p.w / 2;

    // Spring shoes timer
    if (p.springShoes && p.springShoesTimer > 0) {
      p.springShoesTimer--;
      if (p.springShoesTimer <= 0) p.springShoes = false;
    }

    // Camera follow
    const scrollThreshold = H * 0.35;
    if (p.y - camera < scrollThreshold) {
      const diff = (p.y - camera) - scrollThreshold;
      camera += diff;
    }

    // Score (height)
    const heightScore = Math.floor(-camera);
    if (heightScore > score) {
      score = heightScore;
      window.__gameScore = score;
      updateHUD(score);
    }

    // Generate more platforms
    const highest = platforms.reduce((min, pl) => Math.min(min, pl.y), Infinity);
    if (highest > camera - 500) {
      generatePlatforms(highest, camera - H * 2);
    }

    // Remove off-screen platforms
    platforms = platforms.filter(pl => pl.y - camera < H + 200);

    // Update moving platforms
    for (const pl of platforms) {
      if (pl.type === 'moving') {
        pl.x = pl.origX + Math.sin(Date.now() / 1000 * pl.speed + pl.phase) * pl.range;
        if (pl.x < 0) pl.x = 0;
        if (pl.x + pl.w > W) pl.x = W - pl.w;
      }
    }

    // Platform collision (only when falling)
    if (p.vy >= 0) {
      for (let i = platforms.length - 1; i >= 0; i--) {
        const pl = platforms[i];
        if (pl.type === 'powerup') {
          if (!pl.collected && p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w &&
              p.y + p.h / 2 > pl.y && p.y - p.h / 2 < pl.y + pl.h) {
            pl.collected = true;
            if (pl.puType === 'jetpack') {
              p.hasJetpack = true;
              p.jetpackTimer = 180;
            } else {
              p.springShoes = true;
              p.springShoesTimer = SPRING_SHOES_DURATION;
            }
            spawnParticles(pl.x + pl.w / 2, pl.y + pl.h / 2, '#f97316', 10);
          }
          continue;
        }

        const px = p.x - p.w / 2;
        const py = p.y + p.h / 2;
        if (px + p.w > pl.x && px < pl.x + pl.w &&
            py >= pl.y && py <= pl.y + pl.h + p.vy + 2) {

          if (pl.type === 'fragile') {
            pl.breaking = true;
            spawnParticles(pl.x + pl.w / 2, pl.y, PLAT_FRAGILE, 8);
            setTimeout(() => { const idx = platforms.indexOf(pl); if (idx >= 0) platforms.splice(idx, 1); }, 100);
            continue;
          }

          p.y = pl.y - p.h / 2;
          if (pl.type === 'spring' || (p.springShoes && pl.type === 'normal')) {
            p.vy = SPRING_VEL;
            spawnParticles(p.x, p.y + p.h / 2, PLAT_SPRING, 6);
          } else {
            p.vy = BOUNCE_VEL;
          }
          p.ammo = SHOOT_MAX;
          spawnParticles(p.x, p.y + p.h / 2, '#ffffff', 3);
        }
      }
    }

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.y += pr.vy;
      // Hit platforms
      for (let j = platforms.length - 1; j >= 0; j--) {
        const pl = platforms[j];
        if (pl.type === 'powerup' || pl.breaking) continue;
        if (pr.x > pl.x && pr.x < pl.x + pl.w && pr.y > pl.y && pr.y < pl.y + pl.h) {
          if (pl.type === 'fragile') {
            pl.breaking = true;
            spawnParticles(pl.x + pl.w / 2, pl.y, PLAT_FRAGILE, 8);
            setTimeout(() => { const idx = platforms.indexOf(pl); if (idx >= 0) platforms.splice(idx, 1); }, 100);
          }
          projectiles.splice(i, 1);
          break;
        }
      }
      if (pr.y - camera < -50) projectiles.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    // Game over: fell below screen
    if (p.y - camera > H + 50) {
      gameOver();
    }
  }

  // --- Draw ---
  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    if (state === 'start') {
      drawOverlay('🐸 DOODLE JUMP', 'Click or tap to start', PLAYER_COLOR);
      return;
    }

    ctx.save();
    ctx.translate(0, -camera);

    // Platforms
    for (const pl of platforms) {
      if (pl.type === 'powerup') {
        if (pl.collected) continue;
        ctx.fillStyle = pl.puType === 'jetpack' ? JETPACK_COLOR : '#a78bfa';
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pl.puType === 'jetpack' ? '🚀' : '👟', pl.x + pl.w / 2, pl.y + 15);
        continue;
      }

      if (pl.breaking) {
        ctx.globalAlpha = 0.3;
      }

      let color;
      switch (pl.type) {
        case 'moving': color = PLAT_MOVING; break;
        case 'fragile': color = PLAT_FRAGILE; break;
        case 'spring': color = PLAT_SPRING; break;
        default: color = PLAT_NORMAL;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(pl.x, pl.y, pl.w, pl.h, 4);
      ctx.fill();

      if (pl.type === 'spring') {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(pl.x + pl.w / 2 - 8, pl.y - 10, 16, 10);
      }

      ctx.globalAlpha = 1;
    }

    // Projectiles
    for (const pr of projectiles) {
      ctx.fillStyle = SHOOT_COLOR;
      ctx.fillRect(pr.x - pr.w / 2, pr.y, pr.w, pr.h);
    }

    // Player (frog)
    const p = player;
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeOff = p.facing > 0 ? 6 : -6;
    ctx.beginPath();
    ctx.arc(p.x - 5 + eyeOff, p.y - 6, 4, 0, Math.PI * 2);
    ctx.arc(p.x + 5 + eyeOff, p.y - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(p.x - 5 + eyeOff + p.facing * 1.5, p.y - 6, 2, 0, Math.PI * 2);
    ctx.arc(p.x + 5 + eyeOff + p.facing * 1.5, p.y - 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Jetpack visual
    if (p.hasJetpack) {
      ctx.fillStyle = JETPACK_COLOR;
      ctx.fillRect(p.x - p.w / 2 - 6, p.y - 5, 6, 14);
      ctx.fillRect(p.x + p.w / 2, p.y - 5, 6, 14);
    }

    // Spring shoes visual
    if (p.springShoes) {
      ctx.fillStyle = '#a78bfa';
      ctx.fillRect(p.x - 10, p.y + p.h / 2 - 2, 20, 4);
    }

    // Ammo indicator
    ctx.fillStyle = SHOOT_COLOR;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('●'.repeat(p.ammo), p.x, p.y - p.h / 2 - 8);

    ctx.restore();

    // Particles (screen space after restore for those above camera)
    ctx.save();
    ctx.translate(0, -camera);
    for (const pt of particles) {
      ctx.globalAlpha = pt.life / 50;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // HUD overlays
    if (p.hasJetpack) {
      ctx.fillStyle = JETPACK_COLOR;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('🚀 JETPACK ' + Math.ceil(p.jetpackTimer / 60 * 10) / 10 + 's', 10, 30);
    }
    if (p.springShoes) {
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('👟 SPRING ' + Math.ceil(p.springShoesTimer / 60 * 10) / 10 + 's', 10, p.hasJetpack ? 50 : 30);
    }

    // Best score
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BEST: ' + bestScore, W - 10, 20);

    if (state === 'over') {
      drawOverlay('GAME OVER', 'Score: ' + score + ' — Tap to retry', '#ef4444');
    }
  }

  function drawOverlay(title, sub, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 30);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText(sub, W / 2, H / 2 + 20);
    if (state === 'over') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px monospace';
      ctx.fillText('Best: ' + bestScore, W / 2, H / 2 + 50);
    }
  }

  // --- Loop ---
  function loop() {
    resize();
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // --- Cleanup ---
  window.addEventListener('beforeunload', () => {
    if (animFrame) cancelAnimationFrame(animFrame);
  });

  // --- Keyboard shoot ---
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && state === 'playing') shoot();
  });

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
