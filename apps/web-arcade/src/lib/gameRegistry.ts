/* ═══════════════════════════════════════════════════════════════
   FUZZYNUTS ARCADE — Centralized Game Registry

   Single source of truth for all game metadata.
   * Used by: GameModal, GamesShowcase, and other components.

   To add a new game:
   1. Add an entry here
   2. Deploy game files to public/games/{slug}/
   3. Add icon to public/icons/icon-{slug}-pop.webp
   4. Register slug in server SCORE_CAPS (scores.ts)
   5. Register slug in fuzzy-score.js SCORE_CAPS
   ═══════════════════════════════════════════════════════════════ */

export interface GameMetadata {
  /** URL slug (e.g., "mario", "fuzzy-survivors") */
  slug: string;
  /** Display title */
  title: string;
  /** Genre badge text */
  genre: string;
  /** Theme color (hex) — used for accents, badges, gradients */
  color: string;
  /** Short description (2-3 sentences) */
  description: string;
  /** Max allowed score (anti-cheat ceiling) */
  scoreCap: number;
  /** Minimum play duration in seconds before a score is valid */
  minPlayTime: number;
  /** Control scheme hints shown in sidebar */
  controls: string[];
  /** Path to game icon (relative to public/) */
  iconPath: string;
  /** Path to game iframe (relative to public/) */
  iframePath: string;
  /** iframe sandbox permissions */
  sandbox: string;
  /** Whether leaderboard scoring is enabled */
  leaderboardEnabled: boolean;
  /** Whether in-game achievements exist (Fuzzynuts World only for now) */
  achievementsEnabled: boolean;
  /** Game status */
  status: "live" | "coming-soon" | "maintenance";
  /** Score type — how scores accumulate */
  scoreType: "high-score" | "cumulative";
  /** Contextual tips shown during the loading screen */
  loadingTips: string[];
  /** Touch control hint for mobile devices (empty string for keyboard-only games) */
  touchHint: string;
  /** Whether the game needs cross-origin isolation (SharedArrayBuffer / WASM threads) */
  crossOriginIsolated?: boolean;
}

const DEFAULT_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-forms";

