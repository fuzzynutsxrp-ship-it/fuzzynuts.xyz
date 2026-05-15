import type { Metadata } from "next";
import { ProfileClient } from "./client";

export const metadata: Metadata = {
  title: "My Profile | Fuzzynuts.xyz",
  description:
    "View your personal arcade stats and score history. Track your best runs across all Fuzzynuts games on the XRP Ledger.",
  openGraph: {
    title: "My Profile | Fuzzynuts.xyz",
    description:
      "View your personal arcade stats and score history on the XRP Ledger.",
    url: "https://fuzzynuts.xyz/profile",
    siteName: "Fuzzynuts",
    type: "website",
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
