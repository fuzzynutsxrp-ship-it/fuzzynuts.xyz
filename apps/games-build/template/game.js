/**
 * ═══════════════════════════════════════════════════════════════
 *  Game Template — Fuzzynuts Arcade
 *
 *  Copy this folder and rename to create a new game.
 *  Update: index.html (title, slug, icon), game.js (logic), game.css (styles)
 * ═══════════════════════════════════════════════════════════════
 */
(() => {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────────
  const GAME_SLUG = 'game-slug';
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const FPS = 60;

  // ─── State ─────────────────────────────────────────────────────
  let canvas, ctx;
  let score = 0;
  let lives = 3;
  let isPlaying = false;
  let animFrame;
  let gameStartTime;

  // ─── DOM refs ──────────────────────────────────────────────────
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over');
  const hud = document.getElementById('hud');
  const scoreValue = document.getElementById('score-value');
  const livesValue = document.getElementById('lives-value');
  const finalScore = document.getElementById('final-score');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // ─── Init ──────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();

    // Event listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    window.addEventListener('resize', resizeCanvas);

    // Touch controls
    setupTouchControls();

    console.log('[Game] Initialized');
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Scale canvas to fit container
    const scale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
  }

  // ─── Game lifecycle ────────────────────────────────────────────
  function startGame() {
    score = 0;
    lives = 3;
    isPlaying = true;
    gameStartTime = Date.now();

    // Update UI
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    hud.style.display = '';
    updateHUD();

    // Start game loop
    gameLoop();
  }

  function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animFrame);

    // Calculate duration
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);

    // Show game over screen
    finalScore.textContent = score;
    gameOverScreen.style.display = '';

    // Submit score
    FuzzyScoreSubmit(GAME_SLUG, score, duration);
  }

  function updateHUD() {
    scoreValue.textContent = score;
    livesValue.textContent = lives;
  }

  // ─── Game loop ─────────────────────────────────────────────────
  function gameLoop() {
    if (!isPlaying) return;

    update();
    render();

    animFrame = requestAnimationFrame(gameLoop);
  }

  function update() {
    // TODO: Update game state
    // - Move entities
    // - Check collisions
    // - Update score
  }

  function render() {
    // Clear canvas
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // TODO: Render game elements
    // - Draw background
    // - Draw entities
    // - Draw UI
  }

  // ─── Input ─────────────────────────────────────────────────────
  function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      // TODO: Handle touch movement
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      // TODO: Handle touch end
    }, { passive: false });
  }

  // ─── Keyboard ──────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (!isPlaying) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
        // TODO: Move left
        break;
      case 'ArrowRight':
      case 'd':
        // TODO: Move right
        break;
      case 'ArrowUp':
      case 'w':
        // TODO: Move up
        break;
      case 'ArrowDown':
      case 's':
        // TODO: Move down
        break;
      case ' ':
        // TODO: Action
        e.preventDefault();
        break;
    }
  });

  // ─── Bootstrap ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
