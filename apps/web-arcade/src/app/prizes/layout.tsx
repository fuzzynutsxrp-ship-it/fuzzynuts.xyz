/**
 * Prizes route layout — wraps with SubPageLayout
 * for consistent navbar, footer, video bg, and particles.
 *
 * Matches /leaderboard and /profile layouts exactly.
 */

import { SubPageLayout } from "@/components/layout/SubPageLayout";

export default function PrizesLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubPageLayout showVideoBg={true} showFallingNuts={true} navbarTransparent={false}>
      {children}
    </SubPageLayout>
  );
}
