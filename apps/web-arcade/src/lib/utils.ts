import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const XRPL_CONFIG = {
  issuer:
    process.env.NEXT_PUBLIC_NUT_ISSUER || "rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7",
  distributor:
    process.env.NEXT_PUBLIC_NUT_DISTRIBUTOR ||
    "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
  ammPool:
    process.env.NEXT_PUBLIC_NUT_AMM_POOL ||
    "r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg",
  xamanApiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY || "",
  node: process.env.NEXT_PUBLIC_XRPL_NODE || "wss://xrplcluster.com",
  currencyCode: "NUT",
  totalSupply: 321_000_000_000,
  tradingFee: 0.01,
};

export const TOKENOMICS = [
  {
    label: "Prize Pool",
    percentage: 80,
    amount: "256.8B NUT",
    color: "#FBBF24",
  },
  {
    label: "Community Nut Jar",
    percentage: 18,
    amount: "57.78B NUT",
    color: "#e8943a",
  },
  {
    label: "Squirrel's Pile (Founder)",
    percentage: 2,
    amount: "6.42B NUT",
    color: "#a855f7",
  },
];

export const GAMES = [
  {
    id: "fuzzynuts-world",
    title: "Fuzzynuts World",
    type: "MMORPG",
    description:
      "Explore a massive open world, complete quests, craft items, and compete with players worldwide. The flagship Fuzzynuts experience.",
    icon: "/icons/icon-world-pop.webp",
    image: "🌍",
    color: "#4ade80",
    tags: ["Multiplayer", "RPG", "Quests"],
  },
  {
    id: "mario",
    title: "Super Fuzzynuts",
    type: "Platformer",
    description:
      "Classic side-scrolling action with all 32 original levels, random map generator, and level editor. Jump, stomp, collect nuts!",
    icon: "/icons/icon-super-pop.webp",
    image: "🍄",
    color: "#ef4444",
    tags: ["Platformer", "Classic", "32 Levels"],
  },
  {
    id: "survivors",
    title: "Fuzzy Survivors",
    type: "Horde Survival",
    description:
      "Survive endless waves of enemies with auto-attack combat. Upgrade weapons, unlock abilities, and see how long you last.",
    icon: "/icons/icon-survivors-pop.webp",
    image: "⚔️",
    color: "#a855f7",
    tags: ["Roguelite", "Survival", "Auto-combat"],
  },
  {
    id: "minigolf",
    title: "Fuzzy Putt",
    type: "Mini Golf",
    description:
      "3D mini-golf with physics-based putting. Navigate tricky courses and aim for hole-in-one on every shot.",
    icon: "/icons/icon-putt-pop.webp",
    image: "⛳",
    color: "#22d3ee",
    tags: ["3D", "Physics", "Casual"],
  },
  {
    id: "racer",
    title: "Nut Racer",
    type: "Racing",
    description:
      "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish!",
    icon: "/icons/icon-racer-pop.webp",
    image: "🏎️",
    color: "#f97316",
    tags: ["Racing", "Speed", "3 Laps"],
  },
  {
    id: "rsc",
    title: "RuneScape Classic",
    type: "MMORPG",
    description:
      "The original RuneScape — playable in your browser via Open-RSC. Explore, quest, skill, and PK in the classic 2001 world.",
    icon: "/icons/icon-world-pop.webp",
    image: "⚔️",
    color: "#22c55e",
    tags: ["MMORPG", "Classic", "PvP"],
  },
  {
    id: "dragon-hoard",
    title: "Dragon's Hoard",
    type: "Arcade",
    description:
      "Collect treasure while dodging dragon fire! Fast-paced arcade action with combo scoring and increasing difficulty.",
    icon: "/icons/icon-world-pop.webp",
    image: "🐉",
    color: "#f97316",
    tags: ["Arcade", "Collect", "Endless"],
  },
  {
    id: "cosmic-blaster",
    title: "Cosmic Blaster",
    type: "Arcade",
    description:
      "Blast through asteroids and enemy ships in this fast-paced space shooter!",
    icon: "/icons/icon-cosmic-blaster-pop.webp",
    image: "🚀",
    color: "#06b6d4",
    tags: ["Arcade", "Shooter", "Endless"],
  },
  {
    id: "snake",
    title: "Snake",
    type: "Classic Arcade",
    description: "Classic snake with power-ups — grow, dodge, survive!",
    icon: "/icons/icon-world-pop.webp",
    image: "🐍",
    color: "#10b981",
    tags: ["Classic", "Arcade", "Endless"],
  },
  {
    id: "breakout",
    title: "Breakout",
    type: "Classic Arcade",
    description: "Smash bricks, catch power-ups, clear levels!",
    icon: "/icons/icon-world-pop.webp",
    image: "🧱",
    color: "#f59e0b",
    tags: ["Classic", "Arcade", "Power-ups"],
  },
  {
    id: "pong",
    title: "Pong",
    type: "Classic Arcade",
    description: "Classic Pong — first to 11 wins!",
    icon: "/icons/icon-world-pop.webp",
    image: "🏓",
    color: "#22d3ee",
    tags: ["Classic", "AI", "Sports"],
  },
  {
    id: "tetris",
    title: "Tetris",
    type: "Classic Arcade",
    description: "Stack blocks, clear lines, chase the high score!",
    icon: "/icons/icon-world-pop.webp",
    image: "🟦",
    color: "#7c3aed",
    tags: ["Classic", "Puzzle", "Endless"],
  },
  {
    id: "asteroids",
    title: "Asteroids",
    type: "Classic Arcade",
    description: "Shoot asteroids, dodge debris, survive!",
    icon: "/icons/icon-world-pop.webp",
    image: "☄️",
    color: "#ef4444",
    tags: ["Classic", "Shooter", "Space"],
  },
  {
    id: "flappy",
    title: "Flappy Nut",
    type: "Endless Runner",
    description: "Flap through pipes — how far can you go?",
    icon: "/icons/icon-world-pop.webp",
    image: "🐦",
    color: "#fbbf24",
    tags: ["Endless", "Casual", "One-touch"],
  },
  {
    id: "subway-runner",
    title: "Subway Runner",
    type: "Endless Runner",
    description: "Dodge trains, jump barriers, collect coins!",
    icon: "/icons/icon-world-pop.webp",
    image: "🚇",
    color: "#06b6d4",
    tags: ["Endless", "Runner", "3-lane"],
  },
  {
    id: "jetpack",
    title: "Jetpack Joyride",
    type: "Endless Runner",
    description: "Fly, dodge lasers, collect coins!",
    icon: "/icons/icon-world-pop.webp",
    image: "🚀",
    color: "#f97316",
    tags: ["Endless", "Flying", "Action"],
  },
  {
    id: "ski-free",
    title: "Ski Free",
    type: "Endless Runner",
    description: "Race downhill — dodge trees and the yeti!",
    icon: "/icons/icon-world-pop.webp",
    image: "⛷️",
    color: "#22d3ee",
    tags: ["Endless", "Skiing", "Classic"],
  },
  {
    id: "doodle-jump",
    title: "Doodle Jump",
    type: "Endless Runner",
    description: "Bounce higher — don't fall!",
    icon: "/icons/icon-world-pop.webp",
    image: "🐸",
    color: "#10b981",
    tags: ["Endless", "Platformer", "Vertical"],
  },
  {
    id: "2048",
    title: "2048",
    type: "Puzzle",
    description: "Slide tiles — reach 2048!",
    icon: "/icons/icon-world-pop.webp",
    image: "🔢",
    color: "#d4a843",
    tags: ["Puzzle", "Numbers", "Strategy"],
  },
  {
    id: "memory",
    title: "Memory Match",
    type: "Puzzle",
    description: "Match pairs — test your memory!",
    icon: "/icons/icon-world-pop.webp",
    image: "🃏",
    color: "#a855f7",
    tags: ["Puzzle", "Memory", "Casual"],
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    type: "Puzzle",
    description: "Flag mines, clear the field!",
    icon: "/icons/icon-world-pop.webp",
    image: "💣",
    color: "#ef4444",
    tags: ["Puzzle", "Logic", "Classic"],
  },
  {
    id: "sudoku",
    title: "Sudoku",
    type: "Puzzle",
    description: "Fill the grid — every row, column, box!",
    icon: "/icons/icon-world-pop.webp",
    image: "9️⃣",
    color: "#06b6d4",
    tags: ["Puzzle", "Numbers", "Logic"],
  },
  {
    id: "wordle",
    title: "Wordle",
    type: "Puzzle",
    description: "Guess the word in 6 tries!",
    icon: "/icons/icon-world-pop.webp",
    image: "📝",
    color: "#10b981",
    tags: ["Puzzle", "Words", "Daily"],
  },
  { id: "tank-battle", title: "Tank Battle", type: "Action", description: "Top-down tank combat — destroy enemy waves!", icon: "/icons/icon-world-pop.webp", image: "🪖", color: "#22c55e", tags: ["Action", "Shooter", "Top-down"] },
  { id: "helicopter", title: "Helicopter", type: "Action", description: "Fly through the cave — don't crash!", icon: "/icons/icon-world-pop.webp", image: "🚁", color: "#f97316", tags: ["Action", "Endless", "Side-scroll"] },
  { id: "fruit-ninja", title: "Fruit Ninja", type: "Action", description: "Slice fruit, dodge bombs, combo for bonus!", icon: "/icons/icon-world-pop.webp", image: "🍉", color: "#ef4444", tags: ["Action", "Slicing", "Casual"] },
  { id: "tower-defense", title: "Tower Defense", type: "Strategy", description: "Place towers, upgrade defenses, survive!", icon: "/icons/icon-world-pop.webp", image: "🏰", color: "#7c3aed", tags: ["Strategy", "Tower Defense", "Waves"] },
  { id: "space-invaders", title: "Space Invaders", type: "Classic", description: "Classic alien shooter — defend Earth!", icon: "/icons/icon-world-pop.webp", image: "👾", color: "#06b6d4", tags: ["Classic", "Shooter", "Aliens"] },
];

export const HOW_TO_STEPS = [
  {
    step: 1,
    title: "Get a Wallet",
    description:
      "Grab Xaman (formerly Xumm) or Joey — the XRPL wallets we support. Xaman works on mobile and desktop.",
    icon: "Wallet",
  },
  {
    step: 2,
    title: "Fund with XRP",
    description:
      "Buy XRP on any exchange and send it to your Xaman wallet. You need ~12 XRP minimum.",
    icon: "Coins",
  },
  {
    step: 3,
    title: "Set Trustline",
    description:
      "Tap the button below to set your NUT trustline instantly, or add manually.",
    icon: "Link",
  },
  {
    step: 4,
    title: "Get $NUT",
    description:
      "Swap XRP for NUT on the native XRPL DEX, or earn NUT by playing games in the arcade!",
    icon: "Zap",
  },
];

// DEGEN OVERHAUL — formatters extracted to @/lib/format so hot-path consumers
// (GameSidebar etc.) can avoid pulling TOKENOMICS/GAMES/HOW_TO_STEPS
// into their bundle. Re-exports kept here for backward compatibility — every
// existing `import { formatNumber } from "@/lib/utils"` keeps working.
export { formatUsd, truncateAddress, formatNumber } from "./format";
