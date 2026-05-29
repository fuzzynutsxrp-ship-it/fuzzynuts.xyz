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
    label: "AMM Liquidity Pool",
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
    href: "/games/fuzzynuts-world/",
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
    description:
      "Survive endless waves of enemies with auto-attack combat. Upgrade weapons, unlock abilities, and see how long you last.",
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
    description:
      "3D mini-golf with physics-based putting. Navigate tricky courses and aim for hole-in-one on every shot.",
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
    description:
      "High-speed racing through forest tracks. Collect acorns for boost, dodge obstacles, and race to the finish!",
    href: "/games/nut-racer/",
    icon: "/icons/icon-racer-pop.webp",
    image: "🏎️",
    color: "#f97316",
    tags: ["Racing", "Speed", "3 Laps"],
  },
  {
    id: "top-secret",
    title: "Top Secret",
    type: "??? Classified",
    description:
      "🔒 A brand-new game is being built behind closed doors. Stay tuned — details dropping soon.",
    href: "/games/top-secret/",
    icon: "/icons/icon-top-secret-pop.webp",
    image: "🕵️",
    color: "#8B5CF6",
    tags: ["Coming Soon", "🔒 Classified"],
  },
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
