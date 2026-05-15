import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const XRPL_CONFIG = {
  issuer: process.env.NEXT_PUBLIC_NUT_ISSUER || "rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7",
  distributor: process.env.NEXT_PUBLIC_NUT_DISTRIBUTOR || "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
  ammPool: process.env.NEXT_PUBLIC_NUT_AMM_POOL || "r3UzuHQQQGZRPhxzFFGbzgJYCb76ESJxtg",
  xamanApiKey: process.env.NEXT_PUBLIC_XAMAN_API_KEY || "",
  node: process.env.NEXT_PUBLIC_XRPL_NODE || "wss://xrplcluster.com",
  currencyCode: "NUT",
  totalSupply: 321_000_000_000,
  tradingFee: 0.01,
};

export const TOKENOMICS = [
  { label: "AMM Liquidity Pool", percentage: 80, amount: "256.8B NUT", color: "#f5c442" },
  { label: "Community Nut Jar", percentage: 18, amount: "57.78B NUT", color: "#e8943a" },
  { label: "Squirrel's Pile (Founder)", percentage: 2, amount: "6.42B NUT", color: "#8B6914" },
];

export const GAMES = [
  {
    id: "kaetram",
    title: "Fuzzynuts World",
    type: "MMORPG",
    description: "Explore a massive open world, complete quests, craft items, and compete with players worldwide. The flagship Fuzzynuts experience.",
    href: "/games/kaetram/",
    icon: "/icons/icon-world-pop.webp",
    image: "🌍",
    color: "#4ade80",
    tags: ["Multiplayer", "RPG", "Quests"],
  },
  {
    id: "mario",
    title: "Super Fuzzynuts",
    type: "Platformer",
    description: "Classic side-scrolling action with all 32 original levels, random map generator, and level editor. Jump, stomp, collect nuts!",
    href: "/games/mario/",
    icon: "/icons/icon-super-pop.webp",
    image: "🍄",
    color: "#ef4444",
    tags: ["Platformer", "Classic", "32 Levels"],
  },
  {
    id: "survivors",
    title: "Fuzzy Survivors",
    type: "Horde Survival",
    description: "Survive endless waves of enemies with auto-attack combat. Upgrade weapons, unlock abilities, and see how long you last.",
    href: "/games/fuzzy-survivors/",
    icon: "/icons/icon-survivors-pop.webp",
    image: "⚔️",
    color: "#a855f7",
    tags: ["Roguelite", "Survival", "Auto-combat"],
  },
  {
    id: "minigolf",
    title: "Fuzzy Putt",
    type: "Mini Golf",
    description: "3D mini-golf with physics-based putting. Navigate tricky courses and aim for hole-in-one on every shot.",
    href: "/games/minigolf/",
    icon: "/icons/icon-putt-pop.webp",
    image: "⛳",
    color: "#22d3ee",
    tags: ["3D", "Physics", "Casual"],
  },
  {
    id: "racer",
    title: "Nut Racer",
    type: "Racing",
    description: "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish!",
    href: "#",
    icon: "/icons/icon-racer-pop.webp",
    image: "🏎️",
    color: "#f97316",
    tags: ["Racing", "Speed", "Coming Soon"],
  },
];

export const FEATURES = [
  {
    icon: "Shield",
    featIcon: "/images/features/feat-rewards.webp",
    title: "100% On-Chain Rewards",
    description: "Every $NUT prize is verified on the XRP Ledger. No off-chain IOUs, no trust required.",
  },
  {
    icon: "Gamepad2",
    featIcon: "/images/features/feat-arcade.webp",
    title: "Play-to-Earn Arcade",
    description: "5 hand-tuned games with real $NUT prizes. Compete on the weekly leaderboard for 500K NUT.",
  },
  {
    icon: "Lock",
    featIcon: "/images/features/feat-blackhole.webp",
    title: "Blackholed Issuer",
    description: "The issuer wallet is permanently disabled. Nobody can ever mint more tokens. Supply is forever fixed.",
  },
  {
    icon: "Trophy",
    featIcon: "/images/features/feat-leaderboard.webp",
    title: "Weekly Leaderboards",
    description: "Compete for top scores each week. Prizes reset every Monday. Climb the ranks, earn more NUT.",
  },
  {
    icon: "Bot",
    featIcon: "/images/features/feat-antibot.webp",
    title: "Anti-Bot Protection",
    description: "Score caps, minimum play durations, rate limits, and wallet verification keep the arcade fair.",
  },
  {
    icon: "Users",
    featIcon: "/images/features/feat-community.webp",
    title: "Community-Governed Future",
    description: "18% Community Nut Jar for airdrops, rewards, and ecosystem growth. The community decides what comes next.",
  },
];

export const HOW_TO_STEPS = [
  {
    step: 1,
    title: "Get a Wallet",
    description: "Download Xaman (formerly Xumm) from your app store. It's the most trusted XRPL wallet.",
    icon: "Wallet",
  },
  {
    step: 2,
    title: "Fund with XRP",
    description: "Buy XRP on any exchange and send it to your Xaman wallet. You need ~12 XRP minimum.",
    icon: "Coins",
  },
  {
    step: 3,
    title: "Set Trustline",
    description: "Tap the button below to set your NUT trustline instantly, or add manually.",
    icon: "Link",
  },
  {
    step: 4,
    title: "Get $NUT",
    description: "Swap XRP for NUT on the native XRPL DEX, or earn NUT by playing games in the arcade!",
    icon: "Zap",
  },
];

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
