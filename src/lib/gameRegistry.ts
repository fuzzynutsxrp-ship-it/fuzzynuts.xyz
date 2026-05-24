/* ═══════════════════════════════════════════════════════════════
   FUZZYNUTS ARCADE — Centralized Game Registry

   Single source of truth for all game metadata.
   Used by: GamePage, GameHeader, GameSidebar, ScoreSubmissionPanel,
   page.tsx (generateStaticParams, generateMetadata), GamesShowcase.

   To add a new game:
   1. Add an entry here
   2. Deploy game files to public/games/{slug}/
   3. Add icon to public/icons/icon-{slug}-pop.webp
   4. Register slug in server SCORE_CAPS (scores.ts)
   5. Register slug in fuzzy-score.js SCORE_CAPS
   ═══════════════════════════════════════════════════════════════ */

export interface GameMetadata {
  /** URL slug (e.g., "mario", "fuzzy-survivors") — CANONICAL identifier */
  slug: string;
  /** Display title */
  title: string;
  /** Genre badge text */
  genre: string;
  /** Theme color (hex) — used for accents, badges, gradients */
  color: string;
  /** Short description (2-3 sentences) */
  description: string;
  /** Emoji used as a compact visual marker (leaderboard tabs, profile rows) */
  emoji: string;
  /** UI tags shown on game cards (e.g., ["Platformer", "Classic"]) */
  tags: string[];
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
  /**
   * Display the game card as "coming soon" on the home grid.
   * Independent of `status` — a game can have a `status: "live"`
   * playable iframe page yet still be hidden behind a coming-soon
   * marketing treatment on the home tile.
   */
  comingSoon: boolean;
  /** Score type — how scores accumulate */
  scoreType: "high-score" | "cumulative";
  /** Contextual tips shown during the loading screen */
  loadingTips: string[];
  /** Touch control hint for mobile devices (empty string for keyboard-only games) */
  touchHint: string;
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
    emoji: "🍄",
    tags: ["Platformer", "Classic", "32 Levels"],
    scoreCap: 99_999,
    minPlayTime: 15,
    controls: [
      "Arrow keys / WASD to move",
      "Shift or Ctrl to sprint",
      "P to pause",
    ],
    iconPath: "/icons/icon-super-pop.webp",
    iframePath: "/games/mario/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    comingSoon: false,
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
    emoji: "⚔️",
    tags: ["Roguelite", "Survival", "Auto-combat"],
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: [
      "WASD or Arrow keys to move",
      "Auto-attack (no click needed)",
      "1-4 to select upgrades",
    ],
    iconPath: "/icons/icon-survivors-pop.webp",
    iframePath: "/games/fuzzy-survivors/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    comingSoon: false,
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
    emoji: "⛳",
    tags: ["3D", "Physics", "Casual"],
    scoreCap: 10_500,
    minPlayTime: 15,
    controls: [
      "Mouse click + drag to aim",
      "Release to putt",
      "Scroll to zoom",
    ],
    iconPath: "/icons/icon-putt-pop.webp",
    iframePath: "/games/minigolf/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    comingSoon: false,
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
    emoji: "🏎️",
    tags: ["Racing", "Speed", "3 Laps"],
    scoreCap: 99_999,
    minPlayTime: 15,
    controls: [
      "Arrow keys / WASD to steer + accelerate",
      "Touch arrows on mobile",
    ],
    iconPath: "/icons/icon-racer-pop.webp",
    iframePath: "/games/nut-racer/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    // Engine ported from Jake Gordon's pseudo-3D Outrun-style racer.
    // 3-lap race, score = floor(40000 / totalRaceTime). FuzzyScoreSubmit
    // is wired at finishRace() in nut-racer.js; restartRace() resets
    // per-race state without a page reload.
    //   Upstream repo:    https://github.com/jakesgordon/javascript-racer
    //   Tutorial:         https://codeincomplete.com/posts/javascript-racer/
    status: "live",
    comingSoon: false,
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
    slug: "top-secret",
    title: "Top Secret",
    genre: "??? Classified",
    color: "#8B5CF6",
    description:
      "A brand-new game is being built behind closed doors. Stay tuned — details dropping soon. Only the bravest squirrels dare enter.",
    emoji: "🕵️",
    tags: ["Coming Soon", "🔒 Classified"],
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: ["Controls classified"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/top-secret/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-pointer-lock",
    // Hidden from the public leaderboard tabs until launch — the iframe
    // page itself remains accessible at /games/top-secret/ for internal
    // testing. Flip back to `true` when ready to surface publicly.
    leaderboardEnabled: false,
    achievementsEnabled: false,
    status: "live",
    comingSoon: true,
    scoreType: "high-score",
    loadingTips: [
      "Classified game — discover the mechanics yourself",
      "Use mouse or touch controls to interact",
      "Complete objectives to earn points",
      "Good luck, agent 🕵️",
    ],
    touchHint: "Touch controls enabled — discover the mechanics",
  },
  {
    slug: "fuzzynuts-world",
    title: "Fuzzynuts World",
    genre: "MMORPG",
    color: "#4ade80",
    description:
      "Explore a massive open world, complete quests, defeat minibosses, craft items, and earn $NUT through achievements. A persistent browser MMORPG.",
    emoji: "🌍",
    tags: ["Multiplayer", "RPG", "Quests"],
    scoreCap: 10_000_000,
    minPlayTime: 15,
    controls: [
      "Click to move / attack",
      "I for inventory",
      "M for map",
      "P for profile",
    ],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/fuzzynuts-world/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
    leaderboardEnabled: true,
    achievementsEnabled: true,
    status: "live",
    comingSoon: false,
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
