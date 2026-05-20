/**
 * Leaderboard route layout — wraps with SubPageLayout
 * for consistent navbar, footer, video bg, and particles.
 *
 * NOTE: metadata is exported from page.tsx (not here) to avoid
 * duplication — both files export metadata in Next.js App Router.
 */

import { SubPageLayout } from "@/components/layout/SubPageLayout";

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubPageLayout
      showVideoBg={true}
      showFallingNuts={true}
      navbarTransparent={false}
    >
      {children}
    </SubPageLayout>
  );
}
