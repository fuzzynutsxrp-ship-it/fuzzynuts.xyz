import type { Metadata } from "next";
import { PrizesClient } from "./client";

/* ── SEO + OpenGraph Metadata (Server Component) ── */
export const metadata: Metadata = {
  title: "Prizes & Payouts | Fuzzynuts.xyz",
  description:
    "Weekly $NUT prize pool split among top 3 players. Free to play, real payouts on the XRP Ledger. See prize tiers, past winners, and how it works.",
  openGraph: {
    title: "Prizes & Payouts | Fuzzynuts.xyz",
    description:
      "Weekly $NUT prize pool split among top 3 players. Free to play, real payouts on the XRP Ledger.",
    url: "https://fuzzynuts.xyz/prizes",
    siteName: "Fuzzynuts.xyz",
    type: "website",
  },
};

export default function PrizesPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <PrizesClient />
    </main>
  );
}
