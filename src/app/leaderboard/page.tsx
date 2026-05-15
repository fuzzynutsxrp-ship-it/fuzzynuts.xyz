import type { Metadata } from "next";
import { LeaderboardClient } from "./client";

/* ── SEO + OpenGraph Metadata (Server Component) ── */
export const metadata: Metadata = {
  title: "Arcade Leaderboard | Fuzzynuts.xyz",
  description:
    "See who tops the charts and earns $NUT prizes. Play Kaetram, Super Fuzzynuts, Fuzzy Survivors, Nut Golf, and Nut Racer on the XRP Ledger.",
  openGraph: {
    title: "Arcade Leaderboard | Fuzzynuts.xyz",
    description:
      "See who tops the charts and earns $NUT prizes. Play Kaetram, Super Fuzzynuts, Fuzzy Survivors, Nut Golf, and Nut Racer on the XRP Ledger.",
    url: "https://fuzzynuts.xyz/leaderboard",
    siteName: "Fuzzynuts.xyz",
    type: "website",
  },
};

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <LeaderboardClient />
    </main>
  );
}
