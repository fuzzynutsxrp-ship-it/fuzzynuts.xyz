import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isWalletAddress, isValidProfileId } from "@/lib/profile-validation";
import { ProfileIdClient } from "./client";

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

  // Return safe defaults for invalid IDs — prevents OG meta tag injection
  if (!isValidProfileId(id)) {
    return {
      title: "Not Found | Fuzzynuts.xyz",
      description: "This profile does not exist.",
    };
  }

  const displayName = isWalletAddress(id)
    ? `${id.slice(0, 6)}...${id.slice(-4)}`
    : id;

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

export default async function ProfileIdPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;

  if (!isValidProfileId(id)) {
    notFound();
  }

  return <ProfileIdClient profileId={id} />;
}
