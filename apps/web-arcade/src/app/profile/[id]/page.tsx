import type { Metadata } from "next";
import { ProfileIdClient } from "./client";
import { isWalletAddress, isGuestId } from "@/lib/validators";

type PageParams = { id: string };

/**
 * Dynamic profile route: /profile/[id]
 *
 * Supports two ID formats:
 *   - XRPL wallet address (r...) — fetches scores from API
 *   - Guest ID (Guest-XXXX) — local-only profile with editable bio
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { id } = await params;

  if (!isWalletAddress(id) && !isGuestId(id)) {
    return {
      title: "Player Profile | Fuzzynuts.xyz",
      description: "View arcade stats and score history on Fuzzynuts.",
      openGraph: {
        title: "Player Profile | Fuzzynuts.xyz",
        description: "View arcade stats and score history across all FuzzyNuts games.",
        siteName: "Fuzzynuts",
        type: "profile",
      },
    };
  }

  const isWallet = isWalletAddress(id);
  const displayName = isWallet ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;

  return {
    title: `${displayName} | Fuzzynuts.xyz`,
    description: `View ${displayName}'s arcade stats and score history on Fuzzynuts.`,
    openGraph: {
      title: `${displayName} | Fuzzynuts.xyz`,
      description: `View ${displayName}'s arcade stats and score history across all FuzzyNuts games.`,
      url: `https://fuzzynuts.xyz/profile/${id}`,
      siteName: "Fuzzynuts",
      type: "profile",
    },
  };
}

export default async function ProfileIdPage({ params }: { params: Promise<PageParams> }) {
  const { id } = await params;
  return <ProfileIdClient profileId={id} />;
}
