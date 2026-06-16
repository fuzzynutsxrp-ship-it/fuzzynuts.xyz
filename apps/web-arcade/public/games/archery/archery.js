(function() {
  'use strict';

  const BG = '#0a0614';
  const BULLSEYE = '#10b981';
  const INNER = '#fbbf24';
  const MIDDLE = '#ef4444';
  const OUTER = '#6b7280';
  const RING_COLORS = [BULLSEYE, INNER, MIDDLE, OUTER, '#3b3b4f'];
  const RING_SCORES = [10, 8, 6, 4, 2];
  const ARROWS_PER_ROUND = 10;
  const DISTANCES = [
    { label: '20m', scale: 1.0 },
    { label: '40m', scale: 0.7 },
    { label: '60m', scale: 0.5 },
    { label: '80m', scale: 0.38 }
  ];

  let canvas, ctx, W, H;
  let state = 'idle'; // idle, aiming, flying, stuck, roundover, gameover
  let score = 0, totalScore = 0, arrowsLeft = ARROWS_PER_ROUND, round = 0;
  let bestScore = parseInt((function(){try{return localStorage.getItem('archery_best')}catch(e){return null}})()) || 0;
  let startTime = 0;
  let mouse = { x: 0, y: 0 };
  let aimStart = 0, power = 0;
  let wind = { x: 0, y: 0 };
  let arrow = null;
  let stuckArrows = [];
  let distance = DISTANCES[0];
  let targetX, targetY, targetRadius;
  let animFrame;

  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'game-canvas'; document.body.appendChild(canvas); }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    startGame();
  }

  function resize() {
    const r = canvas.parentElement || document.body;
    W = canvas.width = r.clientWidth || 800;
    H = canvas.height = r.clientHeight || 600;
    targetX = W / 2;
    targetY = H * 0.35;
    targetRadius = Math.min(W, H) * 0.18 * distance.scale;
  }

  function startGame() {
    score = 0; totalScore = 0; round = 0; arrowsLeft = ARROWS_PER_ROUND;
    startTime = Date.now();
    stuckArrows = [];
    state = 'idle';
    window.__gameScore = 0;
    nextRound();
  }

  function nextRound() {
    round++;
    arrowsLeft = ARROWS_PER_ROUND;
    distance = DISTANCES[Math.min(round - 1, DISTANCES.length - 1)];
    targetRadius = Math.min(W, H) * 0.18 * distance.scale;
    stuckArrows = [];
    state = 'idle';
    generateWind();
  }

  function generateWind() {
    const strength = Math.random() * 3 + 0.5;
    const angle = Math.random() * Math.PI * 2;
    wind = { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
  }

  function onDown(e) {
    if (state !== 'idle') return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    state = 'aiming'; aimStart = Date.now(); power = 0;
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
  }

  function onUp(e) {
    if (state !== 'aiming') return;
    shoot();
  }

  function onTouchStart(e) { e.preventDefault(); const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); mouse.x = t.clientX - rect.left; mouse.y = t.clientY - rect.top; if (state === 'idle') { state = 'aiming'; aimStart = Date.now(); power = 0; } }
  function onTouchMove(e) { e.preventDefault(); const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); mouse.x = t.clientX - rect.left; mouse.y = t.clientY - rect.top; }
  function onTouchEnd(e) { e.preventDefault(); if (state === 'aiming') shoot(); }

  function shoot() {
    const maxPower = 25;
    const holdTime = Math.min((Date.now() - aimStart) / 1500, 1);
    power = holdTime * maxPower;
    const dx = mouse.x - (W / 2);
    const dy = mouse.y - (H * 0.85);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    arrow = {
      x: W / 2, y: H * 0.85,
      vx: (dx / dist) * power + wind.x * 0.5,
      vy: (dy / dist) * power + wind.y * 0.5,
      angle: Math.atan2(dy, dx),
      trail: []
    };
    state = 'flying';
  }

  function updateArrow() {
    if (!arrow) return;
    arrow.trail.push({ x: arrow.x, y: arrow.y });
    if (arrow.trail.length > 20) arrow.trail.shift();
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;
    arrow.vy += 0.08; // gravity
    arrow.vx += wind.x * 0.01;
    arrow.angle = Math.atan2(arrow.vy, arrow.vx);

    const dx = arrow.x - targetX, dy = arrow.y - targetY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < targetRadius + 5) {
      const ringWidth = targetRadius / 5;
      let ring = Math.floor(d / ringWidth);
      ring = Math.min(ring, 4);
      const pts = RING_SCORES[ring];
      score += pts;
      totalScore += pts;
      window.__gameScore = totalScore;
      updateHUD();
      stuckArrows.push({ x: arrow.x, y: arrow.y, angle: arrow.angle, ring: ring });
      arrowsLeft--;
      arrow = null;
      state = 'idle';
      if (arrowsLeft <= 0) {
        if (round >= 4) { endGame(); } else { state = 'roundover'; setTimeout(nextRound, 1500); }
      } else {
        generateWind();
      }
    }
    if (arrow && (arrow.x < -50 || arrow.x > W + 50 || arrow.y < -50 || arrow.y > H + 50)) {
      arrowsLeft--;
      arrow = null;
      state = 'idle';
      if (arrowsLeft <= 0) {
        if (round >= 4) { endGame(); } else { state = 'roundover'; setTimeout(nextRound, 1500); }
      } else {
        generateWind();
      }
    }
  }

  function updateHUD() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = 'Score: ' + totalScore;
  }

  function endGame() {
    state = 'gameover';
    if (totalScore > bestScore) { bestScore = totalScore; try { localStorage.setItem('archery_best', bestScore) } catch(e) {}; }
    window.__gameScore = totalScore;
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (typeof FuzzyScoreSubmit === 'function') FuzzyScoreSubmit('archery', totalScore, duration);
    if (typeof window.__onGameOver === 'function') window.__onGameOver(totalScore);
  }

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    drawTarget();
    drawStuckArrows();
    drawArrow();
    drawCrosshair();
    drawPowerMeter();
    drawWindIndicator();
    drawHUD();
    drawOverlays();
  }

  function drawTarget() {
    for (let i = RING_COLORS.length - 1; i >= 0; i--) {
      const r = targetRadius * ((i + 1) / RING_COLORS.length);
      // For concentric rings, we need to draw each ring as a filled circle but only the ring portion
      // Actually let's draw from outside in
    }
    // Draw concentric rings from outside in
    const rings = RING_COLORS.length;
    for (let i = rings - 1; i >= 0; i--) {
      ctx.beginPath();
      ctx.arc(targetX, targetY, targetRadius * ((i + 1) / rings), 0, Math.PI * 2);
      ctx.fillStyle = RING_COLORS[i];
      ctx.fill();
    }
    // Border
    ctx.beginPath();
    ctx.arc(targetX, targetY, targetRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Distance label
    ctx.fillStyle = '#ffffff88';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(distance.label, targetX, targetY + targetRadius + 20);
  }

  function drawStuckArrows() {
    stuckArrows.forEach(a => {
      drawArrowShape(a.x, a.y, a.angle, 20, '#ccc');
    });
  }

  function drawArrow() {
    if (!arrow) return;
    // Trail
    if (arrow.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(arrow.trail[0].x, arrow.trail[0].y);
      for (let i = 1; i < arrow.trail.length; i++) ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
      ctx.strokeStyle = '#ffffff33';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    drawArrowShape(arrow.x, arrow.y, arrow.angle, 30, '#fff');
  }

  function drawArrowShape(x, y, angle, len, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(0, -3);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // Fletching
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(-len + 6, -5);
    ctx.lineTo(-len + 6, 5);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.restore();
  }

  function drawCrosshair() {
    if (state !== 'idle' && state !== 'aiming') return;
    const cx = mouse.x, cy = mouse.y;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 8, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 20, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 20); ctx.stroke();
    // Dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawPowerMeter() {
    if (state !== 'aiming') return;
    const holdTime = Math.min((Date.now() - aimStart) / 1500, 1);
    const pw = holdTime;
    const barW = 20, barH = 150;
    const bx = W - 50, by = H / 2 - barH / 2;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(bx, by, barW, barH);
    // Fill from bottom
    const fillH = barH * pw;
    const grad = ctx.createLinearGradient(bx, by + barH, bx, by + barH - fillH);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(1, '#ef4444');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by + barH - fillH, barW, fillH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PWR', bx + barW / 2, by + barH + 16);
  }

  function drawWindIndicator() {
    const cx = 60, cy = 50;
    const scale = 15;
    ctx.fillStyle = '#ffffff22';
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
    // Wind arrow
    const wx = wind.x * scale, wy = wind.y * scale;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + wx, cy + wy);
    ctx.stroke();
    // Arrowhead
    const angle = Math.atan2(wy, wx);
    ctx.beginPath();
    ctx.moveTo(cx + wx, cy + wy);
    ctx.lineTo(cx + wx - 8 * Math.cos(angle - 0.4), cy + wy - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(cx + wx - 8 * Math.cos(angle + 0.4), cy + wy - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WIND', cx, cy + 44);
  }

  function drawHUD() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + totalScore, 15, H - 20);
    ctx.textAlign = 'right';
    ctx.fillText('Arrows: ' + arrowsLeft, W - 15, H - 20);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff88';
    ctx.font = '14px monospace';
    ctx.fillText('Round ' + round + '/4', W / 2, H - 20);
    ctx.fillStyle = '#10b981';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Best: ' + bestScore, W - 15, H - 42);
  }

  function drawOverlays() {
    if (state === 'roundover') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Round ' + round + ' Complete!', W / 2, H / 2 - 20);
      ctx.fillStyle = '#fff';
      ctx.font = '20px monospace';
      ctx.fillText('Score: ' + score, W / 2, H / 2 + 20);
      score = 0;
    }
    if (state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
      ctx.fillStyle = '#fff';
      ctx.font = '28px monospace';
      ctx.fillText('Total: ' + totalScore, W / 2, H / 2 + 10);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '18px monospace';
      ctx.fillText('Best: ' + bestScore, W / 2, H / 2 + 45);
      ctx.fillStyle = '#ffffff88';
      ctx.font = '16px monospace';
      ctx.fillText('Click to play again', W / 2, H / 2 + 80);
      canvas.onclick = () => { canvas.onclick = null; startGame(); };
    }
  }

  function loop() {
    if (state === 'flying') updateArrow();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  // Expose start/stop for framework integration
  window.ArcheryGame = {
    init: init,
    destroy: function() { cancelAnimationFrame(animFrame); canvas && (canvas.onclick = null); }
  };

  // Auto-init if canvas exists or no framework detected
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
