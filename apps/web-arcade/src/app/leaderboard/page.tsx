import type { Metadata } from "next";
import { LeaderboardClient } from "./client";

export const metadata: Metadata = {
  title: "Global Leaderboard | Fuzzynuts",
  description:
    "See who tops the charts across all Fuzzynuts games. Unified rankings for Google and XRPL players. Play free, climb the ranks, win prizes.",
  openGraph: {
    title: "Global Leaderboard | Fuzzynuts",
    description: "Unified rankings for Google and XRPL players. Play free, climb the ranks.",
    url: "https://www.fuzzynuts.xyz/leaderboard",
    siteName: "Fuzzynuts",
    type: "website",
  },
  alternates: {
    canonical: "/leaderboard/",
  },
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
