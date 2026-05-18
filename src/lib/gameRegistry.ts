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
    scoreCap: 99_999,
    minPlayTime: 15,
    controls: ["Arrow keys / WASD to move", "Shift or Ctrl to sprint", "P to pause"],
    iconPath: "/icons/icon-super-pop.webp",
    iframePath: "/games/mario/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
  },
  {
    slug: "fuzzy-survivors",
    title: "Fuzzy Survivors",
    genre: "Horde Survival",
    color: "#a855f7",
    description:
      "Survive endless waves of forest creatures with auto-attack combat. Upgrade your weapons, collect power-ups, and see how long you last.",
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: ["WASD or Arrow keys to move", "Auto-attack (no click needed)", "1-4 to select upgrades"],
    iconPath: "/icons/icon-survivors-pop.webp",
    iframePath: "/games/fuzzy-survivors/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
  },
  {
    slug: "minigolf",
    title: "Fuzzy Putt",
    genre: "Mini Golf",
    color: "#22d3ee",
    description:
      "3D mini-golf with physics-based putting. Navigate tricky courses, nail trick shots, and aim for the elusive hole-in-one on every green.",
    scoreCap: 10_500,
    minPlayTime: 15,
    controls: ["Mouse click + drag to aim", "Release to putt", "Scroll to zoom"],
    iconPath: "/icons/icon-putt-pop.webp",
    iframePath: "/games/minigolf/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
  },
  {
    slug: "nut-racer",
    title: "Nut Racer",
    genre: "Racing",
    color: "#f97316",
    description:
      "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish line in record time!",
    scoreCap: 99_999,
    minPlayTime: 15,
    controls: ["Arrow keys to steer", "Space to boost", "R to restart"],
    iconPath: "/icons/icon-racer-pop.webp",
    iframePath: "/games/nut-racer/index.html",
    sandbox: DEFAULT_SANDBOX,
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
  },
  {
    slug: "top-secret",
    title: "Top Secret",
    genre: "??? Classified",
    color: "#8B5CF6",
    description:
      "A brand-new game is being built behind closed doors. Stay tuned — details dropping soon. Only the bravest squirrels dare enter.",
    scoreCap: 999_999,
    minPlayTime: 15,
    controls: ["Controls classified"],
    iconPath: "/icons/icon-world-pop.webp",
    iframePath: "/games/top-secret/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-pointer-lock",
    leaderboardEnabled: true,
    achievementsEnabled: false,
    status: "live",
    scoreType: "high-score",
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
    iframePath: "/games/fuzzynuts-world/index.html",
    sandbox: "allow-scripts allow-same-origin allow-popups allow-forms",
    leaderboardEnabled: true,
    achievementsEnabled: true,
    status: "live",
    scoreType: "cumulative",
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
