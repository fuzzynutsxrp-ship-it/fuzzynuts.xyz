/**
 * Game route layout — wraps with SubPageLayout
 * with performance-optimized settings for gameplay:
 *   - No video bg (games use their own)
 *   - No falling nuts particles (reduce GPU load)
 *   - No Navbar (GameHeader replaces it with game-specific controls)
 *   - No Footer (full-viewport game layout)
 */

import { SubPageLayout } from "@/components/layout/SubPageLayout";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubPageLayout
      showVideoBg={false}
      showFallingNuts={false}
      showNavbar={false}
      showFooter={false}
    >
      {children}
    </SubPageLayout>
  );
}
