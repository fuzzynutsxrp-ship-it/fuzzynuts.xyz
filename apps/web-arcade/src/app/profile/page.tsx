import type { Metadata } from "next";
import { ProfileClient } from "./client";

export const metadata: Metadata = {
  title: "My Profile | Fuzzynuts.xyz",
  description:
    "View your personal arcade stats and score history. Track your best runs across all Fuzzynuts games.",
  openGraph: {
    title: "My Profile | Fuzzynuts.xyz",
    description: "View your personal arcade stats and score history across all FuzzyNuts games.",
    url: "https://fuzzynuts.xyz/profile",
    siteName: "Fuzzynuts",
    type: "website",
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