export const GAME_LIST: GameMetadata[] = [
  {
    slug: "mario",
    title: "Super Fuzzynuts",
    genre: "Platformer",
    color: "#ef4444",
    description:
      "Classic side-scrolling action with all 32 original levels, a random map generator, and full level editor. Run, jump, and stomp your way to glory.",
    scoreCap: 9_999_990,
    minPlayTime: 15,
    controls: ["Arrow keys / WASD to move", "Shift or Ctrl to sprint", "P to pause"],
    iconPath: "/icons/icon-super-pop.webp",
    iframePath: "/games/mario/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Pro tip: Hold Shift to sprint past enemies!",
      "Try the random map generator for endless levels",
      "Press P or right-click to pause",
      "Collect coins to earn extra lives",
    ],
    touchHint: "",
  },
  {
    slug: "fuzzy-survivors",
    title: "Fuzzy Survivors",
    genre: "Horde Survival",
    color: "#a855f7",
    description:
      "Survive endless waves of forest creatures with auto-attack combat. Upgrade your weapons, collect power-ups, and see how long you last.",
    scoreCap: 5_000_000,
    minPlayTime: 15,
    controls: ["WASD or Arrow keys to move", "Auto-attack (no click needed)", "1-4 to select upgrades"],
    iconPath: "/icons/icon-survivors-pop.webp",
    iframePath: "/games/fuzzy-survivors/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Move with WASD or Arrow Keys — dodge incoming waves",
      "Survive as long as possible for the highest score",
      "Collect XP orbs to upgrade your abilities",
      "Auto-attack fires automatically — focus on positioning!",
    ],
    touchHint: "Swipe or use virtual joystick to move",
  },
  {
    slug: "minigolf",
    title: "Fuzzy Putt",
    genre: "Mini Golf",
    color: "#22d3ee",
    description:
      "3D mini-golf with physics-based putting. Navigate tricky courses, nail trick shots, and aim for the elusive hole-in-one on every green.",
    scoreCap: 100_000,
    minPlayTime: 15,
    controls: ["Mouse click + drag to aim", "Release to putt", "Scroll to zoom"],
    iconPath: "/icons/icon-putt-pop.webp",
    iframePath: "/games/minigolf/",
    sandbox: DEFAULT_SANDBOX + " allow-cross-origin-isolated",
    crossOriginIsolated: true,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Click and drag to aim — release to putt",
      "Watch the power meter — don't overhit!",
      "Use bank shots off walls for tricky holes",
      "Par is your goal — can you beat it?",
    ],
    touchHint: "Drag and release to putt — watch the power meter!",
  },
  {
    slug: "nut-racer",
    title: "Nut Racer",
    genre: "Racing",
    color: "#f97316",
    description:
      "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish line in record time!",
    scoreCap: 2_000_000,
    minPlayTime: 15,
    controls: ["Arrow keys to steer", "Space to boost", "R to restart"],
    iconPath: "/icons/icon-racer-pop.webp",
    iframePath: "/games/nut-racer/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Hold ↑ or W to accelerate through the track",
      "Use ← → or A/D to steer around obstacles",
      "Collect acorns for boost — use Space to activate",
      "Finish the race as fast as possible for top score",
    ],
    touchHint: "Swipe left/right to steer, tap to accelerate",
  },
  {
    slug: "fuzzynuts-world",
    title: "Fuzzynuts World",
    genre: "MMORPG",
    color: "#4ade80",
    description:
      "Explore a massive open world, complete quests, defeat minibosses, craft items, and earn $NUT through achievements. A persistent browser MMORPG.",
    scoreCap: 10_000_000,
    minPlayTime: 15,
    controls: ["Click to move / attack", "I for inventory", "M for map", "P for profile"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/fuzzynuts-world/",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
    leaderboardEnabled: true,
    achievementsEnabled: true,
    status: "live",
    scoreType: "cumulative",
    loadingTips: [
      "Click to move and attack — explore the world!",
      "Talk to NPCs to discover quests and lore",
      "Defeat monsters and minibosses to earn XP",
      "Open inventory with I, map with M, profile with P",
      "Craft items and trade with other players",
    ],
    touchHint: "Virtual joystick: drag to move, tap to interact",
  },
  {
    slug: "rsc",
    title: "RuneScape Classic",
    genre: "MMORPG",
    color: "#22c55e",
    description:
      "The original RuneScape — playable in your browser via Open-RSC. Explore, quest, skill, and PK in the classic 2001 world. No downloads needed.",
    scoreCap: 99_000_000,
    minPlayTime: 15,
    controls: ["Click to move / attack", "F1-F5 for menus", "Right-click for options"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/rsc/",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-pointer-lock",
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Click anywhere to move your character",
      "Right-click NPCs and objects for interaction options",
      "Train skills to level up and unlock new content",
      "Beware of PKers in the Wilderness!",
    ],
    touchHint: "Tap to move and interact — classic point-and-click controls",
  },
  {
    slug: "dragon-hoard",
    title: "Dragon's Hoard",
    genre: "Arcade",
    color: "#f97316",
    description:
      "Collect treasure while dodging dragon fire! A fast-paced arcade game with combo scoring and increasing difficulty.",
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: ["Arrow keys / WASD to move", "Touch to move on mobile"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/dragon-hoard/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Collect coins, gems, and treasure chests for points",
      "Dodge fireballs — they get faster over time!",
      "Build combos by collecting items quickly",
      "Collect 10 items in a row for maximum multiplier!",
    ],
    touchHint: "Tap and drag to move your thief",
  },
  {
    slug: "cosmic-blaster",
    title: "Cosmic Blaster",
    genre: "Arcade",
    color: "#06b6d4",
    description:
      "Blast through asteroids and enemy ships in this fast-paced space shooter! Dodge, shoot, and survive as long as you can.",
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: ["Arrow keys / WASD to move", "Space to shoot", "Touch to move and auto-fire"],
    iconPath: "/icons/icon-cosmic-blaster-pop.webp",
    iframePath: "/games/cosmic-blaster/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: [
      "Dodge asteroids and enemy ships",
      "Collect power-ups for triple-shot and extra lives",
      "Survive waves of increasing difficulty",
      "Chain kills for bonus points!",
    ],
    touchHint: "Tap and drag to move — ship auto-fires while touching",
  },
  {
    slug: "snake",
    title: "Snake",
    genre: "Classic Arcade",
    color: "#10b981",
    description: "Classic snake game with power-ups. Grow your snake by eating food, avoid walls and yourself!",
    scoreCap: 50000,
    minPlayTime: 15,
    controls: ["Arrow keys / WASD to move", "Touch: swipe to change direction"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/snake/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Eat food to grow longer", "Don't crash into walls or yourself!", "Power-ups appear periodically", "Speed increases as you grow"],
    touchHint: "Swipe to change direction",
  },
  {
    slug: "breakout",
    title: "Breakout",
    genre: "Classic Arcade",
    color: "#f59e0b",
    description: "Smash through bricks with bouncing balls! Classic breakout action with power-ups and increasing difficulty.",
    scoreCap: 100000,
    minPlayTime: 15,
    controls: ["Arrow keys / mouse to move paddle", "Touch: drag to move paddle"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/breakout/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Move paddle to keep ball in play", "Catch power-ups for bonuses", "Clear all bricks to advance!", "Ball speeds up each level"],
    touchHint: "Drag to move the paddle",
  },
  {
    slug: "pong",
    title: "Pong",
    genre: "Classic Arcade",
    color: "#22d3ee",
    description: "The original arcade classic! Play against an AI opponent. First to 11 wins.",
    scoreCap: 11,
    minPlayTime: 15,
    controls: ["Arrow keys / W/S to move paddle", "Touch: drag to move paddle"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/pong/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["First to 11 wins", "Ball speeds up each rally", "Angle returns with paddle edge", "AI adapts — switch strategies!"],
    touchHint: "Drag to move your paddle",
  },
  {
    slug: "tetris",
    title: "Tetris",
    genre: "Classic Arcade",
    color: "#7c3aed",
    description: "Stack falling blocks and clear lines! The timeless puzzle game with increasing speed.",
    scoreCap: 999999,
    minPlayTime: 15,
    controls: ["Arrow keys to move/rotate", "Space for hard drop", "Touch: swipe to move, tap to rotate"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/tetris/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Clear lines by filling complete rows", "Tetrises (4 lines) earn bonus points", "Speed increases every 10 lines", "Use hard drop for instant placement"],
    touchHint: "Swipe to move, tap to rotate, swipe down for hard drop",
  },
  {
    slug: "asteroids",
    title: "Asteroids",
    genre: "Classic Arcade",
    color: "#ef4444",
    description: "Navigate through an asteroid field! Shoot rocks, dodge debris, and survive waves of increasing danger.",
    scoreCap: 500000,
    minPlayTime: 15,
    controls: ["Arrow keys to rotate/thrust", "Space to shoot", "Touch: joystick + fire button"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/asteroids/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Thrust with Up, rotate with Left/Right", "Large asteroids split into smaller ones", "Small asteroids = more points", "Hyperspace jump with Shift — risky!"],
    touchHint: "Left side: joystick to steer. Right side: tap to fire",
  },
  {
    slug: "flappy",
    title: "Flappy Nut",
    genre: "Endless Runner",
    color: "#fbbf24",
    description: "Flap through pipes and see how far you can go! Tap to flap, dodge the obstacles.",
    scoreCap: 999,
    minPlayTime: 15,
    controls: ["Space or click to flap", "Touch: tap anywhere to flap"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/flappy/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Flap through pipes and see how far you can go! Tap to flap, dodge the obstacles."],
    touchHint: "Tap anywhere to flap",
  },
  {
    slug: "subway-runner",
    title: "Subway Runner",
    genre: "Endless Runner",
    color: "#06b6d4",
    description: "Sprint through the subway! Dodge trains, jump barriers, collect coins.",
    scoreCap: 50000,
    minPlayTime: 15,
    controls: ["Arrow keys to move/jump", "Touch: swipe to move"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/subway-runner/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Sprint through the subway! Dodge trains, jump barriers, collect coins."],
    touchHint: "Swipe left/right to switch lanes, up to jump, down to slide",
  },
  {
    slug: "jetpack",
    title: "Jetpack Joyride",
    genre: "Endless Runner",
    color: "#f97316",
    description: "Blast through the lab with your jetpack! Fly, dodge lasers, collect coins.",
    scoreCap: 100000,
    minPlayTime: 15,
    controls: ["Space or click to fly", "Touch: hold to fly, release to fall"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/jetpack/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Blast through the lab with your jetpack! Fly, dodge lasers, collect coins."],
    touchHint: "Hold to fly up, release to fall",
  },
  {
    slug: "ski-free",
    title: "Ski Free",
    genre: "Endless Runner",
    color: "#22d3ee",
    description: "Race down the mountain! Dodge trees, rocks, and the yeti.",
    scoreCap: 99999,
    minPlayTime: 15,
    controls: ["Arrow keys to steer", "Touch: swipe to steer"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/ski-free/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Race down the mountain! Dodge trees, rocks, and the yeti."],
    touchHint: "Swipe left/right to steer, down to brake",
  },
  {
    slug: "doodle-jump",
    title: "Doodle Jump",
    genre: "Endless Runner",
    color: "#10b981",
    description: "Jump higher and higher! Bounce off platforms, collect power-ups.",
    scoreCap: 500000,
    minPlayTime: 15,
    controls: ["Arrow keys to move", "Touch: tap left/right to move"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/doodle-jump/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Jump higher and higher! Bounce off platforms, collect power-ups."],
    touchHint: "Tap left or right side to move",
  },
  {
    slug: "2048",
    title: "2048",
    genre: "Puzzle",
    color: "#d4a843",
    description: "Slide tiles and combine numbers to reach 2048!",
    scoreCap: 999999,
    minPlayTime: 15,
    controls: ["Arrow keys to slide tiles", "Touch: swipe to slide"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/2048/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Slide tiles and combine numbers to reach 2048!"],
    touchHint: "Swipe to slide tiles",
  },
  {
    slug: "memory",
    title: "Memory Match",
    genre: "Puzzle",
    color: "#a855f7",
    description: "Match pairs of cards! Test your memory.",
    scoreCap: 10000,
    minPlayTime: 15,
    controls: ["Click cards to flip", "Touch: tap to flip"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/memory/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Match pairs of cards! Test your memory."],
    touchHint: "Tap cards to flip them",
  },
  {
    slug: "minesweeper",
    title: "Minesweeper",
    genre: "Puzzle",
    color: "#ef4444",
    description: "Clear the minefield! Flag mines and reveal safe cells.",
    scoreCap: 99999,
    minPlayTime: 15,
    controls: ["Click to reveal", "Right-click to flag"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/minesweeper/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Clear the minefield! Flag mines and reveal safe cells."],
    touchHint: "Tap to reveal, long-press to flag",
  },
  {
    slug: "sudoku",
    title: "Sudoku",
    genre: "Puzzle",
    color: "#06b6d4",
    description: "Fill the 9x9 grid! Each row, column, and box needs 1-9.",
    scoreCap: 99999,
    minPlayTime: 15,
    controls: ["Click cell, then number", "Touch: tap cell, tap number"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/sudoku/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Fill the 9x9 grid! Each row, column, and box needs 1-9."],
    touchHint: "Tap cell then tap a number",
  },
  {
    slug: "wordle",
    title: "Wordle",
    genre: "Puzzle",
    color: "#10b981",
    description: "Guess the 5-letter word in 6 tries!",
    scoreCap: 1000,
    minPlayTime: 15,
    controls: ["Type letters, Enter to submit", "Touch: on-screen keyboard"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/wordle/",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
    loadingTips: ["Guess the 5-letter word in 6 tries!"],
    touchHint: "Use the on-screen keyboard",
  },
  { slug: "tank-battle", title: "Tank Battle", genre: "Action", color: "#22c55e", description: "Command your tank in top-down combat!", scoreCap: 500000, minPlayTime: 15, controls: ["WASD to move", "Space to shoot"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/tank-battle/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Command your tank in top-down combat!"], touchHint: "Left: joystick. Right: tap to fire" },
  { slug: "helicopter", title: "Helicopter", genre: "Action", color: "#f97316", description: "Fly through a side-scrolling cave!", scoreCap: 99999, minPlayTime: 15, controls: ["Space/click to fly", "Release to fall"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/helicopter/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Fly through a side-scrolling cave!"], touchHint: "Hold to fly, release to fall" },
  { slug: "fruit-ninja", title: "Fruit Ninja", genre: "Action", color: "#ef4444", description: "Slice flying fruit with your blade!", scoreCap: 999999, minPlayTime: 15, controls: ["Mouse/touch to slice"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/fruit-ninja/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Slice flying fruit with your blade!"], touchHint: "Swipe to slice fruit" },
  { slug: "tower-defense", title: "Tower Defense", genre: "Action", color: "#7c3aed", description: "Build towers to defend your base!", scoreCap: 999999, minPlayTime: 15, controls: ["Click to place towers"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/tower-defense/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Build towers to defend your base!"], touchHint: "Tap to place and upgrade towers" },
  { slug: "space-invaders", title: "Space Invaders", genre: "Action", color: "#06b6d4", description: "Defend Earth from alien invaders!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to move", "Space to shoot"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/space-invaders/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Defend Earth from alien invaders!"], touchHint: "Drag to move, auto-fire" },
  { slug: "boxing", title: "Boxing", genre: "Sports", color: "#ef4444", description: "Step into the ring!", scoreCap: 99999, minPlayTime: 15, controls: ["J/K/L for punches", "Arrow keys to dodge"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/boxing/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Step into the ring!"], touchHint: "Tap punch buttons, swipe to dodge" },
  { slug: "bowling", title: "Bowling", genre: "Sports", color: "#f97316", description: "Roll strikes in 10-pin bowling!", scoreCap: 300, minPlayTime: 15, controls: ["Mouse/touch to aim and throw"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/bowling/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Roll strikes in 10-pin bowling!"], touchHint: "Drag to aim, release to throw" },
  { slug: "archery", title: "Archery", genre: "Sports", color: "#10b981", description: "Hit the bullseye!", scoreCap: 99999, minPlayTime: 15, controls: ["Mouse/touch to aim and shoot"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/archery/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Hit the bullseye!"], touchHint: "Drag to aim, release to shoot" },
  { slug: "surf-up", title: "Surf Up", genre: "Sports", color: "#06b6d4", description: "Ride the waves!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to balance", "Space for tricks"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/surf-up/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Ride the waves!"], touchHint: "Tilt to balance, tap for tricks" },
  { slug: "rally", title: "Rally", genre: "Racing", color: "#fbbf24", description: "Top-down rally racing!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to steer/accelerate", "Space for handbrake"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/rally/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Top-down rally racing!"], touchHint: "Buttons to steer and accelerate" },
  { slug: "maze-escape", title: "Maze Escape", genre: "Puzzle", color: "#a855f7", description: "Navigate procedural mazes!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to move"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/maze-escape/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Navigate procedural mazes!"], touchHint: "Swipe to move through the maze" },
  { slug: "frogger", title: "Frogger", genre: "Classic", color: "#10b981", description: "Cross the road and river!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to move"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/frogger/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Cross the road and river!"], touchHint: "Swipe to move" },
  { slug: "bomberman", title: "Bomberman", genre: "Action", color: "#f97316", description: "Place bombs, break walls, defeat enemies!", scoreCap: 99999, minPlayTime: 15, controls: ["Arrow keys to move", "Space to place bomb"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/bomberman/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Place bombs, break walls, defeat enemies!"], touchHint: "Swipe to move, tap to bomb" },
  { slug: "capture-flag", title: "Capture the Flag", genre: "Multiplayer", color: "#ef4444", description: "2-player local capture the flag!", scoreCap: 99999, minPlayTime: 15, controls: ["P1: WASD + Space", "P2: Arrows + Enter"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/capture-flag/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["2-player local capture the flag!"], touchHint: "Split screen — each half for one player" },
  { slug: "tower-stack", title: "Tower Stack", genre: "Arcade", color: "#fbbf24", description: "Stack blocks precisely!", scoreCap: 99999, minPlayTime: 15, controls: ["Space/click to drop block"], iconPath: "/icons/icon-world-pop.webp", iframePath: "/games/tower-stack/", sandbox: DEFAULT_SANDBOX, leaderboardEnabled: true, achievementsEnabled: false, status: "live", scoreType: "high-score", loadingTips: ["Stack blocks precisely!"], touchHint: "Tap to drop the block" },
];

/* ── Registry API ── */

export const gameRegistry = {
  /** Get all games */
  getAll(): GameMetadata[] {
    return GAME_LIST;
  },

  /** Get a game by slug */
  getBySlug(slug: string): GameMetadata | undefined {
    return GAME_LIST.find((g) => g.slug === slug);
  },

  /** Get only live games */
  getAllLive(): GameMetadata[] {
    return GAME_LIST.filter((g) => g.status === "live");
  },

  /** Get score cap for a game */
  getScoreCap(slug: string): number {
    return this.getBySlug(slug)?.scoreCap ?? 999_999;
  },

  /** Get all valid slugs (for generateStaticParams) */
  getAllSlugs(): string[] {
    return GAME_LIST.map((g) => g.slug);
  },
};
