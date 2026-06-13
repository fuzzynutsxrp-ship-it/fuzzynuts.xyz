import type { Metadata } from "next";
import { ProfileIdClient } from "./client";

interface ProfileIdPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProfileIdPageProps): Promise<Metadata> {
  const { id } = await params;
  const shortId = `${id.slice(0, 6)}...${id.slice(-4)}`;
  return {
    title: `${shortId} — Player Stats | Fuzzynuts.xyz`,
    description: `View arcade stats and score history for ${shortId}. Track best runs across all Fuzzynuts games.`,
    openGraph: {
      title: `${shortId} — Player Stats | Fuzzynuts.xyz`,
      description: `View arcade stats and score history for ${shortId} across all FuzzyNuts games.`,
      url: `https://fuzzynuts.xyz/profile/${id}`,
      siteName: "Fuzzynuts",
      type: "profile",
    },
  };
}

export default async function ProfileIdPage({ params }: ProfileIdPageProps) {
  const { id } = await params;
  return <ProfileIdClient deviceId={id} />;
}
