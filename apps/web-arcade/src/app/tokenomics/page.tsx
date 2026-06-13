import type { Metadata } from "next";
import { TokenomicsClient } from "./client";

export const metadata: Metadata = {
  title: "Tokenomics | Fuzzynuts.xyz",
  description:
    "FuzzyNuts token distribution, wallet verification, and on-chain transparency. View supply, prize pools, and community allocations.",
  openGraph: {
    title: "Tokenomics | Fuzzynuts.xyz",
    description: "FuzzyNuts token distribution, wallet verification, and on-chain transparency.",
    url: "https://fuzzynuts.xyz/tokenomics",
    siteName: "Fuzzynuts.xyz",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TokenomicsPage() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <TokenomicsClient />
    </main>
  );
}
